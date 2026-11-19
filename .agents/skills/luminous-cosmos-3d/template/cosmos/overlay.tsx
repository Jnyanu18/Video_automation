// Crisp HTML labels over the 3D: gauge, qualifier tags, object labels (anchored by projecting the
// same 3D points the canvas draws), FULL/FWD glass chips, and the end card.
import React from "react";
import { B } from "../beats";
import { lerp, popS, progS } from "../lib";
import { add } from "./cam";
import { SANS } from "./fonts";
import { AMBER, Chip, anchor, win } from "./ui";
import { HAND, T } from "./timing";
import { ribbonAt } from "./sets/network";
import { L } from "./rig";
import { EndCard } from "./endcard";
import { extraLabels } from "./labels2";


// the size gauge (internet -> training)
const Gauge: React.FC<{ t: number }> = ({ t }) => {
  const k = win(t, T.zetta - 0.05, B.network.s + 1.2, 0.4, 0.5);
  if (k <= 0) return null;
  const m = progS(t, T.compressed, 0.7);
  const tr = progS(t, T.compressed + 0.1, 0.4);
  const mx = lerp(110, 540, m);
  return (
    <div style={{ position: "absolute", left: 70, top: 252, width: 940, opacity: k, fontFamily: SANS, color: "#fff" }}>
      <div style={{ height: 10, borderRadius: 5, background: "linear-gradient(90deg,#5ee7ff,#8a7dff 55%,#ffbf3c)", opacity: 0.85, transform: `scaleX(${lerp(0.2, 1, progS(t, T.zetta - 0.05, 0.6))})`, transformOrigin: "0 50%", boxShadow: "0 0 18px rgba(94,231,255,.45)" }} />
      <div style={{ position: "absolute", left: mx - 70 - 11, top: -26, width: 0, height: 0, borderLeft: "11px solid transparent", borderRight: "11px solid transparent", borderTop: "16px solid #fff", filter: "drop-shadow(0 0 6px rgba(255,255,255,.8))" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 29, fontWeight: 700, textShadow: "0 2px 10px rgba(7,5,28,.9)" }}>
        <span style={{ opacity: m > 0.5 ? 0.6 : 1 }}>The internet: zettabytes</span>
        <span style={{ opacity: tr, color: "#fff", fontWeight: 800, marginRight: 150 }}>Training: ~60 TB</span>
      </div>
    </div>
  );
};

const WorldLabels: React.FC<{ t: number }> = ({ t }) => {
  const out: React.ReactNode[] = [];
  // slice tags
  const s1 = popS(t, T.used + 0.25, 14) * (1 - progS(t, B.network.s + 0.6, 0.4));
  const s2 = popS(t, T.thatData + 0.15, 14) * (1 - progS(t, B.network.s + 0.6, 0.4));
  out.push(<Chip key="s1" x={70} y={392} align="left" text="Real training sets: a filtered slice" k={s1} size={30} />);
  out.push(<Chip key="s2" x={70} y={470} align="left" text="~15T tokens of text (Llama 3)" k={s2} size={30} />);
  // one pattern
  if (t > T.rules - 0.2 && t < B.sizes.s + 0.1) {
    const a = anchor(t, "network", add(ribbonAt(0.08), [0, 2.2, 0]));
    const k = popS(t, T.rules, 12) * (1 - progS(t, B.sizes.s - 0.45, 0.3));
    if (a.ok) out.push(<Chip key="op" x={a.x} y={a.y} align="left" text="one pattern" k={k} color={AMBER} size={50} weight={800} glass={false} />);
  }
  // cube labels
  if (t > T.terabytes - 0.2 && t < B.beautiful.s + 0.2) {
    const k = popS(t, T.terabytes + 0.1, 14) * (1 - progS(t, HAND.sizes.t0 + 0.2, 0.35));
    const kb = popS(t, T.terabytes + 0.35, 14) * (1 - progS(t, HAND.sizes.t1 - 0.6, 0.35));
    const big = anchor(t, "cubes", add(L.cubeBig, [0, -L.cubeEdgeBig / 2 - 0.85, 0]));
    const sm = anchor(t, "cubes", [0, -1.25, 0]);
    out.push(<Chip key="cb" x={big.x} y={big.y} text="training text ~60 TB" k={kb} size={40} />);
    out.push(<Chip key="cs" x={sm.x} y={sm.y} text="weights ~0.8 TB" k={k} color={AMBER} size={42} />);
    const kt = popS(t, T.terabytes + 0.6, 14) * (1 - progS(t, HAND.sizes.t1 - 0.5, 0.35));
    out.push(<Chip key="ll" x={540} y={300} text="Llama 3.1 405B · 16-bit · illustrative" k={kt} size={34} weight={600} />);
  }
  return <>{out}{extraLabels(t)}</>;
};

export const Overlays: React.FC<{ t: number; covered: boolean }> = ({ t }) => (
  <>
    <Gauge t={t} />
    <WorldLabels t={t} />
    <EndCard t={t} />
  </>
);
