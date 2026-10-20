import {currentLocale, localizedData} from './locale-data.js';
import {localizeDOM} from './i18n.js';
import {initializeSettings} from './runtime-settings.js?v=cinematic-v21.19';
import {viewFromURL, restoreView, viewSearch} from './international-navigation.js';

const locale=currentLocale();
window.PORTFOLIO_BASE_DATA=window.PORTFOLIO_DATA;
window.PORTFOLIO_DATA=localizedData(window.PORTFOLIO_DATA,locale);
window.TEM_BASE_PATH=new URL(document.baseURI).pathname;
// Audio creates the shared journey session, which must capture localized works.
const {isSoundOn,getSoundVolume,setSound,setSoundVolume}=await import('./immersive-audio.js?v=cinematic-v21.19');
initializeSettings();localizeDOM();
const soundSelect=document.getElementById('soundSetting'),volumeRange=document.getElementById('volumeSetting');
if(soundSelect){soundSelect.value=isSoundOn()?'on':'off';soundSelect.addEventListener('change',()=>setSound(soundSelect.value==='on'));}
if(volumeRange){volumeRange.value=String(getSoundVolume());volumeRange.addEventListener('input',()=>setSoundVolume(volumeRange.value));}
let graphics;
function requestGraphics() {
  if(graphics)return graphics;
  document.body.dataset.graphics='loading';
  dispatchEvent(new Event('tem:graphics-request'));
  graphics=import('./immersive-engine.js?v=cinematic-v21.19');
  return graphics;
}
// Controller events include keyboard shortcuts and replay, not just button clicks.
addEventListener('tem:opening-start',requestGraphics);
addEventListener('tem:opening-skip',requestGraphics);
addEventListener('tem:scene-ready',()=>{document.body.classList.remove('graphics-standby','scene-fallback');document.body.dataset.graphics='ready';});
addEventListener('tem:scene-failed',()=>{document.body.classList.remove('graphics-standby');document.body.classList.add('scene-fallback');document.body.dataset.graphics='fallback';});
const exploration=await import('./immersive-exploration.js?v=cinematic-v21.19');
// Reuse the exact session used by the scene's UI, even when its cache version changes.
const {journey,navigate,subscribe}=exploration;
const progressKey='tem-journey-progress';
try{journey.restoreProgress(JSON.parse(sessionStorage.getItem(progressKey)||'{}'));}catch{}
const urlView=viewFromURL(location.href);
let restoring=true;
function applyView(view) {
  restoring=true;
  const result=restoreView(navigate,window.PORTFOLIO_DATA.works,view);
  if(result.restored){dispatchEvent(new Event('tem:direct-entry'));if(result.chapter)exploration.selectChapter(result.chapter);requestGraphics();}
  restoring=false;
  return result;
}
applyView(urlView);
try{sessionStorage.setItem(progressKey,JSON.stringify(journey.progress));}catch{}
function updateURL() {
  if(restoring||journey.busy)return;
  try{sessionStorage.setItem(progressKey,JSON.stringify(journey.progress));}catch{}
  const search=viewSearch(journey.state,exploration.currentChapter());
  if(search!==location.search)history.pushState(null,'',location.pathname+search);
}
subscribe(updateURL);addEventListener('tem:archive-chapter',updateURL);
addEventListener('popstate',()=>{
  const view=viewFromURL(location.href);
  if(!view.work&&!view.sector&&!view.view){restoring=true;navigate('home');restoring=false;}
  else applyView(view);
});
const transferredKey='tem-language-view';
function restoreLanguageScroll(transfer){
  const currentPanel=()=>document.getElementById('profilePanel')||document.querySelector('.surface-content');
  const panel=currentPanel();if(!panel)return;
  const expectedView=viewSearch(journey.state,exploration.currentChapter());
  let cancelled=false,queued=false,unsubscribe;
  const inputs=['wheel','touchmove','pointerdown'];
  function cancel(){
    if(cancelled)return;cancelled=true;
    for(const name of inputs)panel.removeEventListener(name,cancel);
    panel.removeEventListener('keydown',keyboard);
    removeEventListener('tem:scene-ready',sceneReady);removeEventListener('tem:scene-failed',sceneReady);
    removeEventListener('tem:archive-chapter',cancel);unsubscribe?.();
  }
  function keyboard(event){if(['Tab','ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))cancel();}
  function unchanged(){return !cancelled&&panel.isConnected!==false&&currentPanel()===panel&&location.search===transfer.search&&viewSearch(journey.state,exploration.currentChapter())===expectedView;}
  function apply(){
    if(unchanged())panel.scrollTop=Math.max(0,Number(transfer.scroll)||0);
    cancel();
  }
  function sceneReady(){
    if(queued)return;if(!unchanged()){cancel();return;}queued=true;
    // Standby uses normal CSS pixels. Read the mounted layout first so any
    // newly used fonts enter FontFaceSet.ready, then wait two painted frames.
    requestAnimationFrame(()=>{
      if(!unchanged()){cancel();return;}
      void panel.offsetHeight;
      const afterFonts=()=>{if(unchanged())requestAnimationFrame(()=>requestAnimationFrame(apply));else cancel();};
      Promise.resolve(document.fonts?.ready).then(afterFonts,afterFonts);
    });
  }
  for(const name of inputs)panel.addEventListener(name,cancel,{passive:true});
  panel.addEventListener('keydown',keyboard);
  addEventListener('tem:scene-ready',sceneReady);addEventListener('tem:scene-failed',sceneReady);
  addEventListener('tem:archive-chapter',cancel);unsubscribe=subscribe(cancel);
  if(['ready','fallback'].includes(document.body.dataset.graphics))sceneReady();
}
try {
  const transfer=JSON.parse(sessionStorage.getItem(transferredKey)||'null');
  if(transfer?.locale===locale&&transfer.search===location.search){
    sessionStorage.removeItem(transferredKey);
    restoreLanguageScroll(transfer);
  }
}catch{}
for(const link of document.querySelectorAll('[data-language-switch]'))link.addEventListener('click',()=>{
  const search=viewSearch(journey.state,exploration.currentChapter()),target=new URL(link.href);
  target.search=search;
  const scroll=(document.getElementById('profilePanel')||document.querySelector('.surface-content'))?.scrollTop||0;
  try{localStorage.setItem('tem-locale',locale==='en'?'zh':'en');sessionStorage.setItem(progressKey,JSON.stringify(journey.progress));sessionStorage.setItem(transferredKey,JSON.stringify({locale:locale==='en'?'zh':'en',search,scroll}));}catch{}
  link.href=target.href;
});
// Watch rendered copy and announcements, not GPU attributes. Translations are idempotent.
let queued=false;
new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;localizeDOM();});}).observe(document.body,{childList:true,subtree:true,characterData:true});
localizeDOM();
// Prepare the live star sea on entry. Readiness never starts the voyage: the
// opening controller advances only after the visitor presses its launch button.
queueMicrotask(requestGraphics);
