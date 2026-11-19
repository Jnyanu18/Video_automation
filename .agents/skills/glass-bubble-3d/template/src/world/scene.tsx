// The 3D pieces of the bubble world: the shell, the AI city inside, coins, threads to everyday objects,
// market nodes, the studio and the desk. Everything is a pure function of t.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { random } from "remotion";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { easeIn, lerp, popS, progS, smooth } from "../lib";
import { B } from "../beats";
import { type V3, add, len, mix3, mul, norm, sub, unproject } from "./cam";
import { floorMaterial, planetMaterial, shellMaterial, studioMaterial } from "./bubble-mats";
import { AMBER, CYAN, GOLD, GlowPoints, Halo, MAGENTA, MINT, useRig, type Glow } from "./parts";
import { CORE_XY, T } from "./timing";
import { DESK0, OBJ_ARRIVE, OBJ_ORDER, OBJ_POS, OBJ_SCALE, OBJ_T0, P_EM, STEPS, bubbleAt, win, type ObjId } from "./rig";
import { AGENT_T, drawEditor, editorCanvas, editorLines, glyphTex, laptopScreenTex, makeTex, moonTex } from "./tex";

export type BState = ReturnType<typeof bubbleAt>;
const gauss = (t: number, t0: number, w: number) => Math.exp(-Math.pow((t - t0) / w, 2));
const IRI = [CYAN, MAGENTA, AMBER];

// ---- studio ------------------------------------------------------------------------------------
export const Studio: React.FC<{ st: BState }> = ({ st }) => {
  const { pose, t } = useRig();
  const m = useMemo(() => ({ sky: studioMaterial(), floor: floorMaterial(), sph: new THREE.SphereGeometry(400, 48, 32), disc: new THREE.CircleGeometry(160, 96) }), []);
  m.sky.uniforms.uTime.value = t; m.sky.uniforms.uGold.value = st.money * 0.5 + st.hard * 0.4;
  m.floor.uniforms.uTime.value = t; m.floor.uniforms.uGold.value = st.money * 0.6 + st.hard; m.floor.uniforms.uR.value = st.R;
  return (
    <>
      <mesh geometry={m.sph} material={m.sky} position={pose.p} renderOrder={-10} frustumCulled={false} />
      <mesh geometry={m.disc} material={m.floor} position={[0, -st.R - 3.2, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-5} />
      <Halo p={[0, 0.5, -16]} size={40} color="#1d4fb8" i={0.07} pow={1.8} renderOrder={-4} />
    </>
  );
};

// ---- the shell -------------------------------------------------------------------------------
const SPHERE = new THREE.SphereGeometry(1, 160, 120);
export const Bubble: React.FC<{ st: BState; R?: number; center?: V3; light?: boolean }> = ({ st, R, center = [0, 0, 0], light = true }) => {
  const { t, pose } = useRig();
  const m = useMemo(() => ({ shell: shellMaterial(), planet: planetMaterial() }), []);
  const r = R ?? st.R;
  const inside = len(sub(pose.p, center)) < r * 0.99 ? 1 : 0;
  for (const mat of [m.shell, m.planet]) {
    mat.uniforms.uTime.value = t * 0.35; mat.uniforms.uWob.value = st.wob; mat.uniforms.uRipple.value = st.ripple; mat.uniforms.uCrack.value = st.crack;
  }
  m.shell.uniforms.uCrackGold.value = st.gold; m.shell.uniforms.uAlpha.value = 1 - st.hard * 0.92; m.shell.uniforms.uStress.value = st.tension; m.shell.uniforms.uInside.value = inside;
  m.planet.uniforms.uHard.value = st.hard; m.planet.uniforms.uGrid.value = st.grid;
  const sc: V3 = [r * st.sx, r * st.sy, r * st.sx];
  return (
    <group position={center}>
      {st.hard > 0.002 && <mesh geometry={SPHERE} material={m.planet} scale={sc} renderOrder={12} />}
      <mesh geometry={SPHERE} material={m.shell} scale={sc} renderOrder={30} />
      {light && <pointLight position={[0, 0.3 * r, 0]} color={CYAN} intensity={28 * (r / 4.2) ** 2} distance={0} decay={2} />}
      {light && st.money > 0.01 && <pointLight position={[0, -0.2 * r, 0.5]} color={GOLD} intensity={40 * st.money * (1 - st.hard)} distance={0} decay={2} />}
    </group>
  );
};

// ---- the AI city inside ----------------------------------------------------------------------
const PLAT_Y = -1.45;
type Bld = { x: number; z: number; w: number; d: number; h: number; rack: boolean; k: number };
const BLD: Bld[] = (() => {
  const out: Bld[] = [];
  let n = 0;
  for (let gx = -6; gx <= 6; gx++) for (let gz = -6; gz <= 6; gz++) {
    const x = gx * 0.36 + (gz % 2) * 0.18, z = gz * 0.34;
    const r = Math.hypot(x, z);
    if (r > 2.15 || r < 0.42) continue;
    n++;
    if (random(`bs${n}`) < 0.3) continue;
    const rack = random(`br${n}`) < 0.22;
    out.push({
      x: x + (random(`bx${n}`) - 0.5) * 0.06, z: z + (random(`bz${n}`) - 0.5) * 0.06,
      w: rack ? 0.11 : 0.18 + random(`bw${n}`) * 0.1, d: rack ? 0.24 : 0.18 + random(`bd${n}`) * 0.1,
      h: rack ? 0.55 + random(`bh${n}`) * 0.25 : 0.2 + random(`bh${n}`) * 0.45 + (1 - r / 2.2) * 0.75,
      rack, k: random(`bk${n}`),
    });
  }
  return out;
})();
// window lights on the data-centre faces, LED columns on the racks (building index + local offset)
type Win = { b: number; u: number; v: number; face: number; c: string; ph: number };
const WINS: Win[] = (() => {
  const out: Win[] = [];
  BLD.forEach((b, i) => {
    for (let face = 0; face < 4; face++) {
      const span = face % 2 ? b.d : b.w;
      const cols = b.rack ? 2 : Math.max(1, Math.floor(span / 0.075));
      const rows = Math.floor((b.h - 0.08) / (b.rack ? 0.06 : 0.09));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (!b.rack && random(`w${i}-${face}-${r}-${c}`) < 0.35) continue;
        if (b.rack && face % 2 === 1) continue;
        const u = cols === 1 ? 0 : (c / (cols - 1) - 0.5) * span * 0.7;
        const tint = random(`wc${i}-${r}-${c}`);
        out.push({ b: i, u, v: 0.07 + r * (b.rack ? 0.06 : 0.09), face, c: b.rack ? (tint < 0.6 ? MINT : CYAN) : tint < 0.6 ? CYAN : tint < 0.82 ? MAGENTA : AMBER, ph: random(`wp${i}-${r}-${c}-${face}`) });
      }
    }
  });
  return out;
})();
const BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const CHIPS: { p: V3; s: number; ph: number }[] = [{ p: [-1.35, 0.75, 0.75], s: 0.48, ph: 0 }, { p: [1.4, 1.15, 0.1], s: 0.42, ph: 2 }, { p: [0.15, 1.75, -0.9], s: 0.4, ph: 4 }];
const GLYPHS = ["</>", "{ }", "AI", "01", "fn()", "=>", "GPU", "</>", "{ }", "AI", "01", "=>"];
const CHIP_GEO = new RoundedBoxGeometry(1, 0.1, 1, 2, 0.04);

const growOf = (b: Bld, k: number) => smooth(k * 1.5 - b.k * 0.5);

export const City: React.FC<{ k: number; s: number; t: number; glyphOut?: number; S?: number }> = ({ k, s, t, glyphOut = 0, S = 1 }) => {
  const sz = s * S;
  const mats = useMemo(() => ({
    bld: new THREE.MeshStandardMaterial({ color: "#121c44", metalness: 0.55, roughness: 0.3, emissive: "#0b1848", emissiveIntensity: 0.7 }),
    rack: new THREE.MeshStandardMaterial({ color: "#0b1230", metalness: 0.7, roughness: 0.25, emissive: "#061436", emissiveIntensity: 0.6 }),
    plat: new THREE.MeshStandardMaterial({ color: "#0a1236", metalness: 0.6, roughness: 0.2, emissive: "#0a1a52", emissiveIntensity: 0.5, transparent: true, opacity: 0.92 }),
    tower: new THREE.MeshStandardMaterial({ color: "#2a1660", metalness: 0.4, roughness: 0.2, emissive: "#7a2bd6", emissiveIntensity: 1.1 }),
    chip: new THREE.MeshStandardMaterial({ color: "#121a3a", metalness: 0.8, roughness: 0.25, emissive: "#2a0f45", emissiveIntensity: 0.8 }),
    glyph: GLYPHS.map((g, i) => new THREE.SpriteMaterial({ map: glyphTex(g), color: new THREE.Color(IRI[i % 3]), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, premultipliedAlpha: true })),
  }), []);
  const [dc, racks] = useMemo(() => [false, true].map((rk) => {
    const list = BLD.filter((b) => b.rack === rk);
    const im = new THREE.InstancedMesh(BOX, rk ? mats.rack : mats.bld, list.length);
    im.frustumCulled = false;
    return { im, list };
  }), [mats]);
  const geos = useMemo(() => ({ plat: new THREE.CylinderGeometry(2.55, 2.65, 0.1, 96), tower: new THREE.CylinderGeometry(0.1, 0.17, 1, 24).translate(0, 0.5, 0) }), []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    for (const { im, list } of [dc, racks]) {
      list.forEach((b, i) => {
        const g = growOf(b, k);
        o.position.set(b.x, PLAT_Y + 0.05, b.z); o.scale.set(b.w, Math.max(0.0001, b.h * g), b.d); o.rotation.set(0, 0, 0); o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
    }
  });
  if (k <= 0.002) return null;
  const towerH = 2.0 * smooth(k * 1.3);
  return (
    <group scale={sz}>
      <mesh geometry={geos.plat} material={mats.plat} position={[0, PLAT_Y, 0]} scale={[1, Math.max(0.01, k), 1]} />
      <primitive object={dc.im} />
      <primitive object={racks.im} />
      <mesh geometry={geos.tower} material={mats.tower} position={[0, PLAT_Y + 0.05, 0]} scale={[1, Math.max(0.001, towerH), 1]} />
      <Halo p={[0, PLAT_Y + towerH + 0.1, 0]} size={1.6 * sz * k} color={MAGENTA} i={0.5 * k} pow={2.4} />
      <Halo p={[0, PLAT_Y + 0.3, 0]} size={5.5 * sz * k} color="#3b6bff" i={0.18 * k} pow={2.0} />
      {/* windows and LEDs */}
      <GlowPoints n={WINS.length} maxSize={14} fill={(g) => {
        WINS.forEach((w, i) => {
          const b = BLD[w.b], gr = growOf(b, k);
          if (w.v > b.h * gr - 0.03) return;
          const hw = b.w / 2 + 0.006, hd = b.d / 2 + 0.006;
          const off: V3 = w.face === 0 ? [w.u, 0, hd] : w.face === 1 ? [hw, 0, w.u] : w.face === 2 ? [-w.u, 0, -hd] : [-hw, 0, -w.u];
          const blink = b.rack ? (Math.sin(t * 1.2 + w.ph * 40) > 0 ? 1 : 0.45) : 0.6 + 0.35 * w.ph;
          g.set(i, [b.x + off[0], PLAT_Y + 0.05 + w.v, b.z + off[2]], w.c, (b.rack ? 0.035 : 0.045) * sz, 0.85 * blink);
        });
      }} />
      {/* platform rim + data rising up the core tower + arcs between blocks */}
      <GlowPoints n={260} maxSize={30} fill={(g) => {
        for (let i = 0; i < 140; i++) {
          const a = (i / 140) * Math.PI * 2;
          g.set(i, [Math.cos(a) * 2.62, PLAT_Y + 0.05, Math.sin(a) * 2.62], i % 2 ? CYAN : MAGENTA, 0.05 * sz, 0.6 * k);
        }
        for (let i = 0; i < 60; i++) {
          const u = (t * 0.22 + random(`tu${i}`)) % 1;
          const a = random(`ta${i}`) * 6.28;
          g.set(140 + i, [Math.cos(a) * 0.16, PLAT_Y + u * towerH, Math.sin(a) * 0.16], i % 3 ? CYAN : "#ffffff", 0.06 * sz, k * Math.sin(u * Math.PI));
        }
        for (let i = 0; i < 60; i++) {
          const arc = i % 6, u = ((t * 0.5 + i / 10) % 1);
          const A = BLD[(arc * 7) % BLD.length], Bb = BLD[(arc * 13 + 5) % BLD.length];
          const pa: V3 = [A.x, PLAT_Y + A.h, A.z], pb: V3 = [Bb.x, PLAT_Y + Bb.h, Bb.z];
          const p = mix3(pa, pb, u); p[1] += Math.sin(u * Math.PI) * 0.9;
          void p;
        }
      }} />
      {/* floating chips with gold pins */}
      {CHIPS.map((c, i) => {
        const cp: V3 = c.p;
        const ry = c.ph, ck = smooth(k * 1.6 - 0.4 - i * 0.1);
        if (ck <= 0.01) return null;
        return (
          <group key={i} position={cp} rotation={[0.35, ry, 0.12]} scale={c.s * ck}>
            <mesh geometry={CHIP_GEO} material={mats.chip} />
            <Halo p={[0, 0.08, 0]} size={0.9 * c.s * sz} color={MAGENTA} i={0.55} pow={2.6} />
            <GlowPoints n={44} maxSize={12} fill={(g) => {
              for (let j = 0; j < 44; j++) {
                const side = j % 4, u = (Math.floor(j / 4) / 10 - 0.5) * 0.85;
                const p: V3 = side === 0 ? [u, 0, 0.56] : side === 1 ? [u, 0, -0.56] : side === 2 ? [0.56, 0, u] : [-0.56, 0, u];
                g.set(j, p, GOLD, 0.05 * c.s * sz, 0.9);
              }
            }} />
          </group>
        );
      })}
      {/* code glyphs drifting up inside the dome */}
      {GLYPHS.map((_, i) => {
        const a = (i / GLYPHS.length) * Math.PI * 2;
        const r = 1.2 + random(`gr${i}`) * 1.3;
        const u = 0.15 + random(`gu${i}`) * 0.7;
        const y = -0.2 + u * 2.3;
        const out = glyphOut;
        const op = 0.85 * k * (1 - out);
        if (op <= 0.01) return null;
        const sc = (0.42 + random(`gs${i}`) * 0.2) * (1 + out * 1.5);
        mats.glyph[i].opacity = op;
        return <sprite key={i} material={mats.glyph[i]} position={[Math.cos(a) * r, y, Math.sin(a) * r]} scale={[sc, sc, 1]} renderOrder={25} />;
      })}
    </group>
  );
};

// ---- money ------------------------------------------------------------------------------------
const N_COIN = 70;
const COIN_GEO = new THREE.CylinderGeometry(0.2, 0.2, 0.045, 36);
const coinT0 = (i: number) => T.pouring - 0.45 + i * 0.03 + random(`ct${i}`) * 0.12; // v5: pours on "pouring billions"
const COIN_DUR = 1.15;
const coinPos = (i: number, u: number, R: number): V3 => {
  const sx = (random(`cx${i}`) - 0.5) * 6, sz = (random(`cz${i}`) - 0.5) * 3;
  const ex = (random(`ex${i}`) - 0.5) * 1.8, ez = (random(`ez${i}`) - 0.5) * 1.8;
  const e = easeIn(Math.min(1, Math.max(0, u)));
  return [lerp(sx, ex, e), lerp(R + 9 + random(`cy${i}`) * 3, -0.9, e), lerp(sz, ez, e)];
};
export const Coins: React.FC<{ st: BState }> = ({ st }) => {
  const { t } = useRig();
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffb627", metalness: 1, roughness: 0.2, emissive: "#b06a00", emissiveIntensity: 0.9, envMapIntensity: 1.8 }), []);
  const im = useMemo(() => { const m = new THREE.InstancedMesh(COIN_GEO, mat, N_COIN); m.frustumCulled = false; return m; }, [mat]);
  const dollar = useMemo(() => new THREE.SpriteMaterial({ map: glyphTex("$", false), color: new THREE.Color(GOLD).multiplyScalar(1.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    for (let i = 0; i < N_COIN; i++) {
      const u = (t - coinT0(i)) / COIN_DUR;
      const p = coinPos(i, u, st.R);
      const vis = u > 0 && u < 1 ? 1 - smooth((u - 0.8) / 0.2) : 0;
      o.position.set(p[0], p[1], p[2]);
      o.rotation.set(u * 9 + random(`cr${i}`) * 6, u * 4, u * 6 + random(`cq${i}`) * 3);
      o.scale.setScalar(Math.max(0.0001, vis * 2.6));
      o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  });
  const swirlN = 260;
  return (
    <>
      <primitive object={im} />
      <GlowPoints n={N_COIN * 3 + swirlN} maxSize={40} fill={(g: Glow) => {
        for (let i = 0; i < N_COIN; i++) for (let j = 0; j < 3; j++) {
          const u = (t - coinT0(i)) / COIN_DUR - j * 0.05;
          if (u <= 0 || u >= 1.1) continue;
          g.set(i * 3 + j, coinPos(i, u, st.R), j === 0 ? "#ffe2a0" : GOLD, 0.16 - j * 0.03, 0.6 * (1 - j * 0.3) * (u > 0.85 ? 1 - (u - 0.85) / 0.25 : 1));
        }
        // gold dust that piles up swirling inside the bubble as the money pours in
        for (let i = 0; i < swirlN; i++) {
          const on = smooth(st.money * 1.4 - random(`sw${i}`) * 0.4) * (1 - st.hard);
          if (on <= 0.01) continue;
          const a = random(`sa${i}`) * 6.28 + t * (0.08 + random(`sv${i}`) * 0.1);
          const r = (0.6 + random(`sr${i}`) * 2.6) * st.R / 4.2;
          const y = (-1.3 + random(`sy${i}`) * 2.6) * st.R / 4.2;
          g.set(N_COIN * 3 + i, [Math.cos(a) * r, y, Math.sin(a) * r], i % 5 ? GOLD : "#fff1c8", 0.06, 0.75 * on);
        }
      }} />
      {Array.from({ length: 14 }, (_, i) => {
        const u = (t - (coinT0(i * 5) + 0.1)) / (COIN_DUR * 1.2);
        if (u <= 0 || u >= 1) return null;
        const p = coinPos(i * 5 + 1, u, st.R);
        const s = 0.9 * (1 - smooth((u - 0.75) / 0.25));
        return <sprite key={i} material={dollar} position={[p[0] + 0.8, p[1], p[2] + 0.5]} scale={[s, s, 1]} renderOrder={26} />;
      })}
    </>
  );
};

// ---- everyday objects + threads ---------------------------------------------------------------
const body = new THREE.MeshStandardMaterial({ color: "#152050", metalness: 0.5, roughness: 0.32, emissive: "#0c1640", emissiveIntensity: 0.8 });
const edgeMats: Record<string, THREE.LineBasicMaterial> = {};
const edgeMat = (c: string) => (edgeMats[c] ??= new THREE.LineBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
const edgeCache = new Map<THREE.BufferGeometry, THREE.EdgesGeometry>();
const edges = (g: THREE.BufferGeometry) => { if (!edgeCache.has(g)) edgeCache.set(g, new THREE.EdgesGeometry(g, 25)); return edgeCache.get(g)!; };
const Part: React.FC<{ g: THREE.BufferGeometry; p?: V3; r?: V3; c: string; m?: THREE.Material }> = ({ g, p = [0, 0, 0], r = [0, 0, 0], c, m = body }) => (
  <group position={p} rotation={r}>
    <mesh geometry={g} material={m} />
    <lineSegments geometry={edges(g)} material={edgeMat(c)} />
  </group>
);
const G = {
  lapBase: new THREE.BoxGeometry(1, 0.045, 0.66), lapLid: new THREE.BoxGeometry(1, 0.64, 0.03), lapScr: new THREE.PlaneGeometry(0.92, 0.56),
  rHead: new RoundedBoxGeometry(0.62, 0.44, 0.42, 3, 0.08), rBody: new RoundedBoxGeometry(0.5, 0.42, 0.34, 3, 0.07), rEye: new THREE.SphereGeometry(0.055, 16, 12),
  rAnt: new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), rArm: new RoundedBoxGeometry(0.1, 0.36, 0.1, 2, 0.04),
  pillA: new THREE.CapsuleGeometry(0.14, 0.32, 8, 24), molAtom: new THREE.SphereGeometry(0.075, 18, 12), molBond: new THREE.CylinderGeometry(0.018, 0.018, 1, 8),
  carBody: new RoundedBoxGeometry(1.2, 0.27, 0.56, 3, 0.07), carCab: new RoundedBoxGeometry(0.64, 0.25, 0.5, 3, 0.07), wheel: new THREE.CylinderGeometry(0.14, 0.14, 0.09, 24),
  hosp: new THREE.BoxGeometry(0.9, 0.85, 0.5), crossA: new THREE.BoxGeometry(0.34, 0.1, 0.03), crossB: new THREE.BoxGeometry(0.1, 0.34, 0.03),
  steps: new THREE.BoxGeometry(1.15, 0.08, 0.62), col: new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16), wall: new THREE.BoxGeometry(1.0, 0.5, 0.26),
  roof: (() => { const s = new THREE.Shape(); s.moveTo(-0.64, 0); s.lineTo(0.64, 0); s.lineTo(0, 0.3); s.lineTo(-0.64, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: false }); g.translate(0, 0, -0.3); return g; })(),
};
const scrMat = (tx: THREE.Texture) => new THREE.MeshBasicMaterial({ map: tx, toneMapped: false });
const EYE = new THREE.MeshBasicMaterial({ color: new THREE.Color("#c8f6ff").multiplyScalar(1.8), toneMapped: false });
const PILL_A = new THREE.MeshStandardMaterial({ color: "#ffb627", metalness: 0.3, roughness: 0.25, emissive: "#7a3d00", emissiveIntensity: 0.8 });
const ATOM = new THREE.MeshStandardMaterial({ color: "#5ee7ff", metalness: 0.3, roughness: 0.3, emissive: "#0b5a7a", emissiveIntensity: 0.9 });
const RED = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ff4d7a").multiplyScalar(1.6), toneMapped: false });

const ObjModel: React.FC<{ id: ObjId; glow: number }> = ({ id, glow }) => {
  const scr = useMemo(() => ({ lap: scrMat(laptopScreenTex()) }), []);
  scr.lap.color.setScalar(0.8 + 0.8 * glow);
  if (id === "laptop") return (
    <group position={[0, -0.25, 0]}>
      <Part g={G.lapBase} c={CYAN} />
      <group position={[0, 0.02, -0.33]} rotation={[-0.22, 0, 0]}>
        <Part g={G.lapLid} p={[0, 0.32, 0]} c={CYAN} />
        <mesh geometry={G.lapScr} material={scr.lap} position={[0, 0.32, 0.017]} />
      </group>
    </group>
  );
  if (id === "robot") return (
    <group position={[0, -0.12, 0]}>
      <Part g={G.rBody} p={[0, 0, 0]} c={MAGENTA} />
      <Part g={G.rHead} p={[0, 0.42, 0]} c={MAGENTA} />
      <Part g={G.rArm} p={[-0.33, 0.0, 0]} r={[0, 0, 0.25]} c={MAGENTA} />
      <Part g={G.rArm} p={[0.33, 0.0, 0]} r={[0, 0, -0.25]} c={MAGENTA} />
      <Part g={G.rAnt} p={[0, 0.72, 0]} c={MAGENTA} />
      <mesh geometry={G.rEye} material={EYE} position={[-0.13, 0.44, 0.21]} />
      <mesh geometry={G.rEye} material={EYE} position={[0.13, 0.44, 0.21]} />
      <Halo p={[0, 0.82, 0]} size={0.3} color="#ff9be6" i={0.7 + glow} pow={3} />
    </group>
  );
  if (id === "pill") return (
    <group rotation={[0, 0, 0.9]}>
      <mesh geometry={G.pillA} material={PILL_A} position={[0, 0.0, 0]} />
      <lineSegments geometry={edges(G.pillA)} material={edgeMat(AMBER)} />
      <group position={[0.05, -0.12, 0.25]} rotation={[0, 0, -0.9]}>
        {[[0, 0, 0], [0.26, 0.15, 0], [-0.24, 0.17, 0], [0.02, -0.28, 0]].map((p, i) => <mesh key={i} geometry={G.molAtom} material={i ? ATOM : PILL_A} position={p as V3} />)}
        {[[0.26, 0.15], [-0.24, 0.17], [0.02, -0.28]].map(([x, y], i) => (
          <mesh key={i} geometry={G.molBond} material={ATOM} position={[x / 2, y / 2, 0]} rotation={[0, 0, Math.atan2(-x, y)]} scale={[1, Math.hypot(x, y), 1]} />
        ))}
      </group>
    </group>
  );
  if (id === "car") return (
    <group position={[0, -0.3, 0]}>
      <Part g={G.carBody} p={[0, 0.25, 0]} c={AMBER} />
      <Part g={G.carCab} p={[-0.06, 0.48, 0]} c={AMBER} />
      {[[-0.38, 0.29], [0.38, 0.29], [-0.38, -0.29], [0.38, -0.29]].map(([x, z], i) => <Part key={i} g={G.wheel} p={[x, 0.13, z]} r={[Math.PI / 2, 0, 0]} c={AMBER} />)}
      <Halo p={[0.62, 0.27, 0.18]} size={0.35} color="#fff1c8" i={0.9 + glow} pow={3} />
      <Halo p={[0.62, 0.27, -0.18]} size={0.35} color="#fff1c8" i={0.9 + glow} pow={3} />
    </group>
  );
  if (id === "hospital") return (
    <group position={[0, -0.42, 0]}>
      <Part g={G.hosp} p={[0, 0.425, 0]} c={CYAN} />
      <mesh geometry={G.crossA} material={RED} position={[0, 0.62, 0.27]} />
      <mesh geometry={G.crossB} material={RED} position={[0, 0.62, 0.27]} />
      <Halo p={[0, 0.62, 0.3]} size={0.7} color="#ff4d7a" i={0.4 + 0.6 * glow} pow={2.6} />
    </group>
  );
  return (
    <group position={[0, -0.35, 0]}>
      <Part g={G.steps} p={[0, 0.04, 0]} c={AMBER} />
      <Part g={G.wall} p={[0, 0.33, -0.12]} c={AMBER} />
      {[-0.39, -0.13, 0.13, 0.39].map((x, i) => <Part key={i} g={G.col} p={[x, 0.33, 0.2]} c={AMBER} />)}
      <Part g={G.roof} p={[0, 0.58, -0.02]} c={AMBER} />
    </group>
  );
};

// v5: one window, "AI now touches everything" (each icon on its word) until the cut to question 2
export const threadK = (t: number, i: number) => progS(t, OBJ_T0(i), 0.4) * (t < B.q2.s ? 1 : 0);
export const objK = (t: number, i: number) => popS(t, OBJ_ARRIVE(i) - 0.12, 13) * (t < B.q2.s ? 1 : 0);
const threadPt = (A: V3, P: V3, u: number): V3 => {
  const mid = mix3(A, P, 0.5); const ctl = add(mid, add(mul(norm(mid), 1.6), [0, 0.8, 0]));
  const a = mix3(A, ctl, u), b = mix3(ctl, P, u);
  return mix3(a, b, u);
};
export const Objects: React.FC<{ st: BState }> = ({ st }) => {
  const { t } = useRig();
  const deep = 0.35;
  return (
    <>
      {OBJ_ORDER.map((id, i) => {
        const k = objK(t, i);
        if (k <= 0.002) return null;
        const glow = Math.min(1, deep + 0.65 * gauss(t, OBJ_ARRIVE(i) + 0.1, 0.3)) * 0.85;
        return (
          <group key={id} position={OBJ_POS[id]} rotation={[0.22, 0.2 + (i - 2) * 0.12, 0]} scale={OBJ_SCALE * Math.max(0.001, k)}>
            <ObjModel id={id} glow={glow} />
            <pointLight position={[0.6, 0.8, 1.2]} color={i % 2 ? MAGENTA : CYAN} intensity={2.5 + 4 * glow} distance={0} decay={2} />
            {glow > 0.01 && <Halo p={[0, 0, 0]} size={2.2} color={IRI[i % 3]} i={0.35 * glow} pow={2.2} />}
          </group>
        );
      })}
      <GlowPoints n={OBJ_ORDER.length * 110} maxSize={50} fill={(g) => {
        OBJ_ORDER.forEach((id, i) => {
          const k = threadK(t, i);
          if (k <= 0.002) return;
          const P = OBJ_POS[id], A = mul(norm(P), st.R * 0.97);
          for (let j = 0; j < 90; j++) {
            const u = j / 89;
            if (u > k) break;
            const c = u < 0.5 ? CYAN : u < 0.8 ? MAGENTA : AMBER;
            g.set(i * 110 + j, threadPt(A, P, u), c, 0.075, 0.55);
          }
          for (let j = 0; j < 20; j++) {
            const u = (t * 0.3 + j / 20 + i * 0.13) % 1;
            if (u > k) continue;
            g.set(i * 110 + 90 + j, threadPt(A, P, u), j % 4 === 0 ? "#ffffff" : AMBER, 0.2 + 0.12 * deep, 0.9);
          }
        });
      }} />
    </>
  );
};

// ---- market nodes (a lot more markets) ----------------------------------------------------------
// v3: market nodes only where graphics live (top band + right column), around the small bubble
export const MARKETS: { p: V3; c: string; label?: string }[] = (() => {
  const out: { p: V3; c: string; label?: string }[] = [];
  let n = 0;
  while (out.length < 40 && n < 4000) {
    n++;
    const x = 70 + random(`mx${n}`) * 880, y = 240 + random(`my${n}`) * 940;
    const inTop = y < 630, inRight = x > 580 && y < 1170;
    if (!inTop && !inRight) continue;
    if (Math.hypot(x - CORE_XY[0], y - CORE_XY[1]) < 200) continue;
    out.push({ p: unproject(P_EM, x, y, 70 + random(`md${n}`) * 16), c: IRI[n % 3] });
  }
  return out;
})();
export const marketK = (t: number, i: number) => progS(t, T.stayW - 0.1 + i * 0.022, 0.5);
export const Markets: React.FC<{ st: BState }> = ({ st }) => {
  const { t } = useRig();
  if (t < T.stayW - 0.2) return null;
  return (
    <GlowPoints n={MARKETS.length * 52} maxSize={60} fill={(g) => {
      MARKETS.forEach((m, i) => {
        const k = marketK(t, i);
        if (k <= 0.002) return;
        const A = mul(norm(m.p), st.R * 0.97);
        for (let j = 0; j < 40; j++) {
          const u = j / 39;
          if (u > k) break;
          g.set(i * 52 + j, threadPt(A, m.p, u), m.c, 0.06, 0.4);
        }
        for (let j = 0; j < 8; j++) {
          const u = (t * 0.3 + j / 8 + i * 0.07) % 1;
          if (u > k) continue;
          g.set(i * 52 + 40 + j, threadPt(A, m.p, u), "#ffffff", 0.15, 0.7);
        }
        const land = k >= 1 ? 1 : 0;
        g.set(i * 52 + 48, m.p, m.c, (m.label ? 0.9 : 0.55) * popS(t, T.stayW + 0.4 + i * 0.022, 12), land);
        g.set(i * 52 + 49, m.p, "#ffffff", m.label ? 0.32 : 0.22, land);
      });
    }} />
  );
};

// ---- the desk inside the bubble --------------------------------------------------------------
const D = {
  bezel: new RoundedBoxGeometry(1.08, 0.68, 0.04, 3, 0.02), screen: new THREE.PlaneGeometry(1.0, 0.6),
  stand: new THREE.BoxGeometry(0.06, 0.3, 0.04), base: new RoundedBoxGeometry(0.34, 0.02, 0.2, 2, 0.008),
  top: new RoundedBoxGeometry(2.1, 0.045, 0.95, 3, 0.02), kb: new RoundedBoxGeometry(0.62, 0.02, 0.19, 2, 0.008), mug: new THREE.CylinderGeometry(0.05, 0.044, 0.11, 24),
  orb: new THREE.IcosahedronGeometry(0.022, 2), node: new THREE.IcosahedronGeometry(0.03, 2),
};
// editor line i -> desk-local y on the screen
const lineY = (i: number) => 0.3 - ((118 + i * 52 - 14) / 720) * 0.6;
export const agentLocal = (t: number, n: number): V3 => {
  const steps = t >= STEPS[0].t - 0.1;
  const busy = steps ? t >= AGENT_T() - 0.1 : t >= T.evolved - 0.1;
  const rest: V3 = [0.62, 0.42, 0.16];
  const at: V3 = [0.36, lineY(Math.max(0, n - 1)) + 0.01, 0.1];
  if (!steps) {
    const k = smooth((t - (T.evolved - 0.4)) / 0.5);
    return mix3([1.1, 0.8, 0.7], at, k);
  }
  const k = busy ? smooth((t - (AGENT_T() - 0.3)) / 0.4) : 0;
  const review = t >= T.babysit ? smooth((t - T.babysit) / 0.4) : 0;
  const rv: V3 = [0.5, lineY(Math.floor((t - T.babysit) * 2.6) % Math.max(1, n)) + 0.02, 0.14];
  return mix3(mix3(rest, at, k), rv, review);
};
export const moonLocal: V3 = [-0.85, 0.15, -0.6];

export const Desk: React.FC<{ k: number }> = ({ k }) => {
  const { t } = useRig();
  const ed = useMemo(() => { const c = editorCanvas(); const tx = makeTex(c); return { c, tx, m: new THREE.MeshBasicMaterial({ map: tx, toneMapped: false }) }; }, []);
  const n = useMemo(() => { const g = ed.c.getContext("2d")!; const n = drawEditor(g, t); ed.tx.needsUpdate = true; return n; }, [t, ed]);
  void n;
  const mats = useMemo(() => ({
    dark: new THREE.MeshStandardMaterial({ color: "#0d1430", metalness: 0.6, roughness: 0.28, emissive: "#060c26", emissiveIntensity: 0.6 }),
    top: new THREE.MeshPhysicalMaterial({ color: "#0a0f26", metalness: 0.5, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, emissive: "#040818", emissiveIntensity: 0.5, envMapIntensity: 0.7 }),
    mug: new THREE.MeshStandardMaterial({ color: "#2a1a10", metalness: 0.2, roughness: 0.4, emissive: "#3a1d05", emissiveIntensity: 0.6 }),
    orb: new THREE.MeshBasicMaterial({ color: new THREE.Color("#c8f6ff").multiplyScalar(2), toneMapped: false }),
    moon: new THREE.SpriteMaterial({ map: moonTex(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
  }), []);
  const ag = agentLocal(t, editorLines(t));
  const agentOn = progS(t, T.evolved - 0.4, 0.4);
  const moon = win(t, T.night - 0.15, B.orch.s + 0.2, 0.4, 0.3);
  mats.moon.opacity = moon;
  const stepsOn = progS(t, B.orch.s + 0.3, 0.5) * (1 - progS(t, B.plain.s - 0.1, 0.2));
  const sc = 0.92 + 0.08 * k;
  return (
    <group position={DESK0} scale={sc}>
      <mesh geometry={D.bezel} material={mats.dark} position={[0, 0, -0.024]} />
      <mesh geometry={D.screen} material={ed.m} />
      <Halo p={[0, 0, -0.2]} size={2.0} color="#2a6bff" i={0.14 * k} pow={2.4} renderOrder={1} />
      <mesh geometry={D.stand} material={mats.dark} position={[0, -0.45, -0.07]} />
      <mesh geometry={D.base} material={mats.dark} position={[0, -0.6, -0.06]} />
      <mesh geometry={D.top} material={mats.top} position={[0, -0.633, 0.15]} />
      <lineSegments geometry={edges(D.top)} material={edgeMat(CYAN)} position={[0, -0.633, 0.15]} />
      <mesh geometry={D.kb} material={mats.dark} position={[0, -0.6, 0.36]} />
      <mesh geometry={D.mug} material={mats.mug} position={[0.66, -0.555, 0.28]} />
      <lineSegments geometry={edges(D.mug)} material={edgeMat(AMBER)} position={[0.66, -0.555, 0.28]} />
      <pointLight position={[0, 0.1, 0.9]} color="#9fc8ff" intensity={2.2 * k} distance={0} decay={2} />
      <pointLight position={[-1.2, 0.6, 0.4]} color={MAGENTA} intensity={1.6 * k} distance={0} decay={2} />
      <GlowPoints n={56 + 40} maxSize={20} fill={(g) => {
        for (let i = 0; i < 56; i++) {
          const x = -0.27 + (i % 14) * 0.0415, z = 0.3 + Math.floor(i / 14) * 0.04;
          const hit = Math.sin(t * 13 + i * 2.7) > 0.85 && t < T.evolved ? 1 : 0.3;
          g.set(i, [x, -0.586, z], CYAN, 0.012, k * hit);
        }
        for (let i = 0; i < 40; i++) {
          const p: V3 = [moonLocal[0] + (random(`sx${i}`) - 0.5) * 2.2, moonLocal[1] + (random(`sy${i}`) - 0.3) * 0.9, moonLocal[2] - 0.3];
          g.set(56 + i, p, "#fff4d6", 0.02, moon * (0.4 + 0.6 * random(`sb${i}`)));
        }
      }} />
      {moon > 0.01 && <sprite material={mats.moon} position={moonLocal} scale={[0.55, 0.55, 1]} renderOrder={26} />}
      {/* the AI agent */}
      {agentOn > 0.01 && (
        <group position={ag} scale={agentOn}>
          <mesh geometry={D.orb} material={mats.orb} />
          <Halo p={[0, 0, 0]} size={0.2} color={CYAN} i={0.7} pow={2.8} />
          <pointLight color={CYAN} intensity={0.6} distance={0} decay={2} />
          <GlowPoints n={18} maxSize={14} fill={(g) => {
            for (let i = 0; i < 18; i++) {
              const a = t * (0.5 + (i % 3) * 0.15) * (i % 2 ? 1 : -1) + i * 2.1, r = 0.06 + (i % 3) * 0.012;
              g.set(i, [Math.cos(a) * r, Math.sin(a) * r * 0.6, Math.sin(a) * r * 0.8], i % 2 ? MAGENTA : CYAN, 0.012, 0.9);
            }
          }} />
        </group>
      )}
      {/* Guide -> Design -> Delegate -> Review */}
      {stepsOn > 0.01 && (
        <>
          {STEPS.map((s, i) => {
            const lit = progS(t, s.t - 0.05, 0.3);
            const pulse = gauss(t, s.t + 0.1, 0.25);
            return (
              <group key={s.id} position={s.p} scale={stepsOn * (1 + 0.25 * pulse)}>
                <mesh geometry={D.node} material={mats.orb} scale={0.6 + 0.6 * lit} />
                <Halo p={[0, 0, 0]} size={0.18 + 0.3 * lit} color={i === 3 && t > T.output ? "#4dff9d" : IRI[i % 3]} i={0.3 + 0.7 * lit} pow={2.4} />
              </group>
            );
          })}
          <GlowPoints n={3 * 30} maxSize={16} fill={(g) => {
            for (let i = 0; i < 3; i++) {
              const a = STEPS[i].p, b = STEPS[i + 1].p, k2 = progS(t, STEPS[i + 1].t - 0.2, 0.35);
              for (let j = 0; j < 30; j++) {
                const u = j / 29;
                if (u > k2) break;
                const flow = 0.5 + 0.5 * Math.sin(u * 20 - t * 3);
                g.set(i * 30 + j, mix3(a, b, u), IRI[(i + 1) % 3], 0.016, stepsOn * (0.4 + 0.6 * flow));
              }
            }
          }} />
        </>
      )}
    </group>
  );
};
export const deskPoint = (p: V3): V3 => add(DESK0, mul(p, 1));
export const _unused = { len, sub, easeIn };
