import React from "react";
import { C, F } from "../../kit/theme";
import { AvaRig, POSES } from "../../kit/ava";
import type { Slide } from "./Carousel";

// The dark liquid glass carousel (2026-11-06), the studio's default look (black, smoked glass cards over drifting
// gold, blue and amber glows) as stills. Used when a slide's kind is "glass" (videos/agent-25-steps-glass/slides.md).
// Same seven scenes as the pixel version (PixelSlides.tsx), picked by the slide's position. Example data is labelled.

const BG = "#0d0e12";
const TEXT = "#f4f5f7";
const SOFT = "#9aa1ad";
const INK = "#14151a";
const GOLD = C.gold;
const GREEN = "#3fae62";

// Copied from GLASS_DARK in lanes/animated/faceless.tsx (not exported there).
const GLASS: React.CSSProperties = {
  background: "linear-gradient(140deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0.10) 100%)",
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1.5px solid rgba(255,255,255,0.18)",
  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.28), inset 0 -14px 34px rgba(255,255,255,0.04), 0 24px 50px rgba(0,0,0,0.45)",
  borderRadius: 28,
};

const Glow: React.FC<{ seed: number }> = ({ seed }) => (
  <>
    {[
      { c: "rgba(255,196,0,0.42)", x: 60, y: 140, r: 620 },
      { c: "rgba(64,140,255,0.26)", x: 560, y: 560, r: 640 },
      { c: "rgba(255,150,90,0.24)", x: 220, y: 900, r: 520 },
    ].map((g, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: g.x + Math.sin(seed * 1.3 + i) * 80,
          top: g.y + Math.cos(seed * 0.9 + i) * 60,
          width: g.r,
          height: g.r,
          borderRadius: 999,
          background: `radial-gradient(circle, ${g.c} 0%, rgba(255,255,255,0) 68%)`,
        }}
      />
    ))}
  </>
);

const t = (size: number, color = TEXT, weight = 600, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: F.body,
  fontWeight: weight,
  fontSize: size,
  color,
  lineHeight: 1.25,
  ...extra,
});
const mono = (size: number, color = SOFT): React.CSSProperties => ({ fontFamily: F.mono, fontSize: size, color, letterSpacing: 2 });

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={mono(16)}>{children}</div>;

const Bars: React.FC<{ n: number }> = ({ n }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} style={{ height: 10, borderRadius: 5, width: `${[86, 62, 76, 50][i % 4]}%`, background: "rgba(255,255,255,0.14)" }} />
    ))}
  </div>
);

const Win: React.FC<{ title: string; w: number; h: number; style?: React.CSSProperties; bars?: number }> = ({ title, w, h, style, bars = 3 }) => (
  <div style={{ ...GLASS, width: w, height: h, borderRadius: 20, overflow: "hidden", ...style }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
      {[0, 1, 2].map((d) => <div key={d} style={{ width: 10, height: 10, borderRadius: 5, background: d === 0 ? GOLD : "rgba(255,255,255,0.25)" }} />)}
      <div style={{ ...mono(14), marginLeft: 8 }}>{title}</div>
    </div>
    <div style={{ padding: 18 }}>
      <Bars n={bars} />
    </div>
  </div>
);

const Check: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <div style={{ width: size, height: size, borderRadius: size, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24"><path d="M4 12.5 L9.5 18 L20 6.5" stroke="#fff" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </div>
);

const Icon: React.FC<{ d: string }> = ({ d }) => (
  <svg width={64} height={64} viewBox="0 0 24 24"><path d={d} stroke={GOLD} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

// ---------- the seven scenes (940 x 470) ----------

const S1: React.FC = () => (
  <div style={{ position: "relative", width: 940, height: 470 }}>
    {[0, 1, 2, 3].map((n) => (
      <Win key={n} title={`SCREEN ${n + 1}`} w={420} h={240} bars={4} style={{ position: "absolute", left: n * 160, top: 210 - n * 70 }} />
    ))}
    <div style={{ position: "absolute", right: 0, bottom: 6, background: GOLD, borderRadius: 999, padding: "16px 30px", ...t(34, INK, 600) }}>25 steps · 4 screens</div>
    <div style={{ position: "absolute", right: 24, bottom: -26 }}><Label>EXAMPLE</Label></div>
  </div>
);

const MAZE: [number, number, string][] = [
  [0, 10, "SETTINGS"], [230, 0, "FILTERS"], [470, 20, "EXPORT"], [690, 6, "DATES"],
  [60, 140, "USERS"], [300, 150, "RULES"], [540, 135, "TEAM"], [700, 160, "REVIEW"],
];
const S2: React.FC = () => (
  <div style={{ position: "relative", width: 940, height: 470 }}>
    {MAZE.map(([x, y, title], i) => (
      <Win key={i} title={title} w={240} h={140} bars={2} style={{ position: "absolute", left: x, top: y }} />
    ))}
    <div style={{ position: "absolute", left: 0, top: 330, width: 940 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={t(46, TEXT)}>Step <span style={{ color: GOLD }}>17</span> of 25</div>
        <Label>EXAMPLE</Label>
      </div>
      <div style={{ marginTop: 16, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.12)" }}>
        <div style={{ width: "68%", height: "100%", borderRadius: 8, background: GOLD }} />
      </div>
    </div>
  </div>
);

const S3: React.FC = () => (
  <div style={{ position: "relative", width: 940, height: 470 }}>
    <div style={{ ...GLASS, padding: "34px 36px", display: "flex", alignItems: "center", gap: 24 }}>
      <div style={{ flex: 1, ...t(40, TEXT, 400) }}>
        Move order 4821 to Friday morning
        <span style={{ display: "inline-block", width: 4, height: 44, background: GOLD, marginLeft: 6, verticalAlign: "middle" }} />
      </div>
      <div style={{ width: 76, height: 76, borderRadius: 38, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <svg width={34} height={34} viewBox="0 0 24 24"><path d="M5 12 H19 M13 6 L19 12 L13 18" stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </div>
    <div style={{ position: "absolute", left: 0, top: 250, display: "flex", alignItems: "baseline", gap: 24 }}>
      <div style={t(84, TEXT)}>Step <span style={{ color: GOLD }}>1</span> of 1</div>
      <Label>EXAMPLE</Label>
    </div>
  </div>
);

const ROWS: [string, string][] = [["Order", "4821"], ["From", "Thu 14:00"], ["To", "Fri 09:00"], ["Customer notified", "Yes"]];
const S4: React.FC = () => (
  <div style={{ width: 940, height: 470, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
    <div style={{ ...GLASS, width: 820, padding: "28px 36px 30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ ...mono(18, GOLD) }}>NEEDS YOUR APPROVAL</div>
        <Label>EXAMPLE</Label>
      </div>
      <div style={t(40, TEXT, 600, { marginTop: 12 })}>Reschedule delivery</div>
      <div style={{ marginTop: 16 }}>
        {ROWS.map(([a, b]) => (
          <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={t(28, SOFT, 400)}>{a}</div>
            <div style={t(28, TEXT, 600)}>{b}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 24, justifyContent: "flex-end" }}>
        <div style={{ border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: 999, padding: "12px 30px", ...t(26, TEXT, 600) }}>Cancel</div>
        <div style={{ background: GOLD, borderRadius: 999, padding: "13px 32px", ...t(26, INK, 600) }}>Confirm</div>
      </div>
    </div>
  </div>
);

const TILES: [string, string][] = [
  ["Acts as the signed-in user", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"],
  ["Every action read or write", "M3 7h8v10H3z M13 7h8v10h-8z M6 11h2 M16 11h2"],
  ["A log of who approved what", "M6 3h9l4 4v14H6z M9 10h7 M9 14h7 M9 18h4"],
  ["An off switch", "M7 7h10a5 5 0 0 1 0 10H7A5 5 0 0 1 7 7z M7 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0"],
];
const S5: React.FC = () => (
  <div style={{ display: "grid", gridTemplateColumns: "450px 450px", gap: 40, width: 940 }}>
    {TILES.map(([label, d]) => (
      <div key={label} style={{ ...GLASS, height: 205, padding: 26, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Icon d={d} />
          <Check />
        </div>
        <div style={t(30, TEXT, 600)}>{label}</div>
      </div>
    ))}
  </div>
);

const S6: React.FC = () => (
  <div style={{ position: "relative", width: 940, height: 470 }}>
    {[2, 1, 0].map((n) => (
      <div key={n} style={{ ...GLASS, position: "absolute", left: n * 28, top: 30 + n * 28, width: 390, height: 300, padding: 0, overflow: "hidden" }}>
        <div style={{ background: GOLD, padding: "16px 22px", ...t(28, INK, 600) }}>{`Month ${3 - n}`}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 9, padding: 20 }}>
          {Array.from({ length: 21 }).map((_, i) => <div key={i} style={{ height: 30, borderRadius: 6, background: "rgba(255,255,255,0.14)" }} />)}
        </div>
      </div>
    ))}
    <Win title="SCREEN 1" w={300} h={180} style={{ position: "absolute", left: 560, top: 50 }} />
    <Win title="SCREEN 2" w={300} h={180} style={{ position: "absolute", left: 600, top: 110 }} />
    <Win title="SCREEN 3" w={300} h={180} style={{ position: "absolute", left: 640, top: 170 }} />
    <div style={{ position: "absolute", left: 700, top: 250, width: 160, height: 160, borderRadius: 80, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
      <svg width={84} height={84} viewBox="0 0 24 24"><path d="M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 15v2.5" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  </div>
);

const S7: React.FC = () => (
  <div style={{ width: 940, height: 470, display: "flex", flexDirection: "column", alignItems: "center" }}>
    <div style={{ ...GLASS, width: 780, overflow: "hidden", padding: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
        {[0, 1, 2].map((d) => <div key={d} style={{ width: 11, height: 11, borderRadius: 6, background: d === 0 ? GOLD : "rgba(255,255,255,0.25)" }} />)}
        <div style={{ ...mono(15), marginLeft: 8 }}>YOUR APP</div>
      </div>
      <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ alignSelf: "flex-end", background: "rgba(255,255,255,0.12)", borderRadius: 22, padding: "14px 22px", ...t(26, TEXT, 400) }}>Move order 4821 to Friday</div>
        <div style={{ alignSelf: "flex-start", background: GOLD, borderRadius: 22, padding: "14px 22px", ...t(26, INK, 600) }}>Ready. Confirm to go ahead.</div>
      </div>
    </div>
    <div style={{ marginTop: 40, ...t(48, GOLD, 600) }}>askverb.com/demos</div>
  </div>
);

const SCENES = [S1, S2, S3, S4, S5, S6, S7];
const POSE_NAMES = ["point-up", "sad", "point-right", "present", "cheer", "facepalm", "wave"];

const Title: React.FC<{ text: string; size: number }> = ({ text, size }) => (
  <div style={t(size, TEXT, 600, { letterSpacing: -1, lineHeight: 1.12 })}>
    {text.split("|").map((line, li) => (
      <div key={li}>
        {line.split(/(\[\[[^\]]+\]\])/).map((part, i) =>
          part.startsWith("[[") ? <span key={i} style={{ color: GOLD }}>{part.slice(2, -2)}</span> : <span key={i}>{part}</span>,
        )}
      </div>
    ))}
  </div>
);

export const GlassSlide: React.FC<{ slide: Slide; i: number; n: number }> = ({ slide, i, n }) => {
  const Scene = SCENES[i] ?? S1;
  const pose = POSES[POSE_NAMES[i] ?? "idle"] ?? POSES.idle!;
  const cover = i === 0;
  return (
    <div style={{ position: "absolute", inset: 0, background: BG, overflow: "hidden" }}>
      <Glow seed={i} />
      <div style={{ position: "absolute", inset: 0, padding: "80px 70px 0" }}>
        <Title text={slide.title ?? ""} size={cover ? 104 : 64} />
      </div>
      <div style={{ position: "absolute", left: 70, top: cover ? 440 : 400 }}>
        <Scene />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 96, display: "flex", justifyContent: "center" }}>
        <AvaRig pose={pose} size={300} />
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 44, display: "flex", justifyContent: "space-between", ...mono(20) }}>
        <span>Vishnu · building AskVerb</span>
        <span>{i === n - 1 ? `${i + 1}/${n}` : i === 0 ? "Swipe →" : `${i + 1}/${n} →`}</span>
      </div>
    </div>
  );
};
