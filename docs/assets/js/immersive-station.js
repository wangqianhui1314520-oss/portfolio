import * as THREE from 'three';
import { hardwareMaterials,hardwareMesh,bevelGeometry,consolidateHardware } from './immersive-hardware.js?v=cinematic-v21.1';
import {crystalMaterial,createEnergyRibbons,createOpticalMotes} from './immersive-optical.js?v=cinematic-v21.1';
import {mergeGeometries} from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/utils/BufferGeometryUtils.js';

let sharedMaterials;
function precisionMaterials(){
 if(sharedMaterials)return sharedMaterials;
 const m=hardwareMaterials();
 for(const [name,color,metalness,roughness] of [['alloy',0x8fa9c4,.64,.24],['armor',0xbac7dc,.12,.21],['dark',0x172641,.20,.26],['brass',0x9eb5ce,.66,.23]]){
  const material=m[name];material.color.setHex(color);material.metalness=metalness;material.roughness=roughness;material.bumpMap=null;material.bumpScale=0;material.envMapIntensity=.72;
 }
 m.white.color.setRGB(1.15,1.36,1.82);m.cyan.color.setRGB(.45,1.13,1.84);m.amber.color.setRGB(.83,.65,1.50);
 sharedMaterials=m;return m;
}

// Broken ceramic crescents and slender optical sails preserve the dock's
// real scale without turning the horizon into a solid industrial service bar.
export function createOrbitalDockyard({variant='home',compact=false}={}){
 const root=new THREE.Group(),m=precisionMaterials(),scale=variant==='home'?1:.27;
 const fixed=new THREE.Group();root.add(fixed);
 const part=(g,mat,pos=[0,0,0],parent=fixed)=>hardwareMesh(parent,g,mat,pos);
 const block=(w,h,d,pos,mat=m.alloy,parent=fixed)=>part(bevelGeometry(w,h,d,Math.min(w,h)*.12,Math.min(d*.1,.15)),mat,pos,parent);
 function shell(rx,rz,width,a,b,y,depth,mat){
  const s=new THREE.Shape(),steps=Math.ceil((b-a)*32);s.moveTo(rx*Math.cos(a),-rz*Math.sin(a));
  for(let i=1;i<=steps;i++){const t=a+(b-a)*i/steps;s.lineTo(rx*Math.cos(t),-rz*Math.sin(t));}
  for(let i=steps;i>=0;i--){const t=a+(b-a)*i/steps;s.lineTo((rx-width)*Math.cos(t),-(rz-width)*Math.sin(t));}s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.55,bevelThickness:.55,bevelSegments:3,curveSegments:8,steps:1});
  const p=part(g,mat,[0,y,0]);p.rotation.x=-Math.PI/2;return p;
 }
 const a=-.42,b=4.56,flowCurves=[];
 const arc=(rx,rz,start,end,y,lift=0)=>new THREE.CatmullRomCurve3(Array.from({length:65},(_,i)=>{const t=start+(end-start)*i/64;return new THREE.Vector3(rx*Math.cos(t),y+Math.sin(i/64*Math.PI)*lift,rz*Math.sin(t));}));
 for(const [start,end] of [[a,1.14],[1.32,2.69],[2.86,b]]){
  shell(184,121,8.4,start,end,-4.8,3.6,m.dark);
  shell(185,122,6.2,start+.022,end-.023,-.7,1.2,m.armor);
  shell(186,123,.75,start+.026,end-.025,.8,.42,m.alloy);
  shell(177,114,.75,start+.028,end-.028,-2.5,.36,m.alloy);
  const path=arc(186.5,123.5,start+.03,end-.03,1.55);flowCurves.push(path);
  part(new THREE.TubeGeometry(path,80,.22,5),m.white);
 }
 // Three tilted crystal sails add volume and transmitted star colour instead
 // of repetitive radiator fins. They share one simple optical shader.
 const crystal=crystalMaterial(),sails=new THREE.Group();root.add(sails);
 for(const [start,end,y,lift] of [[a+.17,.98,4.5,12],[1.52,2.5,5.8,16],[3.03,4.34,3.6,11]]){
  const rail=arc(183,120,start,end,y,lift),g=new THREE.TubeGeometry(rail,56,3.1,8);
  const sail=hardwareMesh(sails,g,crystal);sail.castShadow=false;sail.receiveShadow=false;sail.scale.y=.35;
  part(new THREE.TubeGeometry(rail,56,.29,5),m.alloy);
  flowCurves.push(arc(182.7,119.7,start,end,y+.3,lift));
 }
 // Sparse tapering receiver towers establish scale, leaving sky between them.
 for(let i=0;i<7;i++){
  const t=.08+i*.62,x=179*Math.cos(t),z=116*Math.sin(t),height=19+(i%3)*11;
  const profile=[[1.8,-height],[2.3,-height+2],[1.8,-5],[1.35,3],[.68,8],[.30,10]].map(p=>new THREE.Vector2(...p));
  part(new THREE.LatheGeometry(profile,16),m.dark,[x,-2,z]);
  const collar=part(new THREE.TorusGeometry(1.58,.20,5,20),m.alloy,[x,0,z]);collar.rotation.x=Math.PI/2;
  block(.19,height*.65,.22,[x+1.2,-height*.32,z+.75],i%2?m.cyan:m.amber);
  const receiver=part(new THREE.SphereGeometry(.55,10,6),m.white,[x,8.6,z]);receiver.scale.y=.5;
  const finger=new THREE.CatmullRomCurve3([[x,-3,z],[x*1.025,-4.7,z*1.035],[x*1.065,-5.2,z*1.085]].map(p=>new THREE.Vector3(...p)));
  part(new THREE.TubeGeometry(finger,18,.58,6),m.alloy);flowCurves.push(finger);
 }
 const serviceArch=new THREE.CatmullRomCurve3([[83,-3,-98],[108,4,-125],[142,14,-149],[175,9,-171],[205,-3,-179]].map(p=>new THREE.Vector3(...p)));
 part(new THREE.TubeGeometry(serviceArch,48,2.25,8),m.armor);flowCurves.push(serviceArch);
 const windows=new THREE.InstancedMesh(new THREE.BoxGeometry(.55,.17,.18),m.white,compact?96:180),pose=new THREE.Object3D();fixed.add(windows);
 for(let i=0;i<windows.count;i++){
  const t=a+.1+((i* .61803398875)%1)*(b-a-.2),row=i%2;
  pose.position.set(184.1*Math.cos(t),-1.9-row*.9,121.1*Math.sin(t));pose.rotation.y=-t;pose.updateMatrix();windows.setMatrixAt(i,pose.matrix);
 }
 const sourceGeometries=[];fixed.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)sourceGeometries.push(o.geometry);});
 consolidateHardware(fixed);sourceGeometries.forEach(g=>g.dispose());
 const energy=createEnergyRibbons({parent:root,curves:flowCurves,color:0xa7caff,width:.72,segments:64});
 // All ribbons use the same shader and local transform: consolidate them
 // before rendering so a large destination keeps one energy draw call.
 const ribbonParts=[...energy.root.children],ribbonGeometry=mergeGeometries(ribbonParts.map(o=>o.geometry),false);
 if(ribbonGeometry){const ribbon=new THREE.Mesh(ribbonGeometry,ribbonParts[0].material);ribbon.userData.dynamic=true;energy.root.clear();energy.root.add(ribbon);ribbonParts.forEach(o=>o.geometry.dispose());}
 const motes=createOpticalMotes({parent:root,count:compact?150:380,span:[380,52,270],seed:513,color:0xaacfff,drift:.35,filter:p=>{const r=p[0]*p[0]/(190*190)+p[2]*p[2]/(128*128);return r>.77&&r<1.08;}});
 root.scale.setScalar(scale);
 const beacon=new THREE.Mesh(new THREE.SphereGeometry(.72,12,8),m.cyan);beacon.position.set(-53,-3,116);root.add(beacon);
 const light=new THREE.PointLight(0xaccfff,75,160,2);light.position.set(-58,24,62);root.add(light);
 root.userData.kind='orbital-dockyard';
 return {root,update(time,activity=0,motion=1){beacon.scale.setScalar(.8+activity*.5+Math.sin(time*.7)*.08*motion);light.intensity=75+activity*85;crystal.uniforms.uTime.value=time;crystal.uniforms.uEnergy.value=activity*.4;energy.update(time,.26+activity*.35,Boolean(motion));motes.update(time,.2+activity*.4,Boolean(motion));}};
}

export function createEscortCraft(){
 const root=new THREE.Group(),m=precisionMaterials();
 const shape=new THREE.Shape();shape.moveTo(-6,0);shape.lineTo(-2,-1.0);shape.lineTo(4,-1.6);shape.lineTo(6,-.75);shape.lineTo(5,.6);shape.lineTo(-2,1.1);shape.closePath();
 const hull=hardwareMesh(root,new THREE.ExtrudeGeometry(shape,{depth:.7,bevelEnabled:true,bevelSize:.18,bevelThickness:.18,bevelSegments:3}),m.alloy);hull.rotation.x=-Math.PI/2;
 const deck=hardwareMesh(root,bevelGeometry(5,.65,1.2),m.dark,[1,1,0]);
 for(const side of [-1,1]){
  hardwareMesh(root,bevelGeometry(4,.7,.7),m.armor,[3,.45,side*1.7]);
  const nozzle=hardwareMesh(root,new THREE.CylinderGeometry(.24,.35,1,16),m.dark,[5,.45,side*1.7]);nozzle.rotation.z=Math.PI/2;
  const glow=hardwareMesh(root,new THREE.CylinderGeometry(.20,.06,2.8,16),m.cyan,[6.7,.45,side*1.7]);glow.rotation.z=Math.PI/2;
  hardwareMesh(root,bevelGeometry(2.7,.045,.12),m.white,[-.3,.95,side*.75]);
 }
 consolidateHardware(root);return root;
}





