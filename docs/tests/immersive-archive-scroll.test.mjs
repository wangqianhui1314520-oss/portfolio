import test from 'node:test';
import assert from 'node:assert/strict';
import {createArchiveWheel,archiveStationX,archiveChapterOrder} from '../assets/js/immersive-archive-scroll.js';
import {profileTabs} from '../assets/js/immersive-profile.js';

test('wheel momentum cannot fly past multiple archive rooms',()=>{
 const wheel=createArchiveWheel();
 assert.equal(wheel.push(120,0),1);
 for(let t=20;t<1500;t+=20)assert.equal(wheel.push(90,t),0);
 assert.equal(wheel.push(120,1600),1);
 assert.equal(wheel.push(-120,3300),-1);
});
test('trackpad accumulation resets after a pause or direction change',()=>{
 const wheel=createArchiveWheel();
 assert.equal(wheel.push(35,0),0);
 assert.equal(wheel.push(-35,40),0);
 assert.equal(wheel.push(-35,80),-1);
 wheel.reset();
 assert.equal(wheel.push(40,2000),0);
 assert.equal(wheel.push(40,2300),0);
 assert.equal(wheel.push(30,2350),1);
 assert.equal(wheel.push(NaN,5000),0);
});
test('archive chapters occupy separate world positions',()=>{
 const chapters=profileTabs.map(([key])=>key),positions=chapters.map(archiveStationX);
 assert.deepEqual(chapters,archiveChapterOrder);
 assert.equal(new Set(positions).size,chapters.length);
 assert.ok(positions.every(Number.isFinite));
 assert.equal(archiveStationX('unknown'),positions[0]);
});
