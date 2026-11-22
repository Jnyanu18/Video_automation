import React, { useMemo } from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { loadFont } from "@remotion/google-fonts/Poppins";
import { FPS, Word } from "../../kit/theme";
import { c01, sp } from "./keynote";
import wordsJson from "../../../../videos/agency-launch-night/words.json";

/** Launch night (Auralion Labs agency reel), 2026-11-09. Reference DfIjwMcN-XQ (the last train home): a faceless white
 *  mannequin with drawn brows and eyes, told as "you", a new shot every few seconds, a countdown, the lights going out,
 *  two labelled choices. Our story: a founder alone at 23:58 the night before launch. 3D with @remotion/three (React Three
 *  Fiber); everything is a function of the frame, no useFrame. The laptop and phone screens are canvas textures redrawn
 *  each frame, so the story's screens (chat, declined card, 3%, the note, the clock) are real objects in the room. */

const SLUG = "agency-launch-night";
const POP = loadFont("normal", { weights: ["600", "700", "800"], subsets: ["latin"] }).fontFamily;
const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 2.4 : 5;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const at = (phrase: string) => {
  const want = phrase.split(/\s+/).map(norm);
  for (let i = 0; i < words.length; i++) if (want.every((w, k) => words[i + k] && norm(words[i + k].w) === w)) return words[i].start;
  return 999;
};

// ---------------------------------------------------------------- the beats: a shot, the laptop, the phone, the face

type Shot = "screen" | "wide" | "face" | "shoulder" | "phone" | "front";
type Face = "neutral" | "worried" | "annoyed" | "smile" | "shock";
type Beat = { at: number; shot: Shot; screen?: string; face?: Face };

const B: Beat[] = [
  { at: 0, shot: "screen", screen: "clock", face: "neutral" },
  { at: at("youre completely alone"), shot: "wide" },
  { at: at("the developer who"), shot: "screen", screen: "chat" },
  { at: at("phone off"), shot: "face", face: "worried" },
  { at: at("you run one"), shot: "screen", screen: "checkout" },
  { at: at("you try again"), shot: "shoulder", screen: "retry" },
  { at: at("payment failed"), shot: "face", face: "worried" },
  { at: at("a warning flashes"), shot: "screen", screen: "battery" },
  { at: at("of course it is"), shot: "face", face: "annoyed" },
  { at: at("so you open"), shot: "screen", screen: "code" },
  { at: at("you smile because"), shot: "face", face: "smile" },
  { at: at("then the clock"), shot: "screen", screen: "midnight" },
  { at: at("and the screen goes"), shot: "wide", screen: "black" },
  { at: at("your phone lights"), shot: "phone", screen: "black" },
  { at: at("your app has been"), shot: "phone", screen: "black" },
  { at: at("the payments still"), shot: "face", face: "shock", screen: "black" },
  { at: at("you have two choices"), shot: "shoulder", screen: "black" },
  { at: at("nine hours left"), shot: "phone", screen: "black" },
  { at: at("so what would you"), shot: "face", face: "shock", screen: "black" },
  { at: at("or skip that night"), shot: "wide", screen: "dashboard", face: "smile" },
  { at: at("with a team"), shot: "front", screen: "dashboard", face: "smile" },
  { at: at("build with auralion"), shot: "wide", screen: "dashboard", face: "smile" },
];
const T = {
  declined: at("declined"), failed: at("payment failed"), deleted: at("the rest is"), midnight: at("to midnight"),
  black: at("and the screen goes"), lights: at("your phone lights"), notify: at("one notification"), approved: at("your app has been"),
  choices: at("you have two choices"), skip: at("or skip that night"), team: at("with a team"), end: at("build with auralion"),
  launch: at("launch at nine"), delay: at("or delay it"),
};
const beatAt = (t: number) => { let b = B[0]; let start = 0; for (const x of B) if (t >= x.at) { b = x; start = x.at; } return { b, start }; };
const lastFace = (t: number): Face => { let f: Face = "neutral"; for (const x of B) if (t >= x.at && x.face) f = x.face; return f; };
const lastScreen = (t: number) => { let s = "clock"; for (const x of B) if (t >= x.at && x.screen) s = x.screen; return s; };

// ---------------------------------------------------------------- the cameras

const SHOTS: Record<Shot, { pos: [number, number, number]; look: [number, number, number]; fov: number }> = {
  screen: { pos: [0, 1.2, 0.5], look: [0, 0.9, -0.12], fov: 50 },
  wide: { pos: [1.55, 1.55, 2.25], look: [-0.05, 1.0, 0.1], fov: 42 },
  face: { pos: [0.08, 1.22, 0.04], look: [0, 1.25, 0.55], fov: 40 },
  shoulder: { pos: [0.42, 1.42, 0.98], look: [0, 0.92, -0.06], fov: 38 },
  phone: { pos: [0.36, 1.08, 0.3], look: [0.36, 0.78, 0.06], fov: 34 },
  front: { pos: [0.0, 1.45, -0.42], look: [0, 1.2, 0.8], fov: 74 },
};

const Rig: React.FC<{ shot: Shot; k: number; t: number }> = ({ shot, k, t }) => {
  const { camera } = useThree();
  const s = SHOTS[shot];
  const p = new THREE.Vector3(...s.pos), l = new THREE.Vector3(...s.look);
  p.lerp(l, 0.06 * k); // the slow push in over each shot
  p.x += 0.006 * Math.sin(t * 0.8) + 0.002 * Math.sin(t * 2.3); // a handheld drift, never still
  p.y += 0.004 * Math.sin(t * 1.1 + 1);
  camera.position.copy(p);
  (camera as THREE.PerspectiveCamera).fov = s.fov;
  camera.lookAt(l);
  camera.updateProjectionMatrix();
  return null;
};

// ---------------------------------------------------------------- the screens, drawn each frame

const useCanvas = (w: number, h: number) =>
  useMemo(() => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    return { c, ctx: c.getContext("2d")!, tex };
  }, [w, h]);

const rr = (x: CanvasRenderingContext2D, a: number, b: number, w: number, h: number, r: number) => { x.beginPath(); x.roundRect(a, b, w, h, r); };
const font = (px: number, wt = 700) => `${wt} ${px}px ${POP}`;

function drawLaptop(x: CanvasRenderingContext2D, W: number, H: number, s: string, t: number) {
  x.fillStyle = "#0c0d12"; x.fillRect(0, 0, W, H);
  if (s === "black") return;
  const clock = (txt: string, sub: string, red = false) => {
    x.fillStyle = "#0f1118"; x.fillRect(0, 0, W, H);
    x.fillStyle = red ? "#ff4d4d" : "#ffffff"; x.font = font(230, 800); x.textAlign = "center"; x.fillText(txt, W / 2, H / 2 + 50);
    x.fillStyle = "#8b8fa3"; x.font = font(40, 600); x.fillText(sub, W / 2, H / 2 + 130);
  };
  // the menu bar with the time, on every screen
  const bar = (time: string) => {
    x.fillStyle = "#1a1c25"; x.fillRect(0, 0, W, 48); x.fillStyle = "#c9ccd8"; x.font = font(26, 600); x.textAlign = "right"; x.fillText(time, W - 24, 33);
    x.textAlign = "left"; x.fillText("Launch: 09:00", 24, 33);
  };
  if (s === "clock") { clock("23:58", "Launch tomorrow, 09:00"); return; }
  if (s === "midnight") { const m = t >= T.midnight; clock(m ? "00:00" : "23:59", m ? "Launch day" : "Launch tomorrow, 09:00", m); if (t > T.black - 0.5 && Math.sin(t * 70) <= 0.2) { x.fillStyle = "rgba(0,0,0,0.85)"; x.fillRect(0, 0, W, H); } return; }
  if (s === "dashboard") {
    x.fillStyle = "#f5f5f7"; x.fillRect(0, 0, W, H); bar("08:40");
    x.fillStyle = "#161722"; x.font = font(56, 800); x.textAlign = "left"; x.fillText("Launch checklist", 60, 140);
    ["Payments", "App Store", "Waitlist email", "Monitoring"].forEach((r, i) => {
      x.fillStyle = "#ffffff"; rr(x, 60, 180 + i * 108, W - 120, 88, 18); x.fill();
      x.fillStyle = "#161722"; x.font = font(38, 600); x.fillText(r, 100, 236 + i * 108);
      x.fillStyle = "#22c55e"; x.beginPath(); x.arc(W - 120, 224 + i * 108, 26, 0, 7); x.fill();
      x.fillStyle = "#fff"; x.font = font(34, 800); x.textAlign = "center"; x.fillText("✓", W - 120, 236 + i * 108); x.textAlign = "left";
    });
    return;
  }
  x.fillStyle = "#f5f5f7"; x.fillRect(0, 0, W, H); bar("23:58"); x.textAlign = "left";
  if (s === "chat") {
    x.fillStyle = "#161722"; x.font = font(58, 800); x.fillText("Dev", 60, 125);
    x.fillStyle = "#9a9aa6"; x.font = font(36, 600); x.fillText("last seen 3 hours ago", 60, 175);
    ["you there?", "launch is tomorrow", "payments are failing!!"].forEach((m, i) => {
      const y = 225 + i * 145, w = 70 + m.length * 27;
      x.fillStyle = "#161722"; rr(x, W - 60 - w, y, w, 110, 30); x.fill();
      x.fillStyle = "#fff"; x.font = font(44, 600); x.fillText(m, W - 25 - w, y + 70);
      x.fillStyle = "#9a9aa6"; x.font = font(24, 700); x.fillText("✓", W - 60 - 30, y + 112);
    });
    return;
  }
  if (s === "checkout" || s === "retry") {
    const bad = s === "checkout" ? t >= T.declined : t >= T.failed - 0.2;
    x.fillStyle = "#161722"; x.font = font(58, 800); x.fillText("Test payment", 60, 140);
    x.fillStyle = "#ffffff"; rr(x, 60, 170, W - 120, 92, 18); x.fill(); x.fillStyle = "#3a3a44"; x.font = font(44, 600); x.fillText("•••• •••• •••• 4242", 100, 232);
    x.fillStyle = bad ? "#ff4d4d" : "#161722"; rr(x, 60, 300, W - 120, 110, 24); x.fill();
    x.fillStyle = "#fff"; x.font = font(60, 800); x.textAlign = "center";
    x.fillText(bad ? (s === "checkout" ? "Declined" : "Payment failed") : s === "retry" ? "Trying again..." : "Pay", W / 2, 372);
    return;
  }
  if (s === "battery") {
    x.fillStyle = "#e7e7ee"; for (let i = 0; i < 6; i++) { rr(x, 60, 110 + i * 70, 380 + (i * 97) % 400, 26, 8); x.fill(); }
    const on = Math.floor(t * 2.5) % 2 === 0;
    x.fillStyle = "#ffffff"; rr(x, W - 470, 80, 420, 190, 26); x.fill(); x.strokeStyle = on ? "#ff4d4d" : "#ffd0d0"; x.lineWidth = 6; x.stroke();
    x.fillStyle = "#ff4d4d"; x.font = font(64, 800); x.fillText("3%", W - 430, 170);
    x.fillStyle = "#161722"; x.font = font(30, 600); x.fillText("Battery very low", W - 430, 225);
    return;
  }
  if (s === "code") {
    x.fillStyle = "#13141c"; x.fillRect(0, 48, W, H - 48);
    x.fillStyle = "#8b8fa3"; x.font = font(28, 600); x.fillText("main.ts", 40, 95);
    const gone = t >= T.deleted;
    const lines: [string, string][] = [["#6a9955", "// NIGHT BEFORE LAUNCH"], ["#9fd38a", "// rule 1: never deploy at midnight"], ["#ff6b6b", "// rule 2: if the payments"], ["#ff6b6b", "// rule 3: never"], ["#c586c0", "export async function launch() {"]];
    lines.forEach(([c, l], i) => {
      if (i >= 2 && i <= 3 && gone) { x.fillStyle = "rgba(255,80,80,0.2)"; x.fillRect(30, 128 + i * 84, W - 60, 60); x.fillStyle = "#ff6b6b"; x.font = "600 40px Consolas, monospace"; x.fillText("- deleted", 40, 170 + i * 84); return; }
      x.fillStyle = c; x.font = "600 42px Consolas, monospace"; x.fillText(l, 40, 170 + i * 84);
    });
  }
}

function drawPhone(x: CanvasRenderingContext2D, W: number, H: number, t: number) {
  x.fillStyle = "#050507"; x.fillRect(0, 0, W, H);
  if (t < T.lights || t >= T.skip) return;
  const late = t >= T.choices + 2;
  x.textAlign = "center"; x.fillStyle = "#ffffff"; x.font = font(150, 700); x.fillText(late ? "00:01" : "00:00", W / 2, 300);
  x.fillStyle = "#9a9aa6"; x.font = font(34, 600); x.fillText(late ? "Launch in 8 h 59 min" : "Launch day", W / 2, 360);
  if (t >= T.notify - 0.3) {
    const k = c01((t - (T.notify - 0.3)) / 0.3);
    x.globalAlpha = k; x.fillStyle = "rgba(255,255,255,0.92)"; rr(x, 40, 460, W - 80, t >= T.approved ? 300 : 200, 36); x.fill();
    x.textAlign = "left"; x.fillStyle = "#161722"; x.font = font(30, 700); x.fillText("APP STORE", 80, 520);
    x.font = font(40, 800); x.fillText("Your app has been", 80, 585); x.fillText("approved", 80, 635);
    if (t >= T.approved) { x.fillStyle = "#5c6472"; x.font = font(32, 600); x.fillText("200 on your waitlist", 80, 715); }
    x.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- the characters
// v2 (Vishnu, 2026-11-09: the white mannequin "looks way too AI"): a styled founder in the studio's avatar look (dark curls,
// black rectangular glasses, warm skin) in a charcoal hoodie, jeans and white sneakers; the drawn expressions stay.

type Look = { skin: string; hair: string; top: string; legs: string; glasses: boolean; curls: number };
const FOUNDER: Look = { skin: "#c98f68", hair: "#1c1512", top: "#2c2e35", legs: "#27324a", glasses: true, curls: 1 };
const TEAM: Look[] = [
  { skin: "#e2b28e", hair: "#3a2a20", top: "#e8e8ec", legs: "#2a2c33", glasses: false, curls: 0 },
  { skin: "#a8724f", hair: "#111111", top: "#14151a", legs: "#3b4250", glasses: true, curls: 1 },
  { skin: "#d39c76", hair: "#2a1d16", top: "#5b6170", legs: "#22252c", glasses: false, curls: 0.5 },
];
const mats = new Map<string, THREE.MeshStandardMaterial>();
const M = (color: string, rough = 0.85) => {
  const key = color + rough;
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }));
  return mats.get(key)!;
};
const INKM = M("#141110", 0.6);

/** a capsule between two points */
const Limb: React.FC<{ a: [number, number, number]; b: [number, number, number]; r: number; m: THREE.Material }> = ({ a, b, r, m }) => {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
  const mid = A.clone().add(Bv).multiplyScalar(0.5), len = A.distanceTo(Bv);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize());
  return <mesh position={mid} quaternion={q} material={m}><capsuleGeometry args={[r, Math.max(0.001, len - 2 * r), 6, 16]} /></mesh>;
};

/** the drawn face, on the front of the head (the head faces -z) */
const FaceParts: React.FC<{ f: Face; blink: boolean; look: Look }> = ({ f, blink, look }) => {
  const brow = { neutral: 0, worried: 0.32, annoyed: -0.35, smile: 0.1, shock: 0.2 }[f];
  const browY = { neutral: 0.046, worried: 0.05, annoyed: 0.038, smile: 0.05, shock: 0.058 }[f];
  const ring = f === "shock";
  const eyeH = blink ? 0.15 : f === "annoyed" ? 0.55 : 1.2;
  const browM = M(look.hair, 0.7);
  return (
    <group position={[0, 0, -0.1]} rotation={[0, Math.PI, 0]}>
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * 0.036, 0.012, 0]}>
          {ring ? (
            <>
              <mesh material={M("#ffffff", 0.4)} scale={[1, 1, 0.3]}><sphereGeometry args={[0.016, 16, 16]} /></mesh>
              <mesh material={INKM} position={[0, 0, 0.004]}><sphereGeometry args={[0.006, 12, 12]} /></mesh>
            </>
          ) : (
            <mesh material={INKM} scale={[1, eyeH, 0.35]}><sphereGeometry args={[0.0105, 16, 16]} /></mesh>
          )}
          <mesh material={browM} position={[0, browY, 0.003]} rotation={[0, 0, sx * brow]}><boxGeometry args={[0.046, 0.013, 0.01]} /></mesh>
          {look.glasses ? (
            <group position={[0, 0.002, 0.012]}>
              {[[0, 0.022, 0.05, 0.006], [0, -0.022, 0.05, 0.006], [0.025, 0, 0.006, 0.05], [-0.025, 0, 0.006, 0.05]].map(([x, y, w, h], i) => (
                <mesh key={i} material={INKM} position={[x, y, 0]}><boxGeometry args={[w, h, 0.005]} /></mesh>
              ))}
            </group>
          ) : null}
        </group>
      ))}
      {look.glasses ? <mesh material={INKM} position={[0, 0.014, 0.012]}><boxGeometry args={[0.022, 0.005, 0.005]} /></mesh> : null}
      <mesh material={M(look.skin, 0.6)} position={[0, -0.012, 0.006]}><sphereGeometry args={[0.011, 12, 12]} /></mesh>
      {f === "smile" ? (
        <mesh material={INKM} position={[0, -0.045, 0]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.018, 0.0032, 8, 24, Math.PI]} /></mesh>
      ) : f === "shock" ? (
        <mesh material={INKM} position={[0, -0.05, 0]} scale={[0.8, 1, 0.3]}><sphereGeometry args={[0.013, 16, 16]} /></mesh>
      ) : (
        <mesh material={INKM} position={[0, -0.046, 0]} rotation={[0, 0, f === "worried" ? 0.12 : 0]}><boxGeometry args={[0.028, 0.0045, 0.004]} /></mesh>
      )}
    </group>
  );
};

/** curls on top and at the back of the head, never over the face */
const CURLS = Array.from({ length: 22 }, (_, i) => {
  const a = (i * 2.399963) % (Math.PI * 2), u = (i % 7) / 7;
  const th = 0.15 + u * 1.05;
  return [Math.sin(th) * Math.cos(a), Math.cos(th), Math.sin(th) * Math.sin(a), 0.04 + ((i * 7) % 5) * 0.004] as const;
});

const Head: React.FC<{ look: Look; f: Face; blink: boolean }> = ({ look, f, blink }) => (
  <group>
    <mesh material={M(look.skin, 0.55)} scale={[0.95, 1.05, 1]}><sphereGeometry args={[0.1, 48, 48]} /></mesh>
    {[-1, 1].map((sx) => <mesh key={sx} material={M(look.skin, 0.55)} position={[sx * 0.097, -0.005, 0.01]} scale={[0.4, 1, 0.7]}><sphereGeometry args={[0.026, 16, 16]} /></mesh>)}
    {look.curls > 0
      ? CURLS.filter(([, y, z]) => y > 0.5 && !(z < 0.05 && y < 0.93)).map(([x, y, z, r], i) => (
          <mesh key={i} material={M(look.hair, 0.95)} position={[x * 0.1, y * 0.1 + 0.012, z * 0.1]}><sphereGeometry args={[r * (0.75 + 0.25 * look.curls), 14, 14]} /></mesh>
        ))
      : <mesh material={M(look.hair, 0.9)} position={[0, 0.03, 0.012]} scale={[1.02, 0.8, 1.02]}><sphereGeometry args={[0.1, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55]} /></mesh>}
    <FaceParts f={f} blink={blink} look={look} />
  </group>
);

/** hoodie torso with the hood folded at the back and two drawstrings */
const Hoodie: React.FC<{ look: Look; low: [number, number, number]; high: [number, number, number] }> = ({ look, low, high }) => (
  <group>
    <Limb a={low} b={high} r={0.12} m={M(look.top, 0.95)} />
    <mesh material={M(look.top, 0.95)} position={[high[0], high[1] + 0.03, high[2] + 0.06]} rotation={[1.2, 0, 0]}><torusGeometry args={[0.075, 0.035, 12, 24]} /></mesh>
    {[-1, 1].map((sx) => <Limb key={sx} a={[high[0] + sx * 0.03, high[1] + 0.02, high[2] - 0.11]} b={[high[0] + sx * 0.032, high[1] - 0.1, high[2] - 0.115]} r={0.005} m={M("#f1f1f1", 0.7)} />)}
  </group>
);

/** the founder at the desk, facing the laptop */
const Mannequin: React.FC<{ f: Face; blink: boolean; nod: number; pov?: boolean; t: number; typing: boolean }> = ({ f, blink, nod, pov, t, typing }) => {
  const L = FOUNDER, top = M(L.top, 0.95), legs = M(L.legs, 0.9), skin = M(L.skin, 0.55);
  const breath = 0.004 * Math.sin(t * 1.7);
  const tap = (sx: number) => (typing ? 0.009 * Math.max(0, Math.sin(t * 15 + sx * 1.9)) : 0);
  return (
    <group>
      <group position={[0, 1.25 + breath, 0.55]} rotation={[nod + 0.015 * Math.sin(t * 0.9), 0.05 * Math.sin(t * 0.6), 0.02 * Math.sin(t * 0.45)]} visible={!pov}><Head look={L} f={f} blink={blink} /></group>
      <Limb a={[0, 1.08, 0.57]} b={[0, 1.15, 0.56]} r={0.03} m={skin} />
      <Hoodie look={L} low={[0, 0.78, 0.62]} high={[0, 1.06, 0.58]} />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Limb a={[sx * 0.15, 1.02, 0.58]} b={[sx * 0.2, 0.86, 0.42]} r={0.042} m={top} />
          <Limb a={[sx * 0.2, 0.86, 0.42]} b={[sx * 0.12, 0.81 + tap(sx), 0.17]} r={0.038} m={top} />
          <mesh material={skin} position={[sx * 0.105, 0.8 + tap(sx), 0.12]} scale={[1, 0.6, 1.2]}><sphereGeometry args={[0.034, 20, 20]} /></mesh>
          <Limb a={[sx * 0.08, 0.66, 0.62]} b={[sx * 0.09, 0.62, 0.3]} r={0.055} m={legs} />
          <Limb a={[sx * 0.09, 0.62, 0.3]} b={[sx * 0.09, 0.1, 0.32]} r={0.046} m={legs} />
          <mesh material={M("#f4f4f4", 0.6)} position={[sx * 0.09, 0.04, 0.27]}><boxGeometry args={[0.09, 0.07, 0.2]} /></mesh>
        </group>
      ))}
    </group>
  );
};

/** a teammate standing, facing the camera at the end */
const Standing: React.FC<{ x: number; z: number; k: number; ry: number; i: number }> = ({ x, z, k, ry, i }) => {
  const L = TEAM[i % TEAM.length], top = M(L.top, 0.95), legs = M(L.legs, 0.9), skin = M(L.skin, 0.55);
  return (
    <group position={[x, (1 - k) * -0.4, z]} rotation={[0, ry, 0]} scale={[1, Math.max(0.01, k), 1]}>
      <group position={[0, 1.62, 0]}><Head look={L} f="smile" blink={false} /></group>
      <Limb a={[0, 1.44, 0]} b={[0, 1.52, 0]} r={0.03} m={skin} />
      <Hoodie look={L} low={[0, 1.02, 0]} high={[0, 1.4, 0]} />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Limb a={[sx * 0.16, 1.4, 0]} b={[sx * 0.21, 0.98, 0.02]} r={0.04} m={top} />
          <mesh material={skin} position={[sx * 0.215, 0.93, 0.02]}><sphereGeometry args={[0.034, 16, 16]} /></mesh>
          <Limb a={[sx * 0.08, 0.95, 0]} b={[sx * 0.09, 0.1, 0]} r={0.05} m={legs} />
          <mesh material={M("#f4f4f4", 0.6)} position={[sx * 0.09, 0.04, -0.03]}><boxGeometry args={[0.09, 0.07, 0.2]} /></mesh>
        </group>
      ))}
    </group>
  );
};



/** the phone buzzes for half a second when it lights up and when the notification lands */
const buzz = (t: number) => ([T.lights, T.notify].some((s) => t >= s && t < s + 0.5) ? 0.003 * Math.sin(t * 95) : 0);
/** the laptop's light stutters in the half second before the battery dies */
const flicker = (t: number) => (t > T.black - 0.5 && t < T.black ? (Math.sin(t * 70) > 0.2 ? 1 : 0.15) : 1);

// ---------------------------------------------------------------- the room

const Room: React.FC<{ t: number; laptop: THREE.Texture; phone: THREE.Texture; screenOn: boolean; phoneOn: boolean; dawn: number }> = ({ t, laptop, phone, screenOn, phoneOn, dawn }) => {
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b2e38", roughness: 0.95 }), []);
  const lights = useMemo(() => Array.from({ length: 70 }, (_, i) => [((i * 37) % 100) / 100, ((i * 61) % 100) / 100, (i % 3) / 3] as const), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={new THREE.MeshStandardMaterial({ color: "#1b1d24", roughness: 0.9 })}><planeGeometry args={[8, 8]} /></mesh>
      <mesh position={[0, 2, -0.48]} material={wall}><planeGeometry args={[8, 4]} /></mesh>
      <mesh position={[-1.8, 2, 1.5]} rotation={[0, Math.PI / 2, 0]} material={wall}><planeGeometry args={[6, 4]} /></mesh>
      {/* the window: a night city, turning to morning at the end */}
      <group position={[-0.62, 1.55, -0.47]}>
        <mesh><planeGeometry args={[0.95, 1.05]} /><meshBasicMaterial color={new THREE.Color("#0b1530").lerp(new THREE.Color("#f2b98a"), dawn)} /></mesh>
        {lights.map(([a, b, c], i) => (
          <mesh key={i} position={[(a - 0.5) * 0.85, (b - 0.65) * 0.7, 0.002]}><planeGeometry args={[0.018, 0.026]} /><meshBasicMaterial color={c > 0.5 ? "#ffd27a" : "#9fb4ff"} transparent opacity={(0.35 + 0.5 * c) * (1 - dawn)} /></mesh>
        ))}
        {[[-0.49, 0, 0.03, 1.1], [0.49, 0, 0.03, 1.1], [0, 0.54, 1.0, 0.03], [0, -0.54, 1.0, 0.03], [0, 0, 0.02, 1.05]].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.01]} material={new THREE.MeshStandardMaterial({ color: "#3a3d48" })}><boxGeometry args={[w, h, 0.03]} /></mesh>
        ))}
      </group>
      {/* the desk and chair */}
      <mesh position={[0, 0.735, -0.08]} material={new THREE.MeshStandardMaterial({ color: "#3b2f27", roughness: 0.7 })}><boxGeometry args={[1.5, 0.04, 0.72]} /></mesh>
      {[[-0.7, -0.38], [0.7, -0.38], [-0.7, 0.24], [0.7, 0.24]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} material={new THREE.MeshStandardMaterial({ color: "#2a221d" })}><boxGeometry args={[0.04, 0.72, 0.04]} /></mesh>
      ))}
      <mesh position={[0, 0.55, 0.66]} material={new THREE.MeshStandardMaterial({ color: "#22242c" })}><boxGeometry args={[0.46, 0.05, 0.44]} /></mesh>
      <mesh position={[0, 0.9, 0.88]} material={new THREE.MeshStandardMaterial({ color: "#22242c" })}><boxGeometry args={[0.46, 0.66, 0.05]} /></mesh>
      {/* the laptop */}
      <group position={[0, 0.765, -0.05]}>
        <mesh material={new THREE.MeshStandardMaterial({ color: "#8d909a", metalness: 0.6, roughness: 0.35 })}><boxGeometry args={[0.36, 0.014, 0.25]} /></mesh>
        <group position={[0, 0.007, -0.12]} rotation={[-0.25, 0, 0]}>
          <mesh position={[0, 0.115, -0.004]} material={new THREE.MeshStandardMaterial({ color: "#6f727c", metalness: 0.6, roughness: 0.35 })}><boxGeometry args={[0.36, 0.235, 0.008]} /></mesh>
          <mesh position={[0, 0.117, 0.001]}><planeGeometry args={[0.34, 0.215]} /><meshBasicMaterial map={laptop} toneMapped={false} /></mesh>
        </group>
      </group>
      {/* the phone, flat on the desk */}
      <group position={[0.36 + buzz(t), 0.76, 0.06]} rotation={[-Math.PI / 2, 0, 0.2 + 8 * buzz(t)]}>
        <mesh material={new THREE.MeshStandardMaterial({ color: "#111216", roughness: 0.3 })}><boxGeometry args={[0.075, 0.155, 0.008]} /></mesh>
        <mesh position={[0, 0, 0.0045]}><planeGeometry args={[0.068, 0.146]} /><meshBasicMaterial map={phone} toneMapped={false} /></mesh>
      </group>
      {/* the light: the moon through the window, the laptop's glow, the phone's glow, the morning */}
      <ambientLight intensity={0.18 + 0.5 * dawn} color="#8fa2d8" />
      <directionalLight position={[-1.5, 2.5, -1]} intensity={0.55 + 1.4 * dawn} color={dawn > 0 ? "#ffd2a6" : "#8ea6ff"} />
      {screenOn ? <pointLight position={[0, 0.95, 0.15]} intensity={1.6 * flicker(t)} distance={2.5} decay={1.5} color="#cfdcff" /> : null}
      {phoneOn ? <pointLight position={[0.36, 0.9, 0.12]} intensity={0.9} distance={1.2} decay={1.6} color="#dfe8ff" /> : null}
      <pointLight position={[1.2, 2.2, 1.6]} intensity={0.25 + 0.8 * dawn} distance={6} color="#aab6e0" />
      <pointLight position={[0, 1.9, 0.1]} intensity={2.2 * dawn} distance={4} decay={1.2} color="#ffe2c2" />
    </group>
  );
};

// ---------------------------------------------------------------- overlays: captions, the two choices, the end card

const chunks = (() => {
  const out: Word[][] = []; let c: Word[] = [];
  words.forEach((w) => { c.push(w); if (c.length >= 3 || /[.,!?:"]$/.test(w.w)) { out.push(c); c = []; } });
  if (c.length) out.push(c);
  return out;
})();

const Captions: React.FC<{ now: number }> = ({ now }) => {
  const i = chunks.findIndex((c, k) => now >= c[0].start && (k === chunks.length - 1 || now < chunks[k + 1][0].start));
  if (i < 0 || now > chunks[i][chunks[i].length - 1].end + 0.5) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1500, textAlign: "center", fontFamily: POP, fontWeight: 800, fontSize: 66, lineHeight: 1.1, letterSpacing: 0.5, color: "#fff", textTransform: "uppercase", textShadow: "0 3px 0 #000, 0 0 18px rgba(0,0,0,0.9)" }}>
      {chunks[i].map((w) => w.w.replace(/["]/g, "")).join(" ")}
    </div>
  );
};

const Choice: React.FC<{ n: number; label: string; color: string; t: number; now: number; style: React.CSSProperties }> = ({ n, label, color, t, now, style }) => {
  const k = sp(now - t, 220);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", transform: `scale(${k})`, display: "flex", alignItems: "center", gap: 14, padding: "12px 24px 12px 14px", borderRadius: 18, background: "rgba(10,10,14,0.85)", border: "3px solid #fff", fontFamily: POP, fontSize: 40, fontWeight: 800, color: "#fff", ...style }}>
      <span style={{ width: 46, height: 46, borderRadius: 23, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{n}</span>{label}
    </div>
  );
};

// ---------------------------------------------------------------- the reel

export const AgencyLaunchNight: React.FC = () => {
  const now = useCurrentFrame() / FPS;
  const { b, start } = beatAt(now);
  const face = lastFace(now);
  const screen = lastScreen(now);
  const blink = (now % 3.7) < 0.12;
  const lap = useCanvas(1100, 700), ph = useCanvas(540, 1160);
  drawLaptop(lap.ctx, 1100, 700, screen, now); lap.tex.needsUpdate = true;
  drawPhone(ph.ctx, 540, 1160, now); ph.tex.needsUpdate = true;
  const phoneOn = now >= T.lights && now < T.skip;
  const dawn = c01((now - T.skip) / 2.5);
  const k = c01((now - start) / 5);
  const team = (i: number) => sp(now - (T.team + i * 0.25), 160);
  const choicesOn = now >= T.choices && now < T.skip;
  const endK = sp(now - T.end, 140);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <ThreeCanvas width={1080} height={1920} camera={{ fov: 40, near: 0.02, far: 30, position: [1.5, 1.5, 2.2] }} gl={{ antialias: true }}>
        <Rig shot={b.shot} k={k} t={now} />
        <color attach="background" args={[dawn > 0 ? "#2a2522" : "#06070a"]} />
        <Room t={now} laptop={lap.tex} phone={ph.tex} screenOn={screen !== "black"} phoneOn={phoneOn} dawn={dawn} />
        <Mannequin f={face} blink={blink && face !== "shock"} nod={face === "worried" ? 0.08 : face === "smile" ? -0.04 : 0} pov={b.shot === "screen"} t={now} typing={["clock", "chat", "checkout", "retry", "code"].includes(screen)} />
        {now >= T.team ? (
          <>
            <Standing i={0} x={-0.42} z={0.98} k={team(0)} ry={0.15} />
            <Standing i={1} x={0.44} z={0.98} k={team(1)} ry={-0.15} />
            <Standing i={2} x={0.0} z={1.3} k={team(2)} ry={0} />
          </>
        ) : null}
      </ThreeCanvas>

      {/* a soft vignette, as in the reference */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 55%, rgba(0,0,0,0.65) 100%)", pointerEvents: "none" }} />

      {choicesOn ? (
        <>
          <Choice n={1} label="LAUNCH AT 9" color="#2563eb" t={T.launch} now={now} style={{ left: 70, top: 300 }} />
          <Choice n={2} label="DELAY" color="#dc2626" t={T.delay} now={now} style={{ right: 70, top: 300 }} />
        </>
      ) : null}

      {now < T.end ? <Captions now={now} /> : null}

      {now >= T.end ? (
        <AbsoluteFill style={{ background: `rgba(7,7,11,${0.92 * c01(endK)})`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 34 }}>
          <div style={{ transform: `scale(${0.85 + 0.15 * endK})`, opacity: c01(endK * 1.4), display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
            <div style={{ width: 150, height: 148, backgroundColor: "#fff", WebkitMaskImage: `url(${staticFile(`${SLUG}/brand/mark.svg`)})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat", WebkitMaskPosition: "center" }} />
            <div style={{ fontFamily: POP, fontSize: 84, fontWeight: 800, color: "#fff", letterSpacing: -1, textAlign: "center", lineHeight: 1.05 }}>Build with<br />Auralion Labs</div>
            <div style={{ fontFamily: POP, fontSize: 34, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: 2 }}>auralionlabs.com</div>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
