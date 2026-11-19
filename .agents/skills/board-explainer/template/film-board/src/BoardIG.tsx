import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { DrawItem, Pencil, Item, progress, partial, HAND } from "./Board";
import ITEMS from "./items_ig.json";
import TL from "./timeline_ig.json";

/*
 * Instagram 9:16 board. Pages stacked vertically (page b at y = b*1920); the camera scrolls down between pages.
 * Madhav's cut-out (bottom-left, mirrored, ~50% of screen) is composited afterwards with ffmpeg; graphics live in the
 * top band and right column while he speaks. Captions: just above his head on his lines, near the bottom on VO lines.
 */
const FPS = 30;
const D = ITEMS as unknown as { total: number; boards: { b: number; t0: number }[]; items: Item[] };
type Seg = { id: string; who: string; t0: number; t1: number; words: { w: string; s: number; e: number }[] };
const SEGS = (TL as unknown as { segments: Seg[] }).segments;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const inOut = Easing.bezier(0.45, 0, 0.55, 1);

const camY = (t: number) => {
  let y = 0;
  for (let i = 1; i < D.boards.length; i++) {
    const a = D.boards[i - 1], b = D.boards[i];
    if (t < b.t0) return a.b * 1920;
    y = interpolate(t, [b.t0, b.t0 + 0.7], [a.b * 1920, b.b * 1920], { ...clamp, easing: inOut });
    if (t < b.t0 + 0.7) return y;
  }
  return y;
};

// Whisper spellings of his Hinglish, fixed for captions
const FIX: Record<string, string> = { Shadiq: "shaadi", Mamey: "mami", Gray: "grey" };
const fixWord = (w: string) => {
  const core = w.replace(/[.,?!]/g, "");
  return FIX[core] ? w.replace(core, FIX[core]) : w;
};
type Chunk = { s: number; e: number; text: string; face: boolean };
const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  for (const sg of SEGS) {
    const ws = sg.words.map((w) => ({ ...w, w: fixWord(w.w) }));
    for (let i = 0; i < ws.length - 2; i++) {
      if (ws[i].w === "PHP" && ws[i + 1].w === "2" && /^shell/i.test(ws[i + 2].w)) {
        ws[i] = { ...ws[i], w: "PHP2Shell" + ws[i + 2].w.slice(5), e: ws[i + 2].e };
        ws.splice(i + 1, 2);
      }
    }
    let cur: { w: string; s: number; e: number }[] = [];
    ws.forEach((w, i) => {
      cur.push(w);
      const end = /[.?!]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 3) || cur.length >= 6 || i === ws.length - 1;
      if (end) {
        out.push({ s: cur[0].s, e: cur[cur.length - 1].e, text: cur.map((c) => c.w).join(" "), face: sg.who === "F" });
        cur = [];
      }
    });
  }
  return out.map((c, i) => ({ ...c, e: Math.min(out[i + 1]?.s ?? c.e + 0.6, c.e + 0.5) }));
})();
const KEY = /^(junk|real|attacker'?s?|shell|PHP2Shell|stranger|OUT|memory|12|10|patch|update|restart|sticky|note)$/i;

const Captions: React.FC<{ t: number; fr: number }> = ({ t, fr }) => {
  const c = CHUNKS.find((k) => t >= k.s - 0.03 && t < k.e);
  if (!c) return null;
  const o = interpolate(fr, [Math.round(c.s * FPS) - 2, Math.round(c.s * FPS) + 2], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: c.face ? 676 : 1540, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ padding: "8px 22px", borderRadius: 16, background: "rgba(10,10,12,0.78)", fontFamily: HAND, fontWeight: 700, fontSize: 46, lineHeight: 1.15, color: "#f2f0ea", textAlign: "center" }}>
        {c.text.split(" ").map((w, i) => (
          <span key={i} style={{ color: KEY.test(w.replace(/[^\w']/g, "")) ? "#ffd84a" : undefined }}>{w} </span>
        ))}
      </div>
    </div>
  );
};

export const BoardIG: React.FC = () => {
  const fr = useCurrentFrame(), t = fr / FPS;
  const cy = camY(t);
  const panning = D.boards.some((b, i) => i > 0 && t >= b.t0 && t < b.t0 + 0.7);
  let head: number[] | null = null;
  for (const it of D.items) {
    const p = progress(it, t);
    if (p > 0 && p < 1 && (it.kind === "stroke" || it.kind === "text")) {
      if (it.kind === "stroke") {
        const h = partial(it.pts!, p).head;
        head = [h[0], h[1] + it.board * 1920];
      } else head = [it.x! + it.text!.length * it.size! * 1.1 * 0.5 * p, it.y! - it.size! * 0.3 + it.board * 1920];
    }
  }
  const visible = D.items.filter((it) => Math.abs(it.board * 1920 - cy) < 2000 && it.t0 <= t);
  return (
    <AbsoluteFill style={{ background: "#050505" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, filter: panning ? "blur(1.5px)" : undefined }}>
        <defs>
          <filter id="pencil" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={4} result="wob" />
            <feDisplacementMap in="SourceGraphic" in2="wob" scale={2.2} xChannelSelector="R" yChannelSelector="G" result="d" />
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves={1} seed={9} result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.25" result="ga" />
            <feComposite in="d" in2="ga" operator="in" />
          </filter>
        </defs>
        <g transform={`translate(0 ${-cy})`}>
          <g filter="url(#pencil)">
            {visible.map((it, i) => (
              <g key={i} transform={`translate(0 ${it.board * 1920})`}>
                <DrawItem it={{ ...it, board: 0 }} t={t} fr={fr} />
              </g>
            ))}
          </g>
          {head && <Pencil x={head[0]} y={head[1]} o={1} />}
        </g>
      </svg>
      <Captions t={t} fr={fr} />
      <Audio src={staticFile("mix_ig.wav")} />
    </AbsoluteFill>
  );
};
