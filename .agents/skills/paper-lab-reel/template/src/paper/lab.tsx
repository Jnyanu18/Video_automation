// network + rules + sizes on the cream board: the strip unravels into scraps that run through a pencil
// network and collapse onto one inked curve; then a paper stack folds into the gold cube (true scale 4.2:1).
import React from "react";
import { random } from "remotion";
import { smooth } from "../lib";
import { GoldCube, Sparkle } from "./cube";
import { Dressing } from "./dressing";
import { Strip, STRIP } from "./cork";
import { BgImage, Defs, HAND as HANDF, IMG, INK, PAPERS, RED, Scrap, TYPE, back, boil, circlePath, lerp, pS, rnd, torn, twos } from "./kit";
import { B, HAND, T } from "./T";

// ---------- geometry ----------
export const CLOUD = { x0: 70, x1: 1010, y0: 500, y1: 660 };
export const NET = { x0: 250, x1: 830, y0: 700, y1: 890, cols: [3, 5, 5, 3] };
export const OUTC = { x0: 500, x1: 990, y0: 980, y1: 1150 };
const curveY = (x: number) => (OUTC.y0 + OUTC.y1) / 2 + 52 * Math.sin(((x - OUTC.x0) / (OUTC.x1 - OUTC.x0)) * Math.PI * 2.2);
const nodes = NET.cols.flatMap((n, c) => {
  const x = NET.x0 + (c / (NET.cols.length - 1)) * (NET.x1 - NET.x0);
  return Array.from({ length: n }, (_, j) => ({ c, j, x, y: NET.y0 + ((j + 0.5) / n) * (NET.y1 - NET.y0) }));
});
const SNIPS = ["Wikipedia", "def sort(a):", "Gandhi", "r/askscience", "Beijing", "the moon", "x + y = z", "arXiv", "Ch. IV", "<html>", "E = mc²", "news", "recipe", "cats", "poem"];
const N = 96;
const PTS = Array.from({ length: N }, (_, i) => {
  const sx = CLOUD.x0 + random(`lsx${i}`) * (CLOUD.x1 - CLOUD.x0), sy = CLOUD.y0 + random(`lsy${i}`) * (CLOUD.y1 - CLOUD.y0);
  const tx = OUTC.x0 + 24 + random(`ltx${i}`) * (OUTC.x1 - OUTC.x0 - 48);
  return { sx, sy, tx, ty: curveY(tx) + (random(`lty${i}`) - 0.5) * 12, k: Math.floor(random(`lk${i}`) * 4), born: i / N };
});

const STRIP_START = B.network.s + 0.25, STRIP_DUR = 3.4; // the strip unravels into scraps
const FLOW0 = B.rules.s + 0.1, FLOW1 = T.rules + 0.1;    // the cloud collapses onto the curve
const COLS = [T.trained + 0.05, T.neural + 0.15, T.pattern, T.recognize];

// position of scrap i at time t
const scrapAt = (p: (typeof PTS)[number], i: number, t: number) => {
  const born = STRIP_START + p.born * STRIP_DUR;
  if (t < born) return null;
  const ex = 1086 * (1 - p.born); // tear edge when this scrap was born
  const fly = smooth((t - born) / 0.7);
  const hx = p.sx + Math.sin(t * 1.3 + i) * 10, hy = p.sy + Math.cos(t * 1.1 + i * 1.7) * 8;
  let x = lerp(ex, hx, fly), y = lerp(STRIP.upY, hy, fly) - Math.sin(fly * Math.PI) * 60;
  // rules: phase-staggered flow through the network waist to the curve
  const F = ((t - FLOW0) / (FLOW1 - FLOW0)) * 1.125;
  const ph = Math.min(1, Math.max(0, F * 2 - random(`lph${i}`) * 1.25));
  if (ph > 0) {
    const e = ph < 0.5 ? 2 * ph * ph : 1 - Math.pow(-2 * ph + 2, 2) / 2;
    const mx = (NET.x0 + NET.x1) / 2 + (random(`lmx${i}`) - 0.5) * 240, my = (NET.y0 + NET.y1) / 2, a = 1 - e;
    x = a * a * x + 2 * a * e * mx + e * e * p.tx; y = a * a * y + 2 * a * e * my + e * e * p.ty;
  }
  return { x, y, ph, fly };
};

// ---------- the ruler gauge (internet -> training -> weights) ----------
const GL = [{ x: 238, w: 330, at: T.raw - 0.1 }, { x: 560, w: 250, at: T.llm }, { x: 878, w: 250, at: T.tb }];
export const Gauge: React.FC<{ t: number }> = ({ t }) => {
  const tt = twos(t);
  const inK = back((tt - (T.raw - 0.2)) / 0.35, 1.5), out = smooth((t - (HAND.outTile - 0.3)) / 0.5);
  const y = 250 - (1 - Math.min(1, inK)) * 160 - out * 260;
  const sel = t < GL[1].at + 0.2 ? 0 : t < GL[2].at + 0.2 ? 1 : 2;
  const from = GL[Math.max(0, sel - 1)], to = GL[sel];
  const mv = sel === 0 ? 1 : smooth((t - (to.at + 0.2 - 0.05)) / 0.35);
  const cx = lerp(from.x, to.x, mv), cw = lerp(from.w, to.w, mv);
  const circ = pS(t, T.internet, 0.4);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <g transform={`translate(0 ${y}) rotate(-1 540 46)`}>
        <rect x={60} y={0} width={960} height={92} fill="#f7d774" filter="url(#psh)" />
        {Array.from({ length: 41 }, (_, i) => <line key={i} x1={72 + i * 23.4} y1={0} x2={72 + i * 23.4} y2={i % 5 ? 16 : 26} stroke={INK} strokeWidth={2} />)}
        {GL.map((g, i) => {
          const k = Math.max(0, Math.min(1, (tt - g.at) / 0.4));
          if (k <= 0) return null;
          const txt = ["internet: zettabytes", "training ~60 TB", "weights ~0.8 TB"][i];
          return <text key={i} x={g.x} y={70} textAnchor="middle" fontFamily={TYPE} fontSize={26} fill={INK}>{txt.slice(0, Math.ceil(txt.length * k))}</text>;
        })}
        {circ > 0 && <path d={circlePath(cx, 61, cw / 2 + 4, 24, `g${sel}`)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={sel === 0 ? 1 - circ : 0} fill="none" stroke={RED} strokeWidth={5} strokeLinecap="round" />}
      </g>
    </svg>
  );
};

// ---------- a paper stack / block in the same projection as the cube ----------
const proj = (yaw: number, pitch: number) => {
  const ya = (yaw * Math.PI) / 180, pa = (pitch * Math.PI) / 180;
  return (v: [number, number, number]): [number, number, number] => {
    let [a, b, c] = v;
    [a, c] = [a * Math.cos(ya) + c * Math.sin(ya), -a * Math.sin(ya) + c * Math.cos(ya)];
    [b, c] = [b * Math.cos(pa) - c * Math.sin(pa), b * Math.sin(pa) + c * Math.cos(pa)];
    return [a, b, c];
  };
};
const PaperBlock: React.FC<{ x: number; y: number; e: number; yaw?: number; gold?: number; ghost?: boolean; tie?: boolean }> = ({ x, y, e, yaw = 35, gold = 0, ghost, tie }) => {
  const P = proj(yaw, -24);
  const S = (v: [number, number, number]) => { const p = P(v); return [x + (p[0] * e) / 2, y + (p[1] * e) / 2] as [number, number]; };
  const F = (vs: [number, number, number][]) => "M" + vs.map((v) => S(v).map((n) => n.toFixed(1)).join(",")).join("L") + "Z";
  const top: [number, number, number][] = [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]];
  const front: [number, number, number][] = [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  const right: [number, number, number][] = [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]];
  const left: [number, number, number][] = [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]];
  const side = P([1, 0, 0])[2] > 0 ? right : left; // whichever side faces us
  const mixc = (a: string, b: string) => { const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return `rgb(${pa.map((q, i) => Math.round(q + (pb[i] - q) * gold)).join(",")})`; };
  if (ghost) return <g fill="none" stroke="#4a4a55" strokeWidth={2.5} strokeDasharray="10 9" opacity={0.75}><path d={F(top)} /><path d={F(front)} /><path d={F(side)} /></g>;
  const sheets = Math.max(4, Math.round(e / 9));
  return (
    <g>
      <ellipse cx={x + e * 0.2} cy={y + e * 0.66} rx={e * 0.85} ry={e * 0.13} fill="rgba(74,52,32,.3)" />
      <path d={F(front)} fill={mixc("#efe6d2", "#b98512")} />
      <path d={F(side)} fill={mixc("#ddd2bb", "#94660a")} />
      {gold < 0.6 && Array.from({ length: sheets }, (_, i) => {
        const yy = -1 + (2 * (i + 1)) / (sheets + 1) + (rnd(`sh${i}`) - 0.5) * 0.02;
        const a = S([-1, yy, 1]), b = S([1, yy, 1]), c = S(side === right ? [1, yy, -1] : [-1, yy, -1]);
        return <path key={i} d={`M${a[0]},${a[1]}L${b[0]},${b[1]}M${b[0]},${b[1]}L${c[0]},${c[1]}`} stroke="#b9ab8c" strokeWidth={1} opacity={1 - gold} />;
      })}
      <path d={F(top)} fill={mixc("#fffaf0", "#f2c94c")} />
      {tie && gold < 0.3 && <>
        <path d={`M${S([0, -1, -1]).join(",")}L${S([0, -1, 1]).join(",")}L${S([0, 1, 1]).join(",")}`} stroke={RED} strokeWidth={4} fill="none" />
        <path d={`M${S([-1, -1, 0]).join(",")}L${S([1, -1, 0]).join(",")}L${S(side === right ? [1, 1, 0] : [-1, 1, 0]).join(",")}`} stroke={RED} strokeWidth={4} fill="none" />
      </>}
      <path d={F(front)} fill="none" stroke="#8d7f63" strokeWidth={1.5} />
      <path d={F(top)} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.5} />
    </g>
  );
};

const ES = 370, EC = ES / 4.2;              // true relative scale: edge ratio 4.2:1 (volume ~74:1, ~60 TB vs ~0.8 TB)
const STACK = { x: 330, y: 880 }, CUBE = { x: 740, y: 1060 };
const FOLD0 = T.was, FOLD1 = T.two;         // the stack folds down in stop-motion steps
const TagCard: React.FC<{ x: number; y: number; text: string; at: number; t: number; rot?: number; size?: number; fill?: string; string?: [number, number] }> = ({ x, y, text, at, t, rot = 0, size = 34, fill = "#fffaf0", string }) => {
  if (t < at) return null;
  const k = back((twos(t) - at) / 0.3, 2);
  const w = text.length * size * 0.6 + size * 1.2;
  return (
    <g>
      {string && <path d={`M${x - w / 2 + 20},${y}Q${(x + string[0]) / 2},${Math.max(y, string[1]) + 40} ${string[0]},${string[1]}`} stroke="#8a6a3a" strokeWidth={2} fill="none" opacity={Math.min(1, k)} />}
      <g transform={`translate(${x} ${y - (1 - Math.min(1, k)) * 50}) rotate(${rot}) scale(${0.9 + 0.1 * k})`} filter="url(#psh2)">
        <path d={torn(w, size * 2, `tc${text}`, "lr", 4)} fill={fill} />
        <circle cx={-w / 2 + 20} cy={0} r={6} fill="none" stroke="#8a6a3a" strokeWidth={2} />
        <text textAnchor="middle" x={8} y={size * 0.36} fontFamily={TYPE} fontSize={size} fill={INK}>{text}</text>
      </g>
    </g>
  );
};

const LAB_DRESS = [
  { x: 640, y: 1640, rot: -18, kind: 0 }, { x: 990, y: 1190, rot: 0, kind: 2 }, { x: 1010, y: 580, rot: 74, kind: 4 },
  { x: 60, y: 560, rot: -80, kind: 4 }, { x: 120, y: 1000, rot: -6, kind: 3 }, { x: 30, y: 400, rot: 10, kind: 1 }, { x: 1040, y: 980, rot: -14, kind: 1 },
];
const SIZE_DRESS = [
  { x: 150, y: 1560, rot: -10, kind: 0 }, { x: 940, y: 740, rot: 0, kind: 2 }, { x: 1010, y: 1300, rot: 80, kind: 4 },
  { x: 60, y: 1290, rot: -8, kind: 1 }, { x: 930, y: 560, rot: 8, kind: 3 }, { x: 40, y: 640, rot: 86, kind: 4 },
];
export const LabScene: React.FC<{ t: number; fr: number }> = ({ t }) => {
  const tt = twos(t);
  // the lab content leaves (pulled down) as the sizes beat starts
  const leave = smooth((t - (B.sizes.s - 0.3)) / 0.7);
  const ly = leave * leave * 1500;
  const draw = pS(t, B.network.s + 0.1, 0.9);
  const flowDone = t > FLOW1 + 0.4;
  const camS = 1 + 0.015 * Math.sin(t * 0.25), camX = Math.sin(t * 0.17) * 6, camY = Math.cos(t * 0.13) * 6;
  const card = back((tt - (T.figure - 0.1)) / 0.4, 1.4);
  const inked = pS(t, T.smallest, FLOW1 - T.smallest + 0.3);
  const word = pS(t, T.rules, 0.5);
  const curve = Array.from({ length: 60 }, (_, i) => { const x = OUTC.x0 + (i / 59) * (OUTC.x1 - OUTC.x0); return `${i ? "L" : "M"}${x.toFixed(1)},${(curveY(x) + (rnd(`cj${i}`) - 0.5) * 3).toFixed(1)}`; }).join(" ");
  const showLab = t < B.sizes.s + 0.6;
  // ---- sizes ----
  const sz = t > B.sizes.s - 0.4;
  const drop = back((tt - (T.so + 0.05)) / 0.45, 1.6);
  const steps = 4, fk = Math.max(0, Math.min(1, (tt - FOLD0) / (FOLD1 - FOLD0)));
  const step = Math.min(steps, Math.floor(fk * steps + 1e-6)), within = fk * steps - step;
  const eAt = (s: number) => ES * Math.pow(EC / ES, s / steps);
  const posAt = (s: number) => { const u = s / steps; return { x: lerp(STACK.x, CUBE.x, u), y: lerp(STACK.y, CUBE.y, u) - Math.sin(u * Math.PI) * 140 }; };
  const settle = back(within / 0.6, 2.2);
  const eNow = fk >= 1 ? EC : lerp(eAt(step), eAt(step + 1), Math.min(1, settle));
  const pNow = fk >= 1 ? CUBE : { x: lerp(posAt(step).x, posAt(step + 1).x, Math.min(1, settle)), y: lerp(posAt(step).y, posAt(step + 1).y, Math.min(1, settle)) };
  const landed = tt >= FOLD1;
  const cubeBob = landed ? Math.sin((t - FOLD1) * 2.2) * 3 : 0;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <BgImage src={IMG.board} t={t} />
      {t < B.sizes.s + 0.3 ? <Dressing spots={LAB_DRESS} sticky="patterns?" /> : <Dressing spots={SIZE_DRESS} sticky="scale!" />}
      <g transform={`translate(${540 + camX} ${960 + camY}) scale(${camS}) translate(-540 -960)`}>
        {showLab && <g transform={`translate(0 ${ly}) rotate(${leave * -4} 540 900)`}>
          {/* graph paper with the pencil network */}
          <g filter="url(#psh)" transform="rotate(-2 540 800)">
            <rect x={NET.x0 - 110} y={NET.y0 - 60} width={NET.x1 - NET.x0 + 220} height={NET.y1 - NET.y0 + 120} fill="url(#pgraph)" />
          </g>
          <g transform="rotate(-2 540 800)">
            {nodes.map((a, i) => nodes.filter((b) => b.c === a.c + 1).map((b, j) => (
              <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={lerp(a.x, b.x, Math.min(1, Math.max(0, draw * 3 - a.c)))} y2={lerp(a.y, b.y, Math.min(1, Math.max(0, draw * 3 - a.c)))} stroke="#3d3a48" strokeOpacity={0.45} strokeWidth={1.6} />
            )))}
            {nodes.map((n, i) => {
              const k = Math.max(0, Math.min(1, draw * 4 - n.c));
              const fill = pS(t, COLS[n.c] + n.j * 0.05, 0.25);
              const pulse = t > COLS[n.c] && t < COLS[n.c] + 0.6 ? Math.sin(((t - COLS[n.c]) / 0.6) * Math.PI) * 4 : 0;
              return <g key={i}>
                <circle cx={n.x} cy={n.y} r={15 + pulse} fill="#fffaf0" stroke={INK} strokeWidth={3} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - k} />
                {fill > 0 && <path d={circlePath(n.x, n.y, 9 * fill, 9 * fill, `nf${i}`)} fill={RED} stroke={RED} strokeWidth={4} opacity={0.9} />}
              </g>;
            })}
            {/* data pulses running through the layers in the network beat */}
            {t > T.trained && t < FLOW0 + 0.5 && Array.from({ length: 10 }, (_, i) => {
              const ph = ((tt - T.trained) * 0.9 + i / 10) % 1, seg = Math.floor(ph * 3), u = ph * 3 - seg;
              const a = nodes.filter((n) => n.c === seg)[i % NET.cols[seg]], b = nodes.filter((n) => n.c === seg + 1)[(i * 3) % NET.cols[seg + 1]];
              return <rect key={i} x={lerp(a.x, b.x, u) - 9} y={lerp(a.y, b.y, u) - 6} width={18} height={12} fill={PAPERS[2]} stroke="#7d9cc8" strokeWidth={1} transform={`rotate(${i * 23} ${lerp(a.x, b.x, u)} ${lerp(a.y, b.y, u)})`} />;
            })}
          </g>
          {/* the index card: one pattern */}
          {card > 0.01 && <g transform={`translate(${(1 - Math.min(1, card)) * 700} 0) rotate(${2.5 - (1 - Math.min(1, card)) * 6} 745 1065)`} filter="url(#psh)">
            <rect x={OUTC.x0 - 20} y={OUTC.y0 - 90} width={OUTC.x1 - OUTC.x0 + 40} height={OUTC.y1 - OUTC.y0 + 130} fill="#fffdf6" />
            <line x1={OUTC.x0 - 20} y1={OUTC.y0 - 38} x2={OUTC.x1 + 20} y2={OUTC.y0 - 38} stroke={RED} strokeOpacity={0.5} strokeWidth={2} />
            <clipPath id="lbword"><rect x={OUTC.x0} y={OUTC.y0 - 100} width={330 * word} height={70} /></clipPath>
            <text x={OUTC.x0 + 4} y={OUTC.y0 - 50} fontFamily={HANDF} fontSize={50} fill={INK} clipPath="url(#lbword)">one pattern</text>
          </g>}
          {card > 0.01 && <g transform={`translate(${(1 - Math.min(1, card)) * 700} 0) rotate(${2.5 - (1 - Math.min(1, card)) * 6} 745 1065)`}>
            <path d={curve} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - inked} />
          </g>}
          {/* scraps: born from the strip, cloud, then collapse onto the curve */}
          {PTS.map((p, i) => {
            const a = scrapAt(p, i, tt);
            if (!a) return null;
            if (a.ph >= 0.97) return <circle key={i} cx={a.x} cy={a.y} r={i % 6 === 0 ? 7 : 0} fill={RED} />;
            const s = SNIPS[i % SNIPS.length], rot = (rnd(`lr${i}`) - 0.5) * 30 * (1 - a.ph);
            return <g key={i} transform={`translate(${a.x} ${a.y}) rotate(${rot + boil(`s${i}`, tt, 1.5)}) scale(${(0.62 + 0.25 * a.fly) * (1 - a.ph * 0.85)})`} filter="url(#psh)">
              <path d={torn(s.length * 15 + 26, 44, `lb${i}`)} fill={PAPERS[p.k]} />
              <text textAnchor="middle" y={9} fontFamily={TYPE} fontSize={24} fill={INK}>{s}</text>
            </g>;
          })}
          {/* marker arrow from network to card on "express" */}
          <path d="M 860 860 C 940 880, 960 920, 920 960" stroke={RED} strokeWidth={7} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - pS(t, T.express - 0.1, 0.35)} />
          {t > T.express + 0.2 && <path d="M 905 944 L 918 962 L 940 948" stroke={RED} strokeWidth={7} fill="none" strokeLinecap="round" />}
          {flowDone && <Sparkle x={OUTC.x1 - 40} y={curveY(OUTC.x1 - 40) - 8} s={Math.sin(Math.min(1, (t - FLOW1 - 0.4) / 0.5) * Math.PI)} r={26} color={RED} />}
        </g>}
        {/* the strip feeding the network: consumed from the right */}
        {t < STRIP_START + STRIP_DUR + 0.1 && (
          <g>
            <clipPath id="lbstrip"><rect x={-20} y={0} width={20 + 1086 * (1 - Math.max(0, Math.min(1, (tt - STRIP_START) / STRIP_DUR)))} height={1920} /></clipPath>
            <g clipPath="url(#lbstrip)"><Strip t={t} idp="lb" /></g>
          </g>
        )}
      </g>
        {/* ---- sizes: stack -> folds -> gold cube ---- */}
      {sz && <g>
        {/* dashed ghost of the stack stays for the comparison */}
        {tt >= FOLD0 && <PaperBlock x={STACK.x} y={STACK.y} e={ES} ghost />}
        {tt < FOLD0 && <g transform={`translate(0 ${(1 - Math.min(1, drop)) * -1100})`}><PaperBlock x={STACK.x} y={STACK.y} e={ES} tie /></g>}
        {tt >= FOLD0 && !landed && <PaperBlock x={pNow.x} y={pNow.y} e={eNow} yaw={35 + (step + Math.min(1, settle)) * 90} gold={fk} />}
        {landed && <GoldCube x={CUBE.x} y={CUBE.y + cubeBob} e={EC} yaw={35 + (t - FOLD1) * 14} glow={0.9} />}
        {landed && <Sparkle x={CUBE.x + 50} y={CUBE.y - 60} s={Math.sin(Math.min(1, (t - FOLD1) / 0.5) * Math.PI)} r={34} />}
        <TagCard x={STACK.x + 20} y={STACK.y - ES * 0.95 - 30} text="training text ~60 TB" at={T.zetta2} t={t} rot={-2} />
        <TagCard x={CUBE.x + 80} y={CUBE.y - 150} text="weights ~0.8 TB" at={T.tb} t={t} rot={2} fill="#fff4cf" string={[CUBE.x + 10, CUBE.y - 40]} />
        <TagCard x={540} y={410} text="Llama 3.1 405B · 16-bit · illustrative" at={T.tb + 0.5} t={t} rot={-1} size={30} fill="#dfeefb" />
      </g>}
    </svg>
  );
};
