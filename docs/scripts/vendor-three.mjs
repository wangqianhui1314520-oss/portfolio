// Fetch the exact dependency graph already used by Tem. No version upgrades.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {applyThreePatches} from './vendor-three-patches.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source='https://cdn.jsdelivr.net/npm/three@0.161.0/';
const destination=path.join(root,'assets/vendor/three-0.161.0');
const pending=new Set(['build/three.module.js','LICENSE']),done=new Map();
for(const name of await fs.readdir(path.join(root,'assets/js'))){
 if(!name.endsWith('.js'))continue;
 const text=await fs.readFile(path.join(root,'assets/js',name),'utf8');
 for(const match of text.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.161\.0\/([^'"\s]+)/g))pending.add(match[1]);
}
async function fetchFile(file){
 if(!/^(?:build\/three\.module\.js|LICENSE|examples\/jsm\/[\w./-]+\.js)$/.test(file)||file.includes('..'))throw new Error('Unexpected dependency: '+file);
 const response=await fetch(source+file,{signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw new Error(`${file}: HTTP ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer()),text=bytes.toString();
 for(const match of text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)){
  if(match[1]==='three')continue;
  if(match[1].startsWith('.')){const next=path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1]));if(!done.has(next))pending.add(next);}
 }
 // Local patches (vendor-three-patches.mjs) are replayed on the exact upstream text.
 const patched=applyThreePatches(file,text),shipped=patched.applied.length?Buffer.from(patched.text,'utf8'):bytes;
 const output=path.join(destination,file);await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,shipped);
 const sha=value=>createHash('sha256').update(value).digest('hex');
 return {file,bytes:shipped.length,sha256:sha(shipped),...(patched.applied.length?{upstreamSha256:sha(bytes),patches:patched.applied}:{})};
}
while(pending.size){
 const batch=[...pending].filter(file=>!done.has(file)).slice(0,4);
 if(!batch.length)break;
 for(const file of batch){pending.delete(file);done.set(file,null);}
 const results=await Promise.allSettled(batch.map(fetchFile));
 for(let i=0;i<results.length;i++){if(results[i].status!=='fulfilled')throw results[i].reason;done.set(batch[i],results[i].value);}
}
await fs.writeFile(path.join(destination,'manifest.json'),JSON.stringify({version:'0.161.0',source,license:'MIT',files:[...done.values()]},null,2));
console.log(JSON.stringify({files:done.size,bytes:[...done.values()].reduce((n,v)=>n+v.bytes,0),destination}));
