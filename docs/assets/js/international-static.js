import {languageDestination} from './locale-data.js';

const languageLinks = [...document.querySelectorAll('[data-language-switch]')];
function syncLanguageLinks() {
  for (const link of languageLinks) link.href = languageDestination(link.href, location.href);
}
addEventListener('hashchange', syncLanguageLinks);
syncLanguageLinks();
for (const link of languageLinks) link.addEventListener('click', () => {
  syncLanguageLinks();
  try {localStorage.setItem('tem-locale', link.hreflang === 'en' ? 'en' : 'zh');} catch {}
});
document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
for (const video of document.querySelectorAll('video')) video.addEventListener('play', () => {
  for (const other of document.querySelectorAll('video')) if (other !== video) other.pause();
});
addEventListener('visibilitychange', () => {if (document.hidden) document.querySelectorAll('video').forEach(video => video.pause());});
// Page transitions run only between the reading pages; the universe does not opt in, so leaving for it skips one.
addEventListener('pageswap', event => {
  const destination = event.activation?.entry?.url;
  if (event.viewTransition && destination && !/\/(?:zh|en)\/(?:work|about|poetry)\//.test(new URL(destination).pathname)) event.viewTransition.skipTransition();
});

// Shared header: the same five destinations fold behind one button on narrow screens.
function initializeMenus() {
  for (const toggle of document.querySelectorAll('[data-menu-toggle]')) {
    const header = toggle.closest('header');
    const menu = document.getElementById(toggle.getAttribute('aria-controls') || '');
    if (!header || !menu) continue;
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = open => {toggle.setAttribute('aria-expanded', String(open)); header.dataset.menuOpen = String(open);};
    header.dataset.menuReady = 'true'; setOpen(false);
    toggle.addEventListener('click', () => setOpen(!isOpen()));
    menu.addEventListener('click', event => {if (event.target.closest('a')) setOpen(false);});
    document.addEventListener('click', event => {if (isOpen() && !header.contains(event.target)) setOpen(false);});
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !isOpen()) return;
      event.preventDefault(); event.stopImmediatePropagation();
      setOpen(false); toggle.focus({preventScroll: true});
    }, true);
    addEventListener('resize', () => {if (isOpen() && getComputedStyle(toggle).display === 'none') setOpen(false);});
  }
}
initializeMenus();

function initializeRibbonGallery() {
  const gallery = document.querySelector('body.ribbon-page .ribbon-gallery');
  const stage = gallery?.querySelector('.ribbon-stage');
  const track = stage?.querySelector('.ribbon-track');
  const allItems = track ? [...track.querySelectorAll('[data-ribbon-item]')] : [];
  if (!gallery || !stage || !track || !allItems.length || allItems.some(item => !item.querySelector('.ribbon-link'))) return;

  const body = document.body;
  const english = document.documentElement.lang === 'en';
  const field = (root, name) => root?.querySelector(`[data-${name}]`);
  const panel = gallery.querySelector('[data-ribbon-current]');
  const caption = gallery.querySelector('[data-ribbon-caption]');
  const previousButtons = [...gallery.querySelectorAll('[data-ribbon-prev]')];
  const nextButtons = [...gallery.querySelectorAll('[data-ribbon-next]')];
  const announcer = gallery.querySelector('[data-ribbon-announce]');
  const anchor = gallery.querySelector('.ribbon-anchor');
  const list = gallery.querySelector('[data-ribbon-list]');
  const rows = list ? [...list.querySelectorAll('[data-ribbon-row]')] : [];
  const filterButtons = [...document.querySelectorAll('[data-ribbon-filter]')];
  const viewButtons = [...document.querySelectorAll('[data-ribbon-view]')];
  const about = document.querySelector('dialog.ribbon-about');
  const aboutOpeners = [...document.querySelectorAll('[data-about-open]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 799px)');
  const saveData = navigator.connection?.saveData === true;
  const pad = value => String(value).padStart(2, '0');
  let items = allItems, links = items.map(item => item.querySelector('.ribbon-link'));
  let category = 'all', view = 'ribbon';
  let position = 0, destination = 0, minimum = 0, maximum = 0;
  let frame = 0, previousFrame = 0, currentIndex = 0, selectedIndex = -1, shownIndex = -1, spokenIndex = 0;
  let hoveredIndex = -1, centeredIndex = 0, centerUntil = 0, geometryUntil = 0, snapTimer = 0;
  let pointer = null, suppressClick = false, suppressTimer = 0, returnFocus = null, pressIndex = -1, pressTime = -Infinity;
  let previewItem = null, stageVisible = true;

  const clamp = value => Math.max(minimum, Math.min(maximum, value));
  const bound = index => Math.max(0, Math.min(items.length - 1, index));
  const expanded = () => selectedIndex !== -1;
  const compact = () => narrow.matches;
  const listView = () => view === 'list';
  const modified = event => event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  const indexOf = element => items.indexOf(element.closest('[data-ribbon-item]'));
  function draw() { track.style.setProperty('--ribbon-x', `${position.toFixed(3)}px`); }
  // The focus line is the slot beside the introduction; it widens to the stage on the right when a project expands.
  function focusLine() {
    const viewport = stage.getBoundingClientRect();
    if (compact() || !anchor) return viewport.left + viewport.width / 2;
    const slot = anchor.getBoundingClientRect();
    return slot.left + slot.width / 2;
  }
  function itemCoordinate(index, line = focusLine()) {
    const bounds = items[index].getBoundingClientRect();
    return position + line - bounds.left - bounds.width / 2;
  }
  function measure() {
    if (listView() || !items.length) return;
    const line = focusLine();
    const first = itemCoordinate(0, line), last = itemCoordinate(items.length - 1, line);
    minimum = Math.min(first, last); maximum = Math.max(first, last);
    destination = clamp(destination);
    const bounded = clamp(position);
    if (bounded !== position) {position = bounded; draw();}
  }
  function nearestIndex() {
    const line = focusLine();
    let nearest = 0, distance = Infinity;
    for (let index = 0; index < items.length; index++) {
      const bounds = items[index].getBoundingClientRect(), next = Math.abs(bounds.left + bounds.width / 2 - line);
      if (next < distance) {distance = next; nearest = index;}
    }
    return nearest;
  }
  function focusedIndex() {
    const focused = document.activeElement;
    return links.findIndex(link => link === focused || link.contains(focused));
  }
  function describe(index) {
    const link = links[index];
    let badges = [];
    try {badges = JSON.parse(link.dataset.badges || '[]');} catch {}
    return {
      // A word joiner keeps a middle dot from starting a line.
      position: `${pad(index + 1)} / ${pad(items.length)}`, title: (link.dataset.title || link.textContent.trim()).replace(/·/g, '⁠·'),
      category: link.dataset.category || '', year: link.dataset.year || '', summary: link.dataset.summary || '',
      role: link.dataset.role || '', result: link.dataset.result || '', badges, play: link.dataset.play || '',
      href: link.href, sector: items[index].dataset.projectCategory || ''
    };
  }
  function renderBadges(container, badges) {
    container?.replaceChildren(...badges.map(([kind, label]) => {
      const badge = document.createElement('span');
      badge.className = 'ribbon-badge'; badge.dataset.badge = kind; badge.textContent = label;
      return badge;
    }));
  }
  function fill(root, prefix, details) {
    for (const name of ['position', 'title', 'category', 'year', 'summary', 'role', 'result']) {
      const target = field(root, `${prefix}-${name}`);
      if (!target) continue;
      target.textContent = details[name];
      if (name === 'title') target.classList.toggle('is-spaced', /\s/.test(details.title));
      const fact = target.closest('.ribbon-fact');
      if (fact) fact.hidden = !details[name];
    }
  }
  // The panel follows scrolling and dragging frame by frame; assistive technology hears it once motion settles.
  function showCurrent() {
    const index = expanded() ? selectedIndex : currentIndex;
    if (index === shownIndex || !items[index]) return;
    shownIndex = index;
    const details = describe(index);
    if (panel) {
      fill(panel, 'current', details);
      renderBadges(field(panel, 'current-badges'), details.badges);
      const open = field(panel, 'current-link');
      if (open) open.href = details.href;
    }
    for (const button of previousButtons) button.setAttribute('aria-disabled', String(index === 0));
    for (const button of nextButtons) button.setAttribute('aria-disabled', String(index === items.length - 1));
  }
  function say(text) {if (announcer) announcer.textContent = text;}
  function announce() {
    const index = expanded() ? selectedIndex : currentIndex;
    if (listView() || index === spokenIndex || !items[index]) return;
    spokenIndex = index;
    const {title, category: type, year, result} = describe(index);
    say(english ? `Project ${index + 1} of ${items.length}: ${title}. ${type}, ${year}.${result ? ' ' + result + '.' : ''}` : `第 ${index + 1} 件，共 ${items.length} 件：${title}。${type}，${year}。${result ? result + '。' : ''}`);
  }
  function setCurrent(index) {
    const next = bound(index);
    if (next === currentIndex) {showCurrent(); return;}
    currentIndex = next; paintActive();
  }
  // Nearby covers load ahead of the reader; on wide screens the whole visible ribbon does.
  function warmNeighbours(index) {
    const reach = compact() ? 2 : 8;
    for (let offset = -reach; offset <= reach; offset++) {
      const image = items[index + offset]?.querySelector('img');
      if (image?.loading === 'lazy') image.loading = 'eager';
    }
  }
  function paintActive() {
    const focus = focusedIndex();
    const active = expanded() ? selectedIndex : hoveredIndex !== -1 ? hoveredIndex : focus;
    const current = expanded() ? selectedIndex : currentIndex;
    body.classList.toggle('has-active-work', active !== -1);
    for (const item of allItems) {
      const index = items.indexOf(item);
      item.classList.toggle('is-active', index !== -1 && index === active);
      item.classList.toggle('is-current', index !== -1 && index === current);
      // The ribbon is one tab stop: the current project. Arrow keys move between projects.
      item.querySelector('.ribbon-link').tabIndex = index !== -1 && index === current ? 0 : -1;
    }
    if (caption) caption.hidden = !expanded();
    warmNeighbours(current);
    showCurrent();
    if (previewItem && previewItem !== previewTarget()) stopPreview();
  }
  function updateCaption(index) {
    if (!caption) return;
    const details = describe(index);
    fill(caption, 'ribbon', details);
    renderBadges(field(caption, 'ribbon-badges'), details.badges);
    const open = field(caption, 'ribbon-open');
    if (open) open.href = details.href;
    const play = field(caption, 'ribbon-play');
    if (play) {
      play.hidden = !details.play;
      if (details.play) {
        play.href = details.play;
        play.firstChild.textContent = `${details.sector === 'forge' ? play.dataset.labelPlay : play.dataset.labelLive} `;
      }
    }
  }

  // A short silent loop plays in the expanded cover, or in the current card on phones, once the ribbon settles.
  function previewTarget() {
    if (motion.matches || saveData || document.hidden || !stageVisible || listView()) return null;
    const index = expanded() ? selectedIndex : compact() ? currentIndex : -1;
    const item = items[index];
    return item?.querySelector('.ribbon-link').dataset.preview ? item : null;
  }
  function stopPreview() {
    const video = previewItem?.querySelector('video.ribbon-preview');
    if (video) {video.pause(); video.classList.remove('is-playing');}
    previewItem = null;
  }
  function startPreview() {
    const item = previewTarget();
    if (item === previewItem) {if (item) item.querySelector('video.ribbon-preview')?.play().catch(() => {}); return;}
    stopPreview();
    if (!item) return;
    const cover = item.querySelector('.ribbon-cover');
    let video = cover.querySelector('video.ribbon-preview');
    if (!video) {
      video = document.createElement('video');
      video.className = 'ribbon-preview';
      video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true;
      video.preload = 'none'; video.disablePictureInPicture = true; video.tabIndex = -1;
      video.setAttribute('aria-hidden', 'true'); video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
      video.addEventListener('playing', () => video.classList.add('is-playing'));
      video.src = item.querySelector('.ribbon-link').dataset.preview;
      cover.insertBefore(video, cover.querySelector('.ribbon-badges,.ribbon-item-number'));
    }
    previewItem = item;
    video.play().catch(() => {});
  }

  // Free scrolling ends aligned: the nearest project slides into the focus position.
  function queueSnap() {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      snapTimer = 0;
      if (!pointer && !expanded() && centeredIndex === -1) moveTo(nearestIndex());
    }, compact() ? 60 : 160);
  }
  function settle() {
    previousFrame = 0;
    if (!expanded()) setCurrent(centeredIndex !== -1 ? centeredIndex : nearestIndex());
    paintActive(); announce();
    if (centeredIndex === -1 && !expanded() && !pointer) queueSnap();
    else startPreview();
  }
  function animate(time) {
    frame = 0;
    if (listView()) return;
    const elapsed = previousFrame ? Math.min(time - previousFrame, 64) : 16;
    previousFrame = time;
    const holding = centeredIndex !== -1 && (expanded() || time < centerUntil);
    if (time < geometryUntil || holding) measure();
    if (holding) destination = clamp(itemCoordinate(centeredIndex));
    if (motion.matches || Math.abs(destination - position) < .15) position = destination;
    else position += (destination - position) * (1 - Math.exp(-elapsed / 85));
    draw();
    if (centeredIndex === -1 && !expanded()) setCurrent(nearestIndex());
    if (Math.abs(destination - position) >= .15 || time < Math.max(centerUntil, geometryUntil)) frame = requestAnimationFrame(animate);
    else settle();
  }
  function schedule() {if (!frame) frame = requestAnimationFrame(animate);}
  function moveTo(index, immediate = false) {
    clearTimeout(snapTimer); snapTimer = 0;
    centeredIndex = bound(index); centerUntil = performance.now() + (motion.matches ? 0 : 800);
    setCurrent(centeredIndex);
    if (listView()) {paintActive(); return;}
    measure(); destination = clamp(itemCoordinate(centeredIndex));
    if (immediate || motion.matches) {position = destination; draw();}
    schedule(); paintActive();
  }
  function updateQuery(changes) {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(changes)) if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    if (url.href !== location.href) history.replaceState(history.state, '', url);
    syncLanguageLinks();
  }
  function expandWork(index, immediate = false, updateURL = true) {
    // Narrow screens already show each cover at full width, so there is nothing to expand.
    if (compact() || listView()) {moveTo(index, immediate); return;}
    const previous = selectedIndex;
    selectedIndex = bound(index);
    body.classList.add('is-work-expanded');
    const link = links[selectedIndex];
    for (const [property, value] of [['--ribbon-bg', link.dataset.background], ['--ribbon-ink', link.dataset.ink]]) {
      if (value) body.style.setProperty(property, value); else body.style.removeProperty(property);
    }
    // The expanded cover asks for a larger file; it keeps it after collapsing.
    const source = items[selectedIndex].querySelector('source[srcset]');
    if (source) source.sizes = '(max-width: 799px) 78vw, min(66vw, 100vh)';
    geometryUntil = performance.now() + (motion.matches ? 0 : 800);
    for (const item of allItems) item.classList.toggle('is-selected', item === items[selectedIndex]);
    updateCaption(selectedIndex); moveTo(selectedIndex, immediate); paintActive();
    if (previous !== selectedIndex) stopPreview();
    if (updateURL) updateQuery({project: items[selectedIndex].dataset.projectId});
  }
  function collapseWork(updateURL = true) {
    if (!expanded()) return;
    const index = selectedIndex;
    selectedIndex = -1; body.classList.remove('is-work-expanded');
    body.style.removeProperty('--ribbon-bg'); body.style.removeProperty('--ribbon-ink');
    geometryUntil = performance.now() + (motion.matches ? 0 : 800);
    for (const item of allItems) item.classList.remove('is-selected');
    stopPreview();
    moveTo(index); paintActive();
    if (updateURL) updateQuery({project: null});
  }
  function step(direction) {
    const base = expanded() ? selectedIndex : currentIndex, index = bound(base + direction);
    if (index === base) return false;
    if (expanded()) expandWork(index); else moveTo(index);
    return true;
  }
  function reveal(index) {
    const bounds = items[index].getBoundingClientRect(), viewport = stage.getBoundingClientRect();
    const left = !expanded() && !compact() && anchor ? anchor.getBoundingClientRect().left - 2 : viewport.left;
    if (bounds.left < left || bounds.right > viewport.right) moveTo(index);
    else {setCurrent(index); paintActive(); announce();}
  }

  // Filters keep the ribbon and the list in step; numbering follows what is shown.
  function applyFilter(next, {updateURL = true, speak = true} = {}) {
    if (!filterButtons.some(button => button.dataset.ribbonFilter === next)) next = 'all';
    const keep = items[expanded() ? selectedIndex : currentIndex];
    if (expanded()) collapseWork(false);
    category = next;
    for (const button of filterButtons) button.setAttribute('aria-pressed', String(button.dataset.ribbonFilter === next));
    const shown = element => next === 'all' || element.dataset.projectCategory === next;
    for (const item of allItems) item.hidden = !shown(item);
    for (const row of rows) row.hidden = !shown(row);
    items = allItems.filter(item => !item.hidden);
    links = items.map(item => item.querySelector('.ribbon-link'));
    items.forEach((item, index) => {const number = item.querySelector('.ribbon-item-number'); if (number) number.textContent = pad(index + 1);});
    rows.filter(row => !row.hidden).forEach((row, index) => {const number = row.querySelector('.ribbon-row-number'); if (number) number.textContent = pad(index + 1);});
    shownIndex = -1; spokenIndex = -1; hoveredIndex = -1;
    currentIndex = Math.max(0, items.indexOf(keep));
    position = destination = 0; draw();
    geometryUntil = performance.now() + 60;
    moveTo(currentIndex, true);
    if (updateURL) updateQuery({category: next === 'all' ? null : next});
    // One announcement names the result and the project now in front; settling does not repeat it.
    spokenIndex = currentIndex;
    if (speak) {
      const label = filterButtons.find(button => button.dataset.ribbonFilter === next)?.querySelector('.label-long')?.textContent || '';
      const {title} = describe(currentIndex);
      say(english ? `${label}: ${items.length} ${items.length === 1 ? 'project' : 'projects'}. Now showing ${title}.` : `${label}：${items.length} 件作品，当前：${title}。`);
    }
  }
  function applyView(next, {updateURL = true} = {}) {
    next = next === 'list' && list ? 'list' : 'ribbon';
    if (next === 'list') collapseWork(false);
    view = next; body.dataset.view = next;
    if (list) list.hidden = next !== 'list';
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.ribbonView === next));
    if (next === 'ribbon') {geometryUntil = performance.now() + 60; moveTo(currentIndex, true);}
    else stopPreview();
    if (updateURL) updateQuery({view: next === 'list' ? 'list' : null});
  }
  function applyStateFromURL() {
    const params = new URL(location.href).searchParams;
    applyFilter(params.get('category') || 'all', {updateURL: false, speak: false});
    applyView(params.get('view'), {updateURL: false});
    const index = items.findIndex(item => item.dataset.projectId === params.get('project'));
    if (index !== -1 && !listView()) expandWork(index, true, false); else collapseWork(false);
  }
  for (const button of filterButtons) button.addEventListener('click', () => {if (button.dataset.ribbonFilter !== category) applyFilter(button.dataset.ribbonFilter);});
  for (const button of viewButtons) button.addEventListener('click', () => {if (button.dataset.ribbonView !== view) applyView(button.dataset.ribbonView);});

  for (const item of allItems) {
    const link = item.querySelector('.ribbon-link');
    link.addEventListener('pointerenter', () => {if (!pointer?.dragged) {hoveredIndex = indexOf(link); paintActive();}});
    link.addEventListener('pointerleave', () => {if (hoveredIndex === indexOf(link)) hoveredIndex = -1; paintActive();});
    link.addEventListener('click', event => {
      const index = indexOf(link);
      if (modified(event) || event.button !== 0 || index === -1) return;
      // On narrow screens the centered card opens its case study; a neighbouring card slides in first.
      if (compact()) {
        const current = event.detail === 0 || (performance.now() - pressTime < 1500 ? pressIndex : currentIndex) === index;
        if (!current) {event.preventDefault(); moveTo(index);}
        return;
      }
      // The expanded cover itself opens the case study.
      if (expanded() && index === selectedIndex) return;
      event.preventDefault(); expandWork(index);
    });
    for (const image of link.querySelectorAll('img')) image.draggable = false;
  }
  for (const [buttons, direction] of [[previousButtons, -1], [nextButtons, 1]]) for (const button of buttons) {
    button.addEventListener('click', () => {if (button.getAttribute('aria-disabled') !== 'true') step(direction);});
  }
  stage.addEventListener('pointerleave', () => {hoveredIndex = -1; paintActive();});
  track.addEventListener('dragstart', event => event.preventDefault());
  document.addEventListener('focusin', event => {
    const index = links.findIndex(link => link === event.target || link.contains(event.target));
    // A press focuses its card (touch only after lifting); the click or drag decides what happens instead.
    if (index !== -1 && performance.now() - pressTime > 700) {
      if (expanded() && selectedIndex !== index) expandWork(index);
      else if (!expanded()) reveal(index);
    }
    paintActive();
  });
  document.addEventListener('focusout', () => queueMicrotask(paintActive));
  // The skip link lands on the current project, or on the first row of the list.
  document.querySelector('[data-skip-projects]')?.addEventListener('click', event => {
    const target = listView() ? rows.find(row => !row.hidden)?.querySelector('a') : links[currentIndex];
    if (!target) return;
    event.preventDefault(); target.focus();
  });

  gallery.addEventListener('wheel', event => {
    if (listView() || event.ctrlKey || event.metaKey || about?.open || event.target.closest('dialog,select,input,textarea,[data-tem-viewer],.ribbon-project-info,.ribbon-toolbar')) return;
    const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    // The narrow layout scrolls as a page; only sideways gestures move its ribbon.
    if (compact() && !sideways) return;
    let delta = sideways ? event.deltaX : event.deltaY;
    if (!Number.isFinite(delta) || !delta) return;
    event.preventDefault();
    if (expanded()) {collapseWork(); return;}
    if (event.deltaMode === 1) delta *= 16;
    else if (event.deltaMode === 2) delta *= stage.clientWidth * .8;
    clearTimeout(snapTimer); snapTimer = 0;
    centeredIndex = -1; centerUntil = 0; destination = clamp(destination - delta * 1.2);
    if (motion.matches) {position = destination; draw(); setCurrent(nearestIndex()); paintActive(); queueSnap();}
    else schedule();
  }, {passive: false});

  stage.addEventListener('pointerdown', event => {
    pressIndex = currentIndex; pressTime = performance.now();
    if (!event.isPrimary || event.button !== 0 || about?.open || event.target.closest('button,select,input,textarea')) return;
    clearTimeout(snapTimer); snapTimer = 0;
    pointer = {id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastTime: event.timeStamp, velocity: 0, dragged: false, startIndex: currentIndex};
  });
  stage.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (!pointer.dragged) {
      const horizontal = event.clientX - pointer.startX, vertical = event.clientY - pointer.startY;
      if (Math.abs(horizontal) < 6) return;
      if (event.pointerType === 'touch' && Math.abs(vertical) > Math.abs(horizontal)) {pointer = null; return;}
      if (expanded()) collapseWork();
      pointer.dragged = true; suppressClick = true; hoveredIndex = -1; centeredIndex = -1; centerUntil = 0;
      body.classList.add('is-ribbon-dragging'); gallery.classList.add('is-dragging');
      stage.setPointerCapture(event.pointerId); paintActive();
      if (frame) {cancelAnimationFrame(frame); frame = 0; previousFrame = 0;}
    }
    event.preventDefault();
    const elapsed = Math.max(1, event.timeStamp - pointer.lastTime), delta = (event.clientX - pointer.lastX) * 1.2;
    pointer.velocity = pointer.velocity * .35 + Math.max(-3, Math.min(3, delta / elapsed)) * .65;
    if (performance.now() < geometryUntil) measure();
    position = clamp(position + delta); destination = position; draw();
    setCurrent(nearestIndex());
    if (performance.now() < geometryUntil) schedule();
    pointer.lastX = event.clientX; pointer.lastTime = event.timeStamp;
  }, {passive: false});
  function endPointer(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const gesture = pointer; pointer = null;
    body.classList.remove('is-ribbon-dragging'); gallery.classList.remove('is-dragging');
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (!gesture.dragged) return;
    clearTimeout(suppressTimer); suppressTimer = setTimeout(() => {suppressClick = false;}, 400);
    const velocity = event.timeStamp - gesture.lastTime < 100 ? gesture.velocity : 0;
    if (compact()) {
      // A short swipe or a quick flick still advances exactly one card.
      const travel = gesture.lastX - gesture.startX, width = items[gesture.startIndex].getBoundingClientRect().width;
      const direction = Math.abs(travel) > width * .18 ? -Math.sign(travel) : Math.abs(velocity) > .35 ? -Math.sign(velocity) : 0;
      const nearest = nearestIndex();
      moveTo(nearest === gesture.startIndex ? gesture.startIndex + direction : nearest);
      return;
    }
    if (!motion.matches && event.type !== 'pointercancel') {destination = clamp(position + velocity * 180); schedule();}
    else {setCurrent(nearestIndex()); paintActive(); queueSnap();}
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(type, endPointer);
  stage.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false; clearTimeout(suppressTimer); event.preventDefault(); event.stopImmediatePropagation();
  }, true);

  function openAbout(opener) {
    if (!about || about.open) return;
    returnFocus = opener || document.activeElement;
    about.showModal();
    for (const element of aboutOpeners) element.setAttribute('aria-expanded', 'true');
  }
  for (const opener of aboutOpeners) opener.addEventListener('click', event => {
    if (modified(event) || event.button !== 0) return;
    event.preventDefault(); openAbout(opener);
  });
  for (const button of document.querySelectorAll('[data-ribbon-collapse]')) button.addEventListener('click', () => collapseWork());
  for (const button of about?.querySelectorAll('[data-about-close]') || []) button.addEventListener('click', () => about.close());
  about?.addEventListener('close', () => {
    for (const element of aboutOpeners) element.setAttribute('aria-expanded', 'false');
    // A contact link inside the folded menu is hidden again, so focus returns to the menu button.
    const target = returnFocus?.isConnected && returnFocus.getClientRects().length ? returnFocus : document.querySelector('[data-menu-toggle]');
    target?.focus({preventScroll: true});
  });
  about?.addEventListener('click', event => {
    if (event.target !== about) return;
    const bounds = about.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) about.close();
  });
  document.addEventListener('click', event => {
    if (!expanded() || about?.open || event.target.closest('a,button,header,footer,dialog,.ribbon-project-caption,.ribbon-current,.ribbon-toolbar,[data-tem-viewer]')) return;
    collapseWork();
  });
  addEventListener('keydown', event => {
    if (about?.open || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,[contenteditable="true"],[data-tem-viewer]')) return;
    if (event.key === 'Escape' && expanded()) {event.preventDefault(); collapseWork(); links[currentIndex]?.focus({preventScroll: true}); return;}
    if (listView()) return;
    if (event.key === 'Enter') {
      if (compact() || event.target.closest('a,button,summary')) return;
      const focus = focusedIndex();
      event.preventDefault(); expandWork(focus !== -1 ? focus : currentIndex); return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || event.target.closest('.ribbon-nav,.ribbon-toolbar')) return;
    event.preventDefault();
    const base = expanded() ? selectedIndex : currentIndex;
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : bound(base + (event.key === 'ArrowRight' ? 1 : -1));
    if (index === base) return;
    if (expanded()) expandWork(index); else moveTo(index);
    // Arrow keys pressed on the step buttons keep focus there; elsewhere focus follows the project.
    if (!event.target.closest('[data-ribbon-current],[data-ribbon-caption]')) links[index].focus({preventScroll: true});
  });
  addEventListener('resize', () => {
    if (listView()) return;
    geometryUntil = performance.now() + (motion.matches ? 0 : 800);
    moveTo(expanded() ? selectedIndex : currentIndex, motion.matches);
  });
  narrow.addEventListener('change', () => {
    if (narrow.matches && expanded()) collapseWork();
    if (!listView()) moveTo(currentIndex, true);
    startPreview();
  });
  motion.addEventListener('change', () => {
    if (motion.matches) {centerUntil = 0; geometryUntil = 0; position = destination; draw(); stopPreview();}
  });
  document.addEventListener('visibilitychange', () => {if (document.hidden) stopPreview(); else startPreview();});
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    stageVisible = entries.at(-1)?.isIntersecting ?? true;
    if (stageVisible) startPreview(); else stopPreview();
  }).observe(stage);
  addEventListener('popstate', applyStateFromURL);
  body.classList.add('ribbon-ready');
  moveTo(0, true); applyStateFromURL();
}
initializeRibbonGallery();

async function initializeTemModel() {
  const figure = document.querySelector('[data-tem-viewer]');
  const canvas = figure?.querySelector('[data-tem-canvas]');
  if (!figure || !canvas || !figure.dataset.modelUrl) return;
  const controls = [...figure.querySelectorAll('[data-tem-reset],[data-tem-pulse]')];
  const hint = figure.querySelector('[data-tem-hint]') || document.getElementById('temModelHint');
  const initialHint = hint?.textContent || '';
  const about = document.querySelector('dialog.ribbon-about');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const observers = [];
  let renderer, scene, camera, pivot, reflection, materials = [];
  let resources = {geometries: new Set(), materials: new Set(), textures: new Set()};
  let disposed = false, ready = false, intersects = true, suspended = false, contextLost = false;
  let frame = 0, timer = 0, lastRendered = 0, demandUntil = 0, pulseAt = -Infinity;
  let yaw = .22, pitch = -.04, zoom = 1, hovered = false, parallaxX = 0, parallaxY = 0;
  let gesture = null, suppressModelClick = false;
  const energy = {value: 0};
  const listen = (target, type, callback, options = {}) => target?.addEventListener(type, callback, {...options, signal: listeners.signal});
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  function setState(value) {
    figure.dataset.modelState = canvas.dataset.modelState = value;
    figure.dataset.state = value;
    figure.classList.toggle('is-model-ready', value === 'ready');
    canvas.dataset.modelReady = value === 'ready' ? 'ready' : 'false';
    for (const control of controls) control.disabled = value !== 'ready';
  }
  function collect(root) {
    const result = {geometries: new Set(), materials: new Set(), textures: new Set()};
    root.traverse(object => {
      if (object.geometry) result.geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        result.materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) result.textures.add(value);
      }
    });
    return result;
  }
  function release(source, retained = null) {
    for (const key of ['geometries', 'materials', 'textures']) for (const resource of source[key]) {
      if (!retained?.[key].has(resource)) resource.dispose();
    }
  }
  function stopRendering() {
    if (frame) cancelAnimationFrame(frame);
    if (timer) clearTimeout(timer);
    frame = timer = 0; lastRendered = 0;
  }
  function canDraw() {
    if (disposed || !ready || contextLost || suspended || document.hidden || !intersects || document.body.classList.contains('is-work-expanded') || about?.open) return false;
    const bounds = canvas.getBoundingClientRect(), style = getComputedStyle(figure);
    return bounds.width > 0 && bounds.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }
  function schedule() {
    if (frame || timer || !canDraw()) return;
    const delay = lastRendered ? Math.max(0, 1000 / 30 - (performance.now() - lastRendered)) : 0;
    timer = setTimeout(() => {timer = 0; if (canDraw()) frame = requestAnimationFrame(render);}, delay);
  }
  function requestDraw(duration = 220) {
    demandUntil = Math.max(demandUntil, performance.now() + (motion.matches ? 0 : duration));
    schedule();
  }
  function syncVisibility() {if (canDraw()) requestDraw(); else stopRendering();}
  function resize() {
    if (!renderer || !camera || disposed) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {stopRendering(); return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth <= 700 ? 1.25 : 1.5));
    renderer.setSize(Math.round(bounds.width), Math.round(bounds.height), false);
    camera.aspect = bounds.width / bounds.height; camera.updateProjectionMatrix();
    requestDraw();
  }
  function dispose() {
    if (disposed) return;
    disposed = true; ready = false; stopRendering(); listeners.abort();
    for (const observer of observers) observer.disconnect();
    release(resources); reflection?.dispose(); renderer?.dispose();
  }
  function fallback() {
    ready = false; stopRendering(); setState('fallback');
    if (hint) hint.textContent = document.documentElement.lang === 'en' ? 'TEM · Keep exploring the projects.' : 'TEM · 继续浏览右侧的作品。';
    release(resources); resources = {geometries: new Set(), materials: new Set(), textures: new Set()};
    reflection?.dispose(); reflection = null; renderer?.dispose(); renderer = null;
  }
  function wake() {
    if (!ready) return;
    pulseAt = performance.now();
    demandUntil = Math.max(demandUntil, pulseAt + (motion.matches ? 240 : 1000));
    requestDraw(motion.matches ? 240 : 1000);
  }
  function reset() {
    yaw = .22; pitch = -.04; zoom = 1; parallaxX = parallaxY = 0;
    pulseAt = -Infinity; requestDraw(400);
  }
  function render(time) {
    frame = 0;
    if (!canDraw()) {stopRendering(); return;}
    const elapsed = lastRendered ? Math.min(100, time - lastRendered) : 33;
    lastRendered = time;
    const pulseProgress = (time - pulseAt) / (motion.matches ? 240 : 1000);
    const pulse = pulseProgress >= 0 && pulseProgress < 1 ? Math.sin(pulseProgress * Math.PI) * (1 - pulseProgress * .45) : 0;
    energy.value = pulse + (hovered ? .22 : 0);
    const driftYaw = motion.matches ? 0 : Math.sin(time * .000075) * .035;
    const targetYaw = yaw + driftYaw + (motion.matches ? 0 : parallaxX * .10 + pulse * .24);
    const targetPitch = pitch + (motion.matches ? 0 : parallaxY * .07);
    const easing = motion.matches ? 1 : 1 - Math.exp(-elapsed / 70);
    pivot.rotation.y += (targetYaw - pivot.rotation.y) * easing;
    pivot.rotation.x += (targetPitch - pivot.rotation.x) * easing;
    pivot.position.y = motion.matches ? 0 : Math.sin(time * .00065) * .035;
    pivot.scale.setScalar(1 + (motion.matches ? 0 : pulse * .035));
    camera.position.z += (8.6 / zoom - camera.position.z) * easing;
    for (const entry of materials) entry.material.emissiveIntensity = entry.intensity * (1 + energy.value * 1.8);
    canvas.dataset.modelYaw = pivot.rotation.y.toFixed(3); canvas.dataset.modelPitch = pivot.rotation.x.toFixed(3);
    canvas.dataset.modelZoom = zoom.toFixed(3);
    try {renderer.render(scene, camera);} catch {fallback(); return;}
    if (!motion.matches || pulse > 0 || time < demandUntil) schedule();
  }

  // This small viewer owns its input; the gallery retains its own navigation.
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click', 'keydown']) listen(figure, type, event => event.stopPropagation());
  listen(canvas, 'pointerenter', () => {hovered = true; requestDraw();});
  listen(canvas, 'pointerleave', () => {hovered = false; parallaxX = parallaxY = 0; requestDraw();});
  listen(canvas, 'pointerdown', event => {
    event.stopPropagation();
    if (!ready || !event.isPrimary || event.button !== 0) return;
    event.preventDefault(); canvas.focus({preventScroll: true});
    gesture = {id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, dragged: false};
    canvas.setPointerCapture(event.pointerId);
  });
  listen(canvas, 'pointermove', event => {
    event.stopPropagation();
    if (!ready) return;
    const bounds = canvas.getBoundingClientRect();
    parallaxX = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
    parallaxY = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
    if (gesture?.id === event.pointerId) {
      event.preventDefault();
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 6) gesture.dragged = true;
      yaw += (event.clientX - gesture.x) * .009;
      pitch = clamp(pitch + (event.clientY - gesture.y) * .007, -.60, .60);
      gesture.x = event.clientX; gesture.y = event.clientY;
      figure.classList.toggle('is-dragging', gesture.dragged);
    }
    requestDraw();
  }, {passive: false});
  function finishGesture(event) {
    event.stopPropagation();
    if (!gesture || gesture.id !== event.pointerId) return;
    suppressModelClick = gesture.dragged; gesture = null; figure.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    requestDraw();
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(canvas, type, finishGesture);
  listen(canvas, 'click', event => {event.stopPropagation(); if (suppressModelClick) {suppressModelClick = false; return;} wake();});
  listen(figure, 'wheel', event => {
    event.stopPropagation();
    if (!ready || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
    zoom = clamp(zoom * Math.exp(-delta * .001), .78, 1.40); requestDraw(350);
  }, {passive: false});
  listen(canvas, 'keydown', event => {
    event.stopPropagation();
    if (!ready || event.ctrlKey || event.metaKey || event.altKey) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'r', 'R', ' ', 'Enter'].includes(event.key)) event.preventDefault();
    if (event.key === 'Home' || event.key.toLowerCase() === 'r') reset();
    else if (event.key === ' ' || event.key === 'Enter') wake();
    else {
      if (event.key === 'ArrowLeft') yaw -= .16;
      else if (event.key === 'ArrowRight') yaw += .16;
      else if (event.key === 'ArrowUp') pitch = clamp(pitch - .12, -.60, .60);
      else if (event.key === 'ArrowDown') pitch = clamp(pitch + .12, -.60, .60);
      else return;
      requestDraw(350);
    }
  });
  listen(figure.querySelector('[data-tem-reset]'), 'click', reset);
  listen(figure.querySelector('[data-tem-pulse]'), 'click', wake);
  listen(document, 'visibilitychange', syncVisibility);
  listen(window, 'resize', resize);
  listen(motion, 'change', () => {stopRendering(); requestDraw();});
  listen(window, 'pagehide', event => {if (event.persisted) {suspended = true; stopRendering();} else dispose();});
  listen(window, 'pageshow', event => {if (event.persisted) {suspended = false; resize(); syncVisibility();}});
  listen(canvas, 'webglcontextlost', event => {event.preventDefault(); contextLost = true; stopRendering(); setState('fallback');});
  listen(canvas, 'webglcontextrestored', () => {contextLost = false; if (ready) {setState('ready'); resize(); syncVisibility();}});
  const bodyObserver = new MutationObserver(syncVisibility);
  bodyObserver.observe(document.body, {attributes: true, attributeFilter: ['class']}); observers.push(bodyObserver);
  if (about) {const observer = new MutationObserver(syncVisibility); observer.observe(about, {attributes: true, attributeFilter: ['open']}); observers.push(observer);}
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {intersects = entries[0]?.isIntersecting ?? false; syncVisibility();});
    observer.observe(figure); observers.push(observer);
  }
  if ('ResizeObserver' in window) {const observer = new ResizeObserver(resize); observer.observe(canvas); observers.push(observer);}
  setState('loading');

  try {
    const [THREE, {GLTFLoader}] = await Promise.all([
      import('three'), import('../vendor/three-0.161.0/examples/jsm/loaders/GLTFLoader.js')
    ]);
    if (disposed) return;
    renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: true, powerPreference: 'low-power'});
    renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 1, .05, 80); camera.position.set(0, .05, 8.6); camera.lookAt(0, 0, 0);
    pivot = new THREE.Group(); scene.add(pivot);
    scene.add(new THREE.HemisphereLight(0xc5eaff, 0x363044, .8));
    for (const [color, intensity, x, y, z] of [[0xc5eaff, 2.0, -4, 6, 7], [0xffd8b4, .65, 4, 1, -3], [0x82d9f4, 1.35, 3, 0, 3]]) {
      const light = new THREE.DirectionalLight(color, intensity); light.position.set(x, y, z); scene.add(light);
    }
    const studio = new THREE.Scene(); studio.background = new THREE.Color(0x18232f);
    for (const [x, y, z, width, height, color, gain] of [
      [-6, 2, 5, 2, 9, 0xe6f4ff, 1.6], [6, 0, 4, 2, 8, 0x9bcde9, 1.4],
      [0, 7, -2, 9, 2, 0xffe0c3, 1.2], [0, -4, 3, 8, .6, 0x81d7eb, 1.1], [-3, -1, -5, 1, 8, 0xb5b8e8, .8]
    ]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(gain), side: THREE.DoubleSide, toneMapped: false}));
      panel.position.set(x, y, z); panel.lookAt(0, 0, 0); studio.add(panel);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {reflection = pmrem.fromScene(studio, .04); scene.environment = reflection.texture;}
    finally {release(collect(studio)); pmrem.dispose();}

    const gltf = await new GLTFLoader().loadAsync(new URL(figure.dataset.modelUrl, document.baseURI).href);
    const allResources = collect(gltf.scene);
    if (disposed) {release(allResources); return;}
    resources = allResources;
    gltf.scene.updateMatrixWorld(true);
    const identity = gltf.scene.getObjectByName('T_IDENTITY_V19');
    if (!identity) throw new Error('Identity group missing');
    const world = identity.matrixWorld.clone(); identity.removeFromParent();
    world.decompose(identity.position, identity.quaternion, identity.scale);
    const normalized = new THREE.Group(); normalized.rotation.y = .28; normalized.add(identity); pivot.add(normalized);
    normalized.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(normalized), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Identity bounds unavailable');
    // Only the authored eight-mesh identity is retained; the cabin never enters this scene.
    const scale = 3.8 / size.y;
    normalized.scale.setScalar(scale); normalized.position.copy(center).multiplyScalar(-scale);
    pivot.rotation.set(pitch, yaw, 0);
    const configured = new Set();
    identity.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = object.receiveShadow = false;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (configured.has(material)) continue;
        configured.add(material);
        const glass = material.isMeshPhysicalMaterial && (material.transmission > 0 || /glass|crystal/i.test(`${object.name} ${material.name}`));
        if (glass) {
          const innerFilm = /internal|lamina|dichroic/i.test(`${object.name} ${material.name}`);
          material.transmission = innerFilm ? 0 : .80;
          material.metalness = .025; material.roughness = innerFilm ? .10 : .075;
          material.thickness = innerFilm ? .025 : .62; material.ior = 1.46;
          material.clearcoat = .38; material.clearcoatRoughness = .12; material.envMapIntensity = 1.10;
          material.attenuationDistance = 3.8; material.attenuationColor.set(0x92c8e6);
          material.color.lerp(new THREE.Color(0x82b8d5), .45);
          material.transparent = innerFilm; material.opacity = innerFilm ? .08 : 1; material.depthWrite = !innerFilm;
          material.emissive.setRGB(.035, .075, .11); material.emissiveIntensity = .26;
          material.onBeforeCompile = shader => {
            shader.uniforms.temEnergy = energy;
            shader.fragmentShader = 'uniform float temEnergy;\n' + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat temRim=pow(1.-clamp(abs(dot(normal,normalize(vViewPosition))),0.,1.),2.8);totalEmissiveRadiance+=vec3(.10,.34,.47)*temRim*(.34+temEnergy*.8);');
          };
          material.customProgramCacheKey = () => 'tem-ribbon-crystal-v1';
        } else if ('envMapIntensity' in material) material.envMapIntensity = Math.max(1, material.envMapIntensity);
        if (material.emissive) materials.push({material, intensity: material.emissiveIntensity});
        material.needsUpdate = true;
      }
    });
    const retained = collect(identity); release(allResources, retained); resources = retained;
    ready = true; setState('ready'); if (hint) hint.textContent = initialHint;
    resize(); requestDraw();
  } catch {if (!disposed) fallback();}
}
// The crystal waits until the page has loaded and the browser is idle, and never loads where it is hidden.
function scheduleTemModel() {
  const figure = document.querySelector('[data-tem-viewer]');
  if (!figure) return;
  let started = false;
  const start = () => {
    if (started || !figure.getClientRects().length) return;
    started = true; removeEventListener('resize', start); void initializeTemModel();
  };
  const idle = window.requestIdleCallback ? callback => requestIdleCallback(callback, {timeout: 2500}) : callback => setTimeout(callback, 900);
  const begin = () => idle(() => {start(); if (!started) addEventListener('resize', start);});
  if (document.readyState === 'complete') begin(); else addEventListener('load', begin, {once: true});
}
scheduleTemModel();
