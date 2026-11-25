import {test} from 'node:test';
import assert from 'node:assert/strict';
import data from './project.json';
import {validateStudio} from './config';
import {heroPose,camera,cardWorldPoint,projectCardPoint,secondaryPose,track} from './motion';
const p=validateStudio(data);
test('persistent hero stays finite, with positive geometry and a safe camera plane',()=>{
 for(let f=0;f<900;f+=3){const h=heroPose(f,p);assert(Object.values(h).every(Number.isFinite));assert(h.w>=70&&h.h>=70);for(const x of [-h.w/2,h.w/2])for(const y of [-h.h/2,h.h/2]){const at=projectCardPoint(h,{x,y},p,camera(f,p));assert(Number.isFinite(at.x)&&Number.isFinite(at.y));}}
});
test('spring retargets keep position and velocity continuous at a target change',()=>{
 const keys=[[0,100],[30,200]] as const,e=.001;
 const before=(track(30,0,keys)-track(30-e,0,keys))/e,after=(track(30+e,0,keys)-track(30,0,keys))/e;
 assert(Math.abs(before-after)<.02);
});
test('macro contact point uses the same camera and card transform deterministically',()=>{
 const h=heroPose(282,p),m=camera(282,p),local={x:h.w*.32,y:h.h*.31,z:1};
 assert.deepEqual(projectCardPoint(h,local,p,m),projectCardPoint(heroPose(282,p),local,p,camera(282,p)));
});
test('burst cards emerge behind the hero instead of intersecting the portrait',()=>{
 const depths=(h:ReturnType<typeof heroPose>)=>[-1,1].flatMap(x=>[-1,1].map(y=>cardWorldPoint(h,{x:x*h.w/2,y:y*h.h/2}).z));
 for(let f=126;f<=154;f++){
  const frontMinimum=Math.min(...depths(heroPose(f,p)));
  for(let i=0;i<4;i++)assert(Math.max(...depths(secondaryPose(f,i,p)))<frontMinimum,`f${f} card${i}`);
 }
});
test('end frame has the compact mark and stable hero geometry',()=>{
 const h=heroPose(899,p);assert(Math.abs(h.x-540)<.05);assert(Math.abs(h.y-530)<.05);assert(Math.abs(h.w-108)<.05);assert(Math.abs(h.ry-180)<.05);
 for(let i=0;i<4;i++)assert(secondaryPose(899,i,p).w<2);
});
