import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Audio,Composition,Img,cancelRender,continueRender,delayRender,registerRoot,staticFile,useCurrentFrame} from 'remotion';
import data from './project.json';
import {StudioSchema,validateStudio,type StudioProject} from './config';
import {camera,event,heroPose,projectCardPoint,secondaryPose,secondaryTargets,step,track,type Pose} from './motion';
import {areaPreservingScales,directionalBlurState,elevationShadows,focusLayer} from './lib/depth-motion';
import {lineEntrance,textFocus} from './lib/type-camera';
import {bezierProgress,cubicPathPoint,frameTimecode,motionPresets} from './lib/motion-policy';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=(f:number,start:number,duration=22)=>bezierProgress((f-start)/duration,motionPresets.easing.snap);
const lerp=(a:number,b:number,q:number)=>a+(b-a)*q;
function matrixString(m:ReturnType<typeof camera>){return `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;}

function Kinetic({text,frame,start,y,size,color,mode='letters',outline=false}:{text:string;frame:number;start:number;y:number;size:number;color:string;mode?:'letters'|'line'|'sweep';outline?:boolean}){
 const line=lineEntrance(frame,60,0,{startFrame:start,durationSeconds:.42});
 const common:React.CSSProperties={position:'absolute',left:66,right:66,top:y,fontFamily:'Inter',fontSize:size,fontWeight:900,lineHeight:.92,letterSpacing:'-.07em',whiteSpace:'nowrap',textAlign:'center',color:outline?'transparent':color,WebkitTextStroke:outline?`1.2px ${color}55`:undefined};
 if(mode==='line')return <div data-text={text} style={{...common,visibility:line.visibility,transform:`translateY(${line.translateY}px)`}}>{text}</div>;
 return <div data-text={text} style={common}>{Array.from(text).map((c,i)=>{
  const at=start+i*.95,s=step(frame,at,'letters'),velocity=step(frame+1,at,'letters')-step(frame-1,at,'letters'),strain=areaPreservingScales(velocity*1.5,.18);
  const x=mode==='sweep'?(1-s)*180:0,y=(1-s)*(mode==='sweep'?15:95);
  return <span key={i} style={{display:'inline-block',whiteSpace:'pre',opacity:clamp((frame-at)/6),transformOrigin:'50% 80%',transform:`translate(${x}px,${y}px) rotate(${(1-s)*(i%2?6:-6)}deg) scale(${strain.scaleX},${strain.scaleY})`}}>{c}</span>;
 })}</div>;
}
function Micro({children,y,color,frame,start=0,size=24}:{children:React.ReactNode;y:number;color:string;frame:number;start?:number;size?:number}){
 const q=ease(frame,start,24);return <div style={{position:'absolute',top:y,left:70,right:70,fontFamily:'FrameMono',fontSize:size,letterSpacing:2.5,textAlign:'center',color,opacity:q,transform:`translateY(${(1-q)*10}px)`}}>{children}</div>;
}
function Viewfinder({size=100,color,width=3}:{size?:number;color:string;width?:number}){return <svg width={size} height={size} viewBox="0 0 100 100"><path d="M30 10H10V30M70 10H90V30M10 70V90H30M90 70V90H70" fill="none" stroke={color} strokeWidth={width}/><circle cx="50" cy="50" r="7" fill="none" stroke={color} strokeWidth={width}/></svg>;}

function CardFace({p,src,label,back=false,hero=false,f}:{p:StudioProject;src:string;label:string;back?:boolean;hero?:boolean;f:number}){
 const c=p.palette,identity=event(p,'identity-impact'),vanish=hero?1-ease(f,identity+4,38):1,icon=hero?ease(f,identity+26,22):0;
 return <div style={{position:'absolute',inset:0,backfaceVisibility:'hidden',transform:back?'rotateY(180deg) translateZ(.6px)':'translateZ(.6px)',borderRadius:'inherit',overflow:'hidden',background:hero&&f>identity+3?c.orange:c.white}}>
   <Img src={staticFile(src)} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:back?'50% 50%':'50% 43%',opacity:vanish}}/>
   <div style={{position:'absolute',left:18,right:18,bottom:18,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:c.white,color:c.black,fontFamily:'FrameMono',fontSize:16,letterSpacing:1,opacity:vanish}}><span>{label}</span><span>↗</span></div>
   {hero&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',opacity:icon}}><Viewfinder size={76} color={c.white} width={4}/></div>}
 </div>;
}
function PhotoCard({pose,p,f,hero=false,asset='portrait',opacity=1,blur=0,ghost=false}:{pose:Pose;p:StudioProject;f:number;hero?:boolean;asset?:keyof StudioProject['assets'];opacity?:number;blur?:number;ghost?:boolean}){
 const strain=hero?areaPreservingScales(.025*Math.sin((f-event(p,'cards-settle'))*.5)*Math.exp(-Math.max(0,f-event(p,'cards-settle'))/8)*(f>=event(p,'cards-settle')?1:0),.07):{scaleX:1,scaleY:1};
 const shadows=elevationShadows(Math.max(0,pose.z));
 const shadow=shadows.map(s=>`${s.x}px ${s.y}px ${s.blur}px rgba(0,0,0,${s.alpha})`).join(',');
 return <div data-photo={hero?'persistent-hero':asset} style={{position:'absolute',left:pose.x-pose.w/2,top:pose.y-pose.h/2,width:pose.w,height:pose.h,borderRadius:pose.radius,transformStyle:'preserve-3d',transform:`translateZ(${pose.z}px) rotateZ(${pose.rz}deg) rotateY(${pose.ry}deg) rotateX(${pose.rx}deg) scale(${strain.scaleX},${strain.scaleY})`,opacity,boxShadow:ghost?'none':shadow}}>
   <div style={{position:'absolute',inset:0,transformStyle:'preserve-3d',borderRadius:'inherit',filter:blur>0?`blur(${blur}px)`:undefined}}>
     <CardFace p={p} src={p.assets[asset]} label={asset==='portrait'?p.copy.portraitLabel:asset==='product'?p.copy.productLabel:p.copy.creativeLabel} hero={hero} f={f}/>
     {hero&&<CardFace p={p} src={p.assets.product} label={p.copy.productLabel} back hero f={f}/>}
   </div>
 </div>;
}
function Headlines({f,p,index}:{f:number;p:StudioProject;index:number}){
 const c=p.palette,s=p.scenes[index],t=f-s.from,color=index===1||index===2||index===4?c.white:c.black;
 if(index===0)return <><Kinetic text={s.headline[0]} frame={t} start={0} y={235} size={214} color={c.black}/><Kinetic text={s.headline[1]} frame={t} start={6} y={430} size={222} color={c.orange}/><Micro y={675} frame={t} start={25} color={c.black} size={22}>{p.category}</Micro></>;
 if(index===1)return <><Kinetic text={s.headline[0]} frame={t} start={3} y={255} size={133} color={color} mode="line"/><Kinetic text={s.headline[1]} frame={t} start={6} y={406} size={84} color={color} mode="line"/><Micro y={533} frame={t} start={18} color={c.orange} size={24}>{p.copy.portfolioNote}</Micro></>;
 if(index===2)return <><Kinetic text={s.headline[0]} frame={t} start={0} y={240} size={200} color={color} mode="sweep"/><Kinetic text={s.headline[1]} frame={t} start={4} y={420} size={189} color={color} mode="sweep"/><Micro y={646} frame={t} start={20} color={c.white}>{p.copy.selection}</Micro></>;
 if(index===3)return <><Kinetic text={s.headline[0]} frame={t} start={4} y={280} size={112} color={c.black} mode="line"/><Kinetic text={s.headline[1]} frame={t} start={8} y={422} size={200} color={c.orange}/></>;
 if(index===4)return <>{s.headline.map((text,i)=>{
  const times=[s.from,s.from+45,s.from+90],up=i===0?1:ease(f,times[i],14),down=i===2?0:ease(f,times[i+1],14),focus=textFocus(clamp(up-down));
  const enter=lineEntrance(t,60,i,{startFrame:0,durationSeconds:.28});
  return <div key={text} data-text={text} style={{position:'absolute',left:55,right:55,top:235+i*139,fontFamily:'Inter',fontSize:i===2?119:141,fontWeight:900,letterSpacing:'-.068em',lineHeight:1,color:i===2?c.orange:c.white,textAlign:'center',filter:`blur(${focus.blurPx}px)`,opacity:focus.opacity,visibility:enter.visibility,transform:`translateY(${enter.translateY}px)`}}>{text}</div>;
 })}</>;
 return <><Kinetic text={p.brand} frame={t+12} start={0} y={810} size={222} color={c.black}/><Kinetic text={p.descriptor} frame={t+12} start={7} y={1014} size={211} color={c.black}/><Micro y={1278} frame={t} start={18} color={c.black} size={22}>{p.category}</Micro><div style={{position:'absolute',top:1410,left:185,width:710,height:116,display:'flex',alignItems:'center',justifyContent:'center',gap:28,background:c.orange,color:c.white,borderRadius:3,fontFamily:'Inter',fontSize:34,fontWeight:700,letterSpacing:1.5,opacity:ease(t,18,24),transform:`scale(${.96+.04*step(t,18)})`}}>{p.cta}<span style={{fontSize:45}}>↗</span></div><Micro y={1610} frame={t} start={28} color={c.black} size={23}>{p.copy.endline}</Micro></>;
}

export const StudioFilm:React.FC<StudioProject>=(p)=>{
 const f=useCurrentFrame(),c=p.palette,[gate]=useState(()=>delayRender('Load studio fonts'));
 useEffect(()=>{let disposed=false;Promise.all([new FontFace('Inter',`url(${staticFile('Inter.ttf')})`,{weight:'100 900'}).load(),new FontFace('FrameMono',`url(${staticFile('Mono.ttf')})`).load()]).then(fonts=>{for(const ff of fonts)document.fonts.add(ff);return document.fonts.ready;}).then(()=>{if(!disposed)continueRender(gate);}).catch(cancelRender);return()=>{disposed=true;};},[gate]);
 let index=p.scenes.findIndex(s=>f>=s.from&&f<s.from+s.durationInFrames);if(index<0)index=5;
 const background=[c.white,c.black,c.blue,c.white,c.black,c.white][index],light=index===1||index===2||index===4;
 const hero=heroPose(f,p),m=camera(f,p),previous=heroPose(f-1,p),oldCamera=camera(f-1,p);
 const now=projectCardPoint(hero,{x:0,y:0},p,m),old=projectCardPoint(previous,{x:0,y:0},p,oldCamera);
 const select=event(p,'select-contact'),flip=event(p,'card-flip'),identity=event(p,'identity-impact');
 const launch=[5,event(p,'depth-burst'),select-20,flip,p.scenes[4].from,identity-8].filter(v=>v<=f).at(-1)??0;
 const trail=directionalBlurState({x:(now.x-old.x)*60,y:(now.y-old.y)*60},f-launch,60);
 const target=projectCardPoint(hero,{x:hero.w*.32,y:hero.h*.31,z:1},p,m);
 const cursorStart={x:1050,y:1740},u=ease(f,select-43,43),cursor=cubicPathPoint(u,cursorStart,{x:900,y:1400},{x:target.x+220,y:target.y+60},target);
 const cursorAlpha=clamp((f-select+44)/10)*(1-ease(f,select+29,16)),press=1-.13*Math.exp(-Math.max(0,f-select)/7)*(f>=select?1:0);
 const flash=[select,flip].reduce((a,v)=>a+(f>=v&&f<v+4?.42*(1-(f-v)/4):0),0);
 return <AbsoluteFill style={{background,fontFamily:'Inter',overflow:'hidden'}}>
   <svg width="1080" height="1920" style={{position:'absolute',inset:0,opacity:.12}}>{Array.from({length:15},(_,i)=><path key={i} d={`M${i*90} 175V1720`} stroke={light?c.white:c.black} strokeWidth="1"/>)}{[740,1160,1580].map(y=><path key={y} d={`M30 ${y}H1050`} stroke={light?c.white:c.black} strokeWidth="1"/>)}</svg>
   {trail.radiusPx>1&&[2,1].map(i=>{const sample=f-i;return <div key={'trail'+i} style={{position:'absolute',inset:0,transformOrigin:'0 0',transform:matrixString(camera(sample,p))}}><div style={{position:'absolute',inset:0,perspective:p.camera.perspective,perspectiveOrigin:`${p.camera.origin.x}px ${p.camera.origin.y}px`,transformStyle:'preserve-3d'}}><PhotoCard pose={heroPose(sample,p)} p={p} f={sample} hero ghost opacity={.05*(trail.radiusPx/15)}/></div></div>;})}
   <div style={{position:'absolute',inset:0,transformOrigin:'0 0',transform:matrixString(m)}}>
     <div style={{position:'absolute',inset:0,perspective:p.camera.perspective,perspectiveOrigin:`${p.camera.origin.x}px ${p.camera.origin.y}px`,transformStyle:'preserve-3d'}}>
       {secondaryTargets.map((t,i)=>{
        const birth=event(p,'depth-burst')+6+i*2,alpha=ease(f,birth,16)*(1-ease(f,identity,32)),weight=1-ease(f,select-22,24)+ease(f,p.scenes[4].from-16,30),focus=focusLayer(clamp(weight));
        return <PhotoCard key={i} pose={secondaryPose(f,i,p)} p={p} f={f} asset={t.asset} opacity={alpha*focus.opacity} blur={focus.blurPx*.65}/>;
       })}
       <PhotoCard pose={hero} p={p} f={f} hero/>
     </div>
   </div>
   <Headlines f={f} p={p} index={index}/>
   <div style={{position:'absolute',left:64,right:64,top:78,display:'flex',alignItems:'center',justifyContent:'space-between',color:light?c.white:c.black,fontFamily:'FrameMono',fontSize:22,letterSpacing:1.5}}><span style={{fontFamily:'Inter',fontWeight:800,fontSize:27,letterSpacing:-1}}>{p.brand} / {p.descriptor}</span><span>{p.copy.header}</span></div>
   <svg width="1080" height="1920" style={{position:'absolute',inset:0,pointerEvents:'none'}}><path d="M64 176H35V205M1016 176H1045V205M35 1715V1744H64M1045 1715V1744H1016" fill="none" stroke={light?c.white:c.black} strokeWidth="1.5"/>
     {cursorAlpha>0&&<g transform={`translate(${cursor.x} ${cursor.y}) scale(${press})`} opacity={cursorAlpha}><path d="M0 0L0 42L12 31L23 54L32 50L21 27L39 27Z" fill={c.white} stroke={c.black} strokeWidth="2"/></g>}
     {f>=select&&f<select+28&&<circle cx={target.x} cy={target.y} r={9+(f-select)*2} fill="none" stroke={c.orange} strokeWidth="3" opacity={1-(f-select)/28}/>}
   </svg>
   <div style={{position:'absolute',left:64,right:64,top:1800,display:'flex',justifyContent:'space-between',fontFamily:'FrameMono',fontSize:20,color:light?c.white:c.black,letterSpacing:1}}><span>{p.scenes[index].label}</span><span>{frameTimecode(f,60)}</span></div>
   <div style={{position:'absolute',bottom:57,left:64,right:64,height:2,background:light?'#ffffff25':'#00000020'}}><div style={{height:'100%',width:`${f/899*100}%`,background:c.orange}}/></div>
   {flash>0&&<AbsoluteFill style={{background:c.white,opacity:flash,pointerEvents:'none'}}/>}
   <Img src={staticFile('grain.png')} style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.018,mixBlendMode:'soft-light',pointerEvents:'none'}}/>
   <Audio src={staticFile(p.audio)}/>
 </AbsoluteFill>;
};
const Root:React.FC=()=>{const p=validateStudio(data);return <Composition id="FramePhotoStudio" component={StudioFilm} schema={StudioSchema} defaultProps={p} width={1080} height={1920} fps={60} durationInFrames={900}/>;};
registerRoot(Root);
