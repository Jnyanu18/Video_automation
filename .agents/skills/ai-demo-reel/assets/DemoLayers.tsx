import React from 'react';
import {Video} from '@remotion/media';
import {AbsoluteFill, Easing, Img, Interactive, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import preset from './preset.json';

type Camera = {x:number; y:number; scale:number};
type Pointer = {seconds:number; x:number; y:number; click?:boolean};
export type Window = {from:number; frames:number};
export type Page = {startMs:number; endMs:number; tokens:{text:string; startMs:number; endMs:number}[]};
const clamp = {extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;

export const Capture: React.FC<{
  src:string; sourceWidth:number; sourceHeight:number; durationFrames:number;
  camera:Camera; endCamera?:Camera; sourceStartSeconds?:number;
  playbackRate?:number; pointers?:Pointer[]; dim?:number;
}> = ({src,sourceWidth,sourceHeight,durationFrames,camera,endCamera=camera,sourceStartSeconds=0,playbackRate=1,pointers=[],dim=0}) => {
  const frame=useCurrentFrame();
  const {width,height,fps}=useVideoConfig();
  const unit=width/1080;
  const progress=interpolate(frame,[0,Math.max(1,durationFrames-1)],[0,1],{...clamp,easing:Easing.bezier(.35,0,.2,1)});
  const scale=Math.max(width/sourceWidth,height/sourceHeight,camera.scale+(endCamera.scale-camera.scale)*progress);
  const centerX=camera.x+(endCamera.x-camera.x)*progress;
  const centerY=camera.y+(endCamera.y-camera.y)*progress;
  const left=Math.max(width-sourceWidth*scale,Math.min(0,width/2-centerX*scale));
  const top=Math.max(height-sourceHeight*scale,Math.min(0,900*unit-centerY*scale));
  const seconds=sourceStartSeconds+frame/fps*playbackRate;
  const previous=pointers.filter(point=>point.seconds<=seconds).at(-1);
  const next=pointers.find(point=>point.seconds>seconds);
  const blend=previous && next ? Math.max(0,Math.min(1,(seconds-previous.seconds)/(next.seconds-previous.seconds))) : 0;
  const pointerX=previous ? previous.x+(next?next.x-previous.x:0)*blend : 0;
  const pointerY=previous ? previous.y+(next?next.y-previous.y:0)*blend : 0;
  const click=pointers.filter(point=>point.click && point.seconds<=seconds).at(-1);
  const clickAge=click?(seconds-click.seconds)/playbackRate:99;
  return <AbsoluteFill style={{overflow:'hidden',backgroundColor:preset.colors.background}}>
    <Video name="Genuine capture" src={staticFile(src)} trimBefore={Math.round(sourceStartSeconds*fps)} playbackRate={playbackRate} muted style={{position:'absolute',width:sourceWidth*scale,height:sourceHeight*scale,left,top}}/>
    {previous && <svg width={52*unit} height={66*unit} viewBox="0 0 52 66" style={{position:'absolute',left:left+pointerX*scale,top:top+pointerY*scale,filter:'drop-shadow(0 2px 3px #0008)',zIndex:3}}><path d="M5 3 L7 49 L18 39 L29 60 L39 55 L28 35 L43 33 Z" fill="white" stroke="#141719" strokeWidth="3" strokeLinejoin="round"/></svg>}
    {click && clickAge>=0 && clickAge<.48 && <div style={{position:'absolute',left:left+click.x*scale-35*unit,top:top+click.y*scale-35*unit,width:70*unit,height:70*unit,border:`${3*unit}px solid #b5d4df`,borderRadius:'50%',scale:1+clickAge*1.7,opacity:1-clickAge/.48,zIndex:2}}/>}
    {dim>0 && <AbsoluteFill style={{backgroundColor:`rgba(0,0,0,${dim})`}}/>}
    <AbsoluteFill style={{background:`linear-gradient(180deg,#0d0d0d 0px,#0d0d0d ${280*unit}px,transparent ${355*unit}px,transparent ${1440*unit}px,rgba(0,0,0,.90) ${1750*unit}px)`,pointerEvents:'none'}}/>
  </AbsoluteFill>;
};

export const Title: React.FC<{eyebrow:string; title:string; detail?:string}> = ({eyebrow,title,detail}) => {
  const frame=useCurrentFrame();
  const {fps,width}=useVideoConfig();
  const unit=width/1080;
  return <Interactive.Div name="Step title" style={{position:'absolute',left:68*unit,right:88*unit,top:95*unit,color:'white',fontFamily:preset.fontFamily,opacity:interpolate(frame,[0,8/30*fps],[0,1],clamp),translate:interpolate(frame,[0,12/30*fps],[`0px ${16*unit}px`,'0px 0px'],{...clamp,easing:Easing.bezier(.22,1,.36,1)})}}>
    <div style={{fontSize:27*unit,fontWeight:500,color:preset.colors.accent,letterSpacing:2*unit,marginBottom:16*unit}}>{eyebrow}</div>
    <div style={{fontSize:64*unit,fontWeight:650,lineHeight:1.08,letterSpacing:-1.7*unit,textShadow:'0 2px 18px #000'}}>{title}</div>
    {detail && <div style={{fontSize:32*unit,lineHeight:1.3,color:'#e5e9eb',marginTop:16*unit}}>{detail}</div>}
  </Interactive.Div>;
};

export const Hook: React.FC<{text:string; frames:number; rehook?:boolean}> = ({text,frames,rehook=false}) => {
  const frame=useCurrentFrame();
  const {fps,width}=useVideoConfig();
  const unit=width/1080;
  if(frames<3) throw new Error('Hook windows need at least three frames');
  const entrance=Math.min(8/30*fps,(frames-1)/4);
  const exit=frames-1-Math.min(13/30*fps,(frames-1)/4);
  return <Interactive.Div name={rehook?'Curiosity bridge':'Opening hook'} style={{position:'absolute',left:(rehook?68:66)*unit,right:(rehook?88:95)*unit,top:(rehook?114:154)*unit,fontFamily:preset.fontFamily,fontSize:(rehook?74:94)*unit,fontWeight:rehook?650:700,lineHeight:rehook?1.07:1.04,textAlign:rehook?'left':'center',whiteSpace:'pre-line',color:'white',textShadow:'0 3px 16px #000',scale:rehook?1:interpolate(frame,[0,12/30*fps],[.95,1],{...clamp,easing:Easing.bezier(.22,1,.36,1)}),translate:rehook?interpolate(frame,[0,9/30*fps],[`0px ${15*unit}px`,'0px 0px'],{...clamp,easing:Easing.bezier(.22,1,.36,1)}):'0px 0px',opacity:rehook?interpolate(frame,[0,entrance,exit,frames-1],[0,1,1,0],clamp):interpolate(frame,[exit,frames-1],[1,0],clamp),zIndex:10}}>{text}</Interactive.Div>;
};

export const GroundedPresenter: React.FC<{
  directory:string; packedStart:number; frames:number; mirror:boolean;
  width?:number; height?:number;
}> = ({directory,packedStart,frames,mirror,width=828,height=1012}) => {
  const frame=useCurrentFrame();
  const {fps,width:canvasWidth}=useVideoConfig();
  const unit=canvasWidth/1080;
  if(frames<3) throw new Error('Presenter windows need at least three frames');
  const fadeIn=Math.min(Math.round(7/30*fps),(frames-1)/4);
  const fadeOut=frames-1-Math.min(Math.round(8/30*fps),(frames-1)/4);
  const filename=String(packedStart+frame).padStart(4,'0');
  return <Interactive.Div name="Grounded corner presenter" style={{position:'absolute',left:0,bottom:0,width:width*unit,height:height*unit,opacity:interpolate(frame,[0,fadeIn,fadeOut,frames-1],[0,1,1,0],clamp),zIndex:20}}>
    <Img name="Prepared alpha frame" src={staticFile(`${directory}/${filename}.png`)} style={{display:'block',width:width*unit,height:height*unit,scale:mirror?'-1 1':'1 1'}}/>
  </Interactive.Div>;
};

export const Captions: React.FC<{pages:Page[]; presenterWindows:Window[]; suppressed?:{startMs:number;endMs:number}[]}> = ({pages,presenterWindows,suppressed=[]}) => {
  const frame=useCurrentFrame();
  const {fps,width}=useVideoConfig();
  const timeMs=frame/fps*1000;
  if(suppressed.some(range=>timeMs>=range.startMs && timeMs<range.endMs)) return null;
  const page=pages.find(item=>timeMs>=item.startMs && timeMs<item.endMs);
  if(!page) return null;
  const beside=presenterWindows.some(window=>page.startMs<(window.from+window.frames)/fps*1000 && page.endMs>window.from/fps*1000);
  const layout=beside?preset.presenterCaptions:preset.captions;
  const unit=width/1080;
  return <div style={{position:'absolute',left:layout.left*unit,right:layout.right*unit,top:layout.top*unit,fontFamily:preset.fontFamily,fontSize:layout.fontSize*unit,fontWeight:600,lineHeight:1.22,textAlign:'center',color:'#f9fbfc',textShadow:'0 2px 10px black,0 1px 4px black',zIndex:100}}>{page.tokens.map(token=><span key={`${token.startMs}-${token.text}`} style={{color:timeMs>=token.startMs && timeMs<token.endMs?preset.colors.activeWord:'#f9fbfc'}}>{token.text}</span>)}</div>;
};

export const CommentCTA: React.FC<{keyword:string; promise:string; revealFrame:number}> = ({keyword,promise,revealFrame}) => {
  const frame=useCurrentFrame();
  const {fps,width}=useVideoConfig();
  const unit=width/1080;
  return <Interactive.Div name="Complete resource CTA" style={{position:'absolute',left:620*unit,right:60*unit,top:690*unit,fontFamily:preset.fontFamily,color:'white',opacity:interpolate(frame,[revealFrame,revealFrame+12/30*fps],[0,1],clamp),translate:interpolate(frame,[revealFrame,revealFrame+16/30*fps],[`0px ${20*unit}px`,'0px 0px'],{...clamp,easing:Easing.bezier(.22,1,.36,1)})}}>
    <div style={{fontSize:45*unit,marginBottom:15*unit}}>Comment</div>
    <div style={{fontSize:86*unit,fontWeight:650,letterSpacing:-4*unit,color:'#c2d8e0'}}>{keyword}</div>
    <div style={{fontSize:36*unit,lineHeight:1.3,marginTop:30*unit,whiteSpace:'pre-line'}}>{promise}</div>
  </Interactive.Div>;
};
