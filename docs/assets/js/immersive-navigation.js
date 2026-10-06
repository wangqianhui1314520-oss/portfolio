import * as THREE from 'three';
import { journey,subscribe,getRevision } from './immersive-session.js?v=cinematic-v21.1';
import { transitionDurations } from './immersive-journey.js?v=cinematic-v21.1';
import { createSpatialWorld } from './immersive-spatial.js?v=cinematic-v21.1';
import { opening,updateOpening } from './immersive-intro.js?v=cinematic-v21.1';
import { cinematicEase } from './immersive-easing.js?v=cinematic-v21.1';
import {archivePose,archiveWelcomePose,archiveRail,archiveChapterOrder} from './immersive-archive-path.js?v=cinematic-v21.1';

export function createNavigation({scene,camera,interaction}){
 const world=createSpatialWorld({scene,camera,interaction});
 let renderedArchiveProgress=archiveRail.progress,archiveVelocity=0,navigationInitialized=false;
 // Welcome and About occupy two nearby viewpoints in the same observatory.
 const poseFor=state=>{
  if(state.step!=='bridge'){
   const pose=world.pose(state);
   if(state.step==='captain'){
    const p=archivePose(renderedArchiveProgress,innerWidth<700);pose.position.fromArray(p.position);pose.look.fromArray(p.look);pose.fov=p.fov;
    if(innerWidth>=700){
     const rail=THREE.MathUtils.clamp(renderedArchiveProgress,0,3),index=Math.floor(rail),blend=smooth(rail-index),next=Math.min(3,index+1);
     const lenses=[49,47.8,50,48.5],lifts=[0,.30,-.12,.24];
     pose.fov=THREE.MathUtils.lerp(lenses[index],lenses[next],blend);
     const lift=THREE.MathUtils.lerp(lifts[index],lifts[next],blend);pose.position.y+=lift;pose.look.y+=lift*.35;
    }
   }
   return pose;
  }
  const p=archiveWelcomePose(innerWidth<700);
  return {position:new THREE.Vector3(...p.position),look:new THREE.Vector3(...p.look),fov:p.fov};
 };
 const initial=poseFor(journey.state),base=initial.position.clone(),look=initial.look.clone();
 const from=base.clone(),to=base.clone(),lookFrom=look.clone(),lookTo=look.clone();
 const openingRoute=new THREE.CatmullRomCurve3([[-260,95,1650],[-200,110,1270],[-112,72,690],[-118,53,275],[-82,34,140],[-48,20,106],[-18,8,67],archiveWelcomePose(innerWidth<700).position].map(a=>new THREE.Vector3(...a)),false,'centripetal');
 const introPosition=new THREE.Vector3(),introLook=new THREE.Vector3(),parallax=new THREE.Vector3(),parallaxRight=new THREE.Vector3();
 const previousCamera=initial.position.clone(),heldPosition=new THREE.Vector3(),heldRotation=new THREE.Quaternion(),parallaxTarget=new THREE.Vector3();let wasOpening=false,readingHeld=false,heldFov=camera.fov;
 let step='bridge',age=0,duration=1,finished=false,revision=0,speed=0,previous=base.clone(),targetFov=initial.fov,fromFov=camera.fov,enabled=true,shotPath=null;
 let dragStart=null,releasedSurfaces=[];
 const orbit=new THREE.Vector2(),orbitTarget=new THREE.Vector2(),offset=new THREE.Vector3();
 const resetView=document.getElementById('resetView');
 const canOrbit=()=>['bridge','captain','map','arrival','signals','target','docked'].includes(step)&&!opening.active;
 const blockedUI='button,a,summary,video,dialog,.experience-settings,.surface-content,.project-detail,.about-surface,.approach-copy,.bridge-header,.journey-dock';
 const resetOrbit=()=>{orbitTarget.set(0,0);dragStart=null;delete document.body.dataset.orbiting;};
 function composeShot(){
   const delta=to.clone().sub(from),distance=delta.length(),compact=innerWidth<700;
   if(distance<.01||(step==='captain'&&distance<1))return null;
   const side=new THREE.Vector3().crossVectors(delta,new THREE.Vector3(0,1,0)).normalize();
   const first=from.clone().lerp(to,.30),second=from.clone().lerp(to,.72);
   if(step==='travel'){
     first.addScaledVector(side,Math.min(80,distance*.10));first.y+=Math.min(28,distance*.04);
     second.addScaledVector(side,-Math.min(18,distance*.022));second.y+=Math.min(13,distance*.015);
   }else if(step==='target'){
     first.addScaledVector(side,compact?2.5:9);first.y+=compact?1:4;
     second.addScaledVector(side,compact?1:4);second.y+=2;
   }else if(step==='captain'){
     first.x-=.65;first.y+=.28;second.x-=.25;second.y+=.13;
   }else if(step==='map'||step==='boot'){
     first.add(new THREE.Vector3(compact?0:-2.4,compact?.5:1.8,2.2));
     second.add(new THREE.Vector3(compact?0:-.7,.45,.7));
   }else if(step==='docking'){
     first.copy(from).add(new THREE.Vector3(compact?1.2:4,-2.2,-1.4));
     second.copy(to).add(new THREE.Vector3(compact?.5:2,-1.2,-.7));
   }else return null;
   return new THREE.CatmullRomCurve3([from.clone(),first,second,to.clone()],false,'centripetal');
 }
 resetView.addEventListener('click',resetOrbit);
 const state=()=>{
   const s=journey.state;if(s.step==='captain'&&step!=='captain'){
    archiveRail.select(Math.max(0,archiveChapterOrder.indexOf(document.body.dataset.archiveChapter||'overview')),true);
    renderedArchiveProgress=archiveRail.progress;archiveVelocity=0;
   }
   // A choice continues from the rendered pose instead of the pre-orbit bookkeeping pose.
   if(!opening.active&&navigationInitialized){const distance=Math.max(1,base.distanceTo(look));base.copy(camera.position);camera.getWorldDirection(introLook);look.copy(camera.position).addScaledVector(introLook,distance);}
   step=s.step;revision=getRevision();const pose=poseFor(s);from.copy(base);to.copy(pose.position);lookFrom.copy(look);lookTo.copy(pose.look);
   age=0;duration=(transitionDurations[step]||(step==='captain'?2250:['target','signals'].includes(step)?1600:1100))/1000;
   if(from.distanceToSquared(to)<.000001&&lookFrom.distanceToSquared(lookTo)<.000001)duration=.001;
   fromFov=camera.fov;targetFov=pose.fov;shotPath=composeShot();finished=false;resetOrbit();
   // The captured pose already contains these offsets. Reapplying them would
   // move the first frame of a new shot twice before inertia catches up.
   orbit.set(0,0);parallax.set(0,0,0);navigationInitialized=true;
   document.getElementById('space').dataset.journey=step;
 };
 subscribe(state);state();camera.position.copy(base);
 let lastArchiveIndex=archiveRail.index;
 addEventListener('tem:archive-chapter',e=>{if(journey.state.step==='captain'&&e.detail.source!=='orbit')archiveRail.select(archiveChapterOrder.indexOf(e.detail.tab));});
 addEventListener('resize',()=>{const p=poseFor(journey.state);to.copy(p.position);lookTo.copy(p.look);openingRoute.points.at(-1).fromArray(archiveWelcomePose(innerWidth<700).position);openingRoute.updateArcLengths();from.copy(base);lookFrom.copy(look);fromFov=camera.fov;targetFov=p.fov;shotPath=null;age=0;duration=.5;world.layout();});
 addEventListener('pointerdown',e=>{if(e.button!==0||!canOrbit()||e.target.closest(blockedUI))return;dragStart={x:e.clientX,y:e.clientY,yaw:orbitTarget.x,pitch:orbitTarget.y};});
 addEventListener('pointermove',e=>{if(!dragStart)return;const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;
  if(Math.hypot(dx,dy)>8)document.body.dataset.orbiting='true';
  orbitTarget.set(THREE.MathUtils.clamp(dragStart.yaw-dx/innerWidth*.7,-.24,.24),THREE.MathUtils.clamp(dragStart.pitch-dy/innerHeight*.3,-.11,.11));
 });
 const release=()=>{dragStart=null;delete document.body.dataset.orbiting;};
 addEventListener('pointerup',release);addEventListener('pointercancel',release);addEventListener('blur',release);
 return {opticalAnchor:()=>world.opticalAnchor(),update(dt,pointer,time,motion,wallDt=dt){
   previousCamera.copy(camera.position);
   const holdReading=Boolean(document.body.dataset.reading);
   if(holdReading&&!readingHeld){heldPosition.copy(camera.position);heldRotation.copy(camera.quaternion);heldFov=camera.fov;}
   readingHeld=holdReading;
   const intro=updateOpening(wallDt),introFrame=opening.frame;
   if(wasOpening&&!opening.active&&step==='bridge'&&motion&&document.body.dataset.openingResult==='skipped'){
    state();duration=.85;
   }
   age+=wallDt;const p=motion?Math.min(1,age/duration):1,e=cinematicEase(p);
   previous.copy(base);if(p>=1)base.copy(to);else if(shotPath&&motion)shotPath.getPointAt(e,base);else base.lerpVectors(from,to,e);
   look.lerpVectors(lookFrom,lookTo,e);
   if(step==='docking'&&motion&&innerWidth>=700)look.y-=10.2*dockingAimDip(p);
   if(step==='captain'&&p>=1){
    archiveRail.update(dt,performance.now(),Boolean(motion));
    [renderedArchiveProgress,archiveVelocity]=followArchiveRail(renderedArchiveProgress,archiveVelocity,archiveRail.progress,dt,Boolean(motion));
    const pose=poseFor(journey.state);base.copy(pose.position);look.copy(pose.look);targetFov=pose.fov;
    const nearest=Math.round(renderedArchiveProgress),settled=!archiveRail.moving&&Math.abs(renderedArchiveProgress-archiveRail.progress)<.004&&Math.abs(archiveVelocity)<.025;
    if(lastArchiveIndex!==nearest&&(!archiveRail.commanded||settled)){lastArchiveIndex=nearest;dispatchEvent(new CustomEvent('tem:archive-nearest',{detail:{tab:archiveChapterOrder[lastArchiveIndex]}}));}
   }
   speed=THREE.MathUtils.damp(speed,Math.min(2.5,base.distanceTo(previous)/Math.max(dt,.001)*.018),4,dt);
   if(!readingHeld)orbit.lerp(orbitTarget,1-Math.exp(-dt*6));
   camera.position.copy(base);const reading=['captain','docked'].includes(step);
   if(canOrbit()&&motion){offset.copy(base).sub(look);offset.applyAxisAngle(new THREE.Vector3(0,1,0),orbit.x);const radius=offset.length();offset.y+=Math.sin(orbit.y)*radius;camera.position.copy(look).add(offset);}
   resetView.hidden=!motion||!canOrbit()||orbit.length()<.004;
   document.getElementById('space').dataset.viewAngle=`${(orbit.x*(motion||readingHeld)).toFixed(3)},${(orbit.y*(motion||readingHeld)).toFixed(3)}`;
   parallaxTarget.set(0,0,0);
   if(!opening.active&&!wasOpening){
    // Translate eye and aim together: close objects move more than the distant
    // sky while projected content keeps its physical, readable world surface.
    parallaxRight.copy(base).sub(look).cross(new THREE.Vector3(0,1,0)).normalize();
    const inputGain=cinematicEase(Math.min(1,p/.35));
    parallaxTarget.copy(parallaxRight).multiplyScalar(-pointer.x*(reading?.85:1.8)*motion*inputGain);
    parallaxTarget.y-=pointer.y*(reading?.38:.72)*motion*inputGain;
   }
   if(motion)parallax.lerp(parallaxTarget,1-Math.exp(-dt*6));else if(!readingHeld)parallax.set(0,0,0);
   if(!opening.active&&!wasOpening)camera.position.add(parallax);
   if(step==='bridge'&&opening.active&&motion){
    if(!opening.started){camera.position.set(-40,12,270);camera.lookAt(new THREE.Vector3(105,28,-500));}
    else if(opening.duration<=2){camera.position.add(new THREE.Vector3(-1,0,2).multiplyScalar(1-smooth(intro)));camera.lookAt(look);}
    else{openingRoute.getPointAt(introFrame.route,introPosition);camera.position.copy(introPosition);
     introLook.fromArray(openingLookPoint(introFrame.time,archiveWelcomePose(innerWidth<700).look));camera.lookAt(introLook);
     camera.rotateZ(Math.sin(introFrame.route*Math.PI)*.012);}
   }else camera.lookAt(introLook.copy(look).add(parallax));
   const arch=Math.sin(p*Math.PI)*motion;
   if(step==='travel')camera.rotateZ(arch*.017);else if(step==='target')camera.rotateZ(-arch*.022);else if(step==='docking')camera.rotateZ(-arch*.008);
   const lensFov=step==='bridge'&&opening.active?introFrame.fov+(targetFov-52)*smooth(introFrame.route):THREE.MathUtils.lerp(fromFov,targetFov,e)+(step==='travel'?6:step==='target'?1.8:step==='docking'?-.6:0)*arch;
   camera.fov=motion?THREE.MathUtils.damp(camera.fov,lensFov,7,dt):targetFov;if(wasOpening&&!opening.active)camera.fov=targetFov;
   // Reading pauses the rendered shot, including its orbit and pointer offset.
   // Removing motion alone would snap the eye to the unmodified base position.
   if(readingHeld){camera.position.copy(heldPosition);camera.quaternion.copy(heldRotation);camera.fov=heldFov;}
   camera.updateProjectionMatrix();camera.updateMatrixWorld();
   const archiveMoving=step==='captain'&&(p<1||archiveRail.moving||Math.abs(renderedArchiveProgress-archiveRail.progress)>.004||Math.abs(archiveVelocity)>.025);
   document.body.dataset.moving=p<1||archiveMoving||(opening.active&&introFrame.route<1)?'true':'false';
   document.getElementById('space').dataset.shotPhase=step==='docking'?(p<.34?'alignment':p<.86?'deployment':'settle'):p<1?'tracking':'hold';
   interaction?.update(dt,pointer,camera,motion,step,opening.active);
   world.update(dt,time,motion,{progress:p,age,duration});
   if(p>=1&&!finished&&enabled){finished=true;const detail={step,revision};if(['boot','travel','docking'].includes(step))queueMicrotask(()=>dispatchEvent(new CustomEvent('tem:arrived',{detail})));}
   const introSpeed=opening.active&&opening.ready&&wasOpening?Math.min(2.5,camera.position.distanceTo(previousCamera)/Math.max(dt,.001)*.006):0;wasOpening=opening.active;
   return {flight:25-camera.position.z,speed:Math.max(speed,introSpeed)*motion,presence:step==='bridge'?1:0,position:camera.position,step,sector:journey.state.sector,shotProgress:p,archiveProgress:step==='bridge'?0:renderedArchiveProgress,archiveMoving,intro,opening:opening.active,introFrame,fullOpening:opening.active&&opening.duration>2};
 },fallback(){enabled=false;resetOrbit();resetView.hidden=true;releasedSurfaces=releaseWorldSurfaces();},restore(){
   enabled=true;
   for(const element of new Set([...releasedSurfaces,...document.querySelectorAll('[data-world-anchor]')]))if(element.isConnected!==false){element.style.visibility='hidden';element.style.pointerEvents='none';element.inert=true;}
   releasedSurfaces=[];document.body.classList.add('world-anchored');state();
 }};
}
function releaseWorldSurfaces(){
 delete document.body.dataset.moving;delete document.body.dataset.orbiting;
 document.body.classList.remove('world-anchored');
 const surfaces=[...document.querySelectorAll('[data-world-anchor],[data-world-mounted]')];
 surfaces.forEach(el=>{
  el.style.transform='';el.style.visibility='';el.style.pointerEvents='';el.inert=false;
  if(el.dataset.worldMounted){
   delete el.dataset.worldMounted;
   for(const key of ['width','height','left','top'])el.style[key]='';
  }
 });
 return surfaces;
}
function smooth(t){return t*t*(3-2*t);}
function followArchiveRail(progress,velocity,target,dt,motion=true){
 if(!motion)return [target,0];
 const age=Math.max(0,Math.min(.12,Number.isFinite(dt)?dt:0)),omega=11;
 const offset=progress-target,carry=(velocity+omega*offset)*age,decay=Math.exp(-omega*age);
 let next=target+(offset+carry)*decay,nextVelocity=(velocity-omega*carry)*decay;
 if(next<0||next>3){next=Math.max(0,Math.min(3,next));nextVelocity=0;}
 if(Math.abs(next-target)<.00035&&Math.abs(nextVelocity)<.006)return [target,0];
 return [next,nextVelocity];
}
function dockingAimDip(progress){const p=Math.max(0,Math.min(1,progress));return 64*Math.pow(p*(1-p),3);}
function openingLookPoint(seconds,welcome){
 const t=Math.max(0,Number.isFinite(seconds)?seconds:14),far=[45,72,-720],planet=[210,-120,-760],near=[24,18,-140];
 if(t>=11.5)return welcome.slice();
 let from,to,progress;
 if(t<2){from=to=far;progress=0;}
 else if(t<6.2){from=far;to=planet;progress=(t-2)/4.2;}
 else if(t<9){from=planet;to=near;progress=(t-6.2)/2.8;}
 else {from=near;to=welcome;progress=(t-9)/2.5;}
 const p=cinematicEase(progress);return from.map((value,index)=>value+(to[index]-value)*p);
}
