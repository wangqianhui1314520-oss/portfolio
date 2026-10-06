import * as THREE from 'three';
import {hardwareMaterials,hardwareMesh,bevelGeometry,consolidateHardware} from './immersive-hardware.js?v=cinematic-v21.1';
import {archiveChapterOrder,archiveCenter,archiveAngle} from './immersive-archive-path.js?v=cinematic-v21.1';
import {projectWorldSurface,clipForeground} from './immersive-world-surface.js?v=cinematic-v21.1';
import {createArchiveDetails} from './immersive-archive-details.js?v=cinematic-v21.1';
import {createLightFlow} from './immersive-light-flow.js?v=cinematic-v21.1';

// One annular environment. Each reading surface belongs to a physical device.
export function createCreatorArchive({scene,camera}){
 const root=new THREE.Group();root.position.fromArray(archiveCenter);scene.add(root);root.visible=false;
 const m=hardwareMaterials(),compact=()=>innerWidth<701;
 m.alloy.color.set(0x75828c);m.alloy.envMapIntensity=1.35;m.armor.color.set(0x77838b);m.armor.envMapIntensity=1.6;
 m.dark.color.set(0x172029);m.dark.roughness=.27;m.dark.clearcoat=.48;m.dark.envMapIntensity=.80;m.brass.color.set(0xaa9070);
 m.white.color.setRGB(2.45,1.52,.66);m.cyan.color.setRGB(.35,1.2,1.8);
 // Optical film reflects the environment without a full second scene capture.
 const glass=new THREE.MeshPhysicalMaterial({color:0x76929f,metalness:.18,roughness:.095,clearcoat:1,envMapIntensity:.45,transparent:true,opacity:.20,depthWrite:false,side:THREE.DoubleSide});
 const blockCache=new Map();
 function block(w,h,d){
  const key=[w,h,d].join('/');if(blockCache.has(key))return blockCache.get(key);
  let geo;if(Math.min(w,h)<.18)geo=new THREE.BoxGeometry(w,h,d);
  else{const r=Math.min(w,h)*.06,x=w/2,y=h/2,s=new THREE.Shape();s.moveTo(-x+r,-y);s.lineTo(x-r,-y);s.lineTo(x,-y+r);s.lineTo(x,y-r);s.lineTo(x-r,y);s.lineTo(-x+r,y);s.lineTo(-x,y-r);s.lineTo(-x,-y+r);s.closePath();geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:Math.min(.025,d*.10),bevelThickness:Math.min(.025,d*.10),bevelSegments:1,curveSegments:1});geo.translate(0,0,-d/2);}
  blockCache.set(key,geo);return geo;
 }
 const part=(parent,w,h,d,p,mat=m.alloy)=>hardwareMesh(parent,block(w,h,d),mat,p);
 const cyl=(parent,r1,r2,h,p,mat=m.dark,segments=64)=>hardwareMesh(parent,new THREE.CylinderGeometry(r1,r2,h,segments),mat,p);
 const pipe=(parent,pts,r,mat=m.brass)=>hardwareMesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),64,r,6,false),mat);
 const ring=(parent,r,t,p,mat=m.alloy)=>{const mesh=hardwareMesh(parent,new THREE.TorusGeometry(r,t,8,160),mat,p);mesh.rotation.x=Math.PI/2;return mesh;};
 function annulus(parent,inner,outer,y,mat,depth=.35){
  const shape=new THREE.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
  const mesh=hardwareMesh(parent,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:72,steps:1}),mat,[0,y,0]);mesh.rotation.x=-Math.PI/2;return mesh;
 }
 function label(parent,text,w,h,p,sub=''){
  const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#08111cea';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#ad926055';ctx.lineWidth=3;ctx.strokeRect(8,8,1008,240);
  ctx.fillStyle='#e6e2d6';ctx.font='500 66px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillText(text,512,sub?116:151);if(sub){ctx.font='27px Consolas,monospace';ctx.fillStyle='#b2c7d0';ctx.fillText(sub,512,193);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const mesh=hardwareMesh(parent,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}),p);mesh.userData.dynamic=true;return mesh;
 }
 function plinth(parent,x,z,r=4.2){
  const g=new THREE.Group();g.position.set(x,-5.9,z);parent.add(g);
  for(const [a,b,h,y,mat] of [[r,r+.5,.55,0,m.dark],[r-.2,r,.16,.35,m.alloy],[r-.8,r-.3,.18,.52,m.inset],[r-.95,r-.8,.11,.67,m.brass]])cyl(g,a,b,h,[0,y,0],mat);
  for(const y of [.32,.67])ring(g,r-.12,.027,[0,y,0],m.white);
  for(let i=0;i<24;i++){const a=i*Math.PI/12;const f=part(g,.15,.35,.4,[Math.sin(a)*r,.1,Math.cos(a)*r],i%4?m.alloy:m.brass);f.rotation.y=a;}
  consolidateHardware(g);return g;
 }
 function device(parent,w,h,p,tilt=-.1){
  const g=new THREE.Group();g.position.fromArray(p);g.rotation.y=tilt;parent.add(g);
  const pane=hardwareMesh(g,bevelGeometry(w,h,.055,.10,.014),glass);pane.castShadow=pane.receiveShadow=false;
  const fixed=new THREE.Group();g.add(fixed);
  for(const side of [-1,1]){
   part(fixed,.09,h-.16,.20,[side*w/2,0,0],m.armor);part(fixed,.020,h-.48,.035,[side*(w/2-.13),0,.12],m.brass);
   for(const y of [-h*.46,-h*.26,h*.26,h*.46]){part(fixed,.32,.42,.35,[side*w/2,y,.02],m.dark);part(fixed,.11,.22,.055,[side*w/2,y,.23],m.brass);}
   part(fixed,.22,1.5,.24,[side*w*.31,-h/2-.63,-.1],m.alloy);
  }
  for(const y of [-h/2,h/2])part(fixed,w,.07,.15,[0,y,0],m.alloy);
  part(fixed,w*.18,.065,.10,[w*.28,h/2-.14,.11],m.white);part(fixed,w*.38,.08,.22,[0,-h/2-.1,.12],m.dark);
  part(fixed,w*.27,.025,.025,[0,-h/2-.02,.25],m.cyan);
  part(fixed,w*.80,.30,1.3,[0,-h/2-1.4,-.2],m.dark);consolidateHardware(fixed);
  const scan=part(g,w*.94,.020,.045,[0,-h*.47,.14],m.cyan);scan.userData.dynamic=true;
  const border=createLightFlow({parent:g,paths:[[[-w/2+.09,-h/2+.12,.19],[-w/2+.09,h/2-.12,.19],[w/2-.09,h/2-.12,.19],[w/2-.09,-h/2+.12,.19]]],color:0xffce83,radius:.012,segments:40,speed:.28});
  return {g,w:w*.94,h:h*.94,scan,border};
 }

 const architecture=new THREE.Group();root.add(architecture);
 annulus(architecture,18,57,-6.5,m.dark,.8);annulus(architecture,39,57,15.2,m.dark,.60);
 for(const y of [-6.0,15.7])for(const r of [11,17.3,35,55.5])ring(architecture,r,.11,[0,y,0],m.alloy);
 for(const r of [12.2,22.5,42.5,54.8])ring(architecture,r,.025,[0,-5.63,0],r===22.5||r===54.8?m.white:m.brass);
 const ribs=[],ribBoxes=[];
 for(let i=0;i<32;i++){
  const a=i/32*Math.PI*2,g=new THREE.Group();g.rotation.y=a;architecture.add(g);
  const rib=part(g,1.10,29,1.8,[0,7.3,56],m.dark);rib.rotation.x=-.10;ribs.push(rib);
  part(g,.24,27,.22,[.57,7.3,55.5],m.alloy);part(g,.035,23,.035,[.75,7.8,55.25],m.white);
  if(i%4===0){part(g,.78,.55,39,[0,20.2,36],m.dark);part(g,.13,.05,30,[.45,19.84,36],m.brass);}
  if(i%2===0)part(g,.24,.08,45,[0,-5.57,32],m.alloy);
  for(const y of [-3.8,12.8])part(g,10.9,.12,.12,[0,y,55],m.alloy);
  for(let k=0;k<5;k++)part(g,.38,.22,.09,[.85,1+k*2.7,55.2],k===2?m.white:m.brass);
 }
 const core=new THREE.Group();root.add(core);core.position.set(-2,4.7,0);
 const s=new THREE.Shape();s.moveTo(-2.4,2.8);s.lineTo(2.4,2.8);s.lineTo(2.35,1.8);s.lineTo(.67,1.6);s.lineTo(.67,-2.8);s.lineTo(-.67,-2.8);s.lineTo(-.67,1.6);s.lineTo(-2.35,1.8);s.closePath();
 const tg=new THREE.ExtrudeGeometry(s,{depth:.72,bevelEnabled:true,bevelSize:.1,bevelThickness:.1,bevelSegments:4,curveSegments:8});tg.translate(0,0,-.36);
 const coreArmor=m.armor.clone();coreArmor.color.set(0x3b4854);coreArmor.roughness=.34;coreArmor.envMapIntensity=1.10;
 const emblem=hardwareMesh(core,tg,coreArmor);emblem.scale.setScalar(2.65);emblem.rotation.y=-.24;
 const details=new THREE.Group();emblem.add(details);
 for(const x of [-.51,.51]){part(details,.027,4.3,.020,[x,-.55,.495],m.brass);part(details,.009,2.9,.016,[x,-.55,.52],m.white);}
 for(const x of [-1.94,1.94]){part(details,.045,.78,.06,[x,2.30,.47],m.dark);part(details,.020,.51,.02,[x,2.30,.54],m.white);}
 for(let i=0;i<6;i++)part(details,.72,.022,.025,[-.04,1.28-i*.67,.49],m.inset);
 for(const x of [-1.85,1.85])for(const y of [2.48,2.03])hardwareMesh(details,new THREE.CylinderGeometry(.042,.042,.045,8),m.brass,[x,y,.54]).rotation.x=Math.PI/2;
 consolidateHardware(details);
 const coreBase=plinth(root,-2,0,7.4);label(coreBase,'T E M',4.6,.8,[0,.18,7.55],'ORBITAL ARCHIVE');
 for(const x of [-7.4,3.4])for(const z of [-.4,.4])pipe(architecture,[[x,12,z],[x,21,z],[x,23,z]],.032,m.alloy);
 const coreRing=hardwareMesh(core,new THREE.TorusGeometry(8.7,.052,8,180),m.brass);coreRing.rotation.set(.04,-.23,.18);
 hardwareMesh(coreRing,new THREE.TorusGeometry(8.85,.02,6,100,Math.PI*.75),m.white).rotation.z=.14;
 const atmosphereDetails=createArchiveDetails({root,emblem,materials:m,compact});
 root.updateMatrixWorld(true);for(const rib of ribs)ribBoxes.push(new THREE.Box3().setFromObject(rib));consolidateHardware(architecture);

 const bays=[];
 archiveChapterOrder.forEach((key,index)=>{
  const a=archiveAngle(index),bay=new THREE.Group();bay.position.set(Math.sin(a)*22,0,Math.cos(a)*22);bay.rotation.y=a;root.add(bay);
  const primary=device(bay,9.2,12.0,[6.9,2.05,5.1],-.085);
  const base=plinth(bay,-6.3,1.2,key==='practice'?6:4.2),rig=new THREE.Group();rig.position.set(-6.3,-3.5,1.2);bay.add(rig);
  const modules=[],leaves=[],nodes=[];
  if(key==='overview'){
   for(let i=0;i<3;i++){const r=hardwareMesh(rig,new THREE.TorusGeometry(2.7+i*.23,.050,8,96,Math.PI*1.6),i===1?m.white:m.armor,[0,3.5+i*.1,0]);r.userData.dynamic=true;r.rotation.set(.55+i*.18,.25+i*.4,.17+i*.8);modules.push(r);}
   const shard=hardwareMesh(rig,new THREE.IcosahedronGeometry(.74,1),glass,[0,3.6,0]);shard.userData.dynamic=true;modules.push(shard);label(rig,'TEM—01',3,.62,[0,.44,3.4],'IDENTITY / EXPLORER');
  }else if(key==='reading'){
   for(let i=0;i<3;i++){
    const hinge=new THREE.Group();hinge.userData.dynamic=true;hinge.position.set(-3+i*2.55,3.1,(i-1)*.75);rig.add(hinge);const leaf=device(hinge,2.42,4.9,[1.21,0,0],0);leaf.g.rotation.y=(i-1)*-.30;
    hinge.userData.lightFlow=leaf.border;part(hinge,.16,5.1,.25,[0,0,0],m.brass);label(leaf.g,i===0?'理解过去':i===1?'乾元诗集':'畅想未来',2.17,.65,[0,1.25,.15],i===1?'POETRY / TEM':'READING & THOUGHT');
    for(let j=0;j<6;j++)part(leaf.g,1.65-j*.12,.017,.020,[0,.55-j*.39,.16],j===0?m.white:m.alloy);
    consolidateHardware(hinge);leaves.push(hinge);
   }
  }else if(key==='practice'){
   const positions=[[-3.6,1.5,1.6],[-1.2,1.5,-1],[1.4,1.5,-.5],[3.7,1.5,1.9]];
   positions.forEach((p,i)=>{
    const unit=new THREE.Group();unit.userData.dynamic=true;unit.position.fromArray(p);rig.add(unit);cyl(unit,1.05,1.2,.24,[0,-.75,0],m.dark);ring(unit,1.05,.026,[0,-.58,0],m.white);
    if(i===0){for(let j=0;j<9;j++){const tile=part(unit,.4,.12,.4,[(j%3-1)*.61,-.34,Math.floor(j/3)*.61-.61],j%3?m.armor:m.dark);if(j%2===0)hardwareMesh(unit,new THREE.OctahedronGeometry(.17,0),m.brass,[tile.position.x,.12,tile.position.z]);}}
    else if(i===1){part(unit,1.0,1.4,1.0,[0,.4,0],m.inset);for(const side of [-1,1])for(let j=0;j<7;j++)part(unit,.08,1.75,1.15,[side*(.6+j*.075),.38,0],j===0?m.brass:m.alloy);part(unit,.62,.025,.72,[0,1.22,0],m.cyan);}
    else if(i===2){for(let j=0;j<3;j++){const f=hardwareMesh(unit,bevelGeometry(1.5,1.5,.035,.07,.008),glass,[0,.33,j*.31-.30]);f.rotation.y=(j-1)*.18;}}
    else{const r=hardwareMesh(unit,new THREE.TorusGeometry(.9,.14,12,72),m.armor,[0,.38,0]);r.rotation.y=.35;hardwareMesh(r,new THREE.TorusGeometry(.7,.025,6,72),m.white);}
    label(unit,['GAME','AI','NARRATIVE','INTERACTIVE'][i],1.5,.40,[0,-.30,1.1]);consolidateHardware(unit);modules.push(unit);
    pipe(rig,[[p[0],.2,p[2]],[p[0]*.5,.2,p[2]+1.1],[0,.2,3.0]],.022,m.brass);
   });
  }else{
   const points=[[-4,1,-2.7],[-1.6,1.35,-.75],[.8,1.7,1],[3.3,2.1,1.9]];pipe(rig,points,.17,m.alloy);pipe(rig,points.map(p=>[p[0],p[1]+.19,p[2]]),.025,m.white);
   points.forEach((p,i)=>{const record=window.PORTFOLIO_DATA.profile.resume.experience[i];const node=new THREE.Group();node.userData.dynamic=true;node.position.fromArray(p);rig.add(node);cyl(node,.45,.6,.63,[0,.35,0],m.dark);ring(node,.48,.027,[0,.69,0],m.cyan);label(node,record?.period.split(' ')[0]||'',1.70,.62,[0,1.33,.26],record?.title||'FLIGHT LOG');consolidateHardware(node);nodes.push(node);});
  }
  consolidateHardware(rig);bays.push({bay,primary,rig,base,modules,leaves,nodes,key});
 });
 const overhead=new THREE.DirectionalLight(0xdce9ee,1.45);overhead.position.set(-14,28,28);root.add(overhead);
 const coreLight=new THREE.PointLight(0xffdbaf,105,85,2);coreLight.position.set(-5,14,12);root.add(coreLight);
 const keyLight=new THREE.PointLight(0xffdeba,115,48,2),panelLight=new THREE.PointLight(0x92c8df,32,23,2);root.add(keyLight,panelLight);
 const count=compact()?380:1000,positions=new Float32Array(count*3),sizes=new Float32Array(count);let seed=321;
 for(let i=0;i<count;i++){seed=(seed*1664525+1013904223)>>>0;const a=seed/4294967296*Math.PI*2;seed=(seed*1664525+1013904223)>>>0;const r=10+seed/4294967296*44;positions.set([Math.sin(a)*r,(i*.618%1)*22-4,Math.cos(a)*r],i*3);sizes[i]=.035+(i%17===0?.08:.015);}
 const dustU={time:{value:0},energy:{value:0},height:{value:innerHeight}};
 const dustG=new THREE.BufferGeometry();dustG.setAttribute('position',new THREE.BufferAttribute(positions,3));dustG.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));
 const dust=new THREE.Points(dustG,new THREE.ShaderMaterial({uniforms:dustU,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'uniform float time,energy,height;attribute float aSize;varying float alpha;void main(){vec3 p=position;p.y+=sin(p.x*.11+time*.13)*.28;p.x+=sin(p.z*.12+time*.07)*.23;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*height/max(1.,-mv.z),.6,3.4);float glow=.35+energy*.35;alpha=glow*smoothstep(1.,6.,-mv.z);}',fragmentShader:'varying float alpha;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(.9,.81,.65,exp(-r*r*24.)*alpha);}'}));root.add(dust);

 let chapter=0,lastStep='',age=0,interaction=0,focused=-1,panel,projection,tick=0;
 addEventListener('tem:surface',()=>{panel=document.querySelector('.archive-glass-panel');projection=document.querySelector('.archive-projection');});
 addEventListener('tem:archive-chapter',e=>{chapter=Math.max(0,archiveChapterOrder.indexOf(e.detail.tab));age=0;focused=-1;});
 document.addEventListener('pointerover',e=>{const row=e.target.closest('[data-archive-item]');if(row){focused=Number(row.dataset.archiveItem);interaction=1;}});
 document.addEventListener('focusin',e=>{const row=e.target.closest('[data-archive-item]');if(row){focused=Number(row.dataset.archiveItem);interaction=1;}});
 document.addEventListener('click',e=>{if(e.target.closest('.archive-glass-panel button,.archive-glass-panel summary'))interaction=1;});
 function layout(){
  const mobile=compact();bays.forEach(({primary,rig,base})=>{
   primary.g.position.set(mobile?0:6.9,mobile?-3.65:2.05,mobile?7:5.1);primary.g.rotation.y=mobile?0:-.085;
   primary.g.scale.set(mobile?1.06:1,mobile?.90:1,1);
   rig.position.set(mobile?0:-6.3,mobile?4.1:-3.5,mobile?3:1.2);rig.scale.setScalar(mobile?.60:1);base.visible=!mobile;
  });
 }
 layout();addEventListener('resize',layout);
 return {update(dt,time,frame,motion){
  const entry=frame.step==='captain',map=frame.step==='map'||frame.step==='boot';
  const arrival=frame.opening&&frame.introFrame.time>10;
  root.visible=entry||map||arrival;if(!root.visible)return;
  core.visible=!map;coreBase.visible=!map;
  coreLight.intensity=map?48:105;overhead.intensity=map?.75:1.45;
  if(frame.step!==lastStep){lastStep=frame.step;age=0;panel=document.querySelector('.archive-glass-panel');projection=document.querySelector('.archive-projection');chapter=Math.max(0,archiveChapterOrder.indexOf(document.body.dataset.archiveChapter||'overview'));}
  age+=dt;interaction=motion?interaction*Math.exp(-dt*2.5):0;
  const nearest=frame.archiveProgress??chapter,error=Math.abs(nearest-chapter);
  const angle=archiveAngle(nearest);keyLight.position.set(Math.sin(angle)*30-Math.cos(angle)*4,9,Math.cos(angle)*30+Math.sin(angle)*4);
  panelLight.position.set(Math.sin(angle)*28+Math.cos(angle)*6,4,Math.cos(angle)*28-Math.sin(angle)*6);
  keyLight.intensity=map?12:115+interaction*55;panelLight.intensity=map?8:32+interaction*35;
  const deploy=motion?THREE.MathUtils.smoothstep(age,.13,.95)*Math.max(0,1-THREE.MathUtils.smoothstep(error,.12,.46)):1;
  document.body.style.setProperty('--archive-entry',deploy.toFixed(4));document.body.style.setProperty('--archive-scan',Math.min(1,age/1.0).toFixed(4));
  bays.forEach((bay,i)=>{
   bay.bay.visible=!map;
   bay.primary.border.update(time,i===chapter?.70+interaction*.8:.20,Boolean(motion));
   bay.primary.scan.position.y=-6+Math.min(1,age/.9)*12;bay.primary.scan.visible=entry&&i===chapter&&age<.95&&Boolean(motion);
   bay.leaves.forEach((leaf,j)=>{const target=(j-1)*-.23+(i===chapter?(focused===j?.28:0):-.18);leaf.rotation.y=THREE.MathUtils.damp(leaf.rotation.y,target,4,dt);leaf.userData.lightFlow.update(time,focused===j?1.2:.35,Boolean(motion));});
   bay.modules.forEach((unit,j)=>{if(unit.isGroup){unit.position.y=THREE.MathUtils.damp(unit.position.y,1.5+(focused===j?.65:0),5,dt);unit.rotation.y=motion?Math.sin(time*.13+j)*.10:0;}else if(i===0){unit.rotation.y=time*.09*motion;unit.rotation.z=time*.035*motion;}});
   bay.nodes.forEach((node,j)=>{node.scale.setScalar(THREE.MathUtils.damp(node.scale.x,focused===j?1.12:1,5,dt));});
  });
  coreRing.rotation.y=-.23+Math.sin(time*.04)*.04*motion;dustU.time.value=time*motion;dustU.energy.value=interaction;dustU.height.value=innerHeight;
  atmosphereDetails.update(time,Boolean(motion),interaction+Math.min(1,frame.speed)*.35);
  if(entry&&panel){const device=bays[chapter].primary;const shown=projectWorldSurface({object:device.g,camera,element:panel,w:device.w,h:device.h,width:640,height:850,ready:deploy>.94&&!frame.archiveMoving});
   panel.style.opacity=(shown?deploy:0).toFixed(3);if(tick++%3===0)clipForeground({element:projection,camera,surface:device.g,boxes:ribBoxes});
  }
  const canvas=document.getElementById('space');canvas.dataset.archive='orbital-physical-world';canvas.dataset.archiveChapter=archiveChapterOrder[chapter];canvas.dataset.archiveAngle=(nearest*90).toFixed(1);
 }};
}





