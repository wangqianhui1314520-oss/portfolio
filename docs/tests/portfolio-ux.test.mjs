import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {archiveView,projectVisible} from '../assets/js/portfolio-view.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scope={window:{}};vm.runInNewContext(read('assets/js/data.js'),scope);const d=scope.window.PORTFOLIO_DATA;
test('archive URL defaults to the shortlist while category and project links preserve context',()=>{
 for(const [query,expected] of [['','featured'],['category=nexus','grid'],['view=grid','grid'],['view=list','list'],['view=ribbon','ribbon'],['project=dafeiyu','ribbon'],['view=invalid','featured']])assert.equal(archiveView(new URLSearchParams(query)),expected,query);
 assert.equal(projectVisible({category:'nexus',featured:false},'all','featured'),false);
 assert.equal(projectVisible({category:'nexus',featured:true},'nexus','grid'),true);
 assert.equal(projectVisible({category:'nexus',featured:true},'forge','grid'),false);
});
test('the editorial shortlist names three different capabilities without changing the complete archive',()=>{
 assert.equal(d.international.featured.length,3);
 assert.equal(new Set(d.international.featured.map(p=>p.id)).size,3);
 for(const selection of d.international.featured){assert.ok(d.works.some(w=>w.id===selection.id));for(const locale of ['zh','en']){assert.ok(selection[locale].capability);assert.ok(selection[locale].proof);}}
 for(const locale of ['zh','en']){
  const html=read(locale+'/work/index.html');
  assert.match(html,/data-view="featured"/);
  assert.equal((html.match(/data-browse-card\b/g)||[]).length,14);
  assert.equal((html.match(/data-featured="true"/g)||[]).length,3);
  for(const mode of ['featured','grid','list','ribbon'])assert.ok(html.includes(`data-ribbon-view="${mode}"`));
  assert.match(html,/portfolio-browse\.css\?v=[0-9a-f]{10}/);
 }
});
test('DaFeiYu presents a real historical interface crop before secondary case metadata',()=>{
 assert.match(d.works.find(w=>w.id==='dafeiyu').evidence.src,/dafeiyu-dashboard\.jpg$/);
 for(const locale of ['zh','en']){
  const html=read(locale+'/work/dafeiyu/index.html');
  assert.ok(html.indexOf('dafeiyu-dashboard.jpg')<html.indexOf('case-summary-grid'));
  assert.ok(html.includes('case-evidence-hero'));
  assert.match(html,/case-evidence\.css\?v=[0-9a-f]{10}/);
  assert.ok(html.includes(locale==='zh'?'历史运行界面':'earlier running interface'));
  assert.doesNotMatch(html,/brain-dash-real-original|1469843682|dsh-qq-onebot-bridge/);
 }
});
test('project video moves to the hero once, stays manually controlled and retains guide captions',()=>{
 for(const locale of ['zh','en']){
  const html=read(locale+'/work/growth/index.html');
  assert.equal((html.match(/<video\b/g)||[]).length,1);
  assert.match(html,/<video[^>]*controls/);
  assert.doesNotMatch(html,/<video[^>]*autoplay/);
  assert.ok(html.indexOf('<video')<html.indexOf('case-summary-grid'));
  assert.match(html,/id="film"/);
  assert.match(html,/growth-en\.vtt/);
 }
});
