import React from "react";
import { random } from "remotion";
import { C, NUNITO } from "./palette";

// ---- Quantum processor in its sample holder, drawn top-down in local coords (package 640 wide,
// centred on 0,0). Wrap it in a transform to lay it on the table (e.g. scale(1 0.55)).
// Real reference: superconducting chips (IBM/Google) sit in a gold-plated holder with coax (SMP)
// connectors round the edge, wire-bonded to a silicon die patterned with cross-shaped qubits
// and meandering readout resonators.
const meander = (x: number, y: number, n: number, w: number, h: number) => {
  let d = `M${x},${y}`;
  for (let i = 0; i < n; i++) d += ` l${w},0 l0,${i % 2 ? -h : h}`;
  return d;
};

export const QuantumChipTop: React.FC<{ fr: number; glow?: number; qubitGlow?: (i: number) => number }> = ({ fr, glow = 1, qubitGlow }) => {
  const P = 320, D = 190;
  const qs = Array.from({ length: 16 }, (_, i) => ({ x: -D + 47.5 + (i % 4) * 95, y: -D + 47.5 + Math.floor(i / 4) * 95 }));
  const sides = [0, 1, 2, 3];
  return (
    <g>
      {/* gold-plated holder with a milled pocket */}
      <rect x={-P} y={-P} width={2 * P} height={2 * P} rx={34} fill="#D9A247" />
      <rect x={-P + 10} y={-P + 10} width={2 * P - 20} height={2 * P - 20} rx={28} fill="#F0C46A" />
      <rect x={-P + 60} y={-P + 60} width={2 * P - 120} height={2 * P - 120} rx={18} fill="#34266E" />
      {/* PCB traces from each connector to the die */}
      {sides.map((sd) =>
        [-1, 0, 1].map((j) => {
          const a = (sd * Math.PI) / 2;
          const along = j * 150;
          const ex = Math.cos(a) * (P - 40) - Math.sin(a) * along, ey = Math.sin(a) * (P - 40) + Math.cos(a) * along;
          const ix = Math.cos(a) * (D + 30) - Math.sin(a) * j * 60, iy = Math.sin(a) * (D + 30) + Math.cos(a) * j * 60;
          return <path key={`${sd}${j}`} d={`M${ex},${ey} L${(ex + ix) / 2 + Math.cos(a) * 20},${(ey + iy) / 2 + Math.sin(a) * 20} L${ix},${iy}`} fill="none" stroke="#E9B95C" strokeWidth={12} strokeLinejoin="round" opacity={0.9} />;
        })
      )}
      {/* SMP connectors */}
      {sides.map((sd) =>
        [-1, 0, 1].map((j) => {
          const a = (sd * Math.PI) / 2, along = j * 150;
          const cx = Math.cos(a) * (P - 34) - Math.sin(a) * along, cy = Math.sin(a) * (P - 34) + Math.cos(a) * along;
          return (
            <g key={`c${sd}${j}`}>
              <circle cx={cx} cy={cy} r={27} fill="#B9852F" />
              <circle cx={cx} cy={cy} r={20} fill="#FBE3A0" />
              <circle cx={cx} cy={cy} r={9} fill="#5B3A12" />
            </g>
          );
        })
      )}
      {/* silicon die */}
      <rect x={-D - 8} y={-D - 8} width={2 * D + 16} height={2 * D + 16} rx={6} fill="#120B36" />
      <rect x={-D} y={-D} width={2 * D} height={2 * D} rx={4} fill="url(#die)" />
      {/* bond pads + wire bonds */}
      {sides.map((sd) =>
        Array.from({ length: 7 }, (_, j) => {
          const a = (sd * Math.PI) / 2, along = -135 + j * 45;
          const px = Math.cos(a) * (D - 10) - Math.sin(a) * along, py = Math.sin(a) * (D - 10) + Math.cos(a) * along;
          const qx = Math.cos(a) * (D + 34) - Math.sin(a) * along * 1.3, qy = Math.sin(a) * (D + 34) + Math.cos(a) * along * 1.3;
          return (
            <g key={`b${sd}${j}`}>
              <rect x={px - 6} y={py - 6} width={12} height={12} fill="#C9C2E8" />
              <path d={`M${px},${py} Q${(px + qx) / 2 + Math.cos(a) * 8},${(py + qy) / 2 + Math.sin(a) * 8} ${qx},${qy}`} fill="none" stroke="#F4EEFF" strokeWidth={2} opacity={0.85} />
            </g>
          );
        })
      )}
      {/* couplers between neighbouring qubits */}
      {qs.map((q, i) => (
        <g key={`k${i}`} stroke="#7FE6D6" strokeWidth={3} opacity={0.75}>
          {i % 4 < 3 && <line x1={q.x + 22} y1={q.y} x2={q.x + 73} y2={q.y} />}
          {i < 12 && <line x1={q.x} y1={q.y + 22} x2={q.x} y2={q.y + 73} />}
        </g>
      ))}
      {/* readout resonators (meanders) */}
      {qs.map((q, i) => (
        <path key={`m${i}`} d={meander(q.x + 16, q.y - 40, 6, 6, 14)} fill="none" stroke={C.teal} strokeWidth={2} opacity={0.8} />
      ))}
      {/* cross-shaped qubits, each glowing */}
      {qs.map((q, i) => {
        const g = (qubitGlow ? qubitGlow(i) : 0.6 + 0.4 * Math.sin(fr * 0.12 + i * 1.3)) * glow;
        return (
          <g key={`q${i}`} transform={`translate(${q.x} ${q.y})`}>
            <circle r={48} fill="url(#glowGold)" opacity={g} />
            <path transform="scale(1.3)" d="M-4,-20 L4,-20 L4,-4 L20,-4 L20,4 L4,4 L4,20 L-4,20 L-4,4 L-20,4 L-20,-4 L-4,-4Z" fill="#FFE9A8" stroke="#FFF7DA" strokeWidth={1.5} />
          </g>
        );
      })}
    </g>
  );
};

// The chip laid on the table with thickness and its own light. (x, y) = centre of the top face.
export const QuantumChip: React.FC<{ fr: number; x: number; y: number; s?: number; k?: number; rot?: number; glow?: number }> = ({ fr, x, y, s = 1, k = 0.5, rot = 0, glow = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={0} cy={60} rx={430} ry={170} fill="#120830" opacity={0.5} filter="url(#soft14)" />
    {/* slab sides */}
    <g transform={`translate(0 34) scale(1 ${k}) rotate(${rot})`}>
      <rect x={-320} y={-320} width={640} height={640} rx={34} fill="#9A6A26" />
    </g>
    <g transform={`translate(0 17) scale(1 ${k}) rotate(${rot})`}>
      <rect x={-320} y={-320} width={640} height={640} rx={34} fill="#B5802F" />
    </g>
    <g transform={`scale(1 ${k}) rotate(${rot})`}>
      <QuantumChipTop fr={fr} glow={glow} />
    </g>
  </g>
);

export const ChipDefs: React.FC = () => (
  <defs>
    <linearGradient id="die" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#3B3F9C" />
      <stop offset="0.5" stopColor="#2B2C7A" />
      <stop offset="1" stopColor="#4A2F8E" />
    </linearGradient>
    <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#1C2A6B" />
      <stop offset="1" stopColor="#141C4E" />
    </linearGradient>
    <linearGradient id="alu" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#8E86C8" />
      <stop offset="0.5" stopColor="#B9B2E6" />
      <stop offset="1" stopColor="#7F77BD" />
    </linearGradient>
    <linearGradient id="aluDeck" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#A49CD8" />
      <stop offset="1" stopColor="#7A70B8" />
    </linearGradient>
  </defs>
);

// ---- A laptop on the table, 3/4 front view. (x, y) = centre of the hinge line. Width ~ 760*s.
// `xray` 0..1 opens a circular cut-away in the keyboard deck onto the motherboard and processor.
export const Laptop: React.FC<{ fr: number; x: number; y: number; s?: number; xray?: number; xrayR?: number; cpuGlow?: number }> = ({ fr, x, y, s = 1, xray = 0, xrayR = 150, cpuGlow = 0 }) => {
  const W = 380, Hs = 470, deckD = 250;
  // keyboard deck: trapezoid from hinge (narrow, far) to front edge (wide, near)
  const deck = `M${-W},0 L${W},0 L${W + 50},${deckD} L${-W - 50},${deckD}Z`;
  const keys: React.ReactNode[] = [];
  for (let r = 0; r < 5; r++) {
    const t0 = 0.08 + r * 0.115, t1 = t0 + 0.095;
    const y0 = deckD * t0, y1 = deckD * t1;
    const half0 = W - 40 + 50 * t0, half1 = W - 40 + 50 * t1;
    const n = r === 4 ? 9 : 13;
    for (let i = 0; i < n; i++) {
      if (r === 4 && (i === 3 || i === 5)) continue;
      const a0 = -half0 + (2 * half0 * i) / n + 3, b0 = -half0 + (2 * half0 * (i + 1)) / n - 3;
      const a1 = -half1 + (2 * half1 * i) / n + 3, b1 = -half1 + (2 * half1 * (i + 1)) / n - 3;
      const wide = r === 4 && i === 4;
      const bb0 = wide ? -half0 + (2 * half0 * 6) / n - 3 : b0, bb1 = wide ? -half1 + (2 * half1 * 6) / n - 3 : b1;
      const lit = random(`key${r}_${i}`) > 0.93 && Math.floor(fr / 6) % 3 === (i % 3);
      keys.push(<path key={`${r}_${i}`} d={`M${a0},${y0} L${bb0},${y0} L${bb1},${y1} L${a1},${y1}Z`} fill={lit ? "#3E3584" : "#2B2468"} stroke="#463C8E" strokeWidth={1.2} />);
    }
  }
  const cx = 0, cy = deckD * 0.5;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* shadow */}
      <ellipse cx={0} cy={deckD + 10} rx={W + 120} ry={46} fill="#120830" opacity={0.55} filter="url(#soft14)" />
      {/* screen lid (tilted back) */}
      <path d={`M${-W + 10},0 L${-W + 30},${-Hs} L${W - 30},${-Hs} L${W - 10},0Z`} fill="#1B1546" />
      <path d={`M${-W + 28},-14 L${-W + 46},${-Hs + 22} L${W - 46},${-Hs + 22} L${W - 28},-14Z`} fill="url(#screen)" />
      {/* screen content: a code editor, lines of colour */}
      <g opacity={0.95}>
        {Array.from({ length: 14 }, (_, i) => {
          const yy = -Hs + 60 + i * 28;
          const ind = [0, 1, 2, 2, 1, 2, 3, 3, 2, 1, 0, 1, 2, 1][i] * 26;
          const len = 80 + random(`ln${i}`) * 300;
          const col = ["#7FE6D6", "#FFCB57", "#F2678E", "#CFC4F5", "#8FB8FF"][i % 5];
          return (
            <g key={i}>
              <rect x={-W + 74} y={yy} width={22} height={9} rx={4} fill="#4B4D96" />
              <rect x={-W + 110 + ind} y={yy} width={len * 0.5} height={10} rx={5} fill={col} opacity={0.85} />
              <rect x={-W + 110 + ind + len * 0.5 + 10} y={yy} width={len * 0.45} height={10} rx={5} fill="#CFC4F5" opacity={0.45} />
            </g>
          );
        })}
        <rect x={-W + 110 + ((fr * 3) % 120)} y={-Hs + 60 + 9 * 28 - 4} width={4} height={18} fill={C.cream} opacity={Math.floor(fr / 15) % 2 ? 0.9 : 0} />
      </g>
      <circle cx={0} cy={-Hs + 12} r={4} fill="#0D0A26" />
      {/* screen light spill on the deck */}
      <path d={`M${-W},0 L${W},0 L${W + 60},${deckD} L${-W - 60},${deckD}Z`} fill="#6F8CFF" opacity={0.0} />
      {/* deck */}
      <path d={deck} fill="url(#aluDeck)" />
      <path d={`M${-W - 50},${deckD} L${W + 50},${deckD} L${W + 46},${deckD + 14} L${-W - 46},${deckD + 14}Z`} fill="#5D5498" />
      {keys}
      {/* trackpad */}
      <path d={`M-110,${deckD * 0.7} L110,${deckD * 0.7} L118,${deckD * 0.95} L-118,${deckD * 0.95}Z`} fill="#9188CC" stroke="#B3ABE2" strokeWidth={1.5} />
      {/* screen glow on the keys */}
      <path d={deck} fill="url(#deckGlow)" opacity={0.5} />
      {/* x-ray cut-away onto the motherboard */}
      {xray > 0 && (
        <g>
          <clipPath id="xr"><ellipse cx={cx} cy={cy} rx={xrayR * xray * 1.7} ry={xrayR * xray * 0.75} /></clipPath>
          <g clipPath="url(#xr)">
            <rect x={-W - 60} y={-10} width={2 * W + 120} height={deckD + 20} fill="#15344A" />
            {Array.from({ length: 26 }, (_, i) => (
              <path key={i} d={`M${-W + i * 30},0 L${-W + i * 30 + (i % 3) * 20},${deckD * 0.4} L${-W + i * 30 + (i % 3) * 20},${deckD}`} fill="none" stroke="#2FA58F" strokeWidth={3} opacity={0.6} />
            ))}
            <rect x={-200} y={30} width={60} height={34} rx={4} fill="#2C2C4E" />
            <rect x={150} y={40} width={70} height={40} rx={4} fill="#2C2C4E" />
            {/* processor */}
            <g transform={`translate(${cx} ${cy}) scale(1 0.5)`}>
              <rect x={-120} y={-120} width={240} height={240} rx={10} fill="#3A3A62" />
              <rect x={-86} y={-86} width={172} height={172} rx={6} fill="#C9C6E6" />
              <rect x={-74} y={-74} width={148} height={148} rx={4} fill="#2B2468" />
              {/* billions of switches, too small to count: a lit grid of 0s and 1s */}
              {Array.from({ length: 144 }, (_, i) => {
                const c = i % 12, r = Math.floor(i / 12);
                const on = random(`cpu${i}_${Math.floor(fr / 4 + random(`cpuo${i}`) * 7)}`) > 0.5;
                return <rect key={i} x={-70 + c * 11.7} y={-70 + r * 11.7} width={9} height={9} rx={2} fill={on ? "#FFCB57" : "#4B3FA0"} />;
              })}
              <circle r={170} fill="url(#glowGold)" opacity={cpuGlow} />
            </g>
          </g>
          <ellipse cx={cx} cy={cy} rx={xrayR * xray * 1.7} ry={xrayR * xray * 0.75} fill="none" stroke={C.cream} strokeWidth={4} opacity={0.8} />
        </g>
      )}
    </g>
  );
};

export const LaptopDefs: React.FC = () => (
  <defs>
    <radialGradient id="deckGlow" cx="0.5" cy="0" r="0.9">
      <stop offset="0" stopColor="#9FB6FF" stopOpacity={0.6} />
      <stop offset="1" stopColor="#9FB6FF" stopOpacity={0} />
    </radialGradient>
  </defs>
);

// ---- A field of switches (transistors as tiny 0/1 cells) for the zoom through the processor.
export const SwitchGrid: React.FC<{ fr: number; x: number; y: number; cols: number; rows: number; cell: number; hero?: [number, number]; seed?: string; flick?: number }> = ({ fr, x, y, cols, rows, cell, hero, seed = "sw", flick = 1 }) => (
  <g transform={`translate(${x} ${y})`}>
    {Array.from({ length: cols * rows }, (_, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const on = random(`${seed}${i}_${Math.floor((fr * flick) / 5 + random(`${seed}o${i}`) * 9)}`) > 0.5;
      const isHero = hero && hero[0] === c && hero[1] === r;
      return (
        <g key={i} transform={`translate(${c * cell} ${r * cell})`}>
          <rect x={4} y={4} width={cell - 8} height={cell - 8} rx={cell * 0.18} fill={on ? "#FFCB57" : "#2B2468"} opacity={isHero ? 0 : on ? 0.85 : 1} />
          <text x={cell / 2} y={cell * 0.66} textAnchor="middle" fontFamily={NUNITO} fontWeight={900} fontSize={cell * 0.45} fill={on ? "#7A3F10" : "#6E64B8"} opacity={isHero ? 0 : 1}>{on ? 1 : 0}</text>
        </g>
      );
    })}
  </g>
);
