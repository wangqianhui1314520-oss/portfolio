import * as THREE from 'three';

// One world-space ray drives all optical layers. Keeping it with the rendered
// camera makes the response line up with the cursor at every scene depth.
export function createPointerField({canvas}){
 const uniforms={uPointerOrigin:{value:new THREE.Vector3()},uPointerDirection:{value:new THREE.Vector3(0,0,-1)},uPointerPower:{value:0},uPointerSpeed:{value:0},uPointerTint:{value:new THREE.Color(0x9abfe9)}};
 const sample=new THREE.Vector3(),field=new THREE.Vector2(),fieldVelocity=new THREE.Vector2(),target=new THREE.Vector2(),offset=new THREE.Vector2(),travel=new THREE.Vector2(),tint=new THREE.Color(0x9abfe9);
 let hover=null,impulse=0,initialized=false,stamp=-1,pointerReading=false,focusReading=false;
 const readingSurface='.archive-glass-panel .profile-panel';
 document.addEventListener('pointerover',event=>{pointerReading=Boolean(event.target.closest(readingSurface));},{passive:true});
 document.addEventListener('pointerout',event=>{if(!event.relatedTarget)pointerReading=false;},{passive:true});
 document.addEventListener('focusin',event=>{focusReading=Boolean(event.target.closest(readingSurface));});
 document.addEventListener('focusout',event=>{focusReading=Boolean(event.relatedTarget?.closest(readingSurface));});
 return {uniforms,setHover(id){hover=id||null;},ping(){impulse=1;},setTint(color){tint.set(color);},
  update(dt,pointer,camera,motion,step,opening){
   if(!motion)return; // Preserve the entire last field during reading or reduced motion.
   target.set(THREE.MathUtils.clamp(pointer.tx??pointer.x,-.5,.5),THREE.MathUtils.clamp(pointer.ty??pointer.y,-.5,.5));
   if(!initialized){initialized=true;field.copy(target);}
   // The spring lives in screen coordinates, so camera travel never drags an
   // old world-space ray across the scene. Its exact critically damped step is
   // stable at either mobile or desktop frame intervals, without mouse jitter.
   const omega=13,decay=Math.exp(-omega*dt);
   offset.copy(field).sub(target);travel.copy(fieldVelocity).addScaledVector(offset,omega).multiplyScalar(dt);
   field.copy(target).addScaledVector(offset,decay).addScaledVector(travel,decay);
   fieldVelocity.addScaledVector(travel,-omega).multiplyScalar(decay);
   impulse*=Math.exp(-dt*2.3);
   const speed=THREE.MathUtils.clamp(fieldVelocity.length()*.65+impulse*.42,0,1);
   // A wake forms quickly and releases slowly after the cursor stops. The same
   // speed envelope drives cloud refraction, ship exhaust and particle swirl.
   const speedRate=speed>uniforms.uPointerSpeed.value?11:2.8;
   uniforms.uPointerSpeed.value=THREE.MathUtils.damp(uniforms.uPointerSpeed.value,speed,speedRate,dt);
   const quiet=['bridge','captain','docked'].includes(step),readingFocus=step==='captain'&&(pointerReading||focusReading),stage=opening?.35:readingFocus?.42:quiet?.78:1;
   const power=(pointer.active?.68:0)+(hover?.18:0)+impulse*.32+uniforms.uPointerSpeed.value*.08;
   uniforms.uPointerPower.value=THREE.MathUtils.damp(uniforms.uPointerPower.value,Math.min(1,power)*stage,5,dt);
   camera.getWorldPosition(uniforms.uPointerOrigin.value);
   sample.set(field.x*2,-field.y*2,.5).unproject(camera).sub(uniforms.uPointerOrigin.value).normalize();
   uniforms.uPointerDirection.value.copy(sample);
   uniforms.uPointerTint.value.lerp(tint,1-Math.exp(-dt*4));
   const tick=Math.floor(performance.now()/250);
   if(tick!==stamp){stamp=tick;canvas.dataset.pointerField='camera-registered-inertial-world-ray';canvas.dataset.pointerPower=uniforms.uPointerPower.value.toFixed(3);canvas.dataset.pointerSpeed=uniforms.uPointerSpeed.value.toFixed(3);canvas.dataset.pointerDirection=sample.toArray().map(v=>v.toFixed(3)).join(',');canvas.dataset.pointerLag=field.distanceTo(target).toFixed(4);canvas.dataset.readingLight=readingFocus?'quiet':'ambient';}
  }
 };
}
