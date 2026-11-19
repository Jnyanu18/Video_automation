// Starter canvas (v6 staging): three pages that show every building block once. Replace with the new film's pages.
// Local coords of each page = the screen at zoom 1. Zones (he is the big cut-out bottom-left, head ~x 10-620, y 840+):
//   TOP band   x 50-940, y 220-760   (main graphic + the line being said)
//   RIGHT col  x 720-940, y 760-1300 (secondary graphic beside his head; nothing may cover his face)
//   captions   x 692-950, y 1300+   (drawn by Film, not here)
// Each page's first element is drawn 1.5 s before its beat, so a page never appears empty when the camera arrives.
// The full drug-discovery canvas (10 pages, protein/keys/gauge/bottle/confetti) is src/world-drug/pages.tsx.
import React from "react";
import { B } from "../beats";
import { progS } from "../lib";
import { K } from "./cues";
import { PG } from "./camera";
import { COL, INK, SANS, Stroke, Write, arrowD, checkD, ellipseD } from "../kit/ink";

type P = { t: number };
const At: React.FC<{ p: readonly [number, number]; children: React.ReactNode }> = ({ p, children }) => <g transform={`translate(${p[0]} ${p[1]})`}>{children}</g>;
const pre = (id: string) => B[id].s - 1.5;
const fade = (t: number, at: number, d = 0.25) => progS(t, at, d);

// "MADHAV'S TAKE": tags his opinion so it never reads as a reported fact.
export const TakeTag: React.FC<P & { at: number; x: number; y: number }> = ({ t, at, x, y }) => (
  <g opacity={fade(t, at)} transform={`rotate(-3 ${x} ${y})`}>
    <rect x={x} y={y - 40} width={262} height={56} rx={8} fill={COL.pink} />
    <text x={x + 131} y={y} fontSize={34} fontFamily={INK} fill="#111" textAnchor="middle" fontWeight={700}>MADHAV'S TAKE</text>
  </g>
);

// Anonymous IG DM question card (v6 format): "Anonymous", "?" avatar, paper-plane "IG question" label and the EXACT
// question he reads. No usernames, photos, timestamps or counts.
export const DmCard: React.FC<P & { at: number; x: number; y: number; w: number; lines: string[]; size?: number }> = ({ t, at, x, y, w, lines, size = 50 }) => {
  const k = fade(t, at, 0.3);
  if (k <= 0) return null;
  const h = 120 + lines.length * size * 1.18;
  return (
    <g opacity={k} transform={`translate(0 ${(1 - k) * 24})`}>
      <rect x={x} y={y} width={w} height={h} rx={34} fill="#17181f" stroke="#3a3c46" strokeWidth={3} />
      <circle cx={x + 52} cy={y + 52} r={26} fill="#2a2c35" stroke={COL.grey} strokeWidth={2} />
      <text x={x + 52} y={y + 64} fontSize={34} fontFamily={SANS} fontWeight={700} fill={COL.white} textAnchor="middle">?</text>
      <text x={x + 94} y={y + 62} fontSize={32} fontFamily={SANS} fontWeight={700} fill={COL.white}>Anonymous</text>
      <path d={`M${x + w - 210} ${y + 50} l30 -12 l-10 30 l-6 -12 Z`} fill={COL.cyan} />
      <text x={x + w - 168} y={y + 62} fontSize={28} fontFamily={SANS} fill={COL.cyan}>IG question</text>
      {lines.map((l, i) => (
        <text key={i} x={x + 40} y={y + 128 + i * size * 1.18} fontSize={size} fontFamily={SANS} fontWeight={600} fill={COL.white}>{l}</text>
      ))}
    </g>
  );
};

// ======================= hook: frame 0 = the designed cover headline, then the news card =======================
export const PageHook: React.FC<P> = ({ t }) => {
  const hk = 1 - fade(t, K.startup + 0.4, 0.3);
  const card = fade(t, K.startup + 0.4, 0.3);
  return (
    <At p={PG.hook}>
      {hk > 0 && (
        <g opacity={hk}>
          <text x={70} y={330} fontSize={84} fontFamily={INK} fontWeight={700} fill={COL.white}>OpenAI just bought</text>
          <text x={70} y={430} fontSize={84} fontFamily={INK} fontWeight={700} fill={COL.white}>a drug-discovery</text>
          <text x={70} y={540} fontSize={96} fontFamily={INK} fontWeight={700} fill={COL.yellow}>startup.</text>
          <path d="M74 566 Q240 556 420 572" stroke={COL.yellow} strokeWidth={8} fill="none" strokeLinecap="round" />
        </g>
      )}
      {card > 0 && (
        <g opacity={card}>
          <rect x={50} y={240} width={890} height={330} rx={24} fill="#15161c" stroke="#33353f" strokeWidth={3} />
          <rect x={82} y={268} width={150} height={46} rx={8} fill={COL.red} />
          <text x={157} y={304} fontSize={34} fontFamily={SANS} fontWeight={800} fill="#fff" textAnchor="middle" letterSpacing={2}>NEWS</text>
          <text x={82} y={410} fontSize={78} fontFamily={SANS} fontWeight={800} fill={COL.white}>OpenAI just bought</text>
          <text x={82} y={500} fontSize={78} fontFamily={SANS} fontWeight={800} fill={COL.yellow}>a startup</text>
        </g>
      )}
      {/* right column: a marker doodle that is already there on frame 0 */}
      <Stroke t={t} d={ellipseD(830, 900, 90, 60, 3)} at={-1} dur={0.4} c={COL.pink} w={7} />
      <Write t={t} x={830} y={918} at={-1} s="AI" size={56} c={COL.pink} weight={700} anchor="middle" />
    </At>
  );
};

// ======================= q: the question he reads, as an anonymous IG DM =======================
export const PageQ: React.FC<P> = ({ t }) => (
  <At p={PG.q}>
    <Write t={t} x={70} y={290} at={pre("q")} s="You asked:" size={54} c={COL.grey} />
    <DmCard t={t} at={B.q.s} x={60} y={330} w={880} lines={["Could AI find medicine", "faster?"]} size={60} />
    <Stroke t={t} d="M100 560 Q200 572 300 556" at={K.faster} dur={0.3} c={COL.yellow} w={7} />
    {/* right column: speed lines on the word */}
    <Stroke t={t} d="M740 860 L930 860 M770 910 L930 910 M800 960 L930 960" at={K.faster} dur={0.35} c={COL.cyan} w={7} />
    <Write t={t} x={730} y={1060} at={K.faster + 0.1} dur={0.35} s="FASTER?" size={56} c={COL.yellow} weight={700} />
  </At>
);

// ======================= take: his answer =======================
export const PageTake: React.FC<P> = ({ t }) => (
  <At p={PG.take}>
    <Write t={t} x={70} y={300} at={pre("take")} s="My answer:" size={58} c={COL.grey} />
    <Write t={t} x={500} y={620} at={K.yes + 0.3} dur={0.3} s="YES" size={220} c={COL.green} weight={700} anchor="middle" rot={-5} />
    <Stroke t={t} d={ellipseD(500, 550, 260, 140, 88)} at={K.yes + 0.5} dur={0.45} c={COL.green} w={9} />
    <Stroke t={t} d={checkD(840, 920, 1)} at={K.yes + 0.6} dur={0.25} c={COL.green} w={11} />
    <TakeTag t={t} at={K.yes + 0.7} x={690} y={1100} />
  </At>
);

// Red connector arrows between pages, drawn during the pans; all visible on the zoom-out map.
export const Connectors: React.FC<P> = ({ t }) => {
  const a1 = arrowD(PG.hook[0] + 960, PG.hook[1] + 400, PG.q[0] + 40, PG.q[1] + 400, -60, 36);
  const a2 = arrowD(PG.q[0] + 500, PG.q[1] + 1500, PG.take[0] + 700, PG.take[1] + 200, 80, 36);
  return (
    <g>
      <Stroke t={t} d={a1.body} at={B.q.s - 0.4} dur={0.5} c={COL.red} w={9} />
      <Stroke t={t} d={a1.head} at={B.q.s + 0.05} dur={0.15} c={COL.red} w={9} />
      <Stroke t={t} d={a2.body} at={B.take.s - 0.4} dur={0.5} c={COL.red} w={9} />
      <Stroke t={t} d={a2.head} at={B.take.s + 0.05} dur={0.15} c={COL.red} w={9} />
    </g>
  );
};
