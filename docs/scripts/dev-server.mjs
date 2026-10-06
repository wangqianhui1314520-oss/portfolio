// Serve this project from its actual root, independent of the terminal cwd.
import {createServer} from 'node:http';
import {createReadStream,statSync} from 'node:fs';
import {dirname,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.mp4':'video/mp4','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.opus':'audio/opus','.m4a':'audio/mp4','.vtt':'text/vtt; charset=utf-8','.pdf':'application/pdf','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
const server=createServer((req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  let info=statSync(file);if(info.isDirectory()){file=resolve(file,'index.html');info=statSync(file);}
  if(!info.isFile())throw new Error('Not a file');
  const headers={'Content-Type':types[extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
  let start=0,end=info.size-1,status=200;
  if(req.headers.range){
   const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   if(!range||(!range[1]&&!range[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
   if(!range[1])start=Math.max(0,info.size-Number(range[2]));
   else {start=Number(range[1]);if(range[2])end=Math.min(end,Number(range[2]));}
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
  }
  headers['Content-Length']=String(info.size?end-start+1:0);res.writeHead(status,headers);
  if(req.method==='HEAD'||!info.size){res.end();return;}
  const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);res.on('close',()=>stream.destroy());
 }catch{if(!res.headersSent)res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Tem preview: http://127.0.0.1:${port}/immersive.html\nRoot: ${root}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
