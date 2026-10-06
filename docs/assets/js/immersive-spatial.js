import * as THREE from 'three';
import { createEnvironmentResponse } from './immersive-environment.js?v=cinematic-v21.1';
import { createProjectStarship } from './immersive-starship.js?v=cinematic-v21.1';
import { createOrbitalDockyard,createEscortCraft } from './immersive-station.js?v=cinematic-v21.1';
import { bevelGeometry } from './immersive-hardware.js?v=cinematic-v21.1';
import { journey, navigate, subscribe } from './immersive-session.js?v=cinematic-v21.1';
import {archivePose,archiveRail} from './immersive-archive-path.js?v=cinematic-v21.1';
import {createOrbitalAtlas} from './immersive-orbital-atlas.js?v=cinematic-v21.1';
import {projectWorldSurface} from './immersive-world-surface.js?v=cinematic-v21.1';
import {opticalFilm,crystalMaterial} from './immersive-optical.js?v=cinematic-v21.1';
import { sectors, sectorFor, isProject } from './immersive-journey.js?v=cinematic-v21.1';

const vector=a=>new THREE.Vector3(...a);
const smooth=x=>x*x*(3-2*x);
function prepareWorldLabels(previous=[]){
 const next=[...document.querySelectorAll('[data-world-anchor]')];
 if(document.body.classList.contains('world-anchored'))for(const el of next)if(!previous.includes(el)){
  el.style.visibility='hidden';el.style.pointerEvents='none';el.inert=true;
 }
 return next;
}
export function createSpatialWorld({scene,camera,interaction}){
 const works=window.PORTFOLIO_DATA.works.filter(isProject);
 const alloy=new THREE.MeshStandardMaterial({color:0x405867,metalness:.82,roughness:.32,envMapIntensity:1.45});
 const dark=new THREE.MeshStandardMaterial({color:0x14232e,metalness:.63,roughness:.48});
 const pale=new THREE.MeshStandardMaterial({color:0x96aebd,metalness:.6,roughness:.3});
 const cyan=new THREE.MeshBasicMaterial({color:new THREE.Color(.24,1.24,1.7),toneMapped:false});
 const warm=new THREE.MeshStandardMaterial({color:0x8d785e,metalness:.7,roughness:.37,emissive:0x67401c,emissiveIntensity:.38});
 const mesh=(g,mat,parent,pos=[0,0,0])=>{const m=new THREE.Mesh(g,mat);m.position.fromArray(pos);parent.add(m);return m;};
 const box=(parent,w,h,d,pos,mat=alloy)=>mesh(new THREE.BoxGeometry(w,h,d),mat,parent,pos);
 const torus=(parent,r,t,mat=alloy)=>mesh(new THREE.TorusGeometry(r,t,8,112),mat,parent);
 const occluders=[],mapRoot=new THREE.Group(),home=new THREE.Group();scene.add(mapRoot,home);
 mapRoot.position.z=-7;
 const mapModels=[],facilities=new Map(),destinations=new Map(),textureCache=new Map();
 const shipGlow=new THREE.PointLight(0x8bdbe7,14,70,2);camera.add(shipGlow);shipGlow.position.set(-5,3,-9);
 let step='bridge',selected=null,sectorId=null,scanAge=0,scanDone=false,elapsed=0,hovered=null,entrance=0;
 let labelElements=[],layoutMobile=innerWidth<700,labelHovered=null,gpuHovered=null,pointerKnown=false,pointerOverUI=false,probeUntil=0,lastProbe=-1000,lastInteraction='',pickStamp=-100,labelStamp=-100;
 let readingPower=0,readingHover=false;
 document.addEventListener('pointerover',e=>{readingHover=Boolean(e.target.closest('.ship-projection a,.ship-projection button,.ship-projection summary'));});
 document.addEventListener('click',e=>{if(e.target.closest('.ship-projection a,.ship-projection button,.ship-projection summary'))readingPower=1;});
 const pointerPosition=new THREE.Vector2(),pointerPlane=new THREE.Plane(),interactionPoint=new THREE.Vector3();
 const canvas=document.getElementById('space'),instruction=document.getElementById('worldInstruction');
 const ray=new THREE.Raycaster(),cursor=new THREE.Vector2(),projected=new THREE.Vector3(),worldPoint=new THREE.Vector3();
 const scanOrigin=new THREE.Vector3(),scanRadius={value:0};
 const scanMesh=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),new THREE.ShaderMaterial({
   uniforms:{uRadius:scanRadius,uOpacity:{value:0}},transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,
   vertexShader:'varying vec3 n,p;void main(){n=normalize(mat3(modelMatrix)*normal);p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',
   fragmentShader:'varying vec3 n,p;uniform float uOpacity;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(cameraPosition-p))),3.);gl_FragColor=vec4(.32,.81,.96,rim*uOpacity);}'
 }));scene.add(scanMesh);scanMesh.visible=false;
 function ringStructure(parent,r,segments=48){
   torus(parent,r,r>70?1.25:.5);const rail=torus(parent,r+1.2,.055,cyan);rail.rotation.z=.2;
   const modules=new THREE.InstancedMesh(new THREE.BoxGeometry(r>70?3.5:2.1,r>70?2.5:1.1,r>70?7:3.4),alloy,segments),lights=new THREE.InstancedMesh(new THREE.BoxGeometry(.8,.07,r>70?7.1:3.5),warm,segments),d=new THREE.Object3D();
   for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;d.position.set(Math.cos(a)*r,Math.sin(a)*r,0);d.rotation.z=a;d.updateMatrix();modules.setMatrixAt(i,d.matrix);lights.setMatrixAt(i,d.matrix);}
   parent.add(modules,lights);occluders.push(modules);
   const guideCount=Math.floor(segments/2),guides=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,r>70?2.3:1.0,r>70?7.15:3.6),cyan,guideCount);
   for(let i=0;i<guideCount;i++){const a=i/guideCount*Math.PI*2+.025;d.position.set(Math.cos(a)*(r+.6),Math.sin(a)*(r+.6),0);d.rotation.z=a;d.updateMatrix();guides.setMatrixAt(i,d.matrix);}parent.add(guides);
   for(let i=0;i<4;i++){const arc=new THREE.Mesh(new THREE.TorusGeometry(r-1.65,.035,5,64,Math.PI*.39),cyan);arc.rotation.z=i*Math.PI*.5+.12;arc.position.z=.45;parent.add(arc);}
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const brace=box(parent,1.2,8,1,[Math.cos(a)*(r-3),Math.sin(a)*(r-3),0],dark);brace.rotation.z=a-Math.PI/2;}
 }
 const dockyard=createOrbitalDockyard({compact:innerWidth<700}),megastructure=dockyard.root;megastructure.position.set(170,120,-245);megastructure.rotation.set(.16,-.37,-.07);home.add(megastructure);
 megastructure.traverse(o=>{if(o.isMesh&&!o.material.isMeshBasicMaterial)occluders.push(o);});
 const homeResponse=createEnvironmentResponse({root:home,monument:megastructure,relayOffset:[-53,-23,116],compact:innerWidth<700});
 const shuttles=[];
 const moon=mesh(new THREE.SphereGeometry(29,64,48),planetaryMaterial(0x747478,33.6),home,[-132,53,-870]);moon.rotation.set(.23,-.4,.16);
 occluders.push(moon);
 for(let i=0;i<5;i++){const g=createEscortCraft();g.scale.setScalar(i===0?.70:.28+i*.08);home.add(g);shuttles.push(g);}
 // A physical projection table, with the miniature destinations at separate depths.
 const table=new THREE.Group();mapRoot.add(table);table.position.set(0,-15,-49);table.rotation.x=1.08;
 const plinth=mesh(new THREE.CylinderGeometry(24,25,1,80),new THREE.MeshStandardMaterial({color:0x213543,metalness:.65,roughness:.42}),table);plinth.rotation.x=Math.PI/2;
 torus(table,24,.15,pale).position.z=.62;torus(table,22,.045,cyan).position.z=.62;
 const etched=new THREE.MeshBasicMaterial({color:0x558e9e,transparent:true,opacity:.4});
 for(let i=0;i<3;i++)torus(table,8+i*4,.025,etched).position.z=.62;
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2,mark=box(table,i%4===0?1.4:.6,.045,.025,[Math.cos(a)*23,Math.sin(a)*23,.64],etched);mark.rotation.z=a;}
 box(table,43,.025,.025,[0,0,.64],etched);box(table,.025,43,.025,[0,0,.64],etched);
 const mapLine=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x709eae,transparent:true,opacity:.5}));mapRoot.add(mapLine);
 const origin=mesh(new THREE.ConeGeometry(.6,1.8,4),cyan,mapRoot,[0,-7,-27]);origin.rotation.x=Math.PI/2;
 function icon(id){
   const g=new THREE.Group(),glass=crystalMaterial();
   if(id==='forge'){
    const core=mesh(new THREE.OctahedronGeometry(1.9,0),glass,g);core.rotation.set(.3,.2,.2);g.add(new THREE.LineSegments(new THREE.EdgesGeometry(core.geometry),new THREE.LineBasicMaterial({color:0xb7d8ff,transparent:true,opacity:.32})));
   }else if(id==='lumen'){
    for(let i=0;i<3;i++){const r=torus(g,2.2-i*.35,.025,cyan);r.rotation.set(i*.7,.3+i*.4,0);}
    mesh(new THREE.SphereGeometry(1.25,24,18),glass,g);
   }else if(id==='echo'){
    for(let i=0;i<3;i++){const p=mesh(bevelGeometry(1.5,3.0,.045,.15,.012),opticalFilm(.12),g,[(i-1)*.9,0,(i-1)*.45]);p.rotation.y=(i-1)*.25;}
   }else{
    const lattice=mesh(new THREE.IcosahedronGeometry(1.7,0),glass,g);g.add(new THREE.LineSegments(new THREE.EdgesGeometry(lattice.geometry),new THREE.LineBasicMaterial({color:0xb9acff,transparent:true,opacity:.45})));
   }
   torus(g,2.4,.018,cyan).rotation.x=Math.PI/2;
   return g;
 }
 // Labels retain their original world anchors; refined starport craft provide
 // the visible geometry. These four small proxies serve fallback picking only.
 const proxyMaterial=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,transparent:true,opacity:0});proxyMaterial.visible=false;
 sectors.forEach(s=>{const m=new THREE.Group();m.add(new THREE.Mesh(new THREE.SphereGeometry(3.2,8,6),proxyMaterial));m.userData.sector=s.id;mapRoot.add(m);mapModels.push(m);});
 const atlas=createOrbitalAtlas({parent:mapRoot,camera,sectors,interaction});
 function sectorOrigin(id){return vector(sectors.find(s=>s.id===id).position);}
 function facilityLocal(i,total){
   if(total===1)return new THREE.Vector3(innerWidth<700?0:-9,2,-8);
   const p=innerWidth<700?[[-10,17,-2],[10,17,-8],[-10,0,-6],[10,0,0],[-10,-17,-1],[10,-17,-8]]:[[-28,10,-6],[-2,15,-28],[28,7,-15],[-25,-12,7],[3,-10,-4],[31,-12,-29]];
   return vector(p[i]);
 }

 function planetaryMaterial(color,seed){
  return new THREE.ShaderMaterial({uniforms:{uBase:{value:new THREE.Color(color)},uSeed:{value:seed}},
   vertexShader:`varying vec3 n,p,s;void main(){n=normalize(mat3(modelMatrix)*normal);s=normalize(position);p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
   fragmentShader:`varying vec3 n,p,s;uniform vec3 uBase;uniform float uSeed;
    float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    float fbm(vec3 p){float a=.55,v=0.;for(int i=0;i<5;i++){v+=noise(p)*a;p=p*2.08+5.3;a*=.48;}return v;}
    void main(){vec3 normal=normalize(n),view=normalize(cameraPosition-p);vec3 q=s*7.+uSeed;
     float land=fbm(q+fbm(q*1.6)*2.),detail=fbm(q*9.);float ridge=pow(1.-abs(land*2.-1.),6.);
     vec3 rock=mix(uBase*.34,vec3(.44,.46,.49),smoothstep(.30,.74,land));rock*=.56+detail*.72;rock+=ridge*vec3(.045,.039,.03);
     float light=dot(normal,normalize(vec3(.48,.19,-.84))),day=max(light,0.);vec3 col=rock*(.018+day*1.5);
     float rim=pow(1.-max(dot(normal,view),0.),5.);col+=vec3(.055,.16,.22)*rim*smoothstep(-.2,.5,light);
     gl_FragColor=vec4(col,1.);
    }`});
 }

 function buildDestination(s){
   const root=new THREE.Group();root.position.copy(sectorOrigin(s.id));scene.add(root);const color=new THREE.Color(s.color),glow=new THREE.MeshBasicMaterial({color,toneMapped:false});
   const monument=new THREE.Group();monument.position.set(26,10,-70);root.add(monument);
   if(s.id==='forge'){
    monument.position.set(35,41,-102);monument.rotation.set(.17,-.26,.10);const yard=createOrbitalDockyard({variant:'forge',compact:innerWidth<700});monument.add(yard.root);yard.root.traverse(o=>{if(o.isMesh&&!o.material.isMeshBasicMaterial)occluders.push(o);});
   }else if(s.id==='lumen'){
    monument.position.set(10,4,-64);for(let i=0;i<4;i++){const lens=torus(monument,23-i*3,.55,i%2?pale:alloy);lens.position.z=-i*10;lens.rotation.y=.18*i;torus(lens,23-i*3+.7,.045,glow);}
    const core=mesh(new THREE.IcosahedronGeometry(6,1),new THREE.MeshPhysicalMaterial({color:0xa9bac9,metalness:.8,roughness:.17,iridescence:1,clearcoat:1}),monument,[0,0,-35]);core.rotation.z=.4;
   }else if(s.id==='echo'){
    monument.position.set(0,0,-70);for(let i=0;i<13;i++){const a=i*2.4,r=20+(i%3)*7;const shard=box(monument,5,18+i%4*5,.8,[Math.cos(a)*r,Math.sin(a)*r*.65,-i*4],i%2?dark:alloy);shard.rotation.set(.1,i*.23,.1*Math.sin(i));box(shard,.06,15,.9,[1.7,0,0],glow);}
   }else{
    monument.position.set(18,0,-65);const board=box(monument,54,34,3,[0,0,0],dark);board.rotation.set(.2,-.32,-.18);
    for(let i=0;i<18;i++){const x=(i%6-2.5)*7,y=(Math.floor(i/6)-1)*9;box(board,4.5,5,2,[x,y,2.4],alloy);box(board,3.7,.12,2.1,[x,y+1.8,2.5],glow);}
    for(let i=0;i<9;i++){box(board,.06,32,3.1,[(i-4)*6,0,0],glow);}
   }
   const planet=mesh(new THREE.SphereGeometry(s.id==='echo'?72:100,64,40),planetaryMaterial(s.id==='forge'?0x627c96:s.id==='lumen'?0x92877a:s.id==='echo'?0x715f80:0x5a7771,sectors.indexOf(s)*13.7),root,[-100,-110,-260]);
   const moon=mesh(new THREE.SphereGeometry(s.id==='lumen'?27:19,40,28),planetaryMaterial(0x8d929d,42.1+sectors.indexOf(s)*5),root,[150,45,-470]);moon.rotation.z=.23;
   const beltRoot=new THREE.Group();beltRoot.position.copy(planet.position);beltRoot.rotation.set(.87,.12,-.38);root.add(beltRoot);
   const beltCount=innerWidth<700?220:560,belt=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),alloy,beltCount),beltPose=new THREE.Object3D();
   for(let i=0;i<beltCount;i++){const a=i*2.399963,r=(s.id==='echo'?110:141)+Math.sin(i*7.31)*7+Math.cos(i*3.13)*4;beltPose.position.set(Math.cos(a)*r,Math.sin(i*4.17)*1.8,Math.sin(a)*r);beltPose.rotation.set(a,i*.37,i*.8);beltPose.scale.setScalar(.10+Math.pow((i*.754877)%1,3)*1.0);beltPose.updateMatrix();belt.setMatrixAt(i,beltPose.matrix);}beltRoot.add(belt);
   const atmosphere=mesh(new THREE.SphereGeometry((s.id==='echo'?72:100)*1.012,48,32),new THREE.ShaderMaterial({uniforms:{uColor:{value:color}},transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 n,p;void main(){n=normalize(mat3(modelMatrix)*normal);p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',fragmentShader:'varying vec3 n,p;uniform vec3 uColor;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(cameraPosition-p))),6.);float sun=max(.12,dot(normalize(n),normalize(vec3(.48,.19,-.84))));gl_FragColor=vec4(uColor,rim*sun*.6);}'}),root,planet.position.toArray());
   occluders.push(planet);
   const debris=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),dark,90),d=new THREE.Object3D();
   for(let i=0;i<90;i++){const a=i*2.399,r=43+(i%11)*3;d.position.set(Math.cos(a)*r,Math.sin(a)*r*.6,-30-i%7*10);d.rotation.set(a,a*.3,a*.6);d.scale.setScalar(.18+i%5*.17);d.updateMatrix();debris.setMatrixAt(i,d.matrix);}root.add(debris);
   const entry={root,monument,planet,atmosphere,baseYaw:monument.rotation.y,light:new THREE.PointLight(color,85,140,2)};entry.light.position.set(-20,16,14);root.add(entry.light);entry.response=createEnvironmentResponse({root,color,monument,relayOffset:s.id==='forge'?[-14.31,-6.21,31.32]:s.id==='lumen'?[-23,0,4]:s.id==='echo'?[20,0,2]:[-17,10,4],compact:innerWidth<700});destinations.set(s.id,entry);
   const list=works.filter(w=>sectorFor(w)===s.id);
   list.forEach((work,i)=>{
    const ship=createProjectStarship({index:i,color,title:work.title,variant:s.id});
    const {assembly,body,cover,port,beacon,light}=ship;root.add(assembly);
    assembly.userData={id:work.id,index:i,sector:s.id,revealed:false,kind:'starship'};
    assembly.position.copy(facilityLocal(i,list.length));assembly.rotation.y=-.34+(i%2)*.13;
    body.userData.work=work.id;occluders.push(body);
    const previewPane=new THREE.Mesh(new THREE.PlaneGeometry(1,1,12,8),opticalFilm(.04));
    previewPane.name='Tem.ship.approach-preview';previewPane.matrixAutoUpdate=false;previewPane.visible=false;previewPane.renderOrder=4;
    previewPane.castShadow=previewPane.receiveShadow=false;previewPane.userData.visualOnly=true;assembly.add(previewPane);
    facilities.set(work.id,{work,assembly,body,cover,port,beacon,light,ship,previewPane,opened:0,color:new THREE.Color(color),echo:false,total:list.length});
   });
   return entry;
 }
 function ensureSector(id){if(id&&!destinations.has(id))buildDestination(sectors.find(s=>s.id===id));return destinations.get(id);}
 function layout(){
   layoutMobile=innerWidth<700;
   atlas.layout();const points=atlas.positions();
   mapModels.forEach((m,i)=>{m.position.fromArray(points[i]);m.scale.setScalar(layoutMobile?.35:.5);});
   table.visible=false;origin.visible=false;mapLine.visible=false;
   const linePoints=[];mapModels.forEach(m=>{linePoints.push(...origin.position.toArray(),...m.position.toArray());});mapLine.geometry.setAttribute('position',new THREE.Float32BufferAttribute(linePoints,3));mapLine.geometry.computeBoundingSphere();
   for(const f of facilities.values()){f.assembly.position.copy(facilityLocal(f.assembly.userData.index,f.total));f.assembly.scale.setScalar(layoutMobile?.76:1);}
   cacheLabels();
 }
 function cacheLabels(){
   labelElements=prepareWorldLabels(labelElements);labelStamp=-100;
 }
 addEventListener('tem:surface',cacheLabels);addEventListener('resize',layout);
 function getFacilityPosition(id){const f=facilities.get(id);if(!f)return null;f.assembly.updateWorldMatrix(true,false);return f.assembly.getWorldPosition(new THREE.Vector3());}
 function pose(state){
   const mobile=innerWidth<700;
   if(state.step==='bridge')return {position:vector([0,2,25]),look:vector([0,3,-90]),fov:mobile?55:52};
   if(state.step==='captain'){
    const p=archivePose(archiveRail.progress,mobile);return {position:vector(p.position),look:vector(p.look),fov:p.fov};
   }
   // A lower, slightly closer eye exposes the thick outer shoulder and berth
   // undersides. The real label/control surfaces keep their existing anchors.
   if(state.step==='boot'||state.step==='map')return {position:vector(mobile?[0,4,18]:[-3.6,6.5,27.5]),look:vector(mobile?[0,1,-21]:[4,-1.25,-23]),fov:mobile?54:52.5};
   ensureSector(state.sector);const center=sectorOrigin(state.sector);
   if(['target','docking','docked'].includes(state.step)){
    const f=getFacilityPosition(state.work),reading=['docking','docked'].includes(state.step);
    return {position:f.clone().add(vector(mobile?[0,reading?11:13,reading?33:42]:[reading?12:17,reading?17:12,reading?40:36])),look:f.clone().add(vector(mobile?[0,reading?3.5:-4,0]:[reading?4:8,reading?7.5:1.4,0])),fov:mobile?55:50};
   }
   return {position:center.clone().add(vector([0,mobile?3:5,mobile?93:88])),look:center.clone().add(vector([0,0,-15])),fov:54};
 }
 function loadCover(f){
   if(f.cover.material.map)return;
   const assign=t=>{f.cover.material.map=t;f.cover.material.color.set(0xffffff);f.cover.material.needsUpdate=true;const aspect=t.image.width/t.image.height;f.cover.scale.set(Math.min(1,aspect/(7.55/4.72)),Math.min(1,(7.55/4.72)/aspect),1);const c=document.createElement('canvas');c.width=c.height=8;const ctx=c.getContext('2d',{willReadFrequently:true});try{ctx.drawImage(t.image,0,0,8,8);const d=ctx.getImageData(0,0,8,8).data;let r=0,g=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}f.color.setRGB(r/16320,g/16320,b/16320,THREE.SRGBColorSpace);}catch{}};
   if(textureCache.has(f.work.cover))assign(textureCache.get(f.work.cover));else new THREE.TextureLoader().load(f.work.cover,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textureCache.set(f.work.cover,t);assign(t);},undefined,()=>{});
 }
 function setImage(f,texture){
   if(f.cover.material.map!==texture){f.cover.material.map=texture;f.cover.material.needsUpdate=true;}
   if(!texture)return;
   const image=texture.image,ratio=texture.isVideoTexture?image.videoWidth/image.videoHeight:image.width/image.height;
   if(Number.isFinite(ratio)&&ratio>0)f.cover.scale.set(Math.min(1,ratio/(7.55/4.72)),Math.min(1,(7.55/4.72)/ratio),1);
 }
 function setState(){
   const state=journey.state,changedSector=state.sector!==sectorId;step=state.step;selected=state.work;sectorId=state.sector;entrance=0;
   ensureSector(sectorId);mapRoot.visible=['map','boot','travel'].includes(step);
   home.visible=step==='travel';
   for(const [id,d] of destinations)d.root.visible=id===sectorId;
   if(changedSector){layout();homeResponse.reset();for(const d of destinations.values())d.response.reset();}
   labelHovered=null;gpuHovered=null;hovered=null;probeUntil=0;lastInteraction='';delete document.body.dataset.worldHover;
   if(step==='scanning'){scanAge=0;scanDone=false;scanOrigin.copy(pose(state).position);scanMesh.position.copy(scanOrigin);for(const f of facilities.values())if(f.assembly.userData.sector===sectorId)f.echo=false;}
   scanMesh.visible=step==='scanning';
   for(const f of facilities.values())if(f.videoTexture&&(f.work.id!==selected||step!=='docked')){setImage(f,textureCache.get(f.work.cover)||null);f.videoTexture.dispose();f.videoTexture=null;f.video=null;}
   if(['target','docking','docked'].includes(step)&&selected)loadCover(facilities.get(selected));
   cacheLabels();
 }
 subscribe(setState);setState();layout();
 function projectLabels(){
   const viewportW=innerWidth,viewportH=innerHeight;
   for(const el of labelElements){
    const id=el.dataset.worldAnchor;let object,offset;
    if(step==='map'){object=mapModels.find(m=>m.userData.sector===id);offset=new THREE.Vector3();}
    else {object=facilities.get(id)?.assembly;offset=new THREE.Vector3(0,-3.3,3);}
    if(!object){el.style.visibility='hidden';continue;}
    object.updateWorldMatrix(true,false);worldPoint.copy(offset);object.localToWorld(worldPoint);projected.copy(worldPoint).project(camera);
    const x=(projected.x*.5+.5)*viewportW,y=(-projected.y*.5+.5)*viewportH;
    // DOM labels are semantic companions to the world object; hide them behind geometry.
    const distance=camera.position.distanceTo(worldPoint);ray.set(camera.position,worldPoint.clone().sub(camera.position).normalize());ray.far=distance-.9;
    const blocked=occluders.some(o=>{let p=o;while(p){if(!p.visible)return false;p=p.parent;}if(o.userData.work===id)return false;return ray.intersectObject(o,false).length>0;});
    const visible=projected.z>-1&&projected.z<1&&x>8&&x<viewportW-8&&y>80&&y<viewportH-70&&!blocked;
    if(step==='map'&&viewportW>=700){
     projectWorldSurface({object,camera,element:el,w:18,h:5.1,width:260,height:80,ready:visible});
     if(!visible){el.style.visibility='hidden';el.style.pointerEvents='none';el.inert=true;}
     continue;
    }
    if(el.dataset.worldMounted){delete el.dataset.worldMounted;el.style.width='';el.style.height='';}
    el.style.visibility=visible?'visible':'hidden';el.style.pointerEvents=visible?'auto':'none';el.inert=!visible;
    el.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,0)`;
   }
 }
 // Pointer rays hit the same geometry used for rendering and label occlusion.
 const blockedUI='button,a,summary,video,dialog,.experience-settings,.surface-content,.project-detail,.about-surface,.approach-copy,.bridge-header,.journey-dock';
 const interactive=()=>!document.querySelector('dialog[open]')&&['bridge','captain','map','arrival','signals','target','docked'].includes(step);
 function visible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
 function cast(){cursor.copy(pointerPosition);ray.setFromCamera(cursor,camera);ray.far=2400;}
 function pick(){
   if(!['map','signals'].includes(step))return null;
   const objects=step==='map'?(atlas.pickObjects?.()||mapModels):[...facilities.values()].filter(f=>f.assembly.userData.sector===sectorId).map(f=>f.assembly);
   const hit=ray.intersectObjects(objects,true).find(h=>visible(h.object)&&!h.object.userData.visualOnly);if(!hit)return null;
   let p=hit.object;while(p&&!p.userData.id&&!p.userData.sector)p=p.parent;
   if(!p)return null;const id=p.userData.id||p.userData.sector;
   const blocked=occluders.some(o=>visible(o)&&o.userData.work!==id&&ray.intersectObject(o,false).some(h=>h.distance<hit.distance-.3));
   return blocked?null:{id,object:p};
 }
 function probePoint(){
   const body=destinations.get(sectorId)?.planet;
   const hit=body&&ray.intersectObject(body,false)[0];if(hit)return hit.point;
   pointerPlane.set(new THREE.Vector3(0,0,1),-(sectorId?sectorOrigin(sectorId).z-8:-70));
   return ray.ray.intersectPlane(pointerPlane,interactionPoint);
 }
 function response(){return destinations.get(sectorId)?.response||homeResponse;}
 let pointerDown=null,drag=0;
 addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest(blockedUI)||!interactive())return;pointerDown={x:e.clientX,y:e.clientY};drag=0;});
 addEventListener('pointermove',e=>{pointerKnown=true;pointerOverUI=Boolean(e.target.closest(blockedUI));pointerPosition.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);if(pointerDown)drag=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);},{passive:true});
 addEventListener('pointerout',e=>{if(!e.relatedTarget){pointerKnown=false;gpuHovered=null;response().pointer(null);}});
 addEventListener('pointercancel',()=>{pointerDown=null;drag=0;gpuHovered=null;});
 addEventListener('pointerup',e=>{
   if(!pointerDown)return;pointerDown=null;if(drag>8||e.target.closest(blockedUI)||!interactive())return;
   pointerPosition.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);cast();const hit=pick();
   if(hit){if(step==='map')dispatchEvent(new CustomEvent('tem:atlas-choice',{detail:{id:hit.id}}));else navigate('select',hit.id);dispatchEvent(new CustomEvent('tem:ping',{detail:{source:'ship'}}));return;}
   const point=probePoint();if(point&&performance.now()-lastProbe>450){lastProbe=performance.now();response().probe(point);probeUntil=performance.now()+2600;dispatchEvent(new CustomEvent('tem:ping',{detail:{source:'probe'}}));}
 });
 addEventListener('tem:hover',e=>{labelHovered=e.detail.id||null;});
 function updateInteraction(dt,time,motion){
   const active=interactive(),inputStamp=performance.now()*.001;let point=null;
   if(active&&pointerKnown&&!pointerDown){cast();if(!pointerOverUI&&inputStamp-pickStamp>.05){gpuHovered=pick()?.id||null;pickStamp=inputStamp;}else if(pointerOverUI)gpuHovered=null;point=probePoint();}else gpuHovered=null;
   hovered=labelHovered||gpuHovered;
   interaction?.setHover(hovered);
   if(hovered)document.body.dataset.worldHover=hovered;else delete document.body.dataset.worldHover;
   const carrier=facilities.get(['target','docking','docked'].includes(step)?selected:hovered||selected);
   const mode=step==='docking'?'docking':step==='docked'?'docked':step==='target'?'approach':'hover';
   const env=response();env.pointer(point);env.setTarget((active||step==='docking')&&carrier?.assembly.userData.sector===sectorId?carrier.assembly:null,mode);
   const result=env.update(dt,time,motion),d=destinations.get(sectorId);
   if(d)d.light.intensity=85+result.response*160;
   const status=performance.now()<probeUntil?'probe':hovered?`hover:${hovered}`:active&&carrier?`link:${carrier.work.id}`:'idle';
   if(status!==lastInteraction){lastInteraction=status;canvas.dataset.interaction=status;
    if(active)instruction.textContent=step==='map'?'选择星域 · 点亮航线 · 在控制台确认启航':status==='probe'?'探测脉冲已发出 · 星尘正在回应':hovered?'信号已响应 · 点击靠近 · 拖动空白环视':step==='docked'?'星舰与轨道设施已连接 · 拖动空白环视':step==='target'?'拖动环视星舰 · 停靠展开作品':'拖动空白环视 · 点击深空发送脉冲';
   }
   canvas.dataset.probeCount=String(result.pulseCount);
 }
 const videoCanvas=document.createElement('canvas');videoCanvas.width=videoCanvas.height=8;const videoContext=videoCanvas.getContext('2d',{willReadFrequently:true});let videoTick=0;
 const previewScale=new THREE.Matrix4();
 return {pose,opticalAnchor:()=>atlas.opticalAnchor(),update(dt,time,motion,shot={progress:1}){
   elapsed=time;entrance+=dt;if(layoutMobile!==(innerWidth<700))layout();updateInteraction(dt,time,motion);
   readingPower=Math.max(readingHover?.35:0,readingPower*Math.exp(-dt*2.5));
   const activeDestination=destinations.get(sectorId);if(activeDestination){activeDestination.planet.rotation.y=time*.002;activeDestination.monument.rotation.y=activeDestination.baseYaw+Math.sin(time*.06)*.04;}
   const archive=step==='captain';megastructure.position.set(archive?320:170,archive?35:120,archive?-600:-245);megastructure.scale.setScalar(archive?.65:1);
   dockyard.update(time,step==='boot'?.5:0,motion);
   shuttles.forEach((g,i)=>{g.position.set(-52+((time*.55+i*39)%180),-3+i*8,-118-i*45);g.rotation.y=-.32;g.rotation.z=.04*Math.sin(time*.025+i);});
   mapModels.forEach((m,i)=>{m.rotation.y=-.25+Math.sin(time*.18+i)*.22;const focused=hovered===m.userData.sector;m.children.at(-1).rotation.z=time*.03;if(focused)m.rotation.y+=.10;});
   // Keep the departing port at its original coordinates until it is behind the eye.
   const departing=step==='travel'&&shot.progress<.4;
   mapRoot.visible=step==='map'||step==='boot'||departing;
   atlas.update(dt,time,motion,step==='map'||step==='boot'||departing,hovered,departing?Math.max(0,1-shot.progress/.22):0);
   if(step==='scanning'){
    scanAge+=dt;const radius=motion?scanAge*53:1000;scanRadius.value=radius;scanMesh.scale.setScalar(Math.max(.1,radius));scanMesh.material.uniforms.uOpacity.value=Math.min(.32,scanAge*.5)*Math.max(0,1-scanAge/3);
    let all=true;for(const f of facilities.values())if(f.assembly.userData.sector===sectorId){const distance=getFacilityPosition(f.work.id).distanceTo(scanOrigin);if(!f.echo&&radius>=distance){f.echo=true;f.assembly.userData.revealed=true;dispatchEvent(new CustomEvent('tem:echo',{detail:{id:f.work.id,title:f.work.title}}));}all&&=f.echo;}
    if(all&&!scanDone&&scanAge>.5){scanDone=true;queueMicrotask(()=>{if(journey.state.step==='scanning'&&journey.state.sector===sectorId)navigate('decode');});}
   }
   for(const f of facilities.values()){
    if(f.assembly.userData.sector!==sectorId)continue;
    const open=selected===f.work.id&&['docking','docked'].includes(step);
    const deployment=step==='docking'&&motion?smooth(THREE.MathUtils.clamp((shot.progress-.38)/.50,0,1)):1;
    const doorTarget=step==='docking'&&motion?smooth(THREE.MathUtils.clamp((shot.progress-.08)/.32,0,1)):1;
    f.opened=motion?THREE.MathUtils.damp(f.opened,open?deployment:0,9,dt):(open?1:0);
    f.doorOpen=motion?THREE.MathUtils.damp(f.doorOpen||0,open?doorTarget:0,9,dt):(open?1:0);
    const decoded=journey.hasScanned(sectorId)||f.echo,focused=(hovered||selected)===f.work.id;
    f.ship.update(f.opened,focused,time,motion,f.doorOpen,open?readingPower:0);f.light.color.lerp(f.color,.03);f.light.intensity=THREE.MathUtils.damp(f.light.intensity,open?15+readingPower*9:focused?10:decoded?3:.35,3,dt);
    const preview=selected===f.work.id&&['target','docking'].includes(step);
    const previewCoverage=step==='docking'?1-smooth(THREE.MathUtils.clamp((shot.progress-.12)/.28,0,1)):motion?smooth(THREE.MathUtils.clamp(shot.progress/.72,0,1)):1;
    f.previewPane.visible=preview&&Boolean(f.ship.readingSurface)&&previewCoverage>.001;f.previewPane.material.opacity=.04*previewCoverage;
    if(f.previewPane.visible&&f.ship.readingSurface){
     f.assembly.updateWorldMatrix(true,true);f.ship.readingSurface.updateWorldMatrix(true,false);
     previewScale.makeScale(layoutMobile?1.30:.94,layoutMobile?.60:.46,1);
     f.previewPane.matrix.copy(f.assembly.matrixWorld).invert().multiply(f.ship.readingSurface.matrixWorld).multiply(previewScale);
     f.previewPane.updateMatrixWorld(true);
    }
   }
   const video=document.querySelector('.media-player video');
   if(step==='docked'&&selected){const f=facilities.get(selected);if(video&&video.readyState>=2&&!video.paused){if(f.video!==video){f.videoTexture?.dispose();f.videoTexture=new THREE.VideoTexture(video);f.videoTexture.colorSpace=THREE.SRGBColorSpace;f.video=video;}setImage(f,f.videoTexture);}else if(f.cover.material.map===f.videoTexture&&textureCache.has(f.work.cover)){setImage(f,textureCache.get(f.work.cover));}}if(step==='docked'&&selected&&video&&!video.paused&&video.readyState>=2&&videoTick++%12===0){try{videoContext.drawImage(video,0,0,8,8);const d=videoContext.getImageData(0,0,8,8).data;let r=0,g=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}facilities.get(selected).color.setRGB(r/16320,g/16320,b/16320,THREE.SRGBColorSpace);}catch{}}
   scene.updateMatrixWorld();const now=performance.now()*.001;if(['map','signals'].includes(step)&&now-labelStamp>.033){projectLabels();labelStamp=now;}
   if(step==='target'&&selected){
    const f=facilities.get(selected),panel=document.querySelector('#expeditionUI .approach-copy');
    if(panel&&f.previewPane.visible){
     projectWorldSurface({object:f.previewPane,camera,element:panel,w:1,h:1,width:560,height:420,ready:!motion||shot.progress>.985});
     canvas.dataset.approachSurface='world-starship-gantry';
    }
   }
   if(step==='docked'&&selected){const f=facilities.get(selected),panel=document.querySelector('#expeditionUI .project-detail');canvas.dataset.readingSurface=f.ship.readingSurface?'world-gantry':'unavailable';if(panel)projectWorldSurface({object:f.ship.readingSurface,camera,element:panel,w:.94,h:.94,width:640,height:850,ready:f.opened>.95});}
 },layout,getFacilityPosition};
}
