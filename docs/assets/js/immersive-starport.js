import * as THREE from 'three';
import {mergeGeometries} from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/utils/BufferGeometryUtils.js';
import {opticalEnvironment,opticalSkySample} from './immersive-optical.js?v=cinematic-v21.1';
import {buildDetailedFleet} from './immersive-starship-detail.js?v=cinematic-v21.1';
import {loadTemAsset} from './immersive-blender-assets.js?v=cinematic-v21.1';

const TAU=Math.PI*2;
function chamberFootprint(a,t=1,y=0){
 const r=7.45+.62*Math.sin(a+.8),rise=Math.max(0,Math.min(1,t)),h=.60+(.30*Math.sin(a-.6)+.20*Math.cos(a*2))*rise*rise*(3-2*rise);
 return new THREE.Vector3(Math.cos(a)*r*t*1.06,h+y,Math.sin(a)*r*t*.77);
}

// Three sealed ceramic petals surround the chamber. Each is a rounded,
// tapering cross section, with open service gaps between the petals. The
// footprint comes from the real well lip; no circular disc sits underneath.
function sweptShell({compact,start,length,lower=false}){
 const around=Math.max(compact?18:28,Math.ceil(length/TAU*(compact?72:128))),profile=[[0,0],[.04,.085],[.20,.175],[.52,.19],[.82,.11],[.98,-.015],[1.015,-.14],[1.009,-.28],[.985,-.405],[.81,-.48],[.48,-.49],[.18,-.42],[.02,-.27],[-.011,-.10],[0,0]],p=[],uv=[],ix=[];
 for(let i=0;i<=around;i++){
  const t=i/around,a=start+t*length,r=7.45+.62*Math.sin(a+.8),endEase=Math.pow(Math.sin(t*Math.PI),.40),width=(lower?2.20:1.75+1.35*Math.max(0,Math.sin(a))+.32*Math.cos(a*2-.7))*(.48+.52*endEase),h=lower?-2.02:.60+.30*Math.sin(a-.6)+.20*Math.cos(a*2);
  for(let j=0;j<profile.length;j++){
   const [u,v]=profile[j],radius=r+(lower?.08:0)+u*width;
   p.push(Math.cos(a)*radius*1.06,h+v*(lower?.75:1),Math.sin(a)*radius*.77);uv.push(t,j/(profile.length-1));
   if(i<around&&j<profile.length-1){const k=i*profile.length+j;ix.push(k,k+profile.length,k+1,k+1,k+profile.length,k+profile.length+1);}
  }
 }
 // Physical end caps seal the service openings. Their geometry is part of
 // the same material batch and does not introduce a transparent cutout.
 for(const end of [0,around]){
  const center=new THREE.Vector3();for(let j=0;j<profile.length-1;j++)center.add(new THREE.Vector3(...p.slice((end*profile.length+j)*3,(end*profile.length+j)*3+3)));center.multiplyScalar(1/(profile.length-1));const at=p.length/3;p.push(...center.toArray());uv.push(end/around,.5);
  for(let j=0;j<profile.length-1;j++){const k=end*profile.length+j;if(end===0)ix.push(at,k,k+1);else ix.push(at,k+1,k);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}

// The optical well has three manufactured ledges and an exposed central
// cavity. Continuous changes in slope create wide reflections instead of
// flat concentric display-platform rings.
function opticalWellGeometry(compact){
 const around=compact?72:128,profile=[[1,-.13],[.985,-.42],[.935,-.57],[.89,-.58],[.868,-.94],[.77,-1.04],[.73,-1.08],[.715,-1.50],[.53,-1.78],[.49,-1.79],[.465,-2.07],[.20,-2.30],[0,-2.37],[0,-2.45],[.20,-2.40],[.48,-2.18],[.72,-1.65],[.88,-.76],[.986,-.56],[1.011,-.30],[1,-.13]],p=[],uv=[],ix=[];
 for(let i=0;i<=around;i++){const a=i/around*TAU;profile.forEach(([t,y],j)=>{p.push(...chamberFootprint(a,t,y).toArray());uv.push(i/around,j/(profile.length-1));if(i<around&&j<profile.length-1){const k=i*profile.length+j;ix.push(k,k+1,k+profile.length,k+1,k+profile.length+1,k+profile.length);}});}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}

// A broad curved optical band follows the chamber footprint. Its small
// physical thickness catches grazing light; the back skin and edge are sealed.
function opticalBandGeometry({compact,start,length,t,y,width=.06,height=.05}){
 const segments=Math.max(12,Math.ceil(length/TAU*(compact?64:112))),profile=[[0,0],[width,0],[width,-height],[0,-height],[0,0]],p=[],uv=[],ix=[];
 for(let i=0;i<=segments;i++)for(let j=0;j<profile.length;j++){
  const [r,h]=profile[j];p.push(...chamberFootprint(start+i/segments*length,t+r,y+h).toArray());uv.push(i/segments,j/(profile.length-1));
  if(i<segments&&j<profile.length-1){const k=i*profile.length+j;ix.push(k,k+profile.length,k+1,k+1,k+profile.length,k+profile.length+1);}
 }
 for(const end of [0,segments]){const a=end*profile.length;if(end===0)ix.push(a,a+1,a+2,a,a+2,a+3);else ix.push(a,a+2,a+1,a,a+3,a+2);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}

// Closed, tapered elliptical lofts provide smooth hulls and broad curved berth
// arms. The section normal is taken from the actual 3D spine at every sample.
function curvedLoft(points,{compact,width=1,height=.3,sections=48,taper=true}={}){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),n=compact?Math.ceil(sections*.65):sections,sides=compact?10:16,positions=[],uvs=[],indices=[],frames=curve.computeFrenetFrames(n,false);
 for(let i=0;i<=n;i++){
  const t=i/n,p=curve.getPointAt(t),w=width*(taper?.78+.38*Math.sin(t*Math.PI)-.18*t:1),h=height*(taper?.70+.30*Math.sin(t*Math.PI):1);
  for(let j=0;j<=sides;j++){
   const a=j/sides*Math.PI*2,q=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*w).addScaledVector(frames.binormals[i],Math.sin(a)*h);positions.push(q.x,q.y,q.z);uvs.push(t,j/sides);
   if(i<n&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
  }
 }
 for(const end of [0,n]){const p=curve.getPointAt(end/n),at=positions.length/3;positions.push(p.x,p.y,p.z);uvs.push(end/n,.5);for(let j=0;j<sides;j++){const k=end*(sides+1)+j;if(end===0)indices.push(at,k+1,k);else indices.push(at,k,k+1);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return {geometry:g,curve};
}

function hullGeometry(rows,compact){
 const sides=compact?12:20,positions=[],uvs=[],indices=[],sections=(rows.length-1)*(compact?3:5),profile=new THREE.CatmullRomCurve3(rows.map(([,w,h,y])=>new THREE.Vector3(w,h,y)));
 for(let i=0;i<=sections;i++){const t=i/sections,u=t*(rows.length-1),at=Math.min(rows.length-2,Math.floor(u)),z=THREE.MathUtils.lerp(rows[at][0],rows[at+1][0],u-at),p=profile.getPoint(t),w=Math.max(.01,p.x),h=Math.max(.01,p.y),y=p.z;
  for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;positions.push(Math.cos(a)*w,y+Math.sin(a)*h,z);uvs.push(t,j/sides);if(i<sections&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}}
 }
 for(const end of [0,sections]){const row=rows[end===0?0:rows.length-1],at=positions.length/3;positions.push(0,row[3],row[0]);uvs.push(end/sections,.5);for(let j=0;j<sides;j++){const k=end*(sides+1)+j;if(end===0)indices.push(at,k+1,k);else indices.push(at,k,k+1);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function wingGeometry(points,depth=.12){
 const shape=new THREE.Shape();shape.moveTo(...points[0]);for(let i=1;i<points.length;i++)shape.lineTo(...points[i]);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSize:.07,bevelThickness:.035,bevelSegments:2,curveSegments:5});g.translate(0,0,-depth/2);g.rotateX(Math.PI/2);return g;
}

function sailGeometry(sign,compact){
 const n=compact?10:20,m=compact?6:10,p=[],uv=[],ix=[];
 for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
  const t=i/n,s=j/m,width=(.10+Math.sin(t*Math.PI)*1.9)*(1-t*.32);p.push(sign*(.3+s*width),.4+t*3.6,-1.6+t*.68+Math.sin(s*Math.PI)*Math.sin(t*Math.PI)*.78);uv.push(s,t);
  if(i<n&&j<m){const k=i*(m+1)+j;ix.push(k,k+1,k+m+1,k+1,k+m+2,k+m+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}

const poseShader=`attribute float aBay;uniform mat4 uShipPose[4];varying vec3 vWorld,vNormal,vLocal;varying vec2 vUv;varying float vBay,vIsShip;
 void main(){vIsShip=step(-.5,aBay);vec4 p=vec4(position,1.);vec3 n=normal;vBay=aBay>=0.?aBay:-aBay-2.;if(aBay>=0.){mat4 pose=uShipPose[0];if(aBay>.5)pose=uShipPose[1];if(aBay>1.5)pose=uShipPose[2];if(aBay>2.5)pose=uShipPose[3];p=pose*p;n=mat3(pose)*n;}vLocal=position;vUv=uv;vNormal=normalize(mat3(modelMatrix)*n);vec4 world=modelMatrix*p;vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`;

export function createOpticalStarport({parent,uniforms,colors,interaction,sectorIds=['forge','lumen','echo','nexus']}){
 const compact=innerWidth<700,root=new THREE.Group();root.name='Tem.asymmetric-levitating-starport';parent.add(root);
 const pointer=interaction?.uniforms||{},shipPoses=Array.from({length:4},()=>new THREE.Matrix4()),cloudTargets=Array.from({length:4},()=>new THREE.Vector3(0,20,-12)),levels=new Float32Array(4);
 const shared={...uniforms,...opticalEnvironment(),uAuthoredPlatform:{value:0},uAuthoredFleet:{value:0},uShipPose:{value:shipPoses},uBayEngagement:{value:levels},uBayColor:{value:colors},uDeparture:{value:0},uSelected:{value:0},uHover:{value:-1},uCloudTargets:{value:cloudTargets},uHeight:{value:innerHeight},uRimWorld:{value:new THREE.Vector3(35,22,-55)},uPointerOrigin:pointer.uPointerOrigin||{value:new THREE.Vector3()},uPointerDirection:pointer.uPointerDirection||{value:new THREE.Vector3(0,0,-1)},uPointerPower:pointer.uPointerPower||{value:0},uPointerSpeed:pointer.uPointerSpeed||{value:0}};
 const material=(base,metal=0,glass=false,roughness=.28)=>new THREE.ShaderMaterial({uniforms:{...shared,uBase:{value:new THREE.Color().setRGB(...base)},uMetal:{value:metal},uRoughness:{value:roughness}},vertexShader:poseShader,transparent:glass,depthWrite:!glass,side:glass?THREE.DoubleSide:THREE.FrontSide,
  fragmentShader:`uniform sampler2D uSky;uniform float uSkyReady,uTime,uPower,uResponse,uSelected,uHover,uMetal,uRoughness,uPointerPower,uPointerSpeed,uBayEngagement[4];uniform vec3 uBase,uActiveColor,uSourceWorld,uKeyWorld,uRimWorld,uPointerOrigin,uPointerDirection,uBayColor[4];varying vec3 vWorld,vNormal,vLocal;varying vec2 vUv;varying float vBay,vIsShip;uniform float uAuthoredPlatform,uAuthoredFleet;${opticalSkySample}
   vec3 fresnel(vec3 f0,float vh){return f0+(1.-f0)*pow(1.-vh,5.);}
   vec3 illuminate(vec3 n,vec3 eye,vec3 light,vec3 radiance,float rough,vec3 f0){vec3 halfDirection=normalize(light+eye);float nl=max(0.,dot(n,light)),nv=max(.02,dot(n,eye)),nh=max(0.,dot(n,halfDirection)),vh=max(0.,dot(eye,halfDirection));float a=rough*rough,a2=a*a,denom=nh*nh*(a2-1.)+1.,d=a2/max(.0001,3.14159*denom*denom),k=(rough+1.)*(rough+1.)*.125,g=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);vec3 f=fresnel(f0,vh),spec=d*g*f/max(.008,4.*nv*nl);return ((1.-f)*(1.-uMetal)*uBase*.31831+spec)*radiance*nl;}
   void main(){if(uAuthoredPlatform>.5&&vIsShip<.5||uAuthoredFleet>.5&&vIsShip>.5)discard;vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 eye=normalize(cameraPosition-vWorld),key=normalize(uKeyWorld-vWorld),source=normalize(uSourceWorld-vWorld);float nv=max(.02,dot(n,eye)),f=pow(1.-nv,3.);
    float grain=fract(sin(dot(floor(vLocal*83.),vec3(12.9898,78.233,39.346)))*43758.5453),rough=clamp(uRoughness+(grain-.5)*.028,.08,.80);vec3 f0=mix(vec3(.042),uBase,uMetal),reflected=skyReflection(reflect(-eye,n));
    float engagement=uBayEngagement[0];vec3 bayColor=uBayColor[0];if(vBay>.5){engagement=uBayEngagement[1];bayColor=uBayColor[1];}if(vBay>1.5){engagement=uBayEngagement[2];bayColor=uBayColor[2];}if(vBay>2.5){engagement=uBayEngagement[3];bayColor=uBayColor[3];}engagement*=step(-.5,vBay);vec3 delta=vWorld-uPointerOrigin,radial=delta-uPointerDirection*max(0.,dot(delta,uPointerDirection));float field=exp(-dot(radial,radial)*.035)*uPointerPower;
    float skyFill=.075+.11*max(0.,n.y),occlusion=mix(.55,1.,smoothstep(-.55,.35,n.y));vec3 c=uBase*vec3(.54,.70,1.)*skyFill*occlusion;
    c+=illuminate(n,eye,key,vec3(1.0,.91,.80)*3.4,rough,f0);c+=illuminate(n,eye,normalize(uRimWorld-vWorld),vec3(.40,.66,1.)*1.6,rough,f0);
    float sourceFalloff=1./(1.+dot(uSourceWorld-vWorld,uSourceWorld-vWorld)*.035);c+=illuminate(n,eye,source,uActiveColor*sourceFalloff*.85,rough,f0);
    c+=reflected*fresnel(f0,nv)*(.72+uMetal*.80)*(1.-rough*.55);float coat=pow(max(0.,dot(n,normalize(key+eye))),140.)*max(0.,dot(n,key));c+=vec3(.63,.79,1.)*coat*.16*(1.-uMetal);
    c+=uActiveColor*field*.065*(f+.12)+bayColor*engagement*.075*(f+.12);${glass?'vec3 refracted=skyReflection(refract(-eye,n,.70));c=c*.42+refracted*.60+mix(uActiveColor,bayColor,engagement)*f*.11;gl_FragColor=vec4(c,.075+f*.46+field*.035);':'gl_FragColor=vec4(c,1.);'}}`
 });
 const ceramic=material([.39,.45,.53],.04,false,.26),titanium=material([.37,.28,.18],.72,false,.30),dark=material([.025,.042,.071],.46,false,.38),glass=material([.09,.20,.32],.06,true,.13);
 const glow=new THREE.ShaderMaterial({uniforms:shared,vertexShader:poseShader,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  fragmentShader:`uniform float uTime,uSelected,uHover,uPower,uBayEngagement[4];uniform vec3 uActiveColor,uBayColor[4];varying vec2 vUv;varying float vBay,vIsShip;uniform float uAuthoredPlatform,uAuthoredFleet;void main(){if(uAuthoredPlatform>.5&&vIsShip<.5||uAuthoredFleet>.5&&vIsShip>.5)discard;float engagement=uBayEngagement[0];vec3 bayColor=uBayColor[0];if(vBay>.5){engagement=uBayEngagement[1];bayColor=uBayColor[1];}if(vBay>1.5){engagement=uBayEngagement[2];bayColor=uBayColor[2];}if(vBay>2.5){engagement=uBayEngagement[3];bayColor=uBayColor[3];}engagement*=step(-.5,vBay);float pulse=exp(-pow(fract(vUv.x-uTime*.11)-.36,2.)*250.);vec3 c=mix(vec3(.36,.69,.98),vec3(1.,.72,.45),vUv.y*.25);c=mix(c,bayColor,engagement*.80);gl_FragColor=vec4(c*(.52+pulse*(.22+engagement*.60)+engagement*.78),.19+engagement*.43);}`
 });
 const batches=new Map([[ceramic,[]],[titanium,[]],[dark,[]],[glass,[]],[glow,[]]]),pickParts=Array.from({length:4},()=>[]),transform=new THREE.Object3D();
 function part(g,mat,p=[0,0,0],rotation=[0,0,0],scale=[1,1,1],bay=-1){
  transform.position.fromArray(p);transform.rotation.set(...rotation);transform.scale.fromArray(scale);transform.updateMatrix();g.applyMatrix4(transform.matrix);const flat=g.index?g.toNonIndexed():g;flat.setAttribute('aBay',new THREE.Float32BufferAttribute(new Float32Array(flat.attributes.position.count).fill(bay),1));batches.get(mat).push(flat);if(bay>=0&&mat!==glow)pickParts[bay].push(flat.clone());if(flat!==g)g.dispose();
 }
 const lathe=(profile,mat,p=[0,0,0],rotation=[0,0,0],bay=-1,start=0,length=Math.PI*2)=>part(new THREE.LatheGeometry(profile.map(a=>new THREE.Vector2(...a)),compact?48:96,start,length),mat,p,rotation,[1,1,1],bay);
 const tube=(curve,r,mat,bay=-1,n=64)=>part(new THREE.TubeGeometry(curve,compact?Math.ceil(n*.65):n,r,5,false),mat,[0,0,0],[0,0,0],[1,1,1],bay);
 const petalArcs=[[.10,2.80],[3.23,1.40],[4.87,1.25]],lowerArcs=[[.23,2.48],[3.35,1.17],[5.03,.96]];
 petalArcs.forEach(([start,length])=>part(sweptShell({compact,start,length}),ceramic));
 lowerArcs.forEach(([start,length])=>part(sweptShell({compact,start,length,lower:true}),dark));
 // The open chamber and two separated optical lenses expose a luminous source
 // through a physical gap. They do not enclose the star atlas in a glass globe.
 part(opticalWellGeometry(compact),dark);
 petalArcs.forEach(([start,length])=>{
  const innerEdge=Array.from({length:compact?37:65},(_,i)=>chamberFootprint(start+i/(compact?36:64)*length,1,-.13));tube(new THREE.CatmullRomCurve3(innerEdge),.045,titanium,-1,compact?36:64);
 });
 for(const [t,y,start,length] of [[.891,-.56,.25,2.20],[.734,-1.065,3.20,2.54],[.493,-1.785,.82,2.05]]){
  part(opticalBandGeometry({compact,t,y,start,length,width:.035,height:.09}),titanium);
  part(opticalBandGeometry({compact,t:t+.011,y:y+.014,start:start+.06,length:length-.12,width:.006,height:.015}),glow);
 }
 // An offset glass shoulder floats above the rear ledge. Through it the
 // dark bowl and optical source remain visible as separate physical layers.
 part(opticalBandGeometry({compact,t:.90,y:-.42,start:3.22,length:2.63,width:.044,height:.045}),glass);
 lathe([[1.10,-1.96],[1.25,-1.90],[1.45,-1.62],[1.41,-1.4],[1.18,-1.35]],titanium);
 for(let i=0;i<2;i++)part(new THREE.SphereGeometry(1.18,compact?20:36,compact?14:24,.20,Math.PI*.66,.30,Math.PI*.74),glass,[i?-.34:.34,.68,0],[0,i*Math.PI+.15,0],[1,.80,1]);
 part(new THREE.IcosahedronGeometry(.46,2),glow,[0,.68,0],[.18,.45,.1]);
 for(let i=0;i<3;i++)part(new THREE.TorusGeometry(1.35+i*.48,.024,5,compact?48:80,Math.PI*1.65),glow,[0,-.15+i*.47,0],[Math.PI/2,.11+i*.15,i*.72]);
 // Recessed hardware follows the real basin rather than a screen-space grid.
 for(let i=0;i<12;i++){const a=(Math.floor(i/4)*2.08+.45)+(i%4)*.14,p=chamberFootprint(a,.775,-1.07).toArray();part(new THREE.BoxGeometry(.17,.105,.40),titanium,p,[.22,-a+Math.PI/2,0]);part(new THREE.BoxGeometry(.033,.02,.26),glow,[p[0],p[1]+.062,p[2]],[.22,-a+Math.PI/2,0]);}
 petalArcs.forEach(([start,length])=>{
  const upperEdge=Array.from({length:compact?37:65},(_,i)=>{const t=i/(compact?36:64),a=start+t*length,r=7.45+.62*Math.sin(a+.8),width=(1.75+1.35*Math.max(0,Math.sin(a))+.32*Math.cos(a*2-.7))*(.48+.52*Math.pow(Math.sin(t*Math.PI),.40));return new THREE.Vector3(Math.cos(a)*(r+width)*1.06,.60+.30*Math.sin(a-.6)+.20*Math.cos(a*2)-.31,Math.sin(a)*(r+width)*.77);});
  tube(new THREE.CatmullRomCurve3(upperEdge),.030,titanium,-1,compact?36:64);tube(new THREE.CatmullRomCurve3(upperEdge.map(p=>p.clone().add(new THREE.Vector3(0,.08,0)))),.013,glow,-1,compact?36:64);
 });
 const sourcePosition=new THREE.Vector3(0,1.30,0);
 // Six service bridges sit behind the lip. Wide empty intervals expose
 // both the lower optical shell and deep space through the separated skins.
 for(const a of [.47,1.07,1.92,2.50,3.92,5.52]){const r=8.85,points=[[Math.cos(a)*r*1.06,-.14,Math.sin(a)*r*.77],[Math.cos(a)*(r-.24)*1.06,-1.03,Math.sin(a)*(r-.24)*.77],[Math.cos(a)*(r+.05)*1.06,-1.97,Math.sin(a)*(r+.05)*.77]];part(curvedLoft(points,{compact,width:.18,height:.12,sections:12,taper:false}).geometry,titanium);tube(new THREE.CatmullRomCurve3(points.map(([x,y,z])=>new THREE.Vector3(x,y,z))),.014,glow,-1,12);}
 const poses=[[-10,6.30,-8],[11.5,6.60,-10],[-13,3.75,2.3],[15,3.5,.4]],yaw=[.72,-.45,.86,-.68];
 const spines=[
  [[-7,1.1,-2],[-5.2,2.2,-6],[-5.8,3.8,-10.2],[-9,4.9,-10.4],[-10,5.27,-8]],
  [[6,1.1,-2],[7.2,2.2,-4.5],[6.8,3.7,-9],[10.9,5.1,-11.4],[11.5,5.57,-10]],
  [[-10,.9,4.5],[-14,1.2,5.6],[-15.3,2.1,1],[-13,2.72,2.3]],
  [[11,.75,3],[16,1.2,3],[17.7,2.1,-1.2],[15,2.47,.4]]
 ];
 spines.forEach((points,i)=>{
  const loft=curvedLoft(points,{compact,width:i<2?1.18:1.32,height:.29,sections:68});part(loft.geometry,ceramic,[0,0,0],[0,0,0],[1,1,1],-i-2);
  const edge=new THREE.CatmullRomCurve3(points.map(([x,y,z])=>new THREE.Vector3(x+.42,y-.23,z)));tube(edge,.05,titanium,-i-2,70);
  const light=new THREE.CatmullRomCurve3(points.map(([x,y,z])=>new THREE.Vector3(x-.42,y+.22,z)));tube(light,.025,glow,-i-2,70);
  const p=poses[i].slice();p[1]-=1.03;
  part(new THREE.CylinderGeometry(1.72,1.60,.24,compact?24:48),dark,p,[0,yaw[i],0],[1.1,1,.67],-i-2);
  lathe([[1.5,.14],[1.65,.15],[1.75,.08],[1.66,-.02]],titanium,p,[0,yaw[i],0],-i-2);
  part(new THREE.TorusGeometry(1.56,.035,5,compact?40:72),glow,[p[0],p[1]+.19,p[2]],[Math.PI/2,0,0],[1.1,.67,1],-i-2);
 });
 buildDetailedFleet({compact,part,tube,lathe,curvedLoft,hullGeometry,wingGeometry,sailGeometry,materials:{ceramic,titanium,dark,glass,glow}});
 const proceduralBatches=[];
 for(const [mat,geometries] of batches){const g=mergeGeometries(geometries,false);geometries.forEach(a=>a.dispose());if(!g)continue;const mesh=new THREE.Mesh(g,mat);mesh.name='Tem.starport.'+(mat===ceramic?'pearl-ceramic':mat===glass?'optical-glass':mat===titanium?'warm-titanium':mat===glow?'inset-light':'blue-black-optics');mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;mesh.userData.visualOnly=true;root.add(mesh);proceduralBatches.push(mesh);}
 const trailCount=compact?280:600,trailPosition=new Float32Array(trailCount*3),trailSeeds=new Float32Array(trailCount),trailBay=new Float32Array(trailCount);let seed=9113;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<trailCount;i++){trailSeeds[i]=rand();trailBay[i]=i%4;trailPosition.set([(rand()-.5)*2,(rand()-.5)*2,(rand()-.5)*2],i*3);}
 const trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPosition,3));trailGeo.setAttribute('aSeed',new THREE.BufferAttribute(trailSeeds,1));trailGeo.setAttribute('aBay',new THREE.BufferAttribute(trailBay,1));
 const trails=new THREE.Points(trailGeo,new THREE.ShaderMaterial({uniforms:shared,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:`attribute float aSeed,aBay;uniform mat4 uShipPose[4];uniform vec3 uCloudTargets[4],uBayColor[4],uPointerOrigin,uPointerDirection;uniform float uTime,uHeight,uSelected,uHover,uPointerPower,uPointerSpeed,uBayEngagement[4],uDeparture;varying float vAlpha,vSeed;varying vec3 vTint;
   void main(){mat4 pose=uShipPose[0];vec3 target=uCloudTargets[0],tint=uBayColor[0];float engagement=uBayEngagement[0];if(aBay>.5){pose=uShipPose[1];target=uCloudTargets[1];tint=uBayColor[1];engagement=uBayEngagement[1];}if(aBay>1.5){pose=uShipPose[2];target=uCloudTargets[2];tint=uBayColor[2];engagement=uBayEngagement[2];}if(aBay>2.5){pose=uShipPose[3];target=uCloudTargets[3];tint=uBayColor[3];engagement=uBayEngagement[3];}float launch=(1.-step(.5,abs(aBay-uSelected)))*uDeparture;float t=fract(uTime*.13+aSeed);vec3 source=(pose*vec4((aSeed>.5?.82:-.82),-.15,-3.1,1.)).xyz,delta=target-source;vec3 p=mix(source,target,t);p+=vec3(sin(t*5.4+aSeed*6.28)*2.5,sin(t*3.14159)*4.,cos(t*4.7+aSeed*6.28)*2.)*sin(t*3.14159)*(1.-engagement*.36);p+=position*(.12+t*(.68-engagement*.28));vec4 world=modelMatrix*vec4(p,1.);vec3 rayDelta=world.xyz-uPointerOrigin,radial=rayDelta-uPointerDirection*max(0.,dot(rayDelta,uPointerDirection));float field=exp(-dot(radial,radial)*.015)*uPointerPower;p+=cross(normalize(uPointerDirection+vec3(.001)),position)*field*sin(t*3.14159)*(1.+min(uPointerSpeed,2.)*.7);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(uHeight*(.024+pow(aSeed,13.)*.036)/max(1.,-mv.z),1.,3.4);vAlpha=(.065+engagement*.56+launch*.18+field*.13)*sin(t*3.14159)*smoothstep(2.,8.,-mv.z);vSeed=aSeed;vTint=mix(vec3(.40,.75,1.05),tint,engagement*.85);}`,
  fragmentShader:'varying float vAlpha,vSeed;varying vec3 vTint;void main(){vec2 p=gl_PointCoord-.5;float r=dot(p,p);if(r>.25)discard;gl_FragColor=vec4(vTint*(1.1+step(.975,vSeed)*1.4),exp(-r*48.)*vAlpha);}'
 }));trails.name='Tem.starport.launch-particles';trails.frustumCulled=false;trails.userData.visualOnly=true;root.add(trails);
 const lamp=new THREE.PointLight(0xc5d8f5,25,28,2);lamp.position.copy(sourcePosition);root.add(lamp);
 const pickingMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});pickingMaterial.visible=false;
 const picking=pickParts.map((parts,i)=>{const geo=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());const ship=new THREE.Mesh(geo,pickingMaterial);ship.name='Tem.starport.pick-'+i;ship.userData.sector=sectorIds[i];ship.matrixAutoUpdate=false;root.add(ship);return ship;});
 let authoredPort=null,authoredFleet=null;
 loadTemAsset({name:'starport',desktopOnly:true,canvas:document.getElementById('space'),onLoad:model=>{
  if(!model.find('STARPORT'))throw new Error('Missing authored starport.');
  root.add(model.root);authoredPort=model.root;dispatchEvent(new Event('tem:scene-depth-change'));
 }});
 loadTemAsset({name:compact?'fleetLod':'fleet',canvas:document.getElementById('space'),onLoad:model=>{
  const ships=Array.from({length:4},(_,i)=>model.find('SHIP_'+i));
  if(ships.some(ship=>!ship))throw new Error('Missing authored fleet roots.');
  for(const ship of ships)ship.matrixAutoUpdate=false;
  root.add(model.root);authoredFleet=ships;
  const canvas=document.getElementById('space');if(canvas)canvas.dataset.fleetV21=compact?'lod':'full';
  dispatchEvent(new Event('tem:scene-depth-change'));
 }});
 const pose=new THREE.Object3D(),inverse=new THREE.Matrix4();let ready=false,lastSelected=-1,lastHover=-1;
 function setPose(i,time,level,motion){pose.position.fromArray(poses[i]);pose.position.y+=level*.73+(motion?Math.sin(time*.30+i*1.71)*.055:0);pose.rotation.set(-.025-level*.10,yaw[i],(i%2?-.035:.035)*level);pose.scale.setScalar(i===2?1.25:i===3?1.34:1.55);pose.updateMatrix();shipPoses[i].copy(pose.matrix);picking[i].matrix.copy(pose.matrix);picking[i].matrixWorldNeedsUpdate=true;}
 poses.forEach((p,i)=>setPose(i,0,0,false));
 return {root,sourcePosition,picking,get responseLevel(){return Math.max(...levels);},layout(){shared.uHeight.value=innerHeight;},setTargets(centers,cloudMatrix){root.updateWorldMatrix(true,false);inverse.copy(root.matrixWorld).invert();centers.forEach((p,i)=>cloudTargets[i].fromArray(p).applyMatrix4(cloudMatrix).applyMatrix4(inverse));},update(dt,time,motion,selected,hover,energy,departure=0){
  // A paused cloud cache still needs the new silhouette after a discrete pose change.
  const useAuthored=innerWidth>=700;
  if(authoredPort)authoredPort.visible=useAuthored;
  if(authoredFleet)for(let i=0;i<4;i++){authoredFleet[i].visible=true;authoredFleet[i].matrix.copy(shipPoses[i]);authoredFleet[i].matrixWorldNeedsUpdate=true;}
  shared.uAuthoredPlatform.value=authoredPort&&useAuthored?1:0;shared.uAuthoredFleet.value=authoredFleet?1:0;
  for(const mesh of proceduralBatches)mesh.visible=!(shared.uAuthoredPlatform.value&&shared.uAuthoredFleet.value);
  const discrete=!ready||selected!==lastSelected||hover!==lastHover;
  if(!motion&&discrete)dispatchEvent(new Event('tem:scene-depth-change'));
  if(motion)shared.uTime.value=time;shared.uSelected.value=selected;shared.uHover.value=hover;shared.uHeight.value=innerHeight;
  if(motion)shared.uDeparture.value=THREE.MathUtils.damp(shared.uDeparture.value,Math.max(0,Math.min(1,departure)),5.4,dt);else if(discrete)shared.uDeparture.value=0;
  levels.forEach((value,i)=>{const target=hover===i?1:selected===i?Math.max(.38,shared.uDeparture.value*.78):0;if(motion)levels[i]=THREE.MathUtils.damp(value,target,hover===i?5.8:3.3,dt);else if(discrete)levels[i]=target;if(motion||discrete)setPose(i,time,levels[i],motion);});
  if(authoredFleet)for(let i=0;i<4;i++){authoredFleet[i].matrix.copy(shipPoses[i]);authoredFleet[i].matrixWorldNeedsUpdate=true;}
  const activeColor=colors[hover>=0?hover:selected]||colors[0],lampTarget=24+energy*8+Math.max(...levels)*9;
  if(motion){lamp.color.lerp(activeColor,1-Math.exp(-dt*5.8));lamp.intensity=THREE.MathUtils.damp(lamp.intensity,lampTarget,5.8,dt);}else if(discrete){lamp.color.copy(activeColor);lamp.intensity=lampTarget;}
  ready=true;lastSelected=selected;lastHover=hover;
 }};
}
