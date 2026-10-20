import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createJourney,sectors,sectorFor,transitionDurations} from '../assets/js/immersive-journey.js';

const sourceFor=file=>readFileSync(new URL('../assets/js/'+file,import.meta.url),'utf8')
 .replace(/^import .*$/gm,'').replace(/^export \{[^\n]+\};?$/gm,'').replace(/^export /gm,'');

class Element{
 constructor(){this.dataset={};this.style={};this.attrs={};this.handlers=new Map();this.children=[];this.writes=0;}
 addEventListener(type,callback){if(!this.handlers.has(type))this.handlers.set(type,[]);this.handlers.get(type).push(callback);}
 emit(type,event){for(const callback of this.handlers.get(type)||[])callback(event);}
 setAttribute(key,value){this.attrs[key]=value;}
 removeAttribute(key){delete this.attrs[key];}
 set innerHTML(value){this.html=value;this.writes++;}
 get innerHTML(){return this.html||'';}
 append(child){this.children.push(child);}
 querySelector(){return null;}
 querySelectorAll(){return [];}
 focus(){this.focused=true;}
 closest(){return null;}
}

function explorationHarness({decode=true}={}){
 const data={profile:{tagline:'A world by Tem',links:[]},works:[
  {id:'one',title:'One',type:'游戏',sector:'forge'},
  {id:'two',title:'Two',type:'游戏',sector:'forge'}
 ]};
 const journey=createJourney(data.works),subscriptions=[],listeners=new Map(),elements=new Map(),raf=[];
 const element=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 const ui=element('expeditionUI');let nodes=[],worldSurfaces=[],anchored=false;
 ui.querySelectorAll=selector=>selector==='.signal-node'?nodes:selector==='.approach-copy,.project-detail'?worldSurfaces:[];
 ui.querySelector=selector=>selector==='.signal-node[aria-pressed="true"]'?nodes.find(node=>node.attrs['aria-pressed']==='true'):null;
 const body=element('body');body.classList={contains:()=>anchored};body.style.setProperty=()=>{};
 const document=element('document');document.body=body;document.getElementById=element;
 document.querySelector=selector=>selector==='dialog[open]'?null:element(selector);
 const exploreButtons=[element('atlasHeader'),element('exploreHeader')];
 document.querySelectorAll=selector=>selector==='[data-explore]'?exploreButtons:[];
 document.createElement=()=>new Element();
 element('contactDialog').querySelector=element;
 let revision=0;
 function navigate(action,value){if(!journey.dispatch(action,value))return false;revision++;for(const callback of subscriptions)callback();return true;}
 const context={document,window:{PORTFOLIO_DATA:data},journey,navigate,subscribe:callback=>subscriptions.push(callback),getRevision:()=>revision,
  completeTransition(){},sectors,sectorFor,transitionDurations,
  getMotionPreference:()=>({matches:false}),opening:{active:false},initPoetryReader(){},
  createArchiveDeviceInteraction:()=>({restore(){},leave(){}}),archiveRail:{select(){},push(){},update(){},index:0},archiveChapterOrder:['overview','reading','skills','records'],
  renderProfile:()=>'',renderProfilePanel:()=>'',profileTabs:[['overview'],['reading'],['skills'],['records']],
  currentLocale:()=> 'zh',localePath:()=>'/zh/work/',projectPath:()=>'/zh/work/one/',t:value=>value,
  localStorage:{getItem(){},setItem(){}},performance:{now:()=>2000},innerHeight:720,
  addEventListener(type,callback){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(callback);},
  dispatchEvent(event){for(const callback of listeners.get(event.type)||[])callback(event);},
  CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail;}},
  setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:callback=>raf.push(callback)
 };
 runInNewContext(sourceFor('immersive-exploration.js'),context);
 if(decode)for(const [action,value] of [['start'],['ready'],['navigate','forge'],['arrive'],['scan'],['decode']])navigate(action,value);
 nodes=journey.signals.map(work=>{const node=new Element();node.dataset.value=work.id;node.style.transform='translate3d(215px,180px,0)';node.style.visibility='visible';node.setAttribute('aria-pressed',String(work.id===journey.state.work));return node;});
 return {journey,ui,nodes,document,navigate,body,raf,opening:context.opening,
  explore(index){exploreButtons[index].emit('click',{});},
  worldSurface(element){worldSurfaces=[element];anchored=true;},
  key(event){const e={key:'ArrowRight',target:new Element(),preventDefault(){this.prevented=true;},...event};document.emit('keydown',e);return e;},
  wheel(event){for(const callback of listeners.get('wheel')||[])callback({deltaY:50,target:new Element(),...event});}
 };
}

test('select controls, settings, editable text and modified keys retain their own navigation',()=>{
 const h=explorationHarness(),initial=h.journey.state.work,writes=h.ui.writes;
 for(const selector of ['select','.experience-settings','[contenteditable]','summary']){
  const target={closest:query=>query.includes(selector==='[contenteditable]'?'[contenteditable]':selector)?{}:null};
  const event=h.key({target});assert.equal(event.prevented,undefined);assert.equal(h.journey.state.work,initial);
  h.wheel({target});assert.equal(h.journey.state.work,initial);
 }
 for(const modifier of ['ctrlKey','altKey','metaKey','shiftKey','defaultPrevented']){h.key({[modifier]:true});assert.equal(h.journey.state.work,initial);}
 assert.equal(h.ui.writes,writes);
});

test('gallery arrow keys update the actual selection without replacing projected buttons',()=>{
 const h=explorationHarness(),before=[...h.nodes],writes=h.ui.writes;
 assert.equal(h.key({}).prevented,true);assert.equal(h.journey.state.work,'two');
 assert.equal(h.ui.writes,writes);assert.deepEqual(h.nodes,before);
 assert.equal(h.nodes[0].attrs['aria-pressed'],'false');assert.equal(h.nodes[1].attrs['aria-pressed'],'true');
 for(const node of h.nodes){assert.equal(node.style.transform,'translate3d(215px,180px,0)');assert.equal(node.style.visibility,'visible');}
 while(h.raf.length)h.raf.shift()();assert.equal(h.nodes[1].focused,true);
});

test('both header atlas controls open or return to the atlas throughout the journey',()=>{
 const template=readFileSync(new URL('../templates/universe.html',import.meta.url),'utf8');
 assert.match(template,/<button[^>]*class="archive-return"[^>]*data-explore[^>]*>/);
 const routes=[
  {actions:[],expected:'boot'},
  {actions:[['captain']],expected:'boot'},
  {actions:[['start']],expected:'boot'},
  {actions:[['start'],['ready']],expected:'map'},
  ...[
   [['navigate','forge']],
   [['navigate','forge'],['arrive']],
   [['navigate','forge'],['arrive'],['scan']],
   [['navigate','forge'],['arrive'],['scan'],['decode']],
   [['navigate','forge'],['arrive'],['scan'],['decode'],['select','one']],
   [['navigate','forge'],['arrive'],['scan'],['decode'],['select','one'],['dock']],
   [['navigate','forge'],['arrive'],['scan'],['decode'],['select','one'],['dock'],['open']]
  ].map(actions=>({actions:[['start'],['ready'],...actions],expected:'map'}))
 ];
 for(const index of [0,1])for(const route of routes){
  const h=explorationHarness({decode:false});
  for(const [action,value] of route.actions)h.navigate(action,value);
  h.explore(index);assert.equal(h.journey.state.step,route.expected,`header ${index}: ${JSON.stringify(route.actions)}`);
 }
 const held=explorationHarness();held.navigate('home');held.opening.active=true;
 for(const index of [0,1])held.explore(index);
 assert.equal(held.journey.state.step,'bridge','the opening still requires its own launch or skip choice');
});

test('navigation recovery releases moving state and all projected interaction bounds',()=>{
 const elements=[new Element(),new Element()];elements[0].dataset.worldMounted='true';elements[1].dataset.worldMounted='pending';
 for(const element of elements){Object.assign(element.style,{transform:'matrix3d(...)',visibility:'hidden',pointerEvents:'none',width:'640px',height:'850px',left:'0px',top:'0px'});element.inert=true;}
 const classes=new Set(['world-anchored']),body={dataset:{moving:'true',orbiting:'true'},classList:{remove:name=>classes.delete(name)}};
 const context={document:{body,querySelectorAll:()=>elements}};runInNewContext(sourceFor('immersive-navigation.js'),context);
 context.releaseWorldSurfaces();
 assert.equal(body.dataset.moving,undefined);assert.equal(body.dataset.orbiting,undefined);assert.equal(classes.has('world-anchored'),false);
 for(const element of elements){assert.equal(element.style.transform,'');assert.equal(element.style.visibility,'');assert.equal(element.style.pointerEvents,'');assert.equal(element.inert,false);}
 for(const element of elements){assert.equal(element.dataset.worldMounted,undefined);assert.equal(element.style.width,'');assert.equal(element.style.height,'');}
});

test('the real approach render holds its world pane until the first actual projection',()=>{
 const h=explorationHarness(),pane=new Element();h.worldSurface(pane);
 assert.equal(h.navigate('select','one'),true);assert.equal(h.journey.state.step,'target');
 assert.equal(pane.dataset.worldMounted,'pending');assert.equal(pane.style.visibility,'hidden');
 assert.equal(pane.style.pointerEvents,'none');assert.equal(pane.inert,true);
 while(h.raf.length)h.raf.shift()();
 assert.equal(pane.style.visibility,'hidden','focus callbacks must not reveal an unprojected pane');
});

test('new world labels stay hidden before first projection while attached labels remain stable',()=>{
 const old=new Element(),fresh=new Element();old.style.visibility='visible';old.style.transform='translate3d(200px,100px,0)';
 let anchored=true;
 const context={document:{body:{classList:{contains:()=>anchored}},querySelectorAll:()=>[old,fresh]}};
 runInNewContext(sourceFor('immersive-spatial.js'),context);
 const nodes=context.prepareWorldLabels([old]);assert.equal(nodes[0],old);assert.equal(nodes[1],fresh);
 assert.equal(old.style.visibility,'visible');assert.equal(old.style.transform,'translate3d(200px,100px,0)');
 assert.equal(fresh.style.visibility,'hidden');assert.equal(fresh.style.pointerEvents,'none');assert.equal(fresh.inert,true);
 anchored=false;const fallback=new Element();context.document.querySelectorAll=()=>[fallback];context.prepareWorldLabels([]);
 assert.equal(fallback.style.visibility,undefined);assert.equal(fallback.inert,undefined,'static fallback labels must remain operable');
});

test('the real boot prewarms one graphics load and controller shortcuts reuse it',async()=>{
 const listeners=new Map(),body={dataset:{}},events=[];let loads=0;
 const classes=new Set(['graphics-standby']);body.classList={remove:(...names)=>names.forEach(name=>classes.delete(name)),add:name=>classes.add(name)};
 const journey=createJourney([{id:'one',title:'One',type:'游戏',sector:'forge'}]);
 const context={currentLocale:()=> 'zh',localizedData:data=>data,localizeDOM(){},initializeSettings(){},
  audioFixture:{isSoundOn:()=>false,getSoundVolume:()=>0.8,setSound(){},setSoundVolume(){}},
  window:{PORTFOLIO_DATA:{works:[]}},document:{body,baseURI:'http://localhost/',querySelectorAll:()=>[],getElementById:()=>null,querySelector:()=>null},URL,location:{href:'http://localhost/',pathname:'/',search:''},
  viewFromURL:()=>({}),restoreView:()=>({restored:false}),viewSearch:()=>'',
  explorationFixture:{journey,navigate(){},subscribe(){},currentChapter(){},selectChapter(){}},
  audioFixture:{isSoundOn:()=>false,getSoundVolume:()=>.5,setSound(){},setSoundVolume(){}},
  loadGraphics(){loads++;return Promise.resolve({});},sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  addEventListener(type,callback){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(callback);},
  dispatchEvent(event){events.push(event.type);for(const callback of listeners.get(event.type)||[])callback(event);},
  Event:class{constructor(type){this.type=type;}},MutationObserver:class{observe(){}},queueMicrotask,history:{pushState(){}}
 };
 const source=sourceFor('international-boot.js')
  .replace(/import\('\.\/immersive-audio\.js[^']*'\)/g,'Promise.resolve(audioFixture)')
  .replace(/import\('\.\/immersive-engine\.js[^']*'\)/g,'loadGraphics()')
  .replace(/import\('\.\/immersive-audio\.js[^']*'\)/g,'Promise.resolve(audioFixture)')
  .replace(/import\('\.\/immersive-exploration\.js[^']*'\)/g,'Promise.resolve(explorationFixture)');
 await runInNewContext('(async()=>{'+source+'})()',context);
 assert.equal(loads,1,'the live entrance prewarms graphics before the visitor boards');
 assert.equal(events.includes('tem:opening-start'),false,'prewarming must not start the voyage');
 context.dispatchEvent(new context.Event('tem:opening-skip'));
 assert.equal(loads,1);assert.equal(body.dataset.graphics,'loading');assert.ok(events.includes('tem:graphics-request'));
 context.dispatchEvent(new context.Event('tem:opening-start'));context.dispatchEvent(new context.Event('tem:opening-skip'));assert.equal(loads,1);
 context.dispatchEvent(new context.Event('tem:scene-ready'));assert.equal(body.dataset.graphics,'ready');assert.equal(classes.has('graphics-standby'),false);
});
