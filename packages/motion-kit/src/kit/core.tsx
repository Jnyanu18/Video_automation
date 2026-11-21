import React from 'react';

/* ---------- stage (set once per frame by <Film>) ---------- */
export const S={W:1080,H:1920,CX:540,CY:960,fps:60};
export function setStage(w:number,h:number,fps:number){S.W=w;S.H=h;S.CX=w/2;S.CY=h/2;S.fps=fps;}
export const FONTS={display:'Geist',mono:'GeistMono'};
/** Run any builder (T, fit, letters, slam, ringText, chip…) in another loaded family. Measurement caches key on the family. */
export function withFont<R>(family:string,build:()=>R):R{const prev=FONTS.display;FONTS.display=family;try{return build();}finally{FONTS.display=prev;}}

/* ---------- math ---------- */
export const clamp=(x:number,a=0,b=1)=>x<a?a:x>b?b:x;
export const seg=(t:number,t0:number,d:number)=>clamp((t-t0)/d);
export const eo=(x:number)=>x>=1?1:x<=0?0:1-Math.pow(2,-10*x);
export const eio=(x:number)=>x<=0?0:x>=1?1:x<.5?Math.pow(2,20*x-10)/2:(2-Math.pow(2,-20*x+10))/2;
/** Damped spring step response. z<1 overshoots; z=1 is critically damped. */
export const osc=(dt:number,w=20,z=.45)=>{if(dt<=0)return 0;if(z>=1)return 1-(1+w*dt)*Math.exp(-w*dt);const r=Math.sqrt(1-z*z),wd=w*r;return 1-Math.exp(-z*w*dt)*(Math.cos(wd*dt)+z/r*Math.sin(wd*dt));};
/** Damped impulse: 0 before contact, rings out after. */
export const kick=(t:number,start:number,f=32,d=14)=>{const s=t-start;return s<0?0:Math.sin(s*f)*Math.exp(-s*d);};
export const vel=(f:(x:number)=>number,t:number)=>(f(t+1/240)-f(t-1/240))*120;
export const vblur=(v:number,k=.004,mx=28)=>Math.min(mx,Math.abs(v)*k);
export const n1=(x:number)=>Math.round(x*10)/10;
export const p2=(n:number)=>String(n).padStart(2,'0');
export const rnd=(i:number)=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export const lerp=(a:number,b:number,e:number)=>a+(b-a)*e;

/* ---------- per-frame ids and <defs> (unique per motion-blur sample) ---------- */
let PFX='',IDN=0,DEFS:React.ReactNode[]=[];
export function beginFrame(prefix:string){PFX=prefix;IDN=0;DEFS=[];}
export const takeDefs=()=>DEFS;
export const uid=()=>`${PFX}${IDN++}`;
export function addDef(make:(id:string)=>React.ReactElement){const id=uid();DEFS.push(make(id));return id;}
/** Directional gaussian blur; returns a filter url or undefined when negligible. */
export function blurF(sx:number,sy:number){if(sx<.35&&sy<.35)return undefined;return `url(#${addDef(id=><filter key={id} id={id} x="-40%" y="-60%" width="180%" height="220%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation={`${n1(sx)} ${n1(sy)}`}/></filter>)})`;}
/** Metaball threshold filter. */
export function gooF(sig:number){return `url(#${addDef(id=><filter key={id} id={id} filterUnits="userSpaceOnUse" x={-100} y={-100} width={S.W+200} height={S.H+200} colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation={n1(sig)}/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"/></filter>)})`;}
export function clip(x:number,y:number,w:number,h:number,rx=0){return `url(#${addDef(id=><clipPath key={id} id={id}><rect x={n1(x)} y={n1(y)} width={n1(w)} height={n1(h)} rx={rx}/></clipPath>)})`;}

/* ---------- text (measure only after fonts load; <Film> guarantees this) ---------- */
const TWC=new Map<string,number>();let MCTX:CanvasRenderingContext2D|null=null;
export const tw=(s:string,wt:number,sz:number,mono=false)=>{const fam=mono?FONTS.mono:FONTS.display,k=`${s}|${wt}|${fam}`;let v=TWC.get(k);
  if(v===undefined){MCTX??=document.createElement('canvas').getContext('2d');MCTX!.font=`${wt} 100px ${fam}`;v=MCTX!.measureText(s).width/100;TWC.set(k,v);}return v*sz;};
const perChar=(s:string,wt:number,trk:number)=>[...s].reduce((a,c)=>a+tw(c,wt,1),0)+trk*(s.length-1);
/** Largest font size (≤ maxS) at which s fits maxW with tracking trk (em). */
export const fit=(s:string,wt:number,maxW:number,maxS:number,trk=-.04)=>Math.min(maxS,maxW/perChar(s,wt,trk));

export type TO={mono?:boolean;anchor?:'start'|'middle'|'end';ls?:number;stroke?:string;sw?:number;op?:number};
export const T=(s:string,x:number,y:number,sz:number,wt:number,fill:string,o:TO={})=><text key={uid()} x={n1(x)} y={n1(y)} fontFamily={o.mono?FONTS.mono:FONTS.display} fontWeight={wt} fontSize={n1(sz)} fill={fill} textAnchor={o.anchor} letterSpacing={o.ls} stroke={o.stroke} strokeWidth={o.sw} strokeLinejoin="round" opacity={o.op}>{s}</text>;
/** Outline type without variable-font contour artifacts: fat stroke under a background-colored fill. */
export const outline=(s:string,x:number,y:number,sz:number,wt:number,ink:string,bg:string,sw:number,o:TO={})=><g key={uid()} opacity={o.op}>{T(s,x,y,sz,wt,ink,{...o,op:undefined,stroke:ink,sw:sw*2})}{T(s,x,y,sz,wt,bg,{...o,op:undefined})}</g>;
export const typed=(s:string,p:number)=>s.slice(0,Math.ceil(s.length*clamp(p)));

/** Masked line rise with velocity-driven vertical blur. */
export function rise(inner:React.ReactNode,base:number,sz:number,t:number,tIn:number,dur=.3){
  if(t<tIn)return null;
  const pos=(x:number)=>(1-eo(seg(x,tIn,dur)))*sz*1.05,dy=pos(t),vy=vel(pos,t);
  return <g key={uid()} clipPath={clip(-200,base-sz*1.02,S.W+400,sz*1.34)}><g transform={`translate(0 ${n1(dy)})`} filter={blurF(0,vblur(vy))}>{inner}</g></g>;
}
export type LO={stag?:number;trk?:number;anchor?:'start'|'middle';dur?:number;stroke?:string;sw?:number;dy?:(i:number)=>number};
/** Per-letter masked rise (manual layout, so letters can move independently). */
export function letters(s:string,x:number,base:number,sz:number,wt:number,fill:string,t:number,tIn:number,o:LO={}){
  const {stag=.03,trk=-.04,anchor='middle',dur=.3}=o;
  const cs=[...s],ws=cs.map(c=>tw(c,wt,sz)),tot=ws.reduce((a,b)=>a+b,0)+trk*sz*(cs.length-1);
  let cx=anchor==='middle'?x-tot/2:x;
  return cs.map((c,i)=>{const el=rise(T(c,cx,base+(o.dy?o.dy(i):0),sz,wt,o.stroke?'none':fill,o.stroke?{stroke:o.stroke,sw:o.sw}:{}),base,sz,t,tIn+i*stag,dur);cx+=ws[i]+trk*sz;return el;});
}
/** Slam: fast lateral entry with horizontal stretch and velocity blur. vv = time since the word's beat. */
export function slam(word:React.ReactNode,by:number,vv:number,o:{dir?:number;dist?:number;dur?:number;stretch?:number;rot?:number}={}){
  const {dir=1,dist=300,dur=.13,stretch=.24,rot=0}=o;
  const pos=(x:number)=>dir*dist*(1-eo(seg(x,0,dur))),dx=pos(vv),vx=vel(pos,vv),scx=1+stretch*(1-eo(seg(vv,0,dur)));
  return <g key={uid()} transform={`translate(${n1(dx)} 0) translate(${S.CX} ${n1(by)}) scale(${scx.toFixed(4)} 1) rotate(${rot}) translate(${-S.CX} ${n1(-by)})`} filter={blurF(vblur(vx,.004,40),0)}>{word}</g>;
}
/** Horizontal slice displacement (glitch). Pass the same node builder for each band. */
export function slices(make:()=>React.ReactNode,by:number,sz:number,amp:number,bands=3){
  return Array.from({length:bands},(_,k)=>{const h=sz*.9/bands,y=by-sz*.78+k*h;return <g key={uid()} clipPath={clip(-200,y,S.W+400,k===bands-1?h+sz*.2:h)}><g transform={`translate(${n1((k%2?1:-1)*amp*(k===1?1:.6))} 0)`}>{make()}</g></g>;});
}
/** Text on a circle, repeated to fill the circumference. */
export function ringText(cx:number,cy:number,R:number,s:string,sz:number,wt:number,mono:boolean,rotDeg:number,fill:string,op=1){
  const id=addDef(id=><path key={id} id={id} d={`M${cx-R} ${cy}a${R} ${R} 0 1 1 ${2*R} 0a${R} ${R} 0 1 1 ${-2*R} 0`}/>);
  const circ=2*Math.PI*R,reps=Math.max(1,Math.round(circ/tw(s,wt,sz,mono)));
  return <g key={uid()} transform={`rotate(${n1(rotDeg)} ${cx} ${cy})`} opacity={op}><text fontFamily={mono?FONTS.mono:FONTS.display} fontWeight={wt} fontSize={sz} fill={fill}><textPath href={`#${id}`} textLength={n1(circ*.985)} lengthAdjust="spacingAndGlyphs">{s.repeat(reps)}</textPath></text></g>;
}

/* ---------- radial shapes (star-shaped forms share one topology, so any two morph cleanly) ---------- */
export const NR=240;
export const TH=Array.from({length:NR},(_,k)=>-Math.PI/2+2*Math.PI*k/NR);
export function rayPoly(poly:number[][],th:number){
  const dx=Math.cos(th),dy=Math.sin(th);let best=Infinity;
  for(let i=0;i<poly.length;i++){const [x1,y1]=poly[i],[x2,y2]=poly[(i+1)%poly.length],ex=x2-x1,ey=y2-y1,den=dx*ey-dy*ex;if(Math.abs(den)<1e-9)continue;
    const s=(x1*ey-y1*ex)/den,q=(x1*dy-y1*dx)/den;if(s>0&&q>=-1e-9&&q<=1+1e-9&&s<best)best=s;}
  return best;
}
/** Builders return radii per angle TH[k] around the origin. Polygons must be star-shaped around (0,0). */
export const radial={
  circle:(r:number)=>TH.map(()=>r),
  poly:(pts:number[][])=>TH.map(th=>rayPoly(pts,th)),
  rosette:(petals:number,r0:number,amp:number,p=1.6)=>TH.map(th=>r0+amp*Math.pow(Math.abs(Math.cos(petals/2*(th+Math.PI/2))),p)),
  rays:(n:number,r0:number,amp:number,p=6)=>TH.map(th=>r0+amp*Math.pow(Math.max(0,Math.cos(n*(th+Math.PI/2))),p)),
  fn:(f:(th:number)=>number)=>TH.map(f),
};
export const morphRadii=(a:number[],b:number[],e:number)=>a.map((v,k)=>v+(b[k]-v)*e);
export const shapePath=(r:number[],ox:number,oy:number,s=1)=>'M'+TH.map((th,k)=>`${n1(ox+r[k]*s*Math.cos(th))} ${n1(oy+r[k]*s*Math.sin(th))}`).join('L')+'Z';

/* ---------- liquid: metaballs with type that inverts where it crosses them ---------- */
export type Ball={x:number;y:number;r:number};
export function gooInvert(balls:Ball[],words:(fill:string)=>React.ReactNode,o:{blobFill:string;outside:string;inside:string;sigma?:number}){
  const goo=gooF(o.sigma??18);
  const blobs=balls.map((b,i)=><circle key={i} cx={n1(b.x)} cy={n1(b.y)} r={n1(Math.max(0,b.r))}/>);
  const mid=addDef(id=><mask key={id} id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={S.W} height={S.H}><g fill="#fff" filter={goo}>{blobs}</g></mask>);
  return <g key={uid()}><g fill={o.blobFill} filter={goo}>{blobs}</g><g>{words(o.outside)}</g><g mask={`url(#${mid})`}>{words(o.inside)}</g></g>;
}

/* ---------- pop-in and notification chip ---------- */
export function pop(u:number,at:number,el:React.ReactNode,cx:number,cy:number,dist=30,w=18,z=.55){
  if(u<at)return null;const e=osc(u-at,w,z);
  return <g key={uid()} opacity={clamp((u-at)*12)} transform={`translate(0 ${n1((1-e)*dist)}) translate(${n1(cx)} ${n1(cy)}) scale(${(.86+.14*e).toFixed(4)}) translate(${n1(-cx)} ${n1(-cy)})`}>{el}</g>;
}
export function chip(text:string,x:number,y:number,u:number,at:number,fill:string,ink:string,dot:string,o:{sz?:number;rot?:number}={}){
  if(u<at)return null;
  const sz=o.sz??26,ls=3,w=tw(text,500,sz,true)+ls*(text.length-1)+78,h=66,e=osc(u-at,26,.5),sc=.6+.4*e,cx=x+w/2,cy=y+h/2;
  return <g key={uid()} opacity={clamp((u-at)*20)} transform={`translate(${n1(cx)} ${n1(cy)}) scale(${sc.toFixed(3)}) rotate(${o.rot??0}) translate(${n1(-cx)} ${n1(-cy)})`}>
    <rect x={n1(x)} y={n1(y)} width={n1(w)} height={h} rx={h/2} fill={fill}/>
    <circle cx={n1(x+30)} cy={n1(cy)} r={7} fill={dot}/>
    {T(text,x+48,cy+9,sz,500,ink,{mono:true,ls})}
  </g>;
}
