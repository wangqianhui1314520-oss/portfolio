const filters = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('[data-project-category]')];
const status = document.getElementById('filterStatus');
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
  const url = new URL(location.href); if (button.dataset.filter === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', button.dataset.filter);
  history.pushState(null, '', url);
});
addEventListener('popstate', () => selectFilter(new URL(location.href).searchParams.get('category') || 'all'));
if (filters.length) selectFilter(new URL(location.href).searchParams.get('category') || 'all');
for (const link of document.querySelectorAll('[data-language-switch]')) link.addEventListener('click', () => {
  const target = new URL(link.href); target.search = location.search; target.hash = location.hash; link.href = target.href;
  try {localStorage.setItem('tem-locale', link.hreflang === 'en' ? 'en' : 'zh');} catch {}
});
document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
for (const video of document.querySelectorAll('video')) video.addEventListener('play', () => {
  for (const other of document.querySelectorAll('video')) if (other !== video) other.pause();
});
addEventListener('visibilitychange', () => {if (document.hidden) document.querySelectorAll('video').forEach(video => video.pause());});
