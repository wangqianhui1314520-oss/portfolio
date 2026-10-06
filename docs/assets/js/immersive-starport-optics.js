import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/Pass.js';

const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

// This is a current-frame, screen-space optical approximation. It bends only
// the annular film inside the well; its hollow centre and DOM lettering remain
// intact. It cannot reveal geometry absent from the current beauty buffer.
const fragmentShader=`
 varying vec2 vUv;
 uniform sampler2D tDiffuse,uSceneDepth;
 uniform mat4 uInvProjection,uCameraWorld,uViewProjection;
 uniform vec3 uCamera,uAnchor,uAxisX,uAxisZ,uNormal;
 uniform vec2 uRadii,uSize;
 uniform vec4 uBounds;
 uniform float uPower,uTime,uMaxPixels,uDepthReady;

 float hitDistance(vec2 uv,float depth){
  vec4 hit=uInvProjection*vec4(uv*2.-1.,depth*2.-1.,1.);
  return length(hit.xyz/max(.000001,hit.w));
 }
 vec2 projectUV(vec3 world){
  vec4 p=uViewProjection*vec4(world,1.);
  return p.xy/max(.000001,p.w)*.5+.5;
 }
 void main(){
  vec4 source=texture2D(tDiffuse,vUv);
  if(uPower<.001||uDepthReady<.5||vUv.x<uBounds.x||vUv.y<uBounds.y||vUv.x>uBounds.z||vUv.y>uBounds.w){gl_FragColor=source;return;}
  vec4 farView=uInvProjection*vec4(vUv*2.-1.,1.,1.);
  vec3 ray=normalize(mat3(uCameraWorld)*(farView.xyz/farView.w));
  float facing=dot(ray,uNormal);
  if(abs(facing)<.035){gl_FragColor=source;return;}
  float distance=dot(uAnchor-uCamera,uNormal)/facing;
  if(distance<=0.){gl_FragColor=source;return;}
  vec3 hit=uCamera+ray*distance,relative=hit-uAnchor;
  vec2 local=vec2(dot(relative,uAxisX),dot(relative,uAxisZ))/uRadii;
  float radius=length(local);
  // Four fifths of the window has no effect. The curved rim is a thin film,
  // rather than a large magnifying bubble laid over the scene.
  float film=smoothstep(.62,.76,radius)*(1.-smoothstep(.96,1.045,radius));
  if(film<.001){gl_FragColor=source;return;}
  float sceneDepth=texture2D(uSceneDepth,vUv).r;
  float sourceDistance=hitDistance(vUv,sceneDepth);
  float frontMargin=max(.16,uRadii.x*.10);
  float foreground=sceneDepth<.999999?1.-smoothstep(distance-frontMargin*1.6,distance-frontMargin*.45,sourceDistance):0.;
  // A foreground ship, clamp or instrument must keep its unbent silhouette.
  film*=1.-foreground;
  if(film<.001){gl_FragColor=source;return;}
  vec3 radial=normalize(uAxisX*local.x/uRadii.x+uAxisZ*local.y/uRadii.y);
  float slope=sin((radius-.62)/.425*3.14159265);
  // Project a displacement in the actual tilted plane. The result stretches
  // with the ellipse and changes as the camera goes around the starport.
  vec2 shift=(projectUV(hit+radial*uRadii.x*.041)-vUv)*slope;
  float pixels=length(shift*uSize);
  shift*=min(1.,uMaxPixels/max(.001,pixels));
  shift*=uPower*(.94+.06*sin(atan(local.y,local.x)*2.+uTime*.12));
  vec2 sampleUV=clamp(vUv+shift,vec2(.001),vec2(.999));
  float sampleDepth=texture2D(uSceneDepth,sampleUV).r;
  float sampleDistance=hitDistance(sampleUV,sampleDepth);
  float tolerance=max(.18,uRadii.x*.22+sourceDistance*.012);
  float crossing=(sceneDepth>.999999&&sampleDepth>.999999)?0.:abs(sourceDistance-sampleDistance);
  // Depth-aware sampling stops a rim from pulling a nearby white hull or an
  // unrelated foreground edge into the well. No extra depth/scene render.
  float continuity=1.-smoothstep(tolerance,tolerance*2.2,crossing);
  shift*=continuity;
  vec2 greenUV=clamp(vUv+shift,vec2(.001),vec2(.999));
  vec2 redUV=clamp(vUv+shift*1.075,vec2(.001),vec2(.999));
  vec2 blueUV=clamp(vUv+shift*.925,vec2(.001),vec2(.999));
  vec3 refracted=vec3(texture2D(tDiffuse,redUV).r,texture2D(tDiffuse,greenUV).g,texture2D(tDiffuse,blueUV).b);
  float grazing=pow(1.-min(1.,abs(facing)),3.);
  float coating=film*continuity*uPower*(.005+grazing*.007);
  refracted=refracted*vec3(.997,1.,1.004)+vec3(.52,.76,.91)*coating;
  gl_FragColor=vec4(mix(source.rgb,refracted,film*.83),source.a);
 }
`;

function visibleInTree(object){
 for(let at=object;at;at=at.parent)if(!at.visible)return false;
 return true;
}

// ShaderPass defaults allow a full-screen quad to touch depth. Preserve the
// original opaque geometry depth captured by NebulaPass for this later pass.
// Only colour sampling quads are adjusted; scene and particle RenderPasses
// (which have no ShaderMaterial+fsQuad) retain their own depth behaviour.
function preserveColorPassDepth(composer){
 for(const pass of composer.passes){
  if(pass.fsQuad&&pass.material?.isShaderMaterial){
   pass.material.depthTest=false;pass.material.depthWrite=false;
  }
 }
}

export class StarportOpticsPass extends Pass {
 constructor({camera,compact=()=>false,canvas,getAnchor,getSceneDepth}){
  super();this.camera=camera;this.compact=typeof compact==='function'?compact:()=>Boolean(compact);
  this.canvas=canvas;this.getAnchor=getAnchor;this.getSceneDepth=getSceneDepth;this.phase=0;this.status='';this.enabled=false;
  this.point=new THREE.Vector3();this.centerProjected=new THREE.Vector3();this.viewCenter=new THREE.Vector3();this.worldScale=new THREE.Vector3();
  this.uniforms={
   tDiffuse:{value:null},uSceneDepth:{value:null},uInvProjection:{value:new THREE.Matrix4()},uCameraWorld:{value:new THREE.Matrix4()},uViewProjection:{value:new THREE.Matrix4()},
   uCamera:{value:new THREE.Vector3()},uAnchor:{value:new THREE.Vector3()},uAxisX:{value:new THREE.Vector3(1,0,0)},uAxisZ:{value:new THREE.Vector3(0,0,1)},uNormal:{value:new THREE.Vector3(0,1,0)},
   uRadii:{value:new THREE.Vector2(1,.77)},uSize:{value:new THREE.Vector2(1,1)},uBounds:{value:new THREE.Vector4()},uPower:{value:0},uTime:{value:0},uMaxPixels:{value:2.9},uDepthReady:{value:0}
  };
  this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader,fragmentShader,depthTest:false,depthWrite:false,toneMapped:false});
  this.material.name='Tem.current-frame-well-refraction';this.quad=new FullScreenQuad(this.material);
 }
 setSize(width,height){this.uniforms.uSize.value.set(Math.max(1,width),Math.max(1,height));}
 update(frame,dt=1/60,motion=1){
  if(motion)this.phase+=Math.max(0,Math.min(.05,dt));
  const u=this.uniforms;u.uTime.value=this.phase;
  const descriptor=this.getAnchor?.(frame),object=descriptor?.object;
  const inAtlas=(frame?.step==='map'||frame?.step==='boot')&&!frame?.opening;
  let active=inAtlas&&object&&visibleInTree(object)&&descriptor.power!==0;
  if(active){
   object.updateWorldMatrix(true,false);object.getWorldPosition(u.uAnchor.value);object.getWorldScale(this.worldScale);
   u.uAxisX.value.setFromMatrixColumn(object.matrixWorld,0).normalize();u.uAxisZ.value.setFromMatrixColumn(object.matrixWorld,2).normalize();u.uNormal.value.setFromMatrixColumn(object.matrixWorld,1).normalize();
   const localRadius=descriptor.radius??6.6,worldRadius=descriptor.radiusSpace==='world';
   const radius=localRadius*(worldRadius?1:Math.abs(this.worldScale.x));
   const radiusZ=(descriptor.radiusZ??localRadius)*(worldRadius?1:Math.abs(this.worldScale.z));
   active=Number.isFinite(radius)&&Number.isFinite(radiusZ)&&radius>.01&&radiusZ>.01;
   if(active){
    u.uRadii.value.set(radius,radiusZ);u.uCamera.value.setFromMatrixPosition(this.camera.matrixWorld);
    u.uInvProjection.value.copy(this.camera.projectionMatrixInverse);u.uCameraWorld.value.copy(this.camera.matrixWorld);
    u.uViewProjection.value.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);
    this.viewCenter.copy(u.uAnchor.value).applyMatrix4(this.camera.matrixWorldInverse);
    this.centerProjected.copy(u.uAnchor.value).project(this.camera);
    active=this.viewCenter.z<-.1&&this.centerProjected.z>=-1&&this.centerProjected.z<=1;
    if(active){
     let left=1,bottom=1,right=0,top=0;
     for(let i=0;i<16;i++){
      const angle=i*Math.PI/8;
      this.point.copy(u.uAnchor.value).addScaledVector(u.uAxisX.value,Math.cos(angle)*radius*1.05).addScaledVector(u.uAxisZ.value,Math.sin(angle)*radiusZ*1.05).project(this.camera);
      const x=this.point.x*.5+.5,y=this.point.y*.5+.5;left=Math.min(left,x);bottom=Math.min(bottom,y);right=Math.max(right,x);top=Math.max(top,y);
     }
     active=right>0&&left<1&&top>0&&bottom<1;
     u.uBounds.value.set(Math.max(0,left-.002),Math.max(0,bottom-.002),Math.min(1,right+.002),Math.min(1,top+.002));
     const mobile=this.compact();u.uMaxPixels.value=mobile?1.35:2.9;
     u.uPower.value=THREE.MathUtils.clamp(descriptor.power??.74,0,1)*(mobile?.55:1);
    }
   }
  }
  this.enabled=Boolean(active&&u.uPower.value>.001);
  const status=this.enabled?'current-frame-annular-film':'inactive';
  if(status!==this.status){this.status=status;if(this.canvas)this.canvas.dataset.starportOptics=status;}
 }
 render(renderer,writeBuffer,readBuffer){
  const depth=this.getSceneDepth?.();
  // Sampling a depth attachment while writing its own framebuffer is invalid.
  // The intended final-to-screen placement is safe. Fail closed if another
  // caller relocates the pass into a framebuffer that owns the sampled depth.
  const safeDepth=depth&&(this.renderToScreen||writeBuffer?.depthTexture!==depth);
  this.uniforms.uSceneDepth.value=safeDepth?depth:readBuffer.texture;
  this.uniforms.uDepthReady.value=safeDepth?1:0;
  this.uniforms.tDiffuse.value=readBuffer.texture;
  renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);this.quad.render(renderer);
 }
 dispose(){this.material.dispose();this.quad.dispose();}
}

/**
 * Add after Film / Output, once the atmosphere has inserted its two passes.
 * getAnchor(frame) -> {object:Object3D, radius:localUnits, radiusZ?, power?}.
 * The object's local XZ plane defines the well, including its X/Z scaling.
 * radiusZ defaults to radius. A caller with already-scaled world radii can
 * explicitly pass radiusSpace:'world' to avoid applying object scale twice.
 * getSceneDepth -> atmosphere.particleUniforms.uSceneDepth.value. That pointer
 * is refreshed by NebulaPass immediately after the main scene RenderPass.
 * Call update(frame,dt,motion) after navigation updates camera/world matrices.
 * No scene render, depth copy, downloaded texture, or previous-frame history.
 */
export function createStarportOptics(options){
 const {composer}=options;preserveColorPassDepth(composer);
 const pass=new StarportOpticsPass(options);composer.addPass(pass);
 return {pass,update:(frame,dt,motion)=>pass.update(frame,dt,motion),dispose:()=>pass.dispose()};
}
