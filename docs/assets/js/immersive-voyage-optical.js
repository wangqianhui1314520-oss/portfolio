import * as THREE from 'three';
import {hardwareMaterials,hardwareMesh,consolidateHardware} from './immersive-hardware.js?v=cinematic-v21.1';
import {crystalMaterial,createEnergyRibbons} from './immersive-optical.js?v=cinematic-v21.1';
import {createLightFlow} from './immersive-light-flow.js?v=cinematic-v21.1';

export function createOpeningVoyage({scene,camera,particleScene,particleUniforms,compact}){
 const root=new THREE.Group();scene.add(root);const m=hardwareMaterials(),crystal=crystalMaterial();
 m.alloy.color.set(0x94a7c3);m.dark.color.set(0x101827);m.white.color.setRGB(.72,1.05,1.85);
 for(const material of [m.white,m.alloy,m.cyan]){material.transparent=true;material.depthWrite=false;}
 const gate=new THREE.Group();gate.position.set(360,170,-250);gate.rotation.set(.10,-.25,-.20);root.add(gate);
 // A monumental transparent crescent gives the approach a scale reference.
 const arcs=[];
 for(let i=0;i<3;i++){
  const arc=hardwareMesh(gate,new THREE.TorusGeometry(290+i*12,i===0?5.4:1.6,8,160,Math.PI*1.60),i===0?crystal:m.white);
  arc.rotation.z=-Math.PI*.26+i*.045;arcs.push(arc);
 }
 const accents=new THREE.Group();gate.add(accents);
 for(let i=0;i<9;i++){const a=-Math.PI*.25+i*Math.PI*1.55/8;const node=new THREE.Group();node.position.set(Math.cos(a)*290,Math.sin(a)*290,0);node.rotation.z=a;accents.add(node);hardwareMesh(node,new THREE.TorusGeometry(3.7,.38,6,16),m.alloy);hardwareMesh(node,new THREE.SphereGeometry(.60,8,8),m.cyan);}
 consolidateHardware(accents);
 const approach=new THREE.Group();approach.position.set(-12,8,64);approach.rotation.z=-.12;root.add(approach);
 for(let i=0;i<2;i++){const arc=hardwareMesh(approach,new THREE.TorusGeometry(48+i*2,.055,5,120,Math.PI*1.68),m.cyan);arc.rotation.z=-Math.PI*.35+i*.10;}
 const curves=[];
 for(let i=0;i<5;i++)curves.push(new THREE.CatmullRomCurve3([[-420+i*9,-30+i*3,1780],[-170+i*8,-25+i*3,1270],[110+i*5,-25+i*2,760],[105+i*4,-4+i*2,360],[12+i*2,-8+i,90],[18,-10,-10]].map(p=>new THREE.Vector3(...p))));
 const streams=createEnergyRibbons({parent:root,curves,color:0x8cb4ff,width:3.1,segments:170});
 const signal=createLightFlow({parent:root,paths:curves.slice(0,2),color:0xa5cfff,radius:.065,speed:.06,segments:160});
 let seed=32918;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const count=compact()?260:650,positions=[],ends=[],colors=[],sizes=[];
 for(let i=0;i<count;i++){
  const p=[(random()-.5)*360,(random()-.5)*220,(random()-.5)*700],color=i%7===0?[.70,.52,.98]:[.32,.67,.94];
  for(const end of [0,1]){positions.push(...p);ends.push(end);colors.push(...color);sizes.push(.4+random()*.6);}
 }
 const uniforms={uObserver:{value:camera.position},uHeading:{value:new THREE.Vector3(0,0,-1)},uSpeed:{value:0},uWarp:{value:0},uPower:{value:0},...particleUniforms};
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('aEnd',new THREE.Float32BufferAttribute(ends,1));geo.setAttribute('aColor',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));
 const streaks=new THREE.LineSegments(geo,new THREE.ShaderMaterial({uniforms,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,
 vertexShader:`uniform vec3 uObserver,uHeading;uniform float uSpeed,uWarp,uPower;attribute float aEnd,aSize;attribute vec3 aColor;varying vec3 vColor;varying float vAlpha;void main(){vec3 span=vec3(360.,220.,700.);vec3 p=mod(position-uObserver+span*.5,span)-span*.5+uObserver;float edge=1.-smoothstep(.78,1.,max(max(abs((p-uObserver).x)/180.,abs((p-uObserver).y)/110.),abs((p-uObserver).z)/350.));p-=uHeading*aEnd*(.12+uSpeed*.35+uWarp*24.)*aSize;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;vColor=aColor;vAlpha=(.09+uSpeed*.06+uWarp*.32)*uPower*edge*(1.-aEnd*.91)*smoothstep(5.,30.,-mv.z);}`,
 fragmentShader:`uniform sampler2D uSceneDepth;uniform vec2 uFrameSize;varying vec3 vColor;varying float vAlpha;void main(){if(gl_FragCoord.z>texture2D(uSceneDepth,gl_FragCoord.xy/uFrameSize).r+.0000001)discard;gl_FragColor=vec4(vColor,vAlpha);}`
 }));streaks.frustumCulled=false;particleScene.add(streaks);
 const canvas=document.getElementById('space');canvas.dataset.voyageParticles=String(count);
 return {update(frame,motion){const shot=frame.introFrame,time=motion?shot.time:0;
  const presence=1-THREE.MathUtils.smoothstep(shot.time,10.2,12.5);
  root.visible=frame.step==='bridge'&&frame.opening&&presence>.001;
  crystal.uniforms.uTime.value=time;crystal.uniforms.uVisibility.value=presence;
  m.white.opacity=presence;m.alloy.opacity=presence;m.cyan.opacity=presence;
  streams.update(time,.8*presence,Boolean(motion));signal.update(time,.7*presence,Boolean(motion));
  streaks.visible=frame.fullOpening&&motion&&shot.time<11.6;uniforms.uSpeed.value=frame.speed;uniforms.uWarp.value=shot.warp;uniforms.uPower.value=shot.flight;camera.getWorldDirection(uniforms.uHeading.value);
  canvas.dataset.openingTime=shot.time.toFixed(2);canvas.dataset.warp=shot.warp.toFixed(3);canvas.dataset.openingRoute=shot.route.toFixed(3);
 }};
}





