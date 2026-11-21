import assert from 'node:assert/strict';
import {shell,deformation,step,widthTargets,heightTargets} from './physics';
let minW=Infinity,maxW=0,minH=Infinity,maxH=0,maxStretch=0;
for(let frame=0;frame<600;frame++){
 const t=frame/60,{w,h}=shell(t),{sx,sy}=deformation(t);
 assert(Number.isFinite(w)&&Number.isFinite(h));assert(w>90&&w<950);assert(h>90&&h<730);
 assert(Math.abs(sx*sy-1)<1e-9);assert(sx>.85&&sx<1.15);
 minW=Math.min(minW,w);maxW=Math.max(maxW,w);minH=Math.min(minH,h);maxH=Math.max(maxH,h);maxStretch=Math.max(maxStretch,Math.abs(sx-1));
}
for(const [time]of [...widthTargets,...heightTargets]){
 const a=shell(time-1e-6),b=shell(time+1e-6);
 assert(Math.abs(a.w-b.w)<.1&&Math.abs(a.h-b.h)<.1,'Discontinuous shell at '+time);
}
assert(step(.2,0,'letters')>1,'Letter response should exhibit overshoot');
assert(Math.abs(step(.8,0,'letters')-1)<.002,'Letters should settle');
console.log(JSON.stringify({framesChecked:600,minW,maxW,minH,maxH,maxStretch,continuousTargets:true,areaPreservingSquash:true,letterOvershoot:true}));
