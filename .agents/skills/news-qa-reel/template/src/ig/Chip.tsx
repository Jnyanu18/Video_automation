// Glass chip for short labels and fact chips ("US tariff on Chinese EVs: 100%+", "Madhav's take: ..."). `w` = fixed
// width that wraps (right column). Restyle per world; keep one primary motion (a small scale-in) and a hold.
import React from "react";
import { lerp } from "../lib";
import { CYAN, GOLD, MAGENTA, MINT, UI_FONT } from "./theme";

const rgb = (c: string) => (c === GOLD ? "255,201,74" : c === MAGENTA ? "255,95,210" : c === MINT ? "77,255,157" : "94,231,255");
type P = { x: number; y: number; text: React.ReactNode; k: number; color?: string; size?: number; align?: "left" | "center" | "right"; sub?: React.ReactNode; w?: number };
export const Chip: React.FC<P> = ({ x, y, text, k, color = CYAN, size = 40, align = "center", sub, w }) => {
  if (k <= 0.001) return null;
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  const e = rgb(color);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, transform: `translate(${tx}, -50%) scale(${lerp(0.9, 1, k)})`, transformOrigin: align === "left" ? "0 50%" : "50% 50%", opacity: Math.min(1, k * 1.3), fontFamily: UI_FONT, whiteSpace: w ? "normal" : "nowrap", textAlign: align === "left" ? "left" : "center" }}>
      <div style={{ padding: `${size * 0.3}px ${size * 0.5}px`, borderRadius: size * 0.55, background: "linear-gradient(180deg, rgba(14,22,56,.84), rgba(6,10,30,.78))", border: `2px solid rgba(${e},.7)`, boxShadow: `0 0 26px rgba(${e},.32), 0 12px 34px rgba(0,0,0,.6)`, color: "#f2f7ff", fontSize: size, fontWeight: 700, lineHeight: 1.1, textShadow: "0 2px 10px rgba(0,0,0,.8)" }}>
        {text}
        {sub && <div style={{ fontSize: Math.max(30, size * 0.8), fontWeight: 700, color: `rgba(${e},1)`, marginTop: size * 0.12 }}>{sub}</div>}
      </div>
    </div>
  );
};
