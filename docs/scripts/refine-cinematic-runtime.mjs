// One-time source migration. Exact matches prevent accidental edits elsewhere.
import fs from 'node:fs';
const file='assets/js/immersive-starport.js';let s=fs.readFileSync(file,'utf8');
function replace(a,b){if(!s.includes(a))throw new Error('Missing source anchor: '+a.slice(0,100));s=s.replace(a,b);}
replace("import {buildDetailedFleet} from './immersive-starship-detail.js?v=cinematic-v16.4';", "import {buildDetailedFleet} from './immersive-starship-detail.js?v=cinematic-v16.4';\nimport {loadTemAsset} from './immersive-blender-assets.js?v=cinematic-v16.4';");
replace('varying float vBay;\n void main()', 'varying float vBay;\n void main()');
// The ownership attribute is already present on every procedural part.
replace('varying float vBay;\n void main(){vec4 p', 'varying float vBay,vIsShip;\n void main(){vIsShip=step(-.5,aBay);vec4 p');
replace('uShipPose:{value:shipPoses},uBayEngagement', 'uAuthoredPlatform:{value:0},uAuthoredFleet:{value:0},uShipPose:{value:shipPoses},uBayEngagement');
replace('varying float vBay;${opticalSkySample}', 'varying float vBay,vIsShip;uniform float uAuthoredPlatform,uAuthoredFleet;${opticalSkySample}');
replace('void main(){vec3 n=normalize(vNormal)', 'void main(){if(uAuthoredPlatform>.5&&vIsShip<.5||uAuthoredFleet>.5&&vIsShip>.5)discard;vec3 n=normalize(vNormal)');
replace('varying float vBay;void main(){float engagement', 'varying float vBay,vIsShip;uniform float uAuthoredPlatform,uAuthoredFleet;void main(){if(uAuthoredPlatform>.5&&vIsShip<.5||uAuthoredFleet>.5&&vIsShip>.5)discard;float engagement');
replace('for(const [mat,geometries] of batches){', 'const proceduralBatches=[];\n for(const [mat,geometries] of batches){');
replace("mesh.userData.visualOnly=true;root.add(mesh);}","mesh.userData.visualOnly=true;root.add(mesh);proceduralBatches.push(mesh);}");
replace('const pose=new THREE.Object3D(),inverse=', `let authoredPort=null,authoredFleet=null;
 loadTemAsset({name:'starport',canvas:document.getElementById('space'),onLoad:model=>{
  if(!model.find('STARPORT'))throw new Error('Missing authored starport.');
  root.add(model.root);authoredPort=model.root;dispatchEvent(new Event('tem:scene-depth-change'));
 }});
 loadTemAsset({name:'fleet',canvas:document.getElementById('space'),onLoad:model=>{
  const ships=Array.from({length:4},(_,i)=>model.find('SHIP_'+i));
  if(ships.some(ship=>!ship))throw new Error('Missing authored fleet roots.');
  for(const ship of ships)ship.matrixAutoUpdate=false;
  root.add(model.root);authoredFleet=ships;dispatchEvent(new Event('tem:scene-depth-change'));
 }});
 const pose=new THREE.Object3D(),inverse=`);
replace('const discrete=!ready||selected!==lastSelected||hover!==lastHover;', `const useAuthored=innerWidth>=700;
  if(authoredPort)authoredPort.visible=useAuthored;
  if(authoredFleet)for(let i=0;i<4;i++){authoredFleet[i].visible=useAuthored;authoredFleet[i].matrix.copy(shipPoses[i]);authoredFleet[i].matrixWorldNeedsUpdate=true;}
  shared.uAuthoredPlatform.value=authoredPort&&useAuthored?1:0;shared.uAuthoredFleet.value=authoredFleet&&useAuthored?1:0;
  for(const mesh of proceduralBatches)mesh.visible=!(shared.uAuthoredPlatform.value&&shared.uAuthoredFleet.value);
  const discrete=!ready||selected!==lastSelected||hover!==lastHover;`);
// Copy after applying the current pose, so hover never lags its collider by a frame.
replace('const activeColor=colors[hover>=0?hover:selected]', 'if(authoredFleet)for(let i=0;i<4;i++){authoredFleet[i].matrix.copy(shipPoses[i]);authoredFleet[i].matrixWorldNeedsUpdate=true;}\n  const activeColor=colors[hover>=0?hover:selected]');
fs.writeFileSync(file,s);
