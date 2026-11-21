/* ---------- 30 s timeline: 8 motion bars + 8 real-speed showcase bars ---------- */
const DUR=30,SF=60,SFR=(c,k)=>`naati/show/c${c}_${String(k).padStart(3,'0')}.jpg`;
const SHOWS=[
  {t:'THE FARM.',s:'OPEN GROUND',d:-1},
  {t:'THE SHEDS.',s:'OPEN SIDES. FRESH AIR.',d:1},
  {t:'THE CHICKS.',s:'FED, WATERED, TOGETHER',d:-1},
  {t:'INSIDE THE SHED.',s:'DRY BEDDING. ROOM TO MOVE.',d:1},
  {t:'THE WORK.',s:'HANDS ON, EVERY DAY',d:-1},
  {t:'BY HAND.',s:'NO SHORTCUTS',d:1},
  {t:'FRESH GREENS.',s:'NATURAL FEED',d:-1},
  {t:'NATIVE BREED.',s:'WHERE THE NAME COMES FROM',d:1}];
const TL=[{scene:0},{scene:1},{show:0},{show:1},{scene:2},{show:2},{show:3},{scene:4},
          {show:4},{show:5},{scene:3},{show:6},{show:7},{scene:5},{scene:6},{scene:7}];

/* Showcase bar: one clip, full screen, real speed (30 fps source, 1:1). An orange panel wipes off,
   the footage lands 8% large and settles, the label rises, and a whip carries it into the next bar. */
function sShow(u,c){const S=SHOWS[c],k=clamp(Math.floor(u*30),0,SF-1);let s='';
  const wipe=eo(seg(u,0,.32)),sc0=1+.08*(1-eo(seg(u,0,.5)))+.035*seg(u,0,BAR);
  const wf=x=>S.d*-2300*ei(seg(x,BAR-.17,.155)),wx=wf(u),vw=(wf(u+1/240)-wf(u-1/240))*120;
  s+=`<g transform="translate(${CX} ${CY}) scale(${sc0.toFixed(4)}) translate(${-CX} ${-CY})"><image href="${SFR(c,k)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" decoding="sync"/></g>`;
  const gid=fid();DEFS+=`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset=".42" stop-color="${BK}" stop-opacity="0"/><stop offset="1" stop-color="${BK}" stop-opacity=".8"/></linearGradient>`;
  s+=`<rect width="${W}" height="${H}" fill="url(#${gid})"/>`;
  s+=rise(T(S.s,124,858,20,500,OR,{mono:1,ls:3}),858,20,u,.22)+rise(T(S.t,120,950,92,650,WH),950,92,u,.3);
  if(wipe<1)s+=`<rect x="${n1(S.d<0?-W*wipe:W*wipe)}" y="0" width="${W}" height="${H}" fill="${OR}"/>`;
  return {bg:BK,ink:WH,svg:`<g transform="translate(${n1(wx)} 0)"${blurAttr(vblur(vw,.004,40),0)}>${s}</g>`};}

window.seek=function(T0){const t=clamp(T0,0,DUR-1e-6);DEFS='';FID=0;const p=clamp(Math.floor(t/BAR),0,15),b=TL[p],u=t-p*BAR;
  const r=b.show!=null?sShow(u,b.show):SECS[b.scene](u+b.scene*BAR);   /* motion bars get their original local time */
  v.innerHTML=`<rect width="${W}" height="${H}" fill="${r.bg}"/><defs>${DEFS}</defs>${r.svg}${hud(t,r.ink,p)}`;};

/* Showcase frames are dense (60 per clip), so they load per bar instead of all up front: the renderer
   awaits prepare(t) before each seek, which decodes this bar and the next two and drops the rest. */
const SCACHE=new Map();
function loadShow(c){if(SCACHE.has(c))return SCACHE.get(c).ready;const imgs=[];for(let k=0;k<SF;k++){const i=new Image();i.src=SFR(c,k);imgs.push(i);}
  const ready=Promise.all(imgs.map(i=>i.decode().catch(()=>{})));SCACHE.set(c,{imgs,ready});return ready;}
window.prepare=function(T0){const p=clamp(Math.floor(clamp(T0,0,DUR-1e-6)/BAR),0,15),need=new Set();
  for(const q of [p,p+1,p+2])if(TL[q]&&TL[q].show!=null)need.add(TL[q].show);
  for(const c of [...SCACHE.keys()])if(!need.has(c))SCACHE.delete(c);
  return Promise.all([...need].map(loadShow)).then(()=>true);};
