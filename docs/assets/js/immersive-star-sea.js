import * as THREE from 'three';
import {loadTemAsset} from './immersive-blender-assets.js?v=cinematic-v21.1';
import {normalizeStellarLayout} from './immersive-world-layout.js?v=cinematic-v21.1';
import {createProceduralPlanetMaterial,createProceduralPlanetClouds} from './immersive-procedural-planet.js?v=cinematic-v21.1';

// The geometry and layout are exported from the same editable Blender scene.
// Dynamic bands remain real world meshes, so both the main view and floor's
// virtual camera see the same current, rather than a composited image overlay.
export function createStarSea({scene,canvas,time,interaction,compact=()=>false,onLayout,onReady}={}){
 const root=new THREE.Group();root.name='Tem.Blender.living-star-sea';scene.add(root);
 const effects=new THREE.Group();effects.name='Tem.star-sea.world-energy';root.add(effects);
 const isCompact=()=>typeof compact==='function'?Boolean(compact()):Boolean(compact);
 const power={value:0},pixelHeight={value:innerHeight},uniforms={uSeaTime:time,uSeaPower:power,uSeaPixelHeight:pixelHeight,...interaction.uniforms};
 let asset=null,layout=null,flowMaterial=null,moteMaterial=null,ownedPlanets=[],disposed=false,ready=false,lastStamp=-1;
 function buildFlow(metadata){
  const paths=metadata.flowCurves,positions=[],uvs=[],colors=[],rates=[],indices=[],motes=[],seeds=[],control=[[],[],[],[]];
  const sideAxis=new THREE.Vector3(.12,1,.16),side=new THREE.Vector3();let vertexCount=0;
  for(let pathIndex=0;pathIndex<paths.length;pathIndex++){
   const spec=paths[pathIndex],points=spec.points.map(p=>new THREE.Vector3(...p)),curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
   const segments=isCompact()?72:112,width=Math.max(.12,Math.min(2.4,spec.width||.45));
   const color=spec.color||[.08,.35,.80],end=spec.colors?.[1]||[.39,.16,.59];
   for(let layer=0;layer<3;layer++){
    const breadth=width*[5.5,1.4,.18][layer],start=vertexCount;
    for(let i=0;i<=segments;i++){
     const t=i/segments,p=curve.getPoint(t),tangent=curve.getTangent(t);side.crossVectors(tangent,sideAxis).normalize();
     const hue=color.map((v,k)=>THREE.MathUtils.lerp(v,end[k],t));
     for(const sign of [-1,1]){const q=p.clone().addScaledVector(side,breadth*sign);positions.push(...q.toArray());uvs.push(t,sign,layer);colors.push(...hue);rates.push(spec.emissionRate||.037);vertexCount++;}
     if(i<segments){const j=start+i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
    }
   }
   // Cubic segments describe the authored curve. A packet carries a point
   // through each independent segment with seamless fade at its two ends.
   const count=isCompact()?56:112;
   for(let i=0;i<count;i++){
    const segment=i%(points.length-1),a=points[segment],b=points[segment+1],before=points[Math.max(0,segment-1)],after=points[Math.min(points.length-1,segment+2)];
    const handles=[a,a.clone().add(b.clone().sub(before).multiplyScalar(1/6)),b.clone().sub(after.clone().sub(a).multiplyScalar(1/6)),b];
    handles.forEach((point,k)=>control[k].push(...point.toArray()));motes.push(0,0,0);seeds.push((i*.61803398875)%1,(i*.754877666+pathIndex*.29)%1,width);
   }
  }
  if(!positions.length)return;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aFlow',new THREE.Float32BufferAttribute(uvs,3));geometry.setAttribute('aColor',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('aRate',new THREE.Float32BufferAttribute(rates,1));geometry.setIndex(indices);geometry.computeBoundingSphere();
  const warp=`vec3 currentWarp(vec3 p){vec3 delta=p-uPointerOrigin;float along=dot(delta,uPointerDirection);vec3 across=delta-uPointerDirection*along;
   float reach=30.+clamp(along,0.,1000.)*.085,influence=exp(-dot(across,across)/(reach*reach))*smoothstep(8.,70.,along)*(1.-smoothstep(1000.,1700.,along))*uPointerPower;
   return p+cross(uPointerDirection,across)*influence*(.07+uPointerSpeed*.16);}`;
  flowMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
   vertexShader:`attribute vec3 aFlow,aColor;attribute float aRate;uniform float uSeaTime,uPointerPower,uPointerSpeed;uniform vec3 uPointerOrigin,uPointerDirection;
    varying vec3 vFlow,vColor;varying float vRate;${warp}void main(){vFlow=aFlow;vColor=aColor;vRate=aRate;
     vec3 p=position;p+=vec3(sin(aFlow.x*9.-uSeaTime*.10),cos(aFlow.x*7.+uSeaTime*.08),sin(aFlow.x*11.+uSeaTime*.06))*.14;
     gl_Position=projectionMatrix*modelViewMatrix*vec4(currentWarp(p),1.);}`,
   fragmentShader:`uniform float uSeaTime,uSeaPower;varying vec3 vFlow,vColor;varying float vRate;
    void main(){float side=abs(vFlow.y),band=exp(-side*side*5.5),packet=pow(.5+.5*sin(vFlow.x*19.-uSeaTime*vRate*6.283185),16.);
     float fade=smoothstep(0.,.025,vFlow.x)*(1.-smoothstep(.965,1.,vFlow.x));
     float strength=vFlow.z<.5?.024:vFlow.z<1.5?.095:.33;
     vec3 color=mix(vColor,vec3(.52,.70,.87),packet*.25);gl_FragColor=vec4(color*(.72+packet*.75),band*strength*(.40+packet*.60)*fade*uSeaPower);}`});
  const bands=new THREE.Mesh(geometry,flowMaterial);bands.name='Tem.star-sea.Blender-energy-curves';bands.userData.dynamic=true;bands.frustumCulled=false;effects.add(bands);
  const moteGeometry=new THREE.BufferGeometry();moteGeometry.setAttribute('position',new THREE.Float32BufferAttribute(motes,3));moteGeometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,3));control.forEach((points,k)=>moteGeometry.setAttribute('aControl'+k,new THREE.Float32BufferAttribute(points,3)));
  moteMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false,
   vertexShader:`attribute vec3 aSeed,aControl0,aControl1,aControl2,aControl3;uniform float uSeaTime,uSeaPower,uSeaPixelHeight,uPointerPower,uPointerSpeed;uniform vec3 uPointerOrigin,uPointerDirection;
    varying float vAlpha,vTint;${warp}void main(){float t=fract(aSeed.x+uSeaTime*(.015+aSeed.y*.012)),s=1.-t;
     vec3 p=aControl0*s*s*s+3.*aControl1*s*s*t+3.*aControl2*s*t*t+aControl3*t*t*t;
     p+=vec3(sin(aSeed.y*31.+t*7.),cos(aSeed.y*19.+t*9.),sin(aSeed.y*43.+t*8.))*aSeed.z*1.8;
     vec4 eye=modelViewMatrix*vec4(currentWarp(p),1.);gl_Position=projectionMatrix*eye;gl_PointSize=clamp(uSeaPixelHeight*(.05+aSeed.y*.12)/max(1.,-eye.z),.8,3.2);
     vAlpha=smoothstep(0.,.07,t)*(1.-smoothstep(.90,1.,t))*(.28+aSeed.y*.34)*uSeaPower;vTint=aSeed.y;}`,
   fragmentShader:`varying float vAlpha,vTint;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;vec3 color=mix(vec3(.18,.48,.88),vec3(.63,.34,.82),vTint);gl_FragColor=vec4(color,exp(-r*r*28.)*vAlpha);}`});
  const dust=new THREE.Points(moteGeometry,moteMaterial);dust.name='Tem.star-sea.curve-packets';dust.userData.dynamic=true;dust.frustumCulled=false;effects.add(dust);
 }
 const loading=(async()=>{
  try{
   const url=new URL('../models/tem-star-sea-v20.json',import.meta.url);url.search=new URL(import.meta.url).search;
   const response=await fetch(url);if(!response.ok)throw new Error('Star-sea layout '+response.status);
   const metadata=await response.json();layout=normalizeStellarLayout(metadata);onLayout?.(metadata);
   buildFlow(layout);
   asset=await loadTemAsset({name:isCompact()?'starSeaLod':'starSea',canvas,onLoad:model=>{
    if(disposed)return;
    for(const spec of metadata.planets||[]){
     const planet=model.find(spec.id);if(!planet?.isMesh)continue;
     const original=planet.material;planet.material=createProceduralPlanetMaterial({time,sunDirection:layout.sunDirection,seed:spec.seed,rocky:/MOON/i.test(spec.id),center:spec.center,tint:new THREE.Color(...spec.color)});original.dispose();ownedPlanets.push({material:planet.material});
     // Each exported sphere has baked world vertices. Copying its world pose
     // here keeps satellite weather at the authored centre and radial depth.
     if(/MOON/i.test(spec.id))continue;
     const vapor=createProceduralPlanetClouds({radius:spec.radius,time,sunDirection:layout.sunDirection,seed:spec.seed,compact});vapor.position.fromArray(spec.center);root.add(vapor);ownedPlanets.push(vapor);
    }
    model.root.traverse(node=>{if(!node.isMesh)return;node.castShadow=false;node.receiveShadow=false;for(const material of Array.isArray(node.material)?node.material:[node.material]){if(material.emissive)material.emissiveIntensity=Math.min(material.emissiveIntensity,.85);}});
    root.add(model.root);ready=true;canvas.dataset.starSea='blender-authored-live-depth';canvas.dataset.starSeaEnvironmentImages='0';canvas.dataset.starSeaGeometry=String(Math.round(model.triangleCount));canvas.dataset.starSeaFlowPaths=String(layout.flowCurves.length);onReady?.(effects);
   }});
   if(!asset)throw new Error('Star-sea geometry could not load');
  }catch(error){canvas.dataset.starSea='procedural-depth-fallback';canvas.dataset.starSeaError=String(error?.message||error);}
 })();
 return {root,effects,loading,get ready(){return ready;},update(dt,frame,motion,quality=1){
  power.value=THREE.MathUtils.damp(power.value,frame.opening?.62:frame.step==='captain'?.65:1,4,dt);pixelHeight.value=innerHeight*Math.min(devicePixelRatio||1,1.25)*Math.max(.56,quality);
  const stamp=Math.floor((time.value||0)*2);if(stamp!==lastStamp){lastStamp=stamp;canvas.dataset.starSeaFlowTime=(time.value||0).toFixed(2);canvas.dataset.starSeaFlowPower=power.value.toFixed(2);}
 },dispose(){disposed=true;root.removeFromParent();effects.traverse(node=>{node.geometry?.dispose();});flowMaterial?.dispose();moteMaterial?.dispose();ownedPlanets.forEach(node=>{node.geometry?.dispose();node.material?.dispose();});if(asset)asset.root.traverse(node=>{if(node.isMesh)for(const material of Array.isArray(node.material)?node.material:[node.material])material.dispose();});}};
}
