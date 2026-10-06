import * as THREE from 'three';

// The fleet is manufactured in local coordinates: bows face +Z and thrust
// exits -Z. Every component keeps its bay attribute so the five existing
// starport material batches and four GPU pose matrices remain sufficient.
export function buildDetailedFleet({compact,part,tube,lathe,curvedLoft,hullGeometry,wingGeometry,sailGeometry,materials}){
 const {ceramic,titanium,dark,glass,glow}=materials;
 const lod=(desktop,mobile)=>compact?mobile:desktop;
 const place=(g,mat,bay,p=[0,0,0],rotation=[0,0,0],scale=[1,1,1])=>part(g,mat,p,rotation,scale,bay);
 const sphere=(mat,bay,p,scale,rotation=[0,0,0])=>place(new THREE.SphereGeometry(1,lod(20,14),lod(12,8)),mat,bay,p,rotation,scale);
 const curve=(points,mat,bay,r=.028,n=32)=>tube(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),r,mat,bay,n);
 const torus=(r,t,mat,bay,p,rotation=[0,0,0],length=Math.PI*2,scale=[1,1,1])=>place(new THREE.TorusGeometry(r,t,lod(6,5),lod(44,28),length),mat,bay,p,rotation,scale);
 const revolve=(profile,mat,bay,p,rotation)=>place(new THREE.LatheGeometry(profile.map(a=>new THREE.Vector2(...a)),lod(32,20)),mat,bay,p,rotation);
 function closedArc(r,t,sides,segments,span){
  const g=new THREE.TorusGeometry(r,t,sides,segments,span),p=Array.from(g.attributes.position.array),n=Array.from(g.attributes.normal.array),uv=Array.from(g.attributes.uv.array),ix=Array.from(g.index.array);
  for(const end of [0,segments]){
   const a=end?span:0,sign=end?1:-1,center=p.length/3;
   p.push(Math.cos(a)*r,Math.sin(a)*r,0);n.push(-Math.sin(a)*sign,Math.cos(a)*sign,0);uv.push(.5,.5);
   for(let j=0;j<=sides;j++){
    const source=j*(segments+1)+end;p.push(...g.attributes.position.array.slice(source*3,source*3+3));n.push(-Math.sin(a)*sign,Math.cos(a)*sign,0);uv.push(.5+Math.cos(j/sides*Math.PI*2)*.5,.5+Math.sin(j/sides*Math.PI*2)*.5);
    if(j<sides){const k=center+1+j;if(end)ix.push(center,k+1,k);else ix.push(center,k,k+1);}
   }
  }
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);return g;
 }
 const hull=(rows,mat,bay,p=[0,0,0],scale=[1,1,1])=>place(hullGeometry(rows,compact),mat,bay,p,[0,0,0],scale);
 function membrane(g,thickness=.012){
  // Seal both skins and their border. The optical material remains double
  // sided, but the sail has a real edge and no open triangles at its tip.
  const a=g.attributes,vertices=a.position.count,p=[],uv=[],ix=[],base=Array.from(g.index.array),edges=new Map();
  for(const side of [-1,1])for(let i=0;i<vertices;i++){
   p.push(a.position.getX(i)+a.normal.getX(i)*thickness*.5*side,a.position.getY(i)+a.normal.getY(i)*thickness*.5*side,a.position.getZ(i)+a.normal.getZ(i)*thickness*.5*side);uv.push(a.uv.getX(i),a.uv.getY(i));
  }
  for(let i=0;i<base.length;i+=3){
   const [a0,b,c]=base.slice(i,i+3);ix.push(a0,c,b,a0+vertices,b+vertices,c+vertices);
   for(const [e0,e1] of [[a0,b],[b,c],[c,a0]]){const key=e0<e1?e0+':'+e1:e1+':'+e0;if(edges.has(key))edges.delete(key);else edges.set(key,[e0,e1]);}
  }
  for(const [a0,b] of edges.values())ix.push(a0,b,a0+vertices,b,b+vertices,a0+vertices);
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(p,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));result.setIndex(ix);result.computeVertexNormals();g.dispose();return result;
 }
 function panel(points,bay,y=0,bank=0){
  place(wingGeometry(points,.11),dark,bay,[0,y-.065,0],[0,0,bank],[1.02,1,1.02]);
  place(wingGeometry(points,.09),ceramic,bay,[0,y,0],[0,0,bank]);
 }
 function nozzle(bay,p,r=.34,length=1.1){
  const [x,y,z]=p;
  // The ceramic shoulder ends before the titanium lip, leaving a dark neck
  // and a recessed luminous throat rather than an exposed glowing cylinder.
  place(new THREE.CylinderGeometry(r*.95,r*1.02,length,lod(18,12)),dark,bay,[x,y,z],[Math.PI/2,0,0]);
  revolve([[r*1.04,length*.34],[r*1.08,length*.19],[r*1.12,-length*.33],[r*.97,-length*.49],[r*.77,-length*.47],[r*.68,-length*.26],[r*.83,length*.34],[r*1.04,length*.34]],titanium,bay,p,[Math.PI/2,0,0]);
  revolve([[r*1.10,length*.38],[r*1.17,length*.28],[r*1.17,length*.03],[r*1.10,-length*.04],[r*1.03,length*.05],[r*1.03,length*.34],[r*1.10,length*.38]],ceramic,bay,p,[Math.PI/2,0,0]);
  place(new THREE.CircleGeometry(r*.70,lod(32,18)),glow,bay,[x,y,z-length*.35],[0,Math.PI,0]);
  torus(r*.71,.021,glow,bay,[x,y,z-length*.37]);
  if(!compact)for(let j=0;j<6;j++){
   const a=j/6*Math.PI*2;
   place(new THREE.BoxGeometry(.04,.04,length*.34),dark,bay,[x+Math.cos(a)*r*1.11,y+Math.sin(a)*r*1.11,z-length*.14],[0,0,a]);
  }
 }
 function canopy(bay,{p=[0,.6,.85],width=.46,height=.22,length=1.03,tilt=.06}={}){
  sphere(dark,bay,[p[0],p[1]-.065,p[2]],[width*.95,height*.91,length*.97],[tilt,0,0]);
  sphere(glass,bay,p,[width,height,length],[tilt,0,0]);
  // Two curved frame rails describe the canopy silhouette at a wide shot.
  for(const sign of [-1,1])curve([[sign*width*.73,p[1]-.04,p[2]-length*.77],[sign*width*.83,p[1]+height*.60,p[2]-length*.18],[sign*width*.58,p[1]+height*.60,p[2]+length*.52],[sign*width*.13,p[1]-.035,p[2]+length*.91]],titanium,bay,.027,lod(32,20));
 }

 // 01 / Interceptor: a long ceramic bow, swept compound wings and paired
 // recessed vector drives. The dark underbody is exposed between armour.
 {
  const bay=0;
  hull([[-3.05,.12,.12,-.05],[-2.35,.72,.37,-.04],[-.9,1.02,.47,.02],[.75,.76,.43,.03],[2.3,.36,.24,0],[3.9,.012,.012,-.04]],dark,bay);
  hull([[-2.7,.15,.09,.23],[-1.8,.83,.27,.30],[-.4,.90,.29,.30],[1.35,.59,.24,.25],[2.7,.22,.14,.12],[3.85,.015,.018,-.015]],ceramic,bay);
  hull([[-2.6,.16,.08,-.25],[-1.7,.64,.16,-.31],[.3,.58,.13,-.31],[2.85,.025,.02,-.12]],ceramic,bay);
  canopy(bay,{p:[0,.68,.80],width:.47,height:.23,length:1.08,tilt:-.055});
  for(const sign of [-1,1]){
   panel([[sign*.60,.85],[sign*1.42,-.65],[sign*3.72,-2.34],[sign*3.60,-2.73],[sign*2.10,-2.40],[sign*.73,-1.52]],bay,-.09,sign*-.035);
   // Outer blade and dark cutout give each wing a readable structural edge.
   place(wingGeometry([[sign*2.26,-1.40],[sign*3.67,-2.32],[sign*3.52,-2.54],[sign*2.0,-1.84]],.055),titanium,bay,[0,-.04,0]);
   place(wingGeometry([[sign*1.10,-.56],[sign*2.36,-1.63],[sign*1.93,-1.89],[sign*.95,-1.13]],.04),dark,bay,[0,-.027,0]);
   curve([[sign*.76,.32,1.13],[sign*1.11,.20,-.42],[sign*2.73,.03,-1.85],[sign*3.51,.01,-2.38]],glow,bay,.024,36);
   const tail=wingGeometry([[.0,-2.64],[.58,-2.34],[.72,-1.23],[.05,-1.60]],.085);
   place(tail,ceramic,bay,[sign*.69,.34,0],[0,0,sign*Math.PI/2],[1,1,1]);
   sphere(dark,bay,[sign*.93,-.01,-1.83],[.34,.28,.92]);
   nozzle(bay,[sign*.87,-.10,-2.64],.34,1.15);
   // Inlet mouths face the bow and remain predominantly dark.
   sphere(dark,bay,[sign*.78,.13,-.74],[.23,.15,.42]);
   place(new THREE.BoxGeometry(.23,.035,.12),glow,bay,[sign*.78,.24,-.49]);
  }
  curve([[0,.60,-1.95],[0,.66,-.66],[0,.38,2.07],[0,.02,3.73]],titanium,bay,.033,38);
 }

 // 02 / Cinematic explorer: an open, segmented fusion toroid is the principal
 // silhouette. Ceramic arc armour is separated by titanium joints and slots.
 {
  const bay=1;
  hull([[-3.0,.03,.03,-.04],[-2.24,.66,.35,0],[-.7,.80,.43,.04],[1.2,.72,.40,.02],[2.4,.34,.24,-.04],[3.7,.012,.012,-.09]],dark,bay);
  hull([[-2.5,.12,.10,.22],[-1.72,.66,.21,.27],[.45,.69,.27,.25],[2.2,.33,.17,.12],[3.60,.02,.018,-.06]],ceramic,bay);
  canopy(bay,{p:[0,.61,1.02],width:.40,height:.21,length:.89,tilt:-.08});
  // Raise the ring so its lower arc clears the physical docking saddle.
  const ringPose=[.11,.20,.08],center=[0,1.60,-.62],ringR=2.03;
  torus(ringR,.12,dark,bay,center,ringPose);
  torus(ringR-.13,.038,titanium,bay,center,ringPose);
  const segments=compact?8:12;
  for(let j=0;j<segments;j++){
   const angle=j/segments*Math.PI*2,span=Math.PI*2/segments*.80;
   const ring=closedArc(ringR,.145,lod(6,5),lod(12,8),span);
   ring.rotateZ(angle+.06);place(ring,ceramic,bay,center,ringPose);
   const inset=new THREE.TorusGeometry(ringR-.055,.028,5,lod(16,10),span*.74);
   inset.rotateZ(angle+.11);place(inset,glow,bay,[center[0],center[1],center[2]+.115],ringPose);
  }
  for(const sign of [-1,1]){
   panel([[sign*.60,.95],[sign*2.62,-.85],[sign*2.52,-1.24],[sign*1.33,-1.37],[sign*.69,-.47]],bay,-.22);
   const loft=curvedLoft([[sign*.72,-.05,-1.33],[sign*1.55,.64,-1.12],[sign*1.98,1.60,-.66]],{compact,width:.13,height:.10,sections:26});
   place(loft.geometry,titanium,bay);
   nozzle(bay,[sign*.85,-.16,-2.65],.36,1.14);
   curve([[sign*.56,.32,1.41],[sign*.77,.36,.22],[sign*.67,.27,-1.48]],glow,bay,.024,30);
  }
  // The visible circular sensor in the bow distinguishes it from a fighter.
  torus(.25,.046,titanium,bay,[0,.05,2.57]);
  place(new THREE.CircleGeometry(.195,lod(24,16)),glass,bay,[0,.05,2.59]);
  place(new THREE.CircleGeometry(.06,16),glow,bay,[0,.05,2.61]);
 }

 // 03 / Worldbuilder: translucent swept sails tensioned on an exposed frame,
 // a narrow keel and warm spars. The two skins remain physically separate.
 {
  const bay=2;
  hull([[-2.9,.05,.04,-.07],[-1.98,.52,.32,-.03],[-.55,.66,.34,0],[1.09,.47,.28,-.01],[2.5,.25,.17,-.06],[3.8,.014,.014,-.11]],dark,bay);
  hull([[-2.63,.07,.045,.20],[-1.83,.52,.21,.22],[-.27,.57,.24,.19],[1.30,.38,.20,.16],[2.73,.15,.10,.045],[3.70,.015,.014,-.08]],ceramic,bay);
  hull([[-2.55,.09,.07,-.21],[-1.2,.41,.16,-.28],[.40,.43,.15,-.27],[2.71,.03,.03,-.12]],titanium,bay);
  canopy(bay,{p:[0,.52,1.09],width:.28,height:.17,length:.84,tilt:-.07});
  for(const sign of [-1,1]){
   // The supplied sail surface defines the shared curvature; two thin skins
   // close its optical silhouette without an opaque backing sheet.
   const skin=membrane(sailGeometry(sign,compact));
   const sailPoint=(t,s)=>{
    const width=(.10+Math.sin(t*Math.PI)*1.9)*(1-t*.32),p=new THREE.Vector3(sign*(.3+s*width)*1.24,(.4+t*3.6)*.96,(-1.6+t*.68+Math.sin(s*Math.PI)*Math.sin(t*Math.PI)*.78)*1.06);
    p.applyEuler(new THREE.Euler(0,sign*.11,0));p.y-=.12;return p.toArray();
   };
   place(skin,glass,bay,[0,-.12,0],[0,sign*.11,0],[1.24,.96,1.06]);
   const edge=Array.from({length:9},(_,j)=>sailPoint(j/8,1));
   curve(edge,titanium,bay,.041,lod(44,26));
   curve(edge.map(([x,y,z])=>[x,y-.025,z+.027]),glow,bay,.017,lod(40,24));
   const inner=Array.from({length:9},(_,j)=>sailPoint(j/8,0));
   curve(inner,titanium,bay,.040,lod(36,22));
   const ribs=compact?2:3;
   for(let j=1;j<=ribs;j++){
    const t=j/(ribs+1);
    curve(Array.from({length:7},(_,k)=>sailPoint(t,k/6)),titanium,bay,.022,22);
   }
   sphere(dark,bay,[sign*.61,-.11,-2.0],[.21,.20,.64]);
   nozzle(bay,[sign*.57,-.12,-2.50],.26,.93);
   panel([[sign*.46,-1.82],[sign*1.64,-1.35],[sign*1.39,-.91],[sign*.56,.12]],bay,-.20);
  }
  curve([[0,.30,-1.80],[0,1.55,-1.45],[0,2.70,-1.15],[0,3.73,-1.03]],titanium,bay,.062,34);
  sphere(ceramic,bay,[0,.63,-1.47],[.20,.23,.22]);
 }

 // 04 / Research craft: a ceramic pressurised cabin, a dark modular spine,
 // folding radiator fins and a directional optical survey dish.
 {
  const bay=3;
  hull([[-3.03,.15,.17,-.03],[-2.48,.78,.44,-.04],[-1.29,.96,.44,-.03],[.45,.89,.43,0],[1.98,.61,.31,.02],[3.38,.028,.028,-.06]],dark,bay);
  hull([[-1.46,.07,.05,.34],[-.88,.81,.25,.29],[.80,.78,.31,.24],[2.03,.46,.25,.15],[3.29,.027,.021,-.02]],ceramic,bay);
  hull([[-2.56,.12,.075,-.28],[-1.69,.79,.19,-.33],[.83,.65,.17,-.32],[2.65,.035,.025,-.12]],ceramic,bay);
  canopy(bay,{p:[0,.60,1.19],width:.39,height:.20,length:.74,tilt:-.10});
  // Three physical service modules share a keel, with dark expansion joints.
  for(let j=0;j<3;j++){
   const z=-2.00+j*.66;
   place(new THREE.BoxGeometry(1.38,.32,.44),ceramic,bay,[0,.41,z],[0,0,0],[1,1,1]);
   place(new THREE.BoxGeometry(1.41,.045,.095),titanium,bay,[0,.57,z+.05]);
   place(new THREE.BoxGeometry(.38,.028,.13),dark,bay,[0,.588,z-.05]);
  }
  for(const sign of [-1,1]){
   sphere(dark,bay,[sign*1.24,-.01,-1.73],[.40,.33,.86]);
   nozzle(bay,[sign*1.23,-.02,-2.62],.39,1.17);
   // Distinct radiator panels have open dark joints between broad ribs.
   panel([[sign*.92,.31],[sign*2.91,-.10],[sign*3.20,-.65],[sign*2.96,-1.38],[sign*1.11,-1.40]],bay,-.17,sign*.10);
   const fins=compact?3:5;
   for(let j=0;j<fins;j++){
    const x=sign*(1.43+j*.31);
    place(new THREE.BoxGeometry(.14,.073,1.08),dark,bay,[x,-.105,-.70],[0,sign*-.15,sign*.10]);
    place(new THREE.BoxGeometry(.025,.015,.78),titanium,bay,[x,-.058,-.73],[0,sign*-.15,sign*.10]);
   }
   curve([[sign*1.0,.19,-1.42],[sign*1.64,.13,-1.10],[sign*2.82,.08,-.50]],glow,bay,.023,28);
   const strut=curvedLoft([[sign*.64,.03,.92],[sign*1.09,.23,.76],[sign*1.18,.69,.42]],{compact,width:.08,height:.07,sections:22});
   place(strut.geometry,titanium,bay);
   sphere(dark,bay,[sign*1.18,.76,.41],[.17,.17,.22]);
   sphere(glass,bay,[sign*1.18,.77,.58],[.12,.12,.075]);
  }
  place(new THREE.CylinderGeometry(.065,.085,.86,10),titanium,bay,[.36,.97,-1.50],[.10,0,-.16]);
  lathe([[0,0],[.16,.022],[.42,.095],[.66,.26],[.73,.36],[.74,.41],[.67,.40],[.58,.32],[.39,.19],[.14,.13],[0,.12]],ceramic,[.42,1.32,-1.50],[.28,.35,-.23],bay);
  torus(.71,.025,titanium,bay,[.42,1.71,-1.50],[Math.PI/2+.28,.35,-.23]);
  curve([[.43,1.46,-1.49],[.48,1.77,-1.39],[.52,1.99,-1.31]],titanium,bay,.035,20);
  sphere(glass,bay,[.52,1.98,-1.31],[.082,.10,.10]);
  if(!compact)for(let j=0;j<2;j++){
   place(new THREE.BoxGeometry(.026,.50+j*.12,.027),titanium,bay,[-.55+j*.24,1.01+j*.08,-1.16]);
   sphere(glow,bay,[-.55+j*.24,1.28+j*.14,-1.16],[.027,.027,.027]);
  }
 }
}
