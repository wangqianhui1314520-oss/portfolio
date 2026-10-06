import * as THREE from 'three';
import { bevelGeometry } from './immersive-hardware.js?v=cinematic-v21.1';
import {createProceduralPlanetMaterial,createProceduralPlanetClouds} from './immersive-procedural-planet.js?v=cinematic-v21.1';

// Film flare visibility reads the actual interpolated Earth pose, so the
// changing map framing and its transition cannot disagree with the lens pass.
export const orbitalEarthOcclusion = { center: new THREE.Vector3(520, -1080, -1050), radius: 34 * 28, visible: true };
const earthPoses = {
  mapWide: { position: [-1180, -2050, -2460], scale: 42, home: true },
  mapNarrow: { position: [-510, -1340, -1570], scale: 25, home: true },
  // Keep the broad planet below the optical T instead of reading as a close
  // wall behind it. Only desktop framing moves; compact reading is unchanged.
  homeWide: { position: [7400, -14300, -13900], scale: 410, home: true },
  homeNarrow: { position: [360, -2350, -2850], scale: 54, home: true },
  travelWide: { position: [1280, -1490, -1630], scale: 45, home: false },
  travelNarrow: { position: [520, -1410, -1630], scale: 45, home: false }
};
export function orbitalEarthPose(frame, narrow = false) {
  const map = frame.step === 'map' || frame.step === 'boot';
  const home = map || frame.step === 'captain' || frame.step === 'bridge' && (!frame.opening || frame.introFrame?.time > 9);
  return earthPoses[(map ? 'map' : home ? 'home' : 'travel') + (narrow ? 'Narrow' : 'Wide')];
}

// The planetary terrain, weather and night-side light are generated in 3D.
export function createOrbitalWorld({ scene, renderer, canvas, time, compact }) {
  const radius = 34;
  const sunlight = new THREE.Vector3(.48, .19, -.84).normalize();
  const group = new THREE.Group();
  group.position.set(520,-1080,-1050);group.scale.setScalar(28);
  scene.add(group);

  const vertex = `varying vec3 vNormal,vWorld;varying vec2 vUv;
    void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);
      vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;
      gl_Position=projectionMatrix*viewMatrix*world;}`;
  const surface = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64),
    createProceduralPlanetMaterial({time,seed:23,sunDirection:sunlight.toArray()}));
  canvas.dataset.planet='procedural-terrain-live-volumetric-weather';
  surface.rotation.set(.55, .20, -.19);
  group.add(surface);

  const clouds=createProceduralPlanetClouds({radius,time,seed:23,sunDirection:sunlight.toArray(),compact});
  clouds.rotation.copy(surface.rotation);group.add(clouds);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(radius + .52, 128, 80), new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sunlight } }, vertexShader: vertex,
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    fragmentShader: `uniform vec3 uSun;varying vec3 vNormal,vWorld;
      void main(){vec3 n=normalize(vNormal),eye=normalize(cameraPosition-vWorld);
        float edge=pow(1.-abs(dot(n,eye)),6.);
        float day=smoothstep(-.24,.48,dot(n,uSun));
        gl_FragColor=vec4(.12,.40,.78,edge*day*.40);}`
  }));
  group.add(atmosphere);
  // Different windows look onto separate distant worlds in the shared 3D panorama.
  // The same continuous 3D material field is reused; nothing follows the camera.
  const panoramaWorlds=[];
  for(const [i,p] of [[1,[-1370,-1420,-760]],[2,[-780,-1450,1380]],[3,[1440,-1390,820]]]){
    const g=new THREE.Group();g.position.fromArray(p);g.position.multiplyScalar(1.85);g.position.y-=270;g.scale.setScalar(46);scene.add(g);
    const land=surface.clone(),vapor=createProceduralPlanetClouds({radius,time,seed:23,sunDirection:sunlight.toArray(),compact}),air=atmosphere.clone();g.add(land,vapor,air);
    land.rotation.set(.4,i*1.5,-.16);vapor.rotation.copy(land.rotation);panoramaWorlds.push({g,land,vapor,i});
  }

  const metal = new THREE.MeshStandardMaterial({ color: 0x425767, metalness: .65, roughness: .43 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0b1828, metalness: .7, roughness: .45 });
  const cyan = new THREE.MeshBasicMaterial({ color: new THREE.Color(.12, 1.55, 2.0), toneMapped: false });
  const magenta = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.55, .09, .56), toneMapped: false });
  const white = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.55, 1.7), toneMapped: false });
  // The orbital structure has real depth; the planet occludes its far side.
  const orbital = new THREE.Group();
  orbital.rotation.set(.37, .20, -.30);orbital.visible=true;
  group.add(orbital);
  orbital.add(new THREE.Mesh(new THREE.TorusGeometry(42, .095, 6, 224), metal));
  const rail = new THREE.LineBasicMaterial({ color: 0x629fb7, transparent: true, opacity: .28 });
  const railPoints = Array.from({ length: 257 }, (_, i) => new THREE.Vector3(Math.cos(i / 256 * Math.PI * 2) * 43, Math.sin(i / 256 * Math.PI * 2) * 43, 0));
  orbital.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(railPoints), rail));
  const ringModules=new THREE.InstancedMesh(bevelGeometry(.46,.26,.70,.045,.012),metal,64),ringWindows=new THREE.InstancedMesh(new THREE.BoxGeometry(.18,.013,.72),white,64),ringPose=new THREE.Object3D();orbital.add(ringModules,ringWindows);
  for(let i=0;i<64;i++){const a=i/64*Math.PI*2;ringPose.position.set(Math.cos(a)*42,Math.sin(a)*42,0);ringPose.rotation.set(0,0,a);ringPose.updateMatrix();ringModules.setMatrixAt(i,ringPose.matrix);ringPose.position.z=.04;ringPose.updateMatrix();ringWindows.setMatrixAt(i,ringPose.matrix);}
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2;
    const dock = new THREE.Group();
    dock.position.set(Math.cos(angle) * 42, Math.sin(angle) * 42, 0);
    dock.rotation.z = angle;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, .45, .60), darkMetal);
    dock.add(body);
    const light = new THREE.Mesh(new THREE.BoxGeometry(.72, .08, .64), i % 3 === 0 ? magenta : cyan);
    light.position.y = -.24; dock.add(light);
    orbital.add(dock);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(42.18, .038, 4, 28, .23), i % 3 === 0 ? magenta : cyan);
    arc.rotation.z = angle + .18; orbital.add(arc);
  }
  const orbitalBeacon = new THREE.Mesh(new THREE.SphereGeometry(.14, 8, 8), white);
  orbital.add(orbitalBeacon);

  // A close relay provides a human scale against the much larger planet.
  const relay = new THREE.Group();
  relay.position.set(-42, 16, -116);
  relay.rotation.set(.55, -.35, -.32);
  // Legacy relay is retained for compatibility; the new dockyard carries the connection.
  relay.visible=false;
  const rotor = new THREE.Group(); relay.add(rotor);
  rotor.add(new THREE.Mesh(new THREE.TorusGeometry(5.8, .24, 8, 96), metal));
  rotor.add(new THREE.Mesh(new THREE.TorusGeometry(6.05, .055, 5, 96), cyan));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.65, .84, 2.4, 8), metal);
  hub.rotation.x = Math.PI / 2; relay.add(hub);
  const core = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 12), cyan);
  core.position.z = 1.27; relay.add(core);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(5.25, .20, .18), metal);
    spoke.position.set(Math.cos(a) * 3, Math.sin(a) * 3, 0); spoke.rotation.z = a; rotor.add(spoke);
    const module = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.5, .55), darkMetal);
    module.position.set(Math.cos(a) * 5.8, Math.sin(a) * 5.8, 0); module.rotation.z = a; rotor.add(module);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(.09, 1.20, .58), i % 2 ? magenta : cyan);
    bar.position.copy(module.position); bar.rotation.z = a; rotor.add(bar);
  }
  for (const side of [-1, 1]) {
    const panel = new THREE.Group(); panel.position.set(side * 9.2, 0, -.22);
    panel.add(new THREE.Mesh(new THREE.BoxGeometry(4.5, 3, .1), darkMetal));
    const traces = [];
    for (let i = 0; i < 7; i++) traces.push(-2.12 + i * .7, -1.4, .065, -2.12 + i * .7, 1.4, .065);
    for (let i = 0; i < 5; i++) traces.push(-2.13, -1.4 + i * .7, .065, 2.13, -1.4 + i * .7, .065);
    const grid = new THREE.BufferGeometry(); grid.setAttribute('position', new THREE.Float32BufferAttribute(traces, 3));
    panel.add(new THREE.LineSegments(grid, new THREE.LineBasicMaterial({ color: 0x467ca4, transparent: true, opacity: .6 })));
    relay.add(panel);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(6.5, .1, .1), metal);
    arm.position.x = side * 4; relay.add(arm);
  }

  const holo = new THREE.Group(); holo.position.copy(relay.position); holo.rotation.copy(relay.rotation); scene.add(holo);
  const holoMaterial = new THREE.LineBasicMaterial({ color: 0x6ad9ed, transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let ring = 0; ring < 2; ring++) {
    const points = [];
    for (let i = 0; i <= 100; i++) {
      const a = i / 100 * Math.PI * (ring ? .62 : 1.18) + (ring ? 3.15 : .12);
      points.push(new THREE.Vector3(Math.cos(a) * (7.15 + ring * .6), Math.sin(a) * (7.15 + ring * .6), 0));
    }
    holo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), holoMaterial));
  }

  const overlay = document.createElement('div');
  overlay.className = 'orbital-overlay'; overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `<div class="orbital-label planet-label"><span class="orbital-kicker">SOL SYSTEM / 03</span><strong>TERRA<span>地球</span></strong><div class="orbital-line"></div><small>ATMOSPHERE DETECTED</small><span class="orbital-coordinate">23° 26′ / BLUE MARBLE</span></div>
    <div class="orbital-label relay-label"><span class="orbital-kicker"><i></i> ORBITAL RELAY / 01</span><strong>NEURAL LINK</strong><small>接続中 <span>● ● ●</span></small></div>
    <div class="orbital-horizon"><span>◈ &nbsp; DEEP SPACE NETWORK</span><b>LINK ESTABLISHED</b><span class="orbital-bars">▏▎▍▌▋▊</span></div>`;
  document.body.append(overlay);
  const planetLabel = overlay.querySelector('.planet-label');
  const relayLabel = overlay.querySelector('.relay-label');
  const projected = new THREE.Vector3();
  canvas.dataset.orbital = 'relay-online';

  return {
    update(camera, presence,dt=.016,frame={}) {
      const t = time.value;
      surface.rotation.y = .20 + t * .00035;
      clouds.rotation.copy(surface.rotation);
      orbital.rotation.z = -.30 + t * .006;
      orbitalBeacon.position.set(Math.cos(t * .07) * 42.18, Math.sin(t * .07) * 42.18, .12);
      rotor.rotation.z = t * .035;
      relay.position.y = 16 + Math.sin(t * .14) * .25;
      relay.rotation.z = -.32 + Math.sin(t * .08) * .025;
      holo.rotation.copy(relay.rotation); holo.rotation.z -= t * .024;
      holo.position.copy(relay.position);
      // Reframe the world on narrow screens without putting UI over the title.
      const archive=document.body.dataset.step==='captain';
      const pose=orbitalEarthPose(frame,compact()),homeView=pose.home,atlasView=frame.step==='map'||frame.step==='boot';
      group.position.x = THREE.MathUtils.damp(group.position.x,pose.position[0],2.4,dt);
      group.position.y = THREE.MathUtils.damp(group.position.y,pose.position[1],2.4,dt);
      group.position.z = THREE.MathUtils.damp(group.position.z,pose.position[2],2.4,dt);
      group.scale.setScalar(THREE.MathUtils.damp(group.scale.x,pose.scale,2.4,dt));
      orbital.visible=Boolean(document.body.dataset.sector)&&!archive;
      group.visible = !document.body.dataset.sector || document.body.dataset.step==='travel';relay.visible=false;holo.visible=false;
      orbitalEarthOcclusion.center.copy(group.position);orbitalEarthOcclusion.radius=radius*group.scale.x;orbitalEarthOcclusion.visible=group.visible;
      panoramaWorlds.forEach(({g,land,vapor,i})=>{g.visible=homeView&&!atlasView;land.rotation.y=i*1.5+t*.00020;vapor.rotation.copy(land.rotation);});
      overlay.style.opacity = String(presence);
      overlay.hidden = presence < .01;
      if (presence > .01) {
        projected.set(-55, 16, -70).project(camera);
        planetLabel.style.transform = `translate(${(projected.x * .5 + .5) * innerWidth}px,${(-projected.y * .5 + .5) * innerHeight}px)`;
        projected.copy(relay.position).add(new THREE.Vector3(0, -10, 0)).project(camera);
        relayLabel.style.transform = `translate(${(projected.x * .5 + .5) * innerWidth}px,${(-projected.y * .5 + .5) * innerHeight}px)`;
      }
    }
  };
}
