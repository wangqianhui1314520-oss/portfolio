// One wheel gesture selects one bay. Momentum cannot skip an unread chapter.
export const archiveChapterOrder=['overview','reading','practice','records'];
export const archiveStationX=tab=>Math.max(0,archiveChapterOrder.indexOf(tab))*36;
export function createArchiveWheel(){
 let sum=0,last=-Infinity,lockedUntil=-Infinity;
 return {push(delta,now){
  if(!Number.isFinite(delta)||!Number.isFinite(now)||now<lockedUntil)return 0;
  if(now-last>220||Math.sign(delta)!==Math.sign(sum))sum=0;
  last=now;sum+=Math.max(-120,Math.min(120,delta));
  if(Math.abs(sum)<65)return 0;
  const direction=Math.sign(sum);sum=0;lockedUntil=now+1550;return direction;
 },reset(){sum=0;last=-Infinity;lockedUntil=-Infinity;}};
}
