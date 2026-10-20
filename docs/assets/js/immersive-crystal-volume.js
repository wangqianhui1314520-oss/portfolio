import * as THREE from 'three';
import {stellarNoiseGLSL} from './immersive-volume-field.js?v=cinematic-v21.19';
import {crystalMediumProfile as look} from './immersive-crystal-look.js?v=cinematic-v21.19';

// These two adjoining chambers sit 0.25 units inside the authored T. The
// optical shell stays unchanged; light is integrated through its real depth.
export const crystalChambers=Object.freeze(look.chambers.map(c=>Object.freeze({min:Object.freeze([...c.min]),max:Object.freeze([...c.max])})));
const number=value=>Number(value).toFixed(6),vector=values=>'vec3('+values.map(number).join(',')+')';

export const crystalVolumeGLSL=`
uniform vec3 uTemCrystalEye;
uniform mat4 uTemCrystalInverse;
uniform sampler2D uTemCrystalAtlas;
uniform float uTemCrystalTime,uTemCrystalExcitation;
varying vec3 vTemCrystalLocal;
float temCrystalHash(vec3 p){p=fract(p*vec3(.1031,.11369,.13787));p+=dot(p,p.yzx+19.19);return fract((p.x+p.y)*p.z);}
${stellarNoiseGLSL.replaceAll('noise3','temCrystalNoise').replaceAll('uAtlas','uTemCrystalAtlas').replace(/texture2D\((uTemCrystalAtlas,[^;]+)\)\.rgb/g,'texture2DLodEXT($1,0.).rgb')}
vec2 temCrystalInterval(vec3 origin,vec3 direction,vec3 lo,vec3 hi){
 vec3 safeDirection=mix(vec3(-1.),vec3(1.),step(vec3(0.),direction))*max(abs(direction),vec3(.00001));
 vec3 a=(lo-origin)/safeDirection,b=(hi-origin)/safeDirection;
 return vec2(max(0.,max(max(min(a.x,b.x),min(a.y,b.y)),min(a.z,b.z))),min(min(max(a.x,b.x),max(a.y,b.y)),max(a.z,b.z)));
}
void temCrystalChamber(vec3 origin,vec3 ray,vec3 lo,vec3 hi,vec2 span,inout vec4 light){
 if(span.y<=span.x)return;
 float stride=(span.y-span.x)/16.;
 for(int i=0;i<16;i++){
  vec3 p=origin+ray*(span.x+(float(i)+.5)*stride);
  vec3 wall=min(p-lo,hi-p);
  // The shared bar/stem boundary is internal, so only the outer walls fade.
  // The crossbar underside fades outside the stem's width, without a dark seam.
  wall.y=lo.y>0.?min(hi.y-p.y,mix(100.,p.y-lo.y,smoothstep(1.67,1.85,abs(p.x)))):p.y-lo.y;
  float inside=smoothstep(0.,.18,min(min(wall.x,wall.y),wall.z));
  vec3 drift=${vector(look.drift)}*uTemCrystalTime;
  float body=temCrystalNoise((p*vec3(.32,.28,.62)+drift)/8.).r;
  float detail=temCrystalNoise((p*.92-drift*.71+vec3(4.7,9.1,2.8))/16.).g;
  float filament=pow(clamp(1.-abs(sin(p.y*.72+p.x*.31+sin(p.z*2.3+uTemCrystalTime*.14)*.58+body*1.7)),0.,1.),10.);
  float secondary=pow(clamp(1.-abs(sin(p.y*.39-p.x*.44+p.z*1.9+body*.7+uTemCrystalTime*.11)),0.,1.),18.);
  vec3 dustPosition=p*2.1+drift*.27,cell=floor(dustPosition),local=fract(dustPosition)-.5;
  vec3 offset=(vec3(temCrystalHash(cell+7.),temCrystalHash(cell+17.),temCrystalHash(cell+29.))-.5)*.55;
  float spark=step(.91,temCrystalHash(cell))*exp(-dot(local-offset,local-offset)*90.);
  float density=inside*(${number(look.baseDensity)}+body*detail*${number(look.bodyDensity)}+filament*${number(look.filamentDensity)}+secondary*${number(look.secondaryDensity)}+spark*${number(look.sparkDensity)});
  float alpha=1.-exp(-density*stride*${number(look.extinction)});
  vec3 tint=mix(${vector(look.cold)},${vector(look.violet)},smoothstep(.24,.82,body));
  tint=mix(tint,${vector(look.warm)},spark*.34);
  vec3 emission=tint*(${number(look.baseEmission)}+filament*${number(look.filamentEmission)}+secondary*${number(look.secondaryEmission)}+spark*${number(look.sparkEmission)})*(.84+uTemCrystalExcitation*.24);
  light.rgb+=(1.-light.a)*alpha*emission;light.a+=(1.-light.a)*alpha;
 }
}
vec3 temCrystalRadiance(vec3 surfaceNormal){
 vec3 incoming=normalize(vTemCrystalLocal-uTemCrystalEye);
 vec3 n=normalize(mat3(uTemCrystalInverse)*inverseTransformDirection(surfaceNormal,viewMatrix));
 vec3 ray=refract(incoming,n,1./1.468);
 if(dot(ray,ray)<.000001)return vec3(0.);
 ray=normalize(ray);vec3 origin=vTemCrystalLocal+ray*.002;
 vec3 barLo=${vector(look.chambers[0].min)},barHi=${vector(look.chambers[0].max)};
 vec3 stemLo=${vector(look.chambers[1].min)},stemHi=${vector(look.chambers[1].max)};
 vec2 a=temCrystalInterval(origin,ray,barLo,barHi),b=temCrystalInterval(origin,ray,stemLo,stemHi);vec4 light=vec4(0.);
 if(a.x<=b.x){temCrystalChamber(origin,ray,barLo,barHi,a,light);temCrystalChamber(origin,ray,stemLo,stemHi,b,light);}
 else{temCrystalChamber(origin,ray,stemLo,stemHi,b,light);temCrystalChamber(origin,ray,barLo,barHi,a,light);}
 return light.rgb;
}`;

export function bindCrystalVolume(mesh,{time,excitation,atlas}){
 if(!atlas?.value)throw new Error('Crystal radiance requires the shared three-dimensional density field.');
 const material=mesh.material,previous=material.onBeforeCompile,key=material.customProgramCacheKey.call(material);
 const uniforms={uTemCrystalTime:time,uTemCrystalExcitation:excitation,uTemCrystalAtlas:atlas,uTemCrystalEye:{value:new THREE.Vector3()},uTemCrystalInverse:{value:new THREE.Matrix4()}};
 const beforeRender=mesh.onBeforeRender;
 mesh.onBeforeRender=function(renderer,scene,camera,...args){
  beforeRender.call(this,renderer,scene,camera,...args);
  uniforms.uTemCrystalInverse.value.copy(this.matrixWorld).invert();
  camera.getWorldPosition(uniforms.uTemCrystalEye.value).applyMatrix4(uniforms.uTemCrystalInverse.value);
 };
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 vTemCrystalLocal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vTemCrystalLocal=transformed;\n#include <project_vertex>');
  shader.fragmentShader=shader.fragmentShader.replace('void main() {',crystalVolumeGLSL+'\nvoid main() {');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=temCrystalRadiance(normal);');
 };
 material.customProgramCacheKey=()=>key+'|tem-bounded-crystal-radiance-16|'+look.revision;material.needsUpdate=true;
 // The shared field has no mip chain. Explicit LOD 0 also avoids undefined
 // derivatives when neighbouring rays enter different finite chambers.
 material.extensions={...material.extensions,shaderTextureLOD:true};
 material.userData.temCrystalMedium=look.revision;
 return uniforms;
}
