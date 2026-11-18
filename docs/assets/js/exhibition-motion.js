/* Optional exhibition cues. Content and ordinary links never depend on this file. */
export const PREVIEW_LIMIT_MS = 5000;

export function canExhibitMotion({reducedMotion = false, saveData = false, hidden = false, view = 'featured'} = {}) {
  return !reducedMotion && !saveData && !hidden && ['featured', 'grid'].includes(view);
}

export function canPreviewExhibition(state = {}) {
  return canExhibitMotion(state) && state.finePointer === true;
}

export function exhibitionPreviewSource(value, base) {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value, base);
    if (url.origin !== new URL(base).origin || !/^\/assets\/videos\/previews\/[a-z0-9-]+\.mp4$/.test(url.pathname)) return '';
    url.hash = '';
    return url.href;
  } catch {return '';}
}

export function exhibitionRevealDelay(index) {return Math.min(Math.max(0, Number.isFinite(index) ? index : 0), 2) * 55;}

/* One engagement plays once. Leaving both pointer and keyboard interest releases the engagement. */
export function createExhibitionPreview({media, source, ownerDocument, allowed, beforeStart = () => {}, onStop = () => {}, setTimer = setTimeout, clearTimer = clearTimeout}) {
  let video = null, hover = false, focus = false, played = false, token = 0, loadTimer = 0, stopTimer = 0;
  const stop = (reset = false) => {
    token++;
    clearTimer(loadTimer); clearTimer(stopTimer); loadTimer = stopTimer = 0;
    const previous = video; video = null;
    if (previous) {
      previous.pause(); previous.removeAttribute('src');
      // load() after removing src aborts the local preview fetch and releases its decoder.
      previous.load(); previous.remove(); onStop(session);
    }
    if (reset) {hover = focus = played = false;}
  };
  const start = () => {
    if (video || played || !source || !allowed()) return;
    played = true; beforeStart(session);
    const current = ++token;
    const element = ownerDocument.createElement('video'); video = element;
    element.className = 'exhibition-preview';
    element.muted = true; element.defaultMuted = true; element.playsInline = true;
    element.loop = false; element.controls = false; element.preload = 'none';
    element.disablePictureInPicture = true; element.tabIndex = -1;
    element.setAttribute('aria-hidden', 'true'); element.setAttribute('muted', ''); element.setAttribute('playsinline', '');
    let started = false;
    element.addEventListener('playing', () => {
      if (current !== token || !allowed()) {if (current === token) stop(); return;}
      element.classList.add('is-ready');
      if (!started) {
        started = true; clearTimer(loadTimer);
        stopTimer = setTimer(() => {if (current === token) stop();}, PREVIEW_LIMIT_MS);
      }
    });
    element.addEventListener('timeupdate', () => {if (current === token && element.currentTime >= PREVIEW_LIMIT_MS / 1000) stop();});
    for (const event of ['ended', 'error']) element.addEventListener(event, () => {if (current === token) stop();});
    loadTimer = setTimer(() => {if (current === token) stop();}, PREVIEW_LIMIT_MS);
    element.src = source; media.append(element);
    try {Promise.resolve(element.play()).catch(() => {if (current === token) stop();});}
    catch {if (current === token) stop();}
  };
  const session = {
    enter(kind) {if (kind === 'hover') hover = true; else if (kind === 'focus') focus = true; else return; start();},
    leave(kind) {
      if (kind === 'hover') hover = false; else if (kind === 'focus') focus = false;
      if (!hover && !focus) {stop(); played = false;}
    },
    stop,
    get active() {return video !== null;}
  };
  return session;
}

export function initializeExhibitionMotion() {
  const cards = [...document.querySelectorAll('[data-browse-card]')];
  // Case pages share the stylesheet, but their original, manually controlled media stays untouched.
  if (!cards.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const connection = navigator.connection;
  const environment = () => ({reducedMotion: reduced.matches, saveData: connection?.saveData === true, hidden: document.hidden, finePointer: fine.matches, view: document.body.dataset.view || 'featured'});
  const rendered = element => !element.hidden && element.getClientRects().length > 0;
  const sessions = new Map(), revealed = new WeakSet(), animations = new Set();
  let active = null, observer, keyboardIntentAt = -Infinity;
  document.addEventListener('keydown', event => {
    if (!event.altKey && !event.ctrlKey && !event.metaKey && ['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(event.key)) keyboardIntentAt = Date.now();
  }, {passive: true});
  const stopPreviews = () => {for (const session of sessions.values()) session.stop(true); active = null;};
  const cancelReveals = () => {for (const animation of animations) animation.cancel(); animations.clear();};
  const reveal = entries => {
    if (!canExhibitMotion(environment())) return;
    if (document.documentElement.dataset.pageTransition) {
      // A returning shared-cover transition already introduces the visible work. Do not fade it twice.
      for (const entry of entries) if (entry.isIntersecting && rendered(entry.target)) revealed.add(entry.target);
      return;
    }
    const group = entries.filter(entry => entry.isIntersecting && rendered(entry.target) && !revealed.has(entry.target)).sort((a, b) => cards.indexOf(a.target) - cards.indexOf(b.target));
    group.forEach(({target}, index) => {
      revealed.add(target);
      if (typeof target.animate !== 'function') return;
      const animation = target.animate([{opacity: .35, transform: 'translateY(18px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 380, delay: exhibitionRevealDelay(index), easing: 'cubic-bezier(.22,.68,0,1)'});
      animations.add(animation);
      Promise.resolve(animation.finished).then(() => animations.delete(animation), () => animations.delete(animation));
    });
  };
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (!entry.isIntersecting) sessions.get(entry.target)?.stop(true);
      reveal(entries);
    }, {threshold: .12, rootMargin: '0px 0px -4% 0px'});
  }

  for (const card of cards) {
    const media = card.querySelector('.browse-media');
    if (!media) continue;
    // A compact, decorative cue lives only over the image, never over the project description.
    const hint = document.createElement('span');
    hint.className = 'exhibition-view-hint'; hint.setAttribute('aria-hidden', 'true');
    hint.textContent = document.documentElement.lang === 'en' ? 'View case ↗' : '查看案例 ↗';
    media.append(hint);
    const source = exhibitionPreviewSource(card.dataset.exhibitionPreview, location.href);
    if (source) {
      const session = createExhibitionPreview({media, source, ownerDocument: document,
        allowed: () => canPreviewExhibition(environment()) && rendered(card),
        beforeStart: current => {if (active && active !== current) active.stop(); active = current;},
        onStop: current => {if (active === current) active = null;}});
      sessions.set(card, session);
      card.addEventListener('pointerenter', event => {if (event.pointerType !== 'touch') session.enter('hover');});
      card.addEventListener('pointerleave', () => session.leave('hover'));
      card.addEventListener('focusin', event => {
        // A restored programmatic focus is not a request to fetch a video.
        if (Date.now() - keyboardIntentAt < 1200 && (card.matches(':focus-visible') || event.target.matches?.(':focus-visible'))) session.enter('focus');
      });
      card.addEventListener('focusout', event => {if (!card.contains(event.relatedTarget)) session.leave('focus');});
    }
    observer?.observe(card);
  }

  const syncPreferences = () => {
    const state = environment();
    document.documentElement.dataset.exhibitionMotion = state.reducedMotion || state.saveData ? 'off' : 'on';
    if (!canExhibitMotion(state)) {stopPreviews(); cancelReveals();}
    else if (!state.finePointer) stopPreviews();
  };
  for (const setting of [reduced, fine, connection]) setting?.addEventListener?.('change', syncPreferences);
  for (const event of ['tem:archive-view', 'tem:archive-filter']) addEventListener(event, () => {
    stopPreviews(); cancelReveals();
    // Existing cards remain visible. Newly exposed cards get their own first intersection.
    for (const card of cards) if (observer && !revealed.has(card)) {observer.unobserve(card); observer.observe(card);}
    syncPreferences();
  });
  document.addEventListener('visibilitychange', () => {if (document.hidden) {stopPreviews(); cancelReveals();}});
  addEventListener('pagehide', () => {stopPreviews(); cancelReveals();});
  syncPreferences();
}

if (typeof document !== 'undefined') initializeExhibitionMotion();
