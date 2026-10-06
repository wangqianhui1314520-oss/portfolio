import * as THREE from 'three';
import { stellarSunDirection, normalizeStellarLayout } from './immersive-world-layout.js?v=cinematic-v21.1';
import { publishOpticalRadiance } from './immersive-optical.js?v=cinematic-v21.1';
import { createStellarDensityAtlas, stellarDensityGLSL, stellarLightSourceGLSL, stellarPointerGLSL, stellarProbeGLSL, stellarVolumeUniformNames, createRadianceCapturePolicy } from './immersive-volume-field.js?v=cinematic-v21.1';

// Blender's sun, the volume scattering and physical surfaces share one source.
export const cinematicLighting=Object.freeze({
 keyDirection:stellarSunDirection,rimDirection:Object.freeze([.72,.14,-.68]),
 keyColor:0xffdfb8,rimColor:0x7dc8e6
});

// The lighting cube is rendered from linear radiance and optional real emissive
// geometry and finite 3D volume. It has no photograph input; full/low captures
// are limited to once per 12/24 s, with explicit layout invalidation allowed.
export function createCinematicEnvironment({renderer}){
 if(!renderer)throw new Error('Cinematic environment requires its WebGL renderer.');
 const scene=new THREE.Scene(),generator=new THREE.PMREMGenerator(renderer),policy=createRadianceCapturePolicy();
 let fallbackAtlas=createStellarDensityAtlas(THREE);const initial=normalizeStellarLayout();
 const volumeUniforms={uAtlas:{value:fallbackAtlas},uTime:{value:0},uDensity:{value:.88},uDetail:{value:1},uSeaReveal:{value:1},uPulse:{value:0},
  uCenters:{value:initial.volumeRegions.map(r=>new THREE.Vector3(...r.center))},uRadii:{value:initial.volumeRegions.map(r=>new THREE.Vector3(...r.radius))},uColors:{value:initial.volumeRegions.map(r=>new THREE.Color().setRGB(...r.color))},
  uSeeds:{value:initial.volumeRegions.map(r=>r.seed)},uExtinction:{value:initial.volumeRegions.map(r=>r.density)},uFlows:{value:initial.volumeRegions.map(r=>new THREE.Vector3(...r.flow))},uSun:{value:new THREE.Vector3(...initial.sunDirection)},
  uPointerOrigin:{value:new THREE.Vector3()},uPointerDirection:{value:new THREE.Vector3(0,0,-1)},uPointerPower:{value:0},uPointerSpeed:{value:0}};
 const basis=(direction,longAxis)=>{
  const center=new THREE.Vector3(...direction).normalize(),tangent=new THREE.Vector3(...longAxis);
  tangent.addScaledVector(center,-tangent.dot(center)).normalize();
  return {center,tangent,bitangent:new THREE.Vector3().crossVectors(center,tangent).normalize()};
 };
 const key=basis(cinematicLighting.keyDirection,[.78,.61,.10]);
 const rim=basis(cinematicLighting.rimDirection,[0,1,0]);
 const ceiling=basis([-.15,.97,-.18],[1,.10,0]);
 const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthTest:false,depthWrite:false,blending:THREE.NoBlending,toneMapped:false,
  uniforms:{...volumeUniforms,uRadianceSteps:{value:12},uVolumeReady:{value:1},uProbeOrigin:{value:new THREE.Vector3(0,1,-27)},uKey:{value:key.center},uKeyTangent:{value:key.tangent},uKeyBitangent:{value:key.bitangent},uKeyColor:{value:new THREE.Color(cinematicLighting.keyColor)},
   uRim:{value:rim.center},uRimTangent:{value:rim.tangent},uRimBitangent:{value:rim.bitangent},uRimColor:{value:new THREE.Color(cinematicLighting.rimColor)},
   uCeiling:{value:ceiling.center},uCeilingTangent:{value:ceiling.tangent},uCeilingBitangent:{value:ceiling.bitangent}},
  vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 vDirection;
   uniform sampler2D uAtlas;uniform float uTime,uDensity,uDetail,uSeaReveal,uPulse,uRadianceSteps,uVolumeReady,uPointerPower,uPointerSpeed;
   uniform vec3 uCenters[6],uRadii[6],uColors[6],uFlows[6],uSun,uProbeOrigin,uPointerOrigin,uPointerDirection;uniform float uSeeds[6],uExtinction[6];
   ${stellarDensityGLSL}
   ${stellarPointerGLSL}
   ${stellarLightSourceGLSL}
   ${stellarProbeGLSL}
   uniform vec3 uKey,uKeyTangent,uKeyBitangent,uKeyColor,uRim,uRimTangent,uRimBitangent,uRimColor,uCeiling,uCeilingTangent,uCeilingBitangent;
   float card(vec3 d,vec3 center,vec3 tangent,vec3 bitangent,vec2 extent){
    float toward=dot(d,center);vec2 p=vec2(dot(d,tangent),dot(d,bitangent))/max(toward,.01);
    vec2 edge=1.-smoothstep(extent*.78,extent*1.12,abs(p));
    return edge.x*edge.y*smoothstep(.01,.12,toward);
   }
   void main(){vec3 d=normalize(vDirection-uProbeOrigin);float up=clamp(d.y*.5+.5,0.,1.);
    vec3 radiance=mix(vec3(.003,.006,.013),vec3(.010,.019,.029),up);
    float warm=card(d,uKey,uKeyTangent,uKeyBitangent,vec2(.22,.048));
    float cool=card(d,uRim,uRimTangent,uRimBitangent,vec2(.29,.046));
    float pearl=card(d,uCeiling,uCeilingTangent,uCeilingBitangent,vec2(.40,.16));
    radiance+=uKeyColor*warm*2.2+uRimColor*cool*1.5+vec3(.72,.82,.94)*pearl*.18;
    if(uVolumeReady>.5)radiance+=stellarProbeRadiance(d)*.68;
    gl_FragColor=vec4(radiance,1.);
   }`
 });
 const geometry=new THREE.SphereGeometry(18000,24,12),sphere=new THREE.Mesh(geometry,material);
 sphere.name='Tem.cinematic.analytic-HDR-lightstage';sphere.frustumCulled=false;scene.add(sphere);
 const emissions=new THREE.Group();scene.add(emissions);let pairs=[],target,released=false,cubeTarget=null,cubeCamera=null,cubeSize=0,captures=0,cpuMs=0;
 function capture({time=0,quality=1}={}){
  const edge=quality<.75?64:128;
  if(edge!==cubeSize){cubeTarget?.dispose();cubeSize=edge;cubeTarget=new THREE.WebGLCubeRenderTarget(edge,{type:THREE.HalfFloatType,generateMipmaps:false});cubeTarget.texture.colorSpace=THREE.LinearSRGBColorSpace;cubeCamera=new THREE.CubeCamera(.1,24000,cubeTarget);}
  cubeCamera.position.copy(material.uniforms.uProbeOrigin.value);material.uniforms.uRadianceSteps.value=quality<.75?8:12;
  for(const pair of pairs){pair.source.updateWorldMatrix(true,false);pair.copy.matrix.copy(pair.source.matrixWorld);let visible=true;for(let object=pair.source;object;object=object.parent)if(!object.visible){visible=false;break;}pair.copy.visible=visible;}
  const scalars=new Map();
  for(const pair of pairs)for(const material of Array.isArray(pair.copy.material)?pair.copy.material:[pair.copy.material])for(const name of ['uHeight','uSeaPixelHeight','uPixelHeight']){
   const uniform=material?.uniforms?.[name];if(uniform&&!scalars.has(uniform)){scalars.set(uniform,uniform.value);uniform.value=edge;}
  }
  const shadowNeeds=renderer.shadowMap.needsUpdate,shadowAuto=renderer.shadowMap.autoUpdate,oldTone=renderer.toneMapping,oldTarget=renderer.getRenderTarget(),started=performance.now();
  let next;
  renderer.shadowMap.needsUpdate=false;renderer.shadowMap.autoUpdate=false;renderer.toneMapping=THREE.NoToneMapping;
  try{cubeCamera.update(renderer,scene);next=generator.fromCubemap(cubeTarget.texture);}
  finally{for(const [uniform,value] of scalars)uniform.value=value;renderer.shadowMap.needsUpdate=shadowNeeds;renderer.shadowMap.autoUpdate=shadowAuto;renderer.toneMapping=oldTone;renderer.setRenderTarget(oldTarget);}
  next.texture.name='Tem.cinematic.shared-volume-and-geometry-PMREM';
  const old=target;target=next;publishOpticalRadiance({texture:target.texture,width:target.width,height:target.height,maxMip:Math.log2(edge)});old?.dispose();
  captures++;cpuMs=performance.now()-started;policy.remember({time,quality});return target.texture;
 }
 try{capture();}catch(error){cubeTarget?.dispose();fallbackAtlas?.dispose();generator.dispose();geometry.dispose();material.dispose();throw error;}
 return {
  get texture(){return target.texture;},
  get stats(){return {captures,cubeSize,probeSteps:material.uniforms.uRadianceSteps.value,sharedVolume:!fallbackAtlas,cpuMs};},
  setWorldLayout(layout){
   const normalized=normalizeStellarLayout(layout);
   // Once bound, the live pass owns its smoothly arriving world parameters.
   if(fallbackAtlas){normalized.volumeRegions.forEach((region,i)=>{material.uniforms.uCenters.value[i].fromArray(region.center);material.uniforms.uRadii.value[i].fromArray(region.radius);material.uniforms.uColors.value[i].setRGB(...region.color);material.uniforms.uSeeds.value[i]=region.seed;material.uniforms.uExtinction.value[i]=region.density;material.uniforms.uFlows.value[i].fromArray(region.flow);});material.uniforms.uSun.value.fromArray(normalized.sunDirection);}
   const updated=basis(normalized.sunDirection,[.78,.61,.10]);material.uniforms.uKey.value.copy(updated.center);material.uniforms.uKeyTangent.value.copy(updated.tangent);material.uniforms.uKeyBitangent.value.copy(updated.bitangent);policy.invalidate();
  },
  setVolumeState(uniforms){
   if(!uniforms)return;for(const name of stellarVolumeUniformNames)if(uniforms[name])material.uniforms[name]=uniforms[name];
   if(uniforms.uAtlas?.value&&uniforms.uAtlas.value!==fallbackAtlas){fallbackAtlas?.dispose();fallbackAtlas=null;}
   policy.invalidate();
  },invalidate(){policy.invalidate();},
  // Share immutable geometry/materials with selected emissive strips only.
  // No reparenting, scene mutation or extra real-time camera is introduced.
  setRadianceObjects(objects=[]){
   emissions.clear();pairs=[];
   for(const source of objects.slice(0,8))source?.traverse?.(object=>{
    if(!object.isMesh&&!object.isPoints)return;
    const copy=object.clone(false);copy.matrixAutoUpdate=false;copy.frustumCulled=false;copy.castShadow=false;copy.receiveShadow=false;
    emissions.add(copy);pairs.push({source:object,copy});
   });
   policy.invalidate();
  },
  update({time=0,motion=true,force=false,quality=1}={}){
   if(released||!policy.shouldCapture({time,motion,force,quality}))return false;
   capture({time,quality});return true;
  },
  dispose(){if(released)return;released=true;target?.dispose();cubeTarget?.dispose();fallbackAtlas?.dispose();generator.dispose();geometry.dispose();material.dispose();emissions.clear();pairs=[];}
 };
}
