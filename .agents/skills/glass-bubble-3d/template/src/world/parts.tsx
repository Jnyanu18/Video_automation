// Building blocks of the Cosmos 3D world: rig context, camera, sky/stars/motes, glow points,
// halos, the seed crystal and glass cards.
import React, { createContext, useContext, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { random } from "remotion";
import { applyPose, type Pose, type V3 } from "./cam";
import { glowMaterial, haloMaterial, motesMaterial } from "./mats";

export const CYAN = "#5ee7ff", VIOLET = "#8a7dff", AMBER = "#ffc94a", MAGENTA = "#ff5fd2", MINT = "#7dffb0", GOLD = "#ffb627";
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
  s.background = new THREE.Color("#04081a");
  const panel = (c: string, k: number, w: number, h: number, p: V3) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...p); m.lookAt(0, 0, 0); s.add(m);
  };
  panel("#ffffff", 2.6, 6, 8, [-8, 7, 5]);
  panel("#5ee7ff", 1.8, 6, 10, [-9, 0, -4]);
  panel("#ff5fd2", 1.5, 8, 5, [8, -3, -4]);
  panel("#ffc94a", 2.4, 4, 4, [7, 4, 6]);
  panel("#0b1a4a", 1.0, 20, 8, [0, -9, 0]);
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

const MOTE_COLORS = [CYAN, MAGENTA, "#b9d8ff", AMBER];
export const Motes: React.FC<{ box?: number; amount?: number; colors?: string[] }> = ({ box = 26, amount = 1, colors = MOTE_COLORS }) => {
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
  const f = useMemo(() => new THREE.FogExp2("#03061a", 0.01), []);
  useLayoutEffect(() => { f.density = fog; scene.fog = fog > 0 ? f : null; });
  return null;
};

