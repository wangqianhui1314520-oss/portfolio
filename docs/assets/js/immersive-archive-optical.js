import * as THREE from 'three';
import {translateText} from './i18n.js';
import {hardwareMaterials,hardwareMesh,bevelGeometry,consolidateHardware} from './immersive-hardware.js?v=cinematic-v21.1';
import {archiveChapterOrder,archiveCenter,archiveAngle} from './immersive-archive-path.js?v=cinematic-v21.1';
import {projectWorldSurface,clipForeground} from './immersive-world-surface.js?v=cinematic-v21.1';
import {createLightFlow} from './immersive-light-flow.js?v=cinematic-v21.1';
import {opticalFilm,crystalMaterial,createEnergyRibbons,createOpticalMotes,opticalEnvironment,opticalSkySample} from './immersive-optical.js?v=cinematic-v21.1';
import {createIdentityVolume} from './immersive-identity-volume.js?v=cinematic-v21.1';
import {loadTemAsset,prepareReveal} from './immersive-blender-assets.js?v=cinematic-v21.1';

function applyArchiveReplacement({architecture,bays,authoredDisplays,compact,map,deckReady},replacement){
 architecture.visible=!map&&!deckReady&&replacement<.98;
 for(const bay of bays){
  const replaced=bay.key==='overview'&&replacement>.98;
  const authored=authoredDisplays.find(display=>display.bay===bay);
  if(authored)authored.root.visible=!compact&&!replaced;
  // Compact assets may be deferred, so update all fallback screens even when
  // there are no authoredDisplays to iterate over.
  bay.primary.fixed.visible=(!authored||compact)&&!replaced;
  bay.primary.pane.visible=!replaced;
 }
 return Math.max(0,1-replacement);
}

// An open observatory: ceramic landings, optical reading surfaces and a layered
// identity instrument. Every chapter remains on the same accessible 3D orbit.
export function createCreatorArchive({scene,camera,interaction}){
 const root=new THREE.Group();root.name='Tem.observatory.open-archive';root.position.fromArray(archiveCenter);scene.add(root);root.visible=false;
 const compact=()=>innerWidth<701,m=hardwareMaterials(),film=opticalFilm(.075),crystal=crystalMaterial(),coreCrystal=crystalMaterial({bodyOpacity:.070,edgeOpacity:.25,bodyPower:.62});
 let poetryAnchor;
 m.dark.color.set(0x101d30);m.dark.roughness=.36;m.dark.metalness=.12;m.dark.envMapIntensity=.32;m.dark.clearcoat=.42;
 m.alloy.color.set(0x9ca9b2);m.alloy.metalness=.05;m.alloy.roughness=.32;m.alloy.envMapIntensity=.44;m.alloy.clearcoat=.52;m.alloy.clearcoatRoughness=.20;
 m.brass.color.set(0xa38c70);m.brass.roughness=.27;m.brass.metalness=.68;m.brass.clearcoat=.36;
 for(const material of [m.dark,m.alloy,m.brass,m.armor]){material.bumpMap=null;material.bumpScale=0;}
 m.white.color.setRGB(.70,.94,1.30);m.cyan.color.setRGB(.22,.86,1.35);
 const part=(g,w,h,d,p,mat=m.alloy)=>hardwareMesh(g,bevelGeometry(w,h,d,Math.min(w,h)*.32,Math.min(d*.13,.035)),mat,p);
 const curve=pts=>new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
 // A closed, chamfered swept section carries the screen instead of a wire.
 // The small dark companion below it makes the structural contact legible.
 function brace(parent,path,width,depth,material=m.alloy,segments=30){
  const frames=path.computeFrenetFrames(segments,false),vertices=[],uv=[],indices=[];
  const section=[[-.35,-.5],[.35,-.5],[.5,-.35],[.5,.35],[.35,.5],[-.35,.5],[-.5,.35],[-.5,-.35]];
  for(let i=0;i<=segments;i++){
   const p=path.getPointAt(i/segments),taper=.88+.12*Math.sin(i/segments*Math.PI);
   section.forEach(([x,z],j)=>{const q=p.clone().addScaledVector(frames.normals[i],x*width*taper).addScaledVector(frames.binormals[i],z*depth);vertices.push(...q.toArray());uv.push(i/segments,j/8);});
  }
  for(let i=0;i<segments;i++)for(let j=0;j<8;j++){const a=i*8+j,b=i*8+(j+1)%8,c=(i+1)*8+j,d=(i+1)*8+(j+1)%8;indices.push(a,b,c,b,d,c);}
  for(const end of [0,segments]){const center=path.getPointAt(end/segments),index=vertices.length/3;vertices.push(...center.toArray());uv.push(.5,.5);for(let j=0;j<8;j++){const a=end*8+j,b=end*8+(j+1)%8;indices.push(...(end?[index,a,b]:[index,b,a]));}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return hardwareMesh(parent,geometry,material);
 }
 const focalControllers=[],lidUniforms={...opticalEnvironment(),uTime:{value:0},uEnergy:{value:0}};
 // One shared optical shader replaces the thick physical glazing. It samples
 // the existing environment; no screen capture or additional render pass.
 const paneUniforms={...opticalEnvironment(),uTime:{value:0},uEnergy:{value:0}};
 const projectionFilm=new THREE.ShaderMaterial({uniforms:paneUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:'attribute vec2 aPanelUv;varying vec2 vPanel;varying vec3 vWorld,vNormal;void main(){vPanel=aPanelUv;vNormal=normalize(mat3(modelMatrix)*normal);vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
  fragmentShader:`uniform float uTime,uEnergy,uSkyReady;uniform sampler2D uSky;varying vec2 vPanel;varying vec3 vWorld,vNormal;${opticalSkySample}
  void main(){vec3 eye=normalize(cameraPosition-vWorld),n=normalize(vNormal);float fresnel=pow(1.-abs(dot(eye,n)),3.);float rim=pow(clamp(max(abs(vPanel.x),abs(vPanel.y)),0.,1.),32.);vec3 bend=vec3(vPanel.x*.020,vPanel.y*.008,0.);vec3 sky=skyReflection(reflect(-eye,normalize(n+bend)));sky=sky/(1.+sky*5.);float sweep=exp(-pow((vPanel.y*.5+.5-fract(uTime*.018))*42.,2.));float spectral=pow(.5+.5*sin(vPanel.x*2.8+vPanel.y*1.4+uTime*.020),12.);vec3 c=mix(vec3(.21,.38,.62),vec3(.56,.51,.78),spectral*.30)+sky*(.15+fresnel*.25);c+=vec3(.54,.78,1.)*rim*.10;float a=.010+fresnel*.044+rim*.015+sweep*rim*.013*(1.+uEnergy*.3);gl_FragColor=vec4(c,min(a,.10));}`});
 const lidMaterial=new THREE.ShaderMaterial({uniforms:lidUniforms,
  vertexShader:'varying vec3 vWorld,vNormal,vLocal;void main(){vLocal=position;vNormal=normalize(mat3(modelMatrix)*normal);vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
  fragmentShader:`uniform float uTime,uEnergy,uSkyReady;uniform sampler2D uSky;varying vec3 vWorld,vNormal,vLocal;${opticalSkySample}
  void main(){vec3 n=normalize(vNormal),eye=normalize(cameraPosition-vWorld);float f=pow(1.-abs(dot(eye,n)),3.);vec3 s=skyReflection(normalize(reflect(-eye,n)+vec3(.10,.06,-.08)));s=s/(1.+s*5.);float ribbon=pow(.5+.5*sin(vLocal.x*.82+sin(vLocal.z*.66+uTime*.08)*1.5),36.);vec3 c=vec3(.015,.024,.046)+s*(.13+f*.30)+vec3(.09,.15,.27)*f+vec3(.14,.22,.35)*ribbon*.22*(1.+uEnergy*.45);gl_FragColor=vec4(c,1.);}`});
 function opticalFocal(base,r,height){
  const u={uTime:{value:0},uPower:{value:.6},uHeight:{value:height},uRadius:{value:r},uPixelHeight:{value:innerHeight}};
  const volumeGeometry=new THREE.CylinderGeometry(r*.20,r*.72,height,compact()?20:32,8,true);
  const volume=new THREE.Mesh(volumeGeometry,new THREE.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
   vertexShader:'varying vec2 vUv;varying vec3 vNormal,vWorld;void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
   fragmentShader:'uniform float uTime,uPower;varying vec2 vUv;varying vec3 vNormal,vWorld;void main(){float height=1.-vUv.y;float fade=smoothstep(0.,.12,height)*(1.-smoothstep(.68,1.,height));float side=pow(clamp(1.-abs(dot(normalize(vNormal),normalize(cameraPosition-vWorld))),0.,1.),1.5);float lane=pow(.5+.5*sin(vUv.x*12.566+sin(height*3.-uTime*.08)),12.);float pass=exp(-pow((height-fract(uTime*.028))*27.,2.));float a=(.009+lane*.018+pass*.025)*fade*(.20+side*.8)*uPower;vec3 c=mix(vec3(.35,.66,1.),vec3(.78,.57,1.),height);gl_FragColor=vec4(c,a);}'
  }));volume.userData.dynamic=true;volume.position.set(0,.57+height*.5,-.14);base.add(volume);
  const count=compact()?38:92,seeds=new Float32Array(count*3);let randomSeed=683+r*19;
  for(let i=0;i<count;i++){randomSeed=(randomSeed*1664525+1013904223)>>>0;seeds.set([randomSeed/4294967296,(i*.618034)%1,(i*.754877)%1],i*3);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,3));
  const dust=new THREE.Points(geometry,new THREE.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
   vertexShader:'attribute vec3 aSeed;uniform float uTime,uPower,uHeight,uRadius,uPixelHeight;varying float vAlpha,vSeed;void main(){float age=fract(aSeed.x+uTime*(.025+aSeed.z*.013));float angle=aSeed.y*6.283+sin(age*3.+aSeed.z*6.28)*.28;float radius=uRadius*(.63-age*.43)*( .45+aSeed.z*.55);vec3 p=vec3(cos(angle)*radius,.56+age*uHeight,sin(angle)*radius-.14);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(uPixelHeight*(.025+pow(aSeed.z,9.)*.055)/max(1.,-mv.z),.85,3.1);vAlpha=smoothstep(0.,.12,age)*(1.-smoothstep(.74,1.,age))*(.24+aSeed.z*.30)*uPower;vSeed=aSeed.z;}',
   fragmentShader:'varying float vAlpha,vSeed;void main(){vec2 p=gl_PointCoord-.5;float r=length(p);if(r>.5)discard;float glint=exp(-abs(p.x)*90.)*exp(-abs(p.y)*16.)+exp(-abs(p.y)*90.)*exp(-abs(p.x)*16.);vec3 c=mix(vec3(.43,.76,1.),vec3(.98,.80,.69),pow(vSeed,3.));gl_FragColor=vec4(c,(exp(-r*r*35.)+glint*.045)*vAlpha);}'
  }));dust.userData.dynamic=true;dust.frustumCulled=false;base.add(dust);focalControllers.push(u);base.userData.opticalFocal=u;return u;
 }
 function label(parent,text,w,h,p){
  text=translateText(text);
  const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');
  ctx.fillStyle='#e4eaff';ctx.font=`350 ${Math.min(134,Math.floor(880/Math.max(4,text.length)))}px "Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.fillText(text,512,159);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const o=hardwareMesh(parent,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}),p);o.userData.dynamic=true;return o;
 }
 function emitter(g,p,r=1,focalHeight=3.2){
  const base=new THREE.Group();base.position.fromArray(p);g.add(base);
  const sculpted=geometry=>{const a=geometry.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),angle=Math.atan2(z,x),outline=1+.105*Math.sin(angle+.6)+.045*Math.cos(angle*2-.3);a.setXYZ(i,x*outline*1.08,a.getY(i),z*outline*.79);}a.needsUpdate=true;geometry.computeVertexNormals();return geometry;};
  const bodyHeight=Math.max(.34,Math.min(.80,r*.31)),resolution=compact()?32:56;
  const profile=[[0,-bodyHeight*.54],[r*.80,-bodyHeight*.54],[r*.93,-bodyHeight*.46],[r*.995,-bodyHeight*.27],[r,-bodyHeight*.06],[r*.985,bodyHeight*.20],[r*.93,bodyHeight*.36],[r*.77,bodyHeight*.43],[0,bodyHeight*.43]].map(p=>new THREE.Vector2(...p));
  hardwareMesh(base,sculpted(new THREE.LatheGeometry(profile,resolution)),m.alloy);
  const crown=[[0,bodyHeight*.50],[r*.52,bodyHeight*.55],[r*.79,bodyHeight*.49],[r*.90,bodyHeight*.34],[r*.90,bodyHeight*.24],[0,bodyHeight*.24]].map(p=>new THREE.Vector2(...p));
  hardwareMesh(base,sculpted(new THREE.LatheGeometry(crown.reverse(),resolution)),lidMaterial);
  hardwareMesh(base,sculpted(new THREE.TorusGeometry(r*.963,.013,5,48,Math.PI*.82).rotateX(Math.PI/2)),m.brass,[0,-bodyHeight*.12,0]);
  for(let i=0;i<2;i++){const angle=i*Math.PI+.23,clamp=part(base,r*.105,.065,r*.07,[Math.sin(angle)*r*.86,bodyHeight*.30,Math.cos(angle)*r*.86],m.brass);clamp.rotation.y=angle;part(base,r*.075,.015,.025,[Math.sin(angle)*r*.90,bodyHeight*.365,Math.cos(angle)*r*.90],m.white).rotation.y=angle;}
  if(r>.48){
   for(let i=0;i<2;i++){const arc=hardwareMesh(base,new THREE.TorusGeometry(r*(.91-i*.17),.022+bodyHeight*.015,5,compact()?32:48,Math.PI*(i?1.10:1.28)),film,[0,bodyHeight*.55+.20+i*.17,0]);arc.rotation.set(Math.PI/2+i*.055,.07-i*.12,.32+i*2.05);}
   opticalFocal(base,r,focalHeight);
  }
  consolidateHardware(base);return base;
 }
 function device(parent,w,h,p,yaw=-.08,mountDrop=.615){
  const g=new THREE.Group();g.position.fromArray(p);g.rotation.y=yaw;parent.add(g);
  const geo=new THREE.PlaneGeometry(w,h,compact()?14:24,compact()?16:28),pa=geo.attributes.position,panelUv=new Float32Array(pa.count*2);
  for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i);panelUv.set([x/(w*.5),y/(h*.5)],i*2);pa.setZ(i,x*x*.006+y*y*.0005);}geo.computeVertexNormals();geo.setAttribute('aPanelUv',new THREE.BufferAttribute(panelUv,2));
  const pane=hardwareMesh(g,geo,projectionFilm);pane.castShadow=pane.receiveShadow=false;
  const fixed=new THREE.Group();g.add(fixed);
  for(const side of [-1,1]){
   const y=side*h*.39,z=(w/2)**2*.006+y*y*.0005+.042;
   const clamp=brace(fixed,curve([[side*(w/2-.32),y-.40,z],[side*(w/2+.09),y-.31,z+.06],[side*(w/2+.20),y+.13,z+.01],[side*(w/2-.05),y+.34,z-.035]]),.19,.15,m.alloy,20);
   clamp.name='Tem.observatory.screen-ceramic-clamp';
   part(fixed,.12,.28,.13,[side*(w/2+.10),y,z+.035],m.dark);
   part(fixed,.044,.14,.022,[side*(w/2-.052),y,z+.117],m.cyan);
  }
  for(let i=0;i<3;i++)part(fixed,.024,.020,.020,[-w/2+.17,h*.23-i*.24,(w/2-.17)**2*.006+.09],i===1?m.cyan:m.alloy);
  // The reading glass has a continuous physical support reaching the landing.
  // Its light originates at the lower corner instead of a detached round foot.
  const mountPath=curve([[-w*.43,-h*.40,.09],[-w*.45,-h*.56,-.17],[-w*.36,-h*(mountDrop-.005),-.48],[-w*.12,-h*mountDrop,-.62]]);
  brace(fixed,mountPath,.40,.20,m.alloy,34);
  brace(fixed,curve([[-w*.42,-h*.405,-.03],[-w*.43,-h*.565,-.30],[-w*.35,-h*(mountDrop+.007),-.59],[-w*.12,-h*(mountDrop+.015),-.73]]),.18,.24,m.dark,34);
  part(fixed,w*.36,.11,.56,[-w*.155,-h*(mountDrop+.009),-.64],m.dark);
  part(fixed,w*.25,.075,.38,[-w*.16,-h*(mountDrop+.002),-.62],m.brass);
  for(const x of [-.29,-.05])part(fixed,.10,.025,.12,[w*x,-h*(mountDrop-.009),-.54],m.cyan);
  const mount=new THREE.Group();mount.position.set(-w*.30,-h*.50,-.17);fixed.add(mount);const focus=opticalFocal(mount,Math.min(.65,w*.08),h*.74);
  const outline=new THREE.Shape(),rw=w/2-.045,rh=h/2-.045,round=.46;
  outline.moveTo(-rw+round,-rh);outline.lineTo(rw-round,-rh);outline.quadraticCurveTo(rw,-rh,rw,-rh+round);outline.lineTo(rw,rh-round);outline.quadraticCurveTo(rw,rh,rw-round,rh);outline.lineTo(-rw+round,rh);outline.quadraticCurveTo(-rw,rh,-rw,rh-round);outline.lineTo(-rw,-rh+round);outline.quadraticCurveTo(-rw,-rh,-rw+round,-rh);
  const edge=outline.getSpacedPoints(96).map(p=>new THREE.Vector3(p.x,p.y,p.x*p.x*.006+p.y*p.y*.0005+.045));
  const borderPath=new THREE.CatmullRomCurve3(edge,true);
  consolidateHardware(fixed);
  const border=createLightFlow({parent:g,paths:[borderPath],color:0xbedcff,radius:.003,segments:96,speed:.052});
  return {g,w:w*.94,h:h*.94,border,focus,fixed,pane};
 }
 const architecture=new THREE.Group();root.add(architecture);
 const architectureSectors=[];
 const landingCeramic=new THREE.MeshPhysicalMaterial({color:0x8d9ca7,metalness:.04,roughness:.34,clearcoat:.50,clearcoatRoughness:.20,envMapIntensity:.36});
 const deckMaterial=new THREE.ShaderMaterial({uniforms:{...opticalEnvironment(),uTime:{value:0},uCoreVisibility:{value:1}},vertexShader:'varying vec3 vWorld,vNormal;void main(){vNormal=normalize(mat3(modelMatrix)*normal);vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',fragmentShader:`uniform float uTime,uSkyReady;uniform sampler2D uSky;varying vec3 vWorld,vNormal;${opticalSkySample}
 void main(){vec3 eye=normalize(cameraPosition-vWorld),n=normalize(vNormal);float f=pow(1.-abs(dot(eye,n)),3.);vec3 reflected=skyReflection(reflect(-eye,n));float l=dot(reflected,vec3(.2126,.7152,.0722));reflected=mix(vec3(l*.65,l*.84,l*1.12),reflected,.14);reflected=reflected/(1.+reflected*6.);vec3 c=vec3(.023,.036,.059)+reflected*(.10+f*.28);gl_FragColor=vec4(c,1.);}`});
 // Separate closed ceramic landings replace the enclosing 59-unit circular
 // floor. Sky remains visible between them and beyond the low cabin edge.
 function landing(parent,points,y=-6.45){
  const contour=points.map(p=>new THREE.Vector2(p[0],-p[1])),outline=new THREE.Shape(),round=.23;
  const before=i=>contour[i].clone().lerp(contour[(i+contour.length-1)%contour.length],round);
  const after=i=>contour[i].clone().lerp(contour[(i+1)%contour.length],round);
  const first=before(0);outline.moveTo(first.x,first.y);
  for(let i=0;i<contour.length;i++){const end=after(i),next=before((i+1)%contour.length);outline.quadraticCurveTo(contour[i].x,contour[i].y,end.x,end.y);outline.lineTo(next.x,next.y);}outline.closePath();
  const edge=outline.getSpacedPoints(compact()?54:94),profileCenter=new THREE.Vector2();contour.forEach(p=>profileCenter.add(p));profileCenter.multiplyScalar(1/contour.length);
  const positions=[],uv=[],indices=[],bands=[[.93,-.46],[.995,-.28],[1,-.04],[.972,.10],[.924,.19],[.883,.145]],count=edge.length;
  bands.forEach(([scale,lift],band)=>edge.forEach((p,i)=>{const q=p.clone().sub(profileCenter).multiplyScalar(scale).add(profileCenter);positions.push(q.x,y+lift,-q.y);uv.push(i/(count-1),band/(bands.length-1));}));
  for(let band=0;band<bands.length-1;band++)for(let i=0;i<count-1;i++){const a=band*count+i,b=a+1,c=a+count,d=c+1;indices.push(a,c,b,b,c,d);}
  const shell=new THREE.BufferGeometry();shell.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));shell.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));shell.setIndex(indices);shell.computeVertexNormals();hardwareMesh(parent,shell,landingCeramic);
  const underside=new THREE.ExtrudeGeometry(outline,{depth:.12,bevelEnabled:true,bevelSize:.08,bevelThickness:.03,bevelSegments:2,curveSegments:compact()?4:7});underside.translate(-profileCenter.x,-profileCenter.y,0);underside.scale(.927,.927,1);underside.translate(profileCenter.x,profileCenter.y,0);underside.rotateX(-Math.PI/2);hardwareMesh(parent,underside,m.dark,[0,y-.61,0]);
  const inlay=new THREE.ShapeGeometry(outline,compact()?4:7);inlay.computeBoundingBox();const center=inlay.boundingBox.getCenter(new THREE.Vector3());
  inlay.translate(-center.x,-center.y,0);inlay.scale(.881,.881,1);inlay.translate(center.x,center.y,0);inlay.rotateX(-Math.PI/2);
  hardwareMesh(parent,inlay,deckMaterial,[0,y+.153,0]);
  const edgePath=curve(edge.filter((_,i)=>i<count*.36).map(p=>[p.x,y-.055,-p.y]));
  hardwareMesh(parent,new THREE.TubeGeometry(edgePath,compact()?20:36,.018,5),m.brass);
 }
 const ribBoxes=[];
 // Only distant station silhouettes punctuate the panorama, rather than a wall.
 const towers=new THREE.Group();root.add(towers);
 const pose=new THREE.Object3D(),windowGeo=new THREE.SphereGeometry(.21,8,6);
 const landscape=new THREE.InstancedMesh(windowGeo,m.brass,24),lamps=new THREE.InstancedMesh(windowGeo,m.white,24);towers.add(landscape,lamps);
 for(let i=0;i<24;i++){
  const a=i*.61803398875*Math.PI*2+.21,r=175+(i%3)*31;
  pose.position.set(Math.sin(a)*r,-17+(i%4)*.8,Math.cos(a)*r);pose.rotation.y=a;pose.scale.set(1.2,.6,1.2);pose.updateMatrix();landscape.setMatrixAt(i,pose.matrix);
  pose.position.y+=.09;pose.scale.set(.16,.16,.16);pose.updateMatrix();lamps.setMatrixAt(i,pose.matrix);
 }
 // An interrupted cabin rim stays at the sides; it never crosses the reading
 // glass or draws a complete circle around the visitor.
 archiveChapterOrder.forEach((key,index)=>{
  const sector=new THREE.Group(),a=archiveAngle(index);sector.name=`Tem.observatory.landing.${key}`;sector.position.set(Math.sin(a)*22,0,Math.cos(a)*22);sector.rotation.y=a;architecture.add(sector);architectureSectors.push(sector);
  landing(sector,[[-16,-1],[-13,-4.1],[-9.1,-3.8],[-5.2,-1.2],[-4.7,6.7],[-9,8.6],[-15,7.1]],-6.50);
  landing(sector,[[3.8,-17.7],[7.1,-20.3],[12.4,-19.7],[16.5,-16.2],[15.9,-10.1],[12.3,-8.0],[6.4,-9.5],[4.0,-13.7]],-5.42);
  const rim=curve([[-28,-7.9,10],[-24,-7.1,11.7],[-19,-6.8,12.3],[-17,-7.1,10.1]]);
  const rail=hardwareMesh(sector,new THREE.TubeGeometry(rim,40,.12,6),m.alloy);rail.scale.y=.72;
  const right=curve([[19,-7.9,9],[24,-7.1,11.7],[30,-7.5,9.8],[34,-8.9,5.6]]);
  hardwareMesh(sector,new THREE.TubeGeometry(right,40,.10,6),m.brass);
  consolidateHardware(sector);
 });
 const deckFlow=createLightFlow({parent:architecture,paths:[curve([[-23,-7.0,33],[-18,-6.72,34],[-17,-7.02,32]])],color:0xacc8ed,radius:.008,speed:.07});

 const core=new THREE.Group();core.name='Tem.observatory.identity-core';root.add(core);core.position.set(9.2,5.8,10);
 const shape=new THREE.Shape();
 const silhouette=[[-2.35,2.80],[2.35,2.80],[2.53,2.60],[2.50,1.98],[2.31,1.79],[.52,1.79],[.52,-2.59],[.36,-2.80],[-.36,-2.80],[-.52,-2.59],[-.52,1.79],[-2.31,1.79],[-2.50,1.98],[-2.53,2.60]];
 shape.moveTo(...silhouette[0]);silhouette.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();
 // Subdivided convex cap surfaces give the key light real changing normals.
 // The broad stem and bar have different shallow optical cross-sections.
 const rawPrism=new THREE.ExtrudeGeometry(shape,{depth:.76,bevelEnabled:true,bevelSize:.078,bevelThickness:.085,bevelSegments:compact()?2:3,curveSegments:2});rawPrism.translate(0,0,-.38);
 const bulge=(x,y)=>{const stem=Math.max(0,1-(x/.60)**2)*.115*(.86+.14*Math.sin((y+2.8)*.63)),bar=Math.max(0,1-((y-2.28)/.64)**2)*.135*(.83+.17*Math.cos(x*.42));return THREE.MathUtils.lerp(stem,bar,THREE.MathUtils.smoothstep(y,1.48,1.92));};
 const prismPositions=[],prismUv=[],capNormals=[],prismGroups=[];
 const emitPrismTriangle=(vertices,uvs,depth,cap)=>{
  if(depth){const midpoint=(a,b)=>a.clone().add(b).multiplyScalar(.5),a=midpoint(vertices[0],vertices[1]),b=midpoint(vertices[1],vertices[2]),c=midpoint(vertices[2],vertices[0]),u=midpoint(uvs[0],uvs[1]),v=midpoint(uvs[1],uvs[2]),w=midpoint(uvs[2],uvs[0]);
   emitPrismTriangle([vertices[0],a,c],[uvs[0],u,w],depth-1,cap);emitPrismTriangle([a,vertices[1],b],[u,uvs[1],v],depth-1,cap);emitPrismTriangle([c,b,vertices[2]],[w,v,uvs[2]],depth-1,cap);emitPrismTriangle([a,b,c],[u,v,w],depth-1,cap);return;
  }
  vertices.forEach((p,index)=>{const sign=Math.sign(p.z)||1,b=bulge(p.x,p.y),capSign=cap?sign:0;prismPositions.push(p.x,p.y,p.z+sign*b);prismUv.push(uvs[index].x,uvs[index].y);capNormals.push(capSign);});
 };
 for(const group of rawPrism.groups){const start=prismPositions.length/3,cap=group.materialIndex===0;
  for(let i=group.start;i<group.start+group.count;i+=3){const p=[],uv=[];for(let j=0;j<3;j++){p.push(new THREE.Vector3().fromBufferAttribute(rawPrism.attributes.position,i+j));uv.push(new THREE.Vector2().fromBufferAttribute(rawPrism.attributes.uv,i+j));}emitPrismTriangle(p,uv,cap?(compact()?1:2):0,cap);}
  prismGroups.push({start,count:prismPositions.length/3-start,materialIndex:group.materialIndex});
 }
 const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute(prismPositions,3));tg.setAttribute('uv',new THREE.Float32BufferAttribute(prismUv,2));tg.computeVertexNormals();prismGroups.forEach(g=>tg.addGroup(g.start,g.count,g.materialIndex));
 for(let i=0;i<capNormals.length;i++)if(capNormals[i]){const p=new THREE.Vector3().fromBufferAttribute(tg.attributes.position,i),epsilon=.002,dx=(bulge(p.x+epsilon,p.y)-bulge(p.x-epsilon,p.y))/(epsilon*2),dy=(bulge(p.x,p.y+epsilon)-bulge(p.x,p.y-epsilon))/(epsilon*2),normal=new THREE.Vector3(-dx,-dy,capNormals[i]).normalize();tg.attributes.normal.setXYZ(i,...normal.toArray());}rawPrism.dispose();
 const emblem=new THREE.Group();emblem.scale.setScalar(2.85);emblem.rotation.y=-.43;core.add(emblem);
 const prismSides=coreCrystal.clone();prismSides.uniforms={...coreCrystal.uniforms,uBodyOpacity:{value:.12}};
 const identityGlass=new THREE.Mesh(tg,[coreCrystal,prismSides]);identityGlass.name='Tem.observatory.identity-curved-prism';identityGlass.castShadow=identityGlass.receiveShadow=false;identityGlass.renderOrder=4;emblem.add(identityGlass);
 const identityVolume=createIdentityVolume({parent:emblem,geometry:tg,camera,interaction,compact});
 let authoredIdentity=null,authoredGlass=[];
 const authoredIdentityReveal={value:0};
 // Optical laminae sit at actual depths around the inner crystal conduits.
 // Their interrupted ceramic attachments expose the layered cross-section.
 const laminaCrystal=coreCrystal.clone();laminaCrystal.uniforms={...coreCrystal.uniforms,uVisibility:{value:.22}};
 const lamina=new THREE.Mesh(new THREE.ShapeGeometry(shape,2),laminaCrystal);lamina.scale.set(.945,.955,1);lamina.position.z=-.445;lamina.castShadow=lamina.receiveShadow=false;lamina.renderOrder=2;emblem.add(lamina);
 const coreFixed=new THREE.Group();emblem.add(coreFixed);
 for(const x of [-.26,.26]){
  const rod=hardwareMesh(coreFixed,new THREE.CylinderGeometry(.020,.029,4.00,6),film,[x,-.26,.025]);rod.rotation.z=x*.025;
  part(coreFixed,.11,.16,.16,[x,-2.50,.02],m.brass);part(coreFixed,.055,.018,.04,[x,-2.40,.13],m.cyan);
 }
 const crossbar=hardwareMesh(coreFixed,new THREE.CylinderGeometry(.019,.019,4.12,6),film,[0,2.26,.035]);crossbar.rotation.z=Math.PI/2;
 for(const x of [-2.28,2.28]){part(coreFixed,.13,.72,.56,[x,2.28,-.015],m.dark);part(coreFixed,.08,.64,.39,[x,2.28,.105],m.alloy);part(coreFixed,.036,.27,.036,[x,2.28,.315],m.cyan);}
 part(coreFixed,.72,.105,.58,[0,-2.66,-.015],m.dark);
 part(coreFixed,.31,.035,.10,[0,-2.61,.325],m.cyan);
 consolidateHardware(coreFixed);
 // Only the real cut edges catch light. Avoid doubled white wire outlines.
 for(const x of [-.46,.46])part(emblem,.026,.47,.095,[x,-2.37,.27],m.brass);
 const circuit=createLightFlow({parent:emblem,paths:[curve([[-.25,-2.59,.12],[-.25,-.25,.02],[-.29,1.50,.08],[-.81,2.22,.05],[-2.26,2.26,.05]]),curve([[.25,-2.59,.12],[.25,-.25,.02],[.29,1.50,.08],[.81,2.22,.05],[2.26,2.26,.05]])],color:0xadd6ff,radius:.009,speed:.16,segments:52});
 const orbitCurves=[
  curve([[-13,-4,-6],[-10,-2,2],[-3,.2,6],[7,2.8,4],[14,5,-2],[10,6.8,-8],[0,4.7,-11],[-10,1.4,-7]]),
  curve([[-12,-3.1,-4],[-7,-1.2,4],[1,1.1,5.4],[10,3.8,1.2],[12,5.4,-6],[4,4.1,-10],[-6,1.3,-8]])
 ];
 const coreRibbons=createEnergyRibbons({parent:core,curves:orbitCurves,width:.88,color:0x93bfff});
 const coreDust=createOpticalMotes({parent:core,count:compact()?100:280,span:[19,16,12],color:0x96c9ff,drift:.26});
 const crystalStars=createOpticalMotes({parent:emblem,count:compact()?80:180,span:[4.8,5.4,.48],color:0xb3c2ff,filter:p=>p[1]>1.80||Math.abs(p[0])<.43,drift:.038});
 const veins=[curve([[-.18,-2.59,.10],[-.12,-.5,.12],[0,1.7,.08],[-.68,2.33,.11],[-2.28,2.37,.12]]),curve([[.18,-2.59,-.06],[.12,-.5,-.04],[0,1.7,-.06],[.68,2.20,-.09],[2.28,2.20,-.10]])];
 const crystalVeins=createEnergyRibbons({parent:emblem,curves:veins,width:.050,color:0xbad8ff,segments:80});
 const base=new THREE.Group();base.name='Tem.observatory.identity-magnetic-cradle';base.position.set(9.2,-1.73,10);base.scale.set(2.60/2.20,1,2.60/2.20);root.add(base);
 part(base,2.65,.31,1.63,[0,-.15,0],m.dark);part(base,2.23,.13,1.31,[0,.055,0],landingCeramic);
 for(const side of [-1,1]){brace(base,curve([[side*1.17,-.17,-.20],[side*1.06,.14,-.19],[side*.81,.37,-.19]]),.27,.48,landingCeramic,18);part(base,.11,.10,.33,[side*.70,.30,-.19],m.brass);part(base,.032,.012,.21,[side*.62,.354,-.18],m.cyan);}
 part(base,.94,.042,.47,[0,.174,-.06],lidMaterial);opticalFocal(base,.65,5.2);consolidateHardware(base);
 const identitySupport=new THREE.Group();identitySupport.name='Tem.observatory.identity-load-bearing-arm';root.add(identitySupport);
 brace(identitySupport,curve([[9.2,-2.00,10],[9.7,-3.07,8.9],[10.80,-4.56,7.8],[12.0,-5.25,7.3]]),.66,.38,landingCeramic,38);
 brace(identitySupport,curve([[9.26,-2.21,10.13],[9.77,-3.28,9.05],[10.89,-4.78,7.95],[12.0,-5.45,7.48]]),.24,.26,m.dark,38);
 part(identitySupport,1.75,.20,1.10,[11.87,-5.40,7.40],m.dark);part(identitySupport,1.12,.065,.65,[11.83,-5.285,7.37],m.brass);consolidateHardware(identitySupport);

 const bays=[];
 archiveChapterOrder.forEach((key,index)=>{
  const a=archiveAngle(index),bay=new THREE.Group();bay.position.set(Math.sin(a)*22,0,Math.cos(a)*22);bay.rotation.y=a;root.add(bay);
  const primary=device(bay,13.0,11.2,[-8.3,1.45,3],.12,.705);
  // An interrupted canopy stays out at the edges of the open sky.
  const roofPath=curve([[-34,15.6,-15],[-27,18.2,-18],[-20,19.3,-20],[-15,19.6,-21]]);
  const roofGeometry=new THREE.TubeGeometry(roofPath,72,.21,8,false),roofPosition=roofGeometry.attributes.position;
  for(let i=0;i<roofPosition.count;i++){const center=roofPath.getPointAt(roofGeometry.attributes.uv.getX(i));roofPosition.setY(i,center.y+(roofPosition.getY(i)-center.y)*.62);}roofGeometry.computeVertexNormals();
  hardwareMesh(bay,roofGeometry,m.alloy);
  const roofLight=curve([[-33.8,15.68,-14.9],[-26.8,18.28,-17.9],[-19.8,19.38,-19.9],[-14.8,19.68,-20.9]]);
  const canopyFlow=createLightFlow({parent:bay,paths:[roofLight],color:0xb7d6f4,radius:.009,segments:48,speed:.05});
  const rig=new THREE.Group();rig.position.set(6,-.3,1);bay.add(rig);
  const leaves=[],modules=[],nodes=[],flows=[];let poetry;
  if(key==='overview'){
   emitter(rig,[0,-6.7,0],1.4);const pearl=hardwareMesh(rig,new THREE.IcosahedronGeometry(.43,2),crystal,[0,-5.9,0]);pearl.userData.dynamic=true;modules.push(pearl);
  }else if(key==='reading'){
   poetry=device(rig,5.4,7.8,[1.1,2.4,-1.7],-.10);
   poetry.g.userData.basePosition=poetry.g.position.clone();
   label(poetry.g,window.PORTFOLIO_DATA.poetry.title,4.5,.86,[0,1.70,.08]);
   label(poetry.g,'三十余首原创',4.1,.52,[0,.68,.08]);
   poetryAnchor=new THREE.Object3D();poetryAnchor.position.set(0,-1.03,.12);poetry.g.add(poetryAnchor);
   const readings=window.PORTFOLIO_DATA.profile.readings||[];
   readings.forEach((reading,i)=>{
    const book=new THREE.Group();book.name=`Tem.observatory.book.${i}`;book.position.set(-4.8+i*3.15,-3.3+i*.28,3.4-i*.65);book.rotation.y=(i-1.5)*-.13;book.userData.dynamic=true;rig.add(book);
    book.userData.basePosition=book.position.clone();book.userData.baseRotation=book.rotation.y;
    part(book,.14,3.28,.29,[-1.03,0,0],landingCeramic);
    part(book,1.80,.065,.25,[.025,-1.64,-.005],m.dark);part(book,.012,2.52,.012,[-1.04,.1,.14],m.cyan);
    const pages=[];
    for(let page=0;page<3;page++){
     const pageGeometry=new THREE.PlaneGeometry(1.82,3.18,4,8),vertices=pageGeometry.attributes.position;
     for(let vertex=0;vertex<vertices.count;vertex++){const x=vertices.getX(vertex),y=vertices.getY(vertex);vertices.setZ(vertex,Math.max(0,x-.18)*(.04+page*.022)+Math.sin((y+1.6)*.7)*.020);}pageGeometry.computeVertexNormals();
     const hinge=new THREE.Group();hinge.position.set(-.89,.014*page,-.08+page*.054);hinge.rotation.y=-.04-page*.025;hinge.userData.dynamic=true;hinge.userData.baseRotation=hinge.rotation.y;book.add(hinge);
     const sheet=hardwareMesh(hinge,pageGeometry,film,[.91,0,0]);sheet.castShadow=false;pages.push(hinge);
    }
    const innerTitles=[label(pages[0],reading.books.join(' · '),1.52,.30,[.91,.52,.19]),label(pages[0],reading.title,1.38,.24,[.91,-.12,.19])];innerTitles.forEach(title=>title.visible=false);
    const cover=new THREE.Group();cover.position.x=-.92;cover.rotation.x=-.10;cover.userData.dynamic=true;book.add(cover);
    const bookPlane=new THREE.PlaneGeometry(1.9,3.22,3,8);hardwareMesh(cover,bookPlane,film,[.95,0,.18]).castShadow=false;
    label(cover,reading.books.join(' · '),1.75,.34,[.94,.23,.205]);
    label(cover,String(i+1).padStart(2,'0'),.44,.28,[.28,1.18,.205]);
    const path=curve([[-1.03,-1.38,.21],[-1.03,-.20,.21],[-1.03,1.35,.21],[-.61,1.51,.21]]);
    const lightFlow=createLightFlow({parent:book,paths:[path],color:0xaacfff,radius:.008,segments:28,speed:.14});
    book.userData.lightFlow=lightFlow;book.userData.cover=cover;book.userData.pages=pages;book.userData.innerTitles=innerTitles;book.userData.kind='book';book.userData.index=i;
    consolidateHardware(book);leaves.push(book);
   });
   const shelf=curve([[-6.2,-5.2,4.4],[-2.0,-4.82,3.9],[2.4,-4.35,2.8],[7.1,-3.88,1.25]]);
   hardwareMesh(rig,new THREE.TubeGeometry(shelf,40,.11,6),m.alloy);
   flows.push(createEnergyRibbons({parent:rig,curves:[curve([[-5.8,-5.04,4.4],[-1.7,-4.68,3.9],[2.4,-4.19,2.8],[6.8,-3.72,1.25]])],width:.07,color:0xabbbff,segments:64}));
  }else if(key==='practice'){
   const positions=[[-4.5,1.5,-.7],[-1.4,1.3,0],[1.7,1.5,.4],[4.7,1.2,1.4]];
   positions.forEach((p,i)=>{
    const unit=new THREE.Group();unit.position.fromArray(p);unit.userData.dynamic=true;rig.add(unit);unit.userData.opticalFocal=emitter(unit,[0,-4.3,0],1.05,4.25).userData.opticalFocal;
    if(i===0){for(let j=0;j<3;j++){const mesh=hardwareMesh(unit,new THREE.OctahedronGeometry(1.1+j*.18,0),crystal,[0,0,0]);mesh.rotation.set(j*.4,j*.6,j*.7);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:0x90cfff,transparent:true,opacity:.34}));edge.rotation.copy(mesh.rotation);unit.add(edge);}}
    else if(i===1){hardwareMesh(unit,new THREE.IcosahedronGeometry(1.35,2),crystal);for(let j=0;j<3;j++){const o=hardwareMesh(unit,new THREE.TorusGeometry(1.65,.016,5,80),m.cyan);o.rotation.set(j*.8,.5+j*.5,j*.3);}}
    else if(i===2){for(let j=0;j<4;j++){const o=hardwareMesh(unit,bevelGeometry(.7,1.5,.025,.08,.008),film,[(j-1.5)*.5,Math.sin(j)*.5,(j-1.5)*.3]);o.rotation.y=(j-1.5)*.25;}}
    else{const pts=[];for(let j=0;j<12;j++){const q=new THREE.Vector3(Math.sin(j*2.4)*1.6,Math.cos(j*1.7)*1.4,Math.sin(j*.8)*1.2);pts.push(new THREE.Vector3(),q);hardwareMesh(unit,new THREE.SphereGeometry(.16,10,8),crystal,q.toArray());}unit.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xc3b1ff,transparent:true,opacity:.5})));}
    unit.name=`Tem.observatory.capability.${i}`;unit.userData.basePosition=unit.position.clone();unit.userData.baseRotation=unit.rotation.y;unit.userData.motionRotation=0;modules.push(unit);
   });
  }else{
   const points=[[-4.8,-1.5,-3],[-1.9,-.5,-1],[1.1,.5,1],[4,1.5,2]];
   points.forEach((p,i)=>{const node=new THREE.Group();node.position.fromArray(p);node.userData.dynamic=true;rig.add(node);const record=window.PORTFOLIO_DATA.profile.resume.experience[i];hardwareMesh(node,new THREE.SphereGeometry(1.12,24,16),crystal);hardwareMesh(node,new THREE.OctahedronGeometry(.46,1),film);node.userData.opticalFocal=emitter(node,[0,-1.3,0],1.15,2.55).userData.opticalFocal;node.userData.basePosition=node.position.clone();label(node,record?.period||'',3.1,.40,[0,1.7,.30]);nodes.push(node);});
   flows.push(createEnergyRibbons({parent:rig,curves:[curve(points),curve(points.map(p=>[p[0],p[1]-.18,p[2]+.2]))],color:0xb9b4ff,width:.18}));
  }
  const path=[[2,-4.8,1.6],[4,-3.3,2],[7,0,1.6],[11,1.8,0],[15,3,-7]];
  flows.push(createEnergyRibbons({parent:bay,curves:[curve(path)],width:.11,color:0x95c4ff,segments:90}));
  const dust=createOpticalMotes({parent:rig,count:compact()?70:190,span:[17,12,13],seed:237+index*111,drift:.25});
  bays.push({bay,primary,rig,leaves,modules,nodes,flows,dust,key,canopyFlow,poetry});
 });
 // These short-range instrument lamps fill glass and book edges; the shared
 // stellar key supplies the consistent world illumination and cached shadow.
 const keyLight=new THREE.PointLight(0xffdfb8,4.4,30,2);keyLight.name='Tem.archive.warm-instrument-fill';root.add(keyLight);
 const rimLight=new THREE.PointLight(0x7dc8e6,3.6,30,2);rimLight.name='Tem.archive.cyan-instrument-fill';rimLight.position.set(15,12,-6);root.add(rimLight);
 let chapter=0,lastStep='',age=0,panel,projection,poetryButton,tick=0,lastFrozenDevice='',deviceRevision=0;
 const deviceStates=new Map();
 const deviceKey=(chapter,kind,index)=>`${chapter}:${kind}:${index}`;
 const response=(chapter,kind,index,motion,dt)=>{
  const key=deviceKey(chapter,kind,index);let state=deviceStates.get(key);
  if(!state){state={target:0,level:0};deviceStates.set(key,state);}
  state.level=motion?THREE.MathUtils.damp(state.level,state.target,6,dt):state.target;
  return state.level;
 };
 const bind=()=>{panel=document.querySelector('.archive-glass-panel');projection=document.querySelector('.archive-projection');};
 addEventListener('tem:surface',bind);
 addEventListener('tem:archive-chapter',e=>{chapter=Math.max(0,archiveChapterOrder.indexOf(e.detail.tab));});
 addEventListener('tem:archive-device',e=>{
  const detail=e.detail;if(!detail||!archiveChapterOrder.includes(detail.chapter)||!Number.isInteger(detail.index)||detail.index<0)return;
  const expected={overview:['identity'],reading:['book','poetry'],practice:['capability'],records:['record']};
  if(!expected[detail.chapter].includes(detail.kind)||detail.index>=(['identity','poetry'].includes(detail.kind)?1:4))return;
  const key=deviceKey(detail.chapter,detail.kind,detail.index),state=deviceStates.get(key)||{target:0,level:0};
  const target=detail.active?(detail.committed?1:.63):0;
  // The semantic controller restores the current committed item after a
  // transient hover ends. There is exactly one responding object per chapter.
  if(detail.active)for(const [otherKey,otherState] of deviceStates)if(otherKey!==key&&otherKey.startsWith(`${detail.chapter}:`)&&otherState.target!==0){otherState.target=0;deviceRevision++;}
  if(state.target!==target){state.target=target;deviceRevision++;}deviceStates.set(key,state);
 });
 function layout(){const mobile=compact();bays.forEach(({primary,rig,key})=>{
  // One physical screen keeps the same surface, hinges and clamps on resize.
  // Mobile maps its shape back to the established tall reading viewport.
  primary.g.position.set(mobile?0:-8.3,mobile?-3.65:1.45,mobile?7:3);primary.g.rotation.set(0,mobile?0:.12,mobile?0:-.045);primary.g.scale.set(mobile?10.1/13*.97:1,mobile?13.2/11.2*.84:1,1);
  rig.position.set(mobile?0:6,mobile?5.0:key==='practice'?1.4:-.3,mobile?2.5:1);rig.scale.setScalar(mobile?.42:key==='reading'?1:key==='practice'?1.40:1.16);
  if(key==='overview')rig.visible=false;
 });core.position.set(mobile?0:9.2,mobile?9.4:5.8,mobile?4:10);core.scale.setScalar(mobile?.60*2.20/2.60:1);base.visible=!mobile;identitySupport.visible=!mobile;}
 layout();addEventListener('resize',layout);
 // A complete Blender asset replaces the temporary prism and its fittings.
 // Desktop uses real physical transmission; narrow screens keep the lighter
 // optical shader while sharing the same authored hardware and silhouette.
 function identityMaterials(){
  if(!authoredIdentity)return;
  const mobile=compact();
  for(const mesh of authoredGlass)mesh.material=mobile?coreCrystal:mesh.userData.temPhysicalGlass;
  identityGlass.visible=false;coreFixed.visible=false;lamina.visible=false;
 }
 if(typeof loadTemAsset==='function')loadTemAsset({name:'identity',canvas:document.getElementById('space'),onLoad:model=>{
  const glass=model.find('TEM_GLASS_T');
  if(!glass)throw new Error('Authored identity is missing its optical shell.');
  authoredIdentity=model.root;authoredIdentity.name='Tem.identity.Blender-authored';
  authoredIdentity.traverse(mesh=>{
   if(!mesh.isMesh)return;
   if(mesh.userData.temAssetSurface==='glass'||/GLASS/i.test(mesh.name)){
    const material=mesh.material;
    if(!material.isMeshPhysicalMaterial)mesh.material=new THREE.MeshPhysicalMaterial({color:material.color,map:material.map,normalMap:material.normalMap,roughnessMap:material.roughnessMap,roughness:.09,metalness:0,transmission:.94,thickness:.76,ior:1.46,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:.78,depthWrite:false,side:THREE.FrontSide});
    // glTF's transmission extension alone represents a thin sheet. The real
    // closed Blender shell is .89 units deep; give r161 its optical path length.
    mesh.material.thickness=.89;mesh.material.transmission=.94;mesh.material.ior=1.46;
    mesh.material.roughness=Math.min(mesh.material.roughness,.068);mesh.material.clearcoat=.68;mesh.material.clearcoatRoughness=.075;
    mesh.material.attenuationColor=new THREE.Color().setRGB(.66,.86,.96);mesh.material.attenuationDistance=3.2;
    mesh.userData.temPhysicalGlass=mesh.material;mesh.renderOrder=2;authoredGlass.push(mesh);
   }
  });
  prepareReveal(authoredIdentity,authoredIdentityReveal);
  emblem.add(authoredIdentity);identityMaterials();
  dispatchEvent(new Event('tem:scene-depth-change'));
 }});
 addEventListener('resize',identityMaterials);
 let authoredDisplays=[];
 if(typeof loadTemAsset==='function')loadTemAsset({name:'display',desktopOnly:true,canvas:document.getElementById('space'),onLoad:model=>{
  if(!model.find('DISPLAY_FRAME'))throw new Error('Authored display housing is missing.');
  const incoming=bays.map((bay,index)=>({bay,asset:index===0?model:model.clone()}));
  for(const {bay,asset} of incoming){bay.primary.g.add(asset.root);authoredDisplays.push({bay,root:asset.root});}
  dispatchEvent(new Event('tem:scene-depth-change'));
 }});
 dispatchEvent(new Event('tem:archive-device-request'));
 // Consolidation recreates meshes; optical glass and thin light should stay
 // transmissive in the shadow map rather than casting opaque screen blocks.
 root.traverse(object=>{if(object.isMesh){const materials=Array.isArray(object.material)?object.material:[object.material];if(materials.some(material=>material.transparent)){object.castShadow=false;object.receiveShadow=false;}}});
 return {update(dt,time,frame,motion){
  const welcome=frame.step==='bridge'&&!frame.opening,entry=frame.step==='captain',map=frame.step==='map'||frame.step==='boot',arrival=frame.opening&&frame.introFrame.time>10;
  root.visible=entry||map||arrival||welcome;if(!root.visible)return;
  const replacement=THREE.MathUtils.clamp(frame.observatoryReplacement||0,0,1);
  const fallbackCoverage=applyArchiveReplacement({architecture,bays,authoredDisplays,compact:compact(),map,deckReady:!compact()&&document.getElementById('space').dataset.assetDeck==='ready'},replacement);
  const coreAmount=(map?0:arrival?THREE.MathUtils.smoothstep(frame.introFrame.time,10,11.7):welcome?1:1-THREE.MathUtils.smoothstep(frame.archiveProgress??chapter,.30,.72))*(1-replacement);
  authoredIdentityReveal.value=coreAmount;
  core.visible=coreAmount>.005;base.visible=false;identitySupport.visible=false;coreCrystal.uniforms.uVisibility.value=coreAmount;laminaCrystal.uniforms.uVisibility.value=coreAmount*.22;
  if(frame.step!==lastStep){lastStep=frame.step;age=0;bind();chapter=welcome?0:Math.max(0,archiveChapterOrder.indexOf(document.body.dataset.archiveChapter||'overview'));}
  age+=dt;
  // Cosmos freezes its shared clock during reading/reduced motion. Keep the
  // current shader phase and physical pose instead of resetting them to zero.
  const nearest=welcome||arrival?0:frame.archiveProgress??chapter,error=Math.abs(nearest-chapter),angle=archiveAngle(nearest);
  architectureSectors.forEach((sector,index)=>{sector.visible=!map&&(welcome||arrival?index===0:Math.abs(nearest-index)<.95);});
  const identity=response('overview','identity',0,Boolean(motion),dt);
  keyLight.position.set(Math.sin(angle)*28-Math.cos(angle)*8,7,Math.cos(angle)*28+Math.sin(angle)*8);keyLight.intensity=map?0:4.4;
  const deploy=motion?THREE.MathUtils.smoothstep(age,.10,.75):1;
  lidUniforms.uTime.value=time;lidUniforms.uEnergy.value=0;
  paneUniforms.uTime.value=time;paneUniforms.uEnergy.value=0;
  focalControllers.forEach(u=>{u.uTime.value=time;u.uPower.value=.30;u.uPixelHeight.value=innerHeight;});
  base.userData.opticalFocal.uPower.value=(.42+identity*.25)*coreAmount;
  document.body.style.setProperty('--archive-entry',deploy.toFixed(4));document.body.style.setProperty('--archive-scan',Math.min(1,age/.8).toFixed(4));
  bays.forEach((b,i)=>{
   // The physical exhibits persist while the visitor turns around them. Their
   // meshes use normal frustum/depth culling instead of a chapter hard cut.
   b.bay.visible=!map;
   const screenCoverage=i===0?fallbackCoverage:1;
   b.primary.border.update(time,(i===chapter?.24:.10)*screenCoverage,Boolean(motion));
   b.primary.focus.uPower.value=deploy*(i===chapter?.29:.14)*screenCoverage;
   b.canopyFlow.update(time,.24,Boolean(motion));
   let bookFocus=0;
   b.leaves.forEach((leaf,j)=>{
    const level=response('reading','book',j,Boolean(motion),dt),mobile=compact();bookFocus=Math.max(bookFocus,level);leaf.position.copy(leaf.userData.basePosition);
    leaf.position.x=THREE.MathUtils.lerp(leaf.userData.basePosition.x,-.15,level*(mobile?.24:1));leaf.position.y=THREE.MathUtils.lerp(leaf.userData.basePosition.y,-.65,level*(mobile?.35:1));leaf.position.z+=level*(mobile?1.10:3.25);leaf.scale.setScalar(1+level*(mobile?.27:.56));
    leaf.rotation.y=THREE.MathUtils.lerp(leaf.userData.baseRotation,.05,level);leaf.userData.cover.rotation.y=-level*1.55;
    leaf.userData.pages.forEach((page,k)=>{page.rotation.y=page.userData.baseRotation-level*(.24+k*.29);});
    leaf.userData.innerTitles.forEach(title=>title.visible=level>.045);
    leaf.userData.lightFlow.update(time,.22+level*.63,Boolean(motion));
   });
   if(b.poetry){const level=response('reading','poetry',0,Boolean(motion),dt);b.poetry.border.update(time,.26+level*.57,Boolean(motion));b.poetry.focus.uPower.value=.27+level*.44;b.poetry.g.rotation.y=-.10+level*.08;b.poetry.g.position.copy(b.poetry.g.userData.basePosition);if(!compact()){b.poetry.g.position.x+=bookFocus*2.15;b.poetry.g.position.y+=bookFocus*1.25;b.poetry.g.position.z-=bookFocus*1.15;}}
   b.modules.forEach((unit,j)=>{
    const level=b.key==='practice'?response('practice','capability',j,Boolean(motion),dt):identity;
    if(unit.isGroup){unit.position.copy(unit.userData.basePosition);unit.position.y+=level*.35;if(motion)unit.userData.motionRotation=Math.sin(time*.10+j)*.075;unit.rotation.y=unit.userData.baseRotation+unit.userData.motionRotation+level*.18;}
    else if(motion)unit.rotation.y=time*.045;
    if(unit.userData.opticalFocal)unit.userData.opticalFocal.uPower.value=.29+level*.51;
   });
   b.nodes.forEach((node,j)=>{const level=response('records','record',j,Boolean(motion),dt);node.scale.setScalar(1+level*.10);node.position.copy(node.userData.basePosition);node.position.y+=level*.18;node.userData.opticalFocal.uPower.value=.27+level*.48;});
   b.flows.forEach(f=>f.update(time,.30,Boolean(motion)));b.dust.update(time,.31,Boolean(motion));
  });
  crystal.uniforms.uTime.value=time;crystal.uniforms.uEnergy.value=0;
  coreCrystal.uniforms.uTime.value=time;coreCrystal.uniforms.uEnergy.value=.22+identity*.78;
  identityVolume.update(time,identity,coreAmount,Boolean(motion));
  deckMaterial.uniforms.uTime.value=time;deckMaterial.uniforms.uCoreVisibility.value=coreAmount;
  circuit.update(time,(.35+identity*.28)*coreAmount,Boolean(motion));crystalVeins.update(time,(.31+identity*.30)*coreAmount,Boolean(motion));coreRibbons.update(time,(.62+identity*.30)*coreAmount,Boolean(motion));coreDust.update(time,.40*coreAmount,Boolean(motion));crystalStars.update(time,(.45+identity*.30)*coreAmount,Boolean(motion));deckFlow.update(time,.24,Boolean(motion));
  // Paused selections change geometry discretely. Invalidate the cached depth
  // once for that real change, then leave the fog and shadow maps frozen.
  if(!motion){const frozen=`${chapter}:${deviceRevision}`;if(lastFrozenDevice!==frozen){lastFrozenDevice=frozen;dispatchEvent(new Event('tem:scene-depth-change'));}}else lastFrozenDevice='';
  if((entry||welcome||arrival)&&panel){
   const surfaces=entry?[...document.querySelectorAll('[data-archive-panel]')]:[panel];
   for(const surface of surfaces){
    const index=entry?archiveChapterOrder.indexOf(surface.dataset.archivePanel):0,d=bays[index].primary;
    const chosen=!entry||index===chapter;
    const shown=projectWorldSurface({object:d.g,camera,element:surface,w:d.w,h:d.h,width:compact()?640:800,height:compact()?850:690,ready:chosen&&deploy>.94&&!frame.archiveMoving&&!frame.opening});
    const reveal=arrival?frame.introFrame.panel:deploy;surface.style.opacity=(shown?reveal:0).toFixed(3);
   }
   if(tick++%3===0)clipForeground({element:projection,camera,surface:bays[welcome||arrival?0:chapter].primary.g,boxes:ribBoxes});
  }
  if(entry&&chapter===1&&projection&&!compact()){
   if(!poetryButton?.isConnected){poetryButton=document.createElement('button');poetryButton.type='button';poetryButton.className='optical-poetry-entry';poetryButton.dataset.readPoetry='';poetryButton.innerHTML='读我的诗 <span aria-hidden="true">↗</span>';projection.append(poetryButton);}
   const shown=projectWorldSurface({object:poetryAnchor,camera,element:poetryButton,w:5.1,h:1.18,width:340,height:80,ready:deploy>.94&&!frame.archiveMoving});poetryButton.style.opacity=shown?String(deploy):'0';
  }else if(poetryButton){poetryButton.remove();poetryButton=null;}
  const canvas=document.getElementById('space');canvas.dataset.archive='wide-observatory-volumetric-identity';canvas.dataset.archiveChapter=archiveChapterOrder[chapter];canvas.dataset.archiveAngle=(nearest*90).toFixed(1);canvas.dataset.archiveDeviceRevision=String(deviceRevision);canvas.dataset.archiveNativeSurface=compact()?'640x850':'800x690';
 }};
}
