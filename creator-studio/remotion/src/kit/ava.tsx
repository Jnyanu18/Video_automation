import React from "react";
import { C } from "./theme";

// Ava as a puppet (2026-10-26). The character sheet's Ava (characters.tsx) has two faces; a single-take video needs a
// pose for every line, the way adilet.fndr's character acts every line. Her floating arms swing from the shoulder and
// her LED eyes change shape, so a pose is just numbers that blend from one to the next.

export type Eyes = "happy" | "wow" | "sad" | "think" | "wink" | "shock" | "look";
export type Pose = { eyes: Eyes; la: number; ra: number; tilt: number; lift: number; look: number };

/** The named poses. la / ra: how far each arm swings out from hanging (degrees; past 180 is over the head, below 0
 *  is across the body). tilt: head and body lean. lift: hover height. look: eyes left (-1) to right (1). */
export const POSES: Record<string, Pose> = {
  idle: { eyes: "happy", la: 14, ra: 14, tilt: 0, lift: 0, look: 0 },
  wave: { eyes: "happy", la: 14, ra: 150, tilt: -4, lift: 6, look: 0 },
  present: { eyes: "happy", la: 70, ra: 70, tilt: 0, lift: 10, look: 0 },
  "point-up": { eyes: "look", la: 14, ra: 165, tilt: -3, lift: 8, look: 0.3 },
  "point-left": { eyes: "look", la: 100, ra: 14, tilt: -5, lift: 4, look: -1 },
  "point-right": { eyes: "look", la: 14, ra: 100, tilt: 5, lift: 4, look: 1 },
  shock: { eyes: "shock", la: 130, ra: 130, tilt: 0, lift: 30, look: 0 },
  wow: { eyes: "wow", la: 60, ra: 60, tilt: 0, lift: 20, look: 0 },
  shrug: { eyes: "think", la: 80, ra: 80, tilt: 7, lift: 0, look: 0 },
  think: { eyes: "think", la: 14, ra: -35, tilt: -6, lift: 0, look: -0.4 },
  facepalm: { eyes: "sad", la: 14, ra: -150, tilt: 8, lift: -6, look: 0 },
  sad: { eyes: "sad", la: 5, ra: 5, tilt: 6, lift: -12, look: 0 },
  cheer: { eyes: "happy", la: 165, ra: 165, tilt: 0, lift: 40, look: 0 },
  wink: { eyes: "wink", la: 14, ra: 120, tilt: -5, lift: 6, look: 0 },
};

/** Blend two poses; the eyes switch halfway. */
export const blend = (a: Pose, b: Pose, k: number): Pose => ({
  eyes: k < 0.5 ? a.eyes : b.eyes,
  la: a.la + (b.la - a.la) * k, ra: a.ra + (b.ra - a.ra) * k, tilt: a.tilt + (b.tilt - a.tilt) * k,
  lift: a.lift + (b.lift - a.lift) * k, look: a.look + (b.look - a.look) * k,
});

const LINE = "#1e2029";

const EyePair: React.FC<{ eyes: Eyes; look: number; talk: number; blink: number }> = ({ eyes, look, talk, blink }) => {
  const dx = look * 14;
  const sy = (1 + talk * 0.18) * blink;
  const oval = (x: number, rx = 17, ry = 22) => <ellipse cx={x + dx} cy={138} rx={rx} ry={ry * sy} />;
  const arc = (x: number, up = true) => <path d={up ? `M ${x - 20 + dx} 146 Q ${x + dx} ${120 - talk * 4} ${x + 20 + dx} 146` : `M ${x - 20 + dx} 132 Q ${x + dx} 156 ${x + 20 + dx} 132`} strokeWidth={9} fill="none" strokeLinecap="round" />;
  const flat = (x: number) => <line x1={x - 18 + dx} y1={140} x2={x + 18 + dx} y2={140} strokeWidth={9} strokeLinecap="round" />;
  const slant = (x: number, d: number) => <line x1={x - 18 + dx} y1={134 - d * 6} x2={x + 18 + dx} y2={134 + d * 6} strokeWidth={9} strokeLinecap="round" />;
  const L = 170, R = 230;
  const parts =
    eyes === "happy" ? [arc(L), arc(R)] :
    eyes === "wow" ? [oval(L, 18, 25), oval(R, 18, 25)] :
    eyes === "shock" ? [oval(L, 11, 13), oval(R, 11, 13)] :
    eyes === "sad" ? [slant(L, -1), slant(R, 1)] :
    eyes === "think" ? [oval(L, 15, 19), flat(R)] :
    eyes === "wink" ? [oval(L), arc(R)] :
    [oval(L, 15, 20), oval(R, 15, 20)];
  // The glow is a wider, faint copy under the eyes, not a blur filter: a live blur on every frame made renders 3x slower.
  return (
    <>
      <g fill={C.gold} stroke={C.gold} opacity={0.28} style={{ strokeWidth: 22 }}>{parts.map((p, i) => <React.Fragment key={i}>{React.cloneElement(p, { strokeWidth: 22 })}</React.Fragment>)}</g>
      <g fill={C.gold} stroke={C.gold}>{parts.map((p, i) => <React.Fragment key={i}>{p}</React.Fragment>)}</g>
    </>
  );
};

/** Ava's shell, arms, ears and mark. `edge` draws every shape in thick white, the sticker edge behind her. */
const Body: React.FC<{ pose: Pose; arm: number; edge?: boolean }> = ({ pose, arm, edge }) => {
  const f = (fill: string) => (edge ? "#ffffff" : fill);
  const st = edge ? { stroke: "#ffffff", strokeWidth: 19 } : { stroke: LINE, strokeWidth: 5 };
  return (
    <g>
      <path d="M 200 206 C 288 206 300 292 272 360 C 252 410 148 410 128 360 C 100 292 112 206 200 206 Z" fill={f("url(#ava-shell)")} {...st} />
      {edge ? null : <path d="M 248 240 C 280 280 278 340 258 372" stroke="#000" strokeOpacity={0.12} strokeWidth={18} fill="none" strokeLinecap="round" />}
      {edge ? null : (
        <g transform="translate(174 264) scale(0.82) rotate(-5 32 32)">
          <path d="M17.5 24 L27 36.5 L30.5 50 L8.5 29 Z" fill={C.gold} />
          <path d="M27 36.5 L50 10 L54.5 14.5 L30.5 50 Z" fill="#15141A" />
        </g>
      )}
      <g transform={`rotate(${pose.la} 112 250)`}><ellipse cx={112} cy={300} rx={22} ry={58} fill={f("url(#ava-shell)")} {...st} /></g>
      <g transform={`rotate(${-(pose.ra + arm)} 288 250)`}><ellipse cx={288} cy={300} rx={22} ry={58} fill={f("url(#ava-shell)")} {...st} /></g>
      <g transform={`rotate(${pose.tilt * 0.8} 200 128)`}>
        <ellipse cx={200} cy={128} rx={96} ry={66} fill={f("url(#ava-shell)")} {...st} />
        <ellipse cx={104} cy={132} rx={10} ry={20} fill={f(C.gold)} {...(edge ? st : { stroke: LINE, strokeWidth: 4 })} />
        <ellipse cx={296} cy={132} rx={10} ry={20} fill={f(C.gold)} {...(edge ? st : { stroke: LINE, strokeWidth: 4 })} />
      </g>
    </g>
  );
};

/** Ava at a pose. `talk` 0..1 pulses her eyes while the voice speaks; `blink` 0..1 closes them. */
export const AvaRig: React.FC<{ pose: Pose; size: number; talk?: number; blink?: number; arm?: number }> = ({ pose, size, talk = 0, blink = 1, arm = 0 }) => (
  <svg width={size} height={size * 1.15} viewBox="0 0 400 460" style={{ overflow: "visible" }}>
    <defs>
      <radialGradient id="ava-shell" cx="38%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#ffffff" /><stop offset="70%" stopColor="#eef0f4" /><stop offset="100%" stopColor="#cdd2db" />
      </radialGradient>
    </defs>
    {/* the soft shadow under her, drawn once (no blur filter) */}
    <ellipse cx={200} cy={436 - pose.lift * 0.2} rx={110 - pose.lift * 0.6} ry={16} fill="rgba(20,21,26,0.14)" />
    <g transform={`translate(0 ${-pose.lift}) rotate(${pose.tilt} 200 300)`}>
      {/* the white sticker edge: the same shapes drawn first in thick white (was a live dilate filter) */}
      <Body pose={pose} arm={arm} edge />
      <Body pose={pose} arm={arm} />
      <g transform={`rotate(${pose.tilt * 0.8} 200 128)`}>
        <ellipse cx={200} cy={136} rx={74} ry={44} fill="#0e1016" />
        <ellipse cx={176} cy={112} rx={30} ry={9} fill="#fff" opacity={0.18} transform="rotate(-12 176 112)" />
        <EyePair eyes={pose.eyes} look={pose.look} talk={talk} blink={blink} />
      </g>
    </g>
  </svg>
);

/** Every named pose on one sheet, for Vishnu to check. 2400 x 1400. */
export const AvaPoseSheet: React.FC = () => (
  <div style={{ width: "100%", height: "100%", background: "#f3f1ec", display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", gap: "10px 30px", padding: 30 }}>
    {Object.entries(POSES).map(([name, pose]) => (
      <div key={name} style={{ width: 300, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <AvaRig pose={pose} size={260} />
        <div style={{ fontFamily: "monospace", fontSize: 30, color: "#1e2029", marginTop: -10 }}>{name}</div>
      </div>
    ))}
  </div>
);
