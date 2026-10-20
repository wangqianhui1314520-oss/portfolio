import * as THREE from 'three';

// r161 compiles the number of point lights into every lit shader. Modules
// switched their own lights with their groups, so the visible count moved
// between 5 and 11 and every physical material relinked on each scene change
// (up to 21 s per transition with a cold Windows/D3D cache). Authored point
// lights become virtual: they keep their parents, transforms, colours and
// animation, but live on a layer no camera renders. A fixed set of real slots
// carries the most important virtual lights, so the shader count never moves.
export const VIRTUAL_LIGHT_LAYER=31;

export function createLightRig({scene,camera,slots=6,fade=.25}){
 const real=[],virtual=new Set(),candidates=[],assigned=new Map();
 const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),sphere=new THREE.Sphere(),position=new THREE.Vector3();
 for(let i=0;i<slots;i++){
  const light=new THREE.PointLight(0xffffff,0,1,2);light.name=`Tem.light-rig.slot-${i}`;light.castShadow=false;
  light.userData.temSlot={source:null,weight:0};scene.add(light);real.push(light);
 }
 const worldVisible=object=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};
 function adopt(light){
  if(virtual.has(light)||light.userData.temSlot)return;
  light.layers.set(VIRTUAL_LIGHT_LAYER);light.castShadow=false;virtual.add(light);
 }
 // A full traverse adopts lights inside hidden groups before shaders are
 // prepared; per frame only visible branches can add a light to the render.
 function scan({visibleOnly=false}={}){
  const visit=object=>{if(object.isPointLight&&!object.userData.temSlot)adopt(object);};
  if(visibleOnly)scene.traverseVisible(visit);else scene.traverse(visit);
 }
 // Importance is the light's apparent reach on screen: a lamp beside the lens
 // outranks a stronger one a kilometre away whose range cannot touch a pixel.
 function rank(){
  camera.updateMatrixWorld();matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);
  candidates.length=0;
  for(const light of virtual){
   if(!light.parent||!(light.intensity>0)||!worldVisible(light))continue;
   light.updateWorldMatrix(true,false);position.setFromMatrixPosition(light.matrixWorld);
   const range=light.distance>0?light.distance:1000;sphere.set(position,range);
   if(!frustum.intersectsSphere(sphere))continue;
   const distance=position.distanceTo(camera.position),reach=range/Math.max(distance,range*.25);
   candidates.push({light,score:light.intensity*reach*reach,x:position.x,y:position.y,z:position.z});
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates.slice(0,slots);
 }
 function update(dt=0){
  scan({visibleOnly:true});
  const wanted=rank(),wantedLights=new Set(wanted.map(entry=>entry.light)),step=fade>0?Math.min(1,Math.max(0,dt)/fade):1;
  // Keep surviving lights in their slots; evicted ones fade out in place.
  for(const [light,slot] of assigned)if(!wantedLights.has(light))slot.userData.temSlot.leaving=true;
  for(const entry of wanted){
   let slot=assigned.get(entry.light);
   if(!slot){slot=real.find(candidate=>!candidate.userData.temSlot.source);if(!slot)continue;slot.userData.temSlot.source=entry.light;slot.userData.temSlot.weight=dt>0?0:1;assigned.set(entry.light,slot);}
   slot.userData.temSlot.leaving=false;slot.position.set(entry.x,entry.y,entry.z);
  }
  for(const slot of real){
   const state=slot.userData.temSlot,source=state.source;
   if(!source){slot.intensity=0;continue;}
   state.weight=state.leaving||!wantedLights.has(source)?Math.max(0,state.weight-step):Math.min(1,state.weight+step);
   slot.color.copy(source.color);slot.distance=source.distance;slot.decay=source.decay;slot.intensity=source.intensity*state.weight;
   if(state.weight===0&&(state.leaving||!wantedLights.has(source))){assigned.delete(source);state.source=null;state.leaving=false;slot.intensity=0;}
  }
  return {slots,candidates:candidates.length,active:assigned.size};
 }
 return {slots:real,virtual,adopt,scan,update,
  get stats(){return {slots,virtual:virtual.size,active:assigned.size,candidates:candidates.length};}};
}
