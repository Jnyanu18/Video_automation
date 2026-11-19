// Captions: chunky rounded white words with a plum clay edge; emphasis words sit on a butter pill.
// v6 (c2-bubble approach): a narrow right column (x 692-950 from y 1300), up to 3 lines at 54 -> 42 px; a word wider
// than the column shifts the block left just enough to end at x 950.
import React from "react";
import type { Chunk } from "../captions";
import { isEmph } from "../captions";
import type { Region } from "../Film";
import { lerp, popS, progS } from "../lib";
import { C } from "./parts";
import { INK, ROUND } from "./ui";

// v5 transcript splits: "24" "-7." -> "24/7"; "pattern" "-based" -> "pattern based" (display only)
const disp = (w: string) => {
  const raw = w.replace(/[,.]$/, "");
  if (raw === "-7") return "";
  return raw === "24" ? "24/7" : raw.replace(/^-(?=[a-z])/i, "");
};

let ctx: CanvasRenderingContext2D | null = null;
const measure = (s: string, px: number, em: boolean) => {
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  ctx!.font = `700 ${px}px ${ROUND}`;
  return ctx!.measureText(s).width + (em ? px * 0.52 : 0);
};
type CW = { txt: string; em: boolean; i: number };
const wrap = (ws: CW[], px: number, maxW: number) => {
  const lines: CW[][] = [[]];
  let w = 0;
  const sp = measure(" ", px, false);
  for (const x of ws) {
    const ww = measure(x.txt, px, x.em);
    const cur = lines[lines.length - 1];
    if (cur.length && w + sp + ww > maxW) { lines.push([x]); w = ww; }
    else { w += (cur.length ? sp : 0) + ww; cur.push(x); }
  }
  return lines;
};
const layout = (ws: CW[], r: Region) => {
  for (const px of [54, 50, 46, 42]) {
    const lines = wrap(ws, px, r.w);
    const wide = Math.max(...ws.map((w) => measure(w.txt, px, w.em)));
    if (lines.length <= 3 && wide <= r.w) return { px, x: r.x, w: r.w, lines };
  }
  const px = 42, wide = Math.max(...ws.map((w) => measure(w.txt, px, w.em)));
  const w = Math.max(r.w, wide + 4);
  return { px, x: Math.min(r.x, 950 - w), w, lines: wrap(ws, px, w) };
};

export const DioramaCaption: React.FC<{ t: number; c: Chunk; r: Region }> = ({ t, c, r }) => {
  const ws: CW[] = c.words.map((w, i) => ({ txt: disp(w.w), em: isEmph(w.w), i })).filter((w) => w.txt);
  if (!ws.length) return null;
  const L = layout(ws, r);
  const size = L.px;
  const k = popS(t, c.s, 14), out = 1 - progS(t, c.e - 0.12, 0.12);
  return (
    <div style={{ position: "absolute", left: L.x, top: r.y, width: L.w, textAlign: r.align, fontFamily: ROUND, fontWeight: 700, fontSize: size, lineHeight: 1.2, color: "#fff", opacity: out, transform: `translateY(${(1 - k) * 16}px)` }}>
      {L.lines.map((ln, li) => (
        <div key={li} style={{ whiteSpace: "nowrap" }}>
          {ln.map((x, j) => {
            const w = c.words[x.i];
            const on = t >= w.s - 0.04;
            const wk = popS(t, w.s - 0.04, 12);
            const style: React.CSSProperties = x.em
              ? { display: "inline-block", background: C.butter, color: INK, borderRadius: size * 0.32, padding: `0 ${size * 0.2}px ${size * 0.06}px`, boxShadow: `0 ${size * 0.1}px 0 ${C.butterDeep}`, transform: `scale(${on ? lerp(0.7, 1, wk) : 0.9}) rotate(${on ? -2 : 0}deg)`, opacity: on ? 1 : 0.55, margin: `0 ${size * 0.06}px` }
              : { display: "inline-block", textShadow: `0 3px 0 ${INK}, 0 6px 0 ${INK}, 0 0 10px rgba(59,47,92,.6), 0 10px 18px rgba(59,47,92,.45)`, opacity: on ? 1 : 0.55 };
            return <React.Fragment key={j}>{j > 0 ? " " : ""}<span style={style}>{x.txt}</span></React.Fragment>;
          })}
        </div>
      ))}
    </div>
  );
};
