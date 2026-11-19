// cosmos: the polaroid flies into a cut-paper cosmos (navy construction paper, paper planets, a galaxy
// spiral of scraps); real law cards spiral into the tiny gold cube; stamp "Open question - not proven".
import React from "react";
import { random } from "remotion";
import { smooth } from "../lib";
import { GoldCube, Sparkle } from "./cube";
import { Card, Defs, HAND, IMG, INK, MATH, PAPERS, RED, Stamp, TYPE, back, boil, lerp, pS, rnd, torn, twos } from "./kit";
import { B, HAND as HOFF, T } from "./T";

export const CORE = { x: 540, y: 820 };
// where the cube goes when the cosmos tears away (shared with the path scene)
export const PATH_CUBE = { x: 770, y: 540, e: 135 };
export const TEAR0 = B.path.s - 0.3, TEAR1 = B.path.s + 0.45;
export const cubeTravel = (t: number) => {
  const k = smooth((t - TEAR0) / (TEAR1 - TEAR0 + 0.2));
  return { x: lerp(CORE.x, PATH_CUBE.x, k), y: lerp(CORE.y, PATH_CUBE.y, k) - Math.sin(k * Math.PI) * 80, e: lerp(52, PATH_CUBE.e, k) };
};

const star = (r: number) => Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; return `${(Math.cos(a) * q).toFixed(1)},${(Math.sin(a) * q).toFixed(1)}`; }).join("L");
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: random(`cs${i}`) * 1080, y: 230 + random(`cy${i}`) * 1400, r: 5 + random(`cr${i}`) * 11, ph: random(`cp${i}`) * 6 }));
const ARMS = Array.from({ length: 150 }, (_, i) => {
  const arm = i % 2, u = random(`ga${i}`), a = u * Math.PI * 3.2 + arm * Math.PI, r = 30 + u * 420;
  return { a, r, w: 10 + u * 28, h: 6 + u * 12, k: Math.floor(random(`gk${i}`) * 4), j: (random(`gj${i}`) - 0.5) * 0.35 };
});

const LAWS = [
  { id: "F", at: T.everyRule - 0.05, hold: { x: 300, y: 470 }, w: 360, h: 170 },
  { id: "M", at: T.regulation - 0.1, hold: { x: 770, y: 480 }, w: 420, h: 280 },
  { id: "E", at: T.everyInfo - 0.1, hold: { x: 300, y: 1050 }, w: 360, h: 170 },
  { id: "D", at: T.universe - 1.0, hold: { x: 780, y: 1070 }, w: 400, h: 150 },
];
const HOLD = 1.25, SPIRAL = 1.0;

const LawFace: React.FC<{ id: string; w: number; h: number }> = ({ id, w, h }) => {
  if (id === "F") return <text x={w / 2} y={h / 2 + 30} textAnchor="middle" fontFamily={MATH} fontSize={96} fill={INK}>F = ma</text>;
  if (id === "E") return <text x={w / 2} y={h / 2 + 30} textAnchor="middle" fontFamily={MATH} fontSize={90} fill={INK}>E = mc²</text>;
  if (id === "M") {
    const L = ["∇·E = ρ/ε₀", "∇·B = 0", "∇×E = −∂B/∂t", "∇×B = μ₀J + μ₀ε₀ ∂E/∂t"];
    return <g>{L.map((l, i) => <text key={i} x={22} y={62 + i * 58} fontFamily={`"Cambria Math", "STIX Two Math", "Times New Roman", serif`} fontSize={i === 3 ? 34 : 40} fill={INK}>{l}</text>)}</g>;
  }
  // DNA strip: a double helix with base-pair rungs
  return <g>
    {Array.from({ length: 22 }, (_, i) => {
      const x = 24 + i * 16.5, a = i * 0.55, y1 = h / 2 + Math.sin(a) * 44, y2 = h / 2 - Math.sin(a) * 44;
      return <line key={i} x1={x} y1={y1} x2={x} y2={y2} stroke={["#e2372b", "#2f5fb3", "#d9a520", "#3a9a5a"][i % 4]} strokeWidth={5} />;
    })}
    <path d={Array.from({ length: 60 }, (_, i) => `${i ? "L" : "M"}${(24 + i * 6.05).toFixed(1)},${(h / 2 + Math.sin(i * 0.2286 * 2.6) * 44).toFixed(1)}`).join("")} stroke={INK} strokeWidth={5} fill="none" />
    <path d={Array.from({ length: 60 }, (_, i) => `${i ? "L" : "M"}${(24 + i * 6.05).toFixed(1)},${(h / 2 - Math.sin(i * 0.2286 * 2.6) * 44).toFixed(1)}`).join("")} stroke={INK} strokeWidth={5} fill="none" />
    <text x={w - 18} y={h - 14} textAnchor="end" fontFamily={TYPE} fontSize={24} fill={INK}>DNA</text>
  </g>;
};

export const CosmosScene: React.FC<{ t: number; fr: number }> = ({ t }) => {
  const tt = twos(t);
  // camera: hold on the core while the tile lands; then a slow push, faster on "Something so small"
  const z = 1 + 0.06 * smooth((t - HOFF.cosGone) / 4) + 0.16 * smooth((t - T.something) / 2.2) - 0.1 * smooth((t - T.everyRule + 0.4) / 1.2);
  const rotG = (tt - B.cosmos.s) * 4; // galaxy turns (degrees)
  const tear = smooth((t - TEAR0) / (TEAR1 - TEAR0));
  const tearY = lerp(2050, -160, tear);
  const grail = pS(t, T.holy, 0.5) * (1 - 0.6 * pS(t, T.holy + 1.2, 0.8));
  const find = Math.max(0, Math.sin(Math.min(1, Math.max(0, (t - (T.needFind - 0.1)) / 1.3)) * Math.PI));
  const absorbed = LAWS.filter((l) => t > l.at + HOLD + SPIRAL).length;
  const cube = t < TEAR0 ? { x: CORE.x, y: CORE.y, e: 52 + absorbed * 3 } : cubeTravel(t);
  const jag = Array.from({ length: 28 }, (_, i) => `L${1120 - i * 42},${(tearY + (rnd(`tr${i}`) - 0.5) * 50 + (i % 2 ? 18 : -10)).toFixed(1)}`).join("");
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <Defs />
      <clipPath id="cotear"><path d={`M-40,-200 L1120,-200 L1120,${tearY} ${jag} L-40,${tearY} Z`} /></clipPath>
      {/* the torn-off underside of the paper, lit cream, as it is pulled away */}
      {tear > 0 && tear < 1 && <path d={`M-40,${tearY} ${jag.replace(/L/g, "L")} L-40,${tearY} Z`} fill="none" stroke="#e8dcc4" strokeWidth={14} />}
      <g clipPath={tear > 0 ? "url(#cotear)" : undefined}>
        <image href={IMG.navy} x={-80 + Math.sin(t * 0.1) * 16} y={-140 + Math.cos(t * 0.08) * 20} width={1240} height={2200} preserveAspectRatio="none" />
        <g transform={`translate(${CORE.x} ${CORE.y}) scale(${z}) translate(${-CORE.x} ${-CORE.y})`}>
          {/* paper stars */}
          {STARS.map((s, i) => <path key={i} transform={`translate(${s.x} ${s.y}) rotate(${i * 17}) scale(${0.85 + 0.15 * Math.sin(tt * 3 + s.ph)})`} d={"M" + star(s.r) + "Z"} fill={i % 5 ? "#f6eedb" : "#ffd75e"} filter={s.r > 11 ? "url(#pshN)" : undefined} />)}
          {/* paper planets */}
          <g transform={`translate(190 430) rotate(-14)`} filter="url(#pshN)">
            <circle r={78} fill="#e9a04a" /><path d="M-78,-10 A78,78 0 0 1 78,-10 Z" fill="#f2b766" />
            {[-30, 0, 26].map((y) => <rect key={y} x={-74} y={y} width={148} height={10} fill="#c97f33" opacity={0.6} />)}
            <ellipse rx={140} ry={26} fill="none" stroke="#f6eedb" strokeWidth={14} />
          </g>
          <g transform="translate(900 1310)" filter="url(#pshN)">
            <circle r={96} fill="#3d7fc4" />
            <path d="M-60,-40 C-20,-70 30,-40 10,-10 C-10,20 -50,10 -60,-40 Z M20,30 C60,20 70,60 40,72 C10,80 0,50 20,30 Z" fill="#5aa86a" />
            <path d="M-96,0 A96,96 0 0 0 96,0 A96,60 0 0 1 -96,0Z" fill="#000" opacity={0.18} />
          </g>
          <g transform="translate(880 330)" filter="url(#pshN)"><circle r={38} fill={RED} /><circle cx={-10} cy={-8} r={9} fill="#b52a20" /></g>
          <g transform="translate(150 1250)" filter="url(#pshN)"><path d="M0,-60 A60,60 0 1 1 0,60 A44,60 0 1 0 0,-60 Z" fill="#f6eedb" /></g>
          {/* galaxy spiral of scraps around the core */}
          <g transform={`translate(${CORE.x} ${CORE.y}) rotate(${rotG}) scale(1 0.62)`}>
            {ARMS.map((p, i) => {
              const a = p.a + p.j, x = Math.cos(a) * p.r, y = Math.sin(a) * p.r;
              return <path key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((a * 180) / Math.PI + 90).toFixed(1)})`} d={torn(p.w, p.h, `ga${i % 12}`, "lr", 1.5)} fill={PAPERS[p.k]} opacity={0.92} />;
            })}
          </g>
          <circle cx={CORE.x} cy={CORE.y} r={160} fill="url(#pgoldlight)" opacity={0.7 + grail * 0.5 + find * 0.6} />
          {/* gold paper rays on "holy grail" and "find" */}
          {(grail > 0.01 || find > 0.01) && Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2 + tt * 0.2, L = 120 + 140 * Math.max(grail, find);
            return <path key={i} d={`M${CORE.x + Math.cos(a - 0.06) * 60},${CORE.y + Math.sin(a - 0.06) * 60} L${CORE.x + Math.cos(a) * L},${CORE.y + Math.sin(a) * L} L${CORE.x + Math.cos(a + 0.06) * 60},${CORE.y + Math.sin(a + 0.06) * 60}Z`} fill="#ffd75e" opacity={0.85} />;
          })}
        </g>
        {/* law cards: enter, held readable, then spiral into the cube */}
        {LAWS.map((l, i) => {
          if (tt < l.at) return null;
          const enter = back((tt - l.at) / 0.35, 1.5), sp = smooth((tt - l.at - HOLD) / SPIRAL);
          if (sp >= 1) return null;
          const from = { x: l.hold.x < 540 ? -300 : 1380, y: l.hold.y - 100 };
          const hx = lerp(from.x, l.hold.x, Math.min(1, enter)), hy = lerp(from.y, l.hold.y, Math.min(1, enter));
          // spiral: angle sweeps 1.4 turns while the radius shrinks
          const a0 = Math.atan2(hy - CORE.y, hx - CORE.x), r0 = Math.hypot(hx - CORE.x, hy - CORE.y);
          const a = a0 + sp * Math.PI * 2.8, r = r0 * (1 - sp);
          const x = sp > 0 ? CORE.x + Math.cos(a) * r : hx, y = sp > 0 ? CORE.y + Math.sin(a) * r * 0.75 : hy;
          return <Card key={l.id} x={x} y={y} w={l.w} h={l.h} s={(1 - sp) * (1 - sp * 0.2)} rot={(i % 2 ? 4 : -4) + sp * 300 + boil(`l${i}`, tt, 0.6)} lines={l.id !== "D"} fill={l.id === "D" ? "#fdf3e1" : "#fffdf6"} shadow="url(#pshN)">
            <LawFace id={l.id} w={l.w} h={l.h} />
          </Card>;
        })}
        {t < TEAR0 && <GoldCube x={cube.x} y={cube.y} e={cube.e} yaw={(t - B.cosmos.s) * 22} glow={0} shadow={false} />}
        {LAWS.map((l, i) => { const at = l.at + HOLD + SPIRAL; return t > at && t < at + 0.5 ? <Sparkle key={i} x={CORE.x + 40} y={CORE.y - 40} s={Math.sin(((t - at) / 0.5) * Math.PI)} r={26} /> : null; })}
        <Sparkle x={CORE.x - 50} y={CORE.y - 50} s={find} r={44} />
        <Stamp x={540} y={1196} t={t} at={T.agi1 - 0.05} lines={["Open question - not proven"]} size={40} rot={-5} paper />
      </g>
      {/* during the tear the cube travels to the path scene's spot, above both papers */}
      {t >= TEAR0 && <GoldCube x={cube.x} y={cube.y} e={cube.e} yaw={(t - B.cosmos.s) * 22} glow={0.6} />}
    </svg>
  );
};
