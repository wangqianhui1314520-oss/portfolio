import * as THREE from 'three';
import { normalizeStellarLayout } from './immersive-world-layout.js?v=cinematic-v21.1';
import { createStellarDensityAtlas, stellarDensityGLSL, stellarLightSourceGLSL, stellarPointerGLSL } from './immersive-volume-field.js?v=cinematic-v21.1';
import { Pass, FullScreenQuad } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/postprocessing/Pass.js';

const screenVertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

export class NebulaPass extends Pass {
  constructor({camera,time,velocity,pulse,compact,interaction}) {
    super();this.camera=camera;this.compact=compact;this.scale=compact()?.42:.42;this.quality=null;this.mobile=compact();this.layoutTargets=normalizeStellarLayout();
    this.target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
    this.target.texture.name='Tem.nebula.volume';this.atlas=createStellarDensityAtlas(THREE);
    // Share the exact world ray maintained by the render loop. The inert
    // defaults preserve callers which do not provide the interaction channel.
    this.interactionUniforms={
      uPointerOrigin:interaction?.uniforms?.uPointerOrigin||{value:new THREE.Vector3()},
      uPointerDirection:interaction?.uniforms?.uPointerDirection||{value:new THREE.Vector3(0,0,-1)},
      uPointerPower:interaction?.uniforms?.uPointerPower||{value:0},
      uPointerSpeed:interaction?.uniforms?.uPointerSpeed||{value:0}
    };
    this.uniforms={uDepth:{value:null},uAtlas:{value:this.atlas},uTime:time,uVelocity:velocity,uPulse:pulse,
      uInvProjection:{value:new THREE.Matrix4()},uCameraMatrix:{value:new THREE.Matrix4()},uCamera:{value:new THREE.Vector3()},
      uDensity:{value:1},uDetail:{value:1},uSteps:{value:compact()?20:32},uResolution:{value:new THREE.Vector2()},uFocus:{value:new THREE.Vector3()},uFocusPower:{value:0},
      uCenters:{value:this.layoutTargets.volumeRegions.map(region=>new THREE.Vector3(...region.center))},
      uRadii:{value:this.layoutTargets.volumeRegions.map(region=>new THREE.Vector3(...region.radius))},
      uColors:{value:this.layoutTargets.volumeRegions.map(region=>new THREE.Color().setRGB(...region.color))},
      uExtinction:{value:this.layoutTargets.volumeRegions.map(region=>region.density)},uSeeds:{value:this.layoutTargets.volumeRegions.map(region=>region.seed)},uFlows:{value:this.layoutTargets.volumeRegions.map(region=>new THREE.Vector3(...region.flow))},uSun:{value:new THREE.Vector3(...this.layoutTargets.sunDirection)},
      uSeaReveal:{value:0},...this.interactionUniforms};
    const steps=34;
    this.volumeMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,toneMapped:false,
      vertexShader:screenVertex,
      fragmentShader:`varying vec2 vUv;uniform sampler2D uDepth,uAtlas;uniform float uTime,uDensity,uVelocity,uPulse,uFocusPower,uSteps,uDetail;uniform vec2 uResolution;
       uniform mat4 uInvProjection,uCameraMatrix;uniform vec3 uCamera,uFocus,uCenters[6],uRadii[6],uColors[6],uFlows[6],uSun,uPointerOrigin,uPointerDirection;uniform float uPointerPower,uPointerSpeed,uExtinction[6],uSeeds[6],uSeaReveal;
       ${stellarDensityGLSL}
       ${stellarPointerGLSL}
       ${stellarLightSourceGLSL}
       vec2 interval(vec3 ray,vec3 center,vec3 radii,float limit){
         vec3 o=(uCamera-center)/radii,d=ray/radii;float a=dot(d,d),b=dot(o,d),c=dot(o,o)-1.,disc=b*b-a*c;
         if(disc<=0.)return vec2(1e6,-1.);float r=sqrt(disc);return vec2(max(0.,(-b-r)/a),min(limit,(-b+r)/a));
       }
       void integrate(vec3 ray,vec2 span,vec3 center,vec3 radii,vec3 tint,float seed,float extinction,vec3 flowRate,float sea,inout vec4 fog){
         if(span.y<=span.x||fog.a>.94)return;
         float marchSteps=sea>.5?min(uSteps,20.):uSteps;float stride=(span.y-span.x)/marchSteps;
         // Spatial jitter breaks march bands without introducing temporal sparkle.
         // Low-amplitude spatial stratification avoids coarse white-noise
         // dots. Its phase never changes with time or the quality tier.
         float jitter=.42+fract(sin(dot(floor(vUv*uResolution),vec2(12.9898,78.233)))*43758.5453)*.16;
         vec3 lightDirection=normalize(uSun);
         float pointerSpeed=clamp(uPointerSpeed,0.,1.),blocker=0.,farBlocker=0.;
         for(int i=0;i<${steps};i++){
           if(float(i)>=marchSteps)break;
           float distance=span.x+(float(i)+jitter)*stride;vec3 world=uCamera+ray*distance,q;
           float influence;vec3 p=stellarPointerPosition(world,center,radii,influence);
           vec3 features;float den=field(p,seed,flowRate/radii,sea,q,features);if(den<.008)continue;
           den*=1.-influence*(.045+pointerSpeed*.065);
           // Two sunward probes in the same bounded 3D density field provide
           // self-occlusion rather than a painted shadow on a sliding cloud.
           vec3 shadowQ,shadowFeatures;
           float probeStep=sea>.5?18.:55.;
           if(mod(float(i),4.)<.5){blocker=field(p+lightDirection*probeStep/radii,seed,flowRate/radii,sea,shadowQ,shadowFeatures);
            farBlocker=field(p+lightDirection*(probeStep*2.8)/radii,seed,flowRate/radii,sea,shadowQ,shadowFeatures);}
           float shadow=exp(-(blocker+farBlocker*.55)*extinction*probeStep*4.5-den*.22);
           vec3 color=stellarLightSource(p,q,features,tint,seed,sea,ray,lightDirection,shadow,influence);
           float layer=sea>.5?uSeaReveal:1.;
           float absorption=1.-exp(-den*stride*extinction*uDensity*layer*(.82+features.y*.42));
           fog.rgb+=(1.-fog.a)*absorption*color;fog.a+=(1.-fog.a)*absorption;
           if(fog.a>.94)break;
         }
       }
       void main(){
         vec2 ndc=vUv*2.-1.;vec4 farView=uInvProjection*vec4(ndc,1.,1.);vec3 ray=normalize(mat3(uCameraMatrix)*(farView.xyz/farView.w));
         float depth=texture2D(uDepth,vUv).r;vec4 hit=uInvProjection*vec4(ndc,depth*2.-1.,1.);
         float limit=depth<.999999?length(hit.xyz/hit.w):5200.;
         if(limit<2.){gl_FragColor=vec4(0.);return;}
         vec2 a=interval(ray,uCenters[0],uRadii[0],limit),b=interval(ray,uCenters[1],uRadii[1],limit),c=interval(ray,uCenters[2],uRadii[2],limit);
         vec2 d=interval(ray,uCenters[3],uRadii[3],limit),e=interval(ray,uCenters[4],uRadii[4],limit),f=uSeaReveal>.001?interval(ray,uCenters[5],uRadii[5],limit):vec2(1e6,-1.);
         // Integrate the actual nearest lobe first in every archive heading.
         // Fixed branches avoid dynamic uniform-array indexing on older GPUs.
         vec4 fog=vec4(0.);
         for(int layer=0;layer<6;layer++){
           float nearest=min(min(a.x,b.x),min(c.x,min(d.x,min(e.x,f.x))));if(nearest>999999.||fog.a>.94)break;
           if(a.x<=nearest){integrate(ray,a,uCenters[0],uRadii[0],uColors[0],uSeeds[0],uExtinction[0],uFlows[0],0.0,fog);a=vec2(1e6,-1.);}
           else if(b.x<=nearest){integrate(ray,b,uCenters[1],uRadii[1],uColors[1],uSeeds[1],uExtinction[1],uFlows[1],0.0,fog);b=vec2(1e6,-1.);}
           else if(c.x<=nearest){integrate(ray,c,uCenters[2],uRadii[2],uColors[2],uSeeds[2],uExtinction[2],uFlows[2],0.0,fog);c=vec2(1e6,-1.);}
           else if(d.x<=nearest){integrate(ray,d,uCenters[3],uRadii[3],uColors[3],uSeeds[3],uExtinction[3],uFlows[3],0.0,fog);d=vec2(1e6,-1.);}
           else if(e.x<=nearest){integrate(ray,e,uCenters[4],uRadii[4],uColors[4],uSeeds[4],uExtinction[4],uFlows[4],0.0,fog);e=vec2(1e6,-1.);}
           else{integrate(ray,f,uCenters[5],uRadii[5],uColors[5],uSeeds[5],uExtinction[5],uFlows[5],1.0,fog);f=vec2(1e6,-1.);}
         }
         gl_FragColor=fog;
       }`
    });
    this.compositeMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
      uniforms:{tDiffuse:{value:null},uFog:{value:this.target.texture},uDepth:this.uniforms.uDepth,uSize:this.uniforms.uResolution,uNear:{value:camera.near},uFar:{value:camera.far}},
      vertexShader:screenVertex,
      fragmentShader:`varying vec2 vUv;uniform sampler2D tDiffuse,uFog,uDepth;uniform vec2 uSize;uniform float uNear,uFar;
       float viewDepth(float depth){return uNear*uFar/(uFar-depth*(uFar-uNear));}
       // Half-float HDR edge samples must remain finite before bloom spreads
       // them across the frame. Retain useful HDR energy, reject invalid data.
       float finiteHDR(float c){return c>=0.&&c<65504.?min(c,64.):0.;}
       vec3 safeHDR(vec3 c){return vec3(finiteHDR(c.r),finiteHDR(c.g),finiteHDR(c.b));}
       void main(){
         vec3 source=safeHDR(texture2D(tDiffuse,vUv).rgb);float depth=viewDepth(texture2D(uDepth,vUv).r);
         vec2 grid=vUv*uSize-.5,base=(floor(grid)+.5)/uSize,blend=fract(grid);vec4 fog=vec4(0.);float sum=0.;
         for(int y=0;y<2;y++)for(int x=0;x<2;x++){
           vec2 uv=base+vec2(float(x),float(y))/uSize;float other=viewDepth(texture2D(uDepth,uv).r);
           float weight=(x==0?1.-blend.x:blend.x)*(y==0?1.-blend.y:blend.y)*exp(-abs(depth-other)/(.75+depth*.018));
           fog+=texture2D(uFog,uv)*weight;sum+=weight;
         }
         fog=sum>.00001?fog/sum:texture2D(uFog,vUv);
         fog.rgb=safeHDR(fog.rgb);fog.a=fog.a>=0.&&fog.a<=1.?fog.a:0.;
         gl_FragColor=vec4(source*(1.-fog.a)+fog.rgb,1.);
       }`
    });
    this.quad=new FullScreenQuad(this.volumeMaterial);
    this.volumeCacheValid=false;this.volumeCamera=new THREE.Matrix4();this.volumeProjection=new THREE.Matrix4();
    this.volumeSun=new THREE.Vector3();this.volumePosition=new THREE.Vector3();this.volumeFocus=new THREE.Vector3();this.volumePointerOrigin=new THREE.Vector3();this.volumePointerDirection=new THREE.Vector3();this.volumeScalars=new Float64Array(9);this.volumeLobes=new Float64Array(84);
    this.cacheCanvas=document.getElementById('space');this.volumeCacheStatus='';this.volumeFrames=0;
  }
  setWorldLayout(layout){this.layoutTargets=normalizeStellarLayout(layout);this.invalidate();if(this.cacheCanvas){this.cacheCanvas.dataset.nebulaRegions='5 bounded stellar volumes + 1 depth-clipped cloud sea';this.cacheCanvas.dataset.nebulaSun=this.layoutTargets.sunDirection.map(n=>n.toFixed(3)).join(',');}}
  setCloudSeaEnabled(reveal=1){this.uniforms.uSeaReveal.value=THREE.MathUtils.clamp(Number(reveal)||0,0,1);if(this.cacheCanvas)this.cacheCanvas.dataset.nebulaSea=this.uniforms.uSeaReveal.value>.001?'depth-aware-volume':'hidden';}
  updateLayout(dt){
    const factor=1-Math.exp(-Math.max(0,Math.min(.1,dt))*2.1),u=this.uniforms;
    this.layoutTargets.volumeRegions.forEach((region,i)=>{
      const c=u.uCenters.value[i],r=u.uRadii.value[i],color=u.uColors.value[i];
      c.set(THREE.MathUtils.lerp(c.x,region.center[0],factor),THREE.MathUtils.lerp(c.y,region.center[1],factor),THREE.MathUtils.lerp(c.z,region.center[2],factor));
      r.set(THREE.MathUtils.lerp(r.x,region.radius[0],factor),THREE.MathUtils.lerp(r.y,region.radius[1],factor),THREE.MathUtils.lerp(r.z,region.radius[2],factor));
      color.setRGB(THREE.MathUtils.lerp(color.r,region.color[0],factor),THREE.MathUtils.lerp(color.g,region.color[1],factor),THREE.MathUtils.lerp(color.b,region.color[2],factor));
      u.uExtinction.value[i]=THREE.MathUtils.lerp(u.uExtinction.value[i],region.density,factor);
      u.uSeeds.value[i]=region.seed;const flow=u.uFlows.value[i];flow.set(THREE.MathUtils.lerp(flow.x,region.flow[0],factor),THREE.MathUtils.lerp(flow.y,region.flow[1],factor),THREE.MathUtils.lerp(flow.z,region.flow[2],factor));
    });
    const sun=this.layoutTargets.sunDirection;u.uSun.value.set(THREE.MathUtils.lerp(u.uSun.value.x,sun[0],factor),THREE.MathUtils.lerp(u.uSun.value.y,sun[1],factor),THREE.MathUtils.lerp(u.uSun.value.z,sun[2],factor)).normalize();
  }
  invalidate(){this.volumeCacheValid=false;}
  matchesVolumeCache(){
    const u=this.uniforms,s=this.volumeScalars;
    if(!this.volumeCacheValid||!this.volumeCamera.equals(this.camera.matrixWorld)||!this.volumeProjection.equals(this.camera.projectionMatrixInverse)||!this.volumePosition.equals(this.camera.position)||!this.volumeFocus.equals(u.uFocus.value)||!this.volumeSun.equals(u.uSun.value))return false;
    if(!this.volumePointerOrigin.equals(u.uPointerOrigin.value)||!this.volumePointerDirection.equals(u.uPointerDirection.value))return false;
    if(s[0]!==u.uTime.value||s[1]!==u.uDensity.value||s[2]!==u.uFocusPower.value||s[3]!==u.uPulse.value||s[4]!==u.uSteps.value||s[5]!==u.uDetail.value)return false;
    if(s[6]!==u.uPointerPower.value||s[7]!==u.uPointerSpeed.value||s[8]!==u.uSeaReveal.value)return false;
    for(let i=0;i<6;i++){
      const c=u.uCenters.value[i],r=u.uRadii.value[i],t=u.uColors.value[i],o=i*14,b=this.volumeLobes;
      if(b[o]!==c.x||b[o+1]!==c.y||b[o+2]!==c.z||b[o+3]!==r.x||b[o+4]!==r.y||b[o+5]!==r.z||b[o+6]!==t.r||b[o+7]!==t.g||b[o+8]!==t.b||b[o+9]!==u.uExtinction.value[i]||b[o+10]!==u.uSeeds.value[i]||b[o+11]!==u.uFlows.value[i].x||b[o+12]!==u.uFlows.value[i].y||b[o+13]!==u.uFlows.value[i].z)return false;
    }
    return true;
  }
  rememberVolume(){
    const u=this.uniforms,s=this.volumeScalars;this.volumeCamera.copy(this.camera.matrixWorld);this.volumeProjection.copy(this.camera.projectionMatrixInverse);this.volumePosition.copy(this.camera.position);this.volumeFocus.copy(u.uFocus.value);this.volumeSun.copy(u.uSun.value);
    this.volumePointerOrigin.copy(u.uPointerOrigin.value);this.volumePointerDirection.copy(u.uPointerDirection.value);
    s[0]=u.uTime.value;s[1]=u.uDensity.value;s[2]=u.uFocusPower.value;s[3]=u.uPulse.value;s[4]=u.uSteps.value;s[5]=u.uDetail.value;
    s[6]=u.uPointerPower.value;s[7]=u.uPointerSpeed.value;s[8]=u.uSeaReveal.value;
    for(let i=0;i<6;i++){const c=u.uCenters.value[i],r=u.uRadii.value[i],t=u.uColors.value[i],o=i*14,b=this.volumeLobes;b[o]=c.x;b[o+1]=c.y;b[o+2]=c.z;b[o+3]=r.x;b[o+4]=r.y;b[o+5]=r.z;b[o+6]=t.r;b[o+7]=t.g;b[o+8]=t.b;b[o+9]=u.uExtinction.value[i];b[o+10]=u.uSeeds.value[i];b[o+11]=u.uFlows.value[i].x;b[o+12]=u.uFlows.value[i].y;b[o+13]=u.uFlows.value[i].z;}
    this.volumeCacheValid=true;
  }
  setSize(width,height){
    this.invalidate();
    this.width=width;this.height=height;
    // The bilateral upsample preserves sharp hull/pane silhouettes. Limit only
    // the soft volume buffer, instead of softening every scene texture on 4K.
    const cap=this.compact()?96000:230000,scale=Math.min(this.scale,Math.sqrt(cap/Math.max(1,width*height)));
    this.target.setSize(Math.max(1,Math.floor(width*scale)),Math.max(1,Math.floor(height*scale)));
    this.uniforms.uResolution.value.set(this.target.width,this.target.height);
  }
  setQuality(value){
    const mobile=this.compact();if(value===this.quality&&mobile===this.mobile)return;
    this.invalidate();
    this.quality=value;this.mobile=mobile;const scale=(mobile?.42:.42)*(value<.75?.72:value<.90?.88:1);
    this.uniforms.uSteps.value=mobile?(value<.75?14:20):(value<.75?18:value<.90?24:32);this.uniforms.uDetail.value=1; // identical cloud shape across quality tiers
    if(scale!==this.scale){this.scale=scale;this.setSize(this.width||innerWidth,this.height||innerHeight);}
  }
  render(renderer,writeBuffer,readBuffer){
    this.uniforms.uDepth.value=readBuffer.depthTexture;this.uniforms.uCamera.value.copy(this.camera.position);
    this.uniforms.uCameraMatrix.value.copy(this.camera.matrixWorld);this.uniforms.uInvProjection.value.copy(this.camera.projectionMatrixInverse);
    // Frozen reading/reduced-motion views can reuse their exact density+depth
    // result. Composite still runs over the current frame, including video RGB.
    // Geometry/depth changes outside the world clock must call invalidate().
    const reused=this.matchesVolumeCache();
    if(!reused){this.quad.material=this.volumeMaterial;renderer.setRenderTarget(this.target);this.quad.render(renderer);this.rememberVolume();this.volumeFrames++;}
    const status=reused?'reused':'live';if(status!==this.volumeCacheStatus||!reused&&this.volumeFrames%60===0){this.volumeCacheStatus=status;if(this.cacheCanvas){this.cacheCanvas.dataset.nebulaCache=status;this.cacheCanvas.dataset.nebulaVolumeFrames=String(this.volumeFrames);}}
    this.compositeMaterial.uniforms.tDiffuse.value=readBuffer.texture;this.quad.material=this.compositeMaterial;
    renderer.setRenderTarget(this.renderToScreen?null:writeBuffer);this.quad.render(renderer);
  }
  dispose(){this.target.dispose();this.atlas.dispose();this.volumeMaterial.dispose();this.compositeMaterial.dispose();this.quad.dispose();}
}
