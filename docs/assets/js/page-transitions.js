/* Native multi-page navigation, enhanced only when the browser offers it.
   No router, navigation interception, render-blocking fetch or loading curtain. */
const contextKey = locale => `tem:archive-context:${locale}`;
const restoreKey = locale => `tem:archive-restore:${locale}`;
const hopKey = 'tem:page-hop';
const day = 24 * 60 * 60 * 1000;

export function pageRoute(value, base) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value, base);
    if (url.origin !== new URL(base).origin) return null;
    const match = /^\/(zh|en)\/(work\/(?:([a-z0-9-]+)\/)?|about\/|poetry\/)$/.exec(url.pathname);
    if (!match) return null;
    return {url, locale: match[1], kind: match[3] ? 'case' : match[2] === 'work/' ? 'archive' : 'reading', id: match[3] || ''};
  } catch {return null;}
}

export function transitionRoute(fromValue, toValue, base) {
  const from = pageRoute(fromValue, base), to = pageRoute(toValue, base);
  if (!from || !to) return null;
  if (from.locale !== to.locale) return {kind: 'language', project: ''};
  if (from.kind === 'archive' && to.kind === 'case') return {kind: 'open', project: to.id};
  if (from.kind === 'case' && to.kind === 'archive') return {kind: 'return', project: from.id};
  return {kind: from.kind === 'case' && to.kind === 'case' ? 'next' : 'reading', project: ''};
}

export function validArchiveContext(value, locale, base, now = Date.now()) {
  if (!value || !Number.isFinite(value.at) || now - value.at > day || value.at > now + 60000) return null;
  const route = pageRoute(value.href, base);
  if (!route || route.kind !== 'archive' || route.locale !== locale) return null;
  if (!Number.isFinite(value.y) || value.y < 0 || !Number.isFinite(value.x) || value.x < 0) return null;
  if (!/^[a-z0-9-]+$/.test(value.project || '')) return null;
  return {...value, href: route.url.pathname + route.url.search + route.url.hash};
}

export function initializePageTransitions() {
  const page = () => pageRoute(location.href, location.href);
  if (!page()) return;
  document.documentElement.dataset.pageTransitions = 'ready';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const read = key => {try {return JSON.parse(sessionStorage.getItem(key) || 'null');} catch {return null;}};
  const write = (key, value) => {try {sessionStorage.setItem(key, JSON.stringify(value));} catch {}};
  const remove = key => {try {sessionStorage.removeItem(key);} catch {}};
  const savedContext = locale => validArchiveContext(read(contextKey(locale)), locale, location.href);
  let clickedDestination = '', cancelTransition = () => {}, restoreCancelled = false, resultAnimation;

  function rememberDestination(destination) {
    const from = page(), to = pageRoute(destination, location.href);
    if (!from || !to || from.locale !== to.locale) return;
    if (from.kind === 'archive' && to.kind === 'case') {
      write(contextKey(from.locale), {href: location.pathname + location.search + location.hash, x: Math.max(0, scrollX), y: Math.max(0, scrollY), project: to.id, activeCase: to.url.pathname, at: Date.now()});
    } else if (from.kind === 'case' && to.kind === 'case') {
      const saved = savedContext(from.locale);
      if (saved?.activeCase === location.pathname) write(contextKey(from.locale), {...saved, activeCase: to.url.pathname});
    }
  }

  function updateReturnLinks() {
    const current = page();
    if (current?.kind !== 'case') return;
    const saved = savedContext(current.locale);
    if (!saved || saved.activeCase !== location.pathname) return;
    for (const link of document.querySelectorAll('a[href]')) {
      const destination = pageRoute(link.href, location.href);
      if (destination?.kind !== 'archive' || destination.locale !== current.locale || destination.url.hash) continue;
      // Only generic archive links inherit context; explicit filter links remain explicit.
      if (destination.url.search && !link.hasAttribute('data-archive-return')) continue;
      link.href = saved.href;
      link.setAttribute('data-archive-return', '');
    }
  }

  function visible(element) {
    if (!element || !element.getClientRects().length) return false;
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth;
  }

  function visualMedia(frame) {
    // Share the image/video itself, never archive captions or project copy.
    return frame?.querySelector?.('img:not(.case-evidence-print-poster),video') || frame;
  }

  function archiveMedia(project) {
    // The archive contains three representations of each work. Select exactly one visible representation.
    const candidates = [...document.querySelectorAll('[data-project-id]')].filter(item => item.dataset.projectId === project);
    for (const item of candidates) {
      const media = item.querySelector('.browse-media,.ribbon-cover,.ribbon-row-thumb');
      if (visible(media)) return visualMedia(media);
    }
    return null;
  }

  function restoreArchivePosition() {
    const current = page();
    if (current?.kind !== 'archive') return;
    const request = read(restoreKey(current.locale));
    if (!request) return;
    remove(restoreKey(current.locale));
    const saved = savedContext(current.locale);
    const here = location.pathname + location.search + location.hash;
    if (!saved || !Number.isFinite(request.at) || request.href !== here || saved.href !== here || Date.now() - request.at > 60000) return;
    // This runs only for an explicit in-page return. History Back/Forward retain native restoration.
    restoreCancelled = false;
    const cancel = event => {if (event.type !== 'keydown' || ['Tab','ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)) restoreCancelled = true;};
    const inputs = ['wheel', 'touchmove', 'pointerdown', 'keydown'];
    for (const type of inputs) addEventListener(type, cancel, {passive: true});
    const apply = () => {if (!restoreCancelled) scrollTo({left: saved.x, top: saved.y, behavior: 'instant'});};
    apply();
    Promise.resolve(document.fonts?.ready).then(() => requestAnimationFrame(() => {
      apply();
      if (!restoreCancelled) {
        const candidates = [...document.querySelectorAll('[data-project-id]')].filter(item => item.dataset.projectId === saved.project);
        const card = candidates.find(item => item.getClientRects().length);
        (card?.matches('a') ? card : card?.querySelector('a'))?.focus({preventScroll: true});
      }
      for (const type of inputs) removeEventListener(type, cancel);
    }));
  }

  function finishWith(promise, callback) {Promise.resolve(promise).then(callback, callback);}
  function prepareTransition(event, fromURL, toURL, incoming) {
    cancelTransition();
    const transition = event.viewTransition;
    if (!transition) return;
    const route = transitionRoute(fromURL, toURL, location.href);
    if (motion.matches || !route) {transition.skipTransition(); return;}
    document.documentElement.dataset.pageTransition = route.kind;
    const current = page();
    const shared = route.project && (current?.kind === 'archive' ? archiveMedia(route.project) : visualMedia(document.querySelector('.case-evidence-frame')));
    const target = visible(shared) ? shared : null;
    const oldName = target?.style.viewTransitionName || '';
    if (target) target.style.viewTransitionName = 'tem-project-media';
    let cleared = false;
    const clearName = () => {if (target) target.style.viewTransitionName = oldName;};
    const clear = () => {if (cleared) return; cleared = true; clearName(); delete document.documentElement.dataset.pageTransition;};
    cancelTransition = clear;
    // Outbound names must survive the old snapshot. Inbound names may clear once new snapshots exist.
    if (incoming) Promise.resolve(transition.ready).then(() => {
      document.documentElement.dataset.lastPageTransition = route.kind;
      document.documentElement.dataset.transitionStatus = 'ready';
      clearName();
    }, () => {
      // Observable diagnostics distinguish an actual shared snapshot from a skipped enhancement.
      document.documentElement.dataset.lastPageTransition = route.kind;
      document.documentElement.dataset.transitionStatus = 'skipped';
      clearName();
    });
    finishWith(transition.finished, clear);
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = pageRoute(link.href, location.href), current = page();
    if (!destination || !current) return;
    clickedDestination = link.href;
    rememberDestination(link.href);
    if (current.kind === 'case' && destination.kind === 'archive' && destination.locale === current.locale && link.hasAttribute('data-archive-return')) {
      write(restoreKey(current.locale), {href: destination.url.pathname + destination.url.search + destination.url.hash, at: Date.now()});
    }
  });

  addEventListener('pageswap', event => {
    const destination = event.activation?.entry?.url || clickedDestination;
    if (!destination) {event.viewTransition?.skipTransition(); return;}
    rememberDestination(destination);
    write(hopKey, {from: location.href, to: destination, at: Date.now()});
    prepareTransition(event, location.href, destination, false);
  });
  addEventListener('pagereveal', event => {
    restoreArchivePosition();
    updateReturnLinks();
    const hop = read(hopKey);
    const activation = window.navigation?.activation;
    const from = activation?.from?.url || (hop?.to === location.href && Date.now() - hop.at < 30000 ? hop.from : '');
    prepareTransition(event, from, location.href, true);
  });
  addEventListener('pageshow', event => {
    clickedDestination = '';
    updateReturnLinks();
    if (!event.persisted) restoreArchivePosition();
  });

  const animateResults = () => {
    resultAnimation?.cancel();
    if (motion.matches || document.hidden) return;
    const results = document.body.dataset.view === 'list' ? document.querySelector('[data-ribbon-list]') : document.querySelector('[data-browse]');
    if (results && !results.hidden) resultAnimation = results.animate?.([{opacity: .45, transform: 'translateY(5px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 180, easing: 'ease-out'});
  };
  addEventListener('tem:archive-view', animateResults);
  addEventListener('tem:archive-filter', animateResults);
  motion.addEventListener?.('change', () => {if (motion.matches) {resultAnimation?.cancel(); cancelTransition();}});

  // A case-study index communicates reading position without taking over native anchor navigation.
  const indexLinks = [...document.querySelectorAll('.case-index a[href^="#"]')];
  if (indexLinks.length && 'IntersectionObserver' in window) {
    const sections = indexLinks.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
    const shown = new Set();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {if (entry.isIntersecting) shown.add(entry.target); else shown.delete(entry.target);}
      const active = sections.find(section => shown.has(section));
      if (!active) return;
      for (const link of indexLinks) {if (link.hash === '#' + active.id) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');}
    }, {rootMargin: '-100px 0px -55% 0px', threshold: 0});
    for (const section of sections) observer.observe(section);
  }
  updateReturnLinks();
  restoreArchivePosition();
}

if (typeof document !== 'undefined') initializePageTransitions();
