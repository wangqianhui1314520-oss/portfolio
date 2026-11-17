import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('normal entrance has no unconditional graphics prewarm and keeps deep-link startup',()=>{
 const boot=read('assets/js/international-boot.js');
 assert.doesNotMatch(boot,/queueMicrotask\(requestGraphics\)/);
 assert.match(boot,/addEventListener\('tem:opening-start',requestGraphics\)/);
 assert.match(boot,/addEventListener\('tem:opening-skip',requestGraphics\)/);
 assert.match(boot,/if\(result.restored\)[^\n]*requestGraphics\(\)/);
});

test('the lightweight entrance reuses the site galaxy without model or video backgrounds',()=>{
 const css=read('assets/css/international-universe.css');
 assert.match(css,/\.graphics-standby \.launch-backdrop\{background-image:[^}]*work-backdrop-galaxy\.webp/);
 assert.match(css,/@media\(max-width:700px\)[^\n]*work-backdrop-galaxy-m\.webp/);
 assert.match(css,/body\[data-opening='loading'\]\.graphics-standby \.opening-caption\{visibility:visible;opacity:1\}/);
 assert.match(read('assets/js/immersive-intro.js'),/if\(!opening.ready\)status.textContent=[^\n]*Loading the creative universe/);
 const template=read('templates/universe.html');
 assert.match(template,/class="launch-browse"[^>]*href="\{\{WORK\}\}"/);
 assert.match(template,/id="startOpening"/);
});

test('selected mobile path prioritizes readable role and result while full archive keeps filters',()=>{
 const css=read('assets/css/portfolio-browse.css');
 for(const selector of ['.browse-role','.browse-result']){
  const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  assert.ok(rules.some(([,selectors,declarations])=>selectors.split(',').some(s=>s.trim().endsWith(selector))&&/font-size:14px/.test(declarations)),selector+' stays readable, including shared selector rules');
 }
 assert.match(css,/body\.ribbon-page\[data-view=featured\] \.ribbon-filters\{display:none\}/);
 assert.doesNotMatch(css,/body\.ribbon-page:not\(\[data-view=ribbon\]\) \.ribbon-filters\{display:none/);
 assert.doesNotMatch(css,/\.browse-card h3\{[^}]*display:none/);
});
