import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {canExhibitMotion, canPreviewExhibition, exhibitionPreviewSource, exhibitionRevealDelay, createExhibitionPreview, PREVIEW_LIMIT_MS} from '../assets/js/exhibition-motion.js';

const base = 'https://tem.example/zh/work/';
const src = 'https://tem.example/assets/videos/previews/yuanmo.mp4';
const source = readFileSync(new URL('../assets/js/exhibition-motion.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/exhibition-motion.css', import.meta.url), 'utf8');

test('motion respects reduced animation, saving data, visibility and non-ribbon archive views', () => {
  assert.equal(canExhibitMotion(), true);
  for (const state of [{reducedMotion: true}, {saveData: true}, {hidden: true}, {view: 'list'}, {view: 'ribbon'}]) assert.equal(canExhibitMotion(state), false);
  assert.equal(canPreviewExhibition({finePointer: true}), true);
  assert.equal(canPreviewExhibition({finePointer: false}), false);
  assert.equal(canPreviewExhibition({finePointer: true, saveData: true}), false);
  assert.deepEqual([0, 1, 2, 3, 12, -1, NaN].map(exhibitionRevealDelay), [0, 55, 110, 110, 110, 0, 0]);
});

test('preview sources only accept the existing local preview folder, never arbitrary remote media', () => {
  assert.equal(exhibitionPreviewSource('/assets/videos/previews/yuanmo.mp4', base), src);
  assert.equal(exhibitionPreviewSource('/assets/videos/previews/yuanmo.mp4?v=abc#fragment', base), src + '?v=abc');
  for (const value of ['', null, 'https://remote.example/assets/videos/previews/yuanmo.mp4', '/assets/videos/full-film.mp4', '/assets/videos/previews/../full-film.mp4', 'javascript:alert(1)', 'data:video/mp4,abc']) assert.equal(exhibitionPreviewSource(value, base), '', String(value));
});

function fakeVideo() {
  const listeners = new Map(), attributes = new Map(), classes = new Set();
  return {currentTime: 0, removed: false, pauses: 0, loads: 0, plays: 0,
    classList: {add: value => classes.add(value)}, classes, attributes,
    setAttribute: (key, value) => attributes.set(key, value), removeAttribute(key) {attributes.delete(key); if (key === 'src') this.src = '';},
    addEventListener(type, fn) {if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn);},
    emit(type) {for (const fn of listeners.get(type) || []) fn();},
    play() {this.plays++; return Promise.resolve();}, pause() {this.pauses++;}, load() {this.loads++;}, remove() {this.removed = true;}};
}

function previewHarness(options = {}) {
  const videos = [], timers = new Map(); let id = 0, allowed = true;
  const media = {append() {}}, ownerDocument = {createElement() {const video = fakeVideo(); videos.push(video); return video;}};
  const session = createExhibitionPreview({media, ownerDocument, source: src, allowed: () => allowed,
    setTimer: (fn, ms) => {timers.set(++id, {fn, ms}); return id;}, clearTimer: key => timers.delete(key), ...options});
  return {session, videos, timers, allow(value) {allowed = value;},
    tick() {for (const [key, {fn}] of [...timers]) {timers.delete(key); fn();}}};
}

test('preview is created by interest, stays muted/non-looping, plays once and releases its decoder at five seconds', () => {
  const h = previewHarness(); assert.equal(h.videos.length, 0);
  h.session.enter('hover'); const video = h.videos[0];
  assert.equal(video.muted, true); assert.equal(video.playsInline, true); assert.equal(video.controls, false); assert.equal(video.loop, false); assert.equal(video.preload, 'none');
  assert.equal(video.attributes.get('aria-hidden'), 'true'); assert.equal(video.tabIndex, -1);
  video.emit('playing'); assert.equal(video.classes.has('is-ready'), true);
  assert.equal(h.timers.size, 1); assert.equal([...h.timers.values()][0].ms, PREVIEW_LIMIT_MS);
  video.emit('playing'); assert.equal(h.timers.size, 1, 'buffer resumption must not extend the five-second limit');
  h.tick(); assert.equal(h.session.active, false); assert.equal(video.removed, true); assert.equal(video.src, ''); assert.equal(video.pauses, 1); assert.equal(video.loads, 1);
  h.session.enter('focus'); assert.equal(h.videos.length, 1, 'still engaged: do not loop or restart automatically');
  h.session.leave('hover'); h.session.leave('focus'); h.session.enter('hover'); assert.equal(h.videos.length, 2, 'a deliberate fresh hover may start a new single preview');
});

test('leaving interest, playback completion, errors and stalled loads all unload the video', () => {
  for (const end of [h => h.session.leave('hover'), h => h.videos[0].emit('ended'), h => h.videos[0].emit('error'), h => h.tick(), h => {h.videos[0].currentTime = 5; h.videos[0].emit('timeupdate');}]) {
    const h = previewHarness(); h.session.enter('hover'); end(h);
    assert.equal(h.session.active, false); assert.equal(h.videos[0].removed, true); assert.equal(h.timers.size, 0);
  }
});

test('hover and keyboard share one engagement, and denied or missing sources never create a player', () => {
  const h = previewHarness(); h.allow(false); h.session.enter('hover'); assert.equal(h.videos.length, 0);
  h.allow(true); assert.equal(h.videos.length, 0, 'changing a preference alone does not start media');
  h.session.enter('focus'); h.session.leave('hover'); assert.equal(h.session.active, true);
  h.session.leave('focus'); assert.equal(h.session.active, false);
  const empty = previewHarness({source: ''}); empty.session.enter('hover'); assert.equal(empty.videos.length, 0);
});

function pageHarness() {
  const listeners = new Map(), documentListeners = new Map(), videos = [], observers = [], timers = new Map(); let timerId = 0;
  const eventNode = () => ({events: new Map(), addEventListener(type, fn) {if (!this.events.has(type)) this.events.set(type, []); this.events.get(type).push(fn);}, emit(type, event = {}) {for (const fn of this.events.get(type) || []) fn(event);}});
  const cards = [0, 1, 2].map(index => {
    const card = eventNode(), media = {children: [], append(element) {this.children.push(element);}};
    Object.assign(card, {media, hidden: false, focusVisible: false, animations: [], dataset: index < 2 ? {exhibitionPreview: '/assets/videos/previews/yuanmo.mp4'} : {},
      querySelector: () => media, getClientRects: () => [{}], matches: () => card.focusVisible, contains: value => value === card,
      animate(_frames, settings) {const result = {settings, finished: Promise.resolve(), cancel() {this.cancelled = true;}}; card.animations.push(result); return result;}});
    return card;
  });
  const reduced = eventNode(), fine = eventNode(), connection = eventNode(); reduced.matches = false; fine.matches = true; connection.saveData = false;
  const document = {hidden: false, body: {dataset: {view: 'featured'}}, documentElement: {dataset: {}, lang: 'zh-CN'},
    querySelectorAll: () => cards,
    addEventListener(type, fn) {if (!documentListeners.has(type)) documentListeners.set(type, []); documentListeners.get(type).push(fn);},
    createElement(type) {if (type === 'video') {const video = fakeVideo(); videos.push(video); return video;} return {setAttribute() {}};}};
  class Observer {constructor(callback) {this.callback = callback; observers.push(this);} observe() {} unobserve() {}}
  const context = {document, navigator: {connection}, location: {href: base}, URL, Promise,
    window: {IntersectionObserver: Observer}, IntersectionObserver: Observer,
    matchMedia: query => query.includes('reduced') ? reduced : fine,
    addEventListener(type, fn) {if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn);},
    setTimeout: (fn, ms) => {timers.set(++timerId, {fn, ms}); return timerId;}, clearTimeout: id => timers.delete(id)};
  const runtime = source.replace(/export /g, '').replace(/if \(typeof document !== 'undefined'\) initializeExhibitionMotion\(\);/, '');
  runInNewContext(runtime + '\ninitializeExhibitionMotion();', context);
  return {cards, videos, document, reduced, fine, connection, observers,
    emit(type, event = {}) {for (const fn of listeners.get(type) || []) fn(event);},
    keydown(key) {for (const fn of documentListeners.get('keydown') || []) fn({key});},
    visibility(hidden) {document.hidden = hidden; for (const fn of documentListeners.get('visibilitychange') || []) fn({});}};
}

test('intersection only reveals cards; media stays unloaded until an explicit fine-pointer or keyboard interest', () => {
  const h = pageHarness(); assert.equal(h.videos.length, 0);
  h.observers[0].callback(h.cards.map(target => ({target, isIntersecting: true})));
  assert.deepEqual(h.cards.map(card => card.animations[0].settings.delay), [0, 55, 110]); assert.equal(h.videos.length, 0);
  h.cards[0].emit('pointerenter', {pointerType: 'touch'}); assert.equal(h.videos.length, 0);
  h.cards[0].emit('pointerenter', {pointerType: 'mouse'}); assert.equal(h.videos.length, 1);
  h.cards[1].focusVisible = true; h.keydown('Tab'); h.cards[1].emit('focusin', {target: h.cards[1]});
  assert.equal(h.videos.length, 2); assert.equal(h.videos[0].removed, true, 'at most one preview remains active');
  h.cards[2].emit('pointerenter', {pointerType: 'mouse'}); assert.equal(h.videos.length, 2, 'a cover without a preview stays an image');
});

test('restoring focus alone does not fetch a preview, while explicit keyboard browsing can request one', () => {
  const h = pageHarness(); h.cards[0].focusVisible = true;
  h.cards[0].emit('focusin', {target: h.cards[0]}); assert.equal(h.videos.length, 0);
  h.keydown('Tab'); h.cards[0].emit('focusin', {target: h.cards[0]}); assert.equal(h.videos.length, 1);
});

test('hidden pages, changed views, motion preferences and saving data immediately release active previews', () => {
  for (const change of [h => h.visibility(true), h => h.emit('pagehide'), h => {h.document.body.dataset.view = 'list'; h.emit('tem:archive-view');}, h => {h.reduced.matches = true; h.reduced.emit('change');}, h => {h.connection.saveData = true; h.connection.emit('change');}, h => {h.fine.matches = false; h.fine.emit('change');}, h => h.observers[0].callback([{target: h.cards[0], isIntersecting: false}])]) {
    const h = pageHarness(); h.cards[0].emit('pointerenter', {pointerType: 'mouse'}); change(h);
    assert.equal(h.videos[0].removed, true); assert.equal(h.videos[0].src, ''); assert.equal(h.videos[0].loads, 1);
  }
});

test('a native shared-cover navigation does not get a second reveal layered on top', () => {
  const h = pageHarness(); h.document.documentElement.dataset.pageTransition = 'return';
  h.observers[0].callback([{target: h.cards[0], isIntersecting: true}]);
  assert.equal(h.cards[0].animations.length, 0);
  delete h.document.documentElement.dataset.pageTransition;
  h.observers[0].callback([{target: h.cards[0], isIntersecting: true}, {target: h.cards[1], isIntersecting: true}]);
  assert.equal(h.cards[0].animations.length, 0); assert.equal(h.cards[1].animations.length, 1);
});

test('reduced motion and data saving suppress reveals and previews, without hiding project content', () => {
  for (const preference of ['motion', 'data']) {
    const h = pageHarness(); if (preference === 'motion') {h.reduced.matches = true; h.reduced.emit('change');} else {h.connection.saveData = true; h.connection.emit('change');}
    h.observers[0].callback(h.cards.map(target => ({target, isIntersecting: true})));
    h.cards[0].emit('pointerenter', {pointerType: 'mouse'});
    assert.equal(h.videos.length, 0); assert.equal(h.cards[0].animations.length, 0); assert.equal(h.cards[0].hidden, false);
    assert.equal(h.document.documentElement.dataset.exhibitionMotion, 'off');
  }
  assert.doesNotMatch(source, /preventDefault\(|scrollTo\(|history\.|cursor\s*=/);
  assert.doesNotMatch(css, /cursor\s*:\s*none|object-fit:cover|#[a-fA-F0-9]{3,8}\b/);
  assert.match(css, /currentColor/); assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css, /\.browse-card\s*\{[^}]*opacity\s*:\s*0/);
});
