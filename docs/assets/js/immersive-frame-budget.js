// Rendering holds a constant number of display refreshes per frame. A fixed
// 60 Hz clock alternated 3,3,3,2 refreshes on a 165 Hz panel (12.1/18.2 ms)
// and 3,2 on 144 Hz, which reads as judder in steady camera moves. The refresh
// is learned from the callbacks themselves: the median of the cluster around
// the lower quartile ignores late callbacks without biasing the period, and a
// GPU-bound page simply renders on every callback it gets.
// Missed callbacks never accumulate a catch-up queue, so a long task cannot
// fast-forward the world.
export function createRenderPacer({fps=60,maxFps=75}={}){
 const fallback=1000/Math.max(1,fps),deltas=[];let last=null,previous=null,refresh=null,stride=1;
 function learn(milliseconds){
  if(previous!==null){const delta=milliseconds-previous;if(delta>2&&delta<100){deltas.push(delta);if(deltas.length>45)deltas.shift();}}
  previous=milliseconds;
  if(deltas.length<12)return;
  const sorted=deltas.slice().sort((a,b)=>a-b),quartile=sorted[sorted.length>>2],cluster=sorted.filter(delta=>delta<quartile*1.5);
  refresh=cluster[cluster.length>>1];
  // The fewest refreshes that keep the rate at or below maxFps: 60 Hz → 60,
  // 120 → 60, 144 → 72, 165 → 55, 180 → 60, 240 → 60 frames per second.
  // A 5% margin keeps a panel right at the cap (75 Hz) from rounding to half rate.
  stride=Math.max(1,Math.ceil(1000/(maxFps*refresh)-.05));
 }
 return {
  get fps(){return refresh?1000/(refresh*stride):1000/fallback;},
  get stride(){return refresh?stride:null;},
  reset(){last=null;previous=null;},
  shouldRender(milliseconds){
   if(!Number.isFinite(milliseconds))return false;
   learn(milliseconds);
   if(last===null||milliseconds<last){last=milliseconds;return true;}
   // Half a refresh of tolerance keeps the phase on jittery timestamps. After a
   // real stall the next callback renders and the cadence resumes from there.
   const interval=refresh?refresh*stride:fallback,tolerance=refresh?refresh*.5:.5;
   if(milliseconds-last<interval-tolerance)return false;
   last=milliseconds;return true;
  }
 };
}

// Resolution follows sustained frame cost, with hysteresis to avoid resize stutter.
export function createFrameBudget({compact=false}={}){
 let quality=compact?.90:1,elapsed=0,frames=0,slow=0,fast=0;
 // Resolution is spent first; edge shimmer reads cheaper than film softness.
 // Only a frame still slow at the resolution floor drops a feature tier
 // (multisampling and the transmission capture), and recovery restores the
 // tier before any resolution is regained above the floor.
 // A tier restored only to drop again soon waits twice as long next time, so a
 // GPU on the edge of a tier settles instead of switching every few seconds.
 let tierDrop=0,restoreNeed=7,sinceRestore=Infinity;
 return {
  get quality(){return quality;},
  get tierDrop(){return tierDrop;},
  reset(){elapsed=0;frames=0;slow=0;fast=0;},
  // targetFps is the pacer's own cadence. A 165 Hz panel renders at most 55
  // frames per second, so recovery compares against that, not a fixed 58.
  sample(milliseconds,targetFps=60,{maxTierDrop=2}={}){
   if(!Number.isFinite(milliseconds)||milliseconds<=0||milliseconds>500)return null;
   elapsed+=milliseconds;frames++;
   if(elapsed<1600)return null;
   const fps=frames*1000/elapsed,old=quality,oldTier=tierDrop,recovered=Math.min(58,(Number.isFinite(targetFps)&&targetFps>0?targetFps:60)*.966);
   slow=fps<46?slow+1:0;fast=fps>recovered?fast+1:0;sinceRestore++;
   if(slow>=2){
    if(quality<=.5601&&tierDrop<maxTierDrop){tierDrop++;if(sinceRestore<12)restoreNeed=Math.min(56,restoreNeed*2);}
    else quality=Math.max(.56,quality*(fps<28?.80:.90));
    slow=0;fast=0;
   }
   if(tierDrop>0?fast>=restoreNeed:fast>=7){
    if(tierDrop>0){tierDrop--;sinceRestore=0;}
    else if(quality<1)quality=Math.min(1,quality+.06);
    fast=0;
   }
   elapsed=0;frames=0;
   return {fps,quality,tierDrop,changed:Math.abs(old-quality)>.001||oldTier!==tierDrop};
  }
 };
}
export function renderPixelRatio({width,height,dpr=1,quality=1,compact=false}){
 const native=Math.min(dpr,compact?1.25:1.35),pixelCap=compact?800000:1800000;
 return Math.min(native,Math.sqrt(pixelCap/Math.max(1,width*height)))*quality;
}

// Evidence is separate from adaptive quality. Very slow visible frames still
// count here; ignoring >500ms stalls made an overloaded scene publish no FPS.
export function createFrameTelemetry({windowMs=1600}={}){
 let elapsed=0,frames=0,durations=[];
 return {
  reset(){elapsed=0;frames=0;durations=[];},
  sample(milliseconds){
   if(!Number.isFinite(milliseconds)||milliseconds<=0)return null;
   elapsed+=milliseconds;frames++;durations.push(milliseconds);
   if(elapsed<windowMs)return null;
   durations.sort((a,b)=>a-b);
   const result={fps:frames*1000/elapsed,elapsed,frames,p95:durations[Math.ceil(frames*.95)-1],max:durations[frames-1],longFrames:durations.filter(value=>value>50).length};
   elapsed=0;frames=0;durations=[];return result;
  }
 };
}
// Navigation follows visible wall time; numerical simulation keeps a bounded
// step. Readiness/resume explicitly reset the clock so a cold draw or a hidden
// tab gap cannot be charged to a newly started cinematic shot.
export function createFrameClock(){
 let previous=null;
 return {
  reset(){previous=null;},
  step(ms){
   if(!Number.isFinite(ms)){previous=null;return {wallDt:1/60,dt:1/60};}
   const wallDt=previous===null?1/60:Math.max(0,(ms-previous)*.001);previous=ms;
   return {wallDt,dt:Math.min(wallDt,.05)};
  }
 };
}

// Feature tiers decide where a GPU spends its frame. On an Iris Xe the
// transmission re-render and 4x MSAA resolves cost a third of the frame, so
// integrated GPUs trade a little edge coverage for resolution; the adaptive
// pixel budget above still sets the final resolution. Discrete GPUs keep the
// full cinematic pipeline. The visitor's quality choice overrides detection.
const tierSettings=Object.freeze({
 cinematic:Object.freeze({samples:4,transmissionScale:1,transmissionSamples:4}),
 balanced:Object.freeze({samples:2,transmissionScale:.75,transmissionSamples:0}),
 light:Object.freeze({samples:0,transmissionScale:.5,transmissionSamples:0})
});
const tierOrder=['cinematic','balanced','light'];
// `drop` lowers an automatic tier when even the resolution floor is too slow;
// an explicit full/low choice is the visitor's and never moves.
export function graphicsProfile({renderer='',compact=false,preference='auto',maxSamples=4,drop=0}={}){
 const software=/SwiftShader|Basic Render|llvmpipe|softpipe|Software Rasterizer|\bWARP\b/i.test(renderer);
 const discrete=/NVIDIA|GeForce|Quadro|\bRTX\b|\bGTX\b|Radeon\s*(?:RX|Pro|VII)|\bArc\b/i.test(renderer);
 const detected=preference==='full'?'cinematic':preference==='low'||software?'light':discrete?'cinematic':'balanced';
 const tier=preference==='auto'?tierOrder[Math.min(tierOrder.length-1,tierOrder.indexOf(detected)+Math.max(0,Math.floor(drop)||0))]:detected;
 const settings=tierSettings[tier];
 // Tile-based phone GPUs resolve multisampling on chip; their real cost is
 // the full-screen transmission copy, which still follows the tier.
 const samples=Math.max(0,Math.min(Number(maxSamples)||0,compact&&tier!=='light'?4:settings.samples));
 return {tier,samples,transmissionScale:settings.transmissionScale,transmissionSamples:Math.min(Number(maxSamples)||0,settings.transmissionSamples)};
}
