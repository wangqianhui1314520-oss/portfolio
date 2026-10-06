import * as THREE from 'three';
import { stellarSunDirection } from './immersive-world-layout.js?v=cinematic-v21.1';

let environment;
export function opticalEnvironment(){
 if(environment)return environment;
 const fallback=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);fallback.needsUpdate=true;
 // Preserve legacy shader uniform names, but readiness is immediate and no
 // image is loaded or sampled. Real clouds live in the depth-aware 3D volume.
 environment={uSky:{value:fallback},uSkyReady:{value:1},uSpaceEnvironment:{value:fallback},uSpaceEnvironmentReady:{value:0},uSpaceTexelSize:{value:new THREE.Vector2(1,1)},uSpaceMaxMip:{value:4}};
 const canvas=document.getElementById('space');if(canvas)canvas.dataset.sky='analytic-radiance-and-authored-live-volume';
 return environment;
}
// Legacy optical surfaces and physical GLB materials read the same cached
// radiance. This texture is rendered from live 3D fields and geometry.
export function publishOpticalRadiance({texture,width,height,maxMip}){
 const uniforms=opticalEnvironment();uniforms.uSpaceEnvironment.value=texture;uniforms.uSpaceTexelSize.value.set(1/width,1/height);uniforms.uSpaceMaxMip.value=maxMip;uniforms.uSpaceEnvironmentReady.value=1;
}
export const opticalSkySample=`
uniform sampler2D uSpaceEnvironment;uniform float uSpaceEnvironmentReady,uSpaceMaxMip;uniform vec2 uSpaceTexelSize;
#define ENVMAP_TYPE_CUBE_UV
#define CUBEUV_TEXEL_WIDTH uSpaceTexelSize.x
#define CUBEUV_TEXEL_HEIGHT uSpaceTexelSize.y
#define CUBEUV_MAX_MIP uSpaceMaxMip
#include <cube_uv_reflection_fragment>
vec3 skyReflection(vec3 direction){
 vec3 d=normalize(direction);
 if(uSpaceEnvironmentReady>.5)return textureCubeUV(uSpaceEnvironment,d,.24).rgb;
 // Linear source radiance, with the same sun used by Blender and the volumes.
 // This describes illumination only; it does not paint a galaxy onto glass.
 float key=max(dot(d,normalize(vec3(.48,.19,-.84))),0.);
 float rim=max(dot(d,normalize(vec3(.72,.14,-.68))),0.);
 vec3 ambient=mix(vec3(.006,.010,.026),vec3(.020,.040,.066),smoothstep(-.2,.9,d.y));
 return ambient+vec3(.84,.74,.62)*(pow(key,18.)*.10+pow(key,120.)*.64)+vec3(.18,.36,.50)*pow(rim,32.)*.12;
}`;

// Optical crystal and energy are shaded in the world, without a second scene capture.
export function opticalFilm(opacity=.08){
 return new THREE.MeshPhysicalMaterial({color:0x7195ae,metalness:.02,roughness:.09,clearcoat:.96,clearcoatRoughness:.055,iridescence:.12,iridescenceIOR:1.25,envMapIntensity:.18,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});
}
export function crystalMaterial({bodyOpacity=.15,edgeOpacity=.30,bodyPower=1}={}){
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
 uniforms:{uTime:{value:0},uEnergy:{value:0},uVisibility:{value:1},uBodyOpacity:{value:bodyOpacity},uEdgeOpacity:{value:edgeOpacity},uBodyPower:{value:bodyPower},...opticalEnvironment()},
 vertexShader:`varying vec3 vNormal,vWorld,vLocal;void main(){vLocal=position;vec3 viewNormal=normalMatrix*normal;vNormal=normalize(vec3(vec4(viewNormal,0.)*viewMatrix));vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
 fragmentShader:`uniform float uTime,uEnergy,uSkyReady,uVisibility,uBodyOpacity,uEdgeOpacity,uBodyPower;uniform sampler2D uSky;varying vec3 vNormal,vWorld,vLocal;${opticalSkySample}
 void main(){
  vec3 eye=normalize(cameraPosition-vWorld),n=normalize(vNormal)*(gl_FrontFacing?1.:-1.);
  float facing=clamp(dot(n,eye),0.,1.),f=pow(1.-facing,4.4);
  // Fine, stable surface variation avoids the old moving striped caustics.
  float micro=sin(vLocal.x*43.+vLocal.z*19.)*sin(vLocal.y*37.-vLocal.x*7.);
  vec3 flex=vec3(sin(vLocal.y*.34+uTime*.045),cos(vLocal.x*.29-uTime*.032),micro*.20)*.006;
  vec3 surface=normalize(n+flex),reflected=reflect(-eye,surface);
  vec3 reflection=skyReflection(reflected),refraction=skyReflection(refract(-eye,normalize(n-flex*.55),.676));
  vec3 key=normalize(vec3(.48,.19,-.84)),rim=normalize(vec3(.72,.14,-.68));
  float glint=pow(max(dot(reflected,key),0.),96.);
  float shoulder=pow(max(dot(reflected,key),0.),18.);
  float coolRim=pow(max(dot(reflected,rim),0.),28.);
  float pearl=pow(max(dot(surface,normalize(vec3(.12,.43,.88))),0.),7.)*(1.-facing)*.18;
  float keyFacing=max(dot(surface,key),0.);
  vec3 absorption=mix(vec3(.080,.20,.29),vec3(.13,.12,.26),.5+.5*sin(vLocal.y*.19+vLocal.x*.10));
  vec3 color=absorption*(.48+keyFacing*.44+f*.35)*uBodyPower+reflection*(.56+f*.36)+refraction*(.22+facing*.20);
  // The powered optical solid has a blue transmission body, so its broad
  // faces remain legible against deep space instead of leaving only wires.
  color+=vec3(.105,.30,.48)*facing*(.35+keyFacing*.35)*uBodyPower;
  color+=vec3(.92,.83,.73)*(glint*.92+shoulder*.035)+vec3(.25,.53,.69)*(coolRim*.25+pearl);
  // Excitation is local and reveals the film, without whitening every edge.
  color+=vec3(.14,.37,.58)*clamp(uEnergy,0.,2.)*(glint*.08+f*.08+facing*.16+pearl*.10);
  float alpha=uBodyOpacity+f*uEdgeOpacity+glint*.25+shoulder*.012+coolRim*.035+pearl*.03;
  gl_FragColor=vec4(color,clamp(alpha*uVisibility,0.,.68));
 }`
 });
}

// A continuous translucent strip, with a narrow moving core and soft optical edges.
export function createEnergyRibbons({parent,curves,color=0x8faeff,width=.35,segments=140}){
 const uniforms={uTime:{value:0},uPower:{value:1},uTint:{value:new THREE.Color(color)}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform float uTime,uPower;uniform vec3 uTint;varying vec2 vUv;void main(){float side=vUv.y-.5;float halo=exp(-side*side*18.);float line=exp(-pow(side*35.,2.));float wave=.5+.5*sin(vUv.x*18.-uTime*.38+sin(vUv.x*7.)*.6);float pulse=pow(wave,14.);float fade=smoothstep(0.,.035,vUv.x)*(1.-smoothstep(.92,1.,vUv.x));vec3 c=mix(uTint,vec3(.72,.51,.92),.24+.24*sin(vUv.x*8.+uTime*.06));c=mix(c,vec3(1.,.85,.76),pulse*.28);float a=(halo*.105+line*(.26+pulse*.46))*fade*uPower;gl_FragColor=vec4(c*(.7+line*2.2+pulse*1.5),a);}`
 });
 const root=new THREE.Group();parent.add(root);
 curves.forEach((curve,index)=>{
  const positions=[],uvs=[],indices=[];
  for(let i=0;i<=segments;i++){
   const t=i/segments,p=curve.getPointAt(t),tangent=curve.getTangentAt(t),side=new THREE.Vector3().crossVectors(tangent,new THREE.Vector3(.1,1,.2)).normalize();
   const breadth=width*(.55+Math.sin(t*Math.PI)*.65)*(1+index*.12);
   for(const sign of [-1,1]){const q=p.clone().addScaledVector(side,sign*breadth);positions.push(...q.toArray());uvs.push(t,sign===-1?0:1);}
   if(i<segments){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);mesh.userData.dynamic=true;root.add(mesh);
 });
 return {root,update(time,power=1,motion=true){if(motion)uniforms.uTime.value=time;uniforms.uPower.value=power;}};
}

export function createOpticalMotes({parent,count=500,span=[30,15,25],color=0x95cfff,seed=823,filter=()=>true,drift=.7}){
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const positions=[],phases=[];for(let attempts=0;positions.length<count*3&&attempts<count*40;attempts++){const p=[(rand()-.5)*span[0],(rand()-.5)*span[1],(rand()-.5)*span[2]];if(filter(p)){positions.push(...p);phases.push(rand());}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('aSeed',new THREE.Float32BufferAttribute(phases,1));
 const u={uTime:{value:0},uPower:{value:1},uHeight:{value:innerHeight},uTint:{value:new THREE.Color(color)},uDrift:{value:drift}};
 const p=new THREE.Points(g,new THREE.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
 vertexShader:`uniform float uTime,uHeight,uPower,uDrift;attribute float aSeed;varying float vAlpha,vSeed;void main(){vec3 p=position;p+=vec3(sin(uTime*.11+aSeed*6.28),cos(uTime*.13+aSeed*12.),sin(uTime*.09+aSeed*9.))*uDrift;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(uHeight*(.038+pow(aSeed,12.)*.24)/max(1.,-mv.z),1.,6.5);vAlpha=(.32+aSeed*.6)*uPower*smoothstep(1.,5.,-mv.z);vSeed=aSeed;}`,
 fragmentShader:`uniform vec3 uTint;varying float vAlpha,vSeed;void main(){vec2 p=gl_PointCoord-.5;float r=length(p);if(r>.5)discard;float spike=exp(-abs(p.x)*90.)*exp(-abs(p.y)*15.)+exp(-abs(p.y)*90.)*exp(-abs(p.x)*15.);vec3 c=mix(uTint,vec3(.95,.74,.86),vSeed*.48);gl_FragColor=vec4(c*(1.+step(.97,vSeed)*1.1),(exp(-r*r*34.)+spike*.14)*vAlpha);}`
 }));p.userData.dynamic=true;parent.add(p);
 return {root:p,update(time,power=1,motion=true){if(motion)u.uTime.value=time;u.uPower.value=power;u.uHeight.value=innerHeight;}};
}

export function createCelestialSky({time={value:0},interaction}={}){
 // The infinite sky supplies only low radiance. All visible clouds, cores and
 // drifting dust are finite objects in the world-space volume/particle passes.
 const uniforms={...opticalEnvironment(),uTime:time,uSun:{value:new THREE.Vector3(...stellarSunDirection).normalize()}};
 return new THREE.ShaderMaterial({side:THREE.BackSide,depthTest:false,depthWrite:false,toneMapped:false,uniforms,
 vertexShader:'varying vec3 vDirection;void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec3 vDirection;uniform vec3 uSun;
 void main(){vec3 d=normalize(vDirection);float up=smoothstep(-.22,.92,d.y);
  vec3 radiance=mix(vec3(.0014,.0026,.0068),vec3(.0030,.0062,.012),up);
  float angle=clamp(dot(d,uSun),0.,1.);
  // A distant star is a light source; it cannot replace cloud geometry.
  radiance+=vec3(.12,.074,.046)*pow(angle,240.)+vec3(.65,.39,.20)*pow(angle,1800.);
  gl_FragColor=vec4(radiance,1.);
 }`
 });
}
