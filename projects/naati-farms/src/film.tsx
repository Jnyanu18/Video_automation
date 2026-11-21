/* NAATI FARMS — launch film v2. 9:16, 60 fps, 30 s, cut to "Midnight Funk" (Mixkit, 117.97 BPM). Plan: ../plan.md.
   Every time comes from ../timeline.json, which ../soundtrack.py writes from the track's beat grid.
   Script (owner's pick, "punchy, product first"): NAATI CHICKEN. / The real one. (black & white, over the build) ->
   Raised OUTSIDE. (colour on the drop: the gate opens, the flock runs out) -> the birds outside, one shot per beat ->
   Lively. Healthy. -> NO ANTIBIOTICS. -> From our farm in Bangalore. -> the whole farm -> NAATI FARMS,
   now launching, call to order.
   Identity: black, white and one accent, comb red. Fonts, one job each: Geist is the voice, Anton the shout,
   Fraunces Italic the warm words, Geist Mono the labels. v1 (yolk/green, synthesized score) is in ../work/v1/. */
import React from 'react';
import {S,addDef,clamp,eio,eo,fit,kick,lerp,letters,n1,osc,pop,ringText,rise,seg,slam,slices,tw,uid,withFont} from '@kit/core';
import {footage,type Clip} from '@kit/footage';
import {burstPosition} from '@kit/depth-motion';
import {cameraRecoil} from '@kit/type-camera';
import {impactWindow} from '@kit/mixed-media';
import type {FilmConfig,Frame} from '@kit/film';
import TL from '../timeline.json';
import FR from '../public/frames/index.json';

const C={ink:'#0B0B0B',white:'#FFFFFF',grey:'#9B9B9B',red:'#E4312B'};
const F={sans:'Geist',cond:'Anton',ital:'FrauncesI',mono:'GeistMono'};
const B=TL.beat;
const FPS=60;
const fr=(t:number)=>Math.round(t*FPS);
const BW='grayscale(1) contrast(1.18) brightness(.9)';

/* ---------- footage: JPEG sequences from work/extract_frames.py (index.json holds each range) ---------- */
const LAND=new Set(['1562','1564','1570','1573','1593']);
type Variant='full'|'med'|'small';
const SEQ=FR as Record<string,{first:number;last:number}>;
function V(id:string,variant:Variant='full'):Clip{
  const key=`${id}-${variant}`,r=SEQ[key];
  if(!r)throw new Error(`no frame sequence ${key}: add it to work/extract_frames.py`);
  const land=LAND.has(id);
  return {src:`frames/${key}`,w:land?1920:1080,h:land?1080:1920,seq:{dir:`frames/${key}`,fps:30,first:r.first,last:r.last}};
}

/* ---------- text ---------- */
type TO={anchor?:'start'|'middle'|'end';ls?:number;op?:number};
function TX(s:string,x:number,y:number,sz:number,fam:string,wt:number,fill:string,o:TO={}){
  return <text key={uid()} x={n1(x)} y={n1(y)} fontFamily={fam} fontWeight={wt} fontSize={n1(sz)} fill={fill} textAnchor={o.anchor??'middle'} letterSpacing={o.ls} opacity={o.op}>{s}</text>;
}
const width=(s:string,fam:string,wt:number,sz:number)=>withFont(fam,()=>tw(s,wt,sz));
const fitF=(s:string,fam:string,wt:number,maxW:number,maxS:number,trk=-.01)=>withFont(fam,()=>fit(s,wt,maxW,maxS,trk));
const shadow=(a=.45,blur=16)=>`url(#${addDef(id=><filter key={id} id={id} x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation={blur} floodColor="#000" floodOpacity={a}/></filter>)})`;
function scrim(y0:number,y1:number,a:number,up=false){
  const id=addDef(id=><linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity={up?a:0}/><stop offset="1" stopColor="#000" stopOpacity={up?0:a}/></linearGradient>);
  return <rect key={uid()} x={0} y={y0} width={S.W} height={y1-y0} fill={`url(#${id})`}/>;
}
/** Per-letter masked rise in any family. */
const lettersIn=(fam:string,s:string,x:number,base:number,sz:number,wt:number,fill:string,t:number,t0:number,o:{stag?:number;dur?:number;trk?:number;anchor?:'start'|'middle'}={})=>
  withFont(fam,()=><>{letters(s,x,base,sz,wt,fill,t,t0,{stag:o.stag??.03,dur:o.dur??.3,trk:o.trk??-.01,anchor:o.anchor??'middle'})}</>);
/** Whole-line masked rise (calmer than per-letter: used for the voice). */
const lineIn=(node:React.ReactNode,base:number,sz:number,t:number,t0:number,dur=.32)=>rise(node,base,sz,t,t0,dur);

/* ---------- camera ---------- */
type Shake={x:number;y:number;r:number};
function shakeAt(t:number,events:[number,number][]):Shake{
  let x=0,y=0,r=0;
  for(const [ev,amp] of events){const k=cameraRecoil(fr(t),FPS,{eventFrame:fr(ev),amplitudeDeliveryPx:amp,rotationDegrees:amp*.03,durationSeconds:.4});x+=k.offsetDeliveryPx.x;y+=k.offsetDeliveryPx.y;r+=k.rotationDegrees;}
  return {x,y,r};
}
const HITS:[number,number][]=[[TL.drop,16],[TL.no,18],[TL.brand,10],[TL.final,6]];
const camMedia=(k:Shake,node:React.ReactNode)=><div key={uid()} style={{position:'absolute',inset:0,transform:`translate(${n1(k.x)}px,${n1(k.y)}px) rotate(${k.r.toFixed(3)}deg)`}}>{node}</div>;
const camSvg=(k:Shake,node:React.ReactNode)=><g key={uid()} transform={`translate(${n1(k.x)} ${n1(k.y)}) rotate(${k.r.toFixed(3)} ${S.CX} ${S.CY})`}>{node}</g>;
/** Knockout: an ink card with the word cut out of it, so the footage underneath shows through the letters. */
function knockout(word:string,fam:string,wt:number,sz:number,by:number,scaleAt:{cx:number;cy:number;s:number}|null,inner?:(fill:string)=>React.ReactNode){
  const mid=addDef(id=><mask key={id} id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={S.W} height={S.H}>
    <rect width={S.W} height={S.H} fill="#fff"/>
    <g transform={scaleAt?`translate(${n1(scaleAt.cx)} ${n1(scaleAt.cy)}) scale(${scaleAt.s.toFixed(4)}) translate(${n1(-scaleAt.cx)} ${n1(-scaleAt.cy)})`:undefined}>
      {inner?inner('#000'):TX(word,S.CX,by,sz,fam,wt,'#000',{ls:-sz*.01})}</g>
  </mask>);
  return <rect key={uid()} width={S.W} height={S.H} fill={C.ink} mask={`url(#${mid})`}/>;
}

/* ---------- 0-1  NAATI CHICKEN. / The real one.  (black & white over the build) ---------- */
function title(t:number):Frame{
  const second=t>=TL.real,wp=eio(seg(t,TL.whip,TL.drop-TL.whip));
  const z=(second?1+.05*seg(t,TL.real,4*B):1+.05*seg(t,0,4*B))+.5*wp*wp,bl=8*wp*wp;
  const media=second
    ?footage(V('1562'),{start:TL.real,in:2.0,fx:.64,zoom:z,filter:BW+' brightness(.72)'+(bl>.3?` blur(${bl.toFixed(1)}px)`:'')})
    :footage(V('1561'),{start:0,in:6.0,zoom:z,filter:BW+' brightness(.55)'});
  if(!second){
    const s1=fitF('NAATI',F.cond,400,960,560),s2=fitF('CHICKEN.',F.cond,400,960,330);
    const b1=820,b2=b1+48+s2*.74,u=eo(seg(t,TL.underline,.22));
    const make=()=>TX('CHICKEN.',S.CX,b2,s2,F.cond,400,C.white,{ls:-s2*.01});
    return {bg:C.ink,ink:C.white,media,el:<g filter={shadow(.45,18)}>
      {lettersIn(F.cond,'NAATI',S.CX,b1,s1,400,C.white,t,TL.title[0],{stag:.05,dur:.3})}
      {t>=TL.title[1]&&withFont(F.cond,()=>slam(make(),b2,t-TL.title[1],{dir:1,dist:380,dur:.13,stretch:.24}))}
      {u>0&&<rect x={n1(S.CX-430*u)} y={b2+34} width={n1(860*u)} height={12} fill={C.red}/>}
    </g>};
  }
  const lw=width('The ',F.ital,500,180),rw=width('real',F.ital,500,180),tot=width('The real one.',F.ital,500,180),x0=S.CX-tot/2;
  const ul=eo(seg(t,TL.real+.3,.25)),op=1-clamp(wp*2.2);
  return {bg:C.ink,ink:C.white,media,el:<>
    {scrim(700,1920,.6)}
    <g opacity={op} transform={`translate(${S.CX} 1040) scale(${(1+.25*wp).toFixed(3)}) translate(${-S.CX} -1040)`} filter={shadow(.5,18)}>
      {lineIn(TX('The real one.',x0,1080,180,F.ital,500,C.white,{anchor:'start'}),1080,180,t,TL.real)}
      {ul>0&&<rect x={n1(x0+lw)} y={1112} width={n1(rw*ul)} height={10} fill={C.red}/>}
    </g>
  </>};
}

/* ---------- 2  THE ANSWER: colour; the gate opens and the flock runs out ---------- */
function outside(t:number):Frame{
  const k=shakeAt(t,HITS),u=t-TL.drop;
  const media=camMedia(k,footage(V('1381'),{start:TL.drop,in:7.9,rate:1.2,zoom:1.12-.12*eo(seg(u,0,.6))}));
  const sz=fitF('OUTSIDE.',F.cond,400,960,330),by=330+190+sz*.74;
  const flash=.55*(1-seg(u,0,.1));
  return {bg:C.ink,ink:C.white,media,el:<>
    {scrim(0,980,.62,true)}
    {camSvg(k,<g filter={shadow(.45,16)}>
      {lineIn(TX('Raised',S.CX,420,150,F.ital,500,C.white),420,150,t,TL.drop+.02)}
      {t>=TL.outside&&withFont(F.cond,()=>slam(TX('OUTSIDE.',S.CX,by,sz,F.cond,400,C.white,{ls:-sz*.01}),by,t-TL.outside,{dir:-1,dist:420,dur:.14,stretch:.25}))}
    </g>)}
    {flash>0&&<rect width={S.W} height={S.H} fill={C.white} opacity={n1(flash*100)/100}/>}
  </>};
}

/* ---------- 3  OUTSIDE: one shot per beat, no words (the pictures make the claim) ---------- */
const ROAM=[{id:'1151',in:5.4},{id:'1336',in:1.0},{id:'1337',in:15.4},{id:'1561',in:9.0}];
function roam(t:number):Frame{
  const i=clamp(Math.floor((t-TL.roam[0])/B+1e-6),0,3),t0=TL.roam[i],vv=t-t0,r=ROAM[i];
  const media=footage(V(r.id),{start:t0,in:r.in,scale:1.14-.14*eo(seg(vv,0,.26)),tx:(i%2?1:-1)*60*(1-eo(seg(vv,0,.2)))});
  return {bg:C.ink,ink:C.white,media,el:null};
}

/* ---------- 4  LIVELY / HEALTHY: the rooster, then the flock on greens, in a cinema window; the picture sinks with the filtered music ---------- */
const WIN={x:0,y:656,w:1080,h:608};
function lively(t:number):Frame{
  const healthy=t>=TL.healthy,open=eo(seg(t,TL.lively,.22)),h=WIN.h*open;
  const dip=seg(t,TL.dip,TL.no-TL.dip);
  const filt=dip>0?`brightness(${(1-.45*dip).toFixed(3)}) blur(${(5*dip).toFixed(1)}px)`:undefined;
  const box={x:0,y:WIN.y+(WIN.h-h)/2,w:WIN.w,h:Math.max(1,h)};
  const media=healthy?footage(V('1593'),{start:TL.healthy,in:1.2,fx:.5,box,filter:filt,scale:1.06-.06*eo(seg(t,TL.healthy,.3))})
    :footage(V('1564'),{start:TL.lively,in:8.6,fx:.42,box,filter:filt});
  const fade=1-.55*dip;
  return {bg:C.ink,ink:C.white,media,el:<g opacity={fade}>
    {pop(t,TL.lively+.02,TX('Lively.',S.CX,560,200,F.ital,500,C.white),S.CX,500,110,13,.28)}
    {healthy&&lineIn(TX('Healthy.',S.CX,1480,200,F.ital,500,C.white),1480,200,t,TL.healthy+.02,.4)}
    {open>0&&<rect x={0} y={n1(WIN.y+WIN.h+26)} width={n1(1080*eo(seg(t,TL.lively+.1,1.6*B)))} height={4} fill={C.red}/>}
  </g>};
}

/* ---------- 5  NO / ANTIBIOTICS. ---------- */
function noAb(t:number):Frame{
  if(t>=TL.stop)return {bg:C.ink,ink:C.white,el:null};   // the music stops for half a beat: so does the picture
  const k=shakeAt(t,HITS),hit=impactWindow(fr(t),FPS,{atFrame:fr(TL.no),referenceFrames:3}).active;
  const bg=hit?C.white:C.ink,ink=hit?C.ink:C.white;
  const s1=fitF('NO',F.cond,400,700,620),b1=300+s1*.74;
  const s2=fitF('ANTIBIOTICS.',F.cond,400,960,300),b2=b1+60+s2*.74;
  const amp=30*(1-seg(t,TL.no,.22)),make=()=>TX('NO',S.CX,b1,s1,F.cond,400,C.red,{ls:-s1*.01});
  return {bg,ink,el:camSvg(k,<>
    {withFont(F.cond,()=>slam(amp>.5?<>{slices(make,b1,s1,amp,3)}</>:make(),b1,t-TL.no,{dir:-1,dist:380,dur:.13,stretch:.28}))}
    {lettersIn(F.cond,'ANTIBIOTICS.',S.CX,b2,s2,400,ink,t,TL.antibiotics,{stag:.02,dur:.26})}
  </>)};
}

/* ---------- 6  FROM OUR FARM IN BANGALORE ---------- */
function ourFarm(t:number):Frame{
  const media=footage(V('1152'),{start:TL.farmLine,in:2.5,rate:1.2,zoom:1.1-.1*eo(seg(t,TL.farmLine,1.2))});
  const iw=width('in ',F.ital,500,150),bw=width('Bangalore.',F.ital,500,150);
  return {bg:C.ink,ink:C.white,media,el:<>
    {scrim(900,1920,.78)}
    <g filter={shadow(.4,14)}>
      {lineIn(TX('From our farm',80,1300,124,F.sans,800,C.white,{anchor:'start',ls:-3.7}),1300,124,t,TL.farmLine)}
      {lineIn(<>{TX('in',80,1460,150,F.ital,500,C.white,{anchor:'start'})}<rect x={n1(80+iw-14)} y={1460-118} width={n1(bw+22)} height={150} rx={10} fill={C.red}/>{TX('Bangalore.',80+iw,1460,150,F.ital,500,C.white,{anchor:'start'})}</>,1460,150,t,TL.bangalore)}
    </g>
  </>};
}

/* ---------- 7-8  THE WHOLE FARM: twelve clips burst out on the eighth notes, then collapse ---------- */
const GRID=['1151','1381','1152','1561','1564','1337','1593','1562','1336','1573','1570','1363'];
const GRID_IN:Record<string,number>={'1151':1.0,'1381':14.0,'1152':4.5,'1561':3.5,'1564':14.0,'1337':6.0,'1593':1.5,'1562':6.0,'1336':2.5,'1573':1.5,'1570':6.5,'1363':9.0};
const CW=336,CH=440,GAP=12,GX=24,GY=62;
function farm(t:number):Frame{
  const cells=GRID.map((id,i)=>{const c=i%3,r=Math.floor(i/3),cx=GX+c*(CW+GAP)+CW/2,cy=GY+r*(CH+GAP)+CH/2;
    return {id,cx,cy,ring:Math.min(2,Math.round(Math.hypot(cx-S.CX,cy-S.CY)/330))};});
  const media=<>{cells.map(c=>{
    const t0=TL.grid+c.ring*B/2,q=burstPosition(fr(t),FPS,{x:0,y:0,z:0},{x:1,y:0,z:0},fr(t0)).x;
    const back=eio(seg(t,TL.gridOut+(2-c.ring)*B/4,.36)),kk=q*(1-back);
    const x=lerp(S.CX,c.cx,kk),y=lerp(S.CY,c.cy,kk),sc=(.2+.8*q)*(1-back);
    if(sc<.01||t<t0)return null;
    return footage(V(c.id,'small'),{start:TL.grid,in:GRID_IN[c.id],box:{x:x-CW/2,y:y-CH/2,w:CW,h:CH},scale:sc,radius:14});
  })}</>;
  return {bg:C.ink,ink:C.white,media,el:null};
}

/* ---------- 9  NAATI as a window onto the hero rooster; the camera pushes through the I ---------- */
const MASK_SZ=640;
function naatiWord(t:number,fill:string,sz:number,by:number){
  return withFont(F.cond,()=><>{letters('NAATI',S.CX,by,sz,400,fill,t,TL.mask,{stag:.05,dur:.3,trk:-.01})}</>);
}
function naatiGeo(){
  return withFont(F.cond,()=>{
    const sz=Math.min(MASK_SZ,fit('NAATI',400,960,MASK_SZ,-.01)),by=960+sz*.37;
    const ws=[...'NAATI'].map(c=>tw(c,400,sz)),tot=ws.reduce((a,b)=>a+b,0)-.01*sz*4,x0=S.CX-tot/2;
    const iCx=x0+ws.slice(0,4).reduce((a,b)=>a+b,0)-.01*sz*4+ws[4]/2;
    return {sz,by,iCx,iCy:by-sz*.37};
  });
}
function naati(t:number):Frame{
  const g=naatiGeo(),s=Math.exp(Math.log(30)*eio(seg(t,TL.push,TL.brand-TL.push)));
  // The whole 16:9 shot (rooster on sunlit ground) sits behind the letters. It scales slower than the letters
  // (parallax: the letters are near, the farm is far), so it stays sharp as the camera flies through the I.
  const sb=Math.pow(s,.4),h0=608,y0=g.iCy-h0/2,box={x:g.iCx+(0-g.iCx)*sb,y:g.iCy+(y0-g.iCy)*sb,w:1080*sb,h:h0*sb};
  const media=footage(V('1564'),{start:TL.mask,in:18.0,box,zoom:1.08-.08*eo(seg(t,TL.mask,1.4))});
  return {bg:C.ink,ink:C.white,media,el:<>
    {knockout('NAATI',F.cond,400,g.sz,g.by,{cx:g.iCx,cy:g.iCy,s},fill=>naatiWord(t,fill,g.sz,g.by))}
  </>};
}

/* ---------- 10-13  LOCKUP: the rooster shrinks into the badge; name, launch, call ---------- */
const BX=540,BY=470,BR=210;
function lockup(t:number):Frame{
  const k=shakeAt(t,HITS),u=t-TL.brand,e=eio(seg(u,0,.5)),sp=osc(u-.42,16,.5);
  const r=u<.5?lerp(1110,BR,e):BR*(1+.06*(1-sp)),cx=BX,cy=lerp(960,BY,e);
  const fin=Math.max(0,kick(t,TL.final,26,9))*.035,S1=1+fin;
  const media=camMedia(k,<div style={{position:'absolute',inset:0,transform:`scale(${S1.toFixed(4)})`,transformOrigin:`${BX}px ${BY}px`}}>
    {footage(V('1564','med'),{start:TL.brand,in:14.0,fx:.45,box:{x:cx-r,y:cy-r,w:2*r,h:2*r},radius:r})}</div>);
  const ringOp=eo(seg(u,.45,.35));
  const nsz=fitF('NAATI',F.cond,400,800,330);
  const label='CALL TO ORDER',lw=width(label,F.mono,500,34)+8*(label.length-1),lx=S.CX-lw/2+22;
  const num='+91 78495 34944',nsz2=fitF(num,F.sans,800,940,104,-.02);
  const ring=(n:number)=>{const ph=((t-TL.number-n*B)%(2*B))/(2*B);return t>TL.number&&ph>=0?<circle key={uid()} cx={n1(lx-34)} cy={1388} r={n1(9+26*ph)} fill="none" stroke={C.red} strokeWidth={4} opacity={n1(1-ph)}/>:null;};
  const chipText='NOW LAUNCHING',csz=40,cls=8,cw=width(chipText,F.mono,500,csz)+cls*(chipText.length-1)+110,ch=96,cyc=1262;
  const launch=<g key={uid()}>
    <rect x={n1(S.CX-cw/2)} y={cyc-ch/2} width={n1(cw)} height={ch} rx={ch/2} fill={C.red}/>
    <circle cx={n1(S.CX-cw/2+44)} cy={cyc} r={9} fill={C.white}/>
    {TX(chipText,S.CX+18,cyc+csz*.36,csz,F.mono,500,C.white,{ls:cls})}</g>;
  return {bg:C.ink,ink:C.white,media,el:camSvg(k,<g transform={`translate(${BX} ${BY}) scale(${S1.toFixed(4)}) translate(${-BX} ${-BY})`}>
    {ringOp>0&&<>
      <circle cx={BX} cy={BY} r={BR+14} fill="none" stroke={C.white} strokeWidth={3} opacity={ringOp}/>
      {withFont(F.mono,()=>ringText(BX,BY,BR+52,'NAATI FARMS  ·  BANGALORE  ·  ',26,500,false,u*16,C.white,.8*ringOp))}
      <circle cx={BX} cy={BY-BR-14} r={9} fill={C.red} opacity={ringOp}/>
    </>}
    {lettersIn(F.cond,'NAATI',S.CX,1010,nsz,400,C.white,t,TL.wordmark,{stag:.045,dur:.3})}
    {t>=TL.farms&&<g opacity={eo(seg(t,TL.farms,.3))}>{TX('FARMS',S.CX+15,1100,58,F.sans,300,C.white,{ls:30})}</g>}
    {t>=TL.farms+.15&&<rect x={n1(S.CX-36*eo(seg(t,TL.farms+.15,.25)))} y={1140} width={n1(72*eo(seg(t,TL.farms+.15,.25)))} height={5} fill={C.red}/>}
    {pop(t,TL.launch,launch,S.CX,cyc,30,18,.45)}
    {t>=TL.cta&&<>
      <circle cx={n1(lx-34)} cy={1388} r={9} fill={C.red}/>{ring(0)}{ring(1)}
      {lineIn(TX(label,lx,1400,34,F.mono,500,C.grey,{anchor:'start',ls:8}),1400,34,t,TL.cta)}
    </>}
    {lettersIn(F.sans,num,S.CX,1506,nsz2,800,C.white,t,TL.number,{stag:.018,dur:.26,trk:-.02})}
  </g>)};
}

export const film:FilmConfig={
  width:1080,height:1920,fps:FPS,duration:TL.duration,
  sections:[
    {name:'TITLE',start:0,render:title},
    {name:'OUTSIDE',start:TL.drop,render:outside},
    {name:'BIRDS',start:TL.roam[0],render:roam},
    {name:'LIVELY',start:TL.lively,render:lively},
    {name:'NO ANTIBIOTICS',start:TL.no,render:noAb},
    {name:'OUR FARM',start:TL.farmLine,render:ourFarm},
    {name:'FARM GRID',start:TL.grid,render:farm},
    {name:'NAATI',start:TL.mask,render:naati},
    {name:'LOCKUP',start:TL.brand,render:lockup},
  ],
  hud:null,
  blurMedia:false,   // camera blur on the graphics only; footage carries its own motion blur
  audio:'soundtrack.wav',
  grain:.04,
  fonts:{display:{family:'Geist',file:'Geist-Variable.woff2'},mono:{family:'GeistMono',file:'GeistMono-Variable.woff2'}},
  extraFonts:[
    {family:'FrauncesI',file:'fonts/Fraunces-Italic.ttf'},
    {family:'Anton',file:'fonts/Anton.ttf',weight:'400'},
  ],
  preloadWeights:[300,500,800],
};
