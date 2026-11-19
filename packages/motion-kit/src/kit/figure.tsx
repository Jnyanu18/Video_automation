import React from 'react';
import {addDef,clamp,n1,uid,S} from './core';

/* Rigged silhouette figures: tapered capsule limbs on a 2D skeleton, posed by angles or by hand targets (2-bone IK).
   Angles are degrees: 0 = up, 90 = right, 180 = down. Figures face right; dir:-1 mirrors around the pelvis. */
export type P=[number,number];
const rad=(d:number)=>d*Math.PI/180;
export const ext=(a:P,len:number,deg:number):P=>[a[0]+len*Math.sin(rad(deg)),a[1]-len*Math.cos(rad(deg))];
export const add=(a:P,b:P):P=>[a[0]+b[0],a[1]+b[1]];
export const mix=(a:P,b:P,e:number):P=>[a[0]+(b[0]-a[0])*e,a[1]+(b[1]-a[1])*e];
export const rot=(p:P,deg:number):P=>{const r=rad(deg),c=Math.cos(r),s=Math.sin(r);return [p[0]*c-p[1]*s,p[0]*s+p[1]*c];};
export const f2=(p:P)=>`${n1(p[0])} ${n1(p[1])}`;
/** Direction of a->b in rig degrees. */
export const heading=(a:P,b:P)=>Math.atan2(b[0]-a[0],-(b[1]-a[1]))*180/Math.PI;

/** Tapered capsule from a (radius ra) to b (radius rb). */
export function capsule(a:P,b:P,ra:number,rb:number){
  const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1e-6,nx=-dy/L,ny=dx/L;
  const p1:P=[a[0]+nx*ra,a[1]+ny*ra],p2:P=[b[0]+nx*rb,b[1]+ny*rb],p3:P=[b[0]-nx*rb,b[1]-ny*rb],p4:P=[a[0]-nx*ra,a[1]-ny*ra];
  return `M${f2(p1)}L${f2(p2)}A${n1(rb)} ${n1(rb)} 0 0 0 ${f2(p3)}L${f2(p4)}A${n1(ra)} ${n1(ra)} 0 0 0 ${f2(p1)}Z`;
}
/** 2-bone IK. bend=+1 puts the elbow clockwise of the shoulder->hand line. Returns [elbow, reachable hand]. */
export function ik(s:P,h:P,l1:number,l2:number,bend:number):[P,P]{
  const dx=h[0]-s[0],dy=h[1]-s[1],D=Math.hypot(dx,dy)||1e-6,d=Math.min(D,l1+l2-.01),a=Math.atan2(dy,dx);
  const b=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),ang=a+bend*b;
  return [[s[0]+l1*Math.cos(ang),s[1]+l1*Math.sin(ang)],[s[0]+dx/D*d,s[1]+dy/D*d]];
}

/** l1: upper-arm length scale (<1 fakes foreshortening, e.g. an archer's drawing arm pointing away from camera). */
export type Arm={u:number;f:number}|{hand:P;bend:number;l1?:number};
export type Pose={p:P;spine:number;neck:number;far:Arm;near:Arm;legFar:[number,number];legNear:[number,number];s:number};
export const SHOULDER=26,NECK=80;
/** Shoulder pivot for a pose (arms hang from here, near chin height). */
export const shoulderOf=(p:P,spine:number,s:number)=>ext(ext(p,165*s,spine),SHOULDER*s,spine);
export function rig(o:Pose){
  const s=o.s,pel=o.p,chest=ext(pel,165*s,o.spine),sh=ext(chest,SHOULDER*s,o.spine),head=ext(chest,NECK*s,o.neck);
  const arm=(a:Arm):[P,P]=>{if('hand' in a){const [e,h]=ik(sh,a.hand,108*s*(a.l1??1),98*s,a.bend);return [e,a.l1!==undefined?a.hand:h];}const e=ext(sh,108*s,a.u);return [e,ext(e,98*s,a.f)];};
  const [eF,hF]=arm(o.far),[eN,hN]=arm(o.near);
  const kF=ext(pel,150*s,o.legFar[0]),fF=ext(kF,145*s,o.legFar[1]),kN=ext(pel,150*s,o.legNear[0]),fN=ext(kN,145*s,o.legNear[1]);
  return {s,pel,chest,sh,head,eF,hF,eN,hN,kF,fF,kN,fN,neck:o.neck,spine:o.spine};
}
export type Rig=ReturnType<typeof rig>;

export const CROWN_TALL=[[-30,-24],[30,-24],[25,-52],[14,-56],[11,-82],[0,-106],[-11,-82],[-14,-56],[-25,-52]];
export const CROWN_SMALL=[[-27,-22],[27,-22],[20,-44],[9,-40],[0,-60],[-9,-40],[-20,-44]];
export const crownPath=(head:P,neck:number,s:number,pts:number[][])=>'M'+pts.map(q=>f2(add(head,rot([q[0]*s,q[1]*s],neck)))).join('L')+'Z';

export type Look={fill:string;crown?:'tall'|'small'|'none';crownFill?:string;garment?:'dhoti'|'saree'|'none';hair?:boolean;monkey?:boolean;bulk?:number;head?:boolean;dir?:1|-1;farOp?:number;eye?:string};

/** Scale a part in from its anchor joint (assembly animation). */
export function grow(el:React.ReactNode,a:P,e:number){
  if(e<=0||!el)return null;
  return <g key={uid()} transform={`translate(${f2(a)}) scale(${Math.max(0,e).toFixed(4)}) translate(${n1(-a[0])} ${n1(-a[1])})`} opacity={clamp(e*4)}>{el}</g>;
}

/** Draw a rigged figure. ap(i) gives the assembly progress of part i:
    0 torso, 1 head, 2 crown, 3 far arm, 4 near arm, 5 far leg, 6 near leg, 7 garment. */
export function figure(j:Rig,L:Look,ap:(i:number)=>number=()=>1){
  const s=j.s,bk=L.bulk??1,farOp=L.farOp??.6;
  const limb=(a:P,b:P,c:P,r1:number,r2:number,r3:number,foot:boolean)=><g>
    <path d={capsule(a,b,r1*s*bk,r2*s*bk)}/><path d={capsule(b,c,r2*s*bk*.92,r3*s*bk)}/>
    {foot?<path d={capsule(c,[c[0]+30*s,c[1]+3*s],9*s,7*s)}/>:<circle cx={n1(c[0])} cy={n1(c[1])} r={n1(10.5*s*bk)}/>}</g>;
  const torso=<g><path d={capsule(j.pel,j.chest,28*s*bk,40*s*bk)}/><path d={capsule(j.sh,j.head,11*s,10*s)}/></g>;
  const hp=(x:number,y:number)=>add(j.head,rot([x*s,y*s],j.neck));
  const eyeAt=L.monkey?hp(12,-9):hp(15,-5);
  const hd=L.head===false?null:<g>
    <circle cx={n1(j.head[0])} cy={n1(j.head[1])} r={n1(34*s)}/>
    {!L.monkey&&<path d={`M${f2(hp(27,-8))}L${f2(hp(42,8))}L${f2(hp(29,14))}Z`}/>}
    {L.monkey&&<><circle cx={n1(hp(24,14)[0])} cy={n1(hp(24,14)[1])} r={n1(19*s)}/><circle cx={n1(hp(-22,-16)[0])} cy={n1(hp(-22,-16)[1])} r={n1(11*s)}/></>}
    <ellipse cx={n1(eyeAt[0])} cy={n1(eyeAt[1])} rx={n1(6*s)} ry={n1(2.4*s)} fill={L.eye??'#000'} opacity={L.eye?1:.55} transform={`rotate(${n1(j.neck)} ${f2(eyeAt)})`}/>
    {L.hair&&(()=>{const bun=add(j.head,rot([-30*s,-4*s],j.neck));return <><circle cx={n1(bun[0])} cy={n1(bun[1])} r={n1(17*s)}/><path d={`M${f2(bun)}Q${f2([j.chest[0]-58*s,j.chest[1]])} ${f2([j.pel[0]-46*s,j.pel[1]-36*s])}`} fill="none" stroke={L.fill} strokeWidth={n1(10*s)} strokeLinecap="round"/></>;})()}
  </g>;
  const crown=L.crown&&L.crown!=='none'&&L.head!==false?<path d={crownPath(j.head,j.neck,s,L.crown==='tall'?CROWN_TALL:CROWN_SMALL)} fill={L.crownFill??L.fill}/>:null;
  let garment:React.ReactNode=null;
  if(L.garment==='dhoti'){const m=mix(j.kN,j.kF,.5);garment=<path d={`M${f2(add(j.pel,[-36*s*bk,-14*s]))}L${f2(add(j.pel,[36*s*bk,-14*s]))}L${f2(add(j.kN,[26*s,24*s]))}L${f2(add(m,[0,40*s]))}L${f2(add(j.kF,[-26*s,24*s]))}Z`}/>;}
  if(L.garment==='saree'){const y=Math.max(j.fN[1],j.fF[1])+8*s,x0=Math.min(j.fN[0],j.fF[0])-70*s,x1=Math.max(j.fN[0],j.fF[0])+56*s;
    garment=<g><path d={`M${f2(add(j.pel,[-40*s,-44*s]))}L${f2(add(j.pel,[36*s,-44*s]))}L${n1(x1)} ${n1(y)}L${n1(x0)} ${n1(y)}Z`}/>
      <path d={`M${f2(add(j.chest,[18*s,-8*s]))}Q${f2([j.chest[0]-52*s,j.chest[1]+40*s])} ${f2([j.pel[0]-66*s,j.pel[1]+72*s])}`} fill="none" stroke={L.fill} strokeWidth={n1(17*s)} strokeLinecap="round" opacity={.9}/></g>;}
  const g=<g fill={L.fill}>
    {grow(<g opacity={farOp}>{limb(j.sh,j.eF,j.hF,19,15,10,false)}</g>,j.sh,ap(3))}
    {grow(<g opacity={farOp}>{limb(j.pel,j.kF,j.fF,25,18,11,true)}</g>,j.pel,ap(5))}
    {grow(garment,j.pel,ap(7))}
    {grow(torso,j.pel,ap(0))}
    {grow(limb(j.pel,j.kN,j.fN,25,18,11,true),j.pel,ap(6))}
    {grow(hd,j.chest,ap(1))}
    {grow(crown,j.head,ap(2))}
    {grow(limb(j.sh,j.eN,j.hN,19,15,10,false),j.sh,ap(4))}
  </g>;
  return L.dir===-1?<g key={uid()} transform={`translate(${n1(2*j.pel[0])} 0) scale(-1 1)`}>{g}</g>:<g key={uid()}>{g}</g>;
}
/** World position of a rig point after the dir:-1 mirror. */
export const world=(j:Rig,p:P,dir:1|-1=1):P=>dir===-1?[2*j.pel[0]-p[0],p[1]]:p;

/** Soft glow: blurred copy merged under the source. Full-frame region so thin lines glow too. */
export function glowF(std:number){return `url(#${addDef(id=><filter key={id} id={id} filterUnits="userSpaceOnUse" x={-200} y={-200} width={S.W+400} height={S.H+400} colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation={std} result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>)})`;}

/* ---------- props ---------- */
/** Recurve bow held at grip, facing right. pull 0..1 flexes the limbs; nock = string hand (null = straight string). */
export function bow(grip:P,pull:number,nock:P|null,s:number,col:string,strCol:string,draw=1,stringOp=1,twang=0){
  const back=(42+48*pull)*s,top:P=[grip[0]-back,grip[1]-292*s],bot:P=[grip[0]-back,grip[1]+292*s];
  const d=`M${f2(top)}Q${f2([grip[0]+14*s,grip[1]-205*s])} ${f2(grip)}Q${f2([grip[0]+14*s,grip[1]+205*s])} ${f2(bot)}`;
  const mid:P=nock??[top[0]+twang,grip[1]];
  return <g key={uid()}>
    <path d={d} fill="none" stroke={col} strokeWidth={n1(11*s)} strokeLinecap="round" pathLength={1} strokeDasharray={`${draw.toFixed(4)} 1`}/>
    {draw>=1&&<><circle cx={n1(top[0])} cy={n1(top[1])} r={n1(8*s)} fill={col}/><circle cx={n1(bot[0])} cy={n1(bot[1])} r={n1(8*s)} fill={col}/></>}
    {stringOp>0&&<path d={`M${f2(top)}L${f2(mid)}L${f2(bot)}`} fill="none" stroke={strCol} strokeWidth={n1(2.6*s)} opacity={stringOp}/>}
  </g>;
}
/** Bow geometry helpers for callers (bezier point on the bow at param d in 0..1). */
export function bowPoint(grip:P,pull:number,s:number,d:number):P{
  const back=(42+48*pull)*s,top:P=[grip[0]-back,grip[1]-292*s],bot:P=[grip[0]-back,grip[1]+292*s];
  const q=(a:P,c:P,b:P,t:number):P=>[(1-t)*(1-t)*a[0]+2*(1-t)*t*c[0]+t*t*b[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*c[1]+t*t*b[1]];
  return d<.5?q(top,[grip[0]+14*s,grip[1]-205*s],grip,d*2):q(grip,[grip[0]+14*s,grip[1]+205*s],bot,(d-.5)*2);
}
export function arrow(nock:P,tip:P,s:number,col:string){
  const a=Math.atan2(tip[1]-nock[1],tip[0]-nock[0]),hx=Math.cos(a),hy=Math.sin(a),nx=-hy,ny=hx;
  const b:P=[tip[0]-hx*30*s,tip[1]-hy*30*s];
  return <g key={uid()} stroke={col} fill={col} strokeLinecap="round">
    <line x1={n1(nock[0])} y1={n1(nock[1])} x2={n1(b[0])} y2={n1(b[1])} strokeWidth={n1(4*s)}/>
    <path d={`M${f2(tip)}L${f2([b[0]+nx*11*s,b[1]+ny*11*s])}L${f2([b[0]-nx*11*s,b[1]-ny*11*s])}Z`} stroke="none"/>
    {[1,-1].map(k=><line key={k} x1={n1(nock[0]+hx*26*s)} y1={n1(nock[1]+hy*26*s)} x2={n1(nock[0]-hx*4*s+nx*k*12*s)} y2={n1(nock[1]-hy*4*s+ny*k*12*s)} strokeWidth={n1(3*s)}/>)}
  </g>;
}
export function mace(hand:P,deg:number,s:number,col:string){
  const end=ext(hand,118*s,deg),stub=ext(hand,-26*s,deg);
  return <g key={uid()} fill={col} stroke={col}><line x1={n1(stub[0])} y1={n1(stub[1])} x2={n1(end[0])} y2={n1(end[1])} strokeWidth={n1(9*s)} strokeLinecap="round"/><circle cx={n1(end[0])} cy={n1(end[1])} r={n1(30*s)} stroke="none"/><circle cx={n1(ext(end,32*s,deg)[0])} cy={n1(ext(end,32*s,deg)[1])} r={n1(7*s)} stroke="none"/></g>;
}
export function tail(pel:P,spine:number,s:number,col:string,wob=0){
  const c1=ext(pel,110*s,spine+205+wob),p1=ext(pel,185*s,spine+172+wob),c2=ext(p1,64*s,spine+150-wob),p2=ext(p1,74*s,spine+78-wob*1.5);
  return <path key={uid()} d={`M${f2(pel)}Q${f2(c1)} ${f2(p1)}Q${f2(c2)} ${f2(p2)}`} fill="none" stroke={col} strokeWidth={n1(13*s)} strokeLinecap="round"/>;
}
