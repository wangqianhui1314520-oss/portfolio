import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { stellarDensityGLSL, stellarLightSourceGLSL, stellarProbeGLSL } from '../assets/js/immersive-volume-field.js';

// Execute the actual scalar GLSL expressions with JavaScript math. This checks
// their algebra and finite outputs, not GPU compilation or float precision.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
const mix=(a,b,t)=>a*(1-t)+b*t;
const vector=n=>(...values)=>values.length===1?Array(n).fill(values[0]):values;
function expression(source,name){
 const match=source.match(new RegExp(`float\\s+${name}\\s*=([^;]+);`));
 assert.ok(match,`missing active shader expression ${name}`);return match[1];
}
function block(source,marker){
 const start=source.indexOf('{',source.indexOf(marker));assert.ok(start>=0);
 let depth=1,end=start+1;for(;depth&&end<source.length;end++)depth+=source[end]==='{'?1:source[end]==='}'?-1:0;
 assert.equal(depth,0);return source.slice(start+1,end-1);
}
function randomSource(){let state=27191;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}

test('bounded density rejects exterior shadow samples with finite initialized outputs before noise reads',()=>{
 const body=block(stellarDensityGLSL,'float field('),prefix=body.slice(0,body.indexOf('float t='));
 assert.ok(prefix.includes('return 0.'));assert.ok(!prefix.includes('noise3('));
 const run=new Function('p','dot','max','vec3','vec4',
  `let q=Array(3).fill(NaN),features=Array(4).fill(NaN);const density=(()=>{${prefix.replace(/\bfloat\s+/g,'let ')}})();return {density,q,features};`);
 const points=[[1,0,0],[-1,0,0],[0,1,0],[0,0,-1],[0,0,0],[.999,0,0]];
 const random=randomSource();for(let i=0;i<10000;i++)points.push(Array.from({length:3},()=>random()*6-3));
 let exterior=0;
 for(const p of points){
  const result=run(p,dot,Math.max,vector(3),vector(4));
  if(dot(p,p)>=1){exterior++;assert.equal(result.density,0);assert.deepEqual(result.q,[0,0,0]);assert.deepEqual(result.features,[0,0,0,0]);}
  else assert.equal(result.density,undefined,'interior samples must continue through the full field');
 }
 assert.ok(exterior>9000);
});

test('signed gas and dust distances keep symmetric finite Gaussian density without GLSL pow on a negative base',()=>{
 const formulas=[['dustRift','dustDistance',1],['river','riverDistance',1],['branch','branchDistance',.34]];
 for(const [name,input,peak] of formulas){
  const source=expression(stellarDensityGLSL,name);
  assert.ok(!source.includes('pow('),`${name}: signed GLSL pow is undefined for negative distances`);
  const evaluate=new Function(input,'p','exp','smoothstep',`return ${source};`);
  for(let i=-8000;i<=8000;i++){
   const distance=i/100,value=evaluate(distance,{x:1,z:0},Math.exp,smoothstep);
   const opposite=evaluate(-distance,{x:1,z:0},Math.exp,smoothstep);
   assert.ok(Number.isFinite(value)&&value>=0&&value<=peak);assert.equal(value,opposite);
   assert.ok(Math.abs(value-Math.exp(-distance*distance)*peak)<1e-15);
  }
 }
});

test('stellar emission reuses exactly the density nursery core, including inactive profiles',()=>{
 const densityCore=new Function('nurseryProfile','core','exp','dot',`return ${expression(stellarDensityGLSL,'nursery')};`);
 const emissionCore=new Function('features',`return ${expression(stellarLightSourceGLSL,'heart')};`);
 assert.match(stellarDensityGLSL,/features=vec4\(n\.r,dust,ridge,nursery\)/);
 const random=randomSource();
 for(let i=0;i<10000;i++){
  const core=Array.from({length:3},()=>random()*4-2),weight=[0,.28,.48,.52,1][i%5];
  const nursery=densityCore({w:weight},core,Math.exp,dot);
  const before=Math.exp(-dot(core,core)*10)*weight,after=emissionCore({w:nursery});
  assert.equal(after,before);assert.ok(Number.isFinite(after));
 }
});

test('early cloud-sea lighting return matches the previous final sea color in all three channels',()=>{
 const source=block(stellarLightSourceGLSL,'if(sea>.5)')
  .replace(/\b(?:float|vec3)\s+(\w+)\s*=/g,'let $1=')
  .replace('dot(ray,-lightDirection)','cosine');
 const evaluate=new Function('edge','shadow','cosine','p','vec3','mix','smoothstep','pow','clamp',source);
 const random=randomSource(),low=[.023,.044,.082],high=[.13,.21,.32],warm=[.34,.15,.065];
 for(let i=0;i<10000;i++){
  const edge=.08+random()*.92,shadow=random(),cosine=random()*2-1,y=random()*4-2;
  for(let c=0;c<3;c++){
   const actual=evaluate(edge,shadow,cosine,{y},(...v)=>v[c],mix,smoothstep,Math.pow,clamp);
   const before=mix(low[c],high[c],shadow)*(.66+edge*.22)+warm[c]*shadow*(.08+Math.pow(clamp(cosine,0,1),3)*.20)*smoothstep(-.25,.6,y);
   assert.equal(actual,before);assert.ok(Number.isFinite(actual));
  }
 }
});

test('active and fallback shader Gaussian kernels stay finite on both sides of their animated centers',()=>{
 const kernels=[
  ['cosmos','rippleDistance',1],['film','ghostDistance',1],
  ['environment','waveDistance',1],['environment','packetDistance',1],
  ['light-flow','pulseDistance',1],['light-flow','tailDistance',1],
  ['archive-optical','sweepDistance',1],['archive-optical','passDistance',1],
  ['optical','lineDistance',1],['scene','slashDistance',1],['scene','rimDistance',1],
  ['scene','falloffDistance',2.6],['scene','beamDistance',1],
  ['starport','pulseDistance',250],['starship','sweepDistance',1],['orbital-atlas','scanDistance',1600]
 ];
 for(const [module,distance,coefficient] of kernels){
  const source=readFileSync(new URL(`../assets/js/immersive-${module}.js`,import.meta.url),'utf8');
  const match=source.match(new RegExp(`exp\\(-${distance}\\*${distance}(?:\\*[\\d.]+)?\\)`));
  assert.ok(match,`${module}: missing active Gaussian kernel ${distance}`);
  const evaluate=new Function(distance,'exp',`return ${match[0]};`);
  for(let i=-2000;i<=2000;i++){
   const d=i/1000,actual=evaluate(d,Math.exp),reference=Math.exp(-Math.pow(d,2)*coefficient);
   assert.ok(Number.isFinite(actual)&&actual>=0&&actual<=1,`${module}: non-finite Gaussian at ${d}`);
   assert.equal(actual,evaluate(-d,Math.exp));
   assert.ok(Math.abs(actual-reference)<1e-15,`${module}: Gaussian width changed`);
  }
 }
 // These modules embed GLSL; the similarly named JavaScript Math.pow is valid
 // for negative bases and is deliberately excluded from this shader guard.
 const directory=new URL('../assets/js/',import.meta.url);
 for(const name of readdirSync(directory).filter(name=>/^immersive.*\.js$/.test(name))){
  const source=readFileSync(new URL(name,directory),'utf8');
  assert.doesNotMatch(source,/exp\s*\(\s*-\s*pow\s*\(/,`${name}: unsafe signed Gaussian pow returned`);
 }
});

test('planet weather and night-light culling preserve every occupied contribution',()=>{
 const source=readFileSync(new URL('../assets/js/immersive-procedural-planet.js',import.meta.url),'utf8');
 const weatherGate=new Function('weather','smoothstep',`return ${expression(source,'weatherMask')};`);
 const cityGate=new Function('cityMask','cityNight','pow','planetNoise','landN','uPlanetSeed',`return ${expression(source,'cityCells')};`);
 const weatherBody=block(source,'float cloudField(');
 assert.ok(weatherBody.indexOf('if(weatherMask<=0.)return 0.')<weatherBody.indexOf('planetFbm(p)'));
 const random=randomSource();
 for(let i=0;i<10000;i++){
  const weather=i<4?[.33,.67,.330001,.329999][i]:random(),broad=random(),detail=random();
  const mask=weatherGate(weather,smoothstep),density=smoothstep(.45,.65,broad*.76+detail*.24);
  assert.equal(mask<=0?0:density*mask,density*smoothstep(.33,.67,weather));
  const cityMask=i%4===0?0:random(),cityNight=i%3===0?0:random(),noise=random();let calls=0;
  const actual=cityGate(cityMask,cityNight,Math.pow,()=>{calls++;return noise;},0,0);
  assert.equal(actual*cityMask*cityNight,Math.pow(noise,18)*cityMask*cityNight);
  assert.equal(calls,cityMask>0&&cityNight>0?1:0);
 }
});

test('both volume shaders march each selected lobe from one call site',()=>{
 // D3D's compiler inlined one full march per branch; six copies took about a
 // minute per cold link. Branches may only select a lobe and its parameters.
 const nebula=readFileSync(new URL('../assets/js/immersive-nebula-pass.js',import.meta.url),'utf8');
 // Definitions read `name(vec3 ray,`; only call sites pass the ray as `name(ray,`.
 const calls=(source,name)=>source.split(`${name}(ray,`).length-1;
 assert.equal(calls(nebula,'integrate'),1,'the live nebula integrates from a single call site');
 assert.equal(calls(stellarProbeGLSL,'stellarProbeLayer'),1,'the radiance probe integrates from a single call site');
 for(const source of [block(nebula,'for(int layer=0;layer<6;layer++)'),block(stellarProbeGLSL,'for(int layer=0;layer<6;layer++)')]){
  'abcdef'.split('').forEach((lobe,index)=>assert.ok(source.includes(`span=${lobe};center=uCenters[${index}];radii=uRadii[${index}];tint=uColors[${index}];seed=uSeeds[${index}];extinction=uExtinction[${index}];flowRate=uFlows[${index}];`),`lobe ${lobe} keeps its own parameters`));
  assert.match(source,/sea=1\.;f=vec2\(1e6,-1\.\);/,'only the cloud sea lobe uses the sea profile');
 }
});
