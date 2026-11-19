/* RAMAYANA — "One Line". Wordless teaser: a golden line of dharma draws the epic and closes into the sun. See plan.md. */
import React from 'react';
import {S,addDef,blurF,clamp,eio,eo,fit,kick,letters,lerp,morphRadii,n1,osc,radial,rnd,seg,shapePath,uid,vblur,vel} from './kit/core';
import {type P,add,arrow,bow,bowPoint,CROWN_SMALL,crownPath,ext,f2,figure,glowF,heading,mace,mix,rig,shoulderOf,tail} from './kit/figure';
import type {FilmConfig,Frame} from './kit/film';

const BPM=96,B=60/BPM,BAR=4*B,Q=B/4;
const C={night:'#0C0A12',gold:'#E8B04B',cream:'#F3E6CC',fire:'#FF6A1F',crimson:'#C0213A'};
const GROUND=932,SHORE=770;
const push=(u:number,dur:number,amt:number,cx=960,cy=540)=>`translate(${cx} ${cy}) scale(${(1+amt*seg(u,0,dur)).toFixed(4)}) translate(${-cx} ${-cy})`;
const unit=(a:P,b:P):P=>{const d=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[0]-a[0])/d,(b[1]-a[1])/d];};
const along=(a:P,d:P,len:number):P=>[a[0]+d[0]*len,a[1]+d[1]*len];
const dist=(a:P,b:P)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
function radialGrad(col:string,op:number){return `url(#${addDef(id=><radialGradient key={id} id={id}><stop offset="0" stopColor={col} stopOpacity={op}/><stop offset="1" stopColor={col} stopOpacity={0}/></radialGradient>)})`;}

/* ---------- characters ---------- */
const RAMA={fill:C.gold,crown:'tall' as const,crownFill:C.cream,garment:'dhoti' as const};
const LAKSHMANA={fill:C.gold,crown:'tall' as const,crownFill:C.cream,garment:'dhoti' as const,farOp:.5};
const SITA={fill:C.cream,crown:'none' as const,garment:'saree' as const,hair:true,dir:-1 as const};
const RAVANA={fill:C.crimson,crown:'none' as const,garment:'dhoti' as const,bulk:1.32,head:false,farOp:.7};
const hanuman=(fill:string)=>({fill,crown:'small' as const,crownFill:fill===C.night?C.night:C.gold,garment:'dhoti' as const,monkey:true,farOp:.6});

/** Rama as archer: far arm holds the grip, near hand draws the string from the bow to the cheek. */
function archer(p:P,s:number,pull:number,tremble=0){
  const sh=shoulderOf(p,6,s),grip:P=[sh[0]+200*s,sh[1]+4*s],anchor:P=[sh[0]+16*s,sh[1]-6*s];
  const k=clamp(pull),rest:P=[grip[0]-(42+48*Math.max(0,pull))*s,grip[1]],hand=add(mix(rest,anchor,k),[0,tremble]);
  const j=rig({p,spine:6,neck:8,far:{hand:grip,bend:1},near:{hand,bend:-1,l1:1-.5*k},legFar:[205,195],legNear:[160,180],s});
  return {j,grip:j.hF,nock:j.hN};
}
function tenHeads(c:P,s:number,u:number,at:(k:number)=>number,pulse:number){
  const order=[4,5,3,6,2,7,1,8,0,9],out:React.ReactNode[]=[];
  for(let i=0;i<10;i++){
    const t0=at(order.indexOf(i));if(u<t0)continue;
    const e=osc(u-t0,22,.45),hx=c[0]+(i-4.5)*68*s,hy=c[1]+Math.abs(i-4.5)*8*s;
    out.push(<g key={i} transform={`translate(${n1(hx)} ${n1(hy)}) scale(${(e*(1+pulse)).toFixed(3)})`}>
      <circle r={n1(30*s)} fill={C.crimson}/>
      <path d={crownPath([0,0],0,s,CROWN_SMALL)} fill={C.gold}/>
      <ellipse cx={n1(-10*s)} cy={n1(-1*s)} rx={n1(6.5*s)} ry={n1(2.4*s)} fill={C.cream}/><ellipse cx={n1(10*s)} cy={n1(-1*s)} rx={n1(6.5*s)} ry={n1(2.4*s)} fill={C.cream}/>
    </g>);
  }
  return out;
}
const headPos=(c:P,s:number,i:number):P=>[c[0]+(i-4.5)*68*s,c[1]+Math.abs(i-4.5)*8*s];
function waves(u:number,col:string,op:number,y0=SHORE+24,x0=0){
  return Array.from({length:7},(_,i)=>{const amp=6+i*2.4,wl=150+i*22,ph=u*1.6+i*.7,y=y0+i*44;
    const pts=Array.from({length:Math.ceil((S.W-x0)/24)+1},(_,k)=>{const x=x0+k*24;return `${x},${n1(y+amp*Math.sin(x/wl*Math.PI*2+ph))}`;}).join(' ');
    return <polyline key={uid()} points={pts} fill="none" stroke={col} strokeWidth={2} opacity={op*(.5+i*.08)}/>;});
}
type Bld={x:number;w:number;h:number;r:'dome'|'spire'};
const LANKA:Bld[]=[{x:1230,w:90,h:250,r:'dome'},{x:1325,w:66,h:350,r:'spire'},{x:1395,w:130,h:300,r:'dome'},{x:1530,w:80,h:430,r:'spire'},{x:1615,w:120,h:280,r:'dome'},{x:1740,w:84,h:360,r:'spire'},{x:1830,w:100,h:240,r:'dome'}];
function building(b:Bld,fill:string,stroke:string|undefined,hs=1){
  const h=b.h*hs,y=SHORE-h,x=b.x,w=b.w;
  const roof=b.r==='dome'?`M${x} ${n1(y)}A${w/2} ${w/2} 0 0 1 ${x+w} ${n1(y)}Z`:`M${x} ${n1(y)}L${x+w/2} ${n1(y-w*1.3)}L${x+w} ${n1(y)}Z`;
  const tip=b.r==='dome'?y-w/2:y-w*1.3;
  return <g key={uid()} fill={fill} stroke={stroke} strokeWidth={2}>
    <rect x={x} y={n1(y)} width={w} height={n1(h)}/><path d={roof}/><line x1={x+w/2} y1={n1(tip)} x2={x+w/2} y2={n1(tip-26)} stroke={stroke??fill} strokeWidth={4}/>
  </g>;
}

/* ---------- 01 THE BOW ---------- */
function s1(t:number):Frame{
  const u=t,s=1.02,p:P=[760,640];
  const pull=u<1.25?0:clamp(osc(u-1.25,7,.9)),trem=u>1.9?1.3*Math.sin(u*47):0;
  const {j,grip,nock}=archer(p,s,pull,trem);
  const ap=(i:number)=>osc(u-.28-i*.055,16,.62);
  const draw=eo(seg(u,0,.6)),strOp=clamp((u-.6)*25),twang=u<1.25?14*kick(u,.62,40,9):0,lead=bowPoint(grip,pull,s,draw);
  const dir=unit(nock,grip),aLen=dist(nock,grip)+150*s;
  return {bg:C.night,ink:C.gold,el:<g transform={push(u,2.5,.05,900,560)}>
    {[260,380,520,690].map((r,i)=><circle key={i} cx={960} cy={540} r={r} fill="none" stroke={C.gold} strokeWidth={1.8} opacity={[.24,.17,.12,.08][i]} pathLength={1} strokeDasharray={`${eo(seg(u,i*.12,1.4)).toFixed(4)} 1`} transform={`rotate(${n1(-90+u*4*(i%2?1:-1))} 960 540)`}/>)}
    <line x1={300} y1={GROUND} x2={n1(300+1320*eo(seg(u,.15,.9)))} y2={GROUND} stroke={C.gold} strokeWidth={2} opacity={.5}/>
    {figure(j,RAMA,ap)}
    <g filter={glowF(5)}>
      {bow(grip,pull,u>=1.25?nock:null,s,C.gold,C.cream,draw,strOp,twang)}
      {u>=1.25&&<g opacity={seg(u,1.25,.08)}>{arrow(nock,along(nock,dir,aLen),s,C.cream)}</g>}
    </g>
    {draw<1&&<circle cx={n1(lead[0])} cy={n1(lead[1])} r={9} fill={C.cream} filter={glowF(8)}/>}
  </g>};
}

/* ---------- 02 THE LINE (Lakshman Rekha) ---------- */
const RK={cx:1010,cy:912,rx:290,ry:58};
const rekhaPt=(e:number):P=>{const a=Math.PI+2*Math.PI*e;return [RK.cx+RK.rx*Math.cos(a),RK.cy+RK.ry*Math.sin(a)];};
const rekhaPath=(e0:number,e1:number)=>{const n=Math.max(2,Math.ceil(140*(e1-e0)));return 'M'+Array.from({length:n+1},(_,k)=>f2(rekhaPt(e0+(e1-e0)*k/n))).join('L');};
const LOTUS_BUD=radial.fn(th=>12+16*Math.pow(Math.abs(Math.cos(th+Math.PI/2)),2));
const LOTUS=radial.rosette(8,15,30,1.4);
function s2(t:number):Frame{
  const u=t-BAR;
  const rise=(1-osc(u-.05,8,.85))*760;
  const sj=rig({p:[1010,640],spine:0,neck:-6,far:{hand:[1051,522],bend:1},near:{hand:[1059,518],bend:1},legFar:[182,180],legNear:[177,181],s:.98});
  const lotusAt:P=[2*1010-sj.hN[0],sj.hN[1]-24],le=osc(u-.75,13,.5);
  const lj=rig({p:[560,800],spine:14,neck:32,far:{u:150,f:175},near:{hand:[690,860],bend:1},legFar:[180,270],legNear:[92,180],s:.92});
  const lap=(i:number)=>osc(u-.2-i*.05,16,.62);
  const e=eio(seg(u,.9,.95)),done=u>=3*B,q=seg(u,3*B,.5);
  const sparks=e>0&&e<1?Array.from({length:16},(_,i)=>{const te=u-i*.035,ee=eio(seg(te,.9,.95));if(ee<=0)return null;const pt=rekhaPt(ee),age=i*.035;
    return <circle key={i} cx={n1(pt[0]+(rnd(i+Math.floor(u*60))-.5)*24*age*10)} cy={n1(pt[1]-90*age-6)} r={n1(3.4*(1-i/16))} fill={C.cream} opacity={1-i/16}/>;}):null;
  return {bg:C.night,ink:C.gold,el:<g transform={push(u,2.5,.04,1000,620)}>
    {Array.from({length:8},(_,i)=>{const x=140+i*235+rnd(i)*60,top=360+rnd(i+20)*220;return <g key={i} opacity={.1} stroke={C.gold} fill="none"><line x1={n1(x)} y1={n1(top)} x2={n1(x)} y2={GROUND} strokeWidth={3}/><circle cx={n1(x)} cy={n1(top)} r={n1(60+rnd(i+40)*50)} strokeWidth={1.5}/></g>;})}
    <line x1={200} y1={GROUND} x2={1720} y2={GROUND} stroke={C.gold} strokeWidth={2} opacity={.35}/>
    <g clipPath={`url(#${addDef(id=><clipPath key={id} id={id}><rect x={0} y={0} width={S.W} height={GROUND}/></clipPath>)})`}>
      <g transform={`translate(0 ${n1(rise)})`}>
        <circle cx={1010} cy={520} r={260} fill={radialGrad(C.cream,.12)}/>
        {figure(sj,SITA)}
        {le>0&&<g transform={`translate(${f2(lotusAt)}) scale(${(.4+.6*clamp(le*1.2)).toFixed(3)})`}><path d={shapePath(morphRadii(LOTUS_BUD,LOTUS,le),0,0)} fill={C.fire}/><circle r={7*clamp(le)} fill={C.gold}/></g>}
      </g>
    </g>
    {figure(lj,LAKSHMANA,lap)}
    {lap(4)>.9&&arrow(lj.hN,[715,910],.85,C.cream)}
    <g filter={glowF(6)}>
      {e>0&&<path d={rekhaPath(0,e)} fill="none" stroke={C.gold} strokeWidth={n1(5+(done?6*Math.max(0,kick(u,3*B,26,7)):0))} strokeLinecap="round"/>}
      {done&&q<1&&<ellipse cx={RK.cx} cy={RK.cy} rx={n1(RK.rx*(1+.45*q))} ry={n1(RK.ry*(1+.45*q))} fill="none" stroke={C.gold} strokeWidth={3} opacity={(1-q)*.7}/>}
      {sparks}
    </g>
  </g>};
}

/* ---------- 03 TEN HEADS ---------- */
function s3(t:number):Frame{
  const u=t-2*BAR,s=1.25;
  const fly=eo(seg(u,0,.8)),fade=1-seg(u,.25,.6);
  const shards=fade>0?Array.from({length:28},(_,k)=>{const e0=k/28,e1=(k+1)/28,m=rekhaPt((e0+e1)/2),d=unit([RK.cx,RK.cy],[m[0],RK.cy+(m[1]-RK.cy)*3]),D=(380+rnd(k)*320)*fly;
    return <path key={k} d={rekhaPath(e0,e1)} fill="none" stroke={C.gold} strokeWidth={5} strokeLinecap="round" opacity={fade} transform={`translate(${n1(d[0]*D)} ${n1(d[1]*D-180*fly)}) rotate(${n1((rnd(k+9)-.5)*300*fly)} ${f2(m)})`}/>;}):null;
  const dy=(1-osc(u-.04,9,.72))*640;
  const rj=rig({p:[960,610+dy],spine:-3,neck:0,far:{u:32,f:12},near:{u:128,f:150},legFar:[208,188],legNear:[152,172],s});
  const at=(k:number)=>.32+k*Q,pulse=.04*[0,1,2,3].reduce((a,b)=>a+Math.max(0,kick(u,b*B,30,10)),0);
  const shake=[...Array(10)].reduce((a,_,k)=>a+kick(u,at(k),50,14),0)*7;
  const blade=ext(rj.hF,280*s,30);
  const sitaE=eio(seg(u,1.3,.9)),sp=mix([1500,760],[1830,60],sitaE),sitaPos=(x:number):P=>mix([1500,760],[1830,60],eio(seg(x,1.3,.9))),sv=vel(x=>sitaPos(x)[1],u);
  const sj=rig({p:sp,spine:-12*sitaE,neck:-20,far:{u:20,f:8},near:{u:-12,f:-25},legFar:[188,182],legNear:[172,178],s:.42});
  return {bg:C.night,ink:C.crimson,el:<g transform={`translate(${n1(shake)} 0)`}>
    <rect width={S.W} height={S.H} fill={C.crimson} opacity={.32*(1-seg(u,0,.4))}/>
    <circle cx={960} cy={470} r={780} fill={radialGrad(C.crimson,.42)}/>
    {shards}
    {figure(rj,RAVANA)}
    <g filter={glowF(4)}>
      <path d={`M${f2(rj.hF)}Q${f2(ext(rj.hF,150*s,8))} ${f2(blade)}`} fill="none" stroke={C.gold} strokeWidth={n1(11*s)} strokeLinecap="round"/>
      <line x1={n1(rj.hF[0]-26*s)} y1={n1(rj.hF[1]+8*s)} x2={n1(rj.hF[0]+26*s)} y2={n1(rj.hF[1]-8*s)} stroke={C.gold} strokeWidth={n1(8*s)} strokeLinecap="round"/>
    </g>
    {tenHeads([rj.head[0],rj.head[1]+4],s,u,at,pulse)}
    {u>=1.05&&<g opacity={clamp((u-1.05)*8)*(1-seg(u,2.0,.2))}>
      <path d={`M1500 760L${f2(sp)}`} stroke={C.cream} strokeWidth={2} opacity={.4}/>
      <g filter={blurF(vblur(vel(x=>sitaPos(x)[0],u),.003,18),vblur(sv,.003,18))}>{figure(sj,SITA)}</g>
    </g>}
  </g>};
}

/* ---------- 04 THE LEAP ---------- */
const LEAP0:P=[170,640],LEAP1:P=[1275,339],ARC=190,HS4=.8;
const leapP=(x:number)=>{const k=seg(x,.12,1.18);return .5-.5*Math.cos(Math.PI*k);};
const leapAt=(p:number):P=>[lerp(LEAP0[0],LEAP1[0],p),lerp(LEAP0[1],LEAP1[1],p)-ARC*4*p*(1-p)];
const leapPos=(x:number):P=>leapAt(leapP(x));
function s4(t:number):Frame{
  const u=t-3*BAR,s=.85,flip=u>=3*B,landed=u>=1.3;
  const col=flip?C.night:C.fire,bg=flip?C.fire:C.night;
  const pos=leapPos(u),ang=landed?18:heading(leapPos(u-1/120),leapPos(u+1/120));
  const squash=landed?1-.16*Math.max(0,kick(u,1.3,28,8)):1;
  const hj=landed
    ?rig({p:pos,spine:45,neck:55,far:{u:110,f:150},near:{u:150,f:170},legFar:[235,160],legNear:[125,205],s})
    :rig({p:pos,spine:ang,neck:ang-12,far:{u:ang-80,f:ang-140},near:{u:ang-4,f:ang-8},legFar:[ang+200,ang+140],legNear:[ang+170,ang+190],s});
  const wob=8*Math.sin(u*9);
  const tailTip=ext(ext(hj.pel,185*s,hj.spine+172+wob),74*s,hj.spine+78-wob*1.5);
  const fx=vel(x=>leapPos(x)[0],u),fy=vel(x=>leapPos(x)[1],u);
  const trailN=Math.max(2,Math.ceil(48*leapP(u)));
  const trail='M'+Array.from({length:trailN+1},(_,k)=>f2(leapAt(leapP(u)*k/trailN))).join('L');
  const flames=flip?LANKA.flatMap((b,i)=>[0,1].map(k=>{const g=osc(u-3*B-i*.03-k*.05,18,.5),h=(70+rnd(i*2+k)*90)*(1+.18*Math.sin(u*24+i*3+k))*g,x=b.x+b.w*(k?.72:.28),y=SHORE-b.h*HS4-(b.r==='dome'?b.w*.3:b.w*.6);
    return <path key={`${i}-${k}`} d={`M${n1(x-18)} ${n1(y)}Q${n1(x-20)} ${n1(y-h*.55)} ${n1(x)} ${n1(y-h)}Q${n1(x+20)} ${n1(y-h*.55)} ${n1(x+18)} ${n1(y)}Z`} fill={C.cream}/>;})):null;
  const embers=flip?Array.from({length:36},(_,i)=>{const age=((u-3*B)*(.6+rnd(i)*.6)+rnd(i+50))%1;return <circle key={i} cx={n1(1200+rnd(i+70)*700+Math.sin(u*3+i)*14)} cy={n1(SHORE-120-age*620)} r={n1(3+rnd(i+90)*3)} fill={C.cream} opacity={n1(1-age)}/>;}):null;
  return {bg,ink:flip?C.night:C.gold,el:<g transform={push(u,2.5,.03,960,540)}>
    {waves(u,flip?C.night:C.gold,flip?.5:.35)}
    {LANKA.map(b=>building(b,C.night,flip?undefined:C.gold,HS4))}
    {flames}{embers}
    {!flip&&<path d={trail} fill="none" stroke={C.gold} strokeWidth={4} strokeLinecap="round" opacity={.6} filter={glowF(5)}/>}
    <g filter={landed?undefined:blurF(vblur(fx,.0015,9),vblur(fy,.0015,9))} transform={`translate(${f2(pos)}) scale(1 ${squash.toFixed(3)}) translate(${n1(-pos[0])} ${n1(-pos[1])})`}>
      {tail(hj.pel,hj.spine,s,col,wob)}
      {figure(hj,hanuman(col))}
      {mace(hj.hF,landed?heading(hj.eF,hj.hF):ang+155,s*.72,flip?C.night:C.gold)}
      {u>=1.45&&<path d={`M${n1(tailTip[0]-12)} ${n1(tailTip[1])}Q${n1(tailTip[0]-10)} ${n1(tailTip[1]-34)} ${n1(tailTip[0])} ${n1(tailTip[1]-52*clamp((u-1.45)*4)*(1+.2*Math.sin(u*30)))}Q${n1(tailTip[0]+10)} ${n1(tailTip[1]-34)} ${n1(tailTip[0]+12)} ${n1(tailTip[1])}Z`} fill={flip?C.cream:C.gold}/>}
    </g>
    {landed&&!flip&&(()=>{const q=seg(u,1.3,.45);return <ellipse cx={1275} cy={525} rx={n1(30+120*q)} ry={n1(6+12*q)} fill="none" stroke={C.gold} strokeWidth={3} opacity={1-q}/>;})()}
    {flip&&<rect width={S.W} height={S.H} fill={C.cream} opacity={.6*(1-seg(u,3*B,.12))}/>}
  </g>};
}

/* ---------- 05 THE ARROW ---------- */
const TARGET:P=[1650,400],REL=1.25,HIT=1.55;
function s5(t:number):Frame{
  const u=t-4*BAR,s=.8,p:P=[250,566];
  const pull=u<REL?1:1-osc(u-REL,40,.3),trem=u<REL?1.2*Math.sin(u*47):0;
  const {j,grip,nock}=archer(p,s,pull,trem);
  const a0=archer(p,s,1,0),n0=a0.nock,dir=unit(n0,TARGET),aLen=dist(n0,a0.grip)+150*s;
  const tailAt=(x:number)=>mix(n0,along(TARGET,dir,-aLen),seg(x,REL,HIT-REL)),tl=tailAt(u),vx=vel(x=>tailAt(x)[0],u);
  const hit=u>=HIT,dt=u-HIT,q=seg(u,HIT,.35);
  const stones=Array.from({length:8},(_,i)=>{const at=i*Q;if(u<at)return null;const x=440+i*140,y=806-(1-osc(u-at,20,.5))*900,sq=seg(u,at+.1,.4);
    return <g key={i}><ellipse cx={x} cy={n1(y)} rx={56} ry={21} fill={C.gold}/><path d={`M${x-10} ${n1(y-4)}Q${x} ${n1(y-14)} ${x+10} ${n1(y-4)}`} fill="none" stroke={C.night} strokeWidth={3} strokeLinecap="round"/>
      {sq>0&&sq<1&&<ellipse cx={x} cy={812} rx={n1(40+70*sq)} ry={n1(10+12*sq)} fill="none" stroke={C.gold} strokeWidth={2.5} opacity={(1-sq)*.6}/>}</g>;});
  const shards=hit&&dt<1?Array.from({length:10},(_,i)=>{const hp=headPos(TARGET,.55,i);return Array.from({length:6},(_,k)=>{const r=rnd(i*6+k),vx2=(hp[0]-TARGET[0])*3+(r-.5)*700,vy2=-180-rnd(i*6+k+99)*420,x=hp[0]+vx2*dt,y=hp[1]+vy2*dt+650*dt*dt,sz=10+r*14,ro=(rnd(i*6+k+7)-.5)*900*dt;
    return <path key={`${i}-${k}`} d={`M0 ${-sz}L${n1(sz*.8)} ${n1(sz*.6)}L${n1(-sz*.8)} ${n1(sz*.6)}Z`} fill={k%2?C.gold:C.crimson} opacity={1-seg(dt,.55,.4)} transform={`translate(${n1(x)} ${n1(y)}) rotate(${n1(ro)})`}/>;});}):null;
  const shake=hit?[12*kick(u,HIT,45,10),8*kick(u,HIT+.01,50,12)]:[0,0];
  return {bg:C.night,ink:C.gold,el:<g transform={`translate(${n1(shake[0])} ${n1(shake[1])})`}>
    {waves(u,C.gold,.3,SHORE+40,330)}
    <line x1={0} y1={790} x2={340} y2={790} stroke={C.gold} strokeWidth={2} opacity={.5}/>
    {LANKA.map(b=>building({...b,x:b.x+40},C.night,C.gold,.55))}
    <line x1={380} y1={830} x2={n1(380+1140*eo(seg(u,0,1.3)))} y2={830} stroke={C.gold} strokeWidth={3} filter={glowF(5)}/>
    {stones}
    {!hit&&tenHeads(TARGET,.55,u,()=>-1,.05*Math.max(0,Math.sin(u*Math.PI*2/B)))}
    {figure(j,RAMA)}
    <g filter={glowF(5)}>
      {bow(grip,pull,u<REL?nock:null,s,C.gold,C.cream,1,1,u>=REL?10*kick(u,REL,40,10):0)}
      {u<REL&&arrow(nock,along(nock,unit(nock,grip),aLen),s,C.cream)}
      {u>=REL&&!hit&&<><line x1={n1(n0[0])} y1={n1(n0[1])} x2={n1(tl[0])} y2={n1(tl[1])} stroke={C.gold} strokeWidth={3} opacity={.7}/>
        <g filter={blurF(vblur(vx,.003,40),0)}>{arrow(tl,along(tl,dir,aLen),s,C.cream)}</g></>}
      {hit&&<line x1={n1(n0[0])} y1={n1(n0[1])} x2={TARGET[0]} y2={TARGET[1]} stroke={C.gold} strokeWidth={3} opacity={.7*(1-seg(dt,0,.6))}/>}
    </g>
    {shards}
    {hit&&q<1&&<circle cx={TARGET[0]} cy={TARGET[1]} r={n1(60+520*eo(q))} fill={radialGrad(C.cream,.95)} opacity={1-q}/>}
  </g>};
}

/* ---------- 06 THE SUN ---------- */
const SUN:P=[960,420],R=170;
function s6(t:number):Frame{
  const u=t-5*BAR;
  const parts=Array.from({length:72},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/72,st:P=[1150+rnd(i)*700,120+rnd(i+300)*700],en:P=[SUN[0]+R*Math.cos(a),SUN[1]+R*Math.sin(a)],e=eio(seg(u,rnd(i+600)*.12,.55)),pp=mix(st,en,e);
    return <rect key={i} x={n1(pp[0]-5)} y={n1(pp[1]-5)} width={10} height={10} fill={i%5?C.gold:C.crimson} transform={`rotate(45 ${f2(pp)})`} opacity={1-seg(u,.75,.3)}/>;});
  const disc=R*osc(u-.55,11,.65),re=osc(u-.62,12,.5),br=u>1.1?1+.012*Math.sin((u-1.1)*3.2):1;
  const sz=fit('RAMAYANA',700,1240,150,.14),lw=760*eo(seg(u,1.2,.5));
  return {bg:C.night,ink:C.gold,el:<>
    <g transform={`translate(${f2(SUN)}) scale(${br.toFixed(4)}) translate(${n1(-SUN[0])} ${n1(-SUN[1])})`}>
      <circle cx={SUN[0]} cy={SUN[1]} r={720} fill={radialGrad(C.gold,.22*seg(u,.5,.6))}/>
      {[260,350,460,590].map((r,i)=><circle key={i} cx={SUN[0]} cy={SUN[1]} r={r} fill="none" stroke={C.gold} strokeWidth={1.6} opacity={[.4,.26,.16,.09][i]} pathLength={1} strokeDasharray={`${eo(seg(u,.4+i*.08,.7)).toFixed(4)} 1`} transform={`rotate(${n1(-90+u*5*(i%2?1:-1))} ${f2(SUN)})`}/>)}
      {re>0&&<path d={shapePath(morphRadii(radial.circle(R),radial.rays(16,R+6,82,5),re),SUN[0],SUN[1])} fill={C.gold} opacity={.85} transform={`rotate(${n1(u*5)} ${f2(SUN)})`}/>}
      {parts}
      <circle cx={SUN[0]} cy={SUN[1]} r={R} fill="none" stroke={C.gold} strokeWidth={6} pathLength={1} strokeDasharray={`${eo(seg(u,.45,.25)).toFixed(4)} 1`} transform={`rotate(-90 ${f2(SUN)})`} filter={glowF(8)}/>
      {disc>0&&<circle cx={SUN[0]} cy={SUN[1]} r={n1(disc)} fill={C.gold} filter={glowF(14)}/>}
    </g>
    <g filter={glowF(4)}>{letters('RAMAYANA',S.CX,845,sz,700,C.gold,u,.75,{stag:.055,trk:.14,dur:.45})}</g>
    {lw>0&&<g fill={C.gold}><rect x={n1(S.CX-lw/2)} y={884} width={n1(lw)} height={2.5}/><rect x={n1(S.CX-lw/2-7)} y={879} width={10} height={10} transform={`rotate(45 ${n1(S.CX-lw/2-2)} 884)`}/><rect x={n1(S.CX+lw/2-3)} y={879} width={10} height={10} transform={`rotate(45 ${n1(S.CX+lw/2+2)} 884)`}/></g>}
  </>};
}

export const film:FilmConfig={
  width:1920,height:1080,fps:60,duration:6*BAR,
  sections:[{name:'THE BOW',start:0,render:s1},{name:'THE LINE',start:BAR,render:s2},{name:'TEN HEADS',start:2*BAR,render:s3},{name:'THE LEAP',start:3*BAR,render:s4},{name:'THE ARROW',start:4*BAR,render:s5},{name:'THE SUN',start:5*BAR,render:s6}],
  hud:null,audio:'soundtrack.wav',grain:.07,
  fonts:{display:{family:'Cinzel',file:'Cinzel-Variable.ttf'},mono:{family:'GeistMono',file:'GeistMono-Variable.woff2'}},
  preloadWeights:[400,700,900],
};
