import React from "react";
import { random } from "remotion";

// The tease's padlock: gold body, steel shackle, keyhole. `crack` 0..1 opens glowing seams in
// stages (each seam has the crack level at which it starts), `strain` lifts and trembles the
// shackle, `glint` 0..1 sweeps a highlight across the body, `pulse` breathes the seam glow.
// Local coords: body x -150..150, y -20..200; shackle up to y -182. (0, 0) = top of the body.

type Seam = { at: number; pts: [number, number][] };
export const SEAMS: Seam[] = [
  { at: 0.0, pts: [[0, 56], [-20, 34], [-16, 12], [-44, -2], [-58, -20]] },
  { at: 0.04, pts: [[22, 72], [50, 60], [70, 84], [104, 70]] },
  { at: 0.36, pts: [[104, 70], [126, 96], [150, 90]] },
  { at: 0.38, pts: [[-44, -2], [-78, 18], [-112, 8], [-150, 30]] },
  { at: 0.42, pts: [[0, 140], [-14, 168], [4, 200]] },
  { at: 0.61, pts: [[-78, 18], [-90, 60], [-124, 92], [-150, 108]] },
  { at: 0.63, pts: [[50, 60], [60, 22], [88, 6], [96, -20]] },
  { at: 0.82, pts: [[-14, 168], [-60, 178], [-96, 160], [-130, 200]] },
  { at: 0.84, pts: [[70, 84], [84, 130], [120, 150], [150, 172]] },
  { at: 0.88, pts: [[-124, 92], [-108, 140], [-78, 152]] },
  { at: 0.9, pts: [[-16, 12], [10, -8], [30, -20]] },
];
const seamLen = (s: Seam) => s.pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - s.pts[i][0], p[1] - s.pts[i][1]), 0);
const seamD = (s: Seam) => s.pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");

// Chips flying off the seams: (stage time in frames, count, seed). Positions in lock-local coords.
export const Chips: React.FC<{ fr: number; bursts: { at: number; n: number; power: number }[] }> = ({ fr, bursts }) => (
  <g>
    {bursts.flatMap((b, bi) =>
      Array.from({ length: b.n }, (_, i) => {
        const age = (fr - b.at) / 30;
        if (age < 0 || age > 2.2) return null;
        const seam = SEAMS[Math.floor(random(`cs${bi}_${i}`) * SEAMS.length)];
        const p0 = seam.pts[seam.pts.length - 1 - Math.floor(random(`cp${bi}_${i}`) * 2)];
        const a = random(`ca${bi}_${i}`) * Math.PI * 2;
        const sp = (160 + random(`cv${bi}_${i}`) * 340) * b.power;
        const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp * 0.7 - 260 * b.power;
        const x = p0[0] + vx * age, y = p0[1] + vy * age + 0.5 * 900 * age * age;
        const sz = 5 + random(`cz${bi}_${i}`) * 11;
        const rot = age * (300 + random(`cr${bi}_${i}`) * 500) * (i % 2 ? 1 : -1);
        const k = Math.max(0, 1 - age / 2.2);
        return (
          <g key={`${bi}_${i}`} transform={`translate(${x} ${y}) rotate(${rot}) scale(${0.4 + 0.6 * k})`}>
            <path d={`M${-sz},${-sz * 0.4} L${sz * 0.6},${-sz} L${sz},${sz * 0.5} L${-sz * 0.3},${sz * 0.8}Z`} fill={i % 3 ? "#FFCB57" : "#FFE38A"} stroke="#B3701F" strokeWidth={1.5} />
            {i % 4 === 0 && <circle r={sz * 1.6} fill="#FFE9A8" opacity={0.35 * k} />}
          </g>
        );
      })
    )}
  </g>
);

export const CrackLock: React.FC<{ fr: number; crack: number; strain?: number; shut?: number; glint?: number; pulse?: number; squash?: number }> = ({ fr, crack, strain = 0, shut = 1, glint = -1, pulse = 1, squash = 0 }) => {
  // shackle: open (lifted 60) before it clacks shut; strain lifts it again and trembles it
  const tremble = strain > 0 ? Math.sin(fr * 2.3) * 2.2 * strain + Math.sin(fr * 3.7) * 1.2 * strain : 0;
  const lift = 60 * (1 - shut) + 22 * strain + tremble;
  const tiltSh = 9 * strain;
  const hot = crack > 0 ? 0.75 + 0.25 * pulse : 0;
  return (
    <g transform={`scale(${1 + squash * 0.08} ${1 - squash * 0.1})`}>
      {/* shackle */}
      <g transform={`translate(0 ${-lift}) rotate(${tiltSh} 92 0)`}>
        <path d="M-92,6 L-92,-90 A92 92 0 0 1 92,-90 L92,6" fill="none" stroke="#3E356F" strokeWidth={52} />
        <path d="M-92,6 L-92,-90 A92 92 0 0 1 92,-90 L92,6" fill="none" stroke="url(#steel)" strokeWidth={40} />
        <path d="M-104,-20 L-104,-90 A104 104 0 0 1 -42,-184" fill="none" stroke="#FFFFFF" strokeWidth={6} opacity={0.6} strokeLinecap="round" />
        <path d="M70,-150 A92 92 0 0 1 100,-90" fill="none" stroke="#4E4590" strokeWidth={8} opacity={0.5} strokeLinecap="round" />
      </g>
      {/* body: drop shadow side, face, bevel, keyhole */}
      <rect x={-150} y={-20} width={300} height={220} rx={36} fill="#9A5E1E" transform="translate(10 12)" />
      <rect x={-150} y={-20} width={300} height={220} rx={36} fill="url(#lockBody)" />
      <rect x={-150} y={-20} width={300} height={220} rx={36} fill="none" stroke="#FFF0B8" strokeWidth={4} opacity={0.55} />
      <rect x={-128} y={-4} width={256} height={10} rx={5} fill="#FFF3C4" opacity={0.7} />
      <rect x={-136} y={176} width={272} height={10} rx={5} fill="#B3701F" opacity={0.45} />
      {[-110, 110].map((x) => [10, 170].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r={7} fill="#C9862C" stroke="#FFE38A" strokeWidth={2} />))}
      <circle cx={0} cy={70} r={30} fill="#5B3A12" />
      <path d="M-14,82 L14,82 L20,146 L-20,146Z" fill="#5B3A12" />
      <circle cx={-8} cy={62} r={8} fill="#7A5220" />
      {/* glint */}
      {glint >= 0 && glint <= 1 && (
        <g>
          <clipPath id="lockFace"><rect x={-150} y={-20} width={300} height={220} rx={36} /></clipPath>
          <g clipPath="url(#lockFace)">
            <rect x={-260 + glint * 520} y={-80} width={60} height={360} fill="#FFFBEA" opacity={0.55} transform={`rotate(22 ${-230 + glint * 520} 90)`} />
          </g>
        </g>
      )}
      {/* seams: dark split, gold outer glow, white-hot core */}
      {crack > 0 && SEAMS.map((s, i) => {
        if (crack <= s.at) return null;
        const L = seamLen(s);
        const k = Math.min(1, (crack - s.at) / 0.12);
        const d = seamD(s);
        const dash = { strokeDasharray: L, strokeDashoffset: L * (1 - k) };
        return (
          <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={d} stroke="#FFC24A" strokeWidth={34} opacity={0.5 * hot} filter="url(#soft8)" {...dash} />
            <path d={d} stroke="#4A2C0C" strokeWidth={15} {...dash} />
            <path d={d} stroke="#FFE38A" strokeWidth={8} opacity={hot} {...dash} />
            <path d={d} stroke="#FFFBEA" strokeWidth={3.6} opacity={hot} {...dash} />
          </g>
        );
      })}
      {/* light leaking from the cracks onto everything near */}
      {crack > 0 && <circle cx={0} cy={80} r={240} fill="url(#glowGold)" opacity={Math.min(1, crack * 1.3) * (0.4 + 0.25 * pulse)} />}
    </g>
  );
};
