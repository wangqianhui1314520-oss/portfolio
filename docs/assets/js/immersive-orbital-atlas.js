import * as THREE from 'three';
import {hardwareMaterials,hardwareMesh} from './immersive-hardware.js?v=cinematic-v21.1';
import {projectWorldSurface} from './immersive-world-surface.js?v=cinematic-v21.1';
import {opticalFilm,createEnergyRibbons,opticalEnvironment,opticalSkySample} from './immersive-optical.js?v=cinematic-v21.1';
import {createOpticalStarport} from './immersive-starport.js?v=cinematic-v21.1';
import {createStarportWorld} from './immersive-starport-world.js?v=cinematic-v21.1';

const cloudNoise=`float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
 vec3 cloudTint(float cluster,float seed){vec3 c=vec3(.40,.68,1.12);if(cluster>-.5&&cluster<.5)c=vec3(.28,.65,1.22);else if(cluster<1.5&&cluster>.5)c=vec3(.56,.35,1.15);else if(cluster<2.5&&cluster>1.5)c=vec3(1.02,.39,.84);else if(cluster>2.5)c=vec3(.22,.90,1.10);return mix(c,vec3(1.10,1.12,1.20),pow(seed,9.)*.32);}`;

// The same tiled 3D density format as NebulaPass, built once and shared by the
// four local volumes. Adjacent slices interpolate in Z on WebGL 1 as well.
function atlasDensityTexture(){
 let seed=27191;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const layers=[8,16,32].map(n=>({n,values:Float32Array.from({length:n*n*n},random)}));
 const side=32,tile=34,width=272,height=136,data=new Uint8Array(width*height*4),smooth=x=>x*x*(3-2*x),lerp=(a,b,t)=>a+(b-a)*t;
 function sample({n,values},x,y,z){
  x*=n;y*=n;z*=n;const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=smooth(x-ix),fy=smooth(y-iy),fz=smooth(z-iz);
  const at=(dx,dy,dz)=>values[((iz+dz)%n)*n*n+((iy+dy)%n)*n+(ix+dx)%n];
  return lerp(lerp(lerp(at(0,0,0),at(1,0,0),fx),lerp(at(0,1,0),at(1,1,0),fx),fy),lerp(lerp(at(0,0,1),at(1,0,1),fx),lerp(at(0,1,1),at(1,1,1),fx),fy),fz);
 }
 for(let z=0;z<side;z++)for(let y=0;y<tile;y++)for(let x=0;x<tile;x++){
  const i=((Math.floor(z/8)*tile+y)*width+(z%8)*tile+x)*4;
  for(let c=0;c<3;c++)data[i+c]=Math.round(sample(layers[c],((x-1+side)%side)/side,((y-1+side)%side)/side,z/side)*255);data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);texture.name='Tem.atlas.local-density';texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
}

// The star cloud, route emitters and controls occupy one navigation instrument.
export function createOrbitalAtlas({parent,camera,sectors,interaction}){
 const root=new THREE.Group();parent.add(root);const m=hardwareMaterials();
 const vista=createStarportWorld({parent:root,compact:()=>innerWidth<700,interaction});
 const instrument=new THREE.Group();instrument.position.set(6,-8,-8);root.add(instrument);
 m.white.color.setRGB(.85,1.23,1.68);m.amber.color.setRGB(1.24,.79,.51);
 m.alloy.color.set(0x7c8692);m.alloy.metalness=.48;m.alloy.roughness=.25;
 m.brass.color.set(0xbba78f);m.brass.metalness=.52;m.brass.roughness=.26;
 m.dark.color.set(0x111724);m.dark.metalness=.18;m.dark.roughness=.21;m.dark.envMapIntensity=.48;
 const mesh=(g,mat,p,group=instrument)=>hardwareMesh(group,g,mat,p);
 const block=(w,h,d,p,mat=m.alloy,group=instrument)=>mesh(new THREE.BoxGeometry(w,h,d),mat,p,group);
 const atlasColors=[[.82,.92,1.12],[.76,.64,1.20],[1.11,.68,1.03],[.48,1.01,1.16]].map(c=>new THREE.Color().setRGB(...c));
 const platformUniforms={uTime:{value:0},uPower:{value:.45},uResponse:{value:0},uSweep:{value:0},uActiveColor:{value:atlasColors[0].clone()},uSourceWorld:{value:new THREE.Vector3(6,-6.52,-8)},uKeyWorld:{value:new THREE.Vector3(-7,10,8)},...opticalEnvironment()};
 const starport=createOpticalStarport({parent:instrument,uniforms:platformUniforms,colors:atlasColors,interaction,sectorIds:sectors.map(s=>s.id)});
 const opticalAnchor=new THREE.Object3D();opticalAnchor.position.set(0,.5,0);opticalAnchor.scale.set(1.06,1,.77);instrument.add(opticalAnchor);
 const opticalState={object:opticalAnchor,radius:6.6,power:.45};
 const cloud=new THREE.Group();cloud.position.set(0,4,-14);root.add(cloud);
 // Interrupted flowing paths leave the cloud irregular and porous; a regular
 // latitude/longitude cage would flatten the four independent star nurseries.
 const filaments=[
  [[-8,-5.4,1],[-5,-2.8,3.6],[-.6,1.4,2.7],[3.8,4,-1.2],[8.2,5.7,-.3]],
  [[-8.6,2.8,-1.2],[-5,4.4,1.7],[-.8,.6,3.5],[2.9,-3.9,.5],[7.7,-5.2,-1.5]],
  [[-7.5,-3.6,-2],[-2.3,-5.1,2.8],[4,-1.5,1.6],[7.8,2.3,-2.1],[6.6,6.5,.5]]
 ].map(points=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))));
 const cloudFlow=createEnergyRibbons({parent:cloud,curves:filaments,width:.60,color:0xb6d3ee});
 const count=innerWidth<700?2300:6400,positions=new Float32Array(count*3),seeds=new Float32Array(count),clusters=new Float32Array(count),coreWeights=new Float32Array(count);
 // The four HTML/click anchors keep their original bounds. Bright nuclei sit
 // diagonally away from those labels and are joined by actual spatial leaders.
 const centers=[[-4.8,4.65,.7],[3.65,4.50,-1.2],[-4.8,-1.98,.6],[6.5,-1.95,-.9]];
 let seed=2745;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<count;i++){
  const cluster=i%4,spread=()=>rand()+rand()+rand()-1.5;
  let p;if(i<count*.67){const c=centers[cluster],hub=i<count*.25,r=Math.pow(rand(),hub?.90:.68)*(hub?.95:3.6),a=rand()*Math.PI*2+r*.72;p=[c[0]+Math.cos(a)*r+spread()*(hub?.16:.55),c[1]+Math.sin(a)*r*.62+spread()*(hub?.11:.34),c[2]+Math.sin(a*1.7+cluster)*r*.55+spread()*(hub?.20:.65)];coreWeights[i]=Math.exp(-r*r*.85);}
  else{const x=(rand()-.5)*16.4;p=[x,Math.sin(x*.38)*2.4+spread()*2.5,Math.cos(x*.31)*2.3+spread()*2.2];}
  positions.set(p,i*3);seeds[i]=rand();clusters[i]=i<count*.67?cluster:-1;
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));geo.setAttribute('aCluster',new THREE.BufferAttribute(clusters,1));geo.setAttribute('aCore',new THREE.BufferAttribute(coreWeights,1));
 const uniforms={uTime:{value:0},uHeight:{value:innerHeight},uPower:{value:0},uRoute:{value:new THREE.Vector3(-9,5,2)},uSelected:{value:0},uHover:{value:-1},uCameraCloud:{value:new THREE.Vector3()},uPointerCloudOrigin:{value:new THREE.Vector3()},uPointerCloudDirection:{value:new THREE.Vector3(0,0,-1)},uPointerPower:interaction?.uniforms.uPointerPower||{value:0},uPointerSpeed:interaction?.uniforms.uPointerSpeed||{value:0},uDensityAtlas:{value:atlasDensityTexture()},uVolumeSteps:{value:innerWidth<700?10:16}};
 const projectionBeam=new THREE.Mesh(new THREE.CylinderGeometry(3.6,.085,1,32,12,true),new THREE.ShaderMaterial({uniforms:platformUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:'varying vec2 vUv;varying vec3 vView,vNormal;void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vView=p.xyz;gl_Position=projectionMatrix*p;}',
  fragmentShader:`uniform float uTime,uPower,uResponse;uniform vec3 uActiveColor;varying vec2 vUv;varying vec3 vView,vNormal;void main(){vec3 eye=normalize(-vView);float rim=.25+.75*pow(clamp(1.-abs(dot(normalize(vNormal),eye)),0.,1.),1.6);float strands=pow(.5+.5*cos(vUv.x*100.53+vUv.y*4.1-uTime*.28),12.);float decay=exp(-vUv.y*2.65)*(1.-smoothstep(.78,1.,vUv.y));float a=decay*(.017+uResponse*.029)*(rim+strands*.25);gl_FragColor=vec4(uActiveColor*(1.05+strands*.80),a);}`
 }));projectionBeam.userData.dynamic=true;root.add(projectionBeam);
 // Leave real space between four moving star nurseries. A solid Fresnel shell
 // around them would turn the atlas into a translucent UI bubble.
 const stars=new THREE.Points(geo,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
 vertexShader:`attribute float aSeed,aCluster,aCore;uniform float uTime,uHeight,uPower,uSelected,uHover,uPointerPower,uPointerSpeed;uniform vec3 uRoute,uPointerCloudOrigin,uPointerCloudDirection;varying float alpha,vSeed,vCore;varying vec3 vTint;${cloudNoise}
 void main(){vec3 p=position;vec3 q=p*.24+vec3(uTime*.035,-uTime*.026,aSeed*.3);p+=(vec3(noise3(q),noise3(q+2.7),noise3(q-3.9))-.5)*.96;vec3 delta=p-uPointerCloudOrigin;float depth=max(0.,dot(delta,uPointerCloudDirection));vec3 radial=delta-uPointerCloudDirection*depth;float reach=exp(-dot(radial,radial)/pow(1.7+depth*.11,2.))*uPointerPower;p+=cross(uPointerCloudDirection,radial)*reach*(.28+uPointerSpeed*.40)-radial*reach*.14;
 float selected=1.-step(.5,abs(aCluster-uSelected)),hovered=(1.-step(.5,abs(aCluster-uHover)))*step(-.5,aCluster);float route=aCluster<0.?pow(max(0.,dot(normalize(p),normalize(uRoute))),18.):max(selected,hovered*.85);vSeed=aSeed;vCore=aCore;vTint=cloudTint(aCluster,aSeed)*(1.+selected*uPower*.10+hovered*.27);
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(uHeight*(.054+pow(aSeed,14.)*.19+aCore*.010+route*.010)/max(1.,-mv.z),1.0,5.2);alpha=(.35+aSeed*.25+aCore*.04+route*uPower*.09)*smoothstep(2.,8.,-mv.z);}`,
 fragmentShader:`varying float alpha,vSeed,vCore;varying vec3 vTint;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);if(d>.5)discard;float spike=exp(-abs(p.x)*95.)*exp(-abs(p.y)*14.)+exp(-abs(p.y)*95.)*exp(-abs(p.x)*14.);vec3 pearl=mix(vTint,vec3(1.16,1.15,1.23),vCore*.20);gl_FragColor=vec4(pearl*(1.05+vCore*.36+step(.984,vSeed)*.65),(exp(-d*d*48.)+spike*.12)*alpha);}`}));cloud.add(stars);
 // One instanced draw encloses four independent, genuinely volumetric fields.
 // Box back faces delimit each actual camera ray; no gl_PointCoord/billboards.
 // Their porous ellipsoid envelopes leave open space between the four cores.
 const volumeGeometry=new THREE.BoxGeometry(2,2,2),volumeRadii=[[4.8,2.75,4.5],[3.3,3.3,3.7],[4.7,2.4,3.8],[3.6,2.65,3.5]];
 volumeGeometry.setAttribute('aCenter',new THREE.InstancedBufferAttribute(new Float32Array(centers.flat()),3));volumeGeometry.setAttribute('aRadii',new THREE.InstancedBufferAttribute(new Float32Array(volumeRadii.flat()),3));volumeGeometry.setAttribute('aCluster',new THREE.InstancedBufferAttribute(new Float32Array([0,1,2,3]),1));
 const volumeMaterial=new THREE.ShaderMaterial({uniforms,side:THREE.BackSide,transparent:true,depthWrite:false,depthTest:true,blending:THREE.NormalBlending,toneMapped:false,
  vertexShader:`attribute vec3 aCenter,aRadii;attribute float aCluster;uniform vec3 uCameraCloud;varying vec3 vOrigin,vExit,vRadii,vCenter;varying float vCluster;
   void main(){vOrigin=(uCameraCloud-aCenter)/aRadii;vExit=position;vRadii=aRadii;vCenter=aCenter;vCluster=aCluster;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D uDensityAtlas;uniform float uTime,uVolumeSteps,uPower,uSelected,uHover,uPointerPower,uPointerSpeed;uniform vec3 uPointerCloudOrigin,uPointerCloudDirection;varying vec3 vOrigin,vExit,vRadii,vCenter;varying float vCluster;${cloudNoise}
   vec3 densityNoise(vec3 p){
    p=fract(p)*32.;float z=floor(p.z),next=mod(z+1.,32.);vec2 tile0=vec2(mod(z,8.),floor(z/8.)),tile1=vec2(mod(next,8.),floor(next/8.));vec2 xy=p.xy+1.5;
    return mix(texture2D(uDensityAtlas,(tile0*34.+xy)/vec2(272.,136.)).rgb,texture2D(uDensityAtlas,(tile1*34.+xy)/vec2(272.,136.)).rgb,fract(p.z));
   }
   float field(vec3 p,float seed,out vec3 q,out vec3 features){
    vec3 rayDelta=vCenter+p*vRadii-uPointerCloudOrigin;float depth=max(0.,dot(rayDelta,uPointerCloudDirection));vec3 radial=rayDelta-uPointerCloudDirection*depth;float reach=exp(-dot(radial,radial)/pow(1.7+depth*.11,2.))*uPointerPower;
    p+=(cross(uPointerCloudDirection,radial)*reach*(.22+uPointerSpeed*.34)-radial*reach*.10)/vRadii;
    float t=uTime*.082;vec3 flow=vec3(sin(p.y*3.4+t+seed)*cos(p.z*2.3-t*.6),sin(p.z*2.7-t*.7)*cos(p.x*3.1+seed),cos(p.x*3.1+t*.65+seed)*sin(p.y*2.7-t*.4));
    q=p*vec3(.62,.48,.59)+flow*.17+vec3(seed+uTime*.0072,-uTime*.0044,-uTime*.0056);
    vec3 n=densityNoise(q),detail=densityNoise(q*1.76+vec3(.19,.07,seed*.13));float ridge=pow(1.-abs(detail.g*2.-1.),6.);
    vec3 edgeP=p+flow*.13+(vec3(n.b,n.g,detail.r)-.5)*.28;float envelope=max(0.,1.-dot(edgeP,edgeP));envelope*=sqrt(envelope)*(1.-smoothstep(.82,1.,max(abs(p.x),max(abs(p.y),abs(p.z)))));
    float cavity=smoothstep(.49,.71,detail.b*.65+n.g*.35),dust=smoothstep(.45,.69,n.g*.60+detail.b*.40);
    float bulk=pow(smoothstep(.39,.73,n.r*.54+detail.g*.25+n.b*.21),1.45),strands=ridge*smoothstep(.40,.70,n.r)*.20;
    features=vec3(n.r,dust*envelope*(.10+bulk*.55)*(1.-cavity*.8),ridge);
    return (bulk+strands)*envelope*(1.-cavity*.94);
   }
   void main(){
    vec3 ray=normalize(vExit-vOrigin),safeRay=mix(vec3(-1.),vec3(1.),step(vec3(0.),ray))*max(abs(ray),vec3(.00001));vec3 invRay=1./safeRay;
    vec3 a=(-vec3(1.)-vOrigin)*invRay,b=(vec3(1.)-vOrigin)*invRay,near=min(a,b),far=max(a,b);
    float entry=max(0.,max(near.x,max(near.y,near.z))),exit=min(far.x,min(far.y,far.z));if(exit<=entry)discard;
    float stride=(exit-entry)/uVolumeSteps,physicalStride=stride*length(vRadii*ray),seed=vCluster*.197+.071;
    // Fixed spatial jitter removes march bands without an animated noise sheet.
    float jitter=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453)*.42+.29;
    float selected=1.-step(.5,abs(vCluster-uSelected)),hovered=(1.-step(.5,abs(vCluster-uHover)))*step(-.5,uHover);
    float response=selected*uPower*.16+hovered*.30;vec3 tint=cloudTint(vCluster,.35),lightDirection=normalize(vec3(-.58,.66,.47));vec4 fog=vec4(0.);
    for(int i=0;i<16;i++){
     if(float(i)>=uVolumeSteps)break;vec3 p=vOrigin+ray*(entry+(float(i)+jitter)*stride),q,features;float gas=field(p,seed,q,features);
     float core=exp(-dot(p,p)*46.);if(gas+features.y+core<.006)continue;
     vec3 lit=densityNoise(q+lightDirection*.05);float shadow=exp(-max(0.,lit.r-.34)*2.4-gas*.7),edge=clamp((features.x-lit.r)*5.+.54,.12,1.),rim=pow(clamp((features.x-lit.r)*5.,0.,1.),2.);
     vec3 pearl=mix(tint,vec3(1.01,1.07,1.17),.045+rim*.08);vec3 emission=pearl*(.50+shadow*(.28+edge*.78)+response)*(.84+.16*pow(max(0.,dot(ray,-lightDirection)),3.));
     emission+=tint*features.z*rim*.24;float gasShare=gas/max(.0001,gas+features.y*1.35);
     vec3 color=mix(vec3(.008,.013,.022),emission,gasShare)+tint*core*(1.85+response*.60);
     float absorption=1.-exp(-(gas*.44+features.y*.85+core*.075)*physicalStride);
     fog.rgb+=(1.-fog.a)*absorption*color;fog.a+=(1.-fog.a)*absorption;if(fog.a>.92)break;
    }
    if(fog.a<.002)discard;gl_FragColor=vec4(fog.rgb/max(.0001,fog.a),fog.a);
   }`
 });
 const localNebula=new THREE.InstancedMesh(volumeGeometry,volumeMaterial,4),volumePose=new THREE.Object3D();localNebula.name='Tem.atlas.four-local-nebula-volumes';localNebula.userData.visualOnly=true;localNebula.frustumCulled=false;localNebula.castShadow=false;
 centers.forEach((p,i)=>{volumePose.position.fromArray(p);volumePose.scale.fromArray(volumeRadii[i]);volumePose.updateMatrix();localNebula.setMatrixAt(i,volumePose.matrix);});cloud.add(localNebula);
 const route=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xb4cdff,transparent:true,opacity:.13,depthWrite:false}));root.add(route);
 const leaderGeometry=new THREE.BufferGeometry();leaderGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(48),3));leaderGeometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(48),3));
 const leaders=new THREE.LineSegments(leaderGeometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.48,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));leaders.frustumCulled=false;root.add(leaders);
 const nuclei=new THREE.InstancedMesh(new THREE.TorusGeometry(.47,.014,5,48),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),4);
 const markerPose=new THREE.Object3D();centers.forEach((p,i)=>{markerPose.position.fromArray(p);markerPose.rotation.z=.35+i*.4;markerPose.updateMatrix();nuclei.setMatrixAt(i,markerPose.matrix);nuclei.setColorAt(i,atlasColors[i]);});cloud.add(nuclei);
 const rootInverse=new THREE.Matrix4(),cloudInverse=new THREE.Matrix4(),corePositions=centers.map(()=>new THREE.Vector3()),beamTarget=new THREE.Vector3(),beamStart=new THREE.Vector3(),beamDirection=new THREE.Vector3(),beamUp=new THREE.Vector3(0,1,0),targetTint=new THREE.Color();
 let beamReady=false,beamIndex=-1,response=0,lastHover=-1,sweepStart=0,sweepPhase=0,traceTick=0;
 let routeFlow;
 // The fleet's physical berths replace the former floating label pedestals.
 // A second cylinder at each label would sit above and occlude the craft hull.
 const emitterLight=new THREE.PointLight(0xb5d9ef,16,12,2);root.add(emitterLight);
 const glass=new THREE.ShaderMaterial({uniforms:platformUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:'varying vec3 vWorld,vNormal;varying vec2 vUv;void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
  fragmentShader:`uniform sampler2D uSky;uniform float uSkyReady,uTime,uResponse;uniform vec3 uActiveColor;varying vec3 vWorld,vNormal;varying vec2 vUv;${opticalSkySample}void main(){vec3 n=normalize(vNormal),eye=normalize(cameraPosition-vWorld);float f=pow(1.-abs(dot(n,eye)),3.),edge=pow(1.-min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y))*2.,36.),scan=exp(-pow(vUv.x-fract(uTime*.065),2.)*1600.);vec3 c=skyReflection(reflect(-eye,n))*.38+uActiveColor*(.024+edge*.10+scan*.025*uResponse);gl_FragColor=vec4(c,.035+f*.085+edge*.12+scan*.015*uResponse);}`});
 const pane=new THREE.Group();root.add(pane);const paneGeometry=new THREE.PlaneGeometry(1,1,24,10),panePositions=paneGeometry.attributes.position;for(let i=0;i<panePositions.count;i++)panePositions.setZ(i,panePositions.getX(i)**2*.60);paneGeometry.computeVertexNormals();const paneGlass=mesh(paneGeometry,glass,[0,0,0],pane);
 const frame=new THREE.Group();pane.add(frame);for(const side of [-1,1]){block(.009,.14,.048,[side*.50,side*.36,.17],m.alloy,frame);block(.004,.055,.055,[side*.505,side*.36,.18],m.brass,frame);}
 const controlSpine=new THREE.CatmullRomCurve3([[17,-6.15,-2.2],[18,-7.05,.2],[17.1,-7.72,2.5],[15.0,-8.0,4.2]].map(p=>new THREE.Vector3(...p)));
 const controlMount=mesh(new THREE.TubeGeometry(controlSpine,32,.075,6),m.alloy,[0,0,0],root);controlMount.name='Tem.starport.curved-control-support';
 let mobile=false,selected=0,energy=0,control;const positionsFor=()=>mobile?[[-4.3,3.7,-10.4],[4.9,3.9,-11.3],[-3.7,1.2,-6],[4.0,1.1,-6.8]]:[[-6.5,7.7,-18],[20.375,8.0,-20.5],[-10.25,4.5,-5.125],[24.75,4.2,-7.5]];
 function layout(){mobile=innerWidth<700;uniforms.uVolumeSteps.value=mobile?10:16;instrument.scale.setScalar(mobile?.37:1.25);instrument.position.set(mobile?0:6,mobile?-4.8:-5.7,mobile?-7:-8);starport.layout();cloud.scale.setScalar(mobile?.79:1.72);cloud.position.set(mobile?0:7.5,mobile?4.2:4,-17);
  vista.layout();
  controlMount.visible=!mobile;
  pane.position.set(mobile?0:15.0,mobile?-5.4:-4.2,mobile?1:4.2);pane.rotation.set(mobile?-.04:-.05,mobile?0:-.16,0);pane.scale.set(mobile?11.1:15.8,mobile?5.0:8.0,1);
  select(sectors[selected].id);
 }
 function select(id){selected=Math.max(0,sectors.findIndex(s=>s.id===id));uniforms.uSelected.value=selected;const p=positionsFor()[selected],pts=[],a=cloud.position.clone(),b=new THREE.Vector3(...p);for(let j=0;j<=40;j++){const t=j/40,q=a.clone().lerp(b,t);q.y+=Math.sin(t*Math.PI)*2;pts.push(q);}route.geometry.dispose();route.geometry=new THREE.BufferGeometry().setFromPoints(pts);uniforms.uRoute.value.fromArray(centers[selected]);energy=1;sweepStart=platformUniforms.uTime.value;route.geometry.setDrawRange(0,1);
  if(routeFlow){const materials=new Set();routeFlow.root.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});materials.forEach(material=>material.dispose());routeFlow.root.removeFromParent();}
  const start=starport.sourcePosition.clone().multiplyScalar(instrument.scale.x).add(instrument.position),near=start.clone().lerp(a,.5).add(new THREE.Vector3(-1,1.4,2)),exit=a.clone().lerp(b,.5).add(new THREE.Vector3(0,1.5,1));
  routeFlow=createEnergyRibbons({parent:root,curves:[new THREE.CatmullRomCurve3([start,near,a,exit,b])],color:0xb1d6f0,width:.25,segments:88});emitterLight.color.set(0xb5d9ef);emitterLight.position.copy(b).add(new THREE.Vector3(0,1,0));}
 addEventListener('tem:atlas-select',e=>select(e.detail.id));addEventListener('tem:surface',()=>{control=document.querySelector('.atlas-control');});addEventListener('resize',layout);layout();
 return {layout,positions:positionsFor,pickObjects:()=>starport.picking,opticalAnchor:()=>opticalState,update(dt,time,motion,active,hovered,departure=0){if(!active)return;
  // Shared time already stops with reading/reduced motion; preserve its phase.
  if(motion){energy*=Math.exp(-dt*1.2);cloud.rotation.y=Math.sin(time*.05)*.10;}
  const hoverIndex=sectors.findIndex(s=>s.id===hovered),activeIndex=hoverIndex>=0?hoverIndex:selected;
  if(hoverIndex!==lastHover){lastHover=hoverIndex;if(hoverIndex>=0)sweepStart=time;}
  const responseTarget=hoverIndex>=0?1:.45+energy*.50;
  if(motion)response=THREE.MathUtils.damp(response,responseTarget,7,dt);else if(!beamReady||activeIndex!==beamIndex)response=responseTarget;
  if(motion)sweepPhase=Math.min(1,Math.max(0,(time-sweepStart)/1.15))*Math.PI*2;
  uniforms.uTime.value=time;uniforms.uHeight.value=innerHeight;uniforms.uPower.value=.45+energy*.5;uniforms.uHover.value=hoverIndex;
  platformUniforms.uTime.value=time;platformUniforms.uPower.value=uniforms.uPower.value;platformUniforms.uResponse.value=response;platformUniforms.uSweep.value=activeIndex*Math.PI*.5+sweepPhase;
  targetTint.copy(atlasColors[activeIndex]);if(motion)platformUniforms.uActiveColor.value.lerp(targetTint,1-Math.exp(-dt*8));else if(!beamReady||activeIndex!==beamIndex)platformUniforms.uActiveColor.value.copy(targetTint);
  root.updateWorldMatrix(true,false);cloud.updateWorldMatrix(false,false);instrument.updateWorldMatrix(false,false);rootInverse.copy(root.matrixWorld).invert();cloudInverse.copy(cloud.matrixWorld).invert();camera.getWorldPosition(uniforms.uCameraCloud.value).applyMatrix4(cloudInverse);
  if(interaction){uniforms.uPointerCloudOrigin.value.copy(interaction.uniforms.uPointerOrigin.value).applyMatrix4(cloudInverse);uniforms.uPointerCloudDirection.value.copy(interaction.uniforms.uPointerDirection.value).transformDirection(cloudInverse);}
  corePositions.forEach((p,i)=>p.fromArray(centers[i]).applyMatrix4(cloud.matrixWorld).applyMatrix4(rootInverse));
  starport.setTargets(centers,cloud.matrixWorld);starport.update(dt,time,Boolean(motion),selected,hoverIndex,energy,departure);opticalState.power=response;
  beamStart.copy(starport.sourcePosition).applyMatrix4(instrument.matrixWorld);platformUniforms.uSourceWorld.value.copy(beamStart);beamStart.applyMatrix4(rootInverse);
  if(!beamReady){beamReady=true;beamTarget.copy(corePositions[activeIndex]);}else if(motion)beamTarget.lerp(corePositions[activeIndex],1-Math.exp(-dt*5));else if(activeIndex!==beamIndex)beamTarget.copy(corePositions[activeIndex]);beamIndex=activeIndex;
  beamDirection.copy(beamTarget).sub(beamStart);projectionBeam.position.copy(beamStart).lerp(beamTarget,.5);projectionBeam.scale.y=beamDirection.length();projectionBeam.quaternion.setFromUnitVectors(beamUp,beamDirection.normalize());
  platformUniforms.uSweep.value=Math.atan2(beamDirection.z,beamDirection.x)+sweepPhase;
  const labelPoints=positionsFor(),leaderPositions=leaderGeometry.attributes.position,leaderColors=leaderGeometry.attributes.color;
  corePositions.forEach((core,i)=>{const label=new THREE.Vector3(...labelPoints[i]),elbow=core.clone().lerp(label,.62);elbow.y+=.22;const strength=i===activeIndex?1.35:.58,points=[core,elbow,elbow,label];points.forEach((p,j)=>{const at=i*4+j;leaderPositions.setXYZ(at,p.x,p.y,p.z);leaderColors.setXYZ(at,atlasColors[i].r*strength,atlasColors[i].g*strength,atlasColors[i].b*strength);});nuclei.setColorAt(i,atlasColors[i].clone().multiplyScalar(i===activeIndex?2.6:1.2));});leaderPositions.needsUpdate=true;leaderColors.needsUpdate=true;nuclei.instanceColor.needsUpdate=true;
  route.geometry.setDrawRange(0,motion?Math.min(41,Math.ceil((1-energy)*55)+2):41);emitterLight.intensity=20+energy*12;
  cloudFlow.update(time,.94+energy*.24,Boolean(motion));routeFlow.update(time,.32+energy*.35,Boolean(motion));
  vista.update(dt,time,Boolean(motion),response);
  control=control?.isConnected?control:document.querySelector('.atlas-control');if(control)projectWorldSurface({object:pane,camera,element:control,w:.95,h:.90,width:780,height:390,ready:true});
  const canvas=document.getElementById('space');canvas.dataset.atlas='four-live-pearl-nebula-clusters';canvas.dataset.atlasPlatform='asymmetric-levitating-ceramic-starport';canvas.dataset.atlasFleet='four-pose-driven-ships';canvas.dataset.atlasVolume='four-local-raymarch-'+uniforms.uVolumeSteps.value;canvas.dataset.atlasVolumeStyle='porous-azure-amethyst';canvas.dataset.atlasResponse=hoverIndex>=0?'hover-'+sectors[hoverIndex].id:'selected-'+sectors[selected].id;
  if(traceTick++%15===0)canvas.dataset.atlasShipAnchors=starport.picking.map((ship,i)=>{const p=ship.getWorldPosition(new THREE.Vector3()).project(camera);return sectors[i].id+':'+((p.x*.5+.5)*innerWidth).toFixed(0)+','+((.5-p.y*.5)*innerHeight).toFixed(0);}).join(';');
 }};
}
