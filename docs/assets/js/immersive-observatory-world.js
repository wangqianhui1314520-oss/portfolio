import * as THREE from 'three';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/utils/BufferGeometryUtils.js';
import {loadTemAsset,cloneTemModel,prepareReveal} from './immersive-blender-assets.js?v=cinematic-v21.1';

// A cropped viewing deck, with a pressure shell, an optical floor and distant
// inhabited structures. All layers have actual thickness and world parallax.
// Five shared batches keep the four chapters inside one geometry budget.
export function createObservatoryWorld({ scene, reflection, compact = () => innerWidth < 701 }) {
  const isCompact = () => typeof compact === 'function' ? Boolean(compact()) : Boolean(compact);
  const root = new THREE.Group(); root.name = 'Tem.observatory.world-depth'; root.position.set(0, 0, -27); scene.add(root); root.visible = false;
  const uniforms = {
    uObservatoryChapter: { value: 0 }, uObservatoryCompact: { value: isCompact() ? 1 : 0 },
    uObservatoryTime: { value: 0 }, uObservatoryPower: { value: .20 }, uObservatoryReveal: { value: 1 }
  };
  // The camera pass and the existing sun's depth pass use one visibility
  // contract, so the hidden responsive layout and other chapters cannot cast
  // shadows into the current deck. No additional light or render pass is made.
  const visibilityMask=`
    if(vObservatory.x>=0.&&abs(vObservatory.x-uObservatoryChapter)>.92)discard;
    if(vObservatory.y<1.5&&abs(vObservatory.y-uObservatoryCompact)>.5)discard;
    if(uObservatoryReveal<.999&&vObservatory.x>=0.){float grain=fract(sin(dot(floor(gl_FragCoord.xy*.5),vec2(12.9898,78.233)))*43758.5453);if(grain>uObservatoryReveal)discard;}`;
  const shadowDepth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  shadowDepth.name='Tem.observatory.masked-sun-depth';
  shadowDepth.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=`attribute vec3 aObservatory;varying vec3 vObservatory;\n${shader.vertexShader}`.replace('#include <begin_vertex>','#include <begin_vertex>\nvObservatory=aObservatory;');
    shader.fragmentShader=`varying vec3 vObservatory;uniform float uObservatoryChapter,uObservatoryCompact,uObservatoryReveal;\n${shader.fragmentShader}`.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\n${visibilityMask}`);
  };
  shadowDepth.customProgramCacheKey=()=> 'tem-observatory-masked-sun-depth-v16';
  const materials = [
    new THREE.MeshPhysicalMaterial({ color: 0xb9c1ca, metalness: .08, roughness: .27, clearcoat: .76, clearcoatRoughness: .24, envMapIntensity: .78, emissive: 0x070d16, emissiveIntensity: .40 }),
    new THREE.MeshPhysicalMaterial({ color: 0x73838e, metalness: .72, roughness: .30, clearcoat: .36, clearcoatRoughness: .24, envMapIntensity: .86 }),
    new THREE.MeshPhysicalMaterial({ color: 0x172839, metalness: .16, roughness: .35, clearcoat: .62, clearcoatRoughness: .22, envMapIntensity: .62 }),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(.53, .82, 1.06), toneMapped: false }),
    new THREE.MeshPhysicalMaterial({ color: 0x152236, metalness: .14, roughness: .35, clearcoat: .50, clearcoatRoughness: .27, envMapIntensity: .36, specularIntensity: .58 })
  ];
  materials.forEach((material, index) => {
    material.vertexColors = true;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = `attribute vec3 aObservatory;varying vec3 vObservatory;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObservatory=aObservatory;');
      shader.fragmentShader = `varying vec3 vObservatory;uniform float uObservatoryChapter,uObservatoryCompact,uObservatoryTime,uObservatoryPower,uObservatoryReveal;\n${shader.fragmentShader}`
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${visibilityMask}`);
      if (index === 3) shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float traveller=pow(.5+.5*sin(vObservatory.z*.16-uObservatoryTime*.34),18.);
        diffuseColor.rgb*=.40+uObservatoryPower*.34+traveller*.24;`);
      if(index===4){
        shader.vertexShader=`attribute vec4 aOpticalLocal;varying vec4 vOpticalLocal;varying vec3 vOpticalWorld;\n${shader.vertexShader}`
          .replace('#include <begin_vertex>','#include <begin_vertex>\nvOpticalLocal=aOpticalLocal;vOpticalWorld=(modelMatrix*vec4(position,1.)).xyz;');
        shader.fragmentShader=`varying vec4 vOpticalLocal;varying vec3 vOpticalWorld;
          float deckSegment(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));}
          float deckFlow(vec2 q,float phase){float angle=atan(q.y,q.x),radius=length(q);return sin(radius*3.4+sin(angle*3.1+phase)*.42+sin(angle*1.9-phase*.38)*.35);}
          ${shader.fragmentShader}`;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
          if(vOpticalLocal.w>.5&&uObservatoryCompact<.5){
            vec2 q=vOpticalLocal.xz;
            float pressure=min(min(deckSegment(q,vec2(-43.,13.),vec2(-27.,18.)),deckSegment(q,vec2(-27.,18.),vec2(-17.,23.5))),deckSegment(q,vec2(-17.,23.5),vec2(-10.,29.)));
            pressure=min(pressure,min(min(deckSegment(q,vec2(12.,9.4),vec2(23.,14.)),deckSegment(q,vec2(23.,14.),vec2(32.,16.6))),deckSegment(q,vec2(32.,16.6),vec2(47.,14.))));
            // Recess the dark inset around the actual pressure shoulders. Their
            // rounded crown used to be buried beneath the unbroken glass face.
            if(pressure<2.55)discard;
          }`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
          if(vOpticalLocal.w>.5){
            vec2 q=vOpticalLocal.xz;float phase=uObservatoryTime*.045;
            vec2 panel=(q-vec2(-8.1,26.8))/vec2(6.2,4.8),core=(q-vec2(9.2,13.0))/vec2(7.4,6.0);
            float panelMask=exp(-dot(panel,panel)*.62),coreMask=exp(-dot(core,core)*.72);
            float pool=max(panelMask*.76,coreMask);
            float face=smoothstep(.12,.84,abs(normalize(cameraPosition-vOpticalWorld).y));
            // Two quiet, irregular reflected-light pools are fixed to the
            // floor. Fine folds move inside them using the shared frozen phase.
            float panelFold=deckFlow(panel*2.0,phase),coreFold=deckFlow(core*2.3,phase+.9);
            float panelCaustic=pow(max(0.,1.-abs(panelFold)),22.)*panelMask;
            float coreCaustic=pow(max(0.,1.-abs(coreFold)),24.)*coreMask;
            float cloudA=sin(q.x*.27+sin(q.y*.20-phase*.7)*1.2+phase),cloudB=cos(q.y*.31+sin(q.x*.16+phase)*1.4-phase*.4);
            float haze=pow(.5+.5*cloudA*cloudB,2.4)*pool;
            vec3 cloudTint=mix(vec3(.045,.10,.17),vec3(.105,.066,.17),.5+.5*sin(q.x*.19+q.y*.13));
            vec3 caustic=vec3(.09,.26,.39)*panelCaustic+vec3(.16,.16,.34)*coreCaustic;
            float warm=exp(-dot((q-vec2(15.3,11.8))/vec2(3.1,1.6),(q-vec2(15.3,11.8))/vec2(3.1,1.6)));
            float quiet=uObservatoryCompact>.5?.36:1.;
            // Compress direct and environment glare locally before adding the
            // inset optics. The physical floor should not bloom like a lamp.
            outgoingLight=outgoingLight/(1.+outgoingLight*1.15);
            outgoingLight+=quiet*(cloudTint*haze*.62+caustic*.54+vec3(.17,.073,.026)*warm*.30)*(1.-face*.45);
          }
          #include <opaque_fragment>`);
      }
    };
    material.customProgramCacheKey = () => index === 3 ? 'tem-observatory-world-emission-v14' : index===4?'tem-observatory-deck-reflected-light-v15':'tem-observatory-world-solid-v14';
  });
  const buckets = materials.map(() => []), transform = new THREE.Object3D();
  const vector = array => new THREE.Vector3(...array);
  const curve = points => new THREE.CatmullRomCurve3(points.map(vector), false, 'centripetal');

  function add(geometry, material, { chapter = -1, layout = 2, position = [0, 0, 0], rotation = [0, 0, 0], shade = [1, 1, 1], transformBy = null, opticalFloor = 0 } = {}) {
    transform.position.fromArray(position); transform.rotation.fromArray(rotation); transform.scale.set(1, 1, 1); transform.updateMatrix();
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone(); g.applyMatrix4(transform.matrix);
    const localPositions=g.getAttribute('position'),local=new Float32Array(localPositions.count*4);
    for(let i=0;i<localPositions.count;i++)local.set([localPositions.getX(i),localPositions.getY(i),localPositions.getZ(i),opticalFloor],i*4);
    if (transformBy) g.applyMatrix4(transformBy);
    const positions = g.getAttribute('position'), count = positions.count;
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    const ownership = new Float32Array(count * 3), colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      ownership.set([chapter, layout, positions.getX(i) + positions.getZ(i) * .27], i * 3);
      colors.set(shade, i * 3);
    }
    g.setAttribute('aObservatory', new THREE.BufferAttribute(ownership, 3)); g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('aOpticalLocal',new THREE.BufferAttribute(local,4));
    buckets[material].push(g); geometry.dispose();
  }

  // Horizontal cross-sections stay upright. A Frenet frame can rotate a wide
  // pressure shell into a vertical blade on a shallow, bending deck path.
  function sweep(path, width, height, segments = 48, radial = 12, taper = () => 1) {
    const positions = [], uv = [], indices = [], up = new THREE.Vector3(0, 1, 0), vertical = new THREE.Vector3(), lateral = new THREE.Vector3();
    for (let i = 0; i <= segments; i++) {
      const p = path.getPointAt(i / segments), tangent = path.getTangentAt(i / segments), scale = Math.max(.025, taper(i / segments));
      vertical.copy(up).addScaledVector(tangent, -up.dot(tangent));if(vertical.lengthSq()<.0001)vertical.set(0,0,1);vertical.normalize();lateral.crossVectors(tangent,vertical).normalize();
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * Math.PI * 2, sx = Math.sin(a), cy = Math.cos(a);
        const q = p.clone().addScaledVector(lateral, sx * width * scale).addScaledVector(vertical, cy * height * scale);
        positions.push(q.x, q.y, q.z); uv.push(i / segments, j / radial);
        if (i < segments && j < radial) { const k = i * (radial + 1) + j; indices.push(k, k + 1, k + radial + 1, k + 1, k + radial + 2, k + radial + 1); }
      }
    }
    // Caps have their own vertices, so their normals stay planar at the joints.
    for (const end of [0, segments]) {
      const source = end * (radial + 1), start = positions.length / 3;
      for (let j = 0; j <= radial; j++) { const k = (source + j) * 3; positions.push(positions[k], positions[k + 1], positions[k + 2]); uv.push(.5 + Math.sin(j / radial * Math.PI * 2) * .5, .5 + Math.cos(j / radial * Math.PI * 2) * .5); }
      const center = positions.length / 3, p = path.getPointAt(end / segments); positions.push(p.x, p.y, p.z); uv.push(.5, .5);
      for (let j = 0; j < radial; j++) { if (end === 0) indices.push(center, start + j + 1, start + j); else indices.push(center, start + j, start + j + 1); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
  }

  function deckShape(points, scale = 1) {
    const centerX=(Math.min(...points.map(p=>p[0]))+Math.max(...points.map(p=>p[0])))*.5,centerZ=(Math.min(...points.map(p=>p[1]))+Math.max(...points.map(p=>p[1])))*.5;
    const outline = new THREE.Shape(), path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(centerX+(p[0]-centerX)*scale,0,centerZ+(p[1]-centerZ)*scale)), true, 'centripetal');
    const contour = path.getPoints(points.length * 6); outline.moveTo(contour[0].x, -contour[0].z);
    for(const p of contour.slice(1))outline.lineTo(p.x,-p.z);outline.closePath();return outline;
  }
  function deckBody(shape, depth, bevel = .18) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });g.rotateX(-Math.PI/2);return g;
  }
  function roundedCabin(w,h,d,r=.36){
    const s=new THREE.Shape(),x=-w/2,y=-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:r*.32,bevelSize:r*.28,bevelSegments:3,curveSegments:5});g.translate(0,0,-d/2);return g;
  }
  const rotationMatrix = angle => new THREE.Matrix4().makeRotationY(angle);
  for (let chapter = 0; chapter < 4; chapter++) {
    const matrix = rotationMatrix(chapter * Math.PI / 2);
    const desktop = { chapter, layout: 0, transformBy: matrix };
    // A substantial floor continues below and outside the viewport. The curved
    // cutout leaves deep space visible between the screen and identity device.
    const contour=[[-42,9],[-28,14],[-15,20],[-5,22],[3,21],[9,12],[17,7],[24,10],[32,13],[46,6],[47,46],[-46,46]];
    const outer=deckShape(contour), inset=deckShape(contour,.962);
    add(deckBody(outer,1.08,.17),0,{...desktop,position:[0,-6.65,0],shade:[.74,.82,.92]});
    add(deckBody(deckShape(contour,1.015),1.35,.17),2,{...desktop,position:[0,-7.70,0]});
    const floor=new THREE.ShapeGeometry(inset,4);floor.rotateX(-Math.PI/2);
    // The inset is above the ceramic crown, not buried under its bevel.
    add(floor,4,{...desktop,position:[0,-5.32,0],shade:[.85,.93,1],opticalFloor:1});
    const shoulders=[
      [[-43,-6.62,13],[-27,-6.54,18],[-17,-6.49,23.5],[-10,-6.50,29]],
      [[12,-6.58,9.4],[23,-6.54,14],[32,-6.60,16.6],[47,-7.18,14]]
    ];
    shoulders.forEach(points=>{
      const path=curve(points), body=curve(points.map(p=>[p[0],p[1]-.93,p[2]+.22]));
      const taper=t=>.80+.20*Math.sin(t*Math.PI);
      add(sweep(path,2.75,1.12,32,12,taper),0,{...desktop,shade:[.82,.87,.95]});
      add(sweep(body,2.99,1.29,32,12,taper),2,desktop);
      const seam=curve(points.map(p=>[p[0],p[1]-.43,p[2]-2.18]));
      add(sweep(seam,.11,.065,36,6,taper),1,{...desktop,shade:[.73,.81,.91]});
    });
    // Recessed service wells communicate scale and function. The chamfered
    // sockets, crystal inserts and split indicator segments share the batches.
    for(const [x,z,yaw] of [[-13.2,23.5,-.22],[22.4,11.8,.24]]){
      add(new THREE.CylinderGeometry(.91,1.02,.19,24),1,{...desktop,position:[x,-5.37,z],shade:[.86,.84,.81]});
      add(new THREE.CylinderGeometry(.74,.77,.10,24),2,{...desktop,position:[x,-5.24,z]});
      add(new THREE.CylinderGeometry(.57,.59,.06,24),4,{...desktop,position:[x,-5.18,z],shade:[.64,.81,1]});
      for(const angle of [.32,2.16,4.15]){
        add(new THREE.TorusGeometry(.78,.023,5,14,.43).rotateX(Math.PI/2),3,{...desktop,position:[x,-5.165,z],rotation:[0,angle+yaw,0],shade:angle===2.16?[2.1,.74,.23]:[.57,.92,1.23]});
      }
      for(const side of [-1,1])add(roundedCabin(.34,.17,.53,.07),1,{...desktop,position:[x+side*.98,-5.35,z],rotation:[0,yaw,0],shade:[.64,.71,.80]});
    }
    for(const [points,warm] of [
      [[[-21,-5.30,20.6],[-16,-5.30,23.8],[-10.6,-5.30,26.2]],false],
      [[[10.2,-5.30,14.2],[15.2,-5.30,11.5],[21.2,-5.30,13.5]],false],
      [[[-7.2,-5.30,23.7],[-3.4,-5.30,24.2],[.3,-5.30,23.8]],true]
    ])add(sweep(curve(points),.032,.021,28,5),3,{...desktop,shade:warm?[1.88,.76,.24]:[.55,.87,1.17]});
    // Interrupted optical coils are seated in shallow titanium channels. They
    // are actual surface geometry and stay under the two mounted instruments.
    for(const [x,z,r] of [[-8.1,26.2,2.85],[9.2,13.0,4.25]]){
      for(const [angle,extent,inner] of [[.28,Math.PI*.57,false],[2.50,Math.PI*.74,true]]){
        const radius=r*(inner?.84:1),track=new THREE.TorusGeometry(radius,.044,4,28,extent).rotateX(Math.PI/2).scale(1,1,.72),guide=new THREE.TorusGeometry(radius,.013,4,28,extent).rotateX(Math.PI/2).scale(1,1,.72);
        add(track,1,{...desktop,position:[x,-5.30,z],rotation:[0,angle,0],shade:[.47,.58,.71]});
        add(guide,3,{...desktop,position:[x,-5.254,z],rotation:[0,angle,0],shade:inner?[.58,.57,.89]:[.34,.73,.97]});
      }
    }
    // Two low support bridges visibly meet the floor and the optical assembly,
    // with dark joints under their pearl ceramic sleeves.
    for(const [x,z,yaw] of [[-8.8,24.9,.11],[14,11.3,-.14]]){
      add(roundedCabin(2.5,.40,1.35,.22),2,{...desktop,position:[x,-5.65,z],rotation:[0,yaw,0]});
      add(roundedCabin(2.1,.23,1.15,.18),0,{...desktop,position:[x,-5.33,z],rotation:[0,yaw,0],shade:[.83,.87,.94]});
    }

    // The portrait deck sits further below the reading glass. Broad rounded
    // surfaces replace the previous pointed corner rails, with only two guides.
    const mobile = { chapter, layout: 1, transformBy: matrix };
    const phoneContour=[[-20,8],[-10,11],[0,16],[10,11],[20,8],[24,38],[-24,38]],phoneShape=deckShape(phoneContour);
    add(deckBody(phoneShape,.62,.11),0,{...mobile,position:[0,-8.76,0],shade:[.68,.78,.91]});
    const phoneInset=new THREE.ShapeGeometry(deckShape(phoneContour,.95),4);phoneInset.rotateX(-Math.PI/2);add(phoneInset,4,{...mobile,position:[0,-7.99,0],opticalFloor:1});
    for (const side of [-1, 1]) {
      const path=curve([[side*18,-8.45,12],[side*9,-8.40,17],[side*4.8,-8.40,23]]);
      add(sweep(path,1.22,.39,24,10),0,{...mobile,shade:[.65,.75,.91]});
      add(sweep(curve([[side*14,-8.04,14.5],[side*10,-8.04,16.5],[side*7,-8.04,19]]),.023,.018,20,5),3,{...mobile,shade:[.46,.67,.87]});
    }
  }

  // One horizontal crescent habitat supplies a middle distance. Thick pressure
  // bodies, cantilevered observation pods and window apertures form a readable
  // silhouette rather than an unlit line drawn across the glass interface.
  const habitatPose=new THREE.Object3D();habitatPose.position.set(45,-43,-126);habitatPose.rotation.set(.03,-.23,-.035);habitatPose.updateMatrix();
  const habitatPart=(geometry,material,position=[0,0,0],rotation=[0,0,0],shade=[1,1,1])=>add(geometry,material,{position,rotation,shade,transformBy:habitatPose.matrix,layout:0});
  const habitatArc=curve(Array.from({length:41},(_,i)=>{const a=.10*Math.PI+i/40*Math.PI*1.18;return [Math.cos(a)*44,Math.sin(a*.6)*.9,Math.sin(a)*24];}));
  habitatPart(sweep(habitatArc,4.2,2.3,48,10),2);
  const upperArc=curve(Array.from({length:41},(_,i)=>{const a=.10*Math.PI+i/40*Math.PI*1.18;return [Math.cos(a)*44,Math.sin(a*.6)*.9+2.35,Math.sin(a)*24];}));
  habitatPart(sweep(upperArc,3.4,.73,48,10),0,[0,0,0],[0,0,0],[.68,.78,.90]);
  const lowerArc=curve(Array.from({length:41},(_,i)=>{const a=.10*Math.PI+i/40*Math.PI*1.18;return [Math.cos(a)*44,Math.sin(a*.6)*.9-2.58,Math.sin(a)*24];}));
  habitatPart(sweep(lowerArc,2.65,.46,56,10),1,[0,0,0],[0,0,0],[.52,.65,.81]);
  for(const [i,t] of [.09,.30,.56,.81,.95].entries()){
    const p=habitatArc.getPointAt(t),tangent=habitatArc.getTangentAt(t),yaw=Math.atan2(tangent.x,tangent.z);
    habitatPart(roundedCabin(5.1,6.4,7.2,.8),2,[p.x,p.y-1.35,p.z],[0,yaw,0]);
    habitatPart(roundedCabin(5.4,.78,7.6,.42),0,[p.x,p.y+2.9,p.z],[0,yaw,0],[.77,.82,.89]);
    habitatPart(roundedCabin(3.6,1.34,.22,.25),4,[p.x,p.y+1.28,p.z+3.62],[0,yaw,0],[.44,.70,.96]);
    // Separate small window bays interrupt the dark hull. Warm windows occur
    // on alternate service pods, leaving most of the architecture unlit.
    for(let window=0;window<4;window++){
      const offset=(window-1.5)*.74;
      habitatPart(new THREE.BoxGeometry(.39,.72,.15),3,[p.x+offset,p.y-.29,p.z+3.68],[0,yaw,0],i%2?[1.8,.65,.18]:[.49,.79,1.04]);
    }
    habitatPart(new THREE.CylinderGeometry(.20,.53,8.2,8),1,[p.x,p.y-7.85,p.z],[0,0,-.04],[.43,.56,.70]);
  }
  // Sparse remote horizon receivers remain quiet in other orbital directions.
  // They never create a continuous rail or enclose the observer in a cage.
  for (const [angle, distance, y] of [[1.83, 260, -31], [3.62, 340, -37], [5.06, 410, -24]]) {
    const x = Math.sin(angle) * distance, z = Math.cos(angle) * distance;
    add(new THREE.CylinderGeometry(.34, .98, 11.8, 8), 1, { position: [x, y, z], rotation: [0, 0, -.10], shade: [.54, .65, .78] });
    add(roundedCabin(5.9,1.84,3.24,.32),0, { position: [x, y + 5.2, z], rotation: [0, angle, 0], shade: [.62, .71, .82] });
    add(new THREE.SphereGeometry(.17, 8, 6), 3, { position: [x, y + 4.62, z], shade: [.95, .68, .48] });
  }

  let triangles = 0;
  buckets.forEach((geometries, index) => {
    const geometry = mergeGeometries(geometries, false), mesh = new THREE.Mesh(geometry, materials[index]);
    geometry.computeBoundingSphere(); triangles += geometry.getAttribute('position').count / 3;
    mesh.name = `Tem.observatory.depth-batch.${index}`;mesh.castShadow=index<3;mesh.receiveShadow=index!==3;
    if(mesh.castShadow)mesh.customDepthMaterial=shadowDepth;
    mesh.frustumCulled = false; mesh.userData.visualOnly = true; root.add(mesh);
    geometries.forEach(g => g.dispose());
  });
  const stats = { batches: 5, triangles, particles: 0, shadowLights: 0, fullscreenPasses: 0,shadowCastingBatches:3,shadowReceivingBatches:4 };
  root.userData.budget = stats;
  let initialized = false, lastPausedSignature = '', lastCompact = isCompact(),authoredDecks=null,authoredHabitat=null,sharedDeck=null;
  let authoredNearTriangles=0,authoredFarTriangles=0;
  const fallbackBatches=root.children.filter(child=>child.isMesh);
  if(typeof loadTemAsset==='function')loadTemAsset({name:'deck',desktopOnly:true,canvas:document.getElementById('space'),onLoad:model=>{
    if(!model.find('WORLD_DECK'))throw new Error('Continuous authored deck is missing its semantic root.');
    prepareReveal(model.root,uniforms.uObservatoryReveal);
    model.root.traverse(mesh=>{
      if(!mesh.isMesh)return;
      if(/FLOOR_OPTICAL/.test(mesh.material.name)){
        // The authored green channel contains absolute roughness. Preserve
        // its glTF factor; applying .21 again would polish away the bake.
        if(!mesh.material.roughnessMap){mesh.material.roughness=.21;mesh.material.clearcoat=.56;mesh.material.clearcoatRoughness=.18;}
        // The broad deck should hold a shaped reflection rather than the
        // low-angle cyan rim's white clearcoat hot spot. Keep its baked maps.
        mesh.material.clearcoat=Math.min(mesh.material.clearcoat,.38);mesh.material.clearcoatRoughness=Math.max(mesh.material.clearcoatRoughness,.24);
        mesh.material.envMapIntensity=.26;
        reflection?.bindSurface(mesh);
      }
    });
    root.add(model.root);sharedDeck=model.root;authoredNearTriangles=model.triangleCount;
    dispatchEvent(new Event('tem:scene-depth-change'));
  }});
  if(typeof loadTemAsset==='function')loadTemAsset({name:'observatory',desktopOnly:true,canvas:document.getElementById('space'),onLoad:model=>{
    if(!model.find('NEAR_DECK'))throw new Error('Authored observatory is missing its deck.');
    authoredDecks=[];
    const countTriangles=node=>{let count=0;node.traverse(mesh=>{if(mesh.isMesh)count+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;});return count;};
    const far=model.find('FAR_HABITAT');
    if(far){
      authoredFarTriangles=countTriangles(far);
      model.root.updateWorldMatrix(true,true);
      const distant=cloneTemModel(far);far.matrixWorld.decompose(distant.position,distant.quaternion,distant.scale);
      distant.name='Tem.observatory.Blender-distant-habitat';root.add(distant);authoredHabitat=distant;prepareReveal(distant,uniforms.uObservatoryReveal);
    }
    dispatchEvent(new Event('tem:scene-depth-change'));
  }});
  function layout() { lastCompact = isCompact(); uniforms.uObservatoryCompact.value = lastCompact ? 1 : 0; }
  return { root, layout, stats, update(dt, time, frame, motion) {
    if (lastCompact !== isCompact()) layout();
    const arrival = Boolean(frame.opening && frame.introFrame?.time > 9), welcome = frame.step === 'bridge' && !frame.opening;
    root.visible = welcome || ['captain','map','boot'].includes(frame.step) || arrival;
    if (!root.visible) { lastPausedSignature = ''; return; }
    const chapter = welcome || arrival ? 0 : THREE.MathUtils.clamp(Number(frame.archiveProgress) || 0, 0, 3);
    uniforms.uObservatoryChapter.value = chapter;
    uniforms.uObservatoryReveal.value = (arrival ? THREE.MathUtils.smoothstep(frame.introFrame.time, 9, 11.6) : 1)*(1-(frame.observatoryReplacement||0));
    root.visible=root.visible&&uniforms.uObservatoryReveal.value>.001;
    if(sharedDeck){
      const authored=!isCompact();
      fallbackBatches.forEach(mesh=>mesh.visible=!authored);
      sharedDeck.visible=authored;
      if(authoredHabitat)authoredHabitat.visible=authored;
    }
    // Shared-clock animation freezes at its last live phase. Discrete chapter
    // visibility can still change while reduced motion is selected.
    if (motion || !initialized) uniforms.uObservatoryTime.value = Number.isFinite(time) ? time : 0;
    const power = arrival ? THREE.MathUtils.smoothstep(frame.introFrame.time, 9, 13) * .27 : .27;
    uniforms.uObservatoryPower.value = motion ? THREE.MathUtils.damp(uniforms.uObservatoryPower.value, power, 3, Math.max(0, Math.min(.12, dt))) : power;
    initialized = true;
    const canvas = document.getElementById('space');
    if(canvas){const authored=sharedDeck&&!isCompact();canvas.dataset.observatoryWorld=authored?'blender-continuous-shared-deck':'open-viewing-deck-optical-floor-habitat';canvas.dataset.observatoryWorldPhase=uniforms.uObservatoryTime.value.toFixed(2);canvas.dataset.observatoryWorldReveal=uniforms.uObservatoryReveal.value.toFixed(3);canvas.dataset.observatoryWorldTriangles=String(authored?authoredNearTriangles+authoredFarTriangles:triangles);canvas.dataset.observatoryDeckCopies=authored?'1':'fallback';}
    if (!motion) {
      const signature = `${chapter.toFixed(4)}:${lastCompact}`;
      if (lastPausedSignature !== signature) { lastPausedSignature = signature; dispatchEvent(new Event('tem:scene-depth-change')); }
    } else lastPausedSignature = '';
  } };
}
