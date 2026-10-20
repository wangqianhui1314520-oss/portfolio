import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderProfile} from '../assets/js/immersive-render-profile.js';

test('opt-in stage evidence counts actual draw submissions and restores wrapped methods',()=>{
 const gl={getExtension:()=>null},canvas={dataset:{}},renderer={info:{render:{calls:0,triangles:0}},renderBufferDirect(){this.info.render.calls++;this.info.render.triangles+=12;}};
 const scene={isScene:true},root={name:'authored cabin',parent:scene},object={name:'glass',parent:root},original=renderer.renderBufferDirect;
 const pass={render(){renderer.renderBufferDirect(null,null,null,null,object);renderer.renderBufferDirect(null,null,null,null,object);return 17;}},originalPass=pass.render;
 const profile=createRenderProfile({gl,canvas,renderer,composer:{passes:[pass]},enabled:true});
 profile.begin(1);assert.equal(pass.render(),17);profile.publish();
 const stage=JSON.parse(canvas.dataset.renderStages)[0];assert.equal(stage.calls,2);assert.equal(stage.triangles,24);assert.equal(stage.mean,null);assert.ok(stage.cpuMs>=0);assert.deepEqual(JSON.parse(canvas.dataset.renderRoots),[{root:'authored cabin',calls:2}]);
 profile.begin(2);pass.render();profile.publish();assert.equal(JSON.parse(canvas.dataset.renderRoots)[0].calls,2,'root counts describe one real frame, not cumulative submissions');
 profile.dispose();assert.equal(pass.render,originalPass);assert.equal(renderer.renderBufferDirect,original);
});
test('ordinary visits leave the renderer and pass untouched',()=>{
 const operation=()=>9,pass={render:operation},renderer={renderBufferDirect:operation},canvas={dataset:{}},profile=createRenderProfile({gl:{},composer:{passes:[pass]},canvas,renderer});
 assert.equal(profile.measure('reflection',operation),operation);profile.begin(3);profile.publish();profile.dispose();assert.equal(pass.render,operation);assert.equal(renderer.renderBufferDirect,operation);assert.deepEqual(canvas.dataset,{});
});
