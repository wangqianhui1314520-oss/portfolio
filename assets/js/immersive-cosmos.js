import * as THREE from 'three';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/OutputPass.js';
import { createOrbitalWorld } from './immersive-planet.js?v=2';
import { createShipCockpit } from './immersive-cockpit.js?v=1';

const canvas = document.getElementById('space');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const plateURL = new URL('../images/cosmos-nebula-v1.png', import.meta.url).href;

function randomSource(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function cloudTexture() {
  const random = randomSource(8317), size = 256;
  const data = new Uint8Array(size * size * 4);
  const layers = [8, 16, 32, 64].map(n => ({ n, values: Float32Array.from({ length: n * n }, random) }));
  function sample({ n, values }, u, v) {
    const x = u * n, y = v * n, ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy; fx *= fx * (3 - 2 * fx); fy *= fy * (3 - 2 * fy);
    const a = values[(iy % n) * n + ix % n], b = values[(iy % n) * n + (ix + 1) % n];
    const c = values[((iy + 1) % n) * n + ix % n], d = values[((iy + 1) % n) * n + (ix + 1) % n];
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let value = 0, weight = .5333;
    for (const layer of layers) { value += sample(layer, x / size, y / size) * weight; weight *= .5; }
    const i = (y * size + x) * 4;
    data[i] = Math.round(value * 255); data[i + 1] = Math.round(sample(layers[1], x / size, y / size) * 255);
    data[i + 2] = data[i]; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true;
  return texture;
}

function initialize() {
  const compact = () => innerWidth < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x01030a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .98;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, .1, 1000);
  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .48, .78, .65);
  composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(new OutputPass());

  const time = { value: 0 }, flight = { value: 0 }, velocity = { value: 0 }, pixelHeight = { value: innerHeight };
  const pointerWorld = { value: new THREE.Vector3(1000, 1000, -40) };
  const rippleOrigin = { value: new THREE.Vector3() }, rippleStart = { value: -100 };
  const pulse = { value: 0 };
  const noise = { value: cloudTexture() };
  const planeVertex = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';

  // The image is only the most distant environment. Every nearer layer has its own parallax.
  const skyUniforms = {
    uPlate: { value: noise.value }, uReady: { value: 0 }, uAspect: { value: innerWidth / innerHeight },
    uImageAspect: { value: 16 / 9 }, uTime: time, uFlight: flight, uPointer: { value: new THREE.Vector2() }
  };
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: skyUniforms, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}',
    fragmentShader: `varying vec2 vUv;uniform sampler2D uPlate;uniform float uReady,uAspect,uImageAspect,uTime,uFlight;uniform vec2 uPointer;
      void main(){vec2 cover=vec2(min(1.,uAspect/uImageAspect),min(1.,uImageAspect/uAspect));
      vec2 uv=(vUv-.5)*cover*.94+.5;uv+=uPointer*vec2(.010,.006)+vec2(sin(uTime*.025)*.002,uFlight*.00018);
      vec3 fallback=mix(vec3(.002,.004,.015),vec3(.012,.024,.05),exp(-length((vUv-vec2(.3,.5))*2.)));
      vec3 nebula=texture2D(uPlate,uv).rgb*.82;gl_FragColor=vec4(mix(fallback,nebula,uReady),1.);}`
  }));
  sky.frustumCulled = false; sky.renderOrder = -1000; scene.add(sky);
  canvas.dataset.plate = 'loading';
  new THREE.TextureLoader().load(plateURL, texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    skyUniforms.uPlate.value = texture; skyUniforms.uImageAspect.value = texture.image.width / texture.image.height;
    skyUniforms.uReady.value = 1; canvas.dataset.plate = 'ready';
  }, undefined, () => { canvas.dataset.plate = 'fallback'; });

  const pointFragment = `varying vec3 vColor;varying float vAlpha,vBlur;
    void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;
    float glow=exp(-r*r*mix(13.,3.2,vBlur))+.10*exp(-r*r*2.8);
    gl_FragColor=vec4(vColor,glow*(1.-smoothstep(.65,1.,r))*vAlpha);}`;

  function particles(kind, count, seed) {
    const random = randomSource(seed), positions = [], colors = [], sizes = [], phases = [];
    const gaussian = () => (random() + random() + random() + random() - 2) * .75;
    for (let i = 0; i < count; i++) {
      if (kind === 'stars') {
        positions.push((random() - .5) * 430, (random() - .5) * 250, -45 - random() * 390);
        sizes.push(.09 + Math.pow(random(), 4) * .8);
      } else if (kind === 'stream') {
        positions.push((random() - .5) * 220, gaussian() * 2.9, gaussian() * 6.5);
        sizes.push(.025 + Math.pow(random(), 3) * .19);
      } else {
        positions.push((random() - .5) * 44, (random() - .5) * 29, random() * 76);
        sizes.push(i < 20 ? .09 + random() * .12 : .012 + random() * .045);
      }
      const color = new THREE.Color();
      if (i % 13 === 0) color.setRGB(.60, .38, .86);
      else if (i % 7 === 0) color.setRGB(.32, .68, .92);
      else color.setRGB(.67 + random() * .22, .78 + random() * .15, 1.);
      colors.push(color.r, color.g, color.b); phases.push(random() * Math.PI * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    const behavior = kind === 'stars' ? `
      p.x+=sin(uTime*.035+aPhase)*.12;alpha=.38+.15*sin(uTime*.19+aPhase);` : kind === 'stream' ? `
      p.x=mod(position.x+110.+uTime*.60+uFlight*.3,220.)-110.;
      p.y=position.y+p.x*.16+sin(p.x*.029)*4.6-3.;p.z=position.z-68.+cos(p.x*.028)*13.;
      vec2 delta=p.xy-uPointer.xy;float influence=exp(-dot(delta,delta)*.045);
      p.xy+=delta*influence*.13;
      float age=uTime-uRippleStart;float distance=length(p.xy-uRipple.xy);
      p.xy+=normalize(p.xy-uRipple.xy+vec2(.001))*sin(distance*.9-age*3.)*exp(-pow((distance-age*6.)*.32,2.))*exp(-max(age,0.)*.6)*.55;
      alpha=.46*(.8+.2*sin(aPhase+uTime*.25));` : `
      p.z=mod(position.z+uTime*.5+uFlight*.5,76.)-62.;p.x+=sin(aPhase+uTime*.10)*.22;
      p.y+=cos(aPhase+uTime*.08)*.18;blur=step(.085,aSize);
      alpha=mix(.36,.065,blur);`;
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: time, uFlight: flight, uPixelHeight: pixelHeight, uPointer: pointerWorld, uRipple: rippleOrigin, uRippleStart: rippleStart },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime,uFlight,uPixelHeight,uRippleStart;uniform vec3 uPointer,uRipple;
        attribute vec3 aColor;attribute float aSize,aPhase;varying vec3 vColor;varying float vAlpha,vBlur;
        void main(){vec3 p=position;float alpha=1.,blur=0.;${behavior}
        vec4 mv=modelViewMatrix*vec4(p,1.);vColor=aColor;vBlur=blur;
        vAlpha=alpha*smoothstep(1.5,7.,-mv.z)*(1.-smoothstep(410.,490.,-mv.z));
        gl_PointSize=clamp(aSize*uPixelHeight/max(1.,-mv.z),.7,mix(5.,19.,blur));
        gl_Position=projectionMatrix*mv;}`,
      fragmentShader: pointFragment
    });
    const points = new THREE.Points(geometry, material); points.frustumCulled = false; scene.add(points);
    return points;
  }
  const stars = particles('stars', compact() ? 1900 : 3600, 381);
  const stream = particles('stream', compact() ? 2200 : 4800, 977);
  particles('near', compact() ? 240 : 420, 581);
  canvas.dataset.particles = String(compact() ? 4340 : 8820);

  // Sparse foreground trails make a scroll read as travelling through the field.
  const trailRandom = randomSource(326), trailPositions = [], trailEnds = [];
  for (let i = 0; i < 44; i++) {
    const angle = trailRandom() * Math.PI * 2, radius = 8 + trailRandom() * 24;
    const p = [Math.cos(angle) * radius, Math.sin(angle) * radius * .7, trailRandom() * 95];
    trailPositions.push(...p, ...p); trailEnds.push(0, 1);
  }
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trailPositions, 3));
  trailGeometry.setAttribute('aEnd', new THREE.Float32BufferAttribute(trailEnds, 1));
  const trails = new THREE.LineSegments(trailGeometry, new THREE.ShaderMaterial({
    uniforms: { uTime: time, uFlight: flight, uVelocity: velocity }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime,uFlight,uVelocity;attribute float aEnd;varying float vAlpha;
      void main(){vec3 p=position;p.z=mod(p.z+uTime*.7+uFlight*.8,95.)-77.;p.z-=aEnd*(.16+uVelocity*1.3);
      vec4 mv=modelViewMatrix*vec4(p,1.);vAlpha=(.08+uVelocity*.11)*smoothstep(2.,12.,-mv.z)*(1.-aEnd*.8);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: 'varying float vAlpha;void main(){gl_FragColor=vec4(.32,.64,.95,vAlpha);}'
  }));
  trails.frustumCulled = false; scene.add(trails);

  const orbitalWorld = createOrbitalWorld({ scene, renderer, canvas, time, compact });
  const shipCockpit = createShipCockpit({ camera });

  for (const [x,y,z,w,h,opacity,color,seed] of [
    [-22,8,-98,115,55,.045,0x376bad,1.7], [24,-9,-49,88,33,.038,0x605395,4.2], [-9,-10,-16,64,22,.024,0x4c849b,9.1]
  ]) {
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.ShaderMaterial({
      uniforms:{uNoise:noise,uTime:time,uOpacity:{value:opacity},uColor:{value:new THREE.Color(color)},uSeed:{value:seed}},
      vertexShader:planeVertex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      fragmentShader:`varying vec2 vUv;uniform sampler2D uNoise;uniform float uTime,uOpacity,uSeed;uniform vec3 uColor;
        void main(){vec2 q=vUv*vec2(.7,.24)+vec2(uTime*.0008+uSeed,-uTime*.0004);
        float cloud=texture2D(uNoise,q).r;float mask=exp(-dot((vUv-.5)*vec2(2.,3.),(vUv-.5)*vec2(2.,3.))*2.);
        gl_FragColor=vec4(uColor,smoothstep(.30,.72,cloud)*mask*uOpacity);}`
    }));
    veil.position.set(x,y,z);veil.rotation.z=-.16;scene.add(veil);
  }

  // Only distant broken orbital arcs remain as a faint reference to the original sci-fi structure.
  const orbitGroup = new THREE.Group(); orbitGroup.position.set(29, 12, -160); orbitGroup.rotation.set(.34,-.15,-.35); scene.add(orbitGroup);
  for (let i=0;i<2;i++) {
    const curve=new THREE.EllipseCurve(0,0,30+i*4,18+i*2,.14,Math.PI*1.25,false,0);
    const geometry=new THREE.BufferGeometry().setFromPoints(curve.getPoints(140).map(p=>new THREE.Vector3(p.x,p.y,0)));
    orbitGroup.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:i?0x806dc8:0x68bddd,transparent:true,opacity:i?.07:.1,depthWrite:false,blending:THREE.AdditiveBlending})));
  }

  const emblem = new THREE.Group(); scene.add(emblem);
  const shape = new THREE.Shape(); shape.moveTo(0,1.85); shape.lineTo(-1.62,-1.16); shape.lineTo(1.62,-1.16); shape.closePath();
  const hole = new THREE.Path(); hole.moveTo(0,1.17); hole.lineTo(1.03,-.78); hole.lineTo(-1.03,-.78); hole.closePath(); shape.holes.push(hole);
  const emblemGeometry=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSize:.035,bevelThickness:.04,bevelSegments:3});
  const emblemMaterial=new THREE.MeshPhysicalMaterial({color:0x243c62,emissive:0x153a66,emissiveIntensity:.6,metalness:.65,roughness:.24,clearcoat:1,transparent:true,opacity:.82});
  emblem.add(new THREE.Mesh(emblemGeometry,emblemMaterial));
  const emblemEdges=new THREE.LineSegments(new THREE.EdgesGeometry(emblemGeometry,30),new THREE.LineBasicMaterial({color:0x8be7ff,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));emblem.add(emblemEdges);
  scene.add(new THREE.AmbientLight(0x769fc7,.65));
  const key=new THREE.PointLight(0x58cbff,70,42,2);key.position.set(-7,10,8);scene.add(key);
  const rim=new THREE.PointLight(0x9268ed,55,36,2);rim.position.set(7,3,-8);scene.add(rim);

  const pointer={x:0,y:0,tx:0,ty:0,active:false};
  const shots=[new THREE.Vector3(0,.5,14),new THREE.Vector3(2.3,1.4,8),new THREE.Vector3(-2.8,2.4,1),new THREE.Vector3(1.8,.8,-5),new THREE.Vector3(.3,1.4,-10)];
  const currentShot=new THREE.Vector3(),lookAt=new THREE.Vector3();
  let offsets=[],heroEnd=innerHeight,scrollPosition=scrollY,lastScroll=scrollY,quality=1,contextLost=false;
  let frame=0,lastTime=0,elapsed=0,animation=0,batchStart=0,slowBatches=0;
  function measure(){offsets=[...document.querySelectorAll('.scene')].map(el=>el.offsetTop);heroEnd=document.querySelector('#archive').offsetTop;}
  function resize(){
    const dpr=Math.min(devicePixelRatio||1,compact()?1.15:1.4)*quality;
    renderer.setPixelRatio(dpr);renderer.setSize(innerWidth,innerHeight);
    composer.setPixelRatio(dpr);composer.setSize(innerWidth,innerHeight);
    bloom.setSize(Math.round(innerWidth*dpr*.6),Math.round(innerHeight*dpr*.6));
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();pixelHeight.value=innerHeight*dpr;
    skyUniforms.uAspect.value=camera.aspect;measure();
  }
  addEventListener('resize',resize,{passive:true});addEventListener('load',measure,{once:true});
  document.fonts?.ready.then(measure);
  addEventListener('pointermove',e=>{pointer.tx=e.clientX/innerWidth-.5;pointer.ty=e.clientY/innerHeight-.5;pointer.active=true;},{passive:true});
  addEventListener('pointerout',e=>{if(!e.relatedTarget){pointer.tx=0;pointer.ty=0;pointer.active=false;}});
  addEventListener('pointerdown',e=>{if(motionPreference.matches||e.target.closest('a,button,.signal-card,.modal'))return;rippleStart.value=elapsed;rippleOrigin.value.copy(pointerWorld.value);},{passive:true});
  addEventListener('tem:ping',event=>{
    pulse.value=1;
    rippleStart.value=elapsed;
    rippleOrigin.value.copy(pointerWorld.value.x>900?new THREE.Vector3(0,0,-55):pointerWorld.value);
    canvas.dataset.lastPing=event.detail?.source||'SYSTEM';
  },{passive:true});
  resize();

  function render(ms){
    if(contextLost||document.hidden)return;
    const dt=lastTime?Math.min((ms-lastTime)*.001,.12):.016;lastTime=ms;
    const motion=motionPreference.matches?0:1;if(motion)elapsed+=dt;time.value=elapsed;
    pulse.value*=Math.exp(-dt*2.8);
    const ease=1-Math.exp(-dt*3.4);pointer.x+=(pointer.tx-pointer.x)*ease;pointer.y+=(pointer.ty-pointer.y)*ease;
    scrollPosition=motion?THREE.MathUtils.lerp(scrollPosition,scrollY,1-Math.exp(-dt*5)):scrollY;
    const scrollSpeed=Math.min(2.5,Math.abs(scrollY-lastScroll)/Math.max(dt,1/120)/1600);lastScroll=scrollY;
    velocity.value+=(scrollSpeed-velocity.value)*(1-Math.exp(-dt*3));velocity.value*=motion;
    let i=0;while(i<offsets.length-1&&scrollPosition>=offsets[i+1])i++;
    const j=Math.min(i+1,shots.length-1),end=j>i?offsets[j]:document.documentElement.scrollHeight;
    let fraction=THREE.MathUtils.clamp((scrollPosition-offsets[i])/Math.max(1,end-offsets[i]),0,1);fraction=fraction*fraction*(3-2*fraction);
    currentShot.copy(shots[i]).lerp(shots[j],fraction);flight.value=14-currentShot.z;
    camera.position.copy(currentShot);
    camera.position.x+=motion*(pointer.x*.95+Math.sin(elapsed*.055)*.10);
    camera.position.y+=motion*(-pointer.y*.4+Math.sin(elapsed*.08)*.06);
    camera.position.z+=motion*.9*Math.exp(-elapsed*.4);
    lookAt.set(currentShot.x*.25,.65,-85);camera.lookAt(lookAt);
    skyUniforms.uPointer.value.set(pointer.x*motion,pointer.y*motion);
    if(pointer.active&&motion){const range=(camera.position.z+55)*Math.tan(THREE.MathUtils.degToRad(27));pointerWorld.value.set(pointer.x*range*2*camera.aspect,-pointer.y*range*2,-55);}
    else pointerWorld.value.set(1000,1000,-55);
    const presence=1-THREE.MathUtils.smoothstep(scrollPosition,heroEnd*.08,heroEnd*.85);
    emblem.visible=presence>.001;emblem.scale.setScalar((compact()?.8:1.05)*Math.max(.001,presence));
    emblem.position.set(.1,4.1,-6-(1-presence)*8);emblem.rotation.set(.06,Math.sin(elapsed*.16)*.23+pointer.x*.08*motion,-.045);
    stars.rotation.y=Math.sin(elapsed*.012)*.012;stream.rotation.z=-.035+Math.sin(elapsed*.028)*.012;
    orbitalWorld.update(camera,presence);orbitGroup.rotation.z=-.35+elapsed*.002;
    shipCockpit.update(pointer,velocity.value,elapsed);
    canvas.dataset.pulse=String(Math.round(pulse.value*100));
    composer.render();
    if(frame++%60===0){
      canvas.dataset.scene='open-cosmos';canvas.dataset.renderFrame=String(frame);
      if(batchStart){const fps=60000/(ms-batchStart);canvas.dataset.frameRate=String(Math.round(fps));slowBatches=fps<27?slowBatches+1:0;
        if(slowBatches>=2&&quality>.68){quality=Math.max(.68,quality*.85);bloom.enabled=false;resize();slowBatches=0;}}
      batchStart=ms;
    }
    animation=requestAnimationFrame(render);
  }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;cancelAnimationFrame(animation);document.body.classList.remove('webgl-ready');canvas.style.opacity='0';canvas.dataset.scene='fallback';});
  canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;lastTime=0;canvas.style.opacity='1';document.body.classList.add('webgl-ready');if(!document.hidden)animation=requestAnimationFrame(render);});
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(animation);if(!document.hidden&&!contextLost){lastTime=0;batchStart=0;slowBatches=0;animation=requestAnimationFrame(render);}});
  document.body.classList.add('webgl-ready');animation=requestAnimationFrame(render);
}

try {initialize();} catch(error) {
  document.body.classList.remove('webgl-ready');canvas.style.display='none';canvas.dataset.scene='fallback';
  console.error('Cosmos scene could not start:',error);
}
