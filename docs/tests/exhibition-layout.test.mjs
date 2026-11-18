import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildInternational} from '../scripts/build-international.mjs';

test('archive exhibition is paper-toned, media-first and does not alter the optional universe ribbon',()=>{
  const css=readFileSync(new URL('../assets/css/archive-exhibition.css',import.meta.url),'utf8');
  assert.match(css,/--bg:#f1f0eb;--ink:#242722/);
  assert.match(css,/not\(\[data-view=ribbon\]\) \.ribbon-gallery::before[^}]*display:none/);
  assert.match(css,/exhibition-statement[^}]*Tem Interface/);
  assert.match(css,/data-view=featured\] \.browse-grid\{grid-template-columns:1fr/);
  assert.match(css,/object-fit:contain/);
  assert.match(css,/@media\(max-width:799px\)/);
  assert.match(css,/prefers-reduced-motion/);
});
test('bilingual archives and cases receive fingerprinted exhibition assets and project identity',()=>{
  const dir=mkdtempSync(join(tmpdir(),'tem-exhibition-'));
  try{
    buildInternational({outDir:dir});
    for(const locale of ['zh','en']){
      const work=readFileSync(join(dir,locale,'work/index.html'),'utf8');
      assert.match(work,/exhibition-statement/);
      for(const file of ['archive-exhibition.css','exhibition-motion.css','exhibition-motion.js'])assert.ok(work.includes(file+'?v='));
      assert.match(work,/data-exhibition-preview="\/assets\/videos\/previews\/yuanmo.mp4"/);
      // All archive representations use the same documented image as the case.
      assert.equal((work.match(/src="\/assets\/images\/dafeiyu-dashboard.jpg"/g)||[]).length,3);
      const anyao=readFileSync(join(dir,locale,'work/anyao/index.html'),'utf8');
      assert.match(anyao,/<body class="reading-page case-page" data-project="anyao">/);
      assert.match(anyao,/case-exhibition.css\?v=/);
      assert.match(anyao,/class="case-impact"/);
    }
    const home=readFileSync(join(dir,'index.html'),'utf8');
    assert.doesNotMatch(home,/exhibition-motion.js|archive-exhibition.css/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('shared visual transition snapshots exclude captions and remain native navigation',()=>{
  const js=readFileSync(new URL('../assets/js/page-transitions.js',import.meta.url),'utf8');
  assert.match(js,/function visualMedia\(frame\)/);
  assert.match(js,/img:not\(\.case-evidence-print-poster\),video/);
  assert.doesNotMatch(js,/preventDefault\(/);
});
