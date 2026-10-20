import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The compositor's scalar/vector guard can execute without a GPU. This checks
// exact zero coverage and depth-edge tap routing in its actual GLSL source;
// browser shader compilation and GPU timings are separate acceptance checks.
const module=readFileSync(new URL('../assets/js/immersive-nebula-pass.js',import.meta.url),'utf8');
const fragment=module.slice(module.indexOf('this.compositeMaterial=' )).match(/fragmentShader:`([\s\S]*?)`/)[1];
const guardStart=fragment.indexOf('if(all(equal(fog00'),guardEnd=fragment.indexOf('{',guardStart);
assert.ok(guardStart>=0&&guardEnd>guardStart);
const guard=fragment.slice(guardStart+3,guardEnd-1);
const all=values=>values.every(Boolean),equal=(a,b)=>a.map((value,i)=>value===b[i]),vec4=x=>Array(4).fill(x);
const empty=new Function('fog00','fog10','fog01','fog11','all','equal','vec4',`return ${guard};`);
const taps=()=>Array.from({length:4},()=>[0,0,0,0]);

test('only a strictly empty volume footprint skips depth filtering, including colored zero-alpha cases',()=>{
 assert.equal(empty(...taps(),all,equal,vec4),true);
 for(let tap=0;tap<4;tap++)for(let channel=0;channel<4;channel++)for(const value of [1e-30,.2,8,-.2,NaN,Infinity]){
  const values=taps();values[tap][channel]=value;
  assert.equal(empty(...values,all,equal,vec4),false,`tap ${tap}, channel ${channel}, value ${value} must retain the full filter`);
 }
 assert.ok(guardEnd<fragment.indexOf('float depth=viewDepth(texture2DLodEXT(uDepth,vUv,0.).r)'),'zero coverage exits before all five depth reads');
 const end=fragment.indexOf('}',guardEnd),body=fragment.slice(guardEnd+1,end);
 const output=new Function('source','vec4',`let gl_FragColor;(()=>{${body}})();return gl_FragColor;`);
 for(const source of [[0,0,0],[.01,.5,64],[1,2,8]])assert.deepEqual(output(source,(rgb,a)=>[...rgb,a]),[...source,1]);
});

test('nonempty bilateral filtering preserves all four distinct depth-edge fog samples',()=>{
 const routing=fragment.match(/vec4 sampleFog=([^;]+);/)[1];
 const select=new Function('x','y','fog00','fog10','fog01','fog11',`return ${routing};`);
 const samples=[[1,0,0,.1],[0,2,0,.2],[0,0,3,.3],[4,4,4,.4]];
 const weightExpression=fragment.match(/float weight=([^;]+);/)[1];
 const weight=new Function('x','y','blend','depth','other','exp','abs',`return ${weightExpression};`);
 // A sharp hull boundary rejects the far taps without moving their colors to
 // another corner; an ordinary footprint keeps all four original influences.
 for(const depths of [[20,20,20,20],[20,500,20,500],[500,20,500,20]]){
  const blend={x:.37,y:.62},depth=20,result=[0,0,0,0],reference=[0,0,0,0];let sum=0;
  for(let y=0;y<2;y++)for(let x=0;x<2;x++){
   const i=y*2+x,selected=select(x,y,...samples),w=weight(x,y,blend,depth,depths[i],Math.exp,Math.abs);
   sum+=w;for(let c=0;c<4;c++){result[c]+=selected[c]*w;reference[c]+=samples[i][c]*w;}
  }
  assert.ok(sum>0);assert.deepEqual(result.map(value=>value/sum),reference.map(value=>value/sum));
 }
});
