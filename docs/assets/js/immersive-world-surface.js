import * as THREE from 'three';
import {quadMatrix,convexHull} from './immersive-projection.js?v=cinematic-v21.1';
const local=new THREE.Vector3(),world=new THREE.Vector3(),normal=new THREE.Vector3(),delta=new THREE.Vector3();
const styleCache=new WeakMap(),clipCache=new WeakMap();
function applyStyle(element,name,value){let cache=styleCache.get(element);if(!cache){cache={};styleCache.set(element,cache);}if(cache[name]!==value||element.style[name]!==value){element.style[name]=value;cache[name]=value;}}
export function projectWorldSurface({object,camera,element,w,h,width=640,height=850,ready=true}){
 if(!element||!object)return false;
 object.updateWorldMatrix(true,false);world.setFromMatrixPosition(object.matrixWorld);
 normal.set(0,0,1).transformDirection(object.matrixWorld);delta.copy(camera.position).sub(world);
 const points=[[-w/2,h/2],[w/2,h/2],[w/2,-h/2],[-w/2,-h/2]].map(([x,y])=>{
  local.set(x,y,.065).applyMatrix4(object.matrixWorld).project(camera);
  return [(local.x*.5+.5)*innerWidth,(.5-local.y*.5)*innerHeight,local.z];
 });
 const matrix=quadMatrix(points.map(p=>p.slice(0,2)),width,height);
 const shown=Boolean(matrix)&&normal.dot(delta)>0&&points.every(p=>p[2]>-1&&p[2]<1);
 applyStyle(element,'width',width+'px');applyStyle(element,'height',height+'px');applyStyle(element,'left','0px');applyStyle(element,'top','0px');
 applyStyle(element,'transform',shown?'matrix3d('+matrix.map(n=>n.toFixed(7)).join(',')+')':'none');
 applyStyle(element,'visibility',shown?'visible':'hidden');applyStyle(element,'pointerEvents',shown&&ready?'auto':'none');
 const inert=!shown||!ready;if(element.inert!==inert)element.inert=inert;
 if(element.dataset.worldMounted!=='true')element.dataset.worldMounted='true';return shown;
}
// Viewport clip holes follow the actual foreground pressure ribs.
export function clipForeground({element,camera,surface,boxes}){
 if(!element||!surface)return;
 const signature=camera.matrixWorld.elements.map(v=>v.toFixed(3)).join(',')+'/'+camera.fov.toFixed(3)+'/'+innerWidth+'/'+innerHeight;
 if(clipCache.get(element)===signature)return;clipCache.set(element,signature);
 surface.updateWorldMatrix(true,false);world.setFromMatrixPosition(surface.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
 const paneDepth=-world.z,holes=[];
 for(const box of boxes){
  const center=box.getCenter(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse);
  if(-center.z<.2||-center.z>paneDepth-.5)continue;
  const points=[];let valid=true;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   local.set(x,y,z).project(camera);if(local.z<-1||local.z>1){valid=false;break;}
   points.push([(local.x*.5+.5)*innerWidth,(.5-local.y*.5)*innerHeight]);
  }
  if(!valid)continue;const hull=convexHull(points);if(hull.length<3)continue;
  if(hull.every(p=>p[0]<0)||hull.every(p=>p[0]>innerWidth)||hull.every(p=>p[1]<0)||hull.every(p=>p[1]>innerHeight))continue;
  holes.push('M'+hull.map(p=>p.map(v=>v.toFixed(1)).join(' ')).join('L')+'Z');
 }
 element.style.clipPath=holes.length?'path(evenodd, "M0 0H'+innerWidth+'V'+innerHeight+'H0Z'+holes.join('')+'")':'none';
}





