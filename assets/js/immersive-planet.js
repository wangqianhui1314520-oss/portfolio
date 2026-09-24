import * as THREE from 'three';

// Real Earth imagery is kept locally. See assets/images/planet/ATTRIBUTION.md.
export function createOrbitalWorld({ scene, renderer, canvas, time, compact }) {
  const radius = 34;
  const sunlight = new THREE.Vector3(-.82, .50, .34).normalize();
  const group = new THREE.Group();
  group.position.set(-32, -26, -88);
  scene.add(group);

  const fallback = new THREE.DataTexture(new Uint8Array([12, 24, 42, 255]), 1, 1);
  fallback.needsUpdate = true;
  const empty = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  empty.needsUpdate = true;
  const maps = { day: { value: fallback }, night: { value: empty }, clouds: { value: empty } };
  const loader = new THREE.TextureLoader();
  let loaded = 0;
  canvas.dataset.planet = 'loading';
  for (const [name, filename] of [['day', 'daymap'], ['night', 'nightmap'], ['clouds', 'clouds']]) {
    loader.load(new URL(`../images/planet/earth-${filename}.jpg`, import.meta.url).href, texture => {
      texture.colorSpace = name === 'clouds' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      maps[name].value = texture;
      loaded++;
      if (loaded === 3) canvas.dataset.planet = 'earth-textures-ready';
    }, undefined, () => { canvas.dataset.planet = 'texture-fallback'; });
  }
  const vertex = `varying vec3 vNormal,vWorld;varying vec2 vUv;
    void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);
      vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;
      gl_Position=projectionMatrix*viewMatrix*world;}`;
  const cloudDrift = { value: 0 };
  const uniforms = { uDay: maps.day, uNight: maps.night, uClouds: maps.clouds,
    uSun: { value: sunlight }, uCloudDrift: cloudDrift };
  const surface = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 80), new THREE.ShaderMaterial({
    uniforms, vertexShader: vertex,
    fragmentShader: `uniform sampler2D uDay,uNight,uClouds;uniform vec3 uSun;uniform float uCloudDrift;
      varying vec3 vNormal,vWorld;varying vec2 vUv;
      void main(){
        vec3 n=normalize(vNormal),eye=normalize(cameraPosition-vWorld);
        float ndl=dot(n,uSun),daylight=max(ndl,0.);
        vec3 albedo=texture2D(uDay,vUv).rgb;
        albedo=mix(vec3(dot(albedo,vec3(.2126,.7152,.0722))),albedo,.88);
        float ocean=smoothstep(.006,.035,albedo.b-max(albedo.r,albedo.g));
        float shadow=texture2D(uClouds,vUv+vec2(uCloudDrift-.0018,.001)).r;
        shadow=smoothstep(.12,.8,shadow)*.37;
        vec3 color=albedo*(.015+daylight*1.50)*(1.-shadow);
        vec3 halfway=normalize(uSun+eye);
        float glint=pow(max(dot(n,halfway),0.),65.)*ocean*daylight;
        color+=vec3(.65,.79,.88)*glint*.58;
        float night=1.-smoothstep(-.20,.10,ndl);
        vec3 cities=texture2D(uNight,vUv).rgb;
        color+=cities*night*2.1*(1.-shadow*.85);
        float fresnel=pow(1.-max(dot(n,eye),0.),5.);
        float sunward=smoothstep(-.22,.55,ndl);
        color+=vec3(.055,.24,.52)*fresnel*sunward*.72;
        gl_FragColor=vec4(color,1.);
      }`
  }));
  surface.rotation.set(.08, -1.50, -.14);
  group.add(surface);

  // A separate, slowly drifting shell gives clouds height and their own terminator.
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(radius + .12, 128, 80), new THREE.ShaderMaterial({
    uniforms, vertexShader: vertex, transparent: true, depthWrite: false,
    fragmentShader: `uniform sampler2D uClouds;uniform vec3 uSun;uniform float uCloudDrift;
      varying vec3 vNormal,vWorld;varying vec2 vUv;
      void main(){vec3 n=normalize(vNormal);float light=dot(n,uSun);
        float cloud=texture2D(uClouds,vUv+vec2(uCloudDrift,0.)).r;
        float density=smoothstep(.10,.89,cloud);
        vec3 day=vec3(.83,.90,1.)*(.025+max(light,0.)*1.32);
        vec3 twilight=vec3(.15,.24,.37)*exp(-pow(light*8.,2.))*.22;
        gl_FragColor=vec4(day+twilight,density*.92);}`
  }));
  clouds.rotation.copy(surface.rotation);
  group.add(clouds);
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

  const metal = new THREE.MeshStandardMaterial({ color: 0x425767, metalness: .65, roughness: .43 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0b1828, metalness: .7, roughness: .45 });
  const cyan = new THREE.MeshBasicMaterial({ color: new THREE.Color(.12, 1.55, 2.0), toneMapped: false });
  const magenta = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.55, .09, .56), toneMapped: false });
  const white = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.55, 1.7), toneMapped: false });
  const sun = new THREE.DirectionalLight(0xe3f0ff, 2.5);
  sun.position.copy(sunlight).multiplyScalar(150);
  scene.add(sun);

  // The orbital structure has real depth; the planet occludes its far side.
  const orbital = new THREE.Group();
  orbital.rotation.set(1.10, .20, -.30);
  group.add(orbital);
  orbital.add(new THREE.Mesh(new THREE.TorusGeometry(42, .095, 6, 224), metal));
  const rail = new THREE.LineBasicMaterial({ color: 0x629fb7, transparent: true, opacity: .28 });
  const railPoints = Array.from({ length: 257 }, (_, i) => new THREE.Vector3(Math.cos(i / 256 * Math.PI * 2) * 43, Math.sin(i / 256 * Math.PI * 2) * 43, 0));
  orbital.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(railPoints), rail));
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
  relay.position.set(30, 9, -65);
  relay.rotation.set(.55, -.35, -.32);
  scene.add(relay);
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
    update(camera, presence) {
      const t = time.value;
      surface.rotation.y = -1.5 + t * .007;
      clouds.rotation.copy(surface.rotation); cloudDrift.value = t * .000035;
      orbital.rotation.z = -.30 + t * .006;
      orbitalBeacon.position.set(Math.cos(t * .07) * 42.18, Math.sin(t * .07) * 42.18, .12);
      rotor.rotation.z = t * .035;
      relay.position.y = 9 + Math.sin(t * .14) * .25;
      relay.rotation.z = -.32 + Math.sin(t * .08) * .025;
      holo.rotation.copy(relay.rotation); holo.rotation.z -= t * .024;
      holo.position.copy(relay.position);
      // Reframe the world on narrow screens without putting UI over the title.
      group.position.x = compact() ? -22 : -32;
      group.position.y = compact() ? -25 : -26;
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
