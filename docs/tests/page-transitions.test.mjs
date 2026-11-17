import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {pageRoute, transitionRoute, validArchiveContext} from '../assets/js/page-transitions.js';

const source = readFileSync(new URL('../assets/js/page-transitions.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/page-transitions.css', import.meta.url), 'utf8');
const origin = 'https://tem.example';
const archive = origin + '/zh/work/?view=grid&category=nexus&custom=kept#portfolioBrowse';
const state = (extra = {}) => ({href: '/zh/work/?view=grid&category=nexus&custom=kept#portfolioBrowse', x: 0, y: 720, project: 'anyao', activeCase: '/zh/work/anyao/', at: Date.now(), ...extra});

test('native page routes distinguish archive, case, reading pages and language changes', () => {
  assert.equal(pageRoute(archive, origin).kind, 'archive');
  assert.equal(pageRoute('/en/work/whale-heist/', origin).id, 'whale-heist');
  assert.equal(pageRoute('/zh/about/', origin).kind, 'reading');
  for (const path of ['', '/zh/', '/immersive.html', 'https://other.example/zh/work/']) {
    assert.equal(pageRoute(path, origin), null, path);
  }
  assert.deepEqual(transitionRoute(archive, '/zh/work/anyao/', origin), {kind: 'open', project: 'anyao'});
  assert.deepEqual(transitionRoute('/zh/work/anyao/', archive, origin), {kind: 'return', project: 'anyao'});
  assert.deepEqual(transitionRoute('/zh/work/anyao/', '/zh/work/dafeiyu/', origin), {kind: 'next', project: ''});
  assert.deepEqual(transitionRoute('/zh/work/anyao/', '/en/work/anyao/', origin), {kind: 'language', project: ''});
  assert.equal(transitionRoute(archive, '/zh/', origin), null);
});

test('archive context preserves the complete URL but rejects foreign, stale, invalid and wrong-locale state', () => {
  const good = state();
  assert.equal(validArchiveContext(good, 'zh', origin).href, good.href);
  for (const change of [{href: 'https://other.example/zh/work/'}, {href: '/en/work/?view=list'}, {href: '/zh/work/anyao/'}, {at: 0}, {at: Date.now() + 120000}, {x: NaN}, {y: -1}, {project: 'a"b'}]) {
    assert.equal(validArchiveContext(state(change), 'zh', origin), null, JSON.stringify(change));
  }
});

function harness(url, saved = new Map()) {
  const windowListeners = new Map(), documentListeners = new Map(), frames = [], scrolls = [], links = [], items = [];
  const location = new URL(url), html = {dataset: {}}, body = {dataset: {view: 'grid'}};
  let fontsDone;
  const fonts = new Promise(resolve => fontsDone = resolve);
  const sessionStorage = {getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key)};
  function media(shown = true) {return {style: {}, getClientRects: () => shown ? [{}] : [], getBoundingClientRect: () => ({width: 300, height: 180, top: 100, bottom: 280, left: 0, right: 300})};}
  const hero = media();
  const document = {
    documentElement: html, body, fonts: {ready: fonts}, hidden: false,
    addEventListener: (name, fn) => {if (!documentListeners.has(name)) documentListeners.set(name, []); documentListeners.get(name).push(fn);},
    querySelectorAll: selector => selector === 'a[href]' ? links : selector === '[data-project-id]' ? items : [],
    querySelector: selector => selector === '.case-evidence-frame' ? hero : null
  };
  const motion = {matches: false, addEventListener() {}};
  const window = {navigation: {activation: null}};
  const context = {URL, Promise, Date, Number, Math, Set, document, window, location, sessionStorage, innerHeight: 844, innerWidth: 390, scrollX: 0, scrollY: 720,
    matchMedia: () => motion,
    addEventListener: (name, fn) => {if (!windowListeners.has(name)) windowListeners.set(name, new Set()); windowListeners.get(name).add(fn);},
    removeEventListener: (name, fn) => windowListeners.get(name)?.delete(fn),
    requestAnimationFrame: fn => frames.push(fn),
    scrollTo: value => scrolls.push(value)
  };
  const runtime = source.replace(/export /g, '').replace(/if \(typeof document !== 'undefined'\) initializePageTransitions\(\);/, '');
  runInNewContext(runtime + '\ninitializePageTransitions();', context);
  function link(href, attributes = {}) {
    const attrs = new Map(Object.entries(attributes)); let address = new URL(href, location);
    const result = {target: '', dataset: {},
      get href() {return address.href;}, set href(value) {address = new URL(value, location);},
      get hash() {return address.hash;},
      hasAttribute: key => attrs.has(key), setAttribute: (key, value) => attrs.set(key, value), removeAttribute: key => attrs.delete(key),
      closest: () => result, getClientRects: () => [{}], matches: selector => selector === 'a', focus() {result.focused = true;}};
    links.push(result); return result;
  }
  return {saved, html, body, links, items, scrolls, frames, motion, hero, context, window, link, media,
    emit(name, event = {}) {for (const fn of windowListeners.get(name) || []) fn(event);},
    click(target, extra = {}) {const event = {target, button: 0, defaultPrevented: false, ...extra}; for (const fn of documentListeners.get('click') || []) fn(event);},
    async fonts() {fontsDone(); await Promise.resolve(); await Promise.resolve(); for (const fn of frames.splice(0)) fn();}
  };
}

test('only an actual primary navigation saves archive context, with query and scroll intact', () => {
  const h = harness(archive), link = h.link('/zh/work/anyao/');
  for (const event of [{defaultPrevented: true}, {ctrlKey: true}, {metaKey: true}, {shiftKey: true}, {button: 1}]) h.click(link, event);
  assert.equal(h.saved.size, 0);
  h.click(link);
  const saved = JSON.parse(h.saved.get('tem:archive-context:zh'));
  assert.equal(saved.href, state().href); assert.equal(saved.y, 720); assert.equal(saved.project, 'anyao');
  assert.equal(saved.activeCase, '/zh/work/anyao/');
});

test('case return links inherit same-locale context, while explicit filters and other locales remain intact', () => {
  const saved = new Map([['tem:archive-context:zh', JSON.stringify(state())]]), h = harness(origin + '/zh/work/anyao/', saved);
  const back = h.link('/zh/work/'), english = h.link('/en/work/'), explicit = h.link('/zh/work/?category=forge');
  h.emit('pageshow', {persisted: true});
  assert.equal(back.href, archive); assert.equal(english.href, origin + '/en/work/'); assert.equal(explicit.href, origin + '/zh/work/?category=forge');
  h.click(back);
  assert.equal(JSON.parse(saved.get('tem:archive-restore:zh')).href, state().href);
});

test('explicit returns restore once and visitor input wins over a delayed font result', async () => {
  const saved = new Map([['tem:archive-context:zh', JSON.stringify(state())], ['tem:archive-restore:zh', JSON.stringify({href: state().href, at: Date.now()})]]);
  const h = harness(archive, saved);
  assert.equal(h.scrolls.length, 1); assert.equal(h.scrolls[0].top, 720);
  h.emit('wheel', {type: 'wheel'}); await h.fonts();
  assert.equal(h.scrolls.length, 1, 'do not overwrite the visitor after fonts finish');
  h.emit('pageshow', {persisted: true}); assert.equal(h.scrolls.length, 1);
  assert.equal(saved.has('tem:archive-restore:zh'), false);
});

test('Tab browsing cancels delayed return focus, including Shift+Tab', async () => {
  for (const shiftKey of [false, true]) {
    const saved = new Map([['tem:archive-context:zh', JSON.stringify(state())], ['tem:archive-restore:zh', JSON.stringify({href: state().href, at: Date.now()})]]);
    const h = harness(archive, saved), card = h.link('/zh/work/anyao/');
    card.dataset.projectId = 'anyao'; h.items.push(card);
    h.emit('keydown', {type: 'keydown', key: 'Tab', shiftKey}); await h.fonts();
    assert.equal(h.scrolls.length, 1, 'late font completion must not scroll after the visitor tabs elsewhere');
    assert.equal(card.focused, undefined, 'late font completion must not steal keyboard focus');
  }
});

test('Back/Forward keep native restoration without an explicit return token', async () => {
  const h = harness(archive, new Map([['tem:archive-context:zh', JSON.stringify(state())]]));
  h.window.navigation.activation = {from: {url: origin + '/zh/work/anyao/'}, navigationType: 'traverse'};
  h.emit('pagereveal', {}); h.emit('pageshow', {persisted: true}); await h.fonts();
  assert.equal(h.scrolls.length, 0);
});

test('one visible media representation gets the shared name, then bfcache cleanup releases it', async () => {
  const h = harness(archive), hidden = h.media(false), shown = h.media();
  h.items.push({dataset: {projectId: 'anyao'}, querySelector: () => hidden});
  h.items.push({dataset: {projectId: 'anyao'}, querySelector: () => shown});
  let finish;
  const transition = {finished: new Promise(resolve => finish = resolve), ready: Promise.resolve(), skipTransition() {throw Error('unexpected skip');}};
  h.emit('pageswap', {activation: {entry: {url: origin + '/zh/work/anyao/'}}, viewTransition: transition});
  assert.equal(hidden.style.viewTransitionName, undefined); assert.equal(shown.style.viewTransitionName, 'tem-project-media');
  finish(); await Promise.resolve(); assert.equal(shown.style.viewTransitionName, '');
  assert.equal(h.html.dataset.pageTransition, undefined);
});

test('reduce-motion and universe destinations skip transitions without intercepting navigation', () => {
  for (const reduced of [true, false]) {
    const h = harness(archive); h.motion.matches = reduced; let skips = 0;
    h.emit('pageswap', {activation: {entry: {url: reduced ? origin + '/zh/work/anyao/' : origin + '/zh/'}}, viewTransition: {skipTransition() {skips++;}}});
    assert.equal(skips, 1);
  }
  assert.doesNotMatch(source, /preventDefault\(|scrollRestoration\s*=/, 'ordinary anchors and native history remain in charge');
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /@view-transition\{navigation:none\}/);
  assert.match(css, /data-page-transitions[\s\S]+view-transition-name:none/);
});

test('the header transition displays only the incoming wordmark instead of overlapping two layouts', () => {
  assert.match(css, /::view-transition-old\(tem-site-header\)\{opacity:0\}/);
  assert.match(css, /::view-transition-new\(tem-site-header\)\{opacity:1\}/);
  assert.match(css, /::view-transition-group\(tem-site-header\)\{animation:none\}/);
});
