import React from 'react';
import {S,T,clip,n1,uid} from './core';

/** Phone shell. Screen content is drawn in local coordinates (0,0) → (sw,sh); see phoneGeom(). */
export type PhoneGeom={x:number;y:number;w:number;h:number;r:number;inset:number;sw:number;sh:number};
export function phoneGeom(w=560,h=1140,topY?:number):PhoneGeom{
  const inset=16;return {x:S.CX-w/2,y:topY??S.CY-h/2,w,h,r:80,inset,sw:w-2*inset,sh:h-2*inset};
}
export function phone(g:PhoneGeom,screen:React.ReactNode,o:{body:string;bezel?:string;screenBg:string;dy?:number;rot?:number;sc?:number;filter?:string;shadow?:boolean}){
  const cx=g.x+g.w/2,cy=g.y+g.h/2,sr=g.r-g.inset;
  return <g key={uid()} transform={`translate(0 ${n1(o.dy??0)}) translate(${n1(cx)} ${n1(cy)}) rotate(${n1(o.rot??0)}) scale(${(o.sc??1).toFixed(4)}) translate(${n1(-cx)} ${n1(-cy)})`} filter={o.filter}>
    {o.shadow!==false&&<rect x={g.x+10} y={g.y+28} width={g.w} height={g.h} rx={g.r} fill="#000" opacity={.16}/>}
    <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={g.r} fill={o.body} stroke={o.bezel??'#3A3446'} strokeWidth={3}/>
    <rect x={g.x+g.inset} y={g.y+g.inset} width={g.sw} height={g.sh} rx={sr} fill={o.screenBg}/>
    <g clipPath={clip(g.x+g.inset,g.y+g.inset,g.sw,g.sh,sr)}><g transform={`translate(${g.x+g.inset} ${g.y+g.inset})`}>{screen}</g></g>
    <rect x={cx-62} y={g.y+g.inset+16} width={124} height={34} rx={17} fill="#000"/>
  </g>;
}
export const statusBar=(sw:number,ink:string)=><g key={uid()}>{T('9:41',44,60,24,600,ink)}<rect x={sw-88} y={42} width={44} height={20} rx={6} fill="none" stroke={ink} strokeWidth={2} opacity={.8}/><rect x={sw-84} y={46} width={30} height={12} rx={3} fill={ink}/></g>;
