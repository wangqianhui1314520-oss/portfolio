import {journey,subscribe} from './immersive-session.js?v=cinematic-v21.19';
import {getMotionPreference} from './runtime-settings.js?v=cinematic-v21.19';

// v22 tactical HUD, DOM and SVG only: a reticle that snaps to controls and aims
// at hovered ships, the mission step rail and clock, decoding for ASCII codes,
// and a lock-on ring the scene positions every frame through placeLock().
const reduced=getMotionPreference(),fine=matchMedia('(hover:hover) and (pointer:fine)');
const pad=(value,size=2)=>String(value).padStart(size,'0');

// Mission rail. Labels are HUD codes; the localized step name stays in #stageLabel.
const railIndex={boot:0,map:0,travel:1,arrival:2,scanning:3,signals:3,target:4,docking:5,docked:5};
const rail=document.createElement('ol');rail.className='hud-rail';rail.setAttribute('aria-hidden','true');
rail.innerHTML=['MAP','FLIGHT','ARRIVAL','SCAN','LOCK','DOCK'].map((label,i)=>`<li><b>${pad(i+1)}</b><em>${label}</em></li>`).join('');
document.querySelector('.journey-dock .stage-line')?.append(rail);
function updateRail(step){const current=railIndex[step]??-1;[...rail.children].forEach((item,i)=>item.dataset.state=i<current?'done':i===current?'current':'');}

const clock=document.createElement('span');clock.className='hud-clock';document.querySelector('.header-readout')?.append(clock);
const started=performance.now();
function tick(){const s=Math.floor((performance.now()-started)/1000);clock.textContent=`T+${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}`;}
// The same clock blinks the status dots (html[data-hud-pulse]).
tick();setInterval(()=>{if(document.hidden)return;tick();if(!reduced.matches)document.documentElement.toggleAttribute('data-hud-pulse');},1000);

// Codes resolve from noise once per new value. Only plain ASCII leaves are
// touched: no translated copy, no nested markup, no live regions. Another
// writer replacing the text mid-decode wins immediately.
// Noise never uses a separator, so the code's structure holds still while it resolves.
const glyphs='ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%<>=+',settledText=new WeakMap();
const decodeTargets='#expeditionUI :is(.eyebrow,.role-track dt,.screen-heading small,.optical-registration span,.coordinate,.signal-copy small,.reading-kicker),.world-coordinate>span,#connectionState,#sectorLabel';
function decode(element){
 const text=element.textContent;
 if(!text||element.childElementCount||!/^[\x20-\x7e·—–]+$/.test(text)||element.closest('[aria-live]')||settledText.get(element)===text)return;
 settledText.set(element,text);if(reduced.matches)return;
 const characters=[...text],start=performance.now(),duration=380+characters.length*22;let written=text;
 const frame=now=>{
  if(element.textContent!==written)return;
  const p=Math.min(1,(now-start)/duration),settled=Math.floor(characters.length*(1-(1-p)**3));
  written=p>=1?text:characters.map((c,i)=>i<settled||/[\s\/·—–]/.test(c)?c:glyphs[(Math.random()*glyphs.length)|0]).join('');
  element.textContent=written;if(p<1)requestAnimationFrame(frame);
 };
 requestAnimationFrame(frame);
}
addEventListener('tem:surface',()=>requestAnimationFrame(()=>document.querySelectorAll(decodeTargets).forEach(decode)));
// A new surface can appear under a still pointer.
addEventListener('tem:surface',()=>{if(pointer){pointer.target=document.elementFromPoint(pointer.x,pointer.y)||pointer.target;schedule();}});

// Reticle. Controls capture it; readable glass gives the pointer back to the
// system cursor; the scene shows the free reticle, or the aim ring on a ship.
const reticle=document.createElement('div');reticle.className='hud-reticle';reticle.setAttribute('aria-hidden','true');
reticle.innerHTML='<i></i><i></i><i></i><i></i><b></b>';document.body.append(reticle);
const controls='button,a[href],summary,select,label,[data-node],[role="button"]';
const readable='.archive-glass-panel,.project-detail,.approach-copy,.atlas-control,.discovery-copy,.atlas-heading,.surface-content,.contact-dialog,.evidence-dialog,.experience-settings>div,.poetry-reader';
let pointer=null,scheduled=0,drawn='';
function draw(mode,x,y,width,height){
 const key=`${mode}|${x}|${y}|${width}|${height}`;if(key===drawn)return;drawn=key;
 reticle.dataset.mode=mode;reticle.style.width=width?width+'px':'';reticle.style.height=height?height+'px':'';reticle.style.transform=`translate3d(${x}px,${y}px,0)`;
}
function placeReticle(){
 scheduled=0;if(!pointer)return;
 const control=pointer.target?.closest?.(controls);
 if(control&&!control.disabled&&!control.closest('[inert]')){
  const box=control.getBoundingClientRect(),gap=5;
  // Projected controls move with the scene, so a captured reticle keeps tracking.
  if(box.width&&box.height){draw('snap',Math.round(box.left-gap),Math.round(box.top-gap),Math.round(box.width+gap*2),Math.round(box.height+gap*2));schedule();return;}
 }
 draw(pointer.target?.closest?.(readable)?'hidden':document.body.dataset.worldHover?'aim':'free',pointer.x-12,pointer.y-12);
}
function schedule(){if(!scheduled)scheduled=requestAnimationFrame(placeReticle);}
function release(){pointer=null;drawn='';delete reticle.dataset.mode;}
function enableReticle(){document.documentElement.classList.toggle('hud-cursor',fine.matches);if(!fine.matches)release();}
enableReticle();fine.addEventListener?.('change',enableReticle);
// Scene picking changes the aim state without pointer motion.
new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['data-world-hover']});
addEventListener('pointermove',event=>{if(event.pointerType!=='mouse'||!fine.matches)return;pointer={x:event.clientX,y:event.clientY,target:event.target};schedule();},{passive:true});
addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')reticle.dataset.pressed='';},{passive:true});
addEventListener('pointerup',()=>{delete reticle.dataset.pressed;},{passive:true});
addEventListener('pointerout',event=>{if(!event.relatedTarget)release();});
addEventListener('blur',release);

// Lock-on ring. The lock completes on a clock of its own, so the lock cue and
// the HUD agree even when no scene is available to place the ring.
const lock=document.createElement('div');lock.className='hud-lock';lock.setAttribute('aria-hidden','true');lock.dataset.state='idle';
lock.innerHTML=`<svg viewBox="-100 -100 200 200"><circle class="o" r="94"/><circle class="m" r="78"/><circle class="p" r="86" pathLength="100"/><line x1="-60" y1="0" x2="-46" y2="0"/><line x1="46" y1="0" x2="60" y2="0"/><line x1="0" y1="-60" x2="0" y2="-46"/><line x1="0" y1="46" x2="0" y2="60"/>${[0,90,180,270].map(a=>`<g transform="rotate(${a})"><path class="cv" d="M0,-100 l-6,-11 h12 z"/></g>`).join('')}</svg><span class="hud-lock-tag"></span><span class="hud-lock-read"></span>`;
// Directly above the canvas in paint order, below every DOM surface and panel.
const space=document.getElementById('space');if(space)space.after(lock);else document.body.append(lock);
const tag=lock.querySelector('.hud-lock-tag'),read=lock.querySelector('.hud-lock-read');
const lockDuration=1500;let lockStart=0,lockTimer=0,lastStep='',lastRead=0,lastDistance=0,closing=0;
function setLock(state){lock.dataset.state=state;delete lock.dataset.placed;}
function onState(state){
 const step=state.step;updateRail(step);if(step===lastStep)return;lastStep=step;
 clearTimeout(lockTimer);lastDistance=0;closing=0;
 if(step==='target'){
  setLock('locking');lockStart=performance.now();
  lockTimer=setTimeout(()=>{if(journey.state.step!=='target')return;lock.dataset.state='locked';tag.textContent='TARGET LOCKED';dispatchEvent(new Event('tem:hud-lock'));},reduced.matches?0:lockDuration);
 }else setLock(step==='docking'?'docking':step==='signals'?'track':'idle');
}
subscribe(onState);onState(journey.state);

// view: {x,y,radius,distance,bearing,label} in CSS pixels and world units, or null.
export function placeLock(view){
 const state=lock.dataset.state;
 if(!view||state==='idle'){if('placed' in lock.dataset)delete lock.dataset.placed;return;}
 const now=performance.now();
 if(state==='locking'){const p=Math.min(1,(now-lockStart)/lockDuration);lock.style.setProperty('--lock',(p*100).toFixed(1));tag.textContent=`LOCKING ${pad(Math.round(p*100),3)}%`;}
 else if(state==='locked')lock.style.setProperty('--lock','100');
 else if(state==='track')tag.textContent=view.label||'TRACKING';
 lock.style.transform=`translate3d(${view.x.toFixed(1)}px,${view.y.toFixed(1)}px,0)`;
 lock.style.setProperty('--s',(view.radius/100).toFixed(3));lock.style.setProperty('--r',view.radius.toFixed(1)+'px');
 if(now-lastRead>120){
  // One world unit reads as 1,000 km; closing speed comes from the range history.
  if(lastDistance)closing=closing*.6+(lastDistance-view.distance)*1000/((now-lastRead)/1000)*.4;
  lastDistance=view.distance;lastRead=now;
  read.innerHTML=`RNG ${Math.round(view.distance*1000).toLocaleString('en-US')} KM<br>BRG ${pad(Math.round(view.bearing)%360,3)}° · VEL ${Math.max(0,closing).toFixed(0)} KM/S`;
 }
 if(!('placed' in lock.dataset))lock.dataset.placed='';
}
