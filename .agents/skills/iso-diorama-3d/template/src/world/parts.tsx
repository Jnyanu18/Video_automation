// Clay-look primitives: materials, human worker, capsule robot, pop puff, contact shadow, trees, coins.
import React from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { popS, progS, lerp, smooth } from "../lib";
import type { V3 } from "./cam";

export const C = {
  teal: "#9fdccb", tealDeep: "#7cc6b4", sand: "#f4dca8", clay: "#e2a77f", rock: "#c98f6b",
  coral: "#ff8a7a", coralDeep: "#ef6b5c", butter: "#ffd86b", butterDeep: "#f5bf3c", lav: "#b7a4f2",
  lavDeep: "#8f78e0", lavPale: "#e6defc", visor: "#6ff4ff", cream: "#fff6e6", skin: "#e9b48e",
  skin2: "#c98a62", hair: "#4a3328", navy: "#3b3f6b", plum: "#4b3a6e", road: "#8b93a8", green: "#8fd18a",
  greenDeep: "#5fb86f", wood: "#c9925f", coal: "#4a4458", sky: "#bfe6f5", white: "#ffffff", pink: "#ffb3c7",
  mint: "#c8f3e1", glass: "#cfeeff",
};

const mats = new Map<string, THREE.MeshStandardMaterial>();
export const clay = (color: string, emissive?: string, ei = 0) => {
  const key = `${color}|${emissive ?? ""}|${ei}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, emissive: emissive ?? "#000000", emissiveIntensity: ei });
    mats.set(key, m);
  }
  return m;
};
// one-off material whose colour/emissive changes over time
export const useLiveMat = (color: string) => React.useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.82 }), [color]);

const geos = new Map<string, THREE.BufferGeometry>();
export const rbox = (w: number, h: number, d: number, r = 0.08) => {
  const key = `rb${w},${h},${d},${r}`;
  let g = geos.get(key);
  if (!g) { g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)); geos.set(key, g); }
  return g;
};

type MP = { p?: V3; r?: V3; s?: number | V3; children?: React.ReactNode };
export const G: React.FC<MP> = ({ p = [0, 0, 0], r = [0, 0, 0], s = 1, children }) => (
  <group position={p} rotation={r} scale={typeof s === "number" ? [s, s, s] : s}>{children}</group>
);

export const Box: React.FC<{ p?: V3; size: V3; color: string; r?: V3; round?: number; e?: string; ei?: number; mat?: THREE.Material; noShadow?: boolean }> = ({ p = [0, 0, 0], size, color, r = [0, 0, 0], round = 0.06, e, ei, mat, noShadow }) => (
  <mesh position={p} rotation={r} geometry={rbox(size[0], size[1], size[2], round)} material={mat ?? clay(color, e, ei)} castShadow={!noShadow} receiveShadow />
);
export const Ball: React.FC<{ p?: V3; r: number; color: string; s?: V3; e?: string; ei?: number; seg?: number }> = ({ p = [0, 0, 0], r, color, s = [1, 1, 1], e, ei, seg = 24 }) => (
  <mesh position={p} scale={s} material={clay(color, e, ei)} castShadow receiveShadow>
    <sphereGeometry args={[r, seg, Math.round(seg * 0.75)]} />
  </mesh>
);
export const Cyl: React.FC<{ p?: V3; rt: number; rb?: number; h: number; color: string; r?: V3; seg?: number; e?: string; ei?: number }> = ({ p = [0, 0, 0], rt, rb, h, color, r = [0, 0, 0], seg = 24, e, ei }) => (
  <mesh position={p} rotation={r} material={clay(color, e, ei)} castShadow receiveShadow>
    <cylinderGeometry args={[rt, rb ?? rt, h, seg]} />
  </mesh>
);
export const Cap: React.FC<{ p?: V3; rad: number; len: number; color: string; r?: V3; e?: string; ei?: number }> = ({ p = [0, 0, 0], rad, len, color, r = [0, 0, 0], e, ei }) => (
  <mesh position={p} rotation={r} material={clay(color, e, ei)} castShadow receiveShadow>
    <capsuleGeometry args={[rad, len, 6, 16]} />
  </mesh>
);

// soft contact shadow (ambient-occlusion feel) under objects
const blobTex = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  if (!g) return null;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(40,50,80,0.55)"); gr.addColorStop(0.55, "rgba(40,50,80,0.22)"); gr.addColorStop(1, "rgba(40,50,80,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
export const Blob: React.FC<{ p?: V3; r?: number; o?: number }> = ({ p = [0, 0, 0], r = 0.5, o = 1 }) =>
  blobTex ? (
    <mesh position={[p[0], p[1] + 0.012, p[2]]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[r * 2, r * 2]} />
      <meshBasicMaterial map={blobTex} transparent opacity={o} depthWrite={false} />
    </mesh>
  ) : null;

// ---- figures ----
export const FACE_CAM = Math.PI / 4; // rotation.y that faces the camera

// Human worker: pill body (shirt), head, hair; `act` swings the arms / tool.
export const Human: React.FC<{ p: V3; ry?: number; s?: number; shirt?: string; hat?: "helmet" | "beret" | "cap" | null; hatColor?: string; t: number; act?: number; tool?: React.ReactNode; apron?: string; sit?: boolean }> = ({ p, ry = FACE_CAM, s = 1, shirt = C.coral, hat = null, hatColor = C.butter, t, act = 0, tool, apron, sit }) => {
  if (s <= 0.001) return null;
  const bob = 0;
  const sw = act * 0.5;
  return (
    <group position={p} rotation={[0, ry, 0]} scale={[s, s, s]}>
      {!sit && <Blob r={0.36} />}
      {!sit && <>
        <Cap p={[-0.09, 0.2, 0]} rad={0.075} len={0.18} color={C.navy} />
        <Cap p={[0.09, 0.2, 0]} rad={0.075} len={0.18} color={C.navy} />
      </>}
      <group position={[0, (sit ? 0.15 : 0.38) + bob, 0]}>
        <Cap p={[0, 0.2, 0]} rad={0.2} len={0.2} color={shirt} />
        {apron && <Box p={[0, 0.17, 0.15]} size={[0.3, 0.3, 0.08]} color={apron} round={0.03} />}
        {/* arms */}
        <group position={[-0.24, 0.32, 0]} rotation={[sw * 0.9, 0, 0.25]}>
          <Cap p={[0, -0.13, 0]} rad={0.06} len={0.16} color={shirt} />
          <Ball p={[0, -0.26, 0]} r={0.065} color={C.skin} seg={12} />
        </group>
        <group position={[0.24, 0.32, 0]} rotation={[-sw * 0.9 - (tool ? 0.9 : 0), 0, -0.25]}>
          <Cap p={[0, -0.13, 0]} rad={0.06} len={0.16} color={shirt} />
          <Ball p={[0, -0.26, 0]} r={0.065} color={C.skin} seg={12} />
          {tool && <group position={[0, -0.28, 0]}>{tool}</group>}
        </group>
        {/* head */}
        <group position={[0, 0.66, 0]}>
          <Ball r={0.2} color={C.skin} />
          <Ball p={[0, 0.05, -0.02]} r={0.205} color={C.hair} s={[1.02, 0.78, 1.02]} />
          <Ball p={[-0.07, 0.0, 0.18]} r={0.026} color={C.plum} seg={10} />
          <Ball p={[0.07, 0.0, 0.18]} r={0.026} color={C.plum} seg={10} />
          <Ball p={[-0.12, -0.06, 0.15]} r={0.03} color={C.pink} seg={10} />
          <Ball p={[0.12, -0.06, 0.15]} r={0.03} color={C.pink} seg={10} />
          {hat === "helmet" && <><Ball p={[0, 0.07, 0]} r={0.225} color={hatColor} s={[1, 0.72, 1]} /><Cyl p={[0, 0.06, 0.02]} rt={0.27} h={0.03} color={hatColor} /><Ball p={[0, 0.12, 0.2]} r={0.045} color={C.white} e={C.butter} ei={0.8} seg={10} /></>}
          {hat === "beret" && <Cyl p={[0.03, 0.17, 0]} rt={0.2} rb={0.22} h={0.07} color={hatColor} r={[0, 0, -0.25]} />}
          {hat === "cap" && <><Ball p={[0, 0.07, 0]} r={0.215} color={hatColor} s={[1, 0.66, 1]} /><Box p={[0, 0.06, 0.2]} size={[0.26, 0.03, 0.16]} color={hatColor} round={0.012} /></>}
        </group>
      </group>
    </group>
  );
};

// Capsule robot: lavender pill body, white head with glowing visor, antenna. `walk` = phase (0 = still).
export const Robot: React.FC<{ p: V3; ry?: number; s?: number; t: number; walk?: number; tilt?: number; fall?: number; tool?: React.ReactNode; sit?: boolean; visor?: string; arms?: number; body?: string }> = ({ p, ry = FACE_CAM, s = 1, t, walk = 0, tilt = 0, fall = 0, tool, sit, visor = C.visor, arms = 0, body = C.lav }) => {
  if (s <= 0.001) return null;
  const ph = walk * Math.PI * 2;
  const step = walk ? Math.abs(Math.sin(ph)) * 0.07 : 0;
  const leg = walk ? Math.sin(ph) * 0.5 : 0;
  const armSw = walk ? Math.sin(ph) * 0.6 : arms;
  return (
    <group position={p} rotation={[0, ry, 0]} scale={[s, s, s]}>
      {!sit && <Blob r={0.38} o={1 - fall * 0.3} />}
      <group rotation={[fall * 1.45, 0, tilt]} position={[0, 0, 0]}>
        {!sit && <>
          <group position={[-0.1, 0.27, 0]} rotation={[leg, 0, 0]}><Cap p={[0, -0.1, 0]} rad={0.07} len={0.14} color={C.lavDeep} /></group>
          <group position={[0.1, 0.27, 0]} rotation={[-leg, 0, 0]}><Cap p={[0, -0.1, 0]} rad={0.07} len={0.14} color={C.lavDeep} /></group>
        </>}
        <group position={[0, (sit ? 0.12 : 0.36) + step, 0]}>
          <Cap p={[0, 0.2, 0]} rad={0.22} len={0.18} color={body} />
          <Ball p={[0, 0.24, 0.2]} r={0.05} color={C.white} e={visor} ei={1.4} seg={12} />
          <group position={[-0.27, 0.34, 0]} rotation={[armSw, 0, 0.3]}><Cap p={[0, -0.12, 0]} rad={0.06} len={0.16} color={C.lavPale} /></group>
          <group position={[0.27, 0.34, 0]} rotation={[-armSw - (tool ? 0.9 : 0), 0, -0.3]}>
            <Cap p={[0, -0.12, 0]} rad={0.06} len={0.16} color={C.lavPale} />
            {tool && <group position={[0, -0.27, 0]}>{tool}</group>}
          </group>
          <group position={[0, 0.68, 0]} rotation={[0, 0, 0]}>
            <Box size={[0.46, 0.36, 0.4]} color={C.lavPale} round={0.13} />
            <Box p={[0, 0.0, 0.17]} size={[0.36, 0.14, 0.1]} color={visor} e={visor} ei={1.6} round={0.05} noShadow />
            <Cyl p={[0, 0.24, 0]} rt={0.018} h={0.14} color={C.lavDeep} seg={8} />
            <Ball p={[0, 0.33, 0]} r={0.05} color={C.coral} e={C.coral} ei={0.6} seg={12} />
          </group>
        </group>
      </group>
    </group>
  );
};

// White puff ring at a swap: k 0..1
export const Puff: React.FC<{ p: V3; k: number; color?: string }> = ({ p, k, color = C.white }) => {
  if (k <= 0 || k >= 1) return null;
  const r = 0.2 + smooth(k) * 0.65, s = (1 - k) * 0.22 + 0.02;
  return (
    <group position={[p[0], p[1] + 0.5, p[2]]}>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return <Ball key={i} p={[Math.cos(a) * r, Math.sin(a * 2) * 0.12 + k * 0.3, Math.sin(a) * r]} r={s} color={color} seg={10} />;
      })}
    </group>
  );
};

// Swap timing for one worker slot: robot walks in from `from` during [ts-1.3, ts-0.1], pop at ts.
export const swapAt = (t: number, ts: number) => {
  const walkK = progS(t, ts - 1.3, 1.2, (x) => x);
  const human = 1 - progS(t, ts, 0.12);
  const puff = (t - ts) / 0.45;
  const hop = progS(t, ts, 0.3);
  const rs = t < ts ? 1 : lerp(0.75, 1, popS(t, ts, 9));
  return { walkK, human, puff, hop, rs, done: t >= ts };
};

// Robot that walks to beside the worker and hops into the slot at ts.
export const SwapRobot: React.FC<{ t: number; ts: number; from: V3; slot: V3; side?: V3; ry?: number; sit?: boolean; tool?: React.ReactNode; appear?: number }> = ({ t, ts, from, slot, side = [0.55, 0, 0.3], ry = FACE_CAM, sit, tool, appear }) => {
  const a = appear ?? ts - 1.6;
  const vis = popS(t, a, 12);
  if (vis <= 0.01) return null;
  const sw = swapAt(t, ts);
  const beside: V3 = [slot[0] + side[0], 0, slot[2] + side[2]];
  let pos: V3, walk = 0, rr = ry;
  if (t < ts) {
    const k = smooth(sw.walkK);
    pos = [lerp(from[0], beside[0], k), from[1], lerp(from[2], beside[2], k)];
    if (sw.walkK > 0 && sw.walkK < 1) { walk = (t * 2.2) % 1; rr = Math.atan2(beside[0] - from[0], beside[2] - from[2]); }
  } else {
    const h = sw.hop;
    pos = [lerp(beside[0], slot[0], h), lerp(0, slot[1], h) + Math.sin(h * Math.PI) * 0.45, lerp(beside[2], slot[2], h)];
  }
  return <Robot p={pos} ry={rr} s={vis * sw.rs} t={t} walk={walk} sit={sit && t >= ts + 0.2} tool={t >= ts ? tool : undefined} />;
};

// ---- decor ----
export const Tree: React.FC<{ p: V3; s?: number; kind?: 0 | 1; color?: string }> = ({ p, s = 1, kind = 0, color = C.greenDeep }) => (
  <G p={p} s={s}>
    <Blob r={0.4} />
    <Cyl p={[0, 0.2, 0]} rt={0.06} rb={0.08} h={0.4} color={C.wood} seg={8} />
    {kind === 0 ? <Ball p={[0, 0.62, 0]} r={0.34} color={color} seg={14} /> : <mesh position={[0, 0.7, 0]} material={clay(color)} castShadow><coneGeometry args={[0.32, 0.8, 7]} /></mesh>}
  </G>
);
export const Bush: React.FC<{ p: V3; s?: number; color?: string }> = ({ p, s = 1, color = C.green }) => (
  <G p={p} s={s}><Ball p={[0, 0.12, 0]} r={0.18} color={color} seg={12} /><Ball p={[0.15, 0.09, 0.05]} r={0.13} color={color} seg={12} /></G>
);
export const Coin: React.FC<{ p: V3; s?: number }> = ({ p, s = 1 }) => (
  <mesh position={p} scale={[s, s, s]} material={clay(C.butterDeep, C.butter, 0.25)} castShadow receiveShadow>
    <cylinderGeometry args={[0.26, 0.26, 0.09, 22]} />
  </mesh>
);
