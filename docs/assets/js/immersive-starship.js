import * as THREE from 'three';
import {createLightFlow} from './immersive-light-flow.js?v=cinematic-v21.1';
import {opticalFilm,crystalMaterial,createEnergyRibbons,createOpticalMotes} from './immersive-optical.js?v=cinematic-v21.1';
import {loadTemAsset} from './immersive-blender-assets.js?v=cinematic-v21.1';

// Shared machined surfaces; engineering details use instances rather than one
// draw call per screw, radiator or light. The hangar remains independently movable.
function armorMaps(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d');let seed=601;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 ctx.fillStyle='#c6cbcc';ctx.fillRect(0,0,512,512);
 for(let i=0;i<2800;i++){ctx.fillStyle=rand()>.5?'#edf2f20b':'#131d2510';ctx.fillRect(rand()*512,rand()*512,rand()*8+.5,.4);}
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(.18,.18);map.anisotropy=4;
 const bump=map.clone();bump.colorSpace=THREE.NoColorSpace;bump.needsUpdate=true;return {map,bump};
}
const maps=armorMaps();
const hullMaterial=new THREE.MeshPhysicalMaterial({color:0x455b79,map:maps.map,bumpMap:maps.bump,bumpScale:.0012,metalness:.14,roughness:.19,clearcoat:1,clearcoatRoughness:.10,envMapIntensity:.75});
const armorMaterial=new THREE.MeshPhysicalMaterial({color:0xb7c6dc,map:maps.map,bumpMap:maps.bump,bumpScale:.001,metalness:.12,roughness:.21,clearcoat:1,clearcoatRoughness:.11,iridescence:.16,envMapIntensity:.68});
const insetMaterial=new THREE.MeshStandardMaterial({color:0x091426,metalness:.28,roughness:.28,envMapIntensity:.75});
const titanium=new THREE.MeshPhysicalMaterial({color:0x9bb4c9,metalness:.76,roughness:.24,clearcoat:.65,envMapIntensity:1.05});
const seamMaterial=new THREE.LineBasicMaterial({color:0x4c7a9f,transparent:true,opacity:.25});
const windowMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(.8,1.55,2.1),toneMapped:false});
const amberMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(.90,.68,1.85),toneMapped:false});
const cube=new THREE.BoxGeometry(1,1,1);

// Continuous hull sections give the bow, shoulders and belly real volume.
function loftHull(stations){
 const sweep=new THREE.CatmullRomCurve3(stations.map(([x,w,h])=>new THREE.Vector3(x,w,h)),false,'centripetal');
 const positions=[],uvs=[],indices=[],count=32,length=48;
 for(let i=0;i<=length;i++){
  const t=i/length,p=sweep.getPoint(t),y=THREE.MathUtils.lerp(stations[0][3],stations.at(-1)[3],t);
  for(let j=0;j<=count;j++){const a=j/count*Math.PI*2;positions.push(p.x,y+Math.sin(a)*p.z*.5,Math.cos(a)*p.y);uvs.push(t,j/count);}
  if(i<length)for(let j=0;j<count;j++){const a=i*(count+1)+j,b=a+count+1;indices.push(a,a+1,b,a+1,b+1,b);}
 }
 for(const i of [0,length])for(let j=1;j<count-1;j++){const a=i*(count+1);if(i===0)indices.push(a,a+j+1,a+j);else indices.push(a,a+j,a+j+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function curvedPanel(width,height,depth=0){
 const g=new THREE.PlaneGeometry(width,height,48,24),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){const x=p.getX(i)/3.775,y=p.getY(i)/2.36;p.setZ(i,depth+.64*x*x+.16*y*y);}
 p.needsUpdate=true;g.computeVertexNormals();return g;
}

function curvedLens(){
 const front=curvedPanel(8.03,5.20,-.055),back=curvedPanel(8.03,5.20,-.15),positions=[],indices=[];
 const fp=front.getAttribute('position'),bp=back.getAttribute('position'),n=fp.count;
 positions.push(...fp.array,...bp.array);
 const frontIndices=front.index.array;
 for(let i=0;i<frontIndices.length;i+=3){indices.push(frontIndices[i],frontIndices[i+1],frontIndices[i+2],n+frontIndices[i],n+frontIndices[i+2],n+frontIndices[i+1]);}
 const stride=49,edge=[];
 for(let x=0;x<49;x++)edge.push(x);for(let y=1;y<25;y++)edge.push(y*stride+48);for(let x=47;x>=0;x--)edge.push(24*stride+x);for(let y=23;y>0;y--)edge.push(y*stride);
 for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,b,n+a,b,n+b,n+a);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();front.dispose();back.dispose();return g;
}

// Bake fixed fittings into a small set of material batches. Hinges, the
// projection, rotors and the raycast hull keep their own transforms.
function mergeStaticParts(root,moving){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),groups=new Map(),sources=[];
 root.traverse(part=>{
  if((!part.isMesh&&!part.isLineSegments)||part.isInstancedMesh||Array.isArray(part.material))return;
  for(let parent=part;parent&&parent!==root;parent=parent.parent)if(moving.has(parent))return;
  if(part.isMesh&&part.material.transparent)return;
  const geometry=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();
  geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,part.matrixWorld));
  const names=Object.keys(geometry.attributes).sort();
  const kind=part.isLineSegments?'lines':'mesh';
  const key=kind+part.material.uuid+names.map(name=>name+geometry.attributes[name].itemSize).join('/');
  if(!groups.has(key))groups.set(key,{kind,material:part.material,names,parts:[]});
  groups.get(key).parts.push(geometry);sources.push(part);
 });
 for(const group of groups.values()){
  const geometry=new THREE.BufferGeometry();
  for(const name of group.names){
   const size=group.parts[0].getAttribute(name).itemSize;
   const length=group.parts.reduce((sum,g)=>sum+g.getAttribute(name).array.length,0);
   const values=new Float32Array(length);let offset=0;
   for(const part of group.parts){const attribute=part.getAttribute(name);values.set(attribute.array,offset);offset+=attribute.array.length;}
   geometry.setAttribute(name,new THREE.BufferAttribute(values,size));
  }
  geometry.computeBoundingSphere();
  root.add(group.kind==='lines'?new THREE.LineSegments(geometry,group.material):new THREE.Mesh(geometry,group.material));
  group.parts.forEach(part=>part.dispose());
 }
 for(const part of sources){part.removeFromParent();part.geometry.dispose();}
}

export function createProjectStarship({index,color,title='',variant}){
 const assembly=new THREE.Group(),doors=[],thrusters=[],batch=new Map(),rotors=[];
 const accent=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(2.15),toneMapped:false});
 const reactorMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(.2,1.45,2.8),toneMapped:false});
 const add=(geometry,material,parent=assembly,p=[0,0,0])=>{const m=new THREE.Mesh(geometry,material);m.position.fromArray(p);parent.add(m);return m;};
 function box(w,h,d,p,material=hullMaterial,parent=assembly){
  const transform=new THREE.Object3D();transform.position.fromArray(p);transform.scale.set(w,h,d);
  if(!batch.has(parent))batch.set(parent,new Map());const materials=batch.get(parent);
  if(!materials.has(material))materials.set(material,[]);materials.get(material).push(transform);return transform;
 }
 function plate(points,depth,y,material=hullMaterial,parent=assembly){
  const shape=new THREE.Shape();const last=points.at(-1),first=points[0];shape.moveTo((last[0]+first[0])/2,(last[1]+first[1])/2);
  points.forEach((p,i)=>{const next=points[(i+1)%points.length];shape.quadraticCurveTo(p[0],p[1],(p[0]+next[0])/2,(p[1]+next[1])/2);});shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.095,bevelThickness:.09,bevelSegments:4,steps:1});geometry.rotateX(Math.PI/2);
  const part=add(geometry,material,parent,[0,y,0]);part.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry,35),seamMaterial));return part;
 }
 const body=add(loftHull([[-11.8,.055,.12,-.18],[-9.6,.57,.65,-.12],[-6.8,1.47,1.24,-.08],[-3.1,2.68,1.78,-.08],[1.4,3.48,1.92,-.16],[5.4,3.45,1.72,-.25],[7.5,2.7,1.1,-.27]]),hullMaterial);
 // Large continuous ceramic sweeps establish the silhouette; precision joints
 // are concentrated at the engines rather than tiled across every surface.
 plate([[-11.3,0],[-6.2,-1.15],[-.8,-2.95],[5.3,-2.9],[7.2,-1.7],[7.2,1.7],[5.3,2.9],[-.8,2.95],[-6.2,1.15]],.17,.69,armorMaterial);
 plate([[-10.4,0],[-2.4,-1.6],[5.9,-2.1],[7.2,0],[5.9,2.1],[-2.4,1.6]],.20,-.86,insetMaterial);
 const crystal=crystalMaterial(),span=index%3===1?6.8:6.25,wingCurves=[];
 for(const side of [-1,1]){
  plate([[-7.0,side*.83],[-2.5,side*4.6],[3.8,side*span],[7.5,side*4.45],[5.4,side*2.52],[-2.1,side*1.4]],.22,-.14,armorMaterial);
  plate([[-6.6,side*.93],[-1.6,side*4.2],[4.7,side*(span-.40)],[6.7,side*4.33],[3.3,side*2.72]],.07,.07,crystal);
  const rail=new THREE.CatmullRomCurve3([[-10.7,.69,0],[-6.3,.95,side*1.23],[-1.8,.96,side*4.15],[4.6,.68,side*(span-.22)],[7.1,.23,side*4.45]].map(p=>new THREE.Vector3(...p)));
  add(new THREE.TubeGeometry(rail,56,.036,6),titanium);wingCurves.push(rail);
  const podProfile=[[.08,-3.5],[.42,-3.1],[.69,-2.4],[.78,-.8],[.79,1.7],[.72,3.2],[.66,3.6]].map(([r,y])=>new THREE.Vector2(r,y));
  const pod=add(new THREE.LatheGeometry(podProfile,24),hullMaterial,assembly,[4,.06,side*4.45]);pod.rotation.z=-Math.PI/2;
  for(const x of [1.65,6.28]){const collar=add(new THREE.TorusGeometry(.78,.038,5,24),titanium,assembly,[x,.06,side*4.45]);collar.rotation.y=Math.PI/2;}
  for(let j=0;j<4;j++)box(.26,.022,.09,[2+j*.77,.86,side*4.45],j===3?amberMaterial:windowMaterial);
 }
 const wingEnergy=createEnergyRibbons({parent:assembly,curves:wingCurves,color:0x9ad9ff,width:.28,segments:72});
 const cockpit=add(loftHull([[-.2,.06,.08,.58],[1.6,.83,.50,.66],[3.8,1.02,.60,.69],[5.4,.63,.23,.66]]),crystal);
 for(const side of [-1,1])for(let j=0;j<5;j++)box(.12,.033,.035,[1.85+j*.45,1.02,side*.74],windowMaterial);
 const beacon=add(new THREE.SphereGeometry(.06,8,6),accent,assembly,[4.4,1.20,0]);
 const reactor=new THREE.Group();reactor.position.set(5.65,.65,0);assembly.add(reactor);
 add(new THREE.CylinderGeometry(.85,.9,.20,24),insetMaterial,reactor);add(new THREE.CylinderGeometry(.51,.51,.23,24),reactorMaterial,reactor,[0,.02,0]);
 for(let j=0;j<3;j++){const ring=add(new THREE.TorusGeometry(.71+j*.065,.025,5,32,Math.PI*1.45),j===1?accent:titanium,reactor,[0,.16+j*.035,0]);ring.rotation.set(Math.PI/2,.07*j,j*2);rotors.push(ring);}
 for(const [z,r,x,y] of [[-4.45,.68,7.3,0],[4.45,.68,7.3,0],[0,1.02,7.15,-.42]]){
  const engine=new THREE.Group();engine.position.set(x,y,z);assembly.add(engine);
  const nozzleProfile=[[r*.84,-.68],[r*1.07,-.58],[r*1.21,-.24],[r*1.18,.30],[r*1.10,.64],[r*.91,.64],[r*.79,.29],[r*.60,-.22]].map(([radius,y])=>new THREE.Vector2(radius,y));
  const nozzle=add(new THREE.LatheGeometry(nozzleProfile,32),titanium,engine);nozzle.rotation.z=-Math.PI/2;
  for(const [dx,radius,mat] of [[-.34,r*1.14,titanium],[.48,r*1.11,titanium],[.60,r*.90,accent]]){const lip=add(new THREE.TorusGeometry(radius,.065,6,32),mat,engine,[dx,0,0]);lip.rotation.y=Math.PI/2;}
  for(let j=0;j<12;j++){const a=j/12*Math.PI*2;const rib=box(1.35,.075,.10,[x,y+Math.cos(a)*r*1.16,z+Math.sin(a)*r*1.16],titanium);rib.rotation.x=a;}
  const core=add(new THREE.CircleGeometry(r*.73,28),reactorMaterial,engine,[.5,0,0]);core.rotation.y=Math.PI/2;
  const turbine=add(new THREE.TorusGeometry(r*.53,.10,6,24,Math.PI*1.76),insetMaterial,engine,[.53,0,0]);turbine.rotation.y=Math.PI/2;
  for(let j=0;j<18;j++){const a=j/18*Math.PI*2,blade=box(.05,r*.43,.055,[x+.55,y+Math.cos(a)*r*.48,z+Math.sin(a)*r*.48],insetMaterial);blade.rotation.x=a+.35;}
  const flame=new THREE.Mesh(new THREE.CylinderGeometry(.05,r*.78,5.4,24,8,true),new THREE.ShaderMaterial({
   transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
   uniforms:{uTime:{value:0},uPower:{value:.7}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'varying vec2 vUv;uniform float uTime,uPower;void main(){float t=vUv.y;float endFade=pow(1.-t,2.1);float filaments=.68+.32*sin(vUv.x*37.7-t*13.+uTime*4.);float bands=.76+.24*cos(t*52.-uTime*1.6);vec3 c=mix(vec3(.53,1.7,3.2),vec3(.12,.38,1.5),smoothstep(0.,.55,t));gl_FragColor=vec4(c,endFade*filaments*bands*uPower*.43);}'
  }));flame.userData.visualOnly=true;flame.position.x=3.22;flame.rotation.z=-Math.PI/2;engine.add(flame);thrusters.push(flame);
 }
 const ionCount=innerWidth<700?180:420,ionSeeds=new Float32Array(ionCount*3);
 for(let i=0;i<ionCount;i++)ionSeeds.set([(i*.618034)%1,(i*.754877)%1,i%3],i*3);
 const ionGeometry=new THREE.BufferGeometry();ionGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(ionCount*3),3));ionGeometry.setAttribute('aSeed',new THREE.BufferAttribute(ionSeeds,3));
 const ionUniforms={uTime:{value:0},uPower:{value:.6},uHeight:{value:innerHeight},uMotion:{value:1},uAuthored:{value:0}};
 const ions=new THREE.Points(ionGeometry,new THREE.ShaderMaterial({uniforms:ionUniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:'attribute vec3 aSeed;uniform float uTime,uPower,uHeight,uMotion,uAuthored;varying float vAlpha;void main(){float age=fract(aSeed.x+uTime*(.22+uPower*.12)*uMotion);float angle=aSeed.y*6.283;float width=.10+age*.75;vec3 p=vec3(7.85+age*(4.+uPower*4.),sin(angle)*width,aSeed.z<.5?-4.45:aSeed.z<1.5?4.45:0.);if(uAuthored>.5)p=vec3(7.21+age*(4.+uPower*4.),-.453+sin(angle)*width,aSeed.z<.5?-2.476:2.476);p.z+=cos(angle)*width;if(uAuthored<.5&&aSeed.z>1.5)p.y-=.42;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(uHeight*.055/max(1.,-mv.z),.7,3.5);vAlpha=pow(1.-age,2.)*uPower*.8*(uAuthored>.5&&aSeed.z>1.5?0.:1.);}',
  fragmentShader:'varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.35,1.15,2.2,exp(-r*r*5.)*(1.-smoothstep(.6,1.,r))*vAlpha);}'
 }));ions.userData.visualOnly=true;ions.frustumCulled=false;assembly.add(ions);
 box(4.7,.1,3.8,[-1,.99,0],insetMaterial);
 for(const side of [-1,1]){
  const hinge=new THREE.Group();hinge.position.set(-1,1.05,side*1.95);assembly.add(hinge);hinge.userData.side=side;
  box(4.8,.12,1.92,[0,0,-side*.96],armorMaterial,hinge);
  for(let j=0;j<5;j++){box(.025,.016,1.70,[-1.9+j*.94,.075,-side*.96],insetMaterial,hinge);box(.37,.018,.07,[-1.8+j*.88,.083,-side*1.75],j%2?accent:amberMaterial,hinge);}doors.push(hinge);
 }
 const projection=new THREE.Group();projection.position.set(-1,1.13,0);assembly.add(projection);
 const opticalUniforms={uOpticalTime:{value:0},uOpticalOpen:{value:0}};
 const imageMaterial=new THREE.MeshBasicMaterial({color:0x071521,transparent:true,opacity:0,alphaTest:.001,depthWrite:true,side:THREE.DoubleSide,toneMapped:false});
 imageMaterial.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,opticalUniforms);
  shader.vertexShader='varying vec2 vApertureUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvApertureUv=uv;');
  shader.fragmentShader='uniform float uOpticalTime,uOpticalOpen;varying vec2 vApertureUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`vec2 apertureQ=abs(vApertureUv-.5)-vec2(.42);float apertureDistance=length(max(apertureQ,0.))+min(max(apertureQ.x,apertureQ.y),0.)-.08;if(apertureDistance>0.)discard;\n#include <alphatest_fragment>`);
  const sampling=THREE.ShaderChunk.map_fragment.replace(/texture2D\s*\(\s*map,\s*vMapUv\s*\)/g,'vec4(texture2D(map,refractedUv+dispersion).r,texture2D(map,refractedUv).g,texture2D(map,refractedUv-dispersion).b,texture2D(map,refractedUv).a)');
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`\n#ifdef USE_MAP
   vec2 lensCoordinate=vMapUv-.5;
   float lensEdge=smoothstep(.18,.50,abs(lensCoordinate.x));
   vec2 refractedUv=clamp(vMapUv+vec2(lensCoordinate.x*lensEdge*.014,sin(lensCoordinate.x*5.+uOpticalTime*.16)*.0008)*uOpticalOpen,.001,.999);
   vec2 dispersion=vec2(.00085*lensEdge*uOpticalOpen,0.);
   #endif\n${sampling}`);
 };
 imageMaterial.customProgramCacheKey=()=> 'tem-curved-aperture-v2';
 const cover=add(curvedPanel(7.55,4.72,.016),imageMaterial,projection,[0,3.5,0]);
 // An optical sky sample provides a curved coated crystal surface without a
 // second scene render for each open archive. Images and videos stay legible.
 const glassMaterial=crystalMaterial();
 glassMaterial.fragmentShader=glassMaterial.fragmentShader.replace('void main(){','void main(){vec2 q=abs(vLocal.xy/vec2(8.03,5.20))-vec2(.405);float d=length(max(q,0.))+min(max(q.x,q.y),0.)-.095;if(d>0.)discard;');
 const lens=add(curvedLens(),glassMaterial,projection,[0,3.5,0]);lens.userData.visualOnly=true;
 const perimeter=new THREE.Shape(),w=4.015,h=2.60,r=.88;
 perimeter.moveTo(-w+r,-h);perimeter.lineTo(w-r,-h);perimeter.quadraticCurveTo(w,-h,w,-h+r);perimeter.lineTo(w,h-r);perimeter.quadraticCurveTo(w,h,w-r,h);perimeter.lineTo(-w+r,h);perimeter.quadraticCurveTo(-w,h,-w,h-r);perimeter.lineTo(-w,-h+r);perimeter.quadraticCurveTo(-w,-h,-w+r,-h);
 const edgePoints=perimeter.getSpacedPoints(120).map(p=>new THREE.Vector3(p.x,p.y+3.5,-.055+.64*(p.x/3.775)**2+.16*(p.y/2.36)**2));
 const edgeCurve=new THREE.CatmullRomCurve3(edgePoints,true);
 const opticalRim=add(new THREE.TubeGeometry(edgeCurve,128,.022,5,true),titanium,projection);opticalRim.userData.visualOnly=true;
 const apertureFlow=createLightFlow({parent:projection,paths:[edgeCurve],color:0xb7cdff,radius:.009,speed:.17,segments:120});
 const apertureMotes=createOpticalMotes({parent:projection,count:innerWidth<700?36:96,span:[9.2,6.1,1.8],color:0xacd5ff,seed:680+index,drift:.09,filter:p=>Math.abs(p[0])>3.45||Math.abs(p[1])>2.3});apertureMotes.root.position.y=3.5;
 const captionCanvas=document.createElement('canvas');captionCanvas.width=2048;captionCanvas.height=256;
 const captionContext=captionCanvas.getContext('2d');captionContext.fillStyle='#93bbc9';captionContext.font='28px monospace';captionContext.fillText(`ARCHIVE ${String(index+1).padStart(2,'0')} / TEM`,2,40);
 let captionSize=112;captionContext.font=`500 ${captionSize}px "Microsoft YaHei", sans-serif`;
 while(captionContext.measureText(title).width>2000&&captionSize>42){captionSize-=2;captionContext.font=`500 ${captionSize}px "Microsoft YaHei", sans-serif`;}
 captionContext.fillStyle='#e2edf0';captionContext.fillText(title,0,180);
 const captionMap=new THREE.CanvasTexture(captionCanvas);captionMap.colorSpace=THREE.SRGBColorSpace;captionMap.anisotropy=4;
 const captionShade=add(new THREE.PlaneGeometry(7.55,.96),new THREE.ShaderMaterial({uniforms:{uOpen:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 vUv;uniform float uOpen;void main(){float mask=smoothstep(0.,.13,vUv.y)*(1.-smoothstep(.86,1.,vUv.y));gl_FragColor=vec4(.008,.015,.024,mask*uOpen*.72);}'
 }),projection,[0,.60,.022]);captionShade.userData.visualOnly=true;
 const caption=add(new THREE.PlaneGeometry(7.55,.96),new THREE.MeshBasicMaterial({map:captionMap,transparent:true,opacity:0,alphaTest:.06,depthWrite:true,side:THREE.DoubleSide,toneMapped:false}),projection,[0,.60,.026]);caption.userData.visualOnly=true;
 const hologramUniforms={uTime:{value:0},uOpen:{value:0},uColor:{value:new THREE.Color(color)}};
 const hologram=add(curvedPanel(7.55,4.72,.030),new THREE.ShaderMaterial({
  uniforms:hologramUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 vUv;uniform float uTime,uOpen;uniform vec3 uColor;void main(){vec2 q=abs(vUv-.5)-vec2(.42);float edge=length(max(q,0.))+min(max(q.x,q.y),0.)-.08;if(edge>0.)discard;float rim=1.-smoothstep(.001,.008,abs(edge));float lines=pow(.5+.5*cos(vUv.y*1480.),16.);float sweep=exp(-pow((vUv.y-fract(uTime*.065))*42.,2.));float alpha=(rim*.075+lines*.008+sweep*.022)*uOpen;gl_FragColor=vec4(mix(uColor,vec3(.68,.9,1.),.65),alpha);}'
 }),projection,[0,3.5,0]);hologram.userData.visualOnly=true;
 const corners=[];
 for(const x of [-3.775,3.775])for(const y of [1.14,5.86]){const sx=Math.sign(x),sy=y>3.5?1:-1;corners.push(x-sx*.34,y,.025,x,y,.025,x,y,.025,x,y-sy*.22,.025);}
 const guides=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(corners,3)),new THREE.LineBasicMaterial({color:new THREE.Color(.72,1.32,1.6),transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));guides.userData.visualOnly=true;projection.add(guides);
 const conePoints=[0,0,.02,-3.775,5.86,.02,3.775,5.86,.02,0,0,.02,3.775,5.86,.02,3.775,1.14,.02,0,0,.02,-3.775,1.14,.02,-3.775,5.86,.02];
 const cone=add(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(conePoints,3)),new THREE.ShaderMaterial({
  uniforms:hologramUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  vertexShader:'varying float vHeight;void main(){vHeight=position.y/5.86;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying float vHeight;uniform float uTime,uOpen;uniform vec3 uColor;void main(){float falloff=pow(1.-vHeight,2.);float flow=.82+.18*sin(vHeight*22.-uTime*.8);gl_FragColor=vec4(uColor,falloff*flow*uOpen*.018);}'
 }),projection);cone.userData.visualOnly=true;
 const beamPoints=[];for(const x of [-3.775,3.775])for(const y of [1.14,5.86])beamPoints.push(0,0,0,x,y,0);
 const beam=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(beamPoints,3)),new THREE.LineBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));projection.add(beam);
 const port=add(new THREE.TorusGeometry(.66,.055,8,48),accent,assembly,[-1,1.09,0]);port.rotation.x=-Math.PI/2;
 for(let j=0;j<3;j++){const arc=add(new THREE.TorusGeometry(.88+j*.18,.016,4,48,Math.PI*1.35),accent,projection,[0,.015+j*.015,0]);arc.rotation.set(-Math.PI/2,0,j*2);rotors.push(arc);}
 const light=new THREE.PointLight(color,0,23,2);light.position.set(-1,3.2,1);assembly.add(light);
 const stamp=document.createElement('canvas');stamp.width=1024;stamp.height=256;const ctx=stamp.getContext('2d');
 ctx.fillStyle='#d4e3e9';ctx.font='500 86px Arial';ctx.fillText(`TEM—${String(index+1).padStart(2,'0')}`,30,103);ctx.fillStyle='#91a9b5';ctx.font='22px monospace';ctx.fillText('DEEP SPACE / ARCHIVE FRIGATE',33,150);
 ctx.fillStyle='#9cafda';for(let i=0;i<8;i++)ctx.fillRect(38+i*11,177,i%3===0?6:2,14);ctx.fillStyle='#d4e3e9';ctx.font='19px monospace';ctx.fillText('OPTICAL / ION DRIVE',213,193);
 const decalMap=new THREE.CanvasTexture(stamp);decalMap.colorSpace=THREE.SRGBColorSpace;decalMap.anisotropy=4;
 const decal=add(new THREE.PlaneGeometry(3.8,.95),new THREE.MeshBasicMaterial({map:decalMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),assembly,[-5,.89,.08]);decal.rotation.x=-Math.PI/2;
 // The archive is mounted to an articulated docking gantry in ship coordinates.
 const readingDevice=new THREE.Group();assembly.add(readingDevice);readingDevice.userData.visualOnly=true;
 const readingSurface=new THREE.Group();readingDevice.add(readingSurface);
 const readingGlass=opticalFilm(.045);
 add(new THREE.PlaneGeometry(1,1),readingGlass,readingSurface);
 const paneFrame=new THREE.Group();readingSurface.add(paneFrame);
 for(const x of [-.5,.5])for(const y of [-.5,.5]){
  box(.070,.012,.07,[x-Math.sign(x)*.025,y,.015],titanium,paneFrame);
  box(.012,.070,.07,[x,y-Math.sign(y)*.025,.015],titanium,paneFrame);
  box(.032,.006,.075,[x-Math.sign(x)*.025,y-Math.sign(y)*.012,.02],windowMaterial,paneFrame);
 }
 const readLampMaterial=windowMaterial.clone();box(.26,.008,.08,[.22,.482,.14],readLampMaterial,paneFrame);
 const gantry=new THREE.Group();readingDevice.add(gantry);
 const signal=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),amberMaterial);readingDevice.add(signal);let signalPath;
 function gantryRail(points,r,material){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,6,false),material,gantry);}
 const readingFlow=createLightFlow({parent:readingSurface,paths:[[[-.493,-.49,.17],[-.493,.49,.17],[.493,.49,.17],[.493,-.49,.17]]],color:0xaac4ff,radius:.0011,speed:.18,segments:40});
 const hullFlow=createLightFlow({parent:assembly,paths:[[[ -10.5,.6,0],[-5.2,1.03,-2.1],[1,1.24,-3.3],[7.1,.9,-4.45]],[[ -10.5,.6,0],[-5.2,1.03,2.1],[1,1.24,3.3],[7.1,.9,4.45]]],color:0x79c9ee,radius:.016,speed:.32,segments:44});
 let readMobile;
 function readingLayout(){readMobile=innerWidth<700;const yaw=.34-(index%2)*.13;readingSurface.position.set(readMobile?13*Math.tan(yaw):18,readMobile?-.5:9,readMobile?13:6);readingSurface.rotation.y=readMobile?yaw:.10;readingSurface.scale.set(12,readMobile?15.5:16,1);
  gantry.children.forEach(o=>o.geometry.dispose());gantry.clear();
  const p=readingSurface.position,halfH=readMobile?7.75:8;for(const side of [-1,1]){const a=readMobile?[-4*side,.5,1]:[5,.5,side*1.7];const pts=[a,[p.x+side*1.5,.8,p.z-1],[p.x+side*1.5,p.y-halfH-.7,p.z-1],[p.x+side*1.5,p.y-halfH+.2,p.z]];gantryRail(pts,.035,titanium);const wire=pts.map(q=>[q[0]+.17,q[1]+.02,q[2]]);gantryRail(wire,.021,windowMaterial);if(side===1)signalPath=new THREE.CatmullRomCurve3(wire.map(q=>new THREE.Vector3(...q)));}
 }
 readingLayout();
 // A swept cradle grows from the deck into the optical aperture. Only its
 // tiny corner couplings are metallic; no rectangular computer bezel remains.
 for(const side of [-1,1]){
  const cradle=new THREE.CatmullRomCurve3([[side*.36,1.55,-.40],[side*2.4,1.65,-.26],[side*4.10,2.10,.28],[side*4.15,3.5,.56],[side*3.5,5.74,.69]].map(p=>new THREE.Vector3(...p)));
  add(new THREE.TubeGeometry(cradle,48,.055,6),armorMaterial,projection);
  for(const y of [1.35,5.67]){box(.21,.095,.13,[side*3.9,y,.68],titanium,projection);box(.085,.033,.15,[side*3.89,y,.70],windowMaterial,projection);}
 }
 // Lower the aperture into the spacecraft silhouette while preserving its
 // original texture aspect and the reading surface's projection contract.
 for(const child of projection.children)if(child!==cone&&child!==beam&&!rotors.includes(child))child.position.y-=1.4;
 for(const transforms of (batch.get(projection)||new Map()).values())for(const transform of transforms)transform.position.y-=1.4;
 for(const object of [cone,beam]){const position=object.geometry.getAttribute('position');for(let i=0;i<position.count;i++)if(position.getY(i)>.5)position.setY(i,position.getY(i)-1.4);position.needsUpdate=true;object.geometry.computeBoundingSphere();}
 for(const [parent,materials] of batch)for(const [material,transforms] of materials){const instanced=new THREE.InstancedMesh(cube,material,transforms.length);transforms.forEach((t,i)=>{t.updateMatrix();instanced.setMatrixAt(i,t.matrix);});instanced.computeBoundingSphere();parent.add(instanced);}
 mergeStaticParts(assembly,new Set([body,beacon,port,projection,readingDevice,...doors,...rotors,...thrusters]));
 assembly.traverse(part=>{if(part.isMesh&&!part.material.isMeshBasicMaterial&&!part.material.transparent&&!part.userData.visualOnly){part.castShadow=true;part.receiveShadow=true;}});
 // Source craft are authored along +Z. This carrier transform seats the actual
 // Blender hull in the archive's -X bow convention; UI/picking keep their
 // existing world matrices while the body and engine wakes share this pose.
 const legacyHull=new THREE.Group();legacyHull.name='Tem.archive.hull-fallback';
 const authoredHull=new THREE.Group();authoredHull.name='Tem.archive.refined-hull';authoredHull.rotation.y=-Math.PI/2;authoredHull.scale.setScalar(3.02);authoredHull.position.x=-2.15;
 const retained=new Set([projection,readingDevice,port,beacon,light,ions]);
 for(const child of [...assembly.children])if(!retained.has(child))legacyHull.add(child);
 assembly.add(legacyHull,authoredHull);
 const vesselIndex=Math.max(0,['forge','lumen','echo','nexus'].indexOf(variant));
 loadTemAsset({name:'fleetLod',canvas:document.getElementById('space'),onLoad:model=>{
  const vessel=model.find('SHIP_'+vesselIndex);if(!vessel)throw new Error('Missing refined archive vessel.');
  const kept=new Set();vessel.traverse(node=>{if(node.isMesh)for(const m of Array.isArray(node.material)?node.material:[node.material])kept.add(m);});
  const unused=new Set();model.root.traverse(node=>{if(node.isMesh)for(const m of Array.isArray(node.material)?node.material:[node.material])if(!kept.has(m))unused.add(m);});unused.forEach(m=>m.dispose());
  vessel.removeFromParent();authoredHull.add(vessel);legacyHull.visible=false;ionUniforms.uAuthored.value=1;
  for(let i=0;i<2;i++){const flame=thrusters[i];assembly.attach(flame);flame.position.set(10.10,-.453,i===0?-2.476:2.476);flame.scale.set(1.65,1,1.65);}
  const canvas=document.getElementById('space');if(canvas)canvas.dataset.archiveFleetV21='blender-four-variants';
  dispatchEvent(new Event('tem:scene-depth-change'));
 }});
 projection.visible=false;let power=.6;
 function update(opened,focused,time,motion,doorOpen=opened,readingPower=0){
  doors.forEach(hinge=>hinge.rotation.x=-hinge.userData.side*doorOpen*1.35);
  const projectionSize=1+opened*(innerWidth<700?1:.95);
  // Phone reading stays below the canopy; desktop keeps it seated in the hull.
  projection.position.y=innerWidth<700?5.13:1.13;
  projection.visible=opened>.02;projection.scale.set(projectionSize,projectionSize*(.25+opened*.75),projectionSize);cover.material.opacity=opened*.96;beam.material.opacity=opened*.018;caption.material.opacity=opened*.94;captionShade.material.uniforms.uOpen.value=opened;
  hologramUniforms.uTime.value=time;hologramUniforms.uOpen.value=opened;guides.material.opacity=opened*.13;
  opticalUniforms.uOpticalTime.value=time;opticalUniforms.uOpticalOpen.value=opened;
  crystal.uniforms.uTime.value=time;crystal.uniforms.uEnergy.value=focused?.3:.1;
  glassMaterial.uniforms.uTime.value=time;glassMaterial.uniforms.uEnergy.value=opened*.55;glassMaterial.uniforms.uVisibility.value=opened;
  lens.scale.set(1,1,.65+opened*.35);
  beacon.scale.setScalar(focused?1.35:1);power=THREE.MathUtils.lerp(power,focused?1:.58,motion?.065:1);
  for(const flame of thrusters){flame.material.uniforms.uTime.value=time;flame.material.uniforms.uPower.value=power;flame.scale.y=.73+power*.32+Math.sin(time*2.4+index)*.025*motion;}
  rotors.forEach((r,i)=>{r.rotation.z=i*2+time*(i%2?-.12:.1);if(i>=3)r.scale.setScalar(1/projectionSize);});
  ionUniforms.uTime.value=time;ionUniforms.uHeight.value=innerHeight;ionUniforms.uPower.value=power;ionUniforms.uMotion.value=motion;
  if(readMobile!==(innerWidth<700))readingLayout();readingDevice.visible=opened>.05;readingDevice.position.y=-(1-opened)*4;
  readLampMaterial.color.copy(windowMaterial.color).multiplyScalar(.48+readingPower*1.15);signal.visible=Boolean(motion)&&opened>.95&&readingPower>.05;if(signal.visible)signalPath.getPointAt((time*.65)%1,signal.position);
  readingFlow.update(time,.7+readingPower*.8,Boolean(motion));hullFlow.update(time,focused?.75:.24,Boolean(motion));
  wingEnergy.update(time,focused?.72:.28,Boolean(motion));apertureFlow.update(time,opened*(.45+readingPower*.35),Boolean(motion));apertureMotes.update(time,opened*.7,Boolean(motion));
 }
 return {assembly,body,cover,doors,port,beacon,light,readingSurface,update};
}




