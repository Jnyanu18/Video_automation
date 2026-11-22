import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAY, CLAY_FONT, Pop, clay } from "./clay";
import { PanelBeat, Shot } from "./split";

// style: clay with layout: split (Vishnu, 2026-10-23): one look for the whole feed, claymorphism, with paper
// cutout kept only for the screenshots of posts. Too many styles in one video read as inconsistent.

const ClayRoom: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = "#E9DDFB" }) => (
  <AbsoluteFill style={{ background: bg, alignItems: "center", justifyContent: "center", padding: "50px 60px", fontFamily: CLAY_FONT, color: CLAY.ink }}>
    <div style={{ ...clay("#FFD6A8", 999), position: "absolute", width: 300, height: 300, right: -110, top: -90 }} />
    <div style={{ ...clay("#BFF0D4", 999), position: "absolute", width: 200, height: 200, left: -80, bottom: -60 }} />
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 26, width: "100%" }}>{children}</div>
  </AbsoluteFill>
);
const pill = (i: number) => CLAY.fills[i % CLAY.fills.length];
const fit = (s: string, max: number) => Math.min(max, 1700 / Math.max(4, s.length));

const ClayKinetic: React.FC<{ parts: string[] }> = ({ parts }) => (
  <ClayRoom>
    {parts.map((raw, i) => {
      const hot = raw.startsWith("*");
      const line = hot ? raw.slice(1) : raw;
      return (
        <Pop key={i} delay={i * 5} tilt={i % 2 ? 2 : -2}>
          <div style={{ ...clay(hot ? "#FFF0B8" : "#F7F2FF", 50), padding: "10px 44px", fontWeight: 700, fontSize: fit(line, hot ? 170 : 120), lineHeight: 1.1, whiteSpace: "nowrap" }}>{line}</div>
        </Pop>
      );
    })}
  </ClayRoom>
);

/** The terminal, in clay: an app window whose lines pop in one by one; a line starting with ! is the warning. */
const ClayTerm: React.FC<{ parts: string[] }> = ({ parts }) => {
  const { durationInFrames } = useVideoConfig();
  const step = Math.max(5, Math.floor((durationInFrames * 0.55) / parts.length));
  return (
    <ClayRoom>
      <Pop>
        <div style={{ ...clay("#F7F2FF", 50), width: 920, padding: "26px 34px 34px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
            {["#FFB4C8", "#FFF0B8", "#BFF0D4"].map((c) => <div key={c} style={{ ...clay(c, 999), width: 30, height: 30 }} />)}
          </div>
          {parts.map((raw, i) => {
            const warn = raw.startsWith("!");
            const line = warn ? raw.slice(1) : raw;
            return (
              <Pop key={i} delay={4 + i * step} tilt={warn ? -2 : 0}>
                <div style={{ ...clay(warn ? "#FFB4C8" : i === 0 ? "#C9E4FF" : "#ffffff", 28), padding: "10px 26px", fontWeight: warn ? 700 : 600,
                  fontSize: warn ? 56 : fit(line, 54), whiteSpace: "nowrap", overflow: "hidden" }}>{line}</div>
              </Pop>
            );
          })}
        </div>
      </Pop>
    </ClayRoom>
  );
};

/** The alert, in clay: a big wobbling pink blob with the shout in it, and the detail on a pill under it. */
const ClayAlert: React.FC<{ parts: string[] }> = ({ parts }) => {
  const frame = useCurrentFrame();
  const wob = frame < 16 ? Math.sin(frame * 1.6) * (16 - frame) * 0.5 : 0;
  return (
    <ClayRoom bg="#FFE3EC">
      <div style={{ transform: `rotate(${wob}deg)` }}>
        <Pop tilt={-3}>
          <div style={{ ...clay("#FFB4C8", 90), padding: "30px 70px", fontWeight: 700, fontSize: fit(parts[0], 190), lineHeight: 1, textAlign: "center", whiteSpace: "nowrap" }}>{parts[0]}</div>
        </Pop>
      </div>
      {parts[1] ? (
        <Pop delay={8} tilt={2}>
          <div style={{ ...clay("#ffffff", 40), padding: "16px 36px", fontWeight: 600, fontSize: 54, textAlign: "center", maxWidth: 920 }}>{parts[1]}</div>
        </Pop>
      ) : null}
    </ClayRoom>
  );
};

/** The number, in clay: a big butter tile counting up, its label under it, the source on a small pill. */
const ClayCount: React.FC<{ parts: string[] }> = ({ parts }) => {
  const frame = useCurrentFrame();
  const m = parts[0].match(/^(\D*)([\d.]+)(.*)$/);
  const target = m ? parseFloat(m[2]) : 0;
  const dec = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const v = m ? interpolate(frame, [0, 16], [0, target], { extrapolateRight: "clamp" }) : 0;
  return (
    <ClayRoom>
      {parts[2] ? (
        <Pop tilt={-3}>
          <div style={{ ...clay("#FFD6E7", 999), padding: "8px 30px", fontWeight: 600, fontSize: 40 }}>{parts[2]}</div>
        </Pop>
      ) : null}
      <Pop delay={3} tilt={2}>
        <div style={{ ...clay("#FFF0B8", 70), padding: "10px 80px", fontWeight: 700, fontSize: 300, lineHeight: 1.05 }}>{m ? `${m[1]}${v.toFixed(dec)}${m[3]}` : parts[0]}</div>
      </Pop>
      <Pop delay={8}>
        <div style={{ ...clay("#ffffff", 36), padding: "12px 34px", fontWeight: 600, fontSize: 52, textAlign: "center", maxWidth: 940 }}>{parts[1]}</div>
      </Pop>
    </ClayRoom>
  );
};

/** The checklist, in clay: each step pops in on a pill with its tick. */
const ClaySteps: React.FC<{ parts: string[] }> = ({ parts }) => {
  const { durationInFrames } = useVideoConfig();
  const step = Math.max(6, Math.floor((durationInFrames * 0.5) / parts.length));
  return (
    <ClayRoom>
      {parts.map((l, i) => (
        <Pop key={i} delay={i * step} tilt={i % 2 ? 2 : -2}>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <div style={{ ...clay(pill(i + 2), 999), width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 70 }}>
              {i + 1}
            </div>
            <div style={{ ...clay("#F7F2FF", 44), padding: "14px 44px", fontWeight: 700, fontSize: 96 }}>{l.replace(/^\d+\.\s*/, "")}</div>
          </div>
        </Pop>
      ))}
    </ClayRoom>
  );
};

/** What to run, in clay: one pill per row, the name on a coloured chip. Rows are "Name: detail". */
export const ClayVersions: React.FC<{ parts: string[]; title?: string; tall?: boolean }> = ({ parts, title = "Run at least", tall = false }) => (
  <ClayRoom>
    <Pop tilt={-2}>
      <div style={{ ...clay("#FFD6E7", 999), padding: tall ? "16px 50px" : "8px 40px", fontWeight: 700, fontSize: tall ? 90 : 60 }}>{title}</div>
    </Pop>
    {parts.map((row, i) => {
      const [name, ...rest] = row.split(":");
      return (
        <Pop key={i} delay={4 + i * 4}>
          <div style={{ ...clay("#F7F2FF", 34), width: 960, padding: tall ? "16px 22px" : "8px 16px", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ ...clay(pill(i), 26), padding: "6px 20px", fontWeight: 700, fontSize: tall ? 50 : 40, width: tall ? 250 : 210, textAlign: "center", flexShrink: 0 }}>{name.trim()}</div>
            <div style={{ fontWeight: 600, fontSize: tall ? 46 : 38 }}>{rest.join(":").trim()}</div>
          </div>
        </Pop>
      );
    })}
  </ClayRoom>
);

export const ClayPanel: React.FC<{ beat: PanelBeat }> = ({ beat }) => {
  const p = beat.parts;
  switch (beat.look) {
    case "shot":
      return <Shot parts={p} />;
    case "term":
      return <ClayTerm parts={p} />;
    case "alert":
      return <ClayAlert parts={p} />;
    case "count":
      return <ClayCount parts={p} />;
    case "doodle":
      return <ClaySteps parts={p} />;
    case "versions":
      return <ClayVersions parts={p} />;
    default:
      return <ClayKinetic parts={beat.look === "kinetic" ? p : [beat.look, ...p]} />;
  }
};
