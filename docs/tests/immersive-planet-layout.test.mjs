import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createOpeningPlayback} from '../assets/js/immersive-opening-playback.js';
import {OPENING_DURATION,openingTimeline} from '../assets/js/immersive-opening-timeline.js';

const planetSource=readFileSync(new URL('../assets/js/immersive-planet.js',import.meta.url),'utf8');
const weatherSource=readFileSync(new URL('../assets/js/immersive-procedural-planet.js',import.meta.url),'utf8');
const starSea=JSON.parse(readFileSync(new URL('../assets/models/tem-star-sea-v20.json',import.meta.url),'utf8'));

class Vector3{
 constructor(x=0,y=0,z=0){this.set(x,y,z);}
 set(x,y,z){Object.assign(this,{x,y,z});return this;}
 fromArray(values){return this.set(...values);}
 toArray(){return [this.x,this.y,this.z];}
 setScalar(value){return this.set(value,value,value);}
 normalize(){const length=Math.hypot(this.x,this.y,this.z)||1;return this.set(this.x/length,this.y/length,this.z/length);}
}

function planetModule(extra={}){
 const source=planetSource.replace(/^import .*$/gm,'').replace(/^export /gm,'');
 const scope={THREE:{Vector3},...extra};
 runInNewContext(source+'\nglobalThis.layout={orbitalEarthPose,orbitalEarthReveal,orbitalPanoramaPoses,createOrbitalWorld};',scope);
 return scope.layout;
}

const layout=planetModule();
const poseSnapshot=pose=>({position:Array.from(pose.position),scale:pose.scale,home:pose.home});
const distance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));

function sampleVoyage(scenario,narrow,check){
 const playback=createOpeningPlayback(OPENING_DURATION),state=playback.state;
 playback.ready();
 if(scenario==='replay'){
  playback.start();playback.advance(OPENING_DURATION);playback.finish();playback.reset();
 }
 if(['full','replay','skip-playing'].includes(scenario))playback.start();
 if(scenario==='skip-waiting')playback.finish();
 const fps=60;
 for(let frame=0;frame<=OPENING_DURATION*fps;frame++){
  if(frame)playback.advance(1/fps);
  if(scenario==='skip-playing'&&frame===6*fps)playback.finish();
  if(state.progress>=1)playback.finish();
  const sceneFrame={step:'bridge',opening:state.active&&state.started,fullOpening:state.active&&state.started,introFrame:openingTimeline(state.age)};
  check(layout.orbitalEarthPose(sceneFrame,narrow),`${narrow?'phone':'desktop'} / ${scenario} / ${frame/fps}s`);
 }
}

test('waiting, the entire fourteen-second opening, replay and skips keep Earth at the welcome pose',()=>{
 for(const narrow of [false,true]){
  const expected=poseSnapshot(layout.orbitalEarthPose({step:'captain'},narrow));
  assert.equal(expected.home,true);
  for(const scenario of ['waiting','full','replay','skip-waiting','skip-playing']){
   sampleVoyage(scenario,narrow,(pose,label)=>assert.deepEqual(poseSnapshot(pose),expected,label));
  }
 }
});

test('the full voyage hides Earth until docking, then smoothly restores it before the identity reveal',()=>{
 const revealAt=time=>layout.orbitalEarthReveal({step:'bridge',opening:true,fullOpening:true,starSeaReady:true,introFrame:openingTimeline(time)});
 for(let frame=0;frame<=11.5*60;frame++)assert.equal(revealAt(frame/60),0,`hidden at ${frame/60}s`);
 assert.equal(revealAt(11.5),0);assert.equal(revealAt(12.5),1);
 let previous=0;
 for(let frame=1;frame<60;frame++){
  const time=11.5+frame/60,reveal=revealAt(time);
  assert.ok(Number.isFinite(reveal)&&reveal>previous&&reveal<1,`continuous monotone reveal at ${time}s`);
  previous=reveal;
 }
 assert.ok(Math.abs(revealAt(12)-.5)<1e-12,'the transition has a symmetric midpoint');
 const epsilon=1e-4;
 assert.ok(revealAt(11.5+epsilon)/epsilon<.001,'the reveal starts with a flat slope');
 assert.ok((1-revealAt(12.5-epsilon))/epsilon<.001,'the reveal ends with a flat slope');
 for(let frame=12.5*60;frame<=OPENING_DURATION*60;frame++)assert.equal(revealAt(frame/60),1,`fully revealed at ${frame/60}s`);
});

test('waiting, short or reduced voyages, skips and completion show Earth immediately at any movie time',()=>{
 for(const time of [0,5,9.8,11.5,12,12.5,14])for(const frame of [
  {opening:false,fullOpening:false},
  {opening:true,fullOpening:false},
  {opening:false},
  {}
 ]){
  assert.equal(layout.orbitalEarthReveal({step:'bridge',starSeaReady:true,...frame,introFrame:openingTimeline(time)}),1,`non-full voyage at ${time}s`);
 }
 assert.equal(layout.orbitalEarthReveal({}),1);
});

test('an unavailable or not-yet-known star sea keeps the procedural Earth visible throughout the voyage',()=>{
 for(const readiness of [{starSeaReady:false},{}])for(let frame=0;frame<=OPENING_DURATION*60;frame++){
  const time=frame/60;
  assert.equal(layout.orbitalEarthReveal({step:'bridge',opening:true,fullOpening:true,...readiness,introFrame:openingTimeline(time)}),1,`fallback with starSeaReady=${readiness.starSeaReady} at ${time}s`);
 }
});

test('the first scene insertion already uses the current journey pose instead of damping from an unrelated Earth',()=>{
 class Group{constructor(){this.position=new Vector3();this.scale=new Vector3(1,1,1);}}
 const inserted=Symbol('first scene insertion');
 for(const narrow of [false,true])for(const step of [undefined,'bridge','captain','map','boot','travel']){
  const {createOrbitalWorld,orbitalEarthPose}=planetModule({THREE:{Vector3,Group},document:{body:{dataset:step?{step}:{}}}});
  let firstGroup;
  assert.throws(()=>createOrbitalWorld({scene:{add(group){firstGroup=group;throw inserted;}},renderer:{},canvas:{dataset:{}},time:{value:0},compact:()=>narrow}),error=>error===inserted);
  const expected=orbitalEarthPose({step:step||'bridge'},narrow);
  assert.deepEqual(firstGroup.position.toArray(),Array.from(expected.position),`${step||'initial bridge'} / ${narrow?'phone':'desktop'}`);
  assert.deepEqual(firstGroup.scale.toArray(),[expected.scale,expected.scale,expected.scale]);
 }
});

function sourceNumber(source,pattern,label){
 const match=source.match(pattern);
 assert.ok(match,`read the runtime ${label}, rather than duplicating its radius in the test`);
 return Number(match[1]);
}

function planetaryBounds(){
 const surface=sourceNumber(planetSource,/const radius\s*=\s*([\d.]+)\s*;/,'Earth terrain radius');
 const atmosphere=surface+sourceNumber(planetSource,/SphereGeometry\(radius\s*\+\s*([\d.]+)/,'Earth atmosphere thickness');
 const cloudFactor=sourceNumber(weatherSource,/const outside\s*=\s*radius\s*\*\s*([\d.]+)/,'cloud outer factor');
 return {surface,clouds:surface*cloudFactor,atmosphere,cloudFactor};
}

test('welcome Earth terrain, clouds and atmosphere stay outside the authored Dawn, Moon and all panorama worlds',()=>{
 const bounds=planetaryBounds();
 assert.equal(layout.orbitalPanoramaPoses.length,3);
 // Include the authored atmospheric widths even where the live Moon only has
 // terrain. This is a conservative bound for every current planetary layer.
 const authored=starSea.planets.map(planet=>({
  name:planet.id,position:planet.center,
  radius:planet.radius*Math.max(1+planet.atmosphere.width,/MOON/i.test(planet.id)?1:bounds.cloudFactor)
 }));
 assert.deepEqual(authored.map(planet=>planet.name).sort(),['PLANET_V20_DAWN','PLANET_V20_MOON']);
 const panorama=Array.from(layout.orbitalPanoramaPoses,(pose,index)=>({
  name:`panorama ${index+1}`,position:Array.from(pose.position),radius:Math.max(bounds.surface,bounds.clouds,bounds.atmosphere)*pose.scale
 }));
 for(const planet of panorama){
  assert.equal(planet.position.length,3);assert.ok(planet.position.every(Number.isFinite));
  assert.ok(Number.isFinite(planet.radius)&&planet.radius>0);
 }
 for(const narrow of [false,true]){
  const earth=layout.orbitalEarthPose({step:'bridge'},narrow);
  for(const [layer,radius] of Object.entries(bounds).filter(([name])=>name!=='cloudFactor')){
   for(const other of [...authored,...panorama]){
    const gap=distance(Array.from(earth.position),other.position)-radius*earth.scale-other.radius;
    assert.ok(gap>0,`${narrow?'phone':'desktop'} Earth ${layer} intersects ${other.name} by ${(-gap).toFixed(3)} world units`);
   }
  }
 }
 const worlds=[...authored,...panorama];
 for(let i=0;i<worlds.length;i++)for(let j=i+1;j<worlds.length;j++){
  const a=worlds[i],b=worlds[j],gap=distance(a.position,b.position)-a.radius-b.radius;
  assert.ok(gap>0,`${a.name} intersects ${b.name} by ${(-gap).toFixed(3)} world units`);
 }
});
