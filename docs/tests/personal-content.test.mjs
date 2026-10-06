import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {renderProfile,renderProfilePanel,profileTabs} from '../assets/js/immersive-profile.js';
import {renderPoetryDirectory,renderPoem} from '../assets/js/poetry-reader.js';
const scope={window:{}};runInNewContext(readFileSync(new URL('../assets/js/data.js',import.meta.url),'utf8'),scope);
const data=scope.window.PORTFOLIO_DATA;
test('personal chapters retain the supplied interests and omit education',()=>{
 for(const key of ['overview','reading','practice'])assert.ok(profileTabs.some(t=>t[0]===key),key);
 const all=profileTabs.map(t=>renderProfile(data,t[0])).join('');
 for(const text of ['理解过去，生活当下，畅想未来。','Atum','尽人事，已安俟天命。','政治','哲学','淘气包马小跳','笑猫日记','明朝那些事','三体','毛选'])assert.ok(all.includes(text),text);
 assert.equal(data.profile.resume.education,undefined);
 assert.doesNotMatch(all,/江苏商贸职业学院|专科|在读|2024\.09|教育背景|下载简历/);
 assert.doesNotMatch(readFileSync(new URL('../resume.html',import.meta.url),'utf8'),/江苏商贸职业学院|专科|在读|教育背景/);
});
test('capability links resolve to actual project evidence and preserve team responsibilities',()=>{
 const html=renderProfilePanel(data,'practice');
 for(const c of data.profile.resume.capabilities){const work=data.works.find(w=>w.id===c.evidence);assert.ok(work?.contribution,c.evidence);assert.ok(html.includes(`data-read-work="${work.id}"`));}
 assert.match(data.works.find(w=>w.id==='rebirth').contribution.role,/团队/);
});
test('all four poems have full text, original images and source dates',()=>{
 assert.equal(data.poetry.poems.length,4);
 assert.deepEqual(Array.from(data.poetry.poems,p=>p.title),['三叹浮生','无题（四）','梦君令','夜偶然思绪']);
 const directory=renderPoetryDirectory(data.poetry);
 for(const p of data.poetry.poems){assert.ok(directory.includes(p.title));const page=renderPoem(data.poetry,p.id);assert.ok(page.includes(p.image));assert.ok(page.includes(p.date));for(const paragraph of p.paragraphs)assert.ok(page.includes(paragraph));assert.ok(existsSync(new URL(`../${p.image}`,import.meta.url)));}
 assert.equal(data.poetry.poems[2].date,'2025-09-04');assert.equal(data.poetry.poems[3].date,'2021-05-27');
 assert.equal((renderPoem(data.poetry,data.poetry.poems[0].id).match(/disabled/g)||[]).length,1);
 assert.equal((renderPoem(data.poetry,data.poetry.poems[3].id).match(/disabled/g)||[]).length,1);
});
