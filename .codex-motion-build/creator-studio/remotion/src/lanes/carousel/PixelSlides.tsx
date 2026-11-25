import React from "react";
import { loadFont } from "@remotion/google-fonts/PressStart2P";
import { C } from "../../kit/theme";
import type { Slide } from "./Carousel";

// The pixel carousel (2026-11-06): 16-bit pixel art on black, Ava drawn one rect per pixel, the same way PixelVishnu
// is. Used when a slide's kind is "pixel" (videos/agent-25-steps/slides.md). Seven scenes, one per slide, picked by the
// slide's position. Every number on a slide is an illustration and is labelled EXAMPLE where it reads as data.

const PX = loadFont("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

const BG = "#0d0e12";
const WHITE = "#f4f5f8";
const SHADE = "#c3c9d4";
const OUT = "#2b2f3c";
const GOLD = C.gold;
const GREEN = C.done;
const GRAY = "#8b93a1";
const PANEL = "#151720";

// ---------- pixel primitives ----------

type Cells = Set<string>;
const key = (x: number, y: number) => `${x},${y}`;
const parse = (c: string): [number, number] => {
  const [x, y] = c.split(",").map(Number);
  return [x as number, y as number];
};

const fromSpans = (rows: [number, number, number][], dx = 0, dy = 0): Cells => {
  const s: Cells = new Set();
  for (const [y, a, b] of rows) for (let x = a; x <= b; x++) s.add(key(x + dx, y + dy));
  return s;
};

const addLine = (s: Cells, x0: number, y0: number, x1: number, y1: number, r = 1) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const cx = Math.round(x0 + ((x1 - x0) * i) / n);
    const cy = Math.round(y0 + ((y1 - y0) * i) / n);
    for (let ox = -r; ox <= r; ox++) for (let oy = -r; oy <= r; oy++) s.add(key(cx + ox, cy + oy));
  }
};

const grow = (s: Cells): Cells => {
  const o: Cells = new Set(s);
  s.forEach((c) => {
    const [x, y] = parse(c);
    o.add(key(x + 1, y));
    o.add(key(x - 1, y));
    o.add(key(x, y + 1));
    o.add(key(x, y - 1));
  });
  return o;
};

const runs = (cells: Cells) => {
  const byY = new Map<number, number[]>();
  cells.forEach((c) => {
    const [x, y] = parse(c);
    const row = byY.get(y);
    if (row) row.push(x);
    else byY.set(y, [x]);
  });
  const out: { x: number; y: number; w: number }[] = [];
  byY.forEach((xs, y) => {
    xs.sort((a, b) => a - b);
    let start = xs[0] as number;
    let prev = start;
    for (let i = 1; i <= xs.length; i++) {
      const x = xs[i] as number;
      if (i === xs.length || x !== prev + 1) {
        out.push({ x: start, y, w: prev - start + 1 });
        start = x;
      }
      prev = x;
    }
  });
  return out;
};

const Layer: React.FC<{ cells: Cells; fill: string }> = ({ cells, fill }) => (
  <>
    {runs(cells).map((r, i) => (
      <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={fill} />
    ))}
  </>
);

/** One part with its dark outline behind it, like a sticker. */
const Part: React.FC<{ cells: Cells; fill: string }> = ({ cells, fill }) => (
  <>
    <Layer cells={grow(cells)} fill={OUT} />
    <Layer cells={cells} fill={fill} />
  </>
);

/** A small bitmap, "X" is the colour, "W" is white, "." is empty. */
const Sprite: React.FC<{ rows: string[]; u: number; color?: string }> = ({ rows, u, color = GOLD }) => {
  const cells = (ch: string) => {
    const s: Cells = new Set();
    rows.forEach((r, y) => r.split("").forEach((c, x) => c === ch && s.add(key(x, y))));
    return s;
  };
  return (
    <svg width={(rows[0]?.length ?? 1) * u} height={rows.length * u} viewBox={`0 0 ${rows[0]?.length ?? 1} ${rows.length}`} shapeRendering="crispEdges" style={{ display: "block" }}>
      <Layer cells={cells("X")} fill={color} />
      <Layer cells={cells("W")} fill={WHITE} />
    </svg>
  );
};

// ---------- Ava, in pixels ----------

type Eyes = "happy" | "open" | "sad" | "up" | "think" | "wink";
type Hand = [number, number];
type Prop = "sign" | "check" | "drops" | "wave";
type AvaPose = { eyes: Eyes; dy: number; l: Hand; r: Hand; prop?: Prop };

const W = 48;
const H = 38;
const OX = 4;

const EYE_BITS: Record<Eyes, [string[], string[]]> = {
  happy: [["..X..", ".X.X.", "X...X", "....."], ["..X..", ".X.X.", "X...X", "....."]],
  open: [[".XXX.", "XXXXX", "XXXXX", ".XXX."], [".XXX.", "XXXXX", "XXXXX", ".XXX."]],
  sad: [["XX...", ".XXX.", "...XX", "....."], ["...XX", ".XXX.", "XX...", "....."]],
  up: [["..X..", ".XXX.", ".XXX.", "....."], ["..X..", ".XXX.", ".XXX.", "....."]],
  think: [[".XXX.", "XXXXX", "XXXXX", ".XXX."], [".....", ".....", "XXXXX", "....."]],
  wink: [[".XXX.", "XXXXX", "XXXXX", ".XXX."], ["..X..", ".X.X.", "X...X", "....."]],
};

const CHECK_BITS = [".....XX", "....XX.", "XX.XX..", ".XXX...", "..X...."];

const bitCells = (rows: string[], dx: number, dy: number): Cells => {
  const s: Cells = new Set();
  rows.forEach((r, y) => r.split("").forEach((c, x) => c === "X" && s.add(key(x + dx, y + dy))));
  return s;
};

const Ava: React.FC<{ pose: AvaPose; u: number }> = ({ pose, u }) => {
  const dy = pose.dy;
  const body = fromSpans(
    [[14, 11, 28], [15, 9, 30], [16, 9, 30], [17, 8, 31], [18, 8, 31], [19, 8, 31], [20, 8, 31], [21, 8, 31], [22, 8, 31], [23, 8, 31], [24, 8, 31], [25, 9, 30], [26, 9, 30], [27, 9, 30], [28, 11, 28], [29, 11, 28], [30, 14, 25]],
    OX,
  );
  const bodyShade: Cells = new Set([...body].filter((c) => parse(c)[0] >= OX + 29));
  const headRows: [number, number, number][] = [[0, 12, 27], [1, 9, 30], [2, 7, 32], [3, 6, 33], [4, 6, 33], [5, 6, 33], [6, 6, 33], [7, 6, 33], [8, 6, 33], [9, 6, 33], [10, 6, 33], [11, 7, 32], [12, 9, 30], [13, 12, 27]];
  const head = fromSpans(headRows, OX, dy);
  const headShade: Cells = new Set([...head].filter((c) => parse(c)[0] >= OX + 31));
  const visor = fromSpans([[4, 11, 28], [5, 9, 30], [6, 9, 30], [7, 9, 30], [8, 9, 30], [9, 11, 28]], OX, dy);
  const earL = fromSpans([[5, 3, 5], [6, 3, 5], [7, 3, 5], [8, 3, 5]], OX, dy);
  const earR = fromSpans([[5, 34, 36], [6, 34, 36], [7, 34, 36], [8, 34, 36]], OX, dy);
  const [eyeL, eyeR] = EYE_BITS[pose.eyes];
  const eyes = new Set([...bitCells(eyeL, OX + 12, 5 + dy), ...bitCells(eyeR, OX + 23, 5 + dy)]);

  const chestGold: Cells = new Set();
  for (const [x, y] of [[18, 21], [19, 22], [20, 23]] as [number, number][]) {
    chestGold.add(key(x + OX, y));
    chestGold.add(key(x + OX + 1, y));
  }
  const chestDark: Cells = new Set();
  for (const [x, y] of [[21, 22], [22, 21], [23, 20], [24, 19]] as [number, number][]) {
    chestDark.add(key(x + OX, y));
    chestDark.add(key(x + OX + 1, y));
  }

  const shoulderL: Hand = [OX + 8, 19];
  const shoulderR: Hand = [OX + 31, 19];
  const armL: Cells = new Set();
  addLine(armL, shoulderL[0], shoulderL[1], pose.l[0], pose.l[1]);
  const armR: Cells = new Set();
  addLine(armR, shoulderR[0], shoulderR[1], pose.r[0], pose.r[1]);

  return (
    <svg width={W * u} height={H * u} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" style={{ display: "block", overflow: "visible" }}>
      <Part cells={body} fill={WHITE} />
      <Layer cells={bodyShade} fill={SHADE} />
      <Layer cells={chestGold} fill={GOLD} />
      <Layer cells={chestDark} fill="#15141a" />
      {pose.prop === "sign" ? (
        <>
          <Part cells={fromSpans([[22, 10, 33], [23, 10, 33], [24, 10, 33], [25, 10, 33], [26, 10, 33], [27, 10, 33], [28, 10, 33], [29, 10, 33], [30, 10, 33]], OX)} fill={WHITE} />
          <text x={OX + 12.6} y={27.4} fontFamily={PX} fontSize={2.2} fill="#15141a">CONFIRM</text>
        </>
      ) : null}
      <Part cells={earL} fill={GOLD} />
      <Part cells={earR} fill={GOLD} />
      <Part cells={head} fill={WHITE} />
      <Layer cells={headShade} fill={SHADE} />
      <Layer cells={visor} fill="#0e1016" />
      <Layer cells={eyes} fill={GOLD} />
      <Part cells={armL} fill={WHITE} />
      <Part cells={armR} fill={WHITE} />
      {pose.prop === "check" ? <Layer cells={bitCells(CHECK_BITS, OX + 36, 3)} fill={GOLD} /> : null}
      {pose.prop === "drops" ? (
        <Layer cells={new Set([key(OX + 36, 6), key(OX + 36, 7), key(OX + 37, 11), key(OX + 37, 12), key(OX + 35, 15), key(OX + 35, 16)])} fill={WHITE} />
      ) : null}
      {pose.prop === "wave" ? (
        <Layer cells={new Set([key(OX + 41, 1), key(OX + 42, 2), key(OX + 42, 3), key(OX + 43, 5), key(OX + 43, 6), key(OX + 42, 8)])} fill={GOLD} />
      ) : null}
    </svg>
  );
};

const HANG_L: Hand = [OX + 4, 31];
const HANG_R: Hand = [OX + 35, 31];

const POSES: AvaPose[] = [
  { eyes: "up", dy: 0, l: HANG_L, r: HANG_R }, // 1 looks up at the stack
  { eyes: "sad", dy: 2, l: [OX + 5, 33], r: [OX + 34, 33] }, // 2 slumped
  { eyes: "open", dy: 0, l: HANG_L, r: [OX + 40, 9] }, // 3 points at the box
  { eyes: "happy", dy: 0, l: [OX + 10, 27], r: [OX + 33, 27], prop: "sign" }, // 4 holds the sign
  { eyes: "happy", dy: 0, l: HANG_L, r: [OX + 38, 14], prop: "check" }, // 5 ticks
  { eyes: "sad", dy: 0, l: HANG_L, r: [OX + 35, 2], prop: "drops" }, // 6 wipes her forehead
  { eyes: "happy", dy: 0, l: HANG_L, r: [OX + 39, 6], prop: "wave" }, // 7 waves
];

// ---------- pieces of the scenes ----------

const px = (size: number, color = WHITE, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: PX,
  fontSize: size,
  color,
  lineHeight: 1.5,
  ...extra,
});

const Bars: React.FC<{ n: number }> = ({ n }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} style={{ height: 10, width: `${[88, 64, 78, 50][i % 4]}%`, background: "#3a3e4d" }} />
    ))}
  </div>
);

const Win: React.FC<{ title: string; w: number; h: number; style?: React.CSSProperties; bars?: number; button?: string }> = ({ title, w, h, style, bars = 3, button }) => (
  <div style={{ width: w, height: h, border: `6px solid ${WHITE}`, background: PANEL, boxSizing: "border-box", ...style }}>
    <div style={{ background: GOLD, height: 34, display: "flex", alignItems: "center", padding: "0 12px", ...px(13, "#15141a") }}>{title}</div>
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <Bars n={bars} />
      {button ? <div style={{ alignSelf: "flex-start", border: `4px solid ${GRAY}`, padding: "6px 14px", ...px(12, GRAY) }}>{button}</div> : null}
    </div>
  </div>
);

// ---------- the seven scenes (each 940 x 470) ----------

const S1: React.FC = () => (
  <div style={{ position: "relative", width: 940, height: 470 }}>
    {[0, 1, 2, 3].map((n) => (
      <Win key={n} title={`SCREEN ${n + 1}`} w={420} h={250} bars={4} button={n % 2 ? "NEXT" : "SAVE"} style={{ position: "absolute", left: n * 160, top: 210 - n * 70 }} />
    ))}
    <div style={{ position: "absolute", right: 0, bottom: 0, background: BG, border: `6px solid ${GOLD}`, padding: "18px 24px" }}>
      <div style={px(40, GOLD)}>25 STEPS</div>
      <div style={px(14, GRAY, { marginTop: 8 })}>4 SCREENS · EXAMPLE</div>
    </div>
  </div>
);

const MAZE: [number, number, string][] = [
  [0, 10, "SETTINGS"], [230, 0, "FILTERS"], [470, 20, "EXPORT"], [690, 6, "DATES"],
  [60, 140, "USERS"], [300, 150, "RULES"], [540, 135, "TEAM"], [700, 160, "REVIEW"],
];
const S2: React.FC = () => (
  <div style={{ position: "relative", width: 940, height: 470 }}>
    {MAZE.map(([x, y, t], i) => (
      <Win key={i} title={t} w={250} h={150} bars={2} button={i % 2 ? "OK" : "NEXT"} style={{ position: "absolute", left: x, top: y }} />
    ))}
    <div style={{ position: "absolute", left: 0, top: 330, width: 940 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={px(46, GOLD)}>STEP 17 / 25</div>
        <div style={px(14, GRAY)}>EXAMPLE</div>
      </div>
      <div style={{ marginTop: 16, height: 30, border: `4px solid ${WHITE}`, background: BG }}>
        <div style={{ width: "68%", height: "100%", background: GOLD }} />
      </div>
    </div>
  </div>
);

const S3: React.FC = () => (
  <div style={{ position: "relative", width: 940, height: 470 }}>
    <div style={{ border: `6px solid ${WHITE}`, background: PANEL, padding: "30px 32px", minHeight: 200, boxSizing: "border-box" }}>
      <div style={px(32, WHITE, { lineHeight: 1.6 })}>
        move order 4821 to Friday morning
        <span style={{ display: "inline-block", width: 20, height: 32, background: GOLD, marginLeft: 8, verticalAlign: "middle" }} />
      </div>
    </div>
    <div style={{ position: "absolute", right: 0, top: 224, background: GOLD, padding: "12px 24px", ...px(22, "#15141a") }}>SEND</div>
    <div style={{ position: "absolute", left: 0, top: 296 }}>
      <div style={px(76, GOLD)}>STEP 1 / 1</div>
      <div style={px(14, GRAY, { marginTop: 10 })}>EXAMPLE</div>
    </div>
  </div>
);

const ROWS: [string, string][] = [["Order", "4821"], ["From", "Thu 14:00"], ["To", "Fri 09:00"], ["Customer notified", "Yes"]];
const S4: React.FC = () => (
  <div style={{ position: "relative", width: 940, height: 470, display: "flex", justifyContent: "center" }}>
    <div style={{ width: 860, border: `6px solid ${WHITE}`, background: PANEL, padding: "22px 34px 26px", boxSizing: "border-box", alignSelf: "flex-start" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={px(18, GOLD)}>NEEDS YOUR APPROVAL</div>
        <div style={px(13, GRAY)}>EXAMPLE</div>
      </div>
      <div style={px(32, WHITE, { marginTop: 14 })}>Reschedule delivery</div>
      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        {ROWS.map(([a, b]) => (
          <div key={a} style={{ display: "flex", justifyContent: "space-between", borderBottom: `4px solid #2a2d38`, padding: "6px 0" }}>
            <div style={px(22, GRAY)}>{a}</div>
            <div style={px(22, WHITE)}>{b}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 26, justifyContent: "flex-end" }}>
        <div style={{ border: `4px solid ${GRAY}`, padding: "10px 26px", ...px(22, GRAY) }}>Cancel</div>
        <div style={{ background: GOLD, padding: "14px 30px", ...px(22, "#15141a") }}>Confirm</div>
      </div>
    </div>
  </div>
);

const USER_BITS = ["....XXXX....", "...XXXXXX...", "...XXXXXX...", "...XXXXXX...", "....XXXX....", "..XXXXXXXX..", ".XXXXXXXXXX.", ".XXXXXXXXXX.", ".XXXXXXXXXX.", ".XXXXXXXXXX."];
const LOG_BITS = ["XXXXXXXXXXXX", "............", "XXXXXXXXXXXX", "............", "XXXXXXX.....", "............", "XXXXXXXXX..."];
const SWITCH_BITS = ["XXXXXXXXXXXX", "X..........X", "X.WWW......X", "X.WWW......X", "X.WWW......X", "X..........X", "XXXXXXXXXXXX"];
const TICK_BITS = ["......W", ".....WW", "W...WW.", "WW.WW..", ".WWW...", "..W...."];

const Tile: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ width: 450, height: 215, border: `6px solid ${WHITE}`, background: PANEL, boxSizing: "border-box", padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ height: 100, display: "flex", alignItems: "center" }}>{children}</div>
      <div style={{ width: 52, height: 52, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Sprite rows={TICK_BITS} u={5} />
      </div>
    </div>
    <div style={px(20, WHITE)}>{label}</div>
  </div>
);

const S5: React.FC = () => (
  <div style={{ display: "grid", gridTemplateColumns: "450px 450px", gap: 40, width: 940, height: 470, alignContent: "start" }}>
    <Tile label="SIGNED-IN USER"><Sprite rows={USER_BITS} u={9} /></Tile>
    <Tile label="READ OR WRITE">
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ border: `4px solid ${WHITE}`, padding: "8px 12px", ...px(18, WHITE) }}>READ</div>
        <div style={{ background: GOLD, padding: "12px 14px", ...px(18, "#15141a") }}>WRITE</div>
      </div>
    </Tile>
    <Tile label="ACTION LOG"><Sprite rows={LOG_BITS} u={9} /></Tile>
    <Tile label="OFF SWITCH"><Sprite rows={SWITCH_BITS} u={10} /></Tile>
  </div>
);

const LOCK_BITS = ["...XXXXXX...", "..XX....XX..", "..XX....XX..", "..XX....XX..", "XXXXXXXXXXXX", "XXXXXXXXXXXX", "XXXXX..XXXXX", "XXXXX..XXXXX", "XXXXXXXXXXXX", "XXXXXXXXXXXX", "XXXXXXXXXXXX"];
const S6: React.FC = () => (
  <div style={{ position: "relative", width: 940, height: 470 }}>
    {[2, 1, 0].map((n) => (
      <div key={n} style={{ position: "absolute", left: n * 26, top: 40 + n * 26, width: 380, height: 300, background: WHITE, border: `6px solid ${OUT}`, boxSizing: "border-box" }}>
        <div style={{ background: GOLD, height: 52, display: "flex", alignItems: "center", padding: "0 18px", ...px(24, "#15141a") }}>{`MONTH ${3 - n}`}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, padding: 18 }}>
          {Array.from({ length: 21 }).map((_, i) => <div key={i} style={{ height: 28, background: "#c3c9d4" }} />)}
        </div>
      </div>
    ))}
    <Win title="SCREEN 1" w={300} h={190} style={{ position: "absolute", left: 560, top: 70 }} />
    <Win title="SCREEN 2" w={300} h={190} style={{ position: "absolute", left: 600, top: 130 }} />
    <Win title="SCREEN 3" w={300} h={190} style={{ position: "absolute", left: 640, top: 190 }} />
    <div style={{ position: "absolute", left: 690, top: 250 }}>
      <Sprite rows={LOCK_BITS} u={14} />
    </div>
  </div>
);

const S7: React.FC = () => (
  <div style={{ position: "relative", width: 940, height: 470 }}>
    <div style={{ width: 760, height: 290, margin: "0 auto", border: `6px solid ${WHITE}`, background: PANEL, boxSizing: "border-box" }}>
      <div style={{ background: GOLD, height: 40, display: "flex", alignItems: "center", padding: "0 14px", ...px(14, "#15141a") }}>YOUR APP</div>
      <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ alignSelf: "flex-end", border: `4px solid ${WHITE}`, padding: "12px 18px", ...px(18, WHITE) }}>move order 4821 to Friday</div>
        <div style={{ alignSelf: "flex-start", background: GOLD, padding: "14px 18px", ...px(18, "#15141a") }}>Ready. Confirm to go ahead.</div>
      </div>
    </div>
    <div style={{ marginTop: 44, textAlign: "center", ...px(38, GOLD) }}>askverb.com/demos</div>
  </div>
);

const SCENES = [S1, S2, S3, S4, S5, S6, S7];

// ---------- the slide ----------

const Title: React.FC<{ text: string; size: number }> = ({ text, size }) => (
  <div style={px(size, WHITE, { lineHeight: 1.5 })}>
    {text.split("|").map((line, li) => (
      <div key={li}>
        {line.split(/(\[\[[^\]]+\]\])/).map((part, i) =>
          part.startsWith("[[") ? <span key={i} style={{ color: GOLD }}>{part.slice(2, -2)}</span> : <span key={i}>{part}</span>,
        )}
      </div>
    ))}
  </div>
);

export const PixelSlide: React.FC<{ slide: Slide; i: number; n: number }> = ({ slide, i, n }) => {
  const Scene = SCENES[i] ?? S1;
  const pose = POSES[i] ?? (POSES[0] as AvaPose);
  const cover = i === 0;
  return (
    <div style={{ position: "absolute", inset: 0, background: BG, padding: "70px 70px 0" }}>
      <Title text={slide.title ?? ""} size={cover ? 66 : (slide.title ?? "").length > 60 ? 38 : 44} />
      <div style={{ position: "absolute", left: 70, top: cover ? 390 : 400 }}>
        <Scene />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 112, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
        <Ava pose={pose} u={9} />
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 44, display: "flex", justifyContent: "space-between", ...px(16, GRAY) }}>
        <span>Vishnu · building AskVerb</span>
        <span>{i === n - 1 ? `${i + 1}/${n}` : i === 0 ? "Swipe >" : `${i + 1}/${n} >`}</span>
      </div>
    </div>
  );
};
