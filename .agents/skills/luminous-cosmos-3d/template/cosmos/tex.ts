// Canvas textures: data-tile atlas, text cards, book covers, pages, planet bands. Built once.
import * as THREE from "three";
import { random } from "remotion";
import { CFONT } from "./fonts";

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!] as const;
};
const toTex = (c: HTMLCanvasElement, aniso = 8) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
};
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.roundRect(x, y, w, h, r);
};

// 4x2 atlas of tiny "things on the internet", bright on a dark glass panel.
export const tileAtlas = () => {
  const TW = 256, TH = 176;
  const [c, g] = canvas(TW * 4, TH * 2);
  const R = (k: string) => random(`atlas-${k}`);
  for (let i = 0; i < 8; i++) {
    const ox = (i % 4) * TW, oy = Math.floor(i / 4) * TH;
    g.save(); g.translate(ox + 6, oy + 6);
    const w = TW - 12, h = TH - 12;
    rr(g, 0, 0, w, h, 14); g.fillStyle = "rgba(30,24,90,0.55)"; g.fill();
    g.lineWidth = 4; g.strokeStyle = "rgba(170,230,255,0.85)"; g.stroke();
    g.save(); rr(g, 0, 0, w, h, 14); g.clip();
    if (i === 0) { // web page
      g.fillStyle = "#8a7dff"; g.fillRect(0, 0, w, 26);
      for (let k = 0; k < 3; k++) { g.fillStyle = "#e9e4ff"; g.beginPath(); g.arc(14 + k * 16, 13, 5, 0, 7); g.fill(); }
      g.fillStyle = "#ffffff"; g.fillRect(16, 40, w * 0.6, 14);
      g.fillStyle = "#5ee7ff"; g.fillRect(16, 66, 80, 70);
      g.fillStyle = "rgba(220,230,255,0.8)"; for (let k = 0; k < 5; k++) g.fillRect(108, 68 + k * 14, w - 130 - R(`w${k}`) * 40, 6);
    } else if (i === 1) { // photo
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#ff5fd2"); gr.addColorStop(1, "#3a1d8f"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffe9a8"; g.beginPath(); g.arc(w * 0.7, h * 0.35, 20, 0, 7); g.fill();
      g.fillStyle = "#1b1060"; g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.3, h * 0.45); g.lineTo(w * 0.55, h); g.fill();
      g.fillStyle = "#2a1a80"; g.beginPath(); g.moveTo(w * 0.35, h); g.lineTo(w * 0.65, h * 0.55); g.lineTo(w, h); g.fill();
    } else if (i === 2) { // code
      const cols = ["#5ee7ff", "#ff5fd2", "#8a7dff", "#7dffb0", "#ffffff"];
      for (let k = 0; k < 8; k++) { let x = 14 + (k % 3 === 1 ? 22 : k % 3 === 2 ? 44 : 0); for (let j = 0; j < 3; j++) { const ww = 18 + R(`c${k}${j}`) * 50; g.fillStyle = cols[(k + j) % 5]; g.fillRect(x, 14 + k * 19, ww, 8); x += ww + 8; } }
    } else if (i === 3) { // video
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#26a6c9"); gr.addColorStop(1, "#4b2bb0"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.95)"; g.beginPath(); g.moveTo(w / 2 - 18, h / 2 - 26); g.lineTo(w / 2 + 26, h / 2); g.lineTo(w / 2 - 18, h / 2 + 26); g.fill();
      g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(12, h - 18, w - 24, 6); g.fillStyle = "#ff5fd2"; g.fillRect(12, h - 18, w * 0.45, 6);
    } else if (i === 4) { // map
      g.fillStyle = "#1d3a6b"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(180,240,255,0.9)"; g.lineWidth = 5;
      g.beginPath(); g.moveTo(0, h * 0.7); g.bezierCurveTo(w * 0.3, h * 0.5, w * 0.5, h * 0.9, w, h * 0.3); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.25, 0); g.lineTo(w * 0.4, h); g.moveTo(w * 0.7, 0); g.lineTo(w * 0.6, h); g.stroke();
      g.fillStyle = "#ff5fd2"; g.beginPath(); g.arc(w * 0.62, h * 0.42, 13, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(w * 0.62, h * 0.42, 5, 0, 7); g.fill();
    } else if (i === 5) { // chart
      for (let k = 0; k < 6; k++) { const bh = 30 + R(`b${k}`) * (h - 60); g.fillStyle = k % 2 ? "#5ee7ff" : "#8a7dff"; g.fillRect(18 + k * 36, h - 14 - bh, 24, bh); }
    } else if (i === 6) { // chat
      g.fillStyle = "#8a7dff"; rr(g, 14, 14, w * 0.55, 34, 14); g.fill();
      g.fillStyle = "#5ee7ff"; rr(g, w * 0.38, 60, w * 0.55, 34, 14); g.fill();
      g.fillStyle = "#8a7dff"; rr(g, 14, 106, w * 0.45, 34, 14); g.fill();
    } else { // document
      g.fillStyle = "#ffffff"; g.fillRect(16, 16, w * 0.5, 14);
      g.fillStyle = "rgba(220,230,255,0.75)"; for (let k = 0; k < 8; k++) g.fillRect(16, 42 + k * 13, w - 32 - (k === 7 ? 90 : R(`d${k}`) * 30), 6);
    }
    g.restore(); g.restore();
  }
  return toTex(c);
};

export type Line = { text: string; px: number; weight?: number; color?: string; y: number; x?: number; align?: CanvasTextAlign; glow?: string };
// Text on transparent canvas; sizes in canvas px (texture is w x h).
export const textTex = (w: number, h: number, lines: Line[]) => {
  const [c, g] = canvas(w, h);
  g.textBaseline = "middle";
  for (const l of lines) {
    g.font = CFONT(l.weight ?? 800, l.px);
    g.textAlign = l.align ?? "center";
    g.fillStyle = l.color ?? "#ffffff";
    const x = l.x ?? (l.align === "left" ? 40 : l.align === "right" ? w - 40 : w / 2);
    if (l.glow) { g.shadowColor = l.glow; g.shadowBlur = l.px * 0.35; }
    g.fillText(l.text, x, l.y);
    g.shadowBlur = 0;
  }
  return toTex(c);
};

// single glyph, white, for animated equations
export const glyphTex = (ch: string, px = 220) => textTex(256, 256, [{ text: ch, px, y: 132 }]);

// Cloth book cover with foil title bars and an emblem.
export const coverTex = (i: number) => {
  const [c, g] = canvas(256, 352);
  const cloth = ["#1f2a6b", "#3b1f6e", "#123d5a", "#4a1847", "#24304f", "#2e1a5c", "#103f4a", "#3d2a6a", "#1a2456", "#47204f"][i % 10];
  g.fillStyle = cloth; g.fillRect(0, 0, 256, 352);
  for (let k = 0; k < 2200; k++) { g.fillStyle = `rgba(255,255,255,${random(`cl${i}-${k}`) * 0.05})`; g.fillRect(random(`cx${i}-${k}`) * 256, random(`cy${i}-${k}`) * 352, 2, 1); }
  g.strokeStyle = "rgba(190,230,255,0.75)"; g.lineWidth = 3; g.strokeRect(18, 18, 220, 316);
  g.fillStyle = "rgba(200,235,255,0.9)"; g.fillRect(48, 70, 160, 12); g.fillRect(68, 96, 120, 8);
  g.strokeStyle = "rgba(200,235,255,0.85)"; g.lineWidth = 4;
  g.beginPath();
  const e = i % 4;
  if (e === 0) { g.arc(128, 210, 40, 0, 7); g.moveTo(88, 210); g.lineTo(168, 210); }
  else if (e === 1) { g.moveTo(88, 250); g.lineTo(128, 170); g.lineTo(168, 250); g.closePath(); }
  else if (e === 2) { for (let k = 0; k < 3; k++) { g.moveTo(128 + 42 * Math.cos(k * 2.1), 210 + 42 * Math.sin(k * 2.1)); g.ellipse(128, 210, 42, 14, k * 1.05, 0, 7); } }
  else { g.rect(96, 178, 64, 64); g.moveTo(96, 178); g.lineTo(160, 242); }
  g.stroke();
  return toTex(c);
};

// A page of text lines (pale, slightly luminous).
export const pageTex = (seed: number) => {
  const [c, g] = canvas(256, 352);
  g.fillStyle = "#e9e6ff"; g.fillRect(0, 0, 256, 352);
  g.fillStyle = "rgba(40,30,110,0.85)"; g.fillRect(28, 30, 120, 12);
  g.fillStyle = "rgba(60,60,140,0.55)";
  for (let k = 0; k < 17; k++) g.fillRect(28, 62 + k * 16, 200 - random(`pg${seed}-${k}`) * (k % 6 === 5 ? 120 : 30), 6);
  g.fillStyle = "rgba(94,180,230,0.6)"; g.fillRect(28, 320, 60, 6);
  return toTex(c);
};

export const bandsTex = (cols: string[], seed: string) => {
  const [c, g] = canvas(64, 512);
  for (let y = 0; y < 512; y++) {
    const k = (Math.sin(y * 0.05 + random(seed) * 9) + Math.sin(y * 0.17) * 0.4 + 1.4) / 2.8;
    const i = Math.min(cols.length - 1, Math.floor(k * cols.length));
    g.fillStyle = cols[i]; g.fillRect(0, y, 64, 1);
  }
  return toTex(c);
};

export const ringTex = () => {
  const [c, g] = canvas(512, 8);
  for (let x = 0; x < 512; x++) {
    const a = 0.25 + 0.55 * Math.abs(Math.sin(x * 0.07)) * (0.6 + 0.4 * Math.sin(x * 0.013));
    g.fillStyle = `rgba(200,190,255,${(x < 30 || x > 490 ? 0 : a).toFixed(3)})`; g.fillRect(x, 0, 1, 8);
  }
  return toTex(c);
};
