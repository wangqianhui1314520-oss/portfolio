import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createOpeningPlayback} from '../assets/js/immersive-opening-playback.js';
import {openingTimeline,OPENING_DURATION} from '../assets/js/immersive-opening-timeline.js';

const sourceFor=file=>readFileSync(new URL('../assets/js/'+file,import.meta.url),'utf8')
 .replace(/^import .*$/gm,'').replace(/^export /gm,'');

function sceneHarness(){
 const classes=new Set(['webgl-ready']),events=[],errors=[],canvas={dataset:{},style:{}};
 const scope={document:{getElementById:()=>canvas,body:{classList:{
  add:name=>classes.add(name),remove:name=>classes.delete(name)
 }}},getMotionPreference:()=>({matches:false}),
  dispatchEvent:event=>events.push(event.type),Event:class{constructor(type){this.type=type;}},
  console:{error:(...args)=>errors.push(args)}};
 const source=sourceFor('immersive-cosmos.js').replace(/try \{initialize\(\);\} catch[\s\S]*$/,'');
 runInNewContext(source+'\nglobalThis.setNavigation=value=>{activeNavigation=value;};',scope);
 return {scope,classes,events,errors,canvas};
}

test('first-frame failures cannot announce readiness, repeat or block a restored context',()=>{
 const {scope}=sceneHarness(),calls=[],failure=new Error('PMREM failed');
 const boundary=scope.createSceneRenderBoundary(error=>calls.push(error));
 assert.equal(boundary.run(()=>{calls.push('environment');throw failure;},()=>calls.push('ready')),false);
 assert.deepEqual(calls,['environment',failure]);assert.equal(boundary.failed,true);
 assert.equal(boundary.run(()=>calls.push('render'),()=>calls.push('ready')),false);
 assert.deepEqual(calls,['environment',failure],'a failed loop stops instead of throwing every frame');
 boundary.restore();assert.equal(boundary.failed,false);
 assert.equal(boundary.run(()=>calls.push('composite'),()=>calls.push('ready')),true);
 assert.deepEqual(calls,['environment',failure,'composite','ready']);
});

test('skipped frames do not announce readiness, and a later rendering exception stops the loop',()=>{
 const {scope}=sceneHarness(),calls=[];
 const boundary=scope.createSceneRenderBoundary(error=>calls.push(error.message));
 assert.equal(boundary.run(()=>false,()=>calls.push('ready')),false);
 assert.deepEqual(calls,[]);assert.equal(boundary.failed,false);
 boundary.run(()=>calls.push('composite'),()=>calls.push('ready'));
 boundary.run(()=>{throw new Error('reflection failed');},()=>calls.push('ready'));
 assert.deepEqual(calls,['composite','ready','reflection failed']);assert.equal(boundary.failed,true);
});

test('the production readiness callback runs only after its render pass succeeds',()=>{
 const {scope}=sceneHarness(),calls=[];
 // Execute the real rAF entry point with a fault-injected render pass. The
 // graphics-independent boundary lets this test cover ordering without a GPU.
 const source=sourceFor('immersive-cosmos.js');
 const callback=source.slice(source.indexOf("  let renderPhase = 'initializing';"),source.indexOf('  function renderFrame(ms)'));
 Object.assign(scope,{cancelAnimationFrame(){},animation:1,starSea:{ready:true},dreamObservatory:{ready:true},frame:1,announced:false,
  renderFrame(){calls.push('composite');throw new Error('first composite failed');},
  dispatchEvent:event=>calls.push(event.type)});
 runInNewContext(callback+'\nrender(0);',scope);
 assert.deepEqual(calls,['composite','tem:scene-failed']);
 scope.renderFrame=()=>{calls.push('composite');return true;};
 runInNewContext('renderBoundary.restore();render(16);',scope);
 assert.deepEqual(calls,['composite','tem:scene-failed','composite','tem:scene-ready']);
});

test('a render failure releases navigation and preserves an inspectable phase and reason',()=>{
 const h=sceneHarness();let releases=0;
 h.scope.setNavigation({fallback(){releases++;throw new Error('release failed');}});
 h.scope.reportSceneFailure(new Error('synthetic driver error'),'composite');
 assert.equal(releases,1);assert.equal(h.classes.has('webgl-ready'),false);assert.equal(h.classes.has('scene-fallback'),true);
 assert.equal(h.canvas.style.opacity,'0');assert.equal(h.canvas.dataset.scene,'fallback');
 assert.equal(h.canvas.dataset.sceneFailurePhase,'composite');assert.equal(h.canvas.dataset.sceneFailureReason,'synthetic driver error');
 assert.deepEqual(h.events,['tem:scene-failed'],'a navigation error cannot prevent the fallback event');
});

function openingHarness({request=true}={}){
 const listeners=new Map(),elements=new Map(),timeouts=[],events=[],classes=new Set(['webgl-ready']);
 class Target{
  dataset={};handlers=new Map();
  addEventListener(type,handler){this.handlers.set(type,handler);}
  setAttribute(){}
 }
 const element=id=>{if(!elements.has(id))elements.set(id,new Target());return elements.get(id);};
 const body={dataset:{},style:{setProperty(){}},classList:{contains:name=>classes.has(name)}};
 const document={body,hidden:false,getElementById:element,querySelector:element};
 const scope={document,createOpeningPlayback,openingTimeline,OPENING_DURATION,
  getMotionPreference:()=>Object.assign(new Target(),{matches:false}),journey:{state:{step:'bridge'}},navigate(){},
  addEventListener(type,handler){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(handler);},
  dispatchEvent(event){events.push(event.type);for(const handler of listeners.get(event.type)||[])handler(event);},
  Event:class{constructor(type){this.type=type;}},CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail;}},
  setTimeout(callback,delay){timeouts.push({callback,delay});return timeouts.length;}};
 runInNewContext(sourceFor('immersive-intro.js'),scope);
 const emit=type=>scope.dispatchEvent(new scope.Event(type));
 if(request)emit('tem:graphics-request');
 return {body,document,elements,timeouts,events,emit};
}

test('webgl-ready without a successful frame times out and releases existing choices',()=>{
 const h=openingHarness();h.timeouts[0].callback();
 assert.ok(h.events.includes('tem:scene-failed'));assert.equal(h.body.dataset.openingResult,'graphics-timeout');
 assert.equal(h.elements.get('expeditionUI').inert,false);assert.equal(h.elements.get('.bridge-header').inert,false);
 assert.equal(h.elements.get('space').dataset.sceneFailurePhase,'first-frame');
 assert.equal(h.elements.get('space').dataset.sceneFailureReason,'graphics-timeout');
});

test('a successful frame or explicit scene readiness prevents a false graphics timeout',()=>{
 for(const signal of ['frame','ready']){
  const h=openingHarness();
  if(signal==='frame')h.document.getElementById('space').dataset.renderFrame='1';else h.emit('tem:scene-ready');
  h.timeouts[0].callback();assert.equal(h.events.includes('tem:scene-failed'),false,signal);
 }
});

test('hidden tabs defer the check and earlier failures retain their diagnostic reason',()=>{
 const hidden=openingHarness();hidden.document.hidden=true;hidden.timeouts[0].callback();
 assert.equal(hidden.events.includes('tem:scene-failed'),false);assert.equal(hidden.timeouts.length,2);
 assert.equal(hidden.timeouts[1].delay,20000);hidden.document.hidden=false;
 hidden.document.getElementById('space').dataset.renderFrame='1';hidden.timeouts[1].callback();
 assert.equal(hidden.events.includes('tem:scene-failed'),false);
 const failed=openingHarness(),canvas=failed.document.getElementById('space');
 canvas.dataset.sceneFailurePhase='environment';canvas.dataset.sceneFailureReason='PMREM failed';
 failed.emit('tem:scene-failed');failed.timeouts[0].callback();
 assert.equal(failed.body.dataset.openingResult,'graphics-fallback');assert.equal(canvas.dataset.sceneFailurePhase,'environment');
 assert.equal(canvas.dataset.sceneFailureReason,'PMREM failed');assert.equal(failed.events.filter(type=>type==='tem:scene-failed').length,1);
});

test('restoring visibility starts a full first-frame interval and invalidates the old timer',()=>{
 const standby=openingHarness({request:false});
 standby.document.hidden=true;standby.emit('visibilitychange');
 standby.document.hidden=false;standby.emit('visibilitychange');
 assert.equal(standby.timeouts.length,0,'visibility alone must not start graphics loading or a watchdog');
 const h=openingHarness(),oldTimer=h.timeouts[0];
 h.document.hidden=true;h.emit('visibilitychange');oldTimer.callback();
 const hiddenTimer=h.timeouts[1];
 h.document.hidden=false;h.emit('visibilitychange');
 const visibleTimer=h.timeouts[2];assert.equal(visibleTimer.delay,20000);
 hiddenTimer.callback();oldTimer.callback();
 assert.equal(h.events.includes('tem:scene-failed'),false,'old callbacks cannot beat the first visible animation frame');
 h.document.getElementById('space').dataset.renderFrame='1';visibleTimer.callback();
 assert.equal(h.events.includes('tem:scene-failed'),false);
});
