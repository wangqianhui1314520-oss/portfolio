import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from '../assets/vendor/three-0.161.0/build/three.module.js';

const asset=name=>new URL('../assets/'+name,import.meta.url);
// Execute the project's passes with the actual pinned Three data classes and
// FullScreenQuad. The renderer fixture records framebuffer/clear contracts;
// real GLSL compilation and multisample resolve remain browser acceptance.
const vendorScope={...THREE};
runInNewContext(readFileSync(asset('vendor/three-0.161.0/examples/jsm/postprocessing/Pass.js'),'utf8')
 .replace(/^import[\s\S]*?from 'three';\s*/,'').replace(/export \{ Pass, FullScreenQuad \};/,'')
 +'\nglobalThis.Pass=Pass;globalThis.FullScreenQuad=FullScreenQuad;',vendorScope);
function classes(file,names){
 const source=readFileSync(asset('js/'+file),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'');
 return runInNewContext(source+'\n({'+names.join(',')+'});',{THREE,Pass:vendorScope.Pass,FullScreenQuad:vendorScope.FullScreenQuad});
}
const {SceneTargetPass,ParticleLayerPass}=classes('immersive-scene-layers.js',['SceneTargetPass','ParticleLayerPass']);
const {NebulaPass}=classes('immersive-nebula-pass.js',['NebulaPass']);

function rendererFixture(){
 const previous=new THREE.WebGLRenderTarget(111,79);previous.viewport.set(3,4,95,63);previous.scissor.set(8,9,80,50);previous.scissorTest=true;
 const logicalViewport=new THREE.Vector4(5,7,800,450),logicalScissor=new THREE.Vector4(11,13,650,340),clearColor=new THREE.Color().setRGB(.013,.027,.071);
 const renderer={target:previous,face:2,mip:1,autoClear:true,autoClearColor:true,autoClearDepth:true,autoClearStencil:false,alpha:.37,
  viewport:previous.viewport.clone(),scissor:previous.scissor.clone(),scissorTest:previous.scissorTest,clearColor,clears:[],draws:[],resolves:[],
  getRenderTarget(){return this.target;},getActiveCubeFace(){return this.face;},getActiveMipmapLevel(){return this.mip;},
  getClearColor(color){return color.copy(this.clearColor);},getClearAlpha(){return this.alpha;},
  setClearColor(color,alpha=this.alpha){this.clearColor.set(color);this.alpha=alpha;},
  setRenderTarget(target,face=0,mip=0){
   Object.assign(this,{target,face,mip});this.viewport.copy(target?.viewport||logicalViewport.clone().multiplyScalar(2));
   this.scissor.copy(target?.scissor||logicalScissor.clone().multiplyScalar(2));this.scissorTest=target?.scissorTest??false;
  },
  clear(color=true,depth=true,stencil=true){this.clears.push({target:this.target,color,depth,stencil,clearColor:this.clearColor.clone(),alpha:this.alpha});},
  render(object,camera){
   this.draws.push({object,camera,target:this.target,autoClear:this.autoClear});this.inspect?.(object);
   if(this.draws.length===this.failDraw)throw new Error('synthetic renderer failure');
   if(this.target?.samples>0)this.resolves.push(this.target);
  }
 };
 const original={previous,face:renderer.face,mip:renderer.mip,autoClear:renderer.autoClear,color:clearColor.clone(),alpha:renderer.alpha,
  viewport:renderer.viewport.clone(),scissor:renderer.scissor.clone(),scissorTest:renderer.scissorTest};
 return {renderer,original,assertRestored(){
  assert.equal(renderer.target,original.previous);assert.equal(renderer.face,original.face);assert.equal(renderer.mip,original.mip);
  assert.equal(renderer.autoClear,original.autoClear);assert.equal(renderer.alpha,original.alpha);assert.deepEqual(renderer.clearColor,original.color);
  assert.deepEqual(renderer.viewport,original.viewport);assert.deepEqual(renderer.scissor,original.scissor);assert.equal(renderer.scissorTest,original.scissorTest);
 }};
}

test('main geometry renders once into its independent full-resolution 4x HDR depth target and restores renderer state',()=>{
 const f=rendererFixture(),target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthTexture:new THREE.DepthTexture(1,1)});target.samples=4;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),pass=new SceneTargetPass({scene,camera,target});
 pass.setSize(1536,864);pass.render(f.renderer,{},{});
 assert.equal(pass.needsSwap,false);assert.equal(target.width,1536);assert.equal(target.height,864);assert.equal(target.samples,4);
 assert.equal(f.renderer.draws.length,1);assert.equal(f.renderer.draws[0].object,scene);assert.equal(f.renderer.draws[0].camera,camera);
 assert.equal(f.renderer.draws[0].target,target);assert.equal(f.renderer.draws[0].autoClear,false);
 assert.deepEqual(f.renderer.resolves,[target]);assert.equal(f.renderer.clears[0].depth,true);f.assertRestored();
 f.renderer.failDraw=2;assert.throws(()=>pass.render(f.renderer),/synthetic renderer failure/);f.assertRestored();
 let disposed=0;target.addEventListener('dispose',()=>disposed++);pass.dispose();assert.equal(disposed,1);
});

test('deferred geometry retains 4x coverage and composites resolved RGBA into a different color buffer without clearing scene depth',()=>{
 const f=rendererFixture(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),pass=new ParticleLayerPass({scene,camera,samples:4});
 const material=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending});
 const line=new THREE.LineSegments(new THREE.BufferGeometry(),material);scene.add(line);
 const read=new THREE.WebGLRenderTarget(1536,864,{type:THREE.HalfFloatType,depthBuffer:false}),write=read.clone();
 pass.setSize(1536,864);pass.render(f.renderer,write,read);
 assert.equal(pass.needsSwap,true);assert.equal(pass.target.samples,4);assert.equal(pass.target.width,1536);assert.equal(pass.target.height,864);
 assert.equal(pass.target.texture.type,THREE.HalfFloatType);assert.equal(pass.target.depthBuffer,false);assert.equal(pass.target.depthTexture,null);
 assert.equal(line.material,material);assert.equal(f.renderer.draws[0].object,scene);assert.equal(f.renderer.draws[0].target,pass.target);
 assert.equal(f.renderer.draws[1].target,write);assert.equal(f.renderer.draws[1].object.material,pass.material);
 assert.equal(pass.uniforms.tDiffuse.value,read.texture);assert.equal(pass.uniforms.tParticles.value,pass.target.texture);
 assert.equal(pass.material.blending,THREE.NoBlending);assert.equal(pass.material.depthTest,false);assert.equal(pass.material.depthWrite,false);
 assert.equal(f.renderer.clears.length,1);assert.equal(f.renderer.clears[0].target,pass.target);
 assert.equal(f.renderer.clears[0].clearColor.getHex(),0);assert.equal(f.renderer.clears[0].alpha,0);
 assert.equal(f.renderer.clears[0].color,true);assert.equal(f.renderer.clears[0].depth,false);assert.equal(f.renderer.clears[0].stencil,false);
 assert.deepEqual(f.renderer.resolves,[pass.target]);f.assertRestored();
 assert.throws(()=>pass.render(f.renderer,read,read),/cannot sample its output target/);
 assert.throws(()=>pass.render(f.renderer,pass.target,read),/cannot sample its output target/);f.assertRestored();
});

test('particle geometry and fullscreen failures restore target, clear alpha/color and target viewport/scissor',()=>{
 for(const failDraw of [1,2]){
  const f=rendererFixture(),pass=new ParticleLayerPass({scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),samples:4});
  f.renderer.failDraw=failDraw;
  assert.throws(()=>pass.render(f.renderer,new THREE.WebGLRenderTarget(),new THREE.WebGLRenderTarget()),/synthetic renderer failure/);
  f.assertRestored();
 }
});

test('separate multisample additive RGBA is algebraically equivalent for partial line coverage and both Three alpha conventions',()=>{
 const three=readFileSync(asset('vendor/three-0.161.0/build/three.module.js'),'utf8');
 assert.match(three,/case AdditiveBlending:\s+gl\.blendFunc\( gl\.SRC_ALPHA, gl\.ONE \)/);
 assert.match(three,/case AdditiveBlending:\s+gl\.blendFunc\( gl\.ONE, gl\.ONE \)/);
 const pass=new ParticleLayerPass({scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera()});
 assert.match(pass.material.fragmentShader,/gl_FragColor=texture2D\(tDiffuse,vUv\)\+texture2D\(tParticles,vUv\);/);
 const particles=[{rgba:[2.3,.7,8,.31],mask:[1,0,0,1]},{rgba:[.2,4,1,.82],mask:[0,1,1,1]},{rgba:[1,.4,.3,.17],mask:[1,1,0,0]}];
 for(const premultiplied of [false,true])for(const source of [[.02,.04,7,1],[.3,12,.02,.37],[0,0,0,0]]){
  const original=Array.from({length:4},()=>source.slice()),layer=Array.from({length:4},()=>[0,0,0,0]);
  for(const particle of particles)for(let sample=0;sample<4;sample++)if(particle.mask[sample]){
   const factor=premultiplied?1:particle.rgba[3];
   for(let c=0;c<4;c++){original[sample][c]+=particle.rgba[c]*factor;layer[sample][c]+=particle.rgba[c]*factor;}
  }
  for(let c=0;c<4;c++){
   const reference=original.reduce((sum,sample)=>sum+sample[c],0)/4;
   const separated=source[c]+layer.reduce((sum,sample)=>sum+sample[c],0)/4;
   assert.ok(Math.abs(reference-separated)<1e-12,`channel ${c}, premultiplied ${premultiplied}`);
  }
 }
});

test('nebula samples the independent scene color and stable depth, while legacy callers retain readBuffer behavior',()=>{
 const source=new THREE.WebGLRenderTarget(128,72,{depthTexture:new THREE.DepthTexture(128,72)}),read=new THREE.WebGLRenderTarget(128,72,{depthTexture:new THREE.DepthTexture(128,72)}),write=read.clone();
 for(const sourceTarget of [source,null]){
  const f=rendererFixture(),camera=new THREE.PerspectiveCamera(),u={uDepth:{value:null},uCamera:{value:new THREE.Vector3()},uCameraMatrix:{value:new THREE.Matrix4()},uInvProjection:{value:new THREE.Matrix4()}};
  const pass={sourceTarget,camera,uniforms:u,matchesVolumeCache:()=>true,volumeCacheStatus:'reused',volumeFrames:0,compositeMaterial:{uniforms:{tDiffuse:{value:null}}},quad:{render(renderer){renderer.render(this,camera);}},renderToScreen:false};
  NebulaPass.prototype.render.call(pass,f.renderer,write,read);
  assert.equal(u.uDepth.value,(sourceTarget||read).depthTexture);assert.equal(pass.compositeMaterial.uniforms.tDiffuse.value,(sourceTarget||read).texture);
  assert.equal(f.renderer.draws.length,1);assert.equal(f.renderer.draws[0].target,write);
 }
});
