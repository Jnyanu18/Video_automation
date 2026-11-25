import {spring} from 'remotion';
import {bezierProgress,motionPresets} from './lib/motion-policy';
import {anchoredCamera,cameraRecoil} from './lib/type-camera';
import {areaPreservingScales} from './lib/depth-motion';
import type {EventId,EventStageProject} from './config';
export const clamp=(x:number,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const ease=(f:number,start:number,d=24)=>bezierProgress((f-start)/d,motionPresets.easing.snap);
const configs={body:{stiffness:240,damping:24,mass:1},letter:{stiffness:330,damping:20,mass:.8},camera:{stiffness:180,damping:28,mass:1},burst:{stiffness:300,damping:20,mass:1}};
export const step=(f:number,at:number,kind:keyof typeof configs='body')=>f<at?0:spring({frame:f-at,fps:60,config:configs[kind]});
/** Residual step responses preserve position and live velocity when a new target begins. */
export function track(f:number,initial:number,keys:readonly (readonly[number,number])[],kind:keyof typeof configs='body'){
 let value=initial,old=initial;for(const [at,target]of keys){value+=(target-old)*step(f,at,kind);old=target;}return value;
}
export const event=(p:EventStageProject,id:EventId)=>{const e=p.events.find(x=>x.id===id);if(!e)throw Error('Missing '+id);return e.frame;};
export type Pose={x:number;y:number;z:number;w:number;h:number;rx:number;ry:number;rz:number;radius:number};
export type Point={x:number;y:number;z:number};
export function heroStrain(f:number,p:EventStageProject){const age=f-event(p,'spark-contact');return age>=0&&age<20?areaPreservingScales(.12*Math.sin(age/20*Math.PI),.16):{scaleX:1,scaleY:1};}
export function heroInternalOpacity(f:number,p:EventStageProject){return 1-ease(f,event(p,'brand-cover')-8,12);}
/** All foreground type and chrome yields BEFORE the covering plane grows. */
export function foregroundOpacity(f:number,p:EventStageProject){return 1-ease(f,event(p,'brand-cover')-12,8);}
export function identityState(f:number,p:EventStageProject){const at=event(p,'logo-arrival');return{opacity:ease(f,at,20),scale:.96+.04*step(f,at),rule:ease(f,at+8,20),ctaOpacity:ease(f,at+10,20)};}
/** Whole words are legible on their named marker. There is no late per-glyph entrance. */
export function beatWordState(f:number,p:EventStageProject){
 const markers=(['lights','energy','action'] as const).map(id=>event(p,id));
 const index=f<markers[0]?-1:f<markers[1]?0:f<markers[2]?1:2;
 const at=index<0?markers[0]:markers[index];
 return {index,at,word:index<0?'':p.scenes[2].headline[index],opacity:index<0?0:1,
  scale:index<0?1:1+.14*Math.exp(-(f-at)/6)*Math.cos((f-at)*.5),firstReadableFrame:at};
}
export function heroPose(f:number,p:EventStageProject):Pose {
 const hit=event(p,'spark-contact'),build=event(p,'stage-unfold'),show=event(p,'lights'),detail=event(p,'detail-burst'),moment=event(p,'moment-pullback'),cover=event(p,'brand-cover');
 const diameter=p.geometry.ballDiameter,restY=p.geometry.floorY-diameter/2;
 return {
  x:track(f,p.geometry.contactX,[[build,540],[detail,350],[moment,540],[cover,540]]),
  y:f<hit?p.geometry.fallStartY+(restY-p.geometry.fallStartY)*(Math.max(0,f)/hit)**2:track(f,restY,[[hit+3,1270],[build,1240],[show,1370],[detail,1260],[moment,1300],[cover,960]]),
  z:track(f,0,[[hit+3,40],[build,100],[show,-90],[detail,90],[moment,-50],[cover,0]]),
  w:Math.max(20,track(f,diameter,[[hit+3,760],[build,810],[show,1500],[detail,480],[moment,750],[cover,1500]])),
  h:Math.max(20,track(f,diameter,[[hit+3,435],[build,670],[show,1180],[detail,590],[moment,510],[cover,2500]])),
  rx:track(f,0,[[hit+3,4],[build,13],[show,-8],[detail,12],[moment,4],[cover,0]]),
  ry:track(f,0,[[hit+3,-12],[build,-17],[show,8],[detail,-19],[moment,0],[cover,0]]),
  rz:track(f,0,[[hit+3,-6],[build,-4],[show,8],[detail,-8],[moment,0],[cover,0]]),
  // The handover uses an opaque, square-cornered plane, with generous edge margin.
  radius:f>=event(p,'logo-arrival')-6?0:Math.max(0,track(f,diameter/2,[[hit+3,24],[build,3],[detail,16],[moment,3],[cover,0]]))
 };
}
export function camera(f:number,p:EventStageProject){
 const s=track(f,1,[[event(p,'stage-unfold')-5,.91],[event(p,'lights')-10,1.12],[event(p,'detail-burst')-10,.88],[event(p,'moment-pullback')-10,1],[event(p,'brand-cover')-10,1]],'camera');
 const recoil=p.events.filter(e=>['spark-contact','stage-arrival','lights','detail-lock','moment-lock'].includes(e.id)).map(e=>cameraRecoil(f,60,{eventFrame:e.frame,amplitudeDeliveryPx:3.4,rotationDegrees:.1}));
 return anchoredCamera({x:540,y:1240},{x:540,y:1240},s,{offsetDeliveryPx:{x:recoil.reduce((a,r)=>a+r.offsetDeliveryPx.x,0),y:recoil.reduce((a,r)=>a+r.offsetDeliveryPx.y,0)},rotationDegrees:recoil.reduce((a,r)=>a+r.rotationDegrees,0)});
}
export function worldPoint(p:Pose,v:Point):Point{
 let {x,y,z}=v;const ax=p.rx*Math.PI/180,ay=p.ry*Math.PI/180,az=p.rz*Math.PI/180;
 [y,z]=[y*Math.cos(ax)-z*Math.sin(ax),y*Math.sin(ax)+z*Math.cos(ax)];
 [x,z]=[x*Math.cos(ay)+z*Math.sin(ay),-x*Math.sin(ay)+z*Math.cos(ay)];
 [x,y]=[x*Math.cos(az)-y*Math.sin(az),x*Math.sin(az)+y*Math.cos(az)];
 return{x:p.x+x,y:p.y+y,z:p.z+z};
}
export function projectWorldPoint(w:Point,f:number,p:EventStageProject){
 const d=1600;if(d-w.z<180)throw Error('Near-plane violation');const s=d/(d-w.z),q={x:540+(w.x-540)*s,y:1240+(w.y-1240)*s},m=camera(f,p);
 return{x:m.a*q.x+m.c*q.y+m.e,y:m.b*q.x+m.d*q.y+m.f};
}
export function projectHeroPoint(pose:Pose,v:Point,f:number,p:EventStageProject){return projectWorldPoint(worldPoint(pose,v),f,p);}
export function sparkContactGeometry(f:number,p:EventStageProject){
 const pose=heroPose(f,p),strain=heroStrain(f,p);
 const bottom=projectHeroPoint(pose,{x:0,y:pose.h*strain.scaleY/2,z:0},f,p);
 const floor=projectWorldPoint({x:p.geometry.contactX,y:p.geometry.floorY,z:0},f,p);
 return {bottom,floor,gapPx:Math.hypot(bottom.x-floor.x,bottom.y-floor.y),worldGapPx:p.geometry.floorY-(pose.y+pose.h*strain.scaleY/2)};
}
export function heroPolygon(f:number,p:EventStageProject){const pose=heroPose(f,p);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>projectHeroPoint(pose,{x:x*pose.w/2,y:y*pose.h/2,z:0},f,p));}
export function heroCoversViewport(f:number,p:EventStageProject){
 if(heroPose(f,p).radius!==0||heroInternalOpacity(f,p)!==0)return false;
 const poly=heroPolygon(f,p),points=[{x:0,y:0},{x:p.width,y:0},{x:p.width,y:p.height},{x:0,y:p.height}];
 return points.every(point=>{const cross=poly.map((a,i)=>{const b=poly[(i+1)%poly.length];return(b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x);});return cross.every(v=>v>=0)||cross.every(v=>v<=0);});
}
export const detailTargets=[{x:825,y:1020,z:-330,rz:10,ry:-18},{x:850,y:1420,z:-400,rz:7,ry:-12},{x:200,y:1580,z:-380,rz:-12,ry:14}];
export function detailPose(f:number,i:number,p:EventStageProject):Pose {
 const t=detailTargets[i],start=event(p,'detail-burst')+i*2,exit=event(p,'moment-pullback')-6;
 return{x:track(f,540,[[start,t.x],[exit,540]],'burst'),y:track(f,1235,[[start,t.y],[exit,1300]],'burst'),z:track(f,-500,[[start,t.z],[exit,-500]],'burst'),w:310,h:360,rx:12,ry:t.ry,rz:t.rz,radius:12};
}
