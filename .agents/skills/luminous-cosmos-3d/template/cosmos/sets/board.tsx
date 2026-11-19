// The algebra board: "x + y = z" written as glass glyphs on a bevelled glass board; x and z light
// amber ("given"), y asks "?"; practice cards stream in from depth and stack around the board;
// on "move the Y" the glyphs travel to "y = z − x"; "it just works" flares the board amber; then
// every glyph becomes a node of a neural network ("that's how neural network works").
import React, { useMemo } from "react";
import * as THREE from "three";
import { random } from "remotion";
import { cue, cueEnd, lerp, popS, progS, smooth } from "../../lib";
import { type V3, add, mix3 } from "../cam";
import { AMBER, CYAN, GlassCard, Halo, VIOLET, useRig } from "../parts";
import { textMaterial } from "../mats";
import { glyphTex, textTex } from "../tex";
import { T } from "../timing";
import { NetView, type Net } from "./network";

const SLOT = (i: number): V3 => [(i - 2) * 1.25, 0, 0.12];
// glyph -> [start slot, end slot]; "+" becomes "−" at slot 3
const G = { x: [0, 4], plus: [1, 3], y: [2, 0], eq: [3, 1], z: [4, 2] } as const;
type GId = keyof typeof G;
export const GW = {
  x: cue("X plus Y"), plus: cue("plus Y is"), y: cue("Y is equal"), eq: cue("equal to Z"), z: cueEnd("equal to Z") - 0.12,
};
// when each glyph travels to its new slot
const MOVE: Record<GId, number> = { y: T.moveY + 0.15, eq: T.otherSide + 0.2, z: T.zLeft, plus: T.zLeft + 0.35, x: T.zLeft + 0.5 };
const ARC: Record<GId, V3> = { y: [0, 1.0, 1.4], eq: [0, -0.7, 0.8], z: [0, -1.1, 1.2], plus: [0, 0.9, 1.0], x: [0, 1.3, 1.6] };

export const glyphPos = (id: GId, t: number): V3 => {
  const k = smooth(progS(t, MOVE[id], 0.75, (x) => x));
  const a = SLOT(G[id][0]), b = SLOT(G[id][1]);
  const mid = add(mix3(a, b, 0.5), ARC[id]);
  return mix3(mix3(a, mid, k), mix3(mid, b, k), k);
};

const PRACTICE = ["2 + y = 5  →  y = 3", "7 + y = 10  →  y = 3", "4 + y = 9  →  y = 5", "1 + y = 8  →  y = 7", "6 + y = 11  →  y = 5", "5 + y = 6  →  y = 1", "3 + y = 7  →  y = 4", "8 + y = 9  →  y = 1"];
// where each practice card ends up (a loose wall behind and around the board)
const cardHome = (i: number): V3 => {
  const col = i % 2 ? 1 : -1, row = Math.floor(i / 2);
  return [col * (2.0 + (row % 2) * 0.45) + 0.6, -2.0 - row * 1.0 - (i % 3) * 0.08, -1.5 - row * 0.7];
};
const cardAt = (i: number) => T.doIt + 0.2 + i * ((T.equation - T.doIt - 0.4) / PRACTICE.length);

const FIELD_GLYPHS = ["π", "∑", "√", "x²", "y", "+", "=", "÷", "∞", "3", "7", "z"];
const FIELD = Array.from({ length: 46 }, (_, i) => ({
  p: [(random(`fx${i}`) - 0.5) * 22, (random(`fy${i}`) - 0.5) * 16, -6 - random(`fz${i}`) * 22] as V3,
  s: 0.6 + random(`fs${i}`) * 1.1, v: 0.02 + random(`fv${i}`) * 0.03, ph: random(`fp${i}`),
}));
const boardInF = (t: number) => progS(t, T.ifX - 0.8, 0.8);

// the network the glyphs turn into
const NET: Net = (() => {
  const nodes: V3[] = [], layer: number[] = [], edges: [number, number][] = [];
  const L = [5, 4, 3, 1];
  const idx: number[][] = [];
  L.forEach((n, li) => {
    idx.push([]);
    for (let k = 0; k < n; k++) {
      idx[li].push(nodes.length);
      nodes.push(li === 0 ? SLOT(k) : [(k - (n - 1) / 2) * 1.5, (li % 2 ? 0.6 : -0.4), -li * 2.6]);
      layer.push(li);
    }
  });
  for (let li = 0; li + 1 < L.length; li++) for (const a of idx[li]) for (const b of idx[li + 1]) edges.push([a, b]);
  return { nodes, layer, edges };
})();

export const BoardSet: React.FC<{ fade: number }> = ({ fade }) => {
  const { t } = useRig();
  const tex = useMemo(() => ({
    x: glyphTex("x"), plus: glyphTex("+"), minus: glyphTex("−"), y: glyphTex("y"), eq: glyphTex("="), z: glyphTex("z"), q: glyphTex("?"), check: glyphTex("✓"),
    cards: PRACTICE.map((p) => textTex(1024, 220, [{ text: p, px: 104, weight: 800, y: 116 }])),
  }), []);
  const mats = useMemo(() => {
    const m: Record<string, THREE.ShaderMaterial> = {};
    for (const k of ["x", "plus", "minus", "y", "eq", "z", "q", "check"] as const) m[k] = textMaterial(tex[k]);
    return m;
  }, [tex]);
  const plane = useMemo(() => new THREE.PlaneGeometry(1.25, 1.25), []);
  const fieldMats = useMemo(() => FIELD_GLYPHS.map((g, i) => { const m = textMaterial(glyphTex(g)); m.uniforms.uTint.value.set(i % 3 ? "#9fb4ff" : CYAN); return m; }), []);
  for (const m of fieldMats) { m.uniforms.uOpacity.value = 0.22 * fade * boardInF(t); m.uniforms.uFog.value = 0.02; }
  const nn = progS(t, T.howBeaut + 0.1, 1.0);           // glyphs -> nodes
  const netOn = progS(t, T.recog - 0.2, 1.2);
  const works = Math.exp(-Math.pow((t - T.works - 0.2) / 0.5, 2));
  const given = progS(t, T.xAndZ, 0.35) * (1 - progS(t, T.moveY - 0.3, 0.4));
  const ask = progS(t, T.findY + 0.2, 0.35) * (1 - progS(t, T.doIt + 0.6, 0.4));
  const boardIn = progS(t, T.ifX - 0.6, 0.6);
  const glyph = (id: GId, show: number, tint: string, extra?: React.ReactNode) => {
    const m = mats[id === "plus" ? "plus" : id];
    m.uniforms.uOpacity.value = show * fade * (1 - nn);
    m.uniforms.uTint.value.set(tint);
    const p = glyphPos(id, t);
    const pop = popS(t, GW[id] - 0.05, 11);
    return (
      <group key={id} position={p} scale={lerp(0.5, 1, pop) * (1 - 0.6 * nn)}>
        <mesh geometry={plane} material={m} renderOrder={12} />
        {extra}
      </group>
    );
  };
  // "+" turns into "−" as it lands on its new slot
  const toMinus = progS(t, MOVE.plus + 0.45, 0.25);
  mats.minus.uniforms.uOpacity.value = toMinus * fade * (1 - nn);
  mats.minus.uniforms.uTint.value.set("#ffffff");
  mats.q.uniforms.uOpacity.value = ask * fade; mats.q.uniforms.uTint.value.set(CYAN);
  mats.check.uniforms.uOpacity.value = progS(t, T.works, 0.3) * (1 - progS(t, T.howBeaut, 0.4)) * fade; mats.check.uniforms.uTint.value.set(AMBER);
  const amb = (id: GId) => (id === "x" || id === "z" ? new THREE.Color("#ffffff").lerp(new THREE.Color(AMBER), given).getStyle() : id === "y" ? new THREE.Color("#ffffff").lerp(new THREE.Color(CYAN), ask).getStyle() : "#ffffff");
  return (
    <group>
      <hemisphereLight args={["#5a3dd0", "#07051c", 0.5]} />
      <pointLight position={[-4, 3, 5]} color={VIOLET} intensity={90} decay={2} distance={0} />
      <pointLight position={[0, 0, 2.5]} color={works > 0.05 ? AMBER : CYAN} intensity={20 + 140 * works} decay={2} distance={0} />
      {/* the board */}
      <GlassCard w={7.4} h={3.2} p={[0, 0, -0.1]} s={lerp(0.9, 1, boardIn)} opacity={boardIn * fade * (1 - 0.7 * nn)} t={t} edge={works > 0.1 ? AMBER : "#9fb4ff"} depth={0.14} />
      {(["x", "plus", "y", "eq", "z"] as GId[]).map((id) => glyph(id, popS(t, GW[id] - 0.05, 11) * (id === "plus" ? 1 - toMinus : 1), amb(id)))}
      <mesh geometry={plane} material={mats.minus} position={glyphPos("plus", t)} renderOrder={12} />
      <mesh geometry={plane} material={mats.q} position={add(SLOT(2), [0, 1.15, 0.2])} scale={0.8} renderOrder={12} />
      <mesh geometry={plane} material={mats.check} position={[2.9, 1.55, 0.3]} scale={0.8} renderOrder={12} />
      {works > 0.02 && <Halo p={[0, 0, 0.4]} size={9 * works} color={AMBER} i={0.5 * works * fade} pow={2.4} />}
      {/* practice cards flying in from depth */}
      {PRACTICE.map((_, i) => {
        const at = cardAt(i);
        const k = progS(t, at, 0.9);
        if (k <= 0) return null;
        const from: V3 = [(random(`pcx${i}`) - 0.5) * 14, (random(`pcy${i}`) - 0.3) * 8, -38];
        const home = cardHome(i);
        const p = mix3(from, home, k);
        const away = progS(t, T.moveY - 0.6, 0.8) * 0.6 + nn * 0.4;
        return <GlassCard key={i} w={3.3} h={0.72} tex={tex.cards[i]} p={add(p, [0, 0, -away * 4])} rot={[0, (random(`pr${i}`) - 0.5) * 0.4, (random(`pz${i}`) - 0.5) * 0.08]} opacity={fade * (1 - away * 0.85)} t={t} edge={CYAN} />;
      })}
      {/* a field of faint maths drifting in depth (the data he has read) */}
      {FIELD.map((f, i) => {
        const m = fieldMats[i % fieldMats.length];
        const y = f.p[1] + ((t * f.v + f.ph) % 1) * 3 - 1.5;
        return <mesh key={i} geometry={plane} material={m} position={[f.p[0], y, f.p[2]]} scale={f.s} renderOrder={1} />;
      })}
      {/* the network the equation becomes */}
      {nn > 0 && <NetView net={NET} t={t} act={(li) => Math.min(1, netOn * 1.4 - li * 0.25) * (0.6 + 0.4 * Math.sin(t * 4 + li))} pulse={1.4} opacity={fade} reveal={nn} nodeR={0.3} pulseColor={AMBER} />}
    </group>
  );
};
