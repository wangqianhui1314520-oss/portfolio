import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createJourney} from '../assets/js/immersive-journey.js';
import {createOpeningPlayback} from '../assets/js/immersive-opening-playback.js';
import {openingTimeline,OPENING_DURATION} from '../assets/js/immersive-opening-timeline.js';

// Exercise the real opening controller with a small event/DOM boundary and real state machine.
function openingHarness({reduced=false,fallback=false}={}){
 const listeners=new Map(),elements=new Map(),timeouts=[],events=[],actions=[];
 class Target {
  handlers=new Map();hidden=false;disabled=false;inert=false;textContent='';innerHTML='';
  addEventListener(type,handler){if(!this.handlers.has(type))this.handlers.set(type,[]);this.handlers.get(type).push(handler);}
  emit(type,event={}){for(const handler of this.handlers.get(type)||[])handler(event);}
  setAttribute(){}
 }
 const element=id=>{if(!elements.has(id))elements.set(id,new Target());return elements.get(id);};
 const classes=new Set(fallback?['scene-fallback']:[]);
 const body={dataset:{},style:{setProperty(){}},classList:{contains:cls=>classes.has(cls)}};
 const media=new Target();media.matches=reduced;
 const journey=createJourney([{id:'sample',title:'Sample',type:'游戏',sector:'forge'}]);
 const source=readFileSync(new URL('../assets/js/immersive-intro.js',import.meta.url),'utf8')
  .replace(/^import .+;\s*$/gm,'').replace(/\bexport (?=(const|function)\b)/g,'');
 const context={
  journey,navigate(action,value){actions.push(action);return journey.dispatch(action,value);},
  createOpeningPlayback,openingTimeline,OPENING_DURATION,
  matchMedia:()=>media,getMotionPreference:()=>media,
  document:{body,getElementById:element,querySelector:selector=>element(selector)},
  addEventListener(type,handler){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(handler);},
  dispatchEvent(event){events.push(event);for(const handler of listeners.get(event.type)||[])handler(event);},
  Event:class{constructor(type){this.type=type;}},
  CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail;}},
  setTimeout(callback){timeouts.push(callback);}
 };
 runInNewContext(source+'\nglobalThis.controller={opening,updateOpening,openingFlightProgress};',context);
 const emit=(type,event={})=>{for(const handler of listeners.get(type)||[])handler(event);};
 return {journey,body,elements,actions,events,timeouts,media,classes,emit,
  click:id=>element(id).emit('click'),...context.controller};
}

test('the full movie holds on welcome indefinitely and only a visitor chooses a destination',()=>{
 const h=openingHarness();
 h.emit('tem:scene-ready');h.click('startOpening');
 for(let i=0;i<27;i++)h.updateOpening(.5);
 assert.equal(h.opening.active,true);assert.equal(h.elements.get('expeditionUI').inert,true);
 h.updateOpening(.5);
 assert.equal(h.body.dataset.opening,'complete');assert.equal(h.body.dataset.openingResult,'complete');
 assert.equal(h.journey.state.step,'bridge');assert.deepEqual(h.actions,[]);
 assert.equal(h.elements.get('expeditionUI').inert,false);
 assert.equal(h.events.filter(e=>e.type==='tem:opening-complete').length,1);
 h.updateOpening(600);assert.equal(h.journey.state.step,'bridge');
 assert.equal(h.journey.dispatch('captain'),true);assert.equal(h.journey.state.step,'captain');
 h.journey.dispatch('back');assert.equal(h.journey.state.step,'bridge');
 assert.equal(h.journey.dispatch('start'),true);assert.equal(h.journey.state.step,'boot');
 h.journey.dispatch('ready');assert.equal(h.journey.state.step,'map');
 assert.equal(h.journey.detail,undefined);
});

test('skip, Escape and reduced motion arrive at the same held welcome',()=>{
 const skipped=openingHarness();skipped.click('skipOpening');
 assert.equal(skipped.body.dataset.openingResult,'skipped');assert.equal(skipped.journey.state.step,'bridge');
 assert.equal(skipped.elements.get('expeditionUI').inert,false);
 const escaped=openingHarness();let stopped=false;
 escaped.emit('keydown',{key:'Escape',preventDefault(){},stopImmediatePropagation(){stopped=true;}});
 assert.equal(stopped,true);assert.equal(escaped.opening.active,false);assert.equal(escaped.journey.state.step,'bridge');
 const reduced=openingHarness({reduced:true});reduced.emit('tem:scene-ready');reduced.click('startOpening');
 assert.equal(reduced.body.dataset.openingResult,'reduced-motion');assert.equal(reduced.journey.state.step,'bridge');
 assert.deepEqual(reduced.actions,[]);
});

test('cold keyboard and button skips request graphics while holding the same welcome',()=>{
 for(const shortcut of ['button','keyboard']){
  const h=openingHarness();
  if(shortcut==='button')h.click('skipOpening');
  else h.emit('keydown',{key:'Escape',preventDefault(){},stopImmediatePropagation(){}});
  assert.equal(h.events.filter(event=>event.type==='tem:opening-skip').length,1);
  assert.equal(h.body.dataset.opening,'complete');assert.equal(h.opening.started,false);
  h.emit('tem:scene-ready');
  assert.equal(h.opening.ready,true);assert.equal(h.opening.active,false);
  assert.equal(h.body.dataset.opening,'complete');assert.equal(h.journey.state.step,'bridge');
  assert.equal(h.elements.get('expeditionUI').inert,false);
 }
});

test('the actual opening route carries nonzero continuous momentum through each narrative beat',()=>{
 const h=openingHarness(),flight=h.openingFlightProgress,epsilon=.0001;
 let previous=0;
 for(let t=0;t<=14;t+=.001){const progress=flight(t);assert.ok(progress>=previous&&progress<=1);previous=progress;}
 for(const beat of [2,5,6.2,9]){
  const before=(flight(beat)-flight(beat-epsilon))/epsilon,after=(flight(beat+epsilon)-flight(beat))/epsilon;
  assert.ok(before>.005&&after>.005,'a camera beat must not stop the ship');
  assert.ok(Math.abs(after-before)<.001,'camera velocity is continuous at the cut-free beat');
 }
 assert.equal(flight(11.5),1);assert.equal(flight(14),1);assert.equal(flight(NaN),1);
 h.emit('tem:scene-ready');h.click('startOpening');h.updateOpening(5);
 assert.equal(h.opening.frame.route,flight(5),'the actual controller publishes the shared route to camera and optics');
});

test('graphics failure and timeout release both choices without choosing one for the visitor',()=>{
 const failed=openingHarness();failed.emit('tem:scene-failed');
 assert.equal(failed.body.dataset.openingResult,'graphics-fallback');assert.equal(failed.journey.state.step,'bridge');
 assert.equal(failed.elements.get('expeditionUI').inert,false);assert.equal(failed.elements.get('.bridge-header').inert,false);
 const timedOut=openingHarness();timedOut.emit('tem:graphics-request');timedOut.timeouts[0]();
 assert.equal(timedOut.body.dataset.openingResult,'graphics-timeout');assert.equal(timedOut.journey.state.step,'bridge');
 assert.deepEqual(timedOut.actions,[]);
});

test('waiting for a visitor does not start a graphics timeout',()=>{
 const h=openingHarness();
 assert.equal(h.timeouts.length,0);
 assert.equal(h.opening.started,false);
 assert.equal(h.elements.get('startOpening').disabled,false);
});

test('replay returns to the opening then holds again, including when reduced motion changes during flight',()=>{
 const h=openingHarness();h.emit('tem:scene-ready');h.click('skipOpening');h.journey.dispatch('captain');
 h.click('replayOpening');assert.equal(h.journey.state.step,'bridge');assert.equal(h.opening.age,0);
 assert.equal(h.opening.active,true);assert.equal(h.elements.get('expeditionUI').inert,true);
 h.updateOpening(5);h.media.matches=true;h.media.emit('change');
 assert.equal(h.body.dataset.openingResult,'reduced-motion');assert.equal(h.journey.state.step,'bridge');
 assert.deepEqual(h.actions,['home']);
});
