/** Footage layer for films that cut real video under the SVG graphics. Return the result in Frame.media.
 *  Timing is a pure function of film time: the shot starts at `start` (s) showing source time `in` (s) and plays at
 *  `rate`. Remotion maps it as source frame = trimBefore + localFrame × rate, so in/out points are exact.
 *  Transcode HDR phone footage to SDR H.264 with short GOPs first (seeks stay fast, colours stay right). */
import React from 'react';
import {Img,OffthreadVideo,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {S,n1,uid} from './core';

/** A clip is either a video file or a pre-extracted JPEG sequence (seq): <dir>/<sourceFrame>.jpg for frames
 *  first..last at `fps`. Sequences are fully deterministic (no decoder in the render loop); prefer them when
 *  the offthread extractor is unreliable on the host ("No frame found at position" under parallel renders). */
export type Seq={dir:string;fps:number;first:number;last:number};
export type Clip={src:string;w:number;h:number;seq?:Seq}; // file in public/ (or seq dir) and its native pixel size

const SeqFrame:React.FC<{seq:Seq;inS:number;rate:number;style:React.CSSProperties}>=({seq,inS,rate,style})=>{
  const f=useCurrentFrame(),src=Math.floor((inS+f/S.fps*rate)*seq.fps+1e-6);
  const k=Math.min(seq.last,Math.max(seq.first,src));
  return <Img src={staticFile(`${seq.dir}/${k}.jpg`)} style={style}/>;
};
export type Box={x:number;y:number;w:number;h:number};
export type FootageOpts={
  start:number; in:number; rate?:number;
  box?:Box;                 // where the shot sits (default: full frame)
  fx?:number; fy?:number;   // focal point (0..1) kept at the box centre when cover-cropping
  zoom?:number;             // extra scale over cover-fit; >1 also gives room for dx/dy pans
  dx?:number; dy?:number;   // pan inside the box, px (clamped so the box stays covered)
  rot?:number; scale?:number; tx?:number; ty?:number;       // box transform about its centre
  radius?:number; opacity?:number; filter?:string; clipPath?:string;
};

/** Cover-fit geometry of a clip inside a box (exported for tests and for aligning graphics to the picture). */
export function coverFit(c:Clip,b:Box,o:{fx?:number;fy?:number;zoom?:number;dx?:number;dy?:number}={}){
  const k=Math.max(b.w/c.w,b.h/c.h)*(o.zoom??1),vw=c.w*k,vh=c.h*k;
  const left=Math.min(0,Math.max(b.w-vw,b.w/2-(o.fx??.5)*vw+(o.dx??0)));
  const top=Math.min(0,Math.max(b.h-vh,b.h/2-(o.fy??.5)*vh+(o.dy??0)));
  return {left,top,vw,vh,k};
}

export function footage(c:Clip,o:FootageOpts):React.ReactElement{
  const b=o.box??{x:0,y:0,w:S.W,h:S.H},g=coverFit(c,b,o);
  const tf=`translate(${n1(o.tx??0)}px,${n1(o.ty??0)}px) rotate(${n1(o.rot??0)}deg) scale(${(o.scale??1).toFixed(4)})`;
  return <Sequence key={uid()} from={Math.round(o.start*S.fps)} layout="none">
    <div style={{position:'absolute',left:n1(b.x),top:n1(b.y),width:n1(b.w),height:n1(b.h),overflow:'hidden',transform:tf,transformOrigin:'50% 50%',
      borderRadius:o.radius,opacity:o.opacity,filter:o.filter,clipPath:o.clipPath}}>
      {c.seq
        ?<SeqFrame seq={c.seq} inS={o.in} rate={o.rate??1} style={{position:'absolute',left:n1(g.left),top:n1(g.top),width:n1(g.vw),height:n1(g.vh),maxWidth:'none'}}/>
        :<OffthreadVideo src={staticFile(c.src)} trimBefore={Math.round(o.in*S.fps)} playbackRate={o.rate??1} muted
          style={{position:'absolute',left:n1(g.left),top:n1(g.top),width:n1(g.vw),height:n1(g.vh),maxWidth:'none'}}/>}
    </div>
  </Sequence>;
}
