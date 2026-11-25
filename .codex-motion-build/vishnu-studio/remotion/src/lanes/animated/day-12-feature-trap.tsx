import React from "react";
import { Frame } from "../../kit/Frame";
import { Enter, Headline, Screen, Stat, Tag } from "../../kit/Blocks";
import { C, Cue, F, FPS, Word } from "../../kit/theme";
import cuesJson from "../../../../videos/day-12-feature-trap/cues.json";
import wordsJson from "../../../../videos/day-12-feature-trap/words.json";
import voiceMeta from "../../../../videos/day-12-feature-trap/voice/meta.json";

const cues = cuesJson as Cue[];
const words = wordsJson as Word[];
export const seconds = cues.length ? cues[cues.length - 1].end : 5;

/** Frames from the start of a beat until a word is spoken inside it, so a number lands on its word. */
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

export const Day12FeatureTrap: React.FC = () => (
  <Frame
    slug="day-12-feature-trap"
    cues={cues}
    words={words}
    dark={["missed", "numbers"]}
    tickOn={["lesson"]}
    draftVoice={voiceMeta.draft}
    beats={{
      hook: (_c, v) => (
        <div>
          <Enter>
            <Tag text="Day 12 of 30" />
          </Enter>
          <div style={{ height: 40 }} />
          <Enter delay={8}>
            <Headline text="I did the worst thing a founder can do." mark="the worst thing" size={v ? 96 : 110} />
          </Enter>
        </div>
      ),
      feature: (_c, v) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Enter>
            <Screen
              width={v ? 920 : 1150}
              title="git checkout feat/workspace-access"
              lines={["+ team invites", "+ roles: owner, admin, member", "+ account sharing", "users waiting for it: 0"]}
            />
          </Enter>
        </div>
      ),
      missed: (_c, v) => (
        <Enter>
          <Headline text="And I missed a booked call." mark="missed" dark size={v ? 104 : 120} />
        </Enter>
      ),
      numbers: (c, v) => (
        <div>
        <Enter>
          <Tag text="Meanwhile, on autopilot" dark />
        </Enter>
        <div style={{ height: v ? 70 : 60 }} />
        <div style={{ display: "grid", gridTemplateColumns: v ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: v ? 70 : 60 }}>
          <Stat value={140} label="invited on LinkedIn" delay={at(c, "hundred")} size={v ? 130 : 120} />
          <Stat value={9} label="connected" delay={at(c, "nine")} size={v ? 130 : 120} />
          <Stat value={0} label="replies" delay={at(c, "zero", 1)} size={v ? 130 : 120} />
          <Stat value={0} label="paying" delay={at(c, "zero", 2)} accent size={v ? 130 : 120} />
        </div>
        </div>
      ),
      lesson: (c, v) => (
        <div>
          <Enter>
            <Headline text="If nobody uses it, another feature won't fix it." size={v ? 88 : 96} />
          </Enter>
          <div style={{ height: 50 }} />
          <Enter delay={at(c, "distribution")}>
            <Headline text="Distribution is the job." mark="Distribution" size={v ? 88 : 96} />
          </Enter>
        </div>
      ),
      tomorrow: (_c, v) => (
        <div>
          <Enter>
            <Tag text="Day 13: no features" />
          </Enter>
          <div style={{ height: 40 }} />
          <Enter delay={20}>
            <Headline
              text="What stops you hiding in the product when selling gets uncomfortable?"
              mark="hiding in the product"
              size={v ? 80 : 88}
            />
          </Enter>
          <div style={{ height: 30 }} />
          <div style={{ fontFamily: F.body, fontSize: v ? 40 : 36, color: C.graphite }}>Tell me in the comments.</div>
        </div>
      ),
    }}
  />
);
