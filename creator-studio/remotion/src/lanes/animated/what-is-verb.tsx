import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Frame } from "../../kit/Frame";
import { Enter, Headline } from "../../kit/Blocks";
import { C, Cue, F, FPS, Word } from "../../kit/theme";
import cuesJson from "../../../../videos/what-is-verb/cues.json";
import wordsJson from "../../../../videos/what-is-verb/words.json";
import voiceMeta from "../../../../videos/what-is-verb/voice/meta.json";

const cues = cuesJson as Cue[];
const words = wordsJson as Word[];
export const seconds = cues.length ? cues[cues.length - 1].end : 5;

const REQUEST = "move my Friday meeting to Monday";

/** Frames from the start of a beat until a word is spoken inside it, so a line lands on its word. */
function at(cue: Cue, word: string, nth = 1): number {
  let seen = 0;
  for (const w of words) {
    if (w.start < cue.start || w.start >= cue.end) continue;
    if (w.w.toLowerCase().replace(/[^a-z0-9]/g, "") === word) {
      seen += 1;
      if (seen === nth) return Math.max(0, Math.round((w.start - cue.start) * FPS));
    }
  }
  return 0;
}

/** The product window every "app" beat shares, so ask, does and asks read as one screen changing. */
const AppWindow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", justifyContent: "center" }}>
    <div
      style={{
        width: 1150,
        borderRadius: 18,
        overflow: "hidden",
        border: `2px solid ${C.rule}`,
        background: C.paper,
        boxShadow: "0 30px 80px rgba(20,21,26,0.12)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 22px", background: C.parchment, borderBottom: `2px solid ${C.rule}` }}>
        {["#e6e8ec", "#e6e8ec", C.gold].map((c, i) => (
          <span key={i} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
        ))}
        <span style={{ fontFamily: F.mono, fontSize: 24, color: C.graphite, marginLeft: 12 }}>Your app</span>
      </div>
      <div style={{ padding: "36px 40px", minHeight: 300, display: "flex", flexDirection: "column", gap: 26 }}>{children}</div>
    </div>
  </div>
);

/** The user's request as a chat bubble; `typeFrom` types it in from that frame of the beat. */
const Request: React.FC<{ typeFrom?: number }> = ({ typeFrom }) => {
  const frame = useCurrentFrame();
  const n =
    typeFrom === undefined
      ? REQUEST.length
      : Math.round(interpolate(frame - typeFrom, [0, 36], [0, REQUEST.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div style={{ alignSelf: "flex-end", background: C.ink, color: C.paper, fontFamily: F.body, fontSize: 40, padding: "18px 28px", borderRadius: 22 }}>
      {REQUEST.slice(0, n) || " "}
    </div>
  );
};

const Reply: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ alignSelf: "flex-start", background: C.goldWash, color: C.ink, fontFamily: F.body, fontSize: 40, padding: "18px 28px", borderRadius: 22 }}>
    {children}
  </div>
);

const Button: React.FC<{ label: string; primary?: boolean }> = ({ label, primary }) => (
  <div
    style={{
      fontFamily: F.body,
      fontWeight: 600,
      fontSize: 34,
      padding: "14px 34px",
      borderRadius: 14,
      background: primary ? C.gold : C.paper,
      color: C.ink,
      border: primary ? "none" : `2px solid ${C.rule}`,
    }}
  >
    {label}
  </div>
);

export const WhatIsVerb: React.FC = () => (
  <Frame
    slug="what-is-verb"
    cues={cues}
    words={words}
    dark={["built", "free"]}
    tickOn={["does"]}
    draftVoice={voiceMeta.draft}
    beats={{
      hook: () => (
        <Enter>
          <Headline text="It can do the thing. You just can't find where." mark="can't find where" size={110} />
        </Enter>
      ),
      built: () => (
        <Enter>
          <Headline text="So I built Verb." mark="Verb" dark size={150} />
        </Enter>
      ),
      ask: (c) => (
        <Enter>
          <AppWindow>
            <Request typeFrom={at(c, "move")} />
          </AppWindow>
        </Enter>
      ),
      does: () => (
        <AppWindow>
          <Request />
          <Enter delay={6}>
            <Reply>Done. Your Friday meeting is now on Monday.</Reply>
          </Enter>
        </AppWindow>
      ),
      limits: () => (
        <Enter>
          <Headline text="Only what that user could already do." mark="already" size={110} />
        </Enter>
      ),
      asks: (c) => (
        <AppWindow>
          <Request />
          <Enter delay={at(c, "asks")}>
            <div style={{ border: `2px solid ${C.rule}`, borderRadius: 18, padding: "28px 32px", background: C.parchment }}>
              <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 42, color: C.ink }}>Move your Friday meeting to Monday?</div>
              <div style={{ display: "flex", gap: 20, marginTop: 26 }}>
                <Button label="Approve" primary />
                <Button label="Cancel" />
              </div>
            </div>
          </Enter>
        </AppWindow>
      ),
      setup: (c) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Enter>
            <div style={{ display: "flex", flexDirection: "column", gap: 34, fontFamily: F.mono, fontSize: 46, color: C.ink }}>
              <Enter delay={at(c, "coding")}>
                <div>1. your coding agent reads your app</div>
              </Enter>
              <Enter delay={at(c, "writes")}>
                <div>
                  2. writes <span style={{ background: C.goldWash, padding: "0 10px", borderRadius: 6 }}>verb.md</span>: what Verb may do
                </div>
              </Enter>
              <Enter delay={at(c, "paste")}>
                <div>3. paste one line of code</div>
              </Enter>
            </div>
          </Enter>
        </div>
      ),
      free: (c) => (
        <div>
          <Enter>
            <Headline text="Free while I launch." mark="Free" dark size={140} />
          </Enter>
          <div style={{ height: 40 }} />
          <Enter delay={at(c, "already")}>
            <div style={{ fontFamily: F.body, fontSize: 44, color: "#b9bec8" }}>Already running in production for a real company.</div>
          </Enter>
        </div>
      ),
      question: (c) => (
        <div>
          <Enter delay={at(c, "if")}>
            <Headline
              text="If your users could just ask your product for one thing, what would it be?"
              mark="one thing"
              size={88}
            />
          </Enter>
          <div style={{ height: 34 }} />
          <div style={{ fontFamily: F.body, fontSize: 36, color: C.graphite }}>Tell me in the comments. askverb.com</div>
        </div>
      ),
    }}
  />
);
