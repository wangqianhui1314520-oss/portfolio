import * as THREE from 'three';

// Camera-local geometry keeps the pilot seated throughout every route and docking.
export function createShipCockpit({ camera }) {
  const cockpit = new THREE.Group(); camera.add(cockpit); cockpit.position.z = -5;
  const hull = new THREE.MeshStandardMaterial({ color: 0x111d2d, metalness: .55, roughness: .56 });
  const inset = new THREE.MeshBasicMaterial({ color: 0x020810 });
  const cyan = new THREE.LineBasicMaterial({ color: 0x4ad6e6, transparent: true, opacity: .42 });
  const pink = new THREE.LineBasicMaterial({ color: 0xd268b3, transparent: true, opacity: .36 });
  function panel(points, material = hull) {
    const shape = new THREE.Shape(points.map(([x,y]) => new THREE.Vector2(x,y)));
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material); cockpit.add(mesh); return mesh;
  }
  function edge(points, material = cyan) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x,y]) => new THREE.Vector3(x,y,.015)));
    cockpit.add(new THREE.Line(geometry, material));
  }
  for (const side of [-1, 1]) {
    const mirror = points => points.map(([x,y]) => [x*side,y]);
    panel(mirror([[1.3,1.2],[.96,.87],[.89,.57],[.96,-.63],[1.3,-.90]]));
    panel(mirror([[1.3,-1.3],[1.3,-.62],[.93,-.62],[.68,-.81],[.17,-.88],[.08,-1.3]]));
    panel(mirror([[.94,-.74],[.70,-.89],[.26,-.96],[.30,-1.13],[1.1,-1.13]]),inset);
    edge(mirror([[.96,.85],[.92,.56],[.995,-.57]]),side<0?cyan:pink);
    edge(mirror([[.95,-.64],[.68,-.82],[.18,-.90]]));
    edge(mirror([[.89,-.78],[.69,-.92],[.30,-.98]]),pink);
    for(let i=0;i<12;i++) edge(mirror([[.51+i*.025,-.956+i*.008],[.514+i*.025,-.940+i*.008]]),i%4===0?pink:cyan);
  }
  panel([[-1.3,1.3],[-1.3,.86],[-.82,.86],[-.70,.92],[.70,.92],[.82,.86],[1.3,.86],[1.3,1.3]]);
  edge([[-.96,.855],[-.82,.855],[-.70,.915],[.70,.915],[.82,.855],[.96,.855]]);
  panel([[-.19,-1.2],[-.14,-.89],[0,-.83],[.14,-.89],[.19,-1.2]],inset);
  edge([[-.13,-1.05],[-.105,-.92],[0,-.87],[.105,-.92],[.13,-1.05]]);
  const core=new THREE.Mesh(new THREE.RingGeometry(.025,.031,40),new THREE.MeshBasicMaterial({color:0x64f0e9,transparent:true,opacity:.7}));
  core.position.set(0,-.956,.025);cockpit.add(core);
  const ceiling=new THREE.PointLight(0x64cbdc,1.0,12);ceiling.position.set(0,2,0);camera.add(ceiling);
  return { update(pointer,velocity,time) {
    const height=5*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5));
    cockpit.scale.set(height*camera.aspect,height,1);cockpit.rotation.z=-pointer.x*.0015;
    core.rotation.z=time*.15;core.material.opacity=.45+Math.min(.45,velocity*.3);
  }};
}
