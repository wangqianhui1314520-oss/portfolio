import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from '../assets/vendor/three-0.161.0/build/three.module.js';
import {surfaceLightProfile as look} from '../assets/js/immersive-surface-look.js';
const source=readFileSync(new URL('../assets/js/immersive-solar-receiver.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'');
const {bindSolarReceiver}=runInNewContext(source+';({bindSolarReceiver});',{THREE});

test('both real GLB variants carry the shared satin coatings and retain optical volumes',()=>{
 for(const file of ['tem-refined-observatory-v21.glb','tem-refined-observatory-v21-lod.glb']){
  const bytes=readFileSync(new URL('../assets/models/'+file,import.meta.url)),size=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+size));
  for(const spec of look.materials){
   const materials=doc.materials.filter(m=>m.name.startsWith(spec.prefix));assert.equal(materials.length,1);
   const m=materials[0];assert.deepEqual(m.pbrMetallicRoughness.baseColorFactor,[...spec.color,1]);assert.equal(m.pbrMetallicRoughness.metallicFactor,spec.metalness);assert.equal(m.pbrMetallicRoughness.roughnessFactor,spec.roughness);
   assert.equal(m.extensions.KHR_materials_clearcoat.clearcoatFactor,spec.clearcoat);assert.equal(m.extensions.KHR_materials_clearcoat.clearcoatRoughnessFactor,spec.clearcoatRoughness);assert.equal(m.extensions.KHR_materials_specular.specularFactor,spec.specularFactor);
  }
  assert.equal(doc.materials.filter(m=>m.extensions?.KHR_materials_volume).length,5);assert.equal(doc.images?.length||0,0);
 }
});
test('fractional solar linking follows both drawing cameras and preserves other lighting and hooks',()=>{
 const material=new THREE.MeshPhysicalMaterial(),a=new THREE.Mesh(new THREE.BoxGeometry(),material),b=new THREE.Mesh(a.geometry,material),sun={value:new THREE.Vector3(.48,.19,-.84).normalize()};let draws=0,compiles=0;
 a.onBeforeRender=()=>draws++;material.onBeforeCompile=()=>compiles++;
 const args={sunDirection:sun,visibility:look.sunVisibility,finishVariation:look.finishVariation,revision:look.revision};
 const uniform=bindSolarReceiver(a,args);assert.equal(bindSolarReceiver(b,args),uniform);
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};material.onBeforeCompile(shader,{});assert.equal(compiles,1);
 assert.equal((shader.fragmentShader.match(/uniform vec3 uTemReceiverSunView;/g)||[]).length,1,'a shared coating must not receive two shader hooks');
 const main=new THREE.PerspectiveCamera(),mirror=new THREE.PerspectiveCamera();main.rotation.set(.2,-.3,.04);mirror.lookAt(0,12,-20);
 const chunk=THREE.ShaderChunk.lights_fragment_begin,filter=shader.fragmentShader.match(/directLight\.color\*=([^;]+);/);assert.ok(filter);
 const evaluate=new Function('directionalLight','uTemReceiverSunView','smoothstep','dot','mix','return '+filter[1]+';');
 for(const camera of [main,mirror]){
  camera.updateMatrixWorld();a.onBeforeRender({},null,camera);b.onBeforeRender({},null,camera);
  const expected=sun.value.clone().applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()).invert());assert.ok(uniform.value.distanceTo(expected)<1e-12);
  for(const direction of [expected,expected.clone().negate()])assert.equal(evaluate({direction},uniform.value,(a,b,v)=>THREE.MathUtils.smoothstep(v,a,b),(a,b)=>a.dot(b),(a,b,v)=>THREE.MathUtils.lerp(a,b,v)),direction===expected?look.sunVisibility:1);
 }
 assert.equal(draws,2);assert.ok(shader.fragmentShader.replace('\n'+filter[0],'').includes(chunk));assert.equal(THREE.ShaderChunk.lights_fragment_begin,chunk);
 assert.ok(shader.vertexShader.includes('vTemCoatingWorld=(modelMatrix*vec4(transformed,1.)).xyz;'));assert.ok(shader.fragmentShader.includes('roughnessFactor=clamp('));
 assert.throws(()=>bindSolarReceiver(b,{...args,visibility:.7}),/Conflicting/);a.geometry.dispose();material.dispose();
});
