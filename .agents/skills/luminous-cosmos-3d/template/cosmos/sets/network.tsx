// The slice streams into a layered 3D network; pulses run along its edges; then scattered points
// fly out of the output layer and collapse onto one glowing amber ribbon: "one pattern".
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { random } from "remotion";
import { lerp, progS, smooth } from "../../lib";
import { type V3, mix3 } from "../cam";
import { AMBER, CYAN, GlassCard, GlowPoints, Halo, MAGENTA, MINT, VIOLET, useRig } from "../parts";
import { L } from "../rig";
import { T } from "../timing";

// ---- a reusable layered network ------------------------------------------------------------
export type Net = { nodes: V3[]; layer: number[]; edges: [number, number][] };
export const buildNet = (xs: number[], dims: [number, number][], sy = 1.7, sz = 1.9): Net => {
  const nodes: V3[] = [], layer: number[] = [], edges: [number, number][] = [];
  const idx: number[][] = [];
  xs.forEach((x, li) => {
    const [ny, nz] = dims[li]; idx.push([]);
    for (let a = 0; a < ny; a++) for (let b = 0; b < nz; b++) {
      idx[li].push(nodes.length);
      nodes.push([x, (a - (ny - 1) / 2) * sy, (b - (nz - 1) / 2) * sz]);
      layer.push(li);
    }
  });
  for (let li = 0; li + 1 < xs.length; li++) for (const i of idx[li]) for (const j of idx[li + 1]) edges.push([i, j]);
  return { nodes, layer, edges };
};

const SPH = new THREE.SphereGeometry(1, 24, 16);
export const NetView: React.FC<{ net: Net; t: number; act: (layer: number, i: number) => number; pulse: number; pulseColor?: string; reveal?: number; opacity?: number; nodeR?: number }> = ({ net, t, act, pulse, pulseColor = CYAN, reveal = 1, opacity = 1, nodeR = 0.42 }) => {
  const parts = useMemo(() => {
    const shell = new THREE.InstancedMesh(SPH, new THREE.MeshPhysicalMaterial({ color: "#2a1d78", emissive: "#140c45", metalness: 0.2, roughness: 0.18, clearcoat: 1, envMapIntensity: 1.6, transparent: true }), net.nodes.length);
    shell.frustumCulled = false;
    const pos = new Float32Array(net.edges.length * 6);
    net.edges.forEach(([a, b], k) => { pos.set(net.nodes[a], k * 6); pos.set(net.nodes[b], k * 6 + 3); });
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: new THREE.Color(VIOLET).multiplyScalar(0.9), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    lines.frustumCulled = false;
    return { shell, lines };
  }, [net]);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  useLayoutEffect(() => {
    net.nodes.forEach((n, i) => {
      const r = smooth((reveal * net.nodes.length * 1.4 - i) / 6) * nodeR;
      p.set(...n); s.setScalar(Math.max(0.0001, r)); m.compose(p, q, s); parts.shell.setMatrixAt(i, m);
    });
    parts.shell.instanceMatrix.needsUpdate = true;
    (parts.shell.material as THREE.MeshPhysicalMaterial).opacity = opacity;
    (parts.lines.material as THREE.LineBasicMaterial).opacity = 0.3 * opacity * smooth(reveal * 1.2 - 0.2);
  });
  const NP = 240;
  return (
    <group>
      <primitive object={parts.shell} renderOrder={3} />
      <primitive object={parts.lines} renderOrder={2} />
      {/* node cores: brightness = activation */}
      <GlowPoints n={net.nodes.length} maxSize={160} opacity={opacity} fill={(g) => net.nodes.forEach((n, i) => {
        const a = act(net.layer[i], i) * smooth((reveal * net.nodes.length * 1.4 - i) / 6);
        g.set(i, n, a > 0.6 ? "#e8fbff" : CYAN, nodeR * (1.2 + 1.6 * a), 0.25 + 0.75 * a);
      })} />
      {/* pulses along edges */}
      <GlowPoints n={NP} maxSize={60} opacity={opacity} fill={(g) => {
        for (let k = 0; k < NP; k++) {
          const e = net.edges[Math.floor(random(`pe${k}`) * net.edges.length)];
          const sp = 0.5 + random(`ps${k}`) * 0.7;
          const u = (t * sp + random(`pp${k}`)) % 1;
          const a = act(net.layer[e[0]], e[0]);
          g.set(k, mix3(net.nodes[e[0]], net.nodes[e[1]], u), pulseColor, 0.16 + 0.1 * pulse, Math.min(1, a * pulse) * Math.sin(u * Math.PI));
        }
      }} />
    </group>
  );
};

// ---- the ribbon (the rule) --------------------------------------------------------------------
export const ribbonAt = (u: number): V3 => {
  const x = lerp(L.ribbonC[0] - 3.9, L.ribbonC[0] + 3.9, u);
  return [x, L.ribbonC[1] + 1.9 * Math.sin(u * Math.PI * 1.8 + 0.3) - 0.2, 0.7 * Math.sin(u * 5.3)];
};
const ribbonCurve = new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => new THREE.Vector3(...ribbonAt(i / 39))));
const NET = buildNet(L.netLayersX, [[3, 3], [4, 3], [4, 3], [4, 3], [2, 2]]);
export const NET_OUT: V3 = [L.netLayersX[4], 0, 0];
const NS = 1500;

export const NetworkSet: React.FC<{ fade: number }> = ({ fade }) => {
  const { t } = useRig();
  const ribbon = useMemo(() => {
    const geo = new THREE.TubeGeometry(ribbonCurve, 220, 0.075, 10, false);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(AMBER).multiplyScalar(2.4), toneMapped: false });
    return { geo, mat, count: geo.index!.count };
  }, []);
  // timings
  const layerOn = (li: number) => progS(t, T.trained + 0.15 + li * 0.32, 0.35);
  const recog = Math.exp(-Math.pow((t - T.pattern - 0.25) / 0.6, 2));
  const act = (li: number, i: number) => {
    const wave = Math.exp(-Math.pow(((t - T.pattern) * 7 - li * 2.2 - (i % 3) * 0.6) / 1.6, 2)) * (t > T.pattern - 0.4 ? 1 : 0);
    return Math.min(1, layerOn(li) * (0.35 + 0.25 * Math.sin(t * 3 + i)) + wave * 0.9);
  };
  const spray = progS(t, T.figure, 1.1);
  const collapse = progS(t, T.smallest, 0.9);
  const draw = progS(t, T.smallest + 0.15, 0.85);
  ribbon.geo.setDrawRange(0, Math.floor((ribbon.count * draw) / 6) * 6);
  const cardIn = progS(t, T.figure + 0.3, 0.8);
  return (
    <group>
      <hemisphereLight args={["#5a3dd0", "#07051c", 0.45]} />
      <pointLight position={[-9, 3, 4]} color={CYAN} intensity={60} decay={2} distance={0} />
      <pointLight position={[2, 5, 3]} color={VIOLET} intensity={120} decay={2} distance={0} />
      {draw > 0 && [0.2, 0.5, 0.8].map((u) => <pointLight key={u} position={ribbonAt(u)} color={AMBER} intensity={45 * draw} decay={2} distance={0} />)}
      <NetView net={NET} t={t} act={act} pulse={0.6 + 1.4 * recog + 0.6 * layerOn(4)} opacity={fade} reveal={progS(t, T.trained - 0.6, 1.4)} />
      {/* the slice arriving as a cyan stream into the input layer */}
      <GlowPoints n={420} maxSize={50} opacity={fade} fill={(g) => {
        for (let i = 0; i < 420; i++) {
          const ph = (t * (0.35 + random(`ns${i}`) * 0.25) + random(`np${i}`)) % 1;
          const target = NET.nodes[i % 9];
          const from: V3 = [-34 + random(`nx${i}`) * 6, (random(`ny${i}`) - 0.5) * 10, 10 + (random(`nz${i}`) - 0.5) * 14];
          const k = ph * ph;
          const a = (1 - progS(t, T.info1 + 0.4, 1.2)) * Math.sin(ph * Math.PI);
          g.set(i, mix3(from, target, k), i % 7 ? CYAN : "#ffffff", 0.09, a);
        }
      }} />
      {/* scattered points -> the ribbon */}
      <GlowPoints n={NS} maxSize={40} opacity={fade} fill={(g) => {
        if (spray <= 0) return;
        const pal = [CYAN, VIOLET, MAGENTA, MINT];
        for (let i = 0; i < NS; i++) {
          const src = NET.nodes[NET.nodes.length - 1 - (i % 4)];
          const sc: V3 = [L.ribbonC[0] + (random(`rx${i}`) - 0.5) * 9.5, L.ribbonC[1] + (random(`ry${i}`) - 0.5) * 9, (random(`rz${i}`) - 0.5) * 6];
          const u = random(`ru${i}`), flow = (u + Math.max(0, t - T.smallest - 0.9) * 0.05) % 1;
          const on = ribbonAt(flow);
          const ks = smooth((spray * 1.4 - random(`rd${i}`) * 0.4));
          const kc = smooth(collapse * 1.5 - random(`rc${i}`) * 0.5);
          const p0 = mix3(src, sc, ks);
          const p = mix3(p0, [on[0] + (random(`ox${i}`) - 0.5) * 0.25 * (1 - kc), on[1], on[2]], kc);
          const c = new THREE.Color(pal[i % 4]).lerp(new THREE.Color(AMBER), kc);
          g.set(i, p, c, lerp(0.17, 0.09, kc), (0.6 + 0.4 * random(`ra${i}`)) * (1 - 0.35 * kc));
          if (kc > 0.02 && kc < 0.98) { /* trail toward the ribbon */ }
        }
      }} />
      <mesh geometry={ribbon.geo} material={ribbon.mat} renderOrder={6} />
      {draw > 0 && <GlowPoints n={70} gas maxSize={300} opacity={fade * draw} fill={(g) => { for (let i = 0; i < 70; i++) g.set(i, ribbonAt(i / 69), AMBER, 0.9, 0.3); }} />}
      {draw > 0 && <Halo p={ribbonAt(((t - T.smallest) * 0.25) % 1)} size={2.4} color="#ffe2a0" i={0.8 * draw * fade} />}
      <GlassCard w={10.2} h={8.4} p={[L.ribbonC[0], L.ribbonC[1] + 0.2, -1.9]} s={lerp(0.85, 1, cardIn)} opacity={cardIn * fade} t={t} edge="#9fb4ff" />
    </group>
  );
};
