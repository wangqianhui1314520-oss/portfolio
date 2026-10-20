import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(root, 'assets/css/international-site.css'), 'utf8');
const rule = selector => css.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}'))?.[1] ?? '';
const narrow = css.slice(css.indexOf('@media(max-width:799px){'));

test('the work page sits on the dimmed galactic backdrop, each file within its budget', () => {
  for (const [file, budgetKB] of [['work-backdrop-galaxy.webp', 100], ['work-backdrop-galaxy-m.webp', 30]]) {
    assert.ok(css.includes(`url('../images/${file}')`), file + ' must be referenced by the stylesheet');
    assert.ok(statSync(resolve(root, 'assets/images', file)).size <= budgetKB * 1024, file + ' must stay within ' + budgetKB + ' KB');
  }
  assert.match(rule('body.ribbon-page .ribbon-gallery::before'), /work-backdrop-galaxy\.webp/);
  // Phones replace the desktop file rather than downloading both.
  assert.match(narrow, /\.ribbon-gallery::before\{background:[^}]*work-backdrop-galaxy-m\.webp/);
});

test('resting covers are dimmed, never translucent, so the sky cannot show through them', () => {
  const resting = rule('body.ribbon-page .ribbon-link img');
  assert.match(resting, /filter:grayscale\(1\) brightness\(\.5\)/);
  assert.doesNotMatch(resting, /opacity:\./);
  assert.equal((css.match(/img\{filter:grayscale\(0\) brightness\(1\)\}/g) || []).length, 3, 'current, expanded and hovered covers return to full brightness');
});

test('the horizon and the project tint belong to the overview and the expanded view respectively', () => {
  assert.match(rule('body.ribbon-page.is-work-expanded .ribbon-horizon'), /opacity:0/);
  assert.match(rule('body.ribbon-page.is-work-expanded .ribbon-gallery::after'), /color-mix\(in srgb,var\(--ribbon-bg/);
  // On desktop the horizon only appears where the ribbon can lift above it.
  assert.match(css, /@media\(min-width:800px\) and \(min-height:650px\)\{[^@]*\.ribbon-horizon\{display:block\}/);
  for (const locale of ['zh', 'en']) {
    const page = readFileSync(resolve(root, locale, 'work/index.html'), 'utf8');
    assert.match(page, /<div class="ribbon-horizon" aria-hidden="true"><\/div>/);
  }
});

test('every reading page shares the archive sky, palette and wordmark', () => {
  const sky = rule('body.reading-page::before');
  assert.match(sky, /position:fixed/);
  assert.match(sky, /url\('\.\.\/images\/work-backdrop-galaxy\.webp'\)/, 'case studies, About and poetry sit on the archive backdrop');
  assert.match(narrow, /body\.reading-page::before\{background:[^}]*work-backdrop-galaxy-m\.webp/, 'phones load the small backdrop instead');
  // The overlay keeps long text legible: no layer of it may be lighter than half opacity.
  for (const alpha of sky.match(/#040b16([0-9a-f]{2})/g).map(colour => parseInt(colour.slice(-2), 16))) assert.ok(alpha >= 0x80, 'overlay too light: ' + alpha);
  assert.match(rule('body.reading-page .wordmark'), /font-family:Impact/, 'the wordmark matches the archive');
  assert.match(rule('body.ribbon-page .ribbon-wordmark'), /font-family:Impact/);
  const pages = {'zh/work/growth/index.html': 'case-page', 'en/work/anyao/index.html': 'case-page', 'zh/about/index.html': 'about-page', 'en/about/index.html': 'about-page', 'zh/poetry/index.html': 'poems-page', 'en/poetry/index.html': 'poems-page'};
  for (const [file, own] of Object.entries(pages)) {
    assert.match(readFileSync(resolve(root, file), 'utf8'), new RegExp(`<body class="reading-page ${own}">`), file);
  }
  // The poetry body class must not reuse the name of the poetry column, which is width-limited.
  assert.doesNotMatch(css, /body\.poetry-page/);
});
