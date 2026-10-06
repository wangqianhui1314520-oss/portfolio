import * as THREE from 'three';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/utils/BufferGeometryUtils.js';

// Everything lives in the atlas coordinate system. The open centre stays clear:
// close curved cabin edges, a remote relay, and an oblique, sparse orbital belt.
// Fixed hardware is merged into three materials; the rocks use one instanced draw.
export function createStarportWorld({ parent, compact, time, interaction }) {
  const isCompact = () => typeof compact === 'function' ? compact() : Boolean(compact ?? innerWidth < 700);
  const root = new THREE.Group(); root.name = 'Tem.atlas.open-starport-world'; parent.add(root);
  const phases = { uWorldTime: { value: 0 }, uWorldPower: { value: .24 }, uWorldCompact: { value: isCompact() ? 1 : 0 } };
  const farScale = { value: 1 }, farOffset = { value: new THREE.Vector3() };
  const materials = [
    new THREE.MeshPhysicalMaterial({ color: 0x697c87, metalness: .09, roughness: .38, clearcoat: .44, clearcoatRoughness: .28, envMapIntensity: .42 }),
    new THREE.MeshStandardMaterial({ color: 0x817363, metalness: .78, roughness: .34, envMapIntensity: .72 }),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(.64, .95, 1.10), toneMapped: false })
  ];
  for (const [index, material] of materials.entries()) {
    material.vertexColors = true;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, phases, { uWorldFarScale: farScale, uWorldFarOffset: farOffset });
      shader.vertexShader = `attribute float aWorldNear;varying float vWorldNear;uniform float uWorldFarScale;uniform vec3 uWorldFarOffset;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vWorldNear=aWorldNear;
        if(aWorldNear<.5)transformed=transformed*uWorldFarScale+uWorldFarOffset;`);
      shader.fragmentShader = `varying float vWorldNear;uniform float uWorldCompact,uWorldTime,uWorldPower;\n${shader.fragmentShader}`;
      shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if(uWorldCompact>.5&&vWorldNear>.5)discard;`);
      if (index === 2) shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float response=.70+uWorldPower*.32;
        diffuseColor.rgb*=response;`);
    };
    material.customProgramCacheKey = () => `tem-starport-world-${index}-v2`;
  }
  const buckets = materials.map(() => []), transform = new THREE.Object3D();
  function add(geometry, materialIndex, position = [0, 0, 0], rotation = [0, 0, 0], near = true, shade = [1, 1, 1]) {
    transform.position.fromArray(position); transform.rotation.fromArray(rotation); transform.scale.set(1, 1, 1); transform.updateMatrix();
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone(); g.applyMatrix4(transform.matrix);
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    g.setAttribute('aWorldNear', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(near ? 1 : 0), 1));
    const colors=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<colors.length;i+=3)colors.set(shade,i);g.setAttribute('color',new THREE.BufferAttribute(colors,3));
    buckets[materialIndex].push(g); geometry.dispose();
  }
  const v = a => new THREE.Vector3(...a);
  const curve = points => new THREE.CatmullRomCurve3(points.map(v), false, 'centripetal');
  // A flattened tube provides a closed, smooth, ceramic edge rather than a box.
  function rimGeometry(path, width, height, segments = 48, radial = 10, profile = () => 1) {
    const positions = [], indices = [], uv = [], up = new THREE.Vector3(0, 1, 0), normal = new THREE.Vector3(), side = new THREE.Vector3();
    for (let i = 0; i <= segments; i++) {
      const p = path.getPointAt(i / segments), tangent = path.getTangentAt(i / segments), taper=profile(i/segments);
      normal.copy(up).addScaledVector(tangent, -up.dot(tangent)).normalize(); side.crossVectors(tangent, normal).normalize();
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * Math.PI * 2, q = p.clone().addScaledVector(normal, Math.cos(a) * height*taper).addScaledVector(side, Math.sin(a) * width*taper);
        positions.push(q.x, q.y, q.z); uv.push(i / segments, j / radial);
        if (i < segments && j < radial) { const n = i * (radial + 1) + j; indices.push(n, n + 1, n + radial + 1, n + 1, n + radial + 2, n + radial + 1); }
      }
    }
    // Separate cap vertices keep the end normals perpendicular to the rim.
    for (const end of [0, segments]) {
      const source = end * (radial + 1), start = positions.length / 3;
      for(let j=0;j<=radial;j++){const at=(source+j)*3;positions.push(positions[at],positions[at+1],positions[at+2]);uv.push(.5+Math.sin(j/radial*Math.PI*2)*.5,.5+Math.cos(j/radial*Math.PI*2)*.5);}
      const centre = positions.length / 3, p = path.getPointAt(end / segments); positions.push(p.x, p.y, p.z); uv.push(.5, .5);
      for (let j = 0; j < radial; j++) { if (end === 0) indices.push(centre, start + j + 1, start + j); else indices.push(centre, start + j, start + j + 1); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
  }
  const edges = [
    [[-70, -11.8, -6], [-44, -10.2, 0], [-28, -8.95, 5], [-15, -11.6, 8]],
    [[16, -12.0, 9], [28, -9.15, 8], [43, -9.8, 4], [69, -12.0, -6]]
  ];
  edges.forEach((points, edge) => {
    // The broad shoulder comes in from outside the viewport and turns down
    // through its lower edge. A matching dark pressure shell carries it; the
    // slender inner tip tapers smoothly instead of ending as a floating rail.
    const profile=t=>.12+.88*(edge===0?1-THREE.MathUtils.smoothstep(t,.53,1):THREE.MathUtils.smoothstep(t,0,.47));
    const path = curve(points); add(rimGeometry(path, 1.43, .47, 64, 12,profile), 0);
    const shell=curve(points.map(p=>[p[0],p[1]-.54,p[2]+.09]));add(rimGeometry(shell,1.56,.46,64,12,profile),1,[0,0,0],[0,0,0],true,[.075,.13,.19]);
    const inset = curve(points.map(p => [p[0], p[1] - .11, p[2] + .74])); add(rimGeometry(inset, .051, .038, 64, 6,profile), 1);
    const light = curve(points.map(p => [p[0], p[1] + .25, p[2] - .60])); add(rimGeometry(light, .018, .019, 64, 5,profile), 2,[0,0,0],[0,0,0],true,[.70,.82,.90]);
    for (const at of [.24, .53, .78]) {
      const p = path.getPointAt(at), tangent = path.getTangentAt(at), yaw = Math.atan2(tangent.x, tangent.z);
      add(new THREE.BoxGeometry(.28, .62, .53), 1, [p.x, p.y - .45, p.z], [0, yaw, edge ? -.05 : .05],true,[.48,.52,.58]);
      add(new THREE.BoxGeometry(.044, .19, .54), 2, [p.x, p.y - .38, p.z + .035], [0, yaw, 0],true,[.64,.78,.88]);
    }
  });
  // The remote relay is deliberately much smaller than the port and occupies
  // one corner of the sky, giving a size reference without enclosing the scene.
  const relay = new THREE.Object3D(); relay.position.set(208, 37, -290); relay.rotation.set(.13, -.34, -.26); relay.scale.setScalar(.65);relay.updateMatrix();
  function relayPart(geometry, materialIndex, position = [0, 0, 0], rotation = [0, 0, 0]) {
    transform.position.fromArray(position); transform.rotation.fromArray(rotation); transform.updateMatrix(); geometry.applyMatrix4(transform.matrix).applyMatrix4(relay.matrix);
    add(geometry, materialIndex, [0, 0, 0], [0, 0, 0], false);
  }
  relayPart(new THREE.TorusGeometry(27, .25, 6, 88, Math.PI * 1.67), 0);
  relayPart(new THREE.TorusGeometry(26.55, .055, 5, 88, Math.PI * 1.67), 2, [0, 0, .18]);
  for (const a of [.18, .70, 1.35, 2.1, 2.85, 3.65, 4.7]) {
    const x = Math.cos(a) * 27, y = Math.sin(a) * 27;
    relayPart(new THREE.BoxGeometry(1.12, 2.6, 2.15), 0, [x, y, 0], [0, 0, a - Math.PI / 2]);
    relayPart(new THREE.BoxGeometry(.46, .09, 2.3), 2, [x, y, .04], [0, 0, a - Math.PI / 2]);
    relayPart(new THREE.BoxGeometry(.28, 3.1, 1.1), 1, [x * .968, y * .968, 0], [0, 0, a - Math.PI / 2]);
  }
  relayPart(new THREE.CylinderGeometry(.65, .85, 19, 8), 0, [29, -17, 0], [0, 0, -.28]);
  relayPart(new THREE.SphereGeometry(.31, 8, 6), 2, [31.6, -7.9, .6]);
  buckets.forEach((geometries, index) => {
    const geometry = mergeGeometries(geometries, false), mesh = new THREE.Mesh(geometry, materials[index]);
    mesh.name = `Tem.atlas.depth-hardware.${index}`; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.userData.visualOnly = true; root.add(mesh); geometries.forEach(g => g.dispose());
  });
  let seed = 12173; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const rockCount = isCompact() ? 18 : 46, rockGeometry = new THREE.IcosahedronGeometry(1, 1), rockPositions = rockGeometry.getAttribute('position');
  for (let i = 0; i < rockPositions.count; i++) { const x = rockPositions.getX(i), y = rockPositions.getY(i), z = rockPositions.getZ(i), rough = .86 + .20 * Math.sin(x * 7.9 + y * 11.3) * Math.cos(z * 8.7 - x * 4.2); rockPositions.setXYZ(i, x * rough, y * rough, z * rough); } rockGeometry.computeVertexNormals();
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x454a54, roughness: .94, metalness: .035 });
  rockMaterial.onBeforeCompile = shader => {
    shader.uniforms.uWorldTime = phases.uWorldTime;
    shader.vertexShader = `uniform float uWorldTime;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
      float a=uWorldTime*.006;mat2 turn=mat2(cos(a),-sin(a),sin(a),cos(a));transformed.xz=turn*transformed.xz;`);
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
      float na=uWorldTime*.006;mat2 normalTurn=mat2(cos(na),-sin(na),sin(na),cos(na));objectNormal.xz=normalTurn*objectNormal.xz;`);
  };
  rockMaterial.customProgramCacheKey = () => 'tem-starport-sparse-orbit-v1';
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCount); rocks.name = 'Tem.atlas.sparse-diagonal-rock-belt'; rocks.userData.visualOnly = true; rocks.frustumCulled = false; rocks.castShadow = false; root.add(rocks);
  const orbit = curve([[-135, -44, -105], [-65, -22, -110], [-4, -2, -180], [105, 35, -300], [240, 53, -460]]);
  for (let i = 0; i < rockCount; i++) {
    // Picked stations along the curve with empty intervals, rather than a line
    // of evenly spaced beads; the occasional nearby rock exposes real parallax.
    const t = Math.min(.985, (i + random() * .9) / rockCount), p = orbit.getPoint(t), size = .19 + Math.pow(random(), 3.5) * 2.25;
    transform.position.set(p.x + (random() - .5) * 18, p.y + (random() - .5) * 9, p.z + (random() - .5) * 15); transform.rotation.set(random() * 6, random() * 6, random() * 6); transform.scale.set(size * (.75 + random() * .42), size * (.6 + random() * .38), size); transform.updateMatrix(); rocks.setMatrixAt(i, transform.matrix);
    rocks.setColorAt(i, new THREE.Color().setScalar(.50 + random() * .48));
  }
  rocks.instanceMatrix.needsUpdate = true;
  let ready = false;
  function layout() {
    const mobile = isCompact(); phases.uWorldCompact.value = mobile ? 1 : 0;
    farScale.value = mobile ? .72 : 1; farOffset.value.set(mobile ? -135 : 0, 0, mobile ? -110 : 0);
    rocks.count = mobile ? Math.min(18, rockCount) : rockCount;
  }
  layout();
  return { root, layout, update(dt, elapsed, motion, power = .24) {
    const target = THREE.MathUtils.clamp(Number.isFinite(power) ? power : power?.value ?? .24, 0, 1);
    if (motion) { phases.uWorldTime.value = Number.isFinite(elapsed) ? elapsed : time?.value ?? phases.uWorldTime.value; phases.uWorldPower.value = THREE.MathUtils.damp(phases.uWorldPower.value, target, 4, dt); }
    else if (!ready) { phases.uWorldTime.value = Number.isFinite(elapsed) ? elapsed : time?.value ?? 0; phases.uWorldPower.value = target; }
    ready = true;
  } };
}
