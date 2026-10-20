import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {loadData,buildInternational,assetVersion} from '../scripts/build-international.mjs';
import {localizedData,localePath,projectPath,languageDestination} from '../assets/js/locale-data.js';
import {translateText} from '../assets/js/i18n.js';
import {createJourney,isProject} from '../assets/js/immersive-journey.js';
import {restoreView,viewFromURL,viewSearch} from '../assets/js/international-navigation.js';
import {renderProfilePanel,renderBookTitles} from '../assets/js/immersive-profile.js';
import {renderPoem} from '../assets/js/poetry-reader.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const original=loadData(),english=localizedData(original,'en');
test('published home entries and the legacy entry use the current asset cache revision',()=>{
 for(const path of ['index.html','zh/index.html','en/index.html','immersive.html']){
  const html=readFileSync(resolve(root,path),'utf8'),versions=[...html.matchAll(/\?v=(cinematic-v[\d.]+)/g)].map(match=>match[1]);
  assert.ok(versions.length>=16,path);assert.deepEqual([...new Set(versions)],[assetVersion],path);assert.doesNotMatch(html,/\{\{ASSET_VERSION\}\}/);
 }
});
test('the English personal headline retains spaces when its sentence spans flow inline',()=>{
 const html=renderProfilePanel(english,'overview');
 const headline=html.match(/<h3 class="archive-tagline"[^>]*>([\s\S]*?)<\/h3>/)?.[1].replace(/<[^>]*>/g,'');
 assert.equal(headline,english.profile.tagline);
});
test('reading titles use English citations and retain Chinese book brackets',()=>{
 const en=renderProfilePanel(english,'reading');
 assert.match(en,/<cite>The Three-Body Problem<\/cite>/);
 assert.doesNotMatch(en,/[《》]/);
 for(const item of english.profile.readings)for(const book of item.books)assert.ok(en.includes(renderBookTitles([book],'en')),book);
 const zh=renderProfilePanel(localizedData(original,'zh'),'reading');
 assert.match(zh,/<strong>《三体》<\/strong>/);
 assert.equal(renderBookTitles(['<script> & "title"'],'en'),'<cite>&lt;script&gt; &amp; &quot;title&quot;</cite>');
});
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
test('all twelve English projects restore through the real journey and round-trip language state',()=>{
 assert.equal(createJourney(english.works).total,12);
 assert.equal(english.works.filter(isProject).length,12);
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
 assert.equal(translateText('发现 3 艘','en'),'3 unidentified vessels');
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
  assert.equal(files.length,40);
  const pages=files.filter(f=>f.endsWith('.html'));
  assert.equal(pages.length,34);
  for(const path of pages){
   const html=readFileSync(resolve(output,path),'utf8');
   assert.doesNotMatch(html,/\{\{|href="[^\"]*(?:resume\.html|\.pdf)"/);
   for(const lang of ['en','zh-CN','x-default'])assert.ok(html.includes(`hreflang="${lang}"`),path+': '+lang);
   assert.match(html,/<link rel="canonical" href="https:\/\/example.test\/portfolio\//);
   assert.match(html,/<meta property="og:image"/);assert.match(html,/<meta name="twitter:card"/);
   const references=[...html.matchAll(/(?:href|src|data-preview)="([^\"]+)"/g)].map(match=>match[1]);
   for(const match of html.matchAll(/\bsrcset="([^\"]+)"/g))references.push(...match[1].split(',').map(entry=>entry.trim().split(/\s+/)[0]));
   for(const url of references){
    if(/^(?:https?:|mailto:|tel:|#)/.test(url))continue;
    const local=url.replace(/^\/portfolio\//,'').split(/[?#]/)[0];if(local==='')continue;
    const dest=local.endsWith('/')?local+'index.html':local;
    assert.ok(existsSync(resolve(output,dest))||existsSync(resolve(root,dest)),path+' → '+url);
   }
  }
  const caseHTML=readFileSync(resolve(output,'en/work/growth/index.html'),'utf8');
  for(const locale of ['zh','en']){
   const directory=readFileSync(resolve(output,locale+'/work/index.html'),'utf8');
   const projects=[...directory.matchAll(/<article\b[^>]*\bdata-ribbon-item\b[^>]*>[\s\S]*?<\/article>/g)].map(match=>match[0]);
   const projectIDs=projects.map(project=>project.match(/\bdata-project-id="([^"]+)"/)?.[1]);
   const projectCount=original.works.filter(isProject).length;
   assert.equal(projectCount,12);
   assert.equal(projects.length,projectCount,'The ribbon must expose every project exactly once.');
   assert.equal(new Set(projectIDs).size,projectCount,'Ribbon projects must have distinct stable IDs.');
   assert.deepEqual([...projectIDs].sort(),Array.from(original.works.filter(isProject),work=>work.id).sort());
   for(const project of projects){
    const id=project.match(/\bdata-project-id="([^"]+)"/)[1];
    assert.match(project,new RegExp(`<a\\b[^>]*href="/portfolio/${locale}/work/${id}/"`),'Project images must retain real case-study links without JavaScript.');
    assert.match(project,/<img\b[^>]*\balt="[^"]+"/,'Project covers must have accessible names.');
    assert.match(project,/<span class="ribbon-item-title" aria-hidden="true">[^<]+<\/span>/,'Every card names its project without waiting for hover.');
    assert.match(project,/\bdata-summary="[^"]+"/,'Every card carries the short introduction shown in the current-project panel.');
   }
   // Curated order: every project appears once, in the order the data chooses.
   assert.deepEqual(projectIDs,Array.from(original.international.order),'The ribbon follows the curated reading order.');
   // Evidence on the cards: awards, something live to open, published source.
   for(const id of original.international.awards)assert.match(projects[projectIDs.indexOf(id)],/data-badge="award"/,id+' must carry its award badge.');
   assert.match(projects[projectIDs.indexOf('anyao')],/data-badges="[^"]*source[^"]*"[^>]*aria-label="[^"]*(?:开源|Open source)/,'Open-source projects say so, to sight and to screen readers.');
   assert.doesNotMatch(projects[projectIDs.indexOf('novel')],/data-badge=/,'Projects without evidence carry no badge.');
   for(const project of projects)assert.match(project,/\bdata-role="[^"]+"[^>]*\bdata-result="[^"]+"/,'Every card names my role and the outcome.');
   // Filters: one per represented category plus all, each a toggle button.
   const filters=[...directory.matchAll(/<button\b[^>]*\bdata-ribbon-filter="([^"]+)"[^>]*\baria-pressed="(true|false)"/g)];
   assert.deepEqual(filters.map(match=>match[1]),['all','forge','lumen','echo','nexus']);
   assert.deepEqual(filters.map(match=>match[2]),['true','false','false','false','false']);
   assert.match(directory,/<div class="ribbon-filters" role="group" aria-label="[^"]+">/);
   // The same projects as a list, with real links, for scanning and for keyboard use.
   const views=[...directory.matchAll(/<button\b[^>]*\bdata-ribbon-view="(ribbon|list)"[^>]*\baria-pressed="(true|false)"/g)].map(match=>match[1]+':'+match[2]);
   assert.deepEqual(views,['ribbon:true','list:false']);
   const list=directory.match(/<section\b[^>]*\bdata-ribbon-list\b[^>]*>[\s\S]*?<\/section>/)?.[0];
   assert.ok(list&&/\bhidden\b/.test(list.slice(0,list.indexOf('>'))),'The list view exists and starts hidden.');
   const rows=[...list.matchAll(/<li\b[^>]*\bdata-project-id="([^"]+)"[^>]*>[\s\S]*?<\/li>/g)];
   assert.deepEqual(rows.map(match=>match[1]),Array.from(original.international.order),'The list follows the same order.');
   for(const [row,id] of rows.map(match=>[match[0],match[1]])){
    assert.match(row,new RegExp(`<a class="ribbon-row-link" href="/portfolio/${locale}/work/${id}/"`));
    assert.match(row,/class="ribbon-row-role">[^<]+</);assert.match(row,/class="ribbon-row-result">[^<]+</);
   }
   // Who I am comes first: name, role, one line, proof, and the way to the record and to contact.
   const intro=directory.match(/<section class="ribbon-intro"[\s\S]*?<\/section>/)?.[0];
   assert.ok(intro,'The archive opens with an introduction.');
   assert.match(intro,/<h1 id="ribbonPageTitle">/);
   for(const track of original.international.intro[locale].role)assert.ok(intro.includes(track.text.replace(/&/g,'&amp;')),'The introduction states the role.');
   assert.ok(intro.includes(`href="/portfolio/${locale}/about/#experience"`),'The record links to the experience section.');
   assert.match(intro,/<a\b[^>]*\bdata-about-open\b/);
   assert.match(readFileSync(resolve(output,locale+'/about/index.html'),'utf8'),/<section id="experience">/);
   // Covers ship as responsive WebP with the JPEG fallback; only the first two load eagerly.
   assert.equal(projects.filter(project=>/loading="eager"/.test(project)).length,2,'Only the first covers load eagerly.');
   assert.ok(projects.every(project=>/<picture><source type="image\/webp" srcset="[^"]+ \d+w/.test(project)||/\.svg"/.test(project)),'Raster covers offer WebP sources.');
   assert.equal((directory.match(/\bdata-preview="/g)||[]).length,5,'Five projects have a short preview loop.');
   // The panel below the ribbon names the current project and steps one project at a time.
   const panel=directory.match(/<section\b[^>]*\bdata-ribbon-current\b[^>]*>[\s\S]*?<\/section>/)?.[0];
   assert.ok(panel,'The ribbon must keep a current-project panel.');
   for(const hook of ['position','title','category','year','summary','link','role','result','badges'])assert.ok(panel.includes(`data-current-${hook}`),'The current-project panel must expose '+hook+'.');
   assert.ok(panel.includes(`01 / ${projectCount}`),'The panel starts at the first project of the full count.');
   assert.match(panel,/<button\b[^>]*\bdata-ribbon-prev\b[^>]*\baria-label="[^"]+"[^>]*\baria-disabled="true"/,'The previous control starts disabled at the first project.');
   assert.match(panel,/<button\b[^>]*\bdata-ribbon-next\b[^>]*\baria-label="[^"]+"/);
   // The announcer lives outside the panel, so it is still heard while the panel is hidden for an expanded project.
   assert.doesNotMatch(panel,/data-ribbon-announce/);
   assert.match(directory,/\bdata-ribbon-announce\b[^>]*\baria-live="polite"/,'Settled positions are announced politely.');
   assert.match(panel,new RegExp(`<a\\b[^>]*\\bdata-current-link\\b[^>]*href="/portfolio/${locale}/work/${original.international.order[0]}/"`),'The current title opens its case study without JavaScript.');
   assert.match(panel,locale==='en'?/Swipe to browse/:/滑动浏览/,'Touch screens are told to swipe.');
   // The gallery shares the five destinations of every other page, folded behind one menu button on narrow screens.
   const nav=directory.match(/<nav\b[^>]*class="ribbon-nav"[^>]*>[\s\S]*?<\/nav>/)?.[0];
   assert.ok(nav,'The gallery must keep the shared main navigation.');
   assert.match(nav,/<button\b[^>]*\bdata-menu-toggle\b[^>]*\baria-expanded="false"[^>]*\baria-controls="ribbonMenu"/);
   assert.match(nav,new RegExp(`<a aria-current="page" href="/portfolio/${locale}/work/">`));
   for(const destination of [`/portfolio/${locale}/about/"`,`/portfolio/${locale}/"`,`/portfolio/${locale}/about/#contact"`])assert.ok(nav.includes(destination),'Main navigation must reach '+destination);
   assert.match(nav,/<a\b[^>]*class="contact-nav"[^>]*\bdata-about-open\b/,'Contact opens the in-page contact panel.');
   const footer=directory.match(/<footer\b[^>]*class="ribbon-footer"[^>]*>[\s\S]*?<\/footer>/)?.[0];
   assert.ok(footer.includes('mailto:')&&footer.includes('douyin.com'),'The footer keeps direct contact links.');
   const caseNav=readFileSync(resolve(output,locale+'/work/growth/index.html'),'utf8').match(/<nav\b[^>]*class="shell site-nav"[^>]*>[\s\S]*?<\/nav>/)?.[0];
   assert.match(caseNav,/<button\b[^>]*\bdata-menu-toggle\b[^>]*\baria-controls="siteMenu"/,'Document pages fold the same navigation behind a menu button.');
   assert.equal((caseNav.match(/<a\b/g)||[]).length,6,'Document pages show the wordmark and the same five destinations.');
   const languageLink=directory.match(/<a\b[^>]*\bdata-language-switch\b[^>]*>/)?.[0];
   assert.ok(languageLink,'The gallery must retain a language switch.');
   assert.ok(languageLink.includes(`href="/portfolio/${locale==='en'?'zh':'en'}/work/"`));
   assert.ok(languageLink.includes(`hreflang="${locale==='en'?'zh-CN':'en'}"`));
   assert.match(directory,/<a\b[^>]*\bdata-about-open\b[^>]*>/);
   const aboutDialog=directory.match(/<dialog\b[^>]*\baria-labelledby="([^"]+)"[^>]*>[\s\S]*?<\/dialog>/);
   assert.ok(aboutDialog,'The gallery must retain a named native about dialog.');
   assert.ok(aboutDialog[0].includes(`id="${aboutDialog[1]}"`));
   assert.match(aboutDialog[0],/<button\b[^>]*\bdata-about-close\b/);
   assert.ok(aboutDialog[0].includes(`href="/portfolio/${locale}/about/"`),'The about dialog must link to the complete localized profile.');
   const caption=directory.match(/<div class="ribbon-project-caption" data-ribbon-caption>[\s\S]*?<button\b[^>]*\bdata-ribbon-collapse\b[^>]*>/)?.[0];
   assert.ok(caption,'Expanded projects keep their facts in one caption column.');
   for(const hook of ['title','category','year','role','position','summary','result','badges','play'])assert.ok(caption.includes(`data-ribbon-${hook}`),'Expanded projects must expose '+hook+'.');
   assert.match(caption,/<button\b[^>]*\bdata-ribbon-prev\b/);assert.match(caption,/<button\b[^>]*\bdata-ribbon-next\b/);
   assert.match(directory,new RegExp(`<a\\b[^>]*\\bdata-ribbon-open\\b[^>]*href="/portfolio/${locale}/work/${original.international.order[0]}/"`),'The expanded caption must offer a real case-study action.');
   assert.match(directory,/<button\b[^>]*\bdata-ribbon-collapse\b/);
   const viewer=directory.match(/<figure\b[^>]*\bdata-tem-viewer\b[^>]*>[\s\S]*?<\/figure>/)?.[0];
   assert.ok(viewer,'The interactive identity must be a separate, named region.');
   const modelURL=viewer.match(/\bdata-model-url="([^"]+)"/)?.[1];
   assert.ok(modelURL?.startsWith('/portfolio/assets/models/'),'The identity model must honor directory hosting.');
   assert.ok(existsSync(resolve(root,modelURL.replace('/portfolio/','').split('?')[0])),'The identity must use an existing local model.');
   assert.match(viewer,/<canvas\b[^>]*\btabindex="0"[^>]*\baria-label="[^"]+"/,'The model must expose keyboard controls and an accessible description.');
   for(const action of ['reset','pulse'])assert.ok(viewer.includes(`data-tem-${action}`));
   const importMap=JSON.parse(directory.match(/<script type="importmap">([^<]+)<\/script>/)[1]);
   assert.equal(importMap.imports.three,'/portfolio/assets/vendor/three-0.161.0/build/three.module.js','The standalone viewer must use the same self-hosted Three as the main site.');
   assert.ok(existsSync(resolve(root,'assets/vendor/three-0.161.0/build/three.module.js')));
   const home=readFileSync(resolve(output,locale+'/index.html'),'utf8');
   assert.match(home,new RegExp(`class="launch-browse" href="/portfolio/${locale}/work/"`),'The primary browse action must be a real link independent of scene initialization.');
   const game=readFileSync(resolve(output,locale+'/work/growth/index.html'),'utf8');
   assert.match(game,/<a class="button-primary" href="https:\/\/tempestwang\.itch\.io\/growth-archive"/);
   const order=original.international.order;
   assert.match(game,new RegExp(`class="case-next-link" href="/portfolio/${locale}/work/${order[order.indexOf('growth')+1]}/"`),'Case studies continue in the archive order.');
   const mystery=readFileSync(resolve(output,locale+'/work/zhihu/index.html'),'utf8');
   assert.match(mystery,/<a class="button-primary" href="#film">/,'A project without a playable release should lead to its demo.');
   const collection=readFileSync(resolve(output,locale+'/work/poetry/index.html'),'utf8');
   assert.match(collection,new RegExp(`class="button-primary" href="/portfolio/${locale}/poetry/"`));
  }
  const aboutEN=readFileSync(resolve(output,'en/about/index.html'),'utf8');
  const aboutZH=readFileSync(resolve(output,'zh/about/index.html'),'utf8');
  assert.match(aboutEN,/<cite>The Three-Body Problem<\/cite>/);
  assert.doesNotMatch(aboutEN,/[《》]/);
  assert.match(aboutZH,/<summary>《三体》<\/summary>/);
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
  const sitemap=readFileSync(resolve(output,'sitemap.xml'),'utf8');assert.equal((sitemap.match(/<url>/g)||[]).length,33);
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
