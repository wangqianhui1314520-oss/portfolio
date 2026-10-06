import * as THREE from 'three';
import { hardwareMaterials,hardwareMesh,bevelGeometry,roundedShape,consolidateHardware } from './immersive-hardware.js?v=cinematic-v21.1';

// Physical camera-local bridge. The visitor's identity device is mounted on this console.
export function createShipCockpit({camera}){
 const root=new THREE.Group();camera.add(root);root.position.z=-7;
 const fixed=new THREE.Group();root.add(fixed);const m=hardwareMaterials();m.brass.color.set(0x95a3bc);m.armor.color.set(0x73839e);m.white.color.setRGB(.69,1.1,1.8);
 const part=(g,mat,pos=[0,0,0],parent=fixed)=>hardwareMesh(parent,g,mat,pos);
 function plate(points,depth,material){
  const shape=new THREE.Shape();shape.moveTo(...points[0]);
  for(let i=1;i<points.length;i++){const p=points[i],prior=points[i-1];shape.quadraticCurveTo(prior[0],prior[1],(prior[0]+p[0])/2,(prior[1]+p[1])/2);}
  shape.lineTo(...points.at(-1));shape.closePath();
  return part(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.011,bevelThickness:.012,bevelSegments:4,curveSegments:16}),material);
 }
 function rail(points,material=m.armor,radius=.012){return part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),96,radius,8,false),material);}
 plate([[-1.32,-1.32],[-1.32,-.82],[-.94,-.70],[-.58,-.76],[-.13,-.88],[.25,-.91],[.59,-.78],[1.07,-.70],[1.32,-.81],[1.32,-1.32]],.20,m.ceramic);
 plate([[-1.32,-1.32],[-1.32,-.98],[-.80,-.88],[-.36,-1.00],[.1,-1.08],[.6,-.93],[1.32,-.96],[1.32,-1.32]],.35,m.dark).position.z=.03;
 rail([[-1.35,-.80,.2],[-.94,-.71,.2],[-.56,-.77,.2],[0,-.89,.2],[.52,-.82,.2],[1.02,-.71,.2],[1.35,-.8,.2]],m.brass,.018);
 rail([[-1.35,-.78,.218],[-.94,-.695,.218],[-.56,-.755,.218],[0,-.875,.218],[.52,-.805,.218],[1.02,-.695,.218],[1.35,-.78,.218]],m.white,.003);
 // Broad structural arches stay outside the central panoramic window.
 for(const side of [-1,1]){
  rail([[side*1.2,-1.0,.04],[side*1.08,-.42,.02],[side*1.06,.30,-.015],[side*.90,.91,-.06],[side*.60,1.2,-.10]],m.dark,.047);
  rail([[side*1.155,-.98,.09],[side*1.04,-.42,.07],[side*1.025,.30,.04],[side*.865,.91,0],[side*.60,1.18,-.04]],m.brass,.008);
  rail([[side*1.15,-.95,.105],[side*1.035,-.42,.08],[side*1.02,.30,.05],[side*.86,.91,.01]],m.white,.0027);
 }
 rail([[-1.28,1.06,-.10],[-.60,1.16,-.14],[.1,1.18,-.15],[.80,1.13,-.12],[1.30,1.02,-.08]],m.dark,.055);
 // Real instrument housings with separate glass, knobs and inlaid displays.
 const instruments=[],lampColors=[m.white,m.cyan,m.amber].map(material=>({material,color:material.color.clone()}));
 for(const [x,y,w,h,angle] of [[-.80,-.88,.29,.14,.05],[-.43,-.94,.34,.14,-.06],[.46,-.99,.32,.15,.09],[.87,-.88,.29,.13,-.04]]){
  const housing=new THREE.Group();housing.position.set(x,y,.28);housing.rotation.z=angle;fixed.add(housing);
  part(bevelGeometry(w+.032,h+.025,.035,.025,.004),m.alloy,[0,0,0],housing);
  part(bevelGeometry(w,h,.013,.015,.002),m.inset,[0,0,.026],housing);
  instruments.push({x,y,w,h,angle});
  for(let i=0;i<3;i++){const knob=part(new THREE.CylinderGeometry(.010,.012,.014,16),m.brass,[-w*.34+i*.028,-h*.7,.027],housing);knob.rotation.x=Math.PI/2;}
 }
 const screen=document.createElement('canvas');screen.width=1024;screen.height=256;const ctx=screen.getContext('2d');
 const map=new THREE.CanvasTexture(screen);map.colorSpace=THREE.SRGBColorSpace;
 const displays=[];
 for(const {x,y,w,h,angle} of instruments){const display=part(new THREE.PlaneGeometry(w*.93,h*.85),new THREE.MeshBasicMaterial({map,transparent:true,opacity:.75}),[x,y,.318],root);display.rotation.z=angle;display.userData.dynamic=true;displays.push(display);}
 // Mounted projector beneath the creator's optical glass.
 for(const x of [-.75,-.22]){
  rail([[x,-.82,.30],[x,-.73,.34],[x,-.61,.15]],m.alloy,.012);
  part(bevelGeometry(.16,.031,.13,.014,.003),m.dark,[x,-.79,.29]);
  part(bevelGeometry(.12,.005,.065,.002,.001),m.cyan,[x,-.765,.32]);
 }
 consolidateHardware(fixed);
 const device=new THREE.Group();device.position.set(-.445,-.095,.06);root.add(device);
 const curved=bevelGeometry(.95,1.04,.013,.045,.004),p=curved.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,p.getZ(i)+.10*x*x);}curved.computeVertexNormals();
 const glassMaterial=new THREE.MeshPhysicalMaterial({color:0xb6cdd5,metalness:0,roughness:.08,transmission:.92,thickness:.035,ior:1.18,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:.25,transparent:true,opacity:1,depthWrite:false,attenuationColor:0x52677a,attenuationDistance:4});
 const glass=part(curved,glassMaterial,[0,0,0],device);
 glass.castShadow=false;glass.receiveShadow=false;
 const edgeShape=roundedShape(.965,1.055,.05),edgePoints=edgeShape.getPoints(100).map(p=>new THREE.Vector3(p.x,p.y,.015+.10*p.x*p.x));
 const edge=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePoints,true),160,.0032,8,true),m.armor);device.add(edge);
 const glint=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePoints.slice(14,35)),40,.0019,6,false),m.white);device.add(glint);
 const warmLight=new THREE.PointLight(0xffdbb2,3,20,2);warmLight.position.set(.8,.6,1.6);camera.add(warmLight);
 const instrumentLight=new THREE.PointLight(0x76cddd,1.6,12,2);instrumentLight.position.set(-3,-2,-3);camera.add(instrumentLight);
 const drive=new THREE.InstancedMesh(new THREE.BoxGeometry(.008,.023,.004),m.cyan,18),bar=new THREE.Object3D();root.add(drive);
 const particleCount=innerWidth<700?90:180,seeds=new Float32Array(particleCount*3);
 for(let i=0;i<particleCount;i++)seeds.set([((i*.61803398875)%1),((i*.754877666)%1),i%2],i*3);
 const signalGeo=new THREE.BufferGeometry();signalGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(particleCount*3),3));signalGeo.setAttribute('aSeed',new THREE.BufferAttribute(seeds,3));
 const signalUniforms={uTime:{value:0},uPower:{value:0},uHeight:{value:innerHeight}};
 const signalParticles=new THREE.Points(signalGeo,new THREE.ShaderMaterial({uniforms:signalUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute vec3 aSeed;uniform float uTime,uPower,uHeight;varying float vAlpha;void main(){float t=fract(aSeed.x+uTime*.19);float side=aSeed.z<.5?-1.:1.;
   vec3 p=vec3(side<0.?-.75:-.22,-.76+t*.17,.31-t*.16);p.x+=sin(t*3.14)*side*.075+(aSeed.y-.5)*.014;
   vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(uHeight*.005/max(1.,-mv.z),.6,2.2);vAlpha=uPower*(1.-t)*.7;}`,
  fragmentShader:'varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.40,.75,.94,exp(-d*d*23.)*vAlpha);}'
 }));signalParticles.frustumCulled=false;root.add(signalParticles);
 const readingDevice=new THREE.Group();root.add(readingDevice);
 const readingMaterial=glassMaterial.clone();readingMaterial.transmission=.88;readingMaterial.color.set(0xb9c9db);
 const readGeo=bevelGeometry(1,1,.018,.035,.003);const readPos=readGeo.attributes.position;
 for(let i=0;i<readPos.count;i++){const x=readPos.getX(i);readPos.setZ(i,readPos.getZ(i)+x*x*.025);}readGeo.computeVertexNormals();
 const readGlass=hardwareMesh(readingDevice,readGeo,readingMaterial);readGlass.castShadow=readGlass.receiveShadow=false;
 const readEdgePoints=roundedShape(1.018,1.018,.045).getPoints(100).map(p=>new THREE.Vector3(p.x,p.y,.018+p.x*p.x*.025));
 hardwareMesh(readingDevice,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(readEdgePoints,true),150,.003,6,true),m.armor).castShadow=false;
 const readMount=hardwareMesh(readingDevice,bevelGeometry(.38,.023,.12,.008,.002),m.dark,[0,-.508,.06]);
 hardwareMesh(readingDevice,bevelGeometry(.32,.003,.07,.001,.001),m.cyan,[0,-.494,.065]);
 let lastStep='',lastPower=-1,visibility=0,devicePulse=0,deviceHover=false,readKey='',readBounds=null;
 addEventListener('tem:ping',()=>{devicePulse=1;});
 document.addEventListener('pointerover',event=>{deviceHover=Boolean(event.target.closest('.hero-actions button,.profile-tabs button,.primary'));});
 return {update(pointer,velocity,time,frame,motion=1){
  const h=7*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5));root.scale.set(h*camera.aspect,h,1);
  const reveal=frame.intro??1,entry=frame.opening?frame.introFrame.panel:1,lighting=frame.opening?frame.introFrame.bridge:1,mobile=innerWidth<700;
  root.visible=!['bridge','captain','map','boot','docked'].includes(frame.step)&&!frame.opening;
  if(!root.visible){warmLight.intensity=0;instrumentLight.intensity=0;document.getElementById('space').dataset.bridge='open-optical-world';return;}
  const show=frame.step==='bridge';visibility=THREE.MathUtils.lerp(visibility,show?1:0,motion?.10:1);
  device.visible=visibility>.01&&entry>.01;
  // Narrow viewports use a taller center device and preserve the surrounding sky.
  device.position.set(mobile?0:-.445,mobile?-.05:-.095,.06);device.scale.set(mobile?1.73:1,mobile?1.12:1,1);
  device.scale.y*=Math.max(.01,entry);glassMaterial.opacity=visibility;
  root.position.y=0;root.rotation.z=frame.opening?0:-pointer.x*.0015*motion;
  // The bridge remains physically present during travel; its equipment wakes on arrival.
  fixed.visible=true;displays.forEach(display=>display.material.opacity=(.025+lighting*.4));
  warmLight.intensity=frame.step==='captain'?0:.025+lighting*2.975;
  lampColors.forEach(({material,color})=>material.color.copy(color).multiplyScalar(.06+lighting*.94));
  devicePulse*=.94;signalParticles.visible=show&&entry>.98;signalUniforms.uTime.value=time*motion;signalUniforms.uHeight.value=innerHeight;
  signalUniforms.uPower.value=(.08+(deviceHover?.22:0)+devicePulse*.65)*visibility;instrumentLight.intensity=(.08+lighting*1.52)+devicePulse*2+(deviceHover?.4:0);
  const nextReadKey=frame.step+':'+innerWidth+':'+innerHeight;
  if(nextReadKey!==readKey){readKey=nextReadKey;const surface=document.querySelector('.project-detail,.about-surface');readBounds=surface?surface.getBoundingClientRect():null;}
  readingDevice.visible=Boolean(readBounds&&frame.step==='docked');
  if(readingDevice.visible){const r=readBounds;readingDevice.position.set((r.x+r.width/2)/innerWidth*2-1,1-(r.y+r.height/2)/innerHeight*2,.07);readingDevice.scale.set(r.width/innerWidth*2,r.height/innerHeight*2,1);}
  const power=Math.min(1,.14+velocity*.28+(['scanning','docking'].includes(frame.step)?.2:0));
  for(let i=0;i<18;i++){bar.position.set(.10+i*.017,-.99,.40);bar.scale.set(1,i/18<power?1.5:.35,1);bar.updateMatrix();drive.setMatrixAt(i,bar.matrix);}drive.instanceMatrix.needsUpdate=true;
  if(lastStep!==frame.step||Math.abs(lastPower-power)>.07){
   lastStep=frame.step;lastPower=power;ctx.clearRect(0,0,1024,256);ctx.fillStyle='#83b7c6';ctx.font='15px monospace';ctx.fillText('TEM—01 / CREATIVE EXPLORER',30,33);
   ctx.fillStyle='#c0d2d3';ctx.font='24px monospace';ctx.fillText((frame.step||'BRIDGE').toUpperCase(),30,83);
   ctx.strokeStyle='#527789';ctx.lineWidth=1;for(let y=110;y<210;y+=22){ctx.beginPath();ctx.moveTo(30,y);for(let x=30;x<700;x+=12)ctx.lineTo(x,y+Math.sin(x*.04+y)*4*(1+power));ctx.stroke();}
   ctx.fillStyle='#849ca7';ctx.font='13px monospace';ctx.fillText(frame.sector?frame.sector.toUpperCase()+' / VECTOR LOCKED':'EARTH ORBIT / SYSTEM ONLINE',30,244);
   ctx.strokeStyle='#7badbf';ctx.beginPath();ctx.arc(845,130,81,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(845,130,81,25,.35,0,Math.PI*2);ctx.stroke();
   map.needsUpdate=true;
  }
  document.getElementById('space').dataset.bridge='curved-physical-console';
 }};
}






