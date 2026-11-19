import React, { useMemo } from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ThreeCanvas } from "../kit/three-canvas";
import { ACTS, cue, f, prog, pop, lerp, clamp, easeInOut } from "../lib";
import { C, MONO, SERIF, PhotoCard, Tag, Footnote } from "../kit/casefile";

/*
 * Act 4: the white clay diorama. A tower of everything (blocks) whose right side rests on one tiny
 * red block: xz. Camera opens tight on the red block (continuity with the red node we dived into),
 * it ignites on "backdoor", then cranes back to reveal how much stands on it.
 */
type B = [x: number, y: number, z: number, w: number, h: number, d: number];
const BLOCKS: B[] = [
  [0, 0, 0, 4.2, 0.3, 2.4],
  [-1.25, 0.3, 0, 1.3, 1.5, 1.6], [0.05, 0.3, 0.1, 0.8, 1.1, 1.2], [1.3, 0.64, 0, 1.25, 1.16, 1.5],
  [0, 1.8, 0, 3.8, 0.28, 2.0],
  [-1.0, 2.08, 0.2, 1.4, 1.0, 1.4], [0.7, 2.08, -0.1, 1.8, 0.7, 1.6], [0.7, 2.78, 0, 1.2, 0.3, 1.2],
  [-0.1, 3.08, 0, 3.0, 0.25, 1.8],
  [-0.8, 3.33, 0, 1.0, 1.3, 1.2], [0.5, 3.33, 0.1, 1.2, 0.9, 1.0], [0.5, 4.23, 0.1, 0.9, 0.4, 0.9],
  [-0.15, 4.63, 0, 2.4, 0.22, 1.5],
  [-0.5, 4.85, 0, 0.9, 0.9, 1.0], [0.45, 4.85, 0, 0.8, 0.6, 0.9], [0.45, 5.45, 0, 0.6, 0.3, 0.6],
  [0, 5.75, 0, 1.6, 0.2, 1.0], [-0.2, 5.95, 0, 0.7, 0.7, 0.7], [0.4, 5.95, 0, 0.35, 0.5, 0.35],
  // ground clutter: crates and slabs around the base
  [-3.2, 0, 1.2, 0.7, 0.4, 0.6], [3.1, 0, -0.8, 0.9, 0.3, 0.7], [2.7, 0, 1.6, 0.4, 0.5, 0.4], [-2.6, 0, -1.5, 1.0, 0.25, 0.8],
];
const RED: B = [1.42, 0.3, 0.2, 0.22, 0.34, 0.22];
const RED_C = new THREE.Vector3(RED[0], RED[1] + RED[4] / 2, RED[2]);

const F = (s: number) => f(s);
const camAt = (fr: number) => {
  const a = F(ACTS.backdoor[0]), end = F(ACTS.backdoor[1]);
  const k = [a, F(cue("backdoor")) + 8, F(cue("maintainer")) - 6, F(cue("Jia")) + 10, end + 10];
  const P = [[2.05, 0.5, 1.3], [2.45, 0.72, 1.75], [2.7, 0.9, 2.1], [10.2, 8.6, 21.0], [8.6, 9.4, 22.4]];
  const T = [[1.42, 0.47, 0.2], [1.42, 0.5, 0.2], [1.35, 0.6, 0.2], [0.2, 3.9, 0], [0.1, 4.1, 0]];
  const o = { ...clamp, easing: easeInOut };
  const ax = (arr: number[][], i: number) => interpolate(fr, k, arr.map((p) => p[i]), o);
  return { pos: new THREE.Vector3(ax(P, 0), ax(P, 1), ax(P, 2)), tgt: new THREE.Vector3(ax(T, 0), ax(T, 1), ax(T, 2)) };
};
const FOV = 38;
const project = (fr: number, p: THREE.Vector3): [number, number] => {
  const { pos, tgt } = camAt(fr);
  const cam = new THREE.PerspectiveCamera(FOV, 1080 / 1920, 0.05, 200);
  cam.position.copy(pos);
  cam.lookAt(tgt);
  cam.updateMatrixWorld();
  const v = p.clone().project(cam);
  return [(v.x + 1) * 540, (1 - v.y) * 960];
};

const CamRig: React.FC<{ fr: number }> = ({ fr }) => {
  const { camera } = useThree();
  const { pos, tgt } = camAt(fr);
  camera.position.copy(pos);
  (camera as THREE.PerspectiveCamera).fov = FOV;
  camera.lookAt(tgt);
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  return null;
};

const Block: React.FC<{ b: B; color?: string; emissive?: string; ei?: number }> = ({ b, color = "#efede8", emissive = "#000", ei = 0 }) => (
  <mesh position={[b[0], b[1] + b[4] / 2, b[2]]} castShadow receiveShadow>
    <boxGeometry args={[b[3], b[4], b[5]]} />
    <meshStandardMaterial color={color} roughness={0.92} metalness={0} emissive={emissive} emissiveIntensity={ei} />
  </mesh>
);

const Diorama: React.FC<{ fr: number }> = ({ fr }) => {
  const ign = prog(fr, F(cue("backdoor")) - 2, 10);
  const flick = 0.85 + 0.15 * Math.sin(fr * 0.9) * Math.sin(fr * 0.37);
  return (
    <>
      <CamRig fr={fr} />
      <color attach="background" args={["#9d9c99"]} />
      <fog attach="fog" args={["#8e8d8a", 20, 48]} />
      <hemisphereLight args={["#ffffff", "#6d6b66", 0.9]} />
      <directionalLight position={[-6, 12, 8]} intensity={2.1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={10} shadow-camera-bottom={-4} shadow-bias={-0.0004} />
      <pointLight position={[RED_C.x + 0.25, RED_C.y + 0.1, RED_C.z + 0.35]} color="#ff2a20" intensity={lerp(0.4, 4, ign) * flick} distance={3.2} decay={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#c9c8c4" roughness={1} />
      </mesh>
      {BLOCKS.map((b, i) => <Block key={i} b={b} />)}
      <Block b={RED} color="#b8120c" emissive="#ff1408" ei={lerp(0.1, 0.55, ign) * flick} />
    </>
  );
};

export const BackdoorScene: React.FC<{ fr: number }> = ({ fr }) => {
  const a = F(ACTS.backdoor[0]), end = F(ACTS.backdoor[1]);
  const [rx, ry] = project(fr, RED_C);
  const tag = pop(fr, F(cue("backdoor")) - 2, 12);
  const tagOut = prog(fr, F(cue("maintainer")) - 6, 10);
  const card = F(cue("Jia")) - 4;
  const lead = prog(fr, card + 8, 14);
  const yrs = F(cue("two")) - 3, trust = F(cue("earning"));
  const tl = prog(fr, yrs + 4, 16);
  const cardBottom: [number, number] = [90 + 150, 300 + 375 + 70];
  const blurIn = (1 - prog(fr, a, 12)) * 8, blurOut = prog(fr, end - 8, 10) * 5;
  return (
    <AbsoluteFill style={{ background: "#9d9c99" }}>
      <AbsoluteFill style={{ filter: blurIn + blurOut > 0.05 ? `blur(${blurIn + blurOut}px)` : undefined }}>
        <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: true }} camera={{ fov: FOV, near: 0.05, far: 200 }}>
          <Diorama fr={fr} />
        </ThreeCanvas>
      </AbsoluteFill>
      {/* darken edges so white cards and captions read */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 55% at 50% 62%, rgba(0,0,0,0) 40%, rgba(8,8,9,0.78) 100%)" }} />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(10,10,11,${0.82 * prog(fr, card - 8, 16)}) 0%, rgba(10,10,11,0) 42%)` }} />
      {/* the evidence tag on the red block (close-up only) */}
      <div style={{ position: "absolute", left: rx, top: ry - 150, transform: `translate(-50%,-100%) scale(${lerp(0.8, 1, tag)})`, opacity: Math.min(1, tag * 1.4) * (1 - tagOut), display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ border: `5px solid ${C.red}`, boxShadow: C.redGlow, padding: "4px 22px", fontFamily: MONO, fontWeight: 700, fontSize: 60, color: C.red, textShadow: C.redGlow, background: "rgba(30,0,0,0.65)", transform: "rotate(-5deg)", letterSpacing: 4 }}>BACKDOOR</div>
        <Tag text="xz utils 5.6.0" size={34} />
      </div>
      {/* leader from the suspect card to the red block */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={cardBottom[0]} y1={cardBottom[1]} x2={lerp(cardBottom[0], rx, lead)} y2={lerp(cardBottom[1], ry, lead)} stroke={C.red} strokeWidth={4} strokeDasharray="14 10" opacity={lead > 0 ? 0.95 : 0} style={{ filter: "drop-shadow(0 0 6px rgba(255,45,42,.9))" }} />
        {lead > 0.98 && <circle cx={rx} cy={ry} r={22 + 6 * Math.sin(fr * 0.3)} fill="none" stroke={C.red} strokeWidth={4} style={{ filter: "drop-shadow(0 0 8px rgba(255,45,42,.9))" }} />}
      </svg>
      <div style={{ position: "absolute", left: 90, top: 300 }}>
        <PhotoCard fr={fr} at={card} w={280} name="Jia Tan" role="MAINTAINER" seed="jia" unknown red />
      </div>
      {/* two years of trust */}
      <div style={{ position: "absolute", left: 470, top: 330, width: 530, opacity: prog(fr, yrs, 10) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 78, color: C.ink, lineHeight: 1 }}>2021</div>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: C.dim, letterSpacing: 2, marginTop: 8 }}>FIRST PATCH</div>
          </div>
          <div style={{ textAlign: "right", opacity: prog(fr, yrs + 14, 10) }}>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 78, color: C.red, textShadow: C.redGlow, lineHeight: 1 }}>2024</div>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: C.red, letterSpacing: 2, marginTop: 8 }}>BACKDOOR SHIPS</div>
          </div>
        </div>
        <div style={{ position: "relative", height: 40, marginTop: 22 }}>
          <div style={{ position: "absolute", left: 0, top: 18, height: 4, width: `${tl * 100}%`, background: `linear-gradient(90deg, ${C.ink}, ${C.red})`, boxShadow: C.redGlow }} />
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: C.ink, letterSpacing: 3, marginTop: 18, opacity: prog(fr, trust, 10) }}>
          COMMITS · REVIEWS · <span style={{ color: C.red, textShadow: C.redGlow }}>TRUST</span>
        </div>
      </div>
      <Footnote n={2} o={prog(fr, card, 10)} />
    </AbsoluteFill>
  );
};
