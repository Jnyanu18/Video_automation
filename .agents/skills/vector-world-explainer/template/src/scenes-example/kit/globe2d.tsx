import React from "react";
import { random } from "remotion";

// A flat-vector globe of the internet: navy sphere, simple continents, a lat/long graticule,
// glowing city nodes and great-circle arcs with data pulses running along them. Orthographic
// projection; `rot` = the longitude facing the camera (deg), `tilt` = how far the north pole
// leans toward us (deg). Drawn centred on (0, 0) with radius R; wrap it in a transform.

type LL = [number, number]; // lon, lat (deg)
const D = Math.PI / 180;

const LANDS: LL[][] = [
  // North America
  [[-165, 65], [-140, 70], [-110, 72], [-85, 70], [-75, 62], [-60, 55], [-65, 45], [-75, 38], [-80, 30], [-82, 25], [-97, 26], [-97, 19], [-88, 15], [-80, 8], [-85, 12], [-105, 22], [-112, 30], [-118, 34], [-124, 42], [-125, 49], [-135, 58], [-150, 60], [-165, 62]],
  // Greenland
  [[-50, 60], [-42, 62], [-30, 70], [-22, 78], [-40, 83], [-60, 80], [-55, 70]],
  // South America
  [[-80, 9], [-72, 12], [-60, 8], [-50, 0], [-35, -6], [-38, -15], [-48, -25], [-58, -35], [-65, -42], [-70, -52], [-74, -50], [-72, -38], [-71, -25], [-77, -12], [-81, -4]],
  // Europe
  [[-10, 36], [-9, 43], [-2, 47], [-5, 48], [2, 51], [8, 54], [10, 58], [5, 62], [15, 69], [28, 71], [40, 67], [30, 60], [28, 50], [40, 45], [28, 41], [22, 37], [15, 38], [10, 44], [3, 43]],
  // British Isles
  [[-5, 50], [1, 51], [0, 54], [-3, 58], [-6, 57], [-4, 54]],
  // Africa
  [[-17, 15], [-16, 22], [-10, 30], [-5, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [40, -2], [40, -15], [35, -25], [20, -35], [17, -29], [12, -17], [13, -5], [9, 4], [-8, 5]],
  // Madagascar
  [[44, -16], [50, -14], [48, -24], [44, -24]],
  // Asia
  [[28, 41], [40, 45], [30, 60], [40, 67], [60, 70], [80, 73], [105, 77], [140, 72], [170, 68], [180, 65], [160, 60], [143, 52], [140, 45], [130, 42], [122, 40], [121, 30], [110, 20], [105, 10], [100, 13], [98, 8], [92, 20], [80, 15], [77, 8], [72, 20], [66, 25], [57, 26], [50, 30], [48, 29], [56, 24], [52, 16], [44, 13], [35, 28], [35, 36]],
  // Japan
  [[130, 32], [135, 34], [140, 36], [142, 40], [141, 45], [139, 42], [136, 36]],
  // Borneo / Sumatra
  [[109, 1], [117, 7], [119, 1], [116, -4], [110, -2]],
  [[95, 5], [100, 2], [106, -6], [102, -4]],
  // Australia
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [140, -38], [132, -32], [115, -34]],
];

export const CITIES: LL[] = [
  [-74, 40.7], [-122.4, 37.8], [-46.6, -23.5], [-0.1, 51.5], [3.4, 6.5], [31.2, 30], [72.8, 19], [77.6, 13], [103.8, 1.3], [139.7, 35.7],
  [151.2, -33.9], [37.6, 55.7], [28, -26.2], [55.3, 25.2], [116.4, 39.9], [8.7, 50.1], [-99.1, 19.4], [18.4, -33.9], [100.5, 13.7], [126.9, 37.5],
];
// pairs of CITIES joined by a cable/route arc
export const LINKS: [number, number][] = [
  [3, 0], [3, 15], [15, 11], [3, 5], [5, 13], [13, 6], [6, 7], [7, 8], [8, 9], [9, 14], [14, 19], [8, 10], [3, 4], [4, 12], [12, 17], [0, 1], [0, 2], [16, 0], [13, 8], [6, 18], [11, 14], [15, 5], [5, 12], [9, 1],
];

type P = { x: number; y: number; z: number };
const proj = (lon: number, lat: number, rot: number, tilt: number, R: number, alt = 1): P => {
  const l = (lon - rot) * D, p = lat * D, t = tilt * D;
  const cx = Math.cos(p) * Math.sin(l), cy = Math.sin(p), cz = Math.cos(p) * Math.cos(l);
  // tilt about the x axis: north pole leans toward the viewer
  const y = cy * Math.cos(t) - cz * Math.sin(t);
  const z = cy * Math.sin(t) + cz * Math.cos(t);
  return { x: R * alt * cx, y: -R * alt * y, z: alt * z };
};

// A polygon on the sphere: densify edges, push hidden points onto the limb.
const landPath = (poly: LL[], rot: number, tilt: number, R: number) => {
  const pts: P[] = [];
  for (let i = 0; i < poly.length; i++) {
    const [a, b] = [poly[i], poly[(i + 1) % poly.length]];
    let dl = b[0] - a[0];
    if (dl > 180) dl -= 360;
    if (dl < -180) dl += 360;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dl), Math.abs(b[1] - a[1])) / 4));
    for (let k = 0; k < n; k++) pts.push(proj(a[0] + (dl * k) / n, a[1] + ((b[1] - a[1]) * k) / n, rot, tilt, R));
  }
  if (pts.every((q) => q.z < 0)) return null;
  return pts.map((q, i) => {
    let { x, y } = q;
    if (q.z < 0) { const L = Math.hypot(x, y) || 1; x = (x / L) * R; y = (y / L) * R; }
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + "Z";
};

// A curve split into visible runs.
const runs = (pts: P[], R: number) => {
  const out: string[] = [];
  let cur = "";
  pts.forEach((q) => {
    const vis = q.z > 0 || Math.hypot(q.x, q.y) > R * 1.005;
    if (vis) cur += `${cur ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)} `;
    else if (cur) { out.push(cur); cur = ""; }
  });
  if (cur) out.push(cur);
  return out;
};

// great-circle point between two cities, lifted off the surface by `h` at mid-span
const slerp = (a: LL, b: LL, t: number): LL => {
  const v = ([lon, lat]: LL) => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)];
  const A = v(a), B = v(b);
  const dot = Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
  const w = Math.acos(dot) || 1e-6;
  const s0 = Math.sin((1 - t) * w) / Math.sin(w), s1 = Math.sin(t * w) / Math.sin(w);
  const x = A[0] * s0 + B[0] * s1, y = A[1] * s0 + B[1] * s1, z = A[2] * s0 + B[2] * s1;
  return [Math.atan2(y, x) / D, Math.asin(Math.max(-1, Math.min(1, z))) / D];
};
const arcPts = (a: LL, b: LL, rot: number, tilt: number, R: number, n = 28) =>
  Array.from({ length: n + 1 }, (_, k) => {
    const t = k / n, [lon, lat] = slerp(a, b, t);
    return proj(lon, lat, rot, tilt, R, 1 + 0.13 * Math.sin(Math.PI * t));
  });

export const GlobeDefs: React.FC = () => (
  <defs>
    <radialGradient id="gSea" cx="0.38" cy="0.32" r="0.75">
      <stop offset="0" stopColor="#2A57B8" />
      <stop offset="0.55" stopColor="#173478" />
      <stop offset="1" stopColor="#0A1648" />
    </radialGradient>
    <radialGradient id="gShade" cx="0.32" cy="0.28" r="0.85">
      <stop offset="0.45" stopColor="#060B2E" stopOpacity={0} />
      <stop offset="1" stopColor="#060B2E" stopOpacity={0.75} />
    </radialGradient>
    <radialGradient id="gHalo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.78" stopColor="#7FA8FF" stopOpacity={0.5} />
      <stop offset="0.86" stopColor="#4F78E0" stopOpacity={0.22} />
      <stop offset="1" stopColor="#2A3C9E" stopOpacity={0} />
    </radialGradient>
    <radialGradient id="gNode" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#F2F7FF" stopOpacity={0.95} />
      <stop offset="0.35" stopColor="#A9CCFF" stopOpacity={0.45} />
      <stop offset="1" stopColor="#6F9BFF" stopOpacity={0} />
    </radialGradient>
  </defs>
);

// `flick(i)` 0..1 = how lit city i / link i is this frame (network flicker under the lock).
export const Globe2D: React.FC<{ R: number; rot: number; tilt?: number; fr: number; flick?: (i: number) => number; net?: number }> = ({ R, rot, tilt = 18, fr, flick = () => 1, net = 1 }) => {
  const grat: React.ReactNode[] = [];
  for (let lon = -180; lon < 180; lon += 30) {
    const pts = Array.from({ length: 37 }, (_, k) => proj(lon, -90 + k * 5, rot, tilt, R));
    runs(pts, R * 2).forEach((d, j) => grat.push(<path key={`m${lon}_${j}`} d={d} />));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = Array.from({ length: 73 }, (_, k) => proj(-180 + k * 5, lat, rot, tilt, R));
    runs(pts, R * 2).forEach((d, j) => grat.push(<path key={`p${lat}_${j}`} d={d} />));
  }
  return (
    <g>
      <circle r={R * 1.28} fill="url(#gHalo)" />
      <circle r={R} fill="url(#gSea)" />
      <clipPath id="gClip"><circle r={R} /></clipPath>
      <g clipPath="url(#gClip)">
        <g fill="none" stroke="#4A72D0" strokeWidth={1.6} opacity={0.45}>{grat}</g>
        {LANDS.map((poly, i) => {
          const d = landPath(poly, rot, tilt, R);
          return d ? (
            <g key={i}>
              <path d={d} fill="#2F5FBF" stroke="#6E9BEE" strokeWidth={2.4} strokeLinejoin="round" />
            </g>
          ) : null;
        })}
        <circle r={R} fill="url(#gShade)" />
      </g>
      {/* rim light */}
      <circle r={R - 1.5} fill="none" stroke="#9CC0FF" strokeWidth={3} opacity={0.45} strokeDasharray={`${R * 2.2} ${R * 10}`} strokeDashoffset={R * 0.9} />
      {/* the network: arcs with data pulses, and city nodes */}
      <g opacity={net}>
        {LINKS.map(([a, b], i) => {
          const pts = arcPts(CITIES[a], CITIES[b], rot, tilt, R);
          const fl = flick(100 + i);
          const rs = runs(pts, R);
          if (!rs.length) return null;
          const t = (fr * (0.012 + random(`lk${i}`) * 0.01) + random(`lo${i}`)) % 1;
          const q = pts[Math.round(t * (pts.length - 1))];
          const qVis = q.z > 0 || Math.hypot(q.x, q.y) > R * 1.005;
          return (
            <g key={i}>
              {rs.map((d, j) => (
                <g key={j}>
                  <path d={d} fill="none" stroke="#8FB8FF" strokeWidth={6} opacity={0.12 * fl} />
                  <path d={d} fill="none" stroke="#CFE0FF" strokeWidth={2.2} opacity={0.55 * fl} strokeLinecap="round" />
                </g>
              ))}
              {qVis && <circle cx={q.x} cy={q.y} r={4.5} fill="#FFFFFF" opacity={0.9 * fl} />}
            </g>
          );
        })}
        {CITIES.map(([lon, lat], i) => {
          const q = proj(lon, lat, rot, tilt, R);
          if (q.z < 0.05) return null;
          const fl = flick(i);
          const tw = 0.75 + 0.25 * Math.sin(fr * 0.15 + i * 2.3);
          const edge = Math.min(1, q.z * 3);
          return (
            <g key={i} transform={`translate(${q.x} ${q.y})`} opacity={edge}>
              <circle r={26 * tw} fill="url(#gNode)" opacity={fl} />
              <circle r={5.5} fill="#F2F7FF" opacity={0.25 + 0.75 * fl} />
            </g>
          );
        })}
      </g>
    </g>
  );
};
