import {languageDestination} from './locale-data.js';

const filters = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('[data-project-category]')];
const status = document.getElementById('filterStatus');
const languageLinks = [...document.querySelectorAll('[data-language-switch]')];
const categories = new Set(['forge', 'lumen', 'echo', 'nexus']);
const categoryFrom = url => categories.has(url.searchParams.get('category')) ? url.searchParams.get('category') : null;
function workRoute(url) {
  const match = url.pathname.replace(/\/index\.html$/, '/').match(/^(.*\/(?:zh|en)\/work\/)(?:([^/]+)\/)?$/);
  return match ? {archivePath: match[1], project: match[2] || null} : null;
}
function withCategory(url, category) {
  if (category) url.searchParams.set('category', category);
  else url.searchParams.delete('category');
  return url.href;
}
function syncLanguageLinks() {
  const current = new URL(location.href), route = workRoute(current);
  for (const link of languageLinks) {
    const target = new URL(languageDestination(link.href, current.href));
    link.href = route && workRoute(target) ? withCategory(target, categoryFrom(current)) : target.href;
  }
}
function syncBrowseLinks() {
  const current = new URL(location.href), route = workRoute(current);
  if (!route) return;
  const links = route.project ? [...document.querySelectorAll('.breadcrumb a, .case-actions a')] : cards.flatMap(card => [...card.querySelectorAll('a[href]')]);
  for (const link of links) {
    const target = new URL(link.href, current), destination = workRoute(target);
    if (target.origin !== current.origin || destination?.archivePath !== route.archivePath || Boolean(destination.project) === Boolean(route.project)) continue;
    link.href = withCategory(target, categoryFrom(current));
  }
}
function syncNavigationLinks() {
  syncBrowseLinks();
  syncLanguageLinks();
}
function selectFilter(category) {
  if (!filters.some(button => button.dataset.filter === category)) category = 'all';
  for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.filter === category));
  let count = 0;
  for (const card of cards) {card.hidden = category !== 'all' && card.dataset.projectCategory !== category; if (!card.hidden) count++;}
  const featured=document.querySelector('[aria-labelledby="featuredTitle"]');
  if(featured)featured.hidden=![...featured.querySelectorAll('[data-project-category]')].some(card=>!card.hidden);
  if (status) status.textContent = document.documentElement.lang === 'en' ? count + (count===1?' project shown':' projects shown') : '展示 ' + count + ' 件作品';
}
for (const button of filters) button.addEventListener('click', () => {
  selectFilter(button.dataset.filter);
  const url = new URL(location.href); if (!categories.has(button.dataset.filter)) url.searchParams.delete('category'); else url.searchParams.set('category', button.dataset.filter);
  history.pushState(null, '', url);
  syncNavigationLinks();
});
addEventListener('popstate', () => {selectFilter(new URL(location.href).searchParams.get('category') || 'all');syncNavigationLinks();});
addEventListener('hashchange', syncLanguageLinks);
if (filters.length) selectFilter(new URL(location.href).searchParams.get('category') || 'all');
syncNavigationLinks();
for (const link of languageLinks) link.addEventListener('click', () => {
  syncLanguageLinks();
  try {localStorage.setItem('tem-locale', link.hreflang === 'en' ? 'en' : 'zh');} catch {}
});
document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
for (const video of document.querySelectorAll('video')) video.addEventListener('play', () => {
  for (const other of document.querySelectorAll('video')) if (other !== video) other.pause();
});
addEventListener('visibilitychange', () => {if (document.hidden) document.querySelectorAll('video').forEach(video => video.pause());});
