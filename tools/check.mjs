#!/usr/bin/env node
/**
 * Vérifications rapides du projet (local + CI) :
 *  1. extrait chaque <script> inline de index.html dans .build/
 *  2. vérifie leur syntaxe avec `node --check`
 *  3. lance ESLint (variables non définies, doublons, code mort…)
 *  4. valide manifest.json et la présence des fichiers qu'il référence
 *
 * Usage : npm run check
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const outDir = join(root, '.build');
mkdirSync(outDir, { recursive: true });

let failed = false;
const fail = msg => { console.error('✗ ' + msg); failed = true; };
const ok = msg => console.log('✓ ' + msg);

// 1. Extraction des scripts inline (ceux sans src).
const files = [];
const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
let m, i = 0;
while ((m = re.exec(html))) {
  const isModule = /type=["']module["']/.test(m[1]);
  const line = html.slice(0, m.index).split('\n').length;
  const name = `inline-${++i}${isModule ? '.mjs' : '.js'}`;
  // Lignes vides en tête : les numéros de ligne des erreurs correspondent à index.html.
  writeFileSync(join(outDir, name), '\n'.repeat(line - 1) + m[2]);
  files.push(name);
}
ok(`${files.length} scripts inline extraits`);

// 2. Syntaxe.
for (const f of [...files.map(f => join(outDir, f)), join(root, 'sw.js')]) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail(`syntaxe invalide dans ${f}\n${e.stderr}`); }
}
if (!failed) ok('syntaxe JavaScript valide');

// 3. ESLint.
try {
  execFileSync('npx', ['--no-install', 'eslint', '--max-warnings', '20', '.build', 'sw.js'], { cwd: root, stdio: 'inherit' });
  ok('ESLint');
} catch { fail('ESLint a signalé des problèmes (voir ci-dessus)'); }

// 4. Manifeste PWA.
try {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  for (const icon of manifest.icons || []) {
    if (!existsSync(join(root, icon.src))) fail(`icône manquante : ${icon.src}`);
  }
  for (const ref of ['icon-192.png', 'icon-apple-touch.png', 'manifest.json', 'sw.js']) {
    if (!existsSync(join(root, ref))) fail(`fichier référencé manquant : ${ref}`);
  }
  ok('manifest.json valide');
} catch (e) { fail('manifest.json invalide : ' + e.message); }

process.exit(failed ? 1 : 0);
