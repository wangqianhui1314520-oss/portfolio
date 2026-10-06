import * as THREE from 'three';

// A local optical medium inside the actual curved T prism. This proxy shares
// the shell's silhouette and scene depth; it needs no scene capture or FBO.
export function createIdentityVolume({parent,geometry,camera,interaction,compact=()=>innerWidth<701}){
 if(!parent||!geometry||!camera)throw new Error('Identity volume requires its prism, parent and camera.');
 if(!geometry.boundingBox)geometry.computeBoundingBox();
 const bounds=geometry.boundingBox;
 const u={uTime:{value:0},uEnergy:{value:0},uVisibility:{value:1},uSteps:{value:compact()?8:14},
  uLocalEye:{value:new THREE.Vector3()},uBoxMin:{value:bounds.min.clone()},uBoxMax:{value:bounds.max.clone()},
  uLocalPointerOrigin:{value:new THREE.Vector3()},uLocalPointerDirection:{value:new THREE.Vector3(0,0,-1)},uPointerPower:{value:0}};
 // Samples belong to the inner optical medium, rather than the thicker shell.
 // Spending the same steps on empty glass made the narrow Z noise alias.
 u.uBoxMin.value.z=-.34;u.uBoxMax.value.z=.34;
 // r161 captures the opaque list before physical transmission. Blend the
 // medium in that list so the glass refracts its contents instead of receiving
 // a transparent overlay afterward. Alpha remains the normal coverage rule.
 const material=new THREE.ShaderMaterial({uniforms:u,transparent:false,blending:THREE.CustomBlending,
  blendSrc:THREE.SrcAlphaFactor,blendDst:THREE.OneMinusSrcAlphaFactor,blendEquation:THREE.AddEquation,
  blendSrcAlpha:THREE.OneFactor,blendDstAlpha:THREE.OneMinusSrcAlphaFactor,blendEquationAlpha:THREE.AddEquation,
  depthWrite:false,depthTest:true,side:THREE.BackSide,toneMapped:false,
  vertexShader:'varying vec3 vLocal;void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 vLocal;
   uniform float uTime,uEnergy,uVisibility,uSteps,uPointerPower;
   uniform vec3 uLocalEye,uBoxMin,uBoxMax,uLocalPointerOrigin,uLocalPointerDirection;
   float hash(vec3 p){p=fract(p*.3183099+vec3(.17,.31,.13));p*=19.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
   float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}
   float silhouette(vec3 p){
    float stem=(1.-smoothstep(.42,.49,abs(p.x)))*smoothstep(-2.70,-2.53,p.y)*(1.-smoothstep(1.83,2.02,p.y));
    float bar=(1.-smoothstep(2.23,2.40,abs(p.x)))*smoothstep(1.81,1.96,p.y)*(1.-smoothstep(2.61,2.74,p.y));
    return max(stem,bar)*(1.-smoothstep(.25,.32,abs(p.z)));
   }
   void main(){
    if(uVisibility<.001)discard;
    vec3 ray=normalize(vLocal-uLocalEye);
    // Avoid reciprocal zero while preserving the side of a nearly axial ray.
    vec3 safeRay=mix(vec3(-1.),vec3(1.),step(vec3(0.),ray))*max(abs(ray),vec3(.00001));
    vec3 lo=(uBoxMin-uLocalEye)/safeRay,hi=(uBoxMax-uLocalEye)/safeRay;
    vec3 entry3=min(lo,hi),exit3=max(lo,hi);
    float entry=max(max(entry3.x,entry3.y),entry3.z),exit=min(min(exit3.x,exit3.y),exit3.z);
    entry=max(entry,0.);if(exit<=entry)discard;
    float stepLength=(exit-entry)/uSteps,t=uTime*.055,transmission=1.;vec3 accumulated=vec3(0.);
    float energy=clamp(uEnergy,0.,2.),sampleWidth=mix(1.22,1.,smoothstep(8.,14.,uSteps));
    for(int i=0;i<16;i++){
     if(float(i)>=uSteps)break;
     vec3 p=uLocalEye+ray*(entry+(float(i)+.5)*stepLength);float mask=silhouette(p);
     if(mask>.001){
      vec3 toward=p-uLocalPointerOrigin;
      vec3 nearest=uLocalPointerOrigin+uLocalPointerDirection*max(dot(toward,uLocalPointerDirection),0.);
      vec3 separation=p-nearest;
      float pointer=exp(-dot(separation,separation)*18.)*uPointerPower;
      vec3 w=p+vec3(sin(p.y*2.1-t)*.055,sin(p.z*5.+t*.6)*.026,cos(p.y*1.7+t*.5)*.045);
      w.x+=sin(w.y*3.-t)*pointer*.018;w.z+=cos(w.y*2.4+t)*pointer*.016;
      float n=noise(w*vec3(4.6,2.1,6.8)+vec3(t*.28,-t*.45,t*.16));
      float vein=noise(w*vec3(7.,3.6,6.5)+vec3(-t*.18,t*.21,3.7));
      float fine=noise(w*vec3(11.,5.,9.)+vec3(t*.12,-t*.28,7.3));
      // Two depth-separated spine paths turn into the crossbar. Bright cores
      // occupy little of the crystal, with irregular transparent space around.
      vec2 spine=vec2(w.x-.13*sin(w.y*1.6-t*.47),w.z-.12*cos(w.y*1.3+t*.38));
      vec2 echo=vec2(w.x+.15*sin(w.y*1.34+t*.29+.8),w.z+.12*cos(w.y*1.8-t*.25));
      vec2 branch=vec2(w.y-(2.24+.115*sin(w.x*1.55+t*.22)),w.z-.14*sin(w.x*1.20-t*.36));
      float spineCore=exp(-dot(spine,spine)*160./sampleWidth),echoCore=exp(-dot(echo,echo)*225./sampleWidth);
      float branchCore=exp(-dot(branch,branch)*140./sampleWidth);
      float stemFade=1.-smoothstep(1.71,2.13,w.y);
      float branchFade=smoothstep(1.84,2.04,w.y);
      float filament=(spineCore+echoCore*.48)*stemFade+branchCore*branchFade;
      float halo=exp(-dot(spine,spine)*9.5)*stemFade+exp(-dot(branch,branch)*10.)*branchFade;
      // A wider broken nebula shoulder is carved by three spatial scales.
      // Thin isodensity threads fork away from the main paths at real depths.
      float pocket=pow(smoothstep(.50,.78,n+vein*.12),1.5);
      float gaps=1.-smoothstep(.39,.65,fine);
      float cloud=halo*pocket*gaps;
      float ridge=exp(-abs(vein-.51)*32.)*smoothstep(.36,.65,fine);
      vec2 forkStem=vec2(w.x-.23*sin(w.y*1.9-t*.34+n*2.5),w.z-.15*cos(w.y*2.3+t*.30+vein*1.7));
      vec2 forkBar=vec2(w.y-(2.22+.18*sin(w.x*2.5+t*.24+n*2.0)),w.z-.17*cos(w.x*1.5-t*.27));
      float fork=exp(-dot(forkStem,forkStem)*210./sampleWidth)*stemFade+exp(-dot(forkBar,forkBar)*190./sampleWidth)*branchFade;
      vec3 knotDelta=(w-vec3(.015,1.94,.035))*vec3(6.8,5.1,7.);
      float knot=exp(-dot(knotDelta,knotDelta)*2.3);
      float density=(filament*(.38+n*.84)+cloud*.90+halo*ridge*.26+fork*(.30+vein*.38)+knot*8.2)*mask;
      float alpha=1.-exp(-density*stepLength*1.28);
      vec3 cool=mix(vec3(.21,.71,1.46),vec3(.60,.31,1.08),smoothstep(.48,.76,n*.62+vein*.38+w.z*.28)*.70);
      vec3 light=cool*(1.12+vein*.28+ridge*.28+fork*.19)+vec3(1.70,1.44,1.10)*knot*1.30;
      light*=1.+energy*.22+pointer*.25;
      accumulated+=transmission*alpha*light;
      transmission*=1.-alpha;
     }
    }
    float alpha=1.-transmission;if(alpha<.002)discard;
    gl_FragColor=vec4(accumulated/max(alpha,.0001),min(alpha,.86)*uVisibility);
   }`
 });
 const root=new THREE.Mesh(geometry,material);root.name='Tem.identity.local-nebula-volume';root.userData.dynamic=true;
 root.castShadow=root.receiveShadow=false;root.renderOrder=3;parent.add(root);
 const inverse=new THREE.Matrix4(),pointerEnd=new THREE.Vector3();let phaseInitialized=false;
 return {root,update(time,energy=0,visibility=1,motion=true){
   if((motion||!phaseInitialized)&&Number.isFinite(time)){u.uTime.value=time;phaseInitialized=true;}
   u.uEnergy.value=Number.isFinite(energy)?Math.max(0,energy):0;u.uVisibility.value=THREE.MathUtils.clamp(visibility,0,1);
   root.visible=u.uVisibility.value>.001;u.uSteps.value=compact()?8:14;
   root.updateWorldMatrix(true,false);inverse.copy(root.matrixWorld).invert();
   camera.getWorldPosition(u.uLocalEye.value).applyMatrix4(inverse);
   if(motion&&interaction?.uniforms){
    const field=interaction.uniforms;
    if(field.uPointerOrigin&&field.uPointerDirection){
     u.uLocalPointerOrigin.value.copy(field.uPointerOrigin.value).applyMatrix4(inverse);
     pointerEnd.copy(field.uPointerOrigin.value).add(field.uPointerDirection.value).applyMatrix4(inverse);
     u.uLocalPointerDirection.value.copy(pointerEnd).sub(u.uLocalPointerOrigin.value).normalize();
     u.uPointerPower.value=THREE.MathUtils.clamp(field.uPointerPower?.value||0,0,1);
    }
   }
  },dispose(){root.removeFromParent();material.dispose();}};
}
