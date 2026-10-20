import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const css = read('assets/css/fonts.css');
const faces = [...css.matchAll(/font-family:'([^']+)';src:url\('\.\.\/fonts\/([^'?]+)\?v=([0-9a-f]{8})'\)[^}]*unicode-range:([^}]+)\}/g)].map(([, family, file, version, range]) => {
  const codes = new Set();
  for (const part of range.split(',')) {
    const [start, end] = part.replace('U+', '').split('-').map(value => parseInt(value, 16));
    for (let code = start; code <= (end ?? start); code++) codes.add(code);
  }
  return {family, file, version, codes};
});
const cjk = text => new Set([...text].map(char => char.codePointAt(0)).filter(code => code > 0x024f));
const slicesFor = (family, codes) => [...new Set(faces.filter(face => face.family === family && [...codes].some(code => face.codes.has(code))).map(face => face.file))].sort();

test('Chinese and English text use their own punctuation widths', () => {
  assert.match(css, /:lang\(en\)\{font-variant-east-asian:proportional-width\}/);
  assert.match(css, /:lang\(zh\)\{font-variant-east-asian:normal\}/);
});

test('every font slice is versioned by its content and stays small', () => {
  assert.ok(faces.length >= 12, 'the CJK faces are sliced');
  for (const face of faces) {
    const bytes = readFileSync(resolve(root, 'assets/fonts', face.file));
    assert.equal(createHash('sha256').update(bytes).digest('hex').slice(0, 8), face.version, face.file + ' is referenced with a stale version');
    assert.ok(bytes.length <= 100 * 1024, face.file + ' must stay under 100 KB');
  }
});

test('the work archive draws its text from its own slices only', () => {
  const page = read('zh/work/index.html') + read('assets/js/international-static.js');
  const sans = slicesFor('Tem Interface', cjk(page));
  assert.ok(sans.every(file => /cjk0[1-3]-/.test(file)), 'interface slices: ' + sans.join(', '));
  // Serif display text: the introduction and every project title come from one slice.
  const display = [...read('zh/work/index.html').matchAll(/data-title="([^"]*)"|(?:class="ribbon-intro-role">|class="ribbon-intro-track"><small>[^<]*<\/small>)([^<]*)</g)].map(match => (match[1] || '') + (match[2] || '')).join('');
  assert.deepEqual(slicesFor('Tem Narrative', cjk(display)), ['tem-narrative-cjk01-v1.woff2']);
});

test('the work archive loads a crystal-only model', () => {
  const page = read('zh/work/index.html');
  const url = page.match(/data-model-url="\/assets\/models\/([^"?]+)\?v=([0-9a-f]+)"/);
  assert.ok(url, 'the viewer names its model with a content version');
  const file = resolve(root, 'assets/models', url[1]);
  assert.ok(statSync(file).size <= 400 * 1024, 'the crystal stays under 400 KB');
  const buffer = readFileSync(file);
  const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));
  assert.deepEqual(gltf.scenes[0].nodes.map(index => gltf.nodes[index].name), ['T_IDENTITY_V19']);
  assert.ok(gltf.nodes.every(node => node.name.startsWith('T_IDENTITY_V19')), 'nothing of the observatory remains');
  assert.equal(createHash('sha256').update(buffer).digest('hex').slice(0, 10), url[2]);
});

test('preview loops are short, silent, small and cut from the project films', () => {
  const page = read('zh/work/index.html');
  const previews = [...page.matchAll(/data-preview="\/(assets\/videos\/previews\/([\w-]+)\.mp4)"/g)];
  assert.equal(previews.length, 5);
  for (const [, path, id] of previews) {
    const bytes = readFileSync(resolve(root, path));
    assert.equal(bytes.subarray(4, 8).toString('latin1'), 'ftyp', path + ' is an MP4');
    assert.ok(bytes.length <= 250 * 1024, path + ' must stay under 250 KB');
    assert.ok(!bytes.includes(Buffer.from('soun')), path + ' carries no audio track');
    assert.ok(existsSync(resolve(root, 'assets/videos', id + '.mp4')), id + ' is cut from its own film');
  }
});

test('responsive covers exist, shrink their JPEG, and top out at the source width', () => {
  const manifest = JSON.parse(read('assets/covers/r/manifest.json'));
  assert.ok(Object.keys(manifest).length >= 10);
  for (const [cover, entry] of Object.entries(manifest)) {
    const widths = entry.variants.map(variant => variant.width);
    assert.deepEqual(widths, [...widths].sort((a, b) => a - b), cover);
    assert.equal(widths.at(-1), entry.width, cover + ' never upscales');
    for (const variant of entry.variants) assert.equal(statSync(resolve(root, variant.src)).size, variant.bytes, variant.src + ' matches its manifest');
    const mid = entry.variants.find(variant => variant.width === 960) || entry.variants.at(-1);
    assert.ok(mid.bytes < statSync(resolve(root, cover)).size, cover + ': the WebP must be lighter than its JPEG');
  }
});

test('published reading pages reference the current files', () => {
  for (const page of ['zh/work/index.html', 'en/work/index.html', 'zh/about/index.html', 'en/work/anyao/index.html']) {
    const html = read(page);
    for (const file of ['assets/css/fonts.css', 'assets/css/international-site.css', 'assets/js/international-static.js']) {
      const version = html.match(new RegExp(file.replace(/[.]/g, '\\.') + '\\?v=([0-9a-f]{10})'))?.[1];
      assert.equal(version, createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex').slice(0, 10), page + ' must be rebuilt after ' + file + ' changes');
    }
    assert.match(html, /<style>@view-transition\{navigation:auto\}/, page + ' opts into page transitions inline');
  }
});
