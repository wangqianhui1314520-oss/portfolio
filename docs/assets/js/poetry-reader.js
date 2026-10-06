import {translateMarkup} from './i18n.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function poetryDirectory(collection){
 return `<header class="poetry-heading"><span class="reader-kicker">TEM / ORIGINAL POETRY</span><h2 id="readerTitle" tabindex="-1">${esc(collection.title)}</h2><p>${esc(collection.description)}</p><small>${esc(collection.totalLabel)}</small></header><ol class="poem-directory">${collection.poems.map((p,i)=>`<li><button type="button" data-poem="${esc(p.id)}"><span class="poem-number">0${i+1}</span><span><strong>${esc(p.title)}</strong><small>${esc(p.theme)} · ${esc(p.dateLabel)}</small><span class="poem-preview">${esc(p.paragraphs[0])}</span></span><i aria-hidden="true">↗</i></button></li>`).join('')}</ol>`;
}
function poemPage(collection,id){
 const index=collection.poems.findIndex(p=>p.id===id),p=collection.poems[index];
 if(!p)return renderPoetryDirectory(collection);
 return `<article class="poem-article"><header class="poetry-heading"><span class="reader-kicker">${esc(collection.title)} / 0${index+1} OF 0${collection.poems.length}</span><h2 id="readerTitle" tabindex="-1">${esc(p.title)}</h2><p class="poem-byline">${esc(collection.author)} · <time datetime="${esc(p.date)}">${esc(p.dateLabel)}</time></p><small>${esc(p.theme)}</small></header>${collection.locale==='en'?'<p class="translation-note">AI-assisted literary translation. The Chinese original and manuscript are preserved below.</p>':''}<div class="poem-text">${p.paragraphs.map(line=>`<p>${esc(line)}</p>`).join('')}</div>${collection.locale==='en'?`<details class="original-poem"><summary>Read the Chinese original · <span lang="zh-CN">${esc(p.originalTitle)}</span></summary><div class="poem-text" lang="zh-CN" data-original-text>${p.originalParagraphs.map(line=>`<p>${esc(line)}</p>`).join('')}</div></details>`:''}<details class="poem-original"><summary>查看原稿图片 <span aria-hidden="true">＋</span></summary><p>文字按原稿转录，标点作阅读整理；署日与笔记记录日期不同时，以文末署日为准。</p><a href="${esc(p.image)}" target="_blank" rel="noopener noreferrer">打开原图 ↗</a><img loading="lazy" decoding="async" src="${esc(p.image)}" alt="${esc(p.title)}的作者原稿"></details><nav class="poem-pagination" aria-label="诗篇翻页"><button type="button" data-poem="${esc(collection.poems[index-1]?.id||'')}" ${index===0?'disabled':''}>← 上一首</button><button type="button" data-poem-directory>返回诗集目录</button><button type="button" data-poem="${esc(collection.poems[index+1]?.id||'')}" ${index===collection.poems.length-1?'disabled':''}>下一首 →</button></nav></article>`;
}

// The modal leaves the underlying chapter, scroll and voyage state untouched.
export function initPoetryReader(data,{standalone=false}={}){
 const collection=data.poetry,dialog=document.createElement('dialog');
 dialog.className='poetry-reader';dialog.id='poetryDialog';dialog.setAttribute('aria-labelledby','readerTitle');
 dialog.innerHTML=translateMarkup(`<div class="reader-toolbar"><button type="button" data-poem-directory>← 诗集目录</button><span>${esc(collection.title)} / TEM</span><button type="button" data-reader-close>${standalone?'返回作品集':'关闭阅读'} <span aria-hidden="true">×</span></button></div><div class="reader-scroll"></div>`,collection.locale||'zh');
 document.body.append(dialog);
 const scroll=dialog.querySelector('.reader-scroll'),positions=new Map(),originals=new Set();
 let selected=null,returnFocus=null;
 function render(){scroll.innerHTML=selected?renderPoem(collection,selected):renderPoetryDirectory(collection);if(originals.has(selected)){const original=scroll.querySelector('.poem-original');if(original)original.open=true;}scroll.scrollTop=positions.get(selected)||0;dialog.querySelector('[data-poem-directory]').disabled=selected===null;scroll.querySelector('#readerTitle')?.focus({preventScroll:true});}
 function save(){positions.set(selected,scroll.scrollTop);if(scroll.querySelector('.poem-original')?.open)originals.add(selected);else originals.delete(selected);}
 function open(id){if(dialog.open)return;returnFocus=document.activeElement;if(id&&collection.poems.some(p=>p.id===id))selected=id;render();document.body.dataset.reading='poetry';dialog.showModal();scroll.scrollTop=positions.get(selected)||0;scroll.querySelector('#readerTitle')?.focus({preventScroll:true});}
 dialog.addEventListener('click',event=>{const poem=event.target.closest('[data-poem]'),directory=event.target.closest('[data-poem-directory]');if(poem&&!poem.disabled){save();selected=poem.dataset.poem;render();}else if(directory){save();selected=null;render();}else if(event.target.closest('[data-reader-close]')){save();if(standalone)location.href=(collection.locale==='en'?'en/work/':'zh/work/');else dialog.close();}});
 // Save before the native close hides the scroll container and resets its dimensions.
 dialog.addEventListener('close',()=>{delete document.body.dataset.reading;returnFocus?.isConnected&&returnFocus.focus({preventScroll:true});});
 dialog.addEventListener('cancel',event=>{save();if(standalone){event.preventDefault();selected=null;render();}});
 document.addEventListener('click',event=>{const button=event.target.closest('[data-read-poetry]');if(button){event.preventDefault();open(button.dataset.readPoetry);}});
 if(standalone)open(decodeURIComponent(location.hash.slice(1)));
 return {open};
}

export function renderPoetryDirectory(collection){return translateMarkup(poetryDirectory(collection),collection.locale||'zh');}
export function renderPoem(collection,id){return translateMarkup(poemPage(collection,id),collection.locale||'zh');}
