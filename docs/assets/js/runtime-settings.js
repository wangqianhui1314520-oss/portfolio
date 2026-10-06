const safeRead = (key, fallback) => {try {return typeof localStorage === 'undefined' ? fallback : localStorage.getItem(key) || fallback;} catch {return fallback;}};
let motion = safeRead('tem-motion', 'system');
let quality = safeRead('tem-quality', 'auto');
export function getQuality() {return ['auto','low','full'].includes(quality) ? quality : 'auto';}
export function getMotionPreference() {
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : {matches:false,addEventListener(){}};
  return {get matches(){return motion === 'reduce' || motion === 'system' && media.matches;},
    addEventListener(type, listener){media.addEventListener(type,listener);if(typeof window !== 'undefined')window.addEventListener('tem:motion-preference',listener);}};
}
export function setMotion(value) {
  if (!['system','reduce','full'].includes(value)) return;
  motion=value;try {localStorage.setItem('tem-motion',value);} catch {}
  document.body.dataset.motion=getMotionPreference().matches?'reduce':'full';
  dispatchEvent(new Event('tem:motion-preference'));
}
export function initializeSettings() {
  document.body.dataset.motion=getMotionPreference().matches?'reduce':'full';
  getMotionPreference().addEventListener('change',()=>{document.body.dataset.motion=getMotionPreference().matches?'reduce':'full';});
  const motionSelect=document.getElementById('motionSetting'),qualitySelect=document.getElementById('qualitySetting');
  if(motionSelect){motionSelect.value=motion;motionSelect.addEventListener('change',()=>setMotion(motionSelect.value));}
  if(qualitySelect){qualitySelect.value=getQuality();qualitySelect.addEventListener('change',()=>{quality=qualitySelect.value;try{localStorage.setItem('tem-quality',quality);}catch{}dispatchEvent(new Event('tem:quality-preference'));});}
}
