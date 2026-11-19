// Fonts + chunky rounded HTML UI pieces (pills, stamps, sparkles, icons) for the diorama overlays.
import React from "react";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import { lerp } from "../lib";
import { C } from "./parts";

const f = loadFont("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
export const ROUND = f.fontFamily;

export const INK = "#3b2f5c"; // plum ink for text on light pills

type PillProps = { x: number; y: number; text: React.ReactNode; k: number; bg?: string; fg?: string; edge?: string; size?: number; align?: "left" | "center" | "right"; rot?: number; icon?: React.ReactNode; sub?: string; tail?: boolean; wrap?: number };
// Clay button: rounded pill with a darker bottom lip (looks like a chunky toy label).
export const Pill: React.FC<PillProps> = ({ x, y, text, k, bg = "#ffffff", fg = INK, edge, size = 40, align = "center", rot = 0, icon, sub, tail, wrap }) => {
  if (k <= 0.001) return null;
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  const lip = edge ?? "rgba(59,47,92,.28)";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${tx}, -100%) rotate(${rot}deg) scale(${lerp(0.55, 1, k)})`, transformOrigin: align === "left" ? "0 100%" : align === "right" ? "100% 100%" : "50% 100%", opacity: Math.min(1, k * 1.6), fontFamily: ROUND, whiteSpace: wrap ? "normal" : "nowrap", width: wrap }}>
      <div style={{
        display: "flex", alignItems: "center", gap: size * 0.32, padding: `${size * 0.26}px ${size * 0.55}px ${size * 0.3}px`,
        borderRadius: size * 0.7, background: bg, color: fg, fontSize: size, fontWeight: 700, lineHeight: 1.05, letterSpacing: "0.01em",
        boxShadow: `0 ${size * 0.16}px 0 ${lip}, 0 ${size * 0.4}px ${size * 0.6}px rgba(59,47,92,.25)`,
        justifyContent: "center", textAlign: "center",
      }}>
        {icon}
        <div>
          {text}
          {sub && <div style={{ fontSize: size * 0.55, fontWeight: 600, opacity: 0.8, marginTop: size * 0.08 }}>{sub}</div>}
        </div>
      </div>
      {tail && <div style={{ position: "absolute", left: "50%", bottom: -size * 0.32, width: size * 0.42, height: size * 0.42, background: bg, transform: "translateX(-50%) rotate(45deg)", borderRadius: size * 0.08, zIndex: -1 }} />}
    </div>
  );
};

// Rubber-stamp style word (big, rotated, outlined).
export const Stamp: React.FC<{ x: number; y: number; text: string; k: number; color?: string; size?: number; rot?: number; fill?: string }> = ({ x, y, text, k, color = C.coralDeep, size = 80, rot = -8, fill = "rgba(255,255,255,.92)" }) => {
  if (k <= 0.001) return null;
  const s = lerp(1.9, 1, Math.min(1, k));
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${s})`, opacity: Math.min(1, k * 2), fontFamily: ROUND, whiteSpace: "nowrap" }}>
      <div style={{ padding: `${size * 0.12}px ${size * 0.38}px`, border: `${size * 0.09}px solid ${color}`, borderRadius: size * 0.36, color, background: fill, fontSize: size, fontWeight: 700, letterSpacing: "0.03em", lineHeight: 1.05, boxShadow: `0 ${size * 0.12}px 0 ${color}55, 0 ${size * 0.3}px ${size * 0.5}px rgba(59,47,92,.25)` }}>{text}</div>
    </div>
  );
};

// 4-point sparkle star
export const Sparkle: React.FC<{ x: number; y: number; s: number; color?: string; rot?: number }> = ({ x, y, s, color = "#ffffff", rot = 0 }) => {
  if (s <= 0.01) return null;
  return (
    <svg width={80} height={80} viewBox="-40 -40 80 80" style={{ position: "absolute", left: x - 40, top: y - 40, transform: `scale(${s}) rotate(${rot}deg)`, overflow: "visible", filter: `drop-shadow(0 0 8px ${color})` }}>
      <path d="M0 -36 C4 -8 8 -4 36 0 C8 4 4 8 0 36 C-4 8 -8 4 -36 0 C-8 -4 -4 -8 0 -36Z" fill={color} />
    </svg>
  );
};

// little flat robot head icon / human head icon / diamond icon for pills
export const RobotIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size * 1.1} height={size} viewBox="0 0 44 40">
    <line x1="22" y1="2" x2="22" y2="9" stroke={C.lavDeep} strokeWidth="3" strokeLinecap="round" />
    <circle cx="22" cy="4" r="3.6" fill={C.coral} />
    <rect x="4" y="9" width="36" height="28" rx="11" fill={C.lav} />
    <rect x="9" y="16" width="26" height="11" rx="5.5" fill="#2e2a55" />
    <circle cx="16" cy="21.5" r="3" fill={C.visor} /><circle cx="28" cy="21.5" r="3" fill={C.visor} />
  </svg>
);
export const HumanIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <circle cx="20" cy="14" r="10" fill={C.skin} />
    <path d="M10 13 C10 4 30 4 30 13 C26 9 14 9 10 13Z" fill={C.hair} />
    <path d="M6 39 C6 27 34 27 34 39Z" fill={C.coral} />
  </svg>
);
export const DiamondIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <path d="M8 14 L14 6 H26 L32 14 L20 35 Z" fill="#bff6ff" stroke="#5fd6e8" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M8 14 H32 M14 6 L18 14 L20 35 M26 6 L22 14 L20 35" stroke="#5fd6e8" strokeWidth="2" fill="none" strokeLinejoin="round" />
  </svg>
);
export const Heart: React.FC<{ x: number; y: number; s: number; color?: string }> = ({ x, y, s, color = C.coral }) =>
  s <= 0.01 ? null : (
    <svg width={60} height={56} viewBox="0 0 60 56" style={{ position: "absolute", left: x - 30, top: y - 28, transform: `scale(${s})`, filter: "drop-shadow(0 6px 8px rgba(59,47,92,.25))" }}>
      <path d="M30 52 C10 38 2 28 2 17 C2 8 9 2 17 2 C23 2 27 6 30 10 C33 6 37 2 43 2 C51 2 58 8 58 17 C58 28 50 38 30 52Z" fill={color} stroke="#fff" strokeWidth="4" />
    </svg>
  );
