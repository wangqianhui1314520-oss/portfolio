// ============================================================
// Tem 沉浸式网站 · 自适应音频引擎（Web Audio API）
// 一条贯穿全站的环境 Bed + 序章完整音乐 + 结尾主题 + 交互音效。
// 音频只在用户手势后解锁（浏览器自动播放策略），状态变化由
// tem:opening-* 事件与 journey 状态机驱动。
// ============================================================
import { journey, subscribe } from './immersive-session.js?v=cinematic-v21.1';

const P = 'assets/audio/';
const URLS = {
  opening: P + 'music/opening-14.wav',   // 宇宙序章 14s（一次性，含跃迁高潮）
  bed:     P + 'music/bed-dream.wav',    // 主世界梦幻 Bed（无缝循环）
  theme:   P + 'music/theme-uplift.wav'  // 励志主题（结尾联系，首尾呼应）
};
const SFX = {
  ignition: P + 'sfx/engine-ignition.wav',
  warp:     P + 'sfx/warp-whoosh.wav',
  scan:     P + 'sfx/scan-ping.wav',
  lock:     P + 'sfx/lock-on.wav',
  chime:    P + 'sfx/gate-chime.wav',
  dock:     P + 'sfx/dock.wav',
  appear:   P + 'sfx/ui-appear.wav',
  hover:    P + 'sfx/ui-hover.wav',
  click:    P + 'sfx/ui-click.wav',
  back:     P + 'sfx/ui-back.wav'
};

// ---------- 持久化设置 ----------
const store = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
};
let enabled = store.get('tem-sound', 'on') !== 'off';
let volume = Math.min(1, Math.max(0, Number(store.get('tem-volume', '0.8')) || 0.8));

// ---------- 混音常量 ----------
const BED_VOL = 0.28, OPENING_VOL = 0.85, THEME_VOL = 0.7;
const SFX_VOL = { ignition: 0.7, warp: 0.8, scan: 0.6, lock: 0.65, chime: 0.7, dock: 0.7, appear: 0.55, hover: 0.4, click: 0.6, back: 0.6 };

// ---------- AudioContext 与总线 ----------
let ctx = null, master = null, musicBus = null, sfxBus = null;
const fetchCache = new Map();   // url -> Promise<ArrayBuffer>
const decoded = new Map();     // url -> AudioBuffer
let bedNode = null, bedGain = null;
let openingNode = null, openingGain = null;
let themeNode = null, themeGain = null;
let lastHover = 0, sfxPrimed = false, scanTimer = null;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = enabled ? volume : 0;
  musicBus = ctx.createGain(); sfxBus = ctx.createGain();
  musicBus.connect(master); sfxBus.connect(master); master.connect(ctx.destination);
  return ctx;
}
async function unlock() {
  ensureCtx();
  if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
  return ctx;
}
function getRaw(url) {
  if (!fetchCache.has(url))
    fetchCache.set(url, fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
      .catch(e => { fetchCache.delete(url); throw e; }));
  return fetchCache.get(url);
}
async function getBuffer(url) {
  if (decoded.has(url)) return decoded.get(url);
  const ab = await getRaw(url);
  const buf = await ctx.decodeAudioData(ab);
  decoded.set(url, buf);
  return buf;
}
function makeSource(buffer, { loop = false, rate = 1, detune = 0 } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = buffer; s.loop = loop; s.playbackRate.value = rate; s.detune.value = detune;
  return s;
}
function ramp(g, v, t = 0.4) {
  if (!g) return;
  const now = ctx.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setTargetAtTime(v, now, Math.max(0.02, t / 3));
}

// ---------- 交互音效 ----------
async function playSfx(name, { vol = 0.7, rate = 1 } = {}) {
  if (!enabled) return;
  try {
    await unlock();
    const url = SFX[name]; if (!url) return;
    const buf = await getBuffer(url);
    const s = makeSource(buf, { rate }), g = ctx.createGain();
    g.gain.value = 0; s.connect(g); g.connect(sfxBus);
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(vol, now + 0.012);
    g.gain.setTargetAtTime(0.0001, now + Math.min(0.6, buf.duration * 0.5), Math.max(0.12, buf.duration * 0.18));
    s.start(); s.stop(now + buf.duration + 0.6);
  } catch {}
}
function primeSfx() {
  if (sfxPrimed) return; sfxPrimed = true;
  Object.values(SFX).forEach(u => getBuffer(u).catch(() => {}));
}

// ---------- 主世界 Bed（循环） ----------
async function startBed() {
  if (!enabled) return;
  await unlock();
  if (bedNode) { ramp(bedGain, BED_VOL, 1.2); return; }
  const buf = await getBuffer(URLS.bed);
  bedGain = ctx.createGain(); bedGain.gain.value = 0;
  bedNode = makeSource(buf, { loop: true });
  bedNode.connect(bedGain); bedGain.connect(musicBus);
  bedNode.start(); ramp(bedGain, BED_VOL, 2.0);
  bedNode.onended = () => { bedNode = null; bedGain = null; };
}
function stopBed(fast = false) {
  if (!bedNode || !bedGain) return;
  const node = bedNode, g = bedGain; bedNode = null; bedGain = null;
  const now = ctx.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setTargetAtTime(0, now, fast ? 0.08 : 0.4);
  setTimeout(() => { try { node.stop(); } catch {} }, fast ? 300 : 1200);
}

// ---------- 序章音乐 ----------
async function startOpening() {
  // reduced-motion / direct-entry 可能已在 await 前完成序章，避免打断 Bed
  if (document.body.dataset.opening === 'complete') return;
  await unlock();
  stopBed(true); stopTheme(true);
  const buf = await getBuffer(URLS.opening);
  if (document.body.dataset.opening === 'complete') return;
  openingGain = ctx.createGain(); openingGain.gain.value = 0;
  openingNode = makeSource(buf);
  openingNode.connect(openingGain); openingGain.connect(musicBus);
  const now = ctx.currentTime;
  openingGain.gain.linearRampToValueAtTime(OPENING_VOL, now + 0.4);
  openingNode.start();
  openingNode.onended = () => { openingNode = null; openingGain = null; };
}
function stopOpening(fast = false) {
  if (!openingNode || !openingGain) return;
  const node = openingNode, g = openingGain; openingNode = null; openingGain = null;
  const now = ctx.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setTargetAtTime(0, now, fast ? 0.06 : 0.5);
  setTimeout(() => { try { node.stop(); } catch {} }, fast ? 250 : 1400);
}

// ---------- 结尾主题 ----------
async function startTheme() {
  if (!enabled) return;
  await unlock();
  if (themeNode) { ramp(themeGain, THEME_VOL, 0.6); return; }
  if (bedGain) ramp(bedGain, BED_VOL * 0.35, 0.6);
  const buf = await getBuffer(URLS.theme);
  themeGain = ctx.createGain(); themeGain.gain.value = 0;
  themeNode = makeSource(buf, { loop: true });
  themeNode.connect(themeGain); themeGain.connect(musicBus);
  themeNode.start(); ramp(themeGain, THEME_VOL, 1.2);
  themeNode.onended = () => { themeNode = null; themeGain = null; };
}
function stopTheme(fast = false) {
  if (bedGain) ramp(bedGain, BED_VOL, 1.0);
  if (!themeNode || !themeGain) return;
  const node = themeNode, g = themeGain; themeNode = null; themeGain = null;
  const now = ctx.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setTargetAtTime(0, now, fast ? 0.1 : 0.5);
  setTimeout(() => { try { node.stop(); } catch {} }, fast ? 300 : 1300);
}

// ---------- 手势解锁（捕获，最先执行） ----------
function onGesture() { unlock().then(primeSfx).catch(() => {}); }
addEventListener('pointerdown', onGesture, { capture: true, passive: true });
addEventListener('keydown', onGesture, { capture: true, passive: true });

// 页面加载即预取序章音频（无需 ctx），点击启航时大概率已就绪
getRaw(URLS.opening).catch(() => {});

// ---------- 序章事件 ----------
addEventListener('tem:opening-start', () => { startOpening(); });
addEventListener('tem:opening-skip', () => { stopOpening(true); });
addEventListener('tem:opening-complete', () => { stopOpening(false); startBed(); });

// ---------- 状态机音效 ----------
const STEP_SFX = { boot: 'ignition', map: 'appear', travel: 'warp', scanning: 'scan', signals: 'appear', target: 'lock', docking: 'dock', docked: 'chime', captain: 'click' };
let lastStep = journey.state.step;
subscribe(state => {
  const step = state.step;
  if (step === lastStep) return;
  lastStep = step;
  const s = STEP_SFX[step];
  if (s) playSfx(s, { vol: SFX_VOL[s] });
  if (step === 'travel' && bedGain) ramp(bedGain, BED_VOL * 0.4, 0.5);
  if ((step === 'arrival' || step === 'signals') && bedGain) ramp(bedGain, BED_VOL, 1.2);
  if (scanTimer) { clearTimeout(scanTimer); scanTimer = null; }
  if (step === 'scanning')
    scanTimer = setTimeout(() => { if (journey.state.step === 'scanning') playSfx('scan', { vol: SFX_VOL.scan }); }, 1400);
});

// ---------- UI 交互委托 ----------
const HANDLED = new Set(['start', 'navigate', 'scan', 'select', 'dock', 'captain', 'map', 'back']);
document.addEventListener('pointerover', e => {
  const b = e.target.closest && e.target.closest('button,a,[role="button"]');
  if (!b) return;
  const now = performance.now();
  if (now - lastHover < 70) return;
  lastHover = now;
  playSfx('hover', { vol: SFX_VOL.hover });
}, { passive: true });
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('button,a');
  if (!b) return;
  if (HANDLED.has(b.dataset.action)) return;       // 交给状态机专门音效
  if (b.id === 'contactButton') { startTheme(); return; }
  if (b.classList.contains('contact-close')) { stopTheme(true); playSfx('back', { vol: SFX_VOL.back }); return; }
  if (b.id === 'replayOpening') return;           // 走 opening-start
  playSfx('click', { vol: SFX_VOL.click });
});
const contactDialog = document.getElementById('contactDialog');
contactDialog && contactDialog.addEventListener('close', () => stopTheme(true));

// ---------- 对外 API（声音开关 / 音量） ----------
function applyMaster() { if (master) ramp(master, enabled ? volume : 0, 0.3); }
export function isSoundOn() { return enabled; }
export function getSoundVolume() { return volume; }
export function setSound(on) {
  enabled = !!on;
  store.set('tem-sound', enabled ? 'on' : 'off');
  if (enabled) {
    unlock(); applyMaster();
    if (document.body.dataset.opening === 'complete' && !bedNode && !openingNode) startBed();
  } else applyMaster();
}
export function setSoundVolume(v) {
  volume = Math.min(1, Math.max(0, Number(v) || 0));
  store.set('tem-volume', String(volume));
  if (master && enabled) ramp(master, volume, 0.15);
}

// 调试/自检接口（只读），便于验证音频图真实状态
try {
  window.__temAudio = () => ({
    ctx: ctx ? ctx.state : null, enabled, volume: Number(volume.toFixed(2)),
    bed: !!bedNode, opening: !!openingNode, theme: !!themeNode,
    decodedBuffers: decoded.size, fetched: fetchCache.size
  });
} catch {}
