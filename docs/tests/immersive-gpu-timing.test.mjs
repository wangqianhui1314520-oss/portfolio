import test from 'node:test';
import assert from 'node:assert/strict';
import {readGraphicsEvidence} from '../assets/js/immersive-gpu-timing.js';
import {createGpuTiming} from '../assets/js/immersive-gpu-timing.js';

function device(){
 const ext={TIME_ELAPSED_EXT:1,GPU_DISJOINT_EXT:2};let active=null,disjoint=false;const deleted=[];
 const gl={QUERY_RESULT_AVAILABLE:3,QUERY_RESULT:4,CURRENT_QUERY:5,getExtension:()=>ext,
  createQuery:()=>({ready:false,result:8000000}),beginQuery:(_,query)=>{assert.equal(active,null);active=query;},endQuery:()=>{active=null;},
  getQuery:()=>active,getParameter:()=>disjoint,getQueryParameter:(query,type)=>{if(type===3)return query.ready;assert.ok(query.ready,'never read an unresolved result');return query.result;},
  deleteQuery:query=>deleted.push(query),isContextLost:()=>false};
 return {gl,deleted,setDisjoint:value=>{disjoint=value;},get active(){return active;}};
}

test('GPU results stay asynchronous, bounded and reject invalidated timing',()=>{
 const d=device(),timer=createGpuTiming(d.gl),queries=[];
 for(let frame=0;frame<150;frame++){
  const started=timer.begin(frame);if(started){queries.push(d.active);timer.end();}
 }
 assert.equal(queries.length,4,'an unresolved device cannot accumulate query objects');
 assert.equal(timer.stats.mean,null);assert.equal(timer.stats.samples,0);
 queries[0].ready=true;queries[1].ready=true;queries[1].result=12000000;
 timer.begin(165);assert.equal(timer.stats.mean,10);assert.equal(timer.stats.p95,12);assert.equal(d.deleted.length,2);
 d.setDisjoint(true);timer.begin(180);timer.end();assert.equal(timer.stats.mean,null);assert.equal(timer.stats.discarded,2);
 timer.reset();assert.equal(timer.stats.pending,0);assert.equal(timer.stats.samples,0);
});

test('unsupported GPU timers do not allocate or invent render measurements',()=>{
 const timer=createGpuTiming({getExtension:()=>null});assert.equal(timer.begin(0),false);timer.end();timer.reset();
 assert.equal(timer.stats.supported,false);assert.equal(timer.stats.mean,null);assert.equal(timer.stats.samples,0);
});

test('stage samples occupy different frames without nesting the full-render timer',()=>{
 const d=device(),full=createGpuTiming(d.gl),stage=createGpuTiming(d.gl,{offset:1});
 assert.equal(full.begin(0),true);assert.equal(stage.begin(0),false);full.end();
 assert.equal(full.begin(1),false);assert.equal(stage.begin(1),true);stage.end();
 assert.equal(full.begin(30),true);assert.equal(stage.begin(30),false);full.end();
 assert.equal(stage.begin(31),true);stage.end();
 assert.equal(full.stats.pending,2);assert.equal(stage.stats.pending,2);
 full.reset();stage.reset();assert.equal(d.deleted.length,4);
});

test('context restoration discards old queries and reacquires changed timer support',()=>{
 const d=device();let lost=false,available=true,generation=0;
 d.gl.isContextLost=()=>lost;
 d.gl.getExtension=()=>available?{TIME_ELAPSED_EXT:++generation,GPU_DISJOINT_EXT:2}:null;
 const targets=[];const begin=d.gl.beginQuery;
 d.gl.beginQuery=(target,query)=>{targets.push(target);begin(target,query);};
 const timer=createGpuTiming(d.gl);assert.equal(timer.begin(0),true);timer.end();
 lost=true;timer.reset();assert.equal(d.deleted.length,0,'invalid old-context handles are not submitted to GL');
 lost=false;timer.restore();assert.equal(timer.stats.samples,0);assert.equal(timer.stats.pending,0);
 assert.equal(timer.begin(30),true);timer.end();assert.deepEqual(targets,[1,2]);
 lost=true;timer.reset();lost=false;available=false;timer.restore();
 assert.equal(timer.stats.supported,false);assert.equal(timer.begin(60),false);
});
test('software renderer evidence is explicit and other renderer names do not claim hardware success',()=>{
 const gl={RENDERER:1,VENDOR:2,getExtension:()=>({UNMASKED_RENDERER_WEBGL:3,UNMASKED_VENDOR_WEBGL:4}),getParameter:key=>key===3?'ANGLE (Microsoft Basic Render Driver)':'Google Inc.'};
 assert.equal(readGraphicsEvidence(gl).acceleration,'software-reported');
 gl.getParameter=key=>key===3?'ANGLE (NVIDIA)':'Google Inc.';
 assert.equal(readGraphicsEvidence(gl).acceleration,'not-confirmed');
});
test('graphics diagnostics tolerate unavailable extensions and lost contexts',()=>{
 assert.equal(readGraphicsEvidence({getExtension(){throw new Error('context lost');}}).renderer,'unavailable');
 const gl={RENDERER:1,VENDOR:2,getExtension:()=>null,getParameter:key=>key===1?'WebGL':'WebKit'};
 assert.equal(readGraphicsEvidence(gl).unmasked,false);assert.equal(readGraphicsEvidence(gl).acceleration,'not-confirmed');
});
