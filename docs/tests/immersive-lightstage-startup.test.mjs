import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as Three from '../assets/vendor/three-0.161.0/build/three.module.js';
import * as field from '../assets/js/immersive-volume-field.js';
import * as layout from '../assets/js/immersive-world-layout.js';

function fixture({reject=false,shared=true,deferred=true}={}){
 const calls=[],liveAtlas={dispose(){calls.push('dispose-live');}};
 let finish;
 const linked=new Promise((resolve,rejectLink)=>{finish=()=>reject?rejectLink(new Error('link failed')):resolve();});
 class PMREMGenerator{
  fromCubemap(){calls.push('pmrem');return {texture:{},width:384,height:512,dispose(){calls.push('dispose-target');}};}
  dispose(){calls.push('dispose-generator');}
 }
 class CubeCamera extends Three.Object3D{update(){calls.push('cube-draw');}}
 const source=readFileSync(new URL('../assets/js/immersive-lightstage.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'');
 const scope={THREE:{...Three,PMREMGenerator,CubeCamera},...field,...layout,performance,
  createStellarDensityAtlas(){calls.push('create-atlas');return {dispose(){calls.push('dispose-fallback');}};},
  publishOpticalRadiance(){calls.push('publish');}};
 runInNewContext(source,scope);
 const target={name:'main'};let current=target;
 const renderer={shadowMap:{needsUpdate:true,autoUpdate:false},toneMapping:Three.ACESFilmicToneMapping,
  getRenderTarget:()=>current,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,
  setRenderTarget(value){assert.ok(value===target||value?.isWebGLCubeRenderTarget,'only the probe cube or the caller target is bound');current=value;},
  compileAsync(scene,camera){
   calls.push('compile');assert.equal(scene.children[0].material.uniforms.uAtlas.value,liveAtlas);assert.equal(camera.fov,90);
   // The capture draws linear HDR cube faces; the canvas would select an sRGB-output variant.
   assert.ok(current?.isWebGLCubeRenderTarget,'compiles the variant drawn by the capture');
   assert.equal(current.texture.colorSpace,Three.LinearSRGBColorSpace);assert.equal(current.width,128);
   return linked;
  }};
 const stage=scope.createCinematicEnvironment({renderer,deferCapture:deferred,volumeState:shared?{uAtlas:{value:liveAtlas}}:null});
 return {stage,calls,finish,target,get current(){return current;}};
}

test('first probe waits for shader linking once and borrows the live density atlas',async()=>{
 const f=fixture(),a=f.stage.prepare(),b=f.stage.prepare();assert.equal(a,b);assert.equal(f.stage.texture,null);
 await Promise.resolve();assert.deepEqual(f.calls,['compile']);assert.equal(f.current,f.target,'the caller target is restored while linking');
 f.finish();const texture=await a;assert.equal(texture,f.stage.texture);
 assert.deepEqual(f.calls,['compile','cube-draw','pmrem','publish']);
 assert.equal(f.stage.stats.captures,1);assert.equal(f.stage.stats.sharedVolume,true);
 assert.equal(await f.stage.prepare(),texture);assert.equal(f.stage.stats.captures,1);
 f.stage.dispose();assert.ok(!f.calls.includes('dispose-live'),'the live atmosphere owns its atlas');
});

test('a failed or disposed shader preparation cannot capture or announce a valid probe',async()=>{
 for(const reject of [true,false]){
  const f=fixture({reject}),pending=f.stage.prepare();await Promise.resolve();
  if(!reject)f.stage.dispose();f.finish();
  await assert.rejects(pending,reject?/link failed/:/disposed during/);
  assert.equal(f.stage.texture,null);assert.ok(!f.calls.includes('cube-draw'));
  f.stage.dispose();assert.ok(!f.calls.includes('dispose-live'));
 }
});

test('existing synchronous callers retain their first probe and owned fallback disposal',()=>{
 const f=fixture({deferred:false,shared:false});assert.equal(f.stage.stats.captures,1);
 assert.deepEqual(f.calls,['create-atlas','cube-draw','pmrem','publish']);
 f.stage.dispose();assert.ok(f.calls.includes('dispose-fallback'));
});

test('quality tiers change probe steps but never the PMREM size that physical shaders compile against',async()=>{
 const f=fixture();const pending=f.stage.prepare();await Promise.resolve();f.finish();await pending;
 assert.equal(f.stage.stats.cubeSize,128);assert.equal(f.stage.stats.probeSteps,12);
 assert.equal(f.stage.update({time:30,quality:.6,force:true}),true);
 assert.equal(f.stage.stats.cubeSize,128,'a low tier keeps the cube edge, so envMapCubeUVHeight stays fixed');assert.equal(f.stage.stats.probeSteps,8);
 assert.equal(f.stage.update({time:31,quality:1,force:true}),true);
 assert.equal(f.stage.stats.cubeSize,128);assert.equal(f.stage.stats.probeSteps,12);assert.equal(f.stage.stats.captures,3);
 f.stage.dispose();
});
