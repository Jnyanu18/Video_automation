/* NAATI FARMS — launch film. 9:16, 60 fps, 120 BPM, 16 bars = 32 s. Plan and shot table: ../plan.md.
   Every time comes from ../timeline.json, which ../score.py reads too, so picture and sound hit together.
   Story: the dawn ride out -> the farm -> the gate opens and the birds run out -> outside, real food, no antibiotics
   -> every bird -> now launching -> lockup with the phone number. The yolk disc is the persistent object:
   sun -> map pin -> NO stamp -> goo yolks -> logo badge. */
import React from 'react';
import {S,addDef,clamp,clip,eio,eo,fit,gooInvert,kick,lerp,letters,morphRadii,n1,osc,pop,radial,ringText,seg,shapePath,slam,slices,tw,uid,vel,withFont,type Ball} from '@kit/core';
import {footage,type Clip} from '@kit/footage';
import {radialDelayFrames} from '@kit/motion-policy';
import {burstPosition} from '@kit/depth-motion';
import {cameraRecoil} from '@kit/type-camera';
import {impactWindow} from '@kit/mixed-media';
import type {FilmConfig,Frame} from '@kit/film';
import TL from '../timeline.json';
import FR from '../public/frames/index.json';

/* ---------- identity (proposal: no brand kit was supplied) ---------- */
// field green / egg yolk / eggshell cream / ink / comb red. Pairs: cream on green, green on yolk, ink on cream, red = "no".
const C={green:'#1E3B2A',yolk:'#F4B223',cream:'#F6EEDD',ink:'#16140F',red:'#D23F27'};
// Each family has one job: Anton shouts, Fraunces speaks, Caveat is the farmer's handwriting, Baloo Tamma 2 is Kannada.
const F={serif:'Fraunces',ital:'FrauncesI',cond:'Anton',hand:'Caveat',kn:'BalooTamma2'};
const HALO='rgba(22,20,15,.55)';
const B=60/TL.bpm;
const FPS=60;
const fr=(t:number)=>Math.round(t*FPS);

/* ---------- footage ---------- */
const LAND=new Set(['1562','1564','1570','1573','1593']);
// Shots are JPEG sequences extracted by work/extract_frames.py (index.json holds each sequence's frame range).
type Variant='full'|'med'|'small';
const SEQ=FR as Record<string,{first:number;last:number}>;
function V(id:string,variant:Variant='full'):Clip{
  const key=`${id}-${variant}`,r=SEQ[key];
  if(!r)throw new Error(`no frame sequence ${key}: add it to work/extract_frames.py`);
  const land=LAND.has(id);
  return {src:`frames/${key}`,w:land?1920:1080,h:land?1080:1920,seq:{dir:`frames/${key}`,fps:30,first:r.first,last:r.last}};
}
const SMALL=(id:string)=>V(id,'small');

/* ---------- text helpers (any family) ---------- */
type TO={anchor?:'start'|'middle'|'end';ls?:number;op?:number;rot?:number;halo?:string;hw?:number};
function TX(s:string,x:number,y:number,sz:number,fam:string,wt:number,fill:string,o:TO={}){
  return <text key={uid()} x={n1(x)} y={n1(y)} fontFamily={fam} fontWeight={wt} fontSize={n1(sz)} fill={fill} textAnchor={o.anchor??'middle'} letterSpacing={o.ls} opacity={o.op}
    stroke={o.halo} strokeWidth={o.halo?n1(o.hw??8):undefined} strokeLinejoin="round" paintOrder="stroke" transform={o.rot?`rotate(${o.rot} ${n1(x)} ${n1(y)})`:undefined}>{s}</text>;
}
const width=(s:string,fam:string,wt:number,sz:number)=>withFont(fam,()=>tw(s,wt,sz));
const shadow=(a=.5,blur=14)=>`url(#${addDef(id=><filter key={id} id={id} x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation={blur} floodColor={C.ink} floodOpacity={a}/></filter>)})`;
function scrim(y0:number,y1:number,a:number,up=false){
  const id=addDef(id=><linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.ink} stopOpacity={up?a:0}/><stop offset="1" stopColor={C.ink} stopOpacity={up?0:a}/></linearGradient>);
  return <rect key={uid()} x={0} y={y0} width={S.W} height={y1-y0} fill={`url(#${id})`}/>;
}
/** Handwritten line: Caveat revealed left to right like a pen stroke. */
function hand(s:string,x:number,y:number,sz:number,fill:string,t:number,t0:number,o:{rot?:number;anchor?:'start'|'middle';dur?:number;halo?:boolean}={}){
  if(t<t0)return null;
  const w=width(s,F.hand,700,sz),x0=o.anchor==='start'?x:x-w/2,p=eo(seg(t,t0,o.dur??.42));
  return <g key={uid()} transform={o.rot?`rotate(${o.rot} ${n1(x)} ${n1(y)})`:undefined}><g clipPath={clip(x0-40,y-sz*1.15,(w+80)*p,sz*1.7)}>
    {TX(s,x,y,sz,F.hand,700,fill,{anchor:o.anchor??'middle',halo:o.halo===false?undefined:HALO,hw:sz*.14})}</g></g>;
}
/** Hand-drawn arrow: body then head, drawn with dash offset. */
function arrow(d:string,head:string|null,t:number,t0:number,col:string,w=8,dur=.32){
  if(t<t0)return null;
  const p=eo(seg(t,t0,dur)),ph=eo(seg(t,t0+dur*.85,.14));
  return <g key={uid()} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" filter={shadow(.35,6)}>
    <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={n1(1-p)}/>
    {head&&ph>0&&<path d={head} pathLength={1} strokeDasharray="1 1" strokeDashoffset={n1(1-ph)}/>}</g>;
}
const lettersIn=(fam:string,s:string,x:number,base:number,sz:number,wt:number,fill:string,t:number,t0:number,o:{stag?:number;dur?:number;trk?:number}={})=>
  withFont(fam,()=><>{letters(s,x,base,sz,wt,fill,t,t0,{stag:o.stag??.035,dur:o.dur??.34,trk:o.trk??-.01})}</>);

/* ---------- camera ---------- */
type Shake={x:number;y:number;r:number};
function shakeAt(t:number,events:[number,number][]):Shake{
  let x=0,y=0,r=0;
  for(const [ev,amp] of events){const k=cameraRecoil(fr(t),FPS,{eventFrame:fr(ev),amplitudeDeliveryPx:amp,rotationDegrees:amp*.035,durationSeconds:.42});x+=k.offsetDeliveryPx.x;y+=k.offsetDeliveryPx.y;r+=k.rotationDegrees;}
  return {x,y,r};
}
const SHAKES:[number,number][]=[[TL.doorsShut,12],[TL.release,16],[TL.stamp,18],[TL.lockup,10]];
const camMedia=(k:Shake,node:React.ReactNode)=><div key={uid()} style={{position:'absolute',inset:0,transform:`translate(${n1(k.x)}px,${n1(k.y)}px) rotate(${k.r.toFixed(3)}deg)`}}>{node}</div>;
const camSvg=(k:Shake,node:React.ReactNode)=><g key={uid()} transform={`translate(${n1(k.x)} ${n1(k.y)}) rotate(${k.r.toFixed(3)} ${S.CX} ${S.CY})`}>{node}</g>;
/** Push: both shots travel left together across the cut (no gap); CSS blur follows the velocity. */
const PUSH0=TL.ride-.12,PUSHD=.3;
const pushP=(t:number)=>eio(seg(t,PUSH0,PUSHD));
const outX=(t:number)=>-S.W*pushP(t),inX=(t:number)=>S.W*(1-pushP(t));
const vBlur=(f:(x:number)=>number,t:number)=>{const b=Math.min(14,Math.abs(vel(f,t))*.0028);return b>.4?`blur(${b.toFixed(1)}px)`:undefined;};

/* ---------- the yolk: sun (0-4 s) ---------- */
function sun(t:number){
  const rise=eo(seg(t,0,1.3)),toCorner=eio(seg(t,TL.ride,.42));
  const x=lerp(540,930,toCorner),y=lerp(lerp(760,500,rise),300,toCorner),r=lerp(lerp(84,118,rise),36,toCorner);
  return <g key={uid()}>
    <circle cx={n1(x)} cy={n1(y)} r={n1(r*1.7)} fill={C.yolk} opacity={.22} filter={`url(#${addDef(id=><filter key={id} id={id} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={30}/></filter>)})`}/>
    <circle cx={n1(x)} cy={n1(y)} r={n1(r)} fill={C.yolk}/>
  </g>;
}

/* ---------- 0  DAWN ---------- */
function rideMedia(t:number){
  const p=pushP(t);
  return <>
    {p<1&&footage(V('1508'),{start:TL.dawn,in:1.0,rate:1.3,zoom:1+.07*seg(t,0,2),tx:outX(t),filter:vBlur(outX,t)})}
    {p>0&&footage(V('1376'),{start:PUSH0,in:.2-.12*1.3,rate:1.3,tx:inX(t),filter:vBlur(inX,t)})}
  </>;
}
function dawn(t:number):Frame{
  const tx=outX(t),media=rideMedia(t);
  return {bg:C.ink,ink:C.cream,media,el:<>
    {scrim(640,1920,.62)}{sun(t)}
    <g transform={`translate(${n1(tx)} 0)`} filter={shadow()}>
      {lettersIn(F.ital,'Every',530,1040,176,500,C.cream,t,0,{stag:.045,dur:.36})}
      {lettersIn(F.ital,'morning,',530,1215,176,500,C.cream,t,.2,{stag:.035,dur:.36})}
    </g>
  </>};
}

/* ---------- 1  RIDE ---------- */
function ride(t:number):Frame{
  const tx=inX(t),media=rideMedia(t);
  return {bg:C.ink,ink:C.cream,media,el:<>
    {scrim(700,1920,.6)}{sun(t)}
    <g transform={`translate(${n1(tx)} 0)`}>
      <g filter={shadow()}>{lettersIn(F.serif,'we ride out',530,1090,176,650,C.cream,t,TL.ride+.12,{stag:.03})}</g>
      {hand('to the farm',540,1275,170,C.yolk,t,TL.farmNote,{rot:-3,dur:.45})}
      {arrow('M270 1335 C 440 1370, 660 1365, 830 1322',null,t,TL.farmNote+.42,C.yolk,10,.25)}
    </g>
  </>};
}

/* ---------- 2  ARRIVE: the sun drops in as the map pin ---------- */
function pinRadii(R:number){
  const d=1.95*R,beta=Math.acos(R/d),pts:number[][]=[];
  for(let k=0;k<=48;k++){const g=beta+(2*Math.PI-2*beta)*k/48;pts.push([R*Math.sin(g),R*Math.cos(g)]);}
  pts.push([0,d]);return radial.poly(pts);
}
function arrive(t:number):Frame{
  const u=t-TL.arrive,m=eo(seg(u,0,.28)),R=lerp(36,66,m),q=osc(u,14,.45);
  const x=lerp(930,540,eo(seg(u,0,.3))),y=lerp(300,760,q);
  const sq=Math.max(0,kick(t,TL.pinContact,30,11))*.22,tipY=y+1.95*R;
  const r=morphRadii(radial.circle(R),pinRadii(R),m);
  const chipW=width('BANGALORE',F.cond,400,52)+52*.12*8+96;
  const chipNode=<g key={uid()} filter={shadow(.35,10)}>
    <rect x={n1(540-chipW/2)} y={968} width={n1(chipW)} height={92} rx={46} fill={C.cream}/>
    {TX('BANGALORE',540,1033,52,F.cond,400,C.green,{ls:6})}</g>;
  const media=footage(V('1152'),{start:TL.arrive,in:2.5,rate:1.4,scale:1+.09*(1-eo(seg(u,0,.35)))});
  return {bg:C.ink,ink:C.cream,media,el:<>
    {scrim(0,520,.35,true)}{scrim(1100,1920,.45)}
    {u>.12&&<ellipse cx={540} cy={889} rx={n1(58*eo(seg(u,.1,.2)))} ry={12} fill={C.ink} opacity={.35}/>}
    <g transform={`translate(${n1(x)} ${n1(tipY)}) scale(${(1+sq).toFixed(3)} ${(1-sq).toFixed(3)}) translate(${n1(-x)} ${n1(-tipY)})`}>
      <path d={shapePath(r,x,y)} fill={C.yolk} filter={shadow(.3,10)}/>
      <circle cx={n1(x)} cy={n1(y)} r={n1(R*.36*m)} fill={C.green}/>
    </g>
    {pop(t,TL.chip,chipNode,540,1014,40,18,.5)}
    {hand('our farm',810,640,96,C.cream,t,TL.ourFarm,{rot:-6})}
    {arrow('M760 670 C 720 720, 680 745, 630 760','M650 735 L 628 762 L 662 772',t,TL.ourFarm+.3,C.cream,7,.25)}
  </>};
}

/* ---------- 3  GATE: the farm gate is the brand ---------- */
function doorArt(){
  const bw=22,planks=Array.from({length:11},(_,i)=>i*98+49);
  return <g key={uid()}>
    <rect x={0} y={0} width={S.W} height={S.H} fill={C.yolk}/>
    {planks.map(x=><rect key={uid()} x={x} y={0} width={3} height={S.H} fill={C.ink} opacity={.07}/>)}
    {[0,S.W/2].map(x0=><rect key={uid()} x={x0+bw/2} y={bw/2} width={S.W/2-bw} height={S.H-bw} fill="none" stroke={C.green} strokeWidth={bw}/>)}
    {[330,1600].map(y=><rect key={uid()} x={0} y={y} width={S.W} height={22} fill={C.green}/>)}
    <path d={`M44 1590 L ${S.W/2-30} 1290 M${S.W-44} 1590 L ${S.W/2+30} 1290`} stroke={C.green} strokeWidth={22} strokeLinecap="round"/>
    <rect x={S.W/2-2} y={0} width={4} height={S.H} fill={C.ink} opacity={.5}/>
    <rect x={S.W/2-34} y={1400} width={68} height={30} rx={6} fill={C.green}/>
    {TX('welcome to',540,700,96,F.hand,700,C.green,{rot:-4})}
    {withFont(F.cond,()=>{const sz=fit('NAATI',400,880,420,-.01);return TX('NAATI',540,760+sz*.74,sz,F.cond,400,C.green,{ls:-sz*.01});})}
    {TX('FARMS',540,1190,150,F.ital,600,C.green)}
  </g>;
}
function doors(t:number){
  if(t<TL.doorsIn||t>TL.release+1.2)return null;
  const p=Math.pow(seg(t,TL.doorsIn,TL.doorsShut-TL.doorsIn),2.3),bounce=Math.max(0,kick(t,TL.doorsShut,34,13))*16;
  const slide=(1-p)*S.W/2+bounce;
  const q=t<TL.release?0:osc(t-TL.release,7,.7),ang=-104*q,shade=.55*Math.min(1,Math.abs(ang)/90);
  const half=(side:0|1)=><div key={uid()} style={{position:'absolute',left:side?S.W/2:0,top:0,width:S.W/2,height:S.H,transformOrigin:side?'100% 50%':'0% 50%',
      transform:`translateX(${n1(side?slide:-slide)}px) rotateY(${n1(side?-ang:ang)}deg)`,backfaceVisibility:'hidden'}}>
    <svg width={S.W/2} height={S.H} viewBox={`${side?S.W/2:0} 0 ${S.W/2} ${S.H}`} style={{display:'block'}}>{doorArt()}</svg>
    <div style={{position:'absolute',inset:0,background:C.ink,opacity:n1(shade*100)/100}}/>
  </div>;
  return <div key={uid()} style={{position:'absolute',inset:0,perspective:'1500px',perspectiveOrigin:'50% 50%'}}>{half(0)}{half(1)}</div>;
}
function gate(t:number):Frame{
  const k=shakeAt(t,SHAKES);
  const media=camMedia(k,<>{footage(V('1441'),{start:TL.gate,in:2.0,zoom:1+.14*eio(seg(t,TL.gate,1.6))})}{doors(t)}</>);
  return {bg:C.ink,ink:C.cream,media,el:camSvg(k,<>
    {t<TL.doorsShut&&<>{scrim(700,1920,.6)}<g filter={shadow()}>
      {lettersIn(F.ital,'and open',530,1080,160,500,C.cream,t,TL.gate+.05,{stag:.035})}
      {lettersIn(F.ital,'the gate.',530,1250,160,500,C.cream,t,TL.gate+.25,{stag:.035})}
    </g></>}
  </>)};
}

const IN1381=8.4;
/* ---------- 4  RELEASE: doors swing open, the flock runs out ---------- */
function release(t:number):Frame{
  const k=shakeAt(t,SHAKES),u=t-TL.release;
  const media=camMedia(k,<>{footage(V('1381'),{start:TL.release,in:IN1381,rate:1.3,zoom:1.08-.08*eo(seg(u,0,.7))})}{doors(t)}</>);
  return {bg:C.ink,ink:C.cream,media,el:camSvg(k,<>
    {scrim(0,700,.45,true)}
    {hand('here they come!',540,470,112,C.cream,t,TL.comeNote,{rot:-4,dur:.5})}
    {arrow('M720 520 C 790 600, 780 700, 700 790','M735 770 L 700 792 L 690 752',t,TL.comeNote+.45,C.yolk,9,.28)}
  </>)};
}

/* ---------- 5  OUT IN THE OPEN: one word per beat ---------- */
const WORDS=[{id:'1151',in:5.4,w:'OUT',fx:.5},{id:'1561',in:7.0,w:'IN',fx:.5},{id:'1337',in:15.4,w:'THE',fx:.5},{id:'1363',in:3.0,w:'OPEN.',fx:.5,rate:1.7}];
function openAir(t:number):Frame{
  const i=clamp(Math.floor((t-TL.words[0])/B),0,3),t0=TL.words[i],vv=t-t0,w=WORDS[i];
  const media=footage(V(w.id),{start:t0,in:w.in,rate:w.rate??1.2,fx:w.fx,scale:1.14-.14*eo(seg(vv,0,.28))});
  const fill=i===3?C.yolk:C.cream;
  const word=withFont(F.cond,()=>{
    const sz=fit(w.w,400,820,560,-.01),by=1010+sz*.37;
    const make=()=>TX(w.w,530,by,sz,F.cond,400,fill,{ls:-sz*.01});
    const amp=26*(1-seg(vv,0,.2));
    return slam(i===3&&amp>.5?<>{slices(make,by,sz,amp,3)}</>:make(),by,vv,{dir:i%2?1:-1,dist:360,dur:.14,stretch:.22});
  });
  return {bg:C.ink,ink:C.cream,media,el:<>
    <rect width={S.W} height={S.H} fill={C.ink} opacity={.22}/>
    <g filter={shadow(.55,18)}>{word}</g>
  </>};
}

/* ---------- 6  NAATI = NATIVE: the name, explained, becomes a window ---------- */
const MASK_SZ=620;
function naatiMask(t:number,fill:string){
  // Letters of NAATI as holes in a cream card; the camera then pushes through the I.
  return withFont(F.cond,()=>{
    const sz=Math.min(MASK_SZ,fit('NAATI',400,940,MASK_SZ,-.01)),by=960+sz*.37;
    const ws=[...'NAATI'].map(c=>tw(c,400,sz)),tot=ws.reduce((a,b)=>a+b,0)-.01*sz*4,x0=530-tot/2;
    const iCx=x0+ws.slice(0,4).reduce((a,b)=>a+b,0)-.01*sz*4+ws[4]/2,iCy=by-sz*.37;
    const s=Math.exp(Math.log(30)*eio(seg(t,TL.push,.55)));
    const mid=addDef(id=><mask key={id} id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={S.W} height={S.H}>
      <rect width={S.W} height={S.H} fill="#fff"/>
      <g transform={`translate(${n1(iCx)} ${n1(iCy)}) scale(${s.toFixed(4)}) translate(${n1(-iCx)} ${n1(-iCy)})`}>{letters('NAATI',530,by,sz,400,'#000',t,TL.mask,{stag:.045,dur:.3,trk:-.01})}</g>
    </mask>);
    return <rect key={uid()} width={S.W} height={S.H} fill={fill} mask={`url(#${mid})`}/>;
  });
}
function naati(t:number):Frame{
  const out=eio(seg(t,TL.mask-.12,.2)),dy=-260*out,op=1-out;
  const pill=<g key={uid()}><rect x={540-200} y={400} width={400} height={104} rx={52} fill={C.yolk}/>{TX('KANNADA',540,474,60,F.cond,400,C.green,{ls:10})}</g>;
  const card=<g transform={`translate(0 ${n1(dy)})`} opacity={op}>
    {pop(t,TL.naati,pill,540,452,30,18,.5)}
    {pop(t,TL.kannada,TX('ನಾಟಿ',540,1010,470,F.kn,800,C.green),540,850,110,15,.42)}
    {lettersIn(F.ital,'naa·ti',540,1230,190,500,C.ink,t,TL.naati+.32,{stag:.04})}
    {hand('native · country-bred',540,1390,112,C.green,t,TL.naati+.6,{halo:false,dur:.5})}
  </g>;
  if(t<TL.mask)return {bg:C.cream,ink:C.ink,el:<>{card}</>};
  const media=footage(V('1564'),{start:TL.mask,in:8.6,fx:.42,zoom:1.3-.3*eo(seg(t,TL.push,.7))});
  return {bg:C.ink,ink:C.ink,media,el:<>{naatiMask(t,C.cream)}{t<TL.mask+.1&&card}</>};
}

/* ---------- 7  LIVELY / HEALTHY ---------- */
function lively(t:number):Frame{
  const healthy=t>=TL.healthy;
  const media=healthy?footage(V('1562'),{start:TL.healthy,in:17.2,fx:.6,scale:1.08-.08*eo(seg(t,TL.healthy,.3))})
    :footage(V('1564'),{start:TL.mask,in:8.6,fx:.42,zoom:1.3-.3*eo(seg(t,TL.push,.7))});
  return {bg:C.ink,ink:C.cream,media,el:<>
    {t<TL.push+.56&&naatiMask(t,C.cream)}
    {scrim(1000,1920,.6)}
    {!healthy&&<g filter={shadow()}>{pop(t,TL.lively,TX('Lively.',530,1440,230,F.ital,600,C.cream),530,1360,90,16,.34)}</g>}
    {healthy&&<g filter={shadow()}>
      {lettersIn(F.ital,'Healthy.',530,1440,220,600,C.cream,t,TL.healthy+.05,{stag:.03})}
      {t>TL.healthy+.35&&<rect x={n1(530-330)} y={1478} width={n1(660*eo(seg(t,TL.healthy+.35,.3)))} height={16} rx={8} fill={C.yolk}/>}
    </g>}
  </>};
}

/* ---------- 8  REAL FOOD: three panels ---------- */
const PANELS=[{id:'1593',v:'med' as Variant,in:1.2,fx:.5,fy:.6,label:'fresh greens'},{id:'1336',v:'full' as Variant,in:1.0,fx:.45,fy:.68,label:'tomatoes'},{id:'1570',v:'med' as Variant,in:3.0,fx:.5,fy:.55,label:'& the little ones'}];
function food(t:number):Frame{
  const media=<>{PANELS.map((p,i)=>{const t0=TL.panels[i],dir=i%2?1:-1,e=eo(seg(t,t0,.42));
    if(t<t0)return null;
    return footage(V(p.id,p.v),{start:t0,in:p.in,fx:p.fx,fy:p.fy,box:{x:40,y:400+i*460,w:1000,h:440},radius:28,tx:dir*1150*(1-e),rot:dir*5*(1-e)});})}</>;
  return {bg:C.green,ink:C.cream,media,el:<>
    {lettersIn(F.ital,'Real food.',530,320,160,600,C.cream,t,TL.food,{stag:.035})}
    {PANELS.map((p,i)=>hand(p.label,84,400+i*460+96,84,C.cream,t,TL.panels[i]+.38,{anchor:'start',rot:-2}))}
  </>};
}

/* ---------- 9  NO ANTIBIOTICS: the reversal (music drops out) ---------- */
function noab(t:number):Frame{
  const k=shakeAt(t,SHAKES),hit=impactWindow(fr(t),FPS,{atFrame:fr(TL.stamp),referenceFrames:3}).active;
  const bg=hit?C.ink:C.cream,ink=hit?C.cream:C.ink;
  const amp=30*(1-seg(t,TL.stamp,.25)),glitch=t>=TL.stamp&&amp>.5,CAP=.74,GAPL=44;
  const L=withFont(F.cond,()=>{
    const s1=fit('ANTI',400,920,640,-.01),s2=fit('BIOTICS',400,920,640,-.01);
    const top=930-(s1*CAP+GAPL+s2*CAP)/2,b1=top+s1*CAP,b2=b1+GAPL+s2*CAP;
    const line=(w:string,sz:number,by:number,t0:number)=>glitch
      ?<g key={uid()}>{slices(()=>TX(w,530,by,sz,F.cond,400,ink,{ls:-sz*.01}),by,sz,amp,3)}</g>
      :<g key={uid()}>{letters(w,530,by,sz,400,ink,t,t0,{stag:.03,dur:.3,trk:-.01})}</g>;
    return {s1,s2,top,b1,b2,el:<>{line('ANTI',s1,b1,TL.noab+.04)}{line('BIOTICS',s2,b2,TL.noab+.16)}</>};
  });
  const strike=(y:number,h:number,t0:number)=>{const w=960*eo(seg(t,t0,.2));return t>=t0?<rect key={uid()} x={60} y={n1(y-h/2)} width={n1(w)} height={h} rx={h/4} fill={C.red} transform={`rotate(-3 540 ${n1(y)})`}/>:null;};
  const e=osc(t-TL.stamp,20,.5),sc=lerp(2.6,1,e),sx=270,sy=n1(L.top-30);
  const stamp=t>=TL.stamp&&<g opacity={clamp((t-TL.stamp)*30)} transform={`translate(${sx} ${sy}) rotate(-12) scale(${sc.toFixed(3)}) translate(${-sx} ${-sy})`}>
    <circle cx={sx} cy={sy} r={190} fill={C.yolk}/>
    <circle cx={sx} cy={sy} r={160} fill="none" stroke={C.green} strokeWidth={7} strokeDasharray="16 11"/>
    {TX('NO',sx,sy+190*.37,190,F.cond,400,C.green,{ls:2})}
  </g>;
  return {bg,ink,el:camSvg(k,<>
    {L.el}
    {strike(L.b1-L.s1*CAP/2,46,TL.strike)}
    {strike(L.b2-L.s2*CAP/2,34,TL.strike+.12)}
    {stamp}
    {lettersIn(F.ital,"We don't use any.",530,L.b2+200,112,500,ink,t,TL.dontUse,{stag:.018})}
  </>)};
}

/* ---------- 10-11  EVERY BIRD: the whole farm in one grid ---------- */
const GRID=['1151','1381','1152','1561','1564','1337','1593','1562','1336','1573','1570','1363'];
const GRID_IN:Record<string,number>={'1151':1.0,'1381':14.0,'1152':4.5,'1561':3.5,'1564':14.0,'1337':6.0,'1593':1.5,'1562':6.0,'1336':2.5,'1573':1.5,'1570':6.5,'1363':9.0};
const CW=336,CH=440,GAP=12,GX=24,GY=62;
function grid(t:number):Frame{
  const center={x:S.CX,y:S.CY},cells=GRID.map((id,i)=>{const c=i%3,r=Math.floor(i/3);return {id,cx:GX+c*(CW+GAP)+CW/2,cy:GY+r*(CH+GAP)+CH/2};});
  const delays=cells.map(c=>radialDelayFrames({x:c.cx,y:c.cy},center,{spacingPx:330,fps:FPS})),maxD=Math.max(...delays);
  const media=<>{cells.map((c,i)=>{
    const q=burstPosition(fr(t),FPS,{x:0,y:0,z:0},{x:1,y:0,z:0},fr(TL.grid)+delays[i]).x;
    const back=eio(seg(t,TL.gridOut+(maxD-delays[i])/FPS*.6,.38));
    const k=q*(1-back),x=lerp(center.x,c.cx,k),y=lerp(center.y,c.cy,k),sc=(.2+.8*q)*(1-back);
    if(sc<.01)return null;
    return footage(SMALL(c.id),{start:TL.grid,in:GRID_IN[c.id],box:{x:x-CW/2,y:y-CH/2,w:CW,h:CH},scale:sc,radius:20});
  })}</>;
  const be=eo(seg(t,TL.band,.3))*(1-eio(seg(t,TL.gridOut-.05,.25)));
  const dot=eo(seg(t,TL.launch-.3,.3))*60;
  return {bg:C.green,ink:C.cream,media,el:<>
    {be>0&&<g transform={`translate(${S.CX} ${S.CY}) scale(1 ${be.toFixed(3)}) translate(${-S.CX} ${-S.CY})`}>
      <rect x={0} y={S.CY-160} width={S.W} height={320} fill={C.yolk} transform={`translate(${S.CX} 0) scale(${be.toFixed(3)} 1) translate(${-S.CX} 0)`}/>
      {lettersIn(F.ital,'Every bird,',530,S.CY-14,128,600,C.green,t,TL.band+.12,{stag:.03})}
      {withFont(F.cond,()=>t>=TL.band+.4?pop(t,TL.band+.4,TX('RAISED RIGHT HERE.',530,S.CY+104,82,F.cond,400,C.green,{ls:5}),530,S.CY+75,24,20,.6):null)}
    </g>}
    {dot>0&&<circle cx={S.CX} cy={S.CY} r={n1(dot)} fill={C.yolk}/>}
  </>};
}

/* ---------- 12  NOW LAUNCHING: yolks gather ---------- */
function launch(t:number):Frame{
  const u=t-TL.launch,sp=osc(u,8,.6),m=eio(seg(t,TL.merge,.6));
  // Three big yolks drift behind the words (slow, so the inverted type stays readable), then gather into the badge.
  const SEED=[{a:.2,R:300,r:190,w:.55},{a:2.3,R:260,r:160,w:-.45},{a:4.3,R:330,r:175,w:.4}];
  const cy=lerp(1000,600,m);
  const balls:Ball[]=SEED.map((b,i)=>{const a=b.a+u*b.w,R=b.R*sp*(1-m);
    return {x:S.CX+Math.cos(a)*R,y:cy+Math.sin(a)*R*.75,r:(b.r+14*Math.sin(u*2.4+i*2.1))*(.25+.75*sp)*(1-m)+m*90};});
  balls.push({x:S.CX,y:cy,r:lerp(60,30,sp)*(1-m)+m*270});
  const out=eio(seg(t,TL.merge,.35));
  const words=(fill:string)=><g transform={`translate(0 ${n1(-120*out)})`} opacity={1-out}>
    {withFont(F.cond,()=>{const s1=fit('NOW',400,520,420,-.01),s2=fit('LAUNCHING',400,920,330,-.01);return <>
      {letters('NOW',530,930,s1,400,fill,t,TL.launch+.08,{stag:.05,dur:.3,trk:-.01})}
      {letters('LAUNCHING',530,960+s2*.86,s2,400,fill,t,TL.launch+.3,{stag:.03,dur:.3,trk:-.01})}</>;})}
  </g>;
  return {bg:C.green,ink:C.cream,el:gooInvert(balls,words,{blobFill:C.yolk,outside:C.cream,inside:C.green,sigma:22})};
}

/* ---------- 13-15  LOCKUP ---------- */
const BX=540,BY=540,BR=240;
const STRIP=['1151','1564','1561','1336','1381','1570','1363','1337'];
const STRIP_IN:Record<string,number>={'1151':3.0,'1564':2.0,'1561':5.0,'1336':0.5,'1381':11.0,'1570':4.0,'1363':5.0,'1337':12.0};
function lockup(t:number):Frame{
  const k=shakeAt(t,SHAKES),u=t-TL.lockup,e=osc(u,12,.5),r=lerp(270,BR,e);
  // Filmstrip of the farm drifting along the bottom: a callback to the grid, decorative (below the safe zone).
  const sw=300,sh=230,sg=18,sy=1620,speed=70,stripOp=eo(seg(t,TL.tagline,.5));
  const strip=stripOp>0?STRIP.map((id,i)=>{const x=40+i*(sw+sg)-(t-TL.lockup)*speed;
    if(x>S.W||x<-sw)return null;
    return footage(SMALL(id),{start:TL.lockup,in:STRIP_IN[id],box:{x,y:sy,w:sw,h:sh},radius:18,opacity:stripOp});}):null;
  const media=camMedia(k,<>
    {footage(V('1564','med'),{start:TL.lockup,in:12.5,fx:.45,box:{x:BX-BR,y:BY-BR,w:2*BR,h:2*BR},radius:BR,opacity:eo(seg(u,.05,.35)),scale:r/BR})}
    {strip}</>);
  const CS=72,ctaT='CALL  +91 78495 34944',ctaW=width(ctaT,F.cond,400,CS)+CS*.05*ctaT.length+170,ctaY=1408,ctaH=124,dotX=540-ctaW/2+66;
  const ring=(n:number)=>{const ph=((t-TL.cta-.2-n*.25)%(2*B))/(2*B);return t>TL.cta+.2&&ph>=0?<circle key={uid()} cx={n1(dotX)} cy={ctaY+ctaH/2} r={n1(17+34*ph)} fill="none" stroke={C.green} strokeWidth={5} opacity={n1(1-ph)}/>:null;};
  const cta=<g key={uid()}>
    <rect x={n1(540-ctaW/2)} y={ctaY} width={n1(ctaW)} height={ctaH} rx={ctaH/2} fill={C.yolk}/>
    <circle cx={n1(dotX)} cy={ctaY+ctaH/2} r={17} fill={C.green}/>{ring(0)}{ring(1)}
    {TX(ctaT,n1(540+44),ctaY+ctaH/2+CS*.37,CS,F.cond,400,C.green,{ls:CS*.05})}</g>;
  return {bg:C.green,ink:C.cream,
    back:camSvg(k,<circle cx={BX} cy={BY} r={n1(r)} fill={C.yolk}/>),
    media,
    el:camSvg(k,<>
      <circle cx={BX} cy={BY} r={n1(r+4)} fill="none" stroke={C.yolk} strokeWidth={16}/>
      {withFont(F.cond,()=>ringText(BX,BY,BR+64,'NAATI FARMS · BANGALORE · ',44,400,false,u*14,C.cream,eo(seg(u,.15,.4))))}
      {withFont(F.cond,()=>{const sz=fit('NAATI',400,760,330,-.01);return letters('NAATI',530,1152,sz,400,C.cream,t,TL.wordmark,{stag:.045,dur:.32,trk:-.01});})}
      {lettersIn(F.ital,'FARMS',530,1274,140,600,C.yolk,t,TL.farms,{stag:.04})}
      {hand('raised outside · no antibiotics',540,1366,72,C.cream,t,TL.tagline,{halo:false,dur:.5})}
      {pop(t,TL.cta,cta,540,ctaY+ctaH/2,40,18,.45)}
    </>)};
}

export const film:FilmConfig={
  width:1080,height:1920,fps:FPS,duration:TL.duration,
  sections:[
    {name:'DAWN',start:TL.dawn,render:dawn},
    {name:'RIDE',start:TL.ride,render:ride},
    {name:'ARRIVE',start:TL.arrive,render:arrive},
    {name:'GATE',start:TL.gate,render:gate},
    {name:'RELEASE',start:TL.release,render:release},
    {name:'OUT IN THE OPEN',start:TL.words[0],render:openAir},
    {name:'NAATI',start:TL.naati,render:naati},
    {name:'LIVELY',start:14,render:lively},
    {name:'REAL FOOD',start:TL.food,render:food},
    {name:'NO ANTIBIOTICS',start:TL.noab,render:noab},
    {name:'EVERY BIRD',start:TL.grid,render:grid},
    {name:'NOW LAUNCHING',start:TL.launch,render:launch},
    {name:'LOCKUP',start:TL.lockup,render:lockup},
  ],
  hud:null,
  blurMedia:false,   // camera blur on the graphics only; footage already carries its own motion blur
  audio:'soundtrack.wav',
  grain:.045,
  fonts:{display:{family:'Fraunces',file:'fonts/Fraunces.ttf'},mono:{family:'GeistMono',file:'GeistMono-Variable.woff2'}},
  extraFonts:[
    {family:'FrauncesI',file:'fonts/Fraunces-Italic.ttf'},
    {family:'Anton',file:'fonts/Anton.ttf',weight:'400'},
    {family:'Caveat',file:'fonts/Caveat.ttf'},
    {family:'BalooTamma2',file:'fonts/BalooTamma2.ttf',sample:'ನಾಟಿ'},
  ],
  preloadWeights:[500,600,650],
};
