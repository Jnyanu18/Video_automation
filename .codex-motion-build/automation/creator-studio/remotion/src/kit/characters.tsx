import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "./theme";

// The characters (2026-10-26). Vishnu shared adilet.fndr's avatar (a cartoon of the creator, thick outline, white
// sticker edge, halftone shading, big expressions) and EVE from WALL-E. Two characters in that cartoon style:
// Ava, a floating robot inspired by EVE's egg shape but ours (gold LED eyes, gold ear rings, the Verb mark on the
// chest, a gold hover glow), and Vishnu, drawn from his own footage (big dark curls, thick black rectangular glasses, brown skin,
// a lean face, a light tee). Inspired by, never a copy: EVE is Disney's character.

export type Face = "happy" | "wow";
const LINE = "#1e2029";

/** The sticker look: a thick white edge around the whole drawing, then a soft shadow. */
const Defs: React.FC<{ id: string }> = ({ id }) => (
  <defs>
    <filter id={`${id}-sticker`} x="-20%" y="-20%" width="140%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="9" result="fat" />
      <feFlood floodColor="#ffffff" />
      <feComposite in2="fat" operator="in" result="edge" />
      <feGaussianBlur in="fat" stdDeviation="10" result="blur" />
      <feOffset in="blur" dy="14" result="drop" />
      <feFlood floodColor="rgba(20,21,26,0.25)" />
      <feComposite in2="drop" operator="in" result="shadow" />
      <feMerge><feMergeNode in="shadow" /><feMergeNode in="edge" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <pattern id={`${id}-dots`} width="9" height="9" patternUnits="userSpaceOnUse">
      <circle cx="4.5" cy="4.5" r="2.1" fill="#000" opacity="0.22" />
    </pattern>
    <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <radialGradient id={`${id}-shell`} cx="38%" cy="30%" r="75%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="70%" stopColor="#eef0f4" />
      <stop offset="100%" stopColor="#cdd2db" />
    </radialGradient>
    <radialGradient id={`${id}-hover`} cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor={C.gold} stopOpacity="0.75" />
      <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
    </radialGradient>
  </defs>
);

/** Ava: a floating robot, an egg body, a separate head with a black visor and gold LED eyes. */
export const Ava: React.FC<{ face: Face; size?: number }> = ({ face, size = 420 }) => {
  const id = `ava-${face}`;
  const up = face === "wow";
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 400 460" style={{ overflow: "visible" }}>
      <Defs id={id} />
      <ellipse cx={200} cy={438} rx={110} ry={22} fill={`url(#${id}-hover)`} />
      <g filter={`url(#${id}-sticker)`}>
        <path d="M 200 206 C 288 206 300 292 272 360 C 252 410 148 410 128 360 C 100 292 112 206 200 206 Z" fill={`url(#${id}-shell)`} stroke={LINE} strokeWidth={5} />
        <path d="M 248 240 C 280 280 278 340 258 372" stroke="#000" strokeOpacity={0.12} strokeWidth={18} fill="none" strokeLinecap="round" />
        {/* the Verb mark (verb/frontend/landing/public/verb-mark.svg), the tick, without its cream tile */}
        <g transform="translate(174 264) scale(0.82) rotate(-5 32 32)">
          <path d="M17.5 24 L27 36.5 L30.5 50 L8.5 29 Z" fill={C.gold} />
          <path d="M27 36.5 L50 10 L54.5 14.5 L30.5 50 Z" fill="#15141A" />
        </g>
        <g transform={up ? "rotate(70 112 258)" : "rotate(12 112 258)"}>
          <ellipse cx={112} cy={300} rx={22} ry={58} fill={`url(#${id}-shell)`} stroke={LINE} strokeWidth={5} />
        </g>
        <g transform={up ? "rotate(-70 288 258)" : "rotate(-12 288 258)"}>
          <ellipse cx={288} cy={300} rx={22} ry={58} fill={`url(#${id}-shell)`} stroke={LINE} strokeWidth={5} />
        </g>
        <ellipse cx={200} cy={128} rx={96} ry={66} fill={`url(#${id}-shell)`} stroke={LINE} strokeWidth={5} />
        <ellipse cx={104} cy={132} rx={10} ry={20} fill={C.gold} stroke={LINE} strokeWidth={4} />
        <ellipse cx={296} cy={132} rx={10} ry={20} fill={C.gold} stroke={LINE} strokeWidth={4} />
        <ellipse cx={200} cy={136} rx={74} ry={44} fill="#0e1016" />
        <ellipse cx={176} cy={112} rx={30} ry={9} fill="#fff" opacity={0.18} transform="rotate(-12 176 112)" />
        <g filter={`url(#${id}-glow)`} fill={C.gold} stroke={C.gold}>
          {up ? (
            <>
              <ellipse cx={170} cy={138} rx={17} ry={22} stroke="none" />
              <ellipse cx={230} cy={138} rx={17} ry={22} stroke="none" />
            </>
          ) : (
            <>
              <path d="M 150 146 Q 170 120 190 146" strokeWidth={9} fill="none" strokeLinecap="round" />
              <path d="M 210 146 Q 230 120 250 146" strokeWidth={9} fill="none" strokeLinecap="round" />
            </>
          )}
        </g>
      </g>
    </svg>
  );
};

/** Hair: a cloud of curls behind the head and a curly fringe over the forehead. */
const Curls: React.FC<{ front?: boolean }> = ({ front }) => {
  const HAIR = "#17110e", HI = "#3a2c24";
  const back: [number, number, number][] = [
    [200, 70, 62], [140, 86, 52], [262, 86, 52], [96, 130, 46], [304, 130, 46], [82, 186, 40], [318, 186, 40],
    [92, 238, 34], [308, 238, 34], [170, 56, 40], [232, 56, 40], [116, 104, 40], [286, 104, 40],
  ];
  const fringe: [number, number, number][] = [[138, 150, 28], [172, 138, 30], [206, 134, 30], [240, 140, 28], [266, 156, 24], [118, 172, 22]];
  const set = front ? fringe : back;
  return (
    <g>
      {set.map(([x, y, r], k) => <circle key={k} cx={x} cy={y} r={r} fill={HAIR} stroke={LINE} strokeWidth={front ? 0 : 5} />)}
      {set.map(([x, y, r], k) => (
        <path key={`c${k}`} d={`M ${x - r * 0.4} ${y} a ${r * 0.4} ${r * 0.4} 0 1 1 ${r * 0.5} ${r * 0.3} a ${r * 0.2} ${r * 0.2} 0 1 1 ${-r * 0.1} ${-r * 0.3}`}
          stroke={HI} strokeWidth={3.5} fill="none" strokeLinecap="round" transform={`rotate(${(k * 67) % 360} ${x} ${y})`} />
      ))}
    </g>
  );
};

/** Vishnu: a half-body cartoon from his own footage. `happy` points up with a grin; `wow` is wide-eyed, mouth open. */
export const Vishnu: React.FC<{ face: Face; size?: number }> = ({ face, size = 420 }) => {
  const id = `vis-${face}`;
  const SKIN = "#9a6544", TEE = "#cfd9de";
  const wow = face === "wow";
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 400 460" style={{ overflow: "visible" }}>
      <Defs id={id} />
      <clipPath id={`${id}-face`}><ellipse cx={200} cy={228} rx={76} ry={92} /></clipPath>
      <clipPath id={`${id}-tee`}><path d="M 50 470 Q 62 362 150 342 L 250 342 Q 338 362 350 470 Z" /></clipPath>
      <g filter={`url(#${id}-sticker)`}>
        <Curls />
        <path d="M 50 470 Q 62 362 150 342 L 250 342 Q 338 362 350 470 Z" fill={TEE} stroke={LINE} strokeWidth={6} strokeLinejoin="round" />
        <rect x={230} y={330} width={130} height={140} fill={`url(#${id}-dots)`} clipPath={`url(#${id}-tee)`} />
        <rect x={172} y={290} width={56} height={64} fill={SKIN} stroke={LINE} strokeWidth={6} />
        <path d="M 160 344 Q 200 384 240 344" fill={SKIN} stroke={LINE} strokeWidth={6} />
        <ellipse cx={124} cy={238} rx={13} ry={20} fill={SKIN} stroke={LINE} strokeWidth={5} />
        <ellipse cx={276} cy={238} rx={13} ry={20} fill={SKIN} stroke={LINE} strokeWidth={5} />
        <ellipse cx={200} cy={228} rx={76} ry={92} fill={SKIN} stroke={LINE} strokeWidth={6} />
        <path d="M 236 150 Q 300 230 236 320 L 300 320 L 300 150 Z" fill={`url(#${id}-dots)`} clipPath={`url(#${id}-face)`} />
        <Curls front />
        <path d={wow ? "M 140 184 Q 160 170 184 180" : "M 142 194 Q 162 186 184 192"} stroke={LINE} strokeWidth={9} fill="none" strokeLinecap="round" />
        <path d={wow ? "M 216 180 Q 240 170 260 184" : "M 216 192 Q 238 186 258 194"} stroke={LINE} strokeWidth={9} fill="none" strokeLinecap="round" />
        <g>
          {[[134, 194], [208, 194]].map(([x, y]) => <rect key={x} x={x} y={203} width={58} height={42} rx={7} fill="#ffffff" fillOpacity={0.18} stroke={LINE} strokeWidth={9} />)}
          <path d="M 192 214 Q 200 208 208 214" stroke={LINE} strokeWidth={8} fill="none" />
          <line x1={134} y1={212} x2={118} y2={222} stroke={LINE} strokeWidth={8} strokeLinecap="round" />
          <line x1={266} y1={212} x2={282} y2={222} stroke={LINE} strokeWidth={8} strokeLinecap="round" />
        </g>
        {[163, 237].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy={225} rx={wow ? 12 : 10} ry={wow ? 14 : 9} fill="#fff" />
            <circle cx={x + 1} cy={226} r={wow ? 6 : 5.5} fill={LINE} />
          </g>
        ))}
        <path d="M 200 238 Q 190 266 196 276 Q 204 280 212 274" stroke={LINE} strokeWidth={5} fill="none" strokeLinecap="round" />
        <path d="M 178 292 Q 200 286 222 292" stroke={LINE} strokeOpacity={0.25} strokeWidth={6} fill="none" strokeLinecap="round" />
        {wow ? (
          <ellipse cx={200} cy={308} rx={16} ry={20} fill="#3b1a14" stroke={LINE} strokeWidth={5} />
        ) : (
          <g>
            <path d="M 170 298 Q 200 336 230 298 Z" fill="#3b1a14" stroke={LINE} strokeWidth={5} strokeLinejoin="round" />
            <path d="M 176 300 L 224 300 L 220 308 L 180 308 Z" fill="#fff" />
          </g>
        )}
        {wow ? null : (
          <g>
            <path d="M 300 470 Q 300 400 318 352" stroke={LINE} strokeWidth={6} fill={TEE} />
            <path d="M 286 470 L 290 360 Q 300 340 330 344 L 350 470 Z" fill={TEE} stroke={LINE} strokeWidth={6} strokeLinejoin="round" />
            <ellipse cx={322} cy={330} rx={30} ry={28} fill={SKIN} stroke={LINE} strokeWidth={6} />
            <rect x={314} y={248} width={20} height={78} rx={10} fill={SKIN} stroke={LINE} strokeWidth={6} />
            <path d="M 302 322 Q 316 316 332 322" stroke={LINE} strokeWidth={4} fill="none" />
          </g>
        )}
      </g>
      {wow ? (
        <g stroke={LINE} strokeWidth={7} strokeLinecap="round">
          <line x1={86} y1={92} x2={60} y2={66} /><line x1={70} y1={140} x2={36} y2={134} /><line x1={316} y1={92} x2={342} y2={66} /><line x1={332} y1={140} x2={366} y2={134} />
        </g>
      ) : null}
    </svg>
  );
};

/** The pick sheet: Ava and Vishnu, each in two moods, on halftone paper. 2000 x 1200. */
export const CharacterSheet: React.FC = () => (
  <AbsoluteFill style={{ background: "#f3f1ec", flexDirection: "row", justifyContent: "space-around", alignItems: "center", padding: 40 }}>
    <svg width="0" height="0"><defs><pattern id="paper-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="1.6" fill="#000" opacity="0.07" /></pattern></defs></svg>
    <AbsoluteFill><svg width="100%" height="100%"><rect width="100%" height="100%" fill="url(#paper-dots)" /></svg></AbsoluteFill>
    {[
      { name: "Ava", line: "the robot: floats, points, reacts", A: Ava },
      { name: "Vishnu", line: "you, for the parts that are your story", A: Vishnu },
    ].map(({ name, line, A }) => (
      <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, zIndex: 1 }}>
        <div style={{ display: "flex", gap: 60, alignItems: "flex-end" }}>
          <A face="happy" size={400} />
          <A face="wow" size={400} />
        </div>
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 64, color: C.ink, marginTop: 30 }}>{name}</div>
        <div style={{ fontFamily: F.body, fontSize: 32, color: C.graphite }}>{line}</div>
      </div>
    ))}
  </AbsoluteFill>
);
