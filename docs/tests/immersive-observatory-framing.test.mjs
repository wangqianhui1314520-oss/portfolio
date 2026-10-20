import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from '../assets/vendor/three-0.161.0/build/three.module.js';
import {archiveFraming,archivePose,archiveWelcomePose,createArchiveRail,archiveChapterOrder} from '../assets/js/immersive-archive-path.js';
import {cinematicEase} from '../assets/js/immersive-easing.js';

function positions(filename,rootName){
 const bytes=readFileSync(new URL('../assets/models/'+filename,import.meta.url)),length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length)),binary=bytes.subarray(28+length),points=[];
 const root=doc.nodes.findIndex(node=>node.name===rootName);assert.ok(root>=0,rootName);
 function walk(index,parent){
  const node=doc.nodes[index],matrix=new THREE.Matrix4();
  if(node.matrix)matrix.fromArray(node.matrix);
  else matrix.compose(new THREE.Vector3(...(node.translation||[0,0,0])),new THREE.Quaternion(...(node.rotation||[0,0,0,1])),new THREE.Vector3(...(node.scale||[1,1,1])));
  matrix.premultiply(parent);
  if(node.mesh!==undefined)for(const primitive of doc.meshes[node.mesh].primitives){
   const accessor=doc.accessors[primitive.attributes.POSITION],view=doc.bufferViews[accessor.bufferView];assert.equal(accessor.componentType,5126);
   const start=(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||12;
   for(let i=0;i<accessor.count;i++){const offset=start+i*stride;points.push(new THREE.Vector3(binary.readFloatLE(offset),binary.readFloatLE(offset+4),binary.readFloatLE(offset+8)).applyMatrix4(matrix));}
  }
  for(const child of node.children||[])walk(child,matrix);
 }
 walk(root,new THREE.Matrix4());return points;
}
function cameraFor(pose,aspect){const camera=new THREE.PerspectiveCamera(pose.fov,aspect,.1,24000);camera.position.fromArray(pose.position);camera.lookAt(...pose.look);camera.updateMatrixWorld();return camera;}

test('full and LOD pressure glass and crystal fit together at narrow desktop ratios',()=>{
 for(const filename of ['tem-refined-observatory-v21.glb','tem-refined-observatory-v21-lod.glb']){
  const subjects=['SURFACE_FRAME_V19','T_IDENTITY_V19'].map(name=>[name,positions(filename,name)]);
  for(const aspect of [16/9,16/10,4/3,742/674,.9])for(const pose of [archivePose(0,false,aspect),archiveWelcomePose(false,aspect)]){
   const camera=cameraFor(pose,aspect);
   for(const [name,points] of subjects)for(const point of points){
    const projected=point.clone().project(camera);
    assert.ok(Math.abs(projected.x)<=.97,`${filename} ${name} aspect ${aspect}: x=${projected.x}`);
    assert.ok(projected.z>0&&projected.z<1,'geometry remains in front of the camera');
   }
  }
 }
 // Control: the previous uncorrected desktop lens really did crop this asset.
 const aspect=742/674,pose=archivePose(0,false,aspect);pose.fov=49;
 assert.ok(positions('tem-refined-observatory-v21.glb','T_IDENTITY_V19').some(point=>point.clone().project(cameraFor(pose,aspect)).x>1));
});

test('framing preserves wide and compact authored lenses and compensates screen text magnification',()=>{
 assert.deepEqual(archiveFraming(false,16/9),{fov:49,shift:0,typeScale:1});
 for(let chapter=0;chapter<4;chapter++){
  assert.ok(Math.abs(archivePose(chapter,false,16/9).fov-[49,47.8,50,48.5][chapter])<1e-12);
  assert.equal(archivePose(chapter,true,390/844).fov,55);
 }
 for(const aspect of [.9,742/674,4/3,1.6,16/9]){
  const framing=archiveFraming(false,aspect);
  const apparentScale=framing.typeScale*Math.tan(49*Math.PI/360)/Math.tan(framing.fov*Math.PI/360);
  assert.ok(Math.abs(apparentScale-1)<1e-12,'wider lens retains the content’s apparent text size');
 }
 assert.deepEqual(archiveWelcomePose(true,390/844),archivePose(0,true,390/844));
});

test('the running navigation retains the narrow desktop lens instead of overriding it',()=>{
 const source=readFileSync(new URL('../assets/js/immersive-navigation.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,''),elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{dataset:{},hidden:false,addEventListener(){}});return elements.get(id);};
 const body={dataset:{archiveChapter:'overview'},classList:{add(){},remove(){}}},archiveRail=createArchiveRail();
 const scope={THREE,archivePose,archiveWelcomePose,archiveRail,archiveChapterOrder,cinematicEase,
  journey:{state:{step:'captain'}},subscribe(){},getRevision:()=>1,transitionDurations:{},opening:{active:false,frame:{route:1,fov:52,time:14}},updateOpening:()=>1,
  document:{body,getElementById:element,querySelectorAll:()=>[]},innerWidth:742,innerHeight:674,performance:{now:()=>1000},
  addEventListener(){},dispatchEvent(){},CustomEvent:class{},queueMicrotask,
  createSpatialWorld:()=>({pose:()=>({position:new THREE.Vector3(),look:new THREE.Vector3(0,0,-1),fov:49}),update(){},layout(){},opticalAnchor(){}})};
 runInNewContext(source,scope);
 const camera=new THREE.PerspectiveCamera(49,742/674,.1,24000),navigation=scope.createNavigation({scene:new THREE.Scene(),camera});
 for(let i=0;i<300;i++)navigation.update(1/60,{x:0,y:0},i/60,1);
 assert.ok(Math.abs(camera.fov-archivePose(0,false,742/674).fov)<1e-8);
});
