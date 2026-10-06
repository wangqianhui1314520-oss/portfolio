// Shared seconds-based choreography for the camera, optics, bridge and interface.
export const OPENING_DURATION=14;
const clamp=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:1));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const between=(t,a,b)=>ease((t-a)/(b-a));
const mix=(a,b,p)=>a+(b-a)*p;
export function openingTimeline(seconds=14,short=false){
 const t=Math.max(0,Math.min(short?2:14,Number.isFinite(seconds)?seconds:14));
 if(short)return {time:t,beat:'identity',route:1,warp:0,flight:0,bridge:1,panel:between(t,.15,.8),identity:between(t,.3,1.2),actions:between(t,.8,1.7),header:between(t,.5,1.4),black:1-between(t,0,.5),bars:0,fov:52};
 let route,fov;
 if(t<2){route=mix(0,.035,between(t,0,2));fov=mix(60,64,between(t,0,2));}
 else if(t<5){route=mix(.035,.63,between(t,2,5));fov=mix(64,70,between(t,2,5));}
 else if(t<6.2){route=mix(.63,.82,between(t,5,6.2));fov=70+Math.sin((t-5)/1.2*Math.PI)*3;}
 else if(t<9){route=mix(.82,.89,between(t,6.2,9));fov=mix(70,61,between(t,6.2,9));}
 else {route=mix(.89,1,between(t,9,11.5));fov=mix(61,52,between(t,9,11.5));}
 return {time:t,route,fov,beat:t<2?'departure':t<5?'nebula':t<6.2?'warp':t<9?'vista':t<11.5?'gateway':'identity',
  warp:t>=5&&t<6.2?Math.pow(Math.sin((t-5)/1.2*Math.PI),1.4):0,
  flight:between(t,1.7,3.6)*(1-between(t,9,11.5)),bridge:between(t,11.1,12.1),panel:between(t,11.7,12.7),
  identity:between(t,12.5,13.35),actions:between(t,13.4,13.9),header:between(t,12.8,13.8),black:1-between(t,0,.85),bars:1-between(t,12.5,14)};
}
