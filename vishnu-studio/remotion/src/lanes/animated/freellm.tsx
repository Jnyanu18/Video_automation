import React from "react";
import { useCurrentFrame, Img, staticFile } from "remotion";
import { F, FPS } from "../../kit/theme";
import type { View } from "./faceless";
import { SERIF, c01, sp, ease, In, Card, Check, typed, Captions } from "./keynote";

/** FreeLLMAPI: Claude Code on free models (freellmapi, 2026-11-07). The 34-three-agents system: a colour world per chapter
 *  flooding from the centre, chapter tabs, serif headlines with one italic word, our own take on a terminal and a router.
 *  Provider names in type (no marks found unchanged). The repo name and stars are real; requests, chats and models on
 *  screen are ILLUSTRATIVE. Structure from DfPmz4TR5v8 (a dialogue over game footage), never its look. */

type World = { bg: string; ink: string; dim: string; line: string; card: string; accent: string };
const W: Record<string, World> = {
  dark: { bg: "#0d0d10", ink: "#f2f2f5", dim: "#83838f", line: "#26262e", card: "#17171c", accent: "#d97757" },
  white: { bg: "#f4f2ee", ink: "#16161a", dim: "#8a8780", line: "#e4e1da", card: "#ffffff", accent: "#2f5ff0" },
  amber: { bg: "#f3b01c", ink: "#1d1606", dim: "#6b5214", line: "#d99c12", card: "#fff6dc", accent: "#1d1606" },
  blue: { bg: "#1f4fe0", ink: "#ffffff", dim: "#c7d5ff", line: "#3a63e8", card: "#2f5ff0", accent: "#ffffff" },
  green: { bg: "#d9f2e2", ink: "#0f2a1b", dim: "#4f7a60", line: "#b6e2c6", card: "#ffffff", accent: "#2fbf71" },
};
let TH: World = W.dark;
const GREEN = "#2fbf71", RED = "#ff4d4f", CLAY = "#d97757";
const claude = staticFile("freellmapi/raw/claude_symbol.svg");
const Mono: React.FC<{ s: number; c?: string; children: React.ReactNode; w?: number }> = ({ s, c, children, w = 600 }) => <span style={{ fontFamily: F.mono, fontSize: s, letterSpacing: 2, color: c || TH.dim, fontWeight: w }}>{children}</span>;
const Head: React.FC<{ t: number; a: string; i?: string; b?: string; top?: number; size?: number }> = ({ t, a, i, b, top = 200, size = 96 }) => (
  <In t={t} dy={26} style={{ left: 50, right: 50, top, textAlign: "center", fontFamily: SERIF, fontSize: size, color: TH.ink, lineHeight: 1.05 }}>
    {a}{i ? <span style={{ fontStyle: "italic" }}> {i}</span> : null}{b ? ` ${b}` : null}
  </In>
);
const Panel: React.FC<{ x: number; y: number; w: number; h: number; t: number; label?: string; children?: React.ReactNode; border?: string; fill?: string }> = ({ x, y, w, h, t, label, children, border, fill }) => (
  <Card x={x} y={y} w={w} h={h} t={t} fill={fill || TH.card} r={26} style={border ? { border: `3px solid ${border}` } : {}}>
    {label ? <div style={{ position: "absolute", left: 28, top: 22 }}><Mono s={20}>{label}</Mono></div> : null}
    {children}
  </Card>
);
// the twelve the README's own provider grid shows (read 2026-11-07); the other 22 are "+ 22 more"
const PROVIDERS = ["Google", "Groq", "Cerebras", "Mistral", "OpenRouter", "Cohere", "Cloudflare", "NVIDIA", "Hugging Face", "Z.ai", "ModelScope", "OpenCode Zen", "+ 22 more"];
type B = (now: number, T: (k: string) => number) => React.ReactNode;

// 1. Claude Code hits its usage limit; the red bar flips to FREE · UNLIMITED
const b1: B = (now, T) => {
  const t0 = T("b1"), tf = T("free"), tu = T("unlimited");
  const flip = c01((now - tf) / 0.25);
  const used = Math.min(1, ease(now - t0, 1.0));
  return (
    <>
      <Head t={now - t0} a="Claude Code," i="free." top={190} size={110} />
      <Panel x={70} y={420} w={940} h={760} t={now - t0} fill="#0a0a0c">
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 64, background: "#1b1b20", display: "flex", alignItems: "center", gap: 10, paddingLeft: 24 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}
          <span style={{ marginLeft: 16 }}><Mono s={20} c="#8a8a95" w={500}>~/my-app · claude</Mono></span>
        </div>
        <div style={{ position: "absolute", left: 36, top: 100, display: "flex", alignItems: "center", gap: 18 }}>
          <Img src={claude} style={{ width: 56, height: 56 }} />
          <span style={{ fontFamily: F.mono, fontSize: 36, color: "#f2f2f5" }}>Claude Code</span>
        </div>
        <div style={{ position: "absolute", left: 36, right: 36, top: 200, fontFamily: F.mono, fontSize: 30, color: "#c9c9d2", lineHeight: 1.6 }}>
          <div><span style={{ color: CLAY }}>&gt;</span> {typed("build the checkout page", now - t0 - 0.1, 30)}</div>
          <div style={{ color: "#8a8a95" }}>{now - t0 > 0.9 ? "● Writing checkout.tsx..." : ""}</div>
        </div>
        <div style={{ position: "absolute", left: 36, right: 36, top: 420 }}>
          <Mono s={22} c="#8a8a95">USAGE</Mono>
          <div style={{ marginTop: 14, height: 34, borderRadius: 17, background: "#1f1f25", overflow: "hidden" }}>
            <div style={{ width: `${(flip > 0 ? 1 : used) * 100}%`, height: "100%", borderRadius: 17, background: flip > 0 ? GREEN : used > 0.85 ? RED : CLAY, transition: "none" }} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 36, right: 36, top: 540, height: 130, borderRadius: 20, border: `3px solid ${flip > 0 ? GREEN : RED}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, transform: `scale(${flip > 0 ? 0.9 + 0.1 * sp(now - tf, 220) : 1})`, opacity: c01((now - t0 - 0.6) / 0.15) }}>
          {flip > 0 ? <Check t={now - tf} color={GREEN} size={56} /> : <div style={{ width: 22, height: 22, borderRadius: 11, background: RED, opacity: 0.5 + 0.5 * Math.sin(now * 8) }} />}
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 52, color: flip > 0 ? GREEN : RED, letterSpacing: 1 }}>{flip > 0 ? (now >= tu - 0.05 ? "FREE · UNLIMITED" : "FREE") : "Usage limit reached"}</span>
        </div>
      </Panel>
    </>
  );
};

// 2. FreeLLMAPI: the repo and its stars; then the router between Claude Code and 34 providers, requests spreading out
const b2: B = (now, T) => {
  const t0 = T("b2"), ts = T("stars"), tb = T("between"), tp = T("spreads");
  const stars = Math.round(48500 * ease(now - t0 - 0.3, Math.max(1.0, ts - t0 + 0.2)));
  const hub = now >= tb - 0.15;
  return (
    <>
      {!hub ? (
        <>
          <Head t={now - t0} a="Free" i="LLM" b="API" top={260} size={130} />
          <Panel x={140} y={560} w={800} h={300} t={now - t0 - 0.2}>
            <div style={{ position: "absolute", left: 36, top: 40, display: "flex", alignItems: "center", gap: 18 }}>
              <svg width={52} height={52} viewBox="0 0 24 24"><path fill={TH.ink} d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z" /></svg>
              <span style={{ fontFamily: F.mono, fontSize: 34, color: TH.ink }}>tashfeenahmed/<b>freellmapi</b></span>
            </div>
            <div style={{ position: "absolute", left: 36, top: 150, display: "flex", alignItems: "center", gap: 16 }}>
              <svg width={56} height={56} viewBox="0 0 24 24"><path fill="#e3b341" d="M12 2l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.6 5.6 21.2l1.6-7.1L1.8 9.3 9 8.6z" /></svg>
              <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 80, color: TH.ink }}>{stars.toLocaleString("en-US")}</span>
              <Mono s={24}>STARS</Mono>
            </div>
          </Panel>
          <In t={now - t0 - 0.5} style={{ left: 0, right: 0, top: 900, textAlign: "center" }}><Mono s={22}>MIT · OPEN SOURCE</Mono></In>
        </>
      ) : (
        <>
          <In t={now - tb} style={{ left: 0, right: 0, top: 190, textAlign: "center" }}><span style={{ fontFamily: SERIF, fontSize: 84, color: TH.ink }}>One door, <span style={{ fontStyle: "italic" }}>34</span> providers</span></In>
          <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
            {PROVIDERS.map((_, i) => {
              const y = 430 + i * 74;
              const k = c01((now - tb - 0.3 - i * 0.05) / 0.2);
              const pk = ((now - tp) * 0.9 + i * 0.13) % 1;
              return (
                <g key={i} opacity={k}>
                  <path d={`M 470 820 C 600 820, 600 ${y + 26}, 700 ${y + 26}`} stroke={TH.line} strokeWidth={3} fill="none" />
                  {now >= tp ? <circle cx={470 + 230 * pk} cy={820 + (y + 26 - 820) * (pk * pk * (3 - 2 * pk))} r={8} fill={TH.accent} /> : null}
                </g>
              );
            })}
            <path d="M 300 820 L 380 820" stroke={TH.ink} strokeWidth={4} />
          </svg>
          <In t={now - tb} style={{ left: 60, top: 760 }}>
            <div style={{ width: 240, padding: "22px 18px", borderRadius: 22, background: "#0a0a0c", display: "flex", alignItems: "center", gap: 12 }}>
              <Img src={claude} style={{ width: 44, height: 44 }} /><span style={{ fontFamily: F.mono, fontSize: 24, color: "#f2f2f5" }}>Claude Code</span>
            </div>
          </In>
          <In t={now - tb - 0.15} style={{ left: 380, top: 735 }}>
            <div style={{ width: 170, height: 170, borderRadius: 85, background: TH.accent, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 40px rgba(47,95,240,0.35)" }}>
              <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 28, color: "#fff" }}>FreeLLM</span>
              <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 28, color: "#fff" }}>API</span>
            </div>
          </In>
          {PROVIDERS.map((p, i) => (
            <div key={i} style={{ position: "absolute", left: 710, top: 430 + i * 74, height: 52, padding: "0 20px", borderRadius: 26, background: TH.card, border: `2px solid ${TH.line}`, display: "flex", alignItems: "center", opacity: c01((now - tb - 0.3 - i * 0.05) / 0.2), boxShadow: "0 6px 14px rgba(0,0,0,0.06)" }}>
              <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 24, color: i === PROVIDERS.length - 1 ? TH.dim : TH.ink }}>{p}</span>
              {i < PROVIDERS.length - 1 ? <span style={{ marginLeft: 12 }}><Mono s={14} c={GREEN}>FREE</Mono></span> : null}
            </div>
          ))}
        </>
      )}
    </>
  );
};

// 3. 7.4 billion tokens a month, counting up; "the project's own number"
const b3: B = (now, T) => {
  const t0 = T("b3"), tb = T("billion"), to = T("own");
  const v = 7.4 * ease(now - t0 - 0.2, Math.max(0.8, tb - t0));
  return (
    <>
      <Head t={now - t0} a="Every" i="month" top={300} size={90} />
      <In t={now - t0 - 0.1} style={{ left: 0, right: 0, top: 560, textAlign: "center" }}>
        <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 300, color: TH.ink, letterSpacing: -8 }}>{v.toFixed(1)}B</span>
      </In>
      <In t={now - t0 - 0.3} style={{ left: 0, right: 0, top: 920, textAlign: "center" }}><Mono s={34} c={TH.ink} w={800}>FREE TOKENS</Mono></In>
      {Array.from({ length: 34 }).map((_, i) => (
        <div key={i} style={{ position: "absolute", left: 95 + (i % 17) * 52, top: 1060 + Math.floor(i / 17) * 60, width: 40, height: 40, borderRadius: 10, background: TH.ink, opacity: 0.12 + 0.75 * c01((now - t0 - 0.3 - i * 0.03) / 0.15) }} />
      ))}
      {now >= to - 0.1 ? (
        <In t={now - to} style={{ left: 0, right: 0, top: 1240, display: "flex", justifyContent: "center" }}>
          <div style={{ padding: "14px 30px", borderRadius: 999, border: `3px solid ${TH.ink}` }}><Mono s={24} c={TH.ink}>ALL 34 FREE TIERS ADDED UP · THE PROJECT'S NUMBER</Mono></div>
        </In>
      ) : null}
    </>
  );
};

// 4. A model hits its limit; a short note passes to the next model; the chat picks up where it stopped
const b4: B = (now, T) => {
  const t0 = T("b4"), tl = T("limit"), tn = T("note"), tp = T("picks");
  const fill = Math.min(1, ease(now - t0, Math.max(0.6, tl - t0 + 0.3)));
  const hand = ease(now - tn, 0.7);
  const Model: React.FC<{ x: number; name: string; t: number; full?: boolean; active: boolean }> = ({ x, name, t, full, active }) => (
    <Panel x={x} y={420} w={420} h={330} t={t} border={active ? TH.ink : undefined}>
      <div style={{ position: "absolute", left: 30, top: 36 }}><Mono s={20}>MODEL</Mono></div>
      <div style={{ position: "absolute", left: 30, top: 76, fontFamily: SERIF, fontSize: 52, color: TH.ink }}>{name}</div>
      <div style={{ position: "absolute", left: 30, right: 30, top: 190, height: 26, borderRadius: 13, background: "rgba(255,255,255,0.15)" }}>
        <div style={{ width: `${(full ? fill : 0.08) * 100}%`, height: "100%", borderRadius: 13, background: full && fill > 0.95 ? RED : "#ffffff" }} />
      </div>
      <div style={{ position: "absolute", left: 30, top: 240 }}><Mono s={22} c={full && fill > 0.95 ? "#ffd2d2" : TH.dim} w={800}>{full && fill > 0.95 ? "LIMIT HIT" : "READY"}</Mono></div>
    </Panel>
  );
  return (
    <>
      <Head t={now - t0} a="It" i="switches." top={200} size={96} />
      <Model x={70} name="Model A" t={now - t0 - 0.1} full active={now < tn} />
      <Model x={590} name="Model B" t={now - t0 - 0.25} active={now >= tn} />
      {now >= tn - 0.1 ? (
        <div style={{ position: "absolute", left: 200 + hand * 510, top: 800 - Math.sin(hand * Math.PI) * 120, transform: `rotate(${-6 + hand * 10}deg)`, opacity: c01((now - tn + 0.1) / 0.15) }}>
          <div style={{ width: 300, padding: "18px 22px", borderRadius: 12, background: "#ffe27a", boxShadow: "0 16px 30px rgba(0,0,0,0.25)" }}>
            <div style={{ fontFamily: F.mono, fontSize: 18, letterSpacing: 2, color: "#5c4a00" }}>HANDOFF NOTE</div>
            <div style={{ marginTop: 10, fontFamily: F.body, fontSize: 24, color: "#2b2200", lineHeight: 1.3 }}>Building checkout.tsx. Next: the pay button.</div>
          </div>
        </div>
      ) : null}
      {now >= tp - 0.1 ? (
        <Panel x={110} y={1060} w={860} h={250} t={now - tp} label="YOUR CHAT · ILLUSTRATIVE">
          <div style={{ position: "absolute", left: 28, right: 28, top: 76, fontFamily: F.mono, fontSize: 28, color: TH.ink, lineHeight: 1.6 }}>
            <div>● {typed("Picking up from the note: adding the pay button...", now - tp - 0.1, 34)}</div>
          </div>
          <div style={{ position: "absolute", right: 28, top: 22 }}><Mono s={18} c={TH.ink}>MODEL B</Mono></div>
        </Panel>
      ) : null}
    </>
  );
};

// 5. More than Claude Code: Codex, Cursor and Cline plug into the hub; then pull back, it runs on your own computer
//    (Vishnu, 2026-11-07: the catch line out, this in; the project's client list and local-first setup)
const b5: B = (now, T) => {
  const t0 = T("b5"), tc = T("codex"), tp = T("plugin"), to = T("owncomp");
  const tools: [string, number][] = [["Claude Code", t0], ["Codex", tc], ["Cursor", tc + 0.35], ["Cline", tc + 0.7]];
  const back = ease(now - to, 0.7);
  const sc = 1 - 0.42 * back;
  return (
    <>
      <Head t={now - t0} a="More than" i="Claude Code." top={190} size={92} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `translateY(${back * 40}px) scale(${sc})`, transformOrigin: "540px 830px" }}>
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
          {tools.map(([_, t], i) => {
            const y = 470 + i * 150;
            const k = sp(now - t, 200);
            return <path key={i} d={`M 400 ${y + 45} C 520 ${y + 45}, 560 830, 640 830`} stroke={TH.ink} strokeWidth={4} fill="none" strokeDasharray="400" strokeDashoffset={400 * (1 - c01(k))} opacity={0.7} />;
          })}
        </svg>
        {tools.map(([name, t], i) => (
          <div key={i} style={{ position: "absolute", left: 90 - (1 - sp(now - t, 200)) * 160, top: 470 + i * 150, width: 310, height: 90, borderRadius: 24, background: i === 0 ? "#0a0a0c" : TH.card, display: "flex", alignItems: "center", gap: 14, paddingLeft: 24, opacity: c01((now - t) / 0.12), boxShadow: "0 12px 26px rgba(0,0,0,0.18)" }}>
            {i === 0 ? <Img src={claude} style={{ width: 44, height: 44 }} /> : <div style={{ width: 40, height: 40, borderRadius: 10, background: TH.accent }} />}
            <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 36, color: i === 0 ? "#f2f2f5" : TH.ink }}>{name}</span>
            {now >= tp ? <span style={{ marginLeft: "auto", marginRight: 20 }}><Check t={now - tp - i * 0.08} color={GREEN} size={34} /></span> : null}
          </div>
        ))}
        <div style={{ position: "absolute", left: 640, top: 735, width: 200, height: 200, borderRadius: 100, background: "#2f5ff0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.25)", transform: `scale(${0.9 + 0.1 * sp(now - t0 - 0.1, 200)})` }}>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 32, color: "#fff" }}>FreeLLM</span>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 32, color: "#fff" }}>API</span>
        </div>
      </div>
      {now >= to - 0.1 ? (
        <div style={{ position: "absolute", left: 130, top: 590, width: 820, opacity: c01((now - to) / 0.2) }}>
          <div style={{ height: 430, borderRadius: "26px 26px 0 0", border: `8px solid ${TH.ink}`, borderBottom: "none", background: "transparent" }} />
          <div style={{ height: 34, margin: "0 -60px", borderRadius: "0 0 30px 30px", background: TH.ink }} />
          <div style={{ marginTop: 22, textAlign: "center" }}><Mono s={26} c={TH.ink} w={800}>localhost:3001 · ON YOUR OWN COMPUTER</Mono></div>
        </div>
      ) : null}
    </>
  );
};

// 6. Comment FREE; the setup guide card
const b6: B = (now, T) => {
  const t0 = T("b6"), tl = T("link");
  return (
    <>
      <In t={now - t0} style={{ left: 0, right: 0, top: 300, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: TH.card, borderRadius: 999, padding: "18px 40px 18px 18px", boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: TH.line }} />
          <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 48, color: TH.dim }}>Comment</span>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 56, color: TH.ink, letterSpacing: 3, minWidth: 180 }}>{typed("FREE", now - t0 - 0.35, 10)}</span>
        </div>
      </In>
      {now >= tl - 0.4 ? (
        <Card x={150} y={520} w={780} h={760} t={now - tl + 0.4} fill={TH.card} r={34}>
          <div style={{ position: "absolute", left: 44, top: 40 }}><Mono s={22}>SETUP GUIDE · FREELLMAPI + CLAUDE CODE</Mono></div>
          <div style={{ position: "absolute", left: 44, top: 100, fontFamily: SERIF, fontSize: 60, color: TH.ink }}>The link, <span style={{ fontStyle: "italic" }}>and</span> the steps</div>
          {["Install it (Docker)", "Add your free provider keys", "Point Claude Code at it", "What to expect"].map((r, i) => (
            <div key={i} style={{ position: "absolute", left: 44, right: 44, top: 250 + i * 110, height: 90, borderTop: `2px solid ${TH.line}`, display: "flex", alignItems: "center", gap: 18, opacity: c01((now - tl + 0.2 - i * 0.1) / 0.15) }}>
              <Check t={now - tl + 0.1 - i * 0.1} size={40} />
              <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 38, color: TH.ink }}>{r}</span>
            </div>
          ))}
        </Card>
      ) : null}
    </>
  );
};

const BEATS: { key: string; draw: B; world: string; tab: number }[] = [
  { key: "b1", draw: b1, world: "dark", tab: -1 }, { key: "b2", draw: b2, world: "white", tab: 0 }, { key: "b3", draw: b3, world: "amber", tab: 1 },
  { key: "b4", draw: b4, world: "blue", tab: 2 }, { key: "b5", draw: b5, world: "green", tab: 3 }, { key: "b6", draw: b6, world: "white", tab: -1 },
];
const TABS = ["01 THE TOOL", "02 THE TOKENS", "03 THE SWITCH", "04 PLUG IN"];

export const FreeLlm: View = {
  View: ({ t0, at, p, words }) => {
    const now = t0 + useCurrentFrame() / FPS;
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => (k === "b1" ? t0 : parts[k] ? at(parts[k]) - 0.08 : 999);
    const starts = BEATS.map((b) => T(b.key));
    let cur = 0;
    starts.forEach((s, i) => { if (now >= s) cur = i; });
    const prev = W[BEATS[Math.max(0, cur - 1)].world];
    TH = W[BEATS[cur].world];
    const flood = cur === 0 ? 1 : ease(now - starts[cur], 0.45);
    const push = 1 + 0.025 * c01((now - starts[cur]) / 3);
    const tab = BEATS[cur].tab;
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, background: prev.bg, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: TH.bg, clipPath: `circle(${flood * 130}% at 50% 45%)` }} />
        {tab >= 0 ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: 90, display: "flex", justifyContent: "center", gap: 10 }}>
            {TABS.map((l, i) => <div key={i} style={{ fontFamily: F.mono, fontSize: 18, letterSpacing: 2, padding: "8px 14px", borderRadius: 999, background: i === tab ? TH.ink : "transparent", color: i === tab ? TH.bg : TH.dim, border: `2px solid ${i === tab ? TH.ink : TH.dim}` }}>{l}</div>)}
          </div>
        ) : null}
        <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 45%" }}>{BEATS[cur].draw(now, T)}</div>
        {words ? <Captions words={words} now={now} ink={TH.ink} accent={TH === W.white ? "#2f5ff0" : TH === W.dark ? CLAY : TH.accent === TH.ink ? "#ffffff" : TH === W.green ? "#1a9c55" : TH.accent} /> : null}
      </div>
    );
  },
  hits: ({ at, p }) => {
    const parts = (p.parts || {}) as Record<string, string>;
    const T = (k: string) => at(parts[k]);
    const soft = 0.62;
    return [
      { t: T("free"), sound: "whoosh", gain: 0.28 }, { t: T("free") + 0.05, sound: "subdrop", gain: 0.35 },
      { t: T("b2"), sound: "swish", gain: 0.2 * soft }, { t: T("between"), sound: "pop", gain: 0.15 * soft },
      { t: T("b3"), sound: "swish", gain: 0.2 * soft }, { t: T("billion") + 0.2, sound: "ding", gain: 0.18 * soft },
      { t: T("b4"), sound: "swish", gain: 0.2 * soft }, { t: T("note"), sound: "click", gain: 0.2 * soft },
      { t: T("b5"), sound: "swish", gain: 0.2 * soft }, { t: T("plugin"), sound: "pop", gain: 0.18 * soft }, { t: T("owncomp"), sound: "sweep", gain: 0.18 * soft },
      { t: T("b6") + 0.35, sound: "typing", gain: 0.15 * soft },
    ];
  },
};
