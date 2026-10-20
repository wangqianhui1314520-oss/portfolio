import * as THREE from 'three';
import { Pass, FullScreenQuad } from '../vendor/three-0.161.0/examples/jsm/postprocessing/Pass.js';

const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

// Keep scene coverage/depth in a dedicated multisampled target. Full-screen
// colour passes can then use single-sample buffers without clearing this depth.
// This pass owns the supplied target's resize and disposal.
export class SceneTargetPass extends Pass {
 constructor({scene,camera,target}){
  super();this.scene=scene;this.camera=camera;this.target=target;
  this.needsSwap=false;this.clear=true;
 }
 setSize(width,height){this.target.setSize(Math.max(1,Math.floor(width)),Math.max(1,Math.floor(height)));}
 render(renderer){
  const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel(),autoClear=renderer.autoClear;
  try{
   renderer.autoClear=false;renderer.setRenderTarget(this.target);
   if(this.clear)renderer.clear(renderer.autoClearColor,renderer.autoClearDepth,renderer.autoClearStencil);
   renderer.render(this.scene,this.camera);
  }finally{
   renderer.autoClear=autoClear;
   // setRenderTarget also restores the target's viewport/scissor, leaving the
   // renderer's CSS-pixel viewport/scissor and their DPR conversion untouched.
   renderer.setRenderTarget(previous,face,mip);
  }
 }
 dispose(){this.target.dispose();}
}

// Deferred particles are all additive and manually clip against scene depth.
// Render their original geometry/coverage at the same MSAA count, then add the
// resolved RGBA layer. Never render geometry into a post-processing buffer.
export class ParticleLayerPass extends Pass {
 constructor({scene,camera,samples=4}){
  super();this.scene=scene;this.camera=camera;this.oldClearColor=new THREE.Color();
  this.target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false});
  this.target.samples=Math.max(0,Math.floor(samples));this.target.texture.name='Tem.particles.multisample';
  this.uniforms={tDiffuse:{value:null},tParticles:{value:this.target.texture}};
  this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader,depthTest:false,depthWrite:false,toneMapped:false,blending:THREE.NoBlending,
   // Three's non-premultiplied additive blend accumulates RGB*a and a*a;
   // premultiplied additive accumulates RGBA. A black, zero-alpha target with
   // the original materials retains both cases. Do not multiply alpha again.
   fragmentShader:'varying vec2 vUv;uniform sampler2D tDiffuse,tParticles;void main(){gl_FragColor=texture2D(tDiffuse,vUv)+texture2D(tParticles,vUv);}'
  });
  this.material.name='Tem.resolved-particle-layer';this.quad=new FullScreenQuad(this.material);
 }
 setSize(width,height){this.target.setSize(Math.max(1,Math.floor(width)),Math.max(1,Math.floor(height)));}
 render(renderer,writeBuffer,readBuffer){
  const destination=this.renderToScreen?null:writeBuffer;
  if(readBuffer===this.target||destination===this.target||destination===readBuffer)throw new Error('ParticleLayerPass cannot sample its output target');
  const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel(),autoClear=renderer.autoClear,alpha=renderer.getClearAlpha();
  renderer.getClearColor(this.oldClearColor);
  try{
   renderer.autoClear=false;renderer.setClearColor(0x000000,0);renderer.setRenderTarget(this.target);renderer.clear(true,false,false);
   // r161 resolves the multisampled target at the end of renderer.render.
   renderer.render(this.scene,this.camera);
   this.uniforms.tDiffuse.value=readBuffer.texture;
   renderer.setRenderTarget(destination);this.quad.render(renderer);
  }finally{
   renderer.setClearColor(this.oldClearColor,alpha);renderer.autoClear=autoClear;
   renderer.setRenderTarget(previous,face,mip);
  }
 }
 dispose(){this.target.dispose();this.material.dispose();this.quad.dispose();}
}
