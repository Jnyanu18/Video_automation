import React from "react";
import { lerp, progS } from "../lib";
import { type V3, project } from "./cam";
import { SANS } from "./fonts";
import { rigAt, toWorld, type SetId } from "./rig";

export const AMBER = "#ffbf3c", CYAN = "#5ee7ff", MAGENTA = "#ff5fd2";

// screen point of a set-local 3D point at time t
export const anchor = (t: number, set: SetId, p: V3) => {
  const [x, y, d] = project(rigAt(t).pose, toWorld(set, p));
  return { x, y, ok: d > 0 };
};

export type ChipProps = { x: number; y: number; text: string; k: number; color?: string; size?: number; align?: "left" | "center" | "right"; weight?: number; glass?: boolean; sub?: string; glitch?: number; t?: number };
export const Chip: React.FC<ChipProps> = ({ x, y, text, k, color = "#eaf8ff", size = 32, align = "center", weight = 700, glass = true, sub, glitch = 0, t = 0 }) => {
  if (k <= 0.001) return null;
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  const edge = color === AMBER ? "255,191,60" : color === MAGENTA ? "255,95,210" : "94,231,255";
  const j = glitch > 0 ? Math.sin(t * 91) * 6 * glitch : 0;
  return (
    <div style={{ position: "absolute", left: x + j, top: y, transform: `translate(${tx}, -50%) scale(${lerp(0.86, 1, k)})`, transformOrigin: align === "left" ? "0 50%" : align === "right" ? "100% 50%" : "50% 50%", opacity: Math.min(1, k * 1.3), fontFamily: SANS, whiteSpace: "nowrap" }}>
      <div style={{
        padding: glass ? `${size * 0.36}px ${size * 0.62}px` : 0, borderRadius: size * 0.55,
        background: glass ? "linear-gradient(180deg, rgba(255,255,255,.13), rgba(120,110,255,.07))" : undefined,
        border: glass ? `2px solid rgba(${edge},.55)` : undefined,
        boxShadow: glass ? `0 0 26px rgba(${edge},.28), inset 0 1px 0 rgba(255,255,255,.25), 0 10px 30px rgba(7,5,28,.55)` : undefined,
        backdropFilter: glass ? "blur(10px)" : undefined,
        color, fontSize: size, fontWeight: weight, letterSpacing: "-0.005em", lineHeight: 1.1,
        textShadow: glitch > 0 ? `${3 * glitch}px 0 rgba(94,231,255,.8), ${-3 * glitch}px 0 rgba(255,95,210,.9), 0 2px 10px rgba(7,5,28,.8)` : "0 2px 10px rgba(7,5,28,.8)",
      }}>
        {text}
        {sub && <div style={{ fontSize: size * 0.56, fontWeight: 600, color: "rgba(234,248,255,.78)", marginTop: size * 0.18 }}>{sub}</div>}
      </div>
    </div>
  );
};
export const win = (t: number, a: number, b: number, fin = 0.3, fout = 0.3) => progS(t, a, fin) * (1 - progS(t, b - fout, fout));

