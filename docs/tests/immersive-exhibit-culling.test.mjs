import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from '../assets/vendor/three-0.161.0/build/three.module.js';

const source=readFileSync(new URL('../assets/js/immersive-archive-optical.js',import.meta.url),'utf8');
// The hardware helpers run with the bundled Three; only module syntax is stripped.
const hardware={THREE,mergeGeometries:()=>null};runInNewContext(readFileSync(new URL('../assets/js/immersive-hardware.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,''),hardware);
test('focal dust bounds contain the displaced particles through their complete lifetime',()=>{
 const focal=source.slice(source.indexOf(' function opticalFocal('),source.indexOf(' function label(')),scope={THREE,compact:()=>false,innerHeight:768,focalControllers:[]};
 runInNewContext(focal,scope);
 for(const [radius,height] of [[.65,8.288],[1.05,4.25],[1.15,2.55]]){
  const base=new THREE.Group();scope.opticalFocal(base,radius,height);
  const dust=base.children.find(object=>object.isPoints),seeds=dust.geometry.attributes.aSeed;
  assert.equal(dust.frustumCulled,true);assert.equal(seeds.count,92);
  assert.ok(dust.geometry.boundingBox&&dust.geometry.boundingSphere);
  for(let i=0;i<seeds.count;i++)for(let step=0;step<=200;step++){
   const age=step/200,seedY=seeds.getY(i),seedZ=seeds.getZ(i),angle=seedY*Math.PI*2+Math.sin(age*3+seedZ*6.28)*.28,r=radius*(.63-age*.43)*(.45+seedZ*.55);
   const p=new THREE.Vector3(Math.cos(angle)*r,.56+age*height,Math.sin(angle)*r-.14);
   assert.ok(dust.geometry.boundingBox.containsPoint(p));assert.ok(dust.geometry.boundingSphere.containsPoint(p));
  }
  // A scene can translate, rotate and nonuniformly scale this exhibit. The
  // renderer's transformed sphere must still contain the furthest endpoint.
  base.position.set(22,1,-17);base.rotation.set(.2,1.3,-.1);base.scale.set(1.4,.6,2);base.updateMatrixWorld(true);
  const worldSphere=dust.geometry.boundingSphere.clone().applyMatrix4(dust.matrixWorld);
  assert.ok(worldSphere.containsPoint(new THREE.Vector3(radius*.63,.56+height,-.14).applyMatrix4(dust.matrixWorld)));
 }
});
test('neuron instances retain all twelve original sphere surfaces and placements',()=>{
 const marker="else{const pts=[],neurons=",start=source.indexOf(marker),end=source.indexOf('\n    unit.name=',start),scope={THREE,unit:new THREE.Group(),crystal:new THREE.ShaderMaterial({uniforms:{uTime:{value:0}}}),instancedMesh:hardware.instancedMesh};
 assert.ok(start>0&&end>start);runInNewContext(source.slice(start+4,end),scope);
 const neurons=scope.unit.children.find(object=>object.isInstancedMesh),reference=new THREE.SphereGeometry(.16,10,8),matrix=new THREE.Matrix4();
 assert.notEqual(neurons.material,scope.crystal,'instanced draws use their own program slot');assert.equal(neurons.material.uniforms,scope.crystal.uniforms,'animated uniforms stay shared');
 assert.equal(neurons.count,12);assert.deepEqual([...neurons.geometry.attributes.position.array],[...reference.attributes.position.array]);assert.deepEqual([...neurons.geometry.index.array],[...reference.index.array]);
 for(let i=0;i<12;i++){
  neurons.getMatrixAt(i,matrix);const expected=new THREE.Vector3(Math.sin(i*2.4)*1.6,Math.cos(i*1.7)*1.4,Math.sin(i*.8)*1.2);
  assert.ok(new THREE.Vector3().setFromMatrixPosition(matrix).distanceTo(expected)<1e-6);
  assert.equal(matrix.elements[0],1);assert.equal(matrix.elements[5],1);assert.equal(matrix.elements[10],1);
 }
 assert.equal(scope.unit.children.find(object=>object.isLineSegments).geometry.attributes.position.count,24);
});

test('instanced copies mirror animated surface values but never their visibility',()=>{
 const source=new THREE.MeshPhysicalMaterial({color:0x336699,opacity:.4,transparent:true});
 const plain=new THREE.Mesh(new THREE.BoxGeometry(),source),mesh=hardware.instancedMesh(new THREE.BoxGeometry(),source,3),again=hardware.instancedMesh(new THREE.BoxGeometry(),source,2);
 assert.ok(mesh.isInstancedMesh);assert.notEqual(mesh.material,plain.material);assert.equal(again.material,mesh.material,'one private copy per source material');
 source.color.setRGB(1.2,.5,.1);source.opacity=.75;source.emissiveIntensity=2;source.visible=false;
 mesh.onBeforeRender();
 assert.ok(mesh.material.color.equals(source.color));assert.equal(mesh.material.opacity,.75);assert.equal(mesh.material.emissiveIntensity,2);
 assert.equal(mesh.material.visible,true,'a hidden copy would never draw again to sync back');
 const shader=new THREE.ShaderMaterial({uniforms:{uTime:{value:1}}}),copy=hardware.instancedMaterial(shader);
 assert.equal(copy.uniforms,shader.uniforms);shader.uniforms.uTime.value=5;assert.equal(copy.uniforms.uTime.value,5);
});

test('a source flagged for a program change flags its instanced copy on the next draw',()=>{
 const source=new THREE.MeshStandardMaterial(),mesh=hardware.instancedMesh(new THREE.BoxGeometry(),source,2);
 mesh.onBeforeRender();const settled=mesh.material.version;
 mesh.onBeforeRender();assert.equal(mesh.material.version,settled,'an unchanged source costs no program check');
 source.transparent=true;source.needsUpdate=true;mesh.onBeforeRender();
 assert.equal(mesh.material.transparent,true);assert.ok(mesh.material.version>settled);
});
