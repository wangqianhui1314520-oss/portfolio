import {createGpuTiming} from './immersive-gpu-timing.js?v=cinematic-v21.19';

// Opt-in evidence only. Each stage is sampled on a different frame, so no
// nested TIME_ELAPSED query can change the real render pipeline or its quality.
export function createRenderProfile({gl,composer,canvas,renderer=null,enabled=false}){
 const stages=[],restore=[],draws=new Map(),parts=new Map();let frame=0;
 function measure(name,operation){
  if(!enabled)return operation;
  const timer=createGpuTiming(gl,{offset:stages.length+1}),stage={name,timer,cpuTotal:0,count:0,drawTotal:0,triangleTotal:0};stages.push(stage);
  return function(...args){
   const start=performance.now(),before=renderer?.info?.render,calls=before?.calls||0,triangles=before?.triangles||0;
   timer.begin(frame);
   try{return operation.apply(this,args);}
   finally{timer.end();stage.cpuTotal+=performance.now()-start;stage.count++;stage.drawTotal+=Math.max(0,(renderer?.info?.render?.calls||0)-calls);stage.triangleTotal+=Math.max(0,(renderer?.info?.render?.triangles||0)-triangles);}
  };
 }
 if(enabled&&renderer){
  const original=renderer.renderBufferDirect;
  renderer.renderBufferDirect=function(camera,scene,geometry,material,object,...args){
   let root=object;for(let parent=object?.parent;parent&&!parent.isScene;parent=parent.parent)if(parent.name)root=parent;
   const key=String(root?.name||object?.name||object?.type||'unnamed'),entry=draws.get(key)||{root:key,calls:0};entry.calls++;draws.set(key,entry);
   let part=object;while(part&&!part.name&&!part.parent?.isScene)part=part.parent;
   const partKey=`${part?.name||key}/${material?.name||material?.type||'unnamed'}`,detail=parts.get(partKey)||{part:partKey,calls:0};detail.calls++;parts.set(partKey,detail);
   return original.call(this,camera,scene,geometry,material,object,...args);
  };
  const wrapper=renderer.renderBufferDirect;restore.push(()=>{if(renderer.renderBufferDirect===wrapper)renderer.renderBufferDirect=original;});
 }
 if(enabled)for(const [index,pass] of composer.passes.entries()){
  const original=pass.render,name=`${index}:${pass.constructor.name}`;
  pass.render=measure(name,original);restore.push(()=>{pass.render=original;});
 }
 return {
  measure,
  begin(value){frame=value;if(enabled){draws.clear();parts.clear();}},
  publish(){
   if(!enabled)return;
   canvas.dataset.renderStages=JSON.stringify(stages.map(({name,timer,cpuTotal,count,drawTotal,triangleTotal})=>{const s=timer.stats;return {name,samples:s.samples,mean:s.mean===null?null:Math.round(s.mean*100)/100,p95:s.p95===null?null:Math.round(s.p95*100)/100,cpuMs:Math.round(cpuTotal/Math.max(1,count)*100)/100,calls:Math.round(drawTotal/Math.max(1,count)),triangles:Math.round(triangleTotal/Math.max(1,count))};}));
   canvas.dataset.renderRoots=JSON.stringify([...draws.values()].sort((a,b)=>b.calls-a.calls).slice(0,16));
   canvas.dataset.renderParts=JSON.stringify([...parts.values()].sort((a,b)=>b.calls-a.calls).slice(0,32));
  },
  reset(){stages.forEach(({timer})=>timer.reset());},
  restore(){stages.forEach(({timer})=>timer.restore());},
  dispose(){this.reset();restore.forEach(callback=>callback());}
 };
}
