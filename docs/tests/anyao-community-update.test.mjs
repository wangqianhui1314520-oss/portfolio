import test from 'node:test';
import assert from 'node:assert/strict';
import {loadData} from '../scripts/build-international.mjs';
import {localizedData} from '../assets/js/locale-data.js';

const data=loadData();
const actual=(locale)=>localizedData(data,locale).works.find(work=>work.id==='anyao');
const facts={zh:[/K-Hub.*社区.*应用/,/第十一届开源大会.*展示/,/义务供应链支持/],en:[/in use.*K-Hub|K-Hub.*in use/i,/shown.*11th Open Source Conference|11th Open Source Conference.*shown/i,/pro bono supply-chain support/i]};

test('AnYao outcomes include the user-reported community use, conference showing and voluntary support',()=>{
  for(const locale of ['zh','en']){
    const work=actual(locale);
    for(const pattern of facts[locale])assert.ok(pattern.test(work.contribution.outcome),locale+': '+pattern);
    assert.match(work.status,/K-Hub/);
    assert.match(work.desc,/K-Hub/);
  }
});

test('AnYao cards and shortlist lead with real community application rather than only an award',()=>{
  const featured=data.international.featured.find(project=>project.id==='anyao');
  for(const locale of ['zh','en']){
    const card=data.international.projectCards.anyao[locale];
    assert.match(card.summary,/K-Hub/);
    assert.match(card.result,/K-Hub/);
    assert.match(featured[locale].proof,/K-Hub/);
    assert.match(card.result,locale==='zh'?/第十一届开源大会展示/:/11th Open Source Conference showcase/i);
    assert.match(card.result,locale==='zh'?/义务供应链支持/:/pro bono supply-chain support/i);
  }
});

test('case context carries community use without presenting the design diagram as a new hardware test',()=>{
  for(const locale of ['zh','en']){
    const study=data.international.caseStudies.anyao[locale];
    for(const pattern of facts[locale])assert.ok(pattern.test(study.context),locale+': '+pattern);
    const narrative=data.international.caseNarratives.anyao[locale];
    assert.match(narrative.note,/K-Hub/);
    assert.equal(narrative.steps.length,3);
    assert.match(narrative.note,locale==='zh'?/不是实物测试记录/:/not a hardware test record/);
  }
});

test('the profile community record follows the same facts without adding commercial or medical claims',()=>{
  for(const locale of ['zh','en']){
    const profile=localizedData(data,locale).profile;
    const community=profile.resume.recognition.find(record=>record.title.includes('K-Hub'));
    assert.match(community.text,locale==='zh'?/安药已在 K-Hub 社区应用/:/AnYao is in use in the K-Hub community/);
    assert.match(community.text,locale==='zh'?/义务供应链支持/:/pro bono supply-chain support/);
    const userReported=[actual(locale).contribution.outcome,community.text,data.international.projectCards.anyao[locale].result].join(' ');
    assert.doesNotMatch(userReported,/量产|采购|临床效果|商业合同|mass production|procurement|clinical efficacy|commercial contract/i);
  }
});

test('existing team role, national award, license, media and live demo remain intact',()=>{
  for(const locale of ['zh','en']){
    const work=actual(locale);
    assert.match(work.contribution.role,locale==='zh'?/团队硬件设计与开发/:/Team hardware design & development/);
    assert.match(work.contribution.outcome,locale==='zh'?/全国第 5 名/:/5th nationally/);
    assert.match(work.contribution.outcome,/Apache-2\.0/);
    assert.equal(work.cover,'assets/covers/anyao-cover.jpg');
    assert.equal(work.play.url,'https://anyao-link.app.workbuddy.host/');
    assert.equal(work.images.length,4);
  }
});
