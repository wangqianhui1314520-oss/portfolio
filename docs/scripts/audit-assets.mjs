// Usage: node scripts/audit-assets.mjs
// Reports assets under assets/ that no file in the project references.
// Reference kinds differ: RUNTIME = loaded by the browser, BUILD/TEST = used by Blender scripts or tests.
// Never delete anything referenced by BUILD/TEST without also updating those files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const ENTRY = ['immersive.html', 'index.html', 'poetry.html', 'resume.html', 'portfolio-print.html', 'zh/index.html', 'en/index.html'];

// 1) collect every asset file currently on disk
const assetDirs = ['assets/models', 'assets/images', 'assets/covers', 'assets/videos', 'assets/certificates', 'assets/poems', 'assets/captions', 'assets/audio'];
const assets = [];
for (const dir of assetDirs) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    const rel = path.join(entry.parentPath ?? entry.path, entry.name).replace(/\\/g, '/');
    if (!/\.(glb|png|jpe?g|svg|webp|mp4|wav|mp3|ogg|opus|m4a|vtt|json|txt|md)$/i.test(rel)) continue;
    assets.push(rel);
  }
}

// 2) build the reference corpus: every file that could possibly reference an asset
const corpus = [];
const collect = (dir, filter) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    const rel = path.join(entry.parentPath ?? entry.path, entry.name).replace(/\\/g, '/');
    if (filter && !filter(rel)) continue;
    corpus.push(rel);
  }
};
collect('assets/js', (f) => f.endsWith('.js'));
collect('assets/css', (f) => f.endsWith('.css'));
collect('templates', () => true);
collect('scripts', () => true);
collect('tests', () => true);
collect('zh', (f) => f.endsWith('.html'));
collect('en', (f) => f.endsWith('.html'));
ENTRY.forEach((f) => fs.existsSync(f) && corpus.push(f));

// 3) scan text
const refs = new Map(); // basename -> [referencing files]
for (const file of corpus) {
  let src = '';
  try { src = fs.readFileSync(file, 'utf8'); } catch { continue; }
  for (const asset of assets) {
    const base = path.basename(asset);
    if (!src.includes(base)) continue;
    if (!refs.has(base)) refs.set(base, new Set());
    refs.get(base).add(file);
  }
}

const referenced = assets.filter((a) => refs.has(path.basename(a)));
const unreferenced = assets.filter((a) => !refs.has(path.basename(a)));

const size = (f) => (fs.statSync(f).size / 1024 / 1024).toFixed(2) + 'MB';

console.log('=== 资源总数: ' + assets.length + ' | 被引用: ' + referenced.length + ' | 未引用: ' + unreferenced.length + ' ===\n');
console.log('--- 未被引用的资源 ---');
for (const f of unreferenced) console.log('  ' + size(f).padStart(8) + '  ' + f);

console.log('\n--- 删除清单逐项安全判定 ---');
const checklist = [
  'assets/models/tem-observatory-v19.glb',
  'assets/models/tem-cinematic-fleet.glb',
  'assets/models/tem-observatory-v20-lod.glb',
  'assets/covers/llmfly-city.jpg',
  'assets/covers/growth-album.jpg',
  'assets/covers/kun-paralysis.jpg',
  'assets/css/immersive-cosmos.css',
];
for (const f of checklist) {
  const base = path.basename(f);
  const by = refs.get(base);
  console.log((by ? '  [危险·有引用] ' : '  [安全·无引用] ') + f + (by ? '  ← ' + [...by].join(', ') : ''));
}

console.log('\n--- 主站 index.html 直接依赖 ---');
let html = fs.readFileSync('index.html', 'utf8');
const direct = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|mailto:|#)/.test(u));
console.log(direct.join('\n'));
