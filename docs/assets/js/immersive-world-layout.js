// Blender exports positions in the same metre-scale coordinates as the live scene.
// Defaults are the authored world's bounds, so async loading cannot replace a sky.
export const stellarSunDirection=Object.freeze([.48,.19,-.84]);
export const stellarVolumeRegions=Object.freeze([
 {id:'violet-river',center:[-340,220,-920],radius:[760,310,440],color:[.075,.26,.56],density:.00135},
 {id:'cyan-nursery',center:[640,230,-1150],radius:[820,450,460],color:[.26,.12,.43],density:.00165},
 {id:'near-dust',center:[-360,95,-390],radius:[360,150,170],color:[.08,.33,.62],density:.0012},
 {id:'east-return',center:[680,150,180],radius:[430,240,660],color:[.15,.18,.43],density:.00125},
 {id:'rear-tide',center:[-580,220,550],radius:[850,330,500],color:[.06,.22,.38],density:.00155},
 {id:'cloud-sea',kind:'cloud-sea',center:[0,-55,-350],radius:[650,42,450],color:[.24,.34,.49],density:.008}
]);

const triplet=(value,fallback,min=-20000,max=20000)=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite)?value.map(n=>Math.max(min,Math.min(max,n))):[...fallback];
const finite=(value,fallback,min,max)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
export function normalizeStellarLayout(layout={}){
 if(!layout||typeof layout!=='object')layout={};
 const all=(Array.isArray(layout.volumeRegions)?layout.volumeRegions:[]).filter(Boolean);
 const sea=all.find(region=>region.kind==='cloud-sea'||/cloud.?sea/i.test(region.id||region.name||''));
 const input=all.filter(region=>region!==sea).slice(0,5);input[5]=sea;
 const volumeRegions=stellarVolumeRegions.map((fallback,i)=>{
  const region=input[i]||fallback;
  return {id:String(region.id||fallback.id),kind:i===5?'cloud-sea':'nebula',center:triplet(region.center,fallback.center),radius:triplet(region.radius||region.radii,fallback.radius,16,12000),color:triplet(region.color,fallback.color,0,4),density:finite(region.density,fallback.density,0,.04),flow:triplet(region.flow,[[.8,.09,.25],[-.45,.04,.65],[.75,.09,-.2],[-.3,.08,-.55],[.4,.04,-.6],[.65,0,.22]][i],-8,8),seed:finite(region.seed,[11,27,33,51,67,19][i],0,128)};
 });
 const sun=triplet(layout.sunDirection,stellarSunDirection,-1,1),length=Math.hypot(...sun);
 const sunDirection=length>.0001?sun.map(n=>n/length):stellarSunDirection.map(n=>n/Math.hypot(...stellarSunDirection));
 const flowCurves=(Array.isArray(layout.flowCurves)?layout.flowCurves:[]).filter(flow=>flow&&Array.isArray(flow.points)&&flow.points.length>=4&&flow.points.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))).slice(0,8).map(flow=>({
  id:String(flow.id||'stellar-current'),points:flow.points.map(p=>triplet(p,[0,0,0])),color:triplet(flow.color,[.34,.60,.88],0,4),colors:(Array.isArray(flow.colors)?flow.colors:[]).slice(0,4).map(color=>triplet(color,[.34,.60,.88],0,4)),rate:finite(flow.rate,.0042,.0002,.035),emissionRate:finite(flow.emissionRate,.04,.002,.12),width:finite(flow.width,2,.1,16)
 }));
 return {volumeRegions,sunDirection,flowCurves};
}
