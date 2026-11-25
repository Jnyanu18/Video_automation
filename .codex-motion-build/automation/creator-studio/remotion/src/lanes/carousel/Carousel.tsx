import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, staticFile, useCurrentFrame } from "remotion";
import { C, F } from "../../kit/theme";
import { PixelSlide } from "./PixelSlides";
import { GlassSlide } from "./GlassSlides";

// One slide per frame, 1080 x 1350 (Instagram's 4:5). The light brand look of the talking-head videos:
// paper ground, ink text, gold as a fill, Fraunces titles, DM Sans body, Plex Mono labels.

export type Slide = {
  kind: string;
  kicker?: string;
  title?: string;
  sub?: string;
  bullets: string[];
  tip?: string;
  cta?: string;
  source?: string;
};
export type CarouselProps = { slug: string; slides?: Slide[] | null };

/** Reads videos/<slug>/work/slides.json (written by lanes/carousel/render.py); one frame per slide. */
export const carouselMetadata: CalculateMetadataFunction<CarouselProps> = async ({ props }) => {
  try {
    const res = await fetch(staticFile(`${props.slug}/work/slides.json`));
    const { slides } = (await res.json()) as { slides: Slide[] };
    return { durationInFrames: Math.max(1, slides.length), props: { ...props, slides } };
  } catch {
    return { durationInFrames: 1, props: { ...props, slides: null } };
  }
};

/** "[[word]]" in a title sits on a gold wash. */
const Marked: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\[\[[^\]]+\]\])/).map((part, i) =>
      part.startsWith("[[") ? (
        <span key={i} style={{ background: C.gold, borderRadius: 14, padding: "0 14px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
          {part.slice(2, -2)}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    )}
  </>
);

export const Carousel: React.FC<CarouselProps> = ({ slides }) => {
  const i = useCurrentFrame();
  if (!slides) return <AbsoluteFill style={{ background: C.paper }} />;
  const s = slides[i];
  if (s.kind === "pixel") return <PixelSlide slide={s} i={i} n={slides.length} />;
  if (s.kind === "glass") return <GlassSlide slide={s} i={i} n={slides.length} />;
  const cover = s.kind === "cover";
  const last = i === slides.length - 1;

  return (
    <AbsoluteFill style={{ background: C.paper, padding: "96px 90px 80px", fontFamily: F.body, color: C.ink }}>
      {/* a soft gold corner, the one decoration */}
      <div style={{ position: "absolute", right: -160, top: -160, width: 420, height: 420, borderRadius: 210, background: C.goldWash }} />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>
        {s.kicker ? (
          <div style={{ fontFamily: F.mono, fontSize: 30, letterSpacing: 5, color: C.goldDeep }}>{s.kicker}</div>
        ) : null}

        <div
          style={{
            fontFamily: F.display,
            fontWeight: 600,
            fontSize: cover ? 124 : 90,
            lineHeight: cover ? 1.26 : 1.2,
            letterSpacing: -1,
            marginTop: cover ? 150 : 26,
          }}
        >
          <Marked text={s.title ?? ""} />
        </div>

        {s.sub ? <div style={{ fontSize: cover ? 50 : 42, lineHeight: 1.35, color: C.graphite, marginTop: 44 }}>{s.sub}</div> : null}

        {s.bullets.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 40, marginTop: 64 }}>
            {s.bullets.map((b, k) => (
              <div key={k} style={{ display: "flex", gap: 26, fontSize: 46, lineHeight: 1.3 }}>
                <span style={{ flex: "none", width: 14, height: 14, borderRadius: 7, background: C.gold, marginTop: 22 }} />
                <span>{b}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ flex: 1 }} />

        {s.tip ? (
          <div style={{ display: "flex", gap: 22, background: C.goldWash, borderRadius: 22, padding: "30px 34px", fontSize: 36, lineHeight: 1.35 }}>
            <span style={{ flex: "none", width: 8, borderRadius: 4, background: C.gold }} />
            <span>{s.tip}</span>
          </div>
        ) : null}

        {s.cta ? (
          <div style={{ marginTop: 28, fontFamily: F.display, fontWeight: 600, fontSize: 52 }}>
            <Marked text={s.cta} />
          </div>
        ) : null}

        {s.source ? <div style={{ marginTop: 22, fontSize: 22, color: C.graphite }}>{s.source}</div> : null}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40, fontFamily: F.mono, fontSize: 24, color: C.graphite }}>
          <span>Vishnu · building AskVerb</span>
          <span>{last ? `${i + 1}/${slides.length}` : cover ? "Swipe  →" : `${i + 1}/${slides.length}  →`}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
