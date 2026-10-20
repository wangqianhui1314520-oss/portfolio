import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {setImmediate as nextTask} from 'node:timers/promises';
import * as THREE from '../assets/vendor/three-0.161.0/build/three.module.js';
import {archivePose,archiveWelcomePose,createArchiveRail,archiveChapterOrder} from '../assets/js/immersive-archive-path.js';
import {sectors,sectorFor,isProject,transitionDurations} from '../assets/js/immersive-journey.js';
import {cinematicEase} from '../assets/js/immersive-easing.js';

function moduleScope(name,dependencies={}){
 const url=new URL('../assets/js/'+name,import.meta.url);
 const source=readFileSync(url,'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'')
  .replaceAll('import.meta.url',JSON.stringify(url.href));
 const scope={THREE,...dependencies};runInNewContext(source,scope,{filename:name});return scope;
}

// Use the shipped geometry merger and fleet builder. Only the network/GLB
// decoder and browser services are replaced; asset cloning, bounds checks,
// compact deferral, mounting and starport lifecycle execute their real code.
const geometryScope={...THREE};
runInNewContext(readFileSync(new URL('../assets/vendor/three-0.161.0/examples/jsm/utils/BufferGeometryUtils.js',import.meta.url),'utf8')
 .replace(/^import \{[\s\S]*?\} from 'three';/m,'').replace(/^export \{[\s\S]*?\};/m,'').replace(/^export /gm,''),geometryScope);
const {buildDetailedFleet}=moduleScope('immersive-starship-detail.js');
// Instanced parts use the shipped private-material helper.
const {instancedMesh}=moduleScope('immersive-hardware.js',{mergeGeometries:geometryScope.mergeGeometries});

function browserFixture(width=1280){
 const listeners=new Map(),elements=new Map(),events=[];
 const element=id=>{
  if(!elements.has(id))elements.set(id,{dataset:{},style:{},addEventListener(){},hidden:false});
  return elements.get(id);
 };
 const body={dataset:{},classList:{contains:()=>false,add(){},remove(){}}};
 const document={body,getElementById:element,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},
  createElement:()=>({width:0,height:0,getContext:()=>({})})};
 const globals={document,innerWidth:width,innerHeight:720,performance:{now:()=>1000},queueMicrotask,
  Event,CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail;}},
  addEventListener(type,callback){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(callback);},
  removeEventListener(type,callback){listeners.get(type)?.delete(callback);},dispatchEvent(event){events.push(event);}};
 return {globals,document,element,listeners,events,emit(type,event={}){for(const callback of [...listeners.get(type)||[]])callback(event);}};
}

function authoredSource(url){
 const scene=new THREE.Group(),material=new THREE.MeshStandardMaterial({name:'PEARL'});
 const add=name=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);mesh.name=name;scene.add(mesh);};
 if(url.includes('starport'))add('STARPORT');else for(let i=0;i<4;i++)add('SHIP_'+i);
 return {scene,asset:{version:'2.0'},animations:[]};
}

function starportFixture(width,{rejectAsset=()=>false}={}){
 const browser=browserFixture(width),requests=[];
 class GLTFLoader{
  load(url,resolve,_progress,reject){requests.push(url);queueMicrotask(()=>rejectAsset(url)?reject(new Error('offline GLB')):resolve(authoredSource(url)));}
 }
 const assets=moduleScope('immersive-blender-assets.js',{...browser.globals,GLTFLoader,URL});
 const scope=moduleScope('immersive-starport.js',{...browser.globals,loadTemAsset:assets.loadTemAsset,
  mergeGeometries:geometryScope.mergeGeometries,buildDetailedFleet,opticalEnvironment:()=>({}),opticalSkySample:'',
  // No live renderer in these tests: authored models attach without a shader link.
  compileBeforeReveal:async()=>false});
 const parent=new THREE.Group(),colors=[0x99d7ff,0xb5a1f3,0xe8a0c4,0x87d4dd].map(c=>new THREE.Color(c));
 const port=scope.createOpticalStarport({parent,colors,uniforms:{uTime:{value:0},uPower:{value:.45},uResponse:{value:0}}});
 return {...browser,assets,scope,port,parent,requests,resize(nextWidth){assets.innerWidth=scope.innerWidth=nextWidth;browser.emit('resize');}};
}

test('hidden starport construction makes no authored requests; repeated preparation mounts full assets once',async()=>{
 const fixture=starportFixture(1280),{port,requests,element,events}=fixture;
 assert.equal(requests.length,0,'constructing the hidden atlas must not start either GLB');
 await nextTask();assert.equal(requests.length,0,'hidden preparation also stays dormant after startup microtasks');
 assert.equal(port.picking.length,4,'fallback picking remains available before authored assets');
 const first=port.ensureAssets(),second=port.ensureAssets();
 assert.strictEqual(second,first,'all callers share the same preparation promise');
 assert.equal(requests.length,2);
 assert.ok(requests.some(url=>new URL(url).pathname.endsWith('/tem-cinematic-starport.glb')));
 assert.ok(requests.some(url=>new URL(url).pathname.endsWith('/tem-refined-fleet-v21.glb')));
 assert.ok(!requests.some(url=>url.includes('-lod.glb')),'desktop keeps the full geometry');
 await first;
 assert.equal(element('space').dataset.assetStarport,'ready');assert.equal(element('space').dataset.assetFleet,'ready');
 assert.equal(element('space').dataset.fleetV21,'full');
 assert.equal(events.filter(event=>event.type==='tem:scene-depth-change').length,2);
 assert.strictEqual(port.ensureAssets(),first);assert.equal(requests.length,2,'settled preparation also remains singleflight');
 port.update(1/60,1,true,2,-1,.5);
 const fleet=port.root.children.find(root=>root.children.some(child=>child.name==='SHIP_0'));
 assert.ok(fleet,'the authored fleet is mounted by the real load callback');
 for(let i=0;i<4;i++)assert.deepEqual(fleet.getObjectByName('SHIP_'+i).matrix.elements,port.picking[i].matrix.elements);
 assert.equal(requests.length,2,'the defensive update path does not restart asset loads');
});

test('compact preparation mounts the fleet LOD while the desktop-only platform waits for resize',async()=>{
 const fixture=starportFixture(390),{port,requests,element}=fixture;
 assert.equal(requests.length,0);
 const preparation=port.ensureAssets();let settled=false;preparation.then(()=>{settled=true;});
 assert.strictEqual(port.ensureAssets(),preparation);
 await nextTask();
 assert.equal(requests.length,1,'the deferred platform must not serialize the independent fleet load');
 assert.ok(new URL(requests[0]).pathname.endsWith('/tem-refined-fleet-v21-lod.glb'));
 assert.equal(element('space').dataset.assetStarport,'deferred-compact');
 assert.equal(element('space').dataset.assetFleetLod,'ready');assert.equal(element('space').dataset.fleetV21,'lod');
 assert.equal(settled,false,'preparation still records the platform pending desktop availability');
 assert.ok(port.root.children.some(root=>root.children.some(child=>child.name==='SHIP_0')));
 fixture.resize(1280);await preparation;
 assert.equal(requests.length,2);assert.equal(element('space').dataset.assetStarport,'ready');
 fixture.resize(1440);assert.strictEqual(port.ensureAssets(),preparation);assert.equal(requests.length,2);
});

test('failed authored loads preserve procedural rendering and never retry on each active frame',async()=>{
 for(const failPlatform of [true,false]){
  const fixture=starportFixture(1280,{rejectAsset:url=>failPlatform||url.includes('fleet')}),{port,requests,element,events}=fixture;
  const procedural=port.root.children.filter(object=>object.isMesh&&object.material.uniforms?.uAuthoredPlatform);
  assert.ok(procedural.length>0);
  const preparation=port.ensureAssets(),result=await preparation;
  assert.equal(result[1],null,'a failed fleet remains an explicit failed result');
  assert.equal(element('space').dataset.assetFleet,'fallback');
  assert.equal(element('space').dataset.assetStarport,failPlatform?'fallback':'ready');
  const mounted=port.root.children.length;
  for(let i=0;i<90;i++)port.update(1/60,i/60,true,0,-1,.45);
  assert.strictEqual(port.ensureAssets(),preparation);assert.equal(requests.length,2,'active updates do not create a retry storm');
  assert.equal(port.root.children.length,mounted);
  assert.ok(procedural.every(object=>object.visible),'procedural batches remain available when either authored half is missing');
  assert.ok(procedural.every(object=>object.material.uniforms.uAuthoredFleet.value===0));
  assert.ok(procedural.every(object=>object.material.uniforms.uAuthoredPlatform.value===(failPlatform?0:1)));
  assert.equal(events.filter(event=>event.type==='tem:scene-depth-change').length,failPlatform?0:1,'only a successful mount invalidates scene depth');
  assert.equal(port.picking.length,4);assert.ok(port.picking.every(object=>object.geometry.attributes.position.count>0));
 }
});

function spatialFixture(initial='bridge'){
 const browser=browserFixture(),subscriptions=[],yards=[],escorts=[],atlasCalls={ensure:0,updates:[]};
 const data={works:[{id:'one',title:'One',type:'游戏',sector:'forge'}]};
 const journey={state:{step:initial,sector:null,work:null},hasScanned:()=>true},labels=[];
 browser.document.querySelectorAll=selector=>selector==='[data-world-anchor]'?labels:[];
 let now=1000;browser.globals.performance.now=()=>now;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(52,1280/720,.1,5000);
 camera.position.set(0,2,25);camera.lookAt(0,0,-20);camera.updateMatrixWorld();
 let sceneUpdates=0;const updateScene=scene.updateMatrixWorld;
 scene.updateMatrixWorld=function(...args){sceneUpdates++;return updateScene.apply(this,args);};
 const env=()=>({reset(){},pointer(){},setTarget(){},probe(){},update:()=>({response:0,pulseCount:0})});
 const scope=moduleScope('immersive-spatial.js',{...browser.globals,window:{PORTFOLIO_DATA:data},journey,sectors,sectorFor,isProject,
  subscribe:callback=>subscriptions.push(callback),navigate(){},archivePose,archiveRail:createArchiveRail(),
  createEnvironmentResponse:env,opticalFilm:()=>new THREE.MeshBasicMaterial(),crystalMaterial:()=>new THREE.MeshBasicMaterial(),
  bevelGeometry:()=>new THREE.BoxGeometry(),instancedMesh,projectWorldSurface:()=>true,compileBeforeReveal:async()=>false,hasLateAssetCompiler:()=>false,placeLock(){},
  createOrbitalDockyard(){
   const root=new THREE.Group(),occluder=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());root.add(occluder);
   const yard={root,occluder,updates:0,update(){this.updates++;}};yards.push(yard);return yard;
  },
  createEscortCraft(){const group=new THREE.Group();escorts.push(group);return group;},
  createOrbitalAtlas({parent}){
   atlasCalls.parent=parent;
   return {layout(){},positions:()=>sectors.map((_,i)=>[i*8-12,5,-20]),pickObjects:()=>[],opticalAnchor(){},
    ensureAssets(){atlasCalls.ensure++;return Promise.resolve();},update(...args){atlasCalls.updates.push(args);}};
  },
  createProjectStarship(){
   const assembly=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()),cover=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial()),light=new THREE.PointLight();
   assembly.add(body,cover,light);return {assembly,body,cover,light,port:new THREE.Group(),beacon:new THREE.Group(),update(){}};
  }});
 const world=scope.createSpatialWorld({scene,camera});
 return {...browser,world,scene,camera,journey,labels,yards,escorts,atlasCalls,get sceneUpdates(){return sceneUpdates;},
  state(step,sector=null){journey.state={step,sector,work:null};for(const callback of subscriptions)callback();},
  update(time,shot={progress:1}){now+=50;world.update(1/60,time,1,shot);}};
}

test('creator views skip hidden map/home animation and scene traversal, while map intent prepares immediately',()=>{
 const fixture=spatialFixture(),{yards,escorts,atlasCalls}=fixture;
 const proxies=atlasCalls.parent.children.filter(object=>object.userData.sector),initial=proxies.map(object=>object.rotation.y);
 fixture.update(1);fixture.state('captain');fixture.update(2);
 assert.equal(fixture.sceneUpdates,0,'bridge and captain do not duplicate renderer scene traversal');
 assert.equal(atlasCalls.ensure,0,'creator views do not request hidden authored map assets');
 assert.equal(yards[0].updates,0);assert.ok(escorts.every(group=>group.position.length()===0));
 assert.deepEqual(proxies.map(object=>object.rotation.y),initial);
 fixture.state('boot');assert.equal(atlasCalls.ensure,1,'preparation starts with navigation intent, before the first boot frame');
 fixture.update(3);assert.equal(atlasCalls.parent.visible,true);assert.notDeepEqual(proxies.map(object=>object.rotation.y),initial);
 fixture.state('travel','forge');fixture.update(4,{progress:.1});
 assert.equal(atlasCalls.parent.visible,true,'the departing atlas remains visible for its existing shot');
 assert.ok(yards[0].updates>0);assert.ok(escorts.some(group=>group.position.length()>0));
 const direct=spatialFixture('map');assert.equal(direct.atlasCalls.ensure,1,'direct map initialization prepares without another state event');
});

function composedWorldMatrix(object){
 const chain=[];for(let node=object;node;node=node.parent)chain.unshift(node);
 const expected=new THREE.Matrix4(),local=new THREE.Matrix4();
 for(const node of chain)expected.multiply(local.compose(node.position,node.quaternion,node.scale));
 return expected;
}

test('active signal labels see fresh occluder matrices after their animation updates',()=>{
 const fixture=spatialFixture();fixture.labels.push({dataset:{worldAnchor:'one'},style:{},inert:false});
 fixture.state('signals','forge');const occluder=fixture.yards[1].occluder;let rays=0;
 occluder.raycast=function(){
  rays++;const expected=composedWorldMatrix(this);
  for(let i=0;i<16;i++)assert.ok(Math.abs(this.matrixWorld.elements[i]-expected.elements[i])<1e-9,'label occlusion uses this frame’s transforms');
 };
 fixture.update(1);assert.equal(fixture.sceneUpdates,1);assert.ok(rays>0);
 occluder.position.set(11,-3,7);fixture.update(2);
 assert.equal(fixture.sceneUpdates,2);assert.ok(rays>1,'each due label pass receives fresh animated occluders');
 fixture.state('captain');fixture.update(3);assert.equal(fixture.sceneUpdates,2,'leaving label views stops the extra traversal');
});

test('navigation recomputes the real projection only for the initial frame or changed FOV/aspect',()=>{
 const browser=browserFixture(),subscriptions=[],journey={state:{step:'bridge',sector:null,work:null}},rail=createArchiveRail();
 const camera=new THREE.PerspectiveCamera(54,1280/720,.1,5000);let projections=0;
 const updateProjection=camera.updateProjectionMatrix;camera.updateProjectionMatrix=function(){projections++;return updateProjection.call(this);};
 const scope=moduleScope('immersive-navigation.js',{...browser.globals,journey,subscribe:callback=>subscriptions.push(callback),getRevision:()=>1,
  transitionDurations,archivePose,archiveWelcomePose,archiveRail:rail,archiveChapterOrder,cinematicEase,
  opening:{active:false,frame:{route:1,fov:52,time:14}},updateOpening:()=>1,
  createSpatialWorld:()=>({pose:()=>({position:new THREE.Vector3(0,2,25),look:new THREE.Vector3(0,0,-20),fov:52.5}),update(){},layout(){},opticalAnchor(){}})});
 const navigation=scope.createNavigation({scene:new THREE.Scene(),camera}),pointer={x:0,y:0};
 navigation.update(1/60,pointer,0,0);assert.equal(projections,1);
 for(let i=0;i<20;i++)navigation.update(1/60,pointer,i/60,0);
 assert.equal(projections,1,'a steady shot reuses its projection');
 camera.aspect=1.25;navigation.update(1/60,pointer,1,0);assert.equal(projections,2);
 journey.state={step:'map',sector:null,work:null};for(const callback of subscriptions)callback();
 navigation.update(1/60,pointer,2,0);assert.equal(projections,3,'a discrete lens change still updates immediately');
 const expected=new THREE.PerspectiveCamera(camera.fov,camera.aspect,camera.near,camera.far);
 assert.deepEqual(camera.projectionMatrix.elements,expected.projectionMatrix.elements);
 navigation.update(1/60,pointer,3,0);assert.equal(projections,3);
});
