import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadData} from '../scripts/build-international.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('assets/css/portfolio-browse.css');
const generator=read('scripts/build-international.mjs');
const workIndex=generator.slice(generator.indexOf('  function workIndex('),generator.indexOf('  function casePage('));

test('selected works have a stable editorial hierarchy independent of source archive order',()=>{
  const data=loadData();
  assert.deepEqual(Array.from(data.international.featured,item=>item.id),['yuanmo','anyao','dafeiyu']);
  assert.match(workIndex,/data-featured-order="\$\{selection \? selection\.index\+1 : 'archive'\}"/);
  assert.match(css,/data-featured-order="1"\]\{grid-column:1\/-1;display:grid/);
  assert.match(css,/data-featured-order="3"\]\{grid-column:2;margin-top:94px/);
});

test('non-ribbon archive uses a horizontal identity and the entire content width',()=>{
  assert.match(css,/body\.ribbon-page:not\(\[data-view=ribbon\]\) \.ribbon-gallery\{[^}]*display:block/);
  assert.match(css,/body\.ribbon-page:not\(\[data-view=ribbon\]\) \.ribbon-side\{[^}]*position:relative[^}]*width:100%/);
  assert.match(css,/grid-template-areas:"identity summary" "actions proof"/);
  assert.doesNotMatch(css,/grid-template-columns:270px|position:sticky/);
  assert.match(workIndex,/class="ribbon-intro-track-text"/);
});

test('project artwork stays complete and key facts are semantic, readable content',()=>{
  assert.match(css,/\.browse-media img\{[^}]*object-fit:contain/);
  assert.doesNotMatch(css,/object-fit:cover/);
  assert.match(workIndex,/<dl class="browse-facts"><div><dt>/);
  assert.match(workIndex,/<dd class="browse-role">/);
  assert.match(workIndex,/<dd class="browse-result">/);
  assert.match(css,/\.browse-role,body\.ribbon-page \.browse-result\{[^}]*font-size:14px/);
  assert.match(workIndex,/class="browse-card-bottom"/);
  assert.match(workIndex,/class="browse-cta"/);
  const artwork=workIndex.match(/<figure class="browse-media">([\s\S]*?)<\/figure>/)?.[1];
  assert.ok(artwork);
  assert.doesNotMatch(artwork,/ribbon-badges/);
});

test('mobile selected cards put title, role and outcome before artwork instead of delaying them below it',()=>{
  const mobile=css.slice(css.indexOf('@media(max-width:799px)'));
  assert.match(mobile,/\.browse-card\[data-featured-order\] \.browse-card-copy\{order:0/);
  assert.match(mobile,/\.browse-card\[data-featured-order\] \.browse-media\{order:1/);
  assert.match(mobile,/\.ribbon-intro-text,body\.ribbon-page:not\(\[data-view=ribbon\]\) \.ribbon-intro-proof\{display:none/);
  assert.match(mobile,/\.ribbon-views button\{[^}]*font-size:14px;[^}]*min-height:44px/);
  assert.match(mobile,/\.browse-facts>div\{display:grid;grid-template-columns:60px minmax\(0,1fr\)/);
  assert.match(css,/@media\(max-width:380px\)/);
});

test('full archive, original ribbon and native shared-media selectors remain available',()=>{
  for(const selector of ['data-ribbon-view','data-ribbon-filter','data-ribbon-item','data-ribbon-row','data-browse-card','data-project-id','data-project-category','data-featured'])assert.ok(workIndex.includes(selector),selector);
  assert.match(workIndex,/class="browse-media"/);
  assert.match(workIndex,/href="\$\{workHref\(locale,work\.id\)\}"/);
  assert.match(workIndex,/\['featured',[^\n]*\['grid',[^\n]*\['list',[^\n]*\['ribbon',/);
  assert.match(css,/body\.ribbon-page:not\(\[data-view=ribbon\]\) \.ribbon-list/);
});

test('visual system uses restrained surfaces and respects reduced motion',()=>{
  assert.match(css,/work-backdrop-galaxy\.webp/);
  assert.match(css,/work-backdrop-galaxy-m\.webp/);
  assert.doesNotMatch(css,/box-shadow|(?:linear|radial)-gradient/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*transition:none/);
});

test('desktop intro shares both rows without forcing the proof below the title and the brand matches reading pages',()=>{
  const desktop=css.slice(css.indexOf('@media(min-width:1100px)'),css.indexOf('@media(max-width:1199px)'));
  assert.match(desktop,/grid-template-areas:"identity summary" "identity proof"/);
  assert.match(desktop,/\.ribbon-intro-actions\{grid-area:identity;align-self:start;justify-self:end/);
  assert.match(desktop,/\.ribbon-side\{padding-bottom:24px/);
  assert.match(css,/\.ribbon-wordmark\{[^}]*font-size:32px;font-weight:600;[^}]*letter-spacing:-\.065em;transform:none/);
  assert.match(css,/\.ribbon-header\{bottom:auto;height:84px/);
  const mobile=css.slice(css.indexOf('@media(max-width:799px)'));
  assert.match(mobile,/\.ribbon-header\{[^}]*height:80px/);
  assert.match(mobile,/\.ribbon-gallery\{display:block;padding:88px 22px 44px/);
});
