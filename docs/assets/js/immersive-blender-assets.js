import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';

const assets=Object.freeze({identity:'tem-identity.glb',observatory:'tem-observatory.glb',observatoryV19:'tem-refined-observatory-v21.glb',observatoryV19Lod:'tem-refined-observatory-v21-lod.glb',starSea:'tem-star-sea-v20.glb',starSeaLod:'tem-star-sea-v20-lod.glb',deck:'tem-cinematic-deck.glb',display:'tem-cinematic-display.glb',starport:'tem-cinematic-starport.glb',fleet:'tem-refined-fleet-v21.glb',fleetLod:'tem-refined-fleet-v21-lod.glb'});
const sourceCache=new Map(),loader=new GLTFLoader();
const mapKeys=['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap','transmissionMap','thicknessMap','specularIntensityMap','specularColorMap','iridescenceMap','iridescenceThicknessMap'];
const revealBindings=new WeakMap(),revealDepthByRoot=new WeakMap();

function sourceURL(name){
 if(!assets[name])throw new Error(`Unknown Tem model: ${name}`);
 const url=new URL(`../models/${assets[name]}`,import.meta.url),version=new URL(import.meta.url).searchParams.get('v');
 if(version)url.searchParams.set('v',version);
 return url.href;
}

function privateClone(source){
 // These authored Blender models have no skeletons. Geometry and baked texture
 // pixels are immutable shared resources; every instance has private materials.
 const root=source.clone(true),materials=new Map();
 root.traverse(node=>{
  if(!node.isMesh)return;
  const clone=material=>{
   if(!materials.has(material))materials.set(material,material.clone());
   return materials.get(material);
  };
  node.material=Array.isArray(node.material)?node.material.map(clone):clone(node.material);
 });
 return root;
}

export function preparePBR(root,{environment,anisotropy=4,floorResponse=1}={}){
 const prepared=new Set(),textures=new Set(),filter=Math.max(1,Math.min(4,Number.isFinite(anisotropy)?anisotropy:4));
 root.traverse(node=>{
  // The host world's light rig supplies illumination, including any imported
  // camera/lighting data accidentally included with the model export.
  if(node.isLight){node.visible=false;return;}
  if(!node.isMesh)return;
  const list=Array.isArray(node.material)?node.material:[node.material];
  let glass=false,emissive=false,floor=false;
  list.forEach(material=>{
   const semantic=`${node.name} ${material.name}`.toLowerCase();
   const isGlass=material.transmission>0||material.transparent||/glass/.test(semantic);
   const isEmission=/emission|emissive|\bled\b/.test(semantic)||Boolean(material.emissiveMap)||(material.emissive&&Math.max(material.emissive.r,material.emissive.g,material.emissive.b)>.002);
   const isFloor=/floor/.test(semantic);
   glass||=isGlass;emissive||=isEmission;floor||=isFloor;
   if(prepared.has(material))return;prepared.add(material);
   // GLTFLoader already assigns correct colour spaces and UV channels. Leave
   // all baked normal, roughness, metalness, AO and emission maps in place.
   mapKeys.forEach(key=>{
    const texture=material[key];if(!texture||textures.has(texture))return;textures.add(texture);
    if(texture.anisotropy!==filter){texture.anisotropy=filter;texture.needsUpdate=true;}
   });
   if(material.isMeshStandardMaterial||material.isMeshPhysicalMaterial){
    if(environment)material.envMap=environment;
    // The geometric bake is retained; its deepest pockets still receive a
    // small ambient fill rather than a completely black multiplicative cut.
    if(material.aoMap)material.aoMapIntensity=Math.min(material.aoMapIntensity,.72);
    const metal=material.metalness>.55||/titanium/.test(semantic);
    material.envMapIntensity=isGlass?.68:metal?.62:isFloor?.42*Math.max(0,Math.min(1,floorResponse)):.54;
    if(isEmission)material.emissiveIntensity=Math.min(material.emissiveIntensity??1,/warm|amber/.test(semantic)?1.0:1.2);
   }
   if(isGlass){
    // r161 has a full-resolution transmission capture with no public scale.
    // Closed glass uses FrontSide, avoiding its additional DoubleSide capture.
    // Keeping depth unwritten allows the separately rendered inner 3D medium.
    material.side=THREE.FrontSide;material.depthWrite=false;
   }
   material.needsUpdate=true;
  });
  node.castShadow=!glass&&!emissive&&!floor;
  node.receiveShadow=!glass&&!emissive;
  node.userData.temAssetSurface=glass?'glass':floor?'floor':emissive?'emission':'hardware';
 });
 return root;
}

export function cloneTemModel(source,options){return preparePBR(privateClone(source),options);}

// Audit the actual mounted materials after onLoad, rather than merely checking
// whether the GLB JSON mentioned textures. No map, factor or UV is rewritten.
export function assetTextureStats(root){
 const seen=new Set(),stats={normal:0,roughness:0,metalness:0,ao:0};
 root.traverse(node=>{
  if(!node.isMesh)return;
  for(const material of Array.isArray(node.material)?node.material:[node.material]){
   if(seen.has(material))continue;seen.add(material);
   for(const name of Object.keys(stats))if(material[name==='ao'?'aoMap':name+'Map'])stats[name]++;
  }
 });
 return stats;
}

const arrivalFragment=`
 if(uTemAssetReveal<.999){
  if(uTemAssetReveal<=0.)discard;
  vec2 temRevealCell=floor(gl_FragCoord.xy*.5);
  float temRevealNoise=fract(sin(dot(temRevealCell,vec2(12.9898,78.233)))*43758.5453);
  float temRevealCoverage=uTemAssetComplement>.5?1.-temRevealNoise:temRevealNoise;
  if(temRevealCoverage>=clamp(uTemAssetReveal,0.,1.))discard;
 }
`;

function bindReveal(material,revealUniform,complement=false){
 const existing=revealBindings.get(material);
 if(existing){existing.uniform=revealUniform;existing.complement.value=complement?1:0;if(existing.shader)existing.shader.uniforms.uTemAssetReveal=revealUniform;return;}
 const previousCompile=material.onBeforeCompile,previousKey=material.customProgramCacheKey.call(material);
 const binding={uniform:revealUniform,complement:{value:complement?1:0},shader:null};revealBindings.set(material,binding);
 material.onBeforeCompile=function(shader,renderer){
  // Keep GLTF/material extensions intact before adding the common visibility.
  previousCompile.call(this,shader,renderer);
  shader.uniforms.uTemAssetReveal=binding.uniform;shader.uniforms.uTemAssetComplement=binding.complement;binding.shader=shader;
  shader.fragmentShader=`uniform float uTemAssetReveal,uTemAssetComplement;\n${shader.fragmentShader}`.replace(
   '#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\n${arrivalFragment}`);
 };
 material.customProgramCacheKey=()=>`${previousKey}|tem-asset-arrival-v2`;
 material.needsUpdate=true;
}

// Stable 2px coverage fades the real geometry and its depth-shadow caster with
// the same arrival uniform. Completed models bypass the dither entirely.
export function prepareReveal(root,revealUniform,{complement=false}={}){
 if(!revealUniform||!Number.isFinite(revealUniform.value))throw new Error('Tem arrival requires a finite shared reveal uniform.');
 let depth=revealDepthByRoot.get(root);
 root.traverse(node=>{
  if(!node.isMesh)return;
  for(const material of Array.isArray(node.material)?node.material:[node.material])bindReveal(material,revealUniform,complement);
  if(!node.castShadow)return;
  if(node.customDepthMaterial&&node.customDepthMaterial!==depth){bindReveal(node.customDepthMaterial,revealUniform,complement);return;}
  if(!depth){depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});depth.name='Tem.asset.arrival-depth';revealDepthByRoot.set(root,depth);}
  bindReveal(depth,revealUniform,complement);node.customDepthMaterial=depth;
 });
 return root;
}

function payload(gltf,url,options){
 const root=cloneTemModel(gltf.scene,options),nodes=new Map(),meshes=new Map(),materials=new Map(),meshesByMaterial=new Map(),nodesByName=new Map();
 let triangleCount=0,meshCount=0;
 root.updateWorldMatrix(true,true);
 root.traverse(node=>{
  if(node.name){
   if(!nodes.has(node.name))nodes.set(node.name,node);
   if(!nodesByName.has(node.name))nodesByName.set(node.name,[]);nodesByName.get(node.name).push(node);
  }
  if(!node.isMesh)return;meshCount++;if(node.name&&!meshes.has(node.name))meshes.set(node.name,node);
  triangleCount+=(node.geometry.index?.count||node.geometry.attributes.position?.count||0)/3*(node.isInstancedMesh?node.count:1);
  for(const material of Array.isArray(node.material)?node.material:[node.material]){
   if(!material.name)continue;
   if(!materials.has(material.name))materials.set(material.name,material);
   if(!meshesByMaterial.has(material.name))meshesByMaterial.set(material.name,[]);
   const group=meshesByMaterial.get(material.name);if(!group.includes(node))group.push(node);
  }
 });
 const bounds=new THREE.Box3().setFromObject(root,true);
 if(bounds.isEmpty()||![...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite))throw new Error('Tem model has no finite bounds.');
 const lookup=new Map([...nodes.entries()].map(([name,node])=>[name.toLowerCase(),node]));
 // Authored coordinates remain unchanged: Y-up, no recentering or autoscaling.
 return {root,nodes,nodesByName,meshes,materials,meshesByMaterial,bounds,size:bounds.getSize(new THREE.Vector3()),center:bounds.getCenter(new THREE.Vector3()),
  sourceURL:url,triangleCount,meshCount,asset:gltf.asset,animations:gltf.animations||[],
  find(name){return nodes.get(name)||lookup.get(name.toLowerCase())||null;},
  clone(nextOptions=options){return payload(gltf,url,nextOptions);}};
}

function cachedSource(url){
 if(!sourceCache.has(url))sourceCache.set(url,new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject)));
 return sourceCache.get(url);
}

// Failure returns null and keeps the current procedural world intact. The
// caller mounts a complete model first, then decides whether to hide its fallback.
export async function loadTemAsset({name,onLoad,onError,canvas,environment,anisotropy=4,floorResponse=1,desktopOnly=false}){
 const key='asset'+name[0].toUpperCase()+name.slice(1);
 if(desktopOnly&&innerWidth<701){
  if(canvas)canvas.dataset[key]='deferred-compact';
  return new Promise(resolve=>{
   const resize=()=>{if(innerWidth<701)return;removeEventListener('resize',resize);resolve(loadTemAsset({name,onLoad,onError,canvas,environment,anisotropy,floorResponse}));};
   addEventListener('resize',resize,{passive:true});
  });
 }
 if(canvas)canvas.dataset[key]='loading';
 try{
  const url=sourceURL(name),gltf=await cachedSource(url),model=payload(gltf,url,{environment,anisotropy,floorResponse});
  if(onLoad)await onLoad(model);
  model.textureStats=assetTextureStats(model.root);
  if(canvas){canvas.dataset[key]='ready';canvas.dataset[`${key}Meshes`]=String(model.meshCount);canvas.dataset[`${key}Triangles`]=String(Math.round(model.triangleCount));canvas.dataset[`${key}BakedMaps`]=JSON.stringify(model.textureStats);}
  return model;
 }catch(error){
  if(canvas)canvas.dataset[key]='fallback';
  if(onError)onError(error);
  return null;
 }
}
