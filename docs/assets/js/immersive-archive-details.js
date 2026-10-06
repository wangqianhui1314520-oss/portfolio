import * as THREE from 'three';
import {hardwareMesh,consolidateHardware} from './immersive-hardware.js?v=cinematic-v21.1';
import {createLightFlow,circularLightPath} from './immersive-light-flow.js?v=cinematic-v21.1';

// Repeated machining and inhabited decks add scale without one draw per detail.
export function createArchiveDetails({root,emblem,materials:m,compact}){
 const decks=new THREE.Group();root.add(decks);
 const plate=(g,w,h,d,p,mat=m.dark)=>hardwareMesh(g,new THREE.BoxGeometry(w,h,d),mat,p);
 const pose=new THREE.Object3D();
 function instances(parent,dimensions,material,poses){
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(...dimensions),material,poses.length);
  poses.forEach((p,i)=>{pose.position.fromArray(p.position);pose.rotation.set(0,p.yaw||0,p.roll||0);pose.scale.set(...(p.scale||[1,1,1]));pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);});parent.add(mesh);return mesh;
 }
 const casing=[],windows=[],rails=[];
 for(const y of [-22,-12,14,23]){
  for(let i=0;i<48;i++){
   const a=i/48*Math.PI*2,r=54;
   casing.push({position:[Math.sin(a)*r,y,Math.cos(a)*r],yaw:a});
   for(let j=0;j<3;j++)windows.push({position:[Math.sin(a+.021*j)*(r-.68),y+.30,Math.cos(a+.021*j)*(r-.68)],yaw:a,scale:[j===1?.6:1,1,1]});
   rails.push({position:[Math.sin(a)*(r-.75),y+1.6,Math.cos(a)*(r-.75)],yaw:a});
  }
 }
 instances(decks,[6.95,2.7,1.4],m.dark,casing);
 instances(decks,[.55,.11,.05],m.white,windows);
 instances(decks,[6.97,.15,.12],m.alloy,rails);
 // Service towers beyond the glazing give every orbit a deep middle distance.
 const towers=[],towerWindows=[];
 for(let i=0;i<16;i++){
  const a=i/16*Math.PI*2+.09,r=76+(i%3)*4;
  towers.push({position:[Math.sin(a)*r,-.5,Math.cos(a)*r],yaw:a,scale:[1,1+(i%3)*.23,1]});
  for(let j=0;j<13;j++)towerWindows.push({position:[Math.sin(a)*(r-1.45),-20+j*3.2,Math.cos(a)*(r-1.45)],yaw:a});
 }
 instances(decks,[2.8,47,2.8],m.dark,towers);instances(decks,[1.65,.12,.065],m.white,towerWindows);
 const housing=new THREE.Group();emblem.add(housing);
 // Black service cavities are inset between segmented titanium skin plates.
 plate(housing,1.05,4.10,.052,[0,-.58,.43],m.inset);
 plate(housing,4.18,.61,.052,[0,2.30,.43],m.inset);
 const plates=[],lamps=[];
 for(let j=0;j<12;j++){
  const y=-2.48+j*.32;
  for(const side of [-1,1])plates.push({position:[side*.41,y,.49],scale:[.24,.26,.08]});
  for(let k=0;k<3;k++)lamps.push({position:[-.21+k*.21,y,.48],scale:[.065,.035,.028]});
 }
 for(let j=0;j<12;j++){
  const x=-2.04+j*.37;plates.push({position:[x,2.40,.51],scale:[.30,.48,.12]});
  lamps.push({position:[x,2.08,.49],scale:[.14,.035,.028]});
 }
 instances(housing,[1,1,1],m.alloy,plates);instances(housing,[1,1,1],m.white,lamps);
 for(const side of [-1,1]){
  plate(housing,.13,4.45,.12,[side*.61,-.55,.48],m.dark);
  plate(housing,.045,4.0,.04,[side*.61,-.55,.56],m.brass);
  for(let i=0;i<7;i++)plate(housing,.18,.045,.04,[side*.61,-2.25+i*.53,.58],m.white);
 }
 consolidateHardware(housing);
 // Lower suspension mast continues through the central atrium.
 const mast=new THREE.Group();mast.position.set(-2,-15,0);root.add(mast);
 plate(mast,2.4,19,2.1,[0,0,0],m.dark);
 for(const x of [-1.04,1.04])plate(mast,.10,18,.1,[x,0,1.10],m.brass);
 for(let i=0;i<24;i++)plate(mast,1.7,.085,.09,[0,-8.2+i*.7,1.12],i%4?m.alloy:m.white);
 consolidateHardware(mast);
 const paths=[circularLightPath(18.4,-5.58),circularLightPath(43.6,-5.58),circularLightPath(54.9,14.2),circularLightPath(54.9,-12),circularLightPath(54.9,23)];
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2+.09;paths.push([[Math.sin(a)*55,-5.5,Math.cos(a)*55],[Math.sin(a)*55,4,Math.cos(a)*55],[Math.sin(a)*55,20,Math.cos(a)*55]]);}
 const flow=createLightFlow({parent:decks,paths,color:0xffc77d,radius:compact()?.032:.046,speed:.23});
 const coreFlow=createLightFlow({parent:emblem,paths:[[[ -.54,-2.5,.58],[-.54,.95,.58],[-2.05,1.92,.58]],[[.54,-2.5,.58],[.54,.95,.58],[2.05,1.92,.58]]],color:0xffd995,radius:.013,segments:36,speed:.38});
 return {update(time,motion,energy){flow.update(time,.75+energy*.30,motion);coreFlow.update(time,.85+energy*.5,motion);}};
}





