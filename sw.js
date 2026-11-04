/* MatthiasTrack — service worker
 *
 * Objectif : que l'app s'ouvre même sans réseau (le code gère déjà un mode
 * hors-ligne avec son cache localStorage, mais encore fallait-il que la page
 * elle-même puisse se charger).
 *
 * Stratégies :
 *  - Page (index.html)          : réseau d'abord, cache en secours → toujours la
 *                                 dernière version quand on est en ligne.
 *  - Fichiers locaux (icônes…)  : cache d'abord.
 *  - Bibliothèques CDN versionnées (unpkg, esm.sh) : cache d'abord (URL figées).
 *  - Affiches TMDB              : cache d'abord, plafonné à MAX_IMAGES entrées.
 *  - API (Supabase, TMDB API)   : jamais mises en cache ici (données personnelles,
 *                                 et l'app a déjà son propre cache SWR).
 *
 * Pour forcer tous les appareils à reprendre les fichiers : changer VERSION.
 */
const VERSION = 'v24.2';
const SHELL_CACHE = `mt-shell-${VERSION}`;
const CDN_CACHE = `mt-cdn-${VERSION}`;
const IMG_CACHE = 'mt-img-v1';
const MAX_IMAGES = 250;

const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-apple-touch.png'];
const CDN_HOSTS = new Set(['unpkg.com', 'esm.sh']);
const IMG_HOSTS = new Set(['image.tmdb.org']);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const keep = new Set([SHELL_CACHE, CDN_CACHE, IMG_CACHE]);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('mt-') && !keep.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('./index.html', response.clone());
    return response;
  } catch {
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Les affiches TMDB arrivent en réponse « opaque » (status 0) : on les garde aussi.
  if (response.ok || response.type === 'opaque') {
    cache.put(request, response.clone()).then(() => maxEntries && trimCache(cacheName, maxEntries));
  }
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }
  if (CDN_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirst(request, CDN_CACHE));
    return;
  }
  // Seulement les <img> classiques (no-cors) : les chargements CORS (export de
  // Story via html2canvas) ne doivent jamais recevoir une réponse opaque du cache.
  if (IMG_HOSTS.has(url.hostname) && request.mode === 'no-cors') {
    event.respondWith(cacheFirst(request, IMG_CACHE, MAX_IMAGES).catch(() => Response.error()));
  }
  // Tout le reste (Supabase, api.themoviedb.org, YouTube…) : comportement réseau normal.
});
