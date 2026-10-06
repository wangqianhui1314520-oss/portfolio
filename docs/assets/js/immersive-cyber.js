const space = document.getElementById('space');
if (space) {
  const shell = document.createElement('div');
  shell.className = 'cyber-shell';
  shell.innerHTML = `
    <div class="cyber-scanline" aria-hidden="true"></div>
    <div class="cyber-crosshair" aria-hidden="true"><i></i><b></b><span></span></div>
    <section class="cyber-telemetry" aria-label="Live system telemetry">
      <div class="cyber-telemetry-head"><span><i></i> LIVE TELEMETRY</span><b>SYS / 07</b></div>
      <div class="cyber-telemetry-grid">
        <div><small>SECTOR</small><strong id="cyberSector">ORIGIN</strong></div>
        <div><small>FIELD</small><strong id="cyberField">8820</strong></div>
        <div><small>VECTOR</small><strong id="cyberVector">00.0</strong></div>
        <div><small>SYNC</small><strong id="cyberSync">100%</strong></div>
      </div>
      <div class="cyber-wave"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    </section>
    <section class="cyber-terminal" aria-live="polite">
      <div class="cyber-terminal-top"><span>NEURAL / BACKGROUND</span><b>●</b></div>
      <ol id="cyberLog"><li>cosmos kernel booted</li><li>particle field connected</li><li>orbital relay listening</li></ol>
    </section>
    <div class="cyber-sector" aria-hidden="true"><span>SECTOR 07</span><b>DEEP SPACE NETWORK</b><i></i></div>
    <div class="cyber-dock" aria-label="Scene controls">
      <button type="button" data-cyber-action="scan"><span>◌</span> SCAN</button>
      <button type="button" data-cyber-action="pulse"><span>✦</span> PULSE</button>
      <button type="button" data-cyber-action="trace"><span>⌁</span> TRACE</button>
    </div>
    <div class="cyber-toast" id="cyberToast" role="status" aria-live="polite"></div>
  `;
  document.body.append(shell);

  const pointer = { x: innerWidth * .5, y: innerHeight * .5, nx: .5, ny: .5 };
  const crosshair = shell.querySelector('.cyber-crosshair');
  const sector = shell.querySelector('#cyberSector');
  const field = shell.querySelector('#cyberField');
  const vector = shell.querySelector('#cyberVector');
  const sync = shell.querySelector('#cyberSync');
  const logs = shell.querySelector('#cyberLog');
  const toast = shell.querySelector('#cyberToast');
  const messages = [
    'parallax channel calibrated', 'cinematic depth lock acquired', 'holographic mesh responding',
    'signal trace routed to archive', 'neon relay handshake stable', 'ambient particle stream active'
  ];
  let logIndex = 0, toastTimer;

  function addLog(message) {
    const item = document.createElement('li');
    item.textContent = `${String(new Date().getSeconds()).padStart(2, '0')} : ${message}`;
    logs.append(item);
    while (logs.children.length > 3) logs.firstElementChild.remove();
  }
  function notify(message) {
    toast.textContent = `// ${message}`;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1500);
  }
  function ping(source) {
    window.dispatchEvent(new CustomEvent('tem:ping', { detail: { source } }));
    document.body.classList.remove('cyber-pulse');
    void document.body.offsetWidth;
    document.body.classList.add('cyber-pulse');
    addLog(`${source.toLowerCase()} pulse injected`);
    notify('BACKGROUND PULSE SENT');
  }
  window.addEventListener('pointermove', event => {
    pointer.x += (event.clientX - pointer.x) * .35;
    pointer.y += (event.clientY - pointer.y) * .35;
    pointer.nx = event.clientX / innerWidth;
    pointer.ny = event.clientY / innerHeight;
    crosshair.style.transform = `translate3d(${pointer.x}px,${pointer.y}px,0)`;
  }, { passive: true });
  window.addEventListener('scroll', () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const ratio = scrollY / max;
    const scene = document.querySelectorAll('.scene');
    const current = [...scene].reverse().find(item => scrollY + innerHeight * .42 >= item.offsetTop);
    sector.textContent = current?.dataset.scene?.split('/')[1]?.trim() || 'ORIGIN';
    sync.textContent = `${Math.round((1 - ratio * .12) * 100)}%`;
  }, { passive: true });
  shell.querySelectorAll('[data-cyber-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.cyberAction;
    if (action === 'scan') {
      const active = document.body.classList.toggle('cyber-scanning');
      space.dataset.cyber = active ? 'scan-lock' : 'cruise';
      addLog(active ? 'spectrum scan locked' : 'spectrum scan released');
      notify(active ? 'SPECTRUM SCAN LOCKED' : 'CRUISE MODE RESTORED');
    } else if (action === 'pulse') ping('MANUAL');
    else {
      const active = document.body.classList.toggle('cyber-tracing');
      addLog(active ? 'trace overlay enabled' : 'trace overlay disabled');
      notify(active ? 'TRACE OVERLAY ENABLED' : 'TRACE OVERLAY DISABLED');
    }
  }));
  document.addEventListener('click', event => {
    if (event.target.closest('.signal-card,.node,.primary')) ping('UI');
  }, { passive: true });
  setInterval(() => {
    const dataset = space.dataset;
    field.textContent = dataset.particles || '8820';
    const velocity = Math.abs(Number(dataset.pulse || 0));
    vector.textContent = `${(velocity * .37 + pointer.nx * 2.8).toFixed(1).padStart(4, '0')}`;
    if (dataset.frameRate) sync.textContent = `${Math.min(100, Math.max(72, Number(dataset.frameRate)))}%`;
    if (document.visibilityState === 'visible') addLog(messages[logIndex++ % messages.length]);
  }, 1600);
}
