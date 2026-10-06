import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeStellarLayout, stellarVolumeRegions } from '../assets/js/immersive-world-layout.js';

test('Blender cloud sea retains its own final GPU slot and physical extinction',()=>{
 const source=JSON.parse(readFileSync(new URL('../assets/models/tem-star-sea-v20.json',import.meta.url),'utf8'));
 const layout=normalizeStellarLayout(source);
 assert.equal(layout.volumeRegions.length,6);
 assert.equal(layout.volumeRegions[5].kind,'cloud-sea');
 assert.equal(layout.volumeRegions[5].density,.008);
 for(const region of layout.volumeRegions){
  const authored=source.volumeRegions.find(item=>item.id===region.id);
  assert.deepEqual(region.center,authored.center);
  assert.deepEqual(region.radius,authored.radius);
  assert.deepEqual(region.flow,authored.flow);
  assert.equal(region.seed,authored.seed);
 }
 assert.ok(Math.abs(Math.hypot(...layout.sunDirection)-1)<1e-12);
 assert.equal(layout.flowCurves.length,source.flowCurves.length);
 assert.equal(layout.flowCurves[0].rate,source.flowCurves[0].rate);
 assert.equal(layout.flowCurves[0].emissionRate,source.flowCurves[0].emissionRate);
});

test('before Blender metadata arrives the same world bounds and density are rendered',()=>{
 const source=JSON.parse(readFileSync(new URL('../assets/models/tem-star-sea-v20.json',import.meta.url),'utf8'));
 const defaults=normalizeStellarLayout(),authored=normalizeStellarLayout(source);
 for(let i=0;i<6;i++)for(const key of ['center','radius','color','density','seed','flow'])assert.deepEqual(defaults.volumeRegions[i][key],authored.volumeRegions[i][key],`${i}: ${key}`);
 assert.equal(stellarVolumeRegions.length,6);
});

test('invalid or oversized metadata cannot create invalid rays or unbounded GPU work',()=>{
 const layout=normalizeStellarLayout({sunDirection:[0,0,0],volumeRegions:Array.from({length:40},(_,i)=>({id:`region ${i}`,radius:[0,-2,Infinity],center:[NaN,0,0],density:Infinity})),flowCurves:[{points:[[1,2,NaN],[0,1,2],[3,4,5],[0,1,2]]}]});
 assert.equal(layout.volumeRegions.length,6);
 assert.equal(layout.flowCurves.length,0);
 for(const region of layout.volumeRegions){assert.ok(region.radius.every(value=>Number.isFinite(value)&&value>=16));assert.ok(region.center.every(Number.isFinite));assert.ok(Number.isFinite(region.density));}
 assert.ok(Math.hypot(...layout.sunDirection)>.99);
 assert.doesNotThrow(()=>normalizeStellarLayout(null));
 assert.doesNotThrow(()=>normalizeStellarLayout({volumeRegions:{},flowCurves:{}}));
});
