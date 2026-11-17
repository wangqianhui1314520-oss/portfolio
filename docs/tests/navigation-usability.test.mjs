import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source = readFileSync(new URL('../assets/js/international-static.js', import.meta.url), 'utf8');
const menuCode = source.slice(source.indexOf('function initializeMenus()'), source.indexOf('\ninitializeMenus();'));
const feedbackCode = source.slice(source.indexOf('function archiveFeedback('), source.indexOf('// Shared header:'));
const feedback = new Function(feedbackCode + '; return archiveFeedback;')();

function menuHarness() {
  const listeners = new Map(), attrs = new Map([['aria-controls','nav'], ['aria-expanded','false']]);
  let narrow = true;
  const document = {activeElement: null};
  const node = name => ({name, events: new Map(),
    addEventListener(type, fn) {if (!this.events.has(type)) this.events.set(type, []); this.events.get(type).push(fn);},
    focus() {document.activeElement = this;}, getClientRects() {return [{}];}});
  const header = node('header'), toggle = node('toggle'), menu = node('menu'), links = [node('work'), node('about'), node('language')], outside = node('content');
  header.dataset = {};
  header.contains = value => [header, toggle, menu, ...links].includes(value);
  menu.contains = value => [menu, ...links].includes(value);
  toggle.closest = () => header;
  toggle.getAttribute = key => attrs.get(key);
  toggle.setAttribute = (key, value) => attrs.set(key, value);
  menu.querySelectorAll = () => links;
  document.querySelectorAll = () => [toggle];
  document.getElementById = () => menu;
  document.events = new Map(); document.addEventListener = node('document').addEventListener;
  const context = {document,
    addEventListener(type, fn) {if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn);},
    getComputedStyle: () => ({display: narrow ? 'block' : 'none'})};
  runInNewContext(menuCode + '\ninitializeMenus();', context);
  const fire = (target, type, values = {}) => {
    const event = {type, target, detail: 1, prevented: false, stopped: false,
      preventDefault() {this.prevented = true;}, stopPropagation() {this.stopped = true;}, stopImmediatePropagation() {this.stopped = true;}, ...values};
    for (const fn of target.events.get(type) || []) fn(event);
    return event;
  };
  return {document, header, toggle, menu, links, outside, fire,
    get open() {return attrs.get('aria-expanded') === 'true';},
    resize(value) {narrow = value; for (const fn of listeners.get('resize') || []) fn({});},
    show(persisted) {for (const fn of listeners.get('pageshow') || []) fn({persisted});}};
}

test('keyboard menu opening starts at a destination, while pointer opening leaves focus alone', () => {
  const h = menuHarness(); h.toggle.focus();
  h.fire(h.toggle, 'click', {detail: 1}); assert.equal(h.open, true); assert.equal(h.document.activeElement, h.toggle);
  h.fire(h.toggle, 'click', {detail: 1}); assert.equal(h.open, false);
  h.fire(h.toggle, 'click', {detail: 0}); assert.equal(h.document.activeElement, h.links[0]);
  h.fire(h.toggle, 'click', {detail: 1});
  const arrow = h.fire(h.toggle, 'keydown', {key: 'ArrowUp'});
  assert.equal(h.open, true); assert.equal(h.document.activeElement, h.links.at(-1)); assert.equal(arrow.prevented, true); assert.equal(arrow.stopped, true);
});

test('menu Arrow/Home/End navigation stays inside its destinations without moving the project ribbon', () => {
  const h = menuHarness(); h.fire(h.toggle, 'keydown', {key: 'ArrowDown'});
  for (const [key, expected] of [['End', 2], ['ArrowDown', 0], ['Home', 0], ['ArrowUp', 2]]) {
    const event = h.fire(h.menu, 'keydown', {key});
    assert.equal(h.document.activeElement, h.links[expected]); assert.equal(event.prevented, true); assert.equal(event.stopped, true);
  }
  const modified = h.fire(h.menu, 'keydown', {key: 'Home', ctrlKey: true});
  assert.equal(modified.prevented, false);
});

test('Tab can leave a disclosure naturally; focus outside closes it without being pulled back', () => {
  const h = menuHarness(); h.fire(h.toggle, 'click', {detail: 0});
  const tab = h.fire(h.menu, 'keydown', {key: 'Tab'}); assert.equal(tab.prevented, false);
  h.outside.focus(); h.fire(h.header, 'focusout', {relatedTarget: h.outside});
  assert.equal(h.open, false); assert.equal(h.document.activeElement, h.outside);
});

test('Escape returns to the menu toggle and a folded breakpoint never leaves focus hidden', () => {
  const h = menuHarness(); h.fire(h.toggle, 'click', {detail: 0});
  const escape = h.fire(h.document, 'keydown', {key: 'Escape'});
  assert.equal(h.open, false); assert.equal(h.document.activeElement, h.toggle); assert.equal(escape.prevented, true);
  h.resize(false); h.links[1].focus(); h.resize(true);
  assert.equal(h.document.activeElement, h.toggle);
});

test('history reactivation closes a cached menu and recovers focus if its old destination is hidden', () => {
  const h = menuHarness(); h.fire(h.toggle, 'click', {detail: 0}); h.show(true);
  assert.equal(h.open, false); assert.equal(h.document.activeElement, h.toggle);
});

test('archive feedback reports the visible view/count instead of pretending a grid has one current project', () => {
  assert.equal(feedback({english: false, view: 'featured', count: 3}), '精选作品，3 件作品。');
  assert.equal(feedback({english: false, view: 'grid', count: 4, label: '技术', title: '安药'}), '技术，网格视图，4 件作品。');
  assert.equal(feedback({english: true, view: 'list', count: 1, label: 'Film'}), 'Film. List view: 1 project.');
  assert.equal(feedback({english: true, view: 'ribbon', count: 7, title: 'Yuanmo'}), 'Project ribbon: 7 projects. Now showing Yuanmo.');
  assert.equal(feedback({english: false, view: 'grid', count: 0}), '网格视图，0 件作品。');
  assert.match(source, /next === 'featured' \? cards\.filter\(card => !card\.hidden\)\.length : items\.length/);
  assert.match(source, /say\(archiveFeedback\(\{english, view: next, count, label, title\}\)\)/);
});
