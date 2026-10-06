// Shared, bounded three-dimensional density and emission. The live view and
// low-frequency lighting probe evaluate the same field, seeded data and sun.
// A tiled 3D field: adjacent slices interpolate in Z, rather than sliding a 2D image.
export function createStellarDensityAtlas(THREE) {
  let seed=27191;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const layers=[8,16,32].map(n=>({n,values:Float32Array.from({length:n*n*n},random)}));
  const side=32,tile=34,width=272,height=136,data=new Uint8Array(width*height*4);
  const smooth=x=>x*x*(3-2*x),lerp=(a,b,t)=>a+(b-a)*t;
  function sample({n,values},x,y,z){
    x*=n;y*=n;z*=n;const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=smooth(x-ix),fy=smooth(y-iy),fz=smooth(z-iz);
    const at=(dx,dy,dz)=>values[((iz+dz)%n)*n*n+((iy+dy)%n)*n+(ix+dx)%n];
    return lerp(lerp(lerp(at(0,0,0),at(1,0,0),fx),lerp(at(0,1,0),at(1,1,0),fx),fy),lerp(lerp(at(0,0,1),at(1,0,1),fx),lerp(at(0,1,1),at(1,1,1),fx),fy),fz);
  }
  for(let z=0;z<side;z++)for(let y=0;y<tile;y++)for(let x=0;x<tile;x++){
    const i=((Math.floor(z/8)*tile+y)*width+(z%8)*tile+x)*4;
    for(let c=0;c<3;c++)data[i+c]=Math.round(sample(layers[c],((x-1+side)%side)/side,((y-1+side)%side)/side,z/side)*255);
    data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
  return texture;
}


export const stellarDensityGLSL=`       const float stellarBodyScale=.46;
       vec3 noise3(vec3 p){
         p=fract(p)*32.;float z=floor(p.z),next=mod(z+1.,32.);vec2 tile0=vec2(mod(z,8.),floor(z/8.)),tile1=vec2(mod(next,8.),floor(next/8.));
         // Cubic interpolation in all three axes avoids slice/grid boundaries
         // turning into moving horizontal streaks. It needs the same two reads.
         vec3 fraction=fract(p);fraction=fraction*fraction*(3.-2.*fraction);
         vec2 xy=floor(p.xy)+fraction.xy+1.5;vec3 a=texture2D(uAtlas,(tile0*34.+xy)/vec2(272.,136.)).rgb;
         vec3 b=texture2D(uAtlas,(tile1*34.+xy)/vec2(272.,136.)).rgb;return mix(a,b,fraction.z);
       }
       vec4 stellarNurseryProfile(float seed){
         float drift=.017*sin(uTime*.056+seed);
         if(abs(seed-27.)<.5)return vec4(-.06+drift,.15,-.25,1.);
         if(abs(seed-11.)<.5)return vec4(.26+drift,.32,.16,.28);
         if(abs(seed-51.)<.5)return vec4(-.08+drift,.23,-.18,.48);
         if(abs(seed-67.)<.5)return vec4(.15+drift,.32,.09,.52);
         return vec4(0.);
       }
       float field(vec3 p,float seed,vec3 advection,float sea,out vec3 q,out vec3 features){
         float t=uTime*.14;
         if(sea>.5){
          // The low cloud sea uses its own slow 3D advection. Upper billows
          // light from the same stellar sun, with dense blue-grey undersides.
          vec3 advect=advection*uTime;
          q=vec3(p.x*.88,p.y*.65,p.z*.92)+advect;
          vec3 macro=noise3(q*.68+vec3(.23,.17,.42));
          q+=(macro-.5)*vec3(.26,.31,.24);
          vec3 coarse=noise3(q),detail=noise3(q*2.17+advect*.7);
          float billow=coarse.r*.61+detail.g*.39;
          float height=.02+(coarse.b-.5)*.68;
          float roof=1.-smoothstep(height-.12,height+.48,p.y);
          float boundary=max(0.,1.-dot(p,p));
          float underside=smoothstep(-.95,-.57,p.y);
          features=vec3(coarse.r,coarse.g,detail.g);
          return smoothstep(.43,.70,billow)*roof*underside*sqrt(boundary)*.58;
         }
         // Macro advection and a faster, smaller curl move density silhouettes,
         // holes and lit filaments continuously through the actual volume.
         // Differential channel speeds prevent a rigid translated cloud plate.
         vec3 flow=vec3(sin(p.y*2.3+t+seed)*cos(p.z*1.7-t*.6),sin(p.z*2.1-t*.7)*cos(p.x*1.4+seed),cos(p.x*2.0+t*.65+seed)*sin(p.y*1.8-t*.4));
         // Sheared, anisotropic density stretches into long wisps. A spherical
         // noise field produced soft bubbles even though it was genuinely 3D.
         q=vec3(p.x*.44+p.y*.22-p.z*.25,p.y*.74-p.x*.38+p.z*.12,p.z*.70+p.x*.22)+flow*.09+vec3(seed,0.,0.)+advection*uTime;
         vec3 warp=noise3(q*.38+vec3(.07+uTime*.0042,.19-uTime*.0028,.13+uTime*.0036))-.5;
         // Different existing noise channels circulate through one another;
         // the smaller eddies need no extra atlas reads or trigonometric loop.
         vec3 curl=vec3(warp.y-warp.z,warp.z-warp.x,warp.x-warp.y);
         q+=warp*vec3(.24,.18,.22)+curl*.04;
         // The coarse channel defines entire cloud masses. Smaller channels
         // roughen their boundary gently instead of becoming a noisy skyline.
         vec3 n=noise3(q*stellarBodyScale);float detail=noise3(q*.94+vec3(seed*.13+uTime*.0022,-uTime*.0014,uTime*.0018)).g;
         float fine=n.b;if(uDetail>.5)fine=noise3(q*1.12-vec3(seed*.07)+vec3(-uTime*.0034,uTime*.0022,-uTime*.0018)).b;
         float ridge=1.-abs(detail*2.-1.);ridge=ridge*ridge*ridge;
         float f=n.r*.84+detail*.12+fine*.04;
         float envelope=max(0.,1.-dot(p,p));envelope*=sqrt(envelope);
         float cavity=smoothstep(.54,.72,n.g*.50+(warp.z+.5)*.50);
         float dust=smoothstep(.48,.72,n.g*.76+detail*.24)*(1.-cavity*.35);
         // A broad, curved absorbing seam belongs to the world volume. Its
         // dense underside interrupts the luminous cloud with a deep fissure.
         float dustPlane=p.y+.58*p.x-.38*p.z-.10-.12*sin(p.x*2.1+seed*.31+t*.10);
         float dustRift=exp(-pow(dustPlane*6.1,2.))*smoothstep(-.60,.28,p.x+p.z*.32);
         dust=max(dust,dustRift*.88);
         // Thin strands survive beside the brighter broad lobes. Their dark
         // channels absorb light; the larger cavities reveal stars behind them.
         float bulk=pow(smoothstep(.40,.68,f),1.35);
         float strands=pow(ridge,2.)*smoothstep(.46,.72,n.r)*.028;
         float lane=1.;
         // A sloping river and broad clear gaps keep the observatory outside
         // the clouds. The composition belongs to the world, not the screen.
         float river=exp(-pow((p.y-.90*p.x+.30*p.z-.17*sin(p.x*1.9+seed*.31)-warp.z*.18) * 2.8,2.));
         float branch=exp(-pow((p.y+.54*p.x-.24*p.z-.43)*3.3,2.))*.22;
         river=max(river,branch);
         float voids=smoothstep(.52,.68,(warp.x+.5)*.74+n.g*.26);
         features=vec3(n.r,dust,ridge);
         // A finite nursery medium surrounds the one luminous core on the
         // right-hand far cloud. Its neighbouring dust stays transparent.
         vec4 nurseryProfile=stellarNurseryProfile(seed);
         vec3 core=(p-nurseryProfile.xyz)*vec3(1.7,2.4,1.3);
         float nursery=nurseryProfile.w*exp(-dot(core,core)*10.);
         return ((bulk+strands)*(1.-cavity*.88)*lane*(.018+river*.982)*(1.-voids*.94)*2.60*(1.+dustRift*.25)+nursery*.28)*envelope;
       }
`;
export const stellarLightSourceGLSL=`vec3 stellarLightSource(vec3 p,vec3 q,vec3 features,vec3 tint,float seed,float sea,vec3 ray,vec3 lightDirection,float shadow,float influence){
 float pointerSpeed=clamp(uPointerSpeed,0.,1.);vec3 lit=noise3(q*mix(stellarBodyScale,1.,sea)+lightDirection*.045);
           float edge=clamp((features.x-lit.r)*5.+.54,.08,1.);
           float rim=pow(clamp((features.x-lit.r)*5.,0.,1.),2.);
           float phase=.64+.30*pow(max(0.,dot(ray,-lightDirection)),3.);
           float secondary=clamp((lit.g-features.y*.24)*.42,.02,.26);
           vec3 pearl=mix(tint,vec3(.18,.39,.72),rim*.14);
           vec3 color=pearl*(.040+shadow*(.12+edge*.48))*phase;
           color+=vec3(.08,.22,.42)*secondary+vec3(.35,.19,.60)*rim*.11*features.z;
           // A small sunward dust shoulder borrows the same warm key as the
           // ceramic deck. Dense lanes remain dark enough to reveal depth.
           float sunward=smoothstep(-.28,.62,dot(normalize(p+vec3(.0001)),lightDirection));
           color+=vec3(.46,.24,.12)*rim*sunward*.10;
           color=mix(color,vec3(.005,.009,.022),features.y*.69);
           if(influence>.0001){
             vec3 responseColor=mix(vec3(.26,.59,.73),vec3(.54,.39,.71),.5+.5*sin(seed*4.7+uTime*.18));
             color=mix(color,color*.78+responseColor*.25,influence*(.38+pointerSpeed*.24));
             color+=vec3(.13,.25,.31)*rim*influence*(.15+pointerSpeed*.16);
           }
           color+=vec3(.10,.16,.25)*uPulse*.028;
           if(sea>.5){
            float sunGlaze=pow(clamp(dot(ray,-lightDirection),0.,1.),3.);
            color=mix(vec3(.023,.044,.082),vec3(.13,.21,.32),shadow)*(.66+edge*.22);
            color+=vec3(.34,.15,.065)*shadow*(.08+sunGlaze*.20)*smoothstep(-.25,.6,p.y);
           }else{
            // Finite glowing nurseries sit inside the cloud, hidden by its
            // foreground dust. They move within the real medium, never in UVs.
            vec4 nurseryProfile=stellarNurseryProfile(seed);
            vec3 coreOffset=(p-nurseryProfile.xyz)*vec3(1.7,2.4,1.3);
            float heart=exp(-dot(coreOffset,coreOffset)*10.)*nurseryProfile.w;
            float filaments=pow(features.z,3.)*smoothstep(.38,.66,features.x)*(1.-features.y*.8);
            // Internal emission is screened by actual local dust before the
            // foreground integration adds its additional 3D extinction.
            float dustEscape=1.-features.y*.90;
            color+=mix(vec3(.15,.42,.98),vec3(.58,.25,.98),(.5+.5*sin(seed*.73)))*(heart*7.8+filaments*.42)*dustEscape;
            color+=vec3(1.12,.67,.32)*heart*heart*.70*dustEscape;
           }
return color;
}
`;
export const stellarPointerGLSL=`vec3 stellarPointerPosition(vec3 world,vec3 center,vec3 radii,out float influence){
 vec3 p=(world-center)/radii;influence=0.;
 if(uPointerPower>.0001){vec3 delta=world-uPointerOrigin;float along=dot(delta,uPointerDirection);
  vec3 across=delta-uPointerDirection*along;float reach=72.+clamp(along,0.,1400.)*.095;
  float depthGate=smoothstep(35.,140.,along)*(1.-smoothstep(1400.,2800.,along));
  influence=exp(-dot(across,across)/(reach*reach))*depthGate*clamp(uPointerPower,0.,1.);
  float turn=(.16+clamp(uPointerSpeed,0.,1.)*.22)*(.84+.16*sin(uTime*.32+along*.004));
  p+=(cross(uPointerDirection,across)*turn-across*.055)*influence/radii;
 }
 return p;
}
`;
export const stellarVolumeUniformNames=Object.freeze(['uAtlas','uTime','uDensity','uDetail','uSeaReveal','uCenters','uRadii','uColors','uExtinction','uSeeds','uFlows','uSun','uPulse','uPointerOrigin','uPointerDirection','uPointerPower','uPointerSpeed']);

// A lighting probe integrates the same finite volumes at lower frequency.
// It is prefiltered by PMREM, so no extra full-screen pass is required.
export const stellarProbeGLSL=`
 vec2 stellarProbeSpan(vec3 ray,vec3 center,vec3 radii){
  vec3 o=(uProbeOrigin-center)/radii,d=ray/radii;float a=dot(d,d),b=dot(o,d),c=dot(o,o)-1.,disc=b*b-a*c;
  if(disc<=0.)return vec2(1e6,-1.);float r=sqrt(disc);return vec2(max(0.,(-b-r)/a),min(5200.,(-b+r)/a));
 }
 void stellarProbeLayer(vec3 ray,vec2 span,vec3 center,vec3 radii,vec3 tint,float seed,float extinction,vec3 flowRate,float sea,inout vec4 fog){
  if(span.y<=span.x||fog.a>.94)return;
  float steps=sea>.5?min(uRadianceSteps,8.):uRadianceSteps,stride=(span.y-span.x)/steps;
  vec3 sun=normalize(uSun);float blocker=0.,farBlocker=0.;
  for(int i=0;i<16;i++){
   if(float(i)>=steps||fog.a>.94)break;
   vec3 world=uProbeOrigin+ray*(span.x+(float(i)+.5)*stride),q,features;
   float influence;vec3 p=stellarPointerPosition(world,center,radii,influence);
   float density=field(p,seed,flowRate/radii,sea,q,features);if(density<.008)continue;
   density*=1.-influence*(.045+clamp(uPointerSpeed,0.,1.)*.065);
   vec3 scratch,scratchFeatures;float probeStep=sea>.5?18.:55.;
   if(mod(float(i),3.)<.5){
    blocker=field(p+sun*probeStep/radii,seed,flowRate/radii,sea,scratch,scratchFeatures);
    farBlocker=field(p+sun*(probeStep*2.8)/radii,seed,flowRate/radii,sea,scratch,scratchFeatures);
   }
   float shadow=exp(-(blocker+farBlocker*.55)*extinction*probeStep*4.5-density*.22);
   vec3 source=stellarLightSource(p,q,features,tint,seed,sea,ray,sun,shadow,influence);
   float layer=sea>.5?uSeaReveal:1.;
   float alpha=1.-exp(-density*stride*extinction*uDensity*layer*(.82+features.y*.42));
   fog.rgb+=(1.-fog.a)*alpha*source;fog.a+=(1.-fog.a)*alpha;
  }
 }
 vec3 stellarProbeRadiance(vec3 ray){
  vec2 a=stellarProbeSpan(ray,uCenters[0],uRadii[0]),b=stellarProbeSpan(ray,uCenters[1],uRadii[1]),c=stellarProbeSpan(ray,uCenters[2],uRadii[2]);
  vec2 d=stellarProbeSpan(ray,uCenters[3],uRadii[3]),e=stellarProbeSpan(ray,uCenters[4],uRadii[4]),f=uSeaReveal>.001?stellarProbeSpan(ray,uCenters[5],uRadii[5]):vec2(1e6,-1.);
  vec4 fog=vec4(0.);
  for(int layer=0;layer<6;layer++){
   float nearest=min(min(a.x,b.x),min(c.x,min(d.x,min(e.x,f.x))));if(nearest>999999.||fog.a>.94)break;
   if(a.x<=nearest){stellarProbeLayer(ray,a,uCenters[0],uRadii[0],uColors[0],uSeeds[0],uExtinction[0],uFlows[0],0.,fog);a=vec2(1e6,-1.);}
   else if(b.x<=nearest){stellarProbeLayer(ray,b,uCenters[1],uRadii[1],uColors[1],uSeeds[1],uExtinction[1],uFlows[1],0.,fog);b=vec2(1e6,-1.);}
   else if(c.x<=nearest){stellarProbeLayer(ray,c,uCenters[2],uRadii[2],uColors[2],uSeeds[2],uExtinction[2],uFlows[2],0.,fog);c=vec2(1e6,-1.);}
   else if(d.x<=nearest){stellarProbeLayer(ray,d,uCenters[3],uRadii[3],uColors[3],uSeeds[3],uExtinction[3],uFlows[3],0.,fog);d=vec2(1e6,-1.);}
   else if(e.x<=nearest){stellarProbeLayer(ray,e,uCenters[4],uRadii[4],uColors[4],uSeeds[4],uExtinction[4],uFlows[4],0.,fog);e=vec2(1e6,-1.);}
   else{stellarProbeLayer(ray,f,uCenters[5],uRadii[5],uColors[5],uSeeds[5],uExtinction[5],uFlows[5],1.,fog);f=vec2(1e6,-1.);}
  }
  return fog.rgb;
 }
`;

// Explicit invalidation is allowed while motion is frozen; ordinary updates
// reuse the exact captured environment until the world clock reaches its budget.
export function createRadianceCapturePolicy(){
 let dirty=true,lastTime=-Infinity,lastTier=null;
 return {
  invalidate(){dirty=true;},
  shouldCapture({time=0,motion=true,force=false,quality=1}={}){
   const clock=Number.isFinite(time)?time:0,tier=quality<.75?'low':'full';
   return force||dirty||lastTier!==tier||motion&&(clock<lastTime||clock-lastTime>=(tier==='low'?24:12));
  },
  remember({time=0,quality=1}={}){lastTime=Number.isFinite(time)?time:0;lastTier=quality<.75?'low':'full';dirty=false;},
  get lastTime(){return lastTime;}
 };
}
