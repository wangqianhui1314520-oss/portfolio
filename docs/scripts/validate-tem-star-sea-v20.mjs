// Inspect the actual binary GLBs: budget, finite geometry, outside normals,
// exact semantic roots, and absence of image assets in the new world / LOD.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output=path.join(root,'blender/cinematic-v20/validation.json');
const components={5120:[1,'readInt8'],5121:[1,'readUInt8'],5122:[2,'readInt16LE'],5123:[2,'readUInt16LE'],5125:[4,'readUInt32LE'],5126:[4,'readFloatLE']};
const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function inspect(name){
 const buffer=fs.readFileSync(path.join(root,'assets/models',name));
 if(buffer.readUInt32LE(0)!==0x46546c67)throw Error('Invalid GLB header');
 let p=12,json,bin;
 while(p<buffer.length){const size=buffer.readUInt32LE(p),type=buffer.readUInt32LE(p+4),data=buffer.subarray(p+8,p+8+size);if(type===0x4e4f534a)json=JSON.parse(data.toString());if(type===0x004e4942)bin=data;p+=size+8;}
 const values=index=>{
  const a=json.accessors[index],v=json.bufferViews[a.bufferView], [size,method]=components[a.componentType],width=widths[a.type],stride=v.byteStride??size*width;
  const offset=(v.byteOffset??0)+(a.byteOffset??0),result=[];
  for(let j=0;j<a.count;j++)for(let k=0;k<width;k++){const value=bin[method](offset+j*stride+k*size);if(!Number.isFinite(value))throw Error(name+' nonfinite accessor '+index);result.push(value);}
  return result;
 };
 let triangles=0,vertices=0,minimumNormalLength=Infinity,planetOutsideNormalSamples=0;
 for(const mesh of json.meshes??[])for(const primitive of mesh.primitives){
  const positions=values(primitive.attributes.POSITION),normals=values(primitive.attributes.NORMAL),indices=primitive.indices===undefined?Array.from({length:positions.length/3},(_,i)=>i):values(primitive.indices);
  if(indices.some(i=>!Number.isInteger(i)||i<0||i>=positions.length/3))throw Error(name+' invalid index');
  triangles+=indices.length/3;vertices+=positions.length/3;
  for(let j=0;j<normals.length;j+=3){const length=Math.hypot(...normals.slice(j,j+3));minimumNormalLength=Math.min(minimumNormalLength,length);if(length<.95||length>1.05)throw Error(name+' nonunit normal '+length);}
  if(mesh.name.startsWith('PLANET_V20')){
   const center=[0,0,0];for(let j=0;j<positions.length;j++)center[j%3]+=positions[j]/(positions.length/3);
   for(let j=0;j<positions.length;j+=87){const dot=[0,1,2].reduce((v,k)=>v+(positions[j+k]-center[k])*normals[j+k],0);if(dot<=0)throw Error(name+' inward planet normal');planetOutsideNormalSamples++;}
  }
 }
 if((json.images??[]).length)throw Error(name+' contains images');
 if(name==='tem-star-sea-v20.glb'&&triangles>=100000)throw Error('External full exceeds 100k');
 if(name==='tem-observatory-v20-lod.glb'&&triangles>=70000)throw Error('Cabin compact exceeds 70k');
 const nodes=(json.nodes??[]).map(n=>n.name??'');
 if(name.startsWith('tem-star-sea-')){
  if(!['PLANET_V20_DAWN','PLANET_V20_MOON'].every(x=>nodes.includes(x)))throw Error('Missing exact planet semantic root');
  if(nodes.some(x=>x.startsWith('CABIN_')||x.startsWith('FLOOR_')))throw Error('World export duplicated the cabin');
 }else if(!['CABIN_V19','T_IDENTITY_V19','SURFACE_FRAME_V19','EXTERIOR_V19'].every(x=>nodes.includes(x)))throw Error('Missing accepted compact cabin semantic root');
 return {file:name,bytes:buffer.length,triangles,vertices,meshes:json.meshes.length,materials:json.materials.length,images:0,minimumNormalLength,planetOutsideNormalSamples,nodes};
}
const files=['tem-star-sea-v20.glb','tem-star-sea-v20-lod.glb','tem-observatory-v20-lod.glb'].map(inspect);
const schema=JSON.parse(fs.readFileSync(path.join(root,'assets/models/tem-star-sea-v20.json'),'utf8'));
if(schema.volumeRegions.length!==6||!schema.volumeRegions.some(x=>x.kind==='cloud-sea'))throw Error('Mismatch between Blender and runtime volume topology');
const report={passed:true,checkedAt:new Date().toISOString(),files,volumeRegions:schema.volumeRegions.length,flowCurves:schema.flowCurves.length,environmentImages:schema.environmentImageDependencies};
fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
