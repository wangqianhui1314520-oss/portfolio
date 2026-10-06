import * as THREE from 'three';
import {mergeGeometries} from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/utils/BufferGeometryUtils.js';

// All light paths in one network share two draw calls. The GPU moves the pulses.
export function createLightFlow({parent,paths,color=0xffc77b,radius=.045,speed=.48,segments=64}){
 const asCurve=path=>{if(typeof path.getPoint==='function')return path;const curve=new THREE.CurvePath();for(let i=1;i<path.length;i++)curve.add(new THREE.LineCurve3(new THREE.Vector3(...path[i-1]),new THREE.Vector3(...path[i])));return curve;};
 const geometries=[];
 paths.forEach((path,index)=>{
  const curve=asCurve(path);
  const g=new THREE.TubeGeometry(curve,segments,radius,4,false),count=g.attributes.position.count;
  g.setAttribute('aPhase',new THREE.Float32BufferAttribute(new Float32Array(count).fill(index*.381966),1));
  g.setAttribute('aLength',new THREE.Float32BufferAttribute(new Float32Array(count).fill(curve.getLength()/22),1));
  geometries.push(g);
 });
 if(!geometries.length)return {update(){}};
 const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
 const tint=new THREE.Color(color),uniforms={uTime:{value:0},uPower:{value:1},uSpeed:{value:speed},uTint:{value:tint}};
 const vertexShader=`uniform float uTime,uSpeed;attribute float aPhase,aLength;varying vec2 vUv;varying float vPhase,vLength;void main(){vUv=uv;vPhase=aPhase;vLength=aLength;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader,
  fragmentShader:`uniform float uTime,uPower,uSpeed;uniform vec3 uTint;varying vec2 vUv;varying float vPhase,vLength;
   void main(){float t=fract(vUv.x*max(1.,vLength)-uTime*uSpeed+vPhase);float pulse=exp(-pow((t-.22)*18.,2.));float tail=exp(-pow((t-.38)*5.,2.))*.24;
    float core=.15+pulse*1.65+tail;vec3 c=mix(uTint,vec3(1.,.95,.83),pulse*.38);gl_FragColor=vec4(c*core,uPower*(.52+pulse*.48));}`});
 const solid=new THREE.Mesh(geometry,material);solid.userData.dynamic=true;parent.add(solid);
 // A larger tube provides a soft halo even when costly full-screen bloom is reduced.
 const haloGeometries=paths.map(path=>new THREE.TubeGeometry(asCurve(path),Math.min(segments,48),radius*4,4,false));
 const haloGeo=mergeGeometries(haloGeometries,false);haloGeometries.forEach(g=>g.dispose());
 const halo=new THREE.Mesh(haloGeo,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:'varying vec3 vNormal,vWorld;void main(){vNormal=normalize(mat3(modelMatrix)*normal);vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
  fragmentShader:'uniform vec3 uTint;uniform float uPower;varying vec3 vNormal,vWorld;void main(){float facing=abs(dot(normalize(vNormal),normalize(cameraPosition-vWorld)));gl_FragColor=vec4(uTint,facing*facing*.06*uPower);}'}));halo.userData.dynamic=true;parent.add(halo);
 return {root:solid,update(time,power=1,motion=true){if(motion)uniforms.uTime.value=time;uniforms.uPower.value=power;},dispose(){solid.removeFromParent();halo.removeFromParent();geometry.dispose();haloGeo.dispose();material.dispose();halo.material.dispose();}};
}

export function circularLightPath(radius,y,start=0,end=Math.PI*2,center=[0,0,0]){
 const points=[];for(let i=0;i<=96;i++){const a=start+(end-start)*i/96;points.push(new THREE.Vector3(center[0]+Math.sin(a)*radius,center[1]+y,center[2]+Math.cos(a)*radius));}
 return new THREE.CatmullRomCurve3(points);
}
