import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {loadData,buildInternational} from '../scripts/build-international.mjs';
import {localizedData,localePath,projectPath,languageDestination} from '../assets/js/locale-data.js';
import {translateText} from '../assets/js/i18n.js';
import {createJourney,isProject} from '../assets/js/immersive-journey.js';
import {restoreView,viewFromURL,viewSearch} from '../assets/js/international-navigation.js';
import {renderProfilePanel} from '../assets/js/immersive-profile.js';
import {renderPoem} from '../assets/js/poetry-reader.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const original=loadData(),english=localizedData(original,'en');
test('localization preserves project IDs, source media, dates, team roles, and Chinese originals',()=>{
 assert.equal(english.works.length,original.works.length);
 for(const work of original.works){const translated=english.works.find(w=>w.id===work.id);assert.equal(translated.cover,work.cover);assert.equal(translated.video,work.video);if(/\d{4}/.test(work.year))assert.equal(translated.year,work.year);assert.equal(translated.sector,work.sector);assert.equal(translated.originalTitle,work.title);}
 assert.match(english.works.find(w=>w.id==='rebirth').contribution.role,/team/i);
 // Education is intentionally not part of the public profile.
 assert.equal(original.profile.resume.education,undefined);
 assert.equal(english.profile.resume.education,undefined);
 for(const poem of original.poetry.poems){const translated=english.poetry.poems.find(p=>p.id===poem.id);assert.equal(translated.date,poem.date);assert.equal(translated.image,poem.image);assert.equal(translated.originalParagraphs,poem.paragraphs);assert.equal(translated.originalTitle,poem.title);assert.match(renderPoem(english.poetry,poem.id),/AI-assisted/);}
 const certificates=renderProfilePanel(english,'records');
 for(const work of english.works.filter(w=>w.type==='Project certificate'))assert.ok(certificates.includes(work.cover));
 assert.equal(original.profile.title,localizedData(original,'zh').profile.title);
});
test('all ten English projects restore through the real journey and round-trip language state',()=>{
 assert.equal(createJourney(english.works).total,10);
 assert.equal(english.works.filter(isProject).length,10);
 for(const certificate of english.works.filter(w=>w.type==='Project certificate'))assert.equal(isProject(certificate),false);
 for(const work of english.works.filter(w=>w.sector)){
  const journey=createJourney(english.works);assert.ok(restoreView(journey.dispatch,english.works,{work:work.id}).restored);
  assert.equal(journey.state.step,'docked');assert.equal(journey.detail.id,work.id);
  const query=viewSearch(journey.state);assert.equal(viewFromURL('https://example.test/en/'+query).work,work.id);
 }
 const journey=createJourney(english.works);
 assert.deepEqual(restoreView(journey.dispatch,english.works,{view:'captain',chapter:'reading'}),{restored:true,chapter:'reading'});
 assert.equal(viewSearch(journey.state,'reading'),'?view=captain&chapter=reading');
 assert.deepEqual(restoreView(journey.dispatch,english.works,{work:'missing',sector:'invalid'}),{restored:false});
 assert.deepEqual(restoreView(journey.dispatch,english.works,{view:'captain',chapter:'invalid'}),{restored:true,chapter:'overview'});
 for(const phase of ['arrival','signals','target']){
  const target=createJourney(english.works);
  restoreView(target.dispatch,english.works,{view:phase,sector:'forge',work:phase==='arrival'?null:'growth'});
  assert.equal(target.state.step,phase);
  const copy=createJourney(english.works);
  restoreView(copy.dispatch,english.works,viewFromURL('https://example.test/en/'+viewSearch(target.state)));
  assert.deepEqual(copy.state,target.state);
  assert.equal(copy.detail,undefined,'Switching languages must not reveal an unopened project.');
 }
});
test('navigation and dynamic English announcements support directory hosting',()=>{
 assert.equal(localePath('en','work/','/portfolio/'),'/portfolio/en/work/');
 assert.equal(projectPath('zh','growth'),'/zh/work/growth/');
 assert.equal(translateText('快速浏览 ↗','en'),'Browse projects ↗');
 assert.equal(translateText('发现 3 艘','en'),'Discover 3');
 assert.equal(translateText('正在停靠：Growth Archive','en'),'Docking: Growth Archive');
 assert.equal(languageDestination('/portfolio/en/work/','https://example.test/portfolio/zh/work/?category=echo#archiveTitle'),'https://example.test/portfolio/en/work/?category=echo#archiveTitle');
 assert.equal(languageDestination('/zh/poetry/','https://example.test/en/poetry/#meng-jun-ling'),'https://example.test/zh/poetry/#meng-jun-ling');
});
test('language changes retain discovery progress and reject unknown saved IDs',()=>{
 const zh=createJourney(original.works);restoreView(zh.dispatch,original.works,{work:'growth'});
 const en=createJourney(english.works);en.restoreProgress({...zh.progress,visited:[...zh.progress.visited,'unknown'],scanned:[...zh.progress.scanned,'unknown']});
 restoreView(en.dispatch,english.works,{view:'signals',sector:'forge',work:'growth'});
 assert.equal(en.hasVisited('growth'),true);assert.equal(en.visitedCount,1);assert.equal(en.hasScanned('forge'),true);
 assert.equal(en.hasVisited('unknown'),false);assert.equal(en.hasScanned('unknown'),false);
});
test('every generated page has reciprocal language metadata and existing local destinations',()=>{
 const output=mkdtempSync(resolve(tmpdir(),'tem-international-test-'));
 try{
  const files=buildInternational({outDir:output,origin:'https://example.test',basePath:'/portfolio/'});
  assert.equal(files.length,36);
  const pages=files.filter(f=>f.endsWith('.html'));
  assert.equal(pages.length,30);
  for(const path of pages){
   const html=readFileSync(resolve(output,path),'utf8');
   assert.doesNotMatch(html,/\{\{|href="[^\"]*(?:resume\.html|\.pdf)"/);
   for(const lang of ['en','zh-CN','x-default'])assert.ok(html.includes(`hreflang="${lang}"`),path+': '+lang);
   assert.match(html,/<link rel="canonical" href="https:\/\/example.test\/portfolio\//);
   assert.match(html,/<meta property="og:image"/);assert.match(html,/<meta name="twitter:card"/);
   for(const match of html.matchAll(/(?:href|src)="([^\"]+)"/g)){
    const url=match[1];if(/^(?:https?:|mailto:|tel:|#)/.test(url))continue;
    const local=url.replace(/^\/portfolio\//,'').split(/[?#]/)[0];if(local==='')continue;
    const dest=local.endsWith('/')?local+'index.html':local;
    assert.ok(existsSync(resolve(output,dest))||existsSync(resolve(root,dest)),path+' → '+url);
   }
  }
  const caseHTML=readFileSync(resolve(output,'en/work/growth/index.html'),'utf8');
  assert.match(caseHTML,/id="contribution"/);assert.match(caseHTML,/From a question to an experience/);
  assert.match(caseHTML,/preload="none"/);assert.match(caseHTML,/English project guide/);
  assert.match(readFileSync(resolve(output,'en/poetry/index.html'),'utf8'),/AI-assisted literary translation/);
  const aboutHTML=readFileSync(resolve(output,'en/about/index.html'),'utf8');
  assert.doesNotMatch(aboutHTML,/id="education"/);assert.doesNotMatch(aboutHTML,/(Currently enrolled|Expected Jun 2027)/);
  assert.doesNotMatch(aboutHTML,/Vocational diploma · Graduated/);
  for(const id of ['ming','rebirth','kun','epoch','esp32-learn']){
   const html=readFileSync(resolve(output,'en/work/'+id+'/index.html'),'utf8');
   assert.match(html,/id="design"/);assert.match(html,/id="contribution"/);
  }
  const filmHTML=readFileSync(resolve(output,'en/work/epoch/index.html'),'utf8');
  assert.match(filmHTML,/Two episodes/);assert.doesNotMatch(filmHTML,/12-minute|Unreal 5/);
  for(const id of Object.keys(original.international.guides)){
   const vtt=readFileSync(resolve(output,'assets/captions/'+id+'-en.vtt'),'utf8');assert.match(vtt,/^WEBVTT\n\n/);assert.match(vtt,/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/);
   const durations={growth:48.018,yuanmo:163.933,zhihu:190};
   let end=0;for(const cue of original.international.guides[id]){assert.ok(cue.start>=end);assert.ok(cue.end>cue.start);assert.ok(cue.end<=durations[id]);end=cue.end;}
  }
  const sitemap=readFileSync(resolve(output,'sitemap.xml'),'utf8');assert.equal((sitemap.match(/<url>/g)||[]).length,29);
  assert.match(sitemap,/<loc>https:\/\/example.test\/portfolio\/<\/loc>/);
  // The root document is the main site itself: no redirect, canonical points at the root.
  const rootEntry=readFileSync(resolve(output,'index.html'),'utf8');
  assert.doesNotMatch(rootEntry,/http-equiv="refresh"/);
  assert.doesNotMatch(rootEntry,/location\.replace/);
  assert.match(rootEntry,/<link rel="canonical" href="https:\/\/example.test\/portfolio\/">/);
  assert.match(rootEntry,/id="space"/);
  const alias=readFileSync(resolve(output,'immersive.html'),'utf8');
  assert.match(alias,/<link rel="canonical" href="https:\/\/example.test\/portfolio\/">/);
  assert.match(alias,/id="space"/);
  assert.match(readFileSync(resolve(output,'robots.txt'),'utf8'),/Sitemap: https:\/\/example.test\/portfolio\/sitemap.xml/);
 }finally{rmSync(output,{recursive:true,force:true});}
});
test('the international boot uses the scene UI session and one graphics version per graph',()=>{
 const boot=readFileSync(resolve(root,'assets/js/international-boot.js'),'utf8');
 assert.match(boot,/const \{journey,navigate,subscribe\}=exploration/);
 assert.doesNotMatch(boot,/import\(['"]\.\/immersive-session/);
 const versions=new Set();
 for(const file of readdirSync(resolve(root,'assets/js')).filter(f=>/^immersive-.*\.js$/.test(f)))for(const match of readFileSync(resolve(root,'assets/js',file),'utf8').matchAll(/from ['"]\.\/immersive-[^'"?]+\?v=([^'"]+)/g))versions.add(match[1]);
 assert.equal(versions.size,1,'State modules must not be loaded as different URL singletons.');
});
