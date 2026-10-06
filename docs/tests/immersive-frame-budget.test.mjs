import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameBudget,createRenderPacer,renderPixelRatio} from '../assets/js/immersive-frame-budget.js';

function feed(budget,cost,seconds){let last;for(let i=0;i<seconds*1000/cost;i++){const sample=budget.sample(cost);if(sample)last=sample;}return last;}
test('sustained slow frames reduce resolution without oscillating on brief stalls',()=>{
 const budget=createFrameBudget();feed(budget,16.667,2);const initial=budget.quality;
 budget.sample(300);feed(budget,16.667,1);assert.equal(budget.quality,initial);
 feed(budget,45,5);assert.ok(budget.quality<initial);
 const lowered=budget.quality;feed(budget,16,3);assert.equal(budget.quality,lowered);
 feed(budget,16,12);assert.ok(budget.quality>lowered);
 feed(budget,80,40);assert.equal(budget.quality,.56);
});
test('hidden-page gaps and invalid timing do not corrupt the quality controller',()=>{
 const budget=createFrameBudget({compact:true}),initial=budget.quality;
 for(const input of [NaN,Infinity,0,-1,5000])assert.equal(budget.sample(input),null);
 assert.equal(budget.quality,initial);feed(budget,50,1);budget.reset();feed(budget,16,2);assert.equal(budget.quality,initial);
});
test('large and high-density screens stay inside the pixel budget',()=>{
 for(const [width,height,compact] of [[3840,2160,false],[1280,720,false],[390,844,true]]){
  const ratio=renderPixelRatio({width,height,dpr:3,quality:1,compact});
  assert.ok(width*height*ratio*ratio<=(compact?800000:1800000)+1);
  const reduced=renderPixelRatio({width,height,dpr:3,quality:.7,compact});assert.ok(reduced<ratio);
 }
});
test('high-refresh callbacks produce about sixty expensive frames per second',()=>{
 for(const displayHz of [60,120,144,165,240]){
  const pacer=createRenderPacer(),stamps=[];
  for(let i=0;i<displayHz*10;i++){const ms=i*1000/displayHz;if(pacer.shouldRender(ms))stamps.push(ms);}
  assert.ok(Math.abs(stamps.length/10-60)<.3,`${displayHz} Hz rendered ${stamps.length/10} FPS`);
  const shortest=Math.min(...stamps.slice(1).map((time,i)=>time-stamps[i]));
  assert.ok(shortest>=1000/displayHz-.01,`never emits a catch-up burst at ${displayHz} Hz`);
 }
});
test('a stalled or resumed render clock restarts without catching up old frames',()=>{
 const pacer=createRenderPacer();assert.equal(pacer.shouldRender(0),true);
 assert.equal(pacer.shouldRender(4),false);assert.equal(pacer.shouldRender(5000),true);
 assert.equal(pacer.shouldRender(5001),false);assert.equal(pacer.shouldRender(5004),false);
 assert.equal(pacer.shouldRender(NaN),false);pacer.reset();assert.equal(pacer.shouldRender(5010),true);
 assert.equal(pacer.shouldRender(0),true);assert.equal(pacer.shouldRender(1),false);
});
