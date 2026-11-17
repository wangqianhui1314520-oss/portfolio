import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {localizedData} from '../assets/js/locale-data.js';
import {createJourney} from '../assets/js/immersive-journey.js';
const scope={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../assets/js/data.js',import.meta.url),'utf8'),scope);
const data=scope.window.PORTFOLIO_DATA;
test('DaFeiYu is discoverable in Technology Lab in both languages',()=>{
 for(const locale of ['zh','en']){
  const d=localizedData(data,locale),work=d.works.find(w=>w.id==='dafeiyu');
  assert.equal(work.sector,'nexus');
  assert.ok(data.international.order.includes(work.id));
  assert.ok(data.international.projectCards[work.id][locale].summary);
  assert.ok(data.international.caseStudies[work.id][locale].decisions.length>=3);
  assert.equal(work.play.type,'none');assert.equal(work.play.url,'');
  assert.equal(work.links[0].url,'https://github.com/wangqianhui1314520-oss/dsh-qq-onebot-bridge');
  const journey=createJourney(d.works);
  for(const [action,value] of [['start'],['ready'],['navigate','nexus'],['arrive'],['scan'],['decode'],['select','dafeiyu'],['dock'],['open']])journey.dispatch(action,value);
  assert.equal(journey.detail.id,work.id);
  const html=fs.readFileSync(new URL('../'+locale+'/work/dafeiyu/index.html',import.meta.url),'utf8');
  assert.ok(html.includes(work.title));assert.ok(html.includes('dafeiyu-cover.svg'));
  assert.doesNotMatch(html,/127\.0\.0\.1|localhost|1469843682|克隆嗓|voice cloning/);
 }
});
test('DaFeiYu distinguishes local hosting from external model and voice services',()=>{
 assert.match(data.works.find(w=>w.id==='dafeiyu').specs.at(-1).v,/外部服务/);
 assert.match(data.locales.en.works.dafeiyu.specs.at(-1).v,/external services/);
 const svg=fs.readFileSync(new URL('../assets/covers/dafeiyu-cover.svg',import.meta.url),'utf8');
 assert.match(svg,/<svg/);assert.doesNotMatch(svg,/<script|href="https?:/);
});
