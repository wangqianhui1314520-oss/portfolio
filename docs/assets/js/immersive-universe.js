import * as THREE from 'three';
import { journey } from './immersive-session.js?v=cinematic-v21.1';
import { sectors } from './immersive-journey.js?v=cinematic-v21.1';

// Destination geometry stays in world space as the ship travels toward it.
export function createExplorationWorld({scene,camera}) {
  const root=new THREE.Group();scene.add(root);
  const surfaceCanvas=document.createElement('canvas');surfaceCanvas.width=512;surfaceCanvas.height=256;
  const ctx=surfaceCanvas.getContext('2d'),pixels=ctx.createImageData(512,256);
  const hash=(x,y)=>{let n=Math.imul(x+Math.imul(y,173),374761393);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  const noise=(x,y)=>{let i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j;a=a*a*(3-2*a);b=b*b*(3-2*b);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(i,j),hash(i+1,j),a),THREE.MathUtils.lerp(hash(i,j+1),hash(i+1,j+1),a),b);};
  for(let y=0;y<256;y++)for(let x=0;x<512;x++){
    let n=0,w=.55;for(let o=0;o<5;o++){n+=noise(x/49*2**o,y/37*2**o)*w;w*=.5;}
    const ridge=Math.pow(n,1.4),i=(y*512+x)*4;
    pixels.data[i]=Math.round(32+ridge*143);pixels.data[i+1]=Math.round(43+ridge*132);pixels.data[i+2]=Math.round(55+ridge*117);pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);const crust=new THREE.CanvasTexture(surfaceCanvas);crust.colorSpace=THREE.SRGBColorSpace;crust.wrapS=THREE.RepeatWrapping;
  const material=new THREE.MeshStandardMaterial({map:crust,bumpMap:crust,bumpScale:.34,roughness:.97,metalness:.02});
  const planet=new THREE.Mesh(new THREE.SphereGeometry(18,72,48),material);root.add(planet);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(18.35,64,40),new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color('#7dc3dd')}},side:THREE.BackSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 n,p;void main(){n=normalize(mat3(modelMatrix)*normal);p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',fragmentShader:'varying vec3 n,p;uniform vec3 uColor;void main(){vec3 e=normalize(cameraPosition-p);float rim=pow(1.-abs(dot(normalize(n),e)),5.);gl_FragColor=vec4(uColor,rim*.34);}'}));root.add(atmosphere);
  const orbit=new THREE.Group();orbit.rotation.set(.72,.12,-.45);root.add(orbit);
  const alloy=new THREE.MeshStandardMaterial({color:0x324958,metalness:.7,roughness:.43});
  const glow=new THREE.MeshBasicMaterial({color:0x91dcea});
  orbit.add(new THREE.Mesh(new THREE.TorusGeometry(23,.07,8,160),alloy));
  orbit.add(new THREE.Mesh(new THREE.TorusGeometry(23.15,.022,6,160,Math.PI*1.45),glow));
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,station=new THREE.Mesh(new THREE.BoxGeometry(1.3,.6,.8),alloy);station.position.set(Math.cos(a)*23,Math.sin(a)*23,0);station.rotation.z=a;orbit.add(station);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(.6,.09,.85),glow);lamp.position.copy(station.position);lamp.rotation.z=a;orbit.add(lamp);
  }
  const scan=new THREE.Mesh(new THREE.RingGeometry(.985,1,160),new THREE.MeshBasicMaterial({color:0x96dae6,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(scan);
  const position=new THREE.Vector3(),offset=new THREE.Vector3(),orientation=new THREE.Quaternion();let step='bridge',scanAge=0,framedMobile=false;
  function placeWorld(){framedMobile=innerWidth<700;offset.set(framedMobile?0:-25,framedMobile?18:7,-85).applyQuaternion(orientation);root.position.copy(position).add(offset);}
  const dust=new THREE.Group();root.add(dust);
  const asteroidGeometry=new THREE.IcosahedronGeometry(1,0),asteroidMaterial=new THREE.MeshStandardMaterial({color:0x43515b,roughness:1});
  const debris=new THREE.InstancedMesh(asteroidGeometry,asteroidMaterial,60),dummy=new THREE.Object3D();
  for(let i=0;i<60;i++){const a=i*2.39996,r=31+(i%7)*2;dummy.position.set(Math.cos(a)*r,Math.sin(a)*r*.5,(i%11-5)*3);dummy.scale.setScalar(.05+(i%5)*.035);dummy.rotation.set(a,i,a*.3);dummy.updateMatrix();debris.setMatrixAt(i,dummy.matrix);}dust.add(debris);
  return {
    setState(){
      const state=journey.state;step=state.step;scanAge=0;const s=sectors.find(s=>s.id===state.sector);
      root.visible=Boolean(s);scan.visible=step==='scanning';if(!s)return;
      position.fromArray(s.position);
      orientation.setFromRotationMatrix(new THREE.Matrix4().lookAt(position,new THREE.Vector3(position.x*.4,.5,-240),new THREE.Vector3(0,1,0)));
      placeWorld();
      material.color.set(s.color);atmosphere.material.uniforms.uColor.value.set(s.color);glow.color.set(s.color);scan.material.color.set(s.color);
      scan.position.copy(position).add(new THREE.Vector3(0,0,-28).applyQuaternion(orientation));scan.quaternion.copy(orientation);
      document.getElementById('space').dataset.destination=s.id;
    },
    update(dt,time,motion){
      if(framedMobile!==(innerWidth<700))placeWorld();
      planet.rotation.y=time*.012;orbit.rotation.z=-.45+time*.006;dust.rotation.z=time*.002;
      scanAge+=dt;
      if(step==='scanning'){const p=motion?Math.min(1,scanAge/2.2):1;scan.scale.setScalar(1+p*46);scan.material.opacity=Math.sin(p*Math.PI)*.65;}
    }
  };
}






