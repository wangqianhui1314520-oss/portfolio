import * as THREE from 'three';

const bindings=new WeakMap();
// Material-local artistic light linking. Direction is expressed in the actual
// drawing camera's view space, including the planar reflection camera. Only
// the shared stellar key is attenuated; the rim and environment remain intact.
export function bindSolarReceiver(mesh,{sunDirection,visibility=1,finishVariation=0,revision='receiver-01'}){
 if(!sunDirection?.value)throw new Error('A solar receiver needs the shared stellar direction.');
 if(!Number.isFinite(visibility)||visibility<0||visibility>1)throw new Error('Solar visibility must be in [0,1].');
 if(!Number.isFinite(finishVariation)||finishVariation<0||finishVariation>.1)throw new Error('Invalid coating finish range.');
 const material=mesh.material;
 let state=bindings.get(material);
 if(state&&(state.visibility!==visibility||state.finishVariation!==finishVariation))throw new Error('Conflicting light receiver settings on a shared material.');
 if(!state){
  state={sunView:{value:new THREE.Vector3()},visibility,finishVariation};bindings.set(material,state);
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey.call(material);
  const lights=THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );',`getDirectionalLightInfo( directionalLight, directLight );\ndirectLight.color*=mix(1.,${visibility.toFixed(6)},smoothstep(.9998,.99995,dot(directionalLight.direction,uTemReceiverSunView)));`);
  material.onBeforeCompile=function(shader,renderer){
   previous.call(this,shader,renderer);shader.uniforms.uTemReceiverSunView=state.sunView;
   shader.fragmentShader='uniform vec3 uTemReceiverSunView;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',lights);
   if(finishVariation>0){
    shader.vertexShader='varying vec3 vTemCoatingWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vTemCoatingWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>');
    shader.fragmentShader='varying vec3 vTemCoatingWorld;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nfloat temCoatingGrain=sin(dot(vTemCoatingWorld,vec3(193.1,71.7,109.3)))*sin(dot(vTemCoatingWorld,vec3(83.7,157.9,61.3)));\nroughnessFactor=clamp(roughnessFactor+temCoatingGrain*${finishVariation.toFixed(6)},.04,1.);`);
   }
  };
  material.customProgramCacheKey=()=>key+'|tem-solar-'+revision+'-'+visibility+'-'+finishVariation;
  material.needsUpdate=true;material.userData.temSunReceiver=revision;
 }
 const beforeRender=mesh.onBeforeRender;
 mesh.onBeforeRender=function(renderer,scene,camera,...args){
  beforeRender.call(this,renderer,scene,camera,...args);
  state.sunView.value.copy(sunDirection.value).transformDirection(camera.matrixWorldInverse);
 };
 return state.sunView;
}
