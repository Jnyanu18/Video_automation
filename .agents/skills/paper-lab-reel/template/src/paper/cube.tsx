// The seed: a gold origami cube. Real 3D (orthographic) so it can turn, squash and unfold into a net.
import React from "react";
import { GOLD, rnd } from "./kit";

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V): V => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// rotate p about the line through h with unit axis u by angle a (Rodrigues)
const rot = (p: V, h: V, u: V, a: number): V => {
  const v = sub(p, h), c = Math.cos(a), s = Math.sin(a), d = dot(u, v), cr = cross(u, v);
  return add(h, [v[0] * c + cr[0] * s + u[0] * d * (1 - c), v[1] * c + cr[1] * s + u[1] * d * (1 - c), v[2] * c + cr[2] * s + u[2] * d * (1 - c)]);
};

// y = -1 is the top, z = +1 faces the viewer.
type Face = { id: string; v: V[]; hinge?: { h: V; u: V; far: V; target: V }; parent?: string };
const FACES: Face[] = [
  { id: "front", v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { id: "top", v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], hinge: { h: [0, -1, 1], u: [1, 0, 0], far: [0, -1, -1], target: [0, -3, 1] } },
  { id: "bottom", v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], hinge: { h: [0, 1, 1], u: [1, 0, 0], far: [0, 1, -1], target: [0, 3, 1] } },
  { id: "left", v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], hinge: { h: [-1, 0, 1], u: [0, 1, 0], far: [-1, 0, -1], target: [-3, 0, 1] } },
  { id: "right", v: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], hinge: { h: [1, 0, 1], u: [0, 1, 0], far: [1, 0, -1], target: [3, 0, 1] } },
  { id: "back", v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], hinge: { h: [0, 1, -1], u: [1, 0, 0], far: [0, -1, -1], target: [0, 1, -3] }, parent: "bottom" },
];
// pick the rotation sign that sends `far` to `target`
const SIGN: Record<string, number> = {};
for (const f of FACES) if (f.hinge) {
  const { h, u, far, target } = f.hinge;
  const a = rot(far, h, u, Math.PI / 2), b = rot(far, h, u, -Math.PI / 2);
  SIGN[f.id] = Math.hypot(...sub(a, target)) < Math.hypot(...sub(b, target)) ? 1 : -1;
}

const LIGHT = norm([-0.45, -0.85, 0.55]);
const mix = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((x, i) => Math.round(x + (pb[i] - x) * k)).join(",")})`;
};
const goldAt = (b: number) => b < 0.5 ? mix("#7a5208", GOLD, b * 2) : mix(GOLD, "#ffe9a0", (b - 0.5) * 2);

export type CubeProps = {
  x: number; y: number; e: number;          // centre on screen, edge length in px
  yaw?: number; pitch?: number; roll?: number; // degrees
  unfold?: number;                           // 0 cube .. 1 flat net
  squash?: number;                           // 1 = none; <1 squat, >1 tall
  glow?: number;                             // warm light on the board under/around it
  faces?: number;                            // how many faces are filled in (0..6); the rest are pencil outlines (path beat)
  shadow?: boolean;
};

export const GoldCube: React.FC<CubeProps> = ({ x, y, e, yaw = 35, pitch = -24, roll = 0, unfold = 0, squash = 1, glow = 0, faces = 6, shadow = true }) => {
  const ya = (yaw * Math.PI) / 180, pa = (pitch * Math.PI) / 180, ra = (roll * Math.PI) / 180;
  const k = Math.max(0, Math.min(1, unfold));
  const place = (f: Face, p: V): V => {
    let q = p;
    if (f.hinge && k > 0) {
      q = rot(q, f.hinge.h, f.hinge.u, SIGN[f.id] * k * Math.PI / 2);
      if (f.parent) { const par = FACES.find((z) => z.id === f.parent)!; q = rot(q, par.hinge!.h, par.hinge!.u, SIGN[par.id] * k * Math.PI / 2); }
    }
    // squash about the base
    q = [q[0] / Math.sqrt(squash), (q[1] - 1) * squash + 1, q[2] / Math.sqrt(squash)];
    // view: yaw about y, pitch about x, roll about z
    let [a, b, c] = q;
    [a, c] = [a * Math.cos(ya) + c * Math.sin(ya), -a * Math.sin(ya) + c * Math.cos(ya)];
    [b, c] = [b * Math.cos(pa) - c * Math.sin(pa), b * Math.sin(pa) + c * Math.cos(pa)];
    [a, b] = [a * Math.cos(ra) - b * Math.sin(ra), a * Math.sin(ra) + b * Math.cos(ra)];
    return [a, b, c];
  };
  const polys = FACES.map((f, fi) => {
    const p3 = f.v.map((v) => place(f, v));
    const n = norm(cross(sub(p3[1], p3[0]), sub(p3[3], p3[0])));
    const z = p3.reduce((s, p) => s + p[2], 0) / 4;
    const facing = n[2];
    const b = 0.5 + 0.5 * dot(n[2] < 0 ? [-n[0], -n[1], -n[2]] : n, LIGHT);
    const pts = p3.map((p) => [x + (p[0] * e) / 2, y + (p[1] * e) / 2] as [number, number]);
    return { f, fi, pts, z, facing, b };
  });
  const vis = polys.filter((p) => k > 0.02 || p.facing > 0.001).sort((a, b) => a.z - b.z);
  const filled = (fi: number) => fi < faces;
  return (
    <g>
      {glow > 0 && <ellipse cx={x} cy={y + e * 0.1} rx={e * 2.4} ry={e * 2.1} fill="url(#pgoldlight)" opacity={glow} />}
      {shadow && k < 0.5 && <ellipse cx={x + e * 0.18} cy={y + e * 1.0 * Math.sqrt(squash)} rx={e * 0.8} ry={e * 0.16} fill="rgba(74,52,32,.32)" />}
      {vis.map(({ f, fi, pts, b }) => {
        const [p0, p1, p2, p3] = pts, c: [number, number] = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
        const P = (q: [number, number]) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`;
        if (!filled(fi)) return (
          <path key={f.id} d={`M${P(p0)}L${P(p1)}L${P(p2)}L${P(p3)}Z`} fill="rgba(255,250,240,.35)" stroke="#55505e" strokeWidth={2.5} strokeDasharray="7 7" />
        );
        // origami: four triangles from the face centre, alternating light, crease lines
        const tris = [[p0, p1], [p1, p2], [p2, p3], [p3, p0]];
        return (
          <g key={f.id}>
            {tris.map(([a, bb], i) => (
              <path key={i} d={`M${P(a)}L${P(bb)}L${P(c)}Z`} fill={goldAt(Math.min(1, Math.max(0, b + (i % 2 ? -0.07 : 0.05) + (rnd(`cf${fi}${i}`) - 0.5) * 0.04)))} stroke={goldAt(Math.min(1, b + 0.05))} strokeWidth={0.6} />
            ))}
            <path d={`M${P(p0)}L${P(p2)}M${P(p1)}L${P(p3)}`} stroke="#8a5f0a" strokeOpacity={0.45} strokeWidth={1.4} />
            <path d={`M${P(p0)}L${P(p1)}L${P(p2)}L${P(p3)}Z`} fill="none" stroke="#fff3c4" strokeOpacity={0.55} strokeWidth={1.6} strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
};

// A 4-point paper sparkle (cut gold star) at x,y; s = 0..1 grows and shrinks.
export const Sparkle: React.FC<{ x: number; y: number; s: number; r?: number; color?: string; rot?: number }> = ({ x, y, s, r = 30, color = "#ffd75e", rot = 0 }) => {
  if (s <= 0.01) return null;
  const a = r * s, b = r * s * 0.22;
  return <path transform={`translate(${x} ${y}) rotate(${rot})`} d={`M0,${-a}L${b},${-b}L${a},0L${b},${b}L0,${a}L${-b},${b}L${-a},0L${-b},${-b}Z`} fill={color} stroke="#fff6d0" strokeWidth={1.5} />;
};
