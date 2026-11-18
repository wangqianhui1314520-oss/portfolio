import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../assets/css/case-exhibition.css',import.meta.url),'utf8');
const mobile=css.slice(css.indexOf('@media(max-width:560px)'),css.indexOf('@media(prefers-reduced-motion:reduce)'));
const variables=project=>{
  const selector='body.reading-page.case-page'+(project?`[data-project=${project}]`:'');
  const start=css.indexOf(selector+'{'),end=css.indexOf('}',start);
  assert.ok(start>=0,selector);
  return Object.fromEntries([...css.slice(start,end).matchAll(/--([\w-]+):([^;]+);/g)].map(match=>[match[1],match[2].trim()]));
};
const luminance=hex=>{
  const channels=hex.slice(1).match(/../g).map(part=>parseInt(part,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
};
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);};

test('the exhibition has a warm default, a mint product space, copper strategy and cool-blue agent space',()=>{
  assert.equal(variables().bg,'#f1f0eb');
  assert.equal(variables('anyao').panel,'#e8eee9');
  assert.equal(variables('yuanmo').bg,'#171715');
  assert.equal(variables('yuanmo').accent,'#d3ad72');
  assert.equal(variables('dafeiyu').bg,'#0c1117');
  assert.equal(variables('dafeiyu').accent,'#a8d5f5');
  assert.match(css,/body\.reading-page\.case-page::before\{display:none;content:none;background:none\}/);
  assert.doesNotMatch(css,/url\(|@import|\b(?:star|galaxy|nebula)\b/i);
});

test('all project palettes keep body, supporting copy and primary controls above 4.5 to 1 contrast',()=>{
  for(const project of [undefined,'anyao','yuanmo','dafeiyu']){
    const palette=variables(project);
    for(const field of ['ink','muted','quiet'])assert.ok(contrast(palette[field],palette.bg)>=4.5,`${project||'default'} ${field}`);
    assert.ok(contrast(palette['case-on-accent'],palette.accent)>=4.5,`${project||'default'} primary action`);
  }
});

test('typographic hero and full-row media retain complete evidence, intrinsic screenshots and video controls',()=>{
  assert.match(css,/grid-template-areas:"intro actions" "media media"/);
  assert.match(css,/font-size:clamp\(56px,8vw,128px\)/);
  assert.match(css,/\.case-intro h1\{[^}]*font-family:inherit/);
  assert.match(css,/:lang\(en\)[^}]*\.case-intro h1/);
  assert.match(css,/object-fit:contain/);
  assert.doesNotMatch(css,/object-fit:cover|autoplay|view-transition-name|\.mp4/);
  assert.match(css,/data-evidence-kind=image\] \.case-evidence-frame\{[^}]*aspect-ratio:auto/);
  assert.match(css,/data-evidence-kind=image\] \.case-cover\{[^}]*width:auto[^}]*height:auto/);
  assert.match(css,/max-height:min\(80svh,860px\)/);
});

test('application milestones form an open three-column record and a clear mobile sequence',()=>{
  assert.match(css,/\.case-impact ol\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  const item=css.match(/\.case-impact li\{([^}]+)\}/)?.[1];
  assert.ok(item);
  assert.match(item,/border-top:2px solid var\(--accent\)/);
  assert.match(item,/background:transparent/);
  assert.doesNotMatch(item,/border-radius|box-shadow/);
  assert.match(mobile,/\.case-impact ol\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(mobile,/\.case-impact strong\{[^}]*font-size:30px/);
});

test('case reading, contribution and results receive a sans hierarchy rather than a shared starfield',()=>{
  assert.match(css,/\.case-layout\{display:grid;grid-template-columns:minmax\(150px,200px\) minmax\(0,980px\)/);
  assert.match(css,/\.case-section h2\{[^}]*font-size:clamp\(34px,3\.4vw,52px\)/);
  assert.match(css,/\.result-panel\{padding:36px;[^}]*background:var\(--panel\)/);
  assert.match(css,/\.result-panel p\{[^}]*font-size:21px/);
  assert.match(css,/\.case-next-link h2\{[^}]*font-size:clamp\(42px,6vw,88px\)/);
  assert.match(css,/\.site-header\{background:var\(--bg\)/);
  assert.match(css,/\.site-header\[data-menu-ready\] \.nav-links\{background:var\(--bg\);box-shadow:none/);
});

test('mobile and keyboard paths keep native links, visible focus and at least 44px interaction targets',()=>{
  assert.match(css,/:is\(a,button,summary,video\):focus-visible\{outline:3px solid var\(--accent\)/);
  assert.match(css,/\.case-index a\{[^}]*min-height:44px/);
  assert.match(css,/\.case-actions a\{[^}]*min-height:48px/);
  assert.match(css,/\.case-evidence-note>summary\{min-height:44px/);
  assert.match(css,/\.contact-links a\{[^}]*min-height:50px/);
  assert.match(css,/@media\(max-width:920px\)[\s\S]*overflow-x:auto/);
  assert.match(mobile,/\.case-summary-grid>div\{display:grid;grid-template-columns:70px minmax\(0,1fr\)/);
  assert.match(mobile,/\.case-intro h1\{font-size:clamp\(44px,12vw,64px\)/);
  assert.match(mobile,/\.case-section p,body\.reading-page\.case-page \.case-section li\{font-size:17px/);
});

test('the stylesheet is isolated to case pages, balanced, printable and free of new animation or resources',()=>{
  const uncommented=css.replace(/\/\*[\s\S]*?\*\//g,'');
  for(const match of uncommented.matchAll(/([^{}]+)\{/g)){
    const selector=match[1].trim();
    if(selector.startsWith('@'))continue;
    for(const part of selector.replace(/:is\([^)]*\)/g,':is(...)').split(','))assert.ok(part.trim().startsWith('body.reading-page.case-page'),part);
  }
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
  assert.doesNotMatch(css,/@keyframes|animation:|@font-face|\.glb|\.js|content:["']/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*transition:none/);
  assert.match(css,/@media print[\s\S]*color-scheme:light;background:#ffffff/);
});
