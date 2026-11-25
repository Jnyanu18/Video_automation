import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { C, Cue, FPS, Word } from "./theme";
import { PixelVishnu } from "./PixelVishnu";
import { Captions } from "./Captions";

export type BeatRenderer = (cue: Cue, vertical: boolean) => React.ReactNode;

/**
 * The frame every video shares: one Sequence per beat (from cues.json), the voice track, Pixel Vishnu
 * in the corner, and captions. Each video only supplies what goes on screen for each beat.
 */
export const Frame: React.FC<{
  slug: string;
  cues: Cue[];
  words: Word[];
  beats: Record<string, BeatRenderer>;
  /** Beat ids on which the avatar holds the gold tick. */
  tickOn?: string[];
  /** Beat ids drawn on the dark (ink) ground. */
  dark?: string[];
  draftVoice?: boolean;
}> = ({ slug, cues, words, beats, tickOn = [], dark = [], draftVoice = false }) => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const t = useCurrentFrame() / FPS;
  const current = cues.find((c) => t >= c.start && t < c.end);
  const captionsDark = current ? dark.includes(current.id) : false;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Audio src={staticFile(`${slug}/voice/voice.mp3`)} />
      {cues.map((cue) => {
        const from = Math.round(cue.start * FPS);
        const dur = Math.max(1, Math.round((cue.end - cue.start) * FPS));
        const isDark = dark.includes(cue.id);
        const render = beats[cue.id];
        return (
          <Sequence key={cue.id} from={from} durationInFrames={dur} name={cue.id}>
            <AbsoluteFill
              style={{
                background: isDark ? C.ink : C.paper,
                padding: vertical ? "220px 80px 720px" : "110px 140px 200px 140px",
                justifyContent: "center",
              }}
            >
              {render ? render(cue, vertical) : null}
            </AbsoluteFill>
            <AbsoluteFill style={{ pointerEvents: "none" }}>
              <div
                style={
                  vertical
                    ? { position: "absolute", left: "50%", bottom: 340, transform: "translateX(-50%)" }
                    : { position: "absolute", right: 70, bottom: 40 }
                }
              >
                <PixelVishnu words={words} px={vertical ? 9 : 6} tick={tickOn.includes(cue.id)} offset={cue.start} outline={isDark} />
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: vertical ? 160 : 48 }}>
        <div style={{ maxWidth: vertical ? 900 : 1300 }}>
          <Captions words={words} size={vertical ? 64 : 40} max={vertical ? 3 : 6} dark={captionsDark} />
        </div>
      </AbsoluteFill>
      {draftVoice ? (
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            fontFamily: "monospace",
            fontSize: 22,
            background: "#d22",
            color: "white",
            padding: "4px 10px",
            borderRadius: 6,
          }}
        >
          DRAFT VOICE, NOT FOR PUBLISHING
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
