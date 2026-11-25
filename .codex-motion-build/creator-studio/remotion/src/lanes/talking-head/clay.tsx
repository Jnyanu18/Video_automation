import React from "react";
import { AbsoluteFill, Freeze, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fredoka";
import { FPS, Word } from "../../kit/theme";
import { chunk } from "../../kit/Captions";

// style: clay (Vishnu, 2026-10-23): claymorphism for everything, cards, numbers, chips, captions, the name tag,
// the end card and the one full-screen moment. Soft puffy shapes in Fredoka, and every piece lands with a squash
// and a bounce so the eye is pulled to it. See .claude/skills/art-styles/styles/claymorphism.md.

export const CLAY_FONT = loadFont("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const CLAY = {
  ink: "#3d2766",
  fills: ["#FFF0B8", "#C9E4FF", "#BFF0D4", "#FFD6E7", "#FFD6A8", "#E9DDFB"],
  mark: "#FFB4C8",
};
export const clay = (fill: string, r = 44): React.CSSProperties => ({
  background: fill,
  borderRadius: r,
  boxShadow: "inset -10px -12px 22px rgba(0,0,0,0.13), inset 10px 12px 22px rgba(255,255,255,0.75), 0 26px 44px rgba(40,20,80,0.35)",
});
const fill = (i: number) => CLAY.fills[i % CLAY.fills.length];

/** Lands like a ball of clay: grows past full size, squashes, settles. Leaves the same way, quicker. */
export const Pop: React.FC<{ children: React.ReactNode; delay?: number; tilt?: number }> = ({ children, delay = 0, tilt = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 160, mass: 0.7 } });
  const out = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = p * (0.85 + 0.15 * out);
  return (
    <div style={{ transform: `scale(${s}, ${p > 0.98 ? s : s * (1 + (1 - p) * 0.2)}) rotate(${tilt * p}deg)`, opacity: Math.min(1, p * 3) * out }}>
      {children}
    </div>
  );
};

export const ClayCard: React.FC<{ text: string; mark?: string; i: number }> = ({ text, mark, i }) => {
  const parts = mark && text.includes(mark) ? text.split(mark) : [text];
  return (
    <Pop tilt={i % 2 ? 1.5 : -1.5}>
      <div style={{ ...clay("#F7F2FF"), padding: "30px 42px", fontFamily: CLAY_FONT, fontWeight: 600, fontSize: 70, lineHeight: 1.12, color: CLAY.ink, textAlign: "center" }}>
        {parts[0]}
        {parts.length > 1 ? (
          <>
            <span style={{ ...clay(fill(i), 26), display: "inline-block", padding: "0 18px", margin: "4px 2px" }}>{mark}</span>
            {parts[1]}
          </>
        ) : null}
      </div>
    </Pop>
  );
};

export const ClayStat: React.FC<{ value: number; prefix: string; suffix: string; label: string; i: number }> = ({ value, prefix, suffix, label, i }) => {
  const frame = useCurrentFrame();
  const shown = Math.round(interpolate(frame, [0, 18], [0, value], { extrapolateRight: "clamp" }));
  return (
    <Pop tilt={i % 2 ? 2 : -2}>
      <div style={{ ...clay(fill(i), 60), padding: "36px 70px", textAlign: "center", fontFamily: CLAY_FONT, color: CLAY.ink }}>
        <div style={{ fontWeight: 700, fontSize: 170, lineHeight: 1 }}>
          {prefix}
          {shown.toLocaleString("en-US")}
          {suffix}
        </div>
        {label ? <div style={{ fontWeight: 500, fontSize: 44, marginTop: 6 }}>{label}</div> : null}
      </div>
    </Pop>
  );
};

/** Each chip lands on its own word, in a different clay colour, stacked with a little stagger. */
export const ClayChips: React.FC<{ items: { text: string; at: number }[]; start: number }> = ({ items, start }) => {
  const t = useCurrentFrame() / FPS;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      {items.map((it, k) =>
        t + start >= it.at ? (
          <div key={k} style={{ marginLeft: k % 2 ? 90 : -90 }}>
            <Pop delay={Math.round((it.at - start) * FPS)} tilt={k % 2 ? 3 : -3}>
              <div style={{ ...clay(fill(k + 1), 999), padding: "18px 44px", fontFamily: CLAY_FONT, fontWeight: 600, fontSize: 60, color: CLAY.ink }}>{it.text}</div>
            </Pop>
          </div>
        ) : null,
      )}
    </div>
  );
};

/** Captions: big Fredoka in white, the spoken word lifted onto a clay pill that swells as it is said. */
export const ClayCaptions: React.FC<{ words: Word[]; size?: number }> = ({ words, size = 74 }) => {
  const t = useCurrentFrame() / FPS;
  const group = chunk(words, 3, true).find((g) => t >= g[0].start - 0.05 && t <= g[g.length - 1].end + 0.25);
  if (!group) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: size * 0.22, fontFamily: CLAY_FONT, fontWeight: 700, fontSize: size, lineHeight: 1.2 }}>
      {group.map((w, i) => {
        const on = t >= w.start && t <= w.end + 0.08;
        const k = interpolate(t, [w.start - 0.02, w.start + 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <span
            key={i}
            style={{
              ...(on ? clay(CLAY.fills[0], size * 0.35) : {}),
              padding: `0 ${size * 0.2}px`,
              color: on ? CLAY.ink : "#ffffff",
              // A dark purple outline, so white words read on light footage and on the lilac panels (2026-10-23).
              WebkitTextStroke: on ? undefined : `${Math.round(size * 0.09)}px ${CLAY.ink}`,
              paintOrder: "stroke fill",
              textShadow: on ? "none" : `0 5px 0 ${CLAY.ink}, 0 10px 24px rgba(0,0,0,0.45)`,
              transform: on ? `scale(${1 + 0.08 * k}) rotate(${i % 2 ? 2 : -2}deg)` : undefined,
              display: "inline-block",
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

export const ClayLowerThird: React.FC<{ name: string; line: string }> = ({ name, line }) => (
  <div style={{ position: "absolute", left: 64, bottom: 560 }}>
    <Pop tilt={-2}>
      <div style={{ ...clay("#FFD6E7", 36), padding: "20px 34px", fontFamily: CLAY_FONT, color: CLAY.ink }}>
        <div style={{ fontWeight: 700, fontSize: 58, lineHeight: 1.05 }}>{name}</div>
        <div style={{ fontWeight: 500, fontSize: 32, marginTop: 4 }}>{line}</div>
      </div>
    </Pop>
  </div>
);

export const ClayEndCard: React.FC<{ slug: string; lastFrame: number; question: string; url: string }> = ({ slug, lastFrame, question, url }) => (
  <AbsoluteFill>
    <Freeze frame={lastFrame}>
      <AbsoluteFill style={{ filter: "blur(16px) brightness(1.05)", transform: "scale(1.08)" }}>
        <OffthreadVideo src={staticFile(`${slug}/work/cut.mp4`)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
    </Freeze>
    <AbsoluteFill style={{ background: "rgba(233,221,251,0.55)", justifyContent: "center", alignItems: "center", gap: 46 }}>
      <Pop tilt={-2}>
        <div style={{ ...clay("#F7F2FF", 56), padding: "50px 64px", fontFamily: CLAY_FONT, fontWeight: 700, fontSize: 92, color: CLAY.ink, textAlign: "center" }}>{question}</div>
      </Pop>
      <Pop delay={8} tilt={3}>
        <div style={{ ...clay("#BFF0D4", 999), padding: "18px 46px", fontFamily: CLAY_FONT, fontWeight: 600, fontSize: 52, color: CLAY.ink }}>{url}</div>
      </Pop>
    </AbsoluteFill>
  </AbsoluteFill>
);

/** The one full-screen moment: a clay room, the sentence landing word by word on clay pills. */
export const ClayHero: React.FC<{ words: { text: string; start: number }[]; at: number }> = ({ words, at }) => {
  const t = useCurrentFrame() / FPS + at;
  return (
    <AbsoluteFill style={{ background: "#E9DDFB", justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{ ...clay("#FFD6A8", 999), position: "absolute", width: 380, height: 380, right: -110, top: 120 }} />
      <div style={{ ...clay("#BFF0D4", 999), position: "absolute", width: 240, height: 240, left: -70, bottom: 260 }} />
      <div style={{ ...clay("#C9E4FF", 999), position: "absolute", width: 150, height: 150, left: 120, top: 260 }} />
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 30, maxWidth: 920 }}>
        {words.map((w, i) =>
          t >= w.start ? (
            <Pop key={i} delay={Math.round((w.start - at) * FPS)} tilt={i % 2 ? 3 : -3}>
              <div style={{ ...clay(fill(i), 50), padding: "14px 40px", fontFamily: CLAY_FONT, fontWeight: 700, fontSize: 130, color: CLAY.ink }}>{w.text}</div>
            </Pop>
          ) : null,
        )}
      </div>
    </AbsoluteFill>
  );
};

export type ClayCoverProps = { slug: string; at: number; title: string; mark: string; kicker: string; layout: "face" | "chat" | "big" };

/** A cover in clay: a kicker pill, the headline with its key words on a clay pill, and his face or the product. */
export const ClayCover: React.FC<ClayCoverProps> = ({ slug, at, title, mark, kicker, layout }) => {
  const parts = title.includes(mark) ? title.split(mark) : [title, ""];
  return (
    <AbsoluteFill style={{ background: "#E9DDFB", alignItems: "center", justifyContent: "center", padding: "120px 70px", gap: 50, fontFamily: CLAY_FONT, color: CLAY.ink }}>
      <div style={{ ...clay("#FFD6A8", 999), position: "absolute", width: 420, height: 420, right: -140, top: -60 }} />
      <div style={{ ...clay("#BFF0D4", 999), position: "absolute", width: 260, height: 260, left: -90, bottom: 120 }} />
      <div style={{ ...clay("#FFD6E7", 999), position: "relative", padding: "14px 40px", fontWeight: 600, fontSize: 44, transform: "rotate(-3deg)" }}>{kicker}</div>
      <div style={{ position: "relative", fontWeight: 700, fontSize: layout === "big" ? 160 : 118, lineHeight: 1.06, textAlign: "center" }}>
        {parts[0]}
        {mark ? <span style={{ ...clay("#FFF0B8", 40), display: "inline-block", padding: "0 26px", margin: "10px 0", transform: "rotate(-2deg)" }}>{mark}</span> : null}
        {parts[1]}
      </div>
      {layout === "face" ? (
        <div style={{ ...clay("#F7F2FF", 60), position: "relative", padding: 22, transform: "rotate(2deg)" }}>
          <div style={{ width: 640, height: 720, borderRadius: 44, overflow: "hidden" }}>
            <Freeze frame={Math.round(at * FPS)}>
              <OffthreadVideo src={staticFile(`${slug}/work/cut.mp4`)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </Freeze>
          </div>
        </div>
      ) : layout === "chat" ? (
        <div style={{ ...clay("#F7F2FF", 56), position: "relative", width: 860, padding: 40, display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ fontWeight: 600, fontSize: 30, opacity: 0.7 }}>AI agent</div>
          <div style={{ ...clay("#C9E4FF", 34), alignSelf: "flex-end", padding: "18px 28px", fontWeight: 600, fontSize: 40 }}>Move everything due this week to Monday</div>
          <div style={{ ...clay("#FFF0B8", 34), alignSelf: "flex-start", padding: "18px 28px", fontWeight: 600, fontSize: 40 }}>Done. 12 tasks moved.</div>
        </div>
      ) : null}
      <div style={{ ...clay("#ffffff", 999), position: "relative", padding: "14px 40px", fontWeight: 600, fontSize: 40 }}>askverb.com</div>
    </AbsoluteFill>
  );
};
