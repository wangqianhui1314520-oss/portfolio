import * as THREE from 'three';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/ShaderPass.js';
import { orbitalEarthOcclusion } from './immersive-planet.js?v=cinematic-v21.1';

export function createFilmLook({composer,scene,camera,time,velocity,pulse,compact}) {
  const sunPosition=new THREE.Vector3(32,38,-310);
  const sun=new THREE.Mesh(new THREE.PlaneGeometry(45,45),new THREE.ShaderMaterial({
    depthWrite:false,transparent:true,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;void main(){float r=length(vUv-.5);
      float core=exp(-r*r*17000.);float halo=exp(-r*48.)*.15+exp(-r*13.)*.008;
      gl_FragColor=vec4(vec3(.82,.92,1.0)*(core*3.8+halo),1.);}`
  }));
  sun.position.copy(sunPosition);scene.add(sun);
  const sunUV=new THREE.Vector2();const projected=new THREE.Vector3();
  const pass=new ShaderPass({
    uniforms:{tDiffuse:{value:null},uTime:time,uVelocity:velocity,uPulse:pulse,uWarp:{value:0},uSize:{value:new THREE.Vector2()},uSun:{value:sunUV},uSunVisible:{value:1},uGrain:{value:document.body.dataset.grain==='off'?0:.010}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime,uVelocity,uPulse,uGrain,uSunVisible,uWarp;uniform vec2 uSize,uSun;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec2 q=vUv-.5;float radial=dot(q,q);
        vec2 lensUV=clamp(vUv+q*radial*uWarp*.065,vec2(.001),vec2(.999));
        vec2 aberration=q*radial*(.0009+uVelocity*.0004+uWarp*.014);
        vec3 col=texture2D(tDiffuse,lensUV).rgb;
        col.r=texture2D(tDiffuse,clamp(lensUV+aberration,vec2(.001),vec2(.999))).r;col.b=texture2D(tDiffuse,clamp(lensUV-aberration,vec2(.001),vec2(.999))).b;
        if(uWarp>.001){vec3 smear=vec3(0.);for(int i=1;i<=4;i++){vec2 uv=clamp(lensUV-q*uWarp*float(i)*.017,vec2(.001),vec2(.999));smear+=texture2D(tDiffuse,uv).rgb*.25;}col=mix(col,smear,uWarp*.38);}
        float lensEdge=smoothstep(.04,.33,radial)*(1.-smoothstep(.33,.62,radial));
        col+=vec3(.025,.10,.19)*lensEdge*uWarp;
        float luma=dot(col,vec3(.2126,.7152,.0722));
        col=mix(vec3(luma),col,.91);
        col*=mix(vec3(.94,1.01,1.06),vec3(1.025,1.009,.98),smoothstep(.08,.65,luma));
        vec2 lens=vUv-uSun;lens.y*=uSize.y/uSize.x;
        float streak=exp(-abs(lens.y)*1100.)*exp(-abs(lens.x)*6.7);
        float ghost=exp(-pow((length((vUv-(vec2(1.)-uSun))*vec2(1.,uSize.y/uSize.x))-.085)*140.,2.));
        col+=vec3(.20,.37,.48)*(streak*.25+ghost*.005)*uSunVisible;
        float frame=floor(uTime*24.);
        vec2 pixel=floor(vUv*uSize);
        float grain=(hash(pixel+frame*vec2(31.7,17.3))+hash(pixel.yx+frame*vec2(9.7,71.1))-.999);
        float grainMask=(.38+smoothstep(.015,.22,luma)*.62)*(1.-smoothstep(.65,1.,luma)*.8);
        col+=grain*uGrain*grainMask;
        col*=1.-smoothstep(.13,.6,radial)*.22;
        gl_FragColor=vec4(max(col,vec3(0.)),1.);
      }`
  });
  composer.addPass(pass);
  addEventListener('tem:film',event=>{pass.uniforms.uGrain.value=event.detail.grain ? .010 : 0;});
  function resize(){pass.uniforms.uSize.value.set(innerWidth,innerHeight);}
  addEventListener('resize',resize,{passive:true});resize();

  // Three depth bands of illuminated dust. Instancing avoids hundreds of draw calls.
  const amount=compact()?70:160,random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};let seed=917;
  const geometry=new THREE.IcosahedronGeometry(1,0);
  const material=new THREE.MeshStandardMaterial({color:0x737d87,metalness:.24,roughness:.88});
  const debris=new THREE.InstancedMesh(geometry,material,amount);
  const dummy=new THREE.Object3D(),dustParams=new Float32Array(amount*2);
  for(let i=0;i<amount;i++){
    const x=(random()-.5)*180,y=(random()-.5)*100,z=-24-random()*210,size=.012+random()*.055,angle=random()*6.28;
    dustParams.set([angle,size],i*2);dummy.position.set(x,y,z);dummy.rotation.set(angle,angle,0);dummy.scale.setScalar(size);dummy.updateMatrix();debris.setMatrixAt(i,dummy.matrix);
  }
  geometry.setAttribute('aDustParams',new THREE.InstancedBufferAttribute(dustParams,2));
  debris.instanceMatrix.needsUpdate=true;
  material.onBeforeCompile=shader=>{
    shader.uniforms.uDustTime=time;
    shader.vertexShader='uniform float uDustTime;attribute vec2 aDustParams;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float turn=uDustTime*.021;mat2 driftTurn=mat2(cos(turn),-sin(turn),sin(turn),cos(turn));
      transformed.xz=driftTurn*transformed.xz;transformed.x+=sin(uDustTime*.012+aDustParams.x)*.5/max(aDustParams.y,.001);`);
  };
  material.customProgramCacheKey=()=> 'tem-dust-gpu-drift-v1';
  debris.frustumCulled=false;scene.add(debris);
  const toSun=new THREE.Vector3(),toPlanet=new THREE.Vector3();
  return {
    update(frame,dt=1/60,motion=1){
      const warp=frame?.opening?frame.introFrame.warp:0;
      pass.uniforms.uWarp.value=motion?THREE.MathUtils.damp(pass.uniforms.uWarp.value,warp,12,dt):0;
      sun.quaternion.copy(camera.quaternion);
      projected.copy(sunPosition).project(camera);sunUV.set(projected.x*.5+.5,projected.y*.5+.5);
      toSun.copy(sunPosition).sub(camera.position);const distance=toSun.length();toSun.normalize();
      toPlanet.copy(orbitalEarthOcclusion.center).sub(camera.position);const along=toPlanet.dot(toSun),radius=orbitalEarthOcclusion.radius;
      const blocked=orbitalEarthOcclusion.visible&&along>0&&along<distance&&toPlanet.lengthSq()-along*along<radius*radius;
      const visible=blocked||projected.z>1?0:1;pass.uniforms.uSunVisible.value=motion?THREE.MathUtils.damp(pass.uniforms.uSunVisible.value,visible,8,dt):visible;
    }
  };
}
