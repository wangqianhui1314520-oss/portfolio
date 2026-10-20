import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stellarDensityGLSL,stellarNoiseGLSL,stellarProbeGLSL} from '../assets/js/immersive-volume-field.js';

function block(source,marker){
 const start=source.indexOf('{',source.indexOf(marker));assert.ok(start>=0);
 let depth=1,end=start+1;for(;depth&&end<source.length;end++)depth+=source[end]==='{'?1:source[end]==='}'?-1:0;
 assert.equal(depth,0);return source.slice(start+1,end-1);
}
const sea=block(stellarDensityGLSL,'if(sea>.5)'),expression=name=>{
 const match=sea.match(new RegExp(`float\\s+${name}\\s*=([^;]+);`));assert.ok(match,name);return match[1];
};
const densityExpression=sea.match(/return (smoothstep\([^;]+);/)[1];
const undersideGuard=sea.match(/if\((underside[^)]+)\)/)[1],roofGuard=sea.match(/if\((roof[^)]+)\)/)[1];
const skipUnderside=new Function('underside',`return ${undersideGuard};`),skipRoof=new Function('roof',`return ${roofGuard};`);

// Evaluate scalar arithmetic from the actual GLSL, including rounding each
// operation to float32. This covers roof cancellation and the adjacent float
// values at both smoothstep boundaries without substituting a new density.
function scalar(expression,round){
 const tokens=expression.match(/(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?|[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*|[()+\-*/,]/g);let index=0;
 const functions={sqrt:x=>round(Math.sqrt(x)),smoothstep:(lo,hi,x)=>{
  const t=Math.min(1,Math.max(0,round(round(x-lo)/round(hi-lo))));return round(round(t*t)*round(3-round(2*t)));
 }};
 function primary(){
  const token=tokens[index++];
  if(token==='-'||token==='+'){const value=primary();return values=>round((token==='-'?-1:1)*value(values));}
  if(token==='('){const value=parse(0);assert.equal(tokens[index++],')');return value;}
  if(/^[\d.]/.test(token)){const number=round(Number(token));return ()=>number;}
  if(tokens[index]==='('){
   index++;const args=[];if(tokens[index]!==')')do{args.push(parse(0));}while(tokens[index]===','&&++index);
   assert.equal(tokens[index++],')');assert.ok(functions[token],token);return values=>functions[token](...args.map(arg=>arg(values)));
  }
  const path=token.split('.');return values=>round(path.reduce((value,key)=>value[key],values));
 }
 function parse(minimum){
  let left=primary();
  for(;;){
   const operator=tokens[index],precedence=operator==='+'||operator==='-'?1:operator==='*'||operator==='/'?2:-1;
   if(precedence<minimum)break;index++;const a=left,b=parse(precedence+1);
   left=values=>{const x=a(values),y=b(values);return round(operator==='+'?x+y:operator==='-'?x-y:operator==='*'?x*y:x/y);};
  }
  return left;
 }
 const evaluate=parse(0);assert.equal(index,tokens.length,expression);return evaluate;
}
function evaluators(round){return Object.fromEntries(['underside','height','roof','billow'].map(name=>[name,scalar(expression(name),round)]).concat([['density',scalar(densityExpression,round)]]));}
function sample(inputs,evaluate){
 const values={...inputs};values.underside=evaluate.underside(values);values.height=evaluate.height(values);values.roof=evaluate.roof(values);values.billow=evaluate.billow(values);
 const original=evaluate.density(values),readsPerNoise=(stellarNoiseGLSL.match(/texture2D\(/g)||[]).length;
 const bottom=skipUnderside(values.underside),roof=!bottom&&skipRoof(values.roof);
 return {values,original,optimized:bottom||roof?0:original,reads:(bottom?0:roof?2:3)*readsPerNoise,bottom,roof};
}
function randomSource(){let state=7719;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
function adjacent(value,up){
 const floats=new Float32Array([value]),bits=new Uint32Array(floats.buffer);bits[0]+=(value>=0)===up?1:-1;return floats[0];
}

test('zero cloud-sea margins skip only exact zero factors, including adjacent float32 roof and underside boundaries',()=>{
 for(const round of [value=>value,Math.fround]){
  const evaluate=evaluators(round),cases=[];
  for(const y of [-.95,-.57])for(const py of [adjacent(y,false),round(y),adjacent(y,true)])cases.push({p:{y:py},coarse:{r:.8,g:.5,b:.5},detail:{g:.8},boundary:.2});
  for(const b of [0,.17,.5,.86,1]){
   const height=evaluate.height({coarse:{b}}),ceiling=round(height+round(.48));
   for(const y of [adjacent(ceiling,false),ceiling,adjacent(ceiling,true),ceiling-.0001,ceiling+.0001])cases.push({p:{y},coarse:{r:.8,g:.5,b},detail:{g:.8},boundary:.2});
  }
  const random=randomSource();for(let i=0;i<20000;i++)cases.push({p:{y:random()*1.98-.99},coarse:{r:random(),g:random(),b:random()},detail:{g:random()},boundary:.01+random()*.99});
  let emptyBottom=0,emptyRoof=0,occupied=0;
  for(const input of cases){
   const result=sample(input,evaluate);assert.ok(Number.isFinite(result.original));assert.ok(Number.isFinite(result.optimized));
   assert.ok(result.optimized===result.original,`density changed at ${JSON.stringify(input)}`);
   if(result.bottom){emptyBottom++;assert.equal(result.values.underside,0);assert.equal(result.reads,0);}
   else if(result.roof){emptyRoof++;assert.equal(result.values.roof,0);assert.equal(result.reads,4);}
   else{assert.equal(result.reads,6);if(result.original>0)occupied++;}
  }
  assert.ok(emptyBottom>100);assert.ok(emptyRoof>1000);assert.ok(occupied>1000);
 }
});

test('every nonzero roof and underside retains all three original 3D noise frequencies and initialized live features',()=>{
 const firstNoise=sea.indexOf('noise3('),coarse=sea.indexOf('vec3 coarse=noise3(q)'),detail=sea.indexOf('vec3 detail=noise3(q*2.17+advect*.7)');
 assert.ok(sea.indexOf(`if(${undersideGuard})`)<firstNoise);
 assert.ok(coarse<sea.indexOf(`if(${roofGuard})`)&&sea.indexOf(`if(${roofGuard})`)<detail);
 assert.match(block(sea,`if(${undersideGuard})`),/q=vec3\(0\.\);features=vec4\(0\.\);return 0\.;/);
 assert.match(block(sea,`if(${roofGuard})`),/features=vec4\(0\.\);return 0\.;/);
 assert.match(sea,/q=vec3\(p\.x\*\.88,p\.y\*\.65,p\.z\*\.92\)\+advect/);
 assert.match(sea,/macro=noise3\(q\*\.68\+vec3\(\.23,\.17,\.42\)\)/);
 assert.match(sea,/q\+=\(macro-\.5\)\*vec3\(\.26,\.31,\.24\)/);
 assert.match(sea,/features=vec4\(coarse\.r,coarse\.g,detail\.g,0\.\)/);
 assert.equal((sea.match(/noise3\(/g)||[]).length,3);
 // Do not turn an epsilon, density threshold or approximate roof bound into
 // a culling rule; tiny positive multipliers still follow the full path.
 assert.equal(undersideGuard,'underside==0.');assert.equal(roofGuard,'roof==0.');
 for(const tiny of [Number.MIN_VALUE,1e-30,1e-12,.000001]){assert.equal(skipUnderside(tiny),false);assert.equal(skipRoof(tiny),false);}
});

test('live volume and shared PMREM discard zero density before using its optional shading outputs',()=>{
 const nebula=readFileSync(new URL('../assets/js/immersive-nebula-pass.js',import.meta.url),'utf8');
 const probe=readFileSync(new URL('../assets/js/immersive-lightstage.js',import.meta.url),'utf8');
 assert.ok(nebula.includes('${stellarDensityGLSL}'));assert.ok(probe.includes('${stellarDensityGLSL}'));
 const live=block(nebula,'void integrate('),capture=block(stellarProbeGLSL,'void stellarProbeLayer(');
 assert.ok(live.indexOf('if(den<.008)continue;')<live.indexOf('stellarLightSource('));
 assert.ok(capture.indexOf('if(density<.008)continue;')<capture.indexOf('stellarLightSource('));
 assert.match(live,/if\(mod\(float\(i\),4\.\)<\.5\)/);assert.match(capture,/if\(mod\(float\(i\),3\.\)<\.5\)/);
});
