import test from 'node:test';
import assert from 'node:assert/strict';
import { openingTimeline,OPENING_DURATION } from '../assets/js/immersive-opening-timeline.js';
import { createOpeningPlayback } from '../assets/js/immersive-opening-playback.js';

test('a loaded background preview cannot consume the voyage before boarding',()=>{
 const playback=createOpeningPlayback(OPENING_DURATION),s=playback.state;
 playback.advance(120);assert.equal(s.age,0);
 playback.ready();playback.advance(600);assert.equal(s.age,0);assert.equal(s.started,false);
 playback.start();playback.advance(5.6);assert.ok(Math.abs(s.progress-.4)<1e-10);assert.ok(openingTimeline(s.age).warp>.99);
 playback.advance(100);assert.equal(s.age,14);playback.finish();assert.equal(s.active,false);
 playback.reset();assert.equal(s.started,false);assert.equal(s.duration,14);assert.equal(s.age,0);
 playback.start();playback.advance(1);assert.equal(s.age,1);assert.equal(s.active,true);
});

test('boarding waits for graphics readiness and invalid time cannot skip the voyage',()=>{
 const playback=createOpeningPlayback(OPENING_DURATION);
 playback.start();playback.advance(90);assert.equal(playback.state.age,0);
 playback.ready();playback.advance(NaN);playback.advance(-5);assert.equal(playback.state.age,0);
 playback.advance(.5);assert.equal(playback.state.age,.5);
 playback.finish();assert.equal(playback.advance(3),1);
});

test('opening flight advances continuously and settles before identity actions',()=>{
 let previous=0;
 for(let i=0;i<=14000;i++){
  const frame=openingTimeline(i/1000);
  assert.ok(frame.route>=previous&&frame.route<=1,'flight must not move backwards');previous=frame.route;
  for(const key of ['warp','bridge','panel','identity','actions','header','black','bars'])assert.ok(Number.isFinite(frame[key])&&frame[key]>=0&&frame[key]<=1,key);
  if(frame.actions>0){assert.equal(frame.route,1);assert.equal(frame.warp,0);assert.equal(frame.panel,1);assert.equal(frame.identity,1);}
 }
 const final=openingTimeline(OPENING_DURATION);assert.equal(final.route,1);assert.equal(final.actions,1);assert.equal(final.bars,0);assert.equal(final.fov,52);
});
test('jump is bounded and revisit cannot trigger the long flight',()=>{
 assert.equal(openingTimeline(4.99).warp,0);assert.equal(openingTimeline(6.2).warp,0);assert.ok(openingTimeline(5.6).warp>.99);
 for(const t of [0,.4,1,2]){const frame=openingTimeline(t,true);assert.equal(frame.route,1);assert.equal(frame.warp,0);assert.equal(frame.flight,0);}
 assert.equal(openingTimeline(NaN).route,1);assert.equal(openingTimeline(-1).route,0);assert.equal(openingTimeline(99).actions,1);
});
