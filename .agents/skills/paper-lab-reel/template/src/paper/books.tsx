// books: ten cloth books fan out, an open book's pages flip in stop-motion, a "copy every page"
// photocopier gets a red X on "mug up", red threads lift off the pages and knot into a pattern.
import React from "react";
import { smooth } from "../lib";
import { Dressing } from "./dressing";
import { BgImage, Defs, HAND, IMG, INK, RED, TYPE, back, boil, lerp, pS, rnd, torn, twos } from "./kit";
import { B, T } from "./T";

const CLOTH = ["#8e2b2b", "#24365e", "#2f5d45", "#c08a1e", "#1f6670", "#6b4429", "#5a2d55", "#4a5566", "#6b6b2a", "#a6492a"];
const BOOK_H = [270, 300, 250, 285, 310, 260, 295, 275, 305, 265];
const BOOK_W = [62, 74, 58, 80, 66, 70, 60, 84, 64, 72];

const Spine: React.FC<{ i: number; w: number; h: number }> = ({ i, w, h }) => (
  <g>
    <rect x={-w / 2} y={-h} width={w} height={h} rx={4} fill={CLOTH[i]} />
    {/* cloth weave */}
    {Array.from({ length: Math.floor(w / 6) }, (_, j) => <line key={j} x1={-w / 2 + 3 + j * 6} y1={-h + 2} x2={-w / 2 + 3 + j * 6} y2={-2} stroke="#000" strokeOpacity={0.07} strokeWidth={2} />)}
    <rect x={-w / 2} y={-h} width={w * 0.25} height={h} fill="#fff" opacity={0.08} />
    <rect x={-w / 2} y={-h + 22} width={w} height={5} fill="#e7c25a" />
    <rect x={-w / 2} y={-34} width={w} height={5} fill="#e7c25a" />
    <rect x={-w / 2 + 8} y={-h + 60} width={w - 16} height={h * 0.32} fill="#efe2c2" />
    {[0, 1, 2].map((j) => <rect key={j} x={-w / 2 + 14} y={-h + 74 + j * 18} width={w - 28 - j * 6} height={5} fill="#5a4a3a" opacity={0.7} />)}
  </g>
);

// lined page with typed text lines (w x h, top-left 0,0)
const Page: React.FC<{ w: number; h: number; seed: number; fill?: string }> = ({ w, h, seed, fill = "#fbf6e9" }) => (
  <g>
    <rect width={w} height={h} fill={fill} />
    {Array.from({ length: Math.floor((h - 50) / 20) }, (_, j) => <rect key={j} x={18} y={34 + j * 20} width={(w - 36) * (j % 7 === 6 ? 0.5 : 0.82 + 0.18 * rnd(`pg${seed}${j}`))} height={6} fill="#6f6658" opacity={0.55} />)}
  </g>
);

const OB = { x: 320, y: 850, pw: 265, ph: 360 }; // open book centre (spine), page size
const COPIER = { x: 855, y: 870 };
const KNOT = { x: 800, y: 760 };

const Copier: React.FC<{ t: number }> = ({ t }) => {
  const tt = twos(t);
  const running = t < T.mug + 0.1;
  const jig = running ? boil("cp", tt, 1.5) : 0;
  const sheets = Math.max(0, Math.min(9, Math.floor((tt - (T.turning + 0.3)) / 0.16)));
  return (
    <g transform={`translate(${COPIER.x + jig} ${COPIER.y}) scale(1.08)`} filter="url(#psh)">
      {/* body */}
      <rect x={-170} y={-120} width={340} height={260} rx={14} fill="#e9e6df" />
      <rect x={-170} y={60} width={340} height={80} rx={8} fill="#d6d2c8" />
      <rect x={-150} y={78} width={300} height={16} rx={4} fill="#bdb8ac" />
      <rect x={-150} y={104} width={300} height={16} rx={4} fill="#bdb8ac" />
      {/* lid + glass */}
      <rect x={-180} y={-150} width={360} height={36} rx={8} fill="#cfcac0" />
      <rect x={-150} y={-114} width={250} height={10} fill="#7fa6b8" />
      {/* control panel */}
      <rect x={60} y={-96} width={96} height={64} rx={6} fill="#c7c2b6" />
      <rect x={70} y={-88} width={46} height={22} fill="#87c08f" />
      {[0, 1, 2].map((j) => <circle key={j} cx={78 + j * 22} cy={-48} r={7} fill={j === 2 ? "#3aa35a" : "#8d877a"} />)}
      {/* paper out tray with identical copies stacking up */}
      <rect x={-250} y={-10} width={110} height={12} fill="#bdb8ac" />
      {Array.from({ length: sheets }, (_, j) => (
        <g key={j} transform={`translate(${-250 + (j === sheets - 1 && running ? 30 * (1 - ((tt * 15) % 3) / 3) : 0)} ${-16 - j * 4})`}>
          <rect x={0} y={-8} width={110} height={10} fill="#fbf6e9" stroke="#cfc6b2" strokeWidth={1} />
        </g>
      ))}
      {/* label */}
      <g transform="translate(-60 -40) rotate(-3)">
        <path d={torn(200, 46, "cplab", "lr", 3)} fill="#fffaf0" />
        <text textAnchor="middle" y={8} fontFamily={TYPE} fontSize={23} fill={INK}>copy every page</text>
      </g>
    </g>
  );
};

export const BooksScene: React.FC<{ t: number; fr: number }> = ({ t }) => {
  const tt = twos(t);
  const camS = 1 + 0.03 * smooth((t - B.books.s) / 8), camX = Math.sin(t * 0.19) * 8;
  // pile -> fan
  const pileIn = back((tt - (B.books.s - 0.05)) / 0.4, 1.4);
  const fan = (i: number) => smooth((tt - (T.ten - 0.1) - i * 0.06) / 0.45);
  const bookIn = back((tt - (T.page - 0.15)) / 0.4, 1.5);
  // page flips (stop-motion on twos), from "turn it" to "mug up"
  const flipT0 = T.turn - 0.05, flipDur = 0.32, nFlips = Math.floor((T.mug - 0.2 - flipT0) / flipDur);
  const fl = (tt - flipT0) / flipDur, flipI = Math.floor(fl), flipK = fl - flipI;
  const flipping = fl >= 0 && flipI < nFlips;
  const copierIn = back((tt - (T.turning + 0.05)) / 0.4, 1.3);
  const copierOut = smooth((t - (T.build1 - 0.4)) / 0.5);
  const x = pS(t, T.mug - 0.05, 0.3), x2 = pS(t, T.mug + 0.18, 0.3);
  const threads = pS(t, T.build1 - 0.2, 0.9), knot = pS(t, T.patterns - 0.15, 0.7);
  const rose = Array.from({ length: 181 }, (_, i) => { const a = (i / 180) * Math.PI * 2, r = 120 * Math.cos(2.5 * a * 2 / 2) * 0.9 + 18 * Math.sin(5 * a); return `${i ? "L" : "M"}${(KNOT.x + r * Math.cos(a)).toFixed(1)},${(KNOT.y + r * Math.sin(a)).toFixed(1)}`; }).join("");
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <BgImage src={IMG.board} t={t} dx={-20} />
      <Dressing spots={[{ x: 620, y: 1620, rot: -14, kind: 0 }, { x: 990, y: 1220, rot: 0, kind: 2 }, { x: 40, y: 1030, rot: 82, kind: 4 }, { x: 1040, y: 470, rot: 10, kind: 1 }]} />
      <g transform={`translate(${540 + camX} 900) scale(${camS}) translate(-540 -900)`}>
        {/* the ten books: a pile, then fanned out standing */}
        <g transform={`translate(0 ${(1 - Math.min(1, pileIn)) * -700}) translate(540 640) scale(1.3) translate(-540 -640)`}>
          {CLOTH.map((_, i) => {
            const k = fan(i);
            const pileX = 540, pileY = 640 - i * 34, fanA = -48 + (i / 9) * 96;
            const px = lerp(pileX - BOOK_H[i] / 2 + 150, 540, k), py = lerp(pileY + 30, 660, k);
            const ang = lerp(-90 + (rnd(`pa${i}`) - 0.5) * 6, fanA, k);
            return <g key={i} transform={`translate(${px} ${py}) rotate(${ang}) translate(0 ${-30 * k})`} filter="url(#psh)"><Spine i={i} w={BOOK_W[i]} h={BOOK_H[i]} /></g>;
          })}
        </g>
        {/* the open book */}
        {bookIn > 0.01 && <g transform={`translate(${(1 - Math.min(1, bookIn)) * -600} 0)`}>
          <g filter="url(#psh2)">
            <rect x={OB.x - OB.pw - 14} y={OB.y - OB.ph / 2 - 10} width={OB.pw * 2 + 28} height={OB.ph + 20} rx={6} fill="#2f5d45" />
          </g>
          <g transform={`translate(${OB.x - OB.pw} ${OB.y - OB.ph / 2})`}><Page w={OB.pw} h={OB.ph} seed={flipI + 1} /></g>
          <g transform={`translate(${OB.x} ${OB.y - OB.ph / 2})`}><Page w={OB.pw} h={OB.ph} seed={flipI + 40} /></g>
          <rect x={OB.x - 8} y={OB.y - OB.ph / 2} width={16} height={OB.ph} fill="url(#pgutter)" opacity={0.5} />
          <line x1={OB.x} y1={OB.y - OB.ph / 2} x2={OB.x} y2={OB.y + OB.ph / 2} stroke="#8a7d66" strokeWidth={2} />
          {flipping && (() => {
            // the turning page: right page rotating about the spine (cos foreshortening + lift)
            const c = Math.cos(flipK * Math.PI), wv = OB.pw * c, lift = Math.sin(flipK * Math.PI) * 26;
            const xe = OB.x + wv;
            const d = `M${OB.x},${OB.y - OB.ph / 2} Q${OB.x + wv * 0.6},${OB.y - OB.ph / 2 - lift} ${xe},${OB.y - OB.ph / 2 - lift * 0.6} L${xe},${OB.y + OB.ph / 2 - lift * 0.6} Q${OB.x + wv * 0.6},${OB.y + OB.ph / 2 - lift} ${OB.x},${OB.y + OB.ph / 2} Z`;
            return <g><path d={d} fill={c > 0 ? "#fbf6e9" : "#f1e8d2"} stroke="#c8bba0" strokeWidth={1.5} filter="url(#psh)" />
              {Math.abs(c) > 0.3 && Array.from({ length: 8 }, (_, j) => <line key={j} x1={OB.x + wv * 0.1} x2={OB.x + wv * 0.85} y1={OB.y - OB.ph / 2 + 40 + j * 28} y2={OB.y - OB.ph / 2 + 40 + j * 28} stroke="#6f6658" strokeOpacity={0.4} strokeWidth={5} />)}</g>;
          })()}
          {/* red threads lifting off the pages */}
          {threads > 0 && Array.from({ length: 6 }, (_, i) => {
            const sx = OB.x + (i < 3 ? -OB.pw * 0.7 + i * 60 : 40 + (i - 3) * 60), sy = OB.y - 60 + (i % 3) * 50;
            const a = (i / 6) * Math.PI * 2, ex = KNOT.x + Math.cos(a) * 110, ey = KNOT.y + Math.sin(a) * 110;
            const k = Math.max(0, Math.min(1, threads * 1.4 - i * 0.07));
            return <path key={i} d={`M${sx},${sy} C${sx + 60},${sy - 260 - i * 20} ${ex - 160},${ey - 220} ${ex},${ey}`} fill="none" stroke={RED} strokeWidth={4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k} opacity={0.9} />;
          })}
        </g>}
        {/* photocopier: copies every page, then crossed out */}
        {copierIn > 0.01 && copierOut < 1 && <g transform={`translate(${(1 - Math.min(1, copierIn)) * 600 + copierOut * 700} 0) rotate(${copierOut * 8} ${COPIER.x} ${COPIER.y})`}>
          <Copier t={t} />
          {x > 0 && <path d={`M${COPIER.x - 190},${COPIER.y - 170} L${COPIER.x + 190},${COPIER.y + 160}`} stroke={RED} strokeWidth={16} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - x} />}
          {x2 > 0 && <path d={`M${COPIER.x + 190},${COPIER.y - 170} L${COPIER.x - 190},${COPIER.y + 160}`} stroke={RED} strokeWidth={16} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - x2} />}
        </g>}
        {/* the knot: a pattern woven from the threads */}
        {knot > 0 && <g>
          <path d={rose} fill="none" stroke={RED} strokeWidth={5} strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - knot} />
          {knot > 0.95 && Array.from({ length: 5 }, (_, i) => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; return <circle key={i} cx={KNOT.x + Math.cos(a) * 70} cy={KNOT.y + Math.sin(a) * 70} r={9} fill={RED} />; })}
          <text x={KNOT.x} y={KNOT.y + 200} textAnchor="middle" fontFamily={HAND} fontSize={52} fill={INK} opacity={Math.min(1, knot * 2)}>a pattern</text>
        </g>}
      </g>
    </svg>
  );
};
