// Stylised poster globe (orthographic), continents as crude screen-print shapes, dotted rocket arcs.
import React from "react";
import { COND, CREAM, MUSTARD, NAVY, ORANGE, TEAL, ht } from "./kit";

type LL = [number, number]; // [lon, lat]
const D = Math.PI / 180;

const LAND: LL[][] = [
  // North America
  [[-165, 65], [-140, 70], [-110, 72], [-85, 72], [-75, 62], [-60, 55], [-55, 50], [-65, 45], [-75, 38], [-80, 30], [-82, 25], [-97, 26], [-97, 20], [-90, 16], [-83, 10], [-79, 8], [-85, 13], [-95, 16], [-105, 20], [-112, 28], [-118, 33], [-124, 40], [-124, 48], [-133, 56], [-150, 60], [-165, 62]],
  // Greenland
  [[-50, 60], [-42, 62], [-22, 70], [-20, 80], [-40, 83], [-60, 80], [-70, 77], [-55, 68]],
  // South America
  [[-80, 8], [-60, 10], [-50, 0], [-35, -6], [-40, -22], [-55, -35], [-68, -55], [-75, -45], [-72, -20], [-81, -5]],
  // Eurasia
  [[-10, 36], [-9, 44], [-1, 46], [-4, 48], [5, 53], [8, 57], [12, 56], [5, 62], [15, 69], [28, 71], [45, 68], [60, 70], [80, 73], [100, 77], [130, 72], [160, 70], [180, 66], [170, 60], [160, 55], [142, 46], [135, 35], [122, 30], [120, 22], [108, 20], [105, 10], [100, 13], [98, 8], [100, 2], [95, 16], [90, 22], [80, 15], [77, 8], [73, 20], [67, 25], [57, 25], [50, 30], [56, 25], [52, 17], [44, 12], [35, 28], [32, 31], [27, 37], [20, 40], [15, 38], [12, 44], [8, 44], [3, 43], [-2, 37]],
  // Africa
  [[-17, 15], [-12, 28], [-5, 35], [10, 37], [20, 32], [32, 31], [35, 25], [43, 12], [51, 11], [40, -5], [40, -15], [32, -28], [20, -35], [15, -25], [12, -5], [9, 4], [-8, 5]],
  // Australia
  [[114, -22], [122, -18], [131, -12], [137, -12], [142, -11], [146, -19], [153, -28], [150, -37], [140, -38], [132, -32], [115, -34]],
  // UK
  [[-5, 50], [1, 51], [0, 53], [-3, 56], [-5, 58], [-6, 55], [-3, 53]],
  // Japan
  [[130, 31], [136, 34], [141, 38], [142, 43], [140, 41], [135, 35]],
];

export const CITY: Record<string, LL> = {
  SEA: [-122.3, 47.6], DEL: [77.2, 28.6], NYC: [-74, 40.7], LON: [-0.1, 51.5], TYO: [139.7, 35.7], DXB: [55.3, 25.2],
  PAR: [2.35, 48.85], BJS: [116.4, 39.9], SIN: [103.8, 1.35], MOW: [37.6, 55.75], MEX: [-99, 19.4], SFO: [-122.4, 37.8], LOS: [3.4, 6.5], CHI: [-87.6, 41.9],
};

export type View = { cx: number; cy: number; R: number; lon0: number; lat0: number };

// 3D unit vector of a lon/lat
const vec = ([lon, lat]: LL) => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)];
// project a 3D vector (any length) for view v; returns screen x,y and z (>0 = front)
const projV = (p: number[], v: View) => {
  const r = Math.hypot(p[0], p[1], p[2]);
  const lat = Math.asin(p[2] / r), lon = Math.atan2(p[1], p[0]);
  const l0 = v.lon0 * D, p0 = v.lat0 * D, dl = lon - l0;
  const x = Math.cos(lat) * Math.sin(dl);
  const y = Math.cos(p0) * Math.sin(lat) - Math.sin(p0) * Math.cos(lat) * Math.cos(dl);
  const z = Math.sin(p0) * Math.sin(lat) + Math.cos(p0) * Math.cos(lat) * Math.cos(dl);
  return { x: v.cx + v.R * r * x, y: v.cy - v.R * r * y, z, r };
};
export const proj = (ll: LL, v: View) => projV(vec(ll), v);

// points along the great circle a->b, lifted by `lift` (fraction of R) at the middle
export const arcPts = (a: LL, b: LL, v: View, lift = 0.2, n = 64) => {
  const A = vec(a), Bv = vec(b);
  const om = Math.acos(Math.max(-1, Math.min(1, A[0] * Bv[0] + A[1] * Bv[1] + A[2] * Bv[2])));
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = i / n;
    const k1 = Math.sin((1 - s) * om) / Math.sin(om), k2 = Math.sin(s * om) / Math.sin(om);
    const h = 1 + lift * Math.sin(Math.PI * s);
    const p = [0, 1, 2].map((j) => (A[j] * k1 + Bv[j] * k2) * h);
    const q = projV(p, v);
    const vis = q.z > 0 || Math.hypot(q.x - v.cx, q.y - v.cy) > v.R;
    return { x: q.x, y: q.y, vis };
  });
};

const polyPath = (pts: LL[], v: View) => {
  return pts.map((ll, i) => {
    const q = proj(ll, v);
    let x = q.x, y = q.y;
    if (q.z < 0) { // fold hidden points onto the limb
      const dx = x - v.cx, dy = y - v.cy, m = Math.hypot(dx, dy) || 1;
      x = v.cx + (dx / m) * v.R; y = v.cy + (dy / m) * v.R;
    }
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join("") + "Z";
};

export const Globe: React.FC<{ v: View; id: string }> = ({ v, id }) => {
  const grat: React.ReactNode[] = [];
  for (let lat = -60; lat <= 75; lat += 15) {
    const pts = Array.from({ length: 73 }, (_, i) => proj([-180 + i * 5, lat], v));
    let d = ""; pts.forEach((q, i) => { d += q.z > 0 ? `${d && pts[i - 1]?.z > 0 ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}` : ""; });
    grat.push(<path key={`la${lat}`} d={d} fill="none" stroke={CREAM} strokeOpacity={0.35} strokeWidth={2} />);
  }
  for (let lon = -180; lon < 180; lon += 20) {
    const pts = Array.from({ length: 37 }, (_, i) => proj([lon, -90 + i * 5], v));
    let d = ""; pts.forEach((q, i) => { d += q.z > 0 ? `${d && pts[i - 1]?.z > 0 ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}` : ""; });
    grat.push(<path key={`lo${lon}`} d={d} fill="none" stroke={CREAM} strokeOpacity={0.35} strokeWidth={2} />);
  }
  return (
    <g>
      <clipPath id={`gc-${id}`}><circle cx={v.cx} cy={v.cy} r={v.R} /></clipPath>
      <circle cx={v.cx + 14} cy={v.cy + 12} r={v.R} fill={ORANGE} opacity={0.8} />
      <circle cx={v.cx} cy={v.cy} r={v.R} fill={TEAL} />
      <g clipPath={`url(#gc-${id})`}>
        {grat}
        {LAND.map((p, i) => <path key={i} d={polyPath(p, v)} fill={MUSTARD} stroke={NAVY} strokeWidth={3.5} strokeLinejoin="round" />)}
        {LAND.map((p, i) => <path key={`h${i}`} d={polyPath(p, v)} fill={ht("orange-s")} opacity={0.55} />)}
        {/* night-side halftone crescent */}
        <circle cx={v.cx - v.R * 0.38} cy={v.cy - v.R * 0.34} r={v.R * 1.12} fill="none" stroke={NAVY} strokeOpacity={0} />
        <path d={`M${v.cx - v.R * 2} ${v.cy - v.R * 2} H${v.cx + v.R * 2} V${v.cy + v.R * 2} H${v.cx - v.R * 2} Z M${v.cx - v.R * 0.3} ${v.cy - v.R * 0.25} m${-v.R * 1.1} 0 a${v.R * 1.1} ${v.R * 1.1} 0 1 0 ${v.R * 2.2} 0 a${v.R * 1.1} ${v.R * 1.1} 0 1 0 ${-v.R * 2.2} 0`} fill={ht("navy-m")} fillRule="evenodd" />
      </g>
      <circle cx={v.cx} cy={v.cy} r={v.R} fill="none" stroke={NAVY} strokeWidth={7} />
    </g>
  );
};

// Dotted rocket arc a->b drawn to progress p (0..1), with a small rocket at the head.
export const Arc: React.FC<{ a: LL; b: LL; v: View; p: number; color?: string; lift?: number; w?: number; rocket?: boolean; fade?: number }> =
  ({ a, b, v, p, color = ORANGE, lift = 0.22, w = 9, rocket = true, fade = 1 }) => {
    if (p <= 0) return null;
    const pts = arcPts(a, b, v, lift);
    const n = Math.max(1, Math.round(p * (pts.length - 1)));
    const seg = pts.slice(0, n + 1);
    let d = "";
    seg.forEach((q, i) => { d += q.vis ? `${d && seg[i - 1]?.vis ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}` : ""; });
    const h = seg[seg.length - 1], h0 = seg[Math.max(0, seg.length - 3)];
    const ang = (Math.atan2(h.y - h0.y, h.x - h0.x) * 180) / Math.PI;
    return (
      <g opacity={fade}>
        {w >= 1 && <path d={d} fill="none" stroke={NAVY} strokeWidth={w + 5} strokeDasharray={`0.1 ${w * 2.1}`} strokeLinecap="round" />}
        {w >= 1 && <path d={d} fill="none" stroke={color} strokeWidth={w} strokeDasharray={`0.1 ${w * 2.1}`} strokeLinecap="round" />}
        {rocket && p < 0.999 && h.vis && <MiniRocket x={h.x} y={h.y} rot={ang + 90} s={1} />}
      </g>
    );
  };

// Tiny side-view rocket icon pointing up at rot 0.
export const MiniRocket: React.FC<{ x: number; y: number; rot: number; s?: number }> = ({ x, y, rot, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-9 26 L-9 -10 C-9 -22 -4 -30 0 -34 C4 -30 9 -22 9 -10 L9 26 Z" fill={CREAM} stroke={NAVY} strokeWidth={3.5} />
    <path d="M-9 14 L-18 28 L-9 26 Z M9 14 L18 28 L9 26 Z" fill={ORANGE} stroke={NAVY} strokeWidth={3} />
    <path d="M-6 28 L0 44 L6 28 Z" fill={MUSTARD} />
  </g>
);

export const CityDot: React.FC<{ ll: LL; v: View; k: number; label?: string; side?: 1 | -1; big?: boolean }> = ({ ll, v, k, label, side = 1, big }) => {
  const q = proj(ll, v);
  if (q.z < 0.05 || k <= 0) return null;
  const r = (big ? 14 : 9) * Math.min(1, k * 1.4);
  return (
    <g>
      <circle cx={q.x} cy={q.y} r={r + 5} fill={NAVY} />
      <circle cx={q.x} cy={q.y} r={r} fill={big ? ORANGE : CREAM} />
      {label && k > 0.3 && (
        <g opacity={Math.min(1, (k - 0.3) * 2)}>
          <rect x={side > 0 ? q.x + 18 : q.x - 18 - label.length * 22 - 26} y={q.y - 30} width={label.length * 22 + 26} height={52} rx={6} fill={NAVY} />
          <text x={side > 0 ? q.x + 31 : q.x - 31} y={q.y + 9} textAnchor={side > 0 ? "start" : "end"} fontFamily={COND} fontSize={36} letterSpacing={1} fill={CREAM}>{label}</text>
        </g>
      )}
    </g>
  );
};
