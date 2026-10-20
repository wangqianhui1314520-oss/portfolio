import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

class FakeElement{
 constructor(tag){
  const vars={};this.tagName=tag;this.dataset={};this.children=[];this.attributes={};this.textContent='';this.childElementCount=0;this.parts={};this.html='';
  this.style={setProperty(name,value){vars[name]=value;},getPropertyValue:name=>vars[name]??''};
 }
 set innerHTML(html){this.html=html;this.children=[...html.matchAll(/<li>/g)].map(()=>new FakeElement('li'));}
 get innerHTML(){return this.html;}
 setAttribute(name,value){this.attributes[name]=String(value);}
 append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
 after(node){const siblings=this.parentNode.children;siblings.splice(siblings.indexOf(this)+1,0,node);node.parentNode=this.parentNode;}
 querySelector(selector){return this.parts[selector]??=new FakeElement('span');}
 closest(){return null;}
}

// Loads the HUD module against a minimal document with a manual clock, timers
// and animation frames, so every state change is driven by the test.
function hud({reducedMotion=false,finePointer=true}={}){
 let now=1000,nextTimer=1,frames=[];
 const timers=new Map(),listeners=new Map(),events=[],subscribers=[],classes=new Set();
 const body=new FakeElement('body'),space=new FakeElement('canvas'),stage=new FakeElement('div'),readout=new FakeElement('div');
 body.append(space);
 const journey={state:{step:'bridge'}};
 const document={body,hidden:false,surfaces:[],
  documentElement:{classList:{toggle:(name,force)=>force?classes.add(name):classes.delete(name)}},
  createElement:tag=>new FakeElement(tag),getElementById:id=>id==='space'?space:null,
  querySelector:selector=>selector==='.journey-dock .stage-line'?stage:selector==='.header-readout'?readout:null,
  querySelectorAll(){return this.surfaces;},elementFromPoint:()=>null};
 const scope={document,journey,
  subscribe:callback=>subscribers.push(callback),getMotionPreference:()=>({matches:reducedMotion}),
  matchMedia:()=>({matches:finePointer,addEventListener(){}}),
  MutationObserver:class{observe(){}},Event:class{constructor(type){this.type=type;}},
  performance:{now:()=>now},
  setTimeout:(callback,delay)=>{const id=nextTimer++;timers.set(id,{callback,at:now+delay});return id;},
  clearTimeout:id=>timers.delete(id),setInterval:()=>0,
  requestAnimationFrame:callback=>{frames.push(callback);return frames.length;},
  addEventListener(type,callback){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(callback);},
  dispatchEvent(event){events.push(event.type);}};
 const source=read('assets/js/immersive-hud.js').replace(/^import .*$/gm,'').replace(/^export /gm,'');
 runInNewContext(source,scope,{filename:'immersive-hud.js'});
 const [rail]=stage.children,lock=space.parentNode.children[space.parentNode.children.indexOf(space)+1];
 const runTimers=()=>{for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.callback();}};
 return {scope,document,body,rail,lock,events,classes,
  tag:lock.querySelector('.hud-lock-tag'),read:lock.querySelector('.hud-lock-read'),reticle:body.children.find(node=>node.className==='hud-reticle'),
  setStep(step){journey.state={step};subscribers.forEach(callback=>callback(journey.state));runTimers();},
  advance(ms){now+=ms;runTimers();},
  flush(limit=1){for(let i=0;i<limit&&frames.length;i++){const due=frames;frames=[];due.forEach(callback=>callback(now));}},
  emit(type,event={}){for(const callback of listeners.get(type)||[])callback(event);}};
}

test('the mission rail follows the journey and stays empty outside it',()=>{
 const h=hud(),states=()=>h.rail.children.map(item=>item.dataset.state);
 assert.equal(h.rail.children.length,6);
 h.setStep('arrival');assert.deepEqual(states(),['done','done','current','','','']);
 h.setStep('signals');assert.deepEqual(states(),['done','done','done','current','','']);
 h.setStep('docked');assert.deepEqual(states(),['done','done','done','done','done','current']);
 for(const step of ['bridge','captain']){h.setStep(step);assert.deepEqual(states(),['','','','','',''],step);}
});

test('the lock completes on its own clock and announces the cue exactly once',()=>{
 const h=hud();
 h.setStep('signals');assert.equal(h.lock.dataset.state,'track');
 h.setStep('target');assert.equal(h.lock.dataset.state,'locking');
 h.advance(1499);assert.deepEqual(h.events,[]);
 h.advance(1);assert.equal(h.lock.dataset.state,'locked');assert.equal(h.tag.textContent,'TARGET LOCKED');assert.deepEqual(h.events,['tem:hud-lock']);
 // Leaving before the ring closes cancels the cue.
 h.setStep('signals');h.setStep('target');h.advance(500);h.setStep('signals');h.advance(5000);
 assert.deepEqual(h.events,['tem:hud-lock']);
 h.setStep('target');h.setStep('docking');assert.equal(h.lock.dataset.state,'docking');
 const reduced=hud({reducedMotion:true});reduced.setStep('target');
 assert.equal(reduced.lock.dataset.state,'locked','reduced motion locks without the sweep');assert.deepEqual(reduced.events,['tem:hud-lock']);
});

test('placeLock frames the ship and derives range, bearing and closing speed',()=>{
 const h=hud();h.setStep('target');h.advance(750);
 const view={x:100,y:200.04,radius:50,distance:43.1,bearing:347.4,label:''};
 h.scope.placeLock(view);
 assert.equal(h.lock.style.transform,'translate3d(100.0px,200.0px,0)');
 assert.equal(h.lock.style.getPropertyValue('--r'),'50.0px');assert.equal(h.lock.style.getPropertyValue('--s'),'0.500');
 assert.equal(h.lock.style.getPropertyValue('--lock'),'50.0');assert.equal(h.tag.textContent,'LOCKING 050%');
 assert.equal(h.read.innerHTML,'RNG 43,100 KM<br>BRG 347° · VEL 0 KM/S');
 assert.ok('placed' in h.lock.dataset);
 // One world unit is 1,000 km: closing 1 unit in 0.2 s, weighted 0.4 on first reading.
 h.advance(200);h.scope.placeLock({...view,distance:42.1});
 assert.equal(h.read.innerHTML,'RNG 42,100 KM<br>BRG 347° · VEL 2000 KM/S');
 h.scope.placeLock(null);assert.equal('placed' in h.lock.dataset,false);
 h.setStep('map');h.scope.placeLock(view);assert.equal('placed' in h.lock.dataset,false,'an idle ring is never placed');
});

test('codes decode once from noise; translated copy, markup and live regions are untouched',()=>{
 const h=hud(),leaf=(text,extra={})=>Object.assign(new FakeElement('span'),{textContent:text},extra);
 const code=leaf('02 / LUMEN / ARRIVAL'),han=leaf('作品星舰已锁定'),nested=leaf('ABC',{childElementCount:1}),live=leaf('LIVE',{closest:selector=>selector==='[aria-live]'?{}:null});
 h.document.surfaces=[code,han,nested,live];
 h.emit('tem:surface');h.flush();h.advance(100);h.flush();
 assert.notEqual(code.textContent,'02 / LUMEN / ARRIVAL');assert.equal(code.textContent.length,20);
 for(const [i,c] of [...'02 / LUMEN / ARRIVAL'].entries()){
  if(c===' '||c==='/')assert.equal(code.textContent[i],c,'separators hold still');
  else assert.ok(code.textContent[i]!==' '&&code.textContent[i]!=='/','noise never imitates a separator');
 }
 h.advance(2000);h.flush(4);assert.equal(code.textContent,'02 / LUMEN / ARRIVAL');
 assert.equal(han.textContent,'作品星舰已锁定');assert.equal(nested.textContent,'ABC');assert.equal(live.textContent,'LIVE');
 // The same value does not replay; a value written by someone else mid-decode wins.
 h.emit('tem:surface');h.flush();h.advance(100);h.flush();assert.equal(code.textContent,'02 / LUMEN / ARRIVAL');
 const next=leaf('03 / ECHO');h.document.surfaces=[next];h.emit('tem:surface');h.flush();h.advance(60);h.flush();
 next.textContent='04 / FORGE';h.advance(60);h.flush(4);assert.equal(next.textContent,'04 / FORGE');
});

test('the reticle snaps to controls, yields to readable glass and aims at ships',()=>{
 const h=hud(),box={left:100,top:50,width:80,height:30};
 const control={disabled:false,closest:selector=>selector==='[inert]'?null:control,getBoundingClientRect:()=>box};
 const target=selector=>({closest:query=>query===selector?control:null});
 assert.ok(h.classes.has('hud-cursor'));
 h.emit('pointermove',{pointerType:'mouse',clientX:120,clientY:60,target:{closest:query=>query.startsWith('button')?control:null}});h.flush();
 assert.equal(h.reticle.dataset.mode,'snap');assert.equal(h.reticle.style.width,'90px');assert.equal(h.reticle.style.transform,'translate3d(95px,45px,0)');
 h.emit('pointermove',{pointerType:'mouse',clientX:400,clientY:300,target:{closest:query=>query.startsWith('.archive-glass-panel')?{}:null}});h.flush(2);
 assert.equal(h.reticle.dataset.mode,'hidden');
 h.body.dataset.worldHover='epoch';h.emit('pointermove',{pointerType:'mouse',clientX:410,clientY:300,target:{closest:()=>null}});h.flush(2);
 assert.equal(h.reticle.dataset.mode,'aim');assert.equal(h.reticle.style.transform,'translate3d(398px,288px,0)');
 h.emit('pointerout',{relatedTarget:null});assert.equal(h.reticle.dataset.mode,undefined);
 const touch=hud({finePointer:false});assert.equal(touch.classes.has('hud-cursor'),false);
 touch.emit('pointermove',{pointerType:'mouse',clientX:1,clientY:1,target:target('button')});touch.flush();assert.equal(touch.reticle.dataset.mode,undefined);
});

test('narration sits on clear glass; blur is reserved for the cinematic tier',()=>{
 const css=read('assets/css/immersive-hud.css');
 assert.ok(css.includes('@layer hud{'),'one cascade layer owns the HUD look');
 const glass=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(match=>match[2].includes('radial-gradient(120% 75%'))[1];
 for(const surface of ['.arrival-glass-panel','.archive-glass-panel','.atlas-control','.approach-copy','.project-detail','.discovery-copy','.atlas-heading','.transit-copy','.opening-caption'])assert.ok(glass.includes(surface),surface);
 for(const match of css.matchAll(/([^{}]+)\{[^{}]*backdrop-filter:blur/g))assert.ok(match[1].includes("[data-graphics-tier='cinematic']"),'blur outside the cinematic tier: '+match[1].trim().slice(0,80));
 assert.equal((read('assets/js/immersive-cosmos.js').match(/document\.body\.dataset\.graphicsTier=/g)||[]).length,2,'the tier reaches CSS on start and on every change');
 const manifest=JSON.parse(read('assets/vendor/ibm-plex-mono-5.3.0/manifest.json'));
 for(const file of manifest.files){
  const bytes=readFileSync(new URL('assets/vendor/ibm-plex-mono-5.3.0/'+file.file,root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.file);
  if(file.file.endsWith('.woff2'))assert.ok(css.includes('../vendor/ibm-plex-mono-5.3.0/'+file.file),file.file+' is the face in use');
 }
 for(const page of ['templates/universe.html','index.html','zh/index.html','en/index.html','immersive.html']){
  const html=read(page),models=html.indexOf('immersive-cinematic-models.css'),layer=html.indexOf('immersive-hud.css');
  assert.ok(models>0&&layer>models,page+' links the HUD sheet after the scene sheets');
 }
});

test('lock and hover cues follow the HUD and the scene, not DOM buttons alone',()=>{
 const audio=read('assets/js/immersive-audio.js'),steps=audio.match(/const STEP_SFX = \{([^}]+)\}/)[1];
 assert.equal(/\btarget\s*:/.test(steps),false,'the lock cue no longer fires on entering the step');
 assert.ok(audio.includes("addEventListener('tem:hud-lock'"));assert.ok(audio.includes("addEventListener('tem:world-hover'"));
 const spatial=read('assets/js/immersive-spatial.js');
 assert.ok(spatial.includes("dispatchEvent(new CustomEvent('tem:world-hover'"));assert.ok(/placeLock\(lockFacility\?lockView\(/.test(spatial));
});

test('batch 0: rocks are lit stone, the lens gate clears the copy, ring lamps are points',()=>{
 const spatial=read('assets/js/immersive-spatial.js');
 const rock=spatial.match(/const rock=new THREE\.MeshStandardMaterial\(\{([^}]+)\}\)/)[1];
 assert.ok(Number(rock.match(/metalness:([\d.]+)/)[1])<.1,'stone is not metal');
 assert.ok(spatial.includes('belt=instancedMesh(rockGeometry(')&&spatial.includes('debris=instancedMesh(rockGeometry('));
 const gate=spatial.match(/monument\.position\.set\((-?[\d.]+),[^)]*\);for\(let i=0;i<4;i\+\+\)/);
 assert.ok(Number(gate[1])<=-60,'the lens gate stands well left of the ship');
 const planet=read('assets/js/immersive-planet.js');
 assert.equal(planet.includes('1.55, .09, .56'),false,'no magenta slab lights');assert.ok(/ringClearance>16/.test(planet));
 assert.ok(read('assets/js/immersive-voyage-optical.js').includes('i===0?crystal:m.alloy'),'the opening gate hoops are lit metal');
 assert.ok(/BASALT[^\n]*emissive\.setHex/.test(read('assets/js/immersive-star-sea.js')));
});
