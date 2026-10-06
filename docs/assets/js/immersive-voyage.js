import * as THREE from 'three';
import { hardwareMaterials,hardwareMesh,bevelGeometry,consolidateHardware } from './immersive-hardware.js?v=cinematic-v21.1';

// The portal is open geometry on the camera's real route; dust stays in world space.
export function createOpeningVoyage({scene,camera,particleScene,particleUniforms,compact}){
 const gate=new THREE.Group();gate.position.set(-12,8,64);gate.scale.setScalar(.60);scene.add(gate);
 const fixed=new THREE.Group();gate.add(fixed);const m=hardwareMaterials();
 const block=(w,h,d,p,mat=m.alloy)=>hardwareMesh(fixed,bevelGeometry(w,h,d,Math.min(w,h)*.10,Math.min(.16,d*.08)),mat,p);
 const lights=[];m.white.color.multiplyScalar(.42);m.cyan.color.multiplyScalar(.72);
 for(const side of [-1,1]){
  block(12,104,20,[side*54,-3,0],m.dark);block(14,3,23,[side*54,51,0],m.armor);
  block(9,90,1.8,[side*54,-2,11],m.armor);block(5,78,2,[side*54,-2,12.2],m.inset);
  const brace=block(6,64,10,[side*65,9,-7],m.alloy);brace.rotation.z=side*.12;
  for(let i=0;i<8;i++){
   block(15,.6,24,[side*54,-39+i*12,0],m.brass);
   block(1,7,1,[side*57,-35+i*12,13.3],m.white);
   block(3.8,.65,.6,[side*53,-34+i*12,13.5],i%3===0?m.amber:m.cyan);
  }
  const light=new THREE.PointLight(0x8ac9e4,40,145,2);light.position.set(side*44,23,18);gate.add(light);lights.push(light);
 }
 const arch=new THREE.Shape();arch.moveTo(-64,47);arch.bezierCurveTo(-45,67,-20,73,0,73);arch.bezierCurveTo(20,73,45,67,64,47);arch.lineTo(69,57);arch.bezierCurveTo(49,82,22,87,0,87);arch.bezierCurveTo(-22,87,-49,82,-69,57);arch.closePath();
 const archBody=hardwareMesh(fixed,new THREE.ExtrudeGeometry(arch,{depth:20,bevelEnabled:true,bevelSize:.7,bevelThickness:.6,bevelSegments:3,curveSegments:24}),m.dark);archBody.position.z=-10;
 const archPoints=[[-61,51,11],[-42,65,11],[0,77,11],[42,65,11],[61,51,11]].map(a=>new THREE.Vector3(...a));
 hardwareMesh(fixed,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints),80,.38,8,false),m.brass);
 hardwareMesh(fixed,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints.map(p=>p.clone().add(new THREE.Vector3(0,1,.4)))),80,.09,6,false),m.white);
 for(let i=0;i<11;i++){const x=-55+i*11,y=73-22*Math.pow(x/61,2);const rib=block(2.4,12,23,[x,y+5,0],m.alloy);rib.rotation.z=-x*.006;}
 const windows=new THREE.InstancedMesh(new THREE.BoxGeometry(.52,.24,.18),m.white,compact()?100:200),pose=new THREE.Object3D();fixed.add(windows);
 for(let i=0;i<windows.count;i++){const side=i%2?-1:1;pose.position.set(side*(49+(i%4)*2),-45+Math.floor(i/4)%40*2.4,13.55);pose.updateMatrix();windows.setMatrixAt(i,pose.matrix);}
 consolidateHardware(fixed);
 let seed=32918;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const count=compact()?260:650,positions=[],ends=[],colors=[],sizes=[];
 for(let i=0;i<count;i++){
  const p=[(random()-.5)*360,(random()-.5)*220,(random()-.5)*700];
  const color=i%19===0?[.95,.64,.34]:i%7===0?[.55,.54,.82]:[.32,.67,.94];
  for(const end of [0,1]){positions.push(...p);ends.push(end);colors.push(...color);sizes.push(.4+random()*.6);}
 }
 const uniforms={uObserver:{value:camera.position},uHeading:{value:new THREE.Vector3(0,0,-1)},uSpeed:{value:0},uWarp:{value:0},uPower:{value:0},...particleUniforms};
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aEnd',new THREE.Float32BufferAttribute(ends,1));geometry.setAttribute('aColor',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));
 const streaks=new THREE.LineSegments(geometry,new THREE.ShaderMaterial({uniforms,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`uniform vec3 uObserver,uHeading;uniform float uSpeed,uWarp,uPower;attribute float aEnd,aSize;attribute vec3 aColor;varying vec3 vColor;varying float vAlpha;
   void main(){vec3 span=vec3(360.,220.,700.);vec3 p=mod(position-uObserver+span*.5,span)-span*.5+uObserver;
    float edge=1.-smoothstep(.78,1.,max(max(abs((p-uObserver).x)/180.,abs((p-uObserver).y)/110.),abs((p-uObserver).z)/350.));
    p-=uHeading*aEnd*(.12+uSpeed*.35+uWarp*24.)*aSize;vec4 mv=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*mv;vColor=aColor;vAlpha=(.09+uSpeed*.06+uWarp*.32)*uPower*edge*(1.-aEnd*.91)*smoothstep(5.,30.,-mv.z);}`,
  fragmentShader:`uniform sampler2D uSceneDepth;uniform vec2 uFrameSize;varying vec3 vColor;varying float vAlpha;
   void main(){if(gl_FragCoord.z>texture2D(uSceneDepth,gl_FragCoord.xy/uFrameSize).r+.0000001)discard;gl_FragColor=vec4(vColor,vAlpha);}`
 }));streaks.frustumCulled=false;particleScene.add(streaks);
 const canvas=document.getElementById('space');canvas.dataset.voyageParticles=String(count);
 return {update(frame,motion){
  const shot=frame.introFrame;
  gate.visible=frame.step==='bridge'||frame.step==='boot';
  const distance=camera.position.distanceTo(gate.position),approach=Math.exp(-distance*.025);
  lights.forEach(light=>light.intensity=40+approach*160);
  streaks.visible=frame.fullOpening&&motion&&shot.time<11.6;
  uniforms.uSpeed.value=frame.speed;uniforms.uWarp.value=shot.warp;uniforms.uPower.value=shot.flight;camera.getWorldDirection(uniforms.uHeading.value);
  canvas.dataset.openingTime=shot.time.toFixed(2);canvas.dataset.warp=shot.warp.toFixed(3);canvas.dataset.openingRoute=shot.route.toFixed(3);
 }};
}






