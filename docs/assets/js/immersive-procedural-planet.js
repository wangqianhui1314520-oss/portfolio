import * as THREE from 'three';

// One continuous, object-space field. No albedo, cloud or night photograph is
// used; rotating the authored sphere changes the same terrain seen by its air.
const field=`
 float planetHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float planetNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(planetHash(i),planetHash(i+vec3(1,0,0)),f.x),mix(planetHash(i+vec3(0,1,0)),planetHash(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(planetHash(i+vec3(0,0,1)),planetHash(i+vec3(1,0,1)),f.x),mix(planetHash(i+vec3(0,1,1)),planetHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float planetFbm(vec3 p){float a=.55,n=0.;for(int j=0;j<4;j++){n+=a*planetNoise(p);p=p*2.07+vec3(4.3,7.1,1.9);a*=.48;}return n;}
 float continent(vec3 n,float seed){vec3 p=n*4.7+vec3(seed*.13,1.7,8.1);
  vec3 warp=vec3(planetNoise(p*.65),planetNoise(p*.65+7.3),planetNoise(p*.65+14.9));return planetFbm(p+(warp-.5)*1.8);}
 float cloudField(vec3 n,float time,float seed){
  vec3 p=n*58.+vec3(time*.023,seed*.13,-time*.013);
  p+=vec3(sin(n.y*8.+time*.021),cos(n.z*7.-time*.017),sin(n.x*6.+time*.011))*.75;
  float weather=planetNoise(n*8.1+vec3(seed*.03,3.7,1.2));
  float broad=planetFbm(p),detail=planetNoise(p*2.09+vec3(6.1,9.3,2.8));
  return smoothstep(.45,.65,broad*.76+detail*.24)*smoothstep(.33,.67,weather);}
`;
const vertex=`varying vec3 vPlanetLocal,vPlanetNormal,vPlanetWorld;
 void main(){vPlanetLocal=position;vPlanetNormal=normalize(mat3(modelMatrix)*normal);
 vec4 world=modelMatrix*vec4(position,1.);vPlanetWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`;

export function createProceduralPlanetMaterial({time={value:0},sunDirection=[.48,.19,-.84],seed=23,rocky=false,center=[0,0,0],tint=0x819daf}={}){
 return new THREE.ShaderMaterial({uniforms:{uPlanetTime:time,uPlanetSeed:{value:seed},uPlanetRocky:{value:rocky?1:0},uPlanetCenter:{value:new THREE.Vector3(...center)},uPlanetSun:{value:new THREE.Vector3(...sunDirection).normalize()},uPlanetTint:{value:new THREE.Color(tint)}},vertexShader:vertex,
  fragmentShader:`uniform float uPlanetTime,uPlanetSeed,uPlanetRocky;uniform vec3 uPlanetSun,uPlanetTint,uPlanetCenter;
   varying vec3 vPlanetLocal,vPlanetNormal,vPlanetWorld;${field}
   void main(){vec3 landN=normalize(vPlanetLocal-uPlanetCenter),n=normalize(vPlanetNormal),eye=normalize(cameraPosition-vPlanetWorld);
    float height=continent(landN,uPlanetSeed),land=smoothstep(.47,.505,height),ice=smoothstep(.77,.94,abs(landN.y));
    float detail=planetFbm(landN*48.+uPlanetSeed),ridge=pow(1.-abs(planetNoise(landN*120.+uPlanetSeed)*2.-1.),3.);
    vec3 ocean=mix(vec3(.008,.031,.058),vec3(.022,.077,.102),smoothstep(.32,.49,height));
    vec3 terrain=mix(vec3(.063,.105,.086),vec3(.24,.21,.15),smoothstep(.52,.65,height));
    terrain=mix(terrain,vec3(.37,.36,.32),smoothstep(.66,.76,height));terrain*=.77+detail*.42;
    vec3 albedo=mix(ocean,terrain,land);albedo=mix(albedo,vec3(.70,.79,.84),ice*.86);
    float sunlight=dot(n,uPlanetSun),day=max(sunlight,0.);
    float cloud=uPlanetRocky>.5?0.:cloudField(landN,uPlanetTime,uPlanetSeed);
    if(uPlanetRocky>.5){float craters=planetNoise(landN*24.+uPlanetSeed),rubble=planetFbm(landN*64.+uPlanetSeed);albedo=mix(vec3(.07,.082,.106),vec3(.29,.285,.275),height);albedo*=.66+craters*.38+rubble*.20;land=1.;ice=0.;}
    vec3 color=albedo*(.032+day*1.55)*(1.-cloud*.15)*(1.-ridge*land*.065);
    vec3 halfVector=normalize(uPlanetSun+eye);float glint=pow(max(dot(n,halfVector),0.),110.)*(1.-land)*day;
    color+=vec3(.87,.73,.54)*glint*.40;
    float cityCells=pow(planetNoise(landN*700.+uPlanetSeed),18.);
    float cityMask=land*(1.-ice)*smoothstep(.48,.56,height)*(1.-smoothstep(.60,.68,height));
    color+=vec3(.90,.47,.16)*cityCells*cityMask*(1.-smoothstep(-.18,.08,sunlight))*.9;
    float edge=pow(1.-max(dot(n,eye),0.),5.);
    color+=vec3(.047,.19,.38)*edge*smoothstep(-.22,.40,sunlight)*.70;
    color=mix(color,color*uPlanetTint*1.22,.16);
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
}

export function createProceduralPlanetClouds({radius,time={value:0},sunDirection=[.48,.19,-.84],seed=23,compact=()=>false}={}){
 const outside=radius*1.009,inside=radius*1.001;
 const uniforms={uPlanetTime:time,uPlanetSeed:{value:seed},uPlanetSun:{value:new THREE.Vector3(...sunDirection).normalize()},uLocalEye:{value:new THREE.Vector3()},uCloudOuter:{value:outside},uCloudInner:{value:inside},uCloudSteps:{value:6}};
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(outside,64,40),new THREE.ShaderMaterial({uniforms,vertexShader:vertex,transparent:true,depthWrite:false,side:THREE.FrontSide,
  fragmentShader:`uniform float uPlanetTime,uPlanetSeed,uCloudOuter,uCloudInner,uCloudSteps;uniform vec3 uLocalEye,uPlanetSun;
   varying vec3 vPlanetLocal,vPlanetNormal,vPlanetWorld;${field}
   vec2 hitSphere(vec3 o,vec3 d,float radius){float b=dot(o,d),c=dot(o,o)-radius*radius,h=b*b-c;if(h<0.)return vec2(1.,-1.);h=sqrt(h);return vec2(-b-h,-b+h);}
   void main(){vec3 ray=normalize(vPlanetLocal-uLocalEye);vec2 shell=hitSphere(uLocalEye,ray,uCloudOuter),ground=hitSphere(uLocalEye,ray,uCloudInner);
    float near=max(shell.x,0.),far=shell.y;if(ground.x>near)far=min(far,ground.x);if(far<=near)discard;
    float stride=(far-near)/uCloudSteps,transmission=1.;vec3 sum=vec3(0.);
    for(int i=0;i<6;i++){if(float(i)>=uCloudSteps)break;vec3 p=uLocalEye+ray*(near+(float(i)+.5)*stride);vec3 n=normalize(p);
     float height=(length(p)-uCloudInner)/max(uCloudOuter-uCloudInner,.0001),envelope=smoothstep(0.,.24,height)*(1.-smoothstep(.63,1.,height));
     float density=cloudField(n,uPlanetTime,uPlanetSeed)*envelope;
     // Satellite clouds have a real radial density and independent advection.
     float sunlight=dot(normalize(vPlanetNormal),uPlanetSun),shade=1.-density*.30;
     vec3 lit=vec3(.30,.40,.55)*.15+vec3(.88,.80,.69)*max(sunlight,0.)*shade;
     float alpha=1.-exp(-density*stride/uCloudOuter*150.);sum+=transmission*alpha*lit;transmission*=1.-alpha;
    }
    float alpha=1.-transmission;if(alpha<.004)discard;gl_FragColor=vec4(sum/max(alpha,.0001),min(alpha,.92));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`}));
 const inverse=new THREE.Matrix4();
 mesh.name='Tem.planet.live-volumetric-weather';mesh.userData.dynamic=true;
 mesh.onBeforeRender=(renderer,scene,camera)=>{mesh.updateWorldMatrix(true,false);inverse.copy(mesh.matrixWorld).invert();camera.getWorldPosition(uniforms.uLocalEye.value).applyMatrix4(inverse);uniforms.uCloudSteps.value=typeof compact==='function'&&compact()?4:6;};
 return mesh;
}
