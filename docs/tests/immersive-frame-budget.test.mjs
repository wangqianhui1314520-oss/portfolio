import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameBudget,createFrameClock,createFrameTelemetry,createRenderPacer,renderPixelRatio,graphicsProfile} from '../assets/js/immersive-frame-budget.js';

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
test('visible-frame evidence includes severe stalls without changing adaptive quality',()=>{
 const evidence=createFrameTelemetry(),budget=createFrameBudget(),quality=budget.quality;
 assert.equal(evidence.sample(16),null);assert.equal(evidence.sample(16),null);
 assert.equal(budget.sample(1800),null);
 const stalled=evidence.sample(1800);assert.equal(stalled.frames,3);assert.equal(stalled.elapsed,1832);assert.equal(stalled.fps,3000/1832);
 assert.equal(budget.quality,quality);
 for(const invalid of [NaN,Infinity,0,-1])assert.equal(evidence.sample(invalid),null);
 evidence.sample(1000);evidence.reset();let fast;
 for(let i=0;i<100;i++){const sample=evidence.sample(16);if(sample)fast=sample;}
 assert.equal(fast.frames,100);assert.equal(fast.elapsed,1600);assert.equal(fast.fps,62.5);
});
test('large and high-density screens stay inside the pixel budget',()=>{
 for(const [width,height,compact] of [[3840,2160,false],[1280,720,false],[390,844,true]]){
  const ratio=renderPixelRatio({width,height,dpr:3,quality:1,compact});
  assert.ok(width*height*ratio*ratio<=(compact?800000:1800000)+1);
  const reduced=renderPixelRatio({width,height,dpr:3,quality:.7,compact});assert.ok(reduced<ratio);
 }
});
test('high-refresh panels render on a constant number of refreshes, at most 75 frames per second',()=>{
 // A fixed 60 Hz clock alternated 3,3,3,2 refreshes at 165 Hz (12.1/18.2 ms).
 const expected={60:60,75:75,120:60,144:72,165:55,180:60,240:60};
 for(const [hz,fps] of Object.entries(expected).map(([hz,fps])=>[Number(hz),fps])){
  const pacer=createRenderPacer(),stamps=[],period=1000/hz;let seed=7;
  const jitter=()=>{seed=(seed*1664525+1013904223)>>>0;return (seed/4294967296-.5)*.6;};
  for(let i=0;i<hz*10;i++){const ms=i*period+jitter();if(pacer.shouldRender(ms))stamps.push(ms);}
  const steady=stamps.filter(time=>time>500),intervals=steady.slice(1).map((time,i)=>Math.round((time-steady[i])/period));
  assert.ok(intervals.length>40);
  assert.deepEqual([...new Set(intervals)],[Math.round(hz/fps)],`${hz} Hz keeps one cadence`);
  assert.ok(Math.abs(pacer.fps-fps)<fps*.02,`${hz} Hz targets ${fps} FPS, saw ${pacer.fps}`);
  const shortest=Math.min(...stamps.slice(1).map((time,i)=>time-stamps[i]));
  assert.ok(shortest>=period*.85,`never emits a catch-up burst at ${hz} Hz`);
 }
});
test('a GPU-bound page renders every callback it receives instead of skipping a late one',()=>{
 const pacer=createRenderPacer();let rendered=0,time=0;
 for(let i=0;i<200;i++){time+=i%2?33.3:36.4;if(pacer.shouldRender(time))rendered++;}
 assert.equal(rendered,200);assert.equal(pacer.stride,1);
});
test('quality recovery follows the paced target, so a 55 FPS cadence can raise quality again',()=>{
 // Two slow windows lower resolution without reaching the floor or a tier drop.
 const budget=createFrameBudget();for(let i=0;i<80;i++)budget.sample(45);
 const lowered=budget.quality;assert.ok(lowered<1);assert.equal(budget.tierDrop,0);
 for(let i=0;i<1000;i++)budget.sample(1000/55,55);
 assert.ok(budget.quality>lowered,'55 FPS on a 165 Hz panel counts as on target');
 const held=createFrameBudget();for(let i=0;i<80;i++)held.sample(45);const before=held.quality;
 for(let i=0;i<1000;i++)held.sample(1000/55);assert.equal(held.quality,before,'at a 60 FPS target, 55 FPS is not yet recovered');
});
test('a stalled or resumed render clock restarts without catching up old frames',()=>{
 const pacer=createRenderPacer();assert.equal(pacer.shouldRender(0),true);
 assert.equal(pacer.shouldRender(4),false);assert.equal(pacer.shouldRender(5000),true);
 assert.equal(pacer.shouldRender(5001),false);assert.equal(pacer.shouldRender(5004),false);
 assert.equal(pacer.shouldRender(NaN),false);pacer.reset();assert.equal(pacer.shouldRender(5010),true);
 assert.equal(pacer.shouldRender(0),true);assert.equal(pacer.shouldRender(1),false);
});
test('first-draw readiness and page resume never consume a cinematic shot, while real visible stalls remain measurable',()=>{
 const clock=createFrameClock();assert.equal(clock.step(0).wallDt,1/60);
 // The cold draw took 23 seconds while the opening still awaited readiness.
 clock.reset();assert.equal(clock.step(23000).wallDt,1/60);
 const slow=clock.step(23750);assert.equal(slow.wallDt,.75);assert.equal(slow.dt,.05);
 // A hidden page is explicitly reset; navigation must not absorb its gap.
 clock.reset();assert.equal(clock.step(90000).wallDt,1/60);
 assert.equal(clock.step(NaN).wallDt,1/60);assert.equal(clock.step(100000).wallDt,1/60);
});

test('GPU tiers keep discrete cards cinematic and give integrated GPUs resolution before coverage',()=>{
 const iris='ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)';
 const rtx='ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Laptop GPU (0x0000249D) Direct3D11 vs_5_0 ps_5_0, D3D11)';
 const warp='ANGLE (Microsoft, Microsoft Basic Render Driver (0x0000008C) Direct3D11 vs_5_0 ps_5_0, D3D11)';
 const apu='ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11 vs_5_0 ps_5_0, D3D11)';
 const pick=(renderer,options={})=>{const {tier,samples,transmissionScale,transmissionSamples}=graphicsProfile({renderer,maxSamples:8,...options});return {tier,samples,transmissionScale,transmissionSamples};};
 assert.deepEqual(pick(rtx),{tier:'cinematic',samples:4,transmissionScale:1,transmissionSamples:4});
 assert.deepEqual(pick(iris),{tier:'balanced',samples:2,transmissionScale:.75,transmissionSamples:0});
 assert.deepEqual(pick(apu),{tier:'balanced',samples:2,transmissionScale:.75,transmissionSamples:0});
 assert.deepEqual(pick(warp),{tier:'light',samples:0,transmissionScale:.5,transmissionSamples:0});
 assert.equal(pick(iris,{preference:'full'}).tier,'cinematic','the visitor can ask for the full pipeline');
 assert.equal(pick(rtx,{preference:'low'}).tier,'light');
 assert.equal(pick(iris,{compact:true}).samples,4,'tile-based phone GPUs keep on-chip multisampling');
 assert.equal(graphicsProfile({renderer:rtx,maxSamples:2}).samples,2,'never above the device limit');
 assert.equal(graphicsProfile({renderer:rtx,maxSamples:0}).transmissionSamples,0);
});

test('a frame still slow at the resolution floor drops a feature tier, and recovery restores the tier first',()=>{
 const budget=createFrameBudget();
 for(let i=0;i<2000&&budget.quality>.5601;i++)budget.sample(45);
 assert.equal(budget.quality,.56);assert.equal(budget.tierDrop,0,'resolution is spent before features');
 let changed=false;for(let i=0;i<200;i++){const result=budget.sample(45);if(result?.changed)changed=true;}
 assert.ok(budget.tierDrop>=1&&changed,'the floor then drops a tier and reports the change');
 for(let i=0;i<4000;i++)budget.sample(45);assert.equal(budget.tierDrop,2,'never below the light tier');
 // Seven fast windows restore each tier; two tiers need fourteen.
 for(let i=0;i<1500;i++)budget.sample(16);
 assert.equal(budget.tierDrop,0,'fast frames restore features first');assert.equal(budget.quality,.56);
 for(let i=0;i<2000;i++)budget.sample(16);assert.ok(budget.quality>.56,'then resolution recovers');
 const capped=createFrameBudget();for(let i=0;i<4000;i++)capped.sample(45,60,{maxTierDrop:0});assert.equal(capped.tierDrop,0);
});

test('automatic tier drops move down the order; an explicit visitor choice never moves',()=>{
 const rtx='ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Laptop GPU Direct3D11)',iris='ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11)';
 assert.equal(graphicsProfile({renderer:rtx,maxSamples:8,drop:1}).tier,'balanced');
 assert.equal(graphicsProfile({renderer:iris,maxSamples:8,drop:1}).tier,'light');
 assert.equal(graphicsProfile({renderer:iris,maxSamples:8,drop:5}).tier,'light');
 assert.equal(graphicsProfile({renderer:iris,maxSamples:8,drop:2,preference:'full'}).tier,'cinematic');
});

test('a tier that drops again soon after its restore waits longer before the next restore',()=>{
 const budget=createFrameBudget();
 for(let i=0;i<2000&&budget.quality>.5601;i++)budget.sample(45);
 const dropOnce=()=>{for(let i=0;i<200&&budget.tierDrop===0;i++)budget.sample(45);};
 const windowsToRestore=()=>{let windows=0;while(budget.tierDrop>0&&windows<200){for(let i=0;i<100;i++)budget.sample(16);windows++;}return windows;};
 dropOnce();assert.equal(budget.tierDrop,1);const first=windowsToRestore();
 dropOnce();assert.equal(budget.tierDrop,1);const second=windowsToRestore();
 assert.ok(second>=first*2-1,'restore backs off: '+first+' then '+second+' windows');
});
