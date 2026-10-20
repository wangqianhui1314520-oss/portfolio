// Optional local evidence. Normal visits do not wrap WebGL or query shaders.
// The driver log is returned unchanged, so Three.js still reports every issue.
export function createShaderDiagnostics(gl,{enabled=false}={}){
 const warnings=[],seen=new WeakSet(),original=gl.getProgramInfoLog;
 let wrapper=null;
 if(enabled){
  wrapper=function(program){
   const log=original.call(this,program);
   if(log&&!seen.has(program)){
    seen.add(program);
    try{
     const shaders=(this.getAttachedShaders(program)||[]).map(shader=>({type:this.getShaderParameter(shader,this.SHADER_TYPE),source:this.getShaderSource(shader)}));
     warnings.push({log,shaders});
    }catch(error){warnings.push({log,captureError:String(error?.message||error),shaders:[]});}
   }
   return log;
  };
  gl.getProgramInfoLog=wrapper;
 }
 return {get snapshot(){return warnings.map(item=>({...item,shaders:item.shaders.map(shader=>({...shader}))}));},
  dispose(){if(wrapper&&gl.getProgramInfoLog===wrapper)gl.getProgramInfoLog=original;}
 };
}
