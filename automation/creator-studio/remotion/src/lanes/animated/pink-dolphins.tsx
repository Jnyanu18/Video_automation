import React from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors, random, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Captions } from "../../kit/Captions";
import { Cue, FPS, Word } from "../../kit/theme";
import { THEMES } from "../../kit/themes";
import cuesJson from "../../../../videos/pink-dolphins/cues.json";
import wordsJson from "../../../../videos/pink-dolphins/words.json";

const cues = cuesJson as Cue[];
const words = wordsJson as Word[];
export const seconds = cues.length ? cues[cues.length - 1].end : 5;

// Every frame is one SVG world, 1080 x 1920, drawn from the time alone. The camera is the water line:
// below the frame we are above the river, above the frame we are under it. Beats only move targets.
const TH = THEMES["amazon-dusk"];
const W = 1080;
const H = 1920;
const S: Record<string, number> = Object.fromEntries(cues.map((c) => [c.id, c.start]));
const END = seconds;

const ease = Easing.inOut(Easing.cubic);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** 0 before a, 1 after b, eased between. */
const ramp = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: ease });
/** Eased keyframes [time, value]. */
const kf = (t: number, pts: [number, number][]) =>
  interpolate(t, pts.map((p) => p[0]), pts.map((p) => p[1]), { ...clamp, easing: ease });
const mix = (k: number, a: string, b: string) => interpolateColors(Math.min(1, Math.max(0, k)), [0, 1], [a, b]);
/** Visible from a to b, with fades of d seconds at both ends. */
const shown = (t: number, a: number, b: number, d = 0.4) => Math.min(ramp(t, a, a + d), 1 - ramp(t, b - d, b));

// ---------------------------------------------------------------- the dolphin, side on, facing right
const GREY_TOP = "#5f6b73";
const GREY_BELLY = "#aeb7bc";
const PINK_TOP = "#df5f8b";
const PINK_BELLY = "#ffc3d4";
const BODY =
  "M 300 10 C 262 2, 205 -4, 172 -14 C 152 -70, 92 -86, 40 -80 C -40 -75, -150 -52, -240 -16 C -260 -9, -275 -6, -287 -5 L -287 5 C -262 18, -150 58, -40 70 C 60 76, 140 52, 180 26 C 220 22, 268 22, 300 14 Z";
const FLUKES = "M -278 0 C -318 -48, -348 -70, -378 -76 C -362 -36, -348 -12, -334 0 C -348 12, -362 36, -378 76 C -348 70, -318 48, -278 0 Z";
const DORSAL = "M -30 -77 C -70 -104, -118 -100, -150 -62 Z";
const FLIPPER = "M 60 46 C 40 110, -10 142, -48 138 C -32 100, -4 70, 18 52 Z";
const SCARS = [
  "M 110 -52 C 96 -32, 82 -12, 70 8",
  "M -20 -62 C -30 -36, -46 -16, -62 0",
  "M 34 18 C 12 30, -14 40, -40 46",
  "M -120 -42 C -136 -22, -150 -6, -172 4",
  "M 150 -12 C 130 0, 114 12, 98 28",
  "M -60 -22 C -80 -6, -100 10, -126 18",
  "M -190 -22 C -206 -10, -222 0, -240 4",
  "M 62 -34 C 44 -16, 32 0, 22 16",
];

type DS = { x: number; y: number; rot?: number; s?: number; pink?: number; flip?: boolean; glow?: number; scars?: number; opacity?: number };

const Dolphin: React.FC<DS & { id: string; t: number }> = ({ id, t, x, y, rot = 0, s = 1, pink = 1, flip = false, glow = 0, scars = 0, opacity = 1 }) => {
  const top = mix(pink, GREY_TOP, PINK_TOP);
  const belly = mix(pink, GREY_BELLY, PINK_BELLY);
  const sway = Math.sin(t * Math.PI * 2 * 0.7) * 2;
  const tail = Math.sin(t * Math.PI * 2 * 1.4) * 12;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot + sway}) scale(${flip ? -s : s} ${s})`} opacity={opacity}>
      <defs>
        <linearGradient id={`dg-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="-86" x2="0" y2="76">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={belly} />
        </linearGradient>
      </defs>
      {glow > 0 ? (
        <g filter="url(#glow)" opacity={glow}>
          <path d={BODY} fill={TH.accent} transform="scale(1.08)" />
        </g>
      ) : null}
      <g transform={`rotate(${tail} -280 0)`}>
        <path d={FLUKES} fill={top} />
      </g>
      <path d={DORSAL} fill={top} />
      <path d={BODY} fill={`url(#dg-${id})`} />
      <ellipse cx="108" cy="-54" rx="56" ry="17" fill="#ffffff" opacity="0.16" />
      <path d={FLIPPER} fill={top} />
      <circle cx="150" cy="-18" r="6" fill="#1a1013" />
      <path d="M 298 13 C 260 16, 225 18, 190 20" stroke="#2a1b22" strokeOpacity="0.35" strokeWidth="3" fill="none" />
      {SCARS.map((d, i) => {
        const k = Math.min(1, Math.max(0, scars - i));
        if (k <= 0) return null;
        const dash = { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - k, fill: "none", strokeLinecap: "round" as const };
        return (
          <g key={i}>
            <path d={d} {...dash} stroke={TH.accent} strokeWidth={16} opacity={0.55} filter="url(#soft)" />
            <path d={d} {...dash} stroke="#ffe3ec" strokeWidth={4} />
          </g>
        );
      })}
    </g>
  );
};

// ---------------------------------------------------------------- the dolphin from above, head on a pivot
const TOP_BODY = "M 0 -70 C -120 -86, -280 -56, -360 -12 L -360 12 C -280 56, -120 86, 0 70 Z";
const TOP_FLUKES = "M -350 0 C -400 -60, -430 -90, -462 -96 C -442 -40, -422 -10, -410 0 C -422 10, -442 40, -462 96 C -430 90, -400 60, -350 0 Z";
const TOP_FLIP = "M -70 -66 C -110 -150, -170 -184, -200 -176 C -170 -124, -130 -88, -110 -70 Z";
const TOP_HEAD = "M -14 -66 C 40 -72, 98 -50, 128 -14 C 162 -10, 200 -8, 232 -5 C 243 -3, 243 3, 232 5 C 200 8, 162 10, 128 14 C 98 50, 40 72, -14 66 Z";

const TopDolphin: React.FC<{ x: number; y: number; s: number; turn: number; opacity: number }> = ({ x, y, s, turn, opacity }) => {
  if (opacity <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
      <path d={TOP_FLUKES} fill={PINK_TOP} />
      <path d={TOP_FLIP} fill={PINK_TOP} />
      <path d={TOP_FLIP} fill={PINK_TOP} transform="scale(1 -1)" />
      <path d={TOP_BODY} fill={PINK_TOP} />
      <path d="M -330 0 L -10 0" stroke="#b24770" strokeWidth="10" strokeLinecap="round" opacity="0.5" />
      <g transform={`rotate(${-90 * turn})`}>
        <path d={TOP_HEAD} fill="#e8769c" />
        <circle cx="84" cy="-52" r="7" fill="#1a1013" />
        <circle cx="84" cy="52" r="7" fill="#1a1013" />
      </g>
      <path
        d="M 300 0 A 300 300 0 0 0 0 -300"
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - turn}
        stroke={TH.text}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        opacity={0.9}
      />
      <text x="150" y="-250" fontFamily={TH.display} fontSize="100" fill={TH.text} opacity={ramp(turn, 0.6, 1)}>
        90°
      </text>
    </g>
  );
};

// ---------------------------------------------------------------- the rest of the cast
const PERSON =
  "M -24 -214 C -36 -210, -42 -200, -42 -186 L -46 -110 C -46 -104, -38 -102, -36 -108 L -32 -170 L -30 -100 L -28 -4 C -28 2, -10 2, -10 -4 L -4 -96 L 4 -96 L 10 -4 C 10 2, 28 2, 28 -4 L 30 -100 L 32 -170 L 36 -108 C 38 -102, 46 -104, 46 -110 L 42 -186 C 42 -200, 36 -210, 24 -214 Z";
const FISH = "M 0 0 C 30 -26, 80 -26, 104 0 C 80 26, 30 26, 0 0 Z M 2 0 L -32 -22 L -32 22 Z";

/** The tree line on both banks, sitting on the water line. */
const canopy = (base: number) => {
  let d = `M 0 ${base} L 0 ${base - 90}`;
  for (let x = 0; x <= W; x += 54) {
    const h = 70 + random(`c${x}`) * 120;
    d += ` Q ${x + 27} ${base - h - 40}, ${x + 54} ${base - 70 - random(`c${x + 54}`) * 120}`;
  }
  return d + ` L ${W} ${base} Z`;
};

const TRUNKS = [
  { x: 70, w: 54, front: false },
  { x: 250, w: 70, front: true },
  { x: 470, w: 46, front: false },
  { x: 650, w: 62, front: false },
  { x: 840, w: 76, front: true },
  { x: 1010, w: 50, front: false },
];

// ---------------------------------------------------------------- where the main dolphin is, beat by beat
function hero(t: number): DS | null {
  if (t < S.boto) {
    if (t < S.pink) {
      const p = interpolate(t, [0.1, S.pink], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
      return { x: 160 + p * 380, y: 1330 - 610 * p, rot: -40 + 36 * p, s: 0.95 };
    }
    if (t < S.born + 1.4) {
      return {
        x: 540 + (t - S.pink) * 22,
        y: 720 + Math.sin(t * 3) * 6,
        rot: -4 + (t - S.pink) * 3,
        s: 0.95,
        glow: shown(t, S.pink, S.born + 0.3, 0.35),
        pink: 1 - ramp(t, S.born + 0.2, S.born + 1.4),
      };
    }
    const p = interpolate(t, [S.born + 1.4, S.boto], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
    return { x: 590 + p * 300, y: 740 + p * 800, rot: 8 + p * 50, s: 0.95, pink: 0 };
  }
  if (t < S.size) {
    const x = interpolate(t, [S.boto + 0.2, S.boto + 1.9, S.size], [-380, 520, 640], { ...clamp, easing: Easing.out(Easing.cubic) });
    return { x, y: 1000 + Math.sin(t * 2) * 14, rot: Math.sin(t * 2.4) * 3, s: 0.95, pink: ramp(t, S.boto + 0.3, S.boto + 1.1) };
  }
  if (t < S.flood) {
    return {
      x: 640,
      y: kf(t, [[S.size, 1000], [S.size + 0.9, 1050]]),
      s: kf(t, [[S.size, 0.95], [S.size + 0.9, 1.04]]),
      opacity: 1 - ramp(t, S.flood - 0.3, S.flood),
    };
  }
  if (t < S.neck) {
    const a = 19.6;
    if (t < a) return null;
    return { x: interpolate(t, [a, S.neck], [-380, 1460], clamp), y: 1260 + Math.sin((t - a) * 2.6) * 90, rot: Math.cos((t - a) * 2.6) * 14, s: 0.72 };
  }
  if (t < S.muddy) return null;
  if (t < S.legend) {
    return { x: kf(t, [[S.muddy, 200], [S.muddy + 1.2, 430]]), y: 1060 + Math.sin(t * 1.6) * 8, s: 0.9, opacity: 1 - ramp(t, S.legend - 0.4, S.legend) };
  }
  if (t < S.why) return null;
  if (t < S.males) {
    return {
      x: kf(t, [[S.why, -420], [S.why + 1.0, 560]]),
      y: 1080 + Math.sin(t * 1.4) * 10,
      s: 1.25,
      pink: ramp(t, S.scars + 2.4, S.males - 0.6),
      scars: interpolate(t, [S.scars + 0.3, S.males - 1.4], [0, SCARS.length], clamp),
      opacity: 1 - ramp(t, S.males - 0.2, S.males + 0.1),
    };
  }
  if (t < S.endangered) {
    const clash = 56.6;
    if (t < clash) {
      const p = ramp(t, S.males, clash);
      return { x: -350 + p * 820, y: 1150 - p * 100, rot: -6, s: 0.75, pink: 0.85 };
    }
    if (t < clash + 0.8) return { x: 470 + Math.sin(t * 40) * 14, y: 1050, rot: Math.sin(t * 25) * 12, s: 0.75, pink: 0.9 };
    const p = ramp(t, clash + 0.8, S.endangered);
    return { x: 470 + p * 1050, y: 1050 - p * 380, rot: -18, s: 0.75, pink: 1 };
  }
  if (t < S.end) {
    return { x: interpolate(t, [S.endangered, S.end], [300, 700], clamp), y: 1090 + Math.sin(t * 1.5) * 16, s: 0.6, opacity: ramp(t, S.endangered, S.endangered + 0.6) };
  }
  const a = S.end + 0.9;
  if (t < a) return null;
  const p = interpolate(t, [a, a + 1.7], [0, 1], clamp);
  return { x: 170 + p * 470, y: 1260 - Math.sin(p * Math.PI) * 230, rot: -50 + p * 100, s: 0.42, opacity: shown(t, a, END + 1, 0.2) };
}

// ---------------------------------------------------------------- the scene
export const PinkDolphins: React.FC = () => {
  const t = useCurrentFrame() / FPS;

  // The water line: 1180 looks across the river at dusk; below 0 we are under the water.
  const waterY = kf(t, [
    [0, 1180], [S.boto, 1180], [S.boto + 0.9, -260],
    [S.flood, -260], [S.flood + 0.7, 1560], [17.6, 1560], [19.4, 760],
    [S.neck, 760], [S.neck + 0.7, -260],
    [S.legend, -260], [S.legend + 0.8, 1180],
    [S.why, 1180], [S.why + 0.8, -260],
    [S.end, -260], [S.end + 0.8, 1180],
  ]);
  const under = ramp(-waterY, -300, 200); // 1 when the camera is fully under water

  // Light: dusk, then night for the legend, dawn when he is gone, dusk again, sunset at the end.
  const times = [0, S.legend, S.legend + 1, S.gone, S.gone + 1, S.end, END];
  const skyTop = interpolateColors(t, times, ["#2a1b47", "#2a1b47", "#05081a", "#05081a", "#33427a", "#2a1b47", "#3a1838"]);
  const skyMid = interpolateColors(t, times, ["#b0577e", "#b0577e", "#121a40", "#121a40", "#e39aa6", "#b0577e", "#e0607a"]);
  const skyLow = interpolateColors(t, times, ["#f3a77e", "#f3a77e", "#2c3866", "#2c3866", "#ffd6a2", "#f3a77e", "#ffb46e"]);
  const night = shown(t, S.legend + 0.4, S.gone + 0.8, 0.9);
  const trees = mix(night, "#1a1028", "#03050d");
  const mud = shown(t, S.muddy + 0.1, S.legend + 0.2, 1.2);
  const deepTop = mix(mud, "#1f6a73", "#7b5634");
  const deepLow = mix(mud, "#0a2a33", "#3a2512");
  const surfTop = mix(0.4, skyMid, "#1d4a56");
  const surfLow = mix(night, "#08222b", "#03070f");

  const h = hero(t);
  const head = { x: 430 + 0.9 * 170, y: 1060 - 0.9 * 40 }; // the melon of the muddy and sonar dolphin

  // Sonar: one ring every 0.18 s from the forehead; the fish lights when the first ring reaches it.
  const fish = { x: 920, y: 1010 };
  const sonarFrom = 33.4;
  const ringSpeed = 900;
  const hitAt = sonarFrom + Math.hypot(fish.x - head.x, fish.y - head.y) / ringSpeed;
  const sonarOn = shown(t, sonarFrom, S.legend - 0.3, 0.2);

  const moonY = kf(t, [[S.legend + 0.3, 1300], [S.man - 0.2, 640]]);
  const sunUp = ramp(t, S.end + 0.4, S.end + 1.2);
  const manRise = ramp(t, 41.6, 42.9);
  const manAlpha = shown(t, 41.5, S.gone + 0.9, 0.5);
  const netY = kf(t, [[59.2, -60], [62.2, 860]]);
  const damY = kf(t, [[62.5, 1960], [63.6, 1360]]);
  const trap = 1 - ramp(t, S.end, S.end + 0.7);
  const trunkAlpha = shown(t, S.flood + 0.5, S.neck + 0.3, 0.6);

  return (
    <AbsoluteFill style={{ background: "#05080f" }}>
      <Audio src={staticFile("pink-dolphins/voice/voice.mp3")} />
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={Math.max(1, waterY)}>
            <stop offset="0" stopColor={skyTop} />
            <stop offset="0.62" stopColor={skyMid} />
            <stop offset="1" stopColor={skyLow} />
          </linearGradient>
          <linearGradient id="surface" gradientUnits="userSpaceOnUse" x1="0" y1={waterY} x2="0" y2={H}>
            <stop offset="0" stopColor={surfTop} />
            <stop offset="1" stopColor={surfLow} />
          </linearGradient>
          <linearGradient id="deep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={deepTop} />
            <stop offset="1" stopColor={deepLow} />
          </linearGradient>
          <radialGradient id="mudfog" gradientUnits="userSpaceOnUse" cx={head.x + 60} cy={head.y} r="760">
            <stop offset="0" stopColor="#5a3d22" stopOpacity="0" />
            <stop offset="0.22" stopColor="#5a3d22" stopOpacity="0" />
            <stop offset="0.55" stopColor="#4a3119" stopOpacity="0.88" />
            <stop offset="1" stopColor="#2c1c0c" stopOpacity="0.98" />
          </radialGradient>
          <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.6" />
          </radialGradient>
          <pattern id="net" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 64 64 M 64 0 L 0 64" stroke="#efe3cf" strokeWidth="3" opacity="0.7" />
          </pattern>
          <clipPath id="aboveWater">
            <rect x="0" y="-2000" width={W} height={2000 + waterY + 6} />
          </clipPath>
          <clipPath id="aboveBank">
            <rect x="0" y="0" width={W} height="1196" />
          </clipPath>
        </defs>

        {/* Under water, behind everything */}
        <rect x="0" y="0" width={W} height={H} fill="url(#deep)" />

        {/* Above water: sky, stars, moon, sun, the tree line */}
        {waterY > 0 ? (
          <g>
            <rect x="0" y="0" width={W} height={waterY} fill="url(#sky)" />
            {Array.from({ length: 70 }, (_, i) => (
              <circle key={i} cx={random(`sx${i}`) * W} cy={random(`sy${i}`) * Math.max(0, waterY - 260)} r={1 + random(`sr${i}`) * 2.2} fill="#fff8e8" opacity={night * (0.4 + 0.6 * random(`so${i}`))} />
            ))}
            <circle cx="720" cy={moonY} r="92" fill="#fff4dc" opacity={night} />
            <circle cx="720" cy={moonY} r="150" fill="#fff4dc" opacity={night * 0.12} />
            <circle cx="540" cy={waterY + 40 - 160 * sunUp} r="130" fill="#ffd27a" opacity={sunUp} />
            <circle cx="540" cy={waterY + 40 - 160 * sunUp} r="240" fill="#ffb15a" opacity={sunUp * 0.2} />
            <path d={canopy(waterY)} fill={trees} />
          </g>
        ) : null}

        {/* Flooded forest: trunks behind the dolphin */}
        {TRUNKS.filter((k) => !k.front).map((k) => (
          <Trunk key={k.x} x={k.x} w={k.w} waterY={waterY} alpha={trunkAlpha} tint={surfTop} />
        ))}

        {/* The river from above the surface */}
        {waterY < H ? (
          <g opacity={1 - under}>
            <rect x="0" y={Math.max(0, waterY)} width={W} height={H} fill="url(#surface)" />
            {Array.from({ length: 14 }, (_, i) => (
              <rect key={i} x={720 - 70 + random(`m${i}`) * 140 - i * 4} y={waterY + 30 + i * 46} width={60 + i * 9} height="5" rx="2.5" fill="#fff4dc" opacity={night * (1 - i / 16) * 0.7} />
            ))}
            {Array.from({ length: 10 }, (_, i) => (
              <rect key={`s${i}`} x={540 - 60 - i * 8 + random(`n${i}`) * 40} y={waterY + 24 + i * 40} width={120 + i * 14} height="6" rx="3" fill="#ffcf85" opacity={sunUp * (1 - i / 11) * 0.65} />
            ))}
          </g>
        ) : null}

        {/* Light from above, under water */}
        {[120, 380, 640, 900].map((x, i) => {
          const sway = Math.sin(t * 0.6 + i) * 40;
          return <polygon key={x} points={`${x + sway},0 ${x + 90 + sway},0 ${x + 260},${H} ${x - 60},${H}`} fill="#bff4ee" opacity={under * 0.06 * (1 - mud)} />;
        })}

        {/* The splash where it falls back in */}
        <Splash t={t} at={S.born + 2.05} x={840} y={1180} />

        {/* The legend: a bank, a man who comes out of the river, and a ripple where he was */}
        <g opacity={shown(t, S.legend + 0.5, S.why + 0.2, 0.6)}>
          <path d="M 0 1172 L 360 1176 C 400 1180, 420 1190, 430 1206 L 0 1214 Z" fill={trees} />
          <g clipPath="url(#aboveBank)" opacity={manAlpha}>
            <g transform={`translate(210 ${1192 + (1 - manRise) * 400}) scale(1.35)`}>
              <path d={PERSON} fill="#05060c" />
              <circle cx="0" cy="-236" r="21" fill="#05060c" />
              <ellipse cx="0" cy="-252" rx="40" ry="7" fill="#05060c" />
              <rect x="-21" y="-284" width="42" height="32" rx="7" fill="#05060c" />
            </g>
          </g>
          <Ripple t={t} at={40.7} x={330} y={1240} />
          <Ripple t={t} at={41.3} x={330} y={1240} />
          <Ripple t={t} at={S.gone + 1.0} x={330} y={1240} big />
        </g>

        {/* The measure: a person beside the dolphin, and its length */}
        <g opacity={shown(t, S.size + 0.4, S.flood - 0.2, 0.5)}>
          <g transform="translate(118 1290) scale(1.88)">
            <path d={PERSON} fill="none" stroke={TH.text} strokeWidth="2.2" opacity="0.85" />
            <circle cx="0" cy="-236" r="20" fill="none" stroke={TH.text} strokeWidth="2.2" opacity="0.85" />
          </g>
          <Measure t={t} />
        </g>

        {/* The calf */}
        {t > S.calves - 0.2 && t < S.size + 1.6 ? (
          <Dolphin
            id="calf"
            t={t + 0.4}
            x={kf(t, [[S.calves, -200], [S.calves + 1.4, 420], [S.size, 470], [S.size + 1.5, -260]])}
            y={kf(t, [[S.calves, 1300], [S.calves + 1.4, 1150], [S.size, 1150], [S.size + 1.5, 1400]])}
            s={0.48}
            pink={0}
            flip={t > S.size + 0.15}
          />
        ) : null}

        {/* The main dolphin */}
        {h ? (
          <g clipPath={t < S.boto || t > S.end ? "url(#aboveWater)" : undefined}>
            <Dolphin id="hero" t={t} {...h} />
          </g>
        ) : null}

        {/* Two males: the second one */}
        {t > S.males && t < S.endangered ? (
          <Dolphin
            id="rival"
            t={t + 0.7}
            flip
            x={t < 56.6 ? 1450 - ramp(t, S.males, 56.6) * 810 : t < 57.4 ? 640 + Math.sin(t * 37) * 14 : 640 - ramp(t, 57.4, S.endangered) * 1080}
            y={t < 57.4 ? 1010 : 1010 + ramp(t, 57.4, S.endangered) * 420}
            rot={t < 57.4 ? -4 + Math.sin(t * 22) * (t > 56.6 ? 12 : 0) : 20}
            s={0.75}
            pink={0.35}
          />
        ) : null}
        <Bubbles t={t} burstAt={56.6} x={560} y={1030} />

        {/* Flooded forest: trunks in front of the dolphin */}
        {TRUNKS.filter((k) => k.front).map((k) => (
          <Trunk key={k.x} x={k.x} w={k.w} waterY={waterY} alpha={trunkAlpha} tint={surfTop} />
        ))}

        {/* The neck, from above */}
        <TopDolphin x={kf(t, [[S.neck + 0.3, 280], [S.neck + 1.3, 560]])} y={1120} s={1.2} turn={ramp(t, 26.1, 26.9)} opacity={shown(t, S.neck + 0.4, S.muddy + 0.1, 0.5)} />

        {/* Mud: everything past its nose fades out */}
        <rect x="0" y="0" width={W} height={H} fill="url(#mudfog)" opacity={mud} />

        {/* Sonar: rings out from the forehead, a fish found in the dark, the echo back */}
        <g opacity={sonarOn}>
          {Array.from({ length: 20 }, (_, i) => {
            const born = sonarFrom + i * 0.18;
            const age = t - born;
            if (age < 0 || age > 0.9 || born > 36.9) return null;
            return <circle key={i} cx={head.x} cy={head.y} r={age * ringSpeed} fill="none" stroke={TH.text} strokeWidth="4" opacity={(1 - age / 0.9) * 0.55} />;
          })}
          {Array.from({ length: 6 }, (_, i) => {
            const age = t - (36.1 + i * 0.16);
            if (age < 0 || age > 0.6) return null;
            return <circle key={`e${i}`} cx={fish.x} cy={fish.y} r={age * 520} fill="none" stroke={TH.accent} strokeWidth="5" opacity={(1 - age / 0.6) * 0.8} />;
          })}
          <g transform={`translate(${fish.x - 50} ${fish.y}) scale(1.4)`} opacity={ramp(t, hitAt, hitAt + 0.3)}>
            <path d={FISH} fill={TH.accent} filter="url(#glow)" opacity="0.7" />
            <path d={FISH} fill="#ffe3ec" />
          </g>
        </g>

        {/* A net comes down and a dam rises */}
        <g opacity={trap * ramp(t, 59.2, 59.6)}>
          <g transform={`translate(${Math.sin(t * 0.8) * 20} ${netY - 1000})`}>
            <rect x="-60" y="0" width={W + 120} height="1000" fill="url(#net)" />
            <path d={`M -60 1000 Q 270 ${1030 + Math.sin(t) * 20}, 540 1000 T ${W + 60} 1000`} stroke="#efe3cf" strokeWidth="8" fill="none" opacity="0.8" />
          </g>
        </g>
        <g opacity={trap}>
          <rect x="0" y={damY} width={W} height={H} fill="#5d626a" />
          <rect x="0" y={damY} width={W} height="34" fill="#7a8089" />
          {Array.from({ length: 9 }, (_, r) => (
            <g key={r}>
              <line x1="0" y1={damY + 34 + r * 74} x2={W} y2={damY + 34 + r * 74} stroke="#43474e" strokeWidth="4" />
              {Array.from({ length: 6 }, (_, c) => {
                const x = (c * 200 + (r % 2) * 100) % W;
                return <line key={c} x1={x} y1={damY + 34 + r * 74} x2={x} y2={damY + 108 + r * 74} stroke="#43474e" strokeWidth="4" />;
              })}
            </g>
          ))}
        </g>

        {/* Bubbles drifting up whenever we are under water */}
        {Array.from({ length: 36 }, (_, i) => {
          const sp = 60 + random(`bs${i}`) * 120;
          const y = H + 100 - ((t * sp + random(`bo${i}`) * 2400) % 2400);
          return <circle key={i} cx={random(`bx${i}`) * W + Math.sin(t * 2 + i) * 8} cy={y} r={3 + random(`br${i}`) * 7} fill="none" stroke="#dff7f3" strokeWidth="2" opacity={under * 0.35 * (1 - mud)} />;
        })}

        <rect x="0" y="0" width={W} height={H} fill="url(#vignette)" />
      </svg>

      {/* Words on screen: two to four words or one number */}
      <Label t={t} a={S.pink + 0.25} b={S.born + 0.4} top={360} size={230} color={TH.accent}>
        PINK
      </Label>
      <Label t={t} a={S.boto + 0.6} b={S.size} top={300} size={92} kicker="the boto">
        Amazon river dolphin
      </Label>
      <Label t={t} a={34.14} b={S.legend - 0.3} top={300} size={210} color={TH.accent} kicker="clicks / second" kickerBelow>
        80
      </Label>
      <Label t={t} a={S.why + 0.4} b={S.scars} top={330} size={150}>
        WHY PINK?
      </Label>
      <Label t={t} a={49.52} b={S.males - 0.2} top={330} size={190} color={TH.accent}>
        SCARS
      </Label>
      <Stamp t={t} at={60.14} until={S.end + 0.3} />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 250 }}>
        <div style={{ maxWidth: 900 }}>
          <Captions words={words} size={62} max={3} theme={TH} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- small parts
const Measure: React.FC<{ t: number }> = ({ t }) => {
  const k = ramp(t, 12.3, 13.1);
  const len = 1.04 * 678;
  const x0 = 640 - 1.04 * 378;
  const x1 = x0 + k * len;
  return (
    <g stroke={TH.text} strokeWidth="5" strokeLinecap="round">
      <line x1={x0} y1="890" x2={x1} y2="890" />
      <line x1={x0} y1="864" x2={x0} y2="916" />
      <line x1={x1} y1="864" x2={x1} y2="916" opacity={k} />
      <text x={x0 + len / 2} y="830" textAnchor="middle" fontFamily={TH.display} fontSize="104" fill={TH.text} stroke="none" opacity={ramp(t, 12.7, 13.2)}>
        2.5 m
      </text>
    </g>
  );
};

const Trunk: React.FC<{ x: number; w: number; waterY: number; alpha: number; tint: string }> = ({ x, w, waterY, alpha, tint }) => {
  if (alpha <= 0) return null;
  const wl = Math.max(0, Math.min(H, waterY));
  return (
    <g opacity={alpha}>
      <path d={`M ${x - w / 2} 0 L ${x + w / 2} 0 L ${x + w / 2 + 8} ${wl} L ${x - w / 2 - 8} ${wl} Z`} fill="#24160f" />
      <path d={`M ${x - w / 2 - 8} ${wl} L ${x + w / 2 + 8} ${wl} L ${x + w / 2 + 22} ${H} L ${x - w / 2 - 22} ${H} Z`} fill={mix(0.55, "#24160f", tint)} />
      <rect x={x - w / 2 - 14} y={wl - 3} width={w + 28} height="6" rx="3" fill="#ffe2c4" opacity="0.35" />
    </g>
  );
};

const Splash: React.FC<{ t: number; at: number; x: number; y: number }> = ({ t, at, x, y }) => {
  const age = t - at;
  if (age < 0 || age > 1.2) return null;
  return (
    <g>
      {[0, 0.15, 0.3].map((d) => {
        const a = age - d;
        if (a < 0) return null;
        return <ellipse key={d} cx={x} cy={y} rx={a * 300} ry={a * 40} fill="none" stroke="#fff4e6" strokeWidth="4" opacity={Math.max(0, 1 - a / 0.9)} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const vx = (random(`dx${i}`) - 0.5) * 520;
        const vy = -380 - random(`dy${i}`) * 420;
        return <circle key={i} cx={x + vx * age} cy={y + vy * age + 900 * age * age} r={5 + random(`dr${i}`) * 7} fill="#fff4e6" opacity={Math.max(0, 1 - age / 1.1)} />;
      })}
    </g>
  );
};

const Ripple: React.FC<{ t: number; at: number; x: number; y: number; big?: boolean }> = ({ t, at, x, y, big }) => {
  const life = big ? 1.8 : 1.2;
  const age = t - at;
  if (age < 0 || age > life) return null;
  const k = age / life;
  return <ellipse cx={x} cy={y} rx={k * (big ? 360 : 200)} ry={k * (big ? 44 : 26)} fill="none" stroke="#e8eefc" strokeWidth="4" opacity={(1 - k) * 0.8} />;
};

const Bubbles: React.FC<{ t: number; burstAt: number; x: number; y: number }> = ({ t, burstAt, x, y }) => {
  const age = t - burstAt;
  if (age < 0 || age > 1.6) return null;
  return (
    <g>
      {Array.from({ length: 28 }, (_, i) => {
        const ang = random(`ba${i}`) * Math.PI * 2;
        const sp = 120 + random(`bv${i}`) * 260;
        return (
          <circle key={i} cx={x + Math.cos(ang) * sp * age} cy={y + Math.sin(ang) * sp * age - 180 * age * age} r={4 + random(`bz${i}`) * 12} fill="none" stroke="#e9fbf8" strokeWidth="3" opacity={Math.max(0, 1 - age / 1.6)} />
        );
      })}
    </g>
  );
};

const Label: React.FC<{ t: number; a: number; b: number; top: number; size: number; color?: string; kicker?: string; kickerBelow?: boolean; children: React.ReactNode }> = ({
  t, a, b, top, size, color, kicker, kickerBelow, children,
}) => {
  const o = shown(t, a, b, 0.3);
  if (o <= 0) return null;
  const pop = interpolate(t, [a, a + 0.35], [0.86, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  const k = kicker ? (
    <div style={{ fontFamily: TH.body, fontWeight: 600, fontSize: 46, letterSpacing: 6, textTransform: "uppercase", color: TH.text, opacity: 0.85 }}>{kicker}</div>
  ) : null;
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top, opacity: o, pointerEvents: "none" }}>
      <div style={{ transform: `scale(${pop})`, textAlign: "center", textShadow: TH.shadow, padding: "0 60px" }}>
        {kickerBelow ? null : k}
        <div style={{ fontFamily: TH.display, fontWeight: 600, fontSize: size, lineHeight: 1, color: color ?? TH.text }}>{children}</div>
        {kickerBelow ? k : null}
      </div>
    </AbsoluteFill>
  );
};

const Stamp: React.FC<{ t: number; at: number; until: number }> = ({ t, at, until }) => {
  const o = shown(t, at, until, 0.15);
  if (o <= 0) return null;
  const s = interpolate(t, [at, at + 0.22], [1.8, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 300, opacity: o }}>
      <div
        style={{
          transform: `rotate(-8deg) scale(${s})`,
          border: `10px solid ${TH.accent}`,
          borderRadius: 18,
          padding: "18px 40px",
          fontFamily: TH.display,
          fontWeight: 600,
          fontSize: 120,
          letterSpacing: 6,
          color: TH.accent,
          background: "rgba(20,8,14,0.55)",
        }}
      >
        ENDANGERED
      </div>
    </AbsoluteFill>
  );
};
