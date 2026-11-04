# MatthiasTrack

Suivi personnel de films et séries : listes, épisodes, notes détaillées, statistiques,
« Wrapped », calendrier, recommandations et Stories à partager.

- **Catalogue** : [TMDB](https://www.themoviedb.org/) (The Movie Database)
- **Comptes et synchronisation** : [Supabase](https://supabase.com/)
- **Application** : un seul fichier `index.html`, sans étape de build, installable sur
  téléphone (PWA) et utilisable hors-ligne.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Toute l'application (HTML, CSS, JavaScript). |
| `sw.js` | Service worker : ouverture hors-ligne, cache des bibliothèques et des affiches. |
| `manifest.json` | Manifeste PWA (nom, icônes, raccourcis Rechercher / Listes / Découvrir). |
| `icon-*.png` | Icônes de l'app (écran d'accueil, iOS, Android « maskable »). |
| `tools/check.mjs` | Vérifications automatiques (syntaxe, ESLint, manifeste). |

## Lancer en local

Le service worker et l'installation PWA demandent un serveur HTTP (pas `file://`) :

```bash
npm run serve        # http://localhost:8080
```

## Vérifier avant de publier

```bash
npm install
npm run check
```

La même vérification tourne automatiquement sur GitHub (`.github/workflows/ci.yml`)
à chaque push.

## Publier une nouvelle version

1. Modifier `APP_VERSION` dans `index.html`.
2. Modifier `VERSION` dans `sw.js` : sinon les téléphones peuvent garder l'ancien
   cache des bibliothèques.
3. `npm run check`, puis déployer tous les fichiers à la racine du site.

## Configuration

Les clés sont dans l'objet `CONFIG` en haut du script principal de `index.html`.
La clé `anon` de Supabase et la clé TMDB sont publiques par nature (elles sont lisibles
dans n'importe quelle app web). **La sécurité des données repose donc entièrement sur
les règles RLS (Row Level Security) de Supabase** : chaque table (`interactions`,
`episode_interactions`, `custom_lists`…) doit limiter la lecture et l'écriture à
`auth.uid() = user_id`.

## Historique

### v24.2 — hardening
- **Hors-ligne réel** : ajout d'un service worker. L'app s'ouvre sans réseau (avant,
  la bannière hors-ligne existait mais la page elle-même ne pouvait pas se charger).
- **PWA complète** : `manifest.json` et icônes, jusque-là référencés mais absents.
- **Connexion** : un visiteur non connecté qui clique « Marquer comme vu », note un
  titre, etc. arrive sur l'écran de connexion avec un message clair (et non plus
  « Ta session a expiré »), puis **revient sur la page qu'il consultait** après connexion.
- **Bannir** : demande maintenant une confirmation, et redirige vers la connexion si
  besoin (avant : action immédiate, erreur trompeuse si déconnecté).
- **Sécurité** : les messages d'erreur insérés dans la page sont échappés (10 endroits) ;
  les bibliothèques CDN sont vérifiées par empreinte (SRI) ; la version de Supabase est
  figée (`2.118.0`) au lieu de suivre automatiquement la dernière `2.x`.
- **Performance** : PapaParse et html2canvas ne bloquent plus le premier affichage (`defer`).
- **Accessibilité** (audit axe-core) : zone principale `<main>`, champs de connexion
  et de date associés à leur libellé, `autocomplete` pour les gestionnaires de mots de
  passe, messages d'erreur annoncés aux lecteurs d'écran, contraste du bouton « Bannir »,
  groupe de notation par étoiles correctement balisé.
