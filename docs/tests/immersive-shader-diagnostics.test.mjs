import test from 'node:test';
import assert from 'node:assert/strict';
import {createShaderDiagnostics} from '../assets/js/immersive-shader-diagnostics.js';

test('shader evidence captures the actual source once without changing the reported log',()=>{
 const program={},gl={SHADER_TYPE:1,getProgramInfoLog:()=>'(62): warning X3595',getAttachedShaders:()=>[{}],getShaderParameter:()=>35632,getShaderSource:()=> 'uniform sampler2D field;'};
 const original=gl.getProgramInfoLog,diagnostics=createShaderDiagnostics(gl,{enabled:true});
 assert.equal(gl.getProgramInfoLog(program),'(62): warning X3595');gl.getProgramInfoLog(program);
 assert.deepEqual(diagnostics.snapshot,[{log:'(62): warning X3595',shaders:[{type:35632,source:'uniform sampler2D field;'}]}]);
 diagnostics.snapshot[0].shaders[0].source='changed';assert.equal(diagnostics.snapshot[0].shaders[0].source,'uniform sampler2D field;');
 diagnostics.dispose();assert.equal(gl.getProgramInfoLog,original);
});
test('normal visits do not alter or query the WebGL context',()=>{
 const gl={getProgramInfoLog:()=>''},original=gl.getProgramInfoLog,diagnostics=createShaderDiagnostics(gl);
 assert.equal(gl.getProgramInfoLog,original);assert.deepEqual(diagnostics.snapshot,[]);diagnostics.dispose();
});
test('a shader capture failure preserves the driver warning and another profiler ownership',()=>{
 const gl={getProgramInfoLog:()=> 'warning',getAttachedShaders(){throw new Error('missing shader');}},diagnostics=createShaderDiagnostics(gl,{enabled:true});
 assert.equal(gl.getProgramInfoLog({}),'warning');assert.equal(diagnostics.snapshot[0].captureError,'missing shader');
 const next=()=> 'next owner';gl.getProgramInfoLog=next;diagnostics.dispose();assert.equal(gl.getProgramInfoLog,next);
});
