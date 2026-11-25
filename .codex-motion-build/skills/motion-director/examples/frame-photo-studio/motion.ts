import {spring} from 'remotion';
import type {StudioProject} from './config';
import {burstPosition,depthPresets} from './lib/depth-motion';
import {anchoredCamera,cameraRecoil,projectPoint} from './lib/type-camera';
import type {Affine2D} from './lib/type-camera';
export const fps=60;
const configs={body:{stiffness:240,damping:25,mass:1},camera:{stiffness:180,damping:28,mass:1},flip:{stiffness:190,damping:27,mass:1},letters:{stiffness:240,damping:18,mass:.7}};
export const event=(p:StudioProject,id:string)=>p.events.find(e=>e.id===id)!.frame;
export const step=(f:number,start:number,kind:keyof typeof configs='body')=>f<start?0:spring({frame:f-start,fps,config:configs[kind]});
/** Superposition retains velocity when target steps change. Never reset a live spring. */
export function track(f:number,initial:number,keys:readonly (readonly[number,number])[],kind:keyof typeof configs='body'){
 let v=initial,old=initial;for(const [at,target]of keys){v+=(target-old)*step(f,at,kind);old=target;}return v;
}
export type Pose={x:number;y:number;z:number;w:number;h:number;rx:number;ry:number;rz:number;radius:number};
export function heroPose(f:number,p:StudioProject):Pose{
 const burst=event(p,'depth-burst'),select=event(p,'select-contact'),flip=event(p,'card-flip'),spread=p.scenes[4].from,last=event(p,'identity-impact')-8;
 return {
  x:track(f,540,[[burst,540],[select-20,540],[spread,550],[last,540]]),
  y:track(f,1470,[[5,1260],[burst,1175],[select-20,1210],[flip,1240],[spread,1290],[last,530]]),
  z:track(f,-90,[[5,35],[burst,110],[select-20,100],[flip,55],[spread,20],[last,0]]),
  w:Math.max(70,track(f,260,[[5,785],[burst,590],[select-20,740],[flip,805],[spread,620],[last,108]])),
  h:Math.max(70,track(f,350,[[5,1010],[burst,790],[select-20,1040],[flip,910],[spread,760],[last,108]])),
  rx:track(f,18,[[5,0],[burst,10],[select-20,0],[spread,-8],[last,0]]),
  ry:track(f,-16,[[5,-7],[burst,-13],[select-20,0],[flip,180],[last,180]],'flip'),
  rz:track(f,-13,[[5,-3],[burst,-5],[select-20,0],[flip,4],[spread,-9],[last,0]]),
  radius:Math.max(0,track(f,26,[[burst,12],[select-20,2],[flip,2],[last,15]])),
 };
}
export function camera(f:number,p:StudioProject):Affine2D{
 const s=track(f,1,[[event(p,'depth-burst')-2,.81],[event(p,'select-contact')-20,1.29],[event(p,'card-flip')-22,1],[p.scenes[4].from-6,.84],[event(p,'identity-impact')-8,1]],'camera');
 const impacts=[event(p,'cards-settle'),event(p,'select-contact'),event(p,'product-lock'),event(p,'identity-impact')];
 const rs=impacts.map(eventFrame=>cameraRecoil(f,60,{eventFrame,amplitudeDeliveryPx:4,rotationDegrees:.13}));
 const offset={x:rs.reduce((a,r)=>a+r.offsetDeliveryPx.x,0),y:rs.reduce((a,r)=>a+r.offsetDeliveryPx.y,0)};
 return anchoredCamera(p.camera.origin,p.camera.origin,s,{offsetDeliveryPx:offset,rotationDegrees:rs.reduce((a,r)=>a+r.rotationDegrees,0)});
}
/** Same rotation order and perspective origin used by CSS: Rx, Ry, Rz, translate, perspective. */
export function cardWorldPoint(pose:Pose,local:{x:number;y:number;z?:number}){
 let {x,y}=local,z=local.z??0;const rad=(a:number)=>a*Math.PI/180;
 const ax=rad(pose.rx),ay=rad(pose.ry),az=rad(pose.rz);
 [y,z]=[y*Math.cos(ax)-z*Math.sin(ax),y*Math.sin(ax)+z*Math.cos(ax)];
 [x,z]=[x*Math.cos(ay)+z*Math.sin(ay),-x*Math.sin(ay)+z*Math.cos(ay)];
 [x,y]=[x*Math.cos(az)-y*Math.sin(az),x*Math.sin(az)+y*Math.cos(az)];
 return {x:x+pose.x,y:y+pose.y,z:z+pose.z};
}
export function projectCardPoint(pose:Pose,local:{x:number;y:number;z?:number},p:StudioProject,m:Affine2D){
 const {x,y,z}=cardWorldPoint(pose,local);
 const d=p.camera.perspective,origin=p.camera.origin;if(d-z<150)throw new Error('Photo crossed camera safe plane');
 const s=d/(d-z);return projectPoint({x:origin.x+(x-origin.x)*s,y:origin.y+(y-origin.y)*s},m);
}
export const secondaryTargets=[
 {x:150,y:895,z:-220,rx:14,ry:18,rz:-15,asset:'movement' as const},
 {x:945,y:970,z:-330,rx:-10,ry:-20,rz:14,asset:'product' as const},
 {x:140,y:1490,z:-200,rx:-12,ry:16,rz:11,asset:'product' as const},
 {x:960,y:1520,z:-270,rx:12,ry:-15,rz:-12,asset:'movement' as const},
];
export function secondaryPose(f:number,i:number,p:StudioProject):Pose{
 const target=secondaryTargets[i],birth=event(p,'depth-burst')+6+i*2;
 const origin=heroPose(birth,p),initial={x:origin.x,y:origin.y,z:origin.z-320};
 const pos=burstPosition(f,60,initial,target,birth,depthPresets.explosionSpring);
 const reflow=step(f,p.scenes[4].from-10),exit=step(f,event(p,'identity-impact')-8);
 const tail={x:[40,1040,50,1030][i],y:[1070,1030,1540,1570][i],z:[-180,-260,-160,-210][i]};
 return {x:pos.x+(tail.x-target.x)*reflow+(540-tail.x)*exit,y:pos.y+(tail.y-target.y)*reflow+(530-tail.y)*exit,z:pos.z+(tail.z-target.z)*reflow+(-320-tail.z)*exit,
  w:Math.max(1,390*(1-exit)),h:Math.max(1,520*(1-exit)),rx:target.rx*(1-exit),ry:target.ry*(1-exit),rz:target.rz*(1-exit),radius:8};
}
