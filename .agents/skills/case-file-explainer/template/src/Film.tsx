import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { ACTS, WORDS, chunk, f, clamp, prog } from "./lib";
import { Finish } from "./kit/finish";
import { C, MONO } from "./kit/casefile";
import { TerminalScene, TraceScene, SpreadScene, EndingScene } from "./scenes/flat";
import { BackdoorScene } from "./scenes/backdoor";

// Scenes overlap by OV frames at each cut; the outgoing shot is diving/blurring into the incoming one.
const OV = 6;
const SHOTS: { from: number; to: number; C: React.FC<{ fr: number }>; bloom?: number }[] = [
  { from: 0, to: f(ACTS.notBroken[1]), C: TerminalScene },
  { from: f(ACTS.trace[0]), to: f(ACTS.trace[1]), C: TraceScene },
  { from: f(ACTS.backdoor[0]), to: f(ACTS.backdoor[1]), C: BackdoorScene, bloom: 0.5 },
  { from: f(ACTS.spread[0]), to: f(ACTS.spread[1]), C: SpreadScene },
  { from: f(ACTS.ending[0]), to: f(ACTS.ending[1]), C: EndingScene },
];

const LINES = [
  "March 2024.", "A Microsoft engineer noticed", "his logins were half a second slow.",
  "Not broken.", "Just slow.",
  "Andres Freund followed that delay", "down into a tiny", "compression library called xz.",
  "Inside it was a backdoor,", "planted by a maintainer", "named Jia Tan,", "who had spent two years earning trust.",
  "It had already slipped into", "test builds of Fedora and Debian.",
  "Half a second.", "That's how close it came.",
];
const CHUNKS = chunk(WORDS, LINES);
const KEY = /^(half|second|slow|xz|backdoor|jia|tan|fedora|debian|trust)$/i;

const Captions: React.FC<{ fr: number }> = ({ fr }) => {
  const t = fr / 30;
  const c = CHUNKS.find((k) => t >= k.s - 0.05 && t < k.e);
  if (!c || c.words[0].w === "Half" && t > ACTS.ending[0]) return null; // the ending title says it
  const s = interpolate(fr, [f(c.s) - 2, f(c.s) + 3], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 1470, display: "flex", justifyContent: "center", opacity: s }}>
      <div style={{ background: "rgba(8,8,9,0.82)", padding: "12px 24px", borderRadius: 4, fontFamily: MONO, fontWeight: 700, fontSize: 46, lineHeight: 1.25, textAlign: "center", color: C.ink, boxShadow: "0 0 0 2px rgba(242,240,234,0.18)" }}>
        {c.words.map((w, i) => {
          const on = t >= w.s - 0.04;
          const key = KEY.test(w.w.replace(/[^a-z]/gi, ""));
          return <span key={i} style={{ opacity: on ? 1 : 0.18, color: key ? C.red : C.ink, textShadow: key && on ? C.redGlow : undefined }}>{w.w}{i < c.words.length - 1 ? " " : ""}</span>;
        })}
      </div>
    </div>
  );
};

export const Film: React.FC = () => {
  const fr = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {SHOTS.map((s, i) => {
        const first = i === 0, last = i === SHOTS.length - 1;
        if (fr < s.from - (first ? 0 : OV) || fr >= s.to + (last ? 0 : OV)) return null;
        const o = first ? 1 : prog(fr, s.from - OV, OV * 2);
        return (
          <AbsoluteFill key={i} style={{ opacity: o }}>
            <Finish fr={fr} bloom={s.bloom ?? 0.8}><s.C fr={fr} /></Finish>
          </AbsoluteFill>
        );
      })}
      <Captions fr={fr} />
      <Audio src={staticFile("mix.wav")} />
    </AbsoluteFill>
  );
};
