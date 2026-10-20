import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const bootSource=readFileSync(new URL('../assets/js/international-boot.js',import.meta.url),'utf8')
 .replace(/^import .*$/gm,'')
 .replace(/import\('\.\/immersive-audio\.js[^']*'\)/g,'Promise.resolve(audioFixture)')
 .replace(/import\('\.\/immersive-engine\.js[^']*'\)/g,'loadGraphics()')
 .replace(/import\('\.\/immersive-exploration\.js[^']*'\)/g,'Promise.resolve(explorationFixture)');

async function harness(){
 const listeners=new Map(),subscriptions=new Set(),raf=[],inputs=new Map();let fontsDone,chapter='reading',position=0,maximum=120,writes=0;
 const search='?view=captain&chapter=reading';
 const location={href:'http://localhost/en/'+search,pathname:'/en/',search};
 const panel={isConnected:true,offsetHeight:515,
  get scrollTop(){return position;},set scrollTop(value){position=Math.max(0,Math.min(maximum,value));writes++;},
  addEventListener(name,fn){if(!inputs.has(name))inputs.set(name,new Set());inputs.get(name).add(fn);},
  removeEventListener(name,fn){inputs.get(name)?.delete(fn);}};
 const document={baseURI:'http://localhost/',body:{dataset:{graphics:'loading'},classList:{add(){},remove(){}}},
  fonts:{ready:new Promise(resolve=>fontsDone=resolve)},getElementById:id=>id==='profilePanel'?panel:null,
  querySelector:()=>null,querySelectorAll:()=>[]};
 const journey={state:{step:'captain'},progress:{},restoreProgress(){}};
 const emit=type=>{for(const listener of [...listeners.get(type)||[]])listener({type});};
 const context={document,location,window:{PORTFOLIO_DATA:{works:[]}},URL,Event,
  currentLocale:()=> 'en',localizedData:data=>data,localizeDOM(){},initializeSettings(){},
  audioFixture:{isSoundOn:()=>false,getSoundVolume:()=>0.8,setSound(){},setSoundVolume(){}},
  viewFromURL:()=>({}),restoreView:()=>({restored:false}),
  viewSearch:state=>state.step==='captain'?'?view=captain&chapter='+chapter:'?view=map',
  explorationFixture:{journey,navigate(){},subscribe(fn){subscriptions.add(fn);return()=>subscriptions.delete(fn);},currentChapter:()=>chapter,selectChapter(){}},
  loadGraphics:()=>Promise.resolve({}),
  sessionStorage:{getItem:key=>key==='tem-language-view'?JSON.stringify({locale:'en',search,scroll:1050}):null,setItem(){},removeItem(){}},
  localStorage:{setItem(){}},MutationObserver:class{observe(){}},queueMicrotask,
  addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},
  removeEventListener(name,fn){listeners.get(name)?.delete(fn);},dispatchEvent:event=>emit(event.type),
  requestAnimationFrame:fn=>raf.push(fn),history:{pushState(_state,_title,url){location.search=new URL(url,'http://localhost').search;}}
 };
 await runInNewContext('(async()=>{'+bootSource+'})()',context);
 return {panel,journey,raf,inputs,get writes(){return writes;},
  scene(type='tem:scene-ready'){maximum=1800;emit(type);},
  fonts:async()=>{fontsDone();for(let turn=0;turn<6;turn++)await Promise.resolve();},
  frame(){const callbacks=raf.splice(0);for(const fn of callbacks)fn();},
  userInput(name,event={}){for(const fn of [...inputs.get(name)||[]])fn(event);},
  chapter(value){chapter=value;emit('tem:archive-chapter');},
  navigate(){journey.state.step='map';for(const fn of [...subscriptions])fn();}};
}

test('language scroll waits for scene layout, fonts and two subsequent frames',async()=>{
 const h=await harness();
 await h.fonts();h.frame();assert.equal(h.writes,0,'standby must not clamp the requested world-space scroll');
 h.scene();h.frame();await h.fonts();
 assert.equal(h.writes,0);h.frame();assert.equal(h.writes,0,'the first post-font frame only settles layout');
 h.frame();assert.equal(h.panel.scrollTop,1050);assert.equal(h.writes,1);
 assert.equal([...h.inputs.values()].reduce((sum,set)=>sum+set.size,0),0,'restoration releases its temporary input listeners');
});

test('a graphics fallback also restores after fonts settle',async()=>{
 const h=await harness();h.scene('tem:scene-failed');h.frame();
 assert.equal(h.raf.length,0,'pending fonts must not queue the final restore');
 await h.fonts();h.frame();h.frame();assert.equal(h.panel.scrollTop,1050);
});

test('visitor input or changed navigation cancels delayed language restoration',async()=>{
 for(const cancel of [
  h=>h.userInput('wheel'),h=>h.userInput('touchmove'),h=>h.userInput('pointerdown'),
  h=>h.userInput('keydown',{key:'PageDown'}),h=>h.chapter('practice'),h=>h.navigate()
 ]){
  const h=await harness();h.scene();h.frame();cancel(h);h.panel.scrollTop=80;
  await h.fonts();h.frame();h.frame();
  assert.equal(h.panel.scrollTop,80,'a late font/scene result must not override the visitor');
  assert.equal(h.writes,1);
 }
});

test('input between the two final frames still wins over the saved position',async()=>{
 const h=await harness();h.scene();h.frame();await h.fonts();h.frame();
 h.userInput('wheel');h.panel.scrollTop=140;h.frame();
 assert.equal(h.panel.scrollTop,140);assert.equal(h.writes,1);
});
