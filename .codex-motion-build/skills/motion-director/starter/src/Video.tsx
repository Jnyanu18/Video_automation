import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Easing, Freeze, Img, OffthreadVideo, Sequence, cancelRender, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import type {Project, Scene} from './schema';

export type VideoProps={project:Project};
const clamp={extrapolateLeft:'clamp' as const,extrapolateRight:'clamp' as const};
const ease=Easing.bezier(.16,1,.3,1);
const progress=(frame:number,start:number,duration:number)=>interpolate(frame,[start,start+Math.max(1,duration)],[0,1],{...clamp,easing:ease});
export const assetUrl=(src:string)=>src.startsWith('https://')?src:staticFile(src);
const asset=(p:Project,id?:string)=>p.assets.find(a=>a.id===id);

// The browser must finish loading a provided brand font before capturing a frame.
const FontGate:React.FC<{project:Project}>=({project})=>{
  const a=asset(project,project.brand.fontAssetId);
  const [handle]=useState(()=>a?delayRender('Loading brand font'):null);
  useEffect(()=>{
    if(!a||handle===null)return;
    let disposed=false,finished=false;
    const face=new FontFace(project.brand.fontFamily,`url("${assetUrl(a.src)}")`);
    face.load().then(loaded=>{if(!disposed){(document.fonts as FontFaceSet & {add:(f:FontFace)=>void}).add(loaded);continueRender(handle);finished=true;}}).catch(cancelRender);
    return()=>{disposed=true;if(!finished)continueRender(handle);};
  },[a,handle,project.brand.fontFamily]);
  return null;
};

const Brand:React.FC<{p:Project;small?:boolean}>=({p,small})=>{
  const logo=asset(p,p.brand.logoAssetId);
  return <div style={{display:'flex',alignItems:'center',gap:14,fontWeight:750,fontSize:small?26:54,letterSpacing:'-.045em'}}>
    {logo?<Img src={assetUrl(logo.src)} style={{width:small?32:68,height:small?32:68,objectFit:'contain'}}/>:
      <div style={{width:small?24:52,height:small?24:52,borderRadius:'30% 55% 35% 55%',background:`linear-gradient(130deg,${p.brand.primary},${p.brand.secondary})`,transform:'rotate(-18deg)'}}/>}
    {p.brand.name}
  </div>;
};

const Heading:React.FC<{s:Scene;p:Project;f:number;large?:boolean}>=({s,p,f,large})=>{
  const enter=progress(f,0,s.entryFrames);
  const portrait=p.canvas.height>p.canvas.width;
  return <div style={{position:'relative',zIndex:2,opacity:enter,transform:`translateY(${(1-enter)*35}px)`,maxWidth:'100%'}}>
    <div style={{fontSize:large?(portrait?105:116):(portrait?65:64),fontWeight:800,lineHeight:1.02,letterSpacing:'-.055em',textWrap:'balance',overflowWrap:'anywhere'}}>{s.headline}</div>
    {s.subheadline&&<div style={{fontSize:portrait?30:27,lineHeight:1.4,color:p.brand.muted,marginTop:24,maxWidth:portrait?'100%':1000}}>{s.subheadline}</div>}
  </div>;
};

const TypeScene:React.FC<{s:Extract<Scene,{kind:'type'}>;p:Project;f:number}>=({s,p,f})=>{
  const local=f;
  const words=s.headline.split(/\s+/);
  const portrait=p.canvas.height>p.canvas.width;
  const size=Math.min(portrait?116:154,(p.canvas.width-(portrait?190:250))/Math.max(...words.map(w=>w.length))/.64);
  return <AbsoluteFill style={{justifyContent:'center',padding:portrait?'0 95px':'0 125px'}}>
    <div style={{fontSize:size,fontWeight:850,lineHeight:1.02,letterSpacing:s.treatment==='tracking'?`${interpolate(progress(local,0,s.entryFrames),[0,1],[.15,-.05])}em`:'-.055em',display:'flex',gap:'0 .22em',flexWrap:'wrap',maxWidth:1500}}>
      {words.map((w,i)=>{
        const t=progress(local,s.treatment==='stagger'?i*3:0,s.entryFrames);
        const highlight=s.emphasis&&w.toLowerCase().includes(s.emphasis.toLowerCase());
        return <span key={i} style={{overflow:'hidden',display:'inline-block',paddingBottom:12}}><span style={{display:'inline-block',color:highlight?p.brand.primary:undefined,transform:`translateY(${(1-t)*110}%)`,opacity:t,filter:`blur(${(1-t)*8}px)`}}>{w}</span></span>;
      })}
    </div>
    {s.subheadline&&<div style={{marginTop:35,fontSize:30,color:p.brand.muted,opacity:progress(local,s.entryFrames,14)}}>{s.subheadline}</div>}
    <div style={{height:7,width:interpolate(progress(local,12,s.entryFrames),[0,1],[0,180]),background:p.brand.primary,marginTop:50}}/>
  </AbsoluteFill>;
};

const UIScene:React.FC<{s:Extract<Scene,{kind:'ui'}>;p:Project;f:number}>=({s,p,f})=>{
  const portrait=p.canvas.height>p.canvas.width;
  const local=f;
  const t=progress(local,0,s.entryFrames);
  const panel=progress(local,Math.round(p.canvas.fps*.42),Math.round(p.canvas.fps*.45));
  const labelProgress=progress(local,Math.round(p.canvas.fps*.8),Math.round(p.canvas.fps*.6));
  const w=interpolate(panel,[0,1],[240,portrait?850:880]);
  const h=interpolate(panel,[0,1],[84,portrait?650:430]);
  const control=progress(local,Math.round(p.canvas.fps*.2),Math.round(p.canvas.fps*.55));
  return <AbsoluteFill style={{padding:portrait?'170px 95px':'125px 120px'}}>
    <Heading s={s} p={p} f={f}/>
    <div style={{position:'absolute',left:'50%',top:portrait?'57%':'62%',width:w,height:h,background:p.brand.surface,border:`1px solid ${p.brand.muted}33`,borderRadius:interpolate(panel,[0,1],[50,p.brand.radius]),boxShadow:'0 28px 90px #00000020',transform:`translate(-50%,-50%) scale(${.9+t*.1})`,overflow:'hidden'}}>
      {panel<.1?<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:27,fontWeight:700,color:p.brand.foreground}}>{s.label}</div>:
      <div style={{padding:portrait?50:42,opacity:panel}}>
        <div style={{display:'flex',gap:7,marginBottom:30}}>{[p.brand.primary,p.brand.secondary,p.brand.muted].map(c=><div key={c} style={{width:10,height:10,borderRadius:10,background:c}}/>)}</div>
        <div style={{fontSize:23,color:p.brand.muted,marginBottom:16}}>{s.label}</div>
        {s.template==='player'?<>
          <div style={{display:'flex',gap:24,alignItems:'center',marginBottom:30}}><div style={{width:85,height:85,borderRadius:20,background:`linear-gradient(130deg,${p.brand.primary},${p.brand.secondary})`}}/><div style={{fontSize:35,fontWeight:750}}>{s.value}</div></div>
          <div style={{height:7,borderRadius:8,background:`${p.brand.muted}33`}}><div style={{height:'100%',width:`${15+control*70}%`,borderRadius:8,background:p.brand.primary}}/></div>
          <div style={{textAlign:'center',fontSize:32,marginTop:25}}>‹　Ⅱ　›</div>
        </>:<>
          <div style={{padding:22,border:`2px solid ${p.brand.primary}66`,borderRadius:12,fontSize:30,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.value.slice(0,Math.ceil(labelProgress*s.value.length))}<span style={{color:p.brand.primary}}>│</span></div>
          <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:22}}>{s.steps.map((step,i)=>{
            const show=progress(local,p.canvas.fps*(.8+i*.23),12);
            return <div key={i} style={{display:'flex',gap:12,alignItems:'center',fontSize:22,opacity:show,transform:`translateY(${(1-show)*12}px)`}}><span style={{color:p.brand.primary}}>✓</span>{step}</div>;
          })}</div>
          {s.template==='approval'&&<div style={{marginTop:24,borderRadius:30,background:p.brand.primary,padding:'14px 24px',display:'inline-block',fontSize:23,color:contrast(p.brand.primary)}}>{control>.9?'Approved ✓':'Review project'}</div>}
        </>}
      </div>}
    </div>
    <div style={{position:'absolute',left:`${interpolate(control,[0,1],[73,65])}%`,top:portrait?'76%':'78%',transform:`scale(${1-Math.sin(control*Math.PI)*.15})`,opacity:t,fontSize:42,color:p.brand.foreground,textShadow:`1px 1px 0 ${p.brand.background}`}}>↖</div>
  </AbsoluteFill>;
};

const MetricScene:React.FC<{s:Extract<Scene,{kind:'metric'}>;p:Project;f:number}>=({s,p,f})=>{
  const portrait=p.canvas.height>p.canvas.width;
  const local=f;
  const t=progress(local,12,p.canvas.fps*1.35);
  const number=(s.value*t).toLocaleString('en-US',{minimumFractionDigits:s.decimals,maximumFractionDigits:s.decimals});
  const points=Array.from({length:40},(_,i)=>`${i*1000/39},${220-i*4.2-16*Math.sin(i*.7)}`).join(' ');
  return <AbsoluteFill style={{padding:portrait?'170px 95px':'125px 120px'}}>
    <Heading s={s} p={p} f={f}/>
    <div style={{position:'absolute',top:portrait?'42%':'37%',left:portrait?95:120,right:portrait?95:120}}>
      <div style={{fontSize:portrait?138:170,fontWeight:800,letterSpacing:'-.07em',color:p.brand.primary,fontVariantNumeric:'tabular-nums',lineHeight:1.1,overflowWrap:'anywhere'}}>{s.prefix}{number}{s.suffix}</div>
      <div style={{fontSize:27,color:p.brand.muted,marginTop:12}}>{s.label}</div>
      <svg viewBox="0 0 1000 260" style={{width:'100%',height:portrait?350:240,marginTop:45}} preserveAspectRatio="none"><defs><linearGradient id={`chart-${s.id}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={p.brand.primary} stopOpacity=".22"/><stop offset="1" stopColor={p.brand.primary} stopOpacity="0"/></linearGradient><clipPath id={`clip-${s.id}`}><rect width={t*1000} height="260"/></clipPath></defs>
      <g clipPath={`url(#clip-${s.id})`}><polygon points={`0,260 ${points} 1000,260`} fill={`url(#chart-${s.id})`}/><polyline points={points} fill="none" stroke={p.brand.primary} strokeWidth="5" strokeLinejoin="round"/></g></svg>
    </div>
  </AbsoluteFill>;
};

const GalleryScene:React.FC<{s:Extract<Scene,{kind:'gallery'}>;p:Project;f:number}>=({s,p,f})=>{
  const portrait=p.canvas.height>p.canvas.width;
  const local=f;
  const square=p.canvas.width===p.canvas.height;
  const cols=portrait||square?2:Math.min(s.cards.length,3);
  const rows=Math.ceil(s.cards.length/cols);
  const cardHeight=Math.min(portrait?280:(s.cards.length>3?210:390),(p.canvas.height-(portrait?470:350))/rows-22);
  return <AbsoluteFill style={{padding:portrait?'170px 95px':'125px 120px'}}>
    <Heading s={s} p={p} f={f}/>
    <div style={{marginTop:55,display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:22,flex:1,minHeight:0,alignContent:'center'}}>
      {s.cards.map((c,i)=>{
        const t=spring({fps:p.canvas.fps,frame:local-i*Math.round(p.canvas.fps*.055),config:{damping:19,stiffness:130,mass:.7}});
        const a=asset(p,c.assetId);
        return <div key={i} style={{position:'relative',height:cardHeight,background:p.brand.surface,borderRadius:p.brand.radius,overflow:'hidden',transform:`perspective(1400px) translateY(${(1-t)*90}px) rotateY(${(1-t)*14}deg)`,opacity:Math.max(0,Math.min(1,t)),border:`1px solid ${p.brand.muted}33`}}>
          {a?.kind==='image'?<Img src={assetUrl(a.src)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:
           a?.kind==='video'?<OffthreadVideo src={assetUrl(a.src)} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>:
           <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at ${25+i*13}% 28%,${p.brand.primary}55,transparent 65%),linear-gradient(${120+i*40}deg,${p.brand.surface},${p.brand.secondary}33)`}}><div style={{width:120,height:120,border:`2px solid ${p.brand.primary}`,borderRadius:i%2?'50%':'20%',position:'absolute',left:'35%',top:'22%',transform:`rotate(${i*30+local*.12}deg)`}}/></div>}
          <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'35px 25px 24px',background:'linear-gradient(transparent,#000c)',color:'#ffffff',fontSize:26,fontWeight:700}}>{c.title}</div>
        </div>;
      })}
    </div>
  </AbsoluteFill>;
};

const OrbitScene:React.FC<{s:Extract<Scene,{kind:'orbit'}>;p:Project;f:number}>=({s,p,f})=>{
  const portrait=p.canvas.height>p.canvas.width;
  const local=f;
  const t=progress(local,0,s.entryFrames);
  const rot=local/p.canvas.fps*.45;
  const particles=Array.from({length:s.particleCount},(_,i)=>{
    const y=1-2*(i+.5)/s.particleCount;const r=Math.sqrt(1-y*y);const angle=i*Math.PI*(3-Math.sqrt(5));
    const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    const xx=x*Math.cos(rot)+z*Math.sin(rot),zz=-x*Math.sin(rot)+z*Math.cos(rot);
    return {x:500+xx*340,y:500+y*340,z:zz};
  }).sort((a,b)=>a.z-b.z);
  return <AbsoluteFill style={{padding:portrait?'170px 95px':'125px 120px'}}>
    <Heading s={s} p={p} f={f}/>
    <div style={{position:'absolute',width:portrait?1000:850,height:portrait?1000:850,left:'50%',top:portrait?'61%':'66%',transform:`translate(-50%,-50%) scale(${.7+t*.3})`,opacity:t}}>
      <svg viewBox="0 0 1000 1000" width="100%" height="100%"><ellipse cx="500" cy="500" rx="430" ry="120" fill="none" stroke={p.brand.secondary} strokeOpacity=".25" transform="rotate(-25 500 500)"/>
      {particles.map((q,i)=><circle key={i} cx={q.x} cy={q.y} r={2+(q.z+1)*2.2} fill={i%4===0?p.brand.secondary:p.brand.primary} opacity={.15+(q.z+1)*.4}/>)}</svg>
    </div>
  </AbsoluteFill>;
};

const IllustrationScene:React.FC<{s:Extract<Scene,{kind:'illustration'}>;p:Project;f:number}>=({s,p,f})=>{
  const local=f;
  const draw=progress(local,10,p.canvas.fps*1.4);
  const portrait=p.canvas.height>p.canvas.width;
  return <AbsoluteFill style={{padding:portrait?'170px 95px':'125px 120px'}}>
    <Heading s={s} p={p} f={f}/>
    <svg viewBox="0 0 1000 650" style={{position:'absolute',width:portrait?'90%':'64%',height:'65%',left:'50%',top:portrait?'58%':'64%',transform:'translate(-50%,-50%)'}}>
      {s.diagram==='growth'?<>
        <path d="M170 525 Q500 490 830 525" fill="none" stroke={p.brand.muted} strokeWidth="4"/>
        <path d="M500 520 Q470 370 530 210" pathLength="1" fill="none" stroke={p.brand.primary} strokeWidth="13" strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1-draw}/>
        {[[500,400,-1],[512,300,1],[523,225,-1]].map(([x,y,side],i)=><path key={i} d={`M${x} ${y} Q${x+side*170} ${y-150} ${x+side*150} ${y-25} Q${x+side*70} ${y+25} ${x} ${y}`} fill={`${p.brand.primary}22`} stroke={p.brand.primary} strokeWidth="4" opacity={progress(local,20+i*15,20)}/>)}
        <circle cx="760" cy="150" r="55" fill={`${p.brand.secondary}33`} stroke={p.brand.secondary} strokeWidth="4" opacity={draw}/>
      </>:<>
        <path d="M210 300 H790" pathLength="1" fill="none" stroke={p.brand.primary} strokeWidth="7" strokeDasharray="1" strokeDashoffset={1-draw}/>
        {['Brief','Build','Review'].map((label,i)=><g key={label} opacity={progress(local,i*20,18)}><rect x={95+i*300} y="210" width="210" height="180" rx="28" fill={p.brand.surface} stroke={p.brand.primary} strokeWidth="4"/><text x={200+i*300} y="310" textAnchor="middle" fill={p.brand.foreground} fontSize="32" fontFamily={p.brand.fontFamily}>{label}</text></g>)}
      </>}
    </svg>
  </AbsoluteFill>;
};

function contrast(hex:string){const rgb=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.38?'#10121a':'#ffffff';}

const CTAScene:React.FC<{s:Extract<Scene,{kind:'cta'}>;p:Project;f:number}>=({s,p,f})=>{
  const local=f;
  const enter=progress(local,0,s.entryFrames);
  return <AbsoluteFill style={{alignItems:'center',justifyContent:'center',padding:p.canvas.height>p.canvas.width?95:120,textAlign:'center'}}>
    <div style={{position:'absolute',width:850,height:500,background:`radial-gradient(ellipse,${p.brand.primary}20,transparent 68%)`,filter:'blur(35px)',top:'30%'}}/>
    <div style={{transform:`translateY(${(1-enter)*35}px)`,opacity:enter,display:'flex',flexDirection:'column',alignItems:'center',gap:50,position:'relative',width:'100%'}}>
      <Brand p={p}/><Heading s={s} p={p} f={f} large/>
      <div style={{background:p.brand.primary,color:contrast(p.brand.primary),padding:'22px 36px',fontSize:29,fontWeight:700,borderRadius:100,opacity:progress(local,s.entryFrames,16)}}>{s.buttonLabel}　↗</div>
      <div style={{fontSize:25,color:p.brand.muted}}>{s.website}</div>
    </div>
  </AbsoluteFill>;
};

const SceneContent:React.FC<{s:Scene;p:Project}>=({s,p})=>{
  const f=useCurrentFrame();
  const portrait=p.canvas.height>p.canvas.width;
  // Separate landscape, portrait and square coordinate systems, scaled once.
  const square=p.canvas.width===p.canvas.height;
  const designWidth=square?1440:(portrait?1080:1920),designHeight=square?1440:(portrait?1920:1080);
  const scale=Math.min(p.canvas.width/designWidth,p.canvas.height/designHeight);
  const designProject={...p,canvas:{...p.canvas,width:designWidth,height:designHeight}};
  const props={p:designProject,f};
  return <AbsoluteFill style={{background:s.background??p.brand.background,color:p.brand.foreground,fontFamily:`"${p.brand.fontFamily}", Arial, sans-serif`,overflow:'hidden'}}>
    <div style={{position:'absolute',width:designWidth,height:designHeight,left:'50%',top:'50%',transform:`translate(-50%,-50%) scale(${scale})`,overflow:'hidden'}}>
      <div style={{position:'absolute',top:portrait?70:54,left:portrait?95:120,right:portrait?95:120,display:'flex',justifyContent:'space-between',alignItems:'center',opacity:.7,zIndex:3}}><Brand p={p} small/><div style={{fontSize:17,letterSpacing:3}}>{String(p.scenes.findIndex(x=>x.id===s.id)+1).padStart(2,'0')} / {String(p.scenes.length).padStart(2,'0')}</div></div>
      {s.kind==='type'?<TypeScene {...props} s={s}/>:s.kind==='ui'?<UIScene {...props} s={s}/>:s.kind==='metric'?<MetricScene {...props} s={s}/>:s.kind==='gallery'?<GalleryScene {...props} s={s}/>:s.kind==='orbit'?<OrbitScene {...props} s={s}/>:s.kind==='illustration'?<IllustrationScene {...props} s={s}/>:<CTAScene {...props} s={s}/>}
    </div>
  </AbsoluteFill>;
};

const Incoming:React.FC<{s:Scene;p:Project;previous?:Scene}>=({s,p,previous})=>{
  const f=useCurrentFrame(),d=s.transitionIn.durationInFrames;
  const t=d?progress(f,0,Math.max(1,d-1)):1;
  const type=s.transitionIn.type;
  const clipPath=type==='wipe'?`inset(0 ${(1-t)*100}% 0 0)`:type==='iris'?`circle(${t*150}% at 50% 50%)`:undefined;
  return <AbsoluteFill>
    {previous&&f<d&&<AbsoluteFill style={{transform:type==='push'?`translateX(${-t*100}%)`:undefined}}><Freeze frame={previous.durationInFrames-1}><SceneContent s={previous} p={p}/></Freeze></AbsoluteFill>}
    <AbsoluteFill style={{clipPath,transform:type==='push'?`translateX(${(1-t)*100}%)`:undefined}}><SceneContent s={s} p={p}/></AbsoluteFill>
  </AbsoluteFill>;
};

const Sound:React.FC<{p:Project}>=({p})=>{
  const v=p.audio.voiceover;
  const vo=asset(p,v.assetId);
  return <>
    {v.status==='ready'&&vo&&<Sequence from={v.from} durationInFrames={v.durationInFrames}><Audio src={assetUrl(vo.src)} volume={1}/></Sequence>}
    {p.audio.cues.map(c=>{
      const a=asset(p,c.assetId);if(!a)return null;
      return <Sequence key={c.id} from={c.from} durationInFrames={c.durationInFrames}><Audio src={assetUrl(a.src)} volume={f=>{
        const fadeIn=c.fadeInFrames?Math.min(1,f/c.fadeInFrames):1;
        const fadeOut=c.fadeOutFrames?Math.min(1,(c.durationInFrames-1-f)/c.fadeOutFrames):1;
        const global=f+c.from;
        const duck=(c.role==='music'&&v.status==='ready'&&global>=v.from&&global<v.from+v.durationInFrames) ? .3 : 1;
        return Math.max(0,c.gain*fadeIn*fadeOut*duck);
      }}/></Sequence>;
    })}
  </>;
};

export const Video:React.FC<VideoProps>=({project:p})=><AbsoluteFill style={{background:p.brand.background}}>
  <FontGate key={`${p.brand.fontFamily}:${asset(p,p.brand.fontAssetId)?.src??''}`} project={p}/>
  {p.scenes.map((s,i)=><Sequence key={s.id} from={s.from} durationInFrames={s.durationInFrames}><Incoming s={s} previous={p.scenes[i-1]} p={p}/></Sequence>)}
  <Sound p={p}/>
</AbsoluteFill>;
