# Art direction: Iso Diorama

The feel: a tiny hand-made clay toy town on a floating island, lit by a warm afternoon sun, seen from
a drone in true(ish) isometric. Soft, rounded, pastel, matte. Friendly enough for a jobs/AI topic to
feel hopeful rather than scary.

## Palette (`C` in `template/src/world/parts.tsx`)

| Role | Colour | Notes |
|---|---|---|
| Ground / tile top | teal `#9fdccb`, tealDeep `#7cc6b4` | the island slab |
| Island sides | sand `#f4dca8`, clay `#e2a77f`, rock `#c98f6b` | three layered slabs + an inverted rocky pyramid underneath |
| Accent warm | coral `#ff8a7a` / coralDeep `#ef6b5c` | human shirts, "A MY ANSWER" tag, stamps, scale beam |
| Accent bright | butter `#ffd86b` / butterDeep `#f5bf3c` | caption emphasis pills, human-tile flags, glow |
| Robots | lav `#b7a4f2`, lavDeep `#8f78e0`, lavPale `#e6defc` | capsule body, legs, head |
| Robot visor | `#6ff4ff` (emissive 1.4-1.6) | the only "glowing" thing in daylight; reads at night |
| Paths / plaza | cream `#fff6e6` | thin raised strips between tiles |
| Ink | plum `#3b2f5c` (INK in ui.tsx) | text on light pills, caption extrusion |
| Others | navy `#3b3f6b`, road `#8b93a8`, green `#8fd18a`, greenDeep `#5fb86f`, wood `#c9925f`, coal `#4a4458`, pink `#ffb3c7`, mint, glass |

Tile base colours vary per tile (sand, pink, butter, mint...) so the 3x3 grid reads as distinct places.

## Sky and time of day (`world.tsx`)
- Day sky: CSS linear gradient `#ffe3cf -> #fdf0dc -> #d7eef3 -> #cfd8f6` plus a soft radial sun glow.
- Sunset (end card, from `SUNSET = OUTRO.t - 0.6`): `#ff9f7a -> #ffb98e -> #f59bb0 -> #8f7cc9`; the
  three.js sun colour, hemisphere colours and sun position lerp with it in `scene.tsx`.
- Night (a "runs 24/7" style moment): a multiply overlay `rgba(28,24,78,.78) -> ...` plus 8 small star
  dots and a moon pill; robots keep their visor glow. Fades 0.45 s in / 0.4 s out.
- A faint plum vignette over the canvas keeps the edges calm.

## Materials and geometry
- `clay(color, emissive?, ei)`: cached `MeshStandardMaterial`, roughness 0.82, metalness 0. Never shiny.
- `rbox()` RoundedBoxGeometry (cached), `Box`, `Ball`, `Cyl`, `Cap` (capsule) primitives with
  position/rotation/scale props; `G` = a group.
- `Blob`: a soft radial-texture contact shadow under figures (ambient-occlusion feel) on top of the real shadows.
- Lights: hemisphere (sky `#fff4e8`, ground `#a9d8cf`, 1.5), ambient 0.35, one warm directional sun
  (2.6, 2048 shadow map, bias -0.0004, normalBias 0.02, radius 5, ortho shadow camera +-11).
- Canvas: `orthographic shadows flat`, `dpr={1}`, `alpha + premultipliedAlpha` (the CSS sky shows through).

## Figures
- **Human worker**: navy capsule legs, shirt capsule body, skin-ball hands, round head with a hair cap,
  plum dot eyes and pink cheeks; optional helmet / beret / cap, apron, tool, seated pose.
- **Robot**: lavender capsule body, pale rounded-box head, glowing visor bar, antenna with a coral
  bulb; `walk` phase, `tilt`, `fall` (topples once), `sit`, tool.
- **Swap**: `swapAt(t, ts)` -> human scales out in 0.12 s, a white 9-ball `Puff` ring expands over
  0.45 s, the robot pops in with a spring. That puff on the word is the signature beat.
- Figures face the camera with `ry = FACE_CAM` (pi/4).

## Type and UI (`ui.tsx`, `overlays.tsx`, `caption.tsx`)
- **Fredoka** 500/600/700 via `@remotion/google-fonts/Fredoka` (no font files shipped).
- `Pill`: rounded clay button, darker bottom lip (`0 size*0.16 0` shadow) + soft drop shadow; optional
  icon, sub-line, tail. Labels >= 32-34 px; main pills 40-60 px.
- `Stamp`: big outlined rotated word that lands from scale 1.9 to 1 (e.g. "STAYS HUMAN", "RUNS 24/7").
- Icons drawn in SVG: RobotIcon, HumanIcon, DiamondIcon, Heart, Sparkle, Moon, ChaiIcon, ChatDots.
- Headlines (hook, end title): Fredoka 700, 74-84 px, white with a 3-step plum extrusion
  (`ext(INK)`), key words coloured lav / butter.
- Captions: white Fredoka 700 with a plum extruded edge; emphasis words (emph.ts) on a butter pill
  that pops slightly rotated (-2 deg). Right column, up to 3 lines, 54 -> 42 px.
- IG pieces (news-qa-reel conventions): series tag chip (IG gradient ring, dark fill, paper plane),
  anonymous DM card ("?" avatar, "Anonymous", "IG question", purple-blue gradient bubble with the exact
  question), comment card (no usernames, counts or timestamps). These use Segoe UI / system sans, not Fredoka.

## End card
Island at sunset (camera pulled out), title in the top band ("WHICH JOBS WILL ROBOTS TAKE FIRST?"),
"Follow for more / AI news" white card with a coral "AI news" pill in the right column, the handle
under it. Presenter stays at the left. Static for the last ~0.3 s.
