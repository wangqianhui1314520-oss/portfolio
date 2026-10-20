// Asynchronous GPU evidence, never a quality switch. There is no gl.finish,
// blocking result read or per-frame query allocation. Unsupported timers leave
// the scene untouched and explicitly report that GPU timing is unavailable.
export function readGraphicsEvidence(gl){
 let renderer='unavailable',vendor='unavailable',unmasked=false;
 try{
  const debug=gl?.getExtension?.('WEBGL_debug_renderer_info');
  renderer=String(gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL??gl.RENDERER)||'unavailable');
  vendor=String(gl.getParameter(debug?.UNMASKED_VENDOR_WEBGL??gl.VENDOR)||'unavailable');
  unmasked=Boolean(debug);
 }catch{}
 // A renderer string can prove a reported software path. Other strings alone
 // cannot establish that the actual page is using physical GPU acceleration.
 const software=/Basic Render Driver|SwiftShader|llvmpipe|softpipe|Software Rasterizer|\bWARP\b/i.test(renderer);
 return {renderer,vendor,unmasked,acceleration:software?'software-reported':'not-confirmed'};
}

export function createGpuTiming(gl,{period=30,offset=0}={}){
 period=Number.isInteger(period)&&period>0?period:30;
 offset=Number.isInteger(offset)?((offset%period)+period)%period:0;
 let ext,supported=false;
 const connect=()=>{ext=null;try{ext=gl?.getExtension?.('EXT_disjoint_timer_query_webgl2');}catch{}supported=Boolean(ext&&gl.createQuery&&gl.getQueryParameter);};
 connect();
 let pending=[],active=null,values=[],samples=0,discarded=0;
 const empty=()=>({supported,samples,discarded,pending:pending.length,mean:null,p95:null});
 function poll(){
  if(!supported||!pending.length)return;
  if(gl.getParameter(ext.GPU_DISJOINT_EXT)){
   discarded+=pending.length;pending.forEach(query=>gl.deleteQuery(query));pending=[];values=[];return;
  }
  while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
   const query=pending.shift(),ms=Number(gl.getQueryParameter(query,gl.QUERY_RESULT))/1e6;gl.deleteQuery(query);
   if(Number.isFinite(ms)&&ms>0&&ms<10000){values.push(ms);samples++;if(values.length>60)values.shift();}
   else discarded++;
  }
 }
 return {
  begin(frame){
   if(!supported||active)return false;
   if(frame%15===0)poll();
   if(frame%period!==offset||pending.length>=4||gl.isContextLost?.())return false;
   // A third-party profiler may already own the timer target.
   if(gl.getQuery?.(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))return false;
   active=gl.createQuery();if(!active)return false;
   gl.beginQuery(ext.TIME_ELAPSED_EXT,active);return true;
  },
  end(){if(!active)return;gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(active);active=null;},
  get stats(){
   if(!values.length)return empty();
   const sorted=values.slice().sort((a,b)=>a-b);
   return {...empty(),mean:values.reduce((sum,value)=>sum+value,0)/values.length,p95:sorted[Math.ceil(sorted.length*.95)-1]};
  },
  reset(){
   // Lost-context handles no longer belong to a live GL query namespace.
   if(!gl?.isContextLost?.()){
    if(active)gl.endQuery(ext.TIME_ELAPSED_EXT);
    for(const query of [...pending,...(active?[active]:[])])gl.deleteQuery(query);
   }
   active=null;pending=[];values=[];samples=0;discarded=0;
  },
  restore(){
   // The loss handler already discarded old handles. Extension availability
   // and its enums must be requested again from the restored context.
   active=null;pending=[];values=[];samples=0;discarded=0;connect();
  }
 };
}
