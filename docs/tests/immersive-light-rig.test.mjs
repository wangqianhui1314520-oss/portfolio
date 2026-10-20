import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from '../assets/vendor/three-0.161.0/build/three.module.js';

const source=readFileSync(new URL('../assets/js/immersive-light-rig.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'');
const api={THREE};runInNewContext(source,api);

function world(){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1.6,.1,5000);
 camera.position.set(0,0,10);camera.lookAt(0,0,0);scene.add(camera);
 const lamp=(name,parent,position,intensity=10,range=30)=>{const light=new THREE.PointLight(0xffffff,intensity,range,2);light.name=name;light.position.fromArray(position);parent.add(light);return light;};
 return {scene,camera,lamp};
}
// What r161's projectObject() collects: visible branches on the camera's layers.
function counted(scene,camera){let lights=0;const visit=object=>{if(!object.visible)return;if(object.isLight&&object.layers.test(camera.layers))lights++;object.children.forEach(visit);};visit(scene);return lights;}

test('authored point lights leave the rendered layers while a fixed slot count remains',()=>{
 const {scene,camera,lamp}=world(),chapter=new THREE.Group();scene.add(chapter);
 lamp('near',scene,[0,0,0]);lamp('hidden',chapter,[1,0,0]);chapter.visible=false;
 const rig=api.createLightRig({scene,camera,slots:4});rig.scan();rig.update(0);
 assert.equal(rig.virtual.size,2,'lights inside hidden groups are adopted before shaders are prepared');
 for(const light of rig.virtual){assert.ok(light.layers.isEnabled(31));assert.ok(!light.layers.isEnabled(0));}
 assert.equal(counted(scene,camera),4);
 chapter.visible=true;rig.update(0);assert.equal(counted(scene,camera),4,'showing a chapter cannot change the shader light count');
 const late=lamp('late',chapter,[0,1,0]);rig.update(1/60);
 assert.ok(late.layers.isEnabled(31)&&!late.layers.isEnabled(0),'a light added to a visible branch is adopted before the next draw');
 assert.equal(counted(scene,camera),4);
});

test('slots carry world position, colour and range of the most important visible lights',()=>{
 const {scene,camera,lamp}=world(),ship=new THREE.Group();ship.position.set(2,1,0);scene.add(ship);
 const engine=lamp('engine',ship,[1,0,0],20,12);engine.color.set(0xff8800);engine.decay=1.5;
 lamp('far-weak',scene,[0,0,-3000],80,40);lamp('behind',scene,[0,0,200],500,20);
 const rig=api.createLightRig({scene,camera,slots:2});rig.update(0);
 const slot=rig.slots.find(light=>light.userData.temSlot.source===engine);
 assert.ok(slot,'the visible nearby engine light is carried');
 assert.deepEqual(slot.position.toArray(),[3,1,0]);assert.ok(slot.color.equals(engine.color));
 assert.equal(slot.distance,12);assert.equal(slot.decay,1.5);assert.equal(slot.intensity,20);
 assert.ok(!rig.slots.some(light=>light.userData.temSlot.source?.name==='behind'),'a light whose range cannot reach the frustum is skipped');
 engine.intensity=0;rig.update(0);
 assert.ok(!rig.slots.some(light=>light.userData.temSlot.source===engine&&light.intensity>0),'a dark light releases its slot');
});

test('more candidates than slots keep the strongest screen reach and fade replacements',()=>{
 const {scene,camera,lamp}=world();
 const strong=lamp('strong',scene,[0,0,2],10,30),medium=lamp('medium',scene,[0,0,-20],10,30),weak=lamp('weak',scene,[0,0,-200],10,30);
 const rig=api.createLightRig({scene,camera,slots:2,fade:.25});rig.update(0);
 // Arrays built inside the vm context carry another realm's prototype.
 const sources=()=>[...rig.slots].map(light=>light.userData.temSlot.source?.name).filter(Boolean).sort().join(',');
 assert.equal(sources(),'medium,strong');
 strong.intensity=0;medium.intensity=0;rig.update(.1);
 // Evicted slots fade out in place before the weaker light takes one over.
 assert.ok(rig.slots.every(light=>light.intensity<10));
 for(let i=0;i<4;i++)rig.update(.1);
 assert.equal(sources(),'weak');const slot=rig.slots.find(light=>light.userData.temSlot.source===weak);
 assert.ok(slot.intensity>0&&slot.intensity<=10);
 for(let i=0;i<5;i++)rig.update(.1);assert.equal(slot.intensity,10,'the replacement reaches its full intensity');
 assert.equal(counted(scene,camera),2);
});
