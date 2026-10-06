import test from 'node:test';
import assert from 'node:assert/strict';
import {archivePose,createArchiveRail,archiveCenter} from '../assets/js/immersive-archive-path.js';
import {quadMatrix} from '../assets/js/immersive-projection.js';
test('orbit keeps the camera on the annulus and reverses without queued shots',()=>{
 for(let p=0;p<=3;p+=.1){const {position}=archivePose(p);assert.ok(Math.abs(Math.hypot(position[0],position[2]-archiveCenter[2])-47)<1e-8);}
 const rail=createArchiveRail();rail.push(120,0);rail.update(.1,250);assert.equal(rail.target,1);
 for(let i=0;i<30;i++)rail.update(.1,300+i*100);assert.equal(rail.progress,1);
 rail.push(120,3500);rail.update(.1,3550);const before=rail.target;rail.push(-220,3560);assert.ok(rail.target<before);
 assert.ok(Math.abs(rail.target-rail.progress)<=.85);
 rail.select(3);rail.update(.1,4000,false);assert.equal(rail.progress,3);
 assert.equal(rail.push(NaN,5000),3);
});
test('projective DOM transform maps all four corners with a perspective denominator',()=>{
 const corners=[[140,85],[515,105],[565,610],[115,540]],m=quadMatrix(corners,600,800);
 [[0,0],[600,0],[600,800],[0,800]].forEach(([x,y],i)=>{const w=m[3]*x+m[7]*y+m[15];assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/w-corners[i][0])<1e-7);assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/w-corners[i][1])<1e-7);});
 assert.equal(quadMatrix([[0,0],[0,0],[0,0],[0,0]],0,800),null);
});

test('direct chapter choices retain UI ownership during a long turn and wheel input can interrupt',()=>{
 const rail=createArchiveRail(2);rail.select(0);
 rail.update(.05,100);assert.equal(rail.commanded,true);assert.equal(rail.index,2);
 for(let i=0;i<40;i++)rail.update(.05,150+i*50);
 assert.equal(rail.progress,0);assert.equal(rail.commanded,false);
 rail.select(3);rail.update(.05,3000);assert.equal(rail.commanded,true);
 rail.push(-100,3010);assert.equal(rail.commanded,false);
 rail.select(1);rail.update(.1,3300,false);assert.equal(rail.progress,1);assert.equal(rail.commanded,false);
});
