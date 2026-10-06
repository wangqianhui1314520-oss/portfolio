import * as THREE from 'three';
import {loadTemAsset,prepareReveal} from './immersive-blender-assets.js?v=cinematic-v21.1';

const semanticNames=['CABIN_V19','T_IDENTITY_V19','EXTERIOR_V19','SURFACE_FRAME_V19'];
const mapKeys=['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap','transmissionMap','thicknessMap','specularIntensityMap','specularColorMap','iridescenceMap','iridescenceThicknessMap'];
const clamp=(value,min,max,fallback=min)=>THREE.MathUtils.clamp(Number.isFinite(value)?value:fallback,min,max);
const finiteTriple=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);

// The GLB is authored in browser world coordinates. It is never recentered,
// scaled to a box, or rotated onto the old procedural observatory's origin.
export function createObservatoryV19({scene,camera,canvas,compact=()=>innerWidth<701,reflection,externalCloud=false}){
 const root=new THREE.Group();root.name='Tem.observatory.v19.authored';root.visible=false;scene.add(root);
 const reveal={value:0},identityReveal={value:0},cloudTime={value:0},semanticRoots={},floorMeshes=[],cloudMeshes=[],privateMaterials=new Set();
 const isCompact=()=>typeof compact==='function'?Boolean(compact()):Boolean(compact);
 let model=null,effects=null,cloudVolume=null,disposed=false,override=null,target=0,lastReveal='',lastVisible=false,lastSettled=0,lastCloudMode=null;
 let effectAuthoredMatrix=null,identityPose=null,loadError='',pointerActivity=0,lastCompact=null;
 const identityMatrix=new THREE.Matrix4(),frameMatrix=new THREE.Matrix4();
 const pointer=new THREE.Vector2(),pointerTarget=new THREE.Vector2();
 const lightGroup=new THREE.Group();lightGroup.name='Tem.observatory.v19.focal-light';root.add(lightGroup);
 // The host keeps one cached sun shadow. These two local fills describe the
 // transparent identity's depth without adding another shadow or capture.
 const warm=new THREE.PointLight(0xffd6ad,0,34,2),cool=new THREE.PointLight(0x88cce2,0,26,2);
 warm.name='Tem.observatory.v19.warm-glass-fill';cool.name='Tem.observatory.v19.cyan-glass-rim';
 lightGroup.add(warm,cool);
 const onPointer=event=>{
  if(!event.isPrimary&&event.pointerType==='touch')return;
  const x=event.clientX/Math.max(1,innerWidth)-.5,y=.5-event.clientY/Math.max(1,innerHeight);
  pointerActivity=Math.min(1,pointerActivity+Math.hypot(x-pointerTarget.x,y-pointerTarget.y)*3);
  pointerTarget.set(x,y);
 };
 const onPointerOut=event=>{if(!event.relatedTarget)pointerTarget.set(0,0);};
 addEventListener('pointermove',onPointer,{passive:true});addEventListener('pointerout',onPointerOut,{passive:true});

 function rememberMaterials(assetRoot){
  assetRoot.traverse(node=>{
   if(!node.isMesh)return;
   for(const material of Array.isArray(node.material)?node.material:[node.material])privateMaterials.add(material);
   if(node.customDepthMaterial)privateMaterials.add(node.customDepthMaterial);
  });
 }
 function disposePrivate(assetRoot){
  // Geometry and baked images belong to loadTemAsset's immutable source cache.
  // Only the instance's private materials and this module's dynamic geometry
  // are disposed here, so another authored asset can reuse the same textures.
  rememberMaterials(assetRoot);privateMaterials.forEach(material=>material.dispose());privateMaterials.clear();
 }
 function physicalGlass(source){
  if(source.isMeshPhysicalMaterial)return source;
  const material=new THREE.MeshPhysicalMaterial();material.name=source.name;
  // MeshPhysicalMaterial.copy(StandardMaterial) would overwrite physical
  // defaults with undefined fields. Copy the standard fields explicitly.
  for(const name of ['color','emissive','normalScale'])if(source[name])material[name].copy(source[name]);
  for(const name of ['roughness','metalness','emissiveIntensity','aoMapIntensity','bumpScale','opacity','alphaTest','envMap','envMapIntensity','vertexColors','flatShading','fog','toneMapped'])if(source[name]!==undefined)material[name]=source[name];
  for(const name of mapKeys)if(source[name])material[name]=source[name];
  privateMaterials.add(material);return material;
 }
 function refineMaterials(asset){
  const glassMaterials=new Map(),seen=new Set();
  asset.root.traverse(node=>{
   if(!node.isMesh)return;
   const semantic=`${node.name} ${Array.isArray(node.material)?node.material.map(m=>m.name).join(' '):node.material.name}`.toLowerCase();
   if(/v19 cloud/.test(semantic)){node.castShadow=false;cloudMeshes.push({mesh:node,visible:node.visible});}
   const configure=source=>{
    const glass=source.transmission>0||/glass|crystal/.test(`${node.name} ${source.name}`.toLowerCase());
    let material=source;
    if(glass){
     if(!glassMaterials.has(source))glassMaterials.set(source,physicalGlass(source));
     material=glassMaterials.get(source);node.castShadow=false;node.receiveShadow=false;node.renderOrder=2;
    }
    if(seen.has(material))return material;seen.add(material);
    if(glass){
     const internalFilm=/internal|lamina|dichroic/.test(`${node.name} ${material.name}`.toLowerCase());
     material.metalness=clamp(material.metalness,0,.08,0);
     // Absolute baked roughness keeps its exported factor (normally 1).
     // Untextured glass still has a small, physically readable roughness.
     if(!material.roughnessMap)material.roughness=clamp(material.roughness,.035,.16,.07);
     material.transmission=clamp(material.transmission,.78,.94,.90);
     material.thickness=material.thickness>0?clamp(material.thickness,.12,2.36,1.25):/t_identity_v19/.test(semantic)?2.36:.40;
     material.ior=clamp(material.ior,1.42,1.50,1.46);
     material.clearcoat=clamp(material.clearcoat,0,.52,.38);
     material.clearcoatRoughness=clamp(material.clearcoatRoughness,.10,.35,.14);
     material.envMapIntensity=.86;
     material.attenuationDistance=clamp(material.attenuationDistance,2.5,8,4.5);
     if(material.attenuationColor.equals(new THREE.Color(0xffffff)))material.attenuationColor.setRGB(.45,.73,.91);
     material.side=THREE.FrontSide;material.depthWrite=false;material.transparent=false;material.opacity=1;
     if(internalFilm){
      // The outer body carries true transmission. A second equally reflective
      // nested shell made its cross section look like mechanical double wires.
      // Keep the inner dichroic film as a quiet surface, without another
      // transmissive solid competing with the real outside glass.
      material.transmission=0;material.thickness=.025;material.transparent=true;material.opacity=.055;
      material.clearcoat=.16;material.clearcoatRoughness=Math.max(material.clearcoatRoughness,.22);material.envMapIntensity=.16;
      material.iridescence=.28;material.iridescenceIOR=1.28;material.iridescenceThicknessRange=[180,360];
      material.userData.temV19InnerFilm=true;
     }
     material.userData.temV19Glass=true;
     if(!internalFilm){
      const previous=material.onBeforeCompile,key=material.customProgramCacheKey.call(material);
      material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat crystalFacing=clamp(abs(dot(normal,normalize(vViewPosition))),0.,1.);float crystalRim=pow(1.-crystalFacing,3.2);totalEmissiveRadiance+=mix(vec3(.12,.38,.64),vec3(.43,.23,.57),crystalRim)*crystalRim*.65;');};
      material.customProgramCacheKey=()=>key+'|tem-solid-crystal-grazing';
     }
    }else if(material.isMeshPhysicalMaterial){
     if(/floor/.test(semantic)){
      material.clearcoat=Math.min(material.clearcoat,.17);material.clearcoatRoughness=Math.max(material.clearcoatRoughness,.28);material.envMapIntensity=.30;material.specularIntensity=.23;
     }else if(/pearl|ceramic|porcelain/.test(`${node.name} ${material.name}`.toLowerCase())){
      material.clearcoat=clamp(material.clearcoat,.18,.52,.35);material.clearcoatRoughness=Math.max(material.clearcoatRoughness,.20);
     }
    }
    if(material.emissive)material.emissiveIntensity=Math.min(material.emissiveIntensity,1.15);
    if(!glass&&/t_identity_v19/.test(semantic)&&/emission|emissive/.test(semantic))material.emissiveIntensity=Math.min(material.emissiveIntensity,.42);
    if(material.aoMap)material.aoMapIntensity=Math.min(material.aoMapIntensity,.72);
    if(/v19 cloud/.test(semantic))bindCloudSurface(material,cloudTime);
    material.needsUpdate=true;return material;
   };
   node.material=Array.isArray(node.material)?node.material.map(configure):configure(node.material);
  });
 }
 function poseFor(identity){
  identity.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(identity,true),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),extras=identity.userData||{};
  return {center:finiteTriple(extras.identityCenter)?extras.identityCenter.slice():center.toArray(),
   yaw:clamp(extras.identityYaw,-Math.PI,Math.PI,-.28),
   width:clamp(extras.identityWidth,2,32,size.x),height:clamp(extras.identityHeight,2,32,size.y)};
 }
 function bindFloor(asset){
  asset.root.traverse(node=>{
   if(!node.isMesh||!(/floor_v19|floor_optical/i.test(`${node.name} ${Array.isArray(node.material)?node.material.map(m=>m.name).join(' '):node.material.name}`)))return;
   node.castShadow=false;
   // This authored floor has one material. A private clone also prevents a
   // shared trim using the same source from inheriting the mirror shader.
   if(!reflection||Array.isArray(node.material))return;
   const material=node.material.clone();privateMaterials.add(node.material);privateMaterials.add(material);node.material=material;
   const floorCompile=material.onBeforeCompile,floorKey=material.customProgramCacheKey.call(material);
   material.onBeforeCompile=function(shader,renderer){floorCompile.call(this,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=max(roughnessFactor,.31);').replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.directSpecular*=.65;reflectedLight.indirectSpecular*=.80;');};
   material.customProgramCacheKey=()=>floorKey+'|tem-floor-controlled-specular';
   reflection.bindSurface(node);floorMeshes.push(node);
  });
 }

 const loading=loadTemAsset({name:isCompact()?'observatoryV19Lod':'observatoryV19',canvas,onLoad:asset=>{
  if(disposed){disposePrivate(asset.root);return;}
  for(const name of semanticNames){const node=asset.find(name);if(!node){disposePrivate(asset.root);throw new Error(`V19 observatory is missing ${name}.`);}semanticRoots[name]=node;}
  // Materials cannot share reveal uniforms across independently retreating
  // identity/panel roots and the persistent cabin, even when Blender batches
  // their surfaces with the same source material.
  rememberMaterials(asset.root);
  for(const name of semanticNames){const materials=new Map();semanticRoots[name].traverse(node=>{if(!node.isMesh)return;const unique=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};node.material=Array.isArray(node.material)?node.material.map(unique):unique(node.material);});}
  rememberMaterials(asset.root);refineMaterials(asset);identityPose=poseFor(semanticRoots.T_IDENTITY_V19);
  bindFloor(asset);prepareReveal(asset.root,reveal,{complement:true});rememberMaterials(asset.root);
  // Identity and first panel have independent coverage. Cabin stays resident
  // during the entire four-chapter camera journey.
  for(const name of ['T_IDENTITY_V19','SURFACE_FRAME_V19']){
   semanticRoots[name].traverse(node=>{if(node.isMesh)node.castShadow=false;});
   prepareReveal(semanticRoots[name],identityReveal,{complement:true});
  }
  root.add(asset.root);model=asset;
  effects=createIdentityFlow(identityPose);effects.root.updateMatrix();effectAuthoredMatrix=effects.root.matrix.clone();root.add(effects.root);
  if(!externalCloud){cloudVolume=createObservatoryCloudVolume({camera,time:cloudTime});root.add(cloudVolume.root);}
  warm.position.set(identityPose.center[0]+8,identityPose.center[1]+5,identityPose.center[2]-6);
  cool.position.set(identityPose.center[0]-6,identityPose.center[1]+1,identityPose.center[2]+5);
  if(canvas){canvas.dataset.observatoryV19='ready';canvas.dataset.observatoryV19Floor=String(floorMeshes.length);canvas.dataset.observatoryV19Flow='gpu-layered-ribbons-and-condensing-path-motes';canvas.dataset.observatoryV19Cloud=externalCloud?'depth-integrated-cloud-sea':'world-space-noise-micro-surface';canvas.dataset.observatoryV19Lights='2-unshadowed';}
  adaptViewport();reflection?.invalidate();dispatchEvent(new Event('tem:scene-depth-change'));
 },onError:error=>{loadError=error?.message||String(error);if(canvas)canvas.dataset.observatoryV19='fallback';}});

 function adaptViewport(){
  if(!model||lastCompact===isCompact())return;
  lastCompact=isCompact();
  identityMatrix.identity();frameMatrix.identity();
  if(lastCompact){
   const c=identityPose.center;
   identityMatrix.makeTranslation(0,10.7,-8).multiply(new THREE.Matrix4().makeScale(.60,.60,.60))
    .multiply(new THREE.Matrix4().makeRotationY(-identityPose.yaw)).multiply(new THREE.Matrix4().makeTranslation(-c[0],-c[1],-c[2]));
   const original=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0,.12,-.045));
   frameMatrix.makeTranslation(0,-3.65,2).multiply(new THREE.Matrix4().makeScale(10.1/13*.97,13.2/11.2*.84,1))
    .multiply(original.invert()).multiply(new THREE.Matrix4().makeTranslation(8.3,-1.45,2));
  }
  for(const [node,matrix] of [[semanticRoots.T_IDENTITY_V19,identityMatrix],[semanticRoots.SURFACE_FRAME_V19,frameMatrix],[effects?.root,effectAuthoredMatrix?identityMatrix.clone().multiply(effectAuthoredMatrix):identityMatrix],[lightGroup,identityMatrix]]){
   if(!node)continue;node.matrixAutoUpdate=false;node.matrix.copy(matrix);node.updateMatrixWorld(true);
  }
  reflection?.invalidate();dispatchEvent(new Event('tem:scene-depth-change'));
 }
 function sceneAmount(frame){
  if(frame.opening)return frame.introFrame?.time>9?THREE.MathUtils.smoothstep(frame.introFrame.time,9,11.6):0;
  if(frame.step==='bridge')return 1;
  if(frame.step!=='captain')return 0;
  return 1;
 }
 return {root,loading,
  get ready(){return Boolean(model)&&!disposed;},get radianceObjects(){return effects?[effects.root]:[];},get roots(){return semanticRoots;},
  get replacementAmount(){return model&&!disposed?reveal.value:0;},
  setReveal(value=null,immediate=false){
   override=value===null?null:clamp(value,0,1,0);
   if(immediate&&model){reveal.value=override??target;root.visible=reveal.value>.001;reflection?.invalidate();}
  },
  update(dt,time,frame={},motion=1,quality=1){
   if(disposed)return;
   adaptViewport();target=model?(override??sceneAmount(frame)):0;
   // Navigation continues when effects are reduced or reading is paused. Its
   // discrete visibility updates, while light-flow phases remain frozen.
   reveal.value=motion?THREE.MathUtils.damp(reveal.value,target,7,clamp(dt,0,.1,0)):target;
   if(Math.abs(reveal.value-target)<.001)reveal.value=target;
   root.visible=reveal.value>.001;
   identityReveal.value=reveal.value*(frame.step==='captain'?1-THREE.MathUtils.smoothstep(clamp(Number(frame.archiveProgress),0,3,0),.25,.75):1);
   if(root.visible!==lastVisible){lastVisible=root.visible;reflection?.invalidate();}
   // A late GLB can arrive while the welcome camera and the host's shadow
   // cache are already resting. Publish its completed geometry once; otherwise
   // the first zero-coverage load notification could cache an empty shadow.
   if((reveal.value===0||reveal.value===1)&&reveal.value!==lastSettled){lastSettled=reveal.value;dispatchEvent(new Event('tem:scene-depth-change'));}
   if(motion){pointer.lerp(pointerTarget,1-Math.exp(-clamp(dt,0,.1,0)*4));pointerActivity*=Math.exp(-clamp(dt,0,.1,0)*2.1);}
   if(motion&&Number.isFinite(time))cloudTime.value=time;
   const volumeMode=!externalCloud&&Boolean(model)&&!isCompact()&&clamp(quality,0,1,1)>=.62;
   for(const item of cloudMeshes)item.mesh.visible=externalCloud||volumeMode?false:item.visible;
   cloudVolume?.update(reveal.value,volumeMode,quality);
   if(volumeMode!==lastCloudMode){lastCloudMode=volumeMode;reflection?.invalidate();if(model)dispatchEvent(new Event('tem:scene-depth-change'));if(canvas)canvas.dataset.observatoryV19Cloud=externalCloud?'depth-integrated-cloud-sea':volumeMode?'world-space-raymarched-cloud-sea':'physical-mesh-fallback';}
   const excitation=.48+pointerActivity*.45;
   warm.intensity=identityReveal.value*2.0;cool.intensity=identityReveal.value*1.25;
   effects?.update(time,identityReveal.value,excitation,pointer,motion);
   const value=reveal.value.toFixed(2);if(canvas&&value!==lastReveal){lastReveal=value;canvas.dataset.observatoryV19Reveal=value;}
  },
  state(){return {ready:Boolean(model)&&!disposed,visible:root.visible,reveal:reveal.value,target,replacementAmount:model&&!disposed?reveal.value:0,roots:Object.keys(semanticRoots),identity:identityPose,floorBound:floorMeshes.length,flowDrawCalls:effects?2:0,cloudMode:externalCloud?'depth-integrated':lastCloudMode?'bounded-volume':'physical-mesh',cloudMeshCount:cloudMeshes.length,cloudVolumeSteps:cloudVolume?.steps||0,lightCount:2,shadowLights:0,textureStats:model?.textureStats||null,error:loadError};},
  dispose(){
   if(disposed)return;disposed=true;root.visible=false;floorMeshes.forEach(mesh=>{mesh.visible=false;});root.removeFromParent();
   removeEventListener('pointermove',onPointer);removeEventListener('pointerout',onPointerOut);
   effects?.dispose();cloudVolume?.dispose();if(model)disposePrivate(model.root);reflection?.invalidate();
  }
 };
}

function createObservatoryCloudVolume({camera,time}){
 // The same exterior region as the authored lower sea and cumulus groups.
 // Its front surface only supplies ray entry/depth testing; density has soft
 // margins on all six sides, so the proxy never becomes a visible box.
 const center=new THREE.Vector3(0,-39,-403);
 const uniforms={uCloudTime:time,uCloudReveal:{value:0},uVolumeSteps:{value:32},
  uLocalEye:{value:new THREE.Vector3()},uCloudCenter:{value:center.clone()},
  uCloudBoxMin:{value:new THREE.Vector3(-450,-26,-317)},uCloudBoxMax:{value:new THREE.Vector3(450,26,317)},
  uCloudSun:{value:new THREE.Vector3(.48,.19,-.84).normalize()}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,side:THREE.FrontSide,toneMapped:false,
  vertexShader:`varying vec3 vCloudLocal;void main(){vCloudLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 vCloudLocal;uniform float uCloudTime,uCloudReveal,uVolumeSteps;
   uniform vec3 uLocalEye,uCloudCenter,uCloudBoxMin,uCloudBoxMax,uCloudSun;
   float seaHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float seaNoise(vec3 p){
    vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(seaHash(i),seaHash(i+vec3(1,0,0)),f.x),mix(seaHash(i+vec3(0,1,0)),seaHash(i+vec3(1,1,0)),f.x),f.y),
     mix(mix(seaHash(i+vec3(0,0,1)),seaHash(i+vec3(1,0,1)),f.x),mix(seaHash(i+vec3(0,1,1)),seaHash(i+vec3(1,1,1)),f.x),f.y),f.z);
   }
   float seaEnvelope(vec3 w){
    float side=1.-smoothstep(365.,450.,abs(w.x));
    float nearMargin=1.-smoothstep(-117.,-86.,w.z),farMargin=smoothstep(-720.,-620.,w.z);
    float bottom=smoothstep(-65.,-53.,w.y),top=1.-smoothstep(-23.,-13.,w.y);
    return clamp(side*nearMargin*farMargin*bottom*top,0.,1.);
   }
   float seaDensity(vec3 w,bool fine){
    float envelope=seaEnvelope(w);if(envelope<.0001)return 0.;
    vec3 drift=vec3(.22,.012,.10)*uCloudTime;
    vec3 p=(w+drift)*vec3(.023,.047,.023);
    float broad=seaNoise(p+vec3(1.7,4.9,8.1)),shoulder=seaNoise(p*2.03+vec3(8.2,1.8,3.4));
    float detail=.5;if(fine)detail=seaNoise(p*4.07+vec3(3.2,9.7,1.3));
    float structure=broad*.59+shoulder*.28+detail*.13;
    // A connected sea falls with distance. Spatial erosion creates irregular
    // transparent shoulders rather than a collection of solid white spheres.
    float distance=max(0.,-w.z-85.);
    float weather=clamp(.50+.23*sin(w.x*.014+w.z*.008)+.20*cos(w.z*.013-w.x*.006),0.,1.);
    float top=-44.-distance*.027+weather*14.+sin(w.x*.023+w.z*.009)*2.;
    float threshold=mix(.22,.74,smoothstep(-24.,8.,w.y-top));
    float porous=smoothstep(threshold,threshold+.19,structure);
    return clamp(porous*envelope*(.72+weather*.28),0.,1.);
   }
   float seaSunVisibility(vec3 w){
    float opticalDepth=0.;
    // A cheaper two-scale density is adequate along the light ray. This
    // four-sample result is reused for the next eight primary march samples.
    for(int j=0;j<4;j++)opticalDepth+=seaDensity(w+uCloudSun*(7.+float(j)*9.),false)*9.*.048;
    return exp(-clamp(opticalDepth,0.,8.));
   }
   void main(){
    if(uCloudReveal<.001)discard;
    vec3 delta=vCloudLocal-uLocalEye;float rayLength=length(delta);if(rayLength<.00001)discard;
    vec3 ray=delta/rayLength;
    vec3 safeRay=mix(vec3(-1.),vec3(1.),step(vec3(0.),ray))*max(abs(ray),vec3(.00001));
    vec3 lo=(uCloudBoxMin-uLocalEye)/safeRay,hi=(uCloudBoxMax-uLocalEye)/safeRay;
    vec3 entry3=min(lo,hi),exit3=max(lo,hi);
    float entry=max(0.,max(max(entry3.x,entry3.y),entry3.z)),exit=min(min(exit3.x,exit3.y),exit3.z);
    if(exit<=entry)discard;
    float count=clamp(uVolumeSteps,8.,32.),stepLength=(exit-entry)/count;
    // Stable per-pixel stratification reduces bands without a time-varying
    // jitter pattern. Motion and the camera provide actual world parallax.
    float jitter=.28+seaHash(vec3(floor(gl_FragCoord.xy),11.3))*.44;
    float cosine=clamp(dot(ray,uCloudSun),-1.,1.),g=.28;
    float phase=(1.-g*g)/(12.5663706*pow(max(1.+g*g-2.*g*cosine,.001),1.5));
    float transmission=1.,sun=1.;bool sampledSun=false;vec3 accumulated=vec3(0.);
    for(int i=0;i<32;i++){
     if(float(i)>=count||transmission<.018)break;
     vec3 world=uCloudCenter+uLocalEye+ray*(entry+(float(i)+jitter)*stepLength);
     float density=seaDensity(world,true);if(density<.001)continue;
     if(!sampledSun||mod(float(i),8.)<.5){sun=seaSunVisibility(world);sampledSun=true;}
     float skyEscape=clamp((world.y+65.)/52.,0.,1.);
     vec3 sky=vec3(.21,.30,.44)*(.62+skyEscape*.55);
     vec3 sunlight=vec3(.91,.69,.46)*sun*(.28+phase*3.6);
     vec3 source=clamp(sky+sunlight,vec3(0.),vec3(2.8));
     float alpha=1.-exp(-density*stepLength*.055);
     accumulated+=transmission*alpha*source;transmission*=1.-alpha;
    }
    float alpha=clamp(1.-transmission,0.,.975);if(alpha<.002)discard;
    vec3 color=clamp(accumulated/max(1.-transmission,.0001),vec3(0.),vec3(2.8));
    gl_FragColor=vec4(color,min(alpha,.96)*clamp(uCloudReveal,0.,1.));
   }`});
 const geometry=new THREE.BoxGeometry(900,52,634),root=new THREE.Mesh(geometry,material);
 root.name='Tem.observatory.v19.world-cloud-volume';root.position.copy(center);root.renderOrder=-10;root.castShadow=root.receiveShadow=false;root.visible=false;root.userData.dynamic=true;
 const inverse=new THREE.Matrix4();
 return {root,get steps(){return uniforms.uVolumeSteps.value;},update(reveal,enabled,quality){
   uniforms.uCloudReveal.value=clamp(reveal,0,1,0);uniforms.uVolumeSteps.value=clamp(quality,0,1,1)>.82?32:28;
   root.visible=enabled&&uniforms.uCloudReveal.value>.001;if(!root.visible)return;
   root.updateWorldMatrix(true,false);inverse.copy(root.matrixWorld).invert();
   camera.getWorldPosition(uniforms.uLocalEye.value).applyMatrix4(inverse);root.getWorldPosition(uniforms.uCloudCenter.value);
  },dispose(){root.removeFromParent();geometry.dispose();material.dispose();}};
}

function bindCloudSurface(material,time){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey.call(material);
 material.metalness=0;if(!material.roughnessMap)material.roughness=.99;
 if(material.isMeshPhysicalMaterial){material.clearcoat=0;material.specularIntensity=.10;}
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);shader.uniforms.uTemV19CloudTime=time;
  shader.vertexShader=`varying vec3 vTemV19CloudWorld;\n${shader.vertexShader}`
   .replace('#include <begin_vertex>','#include <begin_vertex>\nvTemV19CloudWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=`uniform float uTemV19CloudTime;varying vec3 vTemV19CloudWorld;
   float v19CloudHash(vec3 p){p=fract(p*vec3(.1031,.11369,.13787));p+=dot(p,p.yzx+19.19);return fract((p.x+p.y)*p.z);}
   // Value and analytic derivative share eight lattice samples. Three small
   // noise evaluations replace repeated finite-difference surface sampling.
   vec4 v19CloudNoise(vec3 p){
    vec3 i=floor(p),f=fract(p),u=f*f*(3.-2.*f),du=6.*f*(1.-f);
    float a=v19CloudHash(i),b=v19CloudHash(i+vec3(1,0,0)),c=v19CloudHash(i+vec3(0,1,0)),d=v19CloudHash(i+vec3(1,1,0));
    float e=v19CloudHash(i+vec3(0,0,1)),f1=v19CloudHash(i+vec3(1,0,1)),g=v19CloudHash(i+vec3(0,1,1)),h=v19CloudHash(i+vec3(1,1,1));
    float low=mix(mix(a,b,u.x),mix(c,d,u.x),u.y),high=mix(mix(e,f1,u.x),mix(g,h,u.x),u.y);
    vec3 gradient=vec3(du.x*mix(mix(b-a,d-c,u.y),mix(f1-e,h-g,u.y),u.z),du.y*mix(mix(c-a,d-b,u.x),mix(g-e,h-f1,u.x),u.z),du.z*(high-low));
    return vec4(mix(low,high,u.z),gradient);
   }
   ${shader.fragmentShader}`
   .replace('#include <color_fragment>',`#include <color_fragment>
    vec3 v19CloudDrift=vec3(.007,-.002,.004)*uTemV19CloudTime;
    float v19CloudBody=v19CloudNoise(vTemV19CloudWorld*.034+v19CloudDrift).x;
    float v19CloudShoulder=v19CloudNoise(vTemV19CloudWorld*.079-v19CloudDrift*.63+vec3(8.1,4.7,2.3)).x;
    float v19CloudShade=mix(.72,1.12,v19CloudBody*.67+v19CloudShoulder*.33);
    // This remains diffuse cloud reflectance under the actual sun. No baked
    // shadow, camera-facing texture or self-lit white surface replaces it.
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.68,.72,.79),.18)*v19CloudShade;`)
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec3 v19CloudGradient=(viewMatrix*vec4(v19CloudNoise(vTemV19CloudWorld*.19+v19CloudDrift*.74).yzw,0.)).xyz;
    vec3 v19CloudTangent=v19CloudGradient-normal*dot(normal,v19CloudGradient);
    float v19CloudFilter=1.-smoothstep(.045,.32,length(fwidth(vTemV19CloudWorld))*.19);
    normal=normalize(normal-v19CloudTangent*(.12*v19CloudFilter));`);
 };
 material.customProgramCacheKey=()=>key+'|tem-v19-cloud-world-micro-surface';material.needsUpdate=true;
}

// The paths live inside and around the real glass T. Every strip and particle
// is built once; travelling highlights and motes use only GPU uniform updates.
function createIdentityFlow(pose){
 const root=new THREE.Group();root.name='Tem.observatory.v19.identity-energy';root.position.fromArray(pose.center);root.rotation.y=pose.yaw;
 const w=pose.width,h=pose.height;
 const controls=[
  [[-.018*w,-.42*h,.05],[-.028*w,-.15*h,.14],[.022*w,.07*h,.06],[0,.30*h,.12]],
  [[-.44*w,.355*h,.03],[-.18*w,.39*h,.12],[.19*w,.335*h,.12],[.44*w,.36*h,.02]],
  [[-.65*w,-.12*h,1.8],[.10*w,-.20*h,7.6],[.90*w,.12*h,1.7],[.56*w,.38*h,-4.5]],
  [[-.53*w,.35*h,-2.8],[-.30*w,.57*h,-4.4],[.72*w,.34*h,3.3],[.58*w,-.09*h,4.4]]
 ];
 const uniforms={uTime:{value:0},uReveal:{value:0},uExcitation:{value:.48},uPointer:{value:new THREE.Vector2()},uHeight:{value:Math.max(1,innerHeight)}};
 const positions=[],uvs=[],pathIds=[],layerIds=[],sideVectors=[],indices=[],segments=100;
 // A real strip has a readable front-facing width. The earlier Y-oriented
 // reference turned the horizontal crossbar into an almost edge-on blade.
 const reference=new THREE.Vector3(.08,.03,1),side=new THREE.Vector3();
 const curves=controls.map(points=>new THREE.CubicBezierCurve3(...points.map(p=>new THREE.Vector3(...p))));
 curves.forEach((curve,index)=>{
  // All three geometric widths live in one draw: broad soft radiance,
  // translucent silk and a narrow, high-radiance travelling core.
  for(const layer of [0,1,2]){
   const start=positions.length/3,breadth=[index<2?.66:.90,index<2?.24:.33,.053][layer];
   for(let i=0;i<=segments;i++){
    const t=i/segments,p=curve.getPoint(t),tangent=curve.getTangent(t);
    side.crossVectors(tangent,reference);if(side.lengthSq()<.0001)side.crossVectors(tangent,new THREE.Vector3(0,1,0));side.normalize();
    for(const sign of [-1,1]){const q=p.clone().addScaledVector(side,sign*breadth);q.z+=layer*.015;positions.push(...q.toArray());uvs.push(t,sign<0?0:1);pathIds.push(index);layerIds.push(layer);sideVectors.push(...side.toArray());}
    if(i<segments){const j=start+i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
   }
  }
 });
 const stripGeometry=new THREE.BufferGeometry();stripGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));stripGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));stripGeometry.setAttribute('aPath',new THREE.Float32BufferAttribute(pathIds,1));stripGeometry.setAttribute('aLayer',new THREE.Float32BufferAttribute(layerIds,1));stripGeometry.setAttribute('aSide',new THREE.Float32BufferAttribute(sideVectors,3));stripGeometry.setIndex(indices);stripGeometry.computeBoundingSphere();
 // The existing OutputPass applies ACES once to the entire HDR scene. Keep
 // these bounded linear radiances in that same chain, rather than tone-mapping
 // each filament before the scene's existing bloom can see its small core.
 const stripMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:`attribute float aPath,aLayer;attribute vec3 aSide;uniform float uTime;uniform vec2 uPointer;varying vec2 vUv;varying float vPath,vLayer;
   void main(){vUv=uv;vPath=aPath;vLayer=aLayer;
    float head=fract(uTime*.043+aPath*.193+uPointer.x*.026),distance=fract(uv.x-head+.5)-.5;
    float packet=exp(-distance*distance*230.),layerMove=(1.-step(1.5,aLayer))*.050;
    vec3 p=position+aSide*(sin(uv.x*13.+aPath*2.1-uTime*.17)*layerMove+packet*(uv.y-.5)*.18);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
   }`,
  fragmentShader:`uniform float uTime,uReveal,uExcitation;uniform vec2 uPointer;varying vec2 vUv;varying float vPath,vLayer;
   void main(){
    float side=vUv.y*2.-1.,crossLight=exp(-side*side*4.8),edge=1.-smoothstep(.58,1.,abs(side));
    float head=fract(uTime*.043+vPath*.193+uPointer.x*.026),distance=fract(vUv.x-head+.5)-.5;
    float tailDistance=fract(vUv.x-head+.40+.5)-.5;
    float packet=exp(-distance*distance*230.)+exp(-tailDistance*tailDistance*390.)*.34;
    float silk=.60+.40*sin(vUv.x*25.+side*3.1-uTime*.21+vPath);
    float fade=smoothstep(0.,.030,vUv.x)*(1.-smoothstep(.94,1.,vUv.x));
    vec3 tint=mix(vec3(.24,.61,.96),vec3(.69,.40,.96),.36+.27*sin(vUv.x*6.+vPath*1.7));
    tint=mix(tint,vec3(.99,.73,.53),clamp(packet*.27,0.,.34));
    float alpha,radiance;
    if(vLayer<.5){alpha=crossLight*(.070+packet*.10+uExcitation*.028);radiance=1.20+packet*.90;}
    else if(vLayer<1.5){alpha=crossLight*edge*(.19+silk*.065+packet*.24+uExcitation*.08);radiance=1.45+packet*2.10;}
    else{alpha=crossLight*(.43+packet*.12);radiance=1.25+packet*1.30+uExcitation*.18;tint=mix(tint,vec3(.66,.87,1.),.17+clamp(packet*.17,0.,.17));}
    gl_FragColor=vec4(clamp(tint*radiance,vec3(0.),vec3(8.)),clamp(alpha*fade*uReveal,0.,.94));
   }`});
 const strips=new THREE.Mesh(stripGeometry,stripMaterial);strips.name='Tem.v19.four-three-layer-energy-filaments';strips.castShadow=false;root.add(strips);
 let seed=190619;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const count=320,motePositions=[],moteSeeds=[],motePaths=[],pointAttributes=Array.from({length:4},()=>[]);
 for(let i=0;i<count;i++){
  const path=i%controls.length,phase=random(),jitter=random(),tint=random();moteSeeds.push(phase,jitter,tint);motePaths.push(path);
  motePositions.push(...curves[path].getPoint(phase).toArray());controls[path].forEach((p,index)=>pointAttributes[index].push(...p));
 }
 const moteGeometry=new THREE.BufferGeometry();moteGeometry.setAttribute('position',new THREE.Float32BufferAttribute(motePositions,3));moteGeometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(moteSeeds,3));moteGeometry.setAttribute('aPath',new THREE.Float32BufferAttribute(motePaths,1));
 pointAttributes.forEach((values,index)=>moteGeometry.setAttribute(`aP${index}`,new THREE.Float32BufferAttribute(values,3)));
 moteGeometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),Math.hypot(w,h)*.9);
 const moteMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:`attribute vec3 aSeed,aP0,aP1,aP2,aP3;attribute float aPath;uniform float uTime,uReveal,uExcitation,uHeight;uniform vec2 uPointer;varying float vAlpha,vTint,vPacket;
   void main(){
    float base=fract(aSeed.x+uTime*(.029+aSeed.y*.010)+uPointer.y*.006);
    float head=fract(uTime*.043+aPath*.193+uPointer.x*.026),distance=fract(base-head+.5)-.5;
    float capture=exp(-distance*distance*42.),t=fract(head+distance*(1.-capture*.62)),q=1.-t;
    vec3 p=q*q*q*aP0+3.*q*q*t*aP1+3.*q*t*t*aP2+t*t*t*aP3;
    p+=vec3(sin(aSeed.y*19.+uTime*.23),cos(aSeed.y*23.+uTime*.21),sin(aSeed.x*17.-uTime*.19))*(.14+aSeed.y*.27)*(1.-capture*.76);
    vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp(uHeight*(.045+pow(clamp(aSeed.y,0.,1.),10.)*.15+capture*.075)/max(1.,-mv.z),1.,7.5);
    vAlpha=(.31+aSeed.y*.40+capture*.32+uExcitation*.13)*uReveal*smoothstep(0.,.05,t)*(1.-smoothstep(.95,1.,t))*smoothstep(1.,4.,-mv.z);vTint=aSeed.z;vPacket=capture;
   }`,
  fragmentShader:`varying float vAlpha,vTint,vPacket;void main(){vec2 p=gl_PointCoord-.5;float radius=length(p);if(radius>.5)discard;vec3 tint=mix(vec3(.43,.73,.99),vec3(.91,.65,.96),vTint*.61);tint=mix(tint,vec3(.92,.94,1.),vPacket*.35);float glow=exp(-radius*radius*32.);gl_FragColor=vec4(tint*(1.75+vPacket*2.10),clamp(glow*vAlpha,0.,.88));}`});
 const motes=new THREE.Points(moteGeometry,moteMaterial);motes.name='Tem.v19.travelling-path-motes';motes.castShadow=false;root.add(motes);
 root.traverse(node=>{if(node.isMesh||node.isPoints)node.userData.dynamic=true;});
 return {root,update(time,reveal,excitation,pointer,motion){if(motion&&Number.isFinite(time))uniforms.uTime.value=time;uniforms.uReveal.value=clamp(reveal,0,1,0);uniforms.uExcitation.value=clamp(excitation,0,1,.48);if(motion)uniforms.uPointer.value.copy(pointer);uniforms.uHeight.value=Math.max(1,innerHeight);},
  dispose(){stripGeometry.dispose();stripMaterial.dispose();moteGeometry.dispose();moteMaterial.dispose();root.removeFromParent();}};
}
