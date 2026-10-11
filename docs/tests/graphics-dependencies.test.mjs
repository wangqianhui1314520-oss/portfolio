import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildInternational} from '../scripts/build-international.mjs';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://graphics.test';
const imports = source => [
  ...source.matchAll(/^\s*(?:import|export)\s+(?:[\w*\s{},]+?\s+from\s*)?(['"])([^'"\r\n]+)\1/gm),
  ...source.matchAll(/\bimport\s*\(\s*(['"])([^'"\r\n]+)\1\s*\)/g)
].map(match => match[2]);

function checkGraph(html, entry, basePath, sourceRoot = root) {
  const pageURL = new URL(basePath + entry, origin);
  const documentBase = new URL(html.match(/<base href="([^"]+)"/)?.[1] || pageURL.href, pageURL);
  const map = JSON.parse(html.match(/<script type="importmap">([^<]+)<\/script>/)[1]).imports;
  assert.equal(new URL(map.three, documentBase).origin, origin, 'Three must load from the site origin');
  const queue = [...html.matchAll(/<script type="module" src="([^"]+)"/g)].map(match => new URL(match[1], documentBase));
  const visited = new Set();
  while (queue.length) {
    const url = queue.pop();
    if (visited.has(url.href)) continue;
    visited.add(url.href);
    assert.equal(url.origin, origin, 'Graphics must not require a third-party module: ' + url.href);
    assert.ok(url.pathname.startsWith(basePath), 'Module must stay inside the deployed site');
    const file = resolve(sourceRoot, decodeURIComponent(url.pathname.slice(basePath.length)));
    assert.ok(existsSync(file), 'Missing module: ' + url.pathname);
    for (const specifier of imports(readFileSync(file, 'utf8'))) {
      assert.ok(specifier.startsWith('.') || specifier.startsWith('/') || map[specifier], 'Unmapped dependency: ' + specifier);
      queue.push(new URL(map[specifier] ? new URL(map[specifier], documentBase) : specifier, url));
    }
  }
  assert.ok([...visited].some(url => url.includes('/loaders/GLTFLoader.js')), 'Model loader must be included');
  assert.ok([...visited].some(url => url.includes('/postprocessing/UnrealBloomPass.js')), 'Postprocessing must be included');
  assert.ok([...visited].some(url => url.includes('/build/three.module.js')), 'Three core must be included');
}

test('every immersive entry has a complete same-origin graphics dependency graph', () => {
  for (const entry of ['index.html', 'immersive.html', 'zh/index.html', 'en/index.html']) {
    checkGraph(readFileSync(resolve(root, entry), 'utf8'), entry, '/');
  }
});

test('generated language entries resolve local graphics under a deployment subdirectory', () => {
  const output = mkdtempSync(resolve(tmpdir(), 'tem-graphics-'));
  try {
    buildInternational({outDir:output, origin, basePath:'/portfolio/'});
    for (const entry of ['index.html', 'immersive.html', 'zh/index.html', 'en/index.html']) {
      checkGraph(readFileSync(resolve(output, entry), 'utf8'), entry, '/portfolio/');
    }
  } finally {
    rmSync(output, {recursive:true, force:true});
  }
});
