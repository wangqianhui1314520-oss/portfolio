import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from '../assets/vendor/three-0.161.0/build/three.module.js';
import {planetaryHorizonProfile,localizeAuthoredPlanetGeometry} from '../assets/js/immersive-planetary-look.js';

function authoredPlanet(filename){
 const bytes=readFileSync(new URL('../assets/models/'+filename,import.meta.url)),length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length)),binary=bytes.subarray(28+length);
 const node=doc.nodes.find(n=>n.name===planetaryHorizonProfile.id);assert.ok(node);
 const primitive=doc.meshes[node.mesh].primitives[0],geometry=new THREE.BufferGeometry();
 for(const [semantic,key] of [['POSITION','position'],['NORMAL','normal']]){
  const accessor=doc.accessors[primitive.attributes[semantic]],view=doc.bufferViews[accessor.bufferView],start=(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||12,values=[];
  assert.equal(accessor.componentType,5126);
  for(let i=0;i<accessor.count;i++)for(let j=0;j<3;j++){const value=binary.readFloatLE(start+i*stride+j*4);assert.ok(Number.isFinite(value));values.push(value);}
  geometry.setAttribute(key,new THREE.Float32BufferAttribute(values,3));
 }
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());
 if(node.matrix)mesh.matrix.fromArray(node.matrix).decompose(mesh.position,mesh.quaternion,mesh.scale);
 else{mesh.position.fromArray(node.translation||[0,0,0]);mesh.quaternion.fromArray(node.rotation||[0,0,0,1]);mesh.scale.fromArray(node.scale||[1,1,1]);}
 const a=doc.accessors[primitive.indices];
 return {mesh,doc,triangles:a.count/3,node};
}

test('both shipped Dawn meshes retain full planetary resolution and the canonical Blender horizon',()=>{
 const metadata=JSON.parse(readFileSync(new URL('../assets/models/tem-star-sea-v20.json',import.meta.url),'utf8'));
 const spec=metadata.planets.find(p=>p.id===planetaryHorizonProfile.id);assert.deepEqual(spec.center,planetaryHorizonProfile.center);assert.equal(spec.radius,planetaryHorizonProfile.radius);
 for(const file of ['tem-star-sea-v20.glb','tem-star-sea-v20-lod.glb']){
  const {mesh,doc,triangles,node}=authoredPlanet(file),original=mesh.geometry.attributes.position.array.slice();
  assert.equal(doc.images?.length||0,0);assert.equal(node.extras.tem_horizon_revision,planetaryHorizonProfile.revision);
  assert.equal(triangles,2*planetaryHorizonProfile.segments*(planetaryHorizonProfile.bands-1));
  const localized=localizeAuthoredPlanetGeometry(mesh,spec);assert.ok(localized);
  assert.ok(localized.boundingSphere.center.length()<.0001);assert.ok(Math.abs(localized.boundingSphere.radius-34)<.0001);
  const p=localized.attributes.position,n=localized.attributes.normal;
  for(let i=0;i<p.count;i++)assert.ok(new THREE.Vector3().fromBufferAttribute(p,i).dot(new THREE.Vector3().fromBufferAttribute(n,i))>33.9,'outward finite normals');
  assert.deepEqual(mesh.geometry.attributes.position.array,original,'immutable cached GLB geometry remains untouched');
 }
});

test('planet localization honours parent transforms and rejects a mismatched authored centre',()=>{
 const parent=new THREE.Group(),mesh=new THREE.Mesh(new THREE.SphereGeometry(2,32,24));parent.position.set(10,-8,7);parent.scale.setScalar(3);parent.add(mesh);
 const geometry=localizeAuthoredPlanetGeometry(mesh,{center:[10,-8,7],radius:6});assert.ok(geometry);assert.ok(geometry.boundingSphere.center.length()<1e-5);assert.ok(Math.abs(geometry.boundingSphere.radius-34)<1e-4);
 assert.equal(localizeAuthoredPlanetGeometry(mesh,{center:[0,0,0],radius:6}),null);
 assert.equal(localizeAuthoredPlanetGeometry(mesh,{center:[10,-8,7],radius:0}),null);
 assert.equal(localizeAuthoredPlanetGeometry(mesh,{center:[10,NaN,7],radius:6}),null);
});

test('the orbital actor adopts authored geometry once for its surface and all panorama windows',()=>{
 const source=readFileSync(new URL('../assets/js/immersive-planet.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'');
 const canvas={dataset:{}},scene=new THREE.Scene(),style={},scope={THREE,planetaryHorizonProfile,localizeAuthoredPlanetGeometry,
  bevelGeometry:()=>new THREE.BoxGeometry(),instancedMesh:(geometry,material,count)=>new THREE.InstancedMesh(geometry,material,count),createProceduralPlanetMaterial:()=>new THREE.MeshBasicMaterial(),createProceduralPlanetClouds:()=>new THREE.Mesh(new THREE.SphereGeometry(34)),
  document:{body:{dataset:{step:'captain'},append(){}},createElement:()=>({style,setAttribute(){},querySelector:()=>({style})})},innerWidth:1366,innerHeight:768};
 runInNewContext(source,scope);const actor=scope.createOrbitalWorld({scene,canvas,time:{value:0},compact:()=>false});
 const {mesh}=authoredPlanet('tem-star-sea-v20.glb'),spec={...planetaryHorizonProfile,horizonRevision:planetaryHorizonProfile.revision};
 assert.equal(actor.adoptAuthoredPlanet(mesh,{...spec,horizonRevision:'stale'}),false);
 assert.equal(actor.adoptAuthoredPlanet(mesh,spec),true);
 const surface=scene.getObjectByName('Tem.planet.Blender-authored-Dawn');assert.ok(surface);assert.notEqual(surface.geometry,mesh.geometry);
 let users=0;scene.traverse(n=>{if(n.geometry===surface.geometry)users++;});assert.equal(users,4,'one home actor plus three existing side-window views share one authored geometry');
 assert.deepEqual(surface.parent.position.toArray(),planetaryHorizonProfile.center);assert.equal(surface.parent.scale.x,planetaryHorizonProfile.radius/34);
 assert.equal(canvas.dataset.planetHorizon,'horizon-01');
 scope.document.body.dataset.sector='games';scope.document.body.dataset.step='dock';
 actor.update(new THREE.PerspectiveCamera(),0,.016,{step:'dock'});
 assert.equal(surface.parent.visible,true,'the adopted horizon remains present after entering a project sector');
});
