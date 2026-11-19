// Canvas textures (local, procedural): code glyphs, "$", the moon, device screens and the live code editor.
import * as THREE from "three";
import { random } from "remotion";
import { T } from "./timing";
import { STEPS } from "./rig";

export const UI_FONT = `"Segoe UI", "Segoe UI Variable Display", Arial, sans-serif`;
export const CODE_FONT = `Consolas, "Cascadia Mono", "Courier New", monospace`;
const cfont = (w: number, px: number, fam = UI_FONT) => `${w} ${px}px ${fam}`;

const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const tex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

const cache = new Map<string, THREE.Texture>();
const once = (k: string, make: () => THREE.Texture) => { if (!cache.has(k)) cache.set(k, make()); return cache.get(k)!; };

// white glyph on transparent (tinted by the sprite colour)
export const glyphTex = (s: string, mono = true) => once(`g:${s}`, () => {
  const c = canvas(256, 256), g = c.getContext("2d")!;
  g.font = cfont(800, s.length > 2 ? 92 : 150, mono ? CODE_FONT : UI_FONT);
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff";
  g.shadowColor = "rgba(255,255,255,.6)"; g.shadowBlur = 6;
  g.fillText(s, 128, 132);
  return tex(c);
});

export const moonTex = () => once("moon", () => {
  const c = canvas(256, 256), g = c.getContext("2d")!;
  const gr = g.createRadialGradient(128, 128, 40, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,230,170,.45)"); gr.addColorStop(1, "rgba(255,230,170,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#fff4d6"; g.beginPath(); g.arc(128, 128, 62, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(156, 110, 56, 0, Math.PI * 2); g.fill();
  return tex(c);
});

// laptop screen: code lines; phone screen: app grid
export const laptopScreenTex = () => once("laptop", () => {
  const c = canvas(512, 320), g = c.getContext("2d")!;
  g.fillStyle = "#06122e"; g.fillRect(0, 0, 512, 320);
  for (let i = 0; i < 11; i++) {
    let x = 30 + (random(`li${i}`) < 0.4 ? 30 : 0);
    for (let j = 0; j < 4; j++) {
      const w = 30 + random(`lw${i}-${j}`) * 90;
      g.fillStyle = ["#5ee7ff", "#ff5fd2", "#ffc94a", "#9fb4ff"][Math.floor(random(`lc${i}-${j}`) * 4)];
      g.globalAlpha = 0.85; g.fillRect(x, 22 + i * 26, w, 10); x += w + 12;
      if (x > 440) break;
    }
  }
  return tex(c);
});
export const phoneScreenTex = () => once("phone", () => {
  const c = canvas(256, 512), g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 256, 512); gr.addColorStop(0, "#1a2a7a"); gr.addColorStop(1, "#6a1a6a");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  const cols = ["#5ee7ff", "#ff5fd2", "#ffc94a", "#7dffb0"];
  for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) {
    g.fillStyle = cols[(r * 3 + q) % 4]; g.globalAlpha = 0.9;
    const x = 32 + q * 70, y = 70 + r * 78;
    g.beginPath(); g.roundRect(x, y, 50, 50, 14); g.fill();
  }
  return tex(c);
});

// ---- the live code editor on the desk monitor ----------------------------------------------------
export const ED_W = 1200, ED_H = 720;
const HUMAN = [
  "async function shipFeature(spec) {",
  "  const plan = await design(spec);",
  "  for (const task of plan.tasks) {",
  "    const code = writeByHand(task);",
  "    await test(code);",
];
const AGENT = [
  "// agent: generating from spec",
  "export async function shipFeature(spec) {",
  "  const plan = await agent.plan(spec);",
  "  const diffs = await agent.implement(plan);",
  "  await agent.test(diffs, { all: true });",
  "  return agent.openPullRequest(diffs);",
  "}",
  "",
  "export const reviewers = [\"me\", \"my leads\"];",
  "agent.on(\"done\", (pr) => notify(pr));",
  "// every line here: written by the agent",
];
const SPEC = ["// GOAL: what needs to be done", "// DESIGN: plan -> implement -> test -> PR"];
// v5: the agent starts writing just after "I design", review marks on "verify", a fix on "babysit", done on "output"
export const AGENT_T = () => T.design + 0.55;
const KW = /\b(async|await|function|const|for|of|return|export|new)\b/g;

const drawLine = (g: CanvasRenderingContext2D, s: string, x: number, y: number, base: string) => {
  // simple syntax colouring: keywords magenta, strings gold, comments cyan
  if (s.trim().startsWith("//")) { g.fillStyle = base === "#ffd98a" ? base : "#5ee7ff"; g.fillText(s, x, y); return; }
  let cx = x;
  const parts = s.split(/(\b(?:async|await|function|const|for|of|return|export|new)\b|"[^"]*")/);
  for (const p of parts) {
    if (!p) continue;
    g.fillStyle = KW.test(p) ? "#ff7ad9" : p.startsWith('"') ? "#ffc94a" : base;
    KW.lastIndex = 0;
    g.fillText(p, cx, y);
    cx += g.measureText(p).width;
  }
};

// Editor state as a pure function of t: what has been typed, by whom, and review marks.
export const drawEditor = (g: CanvasRenderingContext2D, t: number) => {
  g.clearRect(0, 0, ED_W, ED_H);
  g.fillStyle = "#070d24"; g.fillRect(0, 0, ED_W, ED_H);
  // title bar
  g.fillStyle = "#0d1738"; g.fillRect(0, 0, ED_W, 64);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(36 + i * 34, 32, 11, 0, 7); g.fill(); });
  g.font = cfont(600, 30); g.fillStyle = "#b9c6ff"; g.fillText("ship-feature.ts", 160, 42);
  const agentOn = t >= T.evolved - 0.1;
  g.font = cfont(700, 26);
  g.fillStyle = agentOn ? "#5ee7ff" : "#ffc94a";
  g.textAlign = "right"; g.fillText(agentOn ? "AI agent: writing" : "you: typing", ED_W - 30, 41); g.textAlign = "left";
  // gutter
  g.fillStyle = "#0a1230"; g.fillRect(0, 64, 74, ED_H - 64);
  g.font = cfont(400, 30, CODE_FONT);
  const LH = 52, X = 96, Y0 = 118;
  const lines: { s: string; who: "me" | "ai" | "spec"; mark?: "ok" | "fix" }[] = [];
  let cursor: { x: number; y: number; who: "me" | "ai" } | null = null;
  const steps = t >= STEPS[0].t - 0.1;
  if (!steps) {
    // phase 1: he types slowly, then the agent takes over and streams fast
    const typed = Math.max(0, (Math.min(t, T.evolved - 0.1) - (T.working + 0.2)) * 22);
    let left = typed;
    for (const s of HUMAN) { if (left <= 0) break; lines.push({ s: s.slice(0, Math.floor(left)), who: "me" }); left -= s.length; }
    if (agentOn) {
      lines.length = 0;
      const k = (t - (T.evolved - 0.1)) * 70; // characters per second
      let l2 = k;
      for (const s of AGENT) { if (l2 <= 0) break; lines.push({ s: s.slice(0, Math.floor(l2)), who: "ai" }); l2 -= Math.max(1, s.length); }
    }
  } else {
    // phase 2: guide (spec), design, delegate (agent writes), review (marks), approved
    if (t >= T.guide - 0.1) lines.push({ s: SPEC[0].slice(0, Math.floor((t - T.guide + 0.1) * 60)), who: "spec" });
    if (t >= T.design - 0.1) lines.push({ s: SPEC[1].slice(0, Math.floor((t - T.design + 0.1) * 60)), who: "spec" });
    if (t >= AGENT_T() - 0.1) {
      let l2 = (t - AGENT_T() + 0.1) * 75;
      for (const s of AGENT.slice(1, 9)) { if (l2 <= 0) break; lines.push({ s: s.slice(0, Math.floor(l2)), who: "ai" }); l2 -= Math.max(1, s.length); }
    }
    if (t >= T.verify) {
      const n = Math.floor((t - T.verify) * 2.6);
      let m = 0;
      for (const L of lines) if (L.who === "ai" && L.s.length > 2 && m < n) { L.mark = m === 2 && t < T.output ? "fix" : "ok"; m++; }
    }
  }
  lines.forEach((L, i) => {
    const y = Y0 + i * LH;
    if (L.mark === "ok") { g.fillStyle = "rgba(60,220,140,.16)"; g.fillRect(74, y - 38, ED_W - 74, LH - 4); }
    if (L.mark === "fix") { g.fillStyle = "rgba(255,95,120,.2)"; g.fillRect(74, y - 38, ED_W - 74, LH - 4); }
    g.fillStyle = "#4a5a8a"; g.font = cfont(400, 24, CODE_FONT); g.textAlign = "right"; g.fillText(String(i + 1), 60, y - 4); g.textAlign = "left";
    if (L.who === "ai") { g.fillStyle = "#5ee7ff"; g.fillRect(70, y - 36, 4, LH - 8); }
    if (L.who === "spec") { g.fillStyle = "#ffc94a"; g.fillRect(70, y - 36, 4, LH - 8); }
    g.font = cfont(400, 30, CODE_FONT);
    drawLine(g, L.s, X, y, L.who === "spec" ? "#ffd98a" : L.who === "ai" ? "#dfe8ff" : "#ffe7b0");
    if (L.mark === "ok") { g.fillStyle = "#4dff9d"; g.font = cfont(800, 30); g.fillText("✓", ED_W - 56, y); }
    if (L.mark === "fix") { g.fillStyle = "#ff6b86"; g.font = cfont(800, 26); g.fillText("fix", ED_W - 70, y); }
    g.font = cfont(400, 30, CODE_FONT);
    if (i === lines.length - 1) cursor = { x: X + g.measureText(L.s).width + 4, y, who: L.who === "ai" ? "ai" : "me" };
  });
  const cur = cursor as { x: number; y: number; who: "me" | "ai" } | null;
  if (cur && Math.floor(t * 3) % 2 === 0) { g.fillStyle = cur.who === "ai" ? "#5ee7ff" : "#ffc94a"; g.fillRect(cur.x, cur.y - 32, 14, 40); }
  // approved stamp
  if (t >= T.output) {
    const k = Math.min(1, (t - T.output) / 0.25);
    g.save(); g.translate(ED_W - 250, ED_H - 120); g.rotate(-0.12); g.scale(1.4 - 0.4 * k, 1.4 - 0.4 * k); g.globalAlpha = k;
    g.strokeStyle = "#4dff9d"; g.lineWidth = 7; g.beginPath(); g.roundRect(-190, -50, 380, 100, 18); g.stroke();
    g.fillStyle = "#4dff9d"; g.font = cfont(800, 52); g.textAlign = "center"; g.fillText("✓ OUTPUT", 0, 18);
    g.restore(); g.textAlign = "left";
  }
  return lines.length;
};
export const editorCanvas = () => canvas(ED_W, ED_H);
let scratch: CanvasRenderingContext2D | null = null;
// non-empty line count of the editor at t (same function the texture draws with)
export const editorLines = (t: number) => { if (!scratch) scratch = canvas(ED_W, ED_H).getContext("2d")!; return drawEditor(scratch, t); };
export const makeTex = tex;
