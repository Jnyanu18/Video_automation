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
import { C, F, FPS, Word } from "../../kit/theme";
import { Captions } from "../../kit/Captions";
import { Enter, Headline } from "../../kit/Blocks";
import { Chips, ChipsBeat, Glass, GlassBeat, Screen, ScreenBeat, Shoulder, ShoulderBeat, shoulderCamera } from "./effects";
import { HALF, Panel, PanelBeat, SeamCaptions, Versions } from "./split";
import { ClayPanel, ClayVersions } from "./splitClay";
import { ClayCaptions, ClayCard, ClayChips, ClayEndCard, ClayHero, ClayLowerThird, ClayStat } from "./clay";
import { SiteCaptions, SiteCard, SiteChips, SiteEndCard, SiteLowerThird, SiteStat } from "./site";

type Common = { at: number; dur: number; sound?: string | null };
type Beat =
  | (Common & { kind: "zoom"; scale: number })
  | (Common & { kind: "text"; text: string; mark: string; top?: number })
  | (Common & { kind: "stat"; value: number; prefix: string; suffix: string; label: string })
  | (Common & { kind: "broll"; src: string; image: boolean; pip: boolean })
  | (Common & { kind: "sfx" })
  | GlassBeat
  | ScreenBeat
  | ShoulderBeat
  | ChipsBeat
  | PanelBeat;

export type Edit = {
  brand: string;
  style?: "light" | "dark" | "brutal" | "clay" | "site";
  layout?: "full" | "split";
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

/** Reads videos/<slug>/work/edit.json (written by lanes/talking-head/plan.py) and sizes the composition to it. */
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

// style: brutal, pastel neo-brutalism (2026-10-22): flat pastel fills, a 5px black outline, a hard black shadow
// with no blur, a slight alternating tilt. Same palette as the chips in effects.tsx.
const BRUTAL_FILLS = ["#FFE89A", "#B8F2D0", "#D9C8FF", "#FFC9B0", "#BDE3FF"];

/** Light is the default look (white cards, ink text, gold as a fill); dark keeps the older ink cards; brutal is
 * pastel neo-brutalism. `i` picks a brutal card's fill and tilt, so neighbouring cards differ. */
const look = (style: string | undefined, i = 0) => {
  if (style === "brutal") {
    return {
      light: true,
      brutal: true,
      panel: {
        background: BRUTAL_FILLS[i % BRUTAL_FILLS.length],
        border: "5px solid #111111",
        borderRadius: 18,
        padding: "30px 44px",
        boxShadow: "10px 10px 0 #111111",
        transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)`,
      } as React.CSSProperties,
      text: "#111111",
      soft: "#2e2e2e",
    };
  }
  const light = style !== "dark";
  return {
    brutal: false,
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

const StatCard: React.FC<{ beat: Extract<Beat, { kind: "stat" }>; style?: string; i?: number }> = ({ beat, style, i = 0 }) => {
  const frame = useCurrentFrame();
  const L = look(style, i);
  const shown = Math.round(interpolate(frame, [0, 18], [0, beat.value], { extrapolateRight: "clamp" }));
  return (
    <Enter>
      <div style={{ ...L.panel, textAlign: "center" }}>
        <div style={{ fontFamily: F.mono, fontSize: 140, lineHeight: 1, color: L.text }}>
          {beat.prefix}
          {shown.toLocaleString("en-US")}
          <span style={{ color: L.brutal ? "#111111" : L.light ? C.goldDeep : C.gold }}>{beat.suffix}</span>
        </div>
        {beat.label ? <div style={{ fontFamily: F.body, fontSize: 40, color: L.soft, marginTop: 12 }}>{beat.label}</div> : null}
      </div>
    </Enter>
  );
};

const LowerThird: React.FC<{ name: string; line: string; style?: string }> = ({ name, line, style }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const L = look(style, 2);
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
      {L.brutal ? null : <div style={{ width: 10, borderRadius: 5, background: C.gold }} />}
      <div style={{ ...L.panel, padding: "20px 32px", borderRadius: L.brutal ? 18 : 22 }}>
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
  const L = look(style, 0);
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
                background: L.brutal ? "#ffffff" : C.gold,
                border: L.brutal ? "4px solid #111111" : undefined,
                boxShadow: L.brutal ? "5px 5px 0 #111111" : undefined,
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
  const isClay = edit?.style === "clay";
  const isSite = edit?.style === "site";
  const isSplit = edit?.layout === "split";
  const frame = useCurrentFrame();
  if (!edit) {
    return (
      <AbsoluteFill style={{ background: C.ink, color: C.paper, justifyContent: "center", alignItems: "center", fontFamily: F.body, fontSize: 40 }}>
        No work/edit.json for "{slug}" yet. Run python lanes/talking-head/plan.py {slug}.
      </AbsoluteFill>
    );
  }
  const L = look(edit.style);
  const t = frame / FPS;
  const versions = edit.beats.find((b): b is PanelBeat => b.kind === "panel" && b.look === "versions");
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
  // Captions step aside while a screen (it shows the words) or a glass card (it sits where they are) is up.
  const onScreen = edit.beats.some((b) => (b.kind === "screen" || b.kind === "glass") && t >= b.at && t < b.at + b.dur);
  // An over-the-shoulder beat moves the camera on the cut itself.
  const sh = edit.beats.find((b): b is ShoulderBeat => b.kind === "shoulder" && t >= b.at && t < b.at + b.dur);
  const cam = sh ? shoulderCamera(sh, t - sh.at) : null;
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
        <AbsoluteFill style={isSplit ? { overflow: "hidden", top: HALF, height: 1920 - HALF } : { overflow: "hidden" }}>
          <AbsoluteFill style={isSplit ? { top: -HALF / 2, height: 1920, transform: `scale(${scale})`, transformOrigin: "50% 50%" } : cam ? { transform: cam.outer, transformOrigin: cam.origin } : { transform: `scale(${scale})`, transformOrigin: "50% 38%" }}>
            <AbsoluteFill style={cam ? { transform: cam.inner, transformOrigin: "0 0" } : undefined}>
              <OffthreadVideo src={staticFile(`${slug}/work/cut.mp4`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </AbsoluteFill>
          </AbsoluteFill>
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
          b.kind === "text" || b.kind === "stat" || b.kind === "chips" ? (
            <Sequence key={`o${i}`} {...seq(b)} name={`${b.kind} ${i}`}>
              <AbsoluteFill
                style={
                  b.kind === "text" && b.top
                    ? { alignItems: "center", justifyContent: "flex-start", paddingTop: b.top, paddingLeft: 90, paddingRight: 90 }
                    : { alignItems: "center", justifyContent: "flex-end", paddingBottom: 520, paddingLeft: 70, paddingRight: 70 }
                }
              >
                {isSite && b.kind === "chips" ? (
                  <SiteChips items={b.items} start={b.at} />
                ) : isSite && b.kind === "stat" ? (
                  <SiteStat value={b.value} prefix={b.prefix} suffix={b.suffix} label={b.label} />
                ) : isSite && b.kind === "text" ? (
                  <SiteCard text={b.text} mark={b.mark || undefined} small={Boolean(b.top)} />
                ) : isClay && b.kind === "chips" ? (
                  <ClayChips items={b.items} start={b.at} />
                ) : isClay && b.kind === "stat" ? (
                  <ClayStat value={b.value} prefix={b.prefix} suffix={b.suffix} label={b.label} i={i} />
                ) : isClay && b.kind === "text" ? (
                  <ClayCard text={b.text} mark={b.mark || undefined} i={i} />
                ) : b.kind === "chips" ? (
                  <Chips beat={b} />
                ) : b.kind === "stat" ? (
                  <StatCard beat={b} style={edit.style} i={i} />
                ) : (
                  <Enter>
                    <div style={look(edit.style, i).panel}>
                      <Headline text={b.text} mark={b.mark || undefined} size={68} dark={!L.light} />
                    </div>
                  </Enter>
                )}
              </AbsoluteFill>
            </Sequence>
          ) : null,
        )}

        {edit.beats.map((b, i) =>
          b.kind === "glass" ? (
            <Sequence key={`g${i}`} {...seq(b)} name={`glass ${i}`}>
              <Glass beat={b} src={`${slug}/work/cut.mp4`} />
            </Sequence>
          ) : null,
        )}

        {edit.beats.map((b, i) =>
          b.kind === "shoulder" ? (
            <Sequence key={`h${i}`} {...seq(b)} name={`shoulder ${i}`}>
              <Shoulder beat={b} />
            </Sequence>
          ) : null,
        )}

        {edit.beats.map((b, i) =>
          b.kind === "panel" ? (
            <Sequence key={`n${i}`} {...seq(b)} name={`panel ${i}`}>
              <AbsoluteFill style={{ height: HALF, overflow: "hidden" }}>
                {isClay ? <ClayPanel beat={b} /> : <Panel beat={b} />}
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
            {isSite ? (
              <SiteLowerThird name={edit.lowerThird.name} line={edit.lowerThird.line} />
            ) : isClay ? (
              <ClayLowerThird name={edit.lowerThird.name} line={edit.lowerThird.line} />
            ) : (
              <LowerThird name={edit.lowerThird.name} line={edit.lowerThird.line} style={edit.style} />
            )}
          </Sequence>
        ) : null}

        {edit.captions && isSplit ? (
          <AbsoluteFill style={{ top: HALF - 60, height: 140, justifyContent: "center", alignItems: "center" }}>
            {isClay ? <ClayCaptions words={edit.words} size={80} /> : <SeamCaptions words={edit.words} />}
          </AbsoluteFill>
        ) : null}

        {edit.captions && !onScreen && !isSplit ? (
          <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 340 }}>
            {isSite ? (
              <div style={{ maxWidth: 960 }}>
                <SiteCaptions words={edit.words} />
              </div>
            ) : isClay ? (
              <div style={{ maxWidth: 960 }}>
                <ClayCaptions words={edit.words} />
              </div>
            ) : (
              <div style={{ maxWidth: 940, textShadow: "0 4px 18px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.9)" }}>
                <Captions words={edit.words} size={66} max={3} dark sentences />
              </div>
            )}
          </AbsoluteFill>
        ) : null}

        {/* The screen covers everything, so it goes last; captions are off while it is up (it shows the words). */}
        {edit.beats.map((b, i) =>
          b.kind === "screen" ? (
            <Sequence key={`p${i}`} {...seq(b)} name={`screen ${i}`}>
              {isClay ? <ClayHero words={b.words} at={b.at} /> : <Screen beat={b} />}
            </Sequence>
          ) : null,
        )}
      </Sequence>

      {edit.beats.map((b, i) =>
        b.sound ? (
          <Sequence key={`s${i}`} from={Math.round(((b as { soundAt?: number }).soundAt ?? b.at) * FPS)} name={`sound ${i}`}>
            <Audio src={staticFile(b.sound)} volume={edit.sfxVolume ?? 0.35} />
          </Sequence>
        ) : null,
      )}

      {edit.beats.map((b, i) =>
        b.kind === "chips" && b.itemSound
          ? b.items.slice(1).map((it, k) => (
              <Sequence key={`c${i}-${k}`} from={Math.round(it.at * FPS)} name={`chip sound ${i}`}>
                <Audio src={staticFile(b.itemSound!)} volume={edit.sfxVolume ?? 0.35} />
              </Sequence>
            ))
          : null,
      )}

      {edit.music ? <Audio src={staticFile(edit.music.src)} volume={edit.music.volume} /> : null}

      {edit.endCard ? (
        <Sequence from={videoFrames} durationInFrames={Math.round(edit.endSeconds * FPS)} name="end card">
          {isSplit && versions && isClay ? (
            <ClayVersions parts={versions.parts} title="Screenshot this" tall />
          ) : isSplit && versions ? (
            <Versions parts={versions.parts} title="Screenshot this" tall />
          ) : isSite ? (
            <SiteEndCard slug={slug} lastFrame={videoFrames - 1} question={edit.endCard.question} url={edit.endCard.url} />
          ) : isClay ? (
            <ClayEndCard slug={slug} lastFrame={videoFrames - 1} question={edit.endCard.question} url={edit.endCard.url} />
          ) : (
            <EndCard slug={slug} lastFrame={videoFrames - 1} question={edit.endCard.question} url={edit.endCard.url} style={edit.style} />
          )}
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
