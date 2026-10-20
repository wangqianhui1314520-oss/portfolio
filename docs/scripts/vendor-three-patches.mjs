// Local, minimal patches to the vendored three r161. Each patch must match its
// upstream text exactly once; vendor-three.mjs applies them after download and
// the manifest records both the upstream and the shipped SHA256.
//
// transmission-scale: backport of r172's renderer.transmissionResolutionScale
// (mrdoob/three.js#30018), plus renderer.transmissionSamples. r161 captured
// every transmissive frame at full drawing-buffer size with 4x MSAA HalfFloat;
// defaults keep r161 behaviour until the site opts in per GPU tier.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export const threePatches=[
 {
  id:'transmission-scale',file:'build/three.module.js',
  edits:[
   {find:'\t\tthis.toneMappingExposure = 1.0;\n',
    replace:'\t\tthis.toneMappingExposure = 1.0;\n\n\t\t// Tem: r172 transmissionResolutionScale backport and capture samples.\n\t\tthis.transmissionResolutionScale = 1;\n\t\tthis.transmissionSamples = 4;\n'},
   {find:'samples: ( isWebGL2 ) ? 4 : 0',replace:'samples: ( isWebGL2 ) ? _this.transmissionSamples : 0'},
   {find:'\t\t\t\t_transmissionRenderTarget.setSize( _vector2.x, _vector2.y );\n',
    replace:'\t\t\t\tif ( _transmissionRenderTarget.samples !== _this.transmissionSamples ) {\n\n\t\t\t\t\t_transmissionRenderTarget.dispose();\n\t\t\t\t\t_transmissionRenderTarget.samples = _this.transmissionSamples;\n\n\t\t\t\t}\n\n\t\t\t\tconst transmissionScale = _this.transmissionResolutionScale;\n\t\t\t\t_transmissionRenderTarget.setSize( Math.max( 1, Math.floor( _vector2.x * transmissionScale ) ), Math.max( 1, Math.floor( _vector2.y * transmissionScale ) ) );\n'}
  ]
 }
];

const marker=patch=>`Tem: r172 transmissionResolutionScale backport`;
export function applyThreePatches(file,text){
 const applied=[];
 for(const patch of threePatches.filter(entry=>entry.file===file)){
  if(text.includes(marker(patch))){applied.push(patch.id);continue;}
  for(const {find,replace} of patch.edits){
   const count=text.split(find).length-1;
   if(count!==1)throw new Error(`${patch.id}: expected one match in ${file}, found ${count}`);
   text=text.replace(find,()=>replace);
  }
  applied.push(patch.id);
 }
 return {text,applied};
}

// `node scripts/vendor-three-patches.mjs` patches the vendored files in place
// and refreshes their manifest entries; re-running it is a no-op.
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),destination=path.join(root,'assets/vendor/three-0.161.0');
 const manifestPath=path.join(destination,'manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 for(const entry of manifest.files){
  if(!threePatches.some(patch=>patch.file===entry.file))continue;
  const target=path.join(destination,entry.file),before=fs.readFileSync(target),{text,applied}=applyThreePatches(entry.file,before.toString('utf8'));
  const after=Buffer.from(text,'utf8');
  entry.upstreamSha256??=createHash('sha256').update(before).digest('hex');
  entry.patches=applied;entry.bytes=after.length;entry.sha256=createHash('sha256').update(after).digest('hex');
  fs.writeFileSync(target,after);
 }
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
 console.log(JSON.stringify(manifest.files.filter(entry=>entry.patches).map(({file,bytes,sha256,upstreamSha256,patches})=>({file,bytes,sha256,upstreamSha256,patches}))));
}
