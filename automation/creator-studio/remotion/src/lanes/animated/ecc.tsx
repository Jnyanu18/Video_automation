import React from "react";
import { useCurrentFrame, Img, staticFile, spring } from "remotion";
import { loadFont as loadPress } from "@remotion/google-fonts/PressStart2P";
import { FPS } from "../../kit/theme";
import type { View } from "./faceless";

/** ECC, Everything Claude Code (ecc-dev-team, 2026-11-08). A new look, sharing nothing with 34 to 43 (Vishnu: "completely
 *  new, completely different"): the reel plays as a retro video game. Pixel fonts, a neon arcade palette on indigo,
 *  pixel sprites, plain cuts between game screens, its own captions. Real: ECC's block-E icon, the Claude symbol, the
 *  star count and contents (README, 2026-11-08). Sprites and the shop price are ILLUSTRATIVE. */

// Press Start 2P everywhere: Pixelify and Silkscreen made C read as O ("OLAUDE OODE"); sizes scale to its wide glyphs
const PX = loadPress("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const SK = PX + ", monospace";
const BG = "#160f33", BG2 = "#221852", INK = "#f4f1ff", DIM = "#8f85c4", YEL = "#ffd23f", PINK = "#ff4f8b", CYAN = "#3de0ff", LIME = "#7dff6a", ORANGE = "#ff8a3d";
const ECC = staticFile("ecc-dev-team/raw/ecc_icon.svg");
const CLAUDE = staticFile("ecc-dev-team/raw/claude_symbol.svg");
const c01 = (x: number) => Math.max(0, Math.min(1, x));
const pop = (t: number, stiff = 260) => (t <= 0 ? 0 : spring({ frame: t * FPS, fps: FPS, config: { damping: 10, stiffness: stiff, mass: 0.6 } }));
// stepped motion, 12 a second, the way a sprite game moves
const step = (t: number) => Math.floor(t * 12) / 12;

const Txt: React.FC<{ s: number; c?: string; children: React.ReactNode; f?: string; shadow?: string; style?: React.CSSProperties }> = ({ s, c = INK, children, f = PX, shadow = "#000", style }) => (
  <span style={{ fontFamily: f, fontSize: Math.round(s * (f === SK ? 0.62 : 0.7)), color: c, fontWeight: 400, lineHeight: 1.3, textShadow: `${Math.max(3, s / 16)}px ${Math.max(3, s / 16)}px 0 ${shadow}`, ...style }}>{children}</span>
);
const Box: React.FC<{ x: number; y: number; w: number; h: number; c?: string; fill?: string; children?: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, w, h, c = INK, fill = BG2, children, style }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: fill, border: `8px solid ${c}`, boxShadow: `10px 10px 0 #000`, imageRendering: "pixelated", ...style }}>{children}</div>
);

// pixel sprite: one character per pixel; the palette maps letters to colours
const BODY = ["....HHHH....", "...HHHHHH...", "...SSSSSS...", "...SESSES...", "...SSSSSS...", "....SSSS....", "..BBBBBBBB..", ".BBBBBBBBBB.", ".SBBBBBBBBS.", "..BBBBBBBB..", "..LL....LL..", "..LL....LL.."];
const Sprite: React.FC<{ x: number; y: number; px: number; body: string; hair: string; bob?: number }> = ({ x, y, px, body, hair, bob = 0 }) => {
  const pal: Record<string, string> = { H: hair, S: "#ffd5b0", E: "#160f33", B: body, L: "#2b2250" };
  return (
    <svg width={12 * px} height={12 * px} viewBox="0 0 12 12" style={{ position: "absolute", left: x, top: y + bob, shapeRendering: "crispEdges" }}>
      {BODY.flatMap((row, j) => Array.from(row).map((ch, i) => (pal[ch] ? <rect key={`${i}-${j}`} x={i} y={j} width={1.02} height={1.02} fill={pal[ch]} /> : null)))}
    </svg>
  );
};
const PixStar: React.FC<{ x: number; y: number; s: number; c?: string }> = ({ x, y, s, c = YEL }) => (
  <svg width={s} height={s} viewBox="0 0 7 7" style={{ position: "absolute", left: x, top: y, shapeRendering: "crispEdges" }}>
    {["...X...", "..XXX..", "XXXXXXX", ".XXXXX.", "..XXX..", ".XX.XX.", "X.....X"].flatMap((r, j) => Array.from(r).map((ch, i) => (ch === "X" ? <rect key={`${i}${j}`} x={i} y={j} width={1.02} height={1.02} fill={c} /> : null)))}
  </svg>
);
const Grid: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: 0.18 }}>
    {Array.from({ length: 28 }).map((_, i) => <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={1920} stroke="#5b4bb0" strokeWidth={2} />)}
    {Array.from({ length: 48 }).map((_, i) => <line key={`h${i}`} x1={0} y1={i * 40} x2={1080} y2={i * 40} stroke="#5b4bb0" strokeWidth={2} />)}
  </svg>
);
const Header: React.FC<{ left: string; right?: string }> = ({ left, right }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: 110, display: "flex", justifyContent: "space-between" }}>
    <Txt s={34} f={SK} c={CYAN}>{left}</Txt>{right ? <Txt s={34} f={SK} c={YEL}>{right}</Txt> : null}
  </div>
);
const TEAM: [string, string][] = [["#ff4f8b", "#3a1f10"], ["#3de0ff", "#f4f1ff"], ["#7dff6a", "#2b2250"], ["#ff8a3d", "#160f33"], ["#b48cff", "#ffd23f"], ["#ffd23f", "#3a1f10"], ["#ff6b6b", "#2b2250"], ["#4fd1c5", "#3a1f10"]];
type S = (now: number, T: (k: string) => number) => React.ReactNode;

// 1. PLAYER 1 alone; the whole dev team drops in; then the price coin flips to FREE
const s1: S = (now, T) => {
  const tt = T("team"), tf = T("free"), tr = T("turned");
  const free = now >= tf;
  return (
    <>
      <Header left="PLAYER 1" right={`PARTY ${1 + TEAM.filter((_, i) => now >= tr + i * ((tt - tr) / 8)).length}/9`} />
      <Box x={330} y={420} w={420} h={420} c={YEL}>
        <Img src={CLAUDE} style={{ position: "absolute", left: 90, top: 60, width: 240, height: 240, transform: `rotate(${step(now) * 20}deg)` }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 24, textAlign: "center" }}><Txt s={46}>CLAUDE CODE</Txt></div>
      </Box>
      {TEAM.map(([b, h], i) => {
        const ti = tr + i * ((tt - tr) / 8);
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r = 400;
        const x = 540 + Math.cos(a) * r - 66, y = 630 + Math.sin(a) * r * 0.95 - 66;
        const drop = now >= ti ? c01(pop(now - ti, 300)) : 0;
        return now >= ti ? <Sprite key={i} x={x} y={y - (1 - drop) * 500} px={11} body={b} hair={h} bob={Math.floor(now * 4 + i) % 2 ? -6 : 0} /> : null;
      })}
      {free ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1150, display: "flex", justifyContent: "center", alignItems: "center", gap: 30 }}>
          <div style={{ width: 170, height: 170, borderRadius: "50%", background: YEL, border: "10px solid #b88a00", boxShadow: "8px 8px 0 #000", display: "flex", alignItems: "center", justifyContent: "center", transform: `scaleX(${Math.cos(Math.min(1, (now - tf) / 0.35) * Math.PI * 2)})` }}><Txt s={70} c="#7a5200" shadow="transparent">$</Txt></div>
          <Txt s={130} c={LIME} style={{ transform: `scale(${pop(now - tf - 0.2)})`, display: "inline-block" }}>FREE!</Txt>
        </div>
      ) : (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1200, textAlign: "center" }}><Txt s={60} f={SK} c={now >= tt ? PINK : CYAN}>{now >= tt ? "A WHOLE DEV TEAM" : "1 DEVELOPER"}</Txt></div>
      )}
      {free ? Array.from({ length: 14 }).map((_, i) => {
        const u = now - tf, ang = (i / 14) * Math.PI * 2;
        return <div key={i} style={{ position: "absolute", left: 540 + Math.cos(ang) * 420 * Math.min(1, u * 2) - 20, top: 1240 + Math.sin(ang) * 300 * Math.min(1, u * 2) + 400 * u * u - 20, width: 40, height: 40, borderRadius: "50%", background: YEL, border: "6px solid #b88a00", opacity: 1 - c01((u - 1) / 0.4) }} />;
      }) : null}
    </>
  );
};

// 2. The ECC cartridge slides into a console; HI-SCORE counts up to 299,359
const s2: S = (now, T) => {
  const t0 = T("s2"), te = T("everything"), ta = T("almost"), ts = T("stars");
  const ins = c01((now - te) / 0.35);
  const score = Math.round(299359 * c01((now - ta) / Math.max(0.6, ts - ta + 0.3)));
  const scoring = now >= ta - 0.1;
  return (
    <>
      <Header left="NEW GAME" right="1P" />
      {!scoring ? (
        <>
          <div style={{ position: "absolute", left: 290, top: 300 + step(ins) * 330 + (1 - c01(pop(now - t0, 200))) * -600, width: 500, height: 560 }}>
            <div style={{ position: "absolute", inset: 0, background: "#3a3470", border: "10px solid #000", boxShadow: "12px 12px 0 #000" }} />
            <div style={{ position: "absolute", left: 50, top: 50, right: 50, height: 340, background: "#111827", border: "8px solid #000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
              <Img src={ECC} style={{ width: 170, height: 170, imageRendering: "pixelated" }} />
              <Txt s={34} f={SK} c={YEL}>EVERYTHING</Txt><Txt s={34} f={SK} c={YEL}>CLAUDE CODE</Txt>
            </div>
            {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ position: "absolute", left: 60 + i * 50, bottom: 30, width: 26, height: 70, background: "#ffd23f", border: "4px solid #000" }} />)}
          </div>
          <div style={{ position: "absolute", left: 140, top: 900, width: 800, height: 380, background: "#2b2250", border: "10px solid #000", boxShadow: "12px 12px 0 #000" }}>
            <div style={{ position: "absolute", left: 140, top: -10, width: 520, height: 60, background: "#0b0820", border: "8px solid #000" }} />
            <div style={{ position: "absolute", right: 60, top: 120, width: 60, height: 60, borderRadius: "50%", background: ins >= 1 ? LIME : "#3a3470", border: "6px solid #000", boxShadow: ins >= 1 ? `0 0 40px ${LIME}` : "none" }} />
            <div style={{ position: "absolute", left: 60, top: 140 }}><Txt s={44} f={SK} c={ins >= 1 ? LIME : DIM}>{ins >= 1 ? "LOADED" : "INSERT GAME"}</Txt></div>
          </div>
        </>
      ) : (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center" }}><Txt s={80} f={SK} c={PINK}>HI-SCORE</Txt></div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 520, textAlign: "center" }}><Txt s={190} c={YEL}>{score.toLocaleString("en-US")}</Txt></div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 790, display: "flex", justifyContent: "center", alignItems: "center", gap: 20 }}><Img src={ECC} style={{ width: 90, height: 90 }} /><Txt s={50} f={SK}>GITHUB STARS</Txt></div>
          {Array.from({ length: 18 }).map((_, i) => {
            const fall = ((now - ta) * (280 + (i % 5) * 60) + i * 140) % 900;
            return <PixStar key={i} x={60 + ((i * 197) % 960)} y={940 + fall} s={48 + (i % 3) * 16} c={i % 4 === 0 ? CYAN : YEL} />;
          })}
          <div style={{ position: "absolute", left: 0, right: 0, top: 1000, textAlign: "center" }}><Txt s={40} f={SK} c={CYAN}>affaan-m/ECC · MIT</Txt></div>
        </>
      )}
    </>
  );
};

// 3. Inventory: 71 agents, 314 skills, 98 commands, each grid filling on its word
const s3: S = (now, T) => {
  const ta = T("a71"), tsk = T("s314"), tc = T("c98");
  const rows: [string, number, number, string, number][] = [["AGENTS", 71, ta, PINK, 18], ["SKILLS", 314, tsk, CYAN, 9], ["COMMANDS", 98, tc, LIME, 15]];
  return (
    <>
      <Header left="INVENTORY" right="ECC" />
      {rows.map(([label, n, t, c, cell], r) => {
        const on = now >= t - 0.05;
        const filled = Math.round(n * c01((now - t) / 0.9));
        const cols = Math.floor(840 / (cell + 4));
        return (
          <Box key={r} x={70} y={260 + r * 400} w={940} h={360} c={on ? c : "#3a3470"} style={{ opacity: on ? 1 : 0.45 }}>
            <div style={{ position: "absolute", left: 40, top: 26, display: "flex", alignItems: "baseline", gap: 24 }}>
              <Txt s={110} c={on ? c : DIM}>{on ? filled : 0}</Txt><Txt s={50} f={SK} c={on ? INK : DIM}>{label}</Txt>
            </div>
            <div style={{ position: "absolute", left: 40, top: 180, width: 860, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Array.from({ length: Math.min(n, cols * Math.floor(150 / (cell + 4))) }).map((_, i) => <div key={i} style={{ width: cell, height: cell, background: i < filled ? c : "rgba(255,255,255,0.06)" }} />)}
            </div>
          </Box>
        );
      })}
    </>
  );
};

// 4. Character select: planner, architect, reviewer, security; then they fall in behind Player 1
const ROLES: [string, string, string, string, string][] = [["PLANNER", "planner", "#ff4f8b", "#3a1f10", "MAP"], ["ARCHITECT", "architect", "#3de0ff", "#f4f1ff", "BLUEPRINT"], ["REVIEWER", "reviewer", "#7dff6a", "#2b2250", "LENS"], ["SECURITY", "security", "#ff8a3d", "#160f33", "SHIELD"]];
const s4: S = (now, T) => {
  const tall = T("all");
  const march = c01((now - tall) / 0.9);
  return (
    <>
      <Header left="SELECT YOUR TEAM" right={now >= tall ? "5/5" : ""} />
      {march < 1 ? ROLES.map(([name, key, b, h, item], i) => {
        const t = T(key);
        const on = now >= t - 0.05;
        const x = 70 + (i % 2) * 480, y = 260 + Math.floor(i / 2) * 560;
        return on ? (
          <Box key={i} x={x - march * 600 * (i % 2 ? -1 : 1)} y={y} w={460} h={520} c={b} style={{ transform: `scale(${c01(pop(now - t))})` }}>
            <Sprite x={128} y={50} px={17} body={b} hair={h} bob={Math.floor(now * 4) % 2 ? -6 : 0} />
            <div style={{ position: "absolute", left: 0, right: 0, top: 290, textAlign: "center" }}><Txt s={56} c={b}>{name}</Txt></div>
            <div style={{ position: "absolute", left: 30, right: 30, top: 380 }}>
              {["ATK", "DEF"].map((st, k) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                  <Txt s={24} f={SK} c={DIM}>{st}</Txt>
                  <div style={{ flex: 1, height: 22, background: "#0b0820", border: "4px solid #000" }}><div style={{ width: `${c01((now - t - 0.2) / 0.4) * (70 + ((i * 13 + k * 17) % 28))}%`, height: "100%", background: b }} /></div>
                </div>
              ))}
              <div style={{ marginTop: 14, textAlign: "center" }}><Txt s={22} f={SK} c={YEL}>ITEM: {item}</Txt></div>
            </div>
          </Box>
        ) : null;
      }) : null}
      {now >= tall ? (
        <>
          <Box x={380} y={650} w={320} h={320} c={YEL} style={{ transform: `scale(${c01(pop(now - tall - 0.4))})` }}>
            <Img src={CLAUDE} style={{ position: "absolute", left: 70, top: 40, width: 180, height: 180 }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, textAlign: "center" }}><Txt s={36}>YOUR CLAUDE</Txt></div>
          </Box>
          {ROLES.map(([, , b, h], i) => <Sprite key={i} x={(i < 2 ? 90 + i * 140 : 720 + (i - 2) * 140) + (i < 2 ? -1 : 1) * (1 - march) * 400} y={1060} px={10} body={b} hair={h} bob={Math.floor(now * 6 + i) % 2 ? -8 : 0} />)}
          <div style={{ position: "absolute", left: 0, right: 0, top: 1240, textAlign: "center", opacity: c01((now - tall - 0.6) / 0.2) }}><Txt s={50} f={SK} c={LIME}>ALL WORKING FOR YOU</Txt></div>
        </>
      ) : null}
    </>
  );
};

// 5. STAGE CLEAR: the hackathon trophy
const s5: S = (now, T) => {
  const t0 = T("s5"), tw = T("won");
  return (
    <>
      <Header left="WORLD 1-1" right="CLEAR" />
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", transform: `scale(${pop(now - t0)})` }}><Txt s={130} c={YEL}>STAGE</Txt></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 440, textAlign: "center", transform: `scale(${pop(now - t0 - 0.15)})` }}><Txt s={130} c={YEL}>CLEAR!</Txt></div>
      <svg width={360} height={400} viewBox="0 0 18 20" style={{ position: "absolute", left: 360, top: 640, shapeRendering: "crispEdges", transform: `translateY(${now >= tw ? -Math.abs(Math.sin((now - tw) * 6)) * 20 : 0}px) scale(${c01(pop(now - tw + 0.3))})` }}>
        {["..YYYYYYYYYYYYYY..", "YYYYWYYYYYYYYYYYYY", "Y.YYWYYYYYYYYYYY.Y", "Y.YYWYYYYYYYYYYY.Y", "Y.YYYYYYYYYYYYYY.Y", ".Y.YYYYYYYYYYYY.Y.", "..YYYYYYYYYYYYYY..", "...YYYYYYYYYYYY...", "....YYYYYYYYYY....", "......YYYYYY......", ".......YYYY.......", ".......YYYY.......", "......BBBBBB......", ".....BBBBBBBB.....", "....BBBBBBBBBB....", "....BBBBBBBBBB...."].flatMap((r, j) => Array.from(r).map((ch, i) => (ch !== "." ? <rect key={`${i}-${j}`} x={i} y={j} width={1.02} height={1.02} fill={ch === "Y" ? YEL : ch === "W" ? "#fff6c2" : "#6b4a1f"} /> : null)))}
      </svg>
      {now >= tw ? (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1080, textAlign: "center" }}><Txt s={54} f={SK} c={INK}>ANTHROPIC HACKATHON</Txt></div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1160, textAlign: "center" }}><Txt s={70} c={LIME} style={{ transform: `scale(${pop(now - tw - 0.2)})`, display: "inline-block" }}>WINNER</Txt></div>
          {Array.from({ length: 26 }).map((_, i) => {
            const u = now - tw;
            return <div key={i} style={{ position: "absolute", left: (i * 83) % 1040, top: -40 + ((u * (300 + (i % 4) * 90) + i * 60) % 1500), width: 26, height: 26, background: [YEL, PINK, CYAN, LIME, ORANGE][i % 5] }} />;
          })}
        </>
      ) : null}
    </>
  );
};

// 6. PRESS START: the one command types, a loading bar fills, INSTALLED
const s6: S = (now, T) => {
  const t0 = T("s6"), tw = T("whole");
  const cmd = "npx ecc-universal setup";
  const typedN = Math.floor(c01((now - t0 - 0.25) / 0.8) * cmd.length);
  const load = c01((now - t0 - 1.0) / Math.max(0.6, tw - t0 - 0.6));
  return (
    <>
      <Header left="ONE COMMAND" right="1/1" />
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", opacity: Math.floor(now * 3) % 2 || now > t0 + 0.6 ? 1 : 0.2 }}><Txt s={110} c={YEL}>PRESS START</Txt></div>
      <Box x={70} y={560} w={940} h={300} c={CYAN} fill="#0b0820">
        <div style={{ position: "absolute", left: 40, top: 100 }}><Txt s={50} f={SK} c={LIME} shadow="transparent">&gt; {cmd.slice(0, typedN)}{Math.floor(now * 4) % 2 ? "_" : " "}</Txt></div>
      </Box>
      <div style={{ position: "absolute", left: 70, top: 960 }}><Txt s={44} f={SK} c={load >= 1 ? LIME : INK}>{load >= 1 ? "INSTALLED!" : "LOADING..."}</Txt></div>
      <div style={{ position: "absolute", left: 70, top: 1040, width: 940, height: 90, background: "#0b0820", border: "8px solid #000", boxShadow: "10px 10px 0 #000", display: "flex", gap: 6, padding: 8 }}>
        {Array.from({ length: 20 }).map((_, i) => <div key={i} style={{ flex: 1, background: i / 20 < load ? (load >= 1 ? LIME : YEL) : "transparent" }} />)}
      </div>
      <div style={{ position: "absolute", right: 70, top: 960 }}><Txt s={44} f={SK} c={YEL}>{Math.round(load * 100)}%</Txt></div>
    </>
  );
};

// 7. The SHOP: a paid setup course with a price tag; on "for free" the tag shatters and a chest opens: FREE LOOT
const s7: S = (now, T) => {
  const t0 = T("s7"), tc = T("courses"), tf = T("free2");
  const smash = now >= tf;
  return (
    <>
      <Header left="SHOP" right="GOLD: 0" />
      {!smash ? (
        <>
          <div style={{ position: "absolute", left: 120, top: 260, width: 840, height: 120, background: "repeating-linear-gradient(90deg,#ff4f8b 0 70px,#f4f1ff 70px 140px)", border: "8px solid #000", transform: `translateY(${(1 - c01(pop(now - t0, 200))) * -300}px)` }} />
          <Sprite x={430} y={420} px={18} body="#6b4a1f" hair="#160f33" bob={Math.floor(now * 3) % 2 ? -6 : 0} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 650, textAlign: "center" }}><Txt s={40} f={SK} c={DIM}>"WANNA LEARN THE SETUP?"</Txt></div>
          {now >= tc - 0.1 ? (
            <Box x={170} y={760} w={740} h={460} c={PINK} style={{ transform: `scale(${c01(pop(now - tc))})` }}>
              <div style={{ position: "absolute", left: 40, top: 40 }}><Txt s={46} f={SK}>CLAUDE SETUP</Txt></div>
              <div style={{ position: "absolute", left: 40, top: 110 }}><Txt s={46} f={SK}>COURSE</Txt></div>
              <div style={{ position: "absolute", left: 40, top: 230, padding: "10px 30px", background: YEL, border: "6px solid #000", transform: `rotate(-4deg)` }}><Txt s={90} c="#160f33" shadow="transparent">$199</Txt></div>
              <div style={{ position: "absolute", right: 40, bottom: 30 }}><Txt s={22} f={SK} c={DIM}>ILLUSTRATIVE</Txt></div>
            </Box>
          ) : null}
        </>
      ) : (
        <>
          {Array.from({ length: 12 }).map((_, i) => {
            const u = now - tf;
            return <div key={i} style={{ position: "absolute", left: 470 + Math.cos(i) * 380 * Math.min(1, u * 3), top: 500 + Math.sin(i * 1.7) * 200 * Math.min(1, u * 3) + 600 * u * u, width: 90, height: 60, background: YEL, border: "6px solid #000", transform: `rotate(${u * 300 + i * 40}deg)`, opacity: 1 - c01((u - 0.8) / 0.4) }} />;
          })}
          <svg width={460} height={360} viewBox="0 0 23 18" style={{ position: "absolute", left: 310, top: 780, shapeRendering: "crispEdges" }}>
            <rect x={1} y={8} width={21} height={10} fill="#8a5a2b" /><rect x={1} y={8} width={21} height={2} fill="#000" /><rect x={10} y={10} width={3} height={4} fill={YEL} />
            <g transform={`translate(0 ${-6 * c01((now - tf - 0.2) / 0.25)}) rotate(${-25 * c01((now - tf - 0.2) / 0.25)} 1 8)`}><rect x={1} y={2} width={21} height={6} fill="#a8723a" /><rect x={1} y={6} width={21} height={2} fill="#000" /></g>
          </svg>
          <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", transform: `scale(${pop(now - tf - 0.3)})` }}><Txt s={150} c={LIME}>FREE</Txt></div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", transform: `scale(${pop(now - tf - 0.45)})` }}><Txt s={110} c={YEL}>LOOT!</Txt></div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1180, textAlign: "center", opacity: c01((now - tf - 0.5) / 0.2) }}><Txt s={44} f={SK} c={CYAN}>ON GITHUB · MIT</Txt></div>
          {Array.from({ length: 8 }).map((_, i) => <PixStar key={i} x={330 + i * 52} y={760 - 300 * c01((now - tf - 0.3 - i * 0.05) / 0.5) + (i % 2) * 40} s={46} c={i % 2 ? YEL : CYAN} />)}
        </>
      )}
    </>
  );
};

// 8. CONTINUE? with a countdown and COMMENT GITHUB
const s8: S = (now, T) => {
  const t0 = T("s8");
  const n = Math.max(1, 9 - Math.floor((now - t0) * 3));
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center" }}><Txt s={130} c={PINK}>CONTINUE?</Txt></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center" }}><Txt s={300} c={YEL} style={{ transform: `scale(${1 + 0.15 * (1 - ((now - t0) * 3) % 1)})`, display: "inline-block" }}>{n}</Txt></div>
      <Box x={110} y={900} w={860} h={300} c={LIME}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 50, textAlign: "center" }}><Txt s={56} f={SK}>COMMENT</Txt></div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 140, textAlign: "center" }}><Txt s={100} c={LIME}>GITHUB</Txt></div>
      </Box>
    </>
  );
};

const SCREENS: { key: string; draw: S }[] = [{ key: "s1", draw: s1 }, { key: "s2", draw: s2 }, { key: "s3", draw: s3 }, { key: "s4", draw: s4 }, { key: "s5", draw: s5 }, { key: "s6", draw: s6 }, { key: "s7", draw: s7 }, { key: "s8", draw: s8 }];

// captions: one chunk of up to three words, chunky pixel type, the spoken word in yellow
type Wd = { w: string; start: number; end: number };
const GameCaptions: React.FC<{ words: Wd[]; now: number }> = ({ words, now }) => {
  let i = words.findIndex((w) => w.start > now) - 1;
  if (i < -1) i = words.length - 1;
  if (i < 0) return null;
  const startChunk = i - (i % 3);
  const chunk = words.slice(startChunk, startChunk + 3);
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1440, textAlign: "center", lineHeight: 1.1 }}>
      {chunk.map((w, k) => <span key={k} style={{ fontFamily: PX, fontWeight: 400, fontSize: 46, lineHeight: 1.6, color: startChunk + k === i ? YEL : INK, textShadow: "5px 5px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000", marginRight: 26, textTransform: "uppercase" }}>{w.w.replace(/[.,?!:]+$/, "")}</span>)}
    </div>
  );
};

export const EccView: View = {
  View: ({ t0, at, p, words }) => {
    const now = t0 + useCurrentFrame() / FPS;
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => (k === "s1" ? t0 : parts[k] ? at(parts[k]) - 0.08 : 999);
    let cur = 0;
    SCREENS.forEach((s, i) => { if (now >= T(s.key)) cur = i; });
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: `radial-gradient(circle at 50% 40%, ${BG2}, ${BG} 70%)`, overflow: "hidden" }}>
        <Grid />
        {SCREENS[cur].draw(now, T)}
        {words ? <GameCaptions words={words as Wd[]} now={now} /> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => at(parts[k]);
    return [
      { t: 0.02, sound: "beep", gain: 0.2 }, ...[0, 1, 2, 3].map((i) => ({ t: T("team") + i * 0.2, sound: "pop", gain: 0.12 })), { t: T("free"), sound: "coin", gain: 0.3 },
      { t: T("s2"), sound: "whip", gain: 0.15 }, { t: T("everything") + 0.35, sound: "snap", gain: 0.2 }, { t: T("stars") + 0.2, sound: "ding", gain: 0.2 },
      { t: T("a71"), sound: "beep", gain: 0.14 }, { t: T("s314"), sound: "beep", gain: 0.14 }, { t: T("c98"), sound: "beep", gain: 0.14 },
      { t: T("planner"), sound: "pop", gain: 0.14 }, { t: T("architect"), sound: "pop", gain: 0.14 }, { t: T("reviewer"), sound: "pop", gain: 0.14 }, { t: T("security"), sound: "pop", gain: 0.14 },
      { t: T("won"), sound: "chime", gain: 0.25 }, { t: T("s6") + 0.25, sound: "keypress", gain: 0.15 }, { t: T("whole"), sound: "ding", gain: 0.18 },
      { t: T("courses"), sound: "cash", gain: 0.18 }, { t: T("free2"), sound: "glass", gain: 0.22 }, { t: T("free2") + 0.3, sound: "coin", gain: 0.22 },
      { t: T("s8"), sound: "beep", gain: 0.15 },
    ];
  },
};
