import React from "react";
import { OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate, Easing } from "remotion";
import { C, F, FPS } from "../../kit/theme";
import type { View } from "./faceless";

/** A real screen recording of a tool, filling the frame under the captions (floorplan-map, 2026-11-05). Built for the
 *  "someone just made a free X" format Vishnu picked from two 100K+ reels (DfWO1iUS9iu, DfRLKBcp0l8): the product
 *  itself on screen the whole time, nothing drawn. Each shot starts on its phrase, plays the recording from a given
 *  second and moves the camera from one crop to another; a cursor walks to each recorded click and taps it. The last
 *  shot carries the comment keyword. Crops and clicks are in the page's CSS pixels; the video is `scale` times that. */

type Crop = { cx: number; cy: number; w: number };
type Shot = { at?: string; rec: number; rate?: number; from: Crop; to: Crop; move?: number };
type Click = { rec: number; x: number; y: number };

const BOX = { left: 40, top: 420, w: 1000, h: 1380 };
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

const Cursor: React.FC<{ x: number; y: number; tap: number }> = ({ x, y, tap }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0 }}>
    {tap > 0 && tap < 1 ? <div style={{ position: "absolute", left: -40 * tap, top: -40 * tap, width: 80 * tap, height: 80 * tap, borderRadius: 99, border: `4px solid ${C.gold}`, opacity: 1 - tap }} /> : null}
    <svg width={44} height={52} viewBox="0 0 22 26" style={{ position: "absolute", left: -3, top: -2, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))", transform: `scale(${tap > 0 && tap < 0.3 ? 0.88 : 1})`, transformOrigin: "0 0" }}>
      <path d="M2 1 L2 20 L7 15.5 L10.5 23 L13.5 21.7 L10 14.3 L17 14.3 Z" fill="#ffffff" stroke="#111" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  </div>
);

export const ScreenRec: View = {
  View: ({ t0, t1, at, p }) => {
    const now = t0 + useCurrentFrame() / FPS;
    const shots = (p.shots || []) as Shot[];
    const clicks = (p.clicks || []) as Click[];
    const scale = (p.scale as number) || 1;
    const VW = (p.vw as number) || 1600, VH = (p.vh as number) || 1000;
    const starts = shots.map((s, i) => (i === 0 || !s.at ? t0 : at(s.at) - 0.08));
    let cur = 0;
    starts.forEach((s, i) => { if (now >= s) cur = i; });
    const sh = shots[cur];
    const end = cur + 1 < shots.length ? starts[cur + 1] : t1;
    const local = now - starts[cur];
    const rate = sh.rate || 1;
    const recNow = sh.rec + local * rate;
    // the camera: a quick move when the shot asks for one, otherwise a slow push over the whole shot
    const k = sh.move ? interpolate(local, [0, sh.move], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }) : interpolate(now, [starts[cur], end], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
    const cx = sh.from.cx + (sh.to.cx - sh.from.cx) * k, cy = sh.from.cy + (sh.to.cy - sh.from.cy) * k, w = sh.from.w + (sh.to.w - sh.from.w) * k;
    const z = BOX.w / w;  // screen px per CSS px
    const toScreen = (x: number, y: number) => ({ x: BOX.w / 2 + (x - cx) * z, y: BOX.h / 2 + (y - cy) * z });
    // the cursor: rests near the last click, walks to the next one in the 0.7 s before it
    const next = clicks.find((c) => c.rec >= recNow - 0.45);
    const prev = [...clicks].reverse().find((c) => c.rec < (next ? next.rec : Infinity)) || { x: next ? next.x + 160 : VW / 2, y: next ? next.y + 120 : VH / 2, rec: -9 };
    let cur2 = { x: prev.x, y: prev.y }, tap = 0;
    if (next) {
      const walk = interpolate(recNow, [next.rec - 0.75, next.rec - 0.05], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
      cur2 = { x: prev.x + (next.x - prev.x) * walk, y: prev.y + (next.y - prev.y) * walk };
      tap = recNow >= next.rec ? (recNow - next.rec) / 0.45 : 0;
    }
    const cs = toScreen(cur2.x, cur2.y);
    const showCursor = clicks.length > 0 && !(p.noCursorShots || []).includes(cur);
    const kwAt = p.keywordAt ? at(p.keywordAt as string) : Infinity;
    const chip = interpolate(now, [kwAt - 0.1, kwAt + 0.2], [0, 1], clamp);
    const kw = (p.keyword as string) || "";
    const typed = kw.slice(0, Math.max(0, Math.min(kw.length, Math.floor((now - kwAt - 0.25) / 0.08) + 1)));

    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }}>
        <div style={{ position: "absolute", left: BOX.left, top: BOX.top, width: BOX.w, height: BOX.h, borderRadius: 32, overflow: "hidden", background: "#0b0b0d", boxShadow: "0 0 0 2px rgba(255,255,255,0.10), 0 40px 90px rgba(0,0,0,0.5)" }}>
          {shots.map((s, i) => {
            const a = starts[i], b = i + 1 < shots.length ? starts[i + 1] : t1;
            return (
              <Sequence key={i} from={Math.round((a - t0) * FPS)} durationInFrames={Math.max(1, Math.round((b - a) * FPS))} layout="none">
                {i === cur ? (
                  <div style={{ position: "absolute", left: BOX.w / 2 - cx * z, top: BOX.h / 2 - cy * z, width: VW * z, height: VH * z }}>
                    <OffthreadVideo src={staticFile(p.src as string)} startFrom={Math.round(s.rec * FPS)} playbackRate={s.rate || 1} muted style={{ width: "100%", height: "100%" }} />
                  </div>
                ) : null}
              </Sequence>
            );
          })}
          {showCursor ? <Cursor x={cs.x} y={cs.y} tap={tap} /> : null}
          <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,12,0.72)", opacity: chip * 0.85 }} />
          {kw ? (
            <div style={{ position: "absolute", left: 0, right: 0, top: BOX.h / 2 - 60, display: "flex", justifyContent: "center", opacity: chip, transform: `translateY(${(1 - chip) * 24}px)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 22, background: "rgba(255,255,255,0.08)", borderRadius: 999, padding: "20px 40px 20px 20px", boxShadow: "0 0 0 2px rgba(255,255,255,0.10)" }}>
                <div style={{ width: 72, height: 72, borderRadius: 99, background: "rgba(255,255,255,0.14)" }} />
                <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 48, color: "#8b93a3" }}>Comment</div>
                <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 60, color: C.gold, minWidth: 150, letterSpacing: 3 }}>{typed}</div>
              </div>
            </div>
          ) : null}
        </div>
        {p.credit ? <div style={{ position: "absolute", left: BOX.left, width: BOX.w, top: BOX.top + BOX.h + 26, textAlign: "center", fontFamily: F.mono, fontSize: 26, color: "#8b93a3", letterSpacing: 1 }}>{p.credit as string}</div> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const shots = (p.shots || []) as Shot[];
    const clicks = (p.clicks || []) as Click[];
    // a soft click on every recorded click that falls inside its shot
    const starts = shots.map((s, i) => (i === 0 || !s.at ? 0 : at(s.at) - 0.08));
    const out: { t: number; sound: string; gain: number }[] = [];
    shots.forEach((s, i) => {
      const b = i + 1 < shots.length ? starts[i + 1] : 999;
      clicks.forEach((c) => { const t = starts[i] + (c.rec - s.rec) / (s.rate || 1); if (t >= starts[i] && t < b) out.push({ t, sound: "click", gain: 0.2 }); });
    });
    if (p.keywordAt) out.push({ t: at(p.keywordAt as string) + 0.3, sound: "pop", gain: 0.25 });
    return out;
  },
};
