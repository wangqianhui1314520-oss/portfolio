import test from 'node:test';
import assert from 'node:assert/strict';
import { cinematicEase } from '../assets/js/immersive-easing.js';

test('camera curve parameters stay valid at the floating point arrival boundary',()=>{
 for(let i=0;i<=100000;i++){
  const progress=1-i*1e-10,eased=cinematicEase(progress);
  assert.ok(Number.isFinite(eased)&&eased>=0&&eased<=1,`invalid curve parameter at ${progress}`);
 }
 assert.equal(cinematicEase(1),1);assert.equal(cinematicEase(1+Number.EPSILON),1);
 assert.equal(cinematicEase(-.01),0);assert.equal(cinematicEase(NaN),1);
});
