---
name: opus-motion
description: Choose, mix, and integrate 616 parameterised motion graphics, 97 transitions, 148 styles, and 33 ready-made recipes from the Opus Motion Library (Remotion, React, Web, and HyperFrames). Use when selecting motions, animated charts, kinetic typography, HUDs, 3D elements, particle accents, UI cards, or transitions.
---

# Opus Motion Library Skill

The library is located at `j:\ai editor\opus-motion-library`.
Read [`AGENTS.md`](file:///j:/ai%20editor/opus-motion-library/AGENTS.md) there first for decision workflows, layering models, performance guidelines, and anti-patterns.
Detailed guides:
- Intent-to-motion mapping: [`docs/CHOOSING.md`](file:///j:/ai%20editor/opus-motion-library/docs/CHOOSING.md)
- Complete parameter catalog: [`docs/CATALOG.md`](file:///j:/ai%20editor/opus-motion-library/docs/CATALOG.md)
- Transitions catalog: [`docs/TRANSITIONS.md`](file:///j:/ai%20editor/opus-motion-library/docs/TRANSITIONS.md)
- 1-line styles engine: [`docs/STYLES.md`](file:///j:/ai%20editor/opus-motion-library/docs/STYLES.md)
- Stack integrations: [`docs/INTEGRATION.md`](file:///j:/ai%20editor/opus-motion-library/docs/INTEGRATION.md)
- JSON Schema: [`props-schema.json`](file:///j:/ai%20editor/opus-motion-library/props-schema.json)
- Full index: [`catalog.json`](file:///j:/ai%20editor/opus-motion-library/catalog.json)

---

## 1. Quick Discovery CLI (`cli/mgl.mjs`)

Always execute commands inside `opus-motion-library`:
```bash
cd "j:\ai editor\opus-motion-library"

# 1. Suggest motions from a plain-English prompt or brief:
node cli/mgl.mjs suggest "dark hero for an AI coding tool with stats and metrics" --json

# 2. Filter search:
node cli/mgl.mjs suggest "metrics counter" --overlay --category data

# 3. Inspect a motion's props, schema, and roles:
node cli/mgl.mjs info number-counter

# 4. List all 33 ready-made recipes:
node cli/mgl.mjs recipes

# 5. Generate still preview contact sheets:
node cli/mgl.mjs still stamp-slam --at 15,30,60 --out out/preview.jpg
```

---

## 2. The 4-Layer Shot Model

A professional composition stacks up to 4 layers (from bottom to top):

| Role | Responsibility | Typical Opacity | Examples |
|---|---|---|---|
| **Backdrop** | Sets world and mood; quiet, continuous | 0.4 – 1.0 | `aurora`, `starfield-night`, `caustics-godrays`, `city-skyline`, `ken-burns`, `flow-lines` |
| **Subject** | The central focal point of the beat | 1.0 | `browser-mockup`, `sms-thread`, `iso-bar-chart`, `line-draw-on`, `era-dial`, `box-bot` |
| **Type** | Spoken copy / kinetic typography | 1.0 | `blur-in-title`, `mask-rise-title`, `number-counter`, `chapter-header`, `kinetic-captions` |
| **Accent** | Subtle visual life (blend: screen on dark) | 0.4 – 0.8 | `embers` (motes), `star-glint`, `confetti-burst`, `sparkle-burst`, `falling-petals` |
| **Frame** | Finishing grade / HUD border overlay | 1.0 | `film-look` (`overlay:true`), `hud-chrome`, `scene-tag` |

*Golden Rule:* Only ONE primary hero (subject OR headline) per beat. Keep backgrounds dimmed. Accents should be minimal (`count` low, opacity 0.5–0.7).

---

## 3. Motion Families (616 Total)

1. **Titles & Kinetic Type (68 motions):** `blur-in-title`, `mask-rise-title`, `stamp-slam`, `typewriter-code`, `chapter-header`, `glyph-orbit-logo`, `handwrite-on`, `neon-sign`.
2. **Data & Infographics (54 motions):** `number-counter`, `live-chart`, `iso-bar-chart`, `cell-division`, `pair-field`, `metaball-heatmap`, `progress-ring`, `gauge-metric`.
3. **UI, Mockups & Devices (46 motions):** `browser-mockup`, `sms-thread`, `chat-bubbles`, `app-store-preview`, `terminal-window`, `mobile-frame`, `modal-dialog`.
4. **HUD, Sci-Fi & Blueprint (42 motions):** `radial-blueprint`, `compass-construct`, `crosshair-track`, `grid-wireframe`, `target-lock`, `hud-chrome`.
5. **Backdrops & Atmospheres (72 motions):** `aurora`, `caustics-godrays`, `starfield-night`, `flow-lines`, `curl-flow`, `city-skyline`, `topdown-terrain`, `depth-descent`.
6. **Particles, FX & Accents (60 motions):** `embers`, `confetti-burst`, `sparkle-burst`, `fireworks`, `electric-arcs`, `lightning-flash`, `smoke-puffs`.
7. **Shapes, Vectors & Abstract (64 motions):** `line-draw-on`, `gears`, `origami-fold`, `flat-to-3d-sphere`, `onion-skin-arc`, `hex-comb-build`, `rose-curve-trace`.
8. **3D & WebGL (45 motions):** `iso-blocks-3d`, `terrain-build-3d`, `pointcloud-orbit`, `plan-tilt`, `wireframe-build`.
9. **Weather & Nature (38 motions):** `rain-fall`, `snow-drift`, `cloud-flythrough`, `falling-petals`, `water-ripple`.
10. **Character & Story (32 motions):** `box-bot`, `walker-world-scroll`, `crowd-bob`, `sign-drop`, `reaction-faces`.
11. **Image Looks & Photo Treatments (45 motions):** `ken-burns`, `light-sweep`, `duotone`, `film-look`, `pixel-dither`, `glass-pane-grid`, `comic-halftone`.
12. **Transitions (97 transitions):** `glitch`, `iris`, `page-turn`, `ink-blob`, `door-open`, `crt-wipe`, `whip-pan`, `zoom-through`.

---

## 4. Ready-Made Tested Recipes (33 Recipes)

Pre-tested multi-layer compositions available in `recipes/*.json`:
* **Hero Launch & Promo:** `hero-aurora-night`, `hero-paper-sketch`, `hero-blueprint-logo`, `product-launch`, `music-neon-promo`
* **Data & Product Explainers:** `stats-reveal`, `onboarding-steps`, `ocean-explainer`, `history-timeline`
* **Social & Vertical Ads (9:16):** `social-short-captions`, `app-store-preview`, `testimonial-chat`, `testimonial-quote`
* **UI Feedback & Loops:** `success-celebration`, `error-glitch`, `loading-loop`, `event-countdown`, `end-card`

---

## 5. Integrating with Host Projects

### A. Into Remotion Projects (`vishnu-studio`)
Copy only the required motions and their dependencies into the host:
```bash
node cli/mgl.mjs add number-counter blur-in-title --to "../../vishnu-studio/remotion/src"
```

### B. Rendering Directly to Video via CLI
```bash
# Render a single motion:
node cli/mgl.mjs render stamp-slam --props '{"lines":["AILO","2026"],"keyword":"LAUNCH"}' --format portrait --out out/stamp.mp4

# Render with a style preset applied:
node cli/mgl.mjs render number-counter --style blueprint --format portrait --out out/stat-blueprint.mp4

# Render with alpha channel for video overlays (ProRes 4444 or WebM):
node cli/mgl.mjs export confetti-burst --as prores-alpha --format portrait --out out/confetti.mov
```

### C. Web & HyperFrames Embeds
1. **Live Element:** `<script src="opus-motion.element.js"></script><opus-motion recipe="hero-aurora-night" background></opus-motion>`
2. **React / Next.js:** `import { MotionBackground, MotionPlayer } from 'opus-motion-library/web';`
