import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from '../assets/vendor/three-0.161.0/build/three.module.js';

const source=readFileSync(new URL('../assets/js/immersive-shader-preparation.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'');
const api={THREE,setTimeout,clearTimeout,performance};runInNewContext(source,api);

test('warmup selects live surfaces plus the authored portrait, without compiling unrelated hidden chapters',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),target={name:'linear-HDR'},previous={name:'previous'};
 const live=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshPhysicalMaterial({transmission:.8}));scene.add(live);
 const portrait=new THREE.Group();portrait.visible=false;scene.add(portrait);
 const shell=live.clone(false),fill=new THREE.PointLight();portrait.add(shell,fill);
 const hiddenLamp=new THREE.PointLight();hiddenLamp.visible=false;portrait.add(hiddenLamp);
 const dormant=new THREE.Group();dormant.visible=false;dormant.add(live.clone(false));scene.add(dormant);
 let current=previous,release,compiles=0,yields=0;
 const linked=new Promise(resolve=>{release=resolve;});
 const renderer={getRenderTarget:()=>current,getActiveCubeFace:()=>3,getActiveMipmapLevel:()=>2,
  setRenderTarget(value,face,mip){current=value;if(value===previous){assert.equal(face,3);assert.equal(mip,2);}},
  async compileAsync(proxy,activeCamera,targetScene){
   compiles++;assert.equal(current,target);assert.equal(activeCamera,camera);assert.equal(targetScene,scene);
   assert.equal(proxy.children.filter(n=>n.isMesh).length,compiles===1?1:2);
   assert.equal(proxy.children.filter(n=>n.isLight).length,compiles===1?0:1);
   assert.ok(proxy.children.every(n=>n.parent===proxy));
   for(const mesh of proxy.children.filter(n=>n.isMesh)){assert.equal(mesh.material,live.material);assert.equal(mesh.geometry,live.geometry);}
   await linked;
  }};
 let done=false;const preparation=api.prepareStartupShaders({renderer,scene,camera,target,extraRoots:[portrait],yieldControl:async()=>{yields++;}}).then(s=>{done=true;return s;});
 await Promise.resolve();await Promise.resolve();assert.equal(current,previous);assert.equal(done,false);
 assert.equal(live.parent,scene);assert.equal(shell.parent,portrait);assert.equal(portrait.visible,false);
 release();const stats=await preparation;
 assert.equal(stats.variants,2);assert.equal(stats.objects,2);assert.equal(yields,2);
 assert.equal(current,previous);assert.equal(live.material.transmission,.8);assert.equal(portrait.visible,false);
});

test('failed compile restores the exact render target and remains a failure',async()=>{
 for(const synchronous of [true,false]){
  const scene=new THREE.Scene();scene.add(new THREE.Mesh());let current=null;
  const renderer={getRenderTarget:()=>current,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,setRenderTarget:v=>{current=v;},
   compileAsync(){if(synchronous)throw new Error('shader failed');return Promise.reject(new Error('shader failed'));}};
  await assert.rejects(api.prepareStartupShaders({renderer,scene,camera:new THREE.PerspectiveCamera(),target:{},yieldControl:async()=>{}}),/shader failed/);
  assert.equal(current,null);assert.equal(scene.children.length,1);
 }
});

test('critical model barrier preserves rejected evidence and bounds a hung request',async()=>{
 const settled=await api.waitForStartupAssets([Promise.resolve('model'),Promise.reject(new Error('offline'))]);
 assert.equal(settled.timedOut,false);assert.equal(settled.results[1].status,'rejected');
 const timed=await api.waitForStartupAssets([new Promise(()=>{})],{timeoutMs:5});
 assert.equal(timed.timedOut,true);assert.equal(timed.results,null);
});

test('first-use program discovery yields between programs and retains failed shader diagnostics',async()=>{
 for(const runnable of [true,false]){
  const scene=new THREE.Scene(),surface=new THREE.Mesh();scene.add(surface);
  const sequence=[],program={diagnostics:{runnable},getUniforms(){sequence.push('uniforms');},getAttributes(){sequence.push('attributes');}};
  const renderer={getRenderTarget:()=>null,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,setRenderTarget(){},
   properties:{get:()=>({currentProgram:program})},async compileAsync(){sequence.push('compile');}};
  const operation=api.prepareStartupShaders({renderer,scene,camera:new THREE.PerspectiveCamera(),target:{},yieldControl:async()=>{sequence.push('yield');}});
  if(runnable){const stats=await operation;assert.equal(stats.programs,1);assert.deepEqual(sequence,['yield','compile','yield','uniforms','attributes']);}
  else await assert.rejects(operation,/Startup shader failed/);
  assert.equal(surface.parent,scene);
 }
});

test('full-screen pass materials are collected once, raw output transforms excluded, canvas variants only behind the output pass',()=>{
 const shader=name=>Object.assign(new THREE.ShaderMaterial(),{name}),raw=new THREE.RawShaderMaterial();
 const volume=shader('volume'),composite=shader('composite'),blur=[shader('blur-1'),shader('blur-2')],film=shader('film'),optics=shader('optics');
 const passes=[{scene:new THREE.Scene()},{volumeMaterial:volume,compositeMaterial:composite,quad:{material:volume}},{separableBlurMaterials:blur,compositeMaterial:composite,basic:new THREE.MeshBasicMaterial()},{material:raw},{material:film},{material:optics,enabled:false}];
 const {intermediate,screen}=api.fullscreenPassMaterials(passes,{screenAfter:3});
 // Arrays created inside the vm context have another realm's prototype.
 assert.deepEqual([...intermediate].map(m=>m.name),['volume','composite','blur-1','blur-2','film','optics']);
 assert.deepEqual([...screen].map(m=>m.name),['film','optics']);
 assert.equal(api.fullscreenPassMaterials(passes).screen.length,0,'without an output pass nothing presents');
});

test('full-screen shaders link for their real targets, initialize programs and restore the caller target',async()=>{
 const camera=new THREE.PerspectiveCamera(),linear={name:'linear-HDR'},particles={name:'particles'},previous={name:'previous'};
 const pass=Object.assign(new THREE.ShaderMaterial(),{name:'pass'}),present=Object.assign(new THREE.ShaderMaterial(),{name:'present'});
 const dust=new THREE.Scene();dust.add(new THREE.Points(new THREE.BufferGeometry(),new THREE.ShaderMaterial()));
 let current=previous;const compiled=[],sequence=[],programs=new Map();
 const renderer={getRenderTarget:()=>current,getActiveCubeFace:()=>1,getActiveMipmapLevel:()=>0,
  setRenderTarget(value,face,mip){current=value;if(value===previous)assert.equal(face,1);},
  properties:{get:material=>({currentProgram:programs.get(material)||programs.set(material,{diagnostics:{runnable:true},getUniforms(){sequence.push('uniforms:'+(material.name||'dust'));},getAttributes(){}}).get(material)})},
  async compileAsync(group,activeCamera){
   assert.equal(activeCamera,camera);
   compiled.push({target:current,materials:group.children.map(mesh=>mesh.material.name||'dust')});
  }};
 const stats=await api.prepareFullscreenShaders({renderer,camera,target:linear,materials:[pass,present],screenMaterials:[present],scenes:[{scene:dust,target:particles}],yieldControl:async()=>{}});
 assert.deepEqual(compiled,[{target:particles,materials:['dust']},{target:linear,materials:['pass','present']},{target:null,materials:['present']}]);
 assert.equal(current,previous);assert.equal(stats.programs,3);
 assert.deepEqual(sequence,['uniforms:dust','uniforms:pass','uniforms:present']);
 assert.equal(dust.children.length,1,'a borrowed scene keeps its own objects');
});

test('a failing full-screen program rejects so the scene can fall back',async()=>{
 const material=new THREE.ShaderMaterial();
 const renderer={getRenderTarget:()=>null,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,setRenderTarget(){},
  properties:{get:()=>({currentProgram:{diagnostics:{runnable:false},getUniforms(){},getAttributes(){}}})},async compileAsync(){}};
 await assert.rejects(api.prepareFullscreenShaders({renderer,camera:new THREE.PerspectiveCamera(),target:{},materials:[material],yieldControl:async()=>{}}),/Full-screen shader failed/);
});

test('background warmup links only never-linked materials, nearest content first, including hidden branches',async()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),target={name:'scene-HDR'},mirror={name:'mirror'};
 const make=(name,options={})=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshPhysicalMaterial({name,...options}));mesh.name=name;return mesh;};
 const archive=new THREE.Group();archive.name='open-archive';archive.visible=false;scene.add(archive);
 const linked=make('linked'),late=make('starport-hull'),chapter=make('chapter'),glass=make('glass',{transmission:.9});scene.add(linked,late);archive.add(chapter,glass);
 const programs=new Map([[linked.material,new Map([['key',{}]])]]),calls=[];let current=null;
 const thin=material=>Object.assign(material.clone(),{name:material.name+'-thin',transmission:0});
 const renderer={getRenderTarget:()=>current,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,setRenderTarget:value=>{current=value;},
  properties:{get:material=>{const entry={programs:programs.get(material)};entry.currentProgram=entry.programs?{getUniforms(){},getAttributes(){},diagnostics:{runnable:true}}:undefined;return entry;}},
  async compileAsync(proxy,activeCamera,targetScene){
   assert.equal(activeCamera,camera);assert.equal(targetScene,scene);
   calls.push({target:current,names:proxy.children.map(object=>object.material.name)});
   for(const object of proxy.children)programs.set(object.material,new Map([['key',{}]]));
  }};
 const warmup=api.createShaderWarmup({renderer,scene,camera,target,reflection:{target:mirror,materialForCapture:thin},
  rank:object=>object.parent?.name==='open-archive'?0:1,batch:8,yieldControl:async()=>{}});
 await warmup.schedule();
 assert.deepEqual(calls[0],{target,names:['chapter','glass','starport-hull']},'hidden archive content ranks first; linked materials are skipped');
 assert.deepEqual(calls[1],{target:mirror,names:['glass-thin']},'transmissive surfaces also link their mirror variant');
 assert.equal(current,null,'the caller target is restored');assert.equal(warmup.stats.materials,3);
 calls.length=0;await warmup.schedule();assert.equal(calls.length,0,'settled materials are not collected again');
 warmup.reset();programs.clear();await warmup.schedule();assert.equal(calls.length,2,'a restored context links everything again');
});

test('a failing warmup batch settles instead of retrying every interval',async()=>{
 const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));
 let attempts=0;
 const renderer={getRenderTarget:()=>null,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,setRenderTarget(){},properties:{get:()=>({})},
  compileAsync(){attempts++;return Promise.reject(new Error('link failed'));}};
 const warmup=api.createShaderWarmup({renderer,scene,camera:new THREE.PerspectiveCamera(),target:{},yieldControl:async()=>{}});
 await warmup.schedule();await warmup.schedule();
 assert.equal(attempts,1);assert.equal(warmup.stats.failures,1);
});

test('late assets await their link, attach at once without a renderer, and never wait past the bound',async()=>{
 api.setLateAssetCompiler(null);
 assert.equal(await api.compileBeforeReveal(new THREE.Group()),false,'tests and fallbacks attach immediately');
 const order=[];api.setLateAssetCompiler(async root=>{order.push('link:'+root.name);});
 const root=Object.assign(new THREE.Group(),{name:'fleet'});
 assert.equal(await api.compileBeforeReveal(root),true);order.push('attach');
 assert.deepEqual([...order],['link:fleet','attach']);
 api.setLateAssetCompiler(()=>new Promise(()=>{}));
 assert.equal(await api.compileBeforeReveal(root,{timeoutMs:5}),false,'a hung link still lets the asset appear');
 api.setLateAssetCompiler(()=>Promise.reject(new Error('lost context')));
 assert.equal(await api.compileBeforeReveal(root),false,'a failed link attaches and lets the first draw report');
 api.setLateAssetCompiler(null);
});
