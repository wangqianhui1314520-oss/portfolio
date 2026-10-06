// Rendering is capped independently of the display refresh rate. Missed callbacks
// never accumulate a catch-up queue, so a long task cannot fast-forward the world.
export function createRenderPacer({fps=60}={}){
 const interval=1000/Math.max(1,fps);let next=null,last=null;
 return {
  get fps(){return 1000/interval;},
  reset(){next=null;last=null;},
  shouldRender(milliseconds){
   if(!Number.isFinite(milliseconds))return false;
   if(next===null||last!==null&&milliseconds<last){last=milliseconds;next=milliseconds+interval;return true;}
   if(milliseconds+.5<next)return false;
   // Keep the phase on high-refresh panels rather than always waiting for three
   // callbacks. After a real stall, resume from the present without a burst.
   if(milliseconds-next>interval*2)next=milliseconds+interval;
   else next+=Math.max(1,Math.floor((milliseconds-next)/interval)+1)*interval;
   last=milliseconds;return true;
  }
 };
}

// Resolution follows sustained frame cost, with hysteresis to avoid resize stutter.
export function createFrameBudget({compact=false}={}){
 let quality=compact?.90:1,elapsed=0,frames=0,slow=0,fast=0;
 return {
  get quality(){return quality;},
  reset(){elapsed=0;frames=0;slow=0;fast=0;},
  sample(milliseconds){
   if(!Number.isFinite(milliseconds)||milliseconds<=0||milliseconds>500)return null;
   elapsed+=milliseconds;frames++;
   if(elapsed<1600)return null;
   const fps=frames*1000/elapsed,old=quality;
   slow=fps<46?slow+1:0;fast=fps>58?fast+1:0;
   if(slow>=2){quality=Math.max(.56,quality*(fps<28?.80:.90));slow=0;fast=0;}
   if(fast>=7&&quality<1){quality=Math.min(1,quality+.06);fast=0;}
   elapsed=0;frames=0;
   return {fps,quality,changed:Math.abs(old-quality)>.001};
  }
 };
}
export function renderPixelRatio({width,height,dpr=1,quality=1,compact=false}){
 const native=Math.min(dpr,compact?1.25:1.35),pixelCap=compact?800000:1800000;
 return Math.min(native,Math.sqrt(pixelCap/Math.max(1,width*height)))*quality;
}
