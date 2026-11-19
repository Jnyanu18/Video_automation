// The drawn canvas (v3), one page per beat. Local coords of each page = the screen at zoom 1.
// Zones (he is always the cut-out bottom-left): TOP band y 220-640 (x 50-940), RIGHT column x 580-940, y 660-1180.
// Each page's first element is drawn 1.5 s before its beat so no page ever appears empty.
import React from "react";
import { random } from "remotion";
import { B } from "./beats";
import { progS } from "../lib";
import { K } from "./cues";
import { PG } from "./camera";
import { Bottle, COL, INK, MONO, SANS, Stroke, Tag, Write, checkD, crossD, ellipseD } from "../kit/ink";

type P = { t: number };
const At: React.FC<{ p: readonly [number, number]; children: React.ReactNode }> = ({ p, children }) => <g transform={`translate(${p[0]} ${p[1]})`}>{children}</g>;
const pre = (id: string) => B[id].s - 1.5; // "already drawn when the page appears"
const fade = (t: number, at: number, d = 0.25) => progS(t, at, d);

const TakeTag: React.FC<P & { at: number; x: number; y: number }> = ({ t, at, x, y }) => (
  <g opacity={fade(t, at)} transform={`rotate(-3 ${x} ${y})`}>
    <rect x={x} y={y - 40} width={262} height={56} rx={8} fill={COL.pink} />
    <text x={x + 131} y={y} fontSize={34} fontFamily={INK} fill="#111" textAnchor="middle" fontWeight={700}>MADHAV'S TAKE</text>
  </g>
);

const Pill: React.FC<P & { at: number; x: number; y: number; s?: number; rot?: number }> = ({ t, at, x, y, s = 1, rot = -32 }) => {
  const w = 250 * s, h = 104 * s, r = h / 2;
  const left = `M${x} ${y - r} L${x - w / 2 + r} ${y - r} A${r} ${r} 0 0 0 ${x - w / 2 + r} ${y + r} L${x} ${y + r} Z`;
  const right = `M${x} ${y - r} L${x + w / 2 - r} ${y - r} A${r} ${r} 0 0 1 ${x + w / 2 - r} ${y + r} L${x} ${y + r}`;
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <Stroke t={t} d={left} at={at} dur={0.4} c={COL.pink} w={7} fill={COL.pink} fillOp={0.9} />
      <Stroke t={t} d={right} at={at + 0.25} dur={0.4} c={COL.white} w={7} fill="#1b1c22" />
    </g>
  );
};

const chip = (t: number, x: number, y: number, s: string, w: number, at: number, c: string = COL.white) => (
  <g opacity={fade(t, at)}>
    <rect x={x} y={y - 30} width={w} height={58} rx={29} fill="#23252d" stroke={c} strokeOpacity={0.6} strokeWidth={2} />
    <text x={x + w / 2} y={y + 12} fontSize={34} fontFamily={SANS} fill={c} textAnchor="middle" fontWeight={600}>{s}</text>
  </g>
);

// ======================= hook: the headline, then the news card =======================
export const PageHook: React.FC<P> = ({ t }) => {
  const hk = 1 - fade(t, 2.9, 0.3); // hook headline (frame 0 .. ~3 s)
  const card = fade(t, 3.0, 0.3);
  const x0 = 50, y0 = 236;
  return (
    <At p={PG.hook}>
      {hk > 0 && (
        <g opacity={hk}>
          <text x={70} y={305} fontSize={74} fontFamily={INK} fontWeight={700} fill={COL.white}>OpenAI just bought a</text>
          <text x={70} y={392} fontSize={74} fontFamily={INK} fontWeight={700} fill={COL.white}>drug-development startup.</text>
          <text x={70} y={500} fontSize={74} fontFamily={INK} fontWeight={700} fill={COL.yellow}>Your medicine could</text>
          <text x={70} y={590} fontSize={80} fontFamily={INK} fontWeight={700} fill={COL.green}>get cheaper.</text>
          <path d="M74 612 Q260 600 470 616" stroke={COL.green} strokeWidth={8} fill="none" strokeLinecap="round" />
        </g>
      )}
      {card > 0 && (
        <g opacity={card}>
          <rect x={x0 + 8} y={y0 + 12} width={900} height={396} rx={24} fill="#000" opacity={0.5} />
          <rect x={x0} y={y0} width={900} height={396} rx={24} fill="#15161c" stroke="#33353f" strokeWidth={3} />
          <rect x={x0 + 32} y={y0 + 28} width={150} height={46} rx={8} fill={COL.red} />
          <text x={x0 + 107} y={y0 + 64} fontSize={34} fontFamily={SANS} fontWeight={800} fill="#fff" textAnchor="middle" letterSpacing={2}>NEWS</text>
          <text x={x0 + 200} y={y0 + 64} fontSize={34} fontFamily={MONO} fill={COL.grey}>OCT 20, 2026 · AI</text>
          <text x={x0 + 32} y={y0 + 160} fontSize={80} fontFamily={SANS} fontWeight={800} fill={COL.white}>OpenAI just bought</text>
          <text x={x0 + 32} y={y0 + 250} fontSize={80} fontFamily={SANS} fontWeight={800} fill={COL.yellow}>Orchestra Bio</text>
          <text x={x0 + 32} y={y0 + 316} fontSize={36} fontFamily={SANS} fill="#c9cbd3">San Francisco startup, founded 2022</text>
          <text x={x0 + 32} y={y0 + 364} fontSize={36} fontFamily={SANS} fill={COL.cyan} fontWeight={600}>joins OpenAI's Rosalind unit</text>
        </g>
      )}
      {/* right column: frame 0 = a pill doodle; then what Orchestra's agents do */}
      <g opacity={1 - fade(t, K.agents - 0.2)}>
        <Pill t={t} at={-1} x={760} y={830} s={1.1} />
        <Write t={t} x={640} y={1010} at={-1} s="$$$ → $ ?" size={56} c={COL.green} weight={700} />
      </g>
      <Write t={t} x={590} y={720} at={K.agents - 0.1} s="AI agents that keep" size={40} />
      <Write t={t} x={590} y={770} at={K.drugdev - 0.1} s="drug development" size={44} c={COL.yellow} weight={700} />
      <Write t={t} x={590} y={820} at={K.track - 0.1} s="on track:" size={44} c={COL.yellow} weight={700} />
      {chip(t, 590, 900, "monitor studies", 300, K.track)}
      {chip(t, 590, 975, "track finances", 300, K.track + 0.15)}
      {chip(t, 590, 1050, "trial schedules", 300, K.track + 0.3)}
    </At>
  );
};

// ======================= years: 10-15 years to approval; AI could change that =======================
export const PageYears: React.FC<P> = ({ t }) => {
  const ticks = Array.from({ length: 15 }, (_, i) => 130 + i * 52);
  const tk = progS(t, K.takes, 0.9, (x) => x);
  return (
    <At p={PG.years}>
      <Write t={t} x={70} y={300} at={pre("years")} s="a new medicine" size={52} />
      <Write t={t} x={420} y={300} at={pre("years")} s="→ approved" size={52} c={COL.green} />
      <Pill t={t} at={pre("years")} x={110} y={420} s={0.5} />
      <Stroke t={t} d="M170 420 L880 420" at={pre("years")} dur={0.4} c={COL.white} w={6} />
      <Stroke t={t} d={checkD(910, 410, 0.7)} at={K.approved} dur={0.3} c={COL.green} w={9} />
      {ticks.map((x, i) => (i / 15 < tk ? <path key={i} d={`M${x + 50} 400 L${x + 50} 440`} stroke={COL.yellow} strokeWidth={5} strokeLinecap="round" /> : null))}
      <Write t={t} x={490} y={560} at={K.takes + 0.2} dur={0.4} s="10-15 YEARS" size={96} c={COL.yellow} weight={700} anchor="middle" />
      {/* right column: AI could change that */}
      <Stroke t={t} d="M660 700 L860 700 L760 800 Z M660 900 L860 900 L760 800 Z" at={K.years - 0.3} dur={0.5} c={COL.white} w={6} />
      <path d="M700 880 L820 880 L760 830 Z" fill={COL.yellow} opacity={fade(t, K.years)} />
      <Write t={t} x={600} y={1000} at={K.aiCould} s="AI could" size={50} />
      <Write t={t} x={600} y={1070} at={K.aiCould + 0.3} s="change that" size={56} c={COL.green} weight={700} />
      <Stroke t={t} d="M600 1095 Q760 1085 900 1100" at={K.aiCould + 0.7} dur={0.3} c={COL.green} w={6} />
    </At>
  );
};

// ======================= q: could AI help find medicine faster? yes =======================
export const PageQ: React.FC<P> = ({ t }) => (
  <At p={PG.q}>
    <Write t={t} x={70} y={310} at={pre("q")} s="Could AI find life-saving" size={58} />
    <Write t={t} x={70} y={420} at={K.faster - 0.3} dur={0.45} s="medicine FASTER?" size={86} c={COL.yellow} weight={700} />
    <Pill t={t} at={K.lifesaving} x={600} y={540} s={0.7} rot={-10} />
    <Stroke t={t} d="M330 515 L470 515 M300 545 L470 545 M340 575 L470 575" at={K.faster} dur={0.3} c={COL.cyan} w={6} />
    <Write t={t} x={600} y={830} at={K.yes + 0.3} dur={0.3} s="YES" size={130} c={COL.green} weight={700} rot={-6} />
    <Stroke t={t} d={ellipseD(720, 790, 150, 90, 88)} at={K.yes + 0.5} dur={0.4} c={COL.green} w={8} />
    <TakeTag t={t} at={K.yes + 0.6} x={600} y={980} />
  </At>
);

// ======================= patt: pattern recognition =======================
const GRID = Array.from({ length: 24 }, (_, i) => ({ c: i % 8, r: Math.floor(i / 8) }));
const PATT = [[0, 2], [1, 1], [2, 0], [3, 1], [4, 2], [5, 1], [6, 0], [7, 1]];
export const PagePatt: React.FC<P> = ({ t }) => {
  const gx = (c: number) => 120 + c * 110, gy = (r: number) => 400 + r * 80;
  const lensK = progS(t, K.reallyGood + 0.3, K.recog + 0.5 - K.reallyGood - 0.3);
  const lx = 120 + lensK * 770, ly = 480;
  return (
    <At p={PG.patt}>
      <Write t={t} x={70} y={300} at={pre("patt")} s="AI is really good at…" size={60} c={COL.yellow} />
      {GRID.map((g, i) => {
        const on = PATT.some(([c, r]) => c === g.c && r === g.r) ? progS(t, K.patt + g.c * 0.05, 0.2) : 0;
        return <circle key={i} cx={gx(g.c)} cy={gy(g.r)} r={11 + on * 8} fill={on > 0.5 ? COL.cyan : "none"} stroke={on > 0 ? COL.cyan : COL.white} strokeWidth={5} opacity={fade(t, pre("patt"))} />;
      })}
      <Stroke t={t} d={"M" + PATT.map(([c, r]) => `${gx(c)} ${gy(r)}`).join(" L")} at={K.patt} dur={0.5} c={COL.cyan} w={7} />
      {t > K.reallyGood + 0.3 && (
        <g opacity={1 - fade(t, K.recog + 0.5, 0.3)}>
          <circle cx={lx} cy={ly} r={62} fill={COL.cyan} fillOpacity={0.08} stroke={COL.white} strokeWidth={7} />
          <path d={`M${lx + 44} ${ly + 44} L${lx + 92} ${ly + 92}`} stroke={COL.white} strokeWidth={14} strokeLinecap="round" />
        </g>
      )}
      <Write t={t} x={600} y={760} at={K.patt} dur={0.35} s="PATTERN" size={84} c={COL.pink} weight={700} />
      <Write t={t} x={600} y={840} at={K.recog} dur={0.4} s="RECOGNITION" size={54} c={COL.pink} weight={700} />
      <Stroke t={t} d={ellipseD(760, 790, 200, 95, 11)} at={K.recog + 0.35} dur={0.4} c={COL.red} w={6} />
    </At>
  );
};

// ======================= protein: the pattern that fits; brute force; it sticks =======================
const PROTEIN = "M160 820 C150 740 260 712 340 728 C400 740 440 722 470 722 C470 800 610 800 610 722 C660 712 720 745 790 730 C880 712 950 770 930 850 C915 930 960 990 880 1040 C800 1085 700 1040 620 1060 C520 1085 430 1050 360 1065 C260 1085 150 1040 170 960 C180 910 165 870 160 820 Z";
const HELIX1 = "M220 900 q40 -60 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0";
const HELIX2 = "M260 990 q30 40 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0";
// protein transform: old art (x 150-960, y 712-1085) -> top band x ~180-830, y ~410-634
const PT = "translate(60 -17) scale(0.8 0.6)";
const pX = (x: number) => 60 + x * 0.8, pY = (y: number) => -17 + y * 0.6;
const BASES = [
  "M-34 10 L0 62 L34 10 Z", "M-40 10 L40 10 L40 60 L-40 60 Z", "M-50 10 L-50 60 M-50 10 L50 10 L50 60",
  "M-80 10 L80 10 L80 40 L-80 40 Z", "M-62 10 C-62 82 62 82 62 10 Z",
];
const MOL_COL = [COL.yellow, COL.pink, COL.white, COL.cyan, COL.green];
const hexD = (x: number, y: number, r: number) => "M" + Array.from({ length: 7 }, (_, i) => `${x + r * Math.cos((i * Math.PI) / 3)} ${y + r * Math.sin((i * Math.PI) / 3)}`).join(" L");
const Molecule: React.FC<{ i: number; t: number; at: number }> = ({ i, t, at }) => (
  <g>
    <Stroke t={t} d={hexD(0, -48, 30)} at={at} dur={0.25} c={MOL_COL[i]} w={6} />
    <Stroke t={t} d={hexD(i % 2 ? 46 : -46, -66, 22)} at={at + 0.08} dur={0.2} c={MOL_COL[i]} w={5} />
    <Stroke t={t} d="M0 -18 L0 10" at={at + 0.15} dur={0.1} c={MOL_COL[i]} w={6} />
    <Stroke t={t} d={BASES[i]} at={at + 0.2} dur={0.25} c={MOL_COL[i]} w={6} fill={MOL_COL[i]} fillOp={0.25} />
  </g>
);
export const PageProtein: React.FC<P> = ({ t }) => {
  const SL = [[660, 900], [840, 900], [660, 1060], [840, 1060]] as const; // waiting slots (right column)
  const pocket = [pX(540), pY(780)] as const;
  const dockY = pocket[1] - 62 * 0.7;
  const tryAt = (i: number) => K.brute + 0.5 + i * ((K.soThe - (K.brute + 0.5)) / 4);
  const fitT = K.sticks;
  const fitted = t >= fitT;
  const chipT = K.body - 0.15;
  const colOut = 1 - fade(t, chipT - 0.3, 0.3); // the right column clears for the fact chip
  const tries = t < K.brute ? 0 : Math.floor(Math.pow(10, Math.min(5.5, (t - K.brute) * 1.4)));
  return (
    <At p={PG.protein}>
      <Write t={t} x={60} y={300} at={pre("protein")} s="finding a medicine =" size={50} />
      <Write t={t} x={500} y={300} at={K.rightPatt} dur={0.5} s="the pattern that FITS" size={50} c={COL.yellow} />
      <g transform={PT}>
        <Stroke t={t} d={PROTEIN} at={K.finding} dur={1.0} c={COL.cyan} w={10} fill="#0d2a33" fillOp={0.6} />
        <Stroke t={t} d={HELIX1} at={K.finding + 0.6} dur={0.8} c={COL.pink} w={9} />
        <Stroke t={t} d={HELIX2} at={K.finding + 0.8} dur={0.8} c={COL.cyan} w={6} op={0.7} />
      </g>
      <Write t={t} x={200} y={pY(880)} at={K.protein} s="PROTEIN" size={38} c={COL.cyan} weight={700} />
      <Stroke t={t} d={ellipseD(pocket[0], pocket[1] - 10, 80, 42, 21)} at={K.fits} dur={0.35} c={COL.red} w={6} op={fitted ? 0 : 1} />
      {/* right column: brute force */}
      <g opacity={colOut}>
        <Write t={t} x={590} y={720} at={K.brute} dur={0.35} s="BRUTE FORCE" size={60} c={COL.yellow} weight={700} />
        {t >= K.brute && <text x={592} y={775} fontSize={36} fontFamily={MONO} fill={COL.white}>tries: {tries.toLocaleString("en-US")}</text>}
        <Write t={t} x={592} y={1170} at={K.allProt} s="× every structure" size={38} c={COL.white} op={0.85} />
      </g>
      {[0, 1, 2, 3, 4].map((i) => {
        const at = K.brute + i * 0.08;
        if (t < at) return null;
        let x: number, y: number, op = colOut;
        if (i < 4) {
          const a = tryAt(i), k1 = progS(t, a, 0.25), k2 = progS(t, a + 0.45, 0.25);
          x = SL[i][0] + (pocket[0] - SL[i][0]) * k1 * (1 - k2);
          y = SL[i][1] + (dockY - 30 - SL[i][1]) * k1 * (1 - k2);
          if (t > a + 0.45) op *= 0.35;
        } else {
          const k1 = progS(t, K.soThe + 0.1, fitT - K.soThe - 0.1);
          x = 750 + (pocket[0] - 750) * k1; y = 1060 + (dockY - 1060) * k1 - Math.sin(Math.PI * k1) * 120;
          op = 1;
        }
        return (
          <g key={i} opacity={op} transform={`translate(${x} ${y}) scale(0.7)`}>
            <Molecule i={i} t={t} at={at} />
          </g>
        );
      })}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} opacity={colOut}><Stroke t={t} d={crossD(SL[i][0] + 45, SL[i][1] - 70, 0.7)} at={tryAt(i) + 0.4} dur={0.15} c={COL.red} w={7} /></g>
      ))}
      {fitted && (
        <g>
          <circle cx={pocket[0]} cy={pocket[1]} r={60 + 200 * progS(t, fitT, 0.5)} fill="none" stroke={COL.green} strokeWidth={8} opacity={1 - progS(t, fitT, 0.5)} />
          <Stroke t={t} d={checkD(860, 375, 0.9)} at={fitT + 0.05} dur={0.25} c={COL.green} w={11} />
          <Write t={t} x={640} y={392} at={fitT + 0.1} dur={0.3} s="FITS!" size={64} c={COL.green} weight={700} />
        </g>
      )}
      {/* fact chip: his brute-force picture is a simplification */}
      <g opacity={fade(t, chipT, 0.3)}>
        <rect x={585} y={830} width={360} height={250} rx={22} fill="#15161c" stroke={COL.yellow} strokeWidth={3} />
        <text x={610} y={885} fontSize={38} fontFamily={SANS} fontWeight={700} fill={COL.yellow}>Simplified:</text>
        <text x={610} y={935} fontSize={35} fontFamily={SANS} fill={COL.white}>new drugs still take</text>
        <text x={610} y={985} fontSize={35} fontFamily={SANS} fill={COL.white}>10-15 years</text>
        <text x={610} y={1035} fontSize={35} fontFamily={SANS} fill={COL.white}>to approval</text>
      </g>
      <TakeTag t={t} at={chipT + 0.3} x={600} y={1160} />
    </At>
  );
};

// ======================= market: highest penetration in drug discovery =======================
export const PageMarket: React.FC<P> = ({ t }) => {
  const needle = -Math.PI + Math.PI * 0.92 * progS(t, K.penetration, 0.6);
  return (
    <At p={PG.market}>
      <TakeTag t={t} at={pre("market")} x={70} y={290} />
      <Write t={t} x={70} y={380} at={pre("market")} s="where AI hits hardest:" size={54} />
      <Write t={t} x={70} y={490} at={K.market - 0.35} dur={0.45} s="DRUG DISCOVERY" size={96} c={COL.yellow} weight={700} />
      <Stroke t={t} d="M80 520 Q420 540 760 515" at={K.market + 0.15} dur={0.35} c={COL.yellow} w={7} />
      {/* right column: a penetration gauge */}
      <Stroke t={t} d="M600 900 A160 160 0 0 1 920 900" at={K.highest - 0.3} dur={0.5} c={COL.white} w={8} />
      <Stroke t={t} d="M840 790 A160 160 0 0 1 920 900" at={K.highest} dur={0.3} c={COL.green} w={14} />
      {t > K.highest && <path d={`M760 900 L${760 + 130 * Math.cos(needle)} ${900 + 130 * Math.sin(needle)}`} stroke={COL.pink} strokeWidth={10} strokeLinecap="round" />}
      <circle cx={760} cy={900} r={14} fill={COL.pink} opacity={fade(t, K.highest)} />
      <Write t={t} x={760} y={980} at={K.penetration} s="AI penetration" size={44} anchor="middle" />
      <Write t={t} x={760} y={1050} at={K.penetration + 0.4} s="HIGHEST" size={58} c={COL.green} weight={700} anchor="middle" />
    </At>
  );
};

// ======================= cheaper: a lot of medicine will be cheaper =======================
export const PageCheaper: React.FC<P> = ({ t }) => (
  <At p={PG.cheaper}>
    <Write t={t} x={70} y={310} at={pre("cheaper")} s="a lot of medicine will be" size={56} />
    <Write t={t} x={70} y={450} at={K.cheaper - 0.35} dur={0.4} s="CHEAPER" size={120} c={COL.green} weight={700} />
    <Stroke t={t} d="M76 482 Q300 500 560 476" at={K.cheaper + 0.1} dur={0.3} c={COL.green} w={8} />
    <Bottle t={t} at={pre("cheaper")} x={690} y={1000} h={230} label="Rx" />
    <Tag t={t} at={pre("cheaper")} x={760} y={760} s="$$$" rot={-8} w={170} size={54} />
    <Stroke t={t} d={crossD(855, 760, 1.9)} at={K.medCheaper + 0.4} dur={0.3} c={COL.red} w={10} />
    <Tag t={t} at={K.cheaper - 0.1} x={790} y={890} s="$" c={COL.green} w={110} size={56} rot={-4} />
  </At>
);

// ======================= keys: millions of keys, one fits the lock =======================
const keyD = "M-28 0 a22 22 0 1 0 0.1 0 M-6 0 L62 0 M44 0 L44 16 M56 0 L56 12";
export const PageKeys: React.FC<P> = ({ t }) => {
  const LK = [250, 470] as const; // lock centre
  const open = fade(t, K.fitsLock + 0.3, 0.3);
  const fly = progS(t, K.theOne, K.fitsLock + 0.2 - K.theOne);
  const fan = Array.from({ length: 21 }, (_, i) => ({ x: 470 + (i % 7) * 68, y: 330 + Math.floor(i / 7) * 92, r: (random(`k${i}`) - 0.5) * 50 }));
  return (
    <At p={PG.keys}>
      {/* the lock (= the protein) */}
      <path d={`M${LK[0] - 60} ${LK[1] - 40} L${LK[0] - 60} ${LK[1] - 100 - open * 40} A60 60 0 0 1 ${LK[0] + 60} ${LK[1] - 100 - open * 40} L${LK[0] + 60} ${LK[1] - 70 - open * 40}`} fill="none" stroke={open > 0.5 ? COL.green : COL.cyan} strokeWidth={14} strokeLinecap="round" opacity={fade(t, pre("keys"))} />
      <Stroke t={t} d={`M${LK[0] - 100} ${LK[1] - 40} L${LK[0] + 100} ${LK[1] - 40} L${LK[0] + 100} ${LK[1] + 130} L${LK[0] - 100} ${LK[1] + 130} Z`} at={pre("keys")} dur={0.4} c={open > 0.5 ? COL.green : COL.cyan} w={8} fill="#0b1b24" />
      <path d={`M${LK[0]} ${LK[1] + 20} a16 16 0 1 0 0.1 0 M${LK[0]} ${LK[1] + 50} L${LK[0]} ${LK[1] + 85}`} stroke={COL.white} strokeWidth={8} fill="none" strokeLinecap="round" opacity={fade(t, pre("keys"))} />
      {/* millions of keys */}
      {fan.map((k, i) => (
        <g key={i} opacity={fade(t, K.millions - 0.1, 0.3) * (t > K.theOne ? 0.35 : 0.9)} transform={`translate(${k.x} ${k.y}) rotate(${k.r}) scale(0.7)`}>
          <path d={keyD} stroke={COL.grey} strokeWidth={7} fill="none" strokeLinecap="round" />
        </g>
      ))}
      <Write t={t} x={480} y={610} at={K.keys} dur={0.4} s="MILLIONS OF KEYS" size={58} c={COL.yellow} weight={700} />
      {/* the one */}
      {t > K.theOne - 0.1 && (
        <g transform={`translate(${880 + (LK[0] + 10 - 880) * fly} ${430 + (LK[1] + 70 - 430) * fly - Math.sin(Math.PI * fly) * 90}) rotate(${180 - 180 * fly}) scale(1.1)`}>
          <path d={keyD} stroke={COL.green} strokeWidth={9} fill="none" strokeLinecap="round" />
        </g>
      )}
      <Stroke t={t} d={checkD(LK[0] + 140, LK[1] - 120, 1)} at={K.fitsLock + 0.35} dur={0.25} c={COL.green} w={11} />
      {/* right column: the analogy, labelled */}
      <Write t={t} x={600} y={760} at={K.like} s="key = molecule" size={46} c={COL.pink} />
      <Write t={t} x={600} y={840} at={K.like + 0.4} s="lock = protein" size={46} c={COL.cyan} />
      <Write t={t} x={600} y={960} at={K.theOne} s="find the ONE" size={52} c={COL.green} weight={700} />
      <Write t={t} x={600} y={1030} at={K.fitsLock} s="that fits" size={52} c={COL.green} weight={700} />
    </At>
  );
};

// ======================= live: humans will live longer; more to celebrate =======================
const HEART = "M760 900 C700 850 630 805 640 745 C648 690 725 680 760 735 C795 680 872 690 880 745 C890 805 820 850 760 900 Z";
export const PageLive: React.FC<P> = ({ t }) => {
  const ck = progS(t, K.celebrate, 0.9);
  const conf = Array.from({ length: 34 }, (_, i) => ({
    a: random(`ca${i}`) * Math.PI * 2, d: 90 + random(`cd${i}`) * 300, c: [COL.yellow, COL.pink, COL.cyan, COL.green, COL.white][i % 5], kind: i % 3, rot: random(`cr${i}`) * 360,
  }));
  return (
    <At p={PG.live}>
      <Stroke t={t} d="M70 420 L300 420 L340 340 L385 495 L430 380 L470 420 L640 420 Q800 410 920 290" at={pre("live")} dur={0.7} c={COL.green} w={10} />
      <Stroke t={t} d="M870 290 L922 286 L915 340" at={pre("live") + 0.6} dur={0.2} c={COL.green} w={10} />
      <Write t={t} x={70} y={310} at={K.humans} dur={0.4} s="humans will" size={56} />
      <Write t={t} x={70} y={610} at={K.longer - 0.1} dur={0.4} s="LIVE LONGER" size={92} c={COL.green} weight={700} />
      {/* right column */}
      <g transform={`translate(760 820) scale(${1 + 0.08 * Math.sin(Math.PI * progS(t, K.celebrate, 0.4, (x) => x))}) translate(-760 -820)`}>
        <Stroke t={t} d={HEART} at={K.weHave - 0.1} dur={0.6} c={COL.pink} w={9} fill={COL.pink} fillOp={0.35} />
      </g>
      <Write t={t} x={600} y={990} at={K.weHave + 0.3} s="a lot more to" size={46} />
      <Write t={t} x={600} y={1075} at={K.celebrate - 0.1} dur={0.4} s="CELEBRATE" size={70} c={COL.yellow} weight={700} />
      {ck > 0 && conf.map((p, i) => {
        const x = 760 + Math.cos(p.a) * p.d * ck, y = 820 + Math.sin(p.a) * p.d * 0.8 * ck + ck * ck * 40;
        if (x < 580 || y < 240 || y > 1180) return null;
        return p.kind === 0
          ? <circle key={i} cx={x} cy={y} r={7} fill={p.c} />
          : <path key={i} d={p.kind === 1 ? `M${x - 12} ${y} L${x + 12} ${y}` : `M${x - 14} ${y} q7 -12 14 0 t14 0`} stroke={p.c} strokeWidth={6} fill="none" strokeLinecap="round" transform={`rotate(${p.rot + ck * 160} ${x} ${y})`} />;
      })}
    </At>
  );
};

// ======================= comment: would you trust a medicine designed by AI? =======================
export const PageComment: React.FC<P> = ({ t }) => (
  <At p={PG.comment}>
    <Write t={t} x={70} y={320} at={pre("comment")} s="Would you trust a medicine" size={60} />
    <Write t={t} x={70} y={430} at={K.designed - 0.2} dur={0.45} s="designed by AI?" size={96} c={COL.yellow} weight={700} />
    {/* AI-designed pill: a capsule with a circuit trace */}
    <Pill t={t} at={K.designed} x={330} y={560} s={0.75} rot={-6} />
    <Stroke t={t} d="M470 560 L560 560 L590 530 L680 530 M560 560 L600 600 L700 600" at={K.designed + 0.3} dur={0.4} c={COL.cyan} w={5} />
    {/* right column: Instagram-style comment sheet (no usernames, no counts) */}
    <g opacity={fade(t, pre("comment"))}>
      <rect x={585} y={680} width={355} height={470} rx={28} fill="#16171d" stroke="#3a3c46" strokeWidth={3} />
      <rect x={727} y={696} width={70} height={7} rx={4} fill="#55575f" />
      <text x={762} y={752} fontSize={36} fontFamily={SANS} fontWeight={700} fill={COL.white} textAnchor="middle">Comments</text>
      <path d="M605 772 L920 772" stroke="#2c2e36" strokeWidth={2} />
      <rect x={605} y={1070} width={315} height={60} rx={30} fill="#23252d" stroke="#3a3c46" strokeWidth={2} />
      <text x={630} y={1112} fontSize={34} fontFamily={SANS} fill={COL.grey}>Add a comment…</text>
    </g>
    <g opacity={fade(t, K.trust + 0.6)}>
      <path d="M612 800 h300 a18 18 0 0 1 18 18 v86 a18 18 0 0 1 -18 18 h-240 l-28 26 v-26 h-32 a18 18 0 0 1 -18 -18 v-86 a18 18 0 0 1 18 -18 Z" fill="#23252d" stroke={COL.yellow} strokeWidth={3} />
      <text x={628} y={850} fontSize={34} fontFamily={SANS} fill={COL.white}>Would you trust</text>
      <text x={628} y={892} fontSize={34} fontFamily={SANS} fill={COL.white}>AI medicine?</text>
    </g>
    {chip(t, 612, 1002, "YES", 140, K.comment - 0.2, COL.green)}
    {chip(t, 772, 1002, "NO", 140, K.comment - 0.05, COL.red)}
    <Stroke t={t} d="M880 960 Q930 1010 900 1060 M880 1046 L900 1062 L922 1042" at={K.comment} dur={0.35} c={COL.pink} w={7} />
  </At>
);
