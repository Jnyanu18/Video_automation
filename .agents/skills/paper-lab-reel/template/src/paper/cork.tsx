// internet + slice: the footage polaroid lands on a corkboard of clippings, the camera pulls back to
// reveal its scale (three nested levels of clippings), then a knife cuts one thin strip off the board.
import React from "react";
import { easeInOut, smooth } from "../lib";
import { Clipping, CodeSheet, Defs, IMG, INK, PAPERS, Photo, Pin, Polaroid, RED, Scrap, TYPE, WebPage, back, pS, rnd, rr, torn, twos } from "./kit";
import { B, HAND, T } from "./T";

const P0: [number, number] = [540, 760];
const TILE_S = 0.22;

// world -> screen zoom; p0 stays at its screen spot while the tile shrinks, then the pull-back continues
export const corkZoom = (t: number) => {
  if (t <= HAND.inTile) return 1;
  const k = (t - HAND.inTile) / 1.1;
  if (k < 1) return (TILE_S + (0.02 - TILE_S) * easeInOut(k)) / TILE_S;
  const z1 = 0.02 / TILE_S;
  return z1 * (1 - 0.26 * smooth((t - HAND.inGone) / (B.slice.s + 1.2 - HAND.inGone)));
};
export const corkCam = (t: number) => {
  const z = corkZoom(t);
  // after the pull-back the camera drifts across the board ("spread across")
  // (screen pixels / z, and only once the tile has gone, so the polaroid slot stays under the tile)
  const g = smooth((t - HAND.inTile) / 1.1);
  const panX = g * (smooth((t - T.spread) / 2.2) * 150 + Math.sin(t * 0.21) * 18) / z;
  const panY = g * (-smooth((t - T.raw) / 3) * 70 + Math.cos(t * 0.17) * 14) / z;
  const cx = P0[0] + panX, cy = P0[1] + 200 / z + panY;
  return { z, cx, cy };
};
export const camT = (c: { z: number; cx: number; cy: number }) => `translate(540 960) scale(${c.z}) translate(${-c.cx} ${-c.cy})`;

type Item = { L: number; x: number; y: number; w: number; h: number; rot: number; kind: number; i: number; head: string; pinAt: number };
const HEADS = ["How do volcanoes form?", "Masala chai recipe", "Stack Overflow", "Weather this week", "Cricket: match report", "Learn Python",
  "Moon landing archive", "Map of Beijing", "r/askscience", "Wikipedia: Gandhi", "Why is the sky blue?", "Cat videos", "Physics forum",
  "Street food tour", "Black holes, explained", "Travel blog: Kyoto", "World news", "Tutorial: React", "Poetry corner", "How tides work"];
const CODE = [["def sort(a):", "  return sorted(a)"], ["for x in data:", "  print(x)"], ["<html>", "  <body>", "</html>"], ["SELECT name", "FROM users;"]];
const SNIPS = ["arXiv", "def f(x):", "<p>hello</p>", "news", "the quick fox", "E = mc²", "r/askscience", "Beijing", "wiki", "lol", "Ch. IV", "x + y = z"];

export const ITEMS: Item[] = (() => {
  const out: Item[] = [];
  let n = 0;
  for (let L = 2; L >= 0; L--) {
    const m = Math.pow(4, L), cw = 250 * m, ch = 300 * m;
    for (let c = 0; c < 5; c++) for (let r = 0; r < 7; r++) {
      if (L === 0 && c === 2 && r === 3) continue; // the polaroid slot
      if (L > 0 && c === 2 && r >= 2 && r <= 4) continue;
      if (L > 0 && (c === 1 || c === 3) && r === 3) continue;
      const i = n++;
      const x = P0[0] + (c - 2) * cw + (rnd(`ix${i}`) - 0.5) * cw * 0.35;
      const y = P0[1] + (r - 3) * ch + (rnd(`iy${i}`) - 0.5) * ch * 0.3;
      const kind = Math.floor(rnd(`ik${i}`) * 6);
      const w = (kind === 5 ? 150 : 190 + rnd(`iw${i}`) * 70) * m, h = (kind === 5 ? 46 : 180 + rnd(`ih${i}`) * 90) * m;
      out.push({ L, x, y, w, h, rot: (rnd(`ir${i}`) - 0.5) * 16, kind, i, head: HEADS[i % HEADS.length], pinAt: L < 2 ? 0 : T.online - 0.2 + rnd(`ip${i}`) * 1.3 });
    }
  }
  return out;
})();

const ItemArt: React.FC<{ it: Item; sz: number }> = ({ it, sz }) => {
  const m = Math.pow(4, it.L), sh = sz > 40 ? "url(#psh)" : undefined;
  const k = it.kind;
  // drawn at base size then scaled by m
  const bw = it.w / m, bh = it.h / m;
  const body = k === 0 ? <WebPage x={0} y={0} w={bw} h={bh} title={it.head} seed={it.i} accent={it.i % 3 ? "#2f5fb3" : RED} />
    : k === 1 ? <Clipping x={0} y={0} w={bw} h={bh} head={it.head} seed={it.i} photo={it.i} shadow={sh} />
    : k === 2 ? <Polaroid x={0} y={0} w={bw * 0.8} clipId={`cpp${it.i}`} shadow={sh}><Photo kind={it.i} w={bw * 0.8} h={bw * 0.74} /></Polaroid>
    : k === 3 ? <CodeSheet x={0} y={0} w={bw} lines={CODE[it.i % CODE.length]} />
    : k === 4 ? <g filter={sh}><rect x={-bw / 2} y={-bh / 2} width={bw} height={bh * 0.75} fill="#fff" /><g transform={`translate(${-bw / 2 + 8} ${-bh / 2 + 8})`}><Photo kind={4} w={bw - 16} h={bh * 0.75 - 40} /></g><text x={-bw / 2 + 10} y={bh * 0.25 - 12} fontFamily={TYPE} fontSize={17} fill={INK}>{it.head}</text></g>
    : <Scrap x={0} y={0} text={SNIPS[it.i % SNIPS.length]} fill={PAPERS[it.i % 4]} seed={`cs${it.i}`} shadow={sh} />;
  return <g transform={`translate(${it.x} ${it.y}) rotate(${it.rot}) scale(${m})`}>{body}{k !== 5 && k !== 2 && <Pin x={0} y={-bh / 2 + 6} color={it.i % 4 ? RED : "#2f5fb3"} s={0.8} />}</g>;
};

// The board content in world units (items + the polaroid of Madhav at P0 + red threads).
export const CorkWorld: React.FC<{ t: number; z: number; cx: number; cy: number; clip?: { y0: number; y1: number } }> = ({ t, z, cx, cy, clip }) => {
  const tt = twos(t);
  const vis = (it: Item) => {
    const sx = 540 + (it.x - cx) * z, sy = 960 + (it.y - cy) * z, r = Math.max(it.w, it.h) * 0.7 * z;
    if (sx + r < -40 || sx - r > 1120) return false;
    const y0 = clip ? clip.y0 : -40, y1 = clip ? clip.y1 : 1960;
    if (sy + r < y0 || sy - r > y1) return false;
    return r > 3;
  };
  // pins drop in on "online data"
  const drop = (it: Item) => it.pinAt === 0 ? 1 : back((tt - it.pinAt) / 0.3, 1.6);
  const pins = ITEMS.filter((it) => it.L === 1);
  const thread = Math.max(0, Math.min(1, (t - T.spread) / 1.4));
  return (
    <g transform={camT({ z, cx, cy })}>
      {ITEMS.map((it) => {
        if (!vis(it)) return null;
        const d = drop(it);
        if (d <= 0.01) return null;
        const sz = Math.max(it.w, it.h) * z;
        return <g key={it.i} transform={`translate(${it.x} ${it.y}) scale(${Math.max(0.01, 1.15 - 0.15 * d)}) translate(${-it.x} ${-it.y})`} opacity={Math.min(1, d * 3)}><ItemArt it={it} sz={sz} /></g>;
      })}
      {/* red string between the pins: everything is linked */}
      {thread > 0 && pins.map((a, i) => {
        const b = pins[(i * 7 + 3) % pins.length];
        const k = Math.max(0, Math.min(1, thread * 1.6 - (i / pins.length) * 0.6));
        if (k <= 0) return null;
        const ay = a.y - a.h / 2 + 24, by = b.y - b.h / 2 + 24;
        return <path key={i} d={`M${a.x},${ay}Q${(a.x + b.x) / 2},${Math.max(ay, by) + 500} ${b.x},${by}`} fill="none" stroke={RED} strokeWidth={2.4} vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k} opacity={0.85} />;
      })}
      {/* the polaroid slot where his footage lands */}
      <g transform={`translate(${P0[0]} ${P0[1]})`}>
        <rect x={-119 - 12} y={-211 - 12} width={238 + 24} height={422 + 46} fill="#fbf8f1" filter={z > 0.3 ? "url(#psh)" : undefined} />
        <image href={IMG.still} x={-119} y={-211} width={238} height={422} preserveAspectRatio="xMidYMid slice" />
        <path d={torn(110, 34, "slt", "lr")} transform="translate(0 -226) rotate(-4)" fill="#f7d774" opacity={0.85} />
      </g>
    </g>
  );
};

export const CorkBg: React.FC<{ t: number; dim?: number }> = ({ t, dim = 0 }) => (
  <>
    <image href={IMG.cork} x={-80 + Math.sin(t * 0.13) * 20} y={-140 + Math.cos(t * 0.1) * 24} width={1240} height={2200} preserveAspectRatio="none" />
    {/* wooden frame edge shadow for depth */}
    <rect width={1080} height={1920} fill="none" stroke="rgba(40,20,5,.35)" strokeWidth={60} filter="url(#psmudge)" />
    {dim > 0 && <rect width={1080} height={1920} fill={INK} opacity={dim} />}
  </>
);

// the strip: y range on screen at the cut, and where it travels to
export const STRIP = { y0: 600, y1: 690, cutT: 0, liftT: 0, upY: 430 };
STRIP.cutT = T.used + 0.25; // knife starts
STRIP.liftT = T.compressed - 0.5;
const CUT_DUR = 1.0;
export const stripState = (t: number) => {
  const lift = pS(t, STRIP.liftT, 0.3);
  const up = pS(t, T.compressed, 0.55);
  const cy0 = (STRIP.y0 + STRIP.y1) / 2;
  return { lift, dy: (STRIP.upY - cy0) * up - lift * 10, s: 1 + 0.03 * lift - 0.02 * up };
};
// strip content: the board frozen at the moment of the cut
export const Strip: React.FC<{ t: number; idp: string }> = ({ t, idp }) => {
  const c = corkCam(STRIP.cutT + CUT_DUR);
  const st = stripState(t);
  const cy0 = (STRIP.y0 + STRIP.y1) / 2;
  return (
    <g transform={`translate(540 ${cy0 + st.dy}) scale(${st.s}) translate(-540 ${-cy0})`}>
      <rect x={-6} y={STRIP.y0} width={1092} height={STRIP.y1 - STRIP.y0} fill="#000" opacity={0.3} filter="url(#psh2)" />
      <clipPath id={`${idp}clip`}><path d={`M-6 ${STRIP.y0}` + Array.from({ length: 40 }, (_, i) => `L${i * 28} ${STRIP.y0 + (rnd(`sa${i}`) - 0.5) * 3}`).join("") + `L1086 ${STRIP.y0}L1086 ${STRIP.y1}` + Array.from({ length: 40 }, (_, i) => `L${1086 - i * 28} ${STRIP.y1 + (rnd(`sb${i}`) - 0.5) * 3}`).join("") + "Z"} /></clipPath>
      <g clipPath={`url(#${idp}clip)`}>
        <image href={IMG.cork} x={-80 + Math.sin((STRIP.cutT + CUT_DUR) * 0.13) * 20} y={-140 + Math.cos((STRIP.cutT + CUT_DUR) * 0.1) * 24} width={1240} height={2200} preserveAspectRatio="none" />
        <CorkWorld t={STRIP.cutT + CUT_DUR + 2} z={c.z} cx={c.cx} cy={c.cy} clip={{ y0: STRIP.y0, y1: STRIP.y1 }} />
        <rect x={-6} y={STRIP.y0} width={1092} height={STRIP.y1 - STRIP.y0} fill="#fff6d8" opacity={0.12 + 0.1 * st.lift} />
      </g>
      <rect x={-6} y={STRIP.y0} width={1092} height={STRIP.y1 - STRIP.y0} fill="none" stroke="#fff3c4" strokeWidth={3} opacity={0.6 * st.lift} />
    </g>
  );
};

// A craft knife (scalpel) and a steel ruler.
const Knife: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y}) rotate(-38)`} filter="url(#psh)">
    <path d="M0,0 L34,-10 L40,0 Z" fill="#d9dde3" stroke="#8b919b" strokeWidth={1.5} />
    <rect x={38} y={-9} width={34} height={18} rx={3} fill="#9aa1ab" />
    <rect x={70} y={-11} width={190} height={22} rx={10} fill="#2f5fb3" />
    {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={100 + i * 22} y1={-9} x2={100 + i * 22} y2={9} stroke="#21447f" strokeWidth={3} />)}
  </g>
);

export const CorkScene: React.FC<{ t: number; fr: number }> = ({ t }) => {
  const c = corkCam(Math.min(t, STRIP.cutT + CUT_DUR + 4));
  const tt = twos(t);
  const cutK = Math.max(0, Math.min(1, (tt - STRIP.cutT) / CUT_DUR));
  const st = stripState(t);
  const fall = smooth((t - (B.network.s - 0.3)) / 0.6); // the board drops away into the next scene
  const fallY = fall * fall * 2100;
  const rulerOn = cutK > 0 && st.lift < 1;
  const rulerOut = pS(t, STRIP.liftT - 0.1, 0.3);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <g transform={`translate(0 ${fallY}) rotate(${fall * 5} 540 0)`}>
        <CorkBg t={t} dim={0.5 * st.lift} />
        <g opacity={1}>
          <CorkWorld t={t} z={c.z} cx={c.cx} cy={c.cy} />
        </g>
        {st.lift > 0 && <rect width={1080} height={1920} fill="#1d1a2e" opacity={0.45 * st.lift} />}
        {/* the gap left by the strip */}
        {st.lift > 0 && <rect x={0} y={STRIP.y0} width={1080} height={STRIP.y1 - STRIP.y0} fill="#3a2614" opacity={0.85} />}
        {/* steel ruler + knife cut */}
        {rulerOn && (
          <g transform={`translate(${-rulerOut * 1300} 0)`}>
            <rect x={-20} y={STRIP.y0 - 46} width={1120} height={44} fill="#c9ced6" stroke="#8b919b" strokeWidth={2} filter="url(#psh)" />
            {Array.from({ length: 56 }, (_, i) => <line key={i} x1={i * 20} y1={STRIP.y0 - 46} x2={i * 20} y2={STRIP.y0 - 46 + (i % 5 ? 10 : 18)} stroke="#4c525c" strokeWidth={2} />)}
            <line x1={0} y1={STRIP.y0} x2={-20 + cutK * 1120} y2={STRIP.y0} stroke="#2a1708" strokeWidth={3} />
            <line x1={0} y1={STRIP.y1} x2={-20 + cutK * 1120} y2={STRIP.y1} stroke="#2a1708" strokeWidth={3} />
            {cutK < 1 && <Knife x={-20 + cutK * 1120} y={STRIP.y0 + (Math.floor(tt * 15) % 2 ? 2 : 0)} />}
          </g>
        )}
        {/* qualifier tags on the slice */}
        {t > T.compressed - 0.35 && (
          <g>
            <g transform={`translate(560 ${830 - (1 - Math.min(1, back((tt - T.compressed + 0.35) / 0.3))) * 40})`}>
              <path d={torn(820, 74, "tg1", "lr", 4)} fill="#fffaf0" filter="url(#psh2)" />
              <text textAnchor="middle" y={12} fontFamily={TYPE} fontSize={35} fill={INK}>Real training sets: a filtered slice</text>
            </g>
          </g>
        )}
        {t > T.llm - 0.5 && (
          <g transform={`translate(600 ${930 - (1 - Math.min(1, back((tt - T.llm + 0.5) / 0.3))) * 40}) rotate(-1.5)`}>
            <path d={torn(640, 74, "tg2", "lr", 4)} fill="#dfeefb" filter="url(#psh2)" />
            <text textAnchor="middle" y={12} fontFamily={TYPE} fontSize={35} fill={INK}>~15T tokens of text (Llama 3)</text>
          </g>
        )}
        {/* marker arrow from the tag up to the strip */}
        {t > T.compressed && <path d={`M 240 790 C 170 700, 180 600, 250 ${STRIP.upY + 70}`} fill="none" stroke={RED} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pS(t, T.compressed + 0.2, 0.4)} />}
        {t > T.compressed + 0.6 && <path d={`M 228 ${STRIP.upY + 92} L 250 ${STRIP.upY + 68} L 276 ${STRIP.upY + 88}`} fill="none" stroke={RED} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />}
      </g>
      {t >= STRIP.cutT + CUT_DUR - 0.05 && <Strip t={t} idp="ck" />}
    </svg>
  );
};
