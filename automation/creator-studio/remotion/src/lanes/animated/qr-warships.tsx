import React from "react";
import { AbsoluteFill, Easing, Img, Sequence, interpolate, interpolateColors, random, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { chunk } from "../../kit/Captions";
import { Cue, FPS, Word } from "../../kit/theme";
import { SITE, SITE_CODE, SITE_FONT, sheet } from "../talking-head/site";
import cuesJson from "../../../../videos/qr-warships/cues.json";
import wordsJson from "../../../../videos/qr-warships/words.json";

const cues = cuesJson as Cue[];
const words = wordsJson as Word[];
export const seconds = cues.length ? cues[cues.length - 1].end + 0.6 : 5;

// Two worlds. Act 1 (to "which takes them") is one SVG sea at dusk, drawn from the time alone, seen through a
// camera that pushes in on the sailors, pulls back, then becomes a drone's viewfinder and dives into one QR
// code. Act 2 is the look of auralionlabs.com (site.tsx): pale dotted stage, white cards, the orange dot.
// The roofer on his ladder is the one cartoon beat inside act 2. Sound effects are in sfx/ (ElevenLabs).
const SLUG = "qr-warships";
const W = 1080;
const H = 1920;
const S: Record<string, number> = Object.fromEntries(cues.map((c) => [c.id, c.start]));
const END = seconds;
/** When a spoken word starts (the first match at or after `after`). */
const at = (w: string, after = 0) => words.find((x) => x.start >= after && x.w.toLowerCase().replace(/[^a-z-]/g, "") === w)?.start ?? after;

const ease = Easing.inOut(Easing.cubic);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: ease });
const kf = (t: number, pts: [number, number][]) => interpolate(t, pts.map((p) => p[0]), pts.map((p) => p[1]), { ...clamp, easing: ease });
const mix = (k: number, a: string, b: string) => interpolateColors(Math.min(1, Math.max(0, k)), [0, 1], [a, b]);
const shown = (t: number, a: number, b: number, d = 0.25) => Math.min(ramp(t, a, a + d), 1 - ramp(t, b - d, b));
/** A pop-in: 0 to 1 with a little overshoot. */
const pop = (t: number, a: number, d = 0.28) => (t < a ? 0 : interpolate(t, [a, a + d], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.2)) }));

// Key moments, from the words.
const T = {
  slap: [1.25, 2.15, 3.05],
  flurry: at("literally"),
  bomb: at("blasting") - 0.1,
  blast: at("their", at("blasting")) - 0.15,
  lockOn: at("qr", S.lock),
  name: at("auralion"),
  ai: at("ai"),
  local: at("local"),
  ava: at("ava"),
  picks: at("picks"),
  call: at("call", S.ava),
  job: at("job"),
  calendar: at("calendar"),
  takes: at("takes"),
  sends: at("sends"),
  free: at("free"),
  missed: at("missed"),
  stop: at("stop"),
  endName: at("auralion", S.end),
};

const GREEN = "#62ff86";
const HULL = "#7c8896";
const HULL_DARK = "#606c7a";
const HULL_LIGHT = "#9aa6b3";

// ---------------------------------------------------------------- QR codes, drawn as one path each
const qrCache = new Map<number, string>();
function qrPath(seed: number): string {
  const hit = qrCache.get(seed);
  if (hit) return hit;
  const n = 21;
  const on = (x: number, y: number) => {
    const finder = (fx: number, fy: number) => {
      const dx = x - fx;
      const dy = y - fy;
      if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null;
      const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      return ring !== 2;
    };
    const f = finder(0, 0) ?? finder(n - 7, 0) ?? finder(0, n - 7);
    if (f !== null) return f;
    if ((x === 7 || y === 7) && (x < 8 || x > n - 9) && (y < 8 || y > n - 9)) return false;
    if (x === 7 && y > n - 9) return false;
    if (y === 6) return x % 2 === 0;
    if (x === 6) return y % 2 === 0;
    return random(`qr-${seed}-${x}-${y}`) > 0.52;
  };
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (on(x, y)) d += `M${x} ${y}h1v1h-1z`;
  qrCache.set(seed, d);
  return d;
}

const QR: React.FC<{ x: number; y: number; size: number; seed: number; k?: number; tilt?: number }> = ({ x, y, size, seed, k = 1, tilt = 0 }) => {
  if (k <= 0) return null;
  const u = size / 25;
  return (
    <g transform={`translate(${x + size / 2} ${y + size / 2}) rotate(${tilt}) scale(${k}) translate(${-size / 2} ${-size / 2})`}>
      <rect x="0" y="0" width={size} height={size} rx={u * 0.8} fill="#fbfbf7" />
      <path d={qrPath(seed)} transform={`translate(${2 * u} ${2 * u}) scale(${u})`} fill="#15171d" />
    </g>
  );
};

type Spot = { x: number; y: number; size: number; at: number };
// Where the codes go on the ship (world coordinates), and when each one lands.
const SPOTS: Spot[] = (() => {
  const s: Spot[] = [];
  const wall = [410, 468, 526, 584];
  const first = [
    { x: 410, y: 912 },
    { x: 584, y: 912 },
    { x: 410, y: 970 },
  ];
  first.forEach((p, i) => s.push({ ...p, size: 46, at: T.slap[i] }));
  for (const y of [912, 970]) for (const x of wall) if (!first.some((p) => p.x === x && p.y === y)) s.push({ x, y, size: 46, at: 0 });
  for (const [row, y] of [1050, 1098, 1146].entries()) {
    for (let x = 160 + (row % 2) * 26; x < 930; x += 54) {
      const bowEdge = 980 - ((y + 40 - 1022) / 178) * 75;
      if (x + 44 > bowEdge) continue;
      if (x > 780 && x < 900 && y < 1060) continue;
      s.push({ x, y, size: 40, at: 0 });
    }
  }
  s.push({ x: 694, y: 900, size: 38, at: 0 }, { x: 696, y: 952, size: 38, at: 0 });
  s.push({ x: 816, y: 1002, size: 24, at: 0 }, { x: 232, y: 1002, size: 24, at: 0 });
  s.push({ x: 523, y: 686, size: 24, at: 0 }, { x: 456, y: 846, size: 26, at: 0 }, { x: 590, y: 846, size: 26, at: 0 });
  // The rest land in a quick flurry on "from literally every corner".
  return s.map((p, i) => (p.at ? p : { ...p, at: T.flurry - 0.1 + random(`land${i}`) * 1.25 }));
})();

// ---------------------------------------------------------------- the cast of act 1
const Sailor: React.FC<{ x: number; t: number; reachAt: number[]; facing: 1 | -1 }> = ({ x, t, reachAt, facing }) => {
  const reach = Math.max(0, ...reachAt.map((a) => shown(t, a - 0.35, a + 0.25, 0.2)));
  const arm = -20 - reach * 70;
  return (
    <g transform={`translate(${x} 1036) scale(${facing} 1)`}>
      <rect x="-9" y="-30" width="7" height="30" rx="3" fill="#1d2a4a" />
      <rect x="2" y="-30" width="7" height="30" rx="3" fill="#1d2a4a" />
      <rect x="-13" y="-72" width="26" height="46" rx="9" fill="#25365e" />
      <path d="M -13 -66 L 0 -54 L 13 -66 Z" fill="#f4f1ea" />
      <g transform={`translate(8 -64) rotate(${arm})`}>
        <rect x="0" y="-5" width="34" height="10" rx="5" fill="#25365e" />
        <circle cx="36" cy="0" r="6" fill="#f0c8a0" />
      </g>
      <circle cx="0" cy="-86" r="13" fill="#f0c8a0" />
      <path d="M -15 -92 C -14 -106, 14 -106, 15 -92 Z" fill="#fbfbf7" />
      <rect x="-17" y="-94" width="34" height="5" rx="2.5" fill="#fbfbf7" />
    </g>
  );
};

const Ship: React.FC<{ t: number }> = ({ t }) => {
  const dish = Math.cos(t * 2.2);
  return (
    <g>
      {/* mast and radar */}
      <rect x="531" y="700" width="8" height="150" fill={HULL_DARK} />
      <rect x="500" y="742" width="70" height="6" rx="3" fill={HULL_DARK} />
      <ellipse cx="535" cy="698" rx={36 * Math.max(0.2, Math.abs(dish))} ry="14" fill={HULL_LIGHT} />
      {/* bridge and superstructure */}
      <rect x="440" y="840" width="190" height="64" rx="6" fill={HULL_LIGHT} />
      <rect x="452" y="856" width="166" height="18" rx="4" fill="#28303c" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={458 + i * 27} y="859" width="20" height="12" rx="2" fill="#ffd9a0" opacity={0.25 + 0.2 * Math.sin(t * 1.3 + i)} />
      ))}
      <rect x="400" y="900" width="262" height="138" rx="6" fill={HULL} />
      {/* funnel */}
      <path d="M 680 1036 L 690 880 L 748 880 L 756 1036 Z" fill={HULL_DARK} />
      <rect x="686" y="872" width="66" height="12" rx="4" fill="#2b313b" />
      {/* turrets */}
      <rect x="866" y="996" width="112" height="11" rx="5" fill={HULL_DARK} />
      <path d="M 786 1030 C 792 984, 874 984, 882 1030 Z" fill={HULL} />
      <rect x="104" y="996" width="112" height="11" rx="5" fill={HULL_DARK} />
      <path d="M 196 1030 C 202 984, 284 984, 292 1030 Z" fill={HULL} />
      {/* hull */}
      <path d="M 110 1040 L 990 1020 L 905 1210 L 150 1210 Z" fill={HULL} />
      <path d="M 110 1040 L 990 1020 L 984 1034 L 114 1052 Z" fill={HULL_LIGHT} />
      <text x="905" y="1100" fontFamily={SITE_FONT} fontWeight={600} fontSize="34" fill="#f4f1ea" opacity="0.85">
        27
      </text>
    </g>
  );
};

const Drone: React.FC<{ x: number; y: number; s: number; t: number; i: number }> = ({ x, y, s, t, i }) => {
  const blink = Math.sin(t * 9 + i) > 0.2 ? 1 : 0.25;
  const spin = 0.6 + 0.4 * Math.abs(Math.sin(t * 40 + i));
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${Math.sin(t * 1.7 + i) * 4})`}>
      <rect x="-64" y="-20" width="128" height="7" rx="3.5" fill="#15171d" />
      <rect x="-62" y="-30" width="6" height="14" fill="#15171d" />
      <rect x="56" y="-30" width="6" height="14" fill="#15171d" />
      <ellipse cx="-59" cy="-31" rx={38 * spin} ry="4" fill="#c9ced6" opacity="0.55" />
      <ellipse cx="59" cy="-31" rx={38 * spin} ry="4" fill="#c9ced6" opacity="0.55" />
      <rect x="-30" y="-20" width="60" height="26" rx="11" fill="#1b1e25" />
      <circle cx="16" cy="10" r="8" fill="#2b2f38" />
      <circle cx="18" cy="8" r="3" fill="#8fa3c0" />
      <circle cx="-14" cy="2" r="4.5" fill="#ff3b3b" opacity={blink} />
      <circle cx="-14" cy="2" r="12" fill="#ff3b3b" opacity={blink * 0.25} />
      <path d="M -22 6 L -30 20 M 22 6 L 30 20" stroke="#15171d" strokeWidth="4" strokeLinecap="round" />
    </g>
  );
};

const Bracket: React.FC<{ cx: number; cy: number; size: number; w: number; color: string; opacity?: number }> = ({ cx, cy, size, w, color, opacity = 1 }) => {
  const h = size / 2;
  const l = size * 0.3;
  const d = [
    `M ${cx - h} ${cy - h + l} V ${cy - h} H ${cx - h + l}`,
    `M ${cx + h - l} ${cy - h} H ${cx + h} V ${cy - h + l}`,
    `M ${cx + h} ${cy + h - l} V ${cy + h} H ${cx + h - l}`,
    `M ${cx - h + l} ${cy + h} H ${cx - h} V ${cy + h - l}`,
  ].join(" ");
  return <path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="square" opacity={opacity} />;
};

// ---------------------------------------------------------------- act 1, the sea
// Shots, as in the reference: the codes going on and the pull back; a flashback (a plain ship, one drone, the
// bomb, the blast); back to the coded ship with the drone's scan beam; then the drone's own camera on the codes.
const Sea: React.FC<{ t: number }> = ({ t }) => {
  const flashback = t >= S.drones && t < S.scan;
  const zoom = kf(t, [
    [0, 1.75],
    [T.flurry - 0.1, 1.95],
    [T.flurry + 1.1, 1.0],
  ]);
  const fx = kf(t, [
    [0, 505],
    [T.flurry - 0.1, 505],
    [T.flurry + 1.1, 545],
  ]);
  const fy = kf(t, [
    [0, 965],
    [T.flurry - 0.1, 965],
    [T.flurry + 1.1, 960],
  ]);
  const shakeK = t > T.blast && t < S.scan ? Math.max(0, 1 - (t - T.blast) / 0.9) : 0;
  const shake = Math.sin(t * 70) * 22 * shakeK;
  const bob = Math.sin(t * 1.2) * 6;
  const roll = Math.sin(t * 0.9) * 0.7;

  // The one drone: flies in close and hovers (flashback), then hovers over the coded ship and scans it.
  const inK = ramp(t, S.drones + 0.1, S.drones + 1.5);
  const dx = flashback ? kf(t, [[S.drones + 0.1, 1260], [S.drones + 1.5, 700], [T.bomb - 0.4, 560]]) : 600 + Math.sin(t * 0.9) * 30;
  const dy = (flashback ? kf(t, [[S.drones + 0.1, 330], [S.drones + 1.5, 600], [T.bomb - 0.4, 620]]) : 590) + Math.sin(t * 2.3) * 10;
  const ds = flashback ? 1.8 + 1.0 * inK : 2.8;
  const sweep = Math.sin((t - S.scan) * 1.7);
  const beamX = 545 + sweep * 330;
  const beam = ramp(t, S.scan + 0.5, S.scan + 0.8);

  const blastAge = t - T.blast;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c2448" />
          <stop offset="0.55" stopColor="#6d4a7c" />
          <stop offset="1" stopColor="#f39a6b" />
        </linearGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#365a85" />
          <stop offset="1" stopColor="#0f2038" />
        </linearGradient>
        <radialGradient id="sun">
          <stop offset="0" stopColor="#ffe2a8" />
          <stop offset="1" stopColor="#ffb36b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GREEN} stopOpacity="0.55" />
          <stop offset="1" stopColor={GREEN} stopOpacity="0.15" />
        </linearGradient>
      </defs>

      <g transform={`translate(${shake} ${shake * 0.5})`}>
        <g transform={`translate(${W / 2} ${H / 2}) scale(${zoom}) translate(${-fx} ${-fy})`}>
          {/* sky, sun, clouds */}
          <rect x="-2000" y="-2000" width="5080" height="2900" fill="url(#sky)" />
          <circle cx="250" cy="900" r="260" fill="url(#sun)" opacity="0.8" />
          <circle cx="250" cy="900" r="96" fill="#ffd28a" />
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={i} cx={((120 + i * 290 + t * (6 + i * 2)) % 1300) - 110} cy={360 + i * 110} rx={150 - i * 15} ry={16} fill="#f6b3a0" opacity={0.25 + i * 0.05} />
          ))}
          {/* the sea */}
          <rect x="-2000" y="900" width="5080" height="2200" fill="url(#sea)" />
          {Array.from({ length: 26 }, (_, i) => {
            const y = 920 + (i % 13) * 70 + (i > 12 ? 35 : 0);
            const x = ((random(`wx${i}`) * 1400 + t * (14 + (y - 900) * 0.03)) % 1400) - 160;
            return <rect key={i} x={x} y={y} width={60 + (y - 900) * 0.12} height={4 + (y - 900) * 0.006} rx="3" fill="#bcd3ee" opacity={0.18} />;
          })}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={`r${i}`} x={250 - 70 + Math.sin(t * 2 + i) * 14 - i * 6} y={918 + i * 30} width={140 + i * 12} height="5" rx="2.5" fill="#ffcf8a" opacity={0.5 - i * 0.07} />
          ))}

          {/* the warship: plain in the flashback, covered in codes otherwise */}
          <g transform={`translate(0 ${bob}) rotate(${roll} 545 1100)`}>
            <Ship t={t} />
            {flashback
              ? null
              : SPOTS.map((p, i) => <QR key={i} x={p.x} y={p.y} size={p.size} seed={i} k={t >= S.scan ? 1 : pop(t, p.at, 0.22)} />)}
            {t < S.drones ? (
              <>
                <Sailor x={372} t={t} reachAt={[T.slap[0], T.slap[2]]} facing={1} />
                <Sailor x={640} t={t} reachAt={[T.slap[1]]} facing={-1} />
              </>
            ) : null}
          </g>
          {/* water in front of the hull */}
          <path
            d={`M -400 1172 ${Array.from({ length: 30 }, (_, i) => `Q ${-370 + i * 60} ${1162 + Math.sin(t * 2 + i) * 6} ${-340 + i * 60} 1172`).join(" ")} L 1500 1700 L -400 1700 Z`}
            fill="#24446c"
          />
          <path d="M 120 1176 L 990 1170" stroke="#d9e7f7" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" />
          {/* foreground swell */}
          {[0, 1, 2].map((r) => {
            const y = 1330 + r * 190;
            const amp = 14 + r * 8;
            const sp = 0.7 + r * 0.25;
            const d = `M -600 ${y} ` + Array.from({ length: 16 }, (_, i) => `Q ${-540 + i * 150} ${y - amp + Math.sin(t * sp * 2 + i + r) * amp} ${-480 + i * 150} ${y}`).join(" ") + ` L 1700 2400 L -600 2400 Z`;
            return <path key={r} d={d} fill={["#1d3a60", "#16304f", "#10243d"][r]} opacity={0.92} />;
          })}

          {/* the bomb, then the blast swallowing the plain ship */}
          {t >= T.bomb && t < T.blast ? (
            <g transform={`translate(560 ${kf(t, [[T.bomb, 660], [T.blast, 1000]])})`}>
              <rect x="-11" y="-26" width="22" height="44" rx="11" fill="#1b1e25" />
              <path d="M -11 -22 L -20 -36 L 20 -36 L 11 -22 Z" fill="#1b1e25" />
            </g>
          ) : null}
          {flashback && blastAge > 0 ? (
            <g>
              {/* grey smoke behind, rising */}
              {Array.from({ length: 9 }, (_, i) => {
                const a = Math.max(0, blastAge - 0.12 - i * 0.04);
                const ang = random(`sa${i}`) * Math.PI * 2;
                const dist = (60 + random(`sd${i}`) * 220) * Math.min(1, a * 2);
                const r = (80 + random(`sr${i}`) * 80) * Math.min(1, a * 2.5) * (1 + a * 0.25);
                return (
                  <circle key={`s${i}`} cx={560 + Math.cos(ang) * dist} cy={980 + Math.sin(ang) * dist * 0.5 - a * 120} r={r}
                    fill={["#3b3d46", "#4c4f59", "#5f626c"][i % 3]} opacity={0.88} />
                );
              })}
              {/* the fireball: yellow core, then orange and red, cooling as it grows */}
              {Array.from({ length: 12 }, (_, i) => {
                const a = Math.max(0, blastAge - i * 0.025);
                const ang = random(`pa${i}`) * Math.PI * 2;
                const dist = (20 + random(`pd${i}`) * 170) * Math.min(1, a * 3);
                const r = (60 + random(`pr${i}`) * 70) * Math.min(1, a * 4) * Math.max(0.35, 1 - a * 0.35);
                const hot = ["#fff07a", "#ffc531", "#ff8a1f", "#ff5a1f", "#e8322b"][i % 5];
                const col = mix(Math.min(1, a / 1.4), hot, "#c2412a");
                return <circle key={i} cx={560 + Math.cos(ang) * dist} cy={1000 + Math.sin(ang) * dist * 0.55 - a * 50} r={r} fill={col} opacity={Math.max(0, 0.95 - a * 0.3)} />;
              })}
              {blastAge < 0.4 ? <circle cx="560" cy="1000" r={50 + blastAge * 700} fill="#fffbe8" opacity={1 - blastAge / 0.4} /> : null}
            </g>
          ) : null}

          {/* the drone's scan beam over the codes */}
          {t >= S.scan && beam > 0 ? (
            <g opacity={beam}>
              <polygon points={`${dx + 18 * ds} ${dy + 10 * ds} ${beamX - 120} 1060 ${beamX + 120} 1060`} fill="url(#beam)" />
              <rect x={beamX - 120} y="1052" width="240" height="8" rx="4" fill={GREEN} opacity="0.85" />
            </g>
          ) : null}
          {t >= S.drones ? <Drone x={dx} y={dy} s={ds} t={t} i={0} /> : null}
        </g>
      </g>
    </svg>
  );
};

// The drone's own camera: a wall of tilted codes on the hull, the brackets hunt and lock, then the link opens.
const DroneCam: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const z = kf(t, [
    [S.lock, 1.0],
    [T.lockOn, 1.1],
    [S.brand, 1.2],
  ]);
  const driftX = Math.sin(t * 1.3) * 14;
  const driftY = Math.cos(t * 1.1) * 10;
  const bx = kf(t, [
    [S.lock + 0.1, 290],
    [S.lock + 0.4, 790],
    [T.lockOn, W / 2],
  ]);
  const by = kf(t, [
    [S.lock + 0.1, 640],
    [S.lock + 0.4, 1300],
    [T.lockOn, H / 2],
  ]);
  const bs = kf(t, [
    [S.lock + 0.1, 300],
    [T.lockOn, 290],
  ]);
  const locked = t >= T.lockOn;
  const cells: { x: number; y: number; tilt: number; seed: number }[] = [];
  for (let r = -1; r < 9; r++) {
    for (let c = -1; c < 5; c++) {
      const x = c * 290 + (r % 2 === 0 ? 0 : 145) + 40;
      const y = r * 280 + 20;
      if (Math.hypot(x + 105 - W / 2, y + 105 - H / 2) < 230) continue;
      cells.push({ x, y, tilt: (random(`tilt${r}-${c}`) - 0.5) * 18, seed: 100 + r * 10 + c });
    }
  }
  const linkK = pop(t, S.link, 0.3);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="camvig" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <g transform={`translate(${W / 2 + driftX} ${H / 2 + driftY}) scale(${z}) translate(${-W / 2} ${-H / 2})`}>
        <rect x="-300" y="-300" width={W + 600} height={H + 600} fill={HULL} />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="-300" y1={i * 180 - 100} x2={W + 300} y2={i * 180 - 100} stroke={HULL_DARK} strokeWidth="4" opacity="0.5" />
        ))}
        {cells.map((c, i) => (
          <QR key={i} x={c.x} y={c.y} size={210} seed={c.seed} tilt={c.tilt} />
        ))}
        <QR x={W / 2 - 125} y={H / 2 - 125} size={250} seed={7} tilt={-3} />
      </g>
      <rect x="0" y="0" width={W} height={H} fill="#0d3a1c" opacity="0.12" />
      {Array.from({ length: 160 }, (_, i) => (
        <rect key={i} x="0" y={i * 12} width={W} height="2" fill="#000" opacity="0.07" />
      ))}
      {Array.from({ length: 90 }, (_, i) => (
        <rect key={`g${i}`} x={random(`gx${frame}-${i}`) * W} y={random(`gy${frame}-${i}`) * H} width="3" height="3" fill="#ffffff" opacity={0.12} />
      ))}
      <rect x="0" y="0" width={W} height={H} fill="url(#camvig)" />
      <Bracket cx={bx} cy={by} size={bs} w={8} color={locked ? "#b7ffc8" : GREEN} opacity={locked ? 0.75 + 0.25 * Math.sin(t * 30) : 1} />
      <g fontFamily={SITE_CODE} fontSize="30" fill={GREEN} letterSpacing="3">
        <circle cx="86" cy="150" r="8" fill={GREEN} opacity={Math.sin(t * 8) > 0 ? 1 : 0.3} />
        <text x="104" y="160">DRONE CAM 07</text>
        <text x={W - 80} y="160" textAnchor="end">ALT 42M</text>
        <text x={W / 2} y={by + bs / 2 + 54} textAnchor="middle" opacity={locked ? 1 : 0}>QR DETECTED</text>
      </g>
      {/* the link opens */}
      {t >= S.link ? (
        <g transform={`translate(${W / 2} ${H / 2}) scale(${linkK})`}>
          <rect x="-366" y="-104" width="732" height="232" rx="30" fill="#000" opacity="0.25" />
          <rect x="-360" y="-110" width="720" height="220" rx="28" fill="#ffffff" />
          <circle cx="-300" cy="-46" r="9" fill={SITE.accent} />
          <text x="-280" y="-36" fontFamily={SITE_CODE} fontSize="30" letterSpacing="3" fill={SITE.soft}>OPENING LINK…</text>
          <text x="-310" y="22" fontFamily={SITE_FONT} fontWeight={600} fontSize="46" fill={SITE.ink}>auralionlabs.com</text>
          <rect x="-310" y="58" width="620" height="12" rx="6" fill="#ece9e2" />
          <rect x="-310" y="58" width={620 * ramp(t, S.link + 0.1, S.brand - 0.08)} height="12" rx="6" fill={SITE.accent} />
        </g>
      ) : null}
      <rect x="0" y="0" width={W} height={H} fill="#ffffff" opacity={ramp(t, S.brand - 0.1, S.brand)} />
    </svg>
  );
};

// ---------------------------------------------------------------- the one cartoon beat in act 2
const Roofer: React.FC<{ t: number }> = ({ t }) => {
  const a = S.onjob;
  const hammer = Math.sin((t - a) * 14) * 22;
  const ring = (t - a) % 0.9;
  const push = kf(t, [
    [a, 1.0],
    [S.audit, 1.08],
  ]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="day" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a5f9a" />
          <stop offset="1" stopColor="#f6b07c" />
        </linearGradient>
      </defs>
      <g transform={`translate(${W / 2} ${H / 2}) scale(${push}) translate(${-W / 2} ${-H / 2})`}>
        <rect x="-200" y="-200" width={W + 400} height={H + 400} fill="url(#day)" />
        <circle cx="830" cy="560" r="80" fill="#ffd28a" />
        {/* house */}
        <rect x="80" y="1020" width="700" height="760" fill="#e9dccb" />
        <path d="M 30 1040 L 430 700 L 830 1040 Z" fill="#7a3f33" />
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i} d={`M ${80 + i * 50} ${1000 - i * 42} L ${780 - i * 50} ${1000 - i * 42}`} stroke="#63322a" strokeWidth="5" opacity="0.6" />
        ))}
        <rect x="160" y="1180" width="140" height="160" rx="6" fill="#9cc3e4" />
        <rect x="520" y="1180" width="140" height="160" rx="6" fill="#9cc3e4" />
        <rect x="340" y="1420" width="130" height="360" rx="6" fill="#6b4a3a" />
        <rect x="-100" y="1780" width={W + 200} height="300" fill="#4f7a4a" />
        {/* ladder */}
        <g stroke="#c8a265" strokeWidth="14" strokeLinecap="round">
          <line x1="840" y1="1790" x2="700" y2="900" />
          <line x1="940" y1="1790" x2="800" y2="900" />
          {Array.from({ length: 9 }, (_, i) => {
            const k = (i + 0.6) / 9.5;
            return <line key={i} x1={840 - 140 * k} y1={1790 - 890 * k} x2={940 - 140 * k} y2={1790 - 890 * k} strokeWidth="9" />;
          })}
        </g>
        {/* the roofer, up the ladder, both hands busy */}
        <g transform="translate(770 1060)">
          <rect x="-8" y="40" width="16" height="70" rx="7" fill="#2f3d5c" />
          <rect x="14" y="40" width="16" height="70" rx="7" fill="#2f3d5c" />
          <rect x="-22" y="-60" width="58" height="108" rx="18" fill="#e46b3b" />
          <rect x="20" y="10" width="22" height="34" rx="5" fill="#14161c" />
          <rect x="23" y="13" width="16" height="26" rx="3" fill="#ffe7b0" opacity={0.5 + 0.5 * Math.abs(Math.sin((t - a) * 10))} />
          {[0, 1].map((i) => {
            const r = 30 + ((ring + i * 0.45) % 0.9) * 90;
            return <circle key={i} cx="31" cy="27" r={r} fill="none" stroke="#fff4dc" strokeWidth="4" opacity={Math.max(0, 0.8 - r / 120)} />;
          })}
          <g transform={`translate(-14 -40) rotate(${-150 + hammer})`}>
            <rect x="0" y="-8" width="62" height="16" rx="8" fill="#e46b3b" />
            <rect x="58" y="-4" width="40" height="8" fill="#5a3b28" />
            <rect x="90" y="-16" width="16" height="32" rx="3" fill="#8b919b" />
          </g>
          <g transform="translate(30 -30) rotate(-120)">
            <rect x="0" y="-8" width="56" height="16" rx="8" fill="#e46b3b" />
            <rect x="46" y="-18" width="50" height="36" rx="4" fill="#5b2f28" />
          </g>
          <circle cx="6" cy="-86" r="26" fill="#f0c8a0" />
          <path d="M -22 -92 C -20 -124, 34 -124, 34 -92 Z" fill="#f3c33d" />
          <rect x="-28" y="-96" width="66" height="9" rx="4" fill="#f3c33d" />
        </g>
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------- act 2, the site look
const Stage: React.FC = () => (
  <AbsoluteFill style={{ background: SITE.stage }}>
    <AbsoluteFill
      style={{
        backgroundImage: "radial-gradient(rgba(22,23,34,0.13) 2px, transparent 2.6px)",
        backgroundSize: "30px 30px",
        maskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, #000 35%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, #000 35%, transparent 100%)",
      }}
    />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 35% at 50% 42%, rgba(232,128,58,0.10), transparent 70%)" }} />
  </AbsoluteFill>
);

/** Rises into place at `a`, leaves at `b`. */
const Rise: React.FC<{ t: number; a: number; b?: number; dy?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ t, a, b = 1e9, dy = 60, style, children }) => {
  if (t < a || t > b) return null;
  const k = interpolate(t, [a, a + 0.45], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const out = 1 - ramp(t, b - 0.18, b);
  return <div style={{ transform: `translateY(${(1 - k) * dy}px) scale(${0.96 + 0.04 * k})`, opacity: Math.min(1, k * 1.6) * out, ...style }}>{children}</div>;
};

const Eyebrow: React.FC<{ text: string; color?: string }> = ({ text, color = SITE.soft }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: SITE_CODE, fontWeight: 500, fontSize: 34, letterSpacing: "0.1em", textTransform: "uppercase", color }}>
    <span style={{ width: 16, height: 16, borderRadius: 8, background: SITE.accent }} />
    {text}
  </div>
);

const Pill: React.FC<{ text: string; k: number; dark?: boolean; size?: number }> = ({ text, k, dark, size = 46 }) => (
  <div
    style={{
      ...sheet(999),
      background: dark ? SITE.ink : "#ffffff",
      color: dark ? "#ffffff" : SITE.ink,
      padding: `${size * 0.32}px ${size * 0.8}px`,
      display: "flex",
      alignItems: "center",
      gap: size * 0.32,
      fontFamily: SITE_FONT,
      fontWeight: 500,
      fontSize: size,
      transform: `scale(${k})`,
      opacity: Math.min(1, k * 2),
    }}
  >
    <span style={{ width: size * 0.42, height: size * 0.42, borderRadius: 99, background: SITE.accent, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size * 0.28} height={size * 0.28} viewBox="0 0 10 10">
        <path d="M 1.5 5.2 L 4 7.5 L 8.5 2.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
    {text}
  </div>
);

const Mark: React.FC<{ size: number }> = ({ size }) => <Img src={staticFile(`${SLUG}/brand/mark.svg`)} style={{ width: size, height: size * (659 / 667) }} />;

const Header: React.FC<{ t: number }> = ({ t }) => {
  const o = ramp(t, S.studio, S.studio + 0.3);
  return (
    <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 16, opacity: o }}>
      <Mark size={56} />
      <div style={{ fontFamily: SITE_FONT, fontWeight: 600, fontSize: 44, letterSpacing: "-0.03em", color: SITE.ink }}>Auralion Labs</div>
    </div>
  );
};

const Wave: React.FC<{ t: number; bars?: number; color?: string }> = ({ t, bars = 26, color = SITE.accent }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 7, height: 90 }}>
    {Array.from({ length: bars }, (_, i) => {
      const v = 0.2 + 0.8 * Math.abs(Math.sin(t * 7 + i * 0.7) * Math.sin(t * 3.1 + i * 1.9));
      return <span key={i} style={{ width: 9, height: 12 + v * 76, borderRadius: 6, background: color, opacity: 0.85 }} />;
    })}
  </div>
);

const Site: React.FC<{ t: number }> = ({ t }) => {
  const flash = 1 - ramp(t, S.brand, S.brand + 0.45);
  const center: React.CSSProperties = { position: "absolute", left: 0, right: 0, top: 0, bottom: 520, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34 };
  const brandPop = pop(t, S.brand + 0.02, 0.5);
  const ringAge = t - S.brand;
  return (
    <AbsoluteFill>
      <Stage />
      {t < S.end ? <Header t={t} /> : null}

      {/* brand: the code lands on Auralion Labs */}
      {t < S.studio ? (
        <div style={center}>
          {ringAge > 0 && ringAge < 1.2
            ? [0, 0.2].map((d) => {
                const a = Math.max(0, ringAge - d);
                return (
                  <div key={d} style={{ position: "absolute", width: 260 + a * 900, height: 260 + a * 900, borderRadius: 9999, border: `6px solid ${SITE.accent}`, opacity: Math.max(0, 0.6 - a * 0.6) }} />
                );
              })
            : null}
          <Rise t={t} a={S.brand + 0.05} b={S.studio} dy={-40}>
            <div style={{ ...sheet(999), padding: "18px 40px", display: "flex", alignItems: "center", gap: 16, fontFamily: SITE_CODE, fontSize: 40, color: SITE.ink }}>
              <svg width="30" height="30" viewBox="0 0 24 24">
                <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke={SITE.grey} strokeWidth="2.4" fill="none" />
                <rect x="5" y="11" width="14" height="10" rx="2.5" fill={SITE.grey} />
              </svg>
              auralionlabs.com
            </div>
          </Rise>
          <div style={{ ...sheet(64), padding: 54, transform: `scale(${brandPop})` }}>
            <Mark size={250} />
          </div>
          <Rise t={t} a={T.name - 0.05} b={S.studio}>
            <div style={{ fontFamily: SITE_FONT, fontWeight: 600, fontSize: 124, letterSpacing: "-0.04em", color: SITE.ink }}>Auralion Labs</div>
          </Rise>
        </div>
      ) : null}

      {/* studio: who it is for */}
      {t >= S.studio && t < S.ava ? (
        <div style={{ ...center, gap: 30 }}>
          <Rise t={t} a={S.studio + 0.05} b={S.ava}>
            <Eyebrow text="The studio building" />
          </Rise>
          <Rise t={t} a={T.ai - 0.05} b={S.ava}>
            <div style={{ fontFamily: SITE_FONT, fontWeight: 500, fontSize: 112, lineHeight: 1.02, letterSpacing: "-0.04em", color: SITE.ink, textAlign: "center" }}>
              AI receptionists
              <div style={{ color: SITE.grey, fontSize: 64, marginTop: 14 }}>for local service businesses</div>
            </div>
          </Rise>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20, maxWidth: 900, marginTop: 20 }}>
            {["Roofers", "Plumbers", "Electricians", "HVAC"].map((s, i) => (
              <Pill key={s} text={s} k={pop(t, T.local + i * 0.24) * (1 - ramp(t, S.ava - 0.18, S.ava))} size={42} />
            ))}
          </div>
        </div>
      ) : null}

      {/* ava: the call is picked up */}
      {t >= S.ava && t < S.books ? (
        <div style={{ ...center, gap: 28 }}>
          <Rise t={t} a={S.ava + 0.02} b={S.books}>
            <div style={{ ...sheet(48), width: 840, padding: "40px 48px", display: "flex", flexDirection: "column", gap: 26 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
                <div style={{ width: 104, height: 104, borderRadius: 99, background: t < T.picks ? "#f1efe9" : SITE.ink, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: t < T.picks ? `0 0 0 ${8 + 10 * Math.abs(Math.sin(t * 6))}px rgba(232,128,58,0.18)` : "none" }}>
                  <svg width="52" height="52" viewBox="0 0 24 24">
                    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" fill={t < T.picks ? SITE.ink : "#ffffff"} />
                  </svg>
                </div>
                <div style={{ fontFamily: SITE_FONT }}>
                  <div style={{ fontWeight: 500, fontSize: 50, letterSpacing: "-0.03em", color: SITE.ink }}>{t < T.picks ? "Incoming call" : "Answered by Ava"}</div>
                  <div style={{ fontFamily: SITE_CODE, fontSize: 30, color: SITE.soft, marginTop: 6 }}>
                    {t < T.picks ? "(813) 555-0142" : `00:0${Math.min(9, Math.floor(t - T.picks))} · ON THE LINE`}
                  </div>
                </div>
              </div>
              {t >= T.picks ? <Wave t={t} /> : <div style={{ height: 90, display: "flex", alignItems: "center", fontFamily: SITE_CODE, fontSize: 30, color: SITE.soft, letterSpacing: "0.1em" }}>RINGING…</div>}
            </div>
          </Rise>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 840 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ transform: `scale(${pop(t, T.call + i * 0.32)})`, opacity: Math.min(1, pop(t, T.call + i * 0.32) * 2) }}>
                <div style={{ ...sheet(28), padding: "18px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: SITE_FONT, fontSize: 36, color: SITE.ink }}>
                  <span>{["New lead", "After hours", "Repeat customer"][i]}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, color: SITE.grey, fontSize: 30 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 6, background: SITE.accent }} />
                    Answered
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* books: the job lands in the calendar */}
      {t >= S.books && t < S.message ? (
        <div style={center}>
          <Rise t={t} a={S.books + 0.02} b={S.message}>
            <div style={{ ...sheet(44), width: 880, padding: "36px 40px 40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div style={{ fontFamily: SITE_FONT, fontWeight: 500, fontSize: 44, letterSpacing: "-0.03em", color: SITE.ink }}>This week</div>
                <Eyebrow text="Calendar" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, c) => (
                  <div key={d} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontFamily: SITE_CODE, fontSize: 26, color: SITE.soft, textAlign: "center" }}>{d}</div>
                    {[0, 1, 2, 3].map((r) => {
                      const busy = random(`cal${c}-${r}`) > 0.62;
                      const isNew = c === 3 && r === 1;
                      const k = isNew ? pop(t, T.job) : 0;
                      return (
                        <div
                          key={r}
                          style={{
                            height: 92,
                            borderRadius: 14,
                            background: isNew ? mix(k, "#f1efe9", SITE.accent) : busy ? "#e4e2dc" : "#f6f5f1",
                            transform: isNew ? `scale(${0.9 + 0.1 * k})` : undefined,
                            color: "#fff",
                            fontFamily: SITE_FONT,
                            fontWeight: 600,
                            fontSize: 22,
                            lineHeight: 1.1,
                            padding: 10,
                            boxShadow: isNew && k > 0.5 ? "0 18px 30px -14px rgba(232,128,58,0.8)" : undefined,
                          }}
                        >
                          {isNew && k > 0.6 ? (
                            <>
                              Roof inspection
                              <div style={{ fontWeight: 500, opacity: 0.9 }}>10:30</div>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Rise>
          <Pill text="Job booked" k={pop(t, T.calendar)} />
        </div>
      ) : null}

      {/* message: taken and sent on */}
      {t >= S.message && t < S.onjob ? (
        <div style={center}>
          {(() => {
            const fly = ramp(t, T.sends, T.sends + 0.5);
            return (
              <Rise t={t} a={T.takes - 0.1} b={S.onjob}>
                <div style={{ ...sheet(44), width: 860, padding: "38px 46px", transform: `translateY(${-fly * 380}px) scale(${1 - fly * 0.35})`, opacity: 1 - fly }}>
                  <Eyebrow text="New message · taken by Ava" />
                  <div style={{ fontFamily: SITE_FONT, fontWeight: 500, fontSize: 54, lineHeight: 1.12, letterSpacing: "-0.03em", color: SITE.ink, marginTop: 22 }}>
                    Leak over the kitchen.
                    <span style={{ color: SITE.grey }}> Please call back after 3.</span>
                  </div>
                  <div style={{ fontFamily: SITE_CODE, fontSize: 28, color: SITE.soft, marginTop: 18 }}>MARIA · OAK ST</div>
                </div>
              </Rise>
            );
          })()}
          {/* the notification on the owner's phone */}
          <div
            style={{
              position: "absolute",
              top: 280,
              transform: `translateY(${(1 - pop(t, T.sends + 0.3, 0.4)) * -160}px)`,
              opacity: ramp(t, T.sends + 0.3, T.sends + 0.5),
            }}
          >
            <div style={{ ...sheet(36), background: SITE.ink, color: "#fff", width: 820, padding: "26px 32px", display: "flex", gap: 22, alignItems: "center", fontFamily: SITE_FONT }}>
              <div style={{ width: 70, height: 70, borderRadius: 18, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Mark size={46} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 36 }}>Ava · now</div>
                <div style={{ fontSize: 32, opacity: 0.8 }}>New message from Maria: leak over the…</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* audit: the offer */}
      {t >= S.audit && t < S.end ? (
        <div style={{ ...center, gap: 44 }}>
          <Rise t={t} a={S.audit + 0.02} b={S.end}>
            <div style={{ ...sheet(56), width: 900, padding: "60px 60px 64px", display: "flex", flexDirection: "column", alignItems: "center", gap: 26, textAlign: "center" }}>
              <div style={{ opacity: ramp(t, T.free - 0.1, T.free + 0.1), transform: `scale(${0.8 + 0.2 * pop(t, T.free - 0.1)})` }}>
                <Eyebrow text="Free" color={SITE.accent} />
              </div>
              <div style={{ fontFamily: SITE_FONT, fontWeight: 600, fontSize: 112, lineHeight: 1.0, letterSpacing: "-0.045em", color: SITE.ink }}>
                Missed-call
                <br />
                audit
              </div>
              <div style={{ fontFamily: SITE_FONT, fontWeight: 500, fontSize: 44, color: SITE.grey, opacity: ramp(t, T.missed + 0.4, T.missed + 0.7) }}>
                How many calls are you missing?
              </div>
            </div>
          </Rise>
          <div style={{ transform: `scale(${pop(t, T.stop, 0.35)})` }}>
            <div style={{ background: SITE.ink, borderRadius: 999, padding: "26px 62px", display: "flex", alignItems: "center", gap: 20, fontFamily: SITE_FONT, fontWeight: 600, fontSize: 56, color: "#ffffff", boxShadow: "0 24px 50px -18px rgba(22,23,34,0.7)" }}>
              <span style={{ width: 18, height: 18, borderRadius: 9, background: SITE.accent }} />
              DM “AUDIT” →
            </div>
          </div>
        </div>
      ) : null}

      {/* end: the name */}
      {t >= S.end ? (
        <div style={{ ...center, gap: 30 }}>
          <div style={{ transform: `scale(${pop(t, S.end + 0.02, 0.45)})` }}>
            <Mark size={210} />
          </div>
          <Rise t={t} a={T.endName - 0.08}>
            <div style={{ fontFamily: SITE_FONT, fontWeight: 600, fontSize: 132, letterSpacing: "-0.045em", color: SITE.ink, textAlign: "center" }}>Auralion Labs</div>
          </Rise>
          <Rise t={t} a={T.endName + 0.3}>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <div style={{ fontFamily: SITE_CODE, fontSize: 38, color: SITE.grey }}>auralionlabs.com</div>
              <div style={{ background: SITE.ink, color: "#fff", borderRadius: 999, padding: "12px 30px", fontFamily: SITE_FONT, fontWeight: 600, fontSize: 34 }}>DM “AUDIT”</div>
            </div>
          </Rise>
        </div>
      ) : null}

      <AbsoluteFill style={{ background: "#ffffff", opacity: flash, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- captions, the reference's way: two words, black box
const BRAND_WORDS = new Set(["auralion", "labs", "ava", "audit", "free"]);
const CAP_WORDS: Word[] = words.reduce<Word[]>((out, w) => {
  if (w.w.startsWith("-") && out.length) out[out.length - 1] = { ...out[out.length - 1], w: out[out.length - 1].w + w.w, end: w.end };
  else out.push({ ...w });
  return out;
}, []);
const PHRASES = [
  "Modern sailors", "once stuck", "countless QR codes", "on their warships,", "from literally", "every corner.",
  "They did this", "because", "enemy drones", "were blasting", "their ships", "more often.",
  "But now,", "as these drones", "scan the ship,", "they scan", "the QR code,", "which takes them", "straight to",
  "Auralion Labs,", "the studio", "building", "AI receptionists", "for local", "service businesses.",
  "Our receptionist,", "Ava,", "picks up", "every call", "your business gets,", "books the job", "into your calendar,",
  "or takes a message", "and sends it", "to you,", "even while", "you're on a job.",
  "Get your", "free missed-call audit.", "Stop missing calls,", "only at", "Auralion Labs.",
];
const CAP_GROUPS: Word[][] = (() => {
  const sizes = PHRASES.map((ph) => ph.split(" ").length);
  if (sizes.reduce((a, b) => a + b, 0) !== CAP_WORDS.length) return chunk(CAP_WORDS, 2, true);
  let k = 0;
  return sizes.map((n) => CAP_WORDS.slice(k, (k += n)));
})();
const Caps: React.FC<{ t: number }> = ({ t }) => {
  const group = CAP_GROUPS.find((g) => t >= g[0].start - 0.05 && t <= g[g.length - 1].end + 0.2);
  if (!group) return null;
  const site = t >= S.brand && !(t >= S.onjob && t < S.audit);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: site ? 300 : 360, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "#0d0e12", borderRadius: 14, padding: "10px 24px 12px", display: "flex", gap: 18, fontFamily: SITE_FONT, fontWeight: 700, fontSize: 60, letterSpacing: "0.01em", textTransform: "uppercase", lineHeight: 1.1 }}>
        {group.map((w, i) => {
          const clean = w.w.toLowerCase().replace(/[^a-z-]/g, "");
          return (
            <span key={i} style={{ color: BRAND_WORDS.has(clean) ? SITE.accent : "#ffffff" }}>
              {w.w.replace(/[.,]$/, "")}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- sound effects
type Fx = { src: string; at: number; vol: number; len?: number; fadeIn?: number; fadeOut?: number; skip?: number };
// Kept under the voice (Vishnu, 2026-10-25: the narrator was lost under the drone, scan and impact sounds).
// Only the impact's hit, on the cut, is loud; its riser fades in from silence.
const FX: Fx[] = [
  { src: "sfx/sea.mp3", at: 0, vol: 0.2, len: S.lock, fadeOut: 0.6 },
  ...T.slap.map((a) => ({ src: "sfx/slap.mp3", at: a - 0.03, vol: 0.45 })),
  { src: "sfx/flurry.mp3", at: T.flurry, vol: 0.35 },
  { src: "sfx/drones.mp3", at: S.drones + 0.1, vol: 0.16, len: S.lock - S.drones - 0.1, fadeIn: 0.8, fadeOut: 0.4 },
  { src: "sfx/boom.mp3", at: T.blast, vol: 0.4 },
  { src: "sfx/hud.mp3", at: S.scan + 0.5, vol: 0.14 },
  { src: "sfx/lock.mp3", at: T.lockOn - 0.6, vol: 0.22 },
  { src: "sfx/scan.mp3", at: T.lockOn + 0.05, vol: 0.2 },
  { src: "_sfx/pop.wav", at: S.link, vol: 0.2 },
  { src: "sfx/impact.mp3", at: S.brand - 0.08, vol: 0.55, skip: 2.11 - 0.08 },
  ...[0, 1, 2, 3].map((i) => ({ src: "_sfx/pop.wav", at: T.local + i * 0.24, vol: 0.35 })),
  { src: "sfx/ring.mp3", at: S.ava + 0.05, vol: 0.45, len: T.picks - S.ava - 0.05, fadeOut: 0.1 },
  { src: "sfx/pickup.mp3", at: T.picks, vol: 0.7 },
  ...[0, 1, 2].map((i) => ({ src: "_sfx/pop.wav", at: T.call + i * 0.32, vol: 0.3 })),
  { src: "_sfx/ding.wav", at: T.job, vol: 0.4 },
  { src: "_sfx/whoosh.wav", at: T.takes - 0.1, vol: 0.35 },
  { src: "_sfx/pop.wav", at: T.sends + 0.3, vol: 0.4 },
  { src: "sfx/ring.mp3", at: S.onjob, vol: 0.25, len: 1.6, fadeOut: 0.3 },
  { src: "_sfx/whoosh.wav", at: S.audit, vol: 0.35 },
  { src: "_sfx/pop.wav", at: T.stop, vol: 0.45 },
  { src: "sfx/chime.mp3", at: T.endName, vol: 0.5 },
];

const SoundFx: React.FC = () => (
  <>
    {FX.map((f, i) => {
      const from = Math.max(0, Math.round(f.at * FPS));
      const dur = f.len ? Math.max(1, Math.round(f.len * FPS)) : undefined;
      const src = f.src.startsWith("_sfx/") ? staticFile(f.src) : staticFile(`${SLUG}/${f.src}`);
      const fi = (f.fadeIn ?? 0) * FPS;
      const fo = (f.fadeOut ?? 0) * FPS;
      return (
        <Sequence key={i} from={from} durationInFrames={dur} name={`sfx ${f.src}`}>
          <Audio
            src={src}
            trimBefore={f.skip ? Math.round(f.skip * FPS) : undefined}
            volume={(fr: number) => {
              let v = f.vol;
              if (fi > 0) v *= Math.min(1, fr / fi);
              if (fo > 0 && dur) v *= Math.min(1, Math.max(0, (dur - fr) / fo));
              return v;
            }}
          />
        </Sequence>
      );
    })}
  </>
);

// ---------------------------------------------------------------- the video
export const QrWarships: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const act1 = t < S.brand;
  const roofer = t >= S.onjob && t < S.audit;
  return (
    <AbsoluteFill style={{ background: "#0f2038" }}>
      <Audio src={staticFile(`${SLUG}/voice/voice.mp3`)} />
      <SoundFx />
      {t < S.lock ? <Sea t={t} /> : act1 ? <DroneCam t={t} frame={frame} /> : roofer ? <Roofer t={t} /> : <Site t={t} />}
      {roofer ? (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 640 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start", marginLeft: 120 }}>
            <Pill text="Answered by Ava" k={pop(t, S.onjob + 0.45)} />
            <Pill text="Job booked" k={pop(t, S.onjob + 1.0)} />
          </div>
        </AbsoluteFill>
      ) : null}
      <Caps t={t} />
    </AbsoluteFill>
  );
};
