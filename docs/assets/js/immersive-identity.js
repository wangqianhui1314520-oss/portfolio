import * as THREE from 'three';

// A single prefiltered light environment is shared by the optical world and ships.
// The former camera-mounted metal T is replaced by the actual archive crystal.
export function createTemIdentity({scene,renderer}){
 const environment=new THREE.Scene();environment.background=new THREE.Color(0x070a13);
 const lights=[[-7,1,5,1.4,10,0xe7ecff,1.3],[-5,-2,6,2,8,0x97b7db,.65],[6,0,4,2,8,0xb4c6e5,1.1],[0,-4,2,9,.45,0x92d4e7,.8],[0,7,-2,10,2,0xffeddf,1.25],[-3,-1,-5,.55,9,0xb7a9e6,.65]];
 for(const [x,y,z,w,h,color,gain] of lights){
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(gain),side:THREE.DoubleSide,toneMapped:false}));
  panel.position.set(x,y,z);panel.lookAt(0,0,0);environment.add(panel);
 }
 const pmrem=new THREE.PMREMGenerator(renderer),reflection=pmrem.fromScene(environment,.025);scene.environment=reflection.texture;
 environment.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
 return {update(){}};
}
