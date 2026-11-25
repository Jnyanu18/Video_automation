import React,{useEffect,useState} from 'react';
import {step,springTrack,shell,deformation,kick} from './physics';
import {AbsoluteFill,Audio,Composition,Sequence,continueRender,delayRender,interpolate,registerRoot,staticFile,useCurrentFrame} from 'remotion';

const FPS=60,clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-Math.pow(1-clamp(n),4);
const p=(t:number,a:number,b:number)=>ease((t-a)/(b-a));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const on=(t:number,a:number,b:number)=>p(t,a,a+.12)*(1-p(t,b-.12,b));
function track(t:number,keys:[number,number][]){
  if(t<=keys[0][0])return keys[0][1];
  for(let i=1;i<keys.length;i++)if(t<keys[i][0])return lerp(keys[i-1][1],keys[i][1],p(t,keys[i-1][0],keys[i][0]));
  return keys.at(-1)![1];
}
const purple='#5B42F3',ink='#121214',paper='#F0F0EB';
const font='Inter';
const texts={title:'Your next big idea',subtitle:'Flux · Motion lab',cta:'Every frame.\nIn flow.'};
const Cursor:React.FC<{x:number;y:number;scale?:number}>=({x,y,scale=1})=><svg width="65" height="80" viewBox="0 0 65 80" style={{position:'absolute',left:x,top:y,transform:`scale(${scale})`,transformOrigin:'9px 7px',filter:'drop-shadow(0 4px 3px #0003)',zIndex:10}}><path d="M8 6 L10 64 L25 47 L39 71 L49 65 L35 41 L58 37 Z" fill="#151519" stroke="#fff" strokeWidth="4" strokeLinejoin="round"/></svg>;
const Icon:React.FC<{name:string;size?:number;color?:string}>=({name,size=36,color='white'})=><svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">{name==='play'?<path d="M14 8 L32 20 L14 32 Z" fill={color} stroke="none"/>:name==='pause'?<><path d="M14 9v22M26 9v22" strokeWidth="6"/></>:name==='check'?<path d="M8 21l8 8L33 11"/>:name==='speaker'?<><path d="M5 16h7l9-8v24l-9-8H5z" fill={color} stroke="none"/><path d="M27 13q10 7 0 14M31 7q17 13 0 26"/></>:name==='next'?<><path d="M10 10l15 10-15 10z" fill={color} stroke="none"/><path d="M29 10v20"/></>:<><path d="M30 10L15 20l15 10z" fill={color} stroke="none"/><path d="M11 10v20"/></>}</svg>;
const Artwork:React.FC<{size:number}>=({size})=><div style={{width:size,height:size,position:'relative',overflow:'hidden',borderRadius:size*.24,background:'linear-gradient(145deg,#FFAE61 2%,#F8686E 35%,#A24DCB 64%,#4A37FA 96%)',boxShadow:'inset 0 0 0 1px #ffffff30'}}><div style={{position:'absolute',width:size*.9,height:size*.9,left:-size*.25,top:-size*.25,borderRadius:'50%',background:'#ffc471',filter:`blur(${size*.13}px)`}}/><div style={{position:'absolute',width:size*.7,height:size*.7,right:-size*.24,bottom:-size*.2,borderRadius:'50%',background:'#2c20ed',filter:`blur(${size*.15}px)`}}/><svg width={size} height={size} viewBox="0 0 100 100" style={{position:'absolute'}}><path d="M16 72Q30 22 53 42T89 30" fill="none" stroke="#ffffff40" strokeWidth="1"/><circle cx="70" cy="28" r="12" fill="#ffffff15"/></svg></div>;

const FlowStudy:React.FC=()=>{
  const f=useCurrentFrame(),t=f/FPS;
  const [handle]=useState(()=>delayRender('Inter font'));
  useEffect(()=>{const face=new FontFace('Inter',`url(${staticFile('Inter.ttf')})`,{weight:'100 900'});face.load().then(loaded=>{(document.fonts as any).add(loaded);continueRender(handle);});},[handle]);
  const {w,h,r}=shell(t),cx=540,cy=1030;
  const {sx,sy}=deformation(t);
  const settleY=(1-step(t,0,'shell'))*110;
  const tabSpring=springTrack(t,0,[[5.74,1],[5.96,2]],'control');
  const toggleSpring=step(t,4.86,'control');
  const controlVelocity=tabSpring-springTrack(t-1/60,0,[[5.74,1],[5.96,2]],'control');
  const tabStretch=1+Math.min(.2,Math.abs(controlVelocity)*1.1);
  const light=p(t,5.22,5.48)*(1-p(t,7.18,7.43)),shellOpacity=1-p(t,8.18,8.3);
  const scrubbing=p(t,2.58,3.04),volume=track(t,[[0,.72],[3.62,.72],[3.95,.18],[4.28,.88]]);
  const toggle=p(t,4.86,5.04),tab=track(t,[[0,0],[5.74,0],[5.83,1],[5.96,1],[6.08,2]]);
  let pointerX=track(t,[[0,770],[.16,770],[.48,650],[.66,650],[1.1,700],[2.04,700],[2.34,524],[2.48,524],[2.58,294],[2.67,650],[3.02,817],[3.15,817],[3.65,750],[3.95,319],[4.28,820],[4.5,820],[4.86,578],[5.05,578],[5.4,520],[5.72,550],[5.97,795],[6.2,795],[6.8,780],[7.35,790],[7.75,790]]);
  let pointerY=track(t,[[0,1230],[.18,1230],[.48,1034],[.7,1034],[1.1,1180],[2.04,1180],[2.34,1260],[2.48,1260],[2.58,1114],[2.67,1114],[3.02,1114],[3.15,1114],[3.65,1020],[4.28,1020],[4.5,1020],[4.86,1030],[5.05,1030],[5.4,1030],[6.0,1030],[6.2,1090],[6.8,1090],[7.35,1220],[7.75,1220]]);
  if(t>=2.58&&t<=3.1){pointerX=160+744*(.18+scrubbing*.7);pointerY=1114;}
  if(t>=3.62&&t<4.38){pointerX=225+689*volume;pointerY=1024;}
  const clicks=[.55,2.36,4.88,5.74,5.96];
  const clickScale=1-clicks.reduce((a,c)=>a+.12*kick(t,c),0);
  const card=p(t,1.75,2.1),pillOpacity=on(t,1.3,2.03),playerOpacity=on(t,1.9,3.45);
  const phase=t<1.3?0:t<3.4?1:t<4.5?2:t<5.9?3:4;
  const phaseStarts=[0,1.3,3.4,4.5,5.9];
  const phaseWords=['Create.','Play.','Adjust.','Refine.','Ready.'];
  const headingIn=p(t,phaseStarts[phase],phaseStarts[phase]+.24);
  const graph=p(t,6.18,7.01),final=p(t,8.18,8.68),finalType=p(t,8.42,8.8);
  const points=Array.from({length:70},(_,i)=>({x:44+i*11.2,y:390-i*2.9+Math.sin(i*.45)*23+Math.cos(i*.21)*13}));
  const curve='M'+points.map(q=>q.x.toFixed(1)+','+q.y.toFixed(1)).join(' L');
  return <AbsoluteFill style={{background:paper,color:ink,fontFamily:font,overflow:'hidden'}}>
    <AbsoluteFill style={{background:'radial-gradient(ellipse at 52% 50%,#ffffff95,transparent 60%)'}}/>
    <div style={{position:'absolute',top:110,left:86,right:86,display:'flex',justifyContent:'space-between',fontSize:23,fontWeight:600,letterSpacing:4,color:'#777873',opacity:1-final}}><span>FLUX / FLOW STUDY</span><span>03</span></div>
    <div style={{position:'absolute',top:350,left:84,right:64,overflow:'hidden',height:210,opacity:1-p(t,7.8,8.1)}}>
      {phaseWords.map((word,wordIndex)=>{
        const start=phaseStarts[wordIndex],next=phaseStarts[wordIndex+1]??8;
        if(t<start||t>next+.38)return null;
        return <div key={word} style={{position:'absolute',left:0,top:20,fontSize:143,fontWeight:680,letterSpacing:-9,lineHeight:1.05,whiteSpace:'nowrap'}}>{Array.from(word).map((ch,i)=>{
          const delay=i*.027,enter=step(t,start+delay,'letters');
          const out=p(t,next+i*.014,next+.23+i*.014);
          const velocity=step(t+1/120,start+delay,'letters')-step(t-1/120,start+delay,'letters');
          const stretch=1+Math.min(.24,Math.max(-.13,velocity*1.5));
          return <span key={i} style={{display:'inline-block',opacity:clamp((t-start-delay)*18)*(1-out),transformOrigin:'50% 85%',transform:`translateY(${(1-enter)*125-out*155}px) rotate(${(1-enter)*9-out*5}deg) scale(${1/stretch},${stretch})`,filter:`blur(${Math.min(2,Math.abs(velocity)*9)}px)`}}>{ch}</span>;
        })}</div>;
      })}
    </div>
    <div style={{position:'absolute',top:581,left:91,fontSize:29,color:'#8B8B85',letterSpacing:-.5,opacity:(1-final)*.85}}>Small actions. Endless possibilities.</div>

    <div style={{position:'absolute',left:cx-w/2,top:cy-h/2+settleY,width:w,height:h,opacity:shellOpacity*p(t,0,.2)}}>
      <div style={{position:'absolute',inset:0,borderRadius:Math.min(r,h/2),background:light>.5?'#fff':ink,boxShadow:`0 ${lerp(15,36,card)}px ${lerp(28,70,card)}px #1c20201a, 0 3px 8px #00000009, inset 0 1px 0 ${light>.5?'#fff':'#ffffff12'}`,border:`1px solid ${light>.5?'#e5e5df':'#242426'}`,transform:`scale(${sx},${sy})`}}/>
      <div style={{position:'absolute',inset:0,overflow:'hidden',borderRadius:Math.min(r,h/2)}}>
      <div style={{position:'absolute',width:430,height:124,left:'50%',top:'50%',transform:'translate(-50%,-50%)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:46,fontWeight:520,letterSpacing:-1,color:'white',opacity:1-p(t,.55,.72)}}>Create <span style={{marginLeft:33,fontSize:43}}>↗</span></div>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',opacity:on(t,.76,1.36)}}><svg width="59" height="59" viewBox="0 0 60 60" style={{transform:`rotate(${t*480}deg)`}}><circle cx="30" cy="30" r="23" fill="none" stroke="#ffffff23" strokeWidth="5"/><path d="M30 7a23 23 0 0 1 23 23" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round"/></svg></div>

      <div style={{position:'absolute',left:25,top:20,opacity:pillOpacity,display:'flex',gap:27,alignItems:'center'}}><Artwork size={104}/><div style={{fontSize:34,color:'#eee',fontWeight:550,opacity:p(t,1.48,1.62)}}>Your next big idea</div></div>
      <div style={{position:'absolute',right:40,top:50,display:'flex',gap:7,alignItems:'center',height:42,opacity:pillOpacity}}>{Array.from({length:5},(_,i)=><div key={i} style={{width:6,height:14+(Math.sin(t*8+i)*.5+.5)*27,borderRadius:8,background:'#c0b8e8'}}/>)}</div>

      <div style={{position:'absolute',inset:0,opacity:playerOpacity,color:'white'}}>
        <div style={{position:'absolute',left:46,top:45,display:'flex',gap:35,alignItems:'center'}}><Artwork size={172}/><div><div style={{fontSize:39,fontWeight:600,letterSpacing:-1.2}}>{texts.title}</div><div style={{fontSize:27,color:'#88888e',marginTop:13}}>{texts.subtitle}</div><div style={{display:'inline-flex',alignItems:'center',gap:8,marginTop:20,fontSize:17,letterSpacing:2,color:'#d2c9ff'}}><span style={{width:6,height:6,borderRadius:6,background:'#a597ff'}}/>IN MOTION</div></div></div>
        <div style={{position:'absolute',left:48,right:48,top:285,height:80,display:'flex',alignItems:'center',gap:5}}>{Array.from({length:65},(_,i)=>{const a=.22+.78*Math.abs(Math.sin(i*.51)*Math.cos(i*.18));return <div key={i} style={{width:7,flexShrink:0,height:9+56*a*(.75+.25*Math.sin(t*9+i*.3)),borderRadius:5,background:i/65<.18+scrubbing*.7?'#c5b7ff':'#3d3b43'}}/>;})}</div>
        <div style={{position:'absolute',left:48,right:48,top:400,height:7,borderRadius:8,background:'#39383d'}}><div style={{width:`${18+scrubbing*70}%`,height:7,borderRadius:8,background:'#fff'}}/><div style={{position:'absolute',left:`${18+scrubbing*70}%`,top:-6,width:19,height:19,borderRadius:20,background:'#fff',transform:'translateX(-50%)'}}/></div>
        <div style={{position:'absolute',left:48,right:48,top:427,display:'flex',justifyContent:'space-between',fontSize:21,color:'#8b8992',fontVariantNumeric:'tabular-nums'}}><span>0:{Math.floor(12+scrubbing*35).toString().padStart(2,'0')}</span><span>−0:{Math.floor(48-scrubbing*35).toString().padStart(2,'0')}</span></div>
        <div style={{position:'absolute',left:0,right:0,bottom:45,display:'flex',justifyContent:'center',alignItems:'center',gap:66}}><Icon name="prev" size={42}/><Icon name={t<2.36?'play':'pause'} size={54}/><Icon name="next" size={42}/></div>
      </div>

      <div style={{position:'absolute',inset:0,opacity:on(t,3.36,4.58),display:'flex',alignItems:'center',padding:'0 38px',gap:30}}><Icon name="speaker" size={45}/><div style={{position:'relative',height:10,background:'#39383d',borderRadius:10,flex:1}}><div style={{position:'absolute',width:`${volume*100}%`,height:10,borderRadius:10,background:'#fff'}}/><div style={{position:'absolute',left:`${volume*100}%`,top:-9,width:28,height:28,borderRadius:30,background:'#fff',transform:'translateX(-50%)',boxShadow:'0 0 0 8px #ffffff08'}}/></div></div>
      <div style={{position:'absolute',inset:0,opacity:on(t,4.5,5.3),background:toggleSpring>.65?purple:'transparent'}}><div style={{position:'absolute',width:122,height:122,left:19+toggleSpring*138,top:18,borderRadius:80,background:'white',boxShadow:'0 4px 12px #0003',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{opacity:toggle}}><Icon name="check" size={44} color={purple}/></div></div></div>
      <div style={{position:'absolute',inset:0,padding:10,opacity:on(t,5.25,6.12),display:'flex',alignItems:'center'}}><div style={{position:'absolute',left:10+tabSpring*273,width:274,height:114,background:purple,borderRadius:65,boxShadow:'0 4px 8px #5b42f329',transform:`scale(${tabStretch},${1/tabStretch})`}}/>{['Draft','Preview','Ready'].map((s,i)=><div key={s} style={{position:'relative',flex:1,textAlign:'center',fontSize:31,fontWeight:510,color:Math.abs(tab-i)<.45?'white':'#8b8b85'}}>{s}</div>)}</div>

      <div style={{position:'absolute',inset:0,opacity:on(t,6.04,7.4),color:ink}}>
        <div style={{position:'absolute',top:45,left:44,right:44,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:24,color:'#77786f'}}>Composition</span><span style={{fontSize:18,padding:'9px 16px',borderRadius:30,background:'#efedff',color:purple,fontWeight:650}}>BRAND KIT APPLIED</span></div>
        <div style={{position:'absolute',left:44,top:102,fontSize:106,fontWeight:600,letterSpacing:-7,fontVariantNumeric:'tabular-nums'}}>{Math.round(graph*100)}<span style={{fontSize:58,letterSpacing:-3}}>%</span></div>
        <div style={{position:'absolute',left:49,top:236,fontSize:25,color:'#8a8a83'}}>Your story, coming together.</div>
        <svg viewBox="0 0 840 650" width="840" height="650" style={{position:'absolute'}}><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stopColor={purple} stopOpacity=".15"/><stop offset="1" stopColor={purple} stopOpacity="0"/></linearGradient><clipPath id="plot"><rect x="0" y="0" width={graph*840} height="650"/></clipPath></defs><g stroke="#eeeEE9" strokeWidth="1">{[350,420,490,560].map(y=><path key={y} d={`M44 ${y}H795`}/>)}</g><g clipPath="url(#plot)" transform="translate(0 95)"><path d={curve+' L817,475 L44,475Z'} fill="url(#area)"/><path d={curve} stroke={purple} strokeWidth="5" fill="none" strokeLinejoin="round"/></g></svg>
        <div style={{position:'absolute',left:46,right:46,bottom:37,display:'flex',justifyContent:'space-between',fontSize:20,color:'#95958c'}}><span>IDEA</span><span>IN MOTION</span><span style={{color:purple}}>READY ↗</span></div>
      </div>
      <div style={{position:'absolute',inset:0,color:'white',display:'flex',alignItems:'center',justifyContent:'center',gap:23,fontSize:34,fontWeight:500,letterSpacing:-.7,opacity:on(t,7.34,8.16)}}><div style={{display:'flex',alignItems:'center',justifyContent:'center',width:43,height:43,borderRadius:30,background:purple}}><Icon name="check" size={30}/></div>Every frame, on brand.</div>
      </div>
    </div>
    <div style={{position:'absolute',top:1515,left:90,right:90,fontSize:26,color:'#92928a',letterSpacing:2,display:'flex',justifyContent:'space-between',opacity:(1-final)*.8}}><span>ONE OBJECT. IN CONTINUOUS MOTION.</span><span>↗</span></div>
    <div style={{opacity:(1-p(t,7.6,7.94))*p(t,0,.2)}}><Cursor x={pointerX} y={pointerY} scale={clickScale}/></div>
    {clicks.map(c=>{const q=clamp((t-c)/.32);return t>=c&&q<1?<div key={c} style={{position:'absolute',left:pointerX-34,top:pointerY-34,width:68,height:68,border:`2px solid ${light>.5?purple:'#aaa'}`,borderRadius:'50%',transform:`scale(${.3+q*1.5})`,opacity:(1-q)*.4}}/>:null;})}

    <AbsoluteFill style={{background:purple,clipPath:`circle(${final*150}% at 50% 53.65%)`}}>
      <div style={{position:'absolute',top:700,left:80,right:80,textAlign:'center',color:'white',opacity:finalType,transform:`translateY(${(1-finalType)*50}px)`}}><div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:18,fontSize:67,fontWeight:650,letterSpacing:-4,marginBottom:70}}><div style={{width:50,height:50,borderRadius:'45% 55% 40% 60%',background:'#ffab82',transform:'rotate(-20deg)'}}/>Flux</div><div style={{fontSize:120,fontWeight:610,lineHeight:1.1,letterSpacing:-8}}>{texts.cta.split('\n').map((line,lineIndex)=><div key={line} style={{overflow:'hidden',padding:'18px 0',margin:'-12px 0'}}>{Array.from(line).map((ch,i)=>{const k=step(t,8.39+lineIndex*.11+i*.022,'letters');return <span key={i} style={{display:'inline-block',whiteSpace:'pre',transformOrigin:'50% 90%',transform:`translateY(${(1-k)*145}px) rotate(${(1-k)*5}deg) scale(${1+(1-k)*.14},${1-(1-k)*.18})`,opacity:clamp(k*2)}}>{ch}</span>;})}</div>)}</div><div style={{fontSize:30,marginTop:57,color:'#d8d2ff',letterSpacing:-.5}}>Made to move.</div></div>
    </AbsoluteFill>
    {[[.55,'click'],[1.33,'pop'],[1.8,'whoosh'],[2.36,'click'],[3.28,'whoosh'],[4.6,'whoosh'],[4.88,'click'],[5.3,'pop'],[5.74,'click'],[5.96,'click'],[6.0,'whoosh'],[7.23,'whoosh'],[7.5,'pop'],[8.18,'whoosh']] .map(([sec,name],i)=><Sequence key={i} from={Math.round(Number(sec)*FPS)} durationInFrames={name==='click'?5:name==='pop'?10:20}><Audio src={staticFile(name+'.wav')} volume={name==='click'?.8:.62}/></Sequence>)}
  </AbsoluteFill>;
};
const Root=()=> <Composition id="FlowStudy" component={FlowStudy} width={1080} height={1920} durationInFrames={600} fps={FPS}/>;
registerRoot(Root);
