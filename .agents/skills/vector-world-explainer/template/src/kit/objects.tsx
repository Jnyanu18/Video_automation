import React from "react";
import { C, NUNITO } from "./palette";
import { QuantumChipTop } from "./props";

// ---- A modern phone, front view, running an Instagram-like photo feed (stories ring row, a
// post, the action row). Original drawing; not Instagram's assets. (x, y) = centre. Width 300*s.
// Optional rig (all default to the old look): armLag = extra hand lift in px that trails the shrug
// (follow-through), handRot = palm-up turn of the little hands in degrees, scroll = feed scroll in
// px, spinner 0..1 shows the loading spinner independently of the shrug, screenGlow 0..1 lights it.
export const Phone: React.FC<{ x: number; y: number; s?: number; rot?: number; shrug?: number; fr?: number; armLag?: number; handRot?: number; scroll?: number; spinner?: number; screenGlow?: number }> = ({ x, y, s = 1, rot = 0, shrug = 0, fr = 0, armLag = 0, handRot = 0, scroll = 0, spinner, screenGlow = 0 }) => {
  const W = 150, H = 310;
  const ring = (cx: number, cy: number, i: number) => (
    <g key={i}>
      <circle cx={cx} cy={cy} r={21} fill="none" stroke="url(#igRing)" strokeWidth={4.5} />
      <circle cx={cx} cy={cy} r={16} fill={["#F4B860", "#35C3B4", "#F2678E", "#8C7CE8", "#FFCB57"][i % 5]} />
    </g>
  );
  const arms = shrug > 0 || armLag !== 0;
  const arm = (side: 1 | -1) => {
    const lift = shrug * 60 + armLag;
    const hx = side * (W + 66), hy = -10 - lift;
    const d = `M${side * (W - 6)},40 Q${side * (W + 50)},${60 - lift * 0.8} ${hx},${hy}`;
    const hand = (fill: string, grow: number) => (
      <g transform={`translate(${hx} ${hy}) rotate(${side * (handRot - 10)})`}>
        <ellipse rx={15 + grow} ry={13 + grow} fill={fill} />
        {[-1, 0, 1].map((k) => <ellipse key={k} cx={side * (8 + Math.abs(k) * -2)} cy={-12} rx={4.5 + grow} ry={9 + grow} fill={fill} transform={`rotate(${k * 26 * side})`} />)}
      </g>
    );
    return (
      <g key={side}>
        <path d={d} fill="none" stroke="#EDE8FF" strokeWidth={24} strokeLinecap="round" />
        {hand("#EDE8FF", 4)}
        <path d={d} fill="none" stroke="#5B52B8" strokeWidth={15} strokeLinecap="round" />
        {hand("#5B52B8", 0)}
      </g>
    );
  };
  const spin = spinner ?? shrug;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx={20} cy={H + 30} rx={W + 30} ry={24} fill="#120830" opacity={0.4} filter="url(#soft8)" />
      <rect x={-W - 10} y={-H - 10} width={2 * W + 20} height={2 * H + 20} rx={56} fill="#2B2468" />
      <rect x={-W - 10} y={-H - 10} width={2 * W + 20} height={2 * H + 20} rx={56} fill="none" stroke="#7A70B8" strokeWidth={4} />
      <rect x={-W} y={-H} width={2 * W} height={2 * H} rx={46} fill="#FBF8FF" />
      <clipPath id={`scr${x}`}><rect x={-W} y={-H} width={2 * W} height={2 * H} rx={46} /></clipPath>
      <g clipPath={`url(#scr${x})`}>
        <g transform={`translate(0 ${-scroll})`}>
        {/* status + app bar */}
        <text x={-W + 30} y={-H + 34} fontFamily={NUNITO} fontWeight={800} fontSize={18} fill="#1A1238">9:41</text>
        <rect x={-46} y={-H + 14} width={92} height={26} rx={13} fill="#0D0A26" />
        <text x={-W + 24} y={-H + 86} fontFamily="Georgia, serif" fontStyle="italic" fontWeight={700} fontSize={30} fill="#1A1238">Photogram</text>
        <path d={`M${W - 60},${-H + 64} q12,-10 24,0 q-12,26 -24,0`} fill="none" stroke="#1A1238" strokeWidth={3} />
        {/* stories row */}
        {[0, 1, 2, 3, 4].map((i) => ring(-W + 40 + i * 58, -H + 130, i))}
        {/* a post */}
        <circle cx={-W + 30} cy={-H + 190} r={13} fill="#F2678E" />
        <rect x={-W + 52} y={-H + 183} width={90} height={12} rx={6} fill="#1A1238" opacity={0.75} />
        <rect x={-W} y={-H + 212} width={2 * W} height={280} fill="url(#postImg)" />
        <circle cx={60} cy={-H + 300} r={46} fill="#FFE7A0" opacity={0.9} />
        <path d={`M${-W},${-H + 440} Q-40,${-H + 360} 40,${-H + 420} Q100,${-H + 380} ${W},${-H + 430} L${W},${-H + 492} L${-W},${-H + 492}Z`} fill="#3A2779" />
        {/* actions: heart, comment, share */}
        <path d={`M${-W + 30},${-H + 520} c-8,-10 -22,-2 -14,10 l14,14 l14,-14 c8,-12 -6,-20 -14,-10z`} fill="#F2678E" />
        <circle cx={-W + 78} cy={-H + 528} r={12} fill="none" stroke="#1A1238" strokeWidth={3} />
        <path d={`M${-W + 112},${-H + 518} l24,10 l-24,10 l6,-10z`} fill="none" stroke="#1A1238" strokeWidth={3} strokeLinejoin="round" />
        <rect x={-W + 18} y={-H + 556} width={180} height={11} rx={5} fill="#1A1238" opacity={0.6} />
        <rect x={-W + 18} y={-H + 578} width={120} height={11} rx={5} fill="#1A1238" opacity={0.35} />
        {/* the next post, for scrolling */}
        <circle cx={-W + 30} cy={-H + 620} r={13} fill="#35C3B4" />
        <rect x={-W + 52} y={-H + 613} width={110} height={12} rx={6} fill="#1A1238" opacity={0.75} />
        <rect x={-W} y={-H + 642} width={2 * W} height={280} fill="#5B4FC9" />
        <circle cx={-40} cy={-H + 760} r={70} fill="#8FF3E3" opacity={0.5} />
        </g>
        {screenGlow > 0 && <rect x={-W} y={-H} width={2 * W} height={2 * H} fill="#FFFFFF" opacity={0.5 * screenGlow} />}
      </g>
      {/* a shrug face badge: a little loading spinner that goes nowhere */}
      {spin > 0 && (
        <g transform={`translate(0 ${-H + 300})`} opacity={Math.min(1, spin)}>
          <circle r={34} fill="#FFFFFF" opacity={0.85} />
          <circle r={22} fill="none" stroke="#B8B2D6" strokeWidth={6} />
          <path d={`M0,-22 A22 22 0 0 1 22,0`} fill="none" stroke="#1A1238" strokeWidth={6} strokeLinecap="round" transform={`rotate(${fr * 4})`} />
        </g>
      )}
      {arms && arm(-1)}
      {arms && arm(1)}
    </g>
  );
};

export const PhoneDefs: React.FC = () => (
  <defs>
    <linearGradient id="igRing" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stopColor="#FEDA75" />
      <stop offset="0.35" stopColor="#FA7E1E" />
      <stop offset="0.65" stopColor="#D62976" />
      <stop offset="1" stopColor="#962FBF" />
    </linearGradient>
    <linearGradient id="postImg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#F59E7A" />
      <stop offset="1" stopColor="#B9568E" />
    </linearGradient>
    <radialGradient id="atomTeal" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stopColor="#C8FFF6" />
      <stop offset="0.5" stopColor="#35C3B4" />
      <stop offset="1" stopColor="#1D7F78" />
    </radialGradient>
    <radialGradient id="atomWhite" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stopColor="#FFFFFF" />
      <stop offset="1" stopColor="#B9B2E6" />
    </radialGradient>
    <radialGradient id="atomCoral" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stopColor="#FFC2B5" />
      <stop offset="0.5" stopColor="#FF6B5A" />
      <stop offset="1" stopColor="#C9413A" />
    </radialGradient>
    <radialGradient id="atomGold" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stopColor="#FFF3C4" />
      <stop offset="0.5" stopColor="#FFCB57" />
      <stop offset="1" stopColor="#C46F1D" />
    </radialGradient>
    <linearGradient id="lockBody" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#FFE38A" />
      <stop offset="0.55" stopColor="#FFCB57" />
      <stop offset="1" stopColor="#D88A2A" />
    </linearGradient>
    <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#8E86C8" />
      <stop offset="0.45" stopColor="#E9E5FF" />
      <stop offset="1" stopColor="#7F77BD" />
    </linearGradient>
    <linearGradient id="plateGold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#B9752A" />
      <stop offset="0.35" stopColor="#FFD878" />
      <stop offset="0.6" stopColor="#F2B04A" />
      <stop offset="1" stopColor="#9A5E1E" />
    </linearGradient>
  </defs>
);

// ---- A drug-like molecule, ball and stick (a fused ring system with side groups).
const ATOMS: [number, number, string, number][] = [
  // x, y, fill, radius
  [0, -90, "atomTeal", 30], [78, -45, "atomWhite", 26], [78, 45, "atomTeal", 30], [0, 90, "atomTeal", 30], [-78, 45, "atomCoral", 28], [-78, -45, "atomTeal", 30],
  [156, -90, "atomTeal", 30], [234, -45, "atomGold", 26], [234, 45, "atomTeal", 30], [156, 90, "atomCoral", 28],
  [0, -186, "atomCoral", 24], [-160, -92, "atomWhite", 20], [-160, 92, "atomWhite", 20], [312, 92, "atomTeal", 24], [312, -92, "atomWhite", 20], [0, 186, "atomWhite", 20],
];
const BONDS: [number, number, 2?][] = [[0, 1], [1, 2, 2], [2, 3], [3, 4, 2], [4, 5], [5, 0, 2], [1, 6], [6, 7, 2], [7, 8], [8, 9, 2], [9, 2], [0, 10, 2], [5, 11], [4, 12], [8, 13], [7, 14], [3, 15]];
export const Molecule: React.FC<{ x: number; y: number; s?: number; rot?: number; fr?: number; o?: number }> = ({ x, y, s = 1, rot = 0, fr = 0, o = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(-117 0)`} opacity={o}>
    <circle cx={117} cy={0} r={300} fill="url(#glowTeal)" opacity={0.5} />
    {BONDS.map(([a, b, dbl], i) => {
      const [x1, y1] = ATOMS[a], [x2, y2] = ATOMS[b];
      const nx = -(y2 - y1), ny = x2 - x1, L = Math.hypot(nx, ny), ox = (nx / L) * 7, oy = (ny / L) * 7;
      return dbl ? (
        <g key={i} stroke="#E9E5FF" strokeWidth={8} strokeLinecap="round">
          <line x1={x1 + ox} y1={y1 + oy} x2={x2 + ox} y2={y2 + oy} />
          <line x1={x1 - ox} y1={y1 - oy} x2={x2 - ox} y2={y2 - oy} />
        </g>
      ) : (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E9E5FF" strokeWidth={11} strokeLinecap="round" />
      );
    })}
    {ATOMS.map(([ax, ay, fill, r], i) => {
      const bob = Math.sin(fr * 0.08 + i) * 2;
      return (
        <g key={i}>
          <circle cx={ax + 4} cy={ay + bob + 6} r={r} fill="#120830" opacity={0.3} />
          <circle cx={ax} cy={ay + bob} r={r} fill={`url(#${fill})`} />
          <ellipse cx={ax - r * 0.3} cy={ay + bob - r * 0.35} rx={r * 0.3} ry={r * 0.18} fill="#FFFFFF" opacity={0.7} />
        </g>
      );
    })}
  </g>
);

// ---- A padlock: gold body, steel shackle, keyhole. `crack` 0..1 opens glowing cracks and lifts the shackle.
// keyGlow 0..1: light pouring out of the keyhole (for the push-through into the cold act).
export const Padlock: React.FC<{ x: number; y: number; s?: number; crack?: number; rot?: number; keyGlow?: number }> = ({ x, y, s = 1, crack = 0, rot = 0, keyGlow = 0 }) => {
  const lift = crack * 46;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx={14} cy={196} rx={170} ry={26} fill="#120830" opacity={0.45} filter="url(#soft8)" />
      <g transform={`translate(0 ${-lift}) rotate(${crack * 14} 92 0)`}>
        <path d="M-92,0 L-92,-90 A92 92 0 0 1 92,-90 L92,0" fill="none" stroke="#3E356F" strokeWidth={50} />
        <path d="M-92,0 L-92,-90 A92 92 0 0 1 92,-90 L92,0" fill="none" stroke="url(#steel)" strokeWidth={38} />
        <path d="M-102,-20 L-102,-90 A102 102 0 0 1 -40,-180" fill="none" stroke="#FFFFFF" strokeWidth={6} opacity={0.6} strokeLinecap="round" />
      </g>
      <rect x={-150} y={-20} width={300} height={220} rx={36} fill="#B3701F" transform="translate(8 10)" />
      <rect x={-150} y={-20} width={300} height={220} rx={36} fill="url(#lockBody)" />
      <rect x={-130} y={-4} width={260} height={10} rx={5} fill="#FFF3C4" opacity={0.7} />
      <circle cx={0} cy={70} r={26} fill="#5B3A12" />
      <path d="M-12,80 L12,80 L18,140 L-18,140Z" fill="#5B3A12" />
      {keyGlow > 0 && (
        <g>
          <circle cx={0} cy={95} r={120 + 120 * keyGlow} fill="url(#glowGold)" opacity={keyGlow} />
          <circle cx={0} cy={70} r={20} fill="#FFF3C4" opacity={keyGlow} />
          <path d="M-9,80 L9,80 L14,134 L-14,134Z" fill="#FFF3C4" opacity={keyGlow} />
          <circle cx={0} cy={70} r={11} fill="#FFFFFF" opacity={keyGlow} />
        </g>
      )}
      {crack > 0 && (
        <g stroke="#FFF7DA" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={Math.min(1, crack * 1.5)}>
          <path d={`M-150,${40} L-90,60 L-60,40 L-20,${70}`} strokeDasharray={300} strokeDashoffset={300 * (1 - crack)} />
          <path d={`M150,${120} L100,110 L70,140 L26,120`} strokeDasharray={300} strokeDashoffset={300 * (1 - crack)} />
          <path d={`M20,200 L30,160 L10,130`} strokeDasharray={200} strokeDashoffset={200 * (1 - crack)} />
        </g>
      )}
      {crack > 0 && <circle cx={0} cy={80} r={160} fill="url(#glowGold)" opacity={crack * 0.8} />}
    </g>
  );
};

// ---- A dilution refrigerator's insert, the gold "chandelier": stacked plates that get colder
// toward the bottom, joined by rods, with coax lines coiling down to the chip at the base.
// (x, top) = centre of the top plate. Total height ~ 1100*s.
export const Chandelier: React.FC<{ x: number; top: number; s?: number; fr?: number; frost?: number; chipGlow?: number }> = ({ x, top, s = 1, fr = 0, frost = 0, chipGlow = 1 }) => {
  const plates = [
    { y: 0, r: 300 },
    { y: 230, r: 270 },
    { y: 450, r: 235 },
    { y: 650, r: 195 },
    { y: 830, r: 155 },
    { y: 990, r: 115 },
  ];
  const k = 0.22; // ellipse ratio of plates seen from slightly below eye height
  return (
    <g transform={`translate(${x} ${top}) scale(${s})`}>
      {/* rods between plates */}
      {plates.slice(0, -1).map((p, i) => {
        const q = plates[i + 1];
        return [-0.78, -0.3, 0.3, 0.78].map((u, j) => (
          <line key={`${i}${j}`} x1={u * p.r} y1={p.y + 18} x2={u * q.r} y2={q.y} stroke="url(#plateGold)" strokeWidth={14 - i} />
        ));
      })}
      {/* coax lines coiling down */}
      {[-0.55, -0.15, 0.2, 0.5].map((u, j) => {
        let d = `M${u * 280},20`;
        for (let i = 1; i < plates.length; i++) {
          const p = plates[i], pr = plates[i - 1];
          const mx = u * (pr.r + p.r) * 0.5 + Math.sin(i * 2 + j) * 40;
          d += ` C${mx + 60},${pr.y + 80} ${mx - 60},${p.y - 80} ${u * p.r * 0.9},${p.y + 10}`;
        }
        return (
          <g key={j}>
            <path d={d} fill="none" stroke="#4A4278" strokeWidth={11} />
            <path d={d} fill="none" stroke="#C9C2E8" strokeWidth={5} opacity={0.8} />
          </g>
        );
      })}
      {/* plates */}
      {plates.map((p, i) => (
        <g key={i}>
          <ellipse cx={0} cy={p.y + 22} rx={p.r} ry={p.r * k} fill="#8A5419" />
          <rect x={-p.r} y={p.y} width={2 * p.r} height={22} fill="url(#plateGold)" />
          <ellipse cx={0} cy={p.y} rx={p.r} ry={p.r * k} fill="url(#plateGold)" />
          <ellipse cx={0} cy={p.y} rx={p.r * 0.9} ry={p.r * k * 0.9} fill="none" stroke="#FFF0B8" strokeWidth={3} opacity={0.6} />
          {Array.from({ length: 10 }, (_, j) => {
            const a = (j / 10) * Math.PI * 2;
            return <circle key={j} cx={Math.cos(a) * p.r * 0.75} cy={p.y + Math.sin(a) * p.r * k * 0.75} r={5} fill="#7A4A16" />;
          })}
          {frost > 0 && (
            <g opacity={Math.min(1, frost * (0.4 + i * 0.15))}>
              <ellipse cx={0} cy={p.y + 22} rx={p.r + 6} ry={p.r * k + 8} fill="none" stroke="#EAF9FF" strokeWidth={10} strokeDasharray="6 10" opacity={0.85} />
              <rect x={-p.r} y={p.y + 18} width={2 * p.r} height={10} fill="#EAF9FF" opacity={0.55} />
              {Array.from({ length: 9 }, (_, j) => (
                <path key={j} d={`M${-p.r * 0.85 + j * p.r * 0.21},${p.y + 30} l-6,${14 + (j % 3) * 8} l12,0z`} fill="#EAF9FF" opacity={0.8} />
              ))}
            </g>
          )}
        </g>
      ))}
      {/* mixing chamber, cold finger and the chip in its gold sample holder at the very bottom.
          The holder's top face is the film's QuantumChipTop, foreshortened; coax runs to its SMPs. */}
      {[-1, 1].map((sd) => [0, 1].map((j) => {
        const x0 = sd * (40 + j * 40), x1 = sd * (52 + j * 22);
        const d = `M${x0},1000 C${x0 + sd * 50},1050 ${x1 + sd * 70},1110 ${x1},1170`;
        return (
          <g key={`cx${sd}${j}`}>
            <path d={d} fill="none" stroke="#4A4278" strokeWidth={9} />
            <path d={d} fill="none" stroke="#D6D0F2" strokeWidth={3.5} opacity={0.85} />
          </g>
        );
      }))}
      <rect x={-50} y={1000} width={100} height={78} fill="url(#plateGold)" />
      <ellipse cx={0} cy={1078} rx={50} ry={11} fill="#8A5419" />
      <ellipse cx={0} cy={1000} rx={50} ry={11} fill="#FFE38A" opacity={0.7} />
      <rect x={-50} y={1030} width={100} height={6} fill="#9A6A26" opacity={0.6} />
      <rect x={-13} y={1078} width={26} height={44} fill="url(#plateGold)" />
      {/* light of the chip, on everything near it */}
      <circle cx={0} cy={1160} r={250} fill="url(#glowGold)" opacity={chipGlow * (0.85 + 0.15 * Math.sin(fr * 0.2))} />
      <g transform="translate(0 1160)">
        {/* holder body (sides seen below the top face) */}
        <path d="M-77,0 L-77,26 Q-77,34 -69,34 L69,34 Q77,34 77,26 L77,0Z" fill="#9A6A26" />
        <rect x={-77} y={8} width={154} height={10} fill="#B5802F" />
        {[-48, 0, 48].map((cx2) => (
          <g key={cx2}>
            <rect x={cx2 - 7} y={22} width={14} height={12} fill="#C9C2E8" />
            <circle cx={cx2} cy={38} r={6} fill="#FBE3A0" stroke="#B9852F" strokeWidth={2} />
          </g>
        ))}
        <g transform="scale(0.24 0.105)">
          <QuantumChipTop fr={fr} glow={1.2 * chipGlow} />
        </g>
        {/* a soft halo over the die so it reads as the brightest thing in the shot */}
        <ellipse cx={0} cy={0} rx={60} ry={26} fill="#FFF3C4" opacity={0.28 * chipGlow} filter="url(#soft8)" />
      </g>
    </g>
  );
};
