// Progressive enhancement: every image remains a normal original-image link without JS.
export function wrappedIndex(index, length) {
  return length > 0 ? ((index % length) + length) % length : -1;
}

export function initializeCaseMedia(root = document) {
  const links = [...root.querySelectorAll('a[data-case-media]')];
  if (!links.length || typeof HTMLDialogElement === 'undefined') return null;
  const en = root.documentElement.lang === 'en';
  const copy = en ? {
    title: 'Project images', close: 'Close image viewer', previous: 'Previous image', next: 'Next image',
    original: 'Open original ↗', loading: 'Loading image…', error: 'Image not loaded. Open the original to view it.'
  } : {
    title: '作品图像', close: '关闭图片查看', previous: '上一张', next: '下一张',
    original: '查看原图 ↗', loading: '正在载入图片…', error: '图片未载入，请查看原图。'
  };
  const dialog = root.createElement('dialog');
  if (typeof dialog.showModal !== 'function') return null;
  dialog.className = 'case-lightbox';
  dialog.setAttribute('aria-labelledby', 'caseLightboxTitle');
  dialog.innerHTML = '<header class="case-lightbox-bar"><h2 id="caseLightboxTitle"></h2><span data-media-count aria-live="polite" aria-atomic="true"></span><button type="button" data-media-close autofocus>×</button></header><figure><div class="case-lightbox-stage" aria-busy="true"><img alt=""><p data-media-status role="status"></p></div><figcaption></figcaption></figure><footer class="case-lightbox-bar"><button type="button" data-media-prev>←</button><a data-media-original target="_blank" rel="noopener noreferrer"></a><button type="button" data-media-next>→</button></footer>';
  const select = selector => dialog.querySelector(selector);
  const image = select('img'), stage = select('.case-lightbox-stage');
  const status = select('[data-media-status]'), caption = select('figcaption');
  const previous = select('[data-media-prev]'), next = select('[data-media-next]');
  const close = select('[data-media-close]'), original = select('[data-media-original]');
  select('h2').textContent = copy.title;
  close.setAttribute('aria-label', copy.close);
  previous.setAttribute('aria-label', copy.previous);
  next.setAttribute('aria-label', copy.next);
  original.textContent = copy.original;
  previous.hidden = next.hidden = links.length < 2;
  let index = 0, opener = null;
  function settle(failed = false) {
    stage.setAttribute('aria-busy', 'false');
    dialog.dataset.state = failed ? 'error' : 'ready';
    status.textContent = failed ? copy.error : '';
  }
  function show(number) {
    index = wrappedIndex(number, links.length);
    const link = links[index], thumbnail = link.querySelector('img');
    const text = link.dataset.mediaCaption || thumbnail?.alt || copy.title;
    caption.textContent = text;
    image.alt = text;
    original.href = link.href;
    select('[data-media-count]').textContent = `${index + 1} / ${links.length}`;
    status.textContent = copy.loading;
    stage.setAttribute('aria-busy', 'true');
    dialog.dataset.state = 'loading';
    image.src = link.href;
    if (image.complete && image.naturalWidth) settle();
  }
  image.addEventListener('load', () => settle());
  image.addEventListener('error', () => settle(true));
  for (const [number, link] of links.entries()) link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    opener = link;
    show(number);
    dialog.showModal();
    root.documentElement.classList.add('case-media-open');
    event.preventDefault();
  });
  close.addEventListener('click', () => dialog.close());
  previous.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  // Native dialog supplies inert background, trapped Tab focus and Escape dismissal.
  dialog.addEventListener('click', event => {if (event.target === dialog) dialog.close();});
  dialog.addEventListener('close', () => {
    root.documentElement.classList.remove('case-media-open');
    image.removeAttribute('src');
    if (opener?.isConnected) opener.focus({preventScroll: true});
  });
  addEventListener('pagehide', () => {if (dialog.open) dialog.close();});
  root.body.append(dialog);
  return dialog;
}

if (typeof document !== 'undefined') initializeCaseMedia();
