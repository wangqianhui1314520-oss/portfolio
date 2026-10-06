import {currentLocale,localePath,projectPath} from './locale-data.js';
import {t} from './i18n.js';
import {getMotionPreference} from './runtime-settings.js';
import { renderProfile, renderProfilePanel, profileTabs } from './immersive-profile.js?v=cinematic-v21.1';
import {archiveChapterOrder,archiveRail} from './immersive-archive-path.js?v=cinematic-v21.1';
import {createArchiveDeviceInteraction} from './immersive-archive-interaction.js?v=cinematic-v21.1';
import { initPoetryReader } from './poetry-reader.js?v=cinematic-v21.1';
import { sectors, sectorFor, transitionDurations } from './immersive-journey.js?v=cinematic-v21.1';
import { journey, navigate, subscribe, getRevision, completeTransition } from './immersive-session.js?v=cinematic-v21.1';
import {opening} from './immersive-intro.js?v=cinematic-v21.1';
const ui=document.getElementById('expeditionUI'),data=window.PORTFOLIO_DATA;
const reduced=getMotionPreference();
const grainToggle=document.getElementById('grainToggle');
let profileTab='overview';
let atlasSelected='forge';
const profileMemory=new Map();
const archiveDevices=createArchiveDeviceInteraction({root:ui,getChapter:()=>profileTab,isActive:()=>journey.state.step==='captain'});
addEventListener('tem:opening-start',()=>{profileTab='overview';document.body.dataset.archiveChapter='overview';archiveRail.select(0,true);const intro=profileMemory.get('overview');if(intro)intro.scroll=0;});
initPoetryReader(data);
function rememberProfile(){const panel=ui.querySelector('#profilePanel');if(panel)profileMemory.set(profileTab,{html:panel.innerHTML,scroll:panel.scrollTop});}
let grainEnabled=true,timer,lastStep='',lastWheel=0,dragStart=null,suppressClickUntil=0;
try{grainEnabled=localStorage.getItem('tem-film-grain')!=='off';}catch{}
function setGrain(){document.body.dataset.grain=grainEnabled?'on':'off';grainToggle.textContent=grainEnabled?'颗粒 · 开':'颗粒 · 关';grainToggle.setAttribute('aria-pressed',String(grainEnabled));dispatchEvent(new CustomEvent('tem:film',{detail:{grain:grainEnabled}}));}
grainToggle.addEventListener('click',()=>{grainEnabled=!grainEnabled;setGrain();try{localStorage.setItem('tem-film-grain',grainEnabled?'on':'off');}catch{}});setGrain();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const workRole=work=>work.contribution?.role||work.role;
const browseURL=()=>localePath(currentLocale(),'work/',window.TEM_BASE_PATH||'/');
const pad=value=>String(value).padStart(2,'0');
const sector=()=>sectors.find(item=>item.id===journey.state.sector);
const action=(name,text,value='')=>`<button class="primary" type="button" data-action="${name}" data-value="${esc(value)}">${text}<span>↗</span></button>`;
const nextActions={boot:'ready',travel:'arrive',scanning:'decode',docking:'open'};
const labels={bridge:'01 / 我是 TEM',captain:'01 / 关于 TEM',boot:'02 / 启航',map:'02 / 航行星图',travel:'03 / 星际航行',arrival:'03 / 抵达星域',scanning:'04 / 扫描深空',signals:'04 / 发现作品',target:'05 / 靠近信号',docking:'05 / 正在停靠',docked:'06 / 作品舱'};
function screen(title,code,content,footer='A WORLD BY TEM',className=''){return `<section class="surface ${className}"><header class="screen-heading"><div><span class="eyebrow">${code}</span><h2 tabindex="-1">${title}</h2></div><small>THE WORLDS WITHIN.</small></header>${content}<footer class="screen-footer"><span>TEM / PERSONAL UNIVERSE</span><span>${footer}</span></footer></section>`;}
function transit(title,line,code){return `<section class="surface transit" style="--duration:${reduced.matches?100:transitionDurations[journey.state.step]}ms"><span class="eyebrow">${code}</span><h2 tabindex="-1">${title}</h2><p>${line}</p><div class="transit-progress" aria-hidden="true"><i></i></div><div class="scan-echoes" aria-live="polite"></div><button type="button" class="skip-transit" data-skip-transit>跳过航行演出 ↗</button></section>`;}
function detail(work){
  if(work.collection==='poetry')return screen(esc(work.title),'ECHO / ORIGINAL POETRY',`<div class="surface-content poetry-work"><p>${esc(data.poetry.description)}</p><small>${esc(data.poetry.totalLabel)}</small><button class="content-button" type="button" data-read-poetry>打开诗集，开始阅读 <span aria-hidden="true">↗</span></button><ul class="poetry-work-list">${data.poetry.poems.map(p=>`<li><button type="button" data-read-poetry="${esc(p.id)}"><span>${esc(p.title)}</span><small>${esc(p.theme)} ↗</small></button></li>`).join('')}</ul></div>`,'阅读全文 · 查看原稿','project-detail');
  const links=[{label:'阅读完整案例',url:projectPath(currentLocale(),work.id,window.TEM_BASE_PATH||'/')},...(work.links||[])];if(work.play?.url&&!links.some(link=>link.url===work.play.url))links.unshift({label:'进入作品',url:work.play.url});
  const media=work.video?`<details class="media-player" data-video="${esc(work.video)}"><summary>播放作品影像 ▷</summary></details>`:'';
  return screen(esc(work.title),`PROJECT / ${esc(work.year)} / ${esc(work.type)}`,`<div class="surface-content"><div class="detail-layout"><div class="detail-media"><img class="detail-cover" loading="lazy" src="${esc(work.cover)}" alt="${esc(work.title)}封面"><div class="detail-meta"><span>${esc(work.status||work.year)}</span><span>${esc(workRole(work))}</span></div></div><div class="detail-copy"><span class="reading-kicker">关于作品 / OVERVIEW</span><div class="detail-subtitle">${esc(work.subtitle)}</div><p>${esc(work.desc)}</p><div class="responsibility"><span>我的职责</span><strong>${esc(workRole(work))}</strong></div>${work.contribution?`<section class="mission-record" aria-label="个人贡献"><div class="mission-record-heading"><span>CREATION LOG / 我的贡献</span><time>${esc(work.contribution.period)}</time></div><ol>${work.contribution.actions.map(item=>`<li>${esc(item)}</li>`).join('')}</ol><div class="mission-outcome"><span>交付与结果</span><p>${esc(work.contribution.outcome)}</p></div></section>`:''}<div class="tag-list">${(work.stack||[]).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div>${work.highlights?.length?`<h3 class="reading-title">创作亮点</h3><ul>${work.highlights.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:''}${work.specs?.length?`<ul>${work.specs.map(item=>`<li>${esc(item.k)} / ${esc(item.v)}</li>`).join('')}</ul>`:''}${work.excerpt?`<blockquote>${esc(work.excerpt)}</blockquote>`:''}${media}<div class="detail-links">${links.map(link=>`<a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} ↗</a>`).join('')}</div></div></div></div>`,'向下滚动，了解这个世界','project-detail');
}
function captain(){
  document.body.dataset.archiveChapter=profileTab;
  return `<section class="surface about-surface archive-surface"><h2 class="sr-only" tabindex="-1">Tem 创作者档案舱</h2>${renderProfile(data,profileTab)}</section>`;
}
function starMap(){
  const selected=sectors.find(s=>s.id===atlasSelected)||sectors[0];
  return `<section class="surface map-surface universe-map orbital-map"><header class="atlas-heading"><span class="eyebrow">THE WORLDS WITHIN</span><h2 tabindex="-1">创作星图</h2><p>选择一片星域，开始探索。</p><a class="atlas-quick-browse" href="${browseURL()}">查看全部作品 ↗</a></header><div class="starmap-board">${sectors.map((s,i)=>`<button type="button" class="sector-node star-destination" data-world-anchor="${s.id}" data-atlas-select="${s.id}" data-value="${s.id}" data-node="${i}" aria-pressed="${s.id===selected.id}" style="--node:${s.color}"><span class="coordinate">${s.code}</span><strong>${s.name}</strong><small>${journey.hasScanned(s.id)?'已探索 · 再次访问':'选择航向 ↗'}</small></button>`).join('')}</div><div class="atlas-projection"><div class="atlas-control"><div class="atlas-control-copy"><span class="eyebrow">当前航向 / <b data-atlas-code>${selected.code}</b></span><h3 data-atlas-name>${selected.name}</h3><p>驶入星域，寻找承载作品的星舰。</p></div><div class="atlas-launch"><span>FLIGHT VECTOR<br>READY TO EXPLORE</span><button type="button" data-action="navigate" data-value="${selected.id}">设定航线 <b>↗</b></button></div></div></div></section>`;
}
function welcome(){
 const p=data.profile;
 return `<section class="surface welcome arrival-surface"><div class="archive-projection arrival-projection"><div class="archive-glass-panel arrival-glass-panel"><div class="optical-registration" aria-hidden="true"><span>A WORLD BY TEM</span><i></i><span>WELCOME / 01</span></div><div class="intro-copy arrival-copy"><span class="eyebrow">PERSONAL UNIVERSE / TEM</span><h1 tabindex="-1">我是 <span>Tem</span></h1><strong class="arrival-role">游戏设计与创意技术</strong><h2>${esc(p.tagline)}</h2><p>创作游戏、互动故事与 AI 驱动的体验。</p><div class="hero-actions" aria-label="选择你的旅程">${action('start','欣赏作品')}${action('captain','了解我')}</div><a class="quick-browse" href="${browseURL()}">快速浏览 ↗</a><small class="arrival-invitation">自由选择，从这里开始你的旅程。</small></div></div></div></section>`;
}
function chooseAtlas(id){
 if(journey.state.step!=='map'||!sectors.some(s=>s.id===id))return;atlasSelected=id;const selected=sectors.find(s=>s.id===id);
 ui.querySelectorAll('[data-atlas-select]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.atlasSelect===id)));
 ui.querySelector('[data-atlas-code]').textContent=selected.code;ui.querySelector('[data-atlas-name]').textContent=selected.name;ui.querySelector('.atlas-launch button').dataset.value=id;
 dispatchEvent(new CustomEvent('tem:atlas-select',{detail:{id}}));dispatchEvent(new CustomEvent('tem:ping',{detail:{source:'atlas'}}));
}
addEventListener('tem:atlas-choice',e=>chooseAtlas(e.detail.id));
document.addEventListener('click',e=>{const button=e.target.closest('[data-atlas-select]');if(button)chooseAtlas(button.dataset.atlasSelect);});
function signalMap(){
  const s=sector(),works=journey.signals;
  return screen('深空有了回响。',`${s.code} / SIGNALS DECODED`,`<p class="map-subtitle">${works.length} 艘作品星舰已显现。选择一艘，驾驶飞船靠近。</p><div class="signal-constellation" data-count="${works.length}">${works.map((work,i)=>`<button type="button" class="signal-node" data-world-anchor="${esc(work.id)}" data-action="select" data-value="${esc(work.id)}" data-node="${i}" aria-pressed="${journey.work?.id===work.id}"><span class="signal-anchor" aria-hidden="true"><i></i></span><span class="signal-copy"><small>SIGNAL ${pad(i+1)} / ${journey.hasVisited(work.id)?'已探索':'待探索'}</small><strong>${esc(work.title)}</strong><span>靠近信号 ↗</span></span></button>`).join('')}</div>`,`${pad(works.filter(work=>journey.hasVisited(work.id)).length)} / ${pad(works.length)} 已探索 · 选择坐标`,'constellation-surface');
}
function updateSignalSelection(){
 const nodes=[...ui.querySelectorAll('.signal-node')],works=journey.signals;
 if(nodes.length!==works.length||nodes.some((node,index)=>node.dataset.value!==works[index].id))return false;
 // Keep the positioned buttons and keyboard focus through a gallery selection.
 nodes.forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.value===journey.work?.id)));
 return true;
}
function holdNewWorldSurfaces(){
 if(!document.body.classList.contains('world-anchored'))return;
 for(const element of ui.querySelectorAll('.approach-copy,.project-detail')){
  element.dataset.worldMounted='pending';element.style.visibility='hidden';element.style.pointerEvents='none';element.inert=true;
 }
}
function approach(){
  const work=journey.work;
  return screen('作品星舰已锁定。',`${sector().code} / APPROACH`, `<div class="approach-layout"><div class="target-art"><span class="project-visual" data-cover="${esc(work.cover)}" data-offset="0"><img loading="lazy" src="${esc(work.cover)}" alt="${esc(work.title)}封面"><span class="project-frame"></span></span><small>VISUAL CONTACT / ${esc(work.year)}</small></div><div class="approach-copy"><span class="eyebrow">${esc(work.type)} / ${esc(workRole(work))}</span><h3>${esc(work.title)}</h3><p>${esc(work.subtitle)}</p>${action('dock','停靠星舰并进入作品')}<small>与星舰对接，展开创作档案与完整内容。</small></div></div>`,'选择停靠 · 进入作品舱','approach-surface');
}
function render(){
  rememberProfile();
  clearTimeout(timer);ui.querySelectorAll('video').forEach(video=>video.pause());
  const {step}=journey.state,s=sector(),sameStep=step===lastStep;lastStep=step;
  document.body.dataset.step=step;document.body.dataset.sector=s?.id||'';document.body.style.setProperty('--accent',s?.color||'#a2e2e9');
  document.getElementById('backButton').hidden=step==='bridge';
  document.getElementById('backButton').textContent=step==='docked'?'← 返回信号星图':step==='map'?'← 认识 Tem':journey.busy?'← 取消':'← 返回';
  document.getElementById('mapButton').hidden=!['travel','arrival','scanning','signals','target','docking','docked'].includes(step);
  document.getElementById('captainButton').hidden=step==='captain'||journey.busy;
  document.getElementById('stageLabel').textContent=labels[step];document.getElementById('sectorLabel').textContent=s?.en||'THE WORLDS WITHIN';
  document.getElementById('connectionState').textContent=step==='bridge'?'CREATOR / EXPLORER':journey.busy?'ENTERING A NEW WORLD':step==='docked'?'WORLD CONNECTED':'WELCOME TO MY UNIVERSE';
  document.getElementById('visitedCount').innerHTML=`${pad(journey.visitedCount)} <small>/ ${pad(journey.total)}</small>`;
  document.getElementById('statusAnnouncement').textContent=step==='signals'?`${s.name}，${journey.work?.title}`:labels[step];
  switch(step){
    case 'bridge':ui.innerHTML=welcome();break;
    case 'captain':ui.innerHTML=captain();break;
    case 'boot':ui.innerHTML=transit('Tem—01，准备启航。','离开近地轨道，展开创作宇宙的星图。','FLIGHT SYSTEM / ONLINE');break;
    case 'map':ui.innerHTML=starMap();break;
    case 'travel':ui.innerHTML=transit(`正在驶向${s.name}`,'穿过星尘航道，接近目标星域。',`${s.code} / IN FLIGHT`);break;
    case 'arrival':ui.innerHTML=screen(s.name,`${s.code} / ARRIVAL`,`<div class="discovery-layout"><div class="discovery-window" aria-hidden="true"><span>ORBITAL CONTACT</span><i></i><small>未识别星舰</small></div><div class="discovery-copy"><span class="eyebrow">EXPLORATION / FIRST CONTACT</span><h3>发现 ${journey.signalCount} 艘<br>未识别星舰。</h3><p>星域已抵达。<br>发出扫描脉冲，识别承载作品的星舰。</p>${action('scan','扫描这片星域')}</div></div>`,'等待你的扫描指令','discovery-surface');break;
    case 'scanning':ui.innerHTML=transit('扫描深空回声。','脉冲正在穿过星域，解码作品坐标。',`${s.code} / SCANNING`);break;
    case 'signals':if(!sameStep||!updateSignalSelection())ui.innerHTML=signalMap();break;
    case 'target':ui.innerHTML=approach();break;
    case 'docking':ui.innerHTML=transit(`正在停靠：${esc(journey.work.title)}`,'正在对接星舰，开启甲板全息档案。','DOCKING / ESTABLISHING LINK');break;
    case 'docked':ui.innerHTML=`<div class="ship-projection">${detail(journey.detail)}</div>`;break;
  }
  holdNewWorldSurfaces();
  if(step==='captain')for(const [key,memory] of profileMemory){const panel=ui.querySelector(`[data-archive-panel="${key}"] .profile-panel`);if(panel){panel.innerHTML=memory.html;panel.scrollTop=memory.scroll;}}
  if(step==='captain')archiveDevices.restore();else archiveDevices.leave();
  if(nextActions[step]){const revision=getRevision();timer=setTimeout(()=>{if(getRevision()===revision)navigate(nextActions[step]);},reduced.matches?100:document.body.classList.contains('webgl-ready')?transitionDurations[step]+5000:transitionDurations[step]);}
  document.getElementById('worldLocation').textContent=s?`${s.code} / ${s.en}`:'EARTH ORBIT / TEM—01';
  document.getElementById('worldInstruction').textContent=step==='map'?'选择一个星域，驶向未知。':step==='signals'?'点击星舰或信号 · 靠近作品':step==='arrival'?'发出扫描，寻找作品坐标。':step==='target'?'目标近在眼前 · 等待停靠':step==='docked'?'作品连接已建立':step==='bridge'?'欣赏作品，或进入我的个人空间。':'航行中 · 随时可以返回';
  // Cache new world labels before the browser can paint them at an unprojected position.
  dispatchEvent(new CustomEvent('tem:surface'));
  requestAnimationFrame(()=>{if(sameStep&&step==='signals')ui.querySelector('.signal-node[aria-pressed="true"]')?.focus({preventScroll:true});else if(step!=='bridge')ui.querySelector('h2')?.focus({preventScroll:true});});
}
addEventListener('tem:arrived',event=>completeTransition(event.detail));
addEventListener('tem:echo',event=>{const panel=ui.querySelector('.scan-echoes');if(!panel)return;const label=document.createElement('span');label.textContent=event.detail.title+' / 信号已解码';panel.append(label);});
function shiftSignal(direction){if(journey.state.step!=='signals')return;const works=journey.signals,index=works.indexOf(journey.work),next=works[index+direction];if(next)navigate('focus',next.id);}
const inputOwnsNavigation=event=>Boolean(event.target?.closest?.('input,textarea,select,summary,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"],[role="combobox"],.experience-settings,.bridge-header'));
function selectProfileTab(next,source='navigation'){
 if(journey.state.step!=='captain'||!profileTabs.some(([key])=>key===next)||next===profileTab)return;
 rememberProfile();profileTab=next;
 document.body.dataset.archiveChapter=profileTab;
 ui.querySelectorAll('.archive-chapters [data-profile-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.profileTab===profileTab)));
 // All four surfaces stay attached to their own physical screens. Changing
 // the accessible active panel never clears the outgoing chapter's content.
 for(const glass of ui.querySelectorAll('[data-archive-panel]')){
  const chosen=glass.dataset.archivePanel===profileTab,scroll=glass.querySelector('.profile-panel');
  scroll.id=chosen?'profilePanel':'profilePanel-'+glass.dataset.archivePanel;
  glass.setAttribute('aria-hidden',String(!chosen));glass.inert=!chosen;
  if(chosen)scroll.setAttribute('aria-live','polite');else scroll.removeAttribute('aria-live');
 }
 ui.querySelector('.archive-scroll-hint b').textContent=pad(archiveChapterOrder.indexOf(profileTab)+1)+' / 04';
 dispatchEvent(new CustomEvent('tem:archive-chapter',{detail:{tab:profileTab,source}}));
 archiveDevices.restore();
 if(source==='navigation'){ui.querySelector('#profilePanel h3')?.setAttribute('tabindex','-1');ui.querySelector('#profilePanel h3')?.focus({preventScroll:true});}
}
document.addEventListener('click',event=>{
 const tab=event.target.closest('[data-profile-tab]');if(tab)selectProfileTab(tab.dataset.profileTab);
});
addEventListener('tem:archive-nearest',event=>selectProfileTab(event.detail.tab,'orbit'));
addEventListener('wheel',event=>{
 if(journey.state.step!=='captain'||document.querySelector('dialog[open]')||event.ctrlKey||event.target.closest('#profilePanel,.archive-actions,.bridge-header'))return;
 event.preventDefault();const raw=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
 const now=performance.now();archiveRail.push(raw*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1),now);
 if(document.body.classList.contains('scene-fallback')){archiveRail.update(.1,now+200,false);selectProfileTab(archiveChapterOrder[archiveRail.index],'orbit');}
},{passive:false});
document.addEventListener('keydown',event=>{
 if(journey.state.step!=='captain'||document.querySelector('dialog[open]')||!['ArrowLeft','ArrowRight'].includes(event.key)||event.target.closest('#profilePanel,.bridge-header'))return;
 event.preventDefault();selectProfileTab(archiveChapterOrder[Math.max(0,Math.min(3,archiveChapterOrder.indexOf(profileTab)+(event.key==='ArrowRight'?1:-1)))],'keyboard');
});
let archiveTouch=null;
addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&journey.state.step==='captain'&&!event.target.closest('#profilePanel,.archive-actions,.bridge-header'))archiveTouch={x:event.clientX,y:event.clientY};});
addEventListener('pointerup',event=>{if(!archiveTouch)return;const dx=event.clientX-archiveTouch.x,dy=event.clientY-archiveTouch.y;archiveTouch=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3)selectProfileTab(archiveChapterOrder[Math.max(0,Math.min(3,archiveChapterOrder.indexOf(profileTab)+(dx<0?1:-1)))],'swipe');});
addEventListener('pointercancel',()=>{archiveTouch=null;});

const evidenceDialog=document.createElement('dialog');evidenceDialog.className='evidence-dialog';evidenceDialog.setAttribute('aria-label','相关作品档案');document.body.append(evidenceDialog);
let evidenceReturnFocus;
document.addEventListener('click',event=>{const button=event.target.closest('[data-read-work]');if(!button)return;const work=data.works.find(w=>w.id===button.dataset.readWork);if(!work)return;evidenceReturnFocus=button;evidenceDialog.innerHTML=`<div class="reader-toolbar"><button type="button" data-evidence-close>返回实践与能力 ×</button></div><div class="project-preview">${detail(work)}</div>`;document.body.dataset.reading='work';evidenceDialog.showModal();evidenceDialog.querySelector('h2')?.focus({preventScroll:true});});
evidenceDialog.addEventListener('click',event=>{if(event.target.closest('[data-evidence-close]'))evidenceDialog.close();});
evidenceDialog.addEventListener('close',()=>{evidenceDialog.querySelectorAll('video').forEach(v=>v.pause());delete document.body.dataset.reading;evidenceReturnFocus?.isConnected&&evidenceReturnFocus.focus({preventScroll:true});});
document.addEventListener('click',event=>{if(event.target.closest('[data-skip-transit]')){const next=nextActions[journey.state.step];if(next)navigate(next);return;}if(performance.now()<suppressClickUntil){event.preventDefault();return;}const arrow=event.target.closest('[data-gallery]');if(arrow){shiftSignal(Number(arrow.dataset.gallery));return;}const control=event.target.closest('[data-action]');if(!control)return;event.preventDefault();if(opening.active)return;if(navigate(control.dataset.action==='back'&&journey.state.step==='map'?'captain':control.dataset.action,control.dataset.value)&&!reduced.matches&&['start','navigate','scan','select','dock'].includes(control.dataset.action))dispatchEvent(new CustomEvent('tem:ping',{detail:{source:control.dataset.action}}));});
document.addEventListener('keydown',event=>{if(event.defaultPrevented||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||inputOwnsNavigation(event)||document.querySelector('dialog[open]'))return;if(event.key==='Escape')navigate(journey.state.step==='map'?'captain':'back');if(journey.state.step==='signals'&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();shiftSignal(event.key==='ArrowLeft'?-1:1);}});
addEventListener('wheel',event=>{if(opening.active||inputOwnsNavigation(event)||document.querySelector('dialog[open]')||Math.abs(event.deltaY)<16||performance.now()-lastWheel<700)return;if(journey.state.step==='signals'){lastWheel=performance.now();shiftSignal(event.deltaY>0?1:-1);}},{passive:true});
ui.addEventListener('pointerdown',event=>{if(journey.state.step==='signals'&&!event.target.closest('button,a,summary'))dragStart={x:event.clientX,y:event.clientY};});
ui.addEventListener('pointerup',event=>{if(!dragStart)return;const dx=event.clientX-dragStart.x,dy=event.clientY-dragStart.y;dragStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){suppressClickUntil=performance.now()+350;shiftSignal(dx<0?1:-1);}});
ui.addEventListener('pointercancel',()=>dragStart=null);
ui.addEventListener('pointerover',event=>{const node=event.target.closest('[data-node]');if(node)dispatchEvent(new CustomEvent('tem:hover',{detail:{index:Number(node.dataset.node),id:node.dataset.value}}));});
ui.addEventListener('pointerout',event=>{if(event.target.closest('[data-node]')&&!event.relatedTarget?.closest?.('[data-node]'))dispatchEvent(new CustomEvent('tem:hover',{detail:{id:null,index:-1}}));});
ui.addEventListener('pointerleave',()=>dispatchEvent(new CustomEvent('tem:hover',{detail:{index:-1,id:null}})));
ui.addEventListener('focusin',event=>{const node=event.target.closest('[data-node]');dispatchEvent(new CustomEvent('tem:hover',{detail:{index:node?Number(node.dataset.node):-1,id:node?.dataset.value||null}}));});
document.addEventListener('toggle',event=>{const details=event.target;if(!details.matches('[data-video]'))return;if(details.open&&!details.querySelector('video')){const video=document.createElement('video');video.controls=true;video.preload='none';video.playsInline=true;video.src=details.dataset.video;const work=data.works.find(w=>w.video===details.dataset.video);if(work&&data.international.guides[work.id]){const track=document.createElement('track');track.kind='subtitles';track.srclang='en';track.label='English project guide';track.src=(window.TEM_BASE_PATH||'/')+'assets/captions/'+work.id+'-en.vtt';track.default=currentLocale()==='en';video.append(track);const note=document.createElement('p');note.className='media-guide-note';note.textContent=currentLocale()==='en'?'English project-guide subtitles provide context; they are not a dialogue transcript.':'英文作品导览字幕说明项目背景，并非音频逐句翻译。';details.append(note);}video.setAttribute('aria-label','作品演示视频');details.append(video);}if(!details.open)details.querySelector('video')?.pause();},true);
subscribe(render);render();
const contactDialog=document.getElementById('contactDialog');
document.getElementById('contactLinks').innerHTML=data.profile.links.map(link=>`<a href="${esc(link.url)}" ${/^https:/.test(link.url)?'target="_blank" rel="noopener noreferrer"':''}><span>${esc(link.label)}</span><b>↗</b></a>`).join('');
document.getElementById('contactButton').addEventListener('click',()=>contactDialog.showModal());
contactDialog.querySelector('.contact-close').addEventListener('click',()=>contactDialog.close());
contactDialog.addEventListener('click',event=>{if(event.target!==contactDialog)return;const r=contactDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)contactDialog.close();});
document.querySelector('[data-explore]').addEventListener('click',()=>{if(opening.active)return;if(['bridge','captain'].includes(journey.state.step))navigate('start');else if(journey.state.step!=='map'&&journey.state.step!=='boot')navigate('map');});







export const currentChapter=()=>profileTab;
export function selectChapter(chapter){selectProfileTab(chapter);}
export {journey,navigate,subscribe};
