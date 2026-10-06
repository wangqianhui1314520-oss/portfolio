import * as THREE from 'three';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/utils/BufferGeometryUtils.js';

// Shared manufacturing language: bevels, ceramic, brushed titanium and inset light.
export function roundedShape(w,h,r=Math.min(w,h)*.12){
 const s=new THREE.Shape(),x=-w/2,y=-h/2;
 s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
 s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
 s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
 s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
export function bevelGeometry(w,h,d,r=Math.min(w,h)*.10,b=Math.min(d*.16,.08)){
 const compact=innerWidth<700;
 const g=new THREE.ExtrudeGeometry(roundedShape(w,h,r),{depth:d,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:compact?2:3,curveSegments:compact?4:8,steps:1});g.translate(0,0,-d/2);return g;
}
export function hardwareMaterials(){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#a4a9ab';ctx.fillRect(0,0,512,512);
 let seed=443;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<3100;i++){const y=rand()*512;ctx.strokeStyle=`rgba(27,32,36,${.015+rand()*.05})`;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y+rand()*.3);ctx.stroke();}
 for(let i=0;i<32;i++){const x=(i%8)*64,y=Math.floor(i/8)*128;ctx.fillStyle=`rgba(25,34,40,${rand()*.06})`;ctx.fillRect(x+3,y+3,58,122);ctx.strokeStyle='#60666a55';ctx.strokeRect(x+2,y+2,60,124);}
 const bump=new THREE.CanvasTexture(c);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(.17,.17);
 return {
  alloy:new THREE.MeshPhysicalMaterial({color:0x67717c,metalness:.86,roughness:.31,clearcoat:.28,clearcoatRoughness:.24,bumpMap:bump,bumpScale:.006,envMapIntensity:1.1}),
  armor:new THREE.MeshPhysicalMaterial({color:0xa0a5aa,metalness:.78,roughness:.27,clearcoat:.42,clearcoatRoughness:.18,bumpMap:bump,bumpScale:.008,envMapIntensity:1.05}),
  dark:new THREE.MeshPhysicalMaterial({color:0x111821,metalness:.66,roughness:.36,clearcoat:.40,clearcoatRoughness:.25,bumpMap:bump,bumpScale:.005}),
  ceramic:new THREE.MeshPhysicalMaterial({color:0x12151a,metalness:.30,roughness:.26,clearcoat:.8,clearcoatRoughness:.16}),
  inset:new THREE.MeshStandardMaterial({color:0x02050a,metalness:.4,roughness:.63}),
  brass:new THREE.MeshPhysicalMaterial({color:0x9a856c,metalness:.84,roughness:.26,clearcoat:.25}),
  white:new THREE.MeshBasicMaterial({color:new THREE.Color(1.8,1.48,1.1),toneMapped:false}),
  cyan:new THREE.MeshBasicMaterial({color:new THREE.Color(.18,.80,1.1),toneMapped:false}),
  amber:new THREE.MeshBasicMaterial({color:new THREE.Color(.92,.40,.13),toneMapped:false})
 };
}
export function hardwareMesh(parent,geometry,material,position=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.fromArray(position);m.castShadow=!material.isMeshBasicMaterial;m.receiveShadow=m.castShadow;parent.add(m);return m;}
export function consolidateHardware(root){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),batches=new Map(),remove=[];
 root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.userData.dynamic||Array.isArray(o.material))return;
  let p=o.parent;while(p&&p!==root){if(p.userData.dynamic)return;p=p.parent;}
  const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
  if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(g);remove.push(o);
 });
 for(const m of remove)m.removeFromParent();
 for(const [material,geometries] of batches){const merged=mergeGeometries(geometries,false);if(merged){const mesh=new THREE.Mesh(merged,material);mesh.castShadow=!material.isMeshBasicMaterial;mesh.receiveShadow=mesh.castShadow;root.add(mesh);}geometries.forEach(g=>g.dispose());}
}
