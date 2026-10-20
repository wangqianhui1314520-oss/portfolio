import * as THREE from 'three';

const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));

// A bounded loading barrier owns no assets and never replaces a rejected model
// with a successful readiness result. The caller retains its live fallback.
export async function waitForStartupAssets(promises,{timeoutMs=8000}={}){
 let timer;
 try{
  return await Promise.race([
   Promise.allSettled(promises).then(results=>({timedOut:false,results})),
   new Promise(resolve=>{timer=setTimeout(()=>resolve({timedOut:true,results:null}),timeoutMs);})
  ]);
 }finally{clearTimeout(timer);}
}

function visibleInWorld(object){
 for(let node=object;node;node=node.parent)if(!node.visible)return false;
 return true;
}

function proxyFor(objects,lights=[],materialTransform=null){
 const group=new THREE.Group();
 for(const object of [...objects,...lights]){
  // clone(false) preserves instancing, skinning and material/geometry identity.
  // No source is reparented; geometry, materials and textures stay shared.
  const proxy=object.clone(false);proxy.visible=true;
  if(materialTransform&&proxy.material)proxy.material=Array.isArray(proxy.material)?proxy.material.map(materialTransform):materialTransform(proxy.material);
  group.add(proxy);
 }
 return group;
}

// r161 compileAsync supports a separate targetScene: its environment and real
// lights remain authoritative while private proxies select only useful shaders.
// The second variant covers the portrait's two point fills when its parent is
// still hidden during the voyage. Whole-world compile() would also link every
// hidden archive chapter and obsolete fallback at the start of the experience.
export async function prepareStartupShaders({renderer,scene,camera,target,extraRoots=[],reflection=null,yieldControl=yieldTask}){
 if(typeof renderer.compileAsync!=='function')return {prepared:false,objects:0,variants:0,milliseconds:0};
 const started=performance.now(),base=new Set(),authored=new Set(),extraLights=new Set();
 scene.traverseVisible(object=>{if(object.isMesh||object.isPoints||object.isLine)base.add(object);});
 for(const root of extraRoots)root?.traverse(object=>{
  if(object.isMesh||object.isPoints||object.isLine)authored.add(object);
  if(object.isLight&&object.visible&&!visibleInWorld(object))extraLights.add(object);
 });
 const all=new Set([...base,...authored]);
 const variants=[{objects:base,lights:[],target}];
 if(authored.size||extraLights.size)variants.push({objects:all,lights:[...extraLights],target});
 if(reflection)variants.push({objects:all,lights:[...extraLights],target:reflection.target,transform:reflection.materialForCapture});
 const initialized=new Set();let linked=0;
 for(const {objects,lights,target:drawTarget,transform} of variants){
  if(!objects.size)continue;
  await yieldControl();
  const proxy=proxyFor(objects,lights,transform);
  const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel();
  try{
   let pending;
   try{
    // Match the actual linear HDR draw, not the browser's sRGB default target.
    renderer.setRenderTarget(drawTarget);
    pending=renderer.compileAsync(proxy,camera,scene);
   }finally{renderer.setRenderTarget(previous,face,mip);}
   await pending;
   // compileAsync cannot poll completion on drivers without KHR support.
   // r161 defers uniform/attribute discovery until the first actual draw;
   // resolve it here one program per task, retaining its error diagnostics.
   // This is intentionally tied to the bundled r161 renderer, not a GL patch.
   for(const object of proxy.children)for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!material)continue;
    const program=renderer.properties?.get(material)?.currentProgram;
    if(!program||initialized.has(program))continue;
    await yieldControl();program.getUniforms();program.getAttributes();
    if(program.diagnostics?.runnable===false)throw new Error(`Startup shader failed: ${material.name||material.type}`);
    initialized.add(program);
   }
   linked++;
  }finally{proxy.clear();}
 }
 return {prepared:true,objects:all.size,variants:linked,programs:initialized.size,milliseconds:performance.now()-started};
}

// Composer passes draw full-screen materials outside the scene graph, so the
// scene warmup never saw them: the nebula volume linked on the main thread
// during the first composed frame. Collect every pass material; the ones behind
// the output transform can also present to the canvas when last enabled.
export function fullscreenPassMaterials(passes,{screenAfter=-1}={}){
 const intermediate=new Set(),screen=new Set();
 passes.forEach((pass,index)=>{
  for(const value of Object.values(pass))for(const item of Array.isArray(value)?value:[value]){
   // RawShaderMaterial output passes choose their defines during render().
   if(!item?.isShaderMaterial||item.isRawShaderMaterial)continue;
   intermediate.add(item);if(screenAfter>=0&&index>screenAfter)screen.add(item);
  }
 });
 return {intermediate:[...intermediate],screen:[...screen]};
}

// Link each full-screen material for the target kind it draws into: linear HDR
// render targets, or the canvas for a last enabled pass. Extra scenes, such as
// the deferred particle layer, link against their own target.
export async function prepareFullscreenShaders({renderer,camera,target,materials=[],screenMaterials=[],scenes=[],yieldControl=yieldTask}){
 if(typeof renderer.compileAsync!=='function')return {prepared:false,programs:0,milliseconds:0};
 const started=performance.now(),geometry=new THREE.PlaneGeometry(2,2),initialized=new Set();
 const batch=list=>{const group=new THREE.Scene();for(const material of list){const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;group.add(mesh);}return group;};
 const jobs=[...scenes.map(entry=>({scene:entry.scene,target:entry.target,owned:false})),{scene:batch(materials),target,owned:true},{scene:batch(screenMaterials),target:null,owned:true}];
 try{
  for(const {scene,target:drawTarget,owned} of jobs){
   if(!scene?.children.length)continue;
   await yieldControl();
   const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel();
   let pending;
   try{renderer.setRenderTarget(drawTarget);pending=renderer.compileAsync(scene,camera);}
   finally{renderer.setRenderTarget(previous,face,mip);}
   try{
    await pending;
    const used=new Set();scene.traverse(object=>{for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[])used.add(material);});
    for(const material of used){
     const program=renderer.properties?.get(material)?.currentProgram;
     if(!program||initialized.has(program))continue;
     await yieldControl();program.getUniforms();program.getAttributes();
     if(program.diagnostics?.runnable===false)throw new Error(`Full-screen shader failed: ${material.name||material.type}`);
     initialized.add(program);
    }
   }finally{if(owned)scene.clear();}
  }
 }finally{geometry.dispose();}
 return {prepared:true,programs:initialized.size,milliseconds:performance.now()-started};
}

// Content that appears later — archive chapters, the starport and fleet,
// sector worlds, docked craft — linked its shaders on the main thread the first
// time it was drawn: 50–65 programs per scene change on a cold Windows cache.
// The warmer finds materials that have never been linked anywhere in the graph,
// hidden or not, and links them in small asynchronous batches against the real
// scene target and light state (plus the mirror's thin-glass variant).
export function createShaderWarmup({renderer,scene,camera,target,reflection=null,rank=()=>1,batch=8,yieldControl=yieldTask}){
 let settled=new WeakSet(),running=null,materials=0,programs=0,failures=0;
 const pending=material=>material&&!settled.has(material)&&!renderer.properties?.get(material)?.programs;
 function collect(){
  const found=[];
  scene.traverse(object=>{
   if(!(object.isMesh||object.isPoints||object.isLine||object.isSprite)||!object.material)return;
   if((Array.isArray(object.material)?object.material:[object.material]).some(pending))found.push(object);
  });
  return found.sort((a,b)=>rank(a)-rank(b));
 }
 async function link(objects,drawTarget,transform){
  const proxy=proxyFor(objects,[],transform);
  const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel();
  try{
   let compiling;
   try{renderer.setRenderTarget(drawTarget);compiling=renderer.compileAsync(proxy,camera,scene);}
   finally{renderer.setRenderTarget(previous,face,mip);}
   await compiling;
   for(const object of proxy.children)for(const material of Array.isArray(object.material)?object.material:[object.material]){
    const program=renderer.properties?.get(material)?.currentProgram;
    if(!program||program.temWarm)continue;
    await yieldControl();program.getUniforms();program.getAttributes();program.temWarm=true;programs++;
   }
  }finally{proxy.clear();}
 }
 async function run(){
  const objects=collect();
  for(let i=0;i<objects.length;i+=batch){
   const slice=objects.slice(i,i+batch).filter(object=>(Array.isArray(object.material)?object.material:[object.material]).some(pending));
   if(!slice.length)continue;
   await yieldControl();
   try{
    await link(slice,target);
    const glass=reflection?slice.filter(object=>(Array.isArray(object.material)?object.material:[object.material]).some(material=>material?.transmission>0)):[];
    if(glass.length)await link(glass,reflection.target,reflection.materialForCapture);
   }catch{failures++;}
   // Even a failed batch is not retried in a loop; its first real draw reports.
   for(const object of slice)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material&&!settled.has(material)){settled.add(material);materials++;}
  }
  return objects.length;
 }
 return {
  schedule(){if(!running)running=run().finally(()=>{running=null;});return running;},
  // Link one detached asset now, ahead of the periodic scan of the scene.
  async prepareRoot(root){
   const objects=[];root.traverse(object=>{if((object.isMesh||object.isPoints||object.isLine||object.isSprite)&&object.material)objects.push(object);});
   for(let i=0;i<objects.length;i+=batch){
    const slice=objects.slice(i,i+batch);await yieldControl();
    await link(slice,target);
    const glass=reflection?slice.filter(object=>(Array.isArray(object.material)?object.material:[object.material]).some(material=>material?.transmission>0)):[];
    if(glass.length)await link(glass,reflection.target,reflection.materialForCapture);
    for(const object of slice)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material&&!settled.has(material)){settled.add(material);materials++;}
   }
   return objects.length;
  },
  get busy(){return Boolean(running);},
  // A restored context has no programs; every material must be linked again.
  reset(){settled=new WeakSet();},
  get stats(){return {materials,programs,failures};}
 };
}

// Authored assets that arrive while the visitor is already looking — the
// starport and fleet on the atlas, reading displays, a docked vessel — await
// their shader link before attaching, so their first frame never links on the
// main thread while the procedural stand-in stays visible. Without a live
// renderer (tests, fallbacks) they attach at once; a hung link is bounded.
let lateCompiler=null;
export function setLateAssetCompiler(compiler){lateCompiler=typeof compiler==='function'?compiler:null;}
export function compileBeforeReveal(root,{timeoutMs=4000}={}){
 if(!lateCompiler||!root)return Promise.resolve(false);
 let timer;
 const linked=Promise.resolve().then(()=>lateCompiler(root)).then(()=>true,()=>false);
 return Promise.race([linked,new Promise(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs);})]).finally(()=>clearTimeout(timer));
}
// Modules that build content on demand gate visibility only when a live
// renderer can link it; without one (tests, fallbacks) content shows at once.
export function hasLateAssetCompiler(){return Boolean(lateCompiler);}
