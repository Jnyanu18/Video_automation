import React from "react";
import { AbsoluteFill, Easing, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { FPS } from "../../kit/theme";
import { SITE_FONT } from "../talking-head/site";
import D from "../../../../videos/livesafe-founder-cut/work/timing-v2.json";

// LiveSafe, the founder's talk cut to ten minutes (client work, 16:9). The footage is the plain cut; over it, editorial
// type straight on the picture, no boxes or checklists (Vishnu, 2026-10-25: "bullet points look AI"). One moment
// at a time, in the left half, on a soft dark gradient, each landing on the word it quotes (work/anchors.json,
// cut-timeline seconds). Every line is something he says in the cut. Punch-ins on every other clip.
// Cut v2 (2026-10-26): timings come from work/timing-v2.json (timing_v2.py), each moment leaving 0.9 s after
// he finishes its point.
const SLUG = "livesafe-founder-cut";
export const seconds = D.seconds;
const A = D.A as Record<string, number>;
const T = D.T as Record<string, number[]>;
const CLIP_STARTS = D.clips;

const MAG = "#E83FB8";
const GREEN = "#3DDC84";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (t: number, a: number, b: number, e = Easing.out(Easing.cubic)) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: e });
/** In over 0.5 s from a, out over 0.35 s before b. */
const life = (t: number, a: number, b: number) => Math.min(ramp(t, a, a + 0.5), 1 - ramp(t, b - 0.35, b, Easing.in(Easing.quad)));

// Moments: [start, end] on the cut timeline. Used for the scrim and the sounds.
type M = { a: number; b: number };
const M = (a: number, b: number): M => ({ a, b });

const W: React.FC<{ t: number; at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ t, at, children, style }) => {
  const k = ramp(t, at, at + 0.35, Easing.out(Easing.poly(4)));
  return (
    <span style={{ display: "inline-block", opacity: k, filter: `blur(${(1 - k) * 8}px)`, transform: `translateY(${(1 - k) * 14}px)`, ...style }}>
      {children}
    </span>
  );
};

/** A line, word by word from `at`; the word in `hi` gets a marker swipe behind it. */
const Line: React.FC<{ t: number; at: number; text: string; hi?: string; size?: number; gap?: number; color?: string }> = ({ t, at, text, hi, size = 76, gap = 0.08, color = "#fff" }) => {
  const words = text.split(" ");
  return (
    <div style={{ fontFamily: SITE_FONT, fontWeight: 600, fontSize: size, lineHeight: 1.08, letterSpacing: "-0.03em", color, display: "flex", flexWrap: "wrap", columnGap: size * 0.26 }}>
      {words.map((w, i) => {
        const wat = at + i * gap;
        const isHi = hi && w.toLowerCase().replace(/[^a-z0-9%]/g, "") === hi;
        const swipe = ramp(t, wat + 0.25, wat + 0.65, Easing.inOut(Easing.cubic));
        return (
          <W key={i} t={t} at={wat} style={{ position: "relative" }}>
            {isHi ? (
              <span style={{ position: "absolute", left: -8, right: -8, top: "18%", bottom: "6%", background: MAG, transformOrigin: "left center", transform: `scaleX(${swipe}) skewX(-8deg)`, borderRadius: 6, zIndex: -1 }} />
            ) : null}
            <span style={{ position: "relative" }}>{w}</span>
          </W>
        );
      })}
    </div>
  );
};

const Small: React.FC<{ t: number; at: number; children: React.ReactNode; size?: number; color?: string }> = ({ t, at, children, size = 38, color = "rgba(255,255,255,0.82)" }) => (
  <W t={t} at={at} style={{ fontFamily: SITE_FONT, fontWeight: 500, fontSize: size, color, marginTop: 18, letterSpacing: "-0.01em" }}>
    {children}
  </W>
);

const Count: React.FC<{ t: number; at: number; to: number; dur?: number; comma?: boolean; size?: number; suffix?: string; color?: string }> = ({ t, at, to, dur = 1.2, comma, size = 230, suffix = "", color = "#fff" }) => {
  const v = Math.round(interpolate(t, [at, at + dur], [0, to], { ...clamp, easing: Easing.out(Easing.cubic) }));
  return (
    <W t={t} at={at - 0.15} style={{ fontFamily: SITE_FONT, fontWeight: 700, fontSize: size, lineHeight: 0.95, letterSpacing: "-0.05em", color }}>
      {comma ? v.toLocaleString("en-US") : v}
      <span style={{ color: MAG }}>{suffix}</span>
    </W>
  );
};

/** Old text struck through at `strikeAt`, then the new text lands under it. */
const Strike: React.FC<{ t: number; at: number; strikeAt: number; newAt: number; was: string; now: string; size?: number }> = ({ t, at, strikeAt, newAt, was, now, size = 84 }) => {
  const s = ramp(t, strikeAt, strikeAt + 0.4, Easing.inOut(Easing.cubic));
  return (
    <div>
      <W t={t} at={at} style={{ position: "relative", fontFamily: SITE_FONT, fontWeight: 600, fontSize: size, letterSpacing: "-0.03em", color: `rgba(255,255,255,${1 - 0.5 * s})` }}>
        {was}
        <span style={{ position: "absolute", left: -6, right: -6, top: "54%", height: size * 0.09, background: "#FF5A5A", transformOrigin: "left center", transform: `scaleX(${s}) rotate(-2deg)`, borderRadius: 4 }} />
      </W>
      <div style={{ height: 10 }} />
      <Line t={t} at={newAt} text={now} hi={now.split(" ")[0].toLowerCase().replace(/[^a-z0-9%]/g, "")} size={size} />
    </div>
  );
};

/** Phrases that replace each other in one place, each from its own time. */
const Swap: React.FC<{ t: number; items: { text: string; at: number }[]; end: number; size?: number }> = ({ t, items, end, size = 76 }) => {
  const i = items.reduce((k, it, j) => (t >= it.at ? j : k), -1);
  if (i < 0) return null;
  const next = i + 1 < items.length ? items[i + 1].at : end;
  const out = 1 - ramp(t, next - 0.25, next, Easing.in(Easing.quad));
  return (
    <div style={{ opacity: i + 1 < items.length ? out : 1 }}>
      <Line t={t} at={items[i].at} text={items[i].text} size={size} gap={0.06} />
    </div>
  );
};

const Toggle: React.FC<{ t: number; offAt: number }> = ({ t, offAt }) => {
  const k = ramp(t, offAt, offAt + 0.35, Easing.inOut(Easing.cubic));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 26 }}>
      <div style={{ width: 150, height: 82, borderRadius: 41, background: `rgba(${Math.round(61 * (1 - k) + 90 * k)},${Math.round(220 * (1 - k) + 90 * k)},${Math.round(132 * (1 - k) + 100 * k)},1)`, position: "relative" }}>
        <div style={{ position: "absolute", top: 7, left: 7 + (1 - k) * 68, width: 68, height: 68, borderRadius: 34, background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.35)" }} />
      </div>
      <span style={{ fontFamily: SITE_FONT, fontWeight: 600, fontSize: 64, color: "#fff", letterSpacing: "-0.03em" }}>Mobile data</span>
    </div>
  );
};

const Bands: React.FC<{ t: number }> = ({ t }) => {
  const rows = [
    { f: "2.4", at: A.b24, v: A.b1ok, col: GREEN, strike: false },
    { f: "5", at: A.b5, v: A.b2over, col: "rgba(255,255,255,0.45)", strike: false },
    { f: "6", at: A.b6, v: A.b3no, col: "rgba(255,255,255,0.45)", strike: true },
  ];
  return (
    <div>
      <Small t={t} at={A.bands - 0.2} size={40}>Three Wi-Fi bands</Small>
      <div style={{ display: "flex", alignItems: "baseline", gap: 36, marginTop: 10 }}>
        {rows.map((r, i) => {
          const v = ramp(t, r.v, r.v + 0.4);
          const s = r.strike ? ramp(t, r.v, r.v + 0.4, Easing.inOut(Easing.cubic)) : 0;
          return (
            <W key={i} t={t} at={r.at} style={{ position: "relative", fontFamily: SITE_FONT, fontWeight: 700, fontSize: 116, letterSpacing: "-0.05em", color: v > 0 ? (r.f === "2.4" ? `rgba(61,220,132,${0.4 + 0.6 * v})` : `rgba(255,255,255,${1 - 0.55 * v})`) : "#fff" }}>
              {r.f}
              <span style={{ fontSize: 38, marginLeft: 6, letterSpacing: "-0.02em" }}>GHz</span>
              {r.strike ? <span style={{ position: "absolute", left: -8, right: -8, top: "52%", height: 12, background: "#FF5A5A", transformOrigin: "left center", transform: `scaleX(${s}) rotate(-3deg)`, borderRadius: 4 }} /> : null}
            </W>
          );
        })}
      </div>
      {t >= A.seventy - 0.2 ? (
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 20 }}>
          <span style={{ fontFamily: SITE_FONT, fontWeight: 700, fontSize: 120, color: GREEN, letterSpacing: "-0.05em" }}>
            <W t={t} at={A.seventy - 0.2}>−</W>
          </span>
          <Count t={t} at={A.seventy} to={70} size={120} suffix="%" color={GREEN} />
          <Small t={t} at={A.seventy + 0.3} size={40}>with band 3 off</Small>
        </div>
      ) : null}
    </div>
  );
};

const Chapter: React.FC<{ t: number; at: number; n: number; title: string }> = ({ t, at, n, title }) => {
  const o = life(t, at, at + 2.6);
  if (o <= 0) return null;
  const line = ramp(t, at + 0.2, at + 0.9, Easing.inOut(Easing.cubic));
  return (
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 150, opacity: o, background: `rgba(8,8,12,${0.45 * o})` }}>
      <div style={{ fontFamily: SITE_FONT, fontWeight: 600, fontSize: 34, color: MAG, letterSpacing: "0.12em" }}>
        <W t={t} at={at}>{`0${n} / 05`}</W>
      </div>
      <div style={{ fontFamily: SITE_FONT, fontWeight: 700, fontSize: 132, color: "#fff", letterSpacing: "-0.045em", lineHeight: 1 }}>
        <W t={t} at={at + 0.1}>{title}</W>
      </div>
      <div style={{ width: 520, height: 8, borderRadius: 4, background: MAG, marginTop: 26, transformOrigin: "left center", transform: `scaleX(${line})` }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- every moment, in order
type Moment = M & { body: (t: number) => React.ReactNode; top?: number };
const MOMENTS: Moment[] = [
  { ...M(T.name[0], T.name[1]), top: 760, body: (t) => (
    <div>
      <div style={{ width: 90, height: 6, background: MAG, borderRadius: 3, transformOrigin: "left center", transform: `scaleX(${ramp(t, 0.8, 1.3)})`, marginBottom: 16 }} />
      <Line t={t} at={1.0} text="Neehar S Rao" size={72} />
      <Small t={t} at={1.4}>Founder, LiveSafe</Small>
    </div>
  ) },
  { ...M(T.years[0], T.years[1]), body: (t) => (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
        <Count t={t} at={A.years20} to={20} />
        <Line t={t} at={A.years20 + 0.3} text="years" size={96} />
      </div>
      <Small t={t} at={A.years20 + 0.7} size={44}>studying electromagnetic radiation</Small>
    </div>
  ) },
  { ...M(T.everywhere[0], T.everywhere[1]), body: (t) => <Line t={t} at={A.everywhere} text="Your phone signal is going to be everywhere." hi="everywhere" size={72} /> },
  { ...M(T.lifestyle[0], T.lifestyle[1]), body: (t) => (
    <div>
      <Line t={t} at={A.lifestyle - 0.2} text="A lifestyle choice" hi="lifestyle" />
      <Small t={t} at={A.lifestyle + 2.6} size={42}>adopted without knowing what it can do to us</Small>
    </div>
  ) },
  { ...M(T.proximity[0], T.proximity[1]), body: (t) => (
    <div>
      <Small t={t} at={A.proximity - 0.2} size={44}>What really hurts is</Small>
      <Line t={t} at={A.proximity + 0.5} text="proximity." size={150} hi="proximity" />
    </div>
  ) },
  { ...M(T.children[0], T.children[1]), body: (t) => <Line t={t} at={A.children - 0.2} text="Children are affected most." hi="children" /> },
  { ...M(T.pockets[0], T.pockets[1]), body: (t) => <Line t={t} at={A.pockets - 0.4} text="The only pollution we keep in our pockets." hi="pockets" /> },
  { ...M(T.cigarette[0], T.cigarette[1]), body: (t) => (
    <div>
      <Line t={t} at={A.cigarette - 0.1} text="Would you give a five-year-old a cigarette?" hi="cigarette" size={76} />
      <Small t={t} at={A.cigarette + 3.2} size={44}>Then why give them a phone?</Small>
    </div>
  ) },
  { ...M(T.ehs[0], T.ehs[1]), body: (t) => (
    <div>
      <Line t={t} at={T.ehs[0]} text="Electrohypersensitivity" size={64} gap={0.04} />
      <Count t={t} at={A.three} to={3} size={170} suffix="%+" dur={0.8} />
      <div><Small t={t} at={A.three + 0.6} size={42}>of people. Most don't know it.</Small></div>
      <div style={{ marginTop: 26 }}>
        <Swap t={t} end={T.ehs[1]} size={50} items={[
          { text: "A headache in one spot of a room.", at: A.spot },
          { text: "Chills when you sleep.", at: A.chills },
          { text: "A dry mouth when you wake up.", at: A.drymouth },
        ]} />
      </div>
    </div>
  ) },
  { ...M(T.bedroom[0], T.bedroom[1]), body: (t) => (
    <div>
      <Strike t={t} at={A.bedroom - 0.2} strikeAt={A.divorce} newAt={A.divorce + 0.4} was="Router in the bedroom" now="Move it outside." size={64} />
      <Small t={t} at={A.fresher} size={44}>Wake up fresher.</Small>
    </div>
  ) },
  { ...M(T.mindful[0], T.mindful[1]), body: (t) => (
    <div>
      <Small t={t} at={T.mindful[0]} size={44}>Not doom and gloom.</Small>
      <Line t={t} at={A.mindfully + 0.3} text="Use technology, mindfully." hi="mindfully" size={82} />
    </div>
  ) },
  { ...M(T.distance[0], T.distance[1]), body: (t) => (
    <div>
      <Line t={t} at={A.eighteen - 0.3} text="18 inches from your body" hi="18" size={66} />
      {t >= A.hundred - 0.3 ? (
        <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 8 }}>
          <Count t={t} at={A.hundred - 0.1} to={100} suffix="×" dur={1.4} />
          <Small t={t} at={A.hundred + 0.6} size={46}>less radiation</Small>
        </div>
      ) : null}
    </div>
  ) },
  { ...M(T.pocket[0], T.pocket[1]), body: (t) => <Strike t={t} at={T.pocket[0]} strikeAt={A.backpocket - 0.4} newAt={A.backpocket} was="Front pocket" now="Back pocket." size={100} /> },
  { ...M(T.data[0], T.data[1]), body: (t) => (
    <div>
      <Small t={t} at={A.dataoff - 0.2} size={44}>Carrying it around?</Small>
      <Toggle t={t} offAt={A.dataoff + 0.9} />
      {t >= A.fortyfifty - 0.7 ? (
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 22 }}>
          <Line t={t} at={A.fortyfifty - 0.6} text="40 to 50% less" size={84} color={GREEN} gap={0.05} />
        </div>
      ) : null}
    </div>
  ) },
  { ...M(T.kids[0], T.kids[1]), body: (t) => (
    <div>
      <Small t={t} at={A.kids - 0.2} size={44}>Phone for a child under five?</Small>
      <div style={{ marginTop: 10 }}>
        <Swap t={t} end={T.kids[1]} size={110} items={[
          { text: "Download it.", at: A.download - 0.1 },
          { text: "Airplane mode.", at: A.airplane - 0.1 },
          { text: "Then hand it over.", at: A.giveit - 0.3 },
        ]} />
      </div>
    </div>
  ) },
  { ...M(T.bands[0], T.bands[1]), body: (t) => <Bands t={t} /> },
  { ...M(T.sweet[0], T.sweet[1]), body: (t) => (
    <div>
      <Line t={t} at={A.sweetspot - 1.5} text="Find the sweet spot." hi="sweet" size={92} />
      <div style={{ marginTop: 24 }}>
        <Swap t={t} end={T.sweet[1]} size={64} items={[
          { text: "One wall. 15 to 30 feet.", at: A.onewall },
          { text: "6 to 9 feet on bands 2 and 3.", at: A.sixfeet },
        ]} />
      </div>
    </div>
  ) },
  { ...M(T.night[0], T.night[1]), body: (t) => (
    <div>
      <Line t={t} at={A.night - 0.3} text="Switch your router off at night." hi="night" size={88} />
      <Small t={t} at={A.fiveten} size={44}>He says you'll feel it in 5 to 10 days.</Small>
    </div>
  ) },
  { ...M(T.microwave[0], T.microwave[1]), body: (t) => (
    <div>
      <Small t={t} at={A.microwave - 0.2} size={44}>Microwave running?</Small>
      <Line t={t} at={A.nextroom - 0.3} text="Go to the next room." hi="next" size={96} />
    </div>
  ) },
  { ...M(T.standards[0], T.standards[1]), body: (t) => (
    <div>
      <Small t={t} at={A.standards - 0.2} size={44}>Every home is assessed to two standards</Small>
      <Line t={t} at={A.standards + 1.2} text="Building Biology" size={80} />
      <Line t={t} at={A.standards + 3.4} text="ICNIRP" size={80} color={MAG} />
    </div>
  ) },
  { ...M(T.flow[0], T.flow[1]), body: (t) => (
    <div style={{ display: "flex", gap: 36, alignItems: "baseline" }}>
      <Line t={t} at={A.installs - 0.5} text="Measure." size={92} />
      <Line t={t} at={A.installs + 0.6} text="Install." size={92} />
      <Line t={t} at={A.safe} text="Safe." size={92} color={GREEN} />
    </div>
  ) },
  { ...M(T.sixty[0], T.sixty[1]), body: (t) => (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <Count t={t} at={A.sixty} to={60} suffix="%" />
        <Small t={t} at={A.sixty + 0.6} size={50}>of homes</Small>
      </div>
      <Line t={t} at={A.sixty + 2.4} text="10× over the safe level" hi="10×" size={66} />
    </div>
  ) },
  { ...M(T.trust[0], T.trust[1]), body: (t) => (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <Count t={t} at={A.thousand} to={1000} comma suffix="+" dur={1.3} size={190} />
        <Small t={t} at={A.thousand + 0.6} size={46}>installations</Small>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", columnGap: 34, marginTop: 18, maxWidth: 900 }}>
        {["Airbus", "Rakuten", "Bosch", "Siemens", "Apollo Hospitals"].map((n, i) => (
          <W key={n} t={t} at={A.clients + i * 0.55} style={{ fontFamily: SITE_FONT, fontWeight: 600, fontSize: 52, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em" }}>
            {n}
          </W>
        ))}
      </div>
    </div>
  ) },
  { ...M(T.end[0], T.end[1]), body: (t) => (
    <div>
      <Line t={t} at={A.thisislivsafe - 0.2} text="LiveSafe" size={150} color={GREEN} />
      <Line t={t} at={A.thisislivsafe + 0.5} text="Worry less wireless." size={72} />
      <Small t={t} at={A.website} size={52} color={MAG}>livesafe.in</Small>
    </div>
  ) },
];
const CHAPTERS = D.chapters;

const SOUNDS: { at: number; src: string; vol: number }[] = [
  ...MOMENTS.map((m) => ({ at: m.a, src: "_sfx/whoosh.wav", vol: 0.12 })),
  ...CHAPTERS.map((c) => ({ at: c.at, src: "_sfx/switch.wav", vol: 0.2 })),
];

/** The overlay alone: type, scrim, chapter titles and their sounds. `footage` adds the cut under it. */
export const LivesafeOverlay: React.FC<{ footage?: boolean }> = ({ footage = false }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cur = MOMENTS.find((m) => t >= m.a && t < m.b);
  const clip = CLIP_STARTS.reduce((k, s, i) => (t >= s ? i : k), 0);
  const scrim = Math.max(...MOMENTS.map((m) => life(t, m.a - 0.2, m.b + 0.2)), 0);
  return (
    <AbsoluteFill>
      {footage ? (
        <AbsoluteFill style={{ transform: `scale(${clip % 2 ? 1.1 : 1})`, transformOrigin: "50% 38%" }}>
          <OffthreadVideo src={staticFile(D.footage)} />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(6,6,10,0.78) 0%, rgba(6,6,10,0.5) 34%, rgba(6,6,10,0) 62%)", opacity: scrim }} />
      {cur ? (
        <AbsoluteFill style={{ justifyContent: cur.top ? "flex-start" : "center", paddingTop: cur.top ?? 0, paddingLeft: 150 }}>
          <div style={{ opacity: life(t, cur.a, cur.b), width: 720, textShadow: "0 4px 30px rgba(0,0,0,0.45)" }}>{cur.body(t)}</div>
        </AbsoluteFill>
      ) : null}
      {CHAPTERS.map((c) => (
        <Chapter key={c.n} t={t} at={c.at} n={c.n} title={c.title} />
      ))}
      {SOUNDS.map((s, i) => (
        <Sequence key={i} from={Math.round(s.at * FPS)} durationInFrames={Math.round(1.5 * FPS)} name={`sfx ${s.src}`}>
          <Audio src={staticFile(s.src)} volume={s.vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** The storyboard and preview: the overlay over the footage. */
export const LivesafeFounderCut: React.FC = () => <LivesafeOverlay footage />;
