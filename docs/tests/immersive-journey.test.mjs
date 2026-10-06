import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createJourney,sectors,sectorFor } from '../assets/js/immersive-journey.js';
const scope={window:{}};runInNewContext(readFileSync(new URL('../assets/js/data.js',import.meta.url),'utf8'),scope);
const works=scope.window.PORTFOLIO_DATA.works;
const explore=j=>{j.dispatch('start');j.dispatch('ready');};
const visit=(j,sector)=>{j.dispatch('navigate',sector);j.dispatch('arrive');if(j.state.step==='arrival'){j.dispatch('scan');j.dispatch('decode');}};

test('the first view introduces Tem and cannot reveal project content',()=>{
 const j=createJourney(works);assert.equal(j.state.step,'bridge');
 for(const action of ['select','open','arrive','navigate'])assert.equal(j.dispatch(action,'ming'),false);
 assert.equal(j.detail,undefined);assert.equal(j.work,undefined);assert.equal(j.signals.length,0);
 assert.equal(j.dispatch('captain'),true);assert.equal(j.state.step,'captain');assert.equal(j.signals.length,0);
 j.dispatch('back');assert.equal(j.state.step,'bridge');
});
test('exploration is voluntary from either the introduction or about view',()=>{
 const j=createJourney(works);j.dispatch('captain');j.dispatch('start');assert.equal(j.state.step,'boot');j.dispatch('ready');assert.equal(j.state.step,'map');assert.equal(j.signals.length,0);
 assert.equal(j.dispatch('navigate','invalid'),false);j.dispatch('navigate','forge');assert.equal(j.signals.length,0);assert.equal(j.detail,undefined);
 j.dispatch('arrive');assert.equal(j.state.step,'arrival');assert.equal(j.signals.length,0);assert.equal(j.dispatch('select','ming'),false);j.dispatch('scan');assert.equal(j.signals.length,0);j.dispatch('decode');assert.equal(j.state.step,'signals');assert.equal(j.signals.length,6);assert.equal(j.detail,undefined);
});
test('all ten projects, including poetry, are reachable through exploration and docking',()=>{
 const j=createJourney(works);explore(j);const found=[];
 for(const sector of sectors){visit(j,sector.id);for(const work of [...j.signals]){assert.equal(j.dispatch('select',work.id),true);assert.equal(j.state.step,'target');assert.equal(j.detail,undefined);assert.equal(j.dispatch('open'),false);j.dispatch('dock');j.dispatch('open');assert.equal(j.detail.id,work.id);found.push(work.id);j.dispatch('back');assert.equal(j.state.step,'signals');}j.dispatch('map');}
 assert.equal(new Set(found).size,10);assert.equal(j.visitedCount,10);assert.equal(j.total,10);
});
test('signal focus and scanned sectors survive reading and repeated voyages',()=>{
 const j=createJourney(works);explore(j);visit(j,'forge');j.dispatch('focus','growth');assert.equal(j.work.id,'growth');j.dispatch('captain');j.dispatch('back');assert.equal(j.work.id,'growth');
 j.dispatch('select','growth');j.dispatch('dock');j.dispatch('open');j.dispatch('back');assert.equal(j.work.id,'growth');j.dispatch('map');visit(j,'forge');assert.equal(j.work.id,'growth');
 assert.equal(j.dispatch('select','epoch'),false);assert.equal(j.dispatch('focus','novel'),false);
});
test('cancelled transitions reject stale completions and repeat visits do not double count',()=>{
 const j=createJourney(works);j.dispatch('start');j.dispatch('home');assert.equal(j.dispatch('ready'),false);
 explore(j);j.dispatch('navigate','forge');j.dispatch('back');assert.equal(j.dispatch('arrive'),false);
 visit(j,'forge');j.dispatch('select','ming');j.dispatch('back');assert.equal(j.dispatch('open'),false);assert.equal(j.visitedCount,0);
 for(let i=0;i<2;i++){j.dispatch('select','ming');j.dispatch('dock');j.dispatch('open');j.dispatch('back');}assert.equal(j.visitedCount,1);
});
test('source media, résumé and local destinations exist',()=>{
 for(const work of works)for(const path of [work.cover,work.video,...(work.images||[]).map(i=>i.src),work.play?.url]){if(!path||/^[a-z]+:/i.test(path))continue;assert.ok(existsSync(new URL(`../${path}`,import.meta.url)),path);}
 assert.ok(existsSync(new URL('../docs/source/王乾辉简历.pdf',import.meta.url)));
});
test('classification follows each work medium and certificates remain in the biography',()=>{
 const expected={forge:['ming','yuanmo','growth','rebirth','kun','zhihu'],lumen:['epoch'],echo:['novel','poetry'],nexus:['esp32-learn']};
 for(const s of sectors)assert.deepEqual(Array.from(works.filter(w=>w.type!=='作品证书'&&sectorFor(w)===s.id),w=>w.id),expected[s.id]);
 assert.equal(sectorFor({type:'游戏',subtitle:'视觉小说游戏 · 罕见病教育'}),'forge');assert.equal(sectorFor({type:'教学 / 实训平台'}),'nexus');
});


test('scan and docking can be cancelled without revealing unopened content',()=>{
 const j=createJourney(works);explore(j);j.dispatch('navigate','forge');j.dispatch('arrive');
 j.dispatch('scan');j.dispatch('back');assert.equal(j.state.step,'arrival');assert.equal(j.dispatch('decode'),false);assert.equal(j.hasScanned('forge'),false);assert.equal(j.signals.length,0);
 j.dispatch('scan');j.dispatch('decode');assert.equal(j.hasScanned('forge'),true);
 j.dispatch('select','ming');j.dispatch('dock');j.dispatch('back');assert.equal(j.state.step,'target');assert.equal(j.dispatch('open'),false);assert.equal(j.detail,undefined);assert.equal(j.visitedCount,0);
 j.dispatch('dock');j.dispatch('open');j.dispatch('map');j.dispatch('navigate','forge');j.dispatch('arrive');assert.equal(j.state.step,'signals');assert.equal(j.work.id,'ming');
});
