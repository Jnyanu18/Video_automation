import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Captions } from "../../kit/Captions";
import { Cue, FPS, Word } from "../../kit/theme";
import { THEMES } from "../../kit/themes";
import cuesJson from "../../../../videos/play-store-12-testers/cues.json";
import wordsJson from "../../../../videos/play-store-12-testers/words.json";

const cues = cuesJson as Cue[];
const words = wordsJson as Word[];
export const seconds = cues.length ? cues[cues.length - 1].end : 5;

// One beat on screen at a time, each built from cards in a dark Play Console look, timed to the words.
const TH = THEMES["console-green"];
const G = TH.accent;
const RED = "#ff6b6b";
const AMBER = "#ffc46b";
const CARD = "#16201b";
const LINE = "rgba(238,245,240,0.12)";
const SOFT = "rgba(238,245,240,0.62)";

const S: Record<string, number> = Object.fromEntries(cues.map((c) => [c.id, c.start]));
const E: Record<string, number> = Object.fromEntries(cues.map((c) => [c.id, c.end]));
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (t: number, a: number, b: number, ease = Easing.inOut(Easing.cubic)) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: ease });
const pop = (t: number, a: number) => interpolate(t, [a, a + 0.32], [0.6, 1], { ...clamp, easing: Easing.out(Easing.back(2.2)) });
/** When a word is first said at or after `after` (letters only). */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const at = (w: string, after = 0) => words.find((x) => x.start >= after - 0.01 && norm(x.w) === norm(w))?.start ?? after;

// ---------------------------------------------------------------- small parts
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: CARD, border: `2px solid ${LINE}`, borderRadius: 34, boxShadow: "0 30px 80px rgba(0,0,0,0.45)", ...style }}>{children}</div>
);

const Big: React.FC<{ children: React.ReactNode; color?: string; size?: number; o?: number; s?: number }> = ({ children, color = TH.text, size = 150, o = 1, s = 1 }) => (
  <div style={{ fontFamily: TH.display, fontWeight: 600, fontSize: size, lineHeight: 1, color, opacity: o, transform: `scale(${s})`, textAlign: "center", letterSpacing: -2 }}>{children}</div>
);

const Label: React.FC<{ children: React.ReactNode; color?: string; size?: number }> = ({ children, color = SOFT, size = 34 }) => (
  <div style={{ fontFamily: TH.body, fontWeight: 600, fontSize: size, letterSpacing: 4, textTransform: "uppercase", color }}>{children}</div>
);

const Tick: React.FC<{ size?: number; color?: string }> = ({ size = 44, color = G }) => (
  <svg width={size} height={size} viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="21" fill={color} />
    <path d="M12 23 L19 30 L32 15" stroke="#06210f" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Phone: React.FC<{ lit: number; i: number }> = ({ lit, i }) => (
  <div style={{ width: 170, height: 300, borderRadius: 34, background: "#0b0f0d", border: `5px solid ${lit > 0 ? G : "#2a332e"}`, position: "relative", overflow: "hidden",
    boxShadow: lit > 0 ? `0 0 ${40 * lit}px rgba(61,220,132,${0.45 * lit})` : "none", transform: `scale(${0.92 + 0.08 * lit})` }}>
    <div style={{ position: "absolute", top: 12, left: "50%", width: 46, height: 8, borderRadius: 4, background: "#222a26", transform: "translateX(-50%)" }} />
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: lit }}>
      <div style={{ width: 82, height: 82, borderRadius: 22, background: G, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 34, height: 34, borderRadius: 17, background: "#06210f", opacity: 0.85 + 0.15 * random(`p${i}`) }} />
      </div>
    </div>
  </div>
);

const Ring: React.FC<{ k: number; label: string; size?: number }> = ({ k, label, size = 300 }) => {
  const r = size / 2 - 18, c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={LINE} strokeWidth="18" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={G} strokeWidth="18" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - k)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Big size={size * 0.38}>{Math.round(14 * k)}</Big>
        <Label size={size * 0.1}>{label}</Label>
      </div>
    </div>
  );
};

/** One beat's layer: fades in and out at its cue edges. */
const Beat: React.FC<{ id: string; t: number; children: React.ReactNode; top?: number }> = ({ id, t, children, top = 330 }) => {
  const o = Math.min(S[id] === 0 ? 1 : ramp(t, S[id], S[id] + 0.25), 1 - ramp(t, E[id] - 0.2, E[id])); // the first frame is never faded
  if (o <= 0) return null;
  const drift = 1 + 0.03 * ramp(t, S[id], E[id], Easing.linear);
  return (
    <AbsoluteFill style={{ opacity: o, alignItems: "center", paddingTop: top, transform: `scale(${drift})` }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 44 }}>{children}</div>
    </AbsoluteFill>
  );
};

const SFX: { at: number; src: string }[] = [
  { at: at("won't"), src: "switch" },
  { at: at("twelve"), src: "pop" },
  { at: S.cred + 0.3, src: "pop" },
  { at: S.nobody + 0.15, src: "shutter-modern" },
  { at: at("closed"), src: "mouse-click" },
  { at: at("internal", S.internal), src: "switch" },
  { at: at("dashboard"), src: "ding" },
  { at: at("apply"), src: "mouse-click" },
  { at: S.how, src: "whoosh" },
  { at: at("register"), src: "whip" },
  { at: S.cta + 0.2, src: "pop" },
];

// ---------------------------------------------------------------- the scene
export const PlayStore12Testers: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const glow = Math.sin(t * 0.5) * 120;

  // Hook: a Publish button that will not press, then twelve phones and fourteen days.
  const twelve = at("twelve"), fourteen = at("fourteen");
  const lockShake = t > at("won't") && t < at("won't") + 0.4 ? Math.sin(t * 90) * 10 : 0;
  const toGrid = ramp(t, twelve - 0.35, twelve + 0.1);

  // Dashboard: testers fill on "twelve testers", days fill on "fourteen days in a row".
  const testersN = Math.round(12 * ramp(t, S.testers + 0.1, at("in", S.testers + 1)));
  const daysK = ramp(t, at("fourteen", S.testers), at("row") + 0.3);

  return (
    <AbsoluteFill style={{ background: "#0a0e0c", overflow: "hidden" }}>
      <Audio src={staticFile("play-store-12-testers/voice/voice.mp3")} />
      {SFX.map((s, i) => (
        <Sequence key={i} from={Math.round(s.at * FPS)}>
          <Audio src={staticFile(`_sfx/${s.src}.wav`)} volume={0.28} />
        </Sequence>
      ))}

      {/* the room: a faint grid and a slow green glow */}
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px)`,
        backgroundSize: "90px 90px", opacity: 0.35, maskImage: "radial-gradient(ellipse at 50% 40%, #000 30%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, #000 30%, transparent 75%)" }} />
      <div style={{ position: "absolute", left: 540 - 520 + glow, top: 380, width: 1040, height: 1040, borderRadius: 520,
        background: "radial-gradient(circle, rgba(61,220,132,0.16), rgba(61,220,132,0) 65%)" }} />

      {/* hook */}
      <Beat id="hook" t={t} top={260}>
        <div style={{ height: 0, overflow: "visible", opacity: 1 - toGrid, transform: `translateX(${lockShake}px) scale(${1 - 0.3 * toGrid})` }}>
          <div style={{ marginTop: 260, display: "flex", flexDirection: "column", alignItems: "center", gap: 70 }}>
            <Label size={36}>Google Play Console</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 36, background: "#26302b", color: "#8a978f", borderRadius: 999, padding: "56px 110px",
              fontFamily: TH.body, fontWeight: 600, fontSize: 116, border: `6px solid rgba(255,107,107,${ramp(t, at("won't"), at("won't") + 0.15)})` }}>
              <svg width="96" height="108" viewBox="0 0 62 70"><rect x="6" y="30" width="50" height="36" rx="8" fill="#8a978f" /><path d="M16 30 V20 a15 15 0 0 1 30 0 V30" stroke="#8a978f" strokeWidth="7" fill="none" /></svg>
              Publish
            </div>
            <div style={{ transform: `rotate(-5deg) scale(${interpolate(t, [at("won't"), at("won't") + 0.18], [1.8, 1], { ...clamp, easing: Easing.out(Easing.quad) })})`,
              opacity: ramp(t, at("won't"), at("won't") + 0.08), border: `10px solid ${RED}`, borderRadius: 22, padding: "14px 46px" }}>
              <Big size={130} color={RED}>BLOCKED</Big>
            </div>
          </div>
        </div>
        <div style={{ opacity: toGrid, display: "flex", flexDirection: "column", alignItems: "center", gap: 46 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 170px)", gap: 30 }}>
            {Array.from({ length: 12 }, (_, i) => (
              <Phone key={i} i={i} lit={ramp(t, twelve + i * 0.07, twelve + i * 0.07 + 0.15)} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
            <Big size={110} color={G} s={pop(t, at("people"))} o={ramp(t, at("people"), at("people") + 0.1)}>12</Big>
            <Ring k={ramp(t, fourteen, fourteen + 0.9)} label="days" size={250} />
          </div>
        </div>
      </Beat>

      {/* two apps, live */}
      <Beat id="cred" t={t} top={640}>
        <Label>Published on Google Play</Label>
        <div style={{ display: "flex", gap: 40 }}>
          {["Vakya", "GT-FIVE"].map((n, i) => (
            <Card key={n} style={{ width: 400, padding: "44px 40px", transform: `scale(${pop(t, S.cred + 0.2 + i * 0.25)})`, opacity: ramp(t, S.cred + 0.2 + i * 0.25, S.cred + 0.4 + i * 0.25) }}>
              <div style={{ width: 120, height: 120, borderRadius: 30, background: i ? "#2d6cdf" : "#f2a63b", marginBottom: 30 }} />
              <div style={{ fontFamily: TH.display, fontWeight: 600, fontSize: 64, color: TH.text }}>{n}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
                <Tick size={40} />
                <span style={{ fontFamily: TH.body, fontWeight: 600, fontSize: 36, color: G }}>Live</span>
              </div>
            </Card>
          ))}
        </div>
      </Beat>

      {/* nobody warns you */}
      <Beat id="nobody" t={t} top={640}>
        <div style={{ transform: `rotate(-6deg) scale(${interpolate(t, [S.nobody + 0.1, S.nobody + 0.32], [1.7, 1], { ...clamp, easing: Easing.out(Easing.quad) })})`,
          border: `12px solid ${AMBER}`, borderRadius: 26, padding: "26px 52px", background: "rgba(255,196,107,0.08)" }}>
          <Big size={120} color={AMBER}>NOBODY</Big>
          <Big size={120} color={AMBER}>WARNS YOU</Big>
        </div>
      </Beat>

      {/* the account */}
      <Beat id="personal" t={t} top={680}>
        <Card style={{ width: 860, padding: "56px 60px" }}>
          <Label>Developer account</Label>
          <div style={{ fontFamily: TH.display, fontWeight: 600, fontSize: 92, color: TH.text, marginTop: 16 }}>Personal</div>
          <div style={{ height: 2, background: LINE, margin: "36px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: TH.body, fontSize: 44 }}>
            <span style={{ color: SOFT }}>Created</span>
            <span style={{ color: G, fontWeight: 600, background: `rgba(61,220,132,${0.16 * ramp(t, at("after"), at("after") + 0.3)})`, borderRadius: 14, padding: "6px 18px" }}>
              after 13 Nov 2023
            </span>
          </div>
        </Card>
      </Beat>

      {/* the tracks: closed lights, internal is struck */}
      {["closed", "internal"].map((id) => (
        <Beat key={id} id={id} t={t} top={500}>
          <Label>Testing tracks</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            {["Internal", "Closed", "Open", "Production"].map((name) => {
              const isClosed = name === "Closed", isInternal = name === "Internal";
              const lit = isClosed ? ramp(t, at("closed"), at("closed") + 0.25) : 0;
              const strike = isInternal && id === "internal" ? ramp(t, at("internal", S.internal), at("internal", S.internal) + 0.35) : 0;
              return (
                <Card key={name} style={{ width: 820, padding: "34px 46px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative",
                  borderColor: lit ? `rgba(61,220,132,${lit})` : strike ? `rgba(255,107,107,${strike})` : LINE, opacity: id === "internal" && !isInternal && !isClosed ? 0.45 : 1 }}>
                  <span style={{ fontFamily: TH.body, fontWeight: 600, fontSize: 56, color: lit ? G : TH.text }}>{name}</span>
                  {lit ? <Tick size={52} /> : null}
                  {strike ? (
                    <>
                      <div style={{ position: "absolute", left: 30, top: "50%", height: 8, borderRadius: 4, background: RED, width: `${(820 - 60) * strike}px` }} />
                      <span style={{ fontFamily: TH.body, fontWeight: 600, fontSize: 38, color: RED, opacity: ramp(t, at("doesn't", S.internal), at("doesn't", S.internal) + 0.2) }}>doesn't count</span>
                    </>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </Beat>
      ))}

      {/* the dashboard fills: testers, then days */}
      <Beat id="testers" t={t} top={500}>
        <Card style={{ width: 880, padding: "54px 56px" }}>
          <Label>Closed test</Label>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 20 }}>
            <Big size={130} color={testersN === 12 ? G : TH.text}>{testersN}</Big>
            <span style={{ fontFamily: TH.body, fontSize: 48, color: SOFT }}>/ 12 testers</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 22, marginTop: 36 }}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} style={{ height: 96, borderRadius: 48, background: i < testersN ? G : "#25302a", transform: `scale(${i < testersN ? 1 : 0.85})`,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 34, height: 34, borderRadius: 17, background: i < testersN ? "#06210f" : "#36423b" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48, fontFamily: TH.body, fontSize: 42, color: SOFT }}>
            <span>Days in a row</span>
            <span style={{ color: daysK >= 1 ? G : TH.text, fontWeight: 600 }}>{Math.round(14 * daysK)} / 14</span>
          </div>
          <div style={{ height: 26, borderRadius: 13, background: "#25302a", marginTop: 20, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${100 * daysK}%`, background: G, borderRadius: 13 }} />
          </div>
        </Card>
      </Beat>

      <Beat id="dashboard" t={t} top={660}>
        <Label>Play Console · Dashboard</Label>
        <Card style={{ width: 880, padding: "60px 56px", display: "flex", flexDirection: "column", gap: 40 }}>
          {[["Testers opted in", "12 / 12"], ["Days in a row", "14 / 14"]].map(([k, v], i) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: ramp(t, S.dashboard + 0.2 + i * 0.3, S.dashboard + 0.4 + i * 0.3) }}>
              <span style={{ fontFamily: TH.body, fontSize: 48, color: SOFT }}>{k}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: TH.display, fontWeight: 600, fontSize: 76, color: G }}>{v}<Tick size={56} /></span>
            </div>
          ))}
        </Card>
      </Beat>

      {/* apply, then wait */}
      <Beat id="apply" t={t} top={620}>
        {(() => {
          const press = at("apply");
          const down = interpolate(t, [press, press + 0.1, press + 0.3], [1, 0.9, 1], clamp);
          const clockK = ramp(t, at("week") - 0.4, at("week") + 0.6);
          return (
            <>
              <div style={{ transform: `scale(${down})`, background: G, color: "#06210f", borderRadius: 999, padding: "40px 80px", fontFamily: TH.body, fontWeight: 600, fontSize: 64,
                boxShadow: `0 0 ${60 * ramp(t, press, press + 0.3)}px rgba(61,220,132,0.6)` }}>Apply for production</div>
              <div style={{ display: "flex", alignItems: "center", gap: 34, opacity: ramp(t, at("google", press) - 0.1, at("google", press) + 0.2), marginTop: 30 }}>
                <svg width="150" height="150" viewBox="0 0 150 150">
                  <circle cx="75" cy="75" r="66" stroke={AMBER} strokeWidth="10" fill="none" />
                  <line x1="75" y1="75" x2="75" y2="30" stroke={AMBER} strokeWidth="10" strokeLinecap="round" transform={`rotate(${clockK * 720} 75 75)`} />
                  <line x1="75" y1="75" x2="104" y2="75" stroke={AMBER} strokeWidth="10" strokeLinecap="round" transform={`rotate(${clockK * 60} 75 75)`} />
                </svg>
                <div>
                  <Label color={AMBER}>Google review</Label>
                  <div style={{ fontFamily: TH.display, fontWeight: 600, fontSize: 88, color: TH.text }}>up to 7 days</div>
                </div>
              </div>
            </>
          );
        })()}
      </Beat>

      <Beat id="how" t={t} top={700}>
        <Big size={260} color={G} s={pop(t, S.how + 0.05)}>HOW?</Big>
      </Beat>

      {/* route one: testers first */}
      <Beat id="lineup" t={t} top={660}>
        <Label>Do it in this order</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          {[["1", "Testers ready", at("testers", S.lineup)], ["2", "Build done", at("building")]].map(([n, txt, a], i) => (
            <React.Fragment key={String(n)}>
              {i ? <svg width="90" height="60" viewBox="0 0 90 60" style={{ opacity: ramp(t, Number(a) - 0.2, Number(a)) }}><path d="M5 30 H75 M55 10 L78 30 L55 50" stroke={G} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
              <Card style={{ width: 380, padding: "40px 36px", transform: `scale(${pop(t, Number(a))})`, opacity: ramp(t, Number(a), Number(a) + 0.2), borderColor: i ? LINE : G }}>
                <div style={{ fontFamily: TH.display, fontWeight: 600, fontSize: 90, color: i ? SOFT : G }}>{n}</div>
                <div style={{ fontFamily: TH.body, fontWeight: 600, fontSize: 46, color: TH.text, marginTop: 10 }}>{txt}</div>
              </Card>
            </React.Fragment>
          ))}
        </div>
      </Beat>

      {/* route two: an organisation account skips the rule */}
      <Beat id="org" t={t} top={500}>
        {(() => {
          const jump = ramp(t, at("register"), at("register") + 0.7, Easing.out(Easing.cubic));
          const gone = ramp(t, at("apply", S.org) - 0.2, at("apply", S.org) + 0.3);
          return (
            <>
              <Card style={{ padding: "36px 56px", display: "flex", alignItems: "center", gap: 26, borderColor: G }}>
                <svg width="70" height="70" viewBox="0 0 70 70"><rect x="10" y="18" width="50" height="46" rx="6" fill="none" stroke={G} strokeWidth="6" /><path d="M24 18 V8 H46 V18" stroke={G} strokeWidth="6" fill="none" /><path d="M10 38 H60" stroke={G} strokeWidth="6" /></svg>
                <div>
                  <div style={{ fontFamily: TH.display, fontWeight: 600, fontSize: 70, color: TH.text }}>Organisation</div>
                  <div style={{ fontFamily: TH.body, fontWeight: 600, fontSize: 38, color: G }}>+ D-U-N-S number</div>
                </div>
              </Card>
              <div style={{ position: "relative", width: 900, height: 420 }}>
                <svg width="900" height="420" style={{ position: "absolute", inset: 0 }}>
                  <path d="M90 360 C 250 40, 650 40, 810 360" stroke={G} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray="1200" strokeDashoffset={1200 * (1 - jump)} />
                </svg>
                <Card style={{ position: "absolute", left: 230, top: 250, width: 440, padding: "30px 30px", textAlign: "center", opacity: 1 - 0.7 * gone }}>
                  <div style={{ fontFamily: TH.body, fontWeight: 600, fontSize: 42, color: SOFT, textDecoration: gone > 0.5 ? `line-through ${RED}` : "none" }}>12 testers · 14 days</div>
                </Card>
              </div>
              <Label color={G} size={46}>Rule doesn't apply</Label>
            </>
          );
        })()}
      </Beat>

      {/* save and follow */}
      <Beat id="cta" t={t} top={640}>
        <div style={{ display: "flex", gap: 120 }}>
          {[["SAVE", S.cta + 0.1], ["FOLLOW", at("follow")]].map(([label, a], i) => (
            <div key={String(label)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, transform: `scale(${pop(t, Number(a))})`, opacity: ramp(t, Number(a), Number(a) + 0.15) }}>
              <div style={{ width: 210, height: 210, borderRadius: 105, background: G, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {i === 0 ? (
                  <svg width="90" height="110" viewBox="0 0 90 110"><path d="M10 8 H80 V102 L45 76 L10 102 Z" fill="#06210f" /></svg>
                ) : (
                  <svg width="120" height="110" viewBox="0 0 120 110"><circle cx="48" cy="34" r="24" fill="#06210f" /><path d="M8 102 C 12 70, 84 70, 88 102 Z" fill="#06210f" /><path d="M100 30 V70 M80 50 H120" stroke="#06210f" strokeWidth="12" strokeLinecap="round" /></svg>
                )}
              </div>
              <Label color={TH.text} size={48}>{label}</Label>
            </div>
          ))}
        </div>
      </Beat>

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 230 }}>
        <div style={{ maxWidth: 900 }}>
          <Captions words={words} size={62} max={3} theme={TH} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
