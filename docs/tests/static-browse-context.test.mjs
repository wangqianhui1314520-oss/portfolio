import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {languageDestination} from '../assets/js/locale-data.js';

const source = readFileSync(new URL('../assets/js/international-static.js', import.meta.url), 'utf8').replace(/^import .+;\s*$/gm, '');

// Exercise the real page controller and its browser-history boundary.
function pageHarness({url, kind = 'list', projects = [], returns = [], language = '/en/work/'} = {}) {
  let current = new URL(url);
  const handlers = new Map(), pushes = [], storage = new Map();
  class Element {
    dataset = {}; attributes = new Map(); handlers = new Map(); hidden = false; textContent = '';
    constructor(dataset = {}) { this.dataset = dataset; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    addEventListener(type, handler) {
      if (!this.handlers.has(type)) this.handlers.set(type, []);
      this.handlers.get(type).push(handler);
    }
    emit(type) { for (const handler of this.handlers.get(type) || []) handler({target: this}); }
  }
  const link = href => Object.assign(new Element(), {href: new URL(href, current).href});
  const filters = kind === 'list' ? ['all', 'forge', 'lumen', 'echo', 'nexus'].map(filter => new Element({filter})) : [];
  const cards = projects.map(project => {
    const card = new Element({projectCategory: project.category});
    card.link = link(project.href);
    card.querySelectorAll = selector => selector === 'a[href]' ? [card.link] : [];
    return card;
  });
  const returnLinks = returns.map(link), languageLink = link(language), status = new Element();
  languageLink.hreflang = new URL(languageLink.href).pathname.includes('/en/') ? 'en' : 'zh-CN';
  const featured = new Element();
  featured.querySelectorAll = () => cards.slice(0, 2);
  const location = {get href() { return current.href; }};
  const context = {
    URL, location, languageDestination,
    document: {
      documentElement: {lang: current.pathname.includes('/en/') ? 'en' : 'zh-CN'},
      getElementById: id => id === 'filterStatus' ? status : null,
      querySelector: selector => selector === '[aria-labelledby="featuredTitle"]' && kind === 'list' ? featured : null,
      querySelectorAll: selector => ({
        '[data-filter]': filters, '[data-project-category]': cards,
        '[data-language-switch]': [languageLink], '.breadcrumb a, .case-actions a': returnLinks,
        video: []
      })[selector] || []
    },
    history: {pushState(_state, _title, destination) { current = new URL(destination, current); pushes.push(current.href); }},
    localStorage: {setItem: (key, value) => storage.set(key, value)},
    window: {print() {}},
    addEventListener(type, handler) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(handler);
    }
  };
  runInNewContext(source, context);
  return {
    cards, filters, returnLinks, languageLink, status, featured, pushes, storage,
    get url() { return current; },
    filter: category => filters.find(button => button.dataset.filter === category).emit('click'),
    visit(destination, event = 'popstate') {
      current = new URL(destination, current);
      for (const handler of handlers.get(event) || []) handler({});
    }
  };
}

test('filtered list links carry only the valid category to same-language cases', () => {
  const h = pageHarness({
    url: 'https://example.test/zh/work/?category=forge&ref=portfolio#archiveTitle',
    projects: [
      {category: 'forge', href: '/zh/work/growth/'},
      {category: 'lumen', href: '/zh/work/epoch/'},
      {category: 'echo', href: '/en/work/novel/'},
      {category: 'nexus', href: 'https://outside.test/zh/work/esp32-learn/'}
    ]
  });
  assert.equal(h.cards[0].link.href, 'https://example.test/zh/work/growth/?category=forge');
  assert.equal(h.cards[1].link.href, 'https://example.test/zh/work/epoch/?category=forge');
  assert.equal(h.cards[2].link.href, 'https://example.test/en/work/novel/');
  assert.equal(h.cards[3].link.href, 'https://outside.test/zh/work/esp32-learn/');
  assert.equal(h.cards[0].hidden, false);
  assert.equal(h.cards[1].hidden, true);
  assert.equal(h.languageLink.href, 'https://example.test/en/work/?category=forge&ref=portfolio#archiveTitle');
});

test('filter changes and browser back/forward synchronize cards, case links, and language links', () => {
  const h = pageHarness({
    url: 'https://example.test/zh/work/',
    projects: [{category: 'forge', href: '/zh/work/growth/'}, {category: 'lumen', href: '/zh/work/epoch/'}]
  });
  h.filter('forge');
  assert.equal(h.url.search, '?category=forge');
  assert.equal(new URL(h.cards[0].link.href).search, '?category=forge');
  h.filter('lumen');
  assert.equal(h.cards[0].hidden, true);
  assert.equal(h.cards[1].hidden, false);
  assert.equal(new URL(h.cards[1].link.href).search, '?category=lumen');
  assert.equal(new URL(h.languageLink.href).search, '?category=lumen');
  h.visit(h.pushes[0]);
  assert.equal(h.cards[0].hidden, false);
  assert.equal(h.filters.find(button => button.dataset.filter === 'forge').attributes.get('aria-pressed'), 'true');
  assert.equal(new URL(h.cards[0].link.href).search, '?category=forge');
  h.visit(h.pushes[1]);
  assert.equal(new URL(h.languageLink.href).search, '?category=lumen');
  h.filter('all');
  assert.equal(h.url.search, '');
  assert.equal(new URL(h.cards[0].link.href).search, '');
  assert.equal(new URL(h.languageLink.href).search, '');
  assert.equal(h.cards.every(card => !card.hidden), true);
});

test('case breadcrumb and more-project links retain the category without contaminating other destinations', () => {
  const h = pageHarness({
    kind: 'case', url: 'https://example.test/zh/work/growth/?category=forge&ref=portfolio#contribution',
    language: '/en/work/growth/',
    returns: ['/zh/work/', '/zh/work/', '/zh/?work=growth', '/zh/poetry/', '#overview', '/zh/work/epoch/', 'https://outside.test/zh/work/']
  });
  assert.equal(h.returnLinks[0].href, 'https://example.test/zh/work/?category=forge');
  assert.equal(h.returnLinks[1].href, 'https://example.test/zh/work/?category=forge');
  assert.equal(h.returnLinks[2].href, 'https://example.test/zh/?work=growth');
  assert.equal(h.returnLinks[3].href, 'https://example.test/zh/poetry/');
  assert.equal(h.returnLinks[4].href, 'https://example.test/zh/work/growth/?category=forge&ref=portfolio#overview');
  assert.equal(h.returnLinks[5].href, 'https://example.test/zh/work/epoch/');
  assert.equal(h.returnLinks[6].href, 'https://outside.test/zh/work/');
  assert.equal(h.languageLink.href, 'https://example.test/en/work/growth/?category=forge&ref=portfolio#contribution');
  h.visit('?category=echo#access');
  assert.equal(new URL(h.returnLinks[0].href).search, '?category=echo');
  assert.equal(new URL(h.languageLink.href).search, '?category=echo');
  h.visit('#outcome', 'hashchange');
  assert.equal(new URL(h.languageLink.href).hash, '#outcome');
});

test('all and unknown categories are omitted from outgoing work context', () => {
  for (const category of ['all', 'unknown', 'FORGE', 'forge,echo', '']) {
    for (const kind of ['list', 'case']) {
      const path = kind === 'list' ? '/zh/work/' : '/zh/work/growth/';
      const h = pageHarness({
        kind, url: `https://example.test${path}?category=${encodeURIComponent(category)}&ref=keep`,
        projects: [{category: 'forge', href: '/zh/work/growth/?category=stale'}],
        returns: ['/zh/work/?category=stale'], language: path.replace('/zh/', '/en/')
      });
      const destination = kind === 'list' ? h.cards[0].link : h.returnLinks[0];
      assert.equal(new URL(destination.href).searchParams.has('category'), false, `${kind}: ${category}`);
      assert.equal(new URL(h.languageLink.href).searchParams.has('category'), false, `${kind}: ${category}`);
      assert.equal(new URL(h.languageLink.href).searchParams.get('ref'), 'keep');
    }
  }
});

test('directory hosting and direct index documents preserve all four allowed categories', () => {
  for (const category of ['forge', 'lumen', 'echo', 'nexus']) {
    const list = pageHarness({
      url: `https://example.test/portfolio/en/work/index.html?category=${category}`,
      projects: [{category, href: '/portfolio/en/work/esp32-learn/index.html'}],
      language: '/portfolio/zh/work/'
    });
    assert.equal(list.cards[0].link.href, `https://example.test/portfolio/en/work/esp32-learn/index.html?category=${category}`);
    const detail = pageHarness({
      kind: 'case', url: list.cards[0].link.href,
      returns: ['/portfolio/en/work/index.html'], language: '/portfolio/zh/work/esp32-learn/'
    });
    assert.equal(detail.returnLinks[0].href, `https://example.test/portfolio/en/work/index.html?category=${category}`);
    assert.equal(new URL(detail.languageLink.href).search, `?category=${category}`);
    detail.languageLink.emit('click');
    assert.equal(detail.storage.get('tem-locale'), 'zh');
  }
});

test('unrelated static pages keep existing links and language-anchor behavior', () => {
  const h = pageHarness({
    kind: 'poetry', url: 'https://example.test/en/poetry/?edition=original#meng-jun-ling',
    returns: ['/en/work/', '/en/?view=captain'], language: '/zh/poetry/'
  });
  assert.equal(h.returnLinks[0].href, 'https://example.test/en/work/');
  assert.equal(h.returnLinks[1].href, 'https://example.test/en/?view=captain');
  assert.equal(h.languageLink.href, 'https://example.test/zh/poetry/?edition=original#meng-jun-ling');
});
