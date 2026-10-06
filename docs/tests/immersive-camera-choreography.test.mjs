import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {cinematicEase} from '../assets/js/immersive-easing.js';
import {createJourney,transitionDurations} from '../assets/js/immersive-journey.js';
import {archivePose,archiveWelcomePose,createArchiveRail,archiveChapterOrder} from '../assets/js/immersive-archive-path.js';

function moduleScope(name,extra={}){
 const source=readFileSync(new URL('../assets/js/'+name,import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'');
 const scope={cinematicEase,...extra};runInNewContext(source,scope);return scope;
}

test('the rendered archive orbit is monotone, retains reversal inertia, and settles across frame rates',()=>{
 const {followArchiveRail}=moduleScope('immersive-navigation.js');
 const ends=[];
 for(const fps of [30,60,144]){
  let progress=0,velocity=0;
  for(let i=0;i<fps*2;i++){
   const previous=progress;[progress,velocity]=followArchiveRail(progress,velocity,3,1/fps);
   assert.ok(progress>=previous&&progress<=3);assert.ok(Number.isFinite(velocity));
  }
  ends.push(progress);assert.equal(progress,3);assert.equal(velocity,0);
 }
 assert.deepEqual(ends,[3,3,3]);
 let progress=0,velocity=0;
 for(let i=0;i<8;i++)[progress,velocity]=followArchiveRail(progress,velocity,1,1/60);
 const previous=progress,coastingStep=velocity/60;
 [progress,velocity]=followArchiveRail(progress,velocity,0,1/60);
 assert.ok(progress>previous,'reversing a command decelerates before reversing the real camera');
 assert.ok(progress-previous<coastingStep,'the reverse command immediately brakes the existing velocity');
 for(let i=0;i<150;i++)[progress,velocity]=followArchiveRail(progress,velocity,0,1/60);
 assert.equal(progress,0);assert.equal(velocity,0);
 const still=followArchiveRail(1.2,2,3,1/30,false);assert.equal(still[0],3);assert.equal(still[1],0);
});

test('planet reveal, cabin approach and docking aim settle without an intermediate discontinuity',()=>{
 const {openingLookPoint,dockingAimDip}=moduleScope('immersive-navigation.js'),welcome=[.7,2.5,-5];
 assert.deepEqual(Array.from(openingLookPoint(11.5,welcome)),welcome);
 assert.deepEqual(Array.from(openingLookPoint(14,welcome)),welcome);
 for(const time of [2,6.2,9,11.5]){
  const before=openingLookPoint(time-.0001,welcome),after=openingLookPoint(time+.0001,welcome);
  assert.ok(before.every((value,index)=>Math.abs(value-after[index])<.0001));
 }
 assert.equal(dockingAimDip(0),0);assert.equal(dockingAimDip(1),0);assert.equal(dockingAimDip(.5),1);
 assert.ok(dockingAimDip(.0001)<1e-9);assert.ok(dockingAimDip(.9999)<1e-9);
});

test('new compact cabin removes only fallback architecture and overview hardware, retaining all later exhibits',()=>{
 const {applyArchiveReplacement}=moduleScope('immersive-archive-optical.js');
 const architecture={},bays=archiveChapterOrder.map(key=>({key,primary:{fixed:{},pane:{}},rig:{visible:true}}));
 const fixture={architecture,bays,authoredDisplays:[],compact:true,map:false,deckReady:false};
 assert.equal(applyArchiveReplacement(fixture,0),1);assert.equal(architecture.visible,true);
 assert.ok(bays.every(bay=>bay.primary.fixed.visible));
 assert.equal(applyArchiveReplacement(fixture,1),0);assert.equal(architecture.visible,false);
 assert.equal(bays[0].primary.fixed.visible,false);assert.equal(bays[0].primary.pane.visible,false);
 for(const bay of bays.slice(1)){assert.equal(bay.primary.fixed.visible,true);assert.equal(bay.primary.pane.visible,true);assert.equal(bay.rig.visible,true);}
 const authoredDisplays=bays.map(bay=>({bay,root:{}}));
 applyArchiveReplacement({...fixture,compact:false,authoredDisplays},1);
 assert.equal(authoredDisplays[0].root.visible,false);assert.ok(authoredDisplays.slice(1).every(display=>display.root.visible));
});

class Vector3{
 constructor(x=0,y=0,z=0){this.set(x,y,z);}set(x,y,z){Object.assign(this,{x,y,z});return this;}fromArray(a){return this.set(...a);}toArray(){return [this.x,this.y,this.z];}
 copy(v){return this.set(v.x,v.y,v.z);}clone(){return new Vector3().copy(this);}add(v){return this.set(this.x+v.x,this.y+v.y,this.z+v.z);}sub(v){return this.set(this.x-v.x,this.y-v.y,this.z-v.z);}
 multiplyScalar(s){return this.set(this.x*s,this.y*s,this.z*s);}addScaledVector(v,s){return this.set(this.x+v.x*s,this.y+v.y*s,this.z+v.z*s);}
 length(){return Math.hypot(this.x,this.y,this.z);}normalize(){return this.multiplyScalar(1/(this.length()||1));}distanceTo(v){return Math.sqrt(this.distanceToSquared(v));}distanceToSquared(v){return (this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2;}
 lerp(v,t){return this.lerpVectors(this.clone(),v,t);}lerpVectors(a,b,t){return this.set(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);}
 cross(v){return this.crossVectors(this.clone(),v);}crossVectors(a,b){return this.set(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);}
 applyAxisAngle(_,angle){const x=this.x,z=this.z;return this.set(x*Math.cos(angle)+z*Math.sin(angle),this.y,-x*Math.sin(angle)+z*Math.cos(angle));}
}
class Vector2{constructor(){this.set(0,0);}set(x,y){Object.assign(this,{x,y});return this;}lerp(v,t){return this.set(this.x+(v.x-this.x)*t,this.y+(v.y-this.y)*t);}length(){return Math.hypot(this.x,this.y);}}

test('changing the real journey captures the rendered eye once without doubling orbit or pointer offsets',()=>{
 const listeners=new Map(),subscriptions=[],elements=new Map(),archiveRail=createArchiveRail(),journey=createJourney([{id:'one',title:'One',type:'游戏'}]);
 const element=id=>{if(!elements.has(id))elements.set(id,{dataset:{},hidden:false,addEventListener(){}});return elements.get(id);};
 const body={dataset:{archiveChapter:'overview'},classList:{remove(){},add(){}}};
 const camera={position:new Vector3(),quaternion:{copy(){}},fov:54,_look:new Vector3(),lookAt(v){this._look.copy(v);},getWorldDirection(v){return v.copy(this._look).sub(this.position).normalize();},rotateZ(){},updateProjectionMatrix(){},updateMatrixWorld(){}};
 const scope=moduleScope('immersive-navigation.js',{
  THREE:{Vector3,Vector2,Quaternion:class{copy(){}},MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,p)=>a+(b-a)*p,damp:(a,b,r,dt)=>a+(b-a)*(1-Math.exp(-r*dt))},CatmullRomCurve3:class{
   constructor(points){this.points=points;}updateArcLengths(){}getPointAt(t,v){const segment=t*(this.points.length-1),i=Math.min(this.points.length-2,Math.floor(segment));return v.lerpVectors(this.points[i],this.points[i+1],segment-i);}
  }},
  journey,subscribe:callback=>subscriptions.push(callback),getRevision:()=>1,transitionDurations,archiveRail,archivePose,archiveWelcomePose,archiveChapterOrder,
  createSpatialWorld:()=>({pose(){const p=archivePose(archiveRail.progress);return {position:new Vector3(...p.position),look:new Vector3(...p.look),fov:p.fov};},update(){},layout(){},opticalAnchor(){}}),
  opening:{active:false,frame:{route:1,fov:52,time:14}},updateOpening:()=>1,
  document:{body,getElementById:element,querySelectorAll:()=>[]},innerWidth:1280,innerHeight:720,performance:{now:()=>1000},
  addEventListener(type,callback){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(callback);},dispatchEvent(){},CustomEvent:class{},queueMicrotask
 });
 const navigation=scope.createNavigation({scene:{},camera}),pointer={x:.45,y:.18};
 for(let i=0;i<90;i++)navigation.update(1/60,pointer,i/60,1);
 const target={closest:()=>null};for(const callback of listeners.get('pointerdown'))callback({button:0,clientX:100,clientY:100,target});
 for(const callback of listeners.get('pointermove'))callback({clientX:700,clientY:170,target});
 for(let i=0;i<90;i++)navigation.update(1/60,pointer,2+i/60,1);
 const eye=camera.position.clone(),direction=camera.getWorldDirection(new Vector3()),fov=camera.fov;
 journey.dispatch('captain');for(const callback of subscriptions)callback();
 const frame=navigation.update(0,pointer,4,1,0);
 assert.ok(camera.position.distanceTo(eye)<1e-9);assert.ok(camera.getWorldDirection(new Vector3()).distanceTo(direction)<1e-9);
 assert.equal(camera.fov,fov);assert.equal(frame.shotProgress,0);assert.equal(frame.step,'captain');
});
