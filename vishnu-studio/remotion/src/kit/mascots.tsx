import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "./theme";

// Mascot concepts (2026-10-26). Vishnu wants a mascot like the voxel block in the six-steps reel he shared: a chunky
// 3D character made of cubes, in every shot. These are ours, not that one: five voxel characters in the brand's
// colours, each in two moods. Drawn as isometric cubes in SVG (no 3D engine), so a still costs nothing to render.

type Vox = { x: number; y: number; z: number; c: string };
export type Face = "happy" | "wow";

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
};

/** A voxel model: boxes of cubes, later boxes paint over earlier ones. */
class Model {
  m = new Map<string, Vox>();
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, c: string) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.m.set(`${x},${y},${z}`, { x, y, z, c });
    return this;
  }
  /** Paint cubes on the front face (the highest y in each column), for eyes and mouths. */
  paint(cells: [number, number][], c: string, y: number) {
    for (const [x, z] of cells) {
      const v = this.m.get(`${x},${y},${z}`);
      if (v) v.c = c;
    }
    return this;
  }
  /** Copy another model in, shifted. */
  add(o: Model, dx: number, dy: number, dz: number) {
    for (const v of o.m.values()) this.m.set(`${v.x + dx},${v.y + dy},${v.z + dz}`, { ...v, x: v.x + dx, y: v.y + dy, z: v.z + dz });
    return this;
  }
  has(x: number, y: number, z: number) {
    return this.m.has(`${x},${y},${z}`);
  }
}

/** Isometric drawing: +x goes down-right, +y down-left, +z up. Top, left (+y) and right (+x) faces are visible. */
const Voxels: React.FC<{ model: Model; s?: number; size: number }> = ({ model, s = 26, size }) => {
  const vs = [...model.m.values()].sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z) || a.z - b.z);
  const P = (x: number, y: number, z: number) => `${((x - y) * s * 0.866).toFixed(1)},${((x + y) * s * 0.5 - z * s).toFixed(1)}`;
  const polys: React.ReactNode[] = [];
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const { x, y, z, c } of vs) {
    const faces: [string, string][] = [];
    if (!model.has(x, y, z + 1)) faces.push([[P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)].join(" "), shade(c, 0.22)]);
    if (!model.has(x, y + 1, z)) faces.push([[P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)].join(" "), c]);
    if (!model.has(x + 1, y, z)) faces.push([[P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)].join(" "), shade(c, -0.22)]);
    faces.forEach(([pts, col], k) => polys.push(<polygon key={`${x},${y},${z},${k}`} points={pts} fill={col} stroke={col} strokeWidth={0.8} strokeLinejoin="round" />));
    const sx = (x - y) * s * 0.866, sy = (x + y) * s * 0.5 - z * s;
    minX = Math.min(minX, sx - s); maxX = Math.max(maxX, sx + 2 * s); minY = Math.min(minY, sy - 1.2 * s); maxY = Math.max(maxY, sy + 1.6 * s);
  }
  const w = maxX - minX, h = maxY - minY, pad = 20;
  return (
    <svg width={size} height={size} viewBox={`${minX - pad} ${minY - pad} ${Math.max(w, h) + 2 * pad} ${Math.max(w, h) + 2 * pad}`}
      style={{ overflow: "visible", filter: "drop-shadow(0 22px 18px rgba(20,21,26,0.25))" }}>
      {polys}
    </svg>
  );
};

const GOLD = C.gold, INK = "#1e2029", WHITE = "#f2f3f6", GLOW = "#ffd84d";

/** 1. Block: a gold cube with a dark visor and two glowing eyes. */
const block = (f: Face) => {
  const m = new Model().box(0, 7, 0, 7, 2, 9, GOLD).box(1, 2, 2, 5, 0, 1, GOLD).box(5, 6, 2, 5, 0, 1, GOLD)
    .box(-1, -1, 3, 4, 4, 6, GOLD).box(8, 8, 3, 4, 4, 6, GOLD);
  m.paint([[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7]], INK, 7);
  m.paint(f === "wow" ? [[2, 5], [2, 6], [2, 7], [5, 5], [5, 6], [5, 7]] : [[2, 6], [5, 6]], GLOW, 7);
  m.paint(f === "wow" ? [[3, 3], [4, 3], [3, 2], [4, 2]] : [[2, 3], [3, 2], [4, 2], [5, 3]], INK, 7);
  return m;
};

/** 2. Pointer: a mouse cursor made of cubes. It clicks things and gets them done, like Verb. */
const pointer = (f: Face) => {
  const rows = [
    "X.......", "XX......", "XXX.....", "XXXX....", "XXXXX...", "XXXXXX..", "XXXXXXX.", "XXXXXXXX",
    "XXXXX...", "XX.XX...", "X...XX..", "....XX..", ".....XX.",
  ];
  const m = new Model();
  rows.forEach((r, i) => [...r].forEach((ch, x) => ch === "X" && m.box(x, x, 0, 2, 14 - i, 14 - i, GOLD)));
  m.paint(f === "wow" ? [[1, 10], [1, 9], [3, 10], [3, 9]] : [[1, 9], [3, 9]], INK, 2);
  m.paint(f === "wow" ? [[2, 7], [2, 6]] : [[1, 7], [2, 6], [3, 7]], INK, 2);
  return m;
};

/** 3. Bot: a white robot, a dark face screen, a gold V antenna. */
const bot = (f: Face) => {
  const m = new Model().box(0, 7, 0, 7, 6, 12, WHITE).box(1, 6, 1, 6, 1, 5, WHITE).box(1, 2, 2, 5, 0, 0, "#9aa1ad").box(5, 6, 2, 5, 0, 0, "#9aa1ad")
    .box(-1, -1, 3, 4, 2, 4, WHITE).box(8, 8, 3, 4, 2, 4, WHITE)
    .box(3, 4, 3, 4, 13, 14, "#9aa1ad").box(2, 2, 3, 4, 15, 15, GOLD).box(5, 5, 3, 4, 15, 15, GOLD).box(3, 4, 3, 4, 15, 15, "#9aa1ad");
  const screen: [number, number][] = [];
  for (let x = 1; x <= 6; x++) for (let z = 7; z <= 11; z++) screen.push([x, z]);
  m.paint(screen, INK, 7);
  m.paint(f === "wow" ? [[2, 9], [2, 10], [5, 9], [5, 10], [3, 7], [4, 7]] : [[2, 10], [5, 10], [2, 8], [3, 7], [4, 7], [5, 8]], GLOW, 7);
  m.paint([[3, 3], [4, 3], [2, 4], [5, 4], [3, 4], [4, 4]].filter(([x, z]) => z === 4 ? x === 3 || x === 4 || x === 2 || x === 5 : true), GOLD, 6);
  return m;
};

/** 4. Otter: otters use tools; this one holds a gold laptop. */
const otter = (f: Face) => {
  const B = "#a8714a", L = "#f1dcc4";
  const m = new Model().box(0, 7, 0, 6, 0, 7, B).box(0, 7, 0, 6, 8, 14, B).box(0, 1, 2, 3, 15, 15, B).box(6, 7, 2, 3, 15, 15, B)
    .box(1, 6, 6, 6, 1, 6, L).box(2, 5, 6, 7, 8, 10, L).box(3, 4, 7, 7, 10, 10, INK)
    .box(1, 6, 7, 8, 2, 5, GOLD).box(-1, -1, 4, 6, 3, 5, B).box(8, 8, 4, 6, 3, 5, B);
  m.paint(f === "wow" ? [[1, 12], [1, 11], [6, 12], [6, 11]] : [[1, 12], [6, 12]], INK, 6);
  m.paint(f === "wow" ? [[3, 8], [4, 8]] : [[3, 8], [4, 8]], INK, 7);
  return m;
};

/** 5. Bean: a tall gold block with a green sprout, a silhouette nobody owns. */
const bean = (f: Face) => {
  const G = "#4cb879";
  const m = new Model().box(1, 6, 0, 5, 2, 14, GOLD).box(0, 7, 0, 5, 4, 12, GOLD).box(2, 5, 0, 5, 1, 1, GOLD)
    .box(1, 2, 1, 4, 0, 0, GOLD).box(5, 6, 1, 4, 0, 0, GOLD)
    .box(3, 4, 2, 3, 15, 16, "#2f7a43").box(1, 2, 2, 3, 17, 17, G).box(5, 6, 2, 3, 17, 17, G).box(3, 4, 2, 3, 17, 17, G)
    .box(-1, -1, 2, 3, 6, 9, GOLD).box(8, 8, 2, 3, 6, 9, GOLD);
  m.paint(f === "wow" ? [[2, 10], [2, 11], [5, 10], [5, 11]] : [[2, 10], [5, 10]], INK, 5);
  m.paint([[1, 8], [6, 8]], "#ff9fb8", 5);
  m.paint(f === "wow" ? [[3, 7], [4, 7], [3, 6], [4, 6]] : [[2, 7], [3, 6], [4, 6], [5, 7]], INK, 5);
  return m;
};


/** 6. Scout: a humanoid robot with WALL-E's binocular eyes, a gold body and a V on the chest. */
const scout = (f: Face) => {
  const G2 = "#9aa1ad";
  const m = new Model()
    .box(0, 3, 0, 6, 0, 0, G2).box(5, 8, 0, 6, 0, 0, G2)
    .box(1, 2, 2, 4, 1, 4, G2).box(6, 7, 2, 4, 1, 4, G2)
    .box(0, 8, 1, 6, 5, 11, GOLD)
    .box(-2, -1, 3, 4, 6, 10, GOLD).box(9, 10, 3, 4, 6, 10, GOLD).box(-2, -1, 3, 4, 5, 5, G2).box(9, 10, 3, 4, 5, 5, G2)
    .box(3, 5, 3, 4, 12, 13, G2)
    .box(0, 3, 2, 6, 14, 17, G2).box(5, 8, 2, 6, 14, 17, G2).box(4, 4, 3, 5, 15, 16, G2);
  m.paint([[2, 9], [3, 8], [4, 7], [5, 8], [6, 9]], INK, 6);
  const lens = (x0: number): [number, number][] => f === "wow" ? [[x0, 15], [x0 + 1, 15], [x0, 16], [x0 + 1, 16], [x0, 17], [x0 + 1, 17]] : [[x0, 15], [x0 + 1, 15], [x0, 16], [x0 + 1, 16]];
  m.paint([...lens(1), ...lens(6)], INK, 6);
  m.paint(f === "wow" ? [[1, 16], [7, 16]] : [[2, 16], [6, 16]], GLOW, 6);
  return m;
};

/** 7. Ava: a sleek white android, more human in shape, a gold visor for eyes. */
const android = (f: Face) => {
  const m = new Model()
    .box(1, 2, 1, 4, 0, 0, "#c9ced8").box(5, 6, 1, 4, 0, 0, "#c9ced8")
    .box(1, 2, 2, 3, 1, 7, WHITE).box(5, 6, 2, 3, 1, 7, WHITE)
    .box(1, 6, 1, 4, 8, 10, WHITE).box(0, 7, 1, 4, 11, 14, WHITE)
    .box(-1, -1, 2, 3, 8, 14, WHITE).box(8, 8, 2, 3, 8, 14, WHITE).box(-1, -1, 2, 3, 7, 7, GOLD).box(8, 8, 2, 3, 7, 7, GOLD)
    .box(3, 4, 2, 3, 15, 15, "#c9ced8")
    .box(1, 6, 0, 5, 16, 21, WHITE).box(2, 5, 0, 5, 22, 22, WHITE);
  m.paint([[1, 19], [2, 19], [3, 19], [4, 19], [5, 19], [6, 19], [1, 18], [2, 18], [3, 18], [4, 18], [5, 18], [6, 18]], INK, 5);
  m.paint(f === "wow" ? [[2, 18], [2, 19], [5, 18], [5, 19]] : [[2, 19], [3, 19], [4, 19], [5, 19]], GOLD, 5);
  m.paint(f === "wow" ? [[3, 16], [4, 16], [3, 17], [4, 17]] : [[3, 16], [4, 16]], "#c9ced8", 5);
  m.paint([[3, 12], [4, 12]], GOLD, 4);
  return m;
};

/** 8. Vishnu: him in voxels, from PixelVishnu's notes: big dark curls, black rectangular glasses, warm brown skin,
 *  a navy blazer over a white tee, a gold lapel pin. */
const vishnu = (f: Face) => {
  const SKIN = "#c68a5e", HAIR = "#241a14", NAVY = "#25324d", DENIM = "#1b2233", TEE = "#f6f4ef", LENS = "#dfe6ee";
  const m = new Model()
    .box(1, 3, 0, 5, 0, 0, TEE).box(4, 6, 0, 5, 0, 0, TEE)
    .box(1, 3, 1, 4, 1, 5, DENIM).box(4, 6, 1, 4, 1, 5, DENIM)
    .box(0, 7, 1, 5, 6, 12, NAVY)
    .box(-1, -1, 2, 4, 7, 12, NAVY).box(8, 8, 2, 4, 7, 12, NAVY).box(-1, -1, 2, 4, 6, 6, SKIN).box(8, 8, 2, 4, 6, 6, SKIN)
    .box(3, 4, 2, 4, 13, 13, SKIN)
    .box(0, 7, 0, 6, 14, 20, SKIN)
    .box(-1, 8, -1, 6, 20, 22, HAIR).box(-1, -1, -1, 6, 15, 19, HAIR).box(8, 8, -1, 6, 15, 19, HAIR).box(0, 7, -1, -1, 14, 19, HAIR)
    .box(0, 1, 0, 2, 23, 23, HAIR).box(3, 5, 1, 4, 23, 23, HAIR).box(6, 7, 3, 5, 23, 23, HAIR).box(-1, 0, 4, 5, 23, 23, HAIR);
  m.paint([[2, 7], [2, 8], [2, 9], [2, 10], [2, 11], [2, 12], [3, 7], [3, 8], [3, 9], [3, 10], [3, 11], [3, 12], [4, 7], [4, 8], [4, 9], [4, 10], [4, 11], [4, 12], [5, 7], [5, 8], [5, 9], [5, 10], [5, 11], [5, 12]], TEE, 5);
  m.paint([[1, 11]], GOLD, 5);
  m.paint([[0, 18], [1, 18], [2, 18], [5, 18], [6, 18], [7, 18], [0, 17], [2, 17], [3, 17], [4, 17], [5, 17], [7, 17], [0, 16], [1, 16], [2, 16], [5, 16], [6, 16], [7, 16]], INK, 6);
  m.paint([[1, 17], [6, 17]], f === "wow" ? INK : LENS, 6);
  m.paint(f === "wow" ? [] : [[1, 17], [6, 17]], LENS, 6);
  m.paint(f === "wow" ? [[3, 14], [4, 14], [3, 15], [4, 15]] : [[2, 15], [3, 14], [4, 14], [5, 15]], "#5a2a1e", 6);
  m.paint([[0, 20], [1, 20], [2, 20], [3, 20], [4, 20], [5, 20], [6, 20], [7, 20]], HAIR, 6);
  return m;
};

/** 9. The pair: Vishnu and his robot, the founder and the agent that does the work. */
const pair = (f: Face) => new Model().add(vishnu(f), 0, 0, 0).add(scout(f), 13, -6, 0);

const SET: { name: string; line: string; make: (f: Face) => Model }[] = [
  { name: "A  Scout", line: "a humanoid robot with WALL-E's binocular eyes and a gold V", make: scout },
  { name: "B  Ava", line: "a sleek white android, more human, a gold visor", make: android },
  { name: "C  Vishnu", line: "you in voxels: curls, glasses, navy blazer, gold pin", make: vishnu },
  { name: "D  The pair", line: "you and your robot: the founder and the agent that does the work", make: pair },
];

/** The pick sheet: each mascot happy on top, surprised below, name and one line under. 2400 x 1300. */
export const MascotSheet: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(180deg, #fbfbfc 0%, #e6e8ec 100%)", flexDirection: "row", justifyContent: "space-around", padding: "50px 30px" }}>
    {SET.map(({ name, line, make }) => (
      <div key={name} style={{ width: 560, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <Voxels model={make("happy")} size={400} />
        <Voxels model={make("wow")} size={300} />
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 52, color: C.ink, marginTop: 24 }}>{name}</div>
        <div style={{ fontFamily: F.body, fontSize: 28, lineHeight: 1.35, color: C.graphite, textAlign: "center" }}>{line}</div>
      </div>
    ))}
  </AbsoluteFill>
);
