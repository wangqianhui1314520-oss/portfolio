import {getMotionPreference,getQuality} from './runtime-settings.js?v=cinematic-v21.19';
import * as THREE from 'three';
import { EffectComposer } from '../vendor/three-0.161.0/examples/jsm/postprocessing/EffectComposer.js';
import {SceneTargetPass} from './immersive-scene-layers.js?v=cinematic-v21.19';
import { UnrealBloomPass } from '../vendor/three-0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three-0.161.0/examples/jsm/postprocessing/OutputPass.js';
import { createOrbitalWorld } from './immersive-planet.js?v=cinematic-v21.19';
import { createShipCockpit } from './immersive-cockpit.js?v=cinematic-v21.19';
import { createNavigation } from './immersive-navigation.js?v=cinematic-v21.19';
import { createFilmLook } from './immersive-film.js?v=cinematic-v21.19';
import { createDeepSpaceAtmosphere } from './immersive-atmosphere.js?v=cinematic-v21.19';
import { createOpeningVoyage } from './immersive-voyage-optical.js?v=cinematic-v21.19';
import { createCreatorArchive } from './immersive-archive-optical.js?v=cinematic-v21.19';
import {createCelestialSky} from './immersive-optical.js?v=cinematic-v21.19';
import {createFrameBudget,createFrameClock,createFrameTelemetry,createRenderPacer,renderPixelRatio,graphicsProfile} from './immersive-frame-budget.js?v=cinematic-v21.19';
import {createPointerField} from './immersive-pointer-field.js?v=cinematic-v21.19';
import {createStarportOptics} from './immersive-starport-optics.js?v=cinematic-v21.19';
import {createObservatoryWorld} from './immersive-observatory-world.js?v=cinematic-v21.19';
import {createCinematicEnvironment,cinematicLighting} from './immersive-lightstage.js?v=cinematic-v21.19';
import {createPlanarReflection} from './immersive-planar-reflection.js?v=cinematic-v21.19';
import {createStarSea} from './immersive-star-sea.js?v=cinematic-v21.19';
import {createShaderDiagnostics} from './immersive-shader-diagnostics.js?v=cinematic-v21.19';
import {createObservatoryV19} from './immersive-observatory-v19.js?v=cinematic-v21.19';
import {createGpuTiming,readGraphicsEvidence} from './immersive-gpu-timing.js?v=cinematic-v21.19';
import {createRenderProfile} from './immersive-render-profile.js?v=cinematic-v21.19';
import {archiveFraming} from './immersive-archive-path.js?v=cinematic-v21.19';
import {createLightRig} from './immersive-light-rig.js?v=cinematic-v21.19';
import {waitForStartupAssets,prepareStartupShaders,fullscreenPassMaterials,prepareFullscreenShaders,createShaderWarmup,setLateAssetCompiler} from './immersive-shader-preparation.js?v=cinematic-v21.19';

const canvas = document.getElementById('space');
const motionPreference = getMotionPreference();
let activeNavigation;

function randomSource(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

async function initialize() {
  const startupStarted=performance.now();
  const compact = () => innerWidth < 700;
  // Every pixel reaches the canvas through the composer's final opaque pass.
  // A multisampled, alpha-composited default framebuffer only added a full
  // resolve and page blend per frame (13–22% of GPU time on an Iris Xe).
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'high-performance' });
  const shaderDiagnostics=createShaderDiagnostics(renderer.getContext(),{enabled:new URLSearchParams(location.search).get('profile')==='shader'});
  if(new URLSearchParams(location.search).get('profile')==='shader')canvas.temShaderDiagnostics=shaderDiagnostics;
  const publishGraphicsEvidence=()=>{const evidence=readGraphicsEvidence(renderer.getContext());canvas.dataset.graphicsRenderer=evidence.renderer;canvas.dataset.graphicsVendor=evidence.vendor;canvas.dataset.graphicsAcceleration=evidence.acceleration;};
  publishGraphicsEvidence();
  renderer.setClearColor(0x01030a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.10;
  renderer.shadowMap.enabled = true;renderer.shadowMap.type = THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const scene = new THREE.Scene();
  // Bake directional HDR light cards once. Curved physical surfaces receive
  // shaped reflections, while the live scene needs no per-frame capture.
  let environmentReady=false,lightstage,radianceReady=false,restoreRadiance=false;
  async function prepareEnvironment(){
    if(environmentReady)return;
    canvas.dataset.startupPhase='preparing-radiance-shader';
    const started=performance.now();
    lightstage=createCinematicEnvironment({renderer,volumeState:atmosphere.radianceState,deferCapture:true});
    try{scene.environment=await lightstage.prepare();}catch(error){lightstage.dispose();throw error;}
    environmentReady=true;renderer.shadowMap.needsUpdate=true;
    canvas.dataset.startupRadianceMs=(performance.now()-started).toFixed(1);
    canvas.dataset.environment='procedural-radiance-real-energy-PMREM';
  }
  const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, .1, 24000);
  scene.add(camera);
  renderer.info.autoReset=false;
  const gpuTiming=createGpuTiming(renderer.getContext());
  const sceneTarget=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,depthBuffer:true,depthTexture:new THREE.DepthTexture(innerWidth,innerHeight,THREE.UnsignedIntType)});
  // The GPU tier sets multisampling and the transmission capture; the frame
  // budget below still adapts resolution. Discrete GPUs keep 4x / full size.
  // The frame budget is created later; until then no automatic tier drop applies.
  let tierDropSource=()=>0;
  const graphicsTier=()=>graphicsProfile({renderer:readGraphicsEvidence(renderer.getContext()).renderer,compact:compact(),preference:getQuality(),maxSamples:renderer.capabilities.maxSamples||0,drop:tierDropSource()});
  let graphics=graphicsTier();
  sceneTarget.samples=graphics.samples;renderer.transmissionResolutionScale=graphics.transmissionScale;renderer.transmissionSamples=graphics.transmissionSamples;
  canvas.dataset.graphicsTier=document.body.dataset.graphicsTier=graphics.tier;canvas.dataset.transmissionScale=String(graphics.transmissionScale);
  canvas.dataset.arrivalCoverage='multisample-'+sceneTarget.samples;
  // Geometry and deferred line/point coverage share the tier's MSAA count.
  // Fullscreen colour work samples their resolved output once; repeated
  // multisample resolves cannot improve a fullscreen triangle's interior.
  const postTarget=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false});
  const composer = new EffectComposer(renderer,postTarget);
  canvas.dataset.sceneSamples=String(sceneTarget.samples);canvas.dataset.particleSamples=String(sceneTarget.samples);canvas.dataset.postprocessSamples='0';
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .36, .40, 1.10);
  composer.addPass(new SceneTargetPass({scene,camera,target:sceneTarget})); composer.addPass(bloom); composer.addPass(new OutputPass());

  const time = { value: 0 }, flight = { value: 0 }, velocity = { value: 0 }, pixelHeight = { value: innerHeight };
  const pointerWorld = { value: new THREE.Vector3(1000, 1000, -40) };
  const rippleOrigin = { value: new THREE.Vector3() }, rippleStart = { value: -100 };
  const pulse = { value: 0 };
  const interaction=createPointerField({canvas});
  const film = createFilmLook({composer,scene,camera,time,velocity,pulse,compact});
  const atmosphere = createDeepSpaceAtmosphere({scene,camera,composer,time,velocity,pulse,compact,pixelHeight,interaction,sourceTarget:sceneTarget});
  const voyage=createOpeningVoyage({scene,camera,particleScene:atmosphere.particleScene,particleUniforms:atmosphere.particleUniforms,compact});

  // Dark analytic radiance sits behind actual, Blender-authored cloud regions.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4300,48,32), createCelestialSky({time,interaction}));
  sky.frustumCulled = false; sky.renderOrder = -1000; scene.add(sky);
  canvas.dataset.plate='no-environment-images-procedural-radiance';canvas.dataset.backdrop='layered-world-space-nebula';canvas.dataset.backgroundLayers='world-stars-live-currents-volume-near-dust';

  const pointFragment = `varying vec3 vColor;varying float vAlpha,vBlur,vDistance;
    #ifdef LOCAL_DUST
    uniform sampler2D uSceneDepth,uNebulaFog;uniform vec2 uFrameSize;
    #endif
    void main(){
    #ifdef LOCAL_DUST
    if(gl_FragCoord.z>texture2D(uSceneDepth,gl_FragCoord.xy/uFrameSize).r+.0000001)discard;
    #endif
    float cloudVeil=1.;
    #ifdef LOCAL_DUST
    cloudVeil-=texture2D(uNebulaFog,gl_FragCoord.xy/uFrameSize).a*smoothstep(100.,800.,vDistance)*.8;
    #endif
    float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;
    float glow=exp(-r*r*mix(9.,3.2,vBlur))+.10*exp(-r*r*2.8);
    gl_FragColor=vec4(vColor,glow*(1.-smoothstep(.65,1.,r))*vAlpha*cloudVeil);}`;

  function particles(kind, count, seed) {
    const random = randomSource(seed), positions = [], colors = [], sizes = [], phases = [];
    const gaussian = () => (random() + random() + random() + random() - 2) * .75;
    for (let i = 0; i < count; i++) {
      if (kind === 'stars') {
        const a=random()*Math.PI*2, v=i%3===0?random()*2-1:gaussian()*.25, r=3200+random()*600;
        const p=new THREE.Vector3(Math.cos(a)*Math.sqrt(1-v*v)*r,v*r,Math.sin(a)*Math.sqrt(1-v*v)*r);p.applyAxisAngle(new THREE.Vector3(0,0,1),-.35);positions.push(...p.toArray());
        sizes.push(.8 + Math.pow(random(),6)*7);
      } else if (kind === 'stream') {
        const arm=i%3,x=(random()-.5)*360;
        positions.push(x,gaussian()*(6+arm*5)+arm*17-18,gaussian()*22+arm*44-110);
        sizes.push(.034+Math.pow(random(),7)*.30);
      } else {
        positions.push((random() - .5) * 180, (random() - .5) * 130, (random()-.5) * 240);
        sizes.push(i < 12 ? .18 + random() * .10 : .025 + random() * .070);
      }
      const color = new THREE.Color();
      if (i % 13 === 0) color.setRGB(.84, .66, .98);
      else if (i % 7 === 0) color.setRGB(.48, .72, .95);
      else color.setRGB(.79 + random() * .18, .84 + random() * .14, 1.);
      colors.push(color.r, color.g, color.b); phases.push(random() * Math.PI * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    const behavior = kind === 'stars' ? `
      alpha=.43+.025*sin(uTime*.12+aPhase);` : kind === 'stream' ? `
      p.x=mod(position.x+180.+uTime*.78,360.)-180.;
      p.y=position.y+sin(p.x*.017+aPhase*.12)*15.+sin(uTime*.10+aPhase)*2.;
      p.z=position.z+cos(p.x*.013+aPhase*.1)*24.;
      vec3 delta=p-uPointer;float influence=exp(-dot(delta,delta)*.0018);
      p+=delta*influence*.10;
      float age=uTime-uRippleStart;float distance=length(p-uRipple);
      float rippleDistance=(distance-age*15.)*.12;p+=normalize(p-uRipple+vec3(.001))*exp(-rippleDistance*rippleDistance)*exp(-max(age,0.)*.8)*1.8;
      float edge=1.-smoothstep(135.,180.,abs(p.x));
      alpha=.43*edge*(.90+.10*sin(aPhase+uTime*.17));` : `
      p+=vec3(sin(aPhase+uTime*.16)*7.,cos(aPhase+uTime*.12)*3.,sin(aPhase*1.7+uTime*.13)*9.);
      blur=step(.20,aSize);
      alpha=mix(.32,.055,blur);`;
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: time, uFlight: flight, uPixelHeight: pixelHeight, uPointer: pointerWorld, uRipple: rippleOrigin, uRippleStart: rippleStart,uObserver:{value:camera.position},...atmosphere.particleUniforms },
      defines:kind==='stars'?{}:{LOCAL_DUST:1},transparent: true, depthTest:kind==='stars',depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime,uFlight,uPixelHeight,uRippleStart;uniform vec3 uPointer,uRipple,uObserver;
        attribute vec3 aColor;attribute float aSize,aPhase;varying vec3 vColor;varying float vAlpha,vBlur,vDistance;
        void main(){vec3 p=position;float alpha=1.,blur=0.;${behavior}
        vec4 mv=modelViewMatrix*vec4(p,1.);vColor=aColor${kind==='stars'?'*(1.20+smoothstep(4.,8.,aSize)*.90)':''};vBlur=blur;vDistance=-mv.z;
        vAlpha=alpha*smoothstep(1.5,7.,-mv.z)*(1.-smoothstep(4100.,5000.,-mv.z));
        gl_PointSize=clamp(aSize*uPixelHeight/max(1.,-mv.z),${kind==='stars'?'1.15':'.7'},mix(4.5,8.,blur));
        gl_Position=projectionMatrix*mv;}`,
      fragmentShader: pointFragment
    });
    const points = new THREE.Points(geometry, material); points.frustumCulled = false;(kind==='stars'?scene:atmosphere.particleScene).add(points);
    return points;
  }
  const stars = particles('stars', compact() ? 3000 : 7200, 381);
  const stream = particles('stream', compact() ? 600 : 1200, 977);
  particles('near', compact() ? 180 : 420, 581);
  canvas.dataset.particles = String((compact() ? 3780 : 8820)+atmosphere.count);

  // Sparse foreground trails make a scroll read as travelling through the field.
  const trailRandom = randomSource(326), trailPositions = [], trailEnds = [];
  for (let i = 0; i < (compact()?60:130); i++) {
    const angle = trailRandom() * Math.PI * 2, radius = 7 + trailRandom() * 36;
    const p = [Math.cos(angle) * radius, Math.sin(angle) * radius * .7, trailRandom() * 95];
    trailPositions.push(...p, ...p); trailEnds.push(0, 1);
  }
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trailPositions, 3));
  trailGeometry.setAttribute('aEnd', new THREE.Float32BufferAttribute(trailEnds, 1));
  const trails = new THREE.LineSegments(trailGeometry, new THREE.ShaderMaterial({
    uniforms: { uTime: time, uFlight: flight, uVelocity: velocity }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime,uFlight,uVelocity;attribute float aEnd;varying float vAlpha;
      void main(){vec3 p=position;p.z=mod(p.z+uTime*.7+uFlight*1.1,95.)-77.;p.z-=aEnd*(.10+uVelocity*4.2);
      vec4 mv=modelViewMatrix*vec4(p,1.);vAlpha=(.028+uVelocity*.12)*smoothstep(2.,12.,-mv.z)*(1.-aEnd*.92);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: 'varying float vAlpha;void main(){gl_FragColor=vec4(.32,.64,.95,vAlpha);}'
  }));
  trails.frustumCulled = false; camera.add(trails);

  const orbitalWorld = createOrbitalWorld({ scene, renderer, canvas, time, compact });
  const shipCockpit = createShipCockpit({ camera });
  const navigation = createNavigation({ scene, camera, interaction });
  const starportOptics=createStarportOptics({composer,camera,canvas,compact,getAnchor:()=>navigation.opticalAnchor(),getSceneDepth:()=>atmosphere.particleUniforms.uSceneDepth.value});
  activeNavigation = navigation;

  // Only distant broken orbital arcs remain as a faint reference to the original sci-fi structure.
  const orbitGroup = new THREE.Group(); orbitGroup.position.set(29, 12, -160); orbitGroup.rotation.set(.34,-.15,-.35); scene.add(orbitGroup);
  for (let i=0;i<2;i++) {
    const curve=new THREE.EllipseCurve(0,0,30+i*4,18+i*2,.14,Math.PI*1.25,false,0);
    const geometry=new THREE.BufferGeometry().setFromPoints(curve.getPoints(140).map(p=>new THREE.Vector3(p.x,p.y,0)));
    orbitGroup.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:i?0x806dc8:0x68bddd,transparent:true,opacity:i?.07:.1,depthWrite:false,blending:THREE.AdditiveBlending})));
  }

  const creatorArchive=createCreatorArchive({scene,camera,interaction});
  const reflection=createPlanarReflection({renderer,scene,camera,canvas,size:compact()?360:640});
  const observatoryWorld=createObservatoryWorld({scene,compact,reflection});
  const deckSunDirection={value:new THREE.Vector3(...cinematicLighting.keyDirection).normalize()};
  const dreamObservatory=createObservatoryV19({scene,camera,canvas,compact,reflection,externalCloud:true,densityAtlas:atmosphere.radianceState.uAtlas,sunDirection:deckSunDirection});
  const starSea=createStarSea({scene,canvas,time,interaction,compact,onPlanet:(mesh,spec)=>orbitalWorld.adoptAuthoredPlanet(mesh,spec),onLayout:layout=>{atmosphere.setWorldLayout(layout);lightstage?.setWorldLayout(layout);}});
  const renderProfile=createRenderProfile({gl:renderer.getContext(),composer,canvas,renderer,enabled:new URLSearchParams(location.search).get('profile')==='render'});
  const captureReflection=renderProfile.measure('reflection',reflection.update);
  orbitGroup.visible=false;
  scene.add(new THREE.AmbientLight(0x91aac5,.085));
  const skyFill=new THREE.HemisphereLight(0xc5d1e9,0x080e1a,.16);scene.add(skyFill);
  const lightCenter=new THREE.Vector3(0,-1,-27);
  const keyBaseDirection=new THREE.Vector3().fromArray(cinematicLighting.keyDirection),sunriseDirection=new THREE.Vector3(.48,.19,-.84).normalize(),blendedKeyDirection=new THREE.Vector3();
  const keyBaseColor=new THREE.Color(cinematicLighting.keyColor),sunriseColor=new THREE.Color(0xffdfc0);
  const key=new THREE.DirectionalLight(cinematicLighting.keyColor,1.65);
  key.name='Tem.cinematic.stellar-key';key.target.position.copy(lightCenter);
  key.position.fromArray(cinematicLighting.keyDirection).normalize().multiplyScalar(95).add(lightCenter);
  key.castShadow=true;key.shadow.camera.left=key.shadow.camera.bottom=-76;key.shadow.camera.right=key.shadow.camera.top=76;
  key.shadow.camera.near=8;key.shadow.camera.far=210;key.shadow.bias=-.00016;key.shadow.normalBias=.035;key.shadow.radius=2;
  scene.add(key,key.target);
  const rim=new THREE.DirectionalLight(cinematicLighting.rimColor,.38);rim.name='Tem.cinematic.cyan-rim';
  rim.target.position.copy(lightCenter);rim.position.fromArray(cinematicLighting.rimDirection).normalize().multiplyScalar(95).add(lightCenter);
  // Only the warm key casts a shadow. The rim remains a cheap silhouette light.
  scene.add(rim,rim.target);
  canvas.dataset.cinematicLighting='shared-warm-stellar-key-cyan-rim';canvas.dataset.shadowLights='1';

  // Every world module has created its lights by now. A fixed set of real point
  // lights keeps the shader light count constant across all chapters and sectors.
  const lightRig=createLightRig({scene,camera,slots:6});lightRig.scan();
  // Later chapters, the starport and sector worlds link in the background,
  // nearest content first, instead of on the main thread when first shown.
  const warmupRank=object=>{for(let node=object;node;node=node.parent){if(/open-archive|observatory/.test(node.name))return 0;if(/starport|fleet|atlas/i.test(node.name))return 1;}return 2;};
  const warmup=createShaderWarmup({renderer,scene,camera,target:sceneTarget,reflection,rank:warmupRank});setLateAssetCompiler(root=>warmup.prepareRoot(root));
  const pointer={x:0,y:0,tx:0,ty:0,active:false},pointerRay=new THREE.Vector3();
  const budget=createFrameBudget({compact:compact()});tierDropSource=()=>budget.tierDrop;
  const clock=createFrameClock(),telemetry=createFrameTelemetry(),pacer=createRenderPacer({fps:60});let quality=getQuality()==='low'?.65:getQuality()==='full'?1:budget.quality,contextLost=false,pendingQuality=null,pendingQualityAt=0;
  let readinessDeadline=Infinity,pipelineReady=false,appliedTierDrop=0;
  let frame=0,elapsed=0,animation=0,announced=false,shadowStamp=-100,lastShadowStep='',lastShadowSector,shadowInteractionUntil=0,cpuSum=0,cpuFrames=0,lastPulse=-1;
  canvas.dataset.renderPolicy='refresh-aligned-max-75hz';canvas.dataset.motionClock='wall-time-navigation-bounded-simulation';
  function resize(){
    document.body.style.setProperty('--tem-screen-type-scale',archiveFraming(compact(),innerWidth/innerHeight).typeScale.toFixed(5));
    const dpr=renderPixelRatio({width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1,quality,compact:compact()});
    renderer.setPixelRatio(dpr);renderer.setSize(innerWidth,innerHeight);
    composer.setPixelRatio(dpr);composer.setSize(innerWidth,innerHeight);
    bloom.setSize(Math.round(innerWidth*dpr*.36),Math.round(innerHeight*dpr*.36));
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();pixelHeight.value=innerHeight*dpr;
    const shadowSize=compact()?768:quality>.78?1536:1024;
    if(key.shadow.mapSize.x!==shadowSize){key.shadow.mapSize.set(shadowSize,shadowSize);key.shadow.map?.dispose();key.shadow.map=null;renderer.shadowMap.needsUpdate=true;}
    canvas.dataset.keyShadowSize=String(shadowSize);
  }
  addEventListener('resize',resize,{passive:true});
  addEventListener('pointermove',e=>{pointer.tx=e.clientX/innerWidth-.5;pointer.ty=e.clientY/innerHeight-.5;pointer.active=true;},{passive:true});
  addEventListener('pointerout',e=>{if(!e.relatedTarget){pointer.tx=0;pointer.ty=0;pointer.active=false;}});
  addEventListener('pointerdown',e=>{if(motionPreference.matches||e.target.closest('a,button,.signal-card,.modal'))return;rippleStart.value=elapsed;rippleOrigin.value.copy(pointerWorld.value);},{passive:true});
  addEventListener('tem:ping',event=>{
    interaction.ping();
    pulse.value=motionPreference.matches?0:1;reflection.invalidate();
    rippleStart.value=elapsed;
    rippleOrigin.value.copy(pointerWorld.value.x>900?new THREE.Vector3(0,0,-55):pointerWorld.value);
    canvas.dataset.lastPing=event.detail?.source||'SYSTEM';
  },{passive:true});
  addEventListener('tem:atlas-select',event=>{const colors={forge:0x99d7ff,lumen:0xb5a1f3,echo:0xe8a0c4,nexus:0x87d4dd};interaction.setTint(colors[event.detail?.id]||0x9abfe9);});
  addEventListener('tem:archive-device',event=>{
    const {kind,index,active}=event.detail||{};
    const colors={identity:[0xc5dff4],book:[0x99cce6,0xaca6e0,0xc8b3d9,0x9bcfc8],poetry:[0xc5b4e3],capability:[0x9fcfea,0xb5b2e5,0xcfb9d9,0x99d2cd],record:[0x9bc9e5,0xacb5df,0xc7b2d7,0xa9d7db]};
    interaction.setTint(active?colors[kind]?.[index]||0xb3cce5:0x9abfe9);
    shadowInteractionUntil=performance.now()+900;renderer.shadowMap.needsUpdate=true;
  });
  addEventListener('tem:scene-depth-change',()=>{atmosphere.invalidate();reflection.invalidate();renderer.shadowMap.needsUpdate=true;});
  bloom.enabled=getQuality()!=='low';
  // A tier change reallocates the multisampled targets once with the new
  // sample count on their next draw; sample count is not a shader define.
  function applyGraphicsTier(next){
    if(next.samples!==graphics.samples){
      const particles=composer.passes.find(pass=>pass.scene&&pass.scene!==scene&&pass.target?.isWebGLRenderTarget);
      for(const target of [sceneTarget,particles?.target].filter(Boolean)){target.samples=next.samples;target.dispose();}
      canvas.dataset.sceneSamples=String(next.samples);canvas.dataset.particleSamples=String(next.samples);canvas.dataset.arrivalCoverage='multisample-'+next.samples;
    }
    renderer.transmissionResolutionScale=next.transmissionScale;renderer.transmissionSamples=next.transmissionSamples;
    graphics=next;canvas.dataset.graphicsTier=document.body.dataset.graphicsTier=next.tier;canvas.dataset.transmissionScale=String(next.transmissionScale);
  }
  addEventListener('tem:quality-preference',()=>{
    quality=getQuality()==='low'?.65:getQuality()==='full'?1:budget.quality;pendingQuality=null;bloom.enabled=getQuality()!=='low'&&quality>.58;
    applyGraphicsTier(graphicsTier());resize();atmosphere.invalidate();
  });
  // Resizing resets the opaque drawing buffer; show the scene clear colour, not
  // black, while startup shaders link before the first composed frame.
  resize();renderer.clear();

  function advanceWorld(dt,wallDt,motion){
    if(motion)elapsed+=dt;time.value=elapsed;
    if(motion){pulse.value*=Math.exp(-dt*2.8);if(pulse.value<.00001)pulse.value=0;}
    const ease=1-Math.exp(-dt*3.4);pointer.x+=(pointer.tx-pointer.x)*ease;pointer.y+=(pointer.ty-pointer.y)*ease;
    if(Math.abs(pointer.x-pointer.tx)<.0001)pointer.x=pointer.tx;
    if(Math.abs(pointer.y-pointer.ty)<.0001)pointer.y=pointer.ty;
    const navigationFrame=navigation.update(dt,pointer,elapsed,motion,wallDt);
    dreamObservatory.update(dt,elapsed,navigationFrame,motion,quality);
    navigationFrame.observatoryReplacement=dreamObservatory.replacementAmount;
    atmosphere.setCloudSeaEnabled(dreamObservatory.replacementAmount);
    starSea.update(dt,navigationFrame,motion,quality);
    if(!radianceReady&&starSea.ready&&dreamObservatory.ready&&lightstage){
      lightstage.setRadianceObjects([starSea.effects,...dreamObservatory.radianceObjects]);lightstage.setVolumeState(atmosphere.radianceState);radianceReady=true;
    }
    if(restoreRadiance&&lightstage){
      lightstage.invalidate();lightstage.update({time:elapsed,motion:false,force:true,quality});
      scene.environment=lightstage.texture;restoreRadiance=false;
    }else if(radianceReady&&!navigationFrame.archiveMoving&&!navigationFrame.opening&&lightstage.update({time:elapsed,motion:Boolean(motion),quality}))scene.environment=lightstage.texture;
    const mapLighting=['map','boot'].includes(navigationFrame.step);
    key.intensity=mapLighting?1.45:1.65;rim.intensity=mapLighting?.42:.38;
    const sunrise=dreamObservatory.replacementAmount;
    skyFill.intensity=THREE.MathUtils.lerp(.24,.50,sunrise);
    blendedKeyDirection.copy(keyBaseDirection).lerp(sunriseDirection,sunrise).normalize();
    deckSunDirection.value.copy(blendedKeyDirection);
    key.position.copy(lightCenter).addScaledVector(blendedKeyDirection,95);
    key.color.copy(keyBaseColor).lerp(sunriseColor,sunrise);
    key.intensity=THREE.MathUtils.lerp(key.intensity,1.55,sunrise);
    sky.position.copy(camera.position);
    stream.visible=!navigationFrame.sector;atmosphere.update(navigationFrame,pointer,motion,dt,quality);
    flight.value=navigationFrame.flight;velocity.value=navigationFrame.speed;
    trails.visible=!navigationFrame.opening&&Boolean(motion)&&navigationFrame.speed>.12&&['travel','target','docking'].includes(navigationFrame.step);
    if(pointer.active&&motion){pointerRay.set(pointer.x*2,-pointer.y*2,.5).unproject(camera).sub(camera.position).normalize();pointerWorld.value.copy(camera.position).addScaledVector(pointerRay,90);}
    else if(motion)pointerWorld.value.set(1000,1000,-55);
    const presence=navigationFrame.presence;
    stream.rotation.z=-.035+Math.sin(elapsed*.028)*.012;
    orbitalWorld.update(camera,presence,dt,navigationFrame);orbitGroup.rotation.z=-.35+elapsed*.002;
    shipCockpit.update(pointer,velocity.value,elapsed,navigationFrame,motion);
    creatorArchive.update(dt,elapsed,navigationFrame,motion);
    observatoryWorld.update(dt,elapsed,navigationFrame,motion);
    voyage.update(navigationFrame,motion);film.update(navigationFrame,dt,motion);
    bloom.strength=THREE.MathUtils.damp(bloom.strength,.26+velocity.value*.035+pulse.value*.05,5,dt);
    return navigationFrame;
  }

  function render(ms){
    if(contextLost||document.hidden)return;
    if(!pacer.shouldRender(ms)){animation=requestAnimationFrame(render);return;}
    const cpuStart=performance.now();
    gpuTiming.begin(frame);
    try{
    const {wallDt,dt}=clock.step(ms);
    const motion=motionPreference.matches||document.body.dataset.reading?0:1;
    const navigationFrame=advanceWorld(dt,wallDt,motion);lightRig.update(wallDt);
    const mapLighting=['map','boot'].includes(navigationFrame.step);
    const visiblePulse=Math.round(pulse.value*100);if(lastPulse!==visiblePulse){lastPulse=visiblePulse;canvas.dataset.pulse=String(visiblePulse);}
    // Cache the fixed key's map at rest. Only travel, moving devices and the
    // atlas's actual floating ships need periodically refreshed depth.
    const mechanicalShadows=navigationFrame.step==='captain'&&document.body.dataset.archiveChapter==='practice';
    const shadowMoving=document.body.dataset.moving==='true'||navigationFrame.archiveMoving||navigationFrame.opening||navigationFrame.step==='docking'||mapLighting||mechanicalShadows||ms<shadowInteractionUntil;
    const shadowInterval=navigationFrame.step==='docking'?100:shadowMoving?200:Infinity;
    if(lastShadowStep!==navigationFrame.step||lastShadowSector!==navigationFrame.sector||motion&&ms-shadowStamp>shadowInterval){renderer.shadowMap.needsUpdate=true;shadowStamp=ms;lastShadowStep=navigationFrame.step;lastShadowSector=navigationFrame.sector;}
    starportOptics.update(navigationFrame,dt,motion);
    renderer.info.reset();renderProfile.begin(frame);
    captureReflection(elapsed,navigationFrame,motion);composer.render();
    if(frame===0)canvas.dataset.startupFirstDrawMs=(performance.now()-startupStarted).toFixed(1);
    // An intro waiting for graphics must not start its clock before the first
    // successful draw has finished compiling and submitting the live world.
    if(!announced && (starSea.ready&&dreamObservatory.ready || ms>=readinessDeadline)){
      announced=true;canvas.dataset.readiness=starSea.ready&&dreamObservatory.ready?'authored-assets':'live-procedural-fallback';
      canvas.dataset.startupPhase='ready';
      canvas.dataset.startupReadyMs=(performance.now()-startupStarted).toFixed(1);
      // The next navigation tick starts after this draw. Its wall delta must
      // not include the cold draw that happened while the intro was unready.
      clock.reset();
      dispatchEvent(new Event('tem:scene-ready'));
    }
    cpuSum+=performance.now()-cpuStart;cpuFrames++;
    const observation=budget.sample(wallDt*1000,pacer.fps),evidence=telemetry.sample(wallDt*1000);
    if(getQuality()==='auto'&&observation?.changed){pendingQuality=observation.quality;pendingQualityAt=ms;}
    // Avoid reallocating the scene, depth, bloom and volume targets in the middle
    // of a good travelling shot. A genuinely slow shot can still recover promptly.
    if(pendingQuality!==null&&(!shadowMoving||observation?.fps<35||ms-pendingQualityAt>1600)){
      quality=pendingQuality;pendingQuality=null;if(budget.tierDrop!==appliedTierDrop){appliedTierDrop=budget.tierDrop;applyGraphicsTier(graphicsTier());}bloom.enabled=getQuality()!=='low'&&quality>.58;resize();
    }
    if(frame++%90===0||observation||evidence){
      canvas.dataset.scene='spatial-odyssey';canvas.dataset.drawCalls=String(renderer.info.render.calls);canvas.dataset.triangles=String(renderer.info.render.triangles);canvas.dataset.renderFrame=String(frame);
      canvas.dataset.camera=navigationFrame.position.toArray().map(n=>n.toFixed(2)).join(',');
      if(evidence){canvas.dataset.frameRate=evidence.fps.toFixed(1);canvas.dataset.frameWindowMs=evidence.elapsed.toFixed(1);canvas.dataset.frameWindowCount=String(evidence.frames);canvas.dataset.frameP95Ms=evidence.p95.toFixed(1);canvas.dataset.frameMaxMs=evidence.max.toFixed(1);canvas.dataset.frameLongCount=String(evidence.longFrames);}
      canvas.dataset.renderCpuMs=(cpuSum/Math.max(1,cpuFrames)).toFixed(2);cpuSum=0;cpuFrames=0;
      const gpu=gpuTiming.stats;canvas.dataset.gpuTiming=gpu.supported?'asynchronous-full-render-frame':'unavailable';
      renderProfile.publish();
      canvas.dataset.renderGpuSamples=String(gpu.samples);canvas.dataset.renderGpuMs=gpu.mean?.toFixed(2)||'unavailable';canvas.dataset.renderGpuP95Ms=gpu.p95?.toFixed(2)||'unavailable';
      if(lightstage){const probe=lightstage.stats;canvas.dataset.radianceCaptures=String(probe.captures);canvas.dataset.radianceSource=probe.sharedVolume?'shared-live-3d-density':'initial-3d-density';canvas.dataset.radianceProbe=`${probe.cubeSize} / ${probe.probeSteps} steps`;canvas.dataset.radianceCpuMs=probe.cpuMs.toFixed(2);}
      canvas.dataset.quality=quality.toFixed(2);canvas.dataset.bloom=String(bloom.enabled);canvas.dataset.shadowCache='paced';canvas.dataset.pixelRatio=renderer.getPixelRatio().toFixed(2);
      {const lights=lightRig.stats,warm=warmup.stats;canvas.dataset.lightRig=`${lights.active}/${lights.slots} of ${lights.virtual} authored`;canvas.dataset.shaderWarmup=`${warm.materials} materials / ${warm.programs} programs`;}
      canvas.dataset.renderStride=String(pacer.stride??'learning');canvas.dataset.renderTargetFps=pacer.fps.toFixed(1);
    }
    }finally{gpuTiming.end();}
    animation=requestAnimationFrame(render);
  }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;gpuTiming.reset();renderProfile.reset();cancelAnimationFrame(animation);document.body.classList.remove('webgl-ready');document.body.classList.add('scene-fallback');canvas.style.opacity='0';canvas.dataset.scene='fallback';dispatchEvent(new Event('tem:scene-failed'));navigation.fallback();});
  canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;warmup.reset();publishGraphicsEvidence();gpuTiming.restore();renderProfile.restore();clock.reset();pacer.reset();budget.reset();telemetry.reset();atmosphere.invalidate();reflection.invalidate();renderer.shadowMap.needsUpdate=true;restoreRadiance=true;announced=false;canvas.style.opacity='1';document.body.classList.add('webgl-ready');document.body.classList.remove('scene-fallback');navigation.restore();if(pipelineReady&&!document.hidden)animation=requestAnimationFrame(render);});
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(animation);if(pipelineReady&&!document.hidden&&!contextLost){clock.reset();pacer.reset();budget.reset();telemetry.reset();animation=requestAnimationFrame(render);}});
  document.body.classList.add('webgl-ready','world-anchored');
  // Link the composer's full-screen passes while the probe shader and models
  // load. Without this the nebula volume linked inside the first composed frame.
  const outputIndex=composer.passes.findIndex(pass=>pass instanceof OutputPass),fullscreen=fullscreenPassMaterials(composer.passes,{screenAfter:outputIndex});
  const particleLayer=composer.passes.find(pass=>pass.scene&&pass.scene!==scene&&pass.target?.isWebGLRenderTarget);
  const fullscreenPreparation=prepareFullscreenShaders({renderer,camera,target:postTarget,materials:fullscreen.intermediate,screenMaterials:fullscreen.screen,scenes:particleLayer?[{scene:particleLayer.scene,target:particleLayer.target}]:[]})
   .then(value=>({value}),error=>({error}));
  await prepareEnvironment();
  canvas.dataset.startupPhase='waiting-critical-models';
  const assetWaitStarted=performance.now();
  const assetPreparation=await waitForStartupAssets([starSea.loading,dreamObservatory.loading]);
  canvas.dataset.startupAssetWaitMs=(performance.now()-assetWaitStarted).toFixed(1);
  canvas.dataset.startupAssetBarrier=assetPreparation.timedOut?'timed-out-live-fallback':'settled';
  if(!contextLost){
    // Match the first real visibility/light state without advancing its clock.
    advanceWorld(0,0,0);lightRig.scan();lightRig.update(0);
    canvas.dataset.startupPhase='preparing-live-materials';
    const prepared=await prepareStartupShaders({renderer,scene,camera,target:sceneTarget,extraRoots:[starSea.root,dreamObservatory.root],reflection});
    canvas.dataset.startupShaderMs=prepared.milliseconds.toFixed(1);
    canvas.dataset.startupShaderObjects=String(prepared.objects);
    canvas.dataset.startupShaderVariants=String(prepared.variants);
    canvas.dataset.startupShaderPrograms=String(prepared.programs||0);
  }
  const fullscreenResult=await fullscreenPreparation;if(fullscreenResult.error)throw fullscreenResult.error;
  canvas.dataset.startupFullscreenPrograms=String(fullscreenResult.value.programs||0);canvas.dataset.startupFullscreenMs=fullscreenResult.value.milliseconds.toFixed(1);
  pipelineReady=true;readinessDeadline=assetWaitStarted+8000;
  setInterval(()=>{if(announced&&!document.hidden&&!contextLost)warmup.schedule();},1500);
  canvas.dataset.startupPhase='rendering-live-world';
  if(!contextLost&&!document.hidden)animation=requestAnimationFrame(render);
}

initialize().catch(error => {
  document.body.classList.remove('webgl-ready');canvas.style.display='none';canvas.dataset.scene='fallback';
  document.body.classList.add('scene-fallback');activeNavigation?.fallback();
  dispatchEvent(new Event('tem:scene-failed'));console.error('Cosmos scene could not start:',error);
});
