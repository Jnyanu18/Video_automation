from pathlib import Path

p = Path(__file__).resolve().parent.parent / 'src' / 'film.tsx'
s = p.read_text(encoding='utf8')


def swap(start, end, new):
    global s
    a, b = s.index(start), s.index(end)
    s = s[:a] + new + s[b:]


swap('function noab(', '/* ---------- 10-11', r'''function noab(t:number):Frame{
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

''')

swap('function launch(', '/* ---------- 13-15', r'''function launch(t:number):Frame{
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

''')

swap('const BX=540', 'export const film', r'''const BX=540,BY=560,BR=240;
const STRIP=['1151','1593','1561','1336','1381','1570','1363','1337'];
const STRIP_IN:Record<string,number>={'1151':6.0,'1593':2.0,'1561':8.0,'1336':2.0,'1381':11.0,'1570':4.0,'1363':5.0,'1337':12.0};
function lockup(t:number):Frame{
  const k=shakeAt(t,SHAKES),u=t-TL.lockup,e=osc(u,12,.5),r=lerp(270,BR,e);
  // Filmstrip of the farm drifting along the bottom: a callback to the grid, decorative (below the safe zone).
  const sw=300,sh=230,sg=18,sy=1620,speed=70,stripOp=eo(seg(t,TL.tagline,.5));
  const strip=stripOp>0?STRIP.map((id,i)=>{const x=40+i*(sw+sg)-(t-TL.lockup)*speed;
    if(x>S.W||x<-sw)return null;
    return footage(SMALL(id),{start:TL.lockup,in:STRIP_IN[id],box:{x,y:sy,w:sw,h:sh},radius:18,opacity:stripOp});}):null;
  const media=camMedia(k,<>
    {footage(V('1564'),{start:TL.lockup,in:12.5,fx:.45,box:{x:BX-BR,y:BY-BR,w:2*BR,h:2*BR},radius:BR,opacity:eo(seg(u,.05,.35)),scale:r/BR})}
    {strip}</>);
  const CS=72,ctaT='CALL  +91 78495 34944',ctaW=width(ctaT,F.cond,400,CS)+CS*.05*ctaT.length+170,ctaY=1395,ctaH=124,dotX=540-ctaW/2+66;
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
      {withFont(F.cond,()=>{const sz=fit('NAATI',400,760,330,-.01);return letters('NAATI',530,1125,sz,400,C.cream,t,TL.wordmark,{stag:.045,dur:.32,trk:-.01});})}
      {lettersIn(F.ital,'FARMS',530,1250,140,600,C.yolk,t,TL.farms,{stag:.04})}
      {hand('raised outside · no antibiotics',540,1345,72,C.cream,t,TL.tagline,{halo:false,dur:.5})}
      {pop(t,TL.cta,cta,540,ctaY+ctaH/2,40,18,.45)}
    </>)};
}

''')
p.write_text(s, encoding='utf8', newline='\n')
print('patched')
