import React from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Freeze,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { C, F, FPS, Word } from "../kit/theme";
import { Captions } from "../kit/Captions";
import { Enter, Headline } from "../kit/Blocks";

type Common = { at: number; dur: number; sound?: string | null };
type Beat =
  | (Common & { kind: "zoom"; scale: number })
  | (Common & { kind: "text"; text: string; mark: string })
  | (Common & { kind: "stat"; value: number; prefix: string; suffix: string; label: string })
  | (Common & { kind: "broll"; src: string; image: boolean; pip: boolean })
  | (Common & { kind: "sfx" });

export type Edit = {
  brand: string;
  style?: "light" | "dark";
  sfxVolume?: number;
  videoSeconds: number;
  endSeconds: number;
  captions: boolean;
  lowerThird: { name: string; line: string; at: number } | null;
  music: { src: string; volume: number } | null;
  endCard: { question: string; url: string } | null;
  words: Word[];
  beats: Beat[];
};

export type ThProps = { slug: string; edit?: Edit | null };

/** Reads videos/<slug>/work/edit.json (written by th_plan.py) and sizes the composition to it. */
export const thMetadata: CalculateMetadataFunction<ThProps> = async ({ props }) => {
  try {
    const res = await fetch(staticFile(`${props.slug}/work/edit.json`));
    if (!res.ok) throw new Error(String(res.status));
    const edit = (await res.json()) as Edit;
    const seconds = edit.videoSeconds + (edit.endCard ? edit.endSeconds : 0);
    return { durationInFrames: Math.max(1, Math.round(seconds * FPS)), props: { ...props, edit } };
  } catch {
    return { durationInFrames: FPS, props: { ...props, edit: null } };
  }
};

/** Light is the default look (white cards, ink text, gold as a fill); dark keeps the older ink cards. */
const look = (style: string | undefined) => {
  const light = style !== "dark";
  return {
    light,
    panel: {
      background: light ? "rgba(255,255,255,0.96)" : "rgba(20,21,26,0.92)",
      borderRadius: 30,
      padding: "30px 44px",
      boxShadow: light ? "0 18px 50px rgba(20,21,26,0.22)" : "0 24px 60px rgba(0,0,0,0.35)",
    } as React.CSSProperties,
    text: light ? C.ink : C.paper,
    soft: light ? C.graphite : "#c9ced6",
  };
};

const StatCard: React.FC<{ beat: Extract<Beat, { kind: "stat" }>; style?: string }> = ({ beat, style }) => {
  const frame = useCurrentFrame();
  const L = look(style);
  const shown = Math.round(interpolate(frame, [0, 18], [0, beat.value], { extrapolateRight: "clamp" }));
  return (
    <Enter>
      <div style={{ ...L.panel, textAlign: "center" }}>
        <div style={{ fontFamily: F.mono, fontSize: 140, lineHeight: 1, color: L.text }}>
          {beat.prefix}
          {shown.toLocaleString("en-US")}
          <span style={{ color: L.light ? C.goldDeep : C.gold }}>{beat.suffix}</span>
        </div>
        {beat.label ? <div style={{ fontFamily: F.body, fontSize: 40, color: L.soft, marginTop: 12 }}>{beat.label}</div> : null}
      </div>
    </Enter>
  );
};

const LowerThird: React.FC<{ name: string; line: string; style?: string }> = ({ name, line, style }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const L = look(style);
  const inP = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const out = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        bottom: 520,
        display: "flex",
        gap: 18,
        opacity: inP * out,
        transform: `translateX(${interpolate(inP, [0, 1], [-40, 0])}px)`,
      }}
    >
      <div style={{ width: 10, borderRadius: 5, background: C.gold }} />
      <div style={{ ...L.panel, padding: "20px 32px", borderRadius: 22 }}>
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 56, color: L.text, lineHeight: 1.05 }}>{name}</div>
        <div style={{ fontFamily: F.body, fontSize: 31, color: L.soft, marginTop: 6 }}>{line}</div>
      </div>
    </div>
  );
};

/** The end card sits on his last frame, frozen and softened, so the video never cuts to a blank screen. */
const EndCard: React.FC<{ slug: string; lastFrame: number; question: string; url: string; style?: string }> = ({
  slug,
  lastFrame,
  question,
  url,
  style,
}) => {
  const L = look(style);
  return (
    <AbsoluteFill>
      <Freeze frame={lastFrame}>
        <AbsoluteFill style={{ filter: "blur(16px) brightness(1.05)", transform: "scale(1.08)" }}>
          <OffthreadVideo src={staticFile(`${slug}/work/cut.mp4`)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      </Freeze>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 70px" }}>
        <Enter>
          <div style={{ ...L.panel, padding: "52px 56px" }}>
            <Headline text={question} size={80} dark={!L.light} />
            <div style={{ height: 34 }} />
            <span
              style={{
                display: "inline-block",
                fontFamily: F.body,
                fontWeight: 600,
                fontSize: 40,
                color: C.ink,
                background: C.gold,
                borderRadius: 14,
                padding: "8px 22px",
              }}
            >
              {url}
            </span>
          </div>
        </Enter>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TalkingHead: React.FC<ThProps> = ({ slug, edit }) => {
  const frame = useCurrentFrame();
  if (!edit) {
    return (
      <AbsoluteFill style={{ background: C.ink, color: C.paper, justifyContent: "center", alignItems: "center", fontFamily: F.body, fontSize: 40 }}>
        No work/edit.json for "{slug}" yet. Run python bin/th_plan.py {slug}.
      </AbsoluteFill>
    );
  }
  const L = look(edit.style);
  const t = frame / FPS;
  const videoFrames = Math.round(edit.videoSeconds * FPS);
  let scale = 1;
  for (const b of edit.beats) {
    if (b.kind !== "zoom") continue;
    const ramp = Math.min(0.25, b.dur / 4);
    scale = Math.max(
      scale,
      interpolate(t, [b.at, b.at + ramp, b.at + b.dur - ramp, b.at + b.dur], [1, b.scale, b.scale, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
  }
  const seq = (b: Beat) => ({ from: Math.round(b.at * FPS), durationInFrames: Math.max(1, Math.round(b.dur * FPS)) });
  const media = (src: string, image: boolean) =>
    image ? (
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    ) : (
      <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    );

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Sequence durationInFrames={videoFrames} name="talking">
        <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "50% 38%" }}>
          <OffthreadVideo src={staticFile(`${slug}/work/cut.mp4`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>

        {edit.beats.map((b, i) =>
          b.kind === "broll" ? (
            <Sequence key={`b${i}`} {...seq(b)} name={`broll ${i}`}>
              {b.pip ? (
                <AbsoluteFill style={{ alignItems: "center", paddingTop: 240 }}>
                  <div style={{ width: 920, height: 640, borderRadius: 28, overflow: "hidden", border: `5px solid ${C.paper}`, boxShadow: "0 30px 80px rgba(0,0,0,0.35)" }}>
                    {media(b.src, b.image)}
                  </div>
                </AbsoluteFill>
              ) : (
                media(b.src, b.image)
              )}
            </Sequence>
          ) : null,
        )}

        {edit.beats.map((b, i) =>
          b.kind === "text" || b.kind === "stat" ? (
            <Sequence key={`o${i}`} {...seq(b)} name={`${b.kind} ${i}`}>
              <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 520, paddingLeft: 70, paddingRight: 70 }}>
                {b.kind === "stat" ? (
                  <StatCard beat={b} style={edit.style} />
                ) : (
                  <Enter>
                    <div style={L.panel}>
                      <Headline text={b.text} mark={b.mark || undefined} size={68} dark={!L.light} />
                    </div>
                  </Enter>
                )}
              </AbsoluteFill>
            </Sequence>
          ) : null,
        )}

        {edit.lowerThird ? (
          <Sequence
            from={Math.round(edit.lowerThird.at * FPS)}
            durationInFrames={Math.max(1, Math.min(videoFrames - Math.round(edit.lowerThird.at * FPS), 3 * FPS))}
            name="lower third"
          >
            <LowerThird name={edit.lowerThird.name} line={edit.lowerThird.line} style={edit.style} />
          </Sequence>
        ) : null}

        {edit.captions ? (
          <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 340 }}>
            <div style={{ maxWidth: 940, textShadow: "0 4px 18px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.9)" }}>
              <Captions words={edit.words} size={66} max={3} dark sentences />
            </div>
          </AbsoluteFill>
        ) : null}
      </Sequence>

      {edit.beats.map((b, i) =>
        b.sound ? (
          <Sequence key={`s${i}`} from={Math.round(b.at * FPS)} name={`sound ${i}`}>
            <Audio src={staticFile(b.sound)} volume={edit.sfxVolume ?? 0.35} />
          </Sequence>
        ) : null,
      )}

      {edit.music ? <Audio src={staticFile(edit.music.src)} volume={edit.music.volume} /> : null}

      {edit.endCard ? (
        <Sequence from={videoFrames} durationInFrames={Math.round(edit.endSeconds * FPS)} name="end card">
          <EndCard slug={slug} lastFrame={videoFrames - 1} question={edit.endCard.question} url={edit.endCard.url} style={edit.style} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
