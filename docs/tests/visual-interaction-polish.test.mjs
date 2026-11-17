import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../assets/css/'+path,import.meta.url),'utf8');
const archive=read('portfolio-browse.css');
const evidence=read('case-evidence.css');
const reading=read('reading-polish.css');

test('archive cards give keyboard users the same title and media feedback as pointer users',()=>{
  assert.match(archive,/\.browse-card:focus-visible\{[^}]*outline:2px solid/);
  assert.match(archive,/\.browse-card:focus-visible \.browse-title\{[^}]*text-decoration:underline/);
  assert.match(archive,/\.browse-card:focus-visible \.browse-media\{[^}]*border-color:/);
  assert.match(archive,/\.browse-card:hover \.browse-title/);
  assert.match(archive,/\.ribbon-views button:focus-visible/);
  assert.doesNotMatch(archive,/\.browse-media img[^}]*transform:scale/);
});

test('historical interface evidence uses intrinsic proportions while covers and videos keep deliberate framing',()=>{
  assert.match(evidence,/data-evidence-kind=image\] \.case-evidence-frame\{[^}]*aspect-ratio:auto/);
  assert.match(evidence,/data-evidence-kind=image\] \.case-cover\{[^}]*width:auto[^}]*height:auto[^}]*max-height:min\(74svh,740px\)/);
  assert.match(evidence,/data-evidence-kind=cover\] \.case-evidence-frame\{aspect-ratio:16\/10/);
  assert.match(evidence,/\.case-evidence-frame\{[\s\S]*?aspect-ratio:16\/9/);
  assert.match(evidence,/\.case-evidence-frame:focus-within\{[^}]*outline:2px solid/);
  assert.match(evidence,/\.case-evidence-frame video:focus-visible\{outline-offset:-3px/);
});

test('media explanations and mobile case navigation retain readable text and touch targets',()=>{
  assert.match(evidence,/\.case-evidence-caption\{font-size:14px/);
  assert.match(evidence,/\.case-evidence-note>summary\{[^}]*min-height:44px/);
  assert.match(evidence,/\.case-evidence-note>summary:focus-visible/);
  const mobile=reading.slice(reading.indexOf('@media(max-width:560px)'));
  assert.match(mobile,/\.case-index a\{font-size:14px;min-height:44px/);
});

test('reading links, chapter navigation and disclosures expose focus without adding animation or graphics work',()=>{
  assert.match(reading,/summary:focus-visible\{outline:2px solid/);
  assert.match(reading,/\.case-index a:focus-visible\{[^}]*background:/);
  assert.match(reading,/\.case-actions a:focus-visible/);
  assert.match(reading,/\.contact-links a:focus-visible/);
  assert.match(reading,/\.case-next-link:focus-visible h2\{[^}]*text-decoration:underline/);
  assert.doesNotMatch(archive+evidence+reading,/@keyframes|animation:/);
});
