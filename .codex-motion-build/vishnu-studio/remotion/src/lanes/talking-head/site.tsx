import React from "react";
import { AbsoluteFill, Freeze, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadCode } from "@remotion/google-fonts/SourceCodePro";
import { FPS, Word } from "../../kit/theme";
import { chunk } from "../../kit/Captions";

// style: site (Vishnu, 2026-10-24): the look of auralionlabs.com, for Auralion Labs videos. Taken from the
// site's own code (components/receptionist/*, the AI receptionist page): white cards with a hairline ring and a
// soft long shadow, Poppins at medium weight with tight tracking, two-tone headlines (ink, then grey), small
// labels in Source Code Pro, a pale stage with a dot grid that fades at the edges, and one warm orange accent.

export const SITE_FONT = loadPoppins("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily;
export const SITE_CODE = loadCode("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;
export const SITE = {
  ink: "#161722",
  grey: "#6B6A66",
  soft: "#8A8985",
  stage: "#F6F6F8",
  accent: "#E8803A",
};
export const sheet = (r = 40): React.CSSProperties => ({
  background: "#ffffff",
  borderRadius: r,
  boxShadow: "0 2px 4px rgba(22,23,34,0.05), 0 36px 80px -34px rgba(22,23,34,0.45), 0 0 0 2px rgba(0,0,0,0.05)",
});
const dotGrid: React.CSSProperties = {
  backgroundImage: "radial-gradient(rgba(22,23,34,0.14) 2px, transparent 2.6px)",
  backgroundSize: "28px 28px",
  maskImage: "radial-gradient(ellipse 75% 70% at 50% 55%, #000 35%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 50% 55%, #000 35%, transparent 100%)",
};

/** The site's reveal: a short rise with a soft ease, no bounce. Fades out at the end of its sequence. */
export const Rise: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 140, mass: 0.8 } });
  const out = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ transform: `translateY(${(1 - p) * 40}px)`, opacity: Math.min(1, p * 1.6) * out }}>{children}</div>;
};

/** A small mono label with the orange dot, as above the site's sections. */
const Eyebrow: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: SITE_CODE, fontWeight: 500, fontSize: 36, letterSpacing: "0.08em", textTransform: "uppercase", color: SITE.soft }}>
    <span style={{ width: 18, height: 18, borderRadius: 9, background: SITE.accent }} />
    {text}
  </div>
);

/** A text card: the headline in ink, the part after "|" in grey, as the site writes its headlines. A line that
 * starts with "label:" becomes the small mono label above it. */
export const SiteCard: React.FC<{ text: string; mark?: string; small?: boolean }> = ({ text, mark, small }) => {
  const m = text.match(/^([A-Za-z ]{2,24}):\s+(.*)$/);
  const label = m ? m[1] : "";
  const head = m ? m[2] : text;
  return (
    <Rise>
      <div style={{ ...sheet(small ? 30 : 44), padding: small ? "20px 32px 24px" : "34px 48px 38px", maxWidth: small ? 760 : 940, display: "flex", flexDirection: "column", gap: small ? 10 : 16 }}>
        {label ? <Eyebrow text={label} /> : null}
        <div style={{ fontFamily: SITE_FONT, fontWeight: 500, fontSize: small ? 46 : 70, lineHeight: 1.08, letterSpacing: "-0.03em", color: SITE.ink }}>
          {head}
          {mark ? <span style={{ color: SITE.grey }}> {mark}</span> : null}
        </div>
      </div>
    </Rise>
  );
};

export const SiteStat: React.FC<{ value: number; prefix: string; suffix: string; label: string }> = ({ value, prefix, suffix, label }) => {
  const frame = useCurrentFrame();
  const shown = Math.round(interpolate(frame, [0, 18], [0, value], { extrapolateRight: "clamp" }));
  return (
    <Rise>
      <div style={{ ...sheet(48), padding: "34px 64px", textAlign: "center", fontFamily: SITE_FONT, color: SITE.ink }}>
        <div style={{ fontWeight: 500, fontSize: 170, lineHeight: 1, letterSpacing: "-0.04em" }}>
          {prefix}
          {shown.toLocaleString("en-US")}
          <span style={{ color: SITE.accent }}>{suffix}</span>
        </div>
        {label ? <div style={{ fontWeight: 500, fontSize: 42, color: SITE.grey, marginTop: 8 }}>{label}</div> : null}
      </div>
    </Rise>
  );
};

/** Labels that land one by one as white pills with a check, like the site's call outcomes. */
export const SiteChips: React.FC<{ items: { text: string; at: number }[]; start: number }> = ({ items, start }) => {
  const t = useCurrentFrame() / FPS;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      {items.map((it, k) =>
        t + start >= it.at ? (
          <Rise key={k} delay={Math.round((it.at - start) * FPS)}>
            <div style={{ ...sheet(999), padding: "16px 38px", display: "flex", alignItems: "center", gap: 16, fontFamily: SITE_FONT, fontWeight: 500, fontSize: 52, color: SITE.ink }}>
              <span style={{ width: 16, height: 16, borderRadius: 8, background: SITE.accent }} />
              {it.text}
            </div>
          </Rise>
        ) : null,
      )}
    </div>
  );
};

/** Captions: Poppins in white over the footage; the spoken word sits on a white pill in ink. "[beep]" shows as a
 * dark redaction bar, so a bleep reads as a bleep. */
export const SiteCaptions: React.FC<{ words: Word[]; size?: number }> = ({ words, size = 68 }) => {
  const t = useCurrentFrame() / FPS;
  const group = chunk(words, 3, true).find((g) => t >= g[0].start - 0.05 && t <= g[g.length - 1].end + 0.25);
  if (!group) return null;
  // Only the word being said is lit: the last one that has started. Whisper's word times can overlap.
  const lit = group.reduce((k, w, i) => (t >= w.start - 0.02 ? i : k), -1);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: size * 0.2, fontFamily: SITE_FONT, fontWeight: 600, fontSize: size, lineHeight: 1.18, letterSpacing: "-0.02em" }}>
      {group.map((w, i) => {
        const on = i === lit && t <= w.end + 0.35;
        if (w.w === "[beep]") {
          return <span key={i} style={{ display: "inline-block", width: size * 3, height: size * 0.82, marginTop: size * 0.12, borderRadius: size * 0.2, background: SITE.ink, boxShadow: "0 0 0 3px rgba(255,255,255,0.9)" }} />;
        }
        return (
          <span
            key={i}
            style={{
              ...(on ? { ...sheet(size * 0.32), boxShadow: "0 10px 30px -10px rgba(22,23,34,0.6)" } : {}),
              padding: `0 ${size * 0.2}px`,
              color: on ? SITE.ink : "#ffffff",
              textShadow: on ? "none" : "0 3px 16px rgba(0,0,0,0.75), 0 1px 3px rgba(0,0,0,0.9)",
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

export const SiteLowerThird: React.FC<{ name: string; line: string }> = ({ name, line }) => (
  <div style={{ position: "absolute", left: 64, bottom: 560 }}>
    <Rise>
      <div style={{ ...sheet(32), padding: "20px 32px", fontFamily: SITE_FONT, color: SITE.ink }}>
        <div style={{ fontWeight: 500, fontSize: 54, lineHeight: 1.05, letterSpacing: "-0.03em" }}>{name}</div>
        <div style={{ fontWeight: 500, fontSize: 30, color: SITE.grey, marginTop: 4 }}>{line}</div>
      </div>
    </Rise>
  </div>
);

/** The end: the last frame softened behind the site's pale dotted stage, a white card with the two-tone line, and
 * the address on the site's dark button. The question may be split with " / " for the grey second half. */
export const SiteEndCard: React.FC<{ slug: string; lastFrame: number; question: string; url: string }> = ({ slug, lastFrame, question, url }) => {
  const [first, second] = question.split(" / ").map((s) => s.trim());
  return (
    <AbsoluteFill>
      <Freeze frame={lastFrame}>
        <AbsoluteFill style={{ filter: "blur(18px)", transform: "scale(1.08)" }}>
          <OffthreadVideo src={staticFile(`${slug}/work/cut.mp4`)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      </Freeze>
      <AbsoluteFill style={{ background: "rgba(246,246,248,0.9)" }} />
      <AbsoluteFill style={dotGrid} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 54, padding: 70 }}>
        <Rise>
          <div style={{ ...sheet(52), padding: "52px 60px", maxWidth: 940, textAlign: "center", fontFamily: SITE_FONT, fontWeight: 500, fontSize: 84, lineHeight: 1.05, letterSpacing: "-0.035em", color: SITE.ink }}>
            {first}
            {second ? <span style={{ color: SITE.grey }}> {second}</span> : null}
          </div>
        </Rise>
        <Rise delay={8}>
          <div style={{ background: SITE.ink, borderRadius: 999, padding: "22px 54px", display: "flex", alignItems: "center", gap: 18, fontFamily: SITE_FONT, fontWeight: 500, fontSize: 50, color: "#ffffff", boxShadow: "0 24px 50px -18px rgba(22,23,34,0.7)" }}>
            <span style={{ width: 16, height: 16, borderRadius: 8, background: SITE.accent }} />
            {url}
          </div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
