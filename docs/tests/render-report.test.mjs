import test from 'node:test';
import assert from 'node:assert/strict';
import {renderReport,copyRenderReport} from '../assets/js/render-report.js';
import {createFrameTelemetry} from '../assets/js/immersive-frame-budget.js';

test('performance evidence separates actual GPU timing from CPU submission and missing measurements',()=>{
 const canvas={width:1280,height:720,dataset:{graphicsRenderer:'Microsoft Basic Render Driver',graphicsAcceleration:'software',frameRate:'28.4',frameP95Ms:'71.2',renderCpuMs:'9.5',renderGpuMs:'unavailable',renderGpuP95Ms:'unavailable',gpuTiming:'unavailable',quality:'1.00',bloom:'true',journey:'captain'}};
 const report=renderReport(canvas,{page:{pathname:'/zh/',search:'?view=captain&chapter=reading&private=value'},now:new Date('2026-10-09T00:00:00Z')});
 assert.equal(report.graphics.acceleration,'software');assert.equal(report.frames.fps,28.4);assert.equal(report.frames.p95Ms,71.2);
 assert.equal(report.work.renderSubmissionCpuMs,9.5);assert.equal(report.work.gpuMeanMs,null);assert.equal(report.work.gpuP95Ms,null);
 assert.equal(report.work.drawCalls,null);assert.equal(report.image.quality,1);assert.equal(report.image.bloom,true);
 assert.equal(report.page.chapter,'reading');assert.ok(!JSON.stringify(report).includes('private'));
 const missing=renderReport(null,{page:null});assert.equal(missing.frames.fps,null);assert.equal(missing.image.width,null);
});

test('one-click evidence uses the clipboard or downloads the same valid report on permission failure',async()=>{
 let copied,downloaded;
 const canvas={dataset:{renderGpuMs:'12.4'}};
 assert.equal(await copyRenderReport(canvas,{clipboard:{async writeText(value){copied=value;}},download(){assert.fail('download should be unnecessary');}}),'copied');
 assert.equal(JSON.parse(copied).work.gpuMeanMs,12.4);
 assert.equal(await copyRenderReport(canvas,{clipboard:{async writeText(){throw new Error('permission denied');}},download:value=>{downloaded=value;}}),'downloaded');
 assert.equal(JSON.parse(downloaded).work.gpuMeanMs,12.4);
 downloaded=null;await copyRenderReport(canvas,{clipboard:null,download:value=>{downloaded=value;}});assert.ok(downloaded);
});

test('slow-frame evidence retains visible stalls and resets its percentile window on resume',()=>{
 const telemetry=createFrameTelemetry();let evidence;
 for(let i=0;i<90;i++)assert.equal(telemetry.sample(16),null);
 evidence=telemetry.sample(180);
 assert.equal(evidence.frames,91);assert.equal(evidence.p95,16);assert.equal(evidence.max,180);assert.equal(evidence.longFrames,1);
 telemetry.sample(700);telemetry.reset();
 for(let i=0;i<100;i++)evidence=telemetry.sample(16)||evidence;
 assert.equal(evidence.frames,100);assert.equal(evidence.p95,16);assert.equal(evidence.max,16);assert.equal(evidence.longFrames,0);
});
