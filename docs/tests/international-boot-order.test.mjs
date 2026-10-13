import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Run in fresh processes so each locale exercises ESM's first evaluation of the
// real audio → session → journey dependency chain. Only WebGL and DOM rendering
// are replaced; the boot, localization, audio and session modules remain real.
const bootstrap=String.raw`
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const [entryURL,locale]=process.argv.slice(2),entry=new URL(entryURL);
const scope={window:{}};
runInNewContext(readFileSync(new URL('data.js',entry),'utf8'),scope);
const sourceData=scope.window.PORTFOLIO_DATA;
const events=new EventTarget(),storage=new Map();
const body={dataset:{},classList:{add(){},remove(){}},querySelectorAll:()=>[]};
globalThis.document={body,documentElement:{lang:locale},baseURI:'http://localhost/',
 getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
 addEventListener(){},createTreeWalker:()=>({nextNode:()=>null})};
globalThis.NodeFilter={SHOW_TEXT:4};
globalThis.window={PORTFOLIO_DATA:sourceData,addEventListener:events.addEventListener.bind(events)};
globalThis.location={href:'http://localhost/'+locale+'/?view=target&sector=forge&work=ming',pathname:'/'+locale+'/',search:'?view=target&sector=forge&work=ming'};
globalThis.localStorage={getItem:key=>key==='tem-sound'?'off':null,setItem(){}};
globalThis.sessionStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
globalThis.addEventListener=events.addEventListener.bind(events);
globalThis.removeEventListener=events.removeEventListener.bind(events);
globalThis.dispatchEvent=events.dispatchEvent.bind(events);
globalThis.matchMedia=()=>({matches:false,addEventListener(){}});
globalThis.MutationObserver=class{observe(){}};
globalThis.requestAnimationFrame=()=>0;
globalThis.history={pushState(_state,_title,url){const next=new URL(url,location.href);Object.assign(location,{href:next.href,pathname:next.pathname,search:next.search});}};
globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});

const audioSource=readFileSync(new URL('immersive-audio.js',entry),'utf8');
const sessionSpecifier=audioSource.match(/from '([^']*immersive-session\.js[^']*)'/)[1];
const sessionURL=new URL(sessionSpecifier,entry).href;
const explorationSource=readFileSync(new URL('immersive-exploration.js',entry),'utf8');
assert.ok(explorationSource.includes(sessionSpecifier),'audio and rendered UI must use the same session URL');
const explorationFixture='import('+JSON.stringify(sessionURL)+').then(session=>{globalThis.activeSession=session;return {...session,currentChapter:()=>"overview",selectChapter(){}};})';
const boot=readFileSync(entry,'utf8')
 .replace(/import\('\.\/immersive-engine\.js[^']*'\)/g,'Promise.resolve({})')
 .replace(/import\('\.\/immersive-exploration\.js[^']*'\)/g,explorationFixture)
 .replace(/(['"])(\.\/[^'"]+)\1/g,(_match,quote,specifier)=>quote+new URL(specifier,entry).href+quote);
await import('data:text/javascript;base64,'+Buffer.from(boot).toString('base64'));
const {journey,navigate}=globalThis.activeSession;
assert.equal(typeof window.__temAudio,'function','the actual audio module must have initialized');
assert.equal(journey.state.step,'target','cold direct entry must preserve the unopened project state');
assert.equal(journey.work,window.PORTFOLIO_DATA.works.find(work=>work.id==='ming'),'session must capture localized project objects before any navigation');
assert.equal(journey.detail,undefined);
const {restoreView}=await import(new URL('international-navigation.js',entry));
const {localizedData}=await import(new URL('locale-data.js',entry));
const expected=localizedData(sourceData,locale);
for(const project of expected.works.filter(work=>work.sector)){
 for(const phase of ['signals','target','docked']){
  restoreView(navigate,window.PORTFOLIO_DATA.works,{work:project.id,view:phase==='docked'?undefined:phase});
  assert.equal(journey.state.step,phase);
  for(const field of ['title','type','subtitle','role','status','year','stack','specs','contribution'])
   assert.deepEqual(journey.work[field],project[field],project.id+' / '+phase+' / '+field);
  if(phase==='docked')assert.equal(journey.detail,journey.work);
  else assert.equal(journey.detail,undefined);
 }
}
assert.equal(window.PORTFOLIO_BASE_DATA,sourceData,'original Chinese source data must remain available');
console.log('Verified '+locale+' audio/session initialization and '+journey.total+' project flows');
`;

for(const locale of ['en','zh'])test(`cold ${locale} boot initializes audio and journey after project localization`,()=>{
 const result=spawnSync(process.execPath,['--input-type=module','-',new URL('../assets/js/international-boot.js',import.meta.url).href,locale],
  {input:bootstrap,encoding:'utf8',timeout:10000});
 assert.equal(result.error,undefined,result.error?.message);
 assert.equal(result.status,0,result.stderr||result.stdout);
 assert.match(result.stdout,new RegExp('Verified '+locale+' audio/session initialization and 11 project flows'));
});
