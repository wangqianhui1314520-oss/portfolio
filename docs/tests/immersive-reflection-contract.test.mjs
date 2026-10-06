import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

class Vector3{
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
 copy(v){Object.assign(this,{x:v.x,y:v.y,z:v.z});return this;}
 clone(){return new Vector3().copy(this);}
 distanceToSquared(v){return (this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2;}
 applyMatrix4(){return this;}
}
class Matrix4{
 constructor(){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
 copy(m){this.elements=[...m.elements];return this;}
 invert(){return this;}multiply(){return this;}
}
class Quaternion{
 constructor(){this.angle=0;}copy(q){this.angle=q.angle;return this;}angleTo(q){return Math.abs(this.angle-q.angle);}
}
function moduleScope(file,extra={}){
 const source=readFileSync(new URL('../assets/js/'+file,import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'').replaceAll('import.meta.url',JSON.stringify(new URL('../assets/js/'+file,import.meta.url).href));
 const scope={...extra};runInNewContext(source,scope);return scope;
}
function reflectionFixture(){
 const captures=[];
 class Reflector{
  constructor(){this.rotation={};this.position=new Vector3();this.matrixWorld=new Matrix4();this.material={uniforms:{textureMatrix:{value:new Matrix4()}},dispose(){}};this.target={texture:{},dispose(){}};}
  updateMatrixWorld(){}getRenderTarget(){return this.target;}
  onBeforeRender(renderer,scene){
   assert.equal(renderer.shadowMap.needsUpdate,false,'the small capture must leave queued main shadows untouched');
   assert.equal(renderer.shadowMap.autoUpdate,false);
   assert.equal(scene.floor.visible,false);
   assert.notEqual(scene.glass.material,scene.originalGlass);
   assert.equal(scene.glass.material.onBeforeCompile,scene.originalGlass.onBeforeCompile,'arrival coverage is shared');
   assert.equal(scene.cameraCloud.value.y,-13.34);assert.equal(scene.volumeSteps.value,8);
   captures.push(true);renderer.setRenderTarget(this.target);renderer.xr.enabled=false;
   if(scene.failCapture)throw new Error('synthetic render failure');
  }
 }
 const scope=moduleScope('immersive-planar-reflection.js',{innerWidth:1200,THREE:{Vector3,Quaternion,Matrix4,Vector2:class{constructor(x,y){Object.assign(this,{x,y});}},Vector4:class{copy(v){Object.assign(this,v);return this;}},PlaneGeometry:class{dispose(){}}},Reflector});
 const camera={position:new Vector3(0,2.7,20),quaternion:new Quaternion(),projectionMatrix:new Matrix4(),getWorldPosition(v){return v.copy(this.position);},getWorldQuaternion(q){return q.copy(this.quaternion);}};
 const viewport={x:0,y:0,z:1200,w:700},mainTarget={name:'main'};
 const renderer={shadowMap:{needsUpdate:true,autoUpdate:false},xr:{enabled:true},target:mainTarget,getRenderTarget(){return this.target;},setRenderTarget(v){this.target=v;},getViewport(v){return v.copy(viewport);},setViewport(v){this.viewport={...v};}};
 const originalGlass={transmission:.94,onBeforeCompile(){},customProgramCacheKey(){return 'arrival';},clone(){return {...this};},dispose(){}};
 const floor={visible:true,isMesh:true,userData:{},material:{onBeforeCompile(){},customProgramCacheKey(){return 'pbr';}}},glass={isMesh:true,material:originalGlass};
 const cameraCloud={value:new Vector3(3,4,5)},volumeSteps={value:16},volumeA={material:{uniforms:{uCameraCloud:cameraCloud,uVolumeSteps:volumeSteps}},matrixWorld:new Matrix4(),updateWorldMatrix(){}},volumeB={...volumeA};
 const scene={floor,glass,originalGlass,cameraCloud,volumeSteps,traverse(visit){visit(floor);visit(glass);visit(volumeA);visit(volumeB);}};
 const canvas={dataset:{}},reflection=scope.createPlanarReflection({renderer,scene,camera,canvas});reflection.bindSurface(floor);
 return {reflection,renderer,scene,camera,canvas,captures,mainTarget};
}

test('real camera displacement, rotation and lens changes refresh a stationary chapter at twenty Hz',()=>{
 const f=reflectionFixture();f.reflection.update(0,{},1);assert.equal(f.captures.length,1);
 f.camera.position.x=2;f.reflection.update(.025,{},1);assert.equal(f.captures.length,1);
 f.reflection.update(.05,{},1);assert.equal(f.captures.length,2);assert.equal(f.canvas.dataset.reflectionRate,'20');
 f.camera.quaternion.angle=.08;f.reflection.update(.10,{},1);assert.equal(f.captures.length,3);
 f.camera.projectionMatrix.elements[0]=.8;f.reflection.update(.15,{},1);assert.equal(f.captures.length,4);
 f.reflection.update(.23,{},1);assert.equal(f.captures.length,4);
 f.reflection.update(.275,{},1);assert.equal(f.captures.length,5);assert.equal(f.canvas.dataset.reflectionRate,'8');
});
test('reading and reduced motion keep the reflection frozen until a discrete change',()=>{
 const f=reflectionFixture();f.reflection.update(12,{},0);assert.equal(f.captures.length,1);
 f.reflection.update(12,{},0);f.reflection.update(12,{},0);assert.equal(f.captures.length,1);
 f.reflection.invalidate();f.reflection.update(12,{},0);assert.equal(f.captures.length,2);assert.equal(f.canvas.dataset.reflectionPhase,'12.00');
 f.reflection.update(12,{},0);assert.equal(f.captures.length,2);
 f.camera.position.x=47;f.reflection.update(12,{},0);assert.equal(f.captures.length,3);
 f.reflection.update(12,{},0);assert.equal(f.captures.length,3);
});
test('the emitted floor shader keeps grazing and behind-camera projection samples finite',()=>{
 const f=reflectionFixture(),shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <opaque_fragment>'};
 f.scene.floor.material.onBeforeCompile(shader,{});
 // Evaluate the scalar components of the actual emitted GLSL arithmetic.
 // This checks its projection guard, rather than a separate JS reimplementation.
 const expression=name=>shader.fragmentShader.match(new RegExp(`\\b${name}=([^;]+);`))[1];
 const component=expression('projectedMirrorUV').replaceAll('vTemMirror.xy','coordinate').replaceAll('mirrorNormal.xz','normal').replaceAll('max(','Math.max(');
 const project=new Function('coordinate','vTemMirror','normal',`return (${component});`);
 const sample=new Function('projectedMirrorUV','clamp','vec2',`return (${expression('mirrorUV')});`);
 const coverage=new Function('vTemMirror','projectedMirrorUV','step',`return (${expression('inFrame')});`);
 const clamp=(x,min,max)=>Math.min(max,Math.max(min,x)),step=(edge,x)=>x<edge?0:1;
 for(const w of [0,-1,1e-12,.01,1]){
  const v={w},uv={x:project(2,v,0),y:project(-2,v,.03)};
  for(const value of [uv.x,uv.y]){assert.ok(Number.isFinite(value));const bounded=sample(value,clamp,x=>x);assert.ok(bounded>=.001&&bounded<=.999);}
  if(w<=.0001)assert.equal(coverage(v,uv,step),0,'a sample on/behind the camera plane has no mirror coverage');
 }
 assert.match(shader.fragmentShader,/notEqual\(reflection,reflection\)/);
 assert.match(shader.fragmentShader,/notEqual\(outgoingLight,outgoingLight\)/);
});
test('a small reflection cannot consume main-scene shadow work and restores temporary state on failure',()=>{
 const f=reflectionFixture();f.reflection.update(0,{},1);
 assert.equal(f.renderer.shadowMap.needsUpdate,true);assert.equal(f.renderer.xr.enabled,true);assert.equal(f.renderer.target,f.mainTarget);
 assert.equal(f.scene.floor.visible,true);assert.equal(f.scene.glass.material,f.scene.originalGlass);
 assert.equal(f.scene.cameraCloud.value.y,4);assert.equal(f.scene.volumeSteps.value,16);
 f.renderer.shadowMap.needsUpdate=false;f.scene.failCapture=true;f.reflection.invalidate();
 assert.throws(()=>f.reflection.update(.2,{},1),/synthetic render failure/);
 assert.equal(f.renderer.shadowMap.needsUpdate,false);assert.equal(f.renderer.shadowMap.autoUpdate,false);assert.equal(f.renderer.xr.enabled,true);
 assert.equal(f.renderer.target,f.mainTarget);assert.equal(f.scene.floor.visible,true);assert.equal(f.scene.glass.material,f.scene.originalGlass);
 assert.equal(f.scene.cameraCloud.value.y,4);assert.equal(f.scene.volumeSteps.value,16);
});
test('preparing authored materials retains actual baked maps, UV channels and physical factors',()=>{
 const scope=moduleScope('immersive-blender-assets.js',{THREE:{FrontSide:0},GLTFLoader:class{}});
 const normal={channel:0,colorSpace:'none',anisotropy:1},orm={channel:1,colorSpace:'none',anisotropy:1},normalScale={x:.84,y:.84};
 const material={name:'FLOOR_OPTICAL.WORLD_DECK',isMeshPhysicalMaterial:true,normalMap:normal,roughnessMap:orm,metalnessMap:orm,aoMap:orm,normalScale,roughness:1,metalness:.4,aoMapIntensity:.61,clearcoat:.52,clearcoatRoughness:.18};
 const mesh={name:'WORLD_DECK_FLOOR',isMesh:true,userData:{},material},root={traverse(visit){visit(mesh);}};
 scope.preparePBR(root);
 assert.equal(material.normalMap,normal);assert.equal(material.roughnessMap,orm);assert.equal(material.metalnessMap,orm);assert.equal(material.aoMap,orm);
 assert.equal(normal.channel,0);assert.equal(orm.channel,1);assert.equal(normal.colorSpace,'none');assert.equal(orm.colorSpace,'none');
 assert.equal(material.normalScale,normalScale);assert.equal(material.roughness,1);assert.equal(material.aoMapIntensity,.61);assert.equal(material.clearcoat,.52);assert.equal(material.clearcoatRoughness,.18);
 material.aoMapIntensity=1;scope.preparePBR(root);assert.equal(material.aoMapIntensity,.72,'deep AO keeps a bounded ambient fill without losing the bake');
 assert.deepEqual({...scope.assetTextureStats(root)},{normal:1,roughness:1,metalness:1,ao:1});
});
