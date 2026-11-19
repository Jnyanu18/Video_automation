import React,{useEffect,useId,useState} from 'react';
import {AbsoluteFill,Audio,Img,cancelRender,continueRender,delayRender,staticFile,useCurrentFrame} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';

/* CALMIND — app launch reel. 1080x1920, 60 fps, 15 s on a 128 BPM grid. Every visible state is a pure function of t. */
export const plan={brand:'CALMIND',fps:60,width:1080,height:1920,durationInFrames:900,bpm:128};
const W=1080,H=1920,CX=540,CY=960;
const B=60/128,BAR=4*B,HB=B/2;
export const C={ink:'#121016',sand:'#F1EBE1',lav:'#B4A2FF',saff:'#FF6F2C',screen:'#1B1724',card:'#2A2535',night:'#2E2A3A'};
export const STARTS=[0,BAR,2*BAR,3*BAR,4*BAR,5*BAR,6*BAR,6*BAR+3*B,15];
const NAMES=['NOISE','BREATHE','MOVE','FLOW','THE APP','INSIDE','DAILY','LAUNCH'];

const clamp=(x:number,a=0,b=1)=>x<a?a:x>b?b:x;
const seg=(t:number,t0:number,d:number)=>clamp((t-t0)/d);
const eo=(x:number)=>x>=1?1:x<=0?0:1-Math.pow(2,-10*x);
const eio=(x:number)=>x<=0?0:x>=1?1:x<.5?Math.pow(2,20*x-10)/2:(2-Math.pow(2,-20*x+10))/2;
const osc=(dt:number,w=20,z=.45)=>{if(dt<=0)return 0;const r=Math.sqrt(1-z*z),wd=w*r;return 1-Math.exp(-z*w*dt)*(Math.cos(wd*dt)+z/r*Math.sin(wd*dt));};
const vel=(f:(x:number)=>number,t:number)=>(f(t+1/240)-f(t-1/240))*120;
const vblur=(v:number,k=.004,mx=28)=>Math.min(mx,Math.abs(v)*k);
const n1=(x:number)=>Math.round(x*10)/10;
const p2=(n:number)=>String(n).padStart(2,'0');
const rnd=(i:number)=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};

/* Per-render id prefix and defs. Each motion-blur sample is its own Scene instance, so ids never collide. */
let PFX='',IDN=0,DEFS:React.ReactNode[]=[];
const uid=()=>`${PFX}${IDN++}`;
function blurF(sx:number,sy:number){if(sx<.35&&sy<.35)return undefined;const id=uid();DEFS.push(<filter key={id} id={id} x="-40%" y="-60%" width="180%" height="220%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation={`${n1(sx)} ${n1(sy)}`}/></filter>);return `url(#${id})`;}
function gooF(sig:number){const id=uid();DEFS.push(<filter key={id} id={id} filterUnits="userSpaceOnUse" x={-100} y={-100} width={W+200} height={H+200} colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation={n1(sig)}/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"/></filter>);return `url(#${id})`;}
function clip(x:number,y:number,w:number,h:number,rx=0){const id=uid();DEFS.push(<clipPath key={id} id={id}><rect x={n1(x)} y={n1(y)} width={n1(w)} height={n1(h)} rx={rx}/></clipPath>);return `url(#${id})`;}

const TWC=new Map<string,number>();let MCTX:CanvasRenderingContext2D|null=null;
const tw=(s:string,wt:number,sz:number,mono=false)=>{const fam=mono?'GeistMono':'Geist',k=`${s}|${wt}|${fam}`;let v=TWC.get(k);
  if(v===undefined){MCTX??=document.createElement('canvas').getContext('2d');MCTX!.font=`${wt} 100px ${fam}`;v=MCTX!.measureText(s).width/100;TWC.set(k,v);}return v*sz;};
const perChar=(s:string,wt:number,trk:number)=>[...s].reduce((a,c)=>a+tw(c,wt,1),0)+trk*(s.length-1);
const fit=(s:string,wt:number,maxW:number,maxS:number,trk=-.04)=>Math.min(maxS,maxW/perChar(s,wt,trk));

type TO={mono?:boolean;anchor?:'start'|'middle'|'end';ls?:number;stroke?:string;sw?:number;op?:number};
const T=(s:string,x:number,y:number,sz:number,wt:number,fill:string,o:TO={})=><text key={uid()} x={n1(x)} y={n1(y)} fontFamily={o.mono?'GeistMono':'Geist'} fontWeight={wt} fontSize={n1(sz)} fill={fill} textAnchor={o.anchor} letterSpacing={o.ls} stroke={o.stroke} strokeWidth={o.sw} strokeLinejoin="round" opacity={o.op}>{s}</text>;

/* Masked line rise with velocity-driven vertical blur. */
function rise(inner:React.ReactNode,base:number,sz:number,t:number,tIn:number,dur=.3){
  if(t<tIn)return null;
  const pos=(x:number)=>(1-eo(seg(x,tIn,dur)))*sz*1.05,dy=pos(t),vy=vel(pos,t);
  return <g key={uid()} clipPath={clip(-200,base-sz*1.02,W+400,sz*1.34)}><g transform={`translate(0 ${n1(dy)})`} filter={blurF(0,vblur(vy))}>{inner}</g></g>;
}
type LO={stag?:number;trk?:number;anchor?:'start'|'middle';dur?:number;stroke?:string;sw?:number;dy?:(i:number)=>number};
function letters(s:string,x:number,base:number,sz:number,wt:number,fill:string,t:number,tIn:number,o:LO={}){
  const {stag=.03,trk=-.04,anchor='middle',dur=.3}=o;
  const cs=[...s],ws=cs.map(c=>tw(c,wt,sz)),tot=ws.reduce((a,b)=>a+b,0)+trk*sz*(cs.length-1);
  let cx=anchor==='middle'?x-tot/2:x;
  return cs.map((c,i)=>{const el=rise(T(c,cx,base+(o.dy?o.dy(i):0),sz,wt,o.stroke?'none':fill,o.stroke?{stroke:o.stroke,sw:o.sw}:{}),base,sz,t,tIn+i*stag,dur);cx+=ws[i]+trk*sz;return el;});
}

type R={bg:string;ink:string;el:React.ReactNode};

/* Outline type: a fat stroke under a background-colored fill hides the variable font's overlapping contours. */
const outline=(s:string,x:number,y:number,sz:number,wt:number,ink:string,bg:string,sw:number,o:TO={})=><g key={uid()} opacity={o.op}>{T(s,x,y,sz,wt,ink,{...o,op:undefined,stroke:ink,sw:sw*2})}{T(s,x,y,sz,wt,bg,{...o,op:undefined})}</g>;

/* ---------- HUD: persistent viewfinder in the section's ink ---------- */
function hud(t:number,ink:string,sec:number){
  const I=40,L=28,f=Math.floor(t*60+1e-6);
  return <g key="hud" fontFamily="GeistMono" fontWeight={500} fontSize={20} fill={ink} letterSpacing={2}>
    <g stroke={ink} strokeWidth={2.5} fill="none">{[[I,I,1,1],[W-I,I,-1,1],[I,H-I,1,-1],[W-I,H-I,-1,-1]].map(([x,y,dx,dy],i)=><polyline key={i} points={`${x+dx*L},${y} ${x},${y} ${x},${y+dy*L}`}/>)}</g>
    <text x={84} y={96}>CALMIND / YOGA</text>
    <text x={W-84} y={96} textAnchor="end">{`TC 00:00:${p2(Math.floor(f/60))}:${p2(f%60)}`}</text>
    <text x={84} y={1836}>{`${p2(sec+1)} / 08 — ${NAMES[sec]}`}</text>
    <text x={W-84} y={1836} textAnchor="end">APP LAUNCH</text>
    <rect x={84} y={1852} width={912} height={2} opacity={.2}/>
    <rect x={84} y={1852} width={n1(912*t/15)} height={2}/>
  </g>;
}

/* ---------- 01 NOISE: half-beat stress words, then one breath ---------- */
const NOISE:[string,string,string][]=[['PINGS.',C.ink,C.sand],['DEADLINES.',C.sand,C.ink],['SCROLL.',C.saff,C.ink],['NOISE.',C.ink,C.saff]];
const CHIPS=['NEW MESSAGE','REMINDER 9:00','37 UNREAD','MEETING IN 5','LOW BATTERY','3 MISSED CALLS','REPLY NEEDED','DUE TODAY'];
const SLOTS=[[560,300],[130,1300],[110,400],[590,1410],[600,520],[110,1530],[140,610],[620,1640]];
function chip(i:number,u:number,fg:string,bg:string){
  const at=Math.floor(i/2)*HB+(i%2)*.09;if(u<at)return null;
  const s=CHIPS[i],sz=26,ls=3,w=tw(s,500,sz,true)+ls*(s.length-1)+78,h=66;
  const [x,y]=SLOTS[i];
  const e=osc(u-at,26,.5),sc=.6+.4*e,cx=x+w/2,cy=y+h/2;
  return <g key={uid()} opacity={clamp((u-at)*20)} transform={`translate(${n1(cx)} ${n1(cy)}) scale(${sc.toFixed(3)}) rotate(${n1((rnd(i+3)-.5)*8)}) translate(${n1(-cx)} ${n1(-cy)})`}>
    <rect x={n1(x)} y={n1(y)} width={n1(w)} height={h} rx={33} fill={fg}/>
    <circle cx={n1(x+30)} cy={n1(cy)} r={7} fill={fg===C.saff?C.ink:C.saff}/>
    {T(s,x+48,cy+9,sz,500,bg,{mono:true,ls})}
  </g>;
}
function s0(t:number):R{
  const u=t;
  if(u<2*B){
    const c=Math.min(3,Math.floor(u/HB)),vv=u-c*HB,[wd,bg,fg]=NOISE[c];
    const S=fit(wd,900,940,300),by=CY+S*.36,dir=c%2?1:-1;
    const pos=(x:number)=>dir*300*(1-eo(seg(x,0,.13))),dx=pos(vv),vx=vel(pos,vv),scx=1+.24*(1-eo(seg(vv,0,.13)));
    let word:React.ReactNode=T(wd,CX,by,S,900,fg,{anchor:'middle',ls:-S*.04});
    if(c===3){
      const amp=34*(1-seg(vv,0,.22))*(Math.floor(vv*30)%2?1:-1);
      word=[0,1,2].map(k=><g key={k} clipPath={clip(-200,by-S*.78+k*S*.3,W+400,k===2?S*.5:S*.3)}><g transform={`translate(${n1([-1,1,-.6][k]*amp)} 0)`}>{T(wd,CX,by,S,900,fg,{anchor:'middle',ls:-S*.04})}</g></g>);
    }
    const chips=Array.from({length:(c+1)*2},(_,i)=>chip(i,u,fg,bg));
    return {bg,ink:fg,el:<>{chips}<g transform={`translate(${n1(dx)} 0) translate(${CX} ${n1(by)}) scale(${scx.toFixed(4)} 1) rotate(${dir*1.5}) translate(${-CX} ${n1(-by)})`} filter={blurF(vblur(vx,.004,40),0)}>{word}</g></>};
  }
  const ub=u-2*B,cy=900;
  const dot=14+92*eo(seg(ub,.03,.35)),ring=210*osc(ub-.06,15,.55),draw=eo(seg(ub,.15,.5));
  return {bg:C.ink,ink:C.sand,el:<>
    <circle cx={CX} cy={cy} r={310} fill="none" stroke={C.sand} strokeWidth={2} opacity={.35} pathLength={1} strokeDasharray={`${draw.toFixed(4)} 1`} transform={`rotate(-90 ${CX} ${cy})`}/>
    <circle cx={CX} cy={cy} r={n1(Math.max(0,ring))} fill="none" stroke={C.sand} strokeWidth={3}/>
    <circle cx={CX} cy={cy} r={n1(dot)} fill={C.saff}/>
    {letters('BREATHE.',CX,1440,fit('BREATHE.',850,880,190),850,C.sand,ub,.12,{stag:.035})}
  </>};
}

/* ---------- 02 BREATHE: rings inhale for two beats and exhale for two ---------- */
function ringText(R:number,s:string,sz:number,wt:number,mono:boolean,rot:number,fill:string,cy:number,op:number){
  const id=uid();DEFS.push(<path key={id} id={id} d={`M${CX-R} ${cy}a${R} ${R} 0 1 1 ${2*R} 0a${R} ${R} 0 1 1 ${-2*R} 0`}/>);
  const circ=2*Math.PI*R,reps=Math.max(1,Math.round(circ/tw(s,wt,sz,mono)));
  return <g key={uid()} transform={`rotate(${n1(rot)} ${CX} ${cy})`} opacity={op}><text fontFamily={mono?'GeistMono':'Geist'} fontWeight={wt} fontSize={sz} fill={fill}><textPath href={`#${id}`} textLength={n1(circ*.985)} lengthAdjust="spacingAndGlyphs">{s.repeat(reps)}</textPath></text></g>;
}
function s1(t:number):R{
  const u=t-BAR,ink=C.ink,cy=930;
  const br=u<2*B?eio(u/(2*B)):1-eio((u-2*B)/(2*B)),sc=.9+.2*br,inhale=u<2*B,beat=Math.min(3,Math.floor(u/B));
  const word=inhale?'IN.':'OUT.',wsz=fit('OUT.',850,200,96);
  return {bg:C.lav,ink,el:<>
    {ringText(430,'INHALE · EXHALE · ',26,500,true,u*38,ink,cy,seg(u,0,.15))}
    {ringText(478,'BREATHE · ',36,800,false,-u*30,ink,cy,seg(u,.05,.15))}
    {Array.from({length:5},(_,i)=><circle key={i} cx={CX} cy={cy} r={n1((130+i*52)*sc*(1+.02*i*Math.sin(u*5+i)))} fill="none" stroke={ink} strokeWidth={3.2-i*.4} opacity={1-i*.15}/>)}
    <circle cx={CX} cy={cy} r={n1(130*sc)} fill={ink}/>
    {letters(word,CX,cy+wsz*.36,wsz,850,C.lav,u,inhale?0:2*B,{stag:.03,dur:.25})}
    {letters('BREATHE',CX,300,fit('BREATHE',850,900,190),850,ink,u,0,{stag:.03})}
    {[0,1,2,3].map(q=>{const x=CX+(q-1.5)*110,on=q===beat;return <g key={q}><circle cx={x} cy={1500} r={30} fill={on?ink:'none'} stroke={ink} strokeWidth={2.5}/>{T(String(q+1),x,1509,26,600,on?C.lav:ink,{mono:true,anchor:'middle'})}</g>;})}
    {T(inhale?'INHALE':'EXHALE',CX,1590,24,500,ink,{mono:true,anchor:'middle',ls:8})}
  </>};
}

/* ---------- 03 MOVE: one pose per beat, radial morph with overshoot ---------- */
const NR=240,TH=Array.from({length:NR},(_,k)=>-Math.PI/2+2*Math.PI*k/NR);
function rayPoly(poly:number[][],th:number){
  const dx=Math.cos(th),dy=Math.sin(th);let best=Infinity;
  for(let i=0;i<poly.length;i++){const [x1,y1]=poly[i],[x2,y2]=poly[(i+1)%poly.length],ex=x2-x1,ey=y2-y1,den=dx*ey-dy*ex;if(Math.abs(den)<1e-9)continue;
    const s=(x1*ey-y1*ex)/den,q=(x1*dy-y1*dx)/den;if(s>0&&q>=-1e-9&&q<=1+1e-9&&s<best)best=s;}
  return best;
}
const TRI=[[-330,215],[0,-300],[330,215]];
const TREE=(()=>{const cy=-120,R=175,hw=30,yj=cy+Math.sqrt(R*R-hw*hw),a0=Math.atan2(yj-cy,hw),a1=-Math.PI-a0;const pts=[[hw,270],[hw,yj]];
  for(let k=1;k<64;k++){const a=a0+(a1-a0)*k/64;pts.push([R*Math.cos(a),cy+R*Math.sin(a)]);}pts.push([-hw,yj],[-hw,270]);return pts;})();
const SHAPES:number[][]=[
  TH.map(()=>165),
  TH.map(th=>rayPoly(TRI,th)),
  TH.map(th=>rayPoly(TREE,th)),
  TH.map(th=>135+135*Math.pow(Math.abs(Math.cos(4*(th+Math.PI/2))),1.6)),
  TH.map(th=>175+75*Math.pow(Math.max(0,Math.cos(12*(th+Math.PI/2))),6)),
];
const POSES=['MOUNTAIN.','TREE.','LOTUS.','SUN.'];
const shapePath=(r:number[],ox:number,oy:number,s=1)=>'M'+TH.map((th,k)=>`${n1(ox+r[k]*s*Math.cos(th))} ${n1(oy+r[k]*s*Math.sin(th))}`).join('L')+'Z';
function s2(t:number):R{
  const u=t-2*BAR,p=Math.min(3,Math.floor(u/B)),vv=u-p*B,e=osc(vv,24,.5),ink=C.ink,ox=CX,oy=1010;
  const A=SHAPES[p],Z=SHAPES[p+1],r=TH.map((_,k)=>A[k]+(Z[k]-A[k])*e);
  const handles=[0,30,60,90,120,150,180,210].map(k=>{const q=[ox+r[k]*Math.cos(TH[k]),oy+r[k]*Math.sin(TH[k])],a=[ox+(q[0]-ox)*.55,oy+(q[1]-oy)*.55],b=[ox+(q[0]-ox)*1.22,oy+(q[1]-oy)*1.22];
    return <g key={k}><line x1={n1(a[0])} y1={n1(a[1])} x2={n1(b[0])} y2={n1(b[1])} stroke={C.sand} strokeWidth={2}/><circle cx={n1(q[0])} cy={n1(q[1])} r={7} fill={C.sand} stroke={ink} strokeWidth={2}/><circle cx={n1(b[0])} cy={n1(b[1])} r={4.5} fill={ink}/></g>;});
  const sat=u*2.4,word=POSES[p];
  return {bg:C.saff,ink,el:<>
    <line x1={120} y1={oy} x2={960} y2={oy} stroke={ink} strokeWidth={1} opacity={.18}/>
    <line x1={ox} y1={600} x2={ox} y2={1420} stroke={ink} strokeWidth={1} opacity={.18}/>
    <circle cx={ox} cy={oy} r={380} fill="none" stroke={ink} strokeWidth={1.5} opacity={.35} strokeDasharray="3 12"/>
    <path d={shapePath(r,ox,oy)} fill={ink}/>
    {handles}
    <circle cx={n1(ox+380*Math.cos(sat))} cy={n1(oy+380*Math.sin(sat))} r={11} fill={ink}/>
    <circle cx={n1(ox+380*Math.cos(sat+2.1))} cy={n1(oy+380*Math.sin(sat+2.1))} r={7} fill={C.sand}/>
    {letters(word,CX,370,fit(word,900,960,240),900,ink,vv,0,{stag:.012,dur:.22})}
    {T(`POSE ${p2(p+1)} / 04`,CX,1520,26,500,ink,{mono:true,anchor:'middle',ls:8})}
  </>};
}

/* ---------- 04 FLOW: metaballs; the words invert where they cross the liquid ---------- */
function s3(t:number):R{
  const u=t-3*BAR,pulse=Math.exp(-(u%B)*10),grow=osc(u,12,.6),cy=1000;
  const balls=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4+u*(i%2?1.1:-.9),q=.6+.4*Math.sin(u*2.6+i*.9);
    return {x:CX+Math.cos(a)*(110+170*q),y:cy+Math.sin(a*1.3)*(170+150*q),r:(88+26*Math.sin(u*3.4+i))*grow+16*pulse};});
  const goo=gooF(18),mid=uid();
  const blobs=balls.map((b,i)=><circle key={i} cx={n1(b.x)} cy={n1(b.y)} r={n1(Math.max(0,b.r))}/>);
  DEFS.push(<mask key={mid} id={mid} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}><g fill="#fff" filter={goo}>{blobs}</g></mask>);
  const S1=fit('FIND YOUR',850,880,150),S2=fit('FLOW.',900,960,330),wave=(i:number)=>14*Math.sin(i*.9+u*6);
  const words=(fill:string)=>[...letters('FIND YOUR',CX,880,S1,850,fill,u,0,{stag:.025}),...letters('FLOW.',CX,1190,S2,900,fill,u,.12,{stag:.04,dy:wave})];
  return {bg:C.ink,ink:C.sand,el:<>
    <g fill={C.lav} filter={goo}>{blobs}</g>
    <g>{words(C.sand)}</g>
    <g mask={`url(#${mid})`}>{words(C.ink)}</g>
    {rise(T('MOVE WITH YOUR BREATH.',CX,1560,26,500,C.sand,{mono:true,anchor:'middle',ls:6}),1560,26,u,.45)}
  </>};
}

/* ---------- phone shell and app screens (stand-in UI) ---------- */
const PW=560,PH=1140,PX=CX-PW/2,PY=650,SI=16,SW=PW-2*SI,SH=PH-2*SI;
function phone(screen:React.ReactNode,o:{dy?:number;rot?:number;sc?:number;blur?:string}={}){
  const cx=CX,cy=PY+PH/2;
  return <g key={uid()} transform={`translate(0 ${n1(o.dy??0)}) translate(${cx} ${cy}) rotate(${n1(o.rot??0)}) scale(${(o.sc??1).toFixed(4)}) translate(${-cx} ${-cy})`} filter={o.blur}>
    <rect x={PX+10} y={PY+28} width={PW} height={PH} rx={80} fill="#000" opacity={.16}/>
    <rect x={PX} y={PY} width={PW} height={PH} rx={80} fill={C.ink} stroke="#3A3446" strokeWidth={3}/>
    <rect x={PX+SI} y={PY+SI} width={SW} height={SH} rx={62} fill={C.screen}/>
    <g clipPath={clip(PX+SI,PY+SI,SW,SH,62)}><g transform={`translate(${PX+SI} ${PY+SI})`}>{screen}</g></g>
    <rect x={CX-62} y={PY+SI+16} width={124} height={34} rx={17} fill="#000"/>
  </g>;
}
const statusBar=()=><g key={uid()}>{T('9:41',44,60,24,600,C.sand)}<rect x={SW-88} y={42} width={44} height={20} rx={6} fill="none" stroke={C.sand} strokeWidth={2} opacity={.8}/><rect x={SW-84} y={46} width={30} height={12} rx={3} fill={C.sand}/></g>;
function pop(u:number,at:number,el:React.ReactNode,cx:number,cy:number,dist=30){
  if(u<at)return null;const e=osc(u-at,18,.55);
  return <g key={uid()} opacity={clamp((u-at)*12)} transform={`translate(0 ${n1((1-e)*dist)}) translate(${n1(cx)} ${n1(cy)}) scale(${(.86+.14*e).toFixed(4)}) translate(${n1(-cx)} ${n1(-cy)})`}>{el}</g>;
}
const TILES:[string,string,string,string][]=[['Morning flow','FLOW',C.saff,C.ink],['Breathwork','BREATH',C.lav,C.ink],['Deep stretch','STRETCH',C.sand,C.ink],['Wind down','SLEEP',C.night,C.sand]];
function tileIcon(i:number,x:number,y:number,fg:string){
  if(i===0)return <g key={uid()}><circle cx={x} cy={y} r={15} fill={fg}/>{Array.from({length:8},(_,k)=>{const a=k*Math.PI/4;return <line key={k} x1={n1(x+Math.cos(a)*22)} y1={n1(y+Math.sin(a)*22)} x2={n1(x+Math.cos(a)*30)} y2={n1(y+Math.sin(a)*30)} stroke={fg} strokeWidth={3} strokeLinecap="round"/>;})}</g>;
  if(i===1)return <g key={uid()} fill="none" stroke={fg}>{[10,19,28].map((r,k)=><circle key={k} cx={x} cy={y} r={r} strokeWidth={3-k*.6}/>)}</g>;
  if(i===2)return <path key={uid()} d={`M${x-28} ${y+14}Q${x-14} ${y-26} ${x} ${y}T${x+28} ${y-14}`} fill="none" stroke={fg} strokeWidth={4} strokeLinecap="round"/>;
  return <path key={uid()} d={`M${x+8} ${y-26}A26 26 0 1 0 ${x+26} ${y+10}A20 20 0 0 1 ${x+8} ${y-26}Z`} fill={fg}/>;
}
function screenHome(u:number){
  const br=.5-.5*Math.cos(u*Math.PI*2/(2*B)),k=.85+.15*br;
  const tiles=TILES.map(([title,tag,bg,fg],i)=>{const x=32+(i%2)*242,y=630+Math.floor(i/2)*200,w=222,h=180;
    return pop(u,.34+i*.06,<g>
      <rect x={x} y={y} width={w} height={h} rx={32} fill={bg}/>
      {T(tag,x+22,y+40,15,500,fg,{mono:true,ls:3,op:.7})}
      {tileIcon(i,x+w-48,y+52,fg)}
      {T(title,x+22,y+h-28,27,650,fg)}
    </g>,x+w/2,y+h/2);});
  const tapQ=seg(u,2*B,.4);
  return <>
    {statusBar()}
    {pop(u,.18,<g>{T('GOOD MORNING',44,150,20,500,C.lav,{mono:true,ls:4})}{T('Your daily calm',44,206,44,700,C.sand,{ls:-1})}</g>,SW/2,180)}
    {pop(u,.26,<g>
      <rect x={32} y={250} width={SW-64} height={350} rx={40} fill={C.card}/>
      <circle cx={SW/2} cy={415} r={n1(100*k)} fill="none" stroke={C.lav} strokeWidth={10}/>
      <circle cx={SW/2} cy={415} r={n1(58*k)} fill={C.lav} opacity={.22}/>
      {T('BREATHE',SW/2,423,22,600,C.sand,{mono:true,anchor:'middle',ls:4})}
      {T('TAP TO BEGIN',SW/2,568,16,500,C.sand,{mono:true,anchor:'middle',ls:3,op:.6})}
    </g>,SW/2,425)}
    {tiles}
    {u>=2*B&&tapQ<1&&<circle cx={143} cy={720} r={n1(20+110*eo(tapQ))} fill="none" stroke={C.sand} strokeWidth={4} opacity={1-tapQ}/>}
    {[0,1,2,3].map(i=><circle key={i} cx={SW/2+(i-1.5)*90} cy={SH-62} r={6} fill={i===0?C.lav:C.sand} opacity={i===0?1:.45}/>)}
    <rect x={SW/2-70} y={SH-24} width={140} height={6} rx={3} fill={C.sand} opacity={.7}/>
  </>;
}
function scrBreathe(vv:number,u:number){
  const br=.5-.5*Math.cos(u*Math.PI*2/(2*B)),k=.85+.15*br;
  return <>
    {T('BOX BREATHING',SW/2,150,20,500,C.lav,{mono:true,anchor:'middle',ls:4})}
    {[200,150,100].map((r,i)=><circle key={i} cx={SW/2} cy={470} r={n1(r*k)} fill="none" stroke={C.lav} strokeWidth={[2,4,8][i]} opacity={[.35,.6,1][i]}/>)}
    <circle cx={SW/2} cy={470} r={n1(60*k)} fill={C.lav}/>
    {T(br>.5?'Hold':'Inhale',SW/2,790,54,650,C.sand,{anchor:'middle',ls:-1})}
    {T('IN 4 · HOLD 4 · OUT 4 · HOLD 4',SW/2,850,16,500,C.sand,{mono:true,anchor:'middle',ls:2,op:.6})}
    {[0,1,2,3].map(i=><circle key={i} cx={SW/2+(i-1.5)*40} cy={940} r={7} fill={C.lav} opacity={i<=Math.floor(vv/(B/4))?1:.25}/>)}
  </>;
}
function scrFlow(vv:number){
  const active=Math.min(3,Math.floor(vv/(B/4)));
  return <>
    {T('MORNING FLOW',44,150,20,500,C.lav,{mono:true,ls:4})}
    {T('Four poses',44,205,44,700,C.sand,{ls:-1})}
    {['Mountain','Tree','Lotus','Sun'].map((name,i)=>{const y=260+i*150,on=i===active,fg=on?C.ink:C.sand;return <g key={i}>
      <rect x={32} y={y} width={SW-64} height={130} rx={30} fill={on?C.saff:C.card}/>
      <path d={shapePath(SHAPES[i+1],107,y+65,.15)} fill={fg}/>
      {T(name,160,y+76,32,600,fg)}
      {T(p2(i+1),SW-70,y+76,22,500,fg,{mono:true,anchor:'end',op:.7})}
    </g>;})}
    <rect x={44} y={900} width={SW-88} height={8} rx={4} fill={C.card}/>
    <rect x={44} y={900} width={n1((SW-88)*seg(vv,0,B))} height={8} rx={4} fill={C.saff}/>
  </>;
}
function scrFocus(vv:number){
  const p=.15+.55*eo(seg(vv,0,.4));
  return <>
    {T('FOCUS',SW/2,150,20,500,C.lav,{mono:true,anchor:'middle',ls:4})}
    <circle cx={SW/2} cy={460} r={180} fill="none" stroke={C.card} strokeWidth={18}/>
    <circle cx={SW/2} cy={460} r={180} fill="none" stroke={C.lav} strokeWidth={18} strokeLinecap="round" pathLength={1} strokeDasharray={`${p.toFixed(4)} 1`} transform={`rotate(-90 ${SW/2} 460)`}/>
    {T('10:00',SW/2,490,86,700,C.sand,{anchor:'middle',ls:-2})}
    {T('DEEP FOCUS',SW/2,545,18,500,C.sand,{mono:true,anchor:'middle',ls:4,op:.6})}
    {T('Quiet the noise',SW/2,770,42,700,C.sand,{anchor:'middle',ls:-1})}
  </>;
}
function scrRest(u:number){
  const mid=uid();
  DEFS.push(<mask key={mid} id={mid} maskUnits="userSpaceOnUse" x={0} y={0} width={SW} height={SH}><circle cx={SW/2} cy={420} r={120} fill="#fff"/><circle cx={SW/2+58} cy={385} r={108} fill="#000"/></mask>);
  return <>
    {Array.from({length:24},(_,i)=><circle key={i} cx={n1(40+rnd(i+40)*(SW-80))} cy={n1(110+rnd(i+80)*560)} r={2.5} fill={C.sand} opacity={n1(.3+.7*Math.abs(Math.sin(u*3+i)))}/>)}
    <circle cx={SW/2} cy={420} r={120} fill={C.sand} mask={`url(#${mid})`}/>
    {T('Wind down',SW/2,700,48,700,C.sand,{anchor:'middle',ls:-1})}
    {T('SLEEP SOUNDS',SW/2,750,18,500,C.lav,{mono:true,anchor:'middle',ls:4})}
    {Array.from({length:24},(_,i)=>{const h=10+40*Math.abs(Math.sin(i*.7+u*6));return <rect key={i} x={n1(SW/2-216+i*18)} y={n1(900-h)} width={8} height={n1(h)} rx={4} fill={C.lav} opacity={.85}/>;})}
  </>;
}

/* ---------- 05 THE APP: the phone lands with a spring ---------- */
function s4(t:number):R{
  const u=t-4*BAR,ink=C.ink,e=(x:number)=>osc(x-.02,13,.55),dyf=(x:number)=>(1-e(x))*1300,dy=dyf(u),vy=vel(dyf,u);
  const uw=320*eo(seg(u,.45,.3));
  return {bg:C.sand,ink,el:<>
    {letters('NOW IN',CX,300,118,850,ink,u,0,{stag:.03})}
    {letters('YOUR POCKET.',CX,440,fit('YOUR POCKET.',900,960,150),900,ink,u,.1,{stag:.02})}
    <rect x={n1(CX-uw/2)} y={470} width={n1(uw)} height={8} fill={C.saff}/>
    {phone(screenHome(u),{dy,rot:(1-e(u))*-9,blur:blurF(0,vblur(vy,.004,36))})}
  </>};
}

/* ---------- 06 INSIDE: same phone, a new screen and background on every beat ---------- */
const INSIDE:[string,string,string][]=[['BREATHE.',C.lav,C.ink],['FLOW.',C.saff,C.ink],['FOCUS.',C.ink,C.sand],['REST.',C.sand,C.ink]];
function s5(t:number):R{
  const u=t-5*BAR,c=Math.min(3,Math.floor(u/B)),vv=u-c*B,[wd,bg,ink]=INSIDE[c];
  const sx=(x:number)=>(c%2?-1:1)*110*(1-eo(seg(x,0,.16))),dx=sx(vv),vx=vel(sx,vv);
  const content=c===0?scrBreathe(vv,u):c===1?scrFlow(vv):c===2?scrFocus(vv):scrRest(u);
  return {bg,ink,el:<>
    {T('IN THE APP',CX,250,24,500,ink,{mono:true,anchor:'middle',ls:8})}
    {letters(wd,CX,440,fit(wd,900,960,230),900,ink,vv,0,{stag:.015,dur:.22})}
    {phone(<>{statusBar()}<g transform={`translate(${n1(dx)} 0)`} filter={blurF(vblur(vx,.004,30),0)}>{content}</g></>,{sc:1+.03*Math.exp(-vv*12)})}
  </>};
}

/* ---------- 07 DAILY: six half-beat cards; each word acts out its meaning ---------- */
const DAILY:[string,string,string][]=[['BREATHE.',C.sand,C.ink],['STRETCH.',C.ink,C.sand],['FLOW.',C.lav,C.ink],['FOCUS.',C.ink,C.lav],['REST.',C.saff,C.ink],['REPEAT.',C.sand,C.ink]];
function s6(t:number):R{
  const u=t-6*BAR,c=Math.min(5,Math.floor(u/HB)),vv=u-c*HB,[wd,bg,fg]=DAILY[c];
  const S=fit(wd,900,c===3?740:940,320),by=CY+S*.36,dir=c%2?1:-1,ls=-S*.04,w=tw(wd,900,S)+ls*(wd.length-1);
  const still=c===4;
  const pos=(x:number)=>still?0:dir*300*(1-eo(seg(x,0,.12))),dx=pos(vv),vx=vel(pos,vv);
  let scx=still?1:1+.22*(1-eo(seg(vv,0,.12)));
  let word:React.ReactNode=T(wd,CX,by,S,900,fg,{anchor:'middle',ls});
  const ex:React.ReactNode[]=[];
  if(c===1)scx=1+.9*(1-eo(seg(vv,0,.18)));
  if(c===2)word=<g>{letters(wd,CX,by,S,900,fg,vv+1,0,{dy:i=>22*Math.sin(i*.9+vv*16)})}</g>;
  if(c===3){
    word=outline(wd,CX,by,S,900,fg,bg,4,{anchor:'middle',ls});
    const g=50+220*(1-eo(seg(vv,0,.16))),x0=CX-w/2-g,x1=CX+w/2+g,y0=by-S*.82-g*.4,y1=by+S*.12+g*.4,L=70;
    ex.push(<g key="br" stroke={C.lav} strokeWidth={8} fill="none">{[[x0,y0,1,1],[x1,y0,-1,1],[x0,y1,1,-1],[x1,y1,-1,-1]].map(([x,y,a,b],i)=><polyline key={i} points={`${n1(x+a*L)},${n1(y)} ${n1(x)},${n1(y)} ${n1(x)},${n1(y+b*L)}`}/>)}</g>);
  }
  if(c===4){const s=.94+.06*eo(seg(vv,0,.2));word=<g transform={`translate(${CX} ${n1(by)}) scale(${s.toFixed(4)}) translate(${-CX} ${n1(-by)})`} opacity={clamp(vv*10)}>{word}</g>;}
  if(c===5)for(const k of [-2,-1,1,2])ex.push(outline(wd,CX,by+k*S*.92*eo(seg(vv,.02,.16)),S,900,fg,bg,3,{anchor:'middle',ls,op:.4/Math.abs(k)}));
  return {bg,ink:fg,el:<g transform={`translate(${n1(dx)} 0) translate(${CX} ${n1(by)}) scale(${scx.toFixed(4)} 1) translate(${-CX} ${n1(-by)})`} filter={blurF(vblur(vx,.004,40),0)}>{ex}{word}</g>};
}

/* ---------- 08 LAUNCH: enso mark, wordmark, CTA; long readable hold ---------- */
function s7(t:number):R{
  const u=t-STARTS[7],ink=C.ink,my=700;
  const draw=eo(seg(u,0,.5)),draw2=eo(seg(u,.1,.45)),dot=osc(u-.18,22,.42),breathe=u>.9?1+.02*Math.sin((u-.9)*4):1;
  const ce=osc(u-.72,18,.55),lw=760*eo(seg(u,.55,.35)),ax=CX+262,ay=1273;
  return {bg:C.lav,ink,el:<>
    <g transform={`translate(${CX} ${my}) scale(${breathe.toFixed(4)}) rotate(-90)`}>
      <circle r={150} fill="none" stroke={ink} strokeWidth={16} strokeLinecap="round" pathLength={1} strokeDasharray={`${draw.toFixed(4)} 1`}/>
      <circle r={96} fill="none" stroke={ink} strokeWidth={4} opacity={.45} pathLength={1} strokeDasharray={`${draw2.toFixed(4)} 1`}/>
    </g>
    <circle cx={CX} cy={my} r={n1(Math.max(0,44*dot))} fill={C.saff}/>
    {letters('CALMIND',CX,1040,fit('CALMIND',850,900,210,-.035),850,ink,u,.12,{stag:.035,trk:-.035})}
    {T('THE APP IS HERE.'.slice(0,Math.ceil(16*seg(u,.5,.3))),CX,1120,34,500,ink,{mono:true,anchor:'middle',ls:8})}
    <rect x={n1(CX-lw/2)} y={1160} width={n1(lw)} height={3} fill={ink}/>
    <g opacity={clamp((u-.72)*14)} transform={`translate(0 ${n1((1-ce)*70)})`}>
      <rect x={CX-330} y={1215} width={660} height={116} rx={58} fill={ink}/>
      {T('DOWNLOAD CALMIND',CX-26,1287,40,700,C.lav,{anchor:'middle',ls:-.5})}
      <path d={`M${ax-14} ${ay+14}L${ax+14} ${ay-14}M${ax-6} ${ay-14}L${ax+14} ${ay-14}L${ax+14} ${ay+6}`} fill="none" stroke={C.lav} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    {T('YOGA · BREATHWORK · REST',CX,1430,22,500,ink,{mono:true,anchor:'middle',ls:6,op:.7*seg(u,.9,.2)})}
  </>};
}

const SECS=[s0,s1,s2,s3,s4,s5,s6,s7];
const Scene:React.FC=()=>{
  const frame=useCurrentFrame();
  PFX=`c${useId().replace(/[^a-zA-Z0-9]/g,'')}_`;IDN=0;DEFS=[];
  const t=clamp(frame/60,0,15-1e-6),sec=STARTS.findIndex((s,i)=>t>=s&&t<STARTS[i+1]),r=SECS[sec](t),h=hud(t,r.ink,sec);
  return <AbsoluteFill><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block'}}><rect width={W} height={H} fill={r.bg}/>{r.el}{h}<defs>{DEFS}</defs></svg></AbsoluteFill>;
};

export const Reel:React.FC<{blur:boolean}>=({blur})=>{
  const frame=useCurrentFrame();
  const [ready,setReady]=useState(false);
  const [handle]=useState(()=>delayRender('Loading Geist fonts'));
  useEffect(()=>{
    const faces=[new FontFace('Geist',`url(${staticFile('Geist-Variable.woff2')})`,{weight:'100 900'}),new FontFace('GeistMono',`url(${staticFile('GeistMono-Variable.woff2')})`,{weight:'100 900'})];
    Promise.all(faces.map(f=>f.load())).then(loaded=>{loaded.forEach(f=>(document.fonts as FontFaceSet&{add:(f:FontFace)=>void}).add(f));
      return Promise.all([...['500','600','650','700','800','850','900'].map(w=>document.fonts.load(`${w} 100px Geist`)),document.fonts.load('500 100px GeistMono')]);})
      .then(()=>setReady(true)).catch(cancelRender);
  },[]);
  useEffect(()=>{if(ready)continueRender(handle);},[ready,handle]);
  return <AbsoluteFill style={{background:C.ink}}>
    {ready&&(blur?<CameraMotionBlur shutterAngle={180} samples={3}><Scene/></CameraMotionBlur>:<Scene/>)}
    <Img src={staticFile('grain.png')} style={{position:'absolute',width:1,height:1,opacity:0}}/>
    <AbsoluteFill style={{backgroundImage:`url(${staticFile('grain.png')})`,backgroundRepeat:'repeat',backgroundPosition:`${Math.floor(frame/3)*71%320}px ${Math.floor(frame/3)*43%320}px`,opacity:.06,mixBlendMode:'soft-light',pointerEvents:'none'}}/>
    <Audio src={staticFile('soundtrack.wav')}/>
  </AbsoluteFill>;
};
