import * as THREE from 'three';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/OutputPass.js';

const canvas = document.getElementById('space');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// All atmospheric layers live inside the room so camera movement preserves depth.
const noiseGLSL = `
  uniform sampler2D uNoise;
  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p) {return texture2D(uNoise,p*.0625).g;}
  float fbm(vec2 p) {return texture2D(uNoise,p*.0625).r;}
`;
const planeVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

// Bake the cloud detail once. Sampling this small texture is much cheaper than
// evaluating multiple octaves of noise for every pixel in every fog layer.
function makeNoiseTexture(){
  const size=256,data=new Uint8Array(size*size*4);
  let seed=8128;
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const layers=[8,16,32,64].map(n=>({n,values:Float32Array.from({length:n*n},rnd)}));
  function sample(layer,u,v){
    const {n,values}=layer,x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y);
    let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
    const a=values[(iy%n)*n+ix%n],b=values[(iy%n)*n+(ix+1)%n];
    const c=values[((iy+1)%n)*n+ix%n],d=values[((iy+1)%n)*n+(ix+1)%n];
    return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const p=(y*size+x)*4;let value=0,weight=.5333;
    for(const layer of layers){value+=sample(layer,x/size,y/size)*weight;weight*=.5;}
    data[p]=Math.round(value*255);data[p+1]=Math.round(sample(layers[1],x/size,y/size)*255);data[p+2]=data[p];data[p+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}

function startScene() {
  const renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x02040a,1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .88;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,80);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.56,.82,.42);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const time = {value:0};
  const chapter = {value:0};
  const noiseTexture = {value:makeNoiseTexture()};

  const roomFragment = `
    varying vec2 vUv;
    uniform float uTime, uSide, uChapter;
    uniform vec2 uTiles;
    ${noiseGLSL}
    void main(){
      vec2 p=vUv;
      vec2 tile=p*uTiles;
      vec2 cell=floor(tile);
      vec2 edge=min(fract(tile),1.-fract(tile));
      vec2 aa=max(fwidth(tile),vec2(.002));
      vec2 seam=1.-smoothstep(vec2(.009),vec2(.009)+aa*1.2,edge);
      float grout=max(seam.x,seam.y);
      float material=fbm(p*vec2(23.,16.));
      float cloud=fbm(p*3.+vec2(uTime*.008,-uTime*.005));
      float key=exp(-dot((p-vec2(.28,.76))*vec2(1.35,1.),(p-vec2(.28,.76))*vec2(1.35,1.))*5.);
      float fill=exp(-dot((p-vec2(.85,.39))*vec2(2.,1.4),(p-vec2(.85,.39))*vec2(2.,1.4))*5.);
      float slash=exp(-pow((p.x+p.y*.45-.69)*4.8,2.));
      float illumination=(key*.72+slash*.23)*(.55+cloud*.6);
      float pulse=.5+.5*sin(uTime*.18+cell.x*.12-cell.y*.08);
      vec3 color=vec3(.002,.004,.016)*( .8+hash(cell)*.38+material*.25);
      color+=vec3(.012,.052,.15)*illumination;
      color+=vec3(.075,.009,.16)*fill*(.62+uChapter*.36);
      color+=vec3(.018,.095,.22)*grout*(.16+illumination*.72)*(.55+hash(cell)*.45);
      color+=vec3(.055,.008,.11)*pulse*cloud*.055;
      color-=vec3(.003)*(1.-smoothstep(0.,.07,edge.y))*(1.-grout);
      color*=1.-uSide*.3;
      gl_FragColor=vec4(max(color,vec3(.001)),1.);
    }
  `;
  function wall(width,height,position,rotation,side){
    const material = new THREE.ShaderMaterial({
      uniforms:{uNoise:noiseTexture,uTime:time,uChapter:chapter,uSide:{value:side},uTiles:{value:new THREE.Vector2(width/.92,height/.92)}},
      vertexShader:planeVertex,fragmentShader:roomFragment,side:THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
    mesh.position.set(...position);mesh.rotation.set(...rotation);scene.add(mesh);
  }
  wall(12,11,[0,.6,-10.5],[0,0,0],0);
  wall(20,11,[-6,.6,-.5],[0,Math.PI/2,0],.6);
  wall(20,11,[6,.6,-.5],[0,-Math.PI/2,0],.9);
  wall(12,20,[0,-4.9,-.5],[-Math.PI/2,0,0],.8);
  wall(12,20,[0,6.1,-.5],[Math.PI/2,0,0],1.);

  // Narrow architectural ribs catch a small edge light and frame the distant wall.
  const ribMaterial = new THREE.MeshStandardMaterial({color:0x080e18,roughness:.62,metalness:.6});
  for(const side of [-1,1]){
    for(const depth of [-7,-2.5,2]){
      const rib = new THREE.Mesh(new THREE.BoxGeometry(.11,11,.18),ribMaterial);
      rib.position.set(side*5.92,.6,depth);scene.add(rib);
    }
  }
  scene.add(new THREE.AmbientLight(0x40578f,.5));
  const keyLight = new THREE.PointLight(0x38bfff,42,24,2);
  keyLight.position.set(-3.4,4.5,2);scene.add(keyLight);
  const rimLight = new THREE.PointLight(0xff2dbb,30,20,2);
  rimLight.position.set(3.2,1.2,-2);scene.add(rimLight);

  // A layered portal gives the room a destination and keeps the scene from reading as a corporate grid.
  const portal=new THREE.Group();portal.position.set(0,.28,-8.95);scene.add(portal);
  const portalRings=[];
  function portalRing(radius,thickness,color,opacity,scaleY=.74){
    const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,thickness,10,128),material);
    mesh.scale.y=scaleY;mesh.rotation.z=radius*.11;portal.add(mesh);portalRings.push(mesh);return mesh;
  }
  portalRing(2.96,.018,0x28e7ff,.62,.73);
  portalRing(2.62,.008,0xa76dff,.42,.73);
  portalRing(2.18,.014,0xff3ac8,.48,.73);
  portalRing(1.76,.006,0x4c9bff,.52,.73);
  const trianglePoints=[new THREE.Vector3(0,2.35,.03),new THREE.Vector3(-2.04,-1.52,.03),new THREE.Vector3(2.04,-1.52,.03),new THREE.Vector3(0,2.35,.03)];
  for(const [scale,color,opacity] of [[1,0x2ce9ff,.65],[.78,0xe04cff,.42]]){
    const geo=new THREE.BufferGeometry().setFromPoints(trianglePoints);
    const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}));line.scale.setScalar(scale);line.position.z=.08;portal.add(line);
  }
  const portalGlowMaterial=new THREE.ShaderMaterial({
    uniforms:{uTime:time},vertexShader:planeVertex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    fragmentShader:`varying vec2 vUv;uniform float uTime;void main(){vec2 p=vUv-.5;p.x*=1.1;float r=length(p);float pulse=.8+.2*sin(uTime*.24);float aura=exp(-r*r*13.)*pulse;float rim=exp(-pow((r-.32)*16.,2.));vec3 col=mix(vec3(.03,.22,.64),vec3(.72,.04,.48),smoothstep(.18,.52,vUv.y));gl_FragColor=vec4(col,(aura*.13+rim*.09));}`
  });
  const portalGlow=new THREE.Mesh(new THREE.PlaneGeometry(7,7),portalGlowMaterial);portalGlow.position.z=-.12;portal.add(portalGlow);

  // A low density cosmic field sits behind the hero symbol and gives the camera something to pass through.
  const cosmicCount=innerWidth<700?360:720;
  const cosmicPositions=new Float32Array(cosmicCount*3),cosmicColors=new Float32Array(cosmicCount*3);
  let cosmicSeed=1947;const cosmicRandom=()=>{cosmicSeed=(cosmicSeed*1664525+1013904223)>>>0;return cosmicSeed/4294967296;};
  for(let i=0;i<cosmicCount;i++){
    const arm=i%4, radius=1.5+cosmicRandom()*8.8, angle=arm*Math.PI*.5+radius*.64+(cosmicRandom()-.5)*.8;
    cosmicPositions.set([Math.cos(angle)*radius+(cosmicRandom()-.5)*.35,(cosmicRandom()-.5)*5.5,Math.sin(angle)*radius-5.8],i*3);
    const c=new THREE.Color().setHSL(i%5===0?.86:i%3===0?.53:.62,.78,.54);cosmicColors.set([c.r,c.g,c.b],i*3);
  }
  const cosmicGeometry=new THREE.BufferGeometry();cosmicGeometry.setAttribute('position',new THREE.BufferAttribute(cosmicPositions,3));cosmicGeometry.setAttribute('color',new THREE.BufferAttribute(cosmicColors,3));
  const cosmic=new THREE.Points(cosmicGeometry,new THREE.PointsMaterial({size:innerWidth<700?.028:.035,vertexColors:true,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));
  cosmic.position.set(0,.35,-.4);scene.add(cosmic);

  const beamFragment = `
    varying vec2 vUv;uniform float uTime,uStrength,uSeed;uniform vec3 uColor;
    ${noiseGLSL}
    void main(){
      float down=1.-vUv.y;
      float width=.024+pow(down,.85)*.43;
      float center=.5+sin(down*2.1+uSeed)*.016;
      float falloff=exp(-pow((vUv.x-center)/width,2.)*2.6);
      float veil=fbm(vec2(vUv.x*4.+uSeed,vUv.y*6.-uTime*.021));
      float strands=.78+.22*noise(vec2((vUv.x-.5)/(width+.08)*8.,uTime*.045+uSeed));
      float fade=smoothstep(0.,.24,vUv.y)*(1.-smoothstep(.95,1.,vUv.y));
      float alpha=falloff*fade*(.4+veil*.6)*strands*uStrength;
      gl_FragColor=vec4(uColor,alpha);
    }
  `;
  const beams=[];
  function beam(position,width,height,angle,color,strength,seed){
    const material = new THREE.ShaderMaterial({
      uniforms:{uNoise:noiseTexture,uTime:time,uColor:{value:new THREE.Color(color)},uStrength:{value:strength},uSeed:{value:seed}},
      vertexShader:planeVertex,fragmentShader:beamFragment,transparent:true,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
    mesh.position.set(...position);mesh.rotation.z=angle;mesh.renderOrder=2;
    mesh.userData.angle=angle;scene.add(mesh);beams.push(mesh);
  }
  beam([-2.4,1.3,-5.4],5.2,15,.42,0x8fb9db,.30,1.3);
  beam([-2.9,1.8,-7.7],2.8,14,.43,0x849cdf,.14,5.1);
  beam([4.2,.2,-6.6],3.6,13,-.18,0xb79577,.10,8.3);

  const mistFragment = `
    varying vec2 vUv;uniform float uTime,uSeed,uOpacity;uniform vec3 uColor;
    ${noiseGLSL}
    void main(){
      vec2 p=vUv*vec2(4.,2.2)+vec2(uTime*.009+uSeed,-uTime*.007);
      float n=fbm(p+fbm(p*.73+uSeed)*1.5);
      float mask=smoothstep(0.,.21,vUv.x)*(1.-smoothstep(.74,1.,vUv.x));
      mask*=smoothstep(0.,.23,vUv.y)*(1.-smoothstep(.64,1.,vUv.y));
      float alpha=smoothstep(.32,.78,n)*mask*uOpacity;
      gl_FragColor=vec4(uColor,alpha);
    }
  `;
  const mist=[];
  for(const [x,y,z,width,height,seed,opacity,color] of [
    [-1.6,1.1,-6.8,17,8,2.2,.12,0x8196b2],
    [1.3,-2.2,-1.4,16,5,6.1,.095,0x65788e],
    [-2,-2.1,3.3,12,3.4,11.7,.055,0x82949c]
  ]){
    const material=new THREE.ShaderMaterial({uniforms:{uNoise:noiseTexture,uTime:time,uSeed:{value:seed},uOpacity:{value:opacity},uColor:{value:new THREE.Color(color)}},vertexShader:planeVertex,fragmentShader:mistFragment,transparent:true,depthWrite:false});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
    mesh.position.set(x,y,z);mesh.renderOrder=3;scene.add(mesh);mist.push(mesh);
  }

  // Defocused nearby motes move independently of the sharply resolved distant dust.
  const dustCount=innerWidth<700?220:420;
  const dustGeometry=new THREE.BufferGeometry();
  const positions=new Float32Array(dustCount*3),sizes=new Float32Array(dustCount),phases=new Float32Array(dustCount);
  let randomState=73;
  function random(){randomState=(1664525*randomState+1013904223)>>>0;return randomState/4294967296;}
  for(let i=0;i<dustCount;i++){
    const near=i<18;
    positions.set([(random()-.5)*12,(random()-.5)*9,near?3+random()*2.4:-9+random()*10],i*3);
    sizes[i]=near?.045+random()*.10:.009+random()*.024;phases[i]=random()*Math.PI*2;
  }
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  dustGeometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
  dustGeometry.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
  const dustMaterial=new THREE.ShaderMaterial({
    uniforms:{uTime:time,uPixelHeight:{value:innerHeight}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float uTime,uPixelHeight;attribute float aSize,aPhase;varying float vAlpha,vNear;
      void main(){vec3 p=position;p.x+=sin(uTime*.08+aPhase)*.16;p.y+=sin(uTime*.12+aPhase*1.4)*.24;
      vec4 mv=modelViewMatrix*vec4(p,1.);vNear=step(2.5,position.z);
      float beam=exp(-pow((p.x+p.y*.42+1.9)*.28,2.));vAlpha=(.035+beam*.27)*(.7+.3*sin(aPhase+uTime*.17));
      vAlpha*=mix(1.,.20,vNear)*smoothstep(.5,2.4,-mv.z);
      gl_PointSize=clamp(aSize*uPixelHeight/max(1.,-mv.z),1.,38.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying float vAlpha,vNear;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;
      float soft=exp(-r*r*mix(5.,3.2,vNear))*(1.-smoothstep(.65,1.,r));
      gl_FragColor=vec4(mix(vec3(.49,.64,.80),vec3(.62,.71,.76),vNear),soft*vAlpha);}`
  });
  scene.add(new THREE.Points(dustGeometry,dustMaterial));

  const core=new THREE.Group();scene.add(core);
  const outline=new THREE.Shape();outline.moveTo(0,1.57);outline.lineTo(-1.35,-1.08);outline.lineTo(1.35,-1.08);outline.closePath();
  const hole=new THREE.Path();hole.moveTo(0,.7);hole.lineTo(.64,-.60);hole.lineTo(-.64,-.60);hole.closePath();outline.holes.push(hole);
  const geometry=new THREE.ExtrudeGeometry(outline,{depth:.22,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.045,bevelThickness:.055});
  const triangle=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({color:0x6c94cc,emissive:0x26467e,emissiveIntensity:.45,metalness:.42,roughness:.27,clearcoat:1,clearcoatRoughness:.2}));
  core.add(triangle);
  const outlineMesh=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,28),new THREE.LineBasicMaterial({color:0xa1c5ff,transparent:true,opacity:.14}));core.add(outlineMesh);

  const pointer={x:0,y:0,tx:0,ty:0};
  let scrollPosition=scrollY;
  let sectionOffsets=[];
  let heroEnd=innerHeight;
  function measure(){
    sectionOffsets=[...document.querySelectorAll('.scene')].map(el=>el.offsetTop);
    heroEnd=document.getElementById('archive').offsetTop;
  }
  const shots=[
    new THREE.Vector3(.12,.18,8.4),new THREE.Vector3(-.7,.34,7.1),
    new THREE.Vector3(.8,.1,6.8),new THREE.Vector3(-.35,.26,7.4),new THREE.Vector3(.1,.35,7.9)
  ];
  const cameraTarget=new THREE.Vector3();
  const lookTarget=new THREE.Vector3();
  const mobile=()=>innerWidth<700;
  let qualityScale=1;
  function resize(){
    const dpr=Math.min(devicePixelRatio||1,mobile()?1:1.35)*qualityScale;
    renderer.setPixelRatio(dpr);renderer.setSize(innerWidth,innerHeight);
    composer.setPixelRatio(dpr);composer.setSize(innerWidth,innerHeight);
    bloom.setSize(Math.round(innerWidth*dpr*.65),Math.round(innerHeight*dpr*.65));
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
    dustMaterial.uniforms.uPixelHeight.value=innerHeight*dpr;measure();
  }
  addEventListener('resize',resize,{passive:true});
  addEventListener('pointermove',e=>{pointer.tx=e.clientX/innerWidth-.5;pointer.ty=e.clientY/innerHeight-.5;},{passive:true});
  addEventListener('pointerout',e=>{if(!e.relatedTarget){pointer.tx=0;pointer.ty=0;}});
  addEventListener('load',measure,{once:true});
  resize();

  let frame=0,lastTime=0,elapsed=0,animation,batchStart=0;
  function render(ms){
    const delta=lastTime?Math.min((ms-lastTime)*.001,.15):.016;lastTime=ms;
    if(!reducedMotion.matches)elapsed+=delta;
    const t=elapsed;time.value=t;
    const ease=1.-Math.exp(-delta*3.6);
    pointer.x+=(pointer.tx-pointer.x)*ease;pointer.y+=(pointer.ty-pointer.y)*ease;
    scrollPosition+=(scrollY-scrollPosition)*(1.-Math.exp(-delta*5.));
    let index=0;while(index<sectionOffsets.length-1&&scrollPosition>=sectionOffsets[index+1])index++;
    const next=Math.min(index+1,shots.length-1);
    const fraction=THREE.MathUtils.clamp((scrollPosition-sectionOffsets[index])/Math.max(1,(sectionOffsets[next]||document.documentElement.scrollHeight)-sectionOffsets[index]),0,1);
    const blend=fraction*fraction*(3.-2.*fraction);
    cameraTarget.copy(shots[index]).lerp(shots[next],blend);
    chapter.value=(index+blend)/4.;
    const motion=reducedMotion.matches?0:1;
    camera.position.copy(cameraTarget);
    camera.position.x+=motion*(pointer.x*.38+Math.sin(t*.09)*.055);
    camera.position.y+=motion*(-pointer.y*.16+Math.sin(t*.13)*.025);
    camera.position.z+=motion*.45*Math.exp(-t*.55);
    lookTarget.set(cameraTarget.x*.16,.15+pointer.y*.035*motion,-5.5);
    camera.lookAt(lookTarget);
    const presence=1.-THREE.MathUtils.smoothstep(scrollPosition,heroEnd*.12,heroEnd*.92);
    core.visible=presence>.001;core.scale.setScalar((mobile()?.74:1.02)*Math.max(.001,presence));
    core.position.set(mobile()?0:.55,.67,-.1-(1.-presence)*2.5);
    core.rotation.set(-.04+Math.sin(t*.15)*.04,.08+Math.sin(t*.19)*.16+pointer.x*.09*motion,-.045);
    portal.rotation.y=motion*(Math.sin(t*.11)*.035+pointer.x*.045);
    portal.rotation.z=motion*Math.sin(t*.07)*.018;
    portalRings.forEach((ring,i)=>{ring.rotation.z+=motion*delta*(i%2?.035:-.022);ring.material.opacity=(.28+i*.06)+Math.sin(t*.32+i)*.06;});
    portalGlow.rotation.z=t*.018*motion;
    cosmic.rotation.y=t*.012*motion;cosmic.rotation.x=Math.sin(t*.08)*.018*motion;cosmic.position.x=pointer.x*.08*motion;
    beams.forEach((mesh,i)=>{mesh.rotation.z=mesh.userData.angle+Math.sin(t*.055+i)*.012;});
    const renderStart=performance.now();
    composer.render();
    canvas.dataset.renderMs=String(Math.round((performance.now()-renderStart)*10)/10);
    if(frame++%30===0){
      canvas.dataset.renderFrame=String(frame);canvas.dataset.scene='cinema-room';
      if(batchStart){
        const fps=30000/(ms-batchStart);canvas.dataset.frameRate=String(Math.round(fps));
        // Leave the crisp DOM text untouched when a GPU needs a lighter scene.
        if(frame>30&&fps<24&&qualityScale>.66){qualityScale=Math.max(.65,qualityScale*.8);bloom.enabled=false;resize();}
      }
      batchStart=ms;
    }
    animation=requestAnimationFrame(render);
  }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(animation);document.body.classList.remove('webgl-ready');canvas.dataset.scene='fallback';});
  canvas.addEventListener('webglcontextrestored',()=>{lastTime=0;document.body.classList.add('webgl-ready');animation=requestAnimationFrame(render);});
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(animation);if(!document.hidden){lastTime=0;animation=requestAnimationFrame(render);}});
  document.body.classList.add('webgl-ready');animation=requestAnimationFrame(render);
}

try {startScene();} catch(error) {
  document.body.classList.remove('webgl-ready');canvas.style.display='none';
  console.error('Immersive scene could not start:',error);
}
