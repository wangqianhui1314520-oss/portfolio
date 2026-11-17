import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, resolve} from 'node:path';
import {buildInternational, loadData} from '../scripts/build-international.mjs';

const data = loadData();
const output = mkdtempSync(resolve(tmpdir(), 'tem-content-refinement-'));
buildInternational({outDir:output,origin:'https://example.test',basePath:'/portfolio/'});
const read = path => readFileSync(resolve(output,path),'utf8');
after(()=>{
  assert.equal(dirname(output),resolve(tmpdir()));
  assert.ok(basename(output).startsWith('tem-content-refinement-'));
  rmSync(output,{recursive:true,force:true});
});

test('search titles name the person and lead with game and AI product design',()=>{
  for(const path of ['index.html','zh/index.html','zh/work/index.html']){
    const html=read(path),title=html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.match(title,/王乾辉/);
    assert.match(title,/游戏与 AI 产品策划/);
  }
  assert.match(read('en/work/index.html'),/<title>Wang Qianhui \(Tem\) · Game &amp; AI Product Design<\/title>/);
  assert.equal(data.profile.title,'游戏与 AI 产品策划 · 创意技术');
  assert.equal(data.locales.en.profile.title,'Game & AI Product Designer · Creative Technology');
  for(const id of ['yuanmo','anyao','dafeiyu'])assert.match(read(`zh/work/${id}/index.html`),/<title>[^<]*王乾辉 Tem<\/title>/);
});

test('professional quick read and contribution links precede personal reading without publishing education',()=>{
  for(const locale of ['zh','en']){
    const html=read(`${locale}/about/index.html`);
    const positions=['id="career"','id="practice"','id="experience"','id="recognition"','id="curiosity"','id="reading"'].map(id=>html.indexOf(id));
    assert.ok(positions.every(position=>position>=0));
    assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
    for(const id of ['yuanmo','anyao','dafeiyu'])assert.ok(html.includes(`/portfolio/${locale}/work/${id}/#design`));
    assert.match(html,/class="career-jump"/);
    assert.doesNotMatch(html,/resume\.pdf|source\/|"education"/);
  }
  assert.equal(data.profile.resume.education,undefined);
});

test('three selected cases show three semantic design steps and verification instructions in both languages',()=>{
  for(const id of ['yuanmo','anyao','dafeiyu']){
    for(const locale of ['zh','en']){
      const story=data.international.caseNarratives[id][locale],html=read(`${locale}/work/${id}/index.html`);
      assert.equal(story.steps.length,3);
      assert.ok(story.note&&story.verify&&story.evidence);
      assert.match(html,/<section id="design"[^>]*data-design-illustration="true"/);
      const steps=html.match(/<ol class="case-story-steps">([\s\S]*?)<\/ol>/)?.[1];
      assert.equal((steps?.match(/<li>/g)||[]).length,3);
      assert.ok(html.includes(locale==='zh'?'如何验证':'How to verify'));
      assert.ok(html.includes(locale==='zh'?'示意':'illustration'));
      assert.match(html,/case-story\.css\?v=[a-f0-9]{10}/);
      assert.ok(html.includes('id="caseMedia"'));
    }
  }
});

test('existing media stays separate from design diagrams and is never recast as a new live demonstration',()=>{
  for(const locale of ['zh','en']){
    const yuanmo=read(`${locale}/work/yuanmo/index.html`);
    assert.match(yuanmo,/assets\/videos\/yuanmo\.mp4/);
    assert.equal((yuanmo.match(/<video\b/g)||[]).length,1);
    assert.doesNotMatch(yuanmo,/<video[^>]*autoplay/);
    assert.match(yuanmo,/href="#film"/);
    const anyao=read(`${locale}/work/anyao/index.html`);
    assert.match(anyao,/data-evidence-kind="cover"/);
    assert.match(anyao,/href="https:\/\/anyao-link\.app\.workbuddy\.host\/"/);
    assert.ok(anyao.includes(locale==='zh'?'不是实物测试记录':'not a hardware test record'));
    const fish=read(`${locale}/work/dafeiyu/index.html`);
    assert.match(fish,/dafeiyu-dashboard\.jpg/);
    assert.ok(fish.includes(locale==='zh'?'不是跨日对话回放':'not a cross-day conversation replay'));
    assert.ok(fish.includes(locale==='zh'?'历史运行界面':'earlier interface'));
  }
});

test('selected case overviews do not repeat the highlights and awards already shown in contribution sections',()=>{
  for(const locale of ['zh','en'])for(const id of ['yuanmo','anyao','dafeiyu']){
    const html=read(`${locale}/work/${id}/index.html`);
    const overview=html.match(/<section id="overview"[^>]*>([\s\S]*?)<\/section>/)?.[1];
    assert.ok(overview);
    assert.doesNotMatch(overview,/<ul>|class="case-facts"/);
    if(data.works.find(work=>work.id===id).specs?.length)assert.match(overview,/<details class="case-technical">/);
  }
});

test('reading and archive pages load transition enhancements after existing styles and archive initialization',()=>{
  for(const path of ['zh/work/index.html','en/work/index.html','zh/about/index.html','en/work/yuanmo/index.html']){
    const html=read(path);
    assert.ok(html.indexOf('international-site.css')<html.indexOf('page-transitions.css'));
    assert.ok(html.indexOf('international-static.js')<html.indexOf('page-transitions.js'));
    assert.match(html,/page-transitions\.js\?v=[a-f0-9]{10}/);
    assert.match(html,/page-transitions\.css\?v=[a-f0-9]{10}/);
    assert.match(html,/<script type="module" blocking="render" src="[^\"]*page-transitions\.js\?v=[a-f0-9]{10}"><\/script>/);
    assert.ok(html.indexOf('page-transitions.js')<html.indexOf('</head>'),'pagereveal listener must be installed before the first rendering opportunity');
  }
});
