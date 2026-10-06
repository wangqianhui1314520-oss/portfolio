import {currentLocale, localizedData} from './locale-data.js';
import {localizeDOM} from './i18n.js';
import {initializeSettings} from './runtime-settings.js';
import {viewFromURL, restoreView, viewSearch} from './international-navigation.js';
import {isSoundOn,getSoundVolume,setSound,setSoundVolume} from './immersive-audio.js?v=cinematic-v21.1';

const locale=currentLocale();
window.PORTFOLIO_BASE_DATA=window.PORTFOLIO_DATA;
window.PORTFOLIO_DATA=localizedData(window.PORTFOLIO_DATA,locale);
window.TEM_BASE_PATH=new URL(document.baseURI).pathname;
initializeSettings();localizeDOM();
const soundSelect=document.getElementById('soundSetting'),volumeRange=document.getElementById('volumeSetting');
if(soundSelect){soundSelect.value=isSoundOn()?'on':'off';soundSelect.addEventListener('change',()=>setSound(soundSelect.value==='on'));}
if(volumeRange){volumeRange.value=String(getSoundVolume());volumeRange.addEventListener('input',()=>setSoundVolume(volumeRange.value));}
let graphics;
function requestGraphics() {
  if(graphics)return graphics;
  document.body.dataset.graphics='loading';
  dispatchEvent(new Event('tem:graphics-request'));
  graphics=import('./immersive-engine.js?v=cinematic-v21.1');
  return graphics;
}
// Controller events include keyboard shortcuts and replay, not just button clicks.
addEventListener('tem:opening-start',requestGraphics);
addEventListener('tem:opening-skip',requestGraphics);
addEventListener('tem:scene-ready',()=>{document.body.classList.remove('graphics-standby','scene-fallback');document.body.dataset.graphics='ready';});
addEventListener('tem:scene-failed',()=>{document.body.classList.remove('graphics-standby');document.body.classList.add('scene-fallback');document.body.dataset.graphics='fallback';});
const exploration=await import('./immersive-exploration.js?v=cinematic-v21.1');
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
try {
  const transfer=JSON.parse(sessionStorage.getItem(transferredKey)||'null');
  if(transfer?.locale===locale&&transfer.search===location.search){
    sessionStorage.removeItem(transferredKey);
    requestAnimationFrame(()=>{const panel=document.getElementById('profilePanel')||document.querySelector('.surface-content');if(panel)panel.scrollTop=Number(transfer.scroll)||0;});
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
