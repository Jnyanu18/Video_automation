import React,{useEffect,useId,useState} from 'react';
import {AbsoluteFill,Audio,Img,cancelRender,continueRender,delayRender,staticFile,useCurrentFrame} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {FONTS,S,beginFrame,clamp,n1,p2,setStage,takeDefs} from './core';

/** What a section returns for the current time: background, foreground ink (used by the HUD), and SVG content.
 *  Optional footage layering (see footage.tsx): `back` is SVG drawn over the bg, `media` is an HTML layer (video)
 *  over that, and `el` is drawn on top. SVG ids are document-wide, so `back` may use clip()/blurF() defs too. */
export type Frame={bg:string;ink:string;el:React.ReactNode;media?:React.ReactNode;back?:React.ReactNode};
export type FontFile={family:string;file:string;weight?:string;style?:string;sample?:string};
export type Section={name:string;start:number;render:(t:number)=>Frame};
export type FilmConfig={
  width:number;height:number;fps:number;duration:number;
  sections:Section[];
  hud?:{left:string;right:string}|null;
  audio?:string;          // file in public/
  grain?:number;          // 0..0.1 soft-light opacity; requires public/grain.png
  fonts?:{display:{family:string;file:string};mono:{family:string;file:string}};
  extraFonts?:FontFile[]; // more families for withFont(); `sample` forces non-Latin glyphs (e.g. Kannada) to load
  blurMedia?:boolean;     // false: camera blur only the top SVG, footage is drawn once per frame (3x fewer video frame extractions)
  preloadWeights?:number[];
};

function hud(t:number,ink:string,sec:number,cfg:FilmConfig){
  const {W,H}=S,I=40,L=28,f=Math.floor(t*cfg.fps+1e-6),port=H>W,fs=port?20:16,m=port?84:96,yT=port?96:78,yB=H-(port?84:62);
  return <g key="hud" fontFamily={FONTS.mono} fontWeight={500} fontSize={fs} fill={ink} letterSpacing={2}>
    <g stroke={ink} strokeWidth={2.5} fill="none">{[[I,I,1,1],[W-I,I,-1,1],[I,H-I,1,-1],[W-I,H-I,-1,-1]].map(([x,y,dx,dy],i)=><polyline key={i} points={`${x+dx*L},${y} ${x},${y} ${x},${y+dy*L}`}/>)}</g>
    <text x={m} y={yT}>{cfg.hud!.left}</text>
    <text x={W-m} y={yT} textAnchor="end">{`TC 00:00:${p2(Math.floor(f/cfg.fps))}:${p2(f%cfg.fps)}`}</text>
    <text x={m} y={yB}>{`${p2(sec+1)} / ${p2(cfg.sections.length)} — ${cfg.sections[sec].name}`}</text>
    <text x={W-m} y={yB} textAnchor="end">{cfg.hud!.right}</text>
    <rect x={m} y={yB+16} width={W-2*m} height={2} opacity={.2}/>
    <rect x={m} y={yB+16} width={n1((W-2*m)*t/cfg.duration)} height={2}/>
  </g>;
}

/** part: 'all' draws everything; 'under' only bg/back/media; 'over' only the top SVG (transparent where layered). */
const Scene:React.FC<{cfg:FilmConfig;part?:'all'|'under'|'over'}>=({cfg,part='all'})=>{
  const frame=useCurrentFrame();
  setStage(cfg.width,cfg.height,cfg.fps);
  beginFrame(`c${useId().replace(/[^a-zA-Z0-9]/g,'')}_`);
  const t=clamp(frame/cfg.fps,0,cfg.duration-1e-6);
  let sec=0;for(let i=0;i<cfg.sections.length;i++)if(t>=cfg.sections[i].start)sec=i;
  const r=cfg.sections[sec].render(t),h=cfg.hud?hud(t,r.ink,sec,cfg):null;
  if(r.media===undefined&&r.back===undefined)
    return part==='under'?null:<AbsoluteFill><svg width={S.W} height={S.H} viewBox={`0 0 ${S.W} ${S.H}`} style={{display:'block'}}><rect width={S.W} height={S.H} fill={r.bg}/>{r.el}{h}<defs>{takeDefs()}</defs></svg></AbsoluteFill>;
  const abs:React.CSSProperties={display:'block',position:'absolute',left:0,top:0};
  const top=<svg width={S.W} height={S.H} viewBox={`0 0 ${S.W} ${S.H}`} style={abs}>{part!=='under'&&<>{r.el}{h}</>}<defs>{takeDefs()}</defs></svg>;
  if(part==='over')return <AbsoluteFill>{top}</AbsoluteFill>;
  return <AbsoluteFill style={{background:r.bg}}>
    {r.back!==undefined&&<svg width={S.W} height={S.H} viewBox={`0 0 ${S.W} ${S.H}`} style={abs}>{r.back}</svg>}
    {r.media!==undefined&&<AbsoluteFill>{r.media}</AbsoluteFill>}
    {top}
  </AbsoluteFill>;
};

/** Loads fonts before any text is measured, then renders sections with optional 3-sample camera motion blur, grain and audio. */
export const Film:React.FC<{cfg:FilmConfig;blur:boolean}>=({cfg,blur})=>{
  const frame=useCurrentFrame();
  const [ready,setReady]=useState(false);
  const [handle]=useState(()=>delayRender('Loading fonts'));
  const fonts=cfg.fonts??{display:{family:'Geist',file:'Geist-Variable.woff2'},mono:{family:'GeistMono',file:'GeistMono-Variable.woff2'}};
  FONTS.display=fonts.display.family;FONTS.mono=fonts.mono.family;
  useEffect(()=>{
    const extra=cfg.extraFonts??[];
    const faces=[new FontFace(fonts.display.family,`url(${staticFile(fonts.display.file)})`,{weight:'100 900'}),new FontFace(fonts.mono.family,`url(${staticFile(fonts.mono.file)})`,{weight:'100 900'}),
      ...extra.map(f=>new FontFace(f.family,`url(${staticFile(f.file)})`,{weight:f.weight??'100 900',style:f.style??'normal'}))];
    Promise.all(faces.map(f=>f.load())).then(loaded=>{loaded.forEach(f=>(document.fonts as FontFaceSet&{add:(f:FontFace)=>void}).add(f));
      return Promise.all([...(cfg.preloadWeights??[400,500,600,700,800,850,900]).map(w=>document.fonts.load(`${w} 100px ${fonts.display.family}`)),document.fonts.load(`500 100px ${fonts.mono.family}`),
        ...extra.map(f=>document.fonts.load(`${f.style==='italic'?'italic ':''}400 100px ${f.family}`,f.sample))]);})
      .then(()=>setReady(true)).catch(cancelRender);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>{if(ready)continueRender(handle);},[ready,handle]);
  return <AbsoluteFill style={{background:'#000'}}>
    {ready&&(!blur?<Scene cfg={cfg}/>
      :cfg.blurMedia===false?<><Scene cfg={cfg} part="under"/><CameraMotionBlur shutterAngle={180} samples={3}><Scene cfg={cfg} part="over"/></CameraMotionBlur></>
      :<CameraMotionBlur shutterAngle={180} samples={3}><Scene cfg={cfg}/></CameraMotionBlur>)}
    {!!cfg.grain&&<><Img src={staticFile('grain.png')} style={{position:'absolute',width:1,height:1,opacity:0}}/>
      <AbsoluteFill style={{backgroundImage:`url(${staticFile('grain.png')})`,backgroundRepeat:'repeat',backgroundPosition:`${Math.floor(frame/3)*71%320}px ${Math.floor(frame/3)*43%320}px`,opacity:cfg.grain,mixBlendMode:'soft-light',pointerEvents:'none'}}/></>}
    {cfg.audio&&<Audio src={staticFile(cfg.audio)}/>}
  </AbsoluteFill>;
};
