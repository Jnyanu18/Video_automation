import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, staticFile, useCurrentFrame, Easing } from "remotion";
import { Audio } from "@remotion/media";
import { C, F, FPS, Word } from "../../kit/theme";
import wordsJson from "../../../../videos/ailo-launch/words.json";

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 0.8 : 30;

// Easing & Spring Helpers (Vishnu Standard + Shotcraft Curves)
const c01 = (x: number) => Math.max(0, Math.min(1, x));
const sp = (t: number, stiff = 160) =>
  t <= 0 ? 0 : spring({ frame: t * FPS, fps: FPS, config: { damping: 13, stiffness: stiff, mass: 0.7 } });

// Cinematic 3D Camera Rig Wrapper
const CameraRig: React.FC<{
  frame: number;
  startFrame: number;
  endFrame: number;
  rotX?: [number, number];
  rotY?: [number, number];
  rotZ?: [number, number];
  scale?: [number, number];
  panY?: [number, number];
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({
  frame,
  startFrame,
  endFrame,
  rotX = [0, 0],
  rotY = [0, 0],
  rotZ = [0, 0],
  scale = [1, 1],
  panY = [0, 0],
  children,
  style,
}) => {
  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  });

  const currentRotX = interpolate(progress, [0, 1], rotX);
  const currentRotY = interpolate(progress, [0, 1], rotY);
  const currentRotZ = interpolate(progress, [0, 1], rotZ);
  const currentScale = interpolate(progress, [0, 1], scale);
  const currentPanY = interpolate(progress, [0, 1], panY);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        perspective: 1400,
        perspectiveOrigin: "50% 45%",
        transformStyle: "preserve-3d",
        transform: `translateY(${currentPanY}px) scale(${currentScale}) rotateX(${currentRotX}deg) rotateY(${currentRotY}deg) rotateZ(${currentRotZ}deg)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Cinematic 3D Card with Edge Highlights & Depth Drop Shadows
const CinematicCard: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  t: number;
  fill?: string;
  r?: number;
  z?: number;
  rotX?: number;
  rotY?: number;
  shadow?: string;
  borderGlow?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({
  x,
  y,
  w,
  h,
  t,
  fill = "#1c1b22",
  r = 28,
  z = 0,
  rotX = 0,
  rotY = 0,
  shadow = "0 35px 80px rgba(0,0,0,0.65), 0 10px 25px rgba(0,0,0,0.4)",
  borderGlow = "1px solid rgba(255,255,255,0.12)",
  children,
  style,
}) => {
  const k = sp(t);
  const entranceZ = (1 - k) * -160 + z;
  const entranceY = (1 - k) * 60;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: fill,
        borderRadius: r,
        boxShadow: shadow,
        border: borderGlow,
        opacity: c01(t / 0.14),
        transformStyle: "preserve-3d",
        transform: `translateY(${entranceY}px) translateZ(${entranceZ}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${
          0.92 + 0.08 * k
        })`,
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Specular Edge Highlight on Top Border */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
        }}
      />
      {children}
    </div>
  );
};

// Title Inset with Depth
const In: React.FC<{ t: number; dy?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  t,
  dy = 40,
  children,
  style,
}) => {
  const k = sp(t);
  return (
    <div
      style={{
        position: "absolute",
        opacity: c01(t / 0.14),
        transform: `translateY(${(1 - k) * dy}px) scale(${0.94 + 0.06 * k})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Captions (TikTok Style chunked karaoke, gold highlight)
const chunked = (wordsList: Word[]) => {
  const out: Word[][] = [];
  let c: Word[] = [];
  wordsList.forEach((w) => {
    c.push(w);
    if (c.length >= 3 || /[.,!?;:]$/.test(w.w)) {
      out.push(c);
      c = [];
    }
  });
  if (c.length) out.push(c);
  return out;
};

const Captions: React.FC<{ words: Word[]; now: number }> = ({ words, now }) => {
  const chunks = chunked(words);
  const cur = [...chunks].reverse().find((c) => c[0].start <= now + 0.04);
  if (!cur) return null;
  const live = [...cur].reverse().find((w) => w.start <= now + 0.04);
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 1560, // Safe zone: >= 1560, < 1680 (above 1680 bottom bar)
        textAlign: "center",
        fontFamily: F.body,
        fontWeight: 800,
        fontSize: 56,
        letterSpacing: 0.5,
        textShadow: "0 6px 16px rgba(0,0,0,0.85)",
      }}
    >
      {cur.map((w, i) => {
        const isLive = w === live;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              margin: "0 0.15em",
              color: isLive ? "#ffc400" : "#ffffff",
              transform: isLive ? "scale(1.08)" : "scale(1)",
              transition: "transform 0.08s ease-out",
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

// SFX Trigger Helper
const Sfx: React.FC<{ file: string; startSec: number; vol?: number }> = ({ file, startSec, vol = 0.4 }) => {
  const startFrame = Math.max(0, Math.round(startSec * FPS));
  return (
    <Sequence from={startFrame}>
      <Audio src={staticFile(`_sfx/cc0/${file}`)} volume={vol} />
    </Sequence>
  );
};

export const AiloLaunch: React.FC = () => {
  const frame = useCurrentFrame();
  const now = frame / FPS;

  // Key Timestamps from words.json
  const tHook = 0.0;
  const tAilo = 2.14; // "Here's your own... AILO"
  const tImagine = 5.5; // "Imagine you drop your raw footage in..."
  const tMore = 12.0; // "Need more? B-roll suggestions..."
  const tNLE = 19.5; // "Premiere and DaVinci... Claude and Gemini"
  const tCTA = 24.1; // "Comment AILO"

  // Frame counts per section
  const fHook = 0;
  const fAilo = Math.round(tAilo * FPS); // ~64
  const fImagine = Math.round(tImagine * FPS); // ~165
  const fMore = Math.round(tMore * FPS); // ~360
  const fNLE = Math.round(tNLE * FPS); // ~585
  const fCTA = Math.round(tCTA * FPS); // ~723
  const fEnd = Math.round(seconds * FPS); // ~910

  // Background Theme Transitions
  let bgColor = "#0d0c11"; // Dark charcoal base
  if (now >= tAilo && now < tImagine) {
    bgColor = "#08130f"; // Deep emerald tint on AILO reveal
  } else if (now >= tImagine && now < tMore) {
    bgColor = "#0f0c18"; // Deep violet tint for Timeline engine
  } else if (now >= tMore && now < tNLE) {
    bgColor = "#0a0e14"; // Blue-gray slate for B-roll / SFX
  } else if (now >= tNLE && now < tCTA) {
    bgColor = "#110c18"; // Creative studio purple
  } else if (now >= tCTA) {
    bgColor = "#08080a"; // Intense CTA pitch
  }

  // Floating breathing idle motion
  const floatY = Math.sin(frame * 0.06) * 5;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, color: "#ffffff", overflow: "hidden" }}>
      {/* Voiceover Master Track */}
      <Audio src={staticFile("ailo-launch/voice/voice.mp3")} volume={1.0} />

      {/* Rhythmic SFX Hits */}
      <Sfx file="whoosh.wav" startSec={0.0} vol={0.35} />
      <Sfx file="error.wav" startSec={0.8} vol={0.3} />
      <Sfx file="swipe.wav" startSec={2.14} vol={0.4} />
      <Sfx file="sparkle.wav" startSec={3.0} vol={0.35} />
      <Sfx file="snap.wav" startSec={5.6} vol={0.4} />
      <Sfx file="clicks.wav" startSec={8.2} vol={0.3} />
      <Sfx file="pop.wav" startSec={12.1} vol={0.35} />
      <Sfx file="stamp.wav" startSec={14.0} vol={0.35} />
      <Sfx file="swish.wav" startSec={19.5} vol={0.4} />
      <Sfx file="ding.wav" startSec={21.3} vol={0.35} />
      <Sfx file="subdrop.wav" startSec={24.1} vol={0.5} />
      <Sfx file="cash.wav" startSec={25.2} vol={0.35} />

      {/* Ambient Cinematic Studio Lighting Spot */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          left: "20%",
          width: "60%",
          height: "45%",
          background: "radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top Brand Tag (Safe Zone: 210px) */}
      <In t={now - 0.1} dy={10} style={{ left: 0, right: 0, top: 210, textAlign: "center" }}>
        <div style={{ fontFamily: F.mono, fontSize: 26, letterSpacing: 4, color: "#10b981", fontWeight: 700 }}>
          {now >= tCTA ? "PRIVATE BETA ACCESS" : "AI VIDEO STUDIO · 2026"}
        </div>
      </In>

      {/* ========================================================================= */}
      {/* SCENE 1: Hook (0.0s - 2.14s) — Isometric Low Dutch Tilt + Dolly In        */}
      {/* ========================================================================= */}
      {now < tAilo && (
        <CameraRig
          frame={frame}
          startFrame={fHook}
          endFrame={fAilo}
          rotX={[12, 8]}
          rotY={[-10, -5]}
          rotZ={[2, 0.5]}
          scale={[1.0, 1.05]}
          panY={[0, -10]}
        >
          <In t={now - tHook} dy={25} style={{ left: 60, right: 60, top: 260, textAlign: "center" }}>
            <h1
              style={{
                fontFamily: F.display,
                fontSize: 92,
                lineHeight: 1.05,
                margin: 0,
                color: "#ffffff",
                letterSpacing: -1,
              }}
            >
              Why pay <span style={{ fontStyle: "italic", color: "#f87171" }}>thousands</span> for a video editor?
            </h1>
          </In>

          {/* Foreground 3D Invoice Slab with Multiplane Depth */}
          <CinematicCard
            x={120}
            y={490}
            w={840}
            h={640}
            t={now - 0.2}
            z={30}
            rotX={4}
            rotY={-3}
            fill="#18141d"
            borderGlow="1px solid rgba(239,68,68,0.25)"
          >
            <div style={{ padding: "36px 44px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: F.mono, fontSize: 24, color: "#8e889a", letterSpacing: 2 }}>
                  MONTHLY EXPENSE
                </span>
                <span
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    color: "#f87171",
                    padding: "8px 16px",
                    borderRadius: 12,
                    fontFamily: F.mono,
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  HIGH FRICTION
                </span>
              </div>

              {/* Huge Red Strikethrough Price */}
              <div
                style={{
                  fontFamily: F.display,
                  fontSize: 108,
                  fontWeight: 700,
                  color: "#ef4444",
                  marginTop: 20,
                  lineHeight: 1,
                  textShadow: "0 10px 30px rgba(239,68,68,0.3)",
                }}
              >
                -$4,800<span style={{ fontSize: 36, color: "#a8a29e" }}>/mo</span>
              </div>

              {/* Stacked invoice lines floating forward */}
              <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 18 }}>
                {[
                  ["Agency Retainer (15h cut/re-cut)", "$2,800"],
                  ["Rush Turnaround Fees", "$1,100"],
                  ["Revision Surcharges (Round 4)", "$900"],
                ].map(([label, cost], idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "rgba(255,255,255,0.04)",
                      padding: "16px 20px",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.07)",
                      transform: `translateZ(${idx * 15}px)`,
                      boxShadow: "0 6px 15px rgba(0,0,0,0.3)",
                    }}
                  >
                    <span style={{ fontFamily: F.body, fontSize: 26, color: "#d1d5db" }}>{label}</span>
                    <span style={{ fontFamily: F.mono, fontSize: 26, color: "#f87171", fontWeight: 700 }}>{cost}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                right: 30,
                bottom: 24,
                fontFamily: F.mono,
                fontSize: 18,
                letterSpacing: 2,
                color: "#6b7280",
              }}
            >
              ILLUSTRATIVE
            </div>
          </CinematicCard>
        </CameraRig>
      )}

      {/* ========================================================================= */}
      {/* SCENE 2: The Solution (2.14s - 5.5s) — Hero Angle Orbit & Anamorphic Flare */}
      {/* ========================================================================= */}
      {now >= tAilo && now < tImagine && (
        <CameraRig
          frame={frame}
          startFrame={fAilo}
          endFrame={fImagine}
          rotX={[8, 3]}
          rotY={[14, -3]}
          rotZ={[-1.5, 0.5]}
          scale={[0.98, 1.03]}
          panY={[15, -5]}
        >
          <In t={now - tAilo} dy={25} style={{ left: 60, right: 60, top: 260, textAlign: "center" }}>
            <h1
              style={{
                fontFamily: F.display,
                fontSize: 94,
                lineHeight: 1.05,
                margin: 0,
                color: "#ffffff",
                letterSpacing: -1,
              }}
            >
              Meet <span style={{ fontStyle: "italic", color: "#10b981" }}>AILO</span>.
            </h1>
            <p style={{ fontFamily: F.body, fontSize: 32, color: "#9ca3af", marginTop: 12 }}>
              Your local AI video director.
            </p>
          </In>

          <CinematicCard
            x={80}
            y={480}
            w={920}
            h={680}
            t={now - tAilo - 0.15}
            z={50}
            rotX={2}
            rotY={-2}
            fill="#0b1713"
            borderGlow="1px solid rgba(16,185,129,0.3)"
            shadow="0 40px 90px rgba(0,0,0,0.7), 0 0 40px rgba(16,185,129,0.15)"
          >
            {/* Window Header with Anamorphic Flare */}
            <div
              style={{
                height: 60,
                background: "rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "center",
                padding: "0 24px",
                gap: 12,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: 7, background: "#ef4444" }} />
              <div style={{ width: 14, height: 14, borderRadius: 7, background: "#f59e0b" }} />
              <div style={{ width: 14, height: 14, borderRadius: 7, background: "#10b981" }} />
              <div
                style={{
                  fontFamily: F.mono,
                  fontSize: 20,
                  color: "#9ca3af",
                  marginLeft: 12,
                  background: "rgba(255,255,255,0.05)",
                  padding: "4px 14px",
                  borderRadius: 8,
                }}
              >
                ailo-daemon · 127.0.0.1:8420
              </div>

              {/* Anamorphic Light Beam */}
              <div
                style={{
                  position: "absolute",
                  left: -100 + (now - tAilo) * 280,
                  top: 0,
                  width: 140,
                  height: "100%",
                  background: "linear-gradient(90deg, transparent, rgba(52,211,153,0.3), transparent)",
                  transform: "skewX(-25deg)",
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* App Body */}
            <div style={{ padding: "36px 40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 48, color: "#10b981", fontWeight: 700 }}>
                    AILO Studio Pro
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: 22, color: "#6ee7b7", marginTop: 4 }}>
                    AUTONOMOUS TIMELINE PIPELINE
                  </div>
                </div>
                <div
                  style={{
                    background: "#064e3b",
                    color: "#34d399",
                    border: "1px solid #10b981",
                    padding: "8px 20px",
                    borderRadius: 20,
                    fontFamily: F.mono,
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  ● LOCAL HOST
                </div>
              </div>

              {/* Terminal Execution Mock */}
              <div
                style={{
                  background: "#050d0a",
                  borderRadius: 18,
                  padding: "24px 28px",
                  marginTop: 28,
                  fontFamily: F.mono,
                  fontSize: 24,
                  lineHeight: 1.6,
                  color: "#e5e7eb",
                  border: "1px solid rgba(16,185,129,0.25)",
                  boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)",
                }}
              >
                <div style={{ color: "#10b981" }}>$ ailo init --watch ~/raw-footage</div>
                <div style={{ color: "#9ca3af" }}>✓ Model loaded: Claude 3.7 Vision + Whisper</div>
                <div style={{ color: "#9ca3af" }}>✓ Premiere / DaVinci Bridge: Connected</div>
                <div style={{ color: "#34d399", fontWeight: 700, marginTop: 8 }}>
                  Ready to direct raw clips in background.
                </div>
              </div>

              {/* Metric Row with 3D Pop */}
              <div style={{ display: "flex", gap: 20, marginTop: 28 }}>
                {[
                  ["Cloud Latency", "0 ms (Local)"],
                  ["Monthly Cost", "$0 / Unlimited"],
                  ["Privacy", "100% On-Device"],
                ].map(([k, val], i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 16,
                      padding: "16px 20px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      transform: "translateZ(20px)",
                    }}
                  >
                    <div style={{ fontFamily: F.mono, fontSize: 18, color: "#9ca3af" }}>{k}</div>
                    <div style={{ fontFamily: F.body, fontSize: 24, fontWeight: 700, color: "#ffffff", marginTop: 4 }}>
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                right: 30,
                bottom: 24,
                fontFamily: F.mono,
                fontSize: 18,
                letterSpacing: 2,
                color: "#059669",
              }}
            >
              ILLUSTRATIVE
            </div>
          </CinematicCard>
        </CameraRig>
      )}

      {/* ========================================================================= */}
      {/* SCENE 3: Feature 1 (5.5s - 12.0s) — Steep-Tilt Glide Editing Console     */}
      {/* ========================================================================= */}
      {now >= tImagine && now < tMore && (
        <CameraRig
          frame={frame}
          startFrame={fImagine}
          endFrame={fMore}
          rotX={[24, 18]}
          rotY={[-18, -10]}
          rotZ={[-3, -1]}
          scale={[1.02, 1.07]}
          panY={[20, -10]}
        >
          <In t={now - tImagine} dy={25} style={{ left: 60, right: 60, top: 250, textAlign: "center" }}>
            <h1
              style={{
                fontFamily: F.display,
                fontSize: 88,
                lineHeight: 1.05,
                margin: 0,
                color: "#ffffff",
                letterSpacing: -1,
              }}
            >
              Cuts silences. <span style={{ fontStyle: "italic", color: "#a855f7" }}>Syncs to the beat.</span>
            </h1>
          </In>

          <CinematicCard
            x={70}
            y={460}
            w={940}
            h={720}
            t={now - tImagine - 0.15}
            z={45}
            fill="#120c1c"
            borderGlow="1px solid rgba(168,85,247,0.3)"
            shadow="0 45px 100px rgba(0,0,0,0.8), 0 0 35px rgba(168,85,247,0.2)"
          >
            {/* Timeline Workspace Header */}
            <div
              style={{
                padding: "24px 32px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: "#a855f7" }} />
                <span style={{ fontFamily: F.mono, fontSize: 22, color: "#d8b4fe", letterSpacing: 1 }}>
                  TIMELINE AUTOPILOT · 124 BPM
                </span>
              </div>
              <span
                style={{
                  background: "#7e22ce",
                  color: "#f3e8ff",
                  padding: "6px 16px",
                  borderRadius: 14,
                  fontFamily: F.mono,
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                142 SILENCES STRIPPED
              </span>
            </div>

            {/* Video Tracks Mockup with Laser Playhead */}
            <div style={{ padding: "32px 36px", position: "relative" }}>
              {/* Animated Laser Playhead */}
              <div
                style={{
                  position: "absolute",
                  left: 36 + ((frame * 2.5) % 860),
                  top: 24,
                  bottom: 120,
                  width: 3,
                  background: "#ffc400",
                  boxShadow: "0 0 15px #ffc400, 0 0 30px #ffc400",
                  zIndex: 20,
                }}
              />

              {/* Video Track 1 */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: F.mono, fontSize: 18, color: "#9ca3af", marginBottom: 8 }}>
                  V1 · RAW TALKING HEAD (0:00 - 3:45)
                </div>
                <div
                  style={{
                    height: 94,
                    background: "#1c1428",
                    borderRadius: 14,
                    display: "flex",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.12)",
                    position: "relative",
                  }}
                >
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: i % 2 === 0 ? 1.6 : 0.6,
                        margin: "0 3px",
                        background: i % 2 === 0 ? "#6b21a8" : "rgba(239, 68, 68, 0.4)",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: F.mono,
                        fontSize: 16,
                        color: "#ffffff",
                      }}
                    >
                      {i % 2 === 0 ? `Take ${i / 2 + 1}` : "CUT"}
                    </div>
                  ))}
                </div>
              </div>

              {/* Audio Track 1 with Waveforms */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: F.mono, fontSize: 18, color: "#9ca3af", marginBottom: 8 }}>
                  A1 · DIALOGUE + BEAT GRID SNAP
                </div>
                <div
                  style={{
                    height: 84,
                    background: "#161022",
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 14px",
                    gap: 6,
                    border: "1px solid rgba(255,255,255,0.1)",
                    overflow: "hidden",
                  }}
                >
                  {Array.from({ length: 48 }).map((_, i) => {
                    const waveH = Math.sin(i * 0.45 + frame * 0.25) * 30 + 36;
                    const isCut = i > 12 && i < 18;
                    return (
                      <div
                        key={i}
                        style={{
                          width: 10,
                          height: isCut ? 4 : waveH,
                          background: isCut ? "#ef4444" : "#a855f7",
                          borderRadius: 4,
                          opacity: isCut ? 0.4 : 0.9,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Speed & Execution Tag with 3D Elevation */}
              <div
                style={{
                  background: "rgba(168, 85, 247, 0.14)",
                  border: "1px solid rgba(168, 85, 247, 0.35)",
                  borderRadius: 16,
                  padding: "18px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transform: "translateZ(30px)",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                }}
              >
                <div>
                  <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 26, color: "#ffffff" }}>
                    Rough Cut Generated in 1.4s
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 20, color: "#c084fc", marginTop: 2 }}>
                    Ums, pauses, and repeated sentences automatically purged.
                  </div>
                </div>
                <div
                  style={{
                    background: "#9333ea",
                    color: "#fff",
                    padding: "8px 18px",
                    borderRadius: 12,
                    fontFamily: F.mono,
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  100% ACCURACY
                </div>
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                right: 30,
                bottom: 24,
                fontFamily: F.mono,
                fontSize: 18,
                letterSpacing: 2,
                color: "#7e22ce",
              }}
            >
              ILLUSTRATIVE
            </div>
          </CinematicCard>
        </CameraRig>
      )}

      {/* ========================================================================= */}
      {/* SCENE 4: Feature 2 (12.0s - 19.5s) — 3D Cascading Deck Flyin               */}
      {/* ========================================================================= */}
      {now >= tMore && now < tNLE && (
        <CameraRig
          frame={frame}
          startFrame={fMore}
          endFrame={fNLE}
          rotX={[10, 4]}
          rotY={[-12, 6]}
          rotZ={[1.5, -0.8]}
          scale={[0.98, 1.04]}
          panY={[10, -10]}
        >
          <In t={now - tMore} dy={25} style={{ left: 60, right: 60, top: 250, textAlign: "center" }}>
            <h1
              style={{
                fontFamily: F.display,
                fontSize: 88,
                lineHeight: 1.05,
                margin: 0,
                color: "#ffffff",
                letterSpacing: -1,
              }}
            >
              B-roll. <span style={{ fontStyle: "italic", color: "#38bdf8" }}>Impact sound.</span> Captions.
            </h1>
          </In>

          {/* 3 Staggered 3D Cascading Cards */}
          <div style={{ position: "absolute", left: 80, right: 80, top: 480, display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Card 1: B-Roll Auto Match */}
            <CinematicCard
              x={0}
              y={0}
              w={920}
              h={190}
              t={now - tMore - 0.1}
              z={10}
              rotX={3}
              rotY={-5}
              fill="#0d1422"
              borderGlow="1px solid rgba(56,189,248,0.25)"
              style={{ position: "relative" }}
            >
              <div style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 24 }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    background: "#0284c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    flexShrink: 0,
                  }}
                >
                  🎬
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 30, color: "#ffffff" }}>
                    Contextual B-Roll Placement
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 22, color: "#94a3b8", marginTop: 4 }}>
                    Matches topic phrases with cinematic overlays automatically.
                  </div>
                </div>
                <span
                  style={{
                    background: "rgba(56, 189, 248, 0.2)",
                    color: "#38bdf8",
                    padding: "8px 16px",
                    borderRadius: 12,
                    fontFamily: F.mono,
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  AUTO-INSERTED
                </span>
              </div>
            </CinematicCard>

            {/* Card 2: Impact Sound Design */}
            <CinematicCard
              x={0}
              y={0}
              w={920}
              h={190}
              t={now - tMore - 0.3}
              z={50}
              rotX={-2}
              rotY={4}
              fill="#13141f"
              borderGlow="1px solid rgba(245,158,11,0.25)"
              style={{ position: "relative" }}
            >
              <div style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 24 }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    background: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    flexShrink: 0,
                  }}
                >
                  🔊
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 30, color: "#ffffff" }}>
                    Impact Sound Design
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 22, color: "#94a3b8", marginTop: 4 }}>
                    Whooshes, risers, and sub-drops timed to scene cuts and punch-ins.
                  </div>
                </div>
                <span
                  style={{
                    background: "rgba(245, 158, 11, 0.2)",
                    color: "#fbbf24",
                    padding: "8px 16px",
                    borderRadius: 12,
                    fontFamily: F.mono,
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  -19 LUFS MIX
                </span>
              </div>
            </CinematicCard>

            {/* Card 3: Kinetic Captions */}
            <CinematicCard
              x={0}
              y={0}
              w={920}
              h={190}
              t={now - tMore - 0.5}
              z={90}
              rotX={2}
              rotY={-3}
              fill="#0e1814"
              borderGlow="1px solid rgba(16,185,129,0.3)"
              style={{ position: "relative" }}
            >
              <div style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 24 }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    background: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    flexShrink: 0,
                  }}
                >
                  ⚡
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 30, color: "#ffffff" }}>
                    Viral Kinetic Captions
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 22, color: "#94a3b8", marginTop: 4 }}>
                    3-word chunking, safe-zone anchored, zero hallucination.
                  </div>
                </div>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#34d399",
                    padding: "8px 16px",
                    borderRadius: 12,
                    fontFamily: F.mono,
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  60 FPS SPRING
                </span>
              </div>
            </CinematicCard>
          </div>
        </CameraRig>
      )}

      {/* ========================================================================= */}
      {/* SCENE 5: Feature 3 (19.5s - 24.1s) — Split-Angle NLEs + Hologram Core    */}
      {/* ========================================================================= */}
      {now >= tNLE && now < tCTA && (
        <CameraRig
          frame={frame}
          startFrame={fNLE}
          endFrame={fCTA}
          rotX={[8, 3]}
          rotY={[-10, 8]}
          rotZ={[-1, 1]}
          scale={[0.97, 1.03]}
          panY={[10, -5]}
        >
          <In t={now - tNLE} dy={25} style={{ left: 60, right: 60, top: 250, textAlign: "center" }}>
            <h1
              style={{
                fontFamily: F.display,
                fontSize: 88,
                lineHeight: 1.05,
                margin: 0,
                color: "#ffffff",
                letterSpacing: -1,
              }}
            >
              Inside <span style={{ fontStyle: "italic", color: "#f43f5e" }}>Premiere</span> &{" "}
              <span style={{ fontStyle: "italic", color: "#38bdf8" }}>DaVinci</span>.
            </h1>
          </In>

          <CinematicCard
            x={70}
            y={470}
            w={940}
            h={700}
            t={now - tNLE - 0.15}
            z={35}
            fill="#150f1d"
            borderGlow="1px solid rgba(192,132,252,0.3)"
            shadow="0 45px 100px rgba(0,0,0,0.8)"
          >
            <div style={{ padding: "36px 40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: F.mono, fontSize: 22, color: "#c084fc", letterSpacing: 2 }}>
                  NATIVE NLE TIMELINE EXTENSION
                </span>
                <span
                  style={{
                    background: "#7c3aed",
                    color: "#fff",
                    padding: "6px 16px",
                    borderRadius: 12,
                    fontFamily: F.mono,
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  XML / FCPXML SYNC
                </span>
              </div>

              {/* Dual Engine 3D Split Display */}
              <div style={{ display: "flex", gap: 24, marginTop: 32 }}>
                {/* Adobe Premiere Pro Card */}
                <div
                  style={{
                    flex: 1,
                    background: "#0c0814",
                    borderRadius: 20,
                    padding: "24px",
                    border: "1px solid rgba(192,132,252,0.25)",
                    transform: "rotateY(8deg) translateZ(20px)",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: "#00005b",
                        color: "#9999ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: F.display,
                        fontWeight: 900,
                        fontSize: 28,
                      }}
                    >
                      Pr
                    </div>
                    <div>
                      <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 24, color: "#fff" }}>
                        Premiere Pro
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: 16, color: "#818cf8" }}>NATIVE PANEL</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 20, fontFamily: F.mono, fontSize: 20, color: "#c7d2fe", lineHeight: 1.5 }}>
                    ✓ Reads sequence markers
                    <br />✓ Edits cuts losslessly
                    <br />✓ Zero re-rendering
                  </div>
                </div>

                {/* DaVinci Resolve Card */}
                <div
                  style={{
                    flex: 1,
                    background: "#0c0814",
                    borderRadius: 20,
                    padding: "24px",
                    border: "1px solid rgba(56,189,248,0.25)",
                    transform: "rotateY(-8deg) translateZ(20px)",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: "#1e293b",
                        color: "#38bdf8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: F.display,
                        fontWeight: 900,
                        fontSize: 28,
                      }}
                    >
                      Da
                    </div>
                    <div>
                      <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 24, color: "#fff" }}>
                        DaVinci Resolve
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: 16, color: "#38bdf8" }}>EDL BRIDGE</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 20, fontFamily: F.mono, fontSize: 20, color: "#bae6fd", lineHeight: 1.5 }}>
                    ✓ Color grade preserved
                    <br />✓ Fairlight audio sync
                    <br />✓ Multi-cam switcher
                  </div>
                </div>
              </div>

              {/* Multimodal AI Vision Inspection Floating in Foreground */}
              <div
                style={{
                  marginTop: 28,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 18,
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid rgba(255,255,255,0.12)",
                  transform: "translateZ(50px)",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
                }}
              >
                <div>
                  <div style={{ fontFamily: F.mono, fontSize: 20, color: "#fbbf24", fontWeight: 700 }}>
                    MULTIMODAL VISION INSPECTOR
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 24, color: "#ffffff", marginTop: 4 }}>
                    Claude 3.7 Sonnet + Gemini 2.5 Flash
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: F.mono,
                    fontSize: 22,
                    color: "#34d399",
                    background: "#064e3b",
                    padding: "6px 14px",
                    borderRadius: 10,
                  }}
                >
                  99.4% PACING QA
                </div>
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                right: 30,
                bottom: 24,
                fontFamily: F.mono,
                fontSize: 18,
                letterSpacing: 2,
                color: "#6b7280",
              }}
            >
              ILLUSTRATIVE
            </div>
          </CinematicCard>
        </CameraRig>
      )}

      {/* ========================================================================= */}
      {/* SCENE 6: Outro & Call To Action (24.1s - 30.0s) — Hero Float & Glow       */}
      {/* ========================================================================= */}
      {now >= tCTA && (
        <CameraRig
          frame={frame}
          startFrame={fCTA}
          endFrame={fEnd}
          rotX={[6, 2]}
          rotY={[-6, 4]}
          rotZ={[1, 0]}
          scale={[0.98, 1.04]}
          panY={[floatY, floatY - 5]}
        >
          <In t={now - tCTA} dy={25} style={{ left: 60, right: 60, top: 260, textAlign: "center" }}>
            <h1
              style={{
                fontFamily: F.display,
                fontSize: 98,
                lineHeight: 1.05,
                margin: 0,
                color: "#ffffff",
                letterSpacing: -1,
              }}
            >
              Comment <span style={{ fontStyle: "italic", color: "#10b981" }}>AILO</span>
            </h1>
            <p style={{ fontFamily: F.body, fontSize: 32, color: "#9ca3af", marginTop: 12 }}>
              and I'll send you the private beta link.
            </p>
          </In>

          <CinematicCard
            x={90}
            y={480}
            w={900}
            h={640}
            t={now - tCTA - 0.15}
            z={40}
            fill="#0f1613"
            borderGlow="1px solid rgba(16,185,129,0.35)"
            shadow="0 40px 90px rgba(0,0,0,0.8), 0 0 40px rgba(16,185,129,0.2)"
          >
            <div style={{ padding: "40px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    background: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    boxShadow: "0 0 20px rgba(16,185,129,0.5)",
                  }}
                >
                  ✉️
                </div>
                <div>
                  <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 30, color: "#ffffff" }}>
                    INSTANT INSTAGRAM DM
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: 18, color: "#34d399" }}>AUTOMATED VIA AILO-BOT</div>
                </div>
              </div>

              {/* DM Bubble Mockup with 3D Elevation */}
              <div
                style={{
                  background: "#06281e",
                  borderRadius: 20,
                  padding: "28px 32px",
                  marginTop: 32,
                  border: "1px solid rgba(16,185,129,0.35)",
                  transform: "translateZ(30px)",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.4)",
                }}
              >
                <div style={{ fontFamily: F.body, fontSize: 26, color: "#e5e7eb", lineHeight: 1.4 }}>
                  "Hey! Here is your private beta invite to <strong>AILO Studio</strong>:
                </div>
                <div
                  style={{
                    background: "#10b981",
                    color: "#022c22",
                    padding: "14px 20px",
                    borderRadius: 14,
                    fontFamily: F.mono,
                    fontSize: 24,
                    fontWeight: 700,
                    marginTop: 20,
                    display: "inline-block",
                    boxShadow: "0 6px 20px rgba(16,185,129,0.35)",
                  }}
                >
                  ailo.studio/beta?invite=vip-director
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 20, color: "#6ee7b7", marginTop: 16 }}>
                  ✓ Runs locally on macOS & Windows
                  <br />✓ Premiere Pro + DaVinci plug-in included
                </div>
              </div>

              {/* Share prompt */}
              <div
                style={{
                  marginTop: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.04)",
                  padding: "16px 24px",
                  borderRadius: 16,
                }}
              >
                <span style={{ fontFamily: F.body, fontSize: 24, color: "#9ca3af" }}>
                  Send this to an editor still cutting by hand.
                </span>
                <span style={{ fontSize: 28 }}>↗</span>
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                right: 30,
                bottom: 24,
                fontFamily: F.mono,
                fontSize: 18,
                letterSpacing: 2,
                color: "#059669",
              }}
            >
              ILLUSTRATIVE
            </div>
          </CinematicCard>
        </CameraRig>
      )}

      {/* ========================================================================= */}
      {/* Cinematic Corner Vignette                                                  */}
      {/* ========================================================================= */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, transparent 65%, rgba(0,0,0,0.4) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ========================================================================= */}
      {/* Persistent Word-by-Word Subtitles (TikTok Karaoke Style)                   */}
      {/* ========================================================================= */}
      <Captions words={words} now={now} />
    </AbsoluteFill>
  );
};
