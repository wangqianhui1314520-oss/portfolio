import * as THREE from 'three';
import { journey } from './immersive-session.js?v=cinematic-v21.1';
import { sectors } from './immersive-journey.js?v=cinematic-v21.1';

export function createExhibits({hardware,ui,camera}) {
  const group=new THREE.Group();hardware.add(group);
  const routes=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x87bcca,transparent:true,opacity:.22,depthWrite:false}));hardware.add(routes);
  const textures=new Map(),loader=new THREE.TextureLoader();
  const ambience=new THREE.PointLight(0x7eabc6,0,18,2);ambience.position.set(0,-1,-3);camera.add(ambience);
  const tint=new THREE.Color(0x7eabc6),sample=document.createElement('canvas');sample.width=sample.height=12;const sampleContext=sample.getContext('2d',{willReadFrequently:true});
  let age=0,lastKey='',activeStep='',frames=0;
  function sampleColor(source){
    try{sampleContext.drawImage(source,0,0,12,12);const p=sampleContext.getImageData(0,0,12,12).data;let r=0,g=0,b=0;for(let i=0;i<p.length;i+=4){r+=p[i];g+=p[i+1];b+=p[i+2];}tint.setRGB(r/36720,g/36720,b/36720,THREE.SRGBColorSpace);}catch{}
  }
  function clear(){while(group.children.length){const object=group.children[0];object.traverse(child=>{child.geometry?.dispose();if(child.material){for(const m of Array.isArray(child.material)?child.material:[child.material])m.dispose();}});group.remove(object);}}
  function locate(element){
    let x=element.offsetLeft+element.offsetWidth/2,y=element.offsetTop+element.offsetHeight/2,parent=element.offsetParent;
    // Star-map anchors use translate(-50%, -50%) to stay centered at any size.
    // Include those local transforms, while leaving the outer CSS3D transform to the renderer.
    while(parent&&parent!==ui){
      const matrix=new DOMMatrixReadOnly(getComputedStyle(parent).transform);
      x+=parent.offsetLeft+matrix.e;y+=parent.offsetTop+matrix.f;parent=parent.offsetParent;
    }
    return new THREE.Vector3(x-ui.clientWidth/2,ui.clientHeight/2-y,1);
  }
  function mapModel(sector,index){
    const model=new THREE.Group();model.userData.kind='beacon';model.userData.index=index;
    const metal=new THREE.MeshStandardMaterial({color:0x647e8f,metalness:.58,roughness:.3,envMapIntensity:1.5}),light=new THREE.MeshBasicMaterial({color:sector.color});
    const mesh=(geometry,material=metal)=>{const m=new THREE.Mesh(geometry,material);model.add(m);return m;};
    if(sector.id==='forge'){
      for(let i=0;i<3;i++){const slab=mesh(new THREE.BoxGeometry(.34,1.15+i*.16,.32));slab.position.set((i-1)*.53,i===1?.12:0,0);slab.rotation.z=-.22;const cut=mesh(new THREE.BoxGeometry(.026,.9,.335),light);cut.position.copy(slab.position);cut.position.x+=.10;cut.rotation.z=-.22;}
    }else if(sector.id==='lumen'){
      for(let i=0;i<3;i++){const lens=mesh(new THREE.TorusGeometry(.77-i*.14,.075,12,64),i===1?light:metal);lens.position.z=i*.18;lens.rotation.y=.28;}const sensor=mesh(new THREE.CircleGeometry(.34,48),new THREE.MeshPhysicalMaterial({color:sector.color,metalness:.8,roughness:.15,iridescence:1}));sensor.position.z=-.1;
    }else if(sector.id==='echo'){
      for(let i=0;i<5;i++){const leaf=mesh(new THREE.BoxGeometry(.83,1.14,.045));leaf.position.set((i-2)*.17,Math.abs(i-2)*.06,(i-2)*.08);leaf.rotation.y=(i-2)*.2;}const spine=mesh(new THREE.BoxGeometry(.018,1.14,.06),light);spine.position.set(.13,0,.22);
    }else{
      const box=mesh(new THREE.BoxGeometry(.94,.94,.60));box.rotation.set(.2,.5,.1);
      const traces=new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry),new THREE.LineBasicMaterial({color:sector.color}));traces.rotation.copy(box.rotation);model.add(traces);
      for(let i=0;i<6;i++){const pin=mesh(new THREE.BoxGeometry(.08,.13,.1),light);pin.position.set((i%3-1)*.27,i<3?.64:-.64,0);}
    }
    const base=mesh(new THREE.CylinderGeometry(.85,.94,.10,64));base.position.y=-1.06;
    const halo=mesh(new THREE.TorusGeometry(.91,.013,6,96),light);halo.rotation.x=Math.PI/2;halo.position.y=-1.01;
    const satellite=mesh(new THREE.TorusGeometry(1.28,.012,6,96,Math.PI*1.45),new THREE.MeshBasicMaterial({color:sector.color,transparent:true,opacity:.35}));satellite.rotation.set(.17,.43,-.3);
    return model;
  }
  function rebuild(){
    activeStep=journey.state.step;const key=activeStep+':'+journey.state.work+':'+innerWidth+':'+innerHeight;
    if(key===lastKey){layout();return;}lastKey=key;clear();age=0;
    if(activeStep==='map')sectors.forEach((sector,index)=>group.add(mapModel(sector,index)));
    if(activeStep==='signals')journey.signals.forEach((work,index)=>{
      const beacon=new THREE.Group();beacon.userData={kind:'signal',index};
      beacon.add(new THREE.Mesh(new THREE.IcosahedronGeometry(4,1),new THREE.MeshBasicMaterial({color:sectorColor(),toneMapped:false})));
      for(let i=0;i<2;i++){
        const ring=new THREE.Mesh(new THREE.TorusGeometry(13+i*5,.35,5,56,Math.PI*1.55),new THREE.MeshBasicMaterial({color:sectorColor(),transparent:true,opacity:.55}));ring.rotation.set(.3+i*.3,.2,i*2);beacon.add(ring);
      }
      group.add(beacon);
    });
    if(activeStep==='target')ui.querySelectorAll('.project-visual').forEach(element=>{
      if(!element.offsetWidth)return;
      const assembly=new THREE.Group();assembly.userData={kind:'project',element,offset:Number(element.closest('[data-offset]').dataset.offset)};
      const metal=new THREE.MeshStandardMaterial({color:0x263b48,metalness:.75,roughness:.32});
      const back=new THREE.Mesh(new THREE.BoxGeometry(1,1,9),metal);back.position.z=-5;assembly.add(back);
      const material=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
      const cover=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);cover.position.z=.8;assembly.add(cover);
      const rail=new THREE.Mesh(new THREE.BoxGeometry(1,2,3),new THREE.MeshBasicMaterial({color:sectorColor()}));rail.position.z=2;assembly.add(rail);
      const leg=new THREE.Mesh(new THREE.BoxGeometry(4,1,4),metal.clone());leg.position.z=-10;assembly.add(leg);
      assembly.userData.parts={back,cover,rail,leg};group.add(assembly);
      function assign(texture){if(!element.isConnected)return;material.map=texture;material.needsUpdate=true;element.dataset.texture='ready';if(assembly.userData.offset===0)sampleColor(texture.image);layout();}
      const path=element.dataset.cover;
      if(textures.has(path))assign(textures.get(path));
      else loader.load(path,texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures.set(path,texture);assign(texture);},undefined,()=>{});
    });
    if(['docked','captain'].includes(activeStep)){
      const terminal=new THREE.Group();terminal.userData.kind='terminal';
      const metal=new THREE.MeshStandardMaterial({color:0x365061,metalness:.7,roughness:.32});
      for(let i=0;i<4;i++)terminal.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,7),metal.clone()));
      for(let i=0;i<4;i++)terminal.add(new THREE.Mesh(new THREE.BoxGeometry(22,1.2,8),new THREE.MeshBasicMaterial({color:sectorColor()})));
      group.add(terminal);
      const cover=journey.detail?.cover;if(textures.has(cover))sampleColor(textures.get(cover).image);
    }
    layout();
  }
  function sectorColor(){return sectors.find(s=>s.id===journey.state.sector)?.color||'#a2dfe9';}
  function layout(){
    group.children.forEach(model=>{
      if(model.userData.kind==='terminal'){
        const w=ui.clientWidth,h=ui.clientHeight;model.userData.target=new THREE.Vector3(0,0,-4);
        model.children.slice(0,4).forEach((rail,i)=>{const side=i%2?-1:1;rail.scale.set(i<2?4:w+16,i<2?h+16:4,1);rail.position.set(i<2?side*(w/2+6):0,i<2?0:side*(h/2+6),0);});
        model.children.slice(4).forEach((light,i)=>light.position.set((i%2?-1:1)*(w/2-9),i<2?h/2+7:-h/2-7,1));
      }else if(model.userData.kind==='signal'){
        const anchor=ui.querySelectorAll('.signal-anchor')[model.userData.index];if(!anchor)return;
        model.userData.target=locate(anchor);model.scale.setScalar(innerWidth<700?.75:1);
      }else if(model.userData.kind==='beacon'){
        const hole=ui.querySelectorAll('.node-space')[model.userData.index];if(!hole)return;
        model.userData.target=locate(hole);model.scale.setScalar(Math.min(innerWidth<700?33:57,hole.clientHeight*.35));
      }else{
        const {element,parts}=model.userData,w=element.offsetWidth,h=element.offsetHeight;if(!w)return;
        model.userData.target=locate(element);parts.back.scale.set(w+12,h+12,1);parts.cover.scale.set(w,h,1);parts.rail.scale.x=w*.33;parts.rail.position.set(-w*.34,-h*.5-7,2);parts.leg.scale.y=18;parts.leg.position.y=-h*.5-17;
        const texture=parts.cover.material.map;
        if(texture){const ratio=texture.image.width/texture.image.height,target=w/h;parts.cover.scale.set(ratio>target?w:h*ratio,ratio>target?w/ratio:h,1);texture.repeat.set(1,1);texture.offset.set(0,0);}
      }
    });
    routes.visible=['map','signals'].includes(activeStep);
    if(routes.visible){
      const anchors=[...ui.querySelectorAll(activeStep==='map'?'.node-space':'.signal-anchor')].map(locate),points=[];
      const ship=ui.querySelector('.ship-origin i');const origin=ship?locate(ship):new THREE.Vector3(0,-ui.clientHeight*.25,-7);
      for(let i=0;i<anchors.length;i++){
        const start=activeStep==='map'?origin:anchors[i],end=activeStep==='map'?anchors[i]:anchors[(i+1)%anchors.length];
        if(start===end)continue;
        const midpoint=start.clone().lerp(end,.5);midpoint.y+=activeStep==='map'?20:35;midpoint.z=-15;
        const curve=new THREE.QuadraticBezierCurve3(start.clone().setZ(-8),midpoint,end.clone().setZ(-8)),path=curve.getPoints(32);
        for(let j=0;j<path.length-1;j++)points.push(path[j].x,path[j].y,path[j].z,path[j+1].x,path[j+1].y,path[j+1].z);
      }
      routes.geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));routes.geometry.computeBoundingSphere();
    }
  }
  return {rebuild,layout,update(dt,time,hovered,motion){
    age+=dt;const entrance=motion?Math.min(1,age/.75):1,settle=1-Math.pow(1-entrance,3);
    group.children.forEach(model=>{
      if(!model.userData.target)return;model.position.copy(model.userData.target);model.position.z-=(1-settle)*90;
      if(model.userData.kind==='beacon'){
        const focused=model.userData.index===hovered;
        model.rotation.set(.12,Math.sin(time*.22+model.userData.index)*.25,0);
        model.position.y+=Math.sin(time*.6+model.userData.index)*2+ (focused?7:0);
        model.children.at(-1).rotation.z=-.3+time*.08;
      }else if(model.userData.kind==='signal'){
        const selected=journey.signals[model.userData.index]?.id===journey.state.work||model.userData.index===hovered;
        model.children[0].scale.setScalar(selected?1.5:1);
        model.children.slice(1).forEach((ring,i)=>{ring.rotation.z=time*(i?-.18:.14);ring.material.opacity=selected?.9:.45;});
      }
    });
    const video=ui.querySelector('video');if(video&&!video.paused&&video.readyState>=2&&frames++%8===0)sampleColor(video);
    ambience.color.lerp(tint,1-Math.exp(-dt*3));const strength=['target','docked'].includes(activeStep)?(video&&!video.paused?5:2.4):.15;ambience.intensity=THREE.MathUtils.lerp(ambience.intensity,strength,1-Math.exp(-dt*3));
  }};
}






