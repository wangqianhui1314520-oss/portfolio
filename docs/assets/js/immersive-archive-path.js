// Shared world coordinates for the environment, camera and accessible surfaces.
export const archiveChapterOrder=['overview','reading','practice','records'];
export const archiveCenter=[0,0,-27];
export const archiveAngle=progress=>Math.max(0,Math.min(3,Number(progress)||0))*Math.PI/2;
export function archiveFraming(compact=false,aspect=16/9){
 if(compact||!Number.isFinite(aspect)||aspect<=0)return {fov:compact?55:49,shift:0,typeScale:1};
 const amount=Math.max(0,Math.min(1,(1.70-aspect)/.55));
 // Fit the actual pressure screen and T together instead of translating the
 // eye left until the crystal leaves the frame. Wide desktop stays unchanged.
 let fov=49+amount*8.5;
 if(aspect<1.10)fov=2*Math.atan(Math.tan(fov*Math.PI/360)*1.10/aspect)*180/Math.PI;
 return {fov,shift:amount*3.0,typeScale:Math.tan(fov*Math.PI/360)/Math.tan(49*Math.PI/360)};
}
export function archivePose(progress,compact=false,aspect=16/9){
 const a=archiveAngle(progress),radius=compact?52:47;
 const lift=Math.sin((Number(progress)||0)*Math.PI)*.55;
 const pose={position:[Math.sin(a)*radius,2.7+lift,archiveCenter[2]+Math.cos(a)*radius],look:[Math.sin(a)*22,compact?2.7:2.0,archiveCenter[2]+Math.cos(a)*22],fov:compact?55:49};
 frameArchivePose(pose,compact,aspect,a);
 if(!compact){
  const rail=Math.max(0,Math.min(3,Number(progress)||0)),index=Math.floor(rail),fraction=rail-index,blend=fraction*fraction*(3-2*fraction),next=Math.min(3,index+1);
  const lenses=[49,47.8,50,48.5],lifts=[0,.30,-.12,.24];
  // Preserve each chapter's authored lens while applying the same framing
  // magnification as the pressure-screen typography. Navigation uses this
  // complete pose, so a second lens override cannot crop the real model.
  const lens=lenses[index]+(lenses[next]-lenses[index])*blend;
  pose.fov=2*Math.atan(Math.tan(lens*Math.PI/360)*archiveFraming(false,aspect).typeScale)*180/Math.PI;
  const offset=lifts[index]+(lifts[next]-lifts[index])*blend;pose.position[1]+=offset;pose.look[1]+=offset*.35;
 }
 return pose;
}
// The welcome overlooks the observatory. Choosing About moves to its reading
// distance; the compact layout keeps its established device/text framing.
export function archiveWelcomePose(compact=false,aspect=16/9){
 return compact?archivePose(0,true,aspect):frameArchivePose({position:[-1.4,4.4,23.2],look:[.7,2.5,-5],fov:49},false,aspect,0);
}
function frameArchivePose(pose,compact,aspect,angle){
 if(compact||!Number.isFinite(aspect)||aspect<=0)return pose;
 // Reframe the eye and aim together on a tablet. The physical screen, DOM
 // projection and authored objects stay attached to the same world surface.
 const {fov,shift}=archiveFraming(compact,aspect);pose.fov=fov;
 for(const point of [pose.position,pose.look]){point[0]-=Math.cos(angle)*shift;point[2]+=Math.sin(angle)*shift;}
 return pose;
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
