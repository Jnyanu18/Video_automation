/* The director writes this file per project. This one is a neutral API smoke test of the kit, not a style template. */
import {S,T,chip,eo,gooInvert,letters,morphRadii,osc,outline,radial,ringText,seg,shapePath,slam,slices,fit,type Ball} from './kit/core';
import {phone,phoneGeom,statusBar} from './kit/devices';
import type {FilmConfig,Frame} from './kit/film';

const C={dark:'#111114',light:'#F2F0EA',accent:'#3D5AFE'};

const BPM=128,B=60/BPM,BAR=4*B,HB=B/2;

function noise(t:number):Frame{
  const c=Math.min(3,Math.floor(t/HB)),vv=t-c*HB,words=['ONE.','TWO.','THREE.','FOUR.'],w=words[c],bg=c%2?C.light:C.dark,fg=c%2?C.dark:C.light;
  const sz=fit(w,900,S.W*.87,300),by=S.CY+sz*.36;
  const chips=[0,1,2,3].slice(0,c+1).map(i=>chip(['FIRST','SECOND','THIRD','FOURTH'][i],[120,560,140,600][i],[300,420,1380,1500][i],t,i*HB,fg,bg,C.accent));
  const word=c===3?<>{slices(()=>T(w,S.CX,by,sz,900,fg,{anchor:'middle',ls:-sz*.04}),by,sz,30*(1-seg(vv,0,.2)))}</>:T(w,S.CX,by,sz,900,fg,{anchor:'middle',ls:-sz*.04});
  return {bg,ink:fg,el:<>{chips}{slam(word,by,vv,{dir:c%2?1:-1})}</>};
}

const SHAPES=[radial.circle(160),radial.poly([[-300,210],[0,-280],[300,210]]),radial.rosette(8,130,130),radial.rays(12,170,70)];
function morph(t:number):Frame{
  const u=t-BAR,p=Math.min(2,Math.floor(u/(BAR/3))),vv=u-p*BAR/3,e=osc(vv,24,.5),r=morphRadii(SHAPES[p],SHAPES[p+1],e);
  const word=['TRIANGLE.','ROSETTE.','RAYS.'][p];
  return {bg:C.accent,ink:C.dark,el:<>
    <path d={shapePath(r,S.CX,1000)} fill={C.dark}/>
    {letters(word,S.CX,380,fit(word,900,S.W*.86,220),900,C.dark,vv,0,{stag:.012,dur:.22})}
  </>};
}

function liquid(t:number):Frame{
  const u=t-2*BAR,grow=osc(u,12,.6);
  const balls:Ball[]=Array.from({length:7},(_,i)=>{const a=i*Math.PI*2/7+u*(i%2?1:-.8);return {x:S.CX+Math.cos(a)*230,y:1000+Math.sin(a*1.3)*260,r:(95+20*Math.sin(u*3+i))*grow};});
  const sz=fit('LIQUID.',900,S.W*.86,300);
  return {bg:C.dark,ink:C.light,el:gooInvert(balls,f=>letters('LIQUID.',S.CX,1060,sz,900,f,u,0,{stag:.03}),{blobFill:C.accent,outside:C.light,inside:C.dark})};
}

function lockup(t:number):Frame{
  const u=t-3*BAR,g=phoneGeom(360,730,1050),dy=(1-osc(u-.3,14,.55))*1100;
  return {bg:C.light,ink:C.dark,el:<>
    {ringText(S.CX,620,300,'KIT · DEMO · ',34,800,false,u*30,C.dark,eo(seg(u,0,.2)))}
    {letters('KIT',S.CX,660,140,900,C.dark,u,0,{stag:.04})}
    {outline('OUTLINE',S.CX,1000,fit('OUTLINE',900,S.W*.7,160),900,C.dark,C.light,3,{anchor:'middle',op:.5})}
    {phone(g,statusBar(g.sw,C.light),{body:C.dark,screenBg:'#1E1E24',dy})}
  </>};
}

export const film:FilmConfig={
  width:1080,height:1920,fps:60,duration:4*BAR,
  sections:[{name:'SLAM',start:0,render:noise},{name:'MORPH',start:BAR,render:morph},{name:'LIQUID',start:2*BAR,render:liquid},{name:'LOCKUP',start:3*BAR,render:lockup}],
  hud:{left:'KIT / SMOKE TEST',right:'MOTION DIRECTOR'},
  audio:'soundtrack.wav',grain:.06,
};
