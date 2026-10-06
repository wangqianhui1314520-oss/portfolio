// Deploy completeness guard.
// GitHub Pages publishes exactly what git tracks under the site folder (Tem/).
// Anything the site references but git does not publish will 404 after release,
// so fail here instead of shipping a broken site.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');   // …/Tem
const repoRoot = path.resolve(root, '..');                                        // repository root
const prefix = path.basename(root) + '/';                                         // 'Tem/'
const git = args => execFileSync('git', args, {cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
const stripQuery = value => value.split(/[?#]/)[0];
const underSite = line => line.startsWith(prefix) ? line.slice(prefix.length) : null;

// Sandboxes may block spawning git, so fall back to a snapshot generated with:
//   git add -A && git ls-files > Tem/.workbuddy/published.txt
function publishSet() {
  let lines;
  try {
    lines = git(['ls-files']).split('\n');
  } catch {
    lines = fs.readFileSync(path.join(root, '.workbuddy/published.txt'), 'utf8').split('\n');
  }
  return new Set(lines.map(underSite).filter(Boolean));
}

let ignoredCache;
function ignoredSet() {
  try {
    return new Set(git(['ls-files', '--others', '--ignored', '--exclude-standard']).split('\n').map(underSite).filter(Boolean));
  } catch {
    return null;
  }
}
function ignored(relative) {
  if (!ignoredCache) ignoredCache = ignoredSet();
  return Boolean(ignoredCache?.has(relative));
}

test('every page references only files git will publish', () => {
  const publish = publishSet();
  assert.ok(publish.size > 50, 'git must publish the site folder, saw ' + publish.size);

  const missing = [];
  const blocked = [];
  const check = (relative, from) => {
    const clean = stripQuery(relative).replace(/^\//, '');
    if (!clean || clean.endsWith('/')) return;
    // Skip JS template fragments such as ' + esc(w.cover) + ' inside inline scripts.
    if (!/^[\w./-]+$/.test(clean)) return;
    if (publish.has(clean)) return;
    if (fs.existsSync(path.join(root, clean)) && ignored(clean)) blocked.push(from + ' → ' + clean);
    else missing.push(from + ' → ' + clean);
  };

  const entries = ['immersive.html', 'index.html', 'poetry.html', 'resume.html', 'portfolio-print.html'];
  for (const dir of ['zh', 'en']) {
    for (const entry of fs.readdirSync(path.join(root, dir), {recursive: true})) {
      // readdir recursive returns Windows backslashes on this platform; git paths use forward slashes.
      const relative = dir + '/' + String(entry).replace(/\\/g, '/');
      if (relative.endsWith('index.html')) entries.push(relative);
    }
  }
  for (const entry of entries) {
    if (!fs.existsSync(path.join(root, entry))) continue;
    assert.ok(publish.has(entry), 'entry page not published: ' + entry);
    const html = fs.readFileSync(path.join(root, entry), 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = match[1];
      if (/^(?:https?:|mailto:|tel:|#|data:)/.test(url)) continue;
      check(url, entry);
    }
  }

  const loader = fs.readFileSync(path.join(root, 'assets/js/immersive-blender-assets.js'), 'utf8');
  const table = loader.match(/const assets=Object\.freeze\(\{([^}]+)\}\)/);
  assert.ok(table, 'runtime GLB table must stay parseable');
  for (const match of table[1].matchAll(/'([^']+\.glb)'/g)) check('assets/models/' + match[1], 'immersive-blender-assets.js');

  for (const dir of ['assets/css', 'assets/js', 'assets/captions', 'assets/audio']) {
    const target = path.join(root, dir);
    if (!fs.existsSync(target)) continue;
    for (const file of fs.readdirSync(target, {recursive: true})) {
      const relative = dir + '/' + String(file).replace(/\\/g, '/');
      if (!fs.statSync(path.join(root, relative)).isFile()) continue;
      if (!/\.(?:js|css|vtt|wav|mp3|ogg)$/i.test(String(file))) continue;
      check(relative, dir);
    }
  }

  const scope = {window:{}};
  new Function('window', fs.readFileSync(path.join(root, 'assets/js/data.js'), 'utf8'))(scope.window);
  const data = scope.window.PORTFOLIO_DATA;
  const push = value => {if (typeof value === 'string' && /^assets\//.test(value)) check(value, 'data.js');};
  for (const work of data.works) [work.cover, work.video, ...(work.images || [])].forEach(push);
  (data.poetry?.poems || []).forEach(poem => push(poem.image));
  for (const id of Object.keys(data.international?.guides || {})) check('assets/captions/' + id + '-en.vtt', 'data.js');

  assert.deepEqual(missing, [], 'references git will not publish (404 after release):\n' + missing.join('\n'));
  assert.deepEqual(blocked, [], 'references blocked by .gitignore:\n' + blocked.join('\n'));
});

test('scene modules load only published textures and models', () => {
  const publish = publishSet();
  const missing = [];
  const dir = path.join(root, 'assets/js');
  for (const file of fs.readdirSync(dir)) {
    if (!file.startsWith('immersive-') || !file.endsWith('.js')) continue;
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const match of source.matchAll(/['"](\.?\/?assets\/[^'"]+\.(?:glb|png|jpg|jpeg|svg|webp|mp4|vtt|wav))['"]/g)) {
      const relative = match[1].replace(/^\.?\//, '');
      if (fs.existsSync(path.join(root, relative)) && !publish.has(relative)) missing.push(file + ' → ' + relative);
    }
  }
  assert.deepEqual(missing, [], 'scene module loads a file git will not publish:\n' + missing.join('\n'));
});

test('site metadata files are published', () => {
  const publish = publishSet();
  for (const file of ['CNAME', 'sitemap.xml', 'robots.txt']) {
    assert.ok(publish.has(file), file + ' must be published');
  }
  assert.equal(fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim(), 'wqh-tempest.cn');
});
