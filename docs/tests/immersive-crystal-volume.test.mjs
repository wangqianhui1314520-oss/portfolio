import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from '../assets/vendor/three-0.161.0/build/three.module.js';
import {stellarNoiseGLSL} from '../assets/js/immersive-volume-field.js';
import {crystalMediumProfile as look} from '../assets/js/immersive-crystal-look.js';

function crystalModule(){
 const source=readFileSync(new URL('../assets/js/immersive-crystal-volume.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'');
 return runInNewContext(source+';({bindCrystalVolume,crystalChambers,crystalVolumeGLSL});',{THREE,stellarNoiseGLSL,look});
}

test('the internal light chambers remain inside the actual full and compact closed crystal',()=>{
 const {crystalChambers}=crystalModule();
 for(const filename of ['tem-refined-observatory-v21.glb','tem-refined-observatory-v21-lod.glb']){
  const bytes=readFileSync(new URL('../assets/models/'+filename,import.meta.url)),length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length).toString()),binary=bytes.subarray(28+length);
  const node=doc.nodes.find(n=>n.extras?.tem_material_kind==='identity-crystal');assert.ok(node,filename);
  const primitive=doc.meshes[node.mesh].primitives[0];
  function values(index){
   const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],n=a.type==='VEC3'?3:1,step=v.byteStride||n*(a.componentType===5123?2:4),start=(v.byteOffset||0)+(a.byteOffset||0),result=[];
   for(let i=0;i<a.count;i++)for(let j=0;j<n;j++)result.push(a.componentType===5126?binary.readFloatLE(start+i*step+j*4):a.componentType===5123?binary.readUInt16LE(start+i*step+j*2):binary.readUInt32LE(start+i*step+j*4));return result;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(values(primitive.attributes.POSITION),3));geometry.setIndex(values(primitive.indices));
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
  const ray=new THREE.Raycaster(),direction=new THREE.Vector3(1,.123,.077).normalize();
  for(const chamber of crystalChambers)for(const x of [0,.5,1])for(const y of [0,.5,1])for(const z of [0,.5,1]){
   const p=new THREE.Vector3(...[x,y,z].map((v,i)=>THREE.MathUtils.lerp(chamber.min[i],chamber.max[i],v)));
   ray.set(p,direction);const hits=ray.intersectObject(mesh),unique=hits.filter((h,i)=>i===0||h.distance-hits[i-1].distance>.0001);
   assert.equal(unique.length%2,1,`${filename}: chamber point ${p.toArray()} escaped the optical body`);
  }
  geometry.dispose();mesh.material.dispose();
 }
});

test('a refracted internal field follows the real camera and keeps prior reveal shader hooks',()=>{
 const {bindCrystalVolume}=crystalModule(),time={value:4},excitation={value:.48};
 const material=new THREE.MeshPhysicalMaterial({transmission:.94}),mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);
 let oldDraws=0,oldCompiles=0;mesh.onBeforeRender=()=>oldDraws++;material.onBeforeCompile=()=>oldCompiles++;
 mesh.position.set(9.6,6.5,-17);mesh.rotation.y=-.28;mesh.scale.setScalar(.6);mesh.updateMatrixWorld();
 const atlas={value:{name:'shared live 3D density'}};
 const uniforms=bindCrystalVolume(mesh,{time,excitation,atlas}),camera=new THREE.PerspectiveCamera();camera.position.set(0,2.7,20);camera.updateMatrixWorld();
 mesh.onBeforeRender({},null,camera);assert.equal(oldDraws,1);
 const eye=camera.getWorldPosition(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld.clone().invert());assert.ok(eye.distanceTo(uniforms.uTemCrystalEye.value)<1e-9);
 camera.position.y=-13.34;camera.updateMatrixWorld();mesh.onBeforeRender({},null,camera);
 assert.equal(oldDraws,2);assert.ok(camera.getWorldPosition(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld.clone().invert()).distanceTo(uniforms.uTemCrystalEye.value)<1e-9,'mirror camera must update the shared eye too');
 const shader={vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader,uniforms:{}};material.onBeforeCompile(shader,{});
 assert.equal(oldCompiles,1);assert.equal(shader.uniforms.uTemCrystalTime,time);assert.equal(shader.uniforms.uTemCrystalExcitation,excitation);assert.equal(shader.uniforms.uTemCrystalAtlas,atlas);
 assert.ok(shader.fragmentShader.indexOf('#include <normal_fragment_maps>')<shader.fragmentShader.indexOf('totalEmissiveRadiance+=temCrystalRadiance(normal)'));
 assert.ok(shader.vertexShader.includes('vTemCrystalLocal=transformed;'));assert.ok(shader.fragmentShader.includes('refract(incoming,n,1./1.468)'));
 assert.ok(!/\buTime\b/.test(shader.fragmentShader),'the isolated noise helper must not import the nebula-specific undeclared clock');
 mesh.geometry.dispose();material.dispose();
});
