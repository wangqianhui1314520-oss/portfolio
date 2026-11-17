import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {wrappedIndex} from '../assets/js/case-media.js';
import {buildInternational} from '../scripts/build-international.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('image sequence wraps forward/backward and handles an empty sequence', () => {
  assert.equal(wrappedIndex(3,3),0);
  assert.equal(wrappedIndex(-1,3),2);
  assert.equal(wrappedIndex(8,3),2);
  assert.equal(wrappedIndex(1,0),-1);
});
test('case images stay usable as original-image links without JS', () => {
  const dir=mkdtempSync(join(tmpdir(),'tem-media-'));
  try {
    buildInternational({outDir:dir});
    const html=readFileSync(join(dir,'zh/work/anyao/index.html'),'utf8');
    assert.match(html,/data-case-media/);
    assert.match(html,/href="\/assets\/[^"]+"[^>]*data-case-media/);
    assert.match(html,/case-media\.js\?v=[a-f0-9]+/);
    assert.match(html,/case-media\.css\?v=[a-f0-9]+/);
    assert.doesNotMatch(readFileSync(join(dir,'zh/work/index.html'),'utf8'),/case-media\.js/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('viewer uses native modality, restores focus and loads only the chosen original', () => {
  const js=readFileSync(new URL('../assets/js/case-media.js',import.meta.url),'utf8');
  assert.match(js,/dialog\.showModal\(\)/);
  assert.match(js,/opener\.focus\(\{preventScroll: true\}\)/);
  assert.match(js,/event\.metaKey \|\| event\.ctrlKey/);
  assert.match(js,/image\.src = link\.href/);
  assert.match(js,/image\.removeAttribute\('src'\)/);
  assert.match(js,/ArrowLeft/);
  assert.match(js,/aria-busy/);
});

test('viewer image is constrained to the available stage instead of cropped by its intrinsic height', () => {
  const css=readFileSync(new URL('../assets/css/case-media.css',import.meta.url),'utf8');
  assert.match(css,/\.case-lightbox img\{position:absolute;inset:0/);
  assert.match(css,/object-fit:contain/);
  assert.match(css,/min-height:48px/);
});
