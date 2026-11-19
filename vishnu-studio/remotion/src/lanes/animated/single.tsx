import React from "react";
import { AbsoluteFill, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { C, F, FPS, Word } from "../../kit/theme";
import { AvaRig, POSES, Pose, blend } from "../../kit/ava";
import { SCENES, Ctx, Hit, finder, norm, Roll, StageTop } from "./faceless";
import peaksJson from "../../../../videos/_sfx/cc0/peaks.json";

// The single-take engine (2026-10-26), built after studying how adilet.fndr makes a reel
// (research/2026-10-26-how-adilet-builds-a-reel.md). One fixed frame for the whole video: the spoken line on top,
// a stage in the middle where each object pushes the last one out (never a cut), and Ava big at the bottom acting
// every line with a pose. The background floods to a new colour for a change of mood. A sound on every event.
// The views (what sits on the stage) are shared with faceless.tsx.

const PEAKS = peaksJson as Record<string, number>;
const PAPER = "#f3f1ec";
const EXIT = 0;  // plain cuts: a scene ends on the frame the next begins

export type SingleSpec = {
  scene: string;
  at: string;
  bg?: string;
  mark?: string[];
  poses?: { on: string; pose: string }[];
  tally?: string;
  tallyOn?: string;
  props?: Record<string, unknown>;
};

const dark = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 128;
};

const LINE_TOP = 150;
/** Captions are two or three words, so they always fit in two lines at one size. */
const CAP = 92;
const lineLayout = (_chars: number) => ({ size: CAP, bottom: LINE_TOP + 2 * CAP * 1.16 });

/** The words in caption chunks: a chunk ends at punctuation or after three words. */
const chunked = (words: Word[]) => {
  const out: Word[][] = [];
  let c: Word[] = [];
  words.forEach((w) => {
    const tail = c.length ? c : out[out.length - 1];
    // Whisper splits "20,000" into "20" and ",000": show it as one word
    if (tail && /^[,.]/.test(w.w)) { tail[tail.length - 1] = { ...tail[tail.length - 1], w: tail[tail.length - 1].w + w.w }; return; }
    c.push(w);
    if (c.length >= 3 || /[.,!?;:]$/.test(w.w)) { out.push(c); c = []; }
  });
  if (c.length) out.push(c);
  return out;
};

// A solid black outline drawn behind the letters (a stroke drawn over them makes them look hollow), plus a soft drop.
const OUTLINE = [...Array(16)].map((_, i) => `${(Math.cos((i / 16) * Math.PI * 2) * 6).toFixed(1)}px ${(Math.sin((i / 16) * Math.PI * 2) * 6).toFixed(1)}px 0 #1e2029`)
  .concat("0 8px 14px rgba(0,0,0,0.35)").join(", ");

/** TikTok-style captions (Vishnu, 2026-10-29: "never italic serifs", they read as AI): a chunk of two or three words
 *  in heavy white sans with a black outline, readable on any background, the word being said in gold. */
const Line: React.FC<{ words: Word[]; now: number; mark: Set<string>; size?: number; top?: number }> = ({ words, now, mark, size = CAP, top = LINE_TOP }) => {
  const chunks = chunked(words);
  const cur = [...chunks].reverse().find((c) => c[0].start <= now + 0.04);
  if (!cur) return null;
  const k = chunks.indexOf(cur);
  const prev = k > 0 ? chunks[k - 1][chunks[k - 1].length - 1] : null;
  const live = [...cur].reverse().find((w) => w.start <= now + 0.04);
  return (
    <div style={{ position: "absolute", top, left: 70, right: 70, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: size,
      lineHeight: 1.16, color: "#ffffff", textShadow: OUTLINE, letterSpacing: 1 }}>
      {cur.map((w, i) => {
        const before = i ? cur[i - 1] : prev;
        // the comment keyword is said in capitals: "Comment JARVIS"
        const text = before && ["me", "comment"].includes(norm(before.w)) && mark.has(norm(w.w)) ? w.w.replace(/[a-z]+/i, (m) => m.toUpperCase()) : w.w;
        return <span key={i} style={{ display: "inline-block", margin: "0 0.17em", color: w === live ? C.gold : "#ffffff" }}>{text}</span>;
      })}
    </div>
  );
};

/** Clean captions for the "dev" look (Vishnu, 2026-10-30, build-your-own-x): light sans, the chunk builds word by
 *  word as it is said, each word easing in from a slight blur, the spoken word in gold. Never serif or italic. */
const CleanLine: React.FC<{ words: Word[]; now: number; mark: Set<string>; light?: boolean }> = ({ words, now, mark, light }) => {
  const chunks = chunked(words);
  const cur = [...chunks].reverse().find((c) => c[0].start <= now + 0.04);
  if (!cur) return null;
  const k = chunks.indexOf(cur);
  const prev = k > 0 ? chunks[k - 1][chunks[k - 1].length - 1] : null;
  const live = [...cur].reverse().find((w) => w.start <= now + 0.04);
  return (
    <div style={{ position: "absolute", top: LINE_TOP, left: 70, right: 70, textAlign: "center", fontFamily: F.body, fontWeight: 600, fontSize: 80,
      lineHeight: 1.18, color: light ? "#14151a" : "#ffffff", letterSpacing: 0.5 }}>
      {cur.map((w, i) => {
        const before = i ? cur[i - 1] : prev;
        const text = before && ["me", "comment"].includes(norm(before.w)) && mark.has(norm(w.w)) ? w.w.replace(/[a-z]+/i, (m) => m.toUpperCase()) : w.w;
        const a = Math.min(1, Math.max(0, (now - w.start + 0.04) / 0.14));
        // on a light background gold is a fill, never thin text on white (brand): the word being said sits on a gold block
        const said = w === live;
        return <span key={i} style={{ display: "inline-block", margin: "0 0.16em", opacity: a, filter: `blur(${(1 - a) * 8}px)`, transform: `translateY(${(1 - a) * 10}px)`,
          color: light ? "#14151a" : said ? C.gold : "#ffffff", background: light && said ? C.gold : "transparent", borderRadius: 12, padding: light ? "0 0.12em" : 0 }}>{text}</span>;
      })}
    </div>
  );
};

/** Ava at the bottom centre, cropped at the waist, acting. Each pose change lands with a squash and an overshoot. */
const Actor: React.FC<{ now: number; cues: { t: number; pose: Pose }[]; words: Word[]; hop: number; size?: number; left?: number; top?: number }> = ({ now, cues, words, hop, size = 720, left = 540 - 360, top = 1340 }) => {
  let i = 0;
  cues.forEach((c, k) => { if (now >= c.t) i = k; });
  const prev = cues[Math.max(0, i - 1)].pose, cur = cues[i].pose;
  const since = now - cues[i].t;
  const k = i === 0 ? 1 : spring({ frame: since * FPS, fps: FPS, config: { damping: 9, stiffness: 210, mass: 0.6 } });
  const pose = blend(prev, cur, k);
  const squash = i === 0 ? 0 : Math.exp(-since * 9) * Math.sin(since * 30) * 0.05;
  const talking = words.some((w) => now >= w.start && now <= w.end + 0.05);
  const talk = talking ? 0.5 + 0.5 * Math.sin(now * 34) : 0;
  const blink = (now % 3.3) > 3.18 ? 0.15 : 1;
  const bob = Math.sin(now * 2.4) * 12;
  const enter = spring({ frame: now * FPS, fps: FPS, config: { damping: 12, stiffness: 120 } });
  return (
    <div style={{ position: "absolute", left, top: top + bob * (size / 720) - Math.sin(Math.min(1, hop) * Math.PI) * 40 * (size / 720) + (1 - enter) * 500,
      transform: `scale(${1 - squash}, ${1 + squash})`, transformOrigin: "50% 100%" }}>
      <AvaRig pose={pose} size={size} talk={talk} blink={blink} />
    </div>
  );
};

/** The stage: plain cuts (Vishnu, 2026-10-29): a scene's object is there from its first frame to its last, with no
 *  fade, blur or slide between scenes. Motion lives inside the views (parts popping in on their words). */
const Stage: React.FC<{ now: number; t0: number; t1: number; children: React.ReactNode; last: boolean; camera: number; scale: number; lift: number }> = ({ children, camera, scale, lift }) => (
  <AbsoluteFill style={{ transform: `translateY(${-lift}px) scale(${scale * camera})`, transformOrigin: "50% 42%" }}>{children}</AbsoluteFill>
);

/** A new background colour, cut in on its scene's first frame. */
const Flood: React.FC<{ now: number; at: number; color: string }> = ({ now, at, color }) => (now >= at ? <AbsoluteFill style={{ background: color }} /> : null);

export const Single: React.FC<{ slug: string; specs: SingleSpec[]; words: Word[]; seconds: number }> = ({ slug, specs, words, seconds }) => {
  const now = useCurrentFrame() / FPS;
  const find = finder(words);
  const starts: number[] = [];
  specs.forEach((s, i) => starts.push(i === 0 ? 0 : Math.max(starts[i - 1] + 0.3, find(s.at, starts[i - 1]) - 0.15)));
  const ctxs: Ctx[] = specs.map((s, i) => ({ t0: starts[i], t1: i + 1 < specs.length ? starts[i + 1] : seconds, at: (ph: string) => find(ph, starts[i]), p: s.props || {}, words }));
  let cur = 0;
  starts.forEach((t, k) => { if (now >= t) cur = k; });

  // Background: each scene may flood a new colour; it holds until another scene floods again.
  const bgs: { at: number; color: string }[] = [];
  specs.forEach((s, i) => { if (s.bg && s.bg !== (bgs.length ? bgs[bgs.length - 1].color : PAPER)) bgs.push({ at: starts[i], color: s.bg }); });
  const bgNow = [...bgs].reverse().find((b) => now >= b.at)?.color || PAPER;
  const onDark = dark(bgNow);

  // The "dev" look (build-your-own-x, 2026-10-30): no Ava, clean captions; the view owns the whole frame.
  const dev = specs[0].props?.look === "dev";
  // ...with Ava small on the side, acting and pointing at what builds (claude-code-backdoor, 2026-10-30)
  const side = specs[0].props?.ava === "side";
  // Ava's performance: every scene's poses on their words, idle at the start.
  const cues = [{ t: 0, pose: POSES.wave }, ...specs.flatMap((s, i) => (s.poses || []).map((p) => ({ t: ctxs[i].at(p.on) - 0.08, pose: POSES[p.pose] || POSES.idle })))].sort((a, b) => a.t - b.t);

  // Sound: the views' own hits, a tick on every marked word, a soft swish on each pose. A cut has no whoosh: plain
  // cuts carry no transition sound (Vishnu, 2026-10-29).
  const marked = specs.flatMap((s, i) => {
    const m = new Set((s.mark || []).map(norm));
    return words.filter((w) => w.start >= starts[i] && w.start < ctxs[i].t1 && m.has(norm(w.w))).map((w) => ({ t: w.start, sound: "tick", gain: 0.22 }));
  });
  const hits: Hit[] = [
    { t: 0.05, sound: "sparkle", gain: 0.35 },
    ...specs.flatMap((s, i) => SCENES[s.scene].hits(ctxs[i])),
    ...marked,
    ...(dev ? [] : cues.slice(1).map((c) => ({ t: c.t + 0.05, sound: "swish", gain: 0.1 }))),  // the dev look: no swish per pose (too many sounds, 2026-10-31)
  ];
  // The tally: a running number top right ("RISK $5,000"), one value per scene that sets one.
  const tallies = specs.map((s, i) => (s.tally ? { at: s.tallyOn ? ctxs[i].at(s.tallyOn) : starts[i] + 0.3, value: s.tally } : null)).filter((x): x is { at: number; value: string } => x !== null);
  const tallyNow = [...tallies].reverse().find((x) => now >= x.at);
  const tallyLabel = (specs[0].props?.tallyLabel as string) || "RISK";
  const stageScale = (specs[0].props?.stageScale as number) || 0.86;
  const stageLift = (specs[0].props?.stageLift as number) ?? 110;
  // A video may shrink the captions and Ava to give the stage more room (fridge-hack-news, 2026-11-03); the defaults are every other video's.
  const capSize = (specs[0].props?.capSize as number) || CAP;
  const lineTop = (specs[0].props?.lineTop as number) ?? LINE_TOP;
  const avaSize = (specs[0].props?.avaSize as number) || 720;
  const avaTop = (specs[0].props?.avaTop as number) ?? 1340;
  // The tallest sentence spoken in a scene sets how low its objects must start (in the view's own coordinates,
  // before the stage's scale and lift), so text and objects never overlap (Vishnu, 2026-10-27).
  const sentences: { start: number; chars: number }[] = [];
  words.forEach((w, k) => {
    if (k === 0 || /[.!?]$/.test(words[k - 1].w)) sentences.push({ start: w.start, chars: 0 });
    sentences[sentences.length - 1].chars += w.w.length + 1;
  });
  const stageFloor = (i: number) => {
    const inScene = sentences.filter((x, k) => {
      const end = k + 1 < sentences.length ? sentences[k + 1].start : seconds;
      return end > starts[i] && x.start < ctxs[i].t1;
    });
    const bottom = Math.max(lineTop, ...inScene.map((x) => lineTop + (lineLayout(x.chars).bottom - LINE_TOP) * (capSize / CAP)));
    const S = stageScale * 1.08;
    return Math.ceil((bottom + 50 + stageLift - 806) / S + 806);
  };
  const HEAVY = new Set(["stamp", "thud", "click", "ding", "chime"]);
  // the dev look keeps the camera steady: no jolt on a heavy hit
  const punch = dev ? 0 : hits.filter((h) => HEAVY.has(h.sound)).reduce((m, h) => Math.max(m, now >= h.t ? Math.max(0, 1 - (now - h.t) / 0.25) : 0), 0);

  return (
    <AbsoluteFill style={{ background: PAPER, overflow: "hidden" }}>
      {bgs.map((b, i) => <Flood key={i} now={now} at={b.at} color={b.color} />)}
      <AbsoluteFill style={{ opacity: onDark ? 0.08 : 0.06 }}>
        <svg width="100%" height="100%">
          <defs><pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="2" fill={onDark ? "#fff" : "#000"} /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </AbsoluteFill>
      {specs.map((s, i) => {
        const V = SCENES[s.scene].View;
        const floor = stageFloor(i);
        const last = i === specs.length - 1;
        const dur = ctxs[i].t1 - starts[i] + (last ? 0 : EXIT);
        const camera = 1 + 0.05 * Math.min(1, Math.max(0, now - starts[i]) / Math.max(1, ctxs[i].t1 - starts[i])) + 0.035 * punch;
        return (
          <Sequence key={i} from={Math.round(starts[i] * FPS)} durationInFrames={Math.max(1, Math.round(dur * FPS))} name={`${i + 1} ${s.scene}`}>
            <Stage now={now} t0={starts[i]} t1={ctxs[i].t1} last={last} camera={camera} scale={stageScale} lift={stageLift}><StageTop.Provider value={floor}><V {...ctxs[i]} /></StageTop.Provider></Stage>
          </Sequence>
        );
      })}
      {/* a view that draws its own captions (the collage look, 2026-11-06) sets captions: "none" */}
      {specs[0].props?.captions === "none" ? null : dev ? <CleanLine words={words} now={now} mark={new Set((specs[cur].mark || []).map(norm))} light={!onDark} /> : <Line words={words} now={now} mark={new Set((specs[cur].mark || []).map(norm))} size={capSize} top={lineTop} />}
      {dev ? (side ? <Actor now={now} cues={cues} words={words} hop={0} size={440} left={1080 - 440 + 30} top={1500} /> : null) : <Actor now={now} cues={cues} words={words} hop={punch} size={avaSize} left={540 - avaSize / 2} top={avaTop} />}
      {tallies.length ? (
        <div style={{ position: "absolute", top: 70, right: 70, display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontFamily: F.mono, fontSize: 28, color: onDark ? "#c9ced8" : "#1e2029", letterSpacing: 2 }}>{tallyLabel}</span>
          {tallyNow ? <Roll text={tallyNow.value} at={tallyNow.at} now={now} size={46} color={onDark ? C.gold : "#1e2029"} /> : null}
        </div>
      ) : null}
      {hits.map((h, i) => (
        <Sequence key={`h${i}`} from={Math.max(0, Math.round((h.t - (PEAKS[h.sound] || 0)) * FPS))} name={`sfx ${h.sound}`}>
          <Audio src={staticFile(`_sfx/cc0/${h.sound}.wav`)} volume={h.gain ?? 0.5} />
        </Sequence>
      ))}
      <Audio src={staticFile(`${slug}/voice/voice.mp3`)} />
    </AbsoluteFill>
  );
};
