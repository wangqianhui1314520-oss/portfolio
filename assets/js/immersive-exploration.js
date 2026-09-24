import { sectors, sectorFor, createJourney } from './immersive-journey.js?v=1';

const source = window.PORTFOLIO_DATA?.works || [];
const works = source.map(w => ({
  id: w.id, title: w.title, subtitle: w.subtitle || 'CREATIVE ARCHIVE', type: w.type || 'SIGNAL',
  cover: w.cover, year: w.year || '—', role: w.role || '—', stack: w.stack || [], desc: w.desc || ''
})).filter(w => w.cover && w.type !== '作品证书').slice(0, 8);
const journey = createJourney(works);
const layer = document.createElement('div');
layer.className = 'journey-layer'; layer.id = 'journeyLayer';
document.body.classList.add('journey-locked');
document.body.append(layer);

const $ = selector => layer.querySelector(selector);
const currentSector = () => sectors.find(s => s.id === journey.state.sector);
const esc = text => String(text || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

function modeClass(step) {
  document.body.classList.remove('journey-locked','journey-map','journey-travel','journey-arrival','journey-signals','journey-target','journey-docked');
  document.body.classList.add(`journey-${step}`);
}
function shell(title, kicker, body, actions = '') {
  layer.innerHTML = `<div class="journey-reticle" aria-hidden="true"><i></i><b></b></div>
    <div class="journey-kicker">${kicker}</div><div class="journey-panel"><div class="journey-panel-line"></div><h2>${title}</h2>${body}${actions}</div>`;
}
function setTimeoutAction(action, ms) { window.setTimeout(() => { journey.dispatch(action); render(); }, ms); }

function renderBridge() {
  shell('ENTER THE CREATIVE EXPLORER', 'TEM-01 / BRIDGE WAKE SEQUENCE', `<p>飞船已停靠在深空。作品信号仍处于休眠状态，启动航行后才能访问。</p><div class="journey-readout"><span>HULL / STABLE</span><span>REACTOR / STANDBY</span><span>ARCHIVE / LOCKED</span></div>`, '<button class="journey-action primary" data-action="start">INITIALIZE FLIGHT <span>↗</span></button>');
}
function renderBoot() {
  shell('BOOTING SHIP SYSTEMS', 'SYSTEM / WAKE SEQUENCE', `<div class="journey-loader"><i></i><i></i><i></i><i></i><i></i><b>SYNCING NEURAL NAVIGATION</b></div><p class="journey-dim">正在连接粒子场与项目星图……</p>`);
  setTimeoutAction('ready', 1200);
}
function renderMap() {
  const cards = sectors.map(s => `<button class="sector-choice" data-action="navigate" data-sector="${s.id}" style="--sector:${s.color}"><span>${s.code}</span><strong>${s.name}</strong><b>${s.en}</b><small>${s.description}</small><i>SELECT COORDINATE ↗</i></button>`).join('');
  shell('SELECT A DESTINATION', 'NAV CORE / ARCHIVE STAR MAP', `<p>作品没有被列在页面上。选择一个星区，飞船会带你接近对应的信号源。</p><div class="sector-grid">${cards}</div><div class="journey-map-footer"><span>ARCHIVE SIGNALS / ${String(journey.total).padStart(2,'0')}</span><span>SELECT ONE COORDINATE</span></div>`);
}
function renderTravel() {
  const sector = currentSector();
  shell(`TRAVELING TO ${sector.code}`, 'FLIGHT PATH / DEEP SPACE', `<div class="journey-travel-readout"><strong>${sector.name}</strong><span>${sector.en}</span><i><b></b></i><small>VECTOR LOCKED · ${sector.position.join(' / ')}</small></div><p class="journey-dim">穿过粒子航道，正在接近未知作品信号……</p>`);
  setTimeoutAction('arrive', 1500);
}
function renderArrival() {
  const sector = currentSector();
  shell('UNKNOWN SIGNAL DETECTED', `${sector.code} / PROXIMITY ALERT`, `<div class="journey-signal-core"><i></i><b>?</b><span>DATA CLASSIFIED</span></div><p>扫描这个星区，才能解码其中的作品坐标。</p>`, '<button class="journey-action primary" data-action="scan">SCAN SIGNAL <span>⌁</span></button><button class="journey-back" data-action="back">← RETURN TO MAP</button>');
}
function renderScanning() {
  shell('DECODING SIGNAL', `${currentSector().code} / SPECTRUM SCAN`, `<div class="journey-scan"><span></span><b></b><i></i><small>READING CREATIVE FREQUENCY</small></div><p class="journey-dim">信号正在从背景粒子中显形……</p>`);
  setTimeoutAction('decode', 1500);
}
function renderSignals() {
  const sector = currentSector();
  const signals = journey.signals.map((w, i) => `<button class="signal-choice" data-action="select" data-work="${w.id}"><span>SIGNAL / ${String(i + 1).padStart(2,'0')}</span><strong>${esc(w.title)}</strong><small>${esc(w.subtitle)}</small><i>LOCK TARGET ↗</i></button>`).join('');
  shell(`${sector.name} / SIGNALS DECODED`, `${sector.code} / ARCHIVE UNSEALED`, `<p>${sector.description} 已解码 ${journey.signalCount} 个作品信号，选择一个目标锁定。</p><div class="signal-grid">${signals}</div><button class="journey-back" data-action="back">← RETURN TO STAR MAP</button>`);
}
function renderTarget() {
  const work = journey.work; const sector = currentSector();
  shell('TARGET LOCKED', `${sector.code} / SIGNAL ${work.id.toUpperCase()}`, `<div class="target-lock"><span>PROJECT SIGNAL</span><strong>${esc(work.type)}</strong><b>◈</b></div><h3 class="target-title">${esc(work.title)}</h3><p class="journey-dim">项目舱尚未打开。停靠后才能读取封面、介绍和技术档案。</p>`, '<button class="journey-action primary" data-action="dock">DOCK PROJECT BAY <span>↗</span></button><button class="journey-back" data-action="back">← CHOOSE ANOTHER SIGNAL</button>');
}
function renderDocking() {
  shell('DOCKING PROJECT BAY', 'APPROACH / HOLOGRAPHIC ARCHIVE', `<div class="journey-dock-animation"><i></i><b></b><span></span><small>ALIGNING CREATIVE MODULE</small></div><p class="journey-dim">正在对接项目舱，解锁完整内容……</p>`);
  setTimeoutAction('open', 1400);
}
function revealDocked(work) {
  document.body.classList.add('journey-docked');
  document.querySelectorAll('.signal-card').forEach(card => {
    const selected = card.dataset.id === work.id;
    card.style.display = selected ? 'block' : 'none';
    card.toggleAttribute('data-docked', selected);
  });
  document.querySelector('#archive')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function renderDocked() {
  const work = journey.detail; revealDocked(work);
  shell('PROJECT BAY OPEN', `DOCKED / ${work.id.toUpperCase()}`, `<div class="docked-signal"><span>ARCHIVE UNLOCKED</span><strong>${esc(work.title)}</strong><small>${esc(work.subtitle)}</small></div><p>项目模块已经嵌入飞船舷窗。进入后读取完整档案。</p>`, '<button class="journey-action primary" data-action="enter">ENTER PROJECT MODULE <span>↗</span></button><button class="journey-back" data-action="map">RETURN TO STAR MAP</button>');
}
function render() {
  const step = journey.state.step; modeClass(step); 
  if (step === 'bridge') renderBridge(); else if (step === 'boot') renderBoot(); else if (step === 'map') renderMap(); else if (step === 'travel') renderTravel(); else if (step === 'arrival') renderArrival(); else if (step === 'scanning') renderScanning(); else if (step === 'signals') renderSignals(); else if (step === 'target') renderTarget(); else if (step === 'docking') renderDocking(); else if (step === 'docked') renderDocked();
}
layer.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action;
  if (action === 'start') { journey.dispatch('start'); render(); return; }
  if (action === 'navigate') { journey.dispatch('navigate', button.dataset.sector); render(); return; }
  if (action === 'select') { journey.dispatch('select', button.dataset.work); render(); return; }
  if (action === 'enter') { const card = document.querySelector(`.signal-card[data-id="${journey.detail.id}"]`); card?.click(); layer.classList.add('minimized'); return; }
  if (action === 'map') { journey.dispatch('map'); document.querySelectorAll('.signal-card').forEach(c => { c.style.display=''; c.removeAttribute('data-docked'); }); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  journey.dispatch(action); render();
});

window.addEventListener('scroll', () => {
  if (journey.state.step === 'docked') return;
  if (scrollY > innerHeight * .15) window.scrollTo({ top: 0, behavior: 'instant' });
}, { passive: false });
render();
