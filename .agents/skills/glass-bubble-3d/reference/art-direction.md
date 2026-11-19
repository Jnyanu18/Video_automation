# Art direction: Glass Bubble 3D

## The idea in one line
One big real-glass bubble is the topic ("the AI boom"). What the presenter says happens *to* it or *inside* it.

## Palette
| Role | Colour |
|---|---|
| Studio sky (bottom -> top) | `#010104` -> `#040618` (shader), page background `#02040c` |
| Studio softbox (up-left) / magenta wash (low right) | dim blue `rgb(.03,.07,.14)` / `rgb(.13,.02,.10)` added in `studioMaterial` |
| Iridescence (film, chips, emphasis) | cyan `#5ee7ff` / `#7df3ff`, magenta `#ff5fd2` / `#ff7ad9`, gold `#ffc94a` / `#ffd36a` |
| Coins, money glow | `#ffb627` |
| Success / done | mint `#4dff9d` |
| Glass chip body | `linear-gradient(180deg, rgba(14,22,56,.84), rgba(6,10,30,.78))`, 2 px border in the meaning colour at .7, glow .32 |
| Planet | navy glass `rgb(.02,.05,.16)` -> violet, iridescent rim, gold meridians + market dots (only when `uGrid` > 0) |
| IG elements (from news-qa-reel) | IG gradient pill, DM bubble `#a033ff -> #6a5cff -> #2f8bff`, card `rgba(16,16,22,.95)` |

Colour = meaning: cyan = Madhav / now / the AI agent, gold = money / his take / headline accent, magenta = the AI
stamp / "pop" / risk. Keep one meaning per colour inside a film.

## Type
- `UI_FONT` = "Segoe UI" 700-800 (local system font: Windows has it; nothing is downloaded at render time).
  On another OS replace it in `world/tex.ts` with a local or `@remotion/google-fonts` face and re-check widths.
- `CODE_FONT` = Consolas for the canvas code editor.
- Headline 92-96 px / 800 / -0.03em; DM question 66-80 px; chips 32-52 px; captions 54 -> 42 px.
- Gradient text (`IRI_GRAD`) only on the one key phrase of the hook and the end title.

## Materials (all in `world/bubble-mats.ts` + `world/mats.ts`)
- **Shell**: additive, premultiplied `ShaderMaterial`; thin-film interference (`thinFilm(cosT, thickness)`, n = 1.33,
  thickness 200-760 nm from fbm swirl, thinner at the top), fresnel `pow(1-cosT, 2.4)`, two specular window
  highlights, a blue rim, vertex wobble/ripple, and a jagged crack line that can turn gold (`uCrackGold`).
- **Planet**: normal-blended, opacity `uHard`; replaces the shell as the bubble "hardens".
- **Studio**: a 400-unit inverted sphere following the camera; **floor**: a disc under the bubble with an
  iridescent pool that warms with money.
- **City**: instanced boxes (`MeshStandardMaterial`, emissive navy), lit windows and LEDs as `GlowPoints`,
  edges as additive `LineSegments` (`edgeMat(colour)`), floating chips (`RoundedBoxGeometry`) with gold pins.
- **Objects**: low-poly navy bodies + glowing edges (robot, hospital, car, capsule + molecule, laptop).
- **Desk**: clear-coated physical desk top, dark bezel monitor with a live canvas-texture editor, mug, keyboard
  LEDs, an AI agent orb (icosahedron + halo + orbiting points), a moon sprite for "every single night".

## Hero object rules
- The bubble is present in almost every beat (right column or filling the top band). It never pops.
- One state change per beat: inflate (money), stretch + wobble + crack (tension), host the desk (job story),
  harden into the planet (conclusion). The crack stays visible afterwards and seals in gold when it hardens.

## Motion vocabulary
- `popS(t, at, 13-15)` for chips and icons; `progS` for fades, bars and threads; `win(t, a, b)` for in/out windows.
- Camera: a cut (`cut()` helper: two keys 1 ms apart) or one 0.6 s eased move per beat change.
- Typing: the editor canvas types the human's lines, then the agent streams its lines from `AGENT_T()`.
- Stamps: magenta "AI" box, `rotate(-9deg) scale(1.6 -> 1)` over 0.22 s, on the word.
- `tw(t)` freezes all world time at `FREEZE = END - 0.45` so the end holds still.

## What not to do (from his notes)
- No zoom, slide or punch on his footage; no camera move that pushes toward his face.
- No perpetual wobble, bob, drift, orbiting end camera or floating motes.
- No illustrative labels that look like data (market names, numbers) unless he said them or they are sourced.
- No shimmer on captions or text; emphasis is a solid colour.
