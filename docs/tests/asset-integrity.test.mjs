// Main-site resource integrity guard.
// Anything the immersive main site loads at runtime MUST exist. Deleting one of
// these files is a release blocker, so the guard fails loudly instead of shipping a 404.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve_root();
function resolve_root() {return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');}
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(root, relative));
const stripQuery = value => value.split(/[?#]/)[0];

test('the main site entry and every asset it references exists', () => {
  const entry = read('index.html');
  const local = [...entry.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map(match => match[1])
    .filter(url => !/^(?:https?:|mailto:|tel:|#)/.test(url))
    .map(stripQuery)
    .filter(url => url && url !== '/' && !url.endsWith('/'));
  assert.ok(local.length >= 15, 'The main site should declare its stylesheets and boot module.');
  for (const asset of local) assert.ok(exists(asset), 'missing main-site asset: ' + asset);
});

test('every GLB declared by the runtime loader exists and is non-empty', () => {
  const source = read('assets/js/immersive-blender-assets.js');
  const table = source.match(/const assets=Object\.freeze\(\{([^}]+)\}\)/);
  assert.ok(table, 'The runtime asset table must stay parseable.');
  const files = [...table[1].matchAll(/'([^']+\.glb)'/g)].map(match => match[1]);
  assert.ok(files.length >= 10, 'Expected the full desktop asset set.');
  for (const file of files) {
    const full = path.join(root, 'assets/models', file);
    assert.ok(fs.existsSync(full), 'missing runtime GLB: ' + file);
    assert.ok(fs.statSync(full).size > 1024, 'empty or truncated GLB: ' + file);
  }
});

test('every local import inside the immersive module graph resolves', () => {
  const seen = new Set();
  const queue = ['assets/js/international-boot.js'];
  while (queue.length) {
    const current = stripQuery(queue.shift());
    if (seen.has(current)) continue;
    seen.add(current);
    assert.ok(exists(current), 'missing module in the main-site graph: ' + current);
    const source = read(current);
    for (const match of source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
      const spec = match[1];
      if (!spec.startsWith('.')) continue;
      queue.push(path.normalize(path.join(path.dirname(current), stripQuery(spec))));
    }
  }
  assert.ok(seen.size >= 40, 'The main-site graph should cover the full scene, saw ' + seen.size);
});

test('every local stylesheet imported by the main site resolves, including nested assets', () => {
  const entry = read('index.html');
  const sheets = [...entry.matchAll(/href="([^"]+?\.css[^"]*)"/g)].map(match => stripQuery(match[1]));
  assert.ok(sheets.length >= 13, 'Expected the full main-site stylesheet stack.');
  for (const sheet of sheets) {
    assert.ok(exists(sheet), 'missing stylesheet: ' + sheet);
    for (const match of read(sheet).matchAll(/url\((['"]?)([^)'"]+)\1\)/g)) {
      const asset = stripQuery(match[2]);
      // Skip remote URLs, data URIs, and same-document SVG fragment references such as url("#gradient").
      if (/^(?:https?:|data:|#|%23)/.test(asset) || asset.startsWith('/')) continue;
      assert.ok(exists(path.join(path.dirname(sheet), asset)), sheet + ' → missing ' + asset);
    }
  }
});

test('every media path referenced by the shared data source exists', () => {
  const scope = {window:{}};
  new Function('window', read('assets/js/data.js'))(scope.window);
  const data = scope.window.PORTFOLIO_DATA;
  assert.ok(data?.works?.length, 'The shared data source must expose works.');
  const media = [];
  const push = value => {if (typeof value === 'string' && /^assets\//.test(value)) media.push(stripQuery(value));};
  for (const work of data.works) {
    [work.cover, work.video, ...(work.images || []), ...((work.album || []).map(item => item.src ?? item))].forEach(push);
  }
  (data.poetry?.poems || []).forEach(poem => push(poem.image));
  assert.ok(media.length >= 15, 'Expected covers, films, and poetry manuscripts.');
  for (const asset of new Set(media)) assert.ok(exists(asset), 'missing data-source media: ' + asset);
});

test('captions referenced by project guides exist', () => {
  const scope = {window:{}};
  new Function('window', read('assets/js/data.js'))(scope.window);
  const guides = scope.window.PORTFOLIO_DATA?.international?.guides || {};
  const ids = Object.keys(guides);
  assert.ok(ids.length >= 3, 'Expected English project guide tracks.');
  for (const id of ids) assert.ok(exists('assets/captions/' + id + '-en.vtt'), 'missing caption track: ' + id);
});
