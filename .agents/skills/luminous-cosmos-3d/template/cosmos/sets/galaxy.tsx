// The internet as a galaxy: spiral arms of glowing points and data tiles (pages, photos, code,
// video, maps), a hub of glass tiles where the footage tile lands, then a glowing plane slices a
// thin layer that lights cyan, lifts, contracts and streams away.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { random } from "remotion";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { lerp, progS, smooth } from "../../lib";
import { add, type V3 } from "../cam";
import { galaxyMaterial, tileMaterial } from "../mats";
import { CYAN, GlowPoints, Halo, MAGENTA, MINT, VIOLET, pxScale, useRig } from "../parts";
import { L } from "../rig";
import { tileAtlas } from "../tex";
import { HAND, T } from "../timing";

const gauss = (k: string) => { const u = Math.max(1e-6, random(k + "a")), v = random(k + "b"); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

export type GalaxyOpts = { n: number; R: number; arms: number; wind: number; seed: string; palette: string[]; core: string; thick: number };
export const galaxyGeometry = (o: GalaxyOpts) => {
  const { n, R, arms, wind, seed, palette } = o;
  const pos = new Float32Array(n * 3), colr = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n), rnd = new Float32Array(n);
  const c = new THREE.Color(), cc = new THREE.Color(o.core);
  for (let i = 0; i < n; i++) {
    const k = `${seed}${i}`;
    const bulge = i < n * 0.14;
    let x: number, y: number, z: number, r: number;
    if (bulge) {
      r = Math.abs(gauss(k + "r")) * R * 0.09;
      const a = random(k + "a") * Math.PI * 2;
      x = r * Math.cos(a); z = r * Math.sin(a); y = gauss(k + "y") * R * 0.045;
    } else {
      r = R * (0.08 + 0.92 * Math.pow(random(k + "r"), 0.85));
      const arm = i % arms;
      const spread = (0.09 + 0.17 * random(k + "s")) * gauss(k + "g") * (1.1 - 0.4 * (r / R));
      const a = (arm / arms) * Math.PI * 2 + (r / R) * wind + spread;
      x = r * Math.cos(a); z = r * Math.sin(a);
      y = gauss(k + "y") * o.thick * (0.35 + 0.9 * Math.exp(-r / (R * 0.25)));
    }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    const pick = random(k + "c");
    c.set(palette[Math.floor(pick * palette.length)]);
    const coreMix = Math.exp(-r / (R * 0.12));
    c.lerp(cc, coreMix);
    colr[i * 3] = c.r; colr[i * 3 + 1] = c.g; colr[i * 3 + 2] = c.b;
    const big = random(k + "z");
    size[i] = R * (0.0035 + 0.006 * Math.pow(big, 4)) * (bulge ? 1.3 : 1);
    alpha[i] = (0.35 + 0.65 * random(k + "l")) * (bulge ? 0.7 : 1);
    rnd[i] = random(k + "q");
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aColor", new THREE.BufferAttribute(colr, 3));
  g.setAttribute("size", new THREE.BufferAttribute(size, 1));
  g.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1));
  g.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 1));
  return g;
};

export type GalaxyState = { rot: number; sliceY?: number; sliceHalf?: number; glow?: number; dim?: number; lift?: number; contract?: number; stream?: number; streamTo?: V3; wave?: number; opacity?: number; tilesGone?: number };

// Points galaxy (used by the internet beat and, smaller, as the far spiral in the cosmos)
export const GalaxyPoints: React.FC<{ opts: GalaxyOpts; st: GalaxyState; maxSize?: number }> = ({ opts, st, maxSize = 70 }) => {
  const rig = useRig();
  const obj = useMemo(() => { const p = new THREE.Points(galaxyGeometry(opts), galaxyMaterial()); p.frustumCulled = false; return p; }, [opts]);
  useLayoutEffect(() => {
    const u = (obj.material as THREE.ShaderMaterial).uniforms;
    u.uScale.value = pxScale(rig.pose.fov); u.uFog.value = rig.fog; u.uTime.value = rig.t; u.uMax.value = maxSize;
    u.uRot.value = st.rot; u.uSliceY.value = st.sliceY ?? 0; u.uSliceHalf.value = st.sliceHalf ?? 0.5; u.uGlow.value = st.glow ?? 0; u.uDim.value = st.dim ?? 0;
    u.uLift.value = st.lift ?? 0; u.uContract.value = st.contract ?? 1; u.uStream.value = st.stream ?? 0; u.uOpacity.value = st.opacity ?? 1; u.uWave.value = st.wave ?? -10;
    if (st.streamTo) u.uStreamTo.value.set(...st.streamTo);
  });
  return <primitive object={obj} renderOrder={2} />;
};

const NT = 1150, HUBN = 46;
const OPTS: GalaxyOpts = { n: 24000, R: 44, arms: 4, wind: 5.2, seed: "gx", palette: [CYAN, CYAN, VIOLET, VIOLET, "#b9a8ff", MAGENTA, MINT, "#ffffff"], core: "#f3e9ff", thick: 2.4 };

// galaxy state over time (shared with the overlays)
export const galaxyState = (t: number): GalaxyState => {
  const sweep = progS(t, T.used, T.thatData + 0.5 - T.used);
  const lit = progS(t, T.compressed, 0.5);
  const lift = progS(t, T.compressed + 0.2, 1.1);
  return {
    rot: Math.max(0, t - 6.75) * 0.035 * smooth((t - 6.75) / 1.5),
    sliceY: lerp(16, 0.7, sweep), sliceHalf: 0.6, glow: lit, dim: lit * 0.85, lift: lift * 6.5, contract: lerp(1, 0.42, lift),
    stream: progS(t, T.intoLLM, 1.3), streamTo: [0, 7, 0],
    wave: t < T.raw ? lerp(-6, 50, progS(t, T.online - 0.1, 1.6, (x) => x)) : lerp(-6, 52, progS(t, T.raw + 0.6, 1.6, (x) => x)),
  };
};

export const GalaxySet: React.FC<{ fade: number }> = ({ fade }) => {
  const rig = useRig();
  const t = rig.t;
  const st = galaxyState(t);
  const atlas = useMemo(() => tileAtlas(), []);
  const tiles = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 0.6875);
    const mat = tileMaterial(atlas);
    const mesh = new THREE.InstancedMesh(geo, mat, NT);
    const glass = new THREE.InstancedMesh(new RoundedBoxGeometry(1.08, 0.76, 0.05, 2, 0.06), new THREE.MeshPhysicalMaterial({ color: "#1a1458", emissive: "#0a0730", metalness: 0.1, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.75, envMapIntensity: 2 }), HUBN);
    const atl = new Float32Array(NT * 2), rnd = new Float32Array(NT), tint = new Float32Array(NT * 3);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const hub = L.galaxyHub;
    for (let i = 0; i < NT; i++) {
      const k = `t${i}`;
      let w: number;
      if (i < HUBN) {
        // the hub: a dense knot of tiles around the landing point
        const a = random(k + "a") * Math.PI * 2, r = i === 0 ? 0 : 0.5 + Math.sqrt(random(k + "r")) * 3.2;
        p.set(hub[0] + r * Math.cos(a), hub[1] + (random(k + "y") - 0.5) * 1.0 - (i === 0 ? 0 : 0.2), hub[2] + r * Math.sin(a));
        w = i === 0 ? 0.42 : 0.3 + random(k + "w") * 0.32;
      } else {
        const r = OPTS.R * (0.12 + 0.86 * Math.pow(random(k + "r"), 0.9));
        const a = ((i % OPTS.arms) / OPTS.arms) * Math.PI * 2 + (r / OPTS.R) * OPTS.wind + 0.3 * gauss(k + "g");
        p.set(r * Math.cos(a), gauss(k + "y") * OPTS.thick * (0.4 + 0.9 * Math.exp(-r / 11)), r * Math.sin(a));
        w = 0.55 + Math.pow(random(k + "w"), 2) * 1.0;
      }
      e.set(-Math.PI / 2 + (random(k + "tx") - 0.5) * 0.9, (random(k + "ty") - 0.5) * 0.6, random(k + "tz") * Math.PI * 2);
      if (i === 0) e.set(-Math.PI / 2 + 0.7, 0, 0.35);
      q.setFromEuler(e); s.set(w, w, w);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      if (i < HUBN) { const m2 = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.035)); glass.setMatrixAt(i, m2); }
      const kind = Math.floor(random(k + "k") * 8);
      atl[i * 2] = kind % 4; atl[i * 2 + 1] = kind < 4 ? 1 : 0;
      rnd[i] = random(k + "q");
      const tc = new THREE.Color(random(k + "c") < 0.5 ? "#ffffff" : random(k + "c2") < 0.5 ? "#bdf3ff" : "#d8d0ff");
      tint[i * 3] = tc.r; tint[i * 3 + 1] = tc.g; tint[i * 3 + 2] = tc.b;
    }
    geo.setAttribute("aAtlas", new THREE.InstancedBufferAttribute(atl, 2));
    geo.setAttribute("aRnd", new THREE.InstancedBufferAttribute(rnd, 1));
    geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(tint, 3));
    mesh.frustumCulled = false; glass.frustumCulled = false;
    return { mesh, mat, glass };
  }, [atlas]);
  const slice = useMemo(() => ({
    disk: new THREE.CylinderGeometry(47, 47, 0.06, 128, 1),
    rim: new THREE.TorusGeometry(47, 0.16, 8, 160),
    diskM: new THREE.MeshPhysicalMaterial({ color: "#5ee7ff", emissive: "#0d4a66", transparent: true, opacity: 0.1, roughness: 0.1, metalness: 0, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
    rimM: new THREE.MeshBasicMaterial({ color: new THREE.Color(CYAN).multiplyScalar(2), toneMapped: false, transparent: true }),
  }), []);
  useLayoutEffect(() => {
    const u = tiles.mat.uniforms;
    u.uFog.value = rig.fog; u.uOpacity.value = fade; u.uRot.value = st.rot; u.uTime.value = t;
    u.uSliceY.value = st.sliceY!; u.uSliceHalf.value = st.sliceHalf!; u.uGlow.value = st.glow!; u.uDim.value = st.dim!;
    u.uLift.value = st.lift!; u.uContract.value = st.contract!; u.uGone.value = st.stream!; u.uWave.value = st.wave!;
    tiles.glass.rotation.y = 0;
    const gm = tiles.glass.material as THREE.MeshPhysicalMaterial;
    gm.opacity = 0.75 * fade * (1 - st.dim! * 0.8);
  });
  // the hub rotates with the galaxy once the hand-off is over; glass slabs follow
  const hubAng = st.rot * (0.6 + 6 / (Math.hypot(L.galaxyHub[0], L.galaxyHub[2]) + 6));
  const arrive = HAND.internet.t1 - 0.05;
  const flash = Math.exp(-Math.pow((t - arrive) / 0.18, 2)) + 0.35 * Math.exp(-Math.max(0, t - arrive) * 1.5) * (t > arrive ? 1 : 0);
  const sweepOn = st.sliceY! < 15.9 && st.stream! < 0.98;
  const sliceA = (0.6 + 0.4 * (st.glow ?? 0)) * (1 - (st.stream ?? 0)) * fade;
  slice.diskM.opacity = 0.08 * sliceA + 0.04 * (st.glow ?? 0) * sliceA;
  slice.rimM.opacity = sliceA;
  return (
    <group>
      <hemisphereLight args={["#5a3dd0", "#07051c", 0.5]} />
      <pointLight position={add(L.galaxyHub, [0, 1.4, 0])} color={CYAN} intensity={12 + 40 * flash} distance={0} decay={2} />
      <pointLight position={[0, 3, 0]} color={VIOLET} intensity={900} distance={0} decay={2} />
      <GalaxyPoints opts={OPTS} st={{ ...st, opacity: fade }} />
      <primitive object={tiles.mesh} renderOrder={3} />
      <group rotation={[0, hubAng, 0]}>
        <primitive object={tiles.glass} renderOrder={1} />
        <Halo p={add(L.galaxyHub, [0, 0.25, 0])} size={2.2 + 5 * flash} color={CYAN} i={(0.25 + 1.1 * flash) * fade} />
        <GlowPoints n={60} maxSize={30} fill={(g) => {
          const k = Math.max(0, t - arrive);
          for (let i = 0; i < 60; i++) {
            const a = (i / 60) * Math.PI * 2, r = 0.2 + k * (1.8 + (i % 3) * 0.7);
            g.set(i, add(L.galaxyHub, [r * Math.cos(a), 0.2 + 0.1 * Math.sin(i), r * Math.sin(a)]), i % 4 ? CYAN : "#ffffff", 0.07, t > arrive ? Math.exp(-k * 2.2) * fade : 0);
          }
        }} />
      </group>
      {/* soft gas clouds along the arms */}
      <GlowPoints n={46} gas maxSize={1024} opacity={0.55 * fade * (1 - 0.6 * (st.dim ?? 0))} fill={(g) => {
        for (let i = 0; i < 46; i++) {
          const r = 6 + random(`gc${i}`) * 34, a = ((i % 4) / 4) * Math.PI * 2 + (r / 44) * 5.2 + 0.2 * gauss(`gc${i}`) + st.rot * (0.6 + 6 / (r + 6));
          g.set(i, [r * Math.cos(a), 0, r * Math.sin(a)], [VIOLET, MAGENTA, CYAN, "#5a3dd0"][i % 4], 9 + random(`gs${i}`) * 10, 0.2);
        }
      }} />
      {sweepOn && (
        <group position={[0, st.sliceY! + (st.lift ?? 0), 0]} scale={[lerp(1, 0.45, (st.lift ?? 0) / 6.5), 1, lerp(1, 0.45, (st.lift ?? 0) / 6.5)]}>
          <mesh geometry={slice.disk} material={slice.diskM} renderOrder={4} />
          <mesh geometry={slice.rim} material={slice.rimM} rotation={[Math.PI / 2, 0, 0]} renderOrder={4} />
        </group>
      )}
      {(st.stream ?? 0) > 0.01 && <Halo p={[0, 7, 0]} size={6 + 10 * (st.stream ?? 0)} color={CYAN} i={0.9 * (st.stream ?? 0) * fade} />}
    </group>
  );
};
