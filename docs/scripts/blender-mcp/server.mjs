// Project-scoped MCP stdio service. It controls a background Blender instance,
// not an existing GUI session. Only fixed build/render operations are exposed.
import {createInterface} from 'node:readline';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const blender=process.env.TEM_BLENDER_PATH||'D:/New Folder/blender.exe';
const output=path.join(root,'blender/cinematic-v18');
fs.mkdirSync(output,{recursive:true});
const observatoryOutput=path.join(root,'blender/cinematic-v19');fs.mkdirSync(observatoryOutput,{recursive:true});
const starSeaOutput=path.join(root,'blender/cinematic-v20');fs.mkdirSync(starSeaOutput,{recursive:true});
const refinedOutput=path.join(root,'blender/cinematic-v21');fs.mkdirSync(refinedOutput,{recursive:true});
const definitions=[
 {name:'get_blender_info',description:'Read the installed local Blender version and project scope.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'build_tem_scene',description:'Build the editable Tem observatory and starport scene, save .blend and export website GLBs.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'render_tem_scene',description:'Render a named camera from the saved project.',inputSchema:{type:'object',properties:{camera:{type:'string',enum:['profile','atlas']},engine:{type:'string',enum:['CYCLES','BLENDER_EEVEE']},samples:{type:'integer',minimum:8,maximum:128}},required:['camera'],additionalProperties:false}},
 {name:'get_tem_job',description:'Read progress and final outputs of a project build or camera render.',inputSchema:{type:'object',properties:{job:{type:'string',enum:['build','profile','atlas','observatory-build','observatory-render','star-sea-build','star-sea-render','refined-observatory-build','refined-observatory-render','refined-fleet-build','refined-fleet-render']}},required:['job'],additionalProperties:false}},
 {name:'build_tem_observatory',description:'Add the v19 editable portrait observatory to the preserved v18 project and export its separate web asset.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'render_tem_observatory',description:'Render the exact portrait camera from the saved v19 project with Cycles.',inputSchema:{type:'object',properties:{samples:{type:'integer',minimum:8,maximum:128}},additionalProperties:false}},
 {name:'build_tem_star_sea',description:'Preserve the accepted v19 observatory and build an editable image-free 3D star sea with full/compact external-world GLBs and a same-source cabin LOD.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'render_tem_star_sea',description:'Render the actual image-free v20 star-sea camera from its saved Blender engineering project.',inputSchema:{type:'object',properties:{samples:{type:'integer',minimum:8,maximum:128}},additionalProperties:false}},
 {name:'build_tem_refined_observatory',description:'Create an independent v21 scene with a sculpted optical terrace, solid radiused crystal identity and fine pressure glass, preserving the v20 master project.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'render_tem_refined_observatory',description:'Render the actual refined v21 observatory with Cycles from its saved editable engineering project.',inputSchema:{type:'object',properties:{samples:{type:'integer',minimum:8,maximum:128}},additionalProperties:false}},
 {name:'build_tem_refined_fleet',description:'Create the fixed v21 refined fleet engineering project and its compatible full/compact GLBs, preserving prior fleet assets.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'render_tem_refined_fleet',description:'Render the fixed refined v21 fleet scene with Cycles from its saved engineering project.',inputSchema:{type:'object',properties:{samples:{type:'integer',minimum:8,maximum:128}},additionalProperties:false}}
];
const jobFolder=job=>job.startsWith('refined-')?refinedOutput:job.startsWith('star-sea-')?starSeaOutput:job.startsWith('observatory-')?observatoryOutput:output;
const jsonPath=job=>path.join(jobFolder(job),`mcp-job-${job}.json`);
function launch(job,args,expected){
 const prev=fs.existsSync(jsonPath(job))?JSON.parse(fs.readFileSync(jsonPath(job),'utf8')):null;
 if(prev){try{process.kill(prev.pid,0);throw new Error('This Blender job is still running.');}catch(e){if(e.message.includes('still running'))throw e;}}
 const log=path.join(jobFolder(job),`mcp-${job}.log`),fd=fs.openSync(log,'w'),startedAt=Date.now();
 const child=spawn(blender,args,{cwd:root,windowsHide:true,detached:true,stdio:['ignore',fd,fd]});
 child.on('error',error=>fs.writeFileSync(path.join(output,`mcp-${job}-error.txt`),String(error)));
 const data={job,pid:child.pid,startedAt,log,expected,blender,transport:'MCP stdio',instance:'background'};
 fs.writeFileSync(jsonPath(job),JSON.stringify(data,null,2));child.unref();fs.closeSync(fd);return data;
}
function status(job){
 if(!['build','profile','atlas','observatory-build','observatory-render','star-sea-build','star-sea-render','refined-observatory-build','refined-observatory-render','refined-fleet-build','refined-fleet-render'].includes(job))throw new Error('Unknown job.');
 const data=JSON.parse(fs.readFileSync(jsonPath(job),'utf8'));let running=false;
 try{process.kill(data.pid,0);running=true;}catch{}
 const files=data.expected.map(file=>({file,ready:fs.existsSync(file)&&fs.statSync(file).mtimeMs>=data.startedAt-2000,bytes:fs.existsSync(file)?fs.statSync(file).size:0}));
 const log=fs.existsSync(data.log)?fs.readFileSync(data.log,'utf8').slice(-3400):'';
 return {...data,running,state:files.every(file=>file.ready)?'complete':running?'running':'failed',files,log};
}
async function call(name,args={}){
 if(!definitions.some(t=>t.name===name))throw new Error('Unknown tool.');
 if(name==='get_blender_info')return {version:execFileSync(blender,['--version'],{windowsHide:true,encoding:'utf8'}).split('\n')[0],executable:blender,workspace:root,scope:'Only this project; background Blender; no arbitrary Python tool.'};
 if(name==='build_tem_scene')return launch('build',['--background','--factory-startup','--python',path.join(root,'scripts/build-tem-cinematic.py')],[path.join(output,'tem-cinematic.blend'),path.join(output,'manifest.json'),...['deck','display','starport','fleet'].map(name=>path.join(root,`assets/models/tem-cinematic-${name}.glb`))]);
 if(name==='build_tem_observatory')return launch('observatory-build',['--background',path.join(output,'tem-cinematic.blend'),'--python',path.join(root,'scripts/build-tem-observatory-v19.py')],[path.join(observatoryOutput,'tem-dream-observatory.blend'),path.join(observatoryOutput,'manifest.json'),path.join(root,'assets/models/tem-observatory-v19.glb')]);
 if(name==='build_tem_star_sea')return launch('star-sea-build',['--background',path.join(observatoryOutput,'tem-dream-observatory.blend'),'--python',path.join(root,'scripts/build-tem-star-sea-v20.py')],[path.join(starSeaOutput,'tem-living-star-sea.blend'),path.join(starSeaOutput,'manifest.json'),path.join(root,'assets/models/tem-star-sea-v20.glb'),path.join(root,'assets/models/tem-star-sea-v20-lod.glb'),path.join(root,'assets/models/tem-observatory-v20-lod.glb'),path.join(root,'assets/models/tem-star-sea-v20.json')]);
 if(name==='render_tem_star_sea'){
  const samples=args.samples??48;if(!Number.isInteger(samples)||samples<8||samples>128)throw new Error('Samples must be 8–128.');
  return launch('star-sea-render',['--background',path.join(starSeaOutput,'tem-living-star-sea.blend'),'--python',path.join(root,'scripts/render-tem-star-sea-v20.py'),'--','--samples',String(samples)],[path.join(starSeaOutput,'tem-star-sea-render.png'),path.join(starSeaOutput,'render-star-sea.json')]);
 }
 if(name==='build_tem_refined_observatory')return launch('refined-observatory-build',['--background',path.join(starSeaOutput,'tem-living-star-sea.blend'),'--python',path.join(root,'scripts/build-tem-refined-observatory-v21.py')],[path.join(refinedOutput,'tem-refined-optical-observatory.blend'),path.join(refinedOutput,'manifest.json'),path.join(root,'assets/models/tem-refined-observatory-v21.glb'),path.join(root,'assets/models/tem-refined-observatory-v21-lod.glb'),path.join(root,'assets/models/tem-refined-observatory-v21.json')]);
 if(name==='build_tem_refined_fleet')return launch('refined-fleet-build',['--background',path.join(starSeaOutput,'tem-living-star-sea.blend'),'--python',path.join(root,'scripts/build-tem-refined-fleet-v21.py')],[path.join(refinedOutput,'tem-refined-fleet.blend'),path.join(refinedOutput,'manifest-fleet.json'),path.join(root,'assets/models/tem-refined-fleet-v21.glb'),path.join(root,'assets/models/tem-refined-fleet-v21-lod.glb')]);
 if(name==='render_tem_refined_observatory'||name==='render_tem_refined_fleet'){
  const samples=args.samples??48;if(!Number.isInteger(samples)||samples<8||samples>128)throw new Error('Samples must be 8–128.');
  const fleet=name==='render_tem_refined_fleet',job=fleet?'refined-fleet-render':'refined-observatory-render';
  return launch(job,['--background',path.join(refinedOutput,fleet?'tem-refined-fleet.blend':'tem-refined-optical-observatory.blend'),'--python',path.join(root,fleet?'scripts/render-tem-refined-fleet-v21.py':'scripts/render-tem-refined-observatory-v21.py'),'--','--samples',String(samples)],[path.join(refinedOutput,fleet?'tem-refined-fleet-render.png':'tem-refined-observatory-render.png'),path.join(refinedOutput,fleet?'render-fleet.json':'render-refined.json')]);
 }
 if(name==='render_tem_observatory'){
  const samples=args.samples??64;if(!Number.isInteger(samples)||samples<8||samples>128)throw new Error('Samples must be 8–128.');
  return launch('observatory-render',['--background',path.join(observatoryOutput,'tem-dream-observatory.blend'),'--python',path.join(root,'scripts/render-tem-observatory-v19.py'),'--','--samples',String(samples)],[path.join(observatoryOutput,'tem-profile-render.png'),path.join(observatoryOutput,'render-profile.json')]);
 }
 if(name==='render_tem_scene'){
  if(!['profile','atlas'].includes(args.camera))throw new Error('Invalid camera.');
  if(args.engine&&!['CYCLES','BLENDER_EEVEE'].includes(args.engine))throw new Error('Invalid engine.');
  const samples=args.samples??32;if(!Number.isInteger(samples)||samples<8||samples>128)throw new Error('Samples must be 8–128.');
  return launch(args.camera,['--background',path.join(output,'tem-cinematic.blend'),'--python',path.join(root,'scripts/render-tem-cinematic.py'),'--','--camera',args.camera,'--engine',args.engine||'CYCLES','--samples',String(samples)],[path.join(output,`tem-${args.camera}-render.png`),path.join(output,`render-${args.camera}.json`)]);
 }
 return status(args.job);
}
const respond=(id,result,error)=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,...(error?{error}:{result})})+'\n');
for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})){
 let req;try{
  req=JSON.parse(line);if(req.id===undefined)continue;
  if(req.method==='initialize')respond(req.id,{protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'tem-local-blender',version:'1.3.0'}});
  else if(req.method==='tools/list')respond(req.id,{tools:definitions});
  else if(req.method==='tools/call'){try{const result=await call(req.params.name,req.params.arguments);respond(req.id,{content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result});}catch(e){respond(req.id,{isError:true,content:[{type:'text',text:String(e)}]});}}
  else if(req.method==='ping')respond(req.id,{});
  else respond(req.id,null,{code:-32601,message:'Method not found'});
 }catch(e){respond(req?.id??null,null,{code:-32700,message:String(e)});}
}
