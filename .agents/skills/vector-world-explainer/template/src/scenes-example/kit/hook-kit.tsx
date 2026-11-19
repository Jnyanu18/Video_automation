import React from "react";
import { random } from "remotion";
import { C, COND, NUNITO } from "../../kit/palette";
import { loadFont as loadGoogleSans } from "@remotion/google-fonts/GoogleSans";

// Hook kit: the supercomputer hall, a Willow-style Google chip, the Google Quantum AI lockup,
// the stopwatch bezel, the 10-septillion-years odometer and the deep-time tape.
export const { fontFamily: GSANS } = loadGoogleSans("normal", { weights: ["400", "500"] });

// ---------------------------------------------------------------------------------------------
// The supercomputer hall: one-point perspective down an aisle of server cabinets, vanishing point
// (vx, vy). `power` 0..1 runs a power-on cascade from the far end to the near end (LEDs and
// ceiling lights). `fr` drives blinking. Drawn in world coords, wider than the frame.
const F = 420; // focal length in px for the aisle projection
export const Hall: React.FC<{ fr: number; vx: number; vy: number; power: number; base?: number }> = ({ fr, vx, vy, power, base = 0.35 }) => {
  const P = (X: number, Y: number, z: number): [number, number] => [vx + (X / z) * F, vy + (Y / z) * F];
  const AW = 2.2, FLOOR = 2.6, TOP = -3.4; // aisle half-width, floor and cabinet-top heights (world units)
  const Z = Array.from({ length: 15 }, (_, i) => 0.62 * Math.pow(1.22, i)); // cabinet boundaries near -> far
  const zFar = Z[Z.length - 1];
  const litAt = (z: number) => {
    // the cascade reaches depth z at power = 1 - (z/zFar)
    const need = 1 - z / zFar;
    return Math.max(base, Math.min(1, (power - need) * 4 + base));
  };
  const cab = (side: -1 | 1, i: number) => {
    const z0 = Z[i], z1 = Z[i + 1];
    const X = side * AW;
    const [ax, ay] = P(X, TOP, z0), [bx, by] = P(X, TOP, z1), [cx, cy] = P(X, FLOOR, z1), [dx, dy] = P(X, FLOOR, z0);
    const lit = litAt((z0 + z1) / 2);
    const leds: React.ReactNode[] = [];
    const rows = 11, cols = 3;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.6) / (cols + 0.4), v = 0.1 + (r / rows) * 0.8;
        const z = z0 + (z1 - z0) * u;
        const [lx, ly] = P(X, TOP + (FLOOR - TOP) * v, z);
        const seed = `${side}${i}${r}${c}`;
        const on = random(`led${seed}_${Math.floor(fr / (3 + random(`ls${seed}`) * 9)) + Math.floor(random(`lo${seed}`) * 7)}`) > 0.42;
        const col = random(`lc${seed}`) > 0.82 ? C.gold : random(`lc2${seed}`) > 0.9 ? C.coral : C.tealHi;
        const sz = Math.max(1.2, 7 / z);
        leds.push(<rect key={`${r}${c}`} x={lx - sz * 1.4} y={ly - sz * 0.45} width={sz * 2.8} height={sz * 0.9} rx={sz * 0.4} fill={col} opacity={(on ? 0.95 : 0.15) * lit} />);
        if (on && lit > 0.8 && sz > 3) leds.push(<circle key={`g${r}${c}`} cx={lx} cy={ly} r={sz * 3} fill={col === C.tealHi ? "url(#glowTeal)" : "url(#glowGold)"} opacity={0.5 * lit} />);
      }
    // door mesh: vertical strokes across the face
    const mesh = Array.from({ length: 5 }, (_, k) => {
      const z = z0 + ((z1 - z0) * (k + 1)) / 6;
      const [m0x, m0y] = P(X, TOP + 0.2, z), [m1x, m1y] = P(X, FLOOR - 0.2, z);
      return <line key={k} x1={m0x} y1={m0y} x2={m1x} y2={m1y} stroke="#2E2266" strokeWidth={Math.max(1, 3 / z)} />;
    });
    return (
      <g key={`${side}${i}`}>
        <path d={`M${ax},${ay} L${bx},${by} L${cx},${cy} L${dx},${dy}Z`} fill={lit > 0.7 ? (i % 2 ? "#251B5C" : "#2A1F63") : i % 2 ? "#1B1344" : "#1E1549"} stroke={lit > 0.7 ? "#5341A6" : "#3A2C7C"} strokeWidth={Math.max(1.2, 6 / z0)} />
        {mesh}
        {leds}
        {/* top edge highlight */}
        <path d={`M${ax},${ay} L${bx},${by}`} stroke="#5B48B0" strokeWidth={Math.max(1, 5 / z0)} opacity={0.7} />
      </g>
    );
  };
  // ceiling light strips down the aisle
  const lights = Z.slice(0, -1).map((z, i) => {
    const [l0x, l0y] = P(-0.5, TOP - 0.55, z), [l1x, l1y] = P(0.5, TOP - 0.55, z), [l2x, l2y] = P(0.5, TOP - 0.55, z + (Z[i + 1] - z) * 0.45), [l3x, l3y] = P(-0.5, TOP - 0.55, z + (Z[i + 1] - z) * 0.45);
    const lit = Math.min(1, Math.max(0.12, (power - (1 - z / zFar)) * 6));
    return <path key={i} d={`M${l0x},${l0y} L${l1x},${l1y} L${l2x},${l2y} L${l3x},${l3y}Z`} fill="#CFE9FF" opacity={0.18 + 0.55 * lit} />;
  });
  // floor tiles
  const tiles: React.ReactNode[] = [];
  for (let k = -3; k <= 3; k++) {
    const [x0, y0] = P(k * 0.75, FLOOR, Z[0] * 0.6), [x1, y1] = P(k * 0.75, FLOOR, zFar);
    tiles.push(<line key={`v${k}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#3A2C7C" strokeWidth={2} opacity={0.6} />);
  }
  Z.forEach((z, i) => {
    const [x0, y0] = P(-AW, FLOOR, z), [x1] = P(AW, FLOOR, z);
    tiles.push(<line key={`h${i}`} x1={x0} y1={y0} x2={x1} y2={y0} stroke="#3A2C7C" strokeWidth={Math.max(1, 3 / z)} opacity={0.6} />);
  });
  const [fx0, fy0] = P(-AW * 3, FLOOR, Z[0] * 0.5), [fx1] = P(AW * 3, FLOOR, Z[0] * 0.5);
  const [, vyFloor] = P(0, FLOOR, zFar);
  const [, vyTop] = P(0, TOP, zFar);
  const glow = 0.35 + 0.65 * power;
  return (
    <g>
      <rect x={-600} y={-600} width={2280} height={3200} fill="#140C38" />
      {/* far wall glow at the end of the aisle */}
      <ellipse cx={vx} cy={(vyFloor + vyTop) / 2} rx={260} ry={300} fill="url(#glowTeal)" opacity={0.5 * glow} />
      {/* ceiling + floor planes */}
      <path d={`M${-600},${-600} L${1680},${-600} L${vx + 200},${vyTop} L${vx - 200},${vyTop}Z`} fill="#170F3E" />
      <path d={`M${fx0},${fy0 + 1400} L${fx1},${fy0 + 1400} L${vx + 220},${vyFloor} L${vx - 220},${vyFloor}Z`} fill="#22164C" />
      {tiles}
      {lights}
      {/* LED reflections on the polished floor */}
      {[-1, 1].map((side) => (
        <path key={side} d={`M${vx + side * 160},${vyFloor} L${vx + side * 900},${fy0 + 600} L${vx + side * 1200},${fy0 + 600}Z`} fill="url(#glowTeal)" opacity={0.18 * glow} />
      ))}
      {Z.slice(0, -1).map((_, i) => cab(-1, Z.length - 2 - i))}
      {Z.slice(0, -1).map((_, i) => cab(1, Z.length - 2 - i))}
    </g>
  );
};

// ---------------------------------------------------------------------------------------------
// Willow-style chip, top-down in local coords (holder 600 wide): gold-plated holder, wire-bonded
// die with a ~105-qubit square lattice (Willow has 105 qubits on a square grid), couplers between
// neighbours. `qubit(i, x, y)` returns { glow 0..1.5, color } per qubit for choreography.
export type QState = { glow: number; color?: string };
const N = 11, LAT = 26;
export const QUBITS = (() => {
  const out: { x: number; y: number; i: number; j: number }[] = [];
  // 11x11 grid minus 3 cells at each corner and the 4 edge midpoints = 105
  const skip = (i: number, j: number) => {
    const a = Math.min(i, N - 1 - i), b = Math.min(j, N - 1 - j);
    return a + b <= 1 || (i === 5 && b === 0) || (j === 5 && a === 0);
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!skip(i, j)) out.push({ x: (i - (N - 1) / 2) * LAT, y: (j - (N - 1) / 2) * LAT, i, j });
  return out;
})();
export const WillowTop: React.FC<{ fr: number; qubit?: (k: number, x: number, y: number) => QState; glow?: number }> = ({ fr, qubit, glow = 1 }) => {
  const P = 300, D = 168;
  const sides = [0, 1, 2, 3];
  return (
    <g>
      <rect x={-P} y={-P} width={2 * P} height={2 * P} rx={30} fill="#C9923F" />
      <rect x={-P + 9} y={-P + 9} width={2 * P - 18} height={2 * P - 18} rx={24} fill="#EDC36C" />
      {/* screw holes and SMP connectors on the holder */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b], k) => (
        <g key={k}><circle cx={a * (P - 36)} cy={b * (P - 36)} r={16} fill="#9C6A24" /><circle cx={a * (P - 36)} cy={b * (P - 36)} r={9} fill="#5B3A12" /></g>
      ))}
      {sides.map((sd) => [-1, 0, 1].map((j) => {
        const a = (sd * Math.PI) / 2, along = j * 120;
        const cx = Math.cos(a) * (P - 40) - Math.sin(a) * along, cy = Math.sin(a) * (P - 40) + Math.cos(a) * along;
        return <g key={`c${sd}${j}`}><circle cx={cx} cy={cy} r={20} fill="#B9852F" /><circle cx={cx} cy={cy} r={14} fill="#FBE3A0" /><circle cx={cx} cy={cy} r={6} fill="#5B3A12" /></g>;
      }))}
      {/* PCB pocket + traces */}
      <rect x={-P + 74} y={-P + 74} width={2 * P - 148} height={2 * P - 148} rx={14} fill="#2A1F5E" />
      {sides.map((sd) => [-1, 0, 1].map((j) => {
        const a = (sd * Math.PI) / 2;
        const ex = Math.cos(a) * (P - 74) - Math.sin(a) * j * 120, ey = Math.sin(a) * (P - 74) + Math.cos(a) * j * 120;
        const ix = Math.cos(a) * (D + 22) - Math.sin(a) * j * 70, iy = Math.sin(a) * (D + 22) + Math.cos(a) * j * 70;
        return <path key={`t${sd}${j}`} d={`M${ex},${ey} L${ix},${iy}`} stroke="#E2B456" strokeWidth={9} opacity={0.85} />;
      }))}
      {/* die: dark silicon with a faint iridescent sheen */}
      <rect x={-D - 7} y={-D - 7} width={2 * D + 14} height={2 * D + 14} rx={5} fill="#0C0828" />
      <rect x={-D} y={-D} width={2 * D} height={2 * D} rx={3} fill="url(#willowDie)" />
      <path d={`M${-D},${-D * 0.2} L${-D * 0.2},${-D} L${D * 0.15},${-D} L${-D},${D * 0.15}Z`} fill="#8FF3E3" opacity={0.07} />
      {/* bond pads + wires */}
      {sides.map((sd) => Array.from({ length: 9 }, (_, j) => {
        const a = (sd * Math.PI) / 2, along = -136 + j * 34;
        const px = Math.cos(a) * (D - 8) - Math.sin(a) * along, py = Math.sin(a) * (D - 8) + Math.cos(a) * along;
        const qx = Math.cos(a) * (D + 24) - Math.sin(a) * along * 1.25, qy = Math.sin(a) * (D + 24) + Math.cos(a) * along * 1.25;
        return <g key={`b${sd}${j}`}><rect x={px - 4} y={py - 4} width={8} height={8} fill="#C9C2E8" /><path d={`M${px},${py} L${qx},${qy}`} stroke="#F4EEFF" strokeWidth={1.5} opacity={0.8} /></g>;
      }))}
      {/* couplers on the square grid */}
      <g stroke="#58C9BB" strokeWidth={2} opacity={0.55}>
        {QUBITS.map((q, k) => (
          <g key={k}>
            {QUBITS.some((o) => o.i === q.i + 1 && o.j === q.j) && <line x1={q.x + 5} y1={q.y} x2={q.x + LAT - 5} y2={q.y} />}
            {QUBITS.some((o) => o.j === q.j + 1 && o.i === q.i) && <line x1={q.x} y1={q.y + 5} x2={q.x} y2={q.y + LAT - 5} />}
          </g>
        ))}
      </g>
      {/* qubits */}
      {QUBITS.map((q, k) => {
        const s = qubit ? qubit(k, q.x, q.y) : { glow: 0.55 + 0.35 * Math.sin(fr * 0.13 + k * 0.7) };
        const g = s.glow * glow;
        const col = s.color ?? "#FFE9A8";
        return (
          <g key={k} transform={`translate(${q.x} ${q.y})`}>
            {g > 0.05 && <circle r={15} fill={col === "#FFE9A8" ? "url(#glowGold)" : col === C.coral ? "url(#glowCoral)" : "url(#glowTeal)"} opacity={Math.min(1, g)} />}
            <path d="M-2.2,-8 L2.2,-8 L2.2,-2.2 L8,-2.2 L8,2.2 L2.2,2.2 L2.2,8 L-2.2,8 L-2.2,2.2 L-8,2.2 L-8,-2.2 L-2.2,-2.2Z" fill={col} opacity={0.45 + 0.55 * Math.min(1, g)} />
          </g>
        );
      })}
    </g>
  );
};
export const WillowDefs: React.FC = () => (
  <defs>
    <linearGradient id="willowDie" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#2C2A7A" />
      <stop offset="0.45" stopColor="#1B1752" />
      <stop offset="0.75" stopColor="#2A1D66" />
      <stop offset="1" stopColor="#3B2A80" />
    </linearGradient>
  </defs>
);
// The chip with thickness, tilted toward the camera by k (ry/rx), centred at (x, y), scale s.
export const WillowChip: React.FC<{ fr: number; x: number; y: number; s?: number; k?: number; qubit?: (k: number, x: number, y: number) => QState; glow?: number }> = ({ fr, x, y, s = 1, k = 0.6, qubit, glow = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g transform={`translate(0 30) scale(1 ${k})`}><rect x={-300} y={-300} width={600} height={600} rx={30} fill="#8E6022" /></g>
    <g transform={`translate(0 15) scale(1 ${k})`}><rect x={-300} y={-300} width={600} height={600} rx={30} fill="#B07A2C" /></g>
    <g transform={`scale(1 ${k})`}><WillowTop fr={fr} qubit={qubit} glow={glow} /></g>
  </g>
);

// Google Quantum AI lockup (Google's wordmark colours in Google Sans; editorial use).
export const GoogleLockup: React.FC<{ x: number; y: number; size: number; o?: number }> = ({ x, y, size, o = 1 }) => {
  const cols = ["#4285F4", "#EA4335", "#FBBC05", "#4285F4", "#34A853", "#EA4335"];
  return (
    <text x={x} y={y} textAnchor="middle" fontFamily={GSANS} fontSize={size} fontWeight={500} opacity={o} style={{ letterSpacing: -0.5 }}>
      {"Google".split("").map((ch, i) => <tspan key={i} fill={cols[i]}>{ch}</tspan>)}
      <tspan fill="#ECE8FA" fontWeight={400}> Quantum AI</tspan>
    </text>
  );
};

// A stopwatch bezel (with crown and side button) around (x, y), radius r. `sweep` 0..1 fills the
// elapsed arc; ticks are the bezel's real minute marks.
export const Stopwatch: React.FC<{ x: number; y: number; r: number; sweep: number; done: number; press?: number }> = ({ x, y, r, sweep, done, press = 0 }) => {
  const a = sweep * Math.PI * 2 - Math.PI / 2;
  const arc = (k: number) => {
    const e = k * Math.PI * 2 - Math.PI / 2;
    const large = k > 0.5 ? 1 : 0;
    return k >= 0.999 ? `M${x},${y - r} A${r} ${r} 0 1 1 ${x - 0.01},${y - r}` : `M${x},${y - r} A${r} ${r} 0 ${large} 1 ${x + Math.cos(e) * r},${y + Math.sin(e) * r}`;
  };
  return (
    <g>
      {/* crown + side button */}
      <rect x={x - 26} y={y - r - 46 + press * 8} width={52} height={28} rx={9} fill="#B9852F" />
      <rect x={x - 34} y={y - r - 56 + press * 8} width={68} height={16} rx={9} fill="#EDC36C" />
      <rect x={x - 14} y={y - r - 26} width={28} height={22} fill="#9C6A24" />
      <g transform={`rotate(45 ${x} ${y})`}><rect x={x - 16} y={y - r - 40} width={32} height={26} rx={7} fill="#B9852F" /></g>
      <circle cx={x} cy={y} r={r} fill="none" stroke="#2A1F5E" strokeWidth={30} opacity={0.85} />
      <circle cx={x} cy={y} r={r + 16} fill="none" stroke="#EDC36C" strokeWidth={4} opacity={0.5} />
      <circle cx={x} cy={y} r={r - 16} fill="none" stroke="#EDC36C" strokeWidth={2} opacity={0.4} />
      {Array.from({ length: 60 }, (_, i) => {
        const t = (i / 60) * Math.PI * 2;
        const L = i % 5 === 0 ? 14 : 6;
        return <line key={i} x1={x + Math.cos(t) * (r - 9)} y1={y + Math.sin(t) * (r - 9)} x2={x + Math.cos(t) * (r - 9 + L)} y2={y + Math.sin(t) * (r - 9 + L)} stroke="#CFC4F5" strokeWidth={i % 5 === 0 ? 3 : 1.5} opacity={0.55} />;
      })}
      {sweep > 0 && <path d={arc(sweep)} fill="none" stroke={done > 0 ? C.goldHi : C.gold} strokeWidth={16} strokeLinecap="round" opacity={0.75} />}
      {sweep > 0 && sweep < 1 && <circle cx={x + Math.cos(a) * r} cy={y + Math.sin(a) * r} r={20} fill="#FFF3C4" />}
      {done > 0 && <circle cx={x} cy={y} r={r} fill="none" stroke="#FFF3C4" strokeWidth={24 * (1 - done) + 2} opacity={(1 - done) * 0.45} />}
    </g>
  );
};

// The odometer: 10,000,000,000,000,000,000,000,000 with its digits sliding into place left to
// right (k 0..1) and the trailing `spin` digits rolling forever (the supercomputer's clock running).
export const TARGET = "10,000,000,000,000,000,000,000,000";
export const Odometer: React.FC<{ fr: number; x: number; y: number; size: number; k: number; spin?: number }> = ({ fr, x, y, size, k, spin = 6 }) => {
  const chars = TARGET.split("");
  const nd = 26;
  const cw = size * 0.5, comma = size * 0.22;
  const widths = chars.map((c) => (c === "," ? comma : cw));
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = x - total / 2;
  let d = -1;
  return (
    <g fontFamily={COND} fontWeight={800} fontSize={size} textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}>
      {chars.map((c, i) => {
        const w = widths[i];
        const px = cx + w / 2;
        cx += w;
        if (c !== ",") d++;
        const di = c === "," ? d + 1 : d; // a comma appears with the digit after it
        const landT = (di / nd) * 0.85;
        if (k < landT) return null;
        if (c === ",") return <text key={i} x={px} y={y} fill={C.cream}>,</text>;
        const settle = Math.min(1, (k - landT) / 0.15);
        const rolling = di >= nd - spin && k >= 1;
        const speed = rolling ? 0.06 * Math.pow(1.9, di - (nd - spin)) : 0;
        const v = (Number(c) + (1 - settle) * (1 - settle) * 5 + (rolling ? fr * speed : 0)) % 10;
        const lo = Math.floor(v), frac = v - lo;
        const clip = `od${i}`;
        const col = rolling ? "#B9AEF0" : C.cream;
        return (
          <g key={i}>
            <clipPath id={clip}><rect x={px - w / 2 - 2} y={y - size * 0.84} width={w + 4} height={size * 0.98} /></clipPath>
            <g clipPath={`url(#${clip})`}>
              <text x={px} y={y - frac * size}  fill={col}>{lo}</text>
              <text x={px} y={y + size - frac * size} fill={col}>{(lo + 1) % 10}</text>
            </g>
          </g>
        );
      })}
    </g>
  );
};

// ---- deep-time tape icons -------------------------------------------------------------------
// A walking T-rex, side view facing left, feet at (0,0), height ~130*s. `step` = walk phase.
export const Dino: React.FC<{ x: number; y: number; s?: number; step: number }> = ({ x, y, s = 1, step }) => {
  const a = Math.sin(step) * 22, b = -a;
  const bob = Math.abs(Math.cos(step)) * 4;
  const leg = (ang: number, dx: number, col: string) => (
    <g transform={`translate(${dx} -58) rotate(${ang})`}>
      <path d="M-9,0 L9,0 L7,40 L14,58 L-10,58 L-6,40Z" fill={col} />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={2} rx={70} ry={8} fill="#0A0626" opacity={0.5} />
      {leg(b, 6, "#2B7F72")}
      <g transform={`translate(0 ${-bob})`}>
        {/* tail, body, neck, head */}
        <path d="M10,-80 C50,-86 90,-74 128,-60 C96,-58 60,-56 20,-50Z" fill="#3AA593" />
        <ellipse cx={0} cy={-76} rx={44} ry={30} fill="#3AA593" />
        <path d="M-24,-96 C-40,-118 -50,-124 -60,-128 L-62,-104 C-48,-100 -38,-90 -30,-78Z" fill="#3AA593" />
        <path d="M-56,-138 L-102,-134 C-110,-132 -112,-118 -104,-114 L-84,-112 L-100,-104 L-60,-100 C-50,-104 -46,-130 -56,-138Z" fill="#43B8A4" />
        <circle cx={-70} cy={-128} r={3.5} fill="#0A0626" />
        <path d="M-34,-78 L-46,-66 M-40,-74 L-48,-62" stroke="#2B7F72" strokeWidth={5} strokeLinecap="round" />
        <path d="M-30,-98 C-10,-108 18,-104 34,-92" fill="none" stroke="#7FE0CF" strokeWidth={4} opacity={0.5} strokeLinecap="round" />
      </g>
      {leg(a, -8, "#3AA593")}
    </g>
  );
};

// The Sun's death: k 0..1 = yellow star -> swelling red giant -> white dwarf in a shell of gas.
export const DyingSun: React.FC<{ x: number; y: number; k: number; fr: number }> = ({ x, y, k, fr }) => {
  const swell = Math.min(1, k / 0.6), shrink = Math.max(0, (k - 0.62) / 0.38);
  const r = (34 + 46 * swell) * (1 - 0.86 * shrink);
  const col = shrink > 0.5 ? "#F4F2FF" : swell > 0.5 ? "#FF7A5C" : C.gold;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r * 2.2} fill={swell > 0.5 && shrink < 0.5 ? "url(#glowCoral)" : shrink > 0.5 ? "url(#glowTeal)" : "url(#glowGold)"} opacity={0.8} />
      {shrink > 0 && <circle r={30 + 70 * shrink} fill="none" stroke={C.tealHi} strokeWidth={6 * (1 - shrink) + 2} opacity={0.6 * (1 - shrink * 0.4)} />}
      <circle r={r} fill={col} />
      {shrink < 0.5 && Array.from({ length: 10 }, (_, i) => {
        const t = (i / 10) * Math.PI * 2 + fr * 0.02;
        return <line key={i} x1={Math.cos(t) * (r + 8)} y1={Math.sin(t) * (r + 8)} x2={Math.cos(t) * (r + 22)} y2={Math.sin(t) * (r + 22)} stroke={col} strokeWidth={5} strokeLinecap="round" opacity={0.7} />;
      })}
    </g>
  );
};

// A small spiral galaxy (the universe's age marker).
export const MiniGalaxy: React.FC<{ x: number; y: number; s?: number; fr: number }> = ({ x, y, s = 1, fr }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${fr * 0.6}) scale(1 0.62)`}>
    <circle r={80} fill="url(#glowGold)" opacity={0.7} />
    {Array.from({ length: 140 }, (_, i) => {
      const arm = i % 2, u = (i / 140) * 3.4;
      const a = u * 2.1 + arm * Math.PI + (random(`mg${i}`) - 0.5) * 0.45;
      const r = 8 + u * 22 + (random(`mgr${i}`) - 0.5) * 8;
      return <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={1.4 + random(`mgs${i}`) * 2.2} fill={i % 4 ? C.cream : C.tealHi} opacity={0.85} />;
    })}
    <circle r={12} fill="#FFF3C4" />
  </g>
);
export { NUNITO };
