import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {renderProfile} from '../assets/js/immersive-profile.js';

function readGLB(name){
 const bytes=readFileSync(new URL('../assets/models/'+name,import.meta.url));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const length=bytes.readUInt32LE(12),document=JSON.parse(bytes.subarray(20,20+length).toString());
 const binary=bytes.subarray(20+length+8);return {document,binary};
}
test('authored scene exports have finite positions, normals and usable local bounds',()=>{
 for(const name of ['tem-cinematic-deck.glb','tem-cinematic-display.glb','tem-cinematic-starport.glb','tem-cinematic-fleet.glb','tem-observatory-v19.glb']){
  const {document,binary}=readGLB(name);assert.ok(document.meshes.length>0,name);
  for(const mesh of document.meshes)for(const primitive of mesh.primitives)for(const attribute of ['POSITION','NORMAL']){
   const accessor=document.accessors[primitive.attributes[attribute]],view=document.bufferViews[accessor.bufferView];
   assert.equal(accessor.componentType,5126);const start=(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||12;
   for(let i=0;i<accessor.count;i++)for(let j=0;j<3;j++)assert.ok(Number.isFinite(binary.readFloatLE(start+i*stride+j*4)),`${name}/${attribute}/${i}`);
   if(attribute==='POSITION'){assert.ok(accessor.min.every(Number.isFinite));assert.ok(accessor.max.every(Number.isFinite));}
  }
 }
});
test('the deck has one shared semantic root and the four fleet poses have independent roots',()=>{
 const deck=readGLB('tem-cinematic-deck.glb').document;
 assert.equal(deck.nodes.filter(node=>node.name==='WORLD_DECK').length,1);
 const fleet=readGLB('tem-cinematic-fleet.glb').document;
 for(let i=0;i<4;i++)assert.equal(fleet.nodes.filter(node=>node.name==='SHIP_'+i).length,1);
 const port=readGLB('tem-cinematic-starport.glb').document;
 assert.ok(port.materials.some(m=>m.extensions?.KHR_materials_transmission?.transmissionFactor>.8));
});

test('the v19 portrait has separate semantic roots and keeps identity coordinates for its live energy paths',()=>{
 const glb=readGLB('tem-observatory-v19.glb').document;
 for(const name of ['CABIN_V19','T_IDENTITY_V19','SURFACE_FRAME_V19','EXTERIOR_V19'])assert.equal(glb.nodes.filter(n=>n.name===name).length,1,name);
 const identity=glb.nodes.find(n=>n.name==='T_IDENTITY_V19');
 assert.deepEqual(identity.extras.identityCenter,[9.6,6.5,-17]);assert.equal(identity.extras.identityYaw,-.28);
 assert.equal(identity.extras.identityWidth,14.2);assert.equal(identity.extras.identityHeight,15.3);
 assert.equal(glb.nodes.filter(n=>/FLOOR_V19/.test(n.name||'')).length,1,'only one new physical floor');
 assert.ok(glb.materials.some(m=>/GLASS_V19/.test(m.name)&&m.extensions?.KHR_materials_transmission?.transmissionFactor>.8));
 assert.ok(!glb.nodes.some(n=>n.extras?.tem_export===false),'offline volumes and extra planets are not shipped into the browser GLB');
 const meshIndices=new Set();for(const node of glb.nodes)if(node.mesh!==undefined)assert.ok(!meshIndices.has(node.mesh)&&(meshIndices.add(node.mesh),true),'each merged mesh appears once');
});

test('opaque cinematic materials embed real 1K normal and ORM atlases with unscaled roughness',()=>{
 for(const name of ['tem-cinematic-deck.glb','tem-cinematic-display.glb','tem-cinematic-starport.glb','tem-cinematic-fleet.glb']){
  const {document,binary}=readGLB(name);
  const materials=document.materials.filter(m=>/^(PEARL|TITANIUM|DARK|FLOOR)/.test(m.name));
  assert.ok(materials.length>=4,name);
  for(const material of materials){
   const pbr=material.pbrMetallicRoughness;
   assert.equal(pbr.roughnessFactor??1,1,material.name);
   assert.ok(material.normalTexture&&material.occlusionTexture&&pbr.metallicRoughnessTexture,material.name);
   for(const texture of [material.normalTexture,material.occlusionTexture,pbr.metallicRoughnessTexture]){
    const img=document.images[document.textures[texture.index].source],view=document.bufferViews[img.bufferView];
    assert.equal(img.mimeType,'image/png');const start=view.byteOffset||0;
    assert.equal(binary.readUInt32BE(start+16),1024);assert.equal(binary.readUInt32BE(start+20),1024);
   }
  }
 }
});
test('every chapter keeps its content while only one accessible reading surface is active',()=>{
 const scope={window:{}};runInNewContext(readFileSync(new URL('../assets/js/data.js',import.meta.url),'utf8'),scope);
 const data=scope.window.PORTFOLIO_DATA;
 for(const active of ['overview','reading','practice','records']){
  const html=renderProfile(data,active);
  assert.equal((html.match(/id="profilePanel"/g)||[]).length,1);
  assert.equal((html.match(/data-archive-panel=/g)||[]).length,4);
  assert.equal((html.match(/aria-hidden="false"/g)||[]).length,1);
  assert.match(html,new RegExp(`data-archive-panel="${active}" aria-hidden="false"`));
  for(const text of ['CREATOR ARCHIVE','READING /','PRACTICE /','FLIGHT LOG'])assert.ok(html.includes(text));
 }
});
