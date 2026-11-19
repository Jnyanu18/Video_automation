// Building blocks of the Cosmos 3D world: rig context, camera, sky/stars/motes, glow points,
// halos, the seed crystal and glass cards.
import React, { createContext, useContext, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { random } from "remotion";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { applyPose, type Pose, type V3 } from "./cam";
import { glowMaterial, haloMaterial, motesMaterial, nebulaMaterial, textMaterial } from "./mats";

export const CYAN = "#5ee7ff", VIOLET = "#8a7dff", AMBER = "#ffbf3c", MAGENTA = "#ff5fd2", MINT = "#7dffb0";
export const col = (c: string) => new THREE.Color(c);

export type Rig = { pose: Pose; t: number; fog: number };
export const RigCtx = createContext<Rig>({ pose: { p: [0, 0, 10], t: [0, 0, 0], fov: 40 }, t: 0, fog: 0 });
export const useRig = () => useContext(RigCtx);
export const pxScale = (fov: number) => 960 / Math.tan((fov * Math.PI) / 360);

export const CamRig: React.FC<{ pose: Pose }> = ({ pose }) => {
  const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => { applyPose(cam, pose); });
  return null;
};

// ---- glow points --------------------------------------------------------------------------
export type Glow = ReturnType<typeof makeGlow>;
export const makeGlow = (n: number, opts: Parameters<typeof glowMaterial>[0] = {}) => {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), color = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1));
  const mat = glowMaterial(opts);
  const obj = new THREE.Points(geo, mat);
  obj.frustumCulled = false;
  const c = new THREE.Color();
  return {
    obj, mat, n, pos, color, size, alpha, geo,
    set(i: number, p: V3 | THREE.Vector3, hex: string | THREE.Color, s: number, a: number) {
      if (Array.isArray(p)) { pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; }
      else { pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; }
      if (typeof hex === "string") c.set(hex); else c.copy(hex);
      color[i * 3] = c.r; color[i * 3 + 1] = c.g; color[i * 3 + 2] = c.b;
      size[i] = s; alpha[i] = a;
    },
    commit(rig: Rig, opacity = 1) {
      for (const k of ["position", "aColor", "size", "alpha"]) (geo.getAttribute(k) as THREE.BufferAttribute).needsUpdate = true;
      mat.uniforms.uScale.value = pxScale(rig.pose.fov);
      mat.uniforms.uFog.value = rig.fog;
      mat.uniforms.uOpacity.value = opacity;
    },
  };
};
// helper: a set of glow points updated every frame by `fill`
export const GlowPoints: React.FC<{ n: number; fill: (g: Glow) => void; opacity?: number; maxSize?: number; soft?: boolean; gas?: boolean; renderOrder?: number }> = ({ n, fill, opacity = 1, maxSize, soft, gas, renderOrder }) => {
  const g = useMemo(() => makeGlow(n, { maxSize, soft, gas }), [n, maxSize, soft, gas]);
  const rig = useRig();
  useLayoutEffect(() => { g.alpha.fill(0); fill(g); g.commit(rig, opacity); });
  return <primitive object={g.obj} renderOrder={renderOrder ?? 0} />;
};

// ---- halo ---------------------------------------------------------------------------------
const PLANE = new THREE.PlaneGeometry(1, 1);
export const Halo: React.FC<{ p: V3; size: number; color: string; i?: number; pow?: number; renderOrder?: number }> = ({ p, size, color, i = 1, pow = 2.2, renderOrder = 5 }) => {
  const m = useMemo(() => haloMaterial(color, pow), [color, pow]);
  m.uniforms.uSize.value = size; m.uniforms.uI.value = i;
  return <mesh geometry={PLANE} material={m} position={p} renderOrder={renderOrder} frustumCulled={false} />;
};

// ---- sky, stars, motes, fog, environment ---------------------------------------------------
const makeEnvScene = () => {
  const s = new THREE.Scene();
  s.background = new THREE.Color("#0a0726");
  const panel = (c: string, k: number, w: number, h: number, p: V3) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(0, 0, 0); s.add(m);
  };
  panel("#5ee7ff", 2.2, 6, 10, [-9, 2, 4]);
  panel("#8a7dff", 1.8, 14, 6, [0, 10, 0]);
  panel("#ffbf3c", 3.0, 3, 3, [8, 1, -3]);
  panel("#ff5fd2", 1.4, 6, 4, [3, -6, 7]);
  panel("#3a1d8f", 1.0, 20, 8, [0, 0, -10]);
  return s;
};
export const EnvMap: React.FC<{ intensity?: number }> = ({ intensity = 0.9 }) => {
  const gl = useThree((s) => s.gl), scene = useThree((s) => s.scene);
  const tex = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const rt = pm.fromScene(makeEnvScene(), 0.035);
    pm.dispose();
    return rt.texture;
  }, [gl]);
  useLayoutEffect(() => { scene.environment = tex; scene.environmentIntensity = intensity; });
  return null;
};

export const Sky: React.FC<{ lift?: number }> = ({ lift = 1 }) => {
  const { pose, t } = useRig();
  const neb = useMemo(() => nebulaMaterial(), []);
  const sphere = useMemo(() => new THREE.SphereGeometry(2500, 48, 32), []);
  const stars = useMemo(() => {
    const n = 5200, g = makeGlow(n, { maxSize: 7 });
    for (let i = 0; i < n; i++) {
      const u = random(`su${i}`) * 2 - 1, a = random(`sa${i}`) * Math.PI * 2, r = 2000;
      const s = Math.sqrt(1 - u * u);
      const tint = random(`st${i}`);
      g.set(i, [r * s * Math.cos(a), r * u, r * s * Math.sin(a)], tint < 0.15 ? "#bfefff" : tint < 0.25 ? "#d9cfff" : tint < 0.28 ? "#ffd9a0" : "#ffffff", (0.5 + Math.pow(random(`ss${i}`), 3) * 2.6) * 0.8, 0.35 + random(`sb${i}`) * 0.65);
    }
    return g;
  }, []);
  useLayoutEffect(() => {
    neb.uniforms.uTime.value = t; neb.uniforms.uLift.value = lift;
    stars.mat.uniforms.uScale.value = pxScale(pose.fov); stars.mat.uniforms.uFog.value = 0;
    for (let i = 0; i < 400; i++) stars.alpha[i * 13] = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * (1.5 + (i % 7) * 0.4) + i));
    (stars.obj.geometry.getAttribute("alpha") as THREE.BufferAttribute).needsUpdate = true;
  });
  return (
    <group position={pose.p}>
      <mesh geometry={sphere} material={neb} renderOrder={-10} frustumCulled={false} />
      <primitive object={stars.obj} renderOrder={-9} />
    </group>
  );
};

export const Motes: React.FC<{ box?: number; amount?: number; colors?: string[] }> = ({ box = 26, amount = 1, colors = [CYAN, VIOLET, "#b9a8ff", AMBER] }) => {
  const { pose, t } = useRig();
  const [bokeh, dust] = useMemo(() => [true, false].map((soft) => {
    const n = soft ? 90 : 1400;
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3), c = new Float32Array(n * 3), s = new Float32Array(n), a = new Float32Array(n), r = new Float32Array(n);
    const cc = new THREE.Color();
    for (let i = 0; i < n; i++) {
      p[i * 3] = random(`m${soft}x${i}`); p[i * 3 + 1] = random(`m${soft}y${i}`); p[i * 3 + 2] = random(`m${soft}z${i}`);
      cc.set(colors[Math.floor(random(`m${soft}c${i}`) * colors.length)]);
      if (!soft) cc.lerp(new THREE.Color("#ffffff"), 0.4);
      c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b;
      s[i] = soft ? 0.14 + random(`m${soft}s${i}`) * 0.22 : 0.018 + random(`m${soft}s${i}`) * 0.03;
      a[i] = soft ? 0.12 + random(`m${soft}a${i}`) * 0.22 : 0.25 + random(`m${soft}a${i}`) * 0.5;
      r[i] = random(`m${soft}r${i}`);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(c, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(s, 1));
    geo.setAttribute("alpha", new THREE.BufferAttribute(a, 1));
    geo.setAttribute("aRnd", new THREE.BufferAttribute(r, 1));
    const obj = new THREE.Points(geo, motesMaterial(soft));
    obj.frustumCulled = false;
    return obj;
  }), [colors]);
  useLayoutEffect(() => {
    for (const o of [bokeh, dust]) {
      const m = o.material as THREE.ShaderMaterial;
      m.uniforms.uScale.value = pxScale(pose.fov); m.uniforms.uCam.value.set(...pose.p);
      m.uniforms.uBox.value = box; m.uniforms.uTime.value = t; m.uniforms.uOpacity.value = amount;
    }
  });
  return <><primitive object={dust} renderOrder={20} /><primitive object={bokeh} renderOrder={21} /></>;
};

export const Fog: React.FC = () => {
  const scene = useThree((s) => s.scene);
  const { fog } = useRig();
  const f = useMemo(() => new THREE.FogExp2("#0c0829", 0.01), []);
  useLayoutEffect(() => { f.density = fog; scene.fog = fog > 0 ? f : null; });
  return null;
};

// ---- the seed: a faceted amber crystal with an inner light and orbiting motes ---------------
const ICO = new THREE.IcosahedronGeometry(1, 0);
const ICO_EDGES = new THREE.EdgesGeometry(ICO);
const ICO_CORE = new THREE.IcosahedronGeometry(0.62, 1);
export const Seed: React.FC<{ p: V3; s: number; t: number; glow?: number; spin?: number; light?: number; motes?: number; halo?: number; hide?: boolean }> = ({ p, s, t, glow = 1, spin = 1, light = 1, motes = 1, halo = 1, hide }) => {
  const mats = useMemo(() => ({
    shell: new THREE.MeshPhysicalMaterial({ color: "#ffb43a", emissive: "#ff8a12", emissiveIntensity: 0.5, metalness: 0.1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, flatShading: true, transparent: true, opacity: 0.88, envMapIntensity: 1.6 }),
    core: new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd27a").multiplyScalar(2.2), toneMapped: false }),
    edge: new THREE.LineBasicMaterial({ color: new THREE.Color("#fff0c8").multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.85 }),
  }), []);
  mats.shell.emissiveIntensity = 0.35 + 0.5 * glow;
  mats.edge.opacity = Math.min(1, 0.5 + 0.4 * glow);
  const rot = t * 0.45 * spin;
  if (hide || s <= 0.001) return null;
  return (
    <group position={p}>
      <group scale={s} rotation={[rot * 0.7, rot, rot * 0.3]}>
        <mesh geometry={ICO_CORE} material={mats.core} />
        <mesh geometry={ICO} material={mats.shell} renderOrder={6} />
        <lineSegments geometry={ICO_EDGES} material={mats.edge} scale={1.003} renderOrder={7} />
      </group>
      {light > 0 && <pointLight color={AMBER} intensity={60 * light * glow * s * s} distance={0} decay={2} />}
      {halo > 0 && <Halo p={[0, 0, 0]} size={5.5 * s * (0.8 + 0.4 * glow)} color={AMBER} i={0.55 * halo * glow} pow={2.6} />}
      {motes > 0 && (
        <GlowPoints n={30} maxSize={40} fill={(g) => {
          for (let i = 0; i < 30; i++) {
            const ring = i % 3, a = t * (0.7 + ring * 0.25) * (ring === 1 ? -1 : 1) + (i / 30) * Math.PI * 2 * 3;
            const R = s * (1.6 + ring * 0.45);
            const tilt = 0.5 + ring * 0.6;
            const x = R * Math.cos(a), z0 = R * Math.sin(a);
            g.set(i, [x, z0 * Math.sin(tilt), z0 * Math.cos(tilt)], i % 5 === 0 ? CYAN : AMBER, s * (0.12 + (i % 4) * 0.03), 0.8 * motes);
          }
        }} />
      )}
    </group>
  );
};

// ---- glass card: bevelled glass slab, glowing edge band, text on top ------------------------
const frameGeo = (w: number, h: number, r: number, th: number) => {
  const sh = (W: number, Hh: number, R: number) => { const s = new THREE.Shape(); s.moveTo(-W / 2 + R, -Hh / 2); s.lineTo(W / 2 - R, -Hh / 2); s.quadraticCurveTo(W / 2, -Hh / 2, W / 2, -Hh / 2 + R); s.lineTo(W / 2, Hh / 2 - R); s.quadraticCurveTo(W / 2, Hh / 2, W / 2 - R, Hh / 2); s.lineTo(-W / 2 + R, Hh / 2); s.quadraticCurveTo(-W / 2, Hh / 2, -W / 2, Hh / 2 - R); s.lineTo(-W / 2, -Hh / 2 + R); s.quadraticCurveTo(-W / 2, -Hh / 2, -W / 2 + R, -Hh / 2); return s; };
  const o = sh(w, h, r);
  const inner = sh(w - th * 2, h - th * 2, Math.max(0.001, r - th));
  o.holes.push(new THREE.Path(inner.getPoints(24).reverse()));
  return new THREE.ShapeGeometry(o, 12);
};
export type CardProps = { w: number; h: number; tex?: THREE.Texture | null; p: V3; q?: THREE.Quaternion; rot?: V3; s?: number; opacity?: number; edge?: string; glitch?: number; t: number; tint?: string; depth?: number; body?: string; fog?: boolean };
export const GlassCard: React.FC<CardProps> = ({ w, h, tex, p, q, rot, s = 1, opacity = 1, edge = CYAN, glitch = 0, t, tint = "#ffffff", depth = 0.08, body = "#1d1660", fog = true }) => {
  const rig = useRig();
  const geo = useMemo(() => ({ box: new RoundedBoxGeometry(w, h, depth, 3, Math.min(w, h) * 0.09), frame: frameGeo(w, h, Math.min(w, h) * 0.09, Math.min(w, h) * 0.025), plane: new THREE.PlaneGeometry(w, h) }), [w, h, depth]);
  const m = useMemo(() => ({
    body: new THREE.MeshPhysicalMaterial({ color: body, emissive: "#0b0730", metalness: 0.05, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06, transparent: true, opacity: 0.6, envMapIntensity: 1.8, depthWrite: false }),
    frame: new THREE.MeshBasicMaterial({ color: new THREE.Color(edge).multiplyScalar(1.4), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    text: tex ? textMaterial(tex) : null,
  }), [tex, edge, body]);
  if (opacity <= 0.002 || s <= 0.001) return null;
  m.body.opacity = 0.62 * opacity;
  m.frame.opacity = opacity;
  if (m.text) {
    m.text.uniforms.uOpacity.value = opacity; m.text.uniforms.uGlitch.value = glitch; m.text.uniforms.uTime.value = t;
    m.text.uniforms.uTint.value.set(tint); m.text.uniforms.uFog.value = fog ? rig.fog : 0;
  }
  return (
    <group position={p} quaternion={q} rotation={q ? undefined : rot} scale={s}>
      <mesh geometry={geo.box} material={m.body} renderOrder={8} />
      <mesh geometry={geo.frame} material={m.frame} position={[0, 0, depth / 2 + 0.004]} renderOrder={9} />
      {m.text && <mesh geometry={geo.plane} material={m.text} position={[0, 0, depth / 2 + 0.008]} renderOrder={10} />}
    </group>
  );
};
