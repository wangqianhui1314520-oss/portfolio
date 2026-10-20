import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from '../assets/vendor/three-0.161.0/build/three.module.js';
import {surfaceLightProfile} from '../assets/js/immersive-surface-look.js';

// Run the actual browser factories with the bundled Three implementation.
// Only the GLB transport and browser event surface are replaced; cloning,
// PBR preparation, semantic refinement and reveal binding execute unchanged.
function browserModule(filename,context){
 const url=new URL('../assets/js/'+filename,import.meta.url);
 const source=readFileSync(url,'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'')
  .replaceAll('import.meta.url',JSON.stringify(url.href));
 const scope={...context};runInNewContext(source,scope,{filename:url.pathname});return scope;
}

function authoredFixture(){
 const root=new THREE.Group(),roots={};
 for(const name of ['CABIN_V19','T_IDENTITY_V19','EXTERIOR_V19','SURFACE_FRAME_V19']){
  const branch=new THREE.Group();branch.name=name;root.add(branch);roots[name]=branch;
 }
 Object.assign(roots.T_IDENTITY_V19.userData,{identityCenter:[9.6,6.5,-17],identityWidth:14.2,identityHeight:15.3,identityYaw:-.28});
 // These are authoring inputs, not values reconstructed from the runtime's
 // clamping implementation. In particular, Infinity means no bulk absorption.
 const materials={
  bulk:new THREE.MeshPhysicalMaterial({name:'GLASS_V19 thick optical crystal',transmission:.94,thickness:2.98,attenuationDistance:125}),
  pressure:new THREE.MeshPhysicalMaterial({name:'GLASS_V19 pressure display front',transmission:.975,thickness:.16,attenuationDistance:Infinity}),
  lens:new THREE.MeshPhysicalMaterial({name:'GLASS_V19 low transmission lens',transmission:.37,thickness:.03,attenuationDistance:.8}),
  film:new THREE.MeshPhysicalMaterial({name:'GLASS_V19 internal dichroic lamina',transmission:1,thickness:2.98,attenuationDistance:125}),
  floor:new THREE.MeshPhysicalMaterial({name:'FLOOR_OPTICAL_V19',roughness:.34,metalness:.04}),
  ceramic:new THREE.MeshPhysicalMaterial({name:'V21_PEARL_CERAMIC — translucent enamel',roughness:.30,metalness:.035,clearcoat:.28,clearcoatRoughness:.23,specularIntensity:.50})
 };
 const geometry=new THREE.BoxGeometry(2,3,1);
 for(const [name,material] of Object.entries(materials)){
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;
  roots[name==='bulk'?'T_IDENTITY_V19':['floor','ceramic'].includes(name)?'CABIN_V19':'SURFACE_FRAME_V19'].add(mesh);
 }
 return {root,materials,dispose(){geometry.dispose();Object.values(materials).forEach(material=>material.dispose());}};
}

function loadFixture(compact=false,options={}){
 const fixture=authoredFixture(),urls=[],listeners=new Set();
 const browser={THREE,URL,innerWidth:compact?375:1280,innerHeight:compact?812:720,Event,
  addEventListener:type=>listeners.add(type),removeEventListener:type=>listeners.delete(type),dispatchEvent:()=>true};
 class FixtureLoader{
  load(url,loaded){urls.push(url);queueMicrotask(()=>loaded({scene:fixture.root,asset:{version:'2.0'}}));}
 }
 const assets=browserModule('immersive-blender-assets.js',{...browser,GLTFLoader:FixtureLoader});
 const solar=browserModule('immersive-solar-receiver.js',{THREE});
 const observatory=browserModule('immersive-observatory-v19.js',{...browser,
  surfaceLightProfile,bindSolarReceiver:solar.bindSolarReceiver,
  loadTemAsset:assets.loadTemAsset,prepareReveal:assets.prepareReveal,
  bindCrystalVolume(){assert.fail('this optical shell fixture has no density-volume semantic');}});
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
 const controller=observatory.createObservatoryV19({scene,camera,canvas:{dataset:{}},compact,externalCloud:true,densityAtlas:{value:null},sunDirection:{value:new THREE.Vector3(.48,.19,-.84).normalize()},...options});
 return {controller,fixture,urls,listeners,scene,camera};
}

test('observatory loading preserves authored optical paths and isolates the internal coating',async()=>{
 for(const compact of [false,true]){
  const {controller,fixture,urls,listeners}=loadFixture(compact);
  try{
   const asset=await controller.loading;
   assert.ok(controller.ready,controller.state().error);
   assert.equal(urls.length,1);
   assert.equal(new URL(urls[0]).pathname.endsWith(compact?'tem-refined-observatory-v21-lod.glb':'tem-refined-observatory-v21.glb'),true);
   const material=name=>asset.root.getObjectByName(name).material;
   const bulk=material('bulk'),pressure=material('pressure'),lens=material('lens'),film=material('film');
   assert.equal(bulk.thickness,2.98,'the real bulged crystal must retain its authored optical path');
   assert.equal(bulk.attenuationDistance,125,'long clear-volume absorption must not be capped at the old 18-unit limit');
   assert.equal(bulk.transmission,.94);
   assert.equal(pressure.transmission,.975,'the clear pressure face must not lose exported transmission');
   assert.equal(pressure.attenuationDistance,Infinity,'absence of absorption must remain unbounded');
   assert.equal(pressure.thickness,.16);
   assert.equal(lens.transmission,.37,'a deliberately partially transmitting surface must not become almost clear');
   assert.equal(lens.thickness,.03);assert.equal(lens.attenuationDistance,.8);
   for(const outer of [bulk,pressure,lens]){
    assert.equal(outer.isMeshPhysicalMaterial,true);assert.equal(outer.transparent,false);assert.equal(outer.opacity,1);
    assert.equal(outer.side,THREE.FrontSide);assert.equal(outer.depthWrite,false);
    assert.equal(outer.alphaToCoverage,true,'the actual reveal binder must preserve solid-shell coverage');
   }
   assert.equal(film.transmission,0,'the nested coating must not cause a second solid transmission pass');
   assert.equal(film.transparent,true);assert.ok(film.opacity>0&&film.opacity<.1);
   assert.ok(film.thickness>0&&film.thickness<.05);assert.equal(film.depthWrite,false);
   assert.equal(film.alphaToCoverage,false,'the film retains ordinary transparent coverage');
   assert.equal(film.userData.temV19InnerFilm,true);
   // The real loader and semantic-root preparation both clone privately.
   // Reusing an authored source later must still recover its original optics.
   assert.notEqual(bulk,fixture.materials.bulk);assert.notEqual(film,fixture.materials.film);
   assert.equal(fixture.materials.bulk.thickness,2.98);assert.equal(fixture.materials.bulk.attenuationDistance,125);
   assert.equal(fixture.materials.pressure.transmission,.975);assert.equal(fixture.materials.pressure.attenuationDistance,Infinity);
   assert.equal(fixture.materials.film.transmission,1);assert.equal(fixture.materials.film.thickness,2.98);
   const ceramic=material('ceramic');assert.equal(ceramic.roughness,.30);assert.equal(ceramic.specularIntensity,.50);assert.equal(ceramic.userData.temSunReceiver,surfaceLightProfile.revision);
   assert.equal(fixture.materials.ceramic.userData.temSunReceiver,undefined,'the cached source coating remains untouched');
  }finally{controller.dispose();fixture.dispose();}
  assert.equal(listeners.size,0,'disposing the factory releases its browser listeners');
 }
});

test('the sheltered deck links the actual sun direction in both main and reflection cameras',async()=>{
 const sunDirection={value:new THREE.Vector3(.48,.19,-.84).normalize()},bound=[];
 const reflection={bindSurface:mesh=>bound.push(mesh),invalidate(){}};
 const {controller,fixture,scene,camera}=loadFixture(false,{sunDirection,reflection});
 const originalChunk=THREE.ShaderChunk.lights_fragment_begin;
 try{
  const asset=await controller.loading;assert.ok(controller.ready,controller.state().error);
  const floor=asset.root.getObjectByName('floor');assert.equal(bound.length,1);assert.equal(bound[0],floor);
  assert.equal(controller.state().floorBound,1);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};
  floor.material.onBeforeCompile(shader,{});
  const view=shader.uniforms.uTemDeckSunView;assert.ok(view?.value?.isVector3);
  camera.position.set(0,2.7,20);camera.rotation.set(.21,-.33,.04);camera.updateMatrixWorld();
  const mirror=new THREE.PerspectiveCamera();mirror.position.set(0,-13.34,20);mirror.lookAt(0,2.7,0);mirror.updateMatrixWorld();
  const mainView=new THREE.Vector3();
  for(const activeCamera of [camera,mirror,camera]){
   floor.onBeforeRender({},scene,activeCamera);
   // Quaternion rotation supplies an independent world-to-view expectation.
   const expected=sunDirection.value.clone().applyQuaternion(activeCamera.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
   assert.ok(view.value.distanceTo(expected)<1e-12,'the draw must use its active camera, including the reflected camera');
   if(activeCamera===camera)mainView.copy(view.value);
   else assert.ok(view.value.distanceTo(mainView)>.1,'reflection draw must not reuse the main camera direction');
  }
  // Evaluate the actual emitted shader filter, rather than reconstructing its
  // thresholds in JS. Reordering directional lights cannot change the link.
  const filter=shader.fragmentShader.match(/directLight\.color\*=([^;]+);/);assert.ok(filter);
  const weight=new Function('directionalLight','uTemDeckSunView','smoothstep','dot','return '+filter[1]+';');
  const smoothstep=(lo,hi,value)=>THREE.MathUtils.smoothstep(value,lo,hi),dot=(a,b)=>a.dot(b);
  const directions=[view.value.clone(),view.value.clone().negate(),new THREE.Vector3(view.value.y,-view.value.x,0).normalize()];
  for(const order of [[0,1,2],[2,0,1],[1,2,0]])for(const index of order){
   assert.equal(weight({direction:directions[index]},view.value,smoothstep,dot),index===0?0:1);
  }
  // Removing the one local directional filter recovers Three's whole lighting
  // chunk, including its point/spot/area contributions. The shared vendor
  // chunk itself must never be changed for the exterior planets and clouds.
  assert.ok(shader.fragmentShader.replace('\n'+filter[0],'').includes(originalChunk));
  assert.equal(THREE.ShaderChunk.lights_fragment_begin,originalChunk);
  assert.equal(fixture.materials.floor.userData.temSunReceiver,undefined,'source-cache floor material remains unlinked');
 }finally{controller.dispose();fixture.dispose();}
});
