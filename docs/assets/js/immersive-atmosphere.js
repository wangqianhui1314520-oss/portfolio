import * as THREE from 'three';
import { normalizeStellarLayout } from './immersive-world-layout.js?v=cinematic-v21.1';
import { sectors } from './immersive-journey.js?v=cinematic-v21.1';
import { NebulaPass } from './immersive-nebula-pass.js?v=cinematic-v21.1';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/RenderPass.js';

// Cloud light is integrated in actual world space and clipped against the scene depth.
export function createDeepSpaceAtmosphere({scene,camera,composer,time,velocity,pulse,compact,pixelHeight,interaction}){
 const particleScene=new THREE.Scene(),root=new THREE.Group();particleScene.add(root);let seed=3719;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const gaussian=()=>rand()+rand()+rand()+rand()-2;
 const count=compact()?3600:8800,positions=new Float32Array(count*3),seeds=new Float32Array(count*3),kinds=new Float32Array(count),lanes=new Float32Array(count).fill(-1);
 const curvePoints=Array.from({length:4},()=>new Float32Array(count*3)),flowRates=new Float32Array(count);
 let flowTargets=null,flowBlend=1;
 function cubicControls(curve){
  const p0=curve.getPoint(0),p3=curve.getPoint(1),q1=curve.getPoint(1/3),q2=curve.getPoint(2/3);
  const a=q1.multiplyScalar(27).addScaledVector(p0,-8).sub(p3),b=q2.multiplyScalar(27).sub(p0).addScaledVector(p3,-8);
  return [p0,a.clone().multiplyScalar(2).sub(b).multiplyScalar(1/18),b.multiplyScalar(2).sub(a).multiplyScalar(1/18),p3];
 }
 // Eight static cubic currents occupy the full archive orbit, with two depth
 // bands per heading. The shader advances each star independently along its
 // real world curve; the instrument and camera never carry these particles.
 const currents=[];
 for(let heading=0;heading<4;heading++)for(let band=0;band<2;band++){
  const a=heading*Math.PI/2,n=new THREE.Vector3(-Math.sin(a),0,-Math.cos(a)),side=new THREE.Vector3(Math.cos(a),0,-Math.sin(a));
  const center=n.clone().multiplyScalar(band?190:98).add(new THREE.Vector3(0,band?19:-4,-27)),spread=band?1.42:1;
  const coordinates=band?[[-124*spread,-22,0],[-62*spread,-9,36],[48*spread,22,-18],[138*spread,36,24]]:[[-115,-19,0],[-58,-12,32],[44,12,-21],[132,35,17]];
  const points=coordinates.map(([x,y,z])=>center.clone().addScaledVector(side,x).addScaledVector(n,z).add(new THREE.Vector3(0,y,0)));if(band)points.reverse();
  currents.push({normal:n,side,band,points});
 }
 // Static world-space filaments wrap the archive's full orbit and continue
 // through the opening route. Unequal branches leave dark breathing room.
 const filaments=[
  [[-1750,-80,-1270],[-860,130,-680],[260,330,-1140],[1640,75,-1880]],
  [[-1580,120,430],[-760,250,1090],[320,420,850],[1520,160,370]],
  [[-1320,290,-130],[-1120,50,520],[-880,260,1470],[-340,350,2180]],
  [[1310,-90,-1110],[980,165,-120],[1030,340,910],[260,210,2050]],
  [[-440,200,1930],[-280,260,1240],[-140,115,680],[300,230,30]],
  [[-680,-165,-1520],[-170,-100,-970],[430,20,-1470],[1240,-20,-2170]]
 ].map(points=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal'));
 const starClouds=sectors.map((sector,i)=>({
  center:new THREE.Vector3(...sector.position).add(new THREE.Vector3(i%2?170:-180,115+i*20,-235)),radius:42+i*9
 }));
 for(let i=0;i<28;i++){
  const center=filaments[i%filaments.length].getPoint(.08+rand()*.84);
  center.add(new THREE.Vector3(gaussian()*35,gaussian()*22,gaussian()*32));
  starClouds.push({center,radius:11+Math.pow(rand(),1.7)*82});
 }
 const deepControls=filaments.map(cubicControls),point=new THREE.Vector3();
 for(let i=0;i<count;i++){
  const fraction=i/count;let kind;
  if(fraction<.30){
   kind=0;const lane=i%currents.length,current=currents[lane];lanes[i]=lane;
   current.points.forEach((p,index)=>curvePoints[index].set(p.toArray(),i*3));
   point.copy(current.side).multiplyScalar(gaussian()*(current.band?12:6)).addScaledVector(current.normal,gaussian()*(current.band?10:5));point.y=gaussian()*(current.band?9:4);
  }else if(fraction<.55){
   kind=1;const branch=filaments[Math.floor(rand()*filaments.length)],t=rand(),width=8+Math.pow(rand(),2)*77;
   const lane=filaments.indexOf(branch);lanes[i]=8+lane;deepControls[lane].forEach((p,index)=>curvePoints[index].set(p.toArray(),i*3));
   const tangent=branch.getTangent(t),side=new THREE.Vector3().crossVectors(tangent,new THREE.Vector3(.16,1,.08)).normalize(),up=new THREE.Vector3().crossVectors(side,tangent).normalize();
   point.set(0,0,0).addScaledVector(side,gaussian()*width).addScaledVector(up,gaussian()*width*.62);
  }else if(fraction<.75){
   kind=2;const angle=rand()*Math.PI*2,r=72+Math.pow(rand(),.85)*174;
   point.set(Math.sin(angle)*r,gaussian()*48+9,Math.cos(angle)*r-27);
  }else if(fraction<.95){
   kind=3;const cluster=starClouds[Math.floor(rand()*starClouds.length)],r=cluster.radius*(rand()<.70?.48:1.4);
   point.copy(cluster.center).add(new THREE.Vector3(gaussian()*r*1.8,gaussian()*r*.64,gaussian()*r));
   point.y+=Math.sin(point.x*.022+point.z*.008)*r*.16;
  }else{
   kind=4;const angle=rand()*Math.PI*2,r=320+Math.pow(rand(),.72)*980;
   point.set(Math.cos(angle)*r,(rand()-.5)*r*.80,Math.sin(angle)*r);
   if(rand()>.6)point.add(new THREE.Vector3(...sectors[Math.floor(rand()*sectors.length)].position));
  }
  positions.set(point.toArray(),i*3);seeds.set([rand(),rand(),rand()],i*3);kinds[i]=kind;
  flowRates[i]=kind===0?(.0058+seeds[i*3+1]*.0052)*(lanes[i]%2?.65:1):kind===1?.0032+seeds[i*3+1]*.0018:0;
 }
 const nebula=new NebulaPass({camera,time,velocity,pulse,compact,interaction});composer.insertPass(nebula,1);
 const particleUniforms={uSceneDepth:nebula.uniforms.uDepth,uNebulaFog:{value:nebula.target.texture},uFrameSize:{value:new THREE.Vector2(innerWidth,innerHeight)}};
 const particlePass=new RenderPass(particleScene,camera);particlePass.clear=false;
 particlePass.setSize=(width,height)=>particleUniforms.uFrameSize.value.set(width,height);composer.insertPass(particlePass,2);
 const uniforms={uTime:time,uVelocity:velocity,uPulse:pulse,uHeight:pixelHeight||{value:innerHeight},uColor:{value:new THREE.Color(0x9ebccf)},uDensity:{value:1},uFocus:nebula.uniforms.uFocus,uFocusPower:nebula.uniforms.uFocusPower,...nebula.interactionUniforms};
 const flowData=new Float32Array(count*3);for(let i=0;i<count;i++)flowData.set([kinds[i],lanes[i],flowRates[i]],i*3);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('aSeed',new THREE.BufferAttribute(seeds,3));geo.setAttribute('aFlow',new THREE.BufferAttribute(flowData,3));curvePoints.forEach((points,index)=>geo.setAttribute(`aCurve${index}`,new THREE.BufferAttribute(points,3)));
 Object.assign(uniforms,particleUniforms);
 const cloud=new THREE.Points(geo,new THREE.ShaderMaterial({uniforms,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute vec3 aSeed,aCurve0,aCurve1,aCurve2,aCurve3;attribute vec3 aFlow;uniform float uTime,uVelocity,uPulse,uHeight,uDensity,uFocusPower,uPointerPower,uPointerSpeed;varying float vAlpha,vKind,vSeed,vDistance,vFootprint,vStretch;varying vec2 vAxis;varying vec3 vColor;uniform vec3 uColor,uFocus,uPointerOrigin,uPointerDirection;
   void main(){vec3 p=position,driftVelocity=vec3(0.);float aKind=aFlow.x,aLane=aFlow.y,aFlowRate=aFlow.z,t=uTime*.095,laneFade=1.;vKind=aKind;vSeed=aSeed.z;
    if(aLane>-.5){float phase=fract(aSeed.x+uTime*aFlowRate);float back=1.-phase;
     p=aCurve0*back*back*back+3.*aCurve1*back*back*phase+3.*aCurve2*back*phase*phase+aCurve3*phase*phase*phase+position;
     driftVelocity=(3.*(aCurve1-aCurve0)*back*back+6.*(aCurve2-aCurve1)*back*phase+3.*(aCurve3-aCurve2)*phase*phase)*aFlowRate;
     p+=vec3(sin(uTime*.081+aSeed.z*6.28),cos(uTime*.068+aSeed.y*6.28),sin(uTime*.074+aSeed.x*6.28))*.75;
     laneFade=smoothstep(0.,.035,phase)*(1.-smoothstep(.965,1.,phase));
    }else if(aKind>1.5&&aKind<2.5){
     p+=vec3(sin(uTime*.083+aSeed.x*6.28)*5.,cos(uTime*.070+aSeed.y*6.28)*3.,sin(uTime*.092+aSeed.z*6.28)*5.5);
     driftVelocity=vec3(cos(uTime*.083+aSeed.x*6.28)*.415,-sin(uTime*.070+aSeed.y*6.28)*.21,cos(uTime*.092+aSeed.z*6.28)*.506);
    }else{float drift=aKind<1.5?3.2:aKind<3.5?1.7:.12;
     vec3 current=vec3(sin(p.y*.007+t+sin(p.z*.002)),cos(p.z*.006-t*.72),sin(p.x*.006+t*.68));p+=current*drift;
     p+=vec3(sin(aSeed.x*6.28+t*.34),sin(aSeed.y*6.28+t*.21)*.3,cos(aSeed.y*6.28+t*.28))*drift*.65;}
    float influence=0.;
    if(uPointerPower>.0001){
     vec3 delta=p-uPointerOrigin;float along=dot(delta,uPointerDirection);
     vec3 across=delta-uPointerDirection*along;float reach=20.+clamp(along,0.,900.)*.095;
     float depthGate=smoothstep(14.,52.,along)*(1.-smoothstep(620.,1400.,along));
     float distanceWeight=mix(1.,.14,smoothstep(160.,1100.,along));
     float layerWeight=aKind<.5?1.:aKind<1.5?.32:aKind<2.5?.95:aKind<3.5?.22:.015;
     float bandWeight=aLane>-.5&&aLane<7.5?mix(1.,.56,mod(aLane,2.)):1.;
     influence=exp(-dot(across,across)/(reach*reach))*depthGate*clamp(uPointerPower,0.,1.)*distanceWeight*layerWeight*bandWeight;
     float wake=clamp(uPointerSpeed,0.,1.),swirl=.075+wake*.30,pull=.032+wake*.020;
     p+=(cross(uPointerDirection,across)*swirl-across*pull+uPointerDirection*sin(uTime*.24+aSeed.z*6.28)*(.60+wake*1.25))*influence;
    }
    vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;vDistance=-mv.z;
    vec4 future=projectionMatrix*(mv+modelViewMatrix*vec4(driftVelocity*.05,0.));
    vec2 streak=(future.xy/max(abs(future.w),.001)-gl_Position.xy/max(abs(gl_Position.w),.001))*uHeight*10.;
    vAxis=streak;vStretch=aKind<2.5?smoothstep(3.,22.,length(streak))*.56+influence*uPointerSpeed*.34:0.;
    float size=aKind<.5?.18+pow(aSeed.y,12.)*.38:aKind<1.5?.42+pow(aSeed.x,9.)*2.6:aKind<2.5?.12+pow(aSeed.y,10.)*.20:aKind<3.5?.28+pow(aSeed.x,11.)*2.3:.045+pow(aSeed.x,5.)*.35;
    float cap=aKind<.5?3.8:aKind<1.5?3.4:aKind<2.5?2.6:aKind<3.5?2.8:3.2;
    gl_PointSize=clamp(size*uHeight/max(1.,-mv.z),aKind<.5?2.0:aKind<2.5?.75:.78,cap);gl_PointSize*=1.+vStretch*.30;vFootprint=gl_PointSize;
    float brightness=aKind<.5?.43:aKind<1.5?.52:aKind<2.5?.18:aKind<3.5?.39:.22;
    float distanceFade=smoothstep(aKind>1.5&&aKind<2.5?8.:7.,aKind>1.5&&aKind<2.5?26.:32.,-mv.z)*(1.-smoothstep(2600.,4200.,-mv.z));
    float shimmer=1.+sin(uTime*.17+aSeed.z*6.28)*.065;
    float densityLight=brightness*uDensity*(.80+pow(aSeed.y,7.)*.38+uPulse*.20+influence*.20);
    if(aKind<.5)densityLight=(.47+aSeed.y*.10)*uDensity*(1.+uPulse*.12+influence*.12);
    vAlpha=densityLight*distanceFade*shimmer*laneFade;
    float tint=.5+.5*sin(position.x*.0017+position.z*.0011+aSeed.y*.9);
    vColor=mix(vec3(.47,.65,.91),vec3(.77,.62,.93),tint);vColor=mix(vColor,uColor,.22);
    vColor=mix(vColor,vec3(.94,.88,.81),smoothstep(.94,1.,aSeed.y)*.72);vColor=mix(vColor,vec3(.61,.87,1.12),influence*.23);if(aKind<.5)vColor*=1.35;}`,
  fragmentShader:`varying float vAlpha,vKind,vSeed,vDistance,vFootprint,vStretch;varying vec2 vAxis;varying vec3 vColor;uniform sampler2D uSceneDepth,uNebulaFog;uniform vec2 uFrameSize;
   void main(){if(gl_FragCoord.z>texture2D(uSceneDepth,gl_FragCoord.xy/uFrameSize).r+.0000001)discard;vec2 p=gl_PointCoord-.5;
    vec2 axis=normalize(vAxis+vec2(.0001,.0002));
    p=vec2(dot(p,axis),dot(p,vec2(-axis.y,axis.x))*(1.+vStretch*1.35));
    float d=length(p)*2.;if(d>1.)discard;
    float core,edge;
    if(vKind<.5){
     // Approximate a physical pixel's box footprint with a variance-matched
     // Gaussian. Wider kernels retain their energy instead of flashing as an
     // unresolved core crosses pixel centers; no derivative extension is needed.
     float inverseArea=1./max(vFootprint*vFootprint,1.);
     float coreFilter=1.+3.*inverseArea,haloFilter=1.+1.066667*inverseArea;
     core=.85/coreFilter*exp(-d*d*4.5/coreFilter)+.18/haloFilter*exp(-d*d*1.6/haloFilter);
     edge=1.-smoothstep(.62,1.04,d);
    }else{float softness=vKind>1.5&&vKind<2.5?18.:vKind>3.5?12.:20.;core=exp(-d*d*softness);edge=1.-smoothstep(.72,1.,d);}
    float spike=exp(-abs(p.x)*125.)*exp(-abs(p.y)*20.)+exp(-abs(p.y)*125.)*exp(-abs(p.x)*20.);
    float sparkle=step(.980,vSeed)*(1.-step(1.5,vKind))*.075;
    float cloudVeil=1.-texture2D(uNebulaFog,gl_FragCoord.xy/uFrameSize).a*smoothstep(100.,800.,vDistance)*.8;
    gl_FragColor=vec4(vColor,(core+spike*sparkle)*edge*vAlpha*cloudVeil);}`
 }));cloud.frustumCulled=false;root.add(cloud);
 const targetColor=new THREE.Color(0xa8c4d9),mistColor=new THREE.Color(0xa1b6c5),canvas=document.getElementById('space');let lastSector=null,lastStamp=-1,lastStep=null;
 // Cheap acceptance trace: three actual submitted vertices, once per wall
 // second. Matching heading samples retain their IDs while a view is held.
 // Visibility here means frustum visibility; GPU depth may still hide a point.
 const traceCandidates=currents.map((_,lane)=>{
  const targets=[.46,.57],indices=[-1,-1],errors=[Infinity,Infinity];
  for(let i=lane;i<count*.30;i+=currents.length)for(let j=0;j<2;j++){const error=Math.abs(seeds[i*3]-targets[j]);if(error<errors[j]){errors[j]=error;indices[j]=i;}}
  return indices;
 });
 const tracePoint=new THREE.Vector3(),traceDelta=new THREE.Vector3(),traceSwirl=new THREE.Vector3(),traceView=new THREE.Vector3();let traceStamp=-1;
 function traceCurrents(){
  const stamp=Math.floor(performance.now()/1000);if(stamp===traceStamp)return;traceStamp=stamp;
  const heading=((Math.round(Math.atan2(camera.position.x,camera.position.z+27)/(Math.PI/2))%4)+4)%4,lane=heading*2;
  const ids=[traceCandidates[lane][0],traceCandidates[lane+1][0],traceCandidates[lane][1]],samples=[];
  for(const id of ids){const o=id*3,sx=seeds[o],sy=seeds[o+1],sz=seeds[o+2],clock=time.value,bandRate=lanes[id]%2?.65:1,phase=((sx+clock*flowRates[id])%1+1)%1,back=1-phase;
   tracePoint.set(0,0,0).fromArray(curvePoints[0],o).multiplyScalar(back*back*back);
   traceDelta.fromArray(curvePoints[1],o);tracePoint.addScaledVector(traceDelta,3*back*back*phase);
   traceDelta.fromArray(curvePoints[2],o);tracePoint.addScaledVector(traceDelta,3*back*phase*phase);
   traceDelta.fromArray(curvePoints[3],o);tracePoint.addScaledVector(traceDelta,phase*phase*phase);
   traceDelta.fromArray(positions,o);tracePoint.add(traceDelta);traceDelta.set(Math.sin(clock*.081+sz*6.28)*.75,Math.cos(clock*.068+sy*6.28)*.75,Math.sin(clock*.074+sx*6.28)*.75);tracePoint.add(traceDelta);
   if(uniforms.uPointerPower.value>.0001){
    const direction=uniforms.uPointerDirection.value;traceDelta.copy(tracePoint).sub(uniforms.uPointerOrigin.value);const along=traceDelta.dot(direction);traceDelta.addScaledVector(direction,-along);
    const reach=20+THREE.MathUtils.clamp(along,0,900)*.095,depthGate=THREE.MathUtils.smoothstep(along,14,52)*(1-THREE.MathUtils.smoothstep(along,620,1400));
    const distanceWeight=THREE.MathUtils.lerp(1,.14,THREE.MathUtils.smoothstep(along,160,1100)),bandWeight=lanes[id]%2?.56:1;
    const influence=Math.exp(-traceDelta.lengthSq()/(reach*reach))*depthGate*THREE.MathUtils.clamp(uniforms.uPointerPower.value,0,1)*distanceWeight*bandWeight,wake=THREE.MathUtils.clamp(uniforms.uPointerSpeed.value,0,1),swirl=.075+wake*.30,pull=.032+wake*.020;
    traceSwirl.crossVectors(direction,traceDelta);tracePoint.addScaledVector(traceSwirl,swirl*influence).addScaledVector(traceDelta,-pull*influence).addScaledVector(direction,Math.sin(clock*.24+sz*6.28)*(.60+wake*1.25)*influence);
   }
   traceView.copy(tracePoint).applyMatrix4(camera.matrixWorldInverse);const depth=-traceView.z;tracePoint.project(camera);
   const fade=THREE.MathUtils.smoothstep(phase,0,.035)*(1-THREE.MathUtils.smoothstep(phase,.965,1));
   samples.push({id,lane:lanes[id],x:Number(((tracePoint.x*.5+.5)*innerWidth).toFixed(2)),y:Number(((-tracePoint.y*.5+.5)*innerHeight).toFixed(2)),depth:Number(depth.toFixed(2)),phase:Number(phase.toFixed(4)),visible:depth>7&&Math.abs(tracePoint.x)<1&&Math.abs(tracePoint.y)<1&&fade>.1});
  }
  canvas.dataset.starDustTrace=JSON.stringify({time:Number(time.value.toFixed(3)),heading,pointerPower:Number(uniforms.uPointerPower.value.toFixed(3)),pointerSpeed:Number(uniforms.uPointerSpeed.value.toFixed(3)),samples});
 }
 canvas.dataset.nebula='dynamic-3d-density-depth-pass';canvas.dataset.starDust='world-cubic-currents-and-near-depth';canvas.dataset.starDustLayers='30% cubic currents / 20% near / 25% deep filaments / 20% clouds / 5% distant';canvas.dataset.starDustFlowRate='near 0.0058–0.011 / authored deep 0.0032–0.005 curve cycles/sec';canvas.dataset.starDustResponse='inertial near wake / velocity-aligned micro trails / weighted middle / stable far stars';
 canvas.dataset.pointerField='shared-world-ray-currents';canvas.dataset.nebulaFlow='macro-advection-curl-moving-dust-lanes';
 return {count,particleScene,particleUniforms,get radianceState(){return nebula.uniforms;},
 setCloudSeaEnabled(reveal=1){nebula.setCloudSeaEnabled(reveal);},
 setWorldLayout(layout){
  const normalized=normalizeStellarLayout(layout);nebula.setWorldLayout(normalized);
  if(!normalized.flowCurves.length)return;
  const authored=normalized.flowCurves.map(flow=>({controls:cubicControls(new THREE.CatmullRomCurve3(flow.points.map(p=>new THREE.Vector3(...p)),false,'centripetal')),rate:flow.rate}));
  flowTargets=curvePoints.map(points=>points.slice());const targetRates=flowRates.slice();
  for(let i=0;i<count;i++)if(kinds[i]===1){const flow=authored[(lanes[i]-8)%authored.length];flow.controls.forEach((p,j)=>flowTargets[j].set(p.toArray(),i*3));targetRates[i]=flow.rate;}
  flowTargets.rates=targetRates;flowBlend=0;canvas.dataset.nebulaLayout='blender-authored-world';canvas.dataset.starDustLayout='blender-authored-curves';
 },invalidate(){nebula.invalidate();},update(frame,pointer,motion,dt,quality){
  nebula.updateLayout(dt);
  if(flowTargets&&flowBlend<1){
   const blend=1-Math.exp(-Math.min(.1,Math.max(0,dt))*2.1);flowBlend=Math.min(1,flowBlend+dt*.45);
   for(let j=0;j<4;j++){const points=curvePoints[j],targets=flowTargets[j];for(let i=0;i<points.length;i++)points[i]=flowBlend===1?targets[i]:THREE.MathUtils.lerp(points[i],targets[i],blend);geo.attributes[`aCurve${j}`].needsUpdate=true;}
   for(let i=0;i<flowRates.length;i++){flowRates[i]=flowBlend===1?flowTargets.rates[i]:THREE.MathUtils.lerp(flowRates[i],flowTargets.rates[i],blend);flowData[i*3+2]=flowRates[i];}
   geo.attributes.aFlow.needsUpdate=true;
  }
  if(lastStep!==frame.step||lastSector!==frame.sector){nebula.invalidate();lastStep=frame.step;}
  if(lastSector!==frame.sector){lastSector=frame.sector;const sector=sectors.find(s=>s.id===frame.sector);targetColor.set(sector?.color||0xa8c4d9).lerp(mistColor,.55);}
  uniforms.uColor.value.lerp(targetColor,motion?1-Math.exp(-dt*1.7):1);
  const welcome=frame.step==='bridge'&&!frame.opening,reading=welcome||['captain','docked'].includes(frame.step);
  const particleDensity=reading?.93:1,volumeDensity=welcome||frame.step==='captain'?.88:frame.step==='map'?.90:reading?.85:.95;
  uniforms.uDensity.value=motion?THREE.MathUtils.damp(uniforms.uDensity.value,particleDensity,2.4,dt):particleDensity;if(!pixelHeight)uniforms.uHeight.value=innerHeight;
  nebula.uniforms.uDensity.value=motion?THREE.MathUtils.damp(nebula.uniforms.uDensity.value,volumeDensity,2,dt):volumeDensity;
  // The render loop owns ray smoothing, UI response and motion freezing. Keeping
  // these uniform references shared avoids a second, mismatched pointer clock.
  nebula.setQuality(quality);
  traceCurrents();
  const stamp=Math.floor(time.value*2);if(stamp!==lastStamp){lastStamp=stamp;canvas.dataset.nebulaTime=time.value.toFixed(2);canvas.dataset.nebulaResolution=`${nebula.target.width}×${nebula.target.height}`;}
 }};
}

