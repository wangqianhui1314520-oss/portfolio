// Shared world coordinates for the environment, camera and accessible surfaces.
export const archiveChapterOrder=['overview','reading','practice','records'];
export const archiveCenter=[0,0,-27];
export const archiveAngle=progress=>Math.max(0,Math.min(3,Number(progress)||0))*Math.PI/2;
export function archivePose(progress,compact=false){
 const a=archiveAngle(progress),radius=compact?52:47;
 const lift=Math.sin((Number(progress)||0)*Math.PI)*.55;
 return {position:[Math.sin(a)*radius,2.7+lift,archiveCenter[2]+Math.cos(a)*radius],look:[Math.sin(a)*22,compact?2.7:2.0,archiveCenter[2]+Math.cos(a)*22],fov:compact?55:49};
}
// The welcome overlooks the observatory. Choosing About moves to its reading
// distance; the compact layout keeps its established device/text framing.
export function archiveWelcomePose(compact=false){
 const pose=archivePose(0,compact);
 return compact?pose:{position:[-1.4,4.4,23.2],look:[.7,2.5,-5],fov:pose.fov};
}
export function createArchiveRail(initial=0){
 let progress=Math.max(0,Math.min(3,initial)),target=progress,lastInput=-Infinity,commanded=false;
 const clamp=n=>Math.max(0,Math.min(3,n));
 return {
  get progress(){return progress;},get target(){return target;},get index(){return Math.round(progress);},
  get moving(){return Math.abs(progress-target)>.006;},
  // A direct chapter choice owns the selected UI until its camera arrives.
  get commanded(){return commanded;},
  push(delta,now){
   if(!Number.isFinite(delta)||!Number.isFinite(now))return target;
   lastInput=now;commanded=false;
   // Limit lead over the real camera so wheel inertia cannot queue distant shots.
   target=clamp(Math.max(progress-.85,Math.min(progress+.85,target+Math.max(-220,Math.min(220,delta))/210)));
   return target;
  },
  select(index,immediate=false){if(!Number.isFinite(index))return;target=clamp(Math.round(index));lastInput=-Infinity;commanded=!immediate;if(immediate)progress=target;},
  update(dt,now,motion=true){
   if(now-lastInput>190)target=Math.round(target);
   progress=motion?progress+(target-progress)*(1-Math.exp(-Math.max(0,Math.min(.12,dt))*5.2)):Math.round(target);
   if(Math.abs(target-progress)<.0008){progress=target;commanded=false;}
   return progress;
  }
 };
}
export const archiveRail=createArchiveRail();
