import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as lAnton } from "@remotion/google-fonts/Anton";
import { loadFont as lBungee } from "@remotion/google-fonts/Bungee";
import { loadFont as lCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as lMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as lVT } from "@remotion/google-fonts/VT323";
import { FPS, Word } from "../../kit/theme";
import { chunk } from "../../kit/Captions";

// layout: split (Vishnu, 2026-10-23): he talks in the bottom half, and the top half is a live feed of panels that
// change every 3 to 4 seconds, so nothing ever covers his face. Each panel is drawn in one of the studio's art
// styles (.claude/skills/art-styles): kinetic type, a CRT terminal, a pop-art alert, a taped screenshot (paper
// cutout), a Swiss number, a doodle note, a Swiss table.

const o = { subsets: ["latin" as const] };
const ANTON = lAnton("normal", { weights: ["400"], ...o }).fontFamily;
const BUNGEE = lBungee("normal", { weights: ["400"], ...o }).fontFamily;
const CAVEAT = lCaveat("normal", { weights: ["700"], ...o }).fontFamily;
const MARKER = lMarker("normal", { weights: ["400"], ...o }).fontFamily;
const VT = lVT("normal", { weights: ["400"], ...o }).fontFamily;
const HELV = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const W = 1080;
export const HALF = 960;

export type PanelBeat = { kind: "panel"; at: number; dur: number; sound?: string | null; look: string; parts: string[] };

const useIn = (delay = 0, damping = 12) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 180, mass: 0.6 } });
};

/** Kinetic type: each line slams in on its own, sized to fill the width. A line starting with * is yellow. */
const Kinetic: React.FC<{ parts: string[] }> = ({ parts }) => (
  <AbsoluteFill style={{ background: "#0b0b0b", justifyContent: "center", padding: "0 40px", gap: 6 }}>
    {parts.map((raw, i) => {
      const hot = raw.startsWith("*");
      const line = hot ? raw.slice(1) : raw;
      const p = useIn(i * 5, 14);
      const size = Math.min(300, 1000 / (line.length * 0.46));
      return (
        <div key={i} style={{ fontFamily: ANTON, fontSize: size, lineHeight: 0.92, color: hot ? "#FFE14D" : "#fff", textTransform: "uppercase",
          transform: `translateY(${(1 - p) * 80}px) scale(${0.8 + 0.2 * p})`, opacity: Math.min(1, p * 2), whiteSpace: "nowrap" }}>{line}</div>
      );
    })}
  </AbsoluteFill>
);

const GREEN = "#39FF6A";
/** A green terminal: the lines type out one after another over the first two thirds of the panel. */
const Term: React.FC<{ parts: string[] }> = ({ parts }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const total = parts.reduce((n, l) => n + l.length, 0);
  const shown = Math.floor(interpolate(frame, [4, Math.max(8, durationInFrames * 0.65)], [0, total], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  let left = shown;
  return (
    <AbsoluteFill style={{ background: "#041a0a", padding: "80px 60px", fontFamily: VT, color: GREEN, textShadow: `0 0 8px ${GREEN}, 0 0 22px rgba(57,255,106,0.5)` }}>
      <div style={{ fontSize: 44, opacity: 0.8, marginBottom: 30 }}>SECURITY.LOG</div>
      {parts.map((l, i) => {
        const take = Math.max(0, Math.min(l.length, left));
        left -= l.length;
        const red = l.startsWith("!");
        const text = red ? l.slice(1) : l;
        return (
          <div key={i} style={{ fontSize: 66, lineHeight: 1.15, color: red ? "#FF4D4D" : GREEN, textShadow: red ? "0 0 10px #FF4D4D" : undefined }}>
            {text.slice(0, Math.max(0, take - (red ? 1 : 0)))}
            {take > 0 && take < l.length ? "_" : ""}
          </div>
        );
      })}
      <AbsoluteFill style={{ background: "repeating-linear-gradient(rgba(0,0,0,0.38) 0 2px, transparent 2px 5px)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)" }} />
    </AbsoluteFill>
  );
};

const burst = (n = 14, r1 = 50, r2 = 37) =>
  `polygon(${Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI * i) / n;
    const r = i % 2 ? r2 : r1;
    return `${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`;
  }).join(",")})`;
/** Pop art: a red starburst slams in and shakes, with a speech box under it. */
const Alert: React.FC<{ parts: string[] }> = ({ parts }) => {
  const frame = useCurrentFrame();
  const p = useIn(0, 8);
  const shake = frame < 14 ? Math.sin(frame * 2.2) * (14 - frame) * 0.9 : 0;
  const q = useIn(8, 12);
  return (
    <AbsoluteFill style={{ background: "#FFE600", backgroundImage: "radial-gradient(#FF3B3B 22%, transparent 23%)", backgroundSize: "30px 30px", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <div style={{ transform: `scale(${p}) rotate(${-6 + shake}deg)`, clipPath: burst(), background: "#111", width: 640, height: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ clipPath: burst(), background: "#FF3B3B", width: 610, height: 470, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: BUNGEE, fontSize: 92, color: "#FFE600", textAlign: "center", lineHeight: 1 }}>{parts[0]}</div>
      </div>
      {parts[1] ? (
        <div style={{ transform: `scale(${q}) rotate(2deg)`, background: "#fff", border: "8px solid #111", borderRadius: 30, padding: "18px 34px", fontFamily: BUNGEE, fontSize: 46, color: "#111", textAlign: "center", maxWidth: 940 }}>{parts[1]}</div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Paper cutout: the screenshot is slapped down on kraft paper and taped, with a marker note. */
export const Shot: React.FC<{ parts: string[] }> = ({ parts }) => {
  const p = useIn(0, 11);
  const q = useIn(10, 12);
  return (
    <AbsoluteFill style={{ background: "#C8A27A", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", transform: `scale(${1.25 - 0.25 * p}) rotate(${-3 * p}deg)`, opacity: Math.min(1, p * 2), background: "#fff", padding: 14, boxShadow: "0 18px 30px rgba(0,0,0,0.4)" }}>
        <Img src={staticFile(parts[0])} style={{ display: "block", width: 900, maxHeight: 720, objectFit: "contain" }} />
        <div style={{ position: "absolute", left: -30, top: -18, width: 190, height: 50, background: "rgba(255,244,200,0.8)", transform: "rotate(-14deg)" }} />
        <div style={{ position: "absolute", right: -30, bottom: -12, width: 190, height: 50, background: "rgba(255,244,200,0.8)", transform: "rotate(-10deg)" }} />
      </div>
      {parts[1] ? (
        <div style={{ position: "absolute", bottom: 60, right: 60, transform: `scale(${q}) rotate(-4deg)`, background: "#1b1b1b", color: "#fff", fontFamily: MARKER, fontSize: 50, padding: "8px 26px" }}>{parts[1]}</div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Swiss: one enormous red number, counting up if it is a number, with its label on a black rule. */
const Count: React.FC<{ parts: string[] }> = ({ parts }) => {
  const frame = useCurrentFrame();
  const m = parts[0].match(/^(\D*)([\d.]+)(.*)$/);
  const target = m ? parseFloat(m[2]) : 0;
  const dec = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const v = m ? interpolate(frame, [0, 16], [0, target], { extrapolateRight: "clamp" }) : 0;
  const shown = m ? `${m[1]}${v.toFixed(dec)}${m[3]}` : parts[0];
  return (
    <AbsoluteFill style={{ background: "#fff", padding: "60px 60px", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", left: 60, top: 60, fontFamily: HELV, fontWeight: 700, fontSize: 34, textTransform: "uppercase", letterSpacing: 2, color: "#111" }}>{parts[2] ?? ""}</div>
      <div style={{ fontFamily: HELV, fontWeight: 700, fontSize: Math.min(520, 1500 / Math.max(2, shown.length)), lineHeight: 0.8, letterSpacing: -20, color: "#E30613", marginLeft: -14 }}>{shown}</div>
      <div style={{ height: 10, background: "#111", margin: "34px 0 18px" }} />
      <div style={{ fontFamily: HELV, fontWeight: 700, fontSize: 64, lineHeight: 1, color: "#111", letterSpacing: -2 }}>{parts[1] ?? ""}</div>
    </AbsoluteFill>
  );
};

/** A doodle note: handwritten lines appear one by one, the last is circled in red pen and ticked. */
const Doodle: React.FC<{ parts: string[] }> = ({ parts }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const step = Math.max(6, Math.floor((durationInFrames * 0.6) / parts.length));
  const circle = interpolate(frame, [step * parts.length, step * parts.length + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "repeating-linear-gradient(#fdfdf8 0 70px, #a9c7ea 70px 73px)", padding: "90px 70px 0 150px" }}>
      <div style={{ position: "absolute", left: 110, top: 0, bottom: 0, width: 4, background: "#e88" }} />
      {parts.map((l, i) => {
        const on = frame >= i * step;
        const last = i === parts.length - 1;
        return (
          <div key={i} style={{ position: "relative", fontFamily: CAVEAT, fontSize: 104, lineHeight: 1.3, color: last ? "#e53935" : "#1d2a4d", opacity: on ? 1 : 0,
            transform: `translateX(${on ? 0 : -20}px)`, alignSelf: "flex-start", display: "inline-block" }}>
            {l}
            {last ? (
              <svg width="760" height="200" style={{ position: "absolute", left: -40, top: -20, overflow: "visible" }}>
                <ellipse cx="360" cy="90" rx="380" ry="90" fill="none" stroke="#e53935" strokeWidth="7" strokeDasharray="2400" strokeDashoffset={2400 * (1 - circle)} transform="rotate(-3 360 90)" />
              </svg>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Swiss table: what to run, one row per thing, sliding in down the grid. Rows are "Name: detail". */
export const Versions: React.FC<{ parts: string[]; title?: string; tall?: boolean }> = ({ parts, title = "Run at least", tall = false }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#fff", padding: tall ? "150px 60px" : "60px 60px", gap: tall ? 40 : 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "10px solid #111", paddingBottom: 14 }}>
        <div style={{ fontFamily: HELV, fontWeight: 700, fontSize: tall ? 100 : 70, letterSpacing: -3, color: "#111", lineHeight: 0.9 }}>{title}</div>
        <div style={{ width: tall ? 90 : 60, height: tall ? 90 : 60, background: "#E30613" }} />
      </div>
      {parts.map((row, i) => {
        const [name, ...rest] = row.split(":");
        const p = interpolate(frame, [4 + i * 5, 14 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 24, borderBottom: "3px solid #111", paddingBottom: tall ? 24 : 12, opacity: p, transform: `translateX(${(1 - p) * 60}px)` }}>
            <div style={{ fontFamily: HELV, fontWeight: 700, fontSize: tall ? 58 : 50, color: "#E30613", width: tall ? 330 : 280, flexShrink: 0 }}>{name.trim()}</div>
            <div style={{ fontFamily: HELV, fontWeight: 700, fontSize: tall ? 50 : 44, color: "#111", lineHeight: 1.15 }}>{rest.join(":").trim()}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Panel: React.FC<{ beat: PanelBeat }> = ({ beat }) => {
  const p = beat.parts;
  switch (beat.look) {
    case "kinetic":
      return <Kinetic parts={p} />;
    case "term":
      return <Term parts={p} />;
    case "alert":
      return <Alert parts={p} />;
    case "shot":
      return <Shot parts={p} />;
    case "count":
      return <Count parts={p} />;
    case "doodle":
      return <Doodle parts={p} />;
    case "versions":
      return <Versions parts={p} />;
    default:
      return <Kinetic parts={[beat.look, ...p]} />;
  }
};

/** Captions on the seam between the halves: big condensed caps, white with a black edge, the spoken word yellow. */
export const SeamCaptions: React.FC<{ words: Word[] }> = ({ words }) => {
  const t = useCurrentFrame() / FPS;
  const group = chunk(words, 3, true).find((g) => t >= g[0].start - 0.05 && t <= g[g.length - 1].end + 0.25);
  if (!group) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 22, fontFamily: ANTON, fontSize: 92, lineHeight: 1, textTransform: "uppercase" }}>
      {group.map((w, i) => {
        const on = t >= w.start && t <= w.end + 0.08;
        return (
          <span key={i} style={{ color: on ? "#FFE14D" : "#fff", WebkitTextStroke: "3px #000", paintOrder: "stroke fill",
            textShadow: "0 6px 0 #000, 0 10px 24px rgba(0,0,0,0.6)", transform: on ? "scale(1.08)" : undefined, display: "inline-block" }}>
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

export { W as SPLIT_W };
