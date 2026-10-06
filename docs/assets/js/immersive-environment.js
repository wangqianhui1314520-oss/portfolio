import * as THREE from 'three';

// Local-space effects: dust, a probe wave and the ship-to-station link share
// the same coordinates as the ships and the orbital architecture.
export function createEnvironmentResponse({root,color=0x91d7ed,monument=null,relayOffset=[-12,2,4],compact=false}){
 const group=new THREE.Group();root.add(group);
 const count=compact?520:1100,positions=new Float32Array(count*3),sizes=new Float32Array(count);
 let seed=7139;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<count;i++){positions[i*3]=(random()-.5)*150;positions[i*3+1]=(random()-.5)*100;positions[i*3+2]=random()*100-75;sizes[i]=.65+random()*1.1;}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
 const uniforms={uTime:{value:0},uHeight:{value:innerHeight},uPointer:{value:new THREE.Vector3(999,999,999)},uPointerPower:{value:0},uShip:{value:new THREE.Vector3(999,999,999)},uPower:{value:0},uPulse:{value:new THREE.Vector3()},uRadius:{value:-100},uPulsePower:{value:0},uColor:{value:new THREE.Color(color)}};
 const dust=new THREE.Points(geometry,new THREE.ShaderMaterial({
  uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute float aSize;uniform float uTime,uHeight,uPointerPower,uPower,uRadius,uPulsePower;uniform vec3 uPointer,uShip,uPulse;varying float vAlpha;
   void main(){vec3 p=position;p.x+=sin(uTime*.13+p.z*.07)*.55;p.y+=cos(uTime*.1+p.x*.12)*.45;
    vec3 away=p-uPointer;float reach=exp(-dot(away,away)/100.)*uPointerPower;p+=normalize(away+vec3(.001))*reach*4.;
    vec3 wake=p-uShip;float engine=exp(-(wake.y*wake.y+wake.z*wake.z)/25.)*smoothstep(-2.,6.,wake.x)*(1.-smoothstep(15.,34.,wake.x))*uPower;
    p.y+=sin(uTime*1.8+p.x*.4)*engine*1.8;p.z+=cos(uTime*1.8+p.x*.4)*engine*1.8;
    vec3 shock=p-uPulse;float wave=exp(-pow((length(shock)-uRadius)*.22,2.))*uPulsePower;p+=normalize(shock+vec3(.001))*wave*2.;
    vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uHeight*.035/max(5.,-mv.z),.7,3.8);
    vAlpha=.14+reach*.6+engine*.55+wave*.75;}
  `,
  fragmentShader:'uniform vec3 uColor;varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(uColor,(1.-smoothstep(.03,.5,r))*vAlpha);}'
 }));group.add(dust);
 const waveMaterial=new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color)},uOpacity:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  vertexShader:'varying vec3 n,p;void main(){n=normalize(mat3(modelMatrix)*normal);p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',
  fragmentShader:'varying vec3 n,p;uniform vec3 uColor;uniform float uOpacity;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(cameraPosition-p))),4.);gl_FragColor=vec4(uColor,rim*uOpacity);}'
 });
 const wave=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),waveMaterial);wave.visible=false;group.add(wave);
 const routePositions=new Float32Array(97*3),progress=Float32Array.from({length:97},(_,i)=>i/96),routeGeometry=new THREE.BufferGeometry();
 routeGeometry.setAttribute('position',new THREE.BufferAttribute(routePositions,3));routeGeometry.setAttribute('aProgress',new THREE.BufferAttribute(progress,1));
 const routeMaterial=new THREE.ShaderMaterial({uniforms:{uPhase:{value:0},uPower:{value:0},uColor:{value:new THREE.Color(color)}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:'attribute float aProgress;varying float vProgress;void main(){vProgress=aProgress;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying float vProgress;uniform float uPhase,uPower;uniform vec3 uColor;void main(){float packet=exp(-pow((vProgress-uPhase)*20.,2.));float dash=.25+.75*smoothstep(.42,.55,fract(vProgress*26.));gl_FragColor=vec4(uColor,uPower*(.28*dash+packet*.8));}'
 });
 const route=new THREE.Line(routeGeometry,routeMaterial);route.frustumCulled=false;route.visible=false;group.add(route);
 const packet=new THREE.Mesh(new THREE.SphereGeometry(.24,10,8),new THREE.MeshBasicMaterial({color:new THREE.Color(color).lerp(new THREE.Color(0xffffff),.55),transparent:true,opacity:.9,toneMapped:false}));
 packet.add(new THREE.Mesh(new THREE.SphereGeometry(.65,10,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.12,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})));packet.visible=false;group.add(packet);
 const endpoint=new THREE.Vector3(),start=new THREE.Vector3(),control=new THREE.Vector3(),point=new THREE.Vector3(),curve=new THREE.QuadraticBezierCurve3(start,control,endpoint);
 const receiver=new THREE.Group();group.add(receiver);
 const receiverMaterial=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.3,depthWrite:false,blending:THREE.AdditiveBlending});
 for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.6+i*.65,.035,5,40),receiverMaterial);ring.position.z=-i*.2;receiver.add(ring);}
 const relayLight=new THREE.PointLight(color,0,85,2);receiver.add(relayLight);receiver.visible=false;
 let target=null,mode='idle',power=0,pointerActive=false,pulseAge=10,pulseCount=0,linkAge=0,lastTarget=null;
 function local(world,destination){root.updateWorldMatrix(true,false);return root.worldToLocal(destination.copy(world));}
 function setTarget(ship,nextMode){
  if(ship!==lastTarget||nextMode==='docking'&&mode!=='docking')linkAge=0;
  target=ship;lastTarget=ship;mode=nextMode;
 }
 return {
  pointer(world){pointerActive=Boolean(world);if(world)local(world,uniforms.uPointer.value);},
  probe(world){local(world,uniforms.uPulse.value);wave.position.copy(uniforms.uPulse.value);pulseAge=0;pulseCount++;},
  setTarget,
  reset(){target=null;lastTarget=null;mode='idle';pointerActive=false;pulseAge=10;power=0;route.visible=false;packet.visible=false;receiver.visible=false;wave.visible=false;},
  update(dt,time,motion){
   pulseAge+=dt;linkAge+=dt;const probeActive=pulseAge<2.6;
   const desired=target?(mode==='docking'?1:mode==='docked'?.72:mode==='approach'?.9:.6):0;
   power=motion?THREE.MathUtils.damp(power,desired,5,dt):desired;
   uniforms.uTime.value=time;uniforms.uHeight.value=innerHeight;
   uniforms.uPointerPower.value=motion?THREE.MathUtils.damp(uniforms.uPointerPower.value,pointerActive?1:0,5,dt):0;
   uniforms.uPower.value=power*motion;uniforms.uRadius.value=pulseAge*29;
   uniforms.uPulsePower.value=probeActive?Math.max(0,1-pulseAge/2.6)*motion:0;
   wave.visible=probeActive&&Boolean(motion);wave.scale.setScalar(Math.max(.05,pulseAge*29));waveMaterial.uniforms.uOpacity.value=Math.max(0,1-pulseAge/2.6)*.21;
   if(target){target.updateWorldMatrix(true,false);local(target.localToWorld(point.set(-1,1.4,0)),start);uniforms.uShip.value.copy(start);}
   route.visible=Boolean(target&&monument);packet.visible=route.visible&&Boolean(motion);receiver.visible=Boolean(monument&&(target||probeActive));
   let response=0;
   if(monument){
    monument.updateWorldMatrix(true,false);local(monument.localToWorld(point.fromArray(relayOffset)),endpoint);receiver.position.copy(endpoint);
    if(target){control.copy(start).lerp(endpoint,.5);control.y+=18;
     for(let i=0;i<97;i++){curve.getPoint(i/96,point);point.toArray(routePositions,i*3);}routeGeometry.attributes.position.needsUpdate=true;
     const cycle=motion?(linkAge%4)/4:.8,phase=cycle<.5?cycle*2:2-cycle*2;
     routeMaterial.uniforms.uPhase.value=phase;routeMaterial.uniforms.uPower.value=power;
     curve.getPoint(phase,packet.position);packet.scale.setScalar(.8+power*.5);
     response=Math.exp(-Math.pow((phase-1)*8,2))*power;
    }
    receiver.quaternion.identity();receiverMaterial.opacity=.18+response*.7+(probeActive?.2:0);receiver.scale.setScalar(1+response*.9);
    relayLight.intensity=25+response*350+(probeActive?80*(1-pulseAge/2.6):0);
   }
   return {power,response,probeActive,pulseCount};
  }
 };
}
