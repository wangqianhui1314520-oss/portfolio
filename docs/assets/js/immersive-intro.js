import {getMotionPreference} from './runtime-settings.js';
import { journey, navigate } from './immersive-session.js?v=cinematic-v21.1';
import { OPENING_DURATION,openingTimeline } from './immersive-opening-timeline.js?v=cinematic-v21.1';
import { createOpeningPlayback } from './immersive-opening-playback.js?v=cinematic-v21.1';

// The voyage ends at a held welcome. Only a visitor's choice opens an archive or flight.
const playback=createOpeningPlayback(OPENING_DURATION);
export const opening=playback.state;opening.frame=openingTimeline(0);
const reduce=getMotionPreference();
const body=document.body;
body.dataset.opening='loading';
const skip=document.getElementById('skipOpening'),status=document.getElementById('openingStatus');
const header=document.querySelector('.bridge-header'),ui=document.getElementById('expeditionUI');
const launch=document.getElementById('openingLaunch'),start=document.getElementById('startOpening');
const launchText=document.getElementById('launchButtonText'),readiness=document.getElementById('launchReadiness');
const launchDescription=document.getElementById('launchDescription');
ui.inert=true;header.inert=true;
let lastBeat='';
// A monotone Hermite flight keeps momentum across the narrative beats. The
// original choreography still controls the reveal, warp and visitor choices.
function openingFlightProgress(seconds){
 const points=[[0,0],[2,.035],[5,.63],[6.2,.82],[9,.89],[11.5,1]];
 const t=Math.max(0,Math.min(11.5,Number.isFinite(seconds)?seconds:11.5));
 if(t===0)return 0;if(t===11.5)return 1;
 const slope=index=>{
  if(index===0||index===points.length-1)return 0;
  const h0=points[index][0]-points[index-1][0],h1=points[index+1][0]-points[index][0];
  const d0=(points[index][1]-points[index-1][1])/h0,d1=(points[index+1][1]-points[index][1])/h1;
  return 3*(h0+h1)/((2*h1+h0)/d0+(h1+2*h0)/d1);
 };
 const index=points.findIndex((point,i)=>i<points.length-1&&t>=point[0]&&t<points[i+1][0]);
 const [a,y0]=points[index],[b,y1]=points[index+1],h=b-a,u=(t-a)/h,u2=u*u,u3=u2*u;
 const value=(2*u3-3*u2+1)*y0+(u3-2*u2+u)*h*slope(index)+(-2*u3+3*u2)*y1+(u3-u2)*h*slope(index+1);
 return Math.max(y0,Math.min(y1,value));
}
function publish(frame){
 if(opening.duration>2)frame={...frame,route:openingFlightProgress(frame.time)};
 opening.frame=frame;body.style.setProperty('--intro',opening.progress);
 for(const key of ['bridge','panel','identity','actions','header','black','bars'])body.style.setProperty('--opening-'+key,frame[key].toFixed(4));
 body.dataset.openingShot=frame.beat;
 if(lastBeat!==frame.beat){lastBeat=frame.beat;status.textContent=({departure:'深空启航 / DEPARTURE',nebula:'穿越星云 / THROUGH THE NEBULA',warp:'曲率跃迁 / SPACEFOLD',vista:'抵达创作星系 / A WORLD BEYOND',gateway:'通过轨道船坞 / APPROACHING TEM—01',identity:'我是 Tem。欢迎来到我的创作宇宙。'})[frame.beat];dispatchEvent(new CustomEvent('tem:opening-beat',{detail:{beat:frame.beat}}));}
}
function finish(reason='complete'){
 const firstArrival=opening.active;
 playback.finish();publish(openingTimeline(OPENING_DURATION));
 body.dataset.opening='complete';body.dataset.openingResult=reason;
 ui.inert=false;header.inert=false;launch.hidden=true;skip.hidden=true;
 if(firstArrival){
  status.textContent='我是 Tem。选择欣赏作品，或进入我的个人空间。';
  document.getElementById('statusAnnouncement').textContent=status.textContent;
  dispatchEvent(new CustomEvent('tem:opening-complete',{detail:{reason}}));
 }
}
function prepare(){
 launch.hidden=false;start.disabled=false;body.dataset.opening='waiting';
 launchText.textContent=reduce.matches?'抵达 Tem 的世界':'启航 · 播放宇宙序章';
 launchDescription.innerHTML=reduce.matches?'动态效果已简化。<br>抵达后，自由选择欣赏作品或了解我。':'一段宇宙旅程，从这里开始。<br>抵达后，自由选择欣赏作品或了解我。';
 readiness.textContent=opening.ready?(reduce.matches?'已按设备偏好减少动态效果':'航道已就绪 · 等待你的启航指令'):'点击启航，加载创作宇宙';
 skip.textContent='直接抵达 Tem ↗';
 skip.setAttribute('aria-label','跳过宇宙航行，抵达 Tem 的欢迎场景');
 publish({...openingTimeline(0),black:.28});
}
function begin(){
 dispatchEvent(new Event('tem:opening-start'));
 if(body.classList.contains('scene-fallback')){finish('graphics-fallback');return;}
 if(!playback.start())return;
 readiness.textContent='正在加载宇宙…';
 launch.hidden=true;skip.hidden=false;skip.textContent='跳过序章 ↗';
 publish(openingTimeline(0));
 if(reduce.matches)finish('reduced-motion');else body.dataset.opening=opening.ready?'playing':'loading';
}
function skipToWelcome(){
 // Keyboard and button shortcuts use the same lazy graphics entry point.
 dispatchEvent(new Event('tem:opening-skip'));
 finish('skipped');
}
function ready(){playback.ready();if(!opening.active)return;if(opening.started){if(reduce.matches)finish('reduced-motion');else body.dataset.opening='playing';}else prepare();}
start.addEventListener('click',begin);
skip.addEventListener('click',skipToWelcome);
document.getElementById('replayOpening').addEventListener('click',()=>{document.querySelector('.experience-settings').open=false;navigate('home');playback.reset();lastBeat='';ui.inert=true;header.inert=true;begin();});
addEventListener('keydown',event=>{if(opening.active&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();skipToWelcome();}},{capture:true});
addEventListener('tem:scene-ready',ready);
addEventListener('tem:scene-failed',()=>finish('graphics-fallback'));
// The fallback page must remain usable even when the graphics module cannot load.
let graphicsTimeout;addEventListener('tem:graphics-request',()=>{graphicsTimeout=setTimeout(()=>{if(!opening.ready&&!body.classList.contains('webgl-ready')){dispatchEvent(new Event('tem:scene-failed'));finish('graphics-timeout');}},20000);});
addEventListener('tem:direct-entry',()=>finish('direct-entry'));
reduce.addEventListener('change',()=>{if(!opening.active)return;if(opening.started&&reduce.matches)finish('reduced-motion');else if(!opening.started)prepare();});
prepare();
export function updateOpening(dt){
 if(!opening.active)return 1;
 if(journey.state.step!=='bridge'){finish();return 1;}
 if(!opening.ready||!opening.started)return 0;
 playback.advance(dt);
 publish(openingTimeline(opening.age));
 // The final reveal is part of the movie; controls unlock when it has fully finished.
 ui.inert=true;header.inert=true;
 if(opening.progress>=1)finish();
 return opening.progress;
}




