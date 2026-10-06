import * as THREE from 'three';
import {Reflector} from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/objects/Reflector.js';

// One low-resolution mirror shared by the continuous deck. It reflects actual
// world geometry, never the DOM or a second copy of the polished floor.
export function createPlanarReflection({renderer,scene,camera,canvas,planeY=-5.32,size=640}){
 const mirror=new Reflector(new THREE.PlaneGeometry(160,160),{textureWidth:size,textureHeight:Math.round(size*.625),clipBias:.003,multisample:0});
 mirror.rotation.x=-Math.PI/2;mirror.position.y=planeY;mirror.updateMatrixWorld(true);
 const textureMatrix=new THREE.Matrix4(),inverse=new THREE.Matrix4().copy(mirror.matrixWorld).invert();
 const uniforms={uTemMirror:{value:mirror.getRenderTarget().texture},uTemMirrorMatrix:{value:textureMatrix},uTemMirrorSize:{value:new THREE.Vector2(size,Math.round(size*.625))},uTemMirrorStrength:{value:.36}};
 const surfaces=new Set(),thinGlass=new WeakMap(),thinMaterials=new Set();let dirty=true,lastCapture=-Infinity,captures=0,hasPose=false;
 const capturedPosition=new THREE.Vector3(),capturedRotation=new THREE.Quaternion(),capturedProjection=new THREE.Matrix4();
 const cameraWorld=new THREE.Vector3(),cameraRotation=new THREE.Quaternion(),savedViewport=new THREE.Vector4();
 function bindSurface(mesh){
  surfaces.add(mesh);mesh.userData.temMirrorFloor=true;
  const material=mesh.material,previous=material.onBeforeCompile,key=material.customProgramCacheKey.call(material);
  material.onBeforeCompile=function(shader,r){
   previous.call(this,shader,r);Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='uniform mat4 uTemMirrorMatrix;varying vec4 vTemMirror;varying vec3 vTemFloorWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    vec4 temFloorWorld=modelMatrix*vec4(transformed,1.);vTemFloorWorld=temFloorWorld.xyz;vTemMirror=uTemMirrorMatrix*temFloorWorld;`);
   shader.fragmentShader='uniform sampler2D uTemMirror;uniform vec2 uTemMirrorSize;uniform float uTemMirrorStrength;varying vec4 vTemMirror;varying vec3 vTemFloorWorld;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    vec3 mirrorNormal=inverseTransformDirection(normal,viewMatrix);
    if(any(notEqual(mirrorNormal,mirrorNormal))||dot(mirrorNormal,mirrorNormal)<.0001)mirrorNormal=vec3(0.,1.,0.);
    // A grazing archive camera can put a projected floor point on/behind the
    // virtual camera plane. Never feed an infinite UV to the HDR bloom chain.
    vec2 projectedMirrorUV=vTemMirror.xy/max(vTemMirror.w,.0001)+mirrorNormal.xz*.006;
    vec2 mirrorUV=clamp(projectedMirrorUV,vec2(.001),vec2(.999));
    vec2 mirrorPixel=(1.+roughnessFactor*6.)/uTemMirrorSize;
    vec3 reflection=texture2D(uTemMirror,mirrorUV).rgb*.40;
    reflection+=texture2D(uTemMirror,mirrorUV+vec2(mirrorPixel.x,0.)).rgb*.15;
    reflection+=texture2D(uTemMirror,mirrorUV-vec2(mirrorPixel.x,0.)).rgb*.15;
    reflection+=texture2D(uTemMirror,mirrorUV+vec2(0.,mirrorPixel.y)).rgb*.15;
    reflection+=texture2D(uTemMirror,mirrorUV-vec2(0.,mirrorPixel.y)).rgb*.15;
    float grazing=1.-abs(dot(normalize(cameraPosition-vTemFloorWorld),mirrorNormal));
    if(any(notEqual(reflection,reflection)))reflection=vec3(0.);
    reflection=clamp(reflection,vec3(0.),vec3(64.));
    float inFrame=step(.0001,vTemMirror.w)*step(0.,projectedMirrorUV.x)*step(projectedMirrorUV.x,1.)*step(0.,projectedMirrorUV.y)*step(projectedMirrorUV.y,1.);
    if(any(notEqual(outgoingLight,outgoingLight)))outgoingLight=vec3(.012,.025,.045);
    outgoingLight=clamp(outgoingLight,vec3(0.),vec3(64.));
    outgoingLight=mix(outgoingLight,reflection*vec3(.90,.94,.99),uTemMirrorStrength*(.20+.80*pow(grazing,2.))*(1.-roughnessFactor*.36)*inFrame);
    #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>key+'|tem-planar-reflection-baked-surface';material.needsUpdate=true;dirty=true;
 }
 function visible(mesh){for(let node=mesh;node;node=node.parent)if(!node.visible)return false;return true;}
 function update(time,frame,motion){
  if(!surfaces.size||![...surfaces].some(visible))return;
  camera.getWorldPosition(cameraWorld);camera.getWorldQuaternion(cameraRotation);
  // Pointer parallax, manual orbit, lens changes and travel all move the real
  // camera even when the chapter rail is still. Compare against the last capture.
  const poseChanged=!hasPose||cameraWorld.distanceToSquared(capturedPosition)>.000225||cameraRotation.angleTo(capturedRotation)>.001;
  const lensChanged=!hasPose||camera.projectionMatrix.elements.some((value,index)=>Math.abs(value-capturedProjection.elements[index])>.00001);
  const moving=frame.archiveMoving||frame.opening||poseChanged||lensChanged,interval=innerWidth<701?(moving?1/8:1/4):moving?1/20:1/8;
  // A deliberate discrete camera/quality change gets one correct still when
  // motion is reduced; reading holds and pointer input do not advance its clock.
  if(!dirty&&(!motion&&!poseChanged&&!lensChanged||motion&&time-lastCapture<interval-.0001))return;
  const hidden=[],swaps=[],eyes=new Map(),volumeSteps=new Map();
  for(const floor of surfaces){hidden.push([floor,floor.visible]);floor.visible=false;}
  scene.traverse(mesh=>{
   for(const name of ['uLocalEye','uCameraCloud']){
    const eye=mesh.material?.uniforms?.[name];
    if(!eye||eyes.has(eye))continue;
    eyes.set(eye,eye.value.clone());mesh.updateWorldMatrix(true,false);eye.value.copy(cameraWorld);eye.value.y=2*planeY-eye.value.y;eye.value.applyMatrix4(new THREE.Matrix4().copy(mesh.matrixWorld).invert());
   }
   const steps=mesh.material?.uniforms?.uVolumeSteps;
   if(steps&&Number.isFinite(steps.value)&&steps.value>8&&!volumeSteps.has(steps)){volumeSteps.set(steps,steps.value);steps.value=8;}
   if(!mesh.isMesh||Array.isArray(mesh.material)||!(mesh.material.transmission>0))return;
   // Avoid r161's full-resolution transmission capture inside this small pass.
   const original=mesh.material;let thin=thinGlass.get(original);
   if(!thin){
    thin=original.clone();thin.transmission=0;thin.transparent=true;thin.opacity=.16;thin.depthWrite=false;
    // Material.clone omits the authored reveal hook. Keep that shared coverage
    // so a reflected identity cannot appear before its actual arrival.
    thin.onBeforeCompile=original.onBeforeCompile;thin.customProgramCacheKey=()=>original.customProgramCacheKey()+'|tem-mirror-thin';
    thinGlass.set(original,thin);thinMaterials.add(thin);
   }
   swaps.push([mesh,original]);mesh.material=thin;
  });
  const shadowPending=renderer.shadowMap.needsUpdate,shadowAutomatic=renderer.shadowMap.autoUpdate,xrEnabled=renderer.xr.enabled;
  const previousTarget=renderer.getRenderTarget();renderer.getViewport(savedViewport);
  try{
   // r161 Reflector disables autoUpdate but leaves needsUpdate untouched. A
   // queued key shadow belongs to the full, restored main scene, exactly once.
   renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
   mirror.onBeforeRender(renderer,scene,camera);textureMatrix.copy(mirror.material.uniforms.textureMatrix.value).multiply(inverse);
   lastCapture=time;dirty=false;captures++;hasPose=true;capturedPosition.copy(cameraWorld);capturedRotation.copy(cameraRotation);capturedProjection.copy(camera.projectionMatrix);
  }finally{
   renderer.shadowMap.autoUpdate=shadowAutomatic;renderer.shadowMap.needsUpdate=shadowPending;renderer.xr.enabled=xrEnabled;
   renderer.setRenderTarget(previousTarget);renderer.setViewport(savedViewport);
   for(const [eye,original] of eyes)eye.value.copy(original);for(const [steps,original] of volumeSteps)steps.value=original;for(const [mesh,material] of swaps)mesh.material=material;for(const [mesh,wasVisible] of hidden)mesh.visible=wasVisible;
  }
  canvas.dataset.floorReflection='world-planar-'+size;canvas.dataset.reflectionCaptures=String(captures);canvas.dataset.reflectionPhase=time.toFixed(2);
  canvas.dataset.reflectionRate=String(Math.round(1/interval));canvas.dataset.reflectionMotion=motion?(moving?'camera-or-scene':'cached-still'):'discrete-still';canvas.dataset.reflectionShadow='deferred-to-main-scene';
 }
 return {bindSurface,update,invalidate(){dirty=true;},dispose(){mirror.getRenderTarget().dispose();mirror.geometry.dispose();mirror.material.dispose();thinMaterials.forEach(material=>material.dispose());thinMaterials.clear();surfaces.clear();},uniforms};
}
