import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Cue, FPS, Word } from "../../kit/theme";
import { ClayBuddy, Mood } from "../../kit/ClayBuddy";
import { CLAY, CLAY_FONT, ClayCaptions, ClayCard, ClayChips, Pop, clay } from "../talking-head/clay";
import cuesJson from "../../../../videos/cohort-pitch-day/cues.json";
import wordsJson from "../../../../videos/cohort-pitch-day/words.json";

// The cohort pitch day (2026-10-24), told over Vishnu's own footage and photos with a narrated voice
// (ElevenLabs, Christopher, picked by Vishnu 2026-10-26) and the clay buddy reacting. Clay brand look throughout.
// The people on stage in the panel photo are a VC and a founder from the event, not the founder he pitched to,
// so no pitch line ever sits on them.

const cues = cuesJson as (Cue & { words: string })[];
const words = wordsJson as Word[];
export const seconds = cues[cues.length - 1].end + 0.6;
const C = Object.fromEntries(cues.map((c) => [c.id, c]));
const B = (f: string) => staticFile(`cohort-pitch-day/broll/${f}`);

/** The time a word is spoken, first match at or after `from`. */
const at = (w: string, from = 0) => {
  const hit = words.find((x) => x.start >= from - 0.01 && x.w.toLowerCase().replace(/[^a-z0-9]/g, "") === w);
  return hit ? hit.start : from;
};
const seq = (a: number, b: number) => ({ from: Math.round(a * FPS), durationInFrames: Math.max(1, Math.round((b - a) * FPS)) });

/** A photo that slowly pushes in, so a still never sits dead. */
const Photo: React.FC<{ src: string; dur: number; from?: number; to?: number; origin?: string; grey?: number }> = ({ src, dur, from = 1.0, to = 1.12, origin = "50% 40%", grey = 0 }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, dur * FPS], [from, to], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#111" }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${s})`, transformOrigin: origin, filter: `grayscale(${grey})` }} />
    </AbsoluteFill>
  );
};
const Clip: React.FC<{ src: string; trim: number }> = ({ src, trim }) => (
  <AbsoluteFill style={{ background: "#111" }}>
    <OffthreadVideo src={src} trimBefore={Math.round(trim * FPS)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </AbsoluteFill>
);
const Room: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: "#E9DDFB", alignItems: "center", justifyContent: "center", gap: 50, fontFamily: CLAY_FONT, color: CLAY.ink }}>
    <div style={{ ...clay("#FFD6A8", 999), position: "absolute", width: 420, height: 420, right: -140, top: -60 }} />
    <div style={{ ...clay("#BFF0D4", 999), position: "absolute", width: 260, height: 260, left: -90, bottom: 160 }} />
    {children}
  </AbsoluteFill>
);
/** A card low in the frame, above the captions. */
const Low: React.FC<{ children: React.ReactNode; bottom?: number }> = ({ children, bottom = 560 }) => (
  <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: `0 70px ${bottom}px` }}>{children}</AbsoluteFill>
);
const Corner: React.FC<{ mood: Mood; top?: number }> = ({ mood, top }) => (
  <AbsoluteFill style={{ alignItems: "flex-end", justifyContent: top === undefined ? "flex-end" : "flex-start", padding: top === undefined ? "0 50px 760px" : `${top}px 50px 0` }}>
    <ClayBuddy mood={mood} size={230} />
  </AbsoluteFill>
);
const Pill: React.FC<{ fill: string; size?: number; children: React.ReactNode }> = ({ fill, size = 56, children }) => (
  <div style={{ ...clay(fill, 999), padding: "14px 40px", fontFamily: CLAY_FONT, fontWeight: 700, fontSize: size, color: CLAY.ink, whiteSpace: "nowrap" }}>{children}</div>
);

/** 10 min, crossed out by 15 min when "fifteen" is said. */
const Timer: React.FC<{ swap: number }> = ({ swap }) => {
  const t = useCurrentFrame() / FPS;
  const done = t >= swap;
  return (
    <Room>
      <Pop>
        <div style={{ ...clay("#F7F2FF", 50), padding: "18px 44px", fontFamily: CLAY_FONT, fontWeight: 600, fontSize: 52 }}>My time to pitch</div>
      </Pop>
      <Pop delay={6} tilt={-2}>
        <div style={{ ...clay(done ? "#BFF0D4" : "#FFF0B8", 70), padding: "10px 70px", fontFamily: CLAY_FONT, fontWeight: 700, fontSize: 220, color: CLAY.ink, position: "relative" }}>
          {done ? "15" : "10"}<span style={{ fontSize: 80 }}> min</span>
        </div>
      </Pop>
      <Corner mood={done ? "wow" : "think"} top={1180} />
    </Room>
  );
};

/** Goa to Bengaluru, drawn as a clay route that fills from one city to the other. */
const Route: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [8, Math.min(dur * FPS, 50)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Low bottom={600}>
      <Pop>
        <div style={{ ...clay("#F7F2FF", 50), padding: "26px 34px", display: "flex", alignItems: "center", gap: 22, fontFamily: CLAY_FONT, fontWeight: 700, fontSize: 52, color: CLAY.ink }}>
          <span>Goa</span>
          <div style={{ ...clay("#E9DDFB", 999), width: 360, height: 26, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${k * 100}%`, background: "#FFB4C8", borderRadius: 999 }} />
          </div>
          <span>Bengaluru</span>
        </div>
      </Pop>
    </Low>
  );
};

export const CohortPitchDay: React.FC = () => {
  const w = C.walkin, ns = C.noslides, p = C.pitch, lk = C.liked, lt = C.letter, cg = C.cantgo, mo = C.money, ad = C.advice,
    nh = C.niche_how, ni = C.niche, me = C.met, en = C.end;
  const fifteen = at("fifteen", p.start);
  const goa = at("goa", lt.start);
  const four = at("four", me.start);
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {/* 1. walking in */}
      <Sequence {...seq(0, ns.start)} name="walk in">
        <Clip src={B("VID_20261024_162518.mp4")} trim={0} />
        <Sequence from={Math.round((at("six", w.start) - 0.1) * FPS)}>
          <Low><Pill fill="#FFF0B8">a 6-minute pitch</Pill></Low>
        </Sequence>
      </Sequence>
      {/* 2. no slides */}
      <Sequence {...seq(ns.start, p.start)} name="no slides">
        <Clip src={B("VID_20261024_184745.mp4")} trim={1} />
        <Low><ClayCard text="No slides." mark="No slides." i={0} /></Low>
        <Corner mood="wow" />
      </Sequence>
      {/* 3. the pitch: his walk, then the clock */}
      <Sequence {...seq(p.start, p.start + 3.2)} name="pitch walk">
        <Clip src={B("VID_20261024_172039.mp4")} trim={5} />
        <Low><ClayCard text="A founder who raised a Series B" mark="Series B" i={1} /></Low>
      </Sequence>
      <Sequence {...seq(p.start + 3.2, lk.start)} name="pitch clock">
        <Timer swap={fifteen - (p.start + 3.2)} />
      </Sequence>
      {/* 4. he liked it: the buddy's moment */}
      <Sequence {...seq(lk.start, lt.start)} name="liked">
        <Room>
          <ClayBuddy mood="happy" size={520} />
          <Pop delay={6}><Pill fill="#FFF0B8" size={72}>He liked it.</Pill></Pop>
        </Room>
      </Sequence>
      {/* 5. the letter */}
      <Sequence {...seq(lt.start, cg.start)} name="letter">
        <Photo src={B("IMG-20261024-WA0040.jpg")} dur={cg.start - lt.start} from={1.0} to={1.3} origin="50% 30%" />
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 190 }}>
          <Pop tilt={-2}><Pill fill="#FFD6E7" size={50}>Next round: Founders' Cohort</Pill></Pop>
        </AbsoluteFill>
        <Sequence from={Math.round((goa - lt.start - 0.1) * FPS)}>
          <Route dur={cg.start - goa} />
        </Sequence>
        <Corner mood="wow" top={330} />
      </Sequence>
      {/* 6. but I can't go */}
      <Sequence {...seq(cg.start, mo.start)} name="can't go">
        <Photo src={B("IMG_20261024_191150_326.jpg")} dur={mo.start - cg.start} grey={1} />
        <Corner mood="sad" />
      </Sequence>
      {/* 7. no money, something better */}
      <Sequence {...seq(mo.start, ad.start)} name="money">
        <Photo src={B("IMG_20261024_191153_166.jpg")} dur={ad.start - mo.start} />
        <Sequence from={Math.round((at("still", mo.start) - mo.start) * FPS)}>
          <Low><ClayCard text="Something better than a seat" mark="better" i={2} /></Low>
        </Sequence>
      </Sequence>
      {/* 8. his advice */}
      <Sequence {...seq(ad.start, nh.start)} name="advice">
        <Clip src={B("VID_20261024_162518.mp4")} trim={9.5} />
        <Corner mood="think" />
      </Sequence>
      {/* 9. the advice, as cards */}
      <Sequence {...seq(nh.start, ni.start)} name="niche how">
        <Room>
          <AbsoluteFill style={{ alignItems: "center", paddingTop: 250 }}>
            <Pop><Pill fill="#FFD6E7" size={52}>Don't build for every SaaS yet</Pill></Pop>
          </AbsoluteFill>
          <ClayChips start={nh.start} items={[
            { text: "Complex workflows", at: at("complex", nh.start) },
            { text: "Only a few people know it", at: at("few", nh.start) },
            { text: "Nothing written down", at: at("written", nh.start) },
          ]} />
          <Corner mood="think" top={1250} />
        </Room>
      </Sequence>
      {/* 10. my first niche */}
      <Sequence {...seq(ni.start, me.start)} name="niche">
        <Clip src={B("VID_20261024_192025.mp4")} trim={0} />
        <Low><ClayCard text="My first niche" mark="first niche" i={3} /></Low>
        <Corner mood="happy" />
      </Sequence>
      {/* 11. the people, then the numbers */}
      <Sequence {...seq(me.start, four - 0.2)} name="met">
        <Photo src={B("IMG_20261024_192057_585.jpg")} dur={four - me.start} />
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 220 }}>
          <Pop><Pill fill="#C9E4FF" size={48}>VCs and founders on stage</Pill></Pop>
        </AbsoluteFill>
      </Sequence>
      <Sequence {...seq(four - 0.2, en.start)} name="sign-ups">
        <Photo src={B("IMG_20261024_192048_786.jpg")} dur={en.start - four} />
        <Low>
          <Pop tilt={2}>
            <div style={{ ...clay("#FFF0B8", 60), padding: "30px 70px", textAlign: "center", fontFamily: CLAY_FONT, color: CLAY.ink }}>
              <div style={{ fontWeight: 700, fontSize: 190, lineHeight: 1 }}>4</div>
              <div style={{ fontWeight: 600, fontSize: 46 }}>sign-ups that day</div>
              <div style={{ fontWeight: 500, fontSize: 34, marginTop: 6 }}>my second best day</div>
            </div>
          </Pop>
        </Low>
        <Corner mood="wow" top={260} />
      </Sequence>
      {/* 12. still going */}
      <Sequence {...seq(en.start, seconds)} name="end">
        <Photo src={B("IMG_20261024_162453_910.jpg")} dur={seconds - en.start} />
        <AbsoluteFill style={{ background: "rgba(233,221,251,0.55)", alignItems: "center", justifyContent: "center", gap: 40 }}>
          <ClayBuddy mood="wave" size={360} />
          <Pop delay={6}><Pill fill="#F7F2FF" size={80}>Day 26. Still going.</Pill></Pop>
          <Pop delay={12}><Pill fill="#BFF0D4" size={44}>askverb.com</Pill></Pop>
        </AbsoluteFill>
      </Sequence>

      {/* captions, on the absolute clock, everywhere but the end card */}
      <Sequence durationInFrames={Math.round(en.start * FPS)} name="captions">
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 340 }}>
          <div style={{ maxWidth: 960 }}><ClayCaptions words={words} /></div>
        </AbsoluteFill>
      </Sequence>
      <Audio src={staticFile("cohort-pitch-day/voice/voice.mp3")} />
    </AbsoluteFill>
  );
};
