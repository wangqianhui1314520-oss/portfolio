// Read existing renderer evidence only: no graphics calls, fingerprint probes,
// network requests or background sampling are added to a normal visit.
export function renderReport(canvas,{page=globalThis.location,now=new Date()}={}){
 const data=canvas?.dataset||{},number=key=>{
  if(data[key]===undefined||data[key]==='')return null;
  const value=Number(data[key]);return Number.isFinite(value)?value:null;
 };
 const query=new URLSearchParams(page?.search||'');
 return {
  format:'tem-render-report-1',capturedAt:now.toISOString(),
  page:{path:page?.pathname||null,view:query.get('view'),chapter:query.get('chapter'),scene:data.journey||null},
  graphics:{renderer:data.graphicsRenderer||null,vendor:data.graphicsVendor||null,acceleration:data.graphicsAcceleration||null},
  frames:{fps:number('frameRate'),p95Ms:number('frameP95Ms'),maxMs:number('frameMaxMs'),over50Ms:number('frameLongCount'),count:number('frameWindowCount'),windowMs:number('frameWindowMs'),scope:'Latest visible frame window; may span a scene transition.'},
  work:{renderSubmissionCpuMs:number('renderCpuMs'),gpuTiming:data.gpuTiming||null,gpuMeanMs:number('renderGpuMs'),gpuP95Ms:number('renderGpuP95Ms'),drawCalls:number('drawCalls'),triangles:number('triangles')},
  image:{width:canvas?.width??null,height:canvas?.height??null,pixelRatio:number('pixelRatio'),quality:number('quality'),bloom:data.bloom==='true'?true:data.bloom==='false'?false:null,sceneSamples:number('sceneSamples'),particleSamples:number('particleSamples')},
  startup:{readyMs:number('startupReadyMs'),assetWaitMs:number('startupAssetWaitMs'),shaderPreparationMs:number('startupShaderMs'),radiancePreparationMs:number('startupRadianceMs')},
  note:'CPU submission time is not GPU render time. Unavailable measurements remain null.'
 };
}

export async function copyRenderReport(canvas,{clipboard=globalThis.navigator?.clipboard,download=text=>{
 const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='tem-performance.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}}={}){
 const text=JSON.stringify(renderReport(canvas),null,2);
 if(clipboard?.writeText)try{await clipboard.writeText(text);return 'copied';}catch{}
 download(text);return 'downloaded';
}
