import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Audio,Composition,Img,cancelRender,continueRender,delayRender,registerRoot,staticFile,useCurrentFrame} from 'remotion';
import {step,kick} from './physics';

export const palette={black:'#0D0D0F',white:'#F4F1EA',orange:'#FF4D1C',blue:'#1649FF',lime:'#D6FF2A',amber:'#FFC700',pink:'#FFA6C9',mint:'#2EE59D'};
const {black,white,orange,blue,lime}=palette;
export const plan={brand:'FORM',descriptor:'TRAINING CLUB',cta:'JOIN FORM',fps:60,width:1920,height:1080,durationInFrames:900,bpm:128,
  cuts:[0,112,225,337,450,562,675,787,900],
  chapters:['SHOW UP','BUILD YOUR STRONG','FIND YOUR FORM','REP BY REP','FEEL THE POWER','FIND YOUR RHYTHM','TRAIN YOUR WAY','JOIN FORM'],
};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>1-Math.pow(1-clamp(x),4);
const ramp=(t:number,a:number,b:number)=>ease((t-a)/(b-a));
const mono='Mono, monospace';
const bg=[black,blue,lime,black,orange,white,black,black];
const local=(frame:number,i:number)=>(frame-plan.cuts[i])/60;
const chapter=(frame:number)=>Math.min(7,plan.cuts.findIndex((v,i)=>frame>=v&&frame<plan.cuts[i+1]));
const pulse=(frame:number)=>Math.exp(-((frame/60)%(60/plan.bpm))*15);

function Letters({text,x,y,size=190,color=white,t=0,start=0,axis='y',shadow=false}:{text:string;x:number;y:number;size?:number;color?:string;t?:number;start?:number;axis?:'x'|'y';shadow?:boolean}){
  return <div style={{position:'absolute',left:x,top:y,fontSize:size,lineHeight:1.02,fontWeight:900,letterSpacing:-size*.065,whiteSpace:'nowrap',color,textShadow:shadow?`3px 4px ${black},6px 8px ${black}`:undefined}}>{Array.from(text).map((c,i)=>{
    const s=step(t,start+i*.014,'letters'),velocity=step(t+.008,start+i*.014,'letters')-step(t-.008,start+i*.014,'letters');
    const stretch=1+Math.max(-.12,Math.min(.25,velocity*1.6));
    return <span key={i} style={{display:'inline-block',whiteSpace:'pre',opacity:clamp((t-start-i*.014)*18),transformOrigin:'50% 85%',transform:`translate(${axis==='x'?(1-s)*220:0}px,${axis==='y'?(1-s)*110:0}px) rotate(${(1-s)*(i%2?7:-5)}deg) scale(${1/stretch},${stretch})`}}>{c}</span>;
  })}</div>;
}

function ballY(t:number){
  const floor=735,g=5200,start=205,fall=Math.sqrt(2*(floor-start)/g);
  if(t<fall)return start+.5*g*Math.max(0,t)**2;
  let s=t-fall,v=g*fall*.58;
  for(let i=0;i<7;i++){const flight=2*v/g;if(s<flight)return floor-v*s+.5*g*s*s;s-=flight;v*=.48;}
  return floor;
}
function impactTimes(){const g=5200,fall=Math.sqrt(2*(735-205)/g);let at=fall,v=g*fall*.58;const times=[at];for(let i=0;i<4;i++){at+=2*v/g;times.push(at);v*=.48;}return times;}
const impacts=impactTimes();
function Timing({t}:{t:number}){
  const y=ballY(t),squash=impacts.reduce((a,v)=>a+.42*kick(t,v),0),sx=1+squash,sy=1/sx;
  return <>
    <Letters text="SHOW" x={140} y={245} t={t} size={220}/><Letters text="UP." x={140} y={455} t={t} start={.12} size={220}/>
    <div style={{position:'absolute',left:153,top:763,color:orange,fontFamily:mono,fontSize:23,letterSpacing:4}}>YOUR NEXT REP STARTS HERE.</div>
    <svg width="1920" height="1080"><path d="M970 811H1740" stroke={white} strokeWidth="2" opacity=".65"/>{Array.from({length:27},(_,i)=><path key={i} d={`M${980+i*28} 811v${i%5===0?22:10}`} stroke={white} opacity=".3"/>)}
      {Array.from({length:7},(_,i)=>{const old=ballY(Math.max(0,t-(i+1)*.033));return <circle key={i} cx="1350" cy={old} r="76" fill="none" stroke={orange} strokeWidth="2" opacity={(1-i/7)*.2}/>;})}
      {impacts.map((hit,i)=>{const q=clamp((t-hit)/.5);return t>=hit&&q<1?<ellipse key={i} cx="1350" cy="811" rx={20+q*180} ry={3+q*17} fill="none" stroke={orange} strokeWidth="2" opacity={(1-q)*.6}/>:null;})}
      <g transform={`translate(1350 ${y+76}) scale(${sx} ${sy}) translate(0 -76)`}><circle r="76" fill={orange}/><circle r="44" fill="none" stroke={black} strokeWidth="2" opacity=".2"/></g>
      <path d="M1350 130v690" stroke={white} strokeWidth="1" opacity=".08" strokeDasharray="3 15"/>
    </svg>
  </>;
}
function Type({t}:{t:number}){
  const speed=Math.min(17,(1-ramp(t,0,.4))*17);
  return <>
    <svg width="1920" height="1080" style={{position:'absolute'}}><defs><filter id="type-speed" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation={`${speed} 0`}/></filter></defs></svg>
    <div style={{position:'absolute',inset:-90,display:'grid',gridTemplateRows:'repeat(5,1fr)',opacity:.12,transform:`translateX(${(1-ramp(t,0,.8))*-85}px)`}}>{Array.from({length:5},(_,i)=><div key={i} style={{fontSize:238,fontWeight:900,letterSpacing:-14,whiteSpace:'nowrap',color:'transparent',WebkitTextStroke:`1px ${white}`,lineHeight:1}}>STRONG. STRONG. STRONG.</div>)}</div>
    <div style={{filter:'url(#type-speed)'}}><Letters text="BUILD" x={165} y={120} size={242} t={t} axis="x" shadow/><Letters text="YOUR" x={165} y={355} size={242} t={t} start={.10} axis="x" shadow/><Letters text="STRONG." x={165} y={590} size={242} color={orange} t={t} start={.20} axis="x" shadow/></div>
  </>;
}

function radialShape(kind:number,count=96){
  const vertices=kind===0?3:kind===1?4:10;
  const points=Array.from({length:vertices},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/vertices;const r=kind===2&&i%2?105:245;return {x:Math.cos(a)*r,y:Math.sin(a)*r};});
  return Array.from({length:count},(_,i)=>{const k=i/count*vertices,j=Math.floor(k),q=k-j;return {x:points[j].x*(1-q)+points[(j+1)%vertices].x*q,y:points[j].y*(1-q)+points[(j+1)%vertices].y*q};});
}
const shapes=[radialShape(0),radialShape(1),radialShape(2)];
function Morph({t}:{t:number}){
  const progress=t<.77?ramp(t,.34,.77):1+ramp(t,.99,1.48),a=Math.floor(Math.min(1,progress)),q=progress-a;
  const pts=shapes[a].map((v,i)=>({x:v.x*(1-q)+shapes[a+1][i].x*q,y:v.y*(1-q)+shapes[a+1][i].y*q}));
  const angle=-12+30*ramp(t,0,1.7);
  return <>
    <Letters text="FIND YOUR" x={145} y={275} size={142} color={black} t={t}/><Letters text="FORM." x={145} y={435} size={235} color={black} t={t} start={.12}/>
    <div style={{position:'absolute',left:153,top:750,fontFamily:mono,fontSize:23,color:black,letterSpacing:4}}>CONTROL. RANGE. INTENTION.</div>
    <svg width="1920" height="1080"><g transform={`translate(1390 505) rotate(${angle})`}>
      <circle r="330" fill="none" stroke={black} strokeWidth="1" opacity=".3" strokeDasharray="3 10"/><rect x="-277" y="-277" width="554" height="554" fill="none" stroke={black} opacity=".25" strokeWidth="1"/>
      <polygon points={pts.map(v=>`${v.x},${v.y}`).join(' ')} fill={black}/>
      {pts.filter((_,i)=>i%12===0).map((v,i)=><g key={i}><path d={`M${v.x*.58} ${v.y*.58}L${v.x*1.24} ${v.y*1.24}`} stroke={blue} strokeWidth="1.5"/><circle cx={v.x} cy={v.y} r="6" fill={orange}/><circle cx={v.x*1.24} cy={v.y*1.24} r="4" fill={blue}/></g>)}
      {[0,1,2].map((v,i)=>{const ang=t*2.2+i*Math.PI*2/3;return <circle key={i} cx={Math.cos(ang)*330} cy={Math.sin(ang)*330} r={i===0?10:6} fill={i===0?orange:blue}/>;})}
    </g></svg>
  </>;
}

function Rings({t}:{t:number}){
  const zoom=1.48-.52*ramp(t,0,1.65);
  return <>
    <svg width="1920" height="1080"><defs>{[205,335,485,665].map((r,i)=><path key={r} id={'ring'+i} d={`M${960-r} 540a${r} ${r} 0 1 1 ${2*r} 0a${r} ${r} 0 1 1 ${-2*r} 0`}/>)}</defs><g transform={`translate(960 540) scale(${zoom} ${zoom*.9}) translate(-960 -540)`}>{[205,335,485,665].map((r,i)=><g key={r} transform={`rotate(${(i%2?1:-1)*(25+145*ramp(t,0,1.8))} 960 540)`}><text fill={[orange,white,lime,blue][i]} fontSize={[35,47,68,90][i]} fontWeight="850" letterSpacing="2"><textPath href={'#ring'+i} textLength={Math.PI*2*r*.985} lengthAdjust="spacingAndGlyphs">LIFT · MOVE · RESET · LIFT · MOVE · RESET · </textPath></text></g>)}</g></svg>
    <div style={{position:'absolute',left:790,top:362,width:340,textAlign:'center',background:black,padding:'5px 0 12px'}}><Letters text="REP." x={12} y={0} size={110} t={t}/><Letters text="BY REP." x={-32} y={108} size={92} color={orange} t={t} start={.12}/></div>
  </>;
}

function Liquid({t}:{t:number}){
  const balls=Array.from({length:8},(_,i)=>{
    const a=i*Math.PI/4+t*1.8,q=.6+.4*Math.sin(t*3+i*.8);return {x:960+Math.cos(a)*(170+220*q),y:530+Math.sin(a*1.3)*(120+100*q),r:96+28*Math.sin(t*4+i)};
  });
  const words=<><text x="960" y="465" textAnchor="middle" fontFamily="Inter" fontWeight="900" fontSize="205" letterSpacing="-13">FEEL THE</text><text x="960" y="685" textAnchor="middle" fontFamily="Inter" fontWeight="900" fontSize="250" letterSpacing="-16">POWER.</text></>;
  return <svg width="1920" height="1080"><defs><filter id="goo" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="16"/><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"/></filter><mask id="goo-mask"><g fill="white" filter="url(#goo)">{balls.map((v,i)=><circle key={i} cx={v.x} cy={v.y} r={v.r}/>)}</g></mask></defs>
    <g fill={black} filter="url(#goo)">{balls.map((v,i)=><circle key={i} cx={v.x} cy={v.y} r={v.r}/>)}</g><g fill={black}>{words}</g><g fill={white} mask="url(#goo-mask)">{words}</g>
    <text x="960" y="850" textAnchor="middle" fill={black} fontFamily={mono} fontSize="25" letterSpacing="6">MOVE WITH PURPOSE.</text>
  </svg>;
}

function Wave({t,frame}:{t:number;frame:number}){
  const hit=pulse(frame),enter=ramp(t,0,.55);
  return <>
    <Letters text="FIND YOUR" x={145} y={285} size={132} color={black} t={t}/><Letters text="RHYTHM." x={145} y={435} size={187} color={black} t={t} start={.12}/>
    <div style={{position:'absolute',left:154,top:754,fontFamily:mono,fontSize:24,letterSpacing:3,color:blue}}>STRENGTH. SWEAT. REPEAT.</div>
    <svg width="1920" height="1080"><g transform={`translate(${(1-enter)*190} 0)`}>{Array.from({length:29},(_,i)=>{
      const points=Array.from({length:100},(_,j)=>{const x=1030+j*7.6,normalized=(j-50)/22;const envelope=Math.exp(-normalized*normalized*.7);const y=210+i*22-envelope*(42+hit*65)*Math.sin(j*.12+t*4+i*.3);return `${x.toFixed(1)},${y.toFixed(1)}`;}).join(' ');
      return <polyline key={i} points={points} fill="none" stroke={i<14?orange:blue} strokeWidth="1.6" opacity={enter}/>;
    })}</g></svg>
  </>;
}
function Barbell({t,x,y,color=black}:{t:number;x:number;y:number;color?:string}){
  const lift=60*Math.sin(Math.PI*ramp(t,0,1.65));
  return <g transform={`translate(${x} ${y-lift}) rotate(${-6+6*step(t,0,'shell')})`} stroke={color} fill={color}><rect x="-165" y="-7" width="330" height="14" rx="7"/>{[-1,1].map(v=><g key={v}><rect x={v<0?-148:103} y="-96" width="45" height="192" rx="11"/><rect x={v<0?-185:156} y="-62" width="29" height="124" rx="8"/></g>)}</g>;
}
function Bento({t,frame}:{t:number;frame:number}){
  const collapse=ramp(t,1.54,1.86),scale=1-collapse*.14;
  return <>
    <div style={{position:'absolute',left:140,top:116,fontSize:60,fontWeight:850,letterSpacing:-3,color:white}}>TRAIN YOUR WAY.</div>
    {[0,1,2].map(i=>{const e=step(t,i*.07,'shell');return <div key={i} style={{position:'absolute',left:120+i*560,top:246+(1-e)*160,width:520,height:570,borderRadius:26,overflow:'hidden',background:[white,blue,lime][i],transform:`translateX(${collapse*(1-i)*200}px) scale(${scale})`,opacity:clamp(e)*(1-collapse*.6)}}>
      <div style={{padding:'33px 31px',fontSize:i===1?43:49,fontWeight:850,letterSpacing:-2,color:i===1?white:black}}>{['STRENGTH','CONDITIONING','MOBILITY'][i]}</div>
      <svg width="520" height="570" style={{position:'absolute',inset:0}}>
        {i===0?<><Barbell t={t} x={260} y={315}/><path d="M72 423H448" stroke={black} opacity=".2"/></>:i===1?<>
          {Array.from({length:19},(_,j)=><rect key={j} x={59+j*22} y={330-(40+Math.abs(Math.sin(j*.6+t*3))*135)*(1+pulse(frame)*.2)} width="10" height={(40+Math.abs(Math.sin(j*.6+t*3))*135)*(1+pulse(frame)*.2)} rx="5" fill={white}/>)}
          <path d="M58 375H461" stroke={white} opacity=".3"/>
        </>:<><circle cx="260" cy="300" r={88+18*Math.sin(t*3)} fill="none" stroke={black} strokeWidth="4"/><circle cx="260" cy="300" r={45+9*Math.sin(t*3)} fill={black}/><circle cx="260" cy="300" r="145" fill="none" stroke={black} strokeWidth="1" opacity=".22" strokeDasharray="2 9"/></>}
      </svg>
      <div style={{position:'absolute',left:34,bottom:35,fontFamily:mono,fontSize:20,letterSpacing:1.2,color:i===1?white:black}}>{['EVERY REP COUNTS.','FIND YOUR PACE.','MAKE SPACE TO MOVE.'][i]}</div>
    </div>;})}
  </>;
}
function End({t}:{t:number}){
  const s=step(t,0,'control'),dot=kick(t,.19)*45;
  return <>
    <div style={{position:'absolute',left:442,top:264,fontSize:365,lineHeight:1,fontWeight:900,letterSpacing:-28,color:white,transformOrigin:'50% 60%',transform:`translateY(${(1-s)*70}px) scale(${1+(1-s)*.18})`,opacity:clamp(t*15)}}>{plan.brand}<span style={{display:'inline-block',position:'relative',width:52,height:52,borderRadius:'50%',background:orange,marginLeft:24,transform:`translateY(${-dot}px) scale(${1+kick(t,.19)*.12},${1-kick(t,.19)*.12})`}}/></div>
    <div style={{position:'absolute',left:465,top:698,width:1005*ramp(t,.08,.33),height:6,background:orange}}/>
    <div style={{position:'absolute',left:465,top:742,fontFamily:mono,fontSize:25,color:white,letterSpacing:5}}>{'MAKE YOUR NEXT MOVE.'.slice(0,Math.ceil(ramp(t,.05,.34)*20))}</div>
    <div style={{position:'absolute',left:470,top:790,fontFamily:mono,fontSize:18,color:white,opacity:.55,letterSpacing:7}}>{plan.descriptor}</div>
    <div style={{position:'absolute',left:1168,top:744,width:300,height:79,background:lime,color:black,display:'flex',alignItems:'center',justifyContent:'center',gap:22,fontSize:30,fontWeight:850,letterSpacing:-1,opacity:ramp(t,.1,.31),transform:`translateY(${(1-step(t,.09,'control'))*35}px)`}}>{plan.cta}<span>↗</span></div>
  </>;
}

function Hud({frame,index}:{frame:number;index:number}){
  const sec=Math.floor(frame/60),ff=frame%60,tc=`TC 00:00:${String(sec).padStart(2,'0')}:${String(ff).padStart(2,'0')}`;
  return <AbsoluteFill style={{pointerEvents:'none',fontFamily:mono,color:white}}>
    <svg width="1920" height="1080"><g fill={black}><rect width="1920" height="65"/><rect y="1008" width="1920" height="72"/><rect width="44" height="1080"/><rect x="1876" width="44" height="1080"/></g><g stroke={white} strokeWidth="1.2" fill="none">{[[22,22,1,1],[1898,22,-1,1],[22,1058,1,-1],[1898,1058,-1,-1]].map(([x,y,dx,dy],i)=><path key={i} d={`M${x+dx*17} ${y}H${x}V${y+dy*17}`}/>)}</g><rect x="49" y="1065" width="1822" height="2" fill={white} opacity=".15"/><rect x="49" y="1065" width={1822*frame/899} height="2" fill={orange}/></svg>
    <div style={{position:'absolute',left:65,top:22,fontSize:18,letterSpacing:2}}>{plan.brand} / MOTION REEL 2026</div>
    <div style={{position:'absolute',right:65,top:22,fontSize:18,letterSpacing:2,fontVariantNumeric:'tabular-nums'}}>{tc}</div>
    <div style={{position:'absolute',left:65,bottom:34,fontSize:18,letterSpacing:1.5}}>{String(index+1).padStart(2,'0')} — {plan.chapters[index]}</div>
    <div style={{position:'absolute',right:65,bottom:34,display:'flex',alignItems:'center',gap:24,fontSize:17,letterSpacing:1}}><span>1920×1080 • 60 FPS</span><span style={{display:'flex',gap:4}}>{Array.from({length:8},(_,i)=><span key={i} style={{display:'block',width:7,height:10,background:i===Math.floor(frame/28.125)%8?orange:white,opacity:i===Math.floor(frame/28.125)%8?1:.15}}/>)}</span></div>
  </AbsoluteFill>;
}
export function GymAd(){
  const frame=useCurrentFrame(),index=chapter(frame),t=local(frame,index);
  const [handle]=useState(()=>delayRender('Inter display font'));
  useEffect(()=>{const faces=[new FontFace('Inter',`url(${staticFile('Inter.ttf')})`,{weight:'100 900'}),new FontFace('Mono',`url(${staticFile('DejaVuSansMono.ttf')})`)];Promise.all(faces.map(f=>f.load())).then(loaded=>{loaded.forEach(f=>(document.fonts as any).add(f));continueRender(handle);}).catch(cancelRender);},[handle]);
  return <AbsoluteFill style={{background:bg[index],fontFamily:'Inter',overflow:'hidden'}}>
    <Img src={staticFile('grain.png')} style={{position:'absolute',width:1,height:1,opacity:0}}/>
    {index===0?<Timing t={t}/>:index===1?<Type t={t}/>:index===2?<Morph t={t}/>:index===3?<Rings t={t}/>:index===4?<Liquid t={t}/>:index===5?<Wave t={t} frame={frame}/>:index===6?<Bento t={t} frame={frame}/>:<End t={t}/>} 
    {[2,5].includes(index)&&t<.22&&<svg width="1920" height="1080" style={{position:'absolute'}}>{Array.from({length:12},(_,i)=>{const v=ramp(t,i*.008,.13+i*.008);return <rect key={i} x={i*160} width="161" height={1080*(1-v)} y={i%2?0:1080*v} fill={black}/>;})}</svg>}
    <AbsoluteFill style={{backgroundImage:`url(${staticFile('grain.png')})`,backgroundRepeat:'repeat',backgroundPosition:`${Math.floor(frame/3)*71%320}px ${Math.floor(frame/3)*43%320}px`,opacity:.065,mixBlendMode:'soft-light',pointerEvents:'none'}}/>
    <Hud frame={frame} index={index}/><Audio src={staticFile('percussion.mp3')} volume={1}/>
  </AbsoluteFill>;
}
const Root=()=> <Composition id="FormGymAd" component={GymAd} width={plan.width} height={plan.height} fps={plan.fps} durationInFrames={plan.durationInFrames}/>;
registerRoot(Root);
