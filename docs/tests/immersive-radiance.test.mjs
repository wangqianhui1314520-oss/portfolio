import test from 'node:test';
import assert from 'node:assert/strict';
import { createRadianceCapturePolicy, createStellarDensityAtlas } from '../assets/js/immersive-volume-field.js';

test('world lighting reuses its capture while motion is frozen and refreshes once after invalidation',()=>{
 const policy=createRadianceCapturePolicy();
 assert.equal(policy.shouldCapture({time:0,motion:false}),true);
 policy.remember({time:0});
 assert.equal(policy.shouldCapture({time:900,motion:false}),false);
 policy.invalidate();assert.equal(policy.shouldCapture({time:900,motion:false}),true);
 policy.remember({time:900});assert.equal(policy.shouldCapture({time:901,motion:false}),false);
});

test('full and low probe budgets cap expensive captures and a restarted clock can refresh',()=>{
 const policy=createRadianceCapturePolicy();policy.remember({time:4,quality:1});
 assert.equal(policy.shouldCapture({time:15.99,quality:1}),false);
 assert.equal(policy.shouldCapture({time:16,quality:1}),true);
 policy.remember({time:16,quality:1});assert.equal(policy.shouldCapture({time:0,quality:1}),true);
 policy.remember({time:0,quality:.65});
 assert.equal(policy.shouldCapture({time:23.99,quality:.65}),false);
 assert.equal(policy.shouldCapture({time:24,quality:.65}),true);
 assert.equal(policy.shouldCapture({time:1,quality:1}),true,'a resolution tier change needs its one matching capture');
});

test('generated 3D density slices have seamless interpolation guards and deterministic shared data',()=>{
 class DataTexture{constructor(data,width,height){this.image={data,width,height};}}
 const mock={DataTexture,RGBAFormat:1,LinearFilter:2};
 const a=createStellarDensityAtlas(mock),b=createStellarDensityAtlas(mock);
 assert.deepEqual(a.image,b.image);assert.equal(a.image.width,272);assert.equal(a.image.height,136);
 const pixel=(z,x,y)=>{const offset=((Math.floor(z/8)*34+y)*272+(z%8)*34+x)*4;return [...a.image.data.slice(offset,offset+4)];};
 for(let z=0;z<32;z++)for(let n=1;n<=32;n++){
  assert.deepEqual(pixel(z,0,n),pixel(z,32,n));assert.deepEqual(pixel(z,33,n),pixel(z,1,n));
  assert.deepEqual(pixel(z,n,0),pixel(z,n,32));assert.deepEqual(pixel(z,n,33),pixel(z,n,1));
 }
 assert.equal(a.generateMipmaps,false);assert.equal(a.needsUpdate,true);
});
