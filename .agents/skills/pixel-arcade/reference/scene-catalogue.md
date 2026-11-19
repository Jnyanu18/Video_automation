# Scene and prop catalogue (template/src/world)

All screens take `{ t }` (output seconds) and draw inside `<PxLayer>`. v3 coordinates (top band
y 228-630, right column `COL = {x 561, y 640, w 378, h 540}`); rescale for v6 (see SKILL.md).

## Kit: `px.tsx`
| Export | What |
|---|---|
| `C`, `CELL` | palette, 9 px cell |
| `textW`, `textPath`, `PxText`, `ADV` | 5x7 bitmap font: measure, path, draw (align/shadow/outline/glow/chars) |
| `Sprite`, `spritePaths`, `Pal` | char-row sprites with palette and mirror |
| `FIGHTER_IDLE`, `FIGHTER_PUNCH`, `fighterPal("x"\|"p")` | the hero: two mirrored fighters in team palettes |
| `PLAYER` | crowd player holding a controller (palette per player) |
| `COIN` + `coinPal`, `CART`, `HEART` + `heartPal`, `QBLOCK` + `qPal`, `CROWN` + `crownPal`, `LOCK_OPEN`, `FLAG` | props |
| `PxPanel` | neon window |
| `PxBar` | segmented health/progress bar |
| `PxLayer` | full-frame crisp SVG with the bloom filter |
| `CRT` | scanlines + RGB mask + vignette |

## Screens: `scenes.tsx`
| Export | Beat (c6 cue) | Picture | Reuse for |
|---|---|---|---|
| `Backdrop` | all | starfield + neon floor, tinted | every beat |
| `SplitBg` | vs | stepped team split | any X-vs-Y beat |
| `P1Frame` | all | "P1 MADHAV" frame + label behind the cut-out | presenter framing (resize for v6) |
| `Hook` | 0 | frame-0 headline (3 lines) -> GAME NEWS · 2026 card at ~3.2 s; PATCH v2026 column whose lines appear on "cheaper" / "brand new" | news hooks, "what changed" lists |
| `Ceo` | "Asha" | NEW CEO card (crown, big name) + SINCE FEB 2026 on "February"; PREVIOUS CEO card + RETIRED stamp on "retired" | people/role changes |
| `Question` | "is Xbox losing" | CHOOSE YOUR PATH menu, cursor on "losing" / "preparing"; fighter with ? -> ! | either/or questions |
| `Fight` + `Spark` | "I would think" | health bars, 99 timer, VS -> ROUND 1 ("gonna") -> FIGHT! ("fight"); fighters trade one equal hit each | rivalries, competition |
| `Crowd` | "gaming is not" | GAMING IS NOT / GOING ANYWHERE / PEOPLE STILL LOVE GAMES ♥; 20 players in two waves; controllers light on "play games"; hearts on "love" | audience, demand, community |
| `Studios` (+ `STUDIO` sprite) | "and Microsoft" | headline + TEAM ROSTER of 9 unnamed pixel buildings lighting on "biggest studios" | portfolios, assets owned |
| `Cheap` | "making" | MAKING GAMES / DEV COST bar drains / CHEAPER ↓ / MADHAV'S TAKE; coin stacks shrink; FACT CHECK chip | costs, prices, opinion + fact chip |
| `Titles` | "I think Xbox" | NEXT LEVEL: / XBOX WILL HAVE / MORE TITLES +; ? block bump on "lot more"; 16 cartridges arc into a stack | growth, "more of X", power-ups |
| `MarketMap` | "they just" | CAPTURE THE MARKET, race bars, READY? / GO! / RIVAL ENTERED!; 7x9 territory map spreading green then blue, flags | market share, races, expansion |
| `Comment` | "team Xbox" | TEAM XBOX / OR / TEAM PLAYSTATION?; IG-style comment bubble (no names/counts), COMMENT BELOW ↓, ADD COMMENT field | comment prompts |
| `EndCard` | OUTRO.t - 0.3 | title question, GAME OVER? struck -> NO - CONTINUE, 1ST @MADHAV_SOMANI; FOLLOW FOR MORE (on "Follow") + AI NEWS (+0.7 s) + coin; static last 0.4 s | every ending |

Helpers in scenes.tsx: `snap`, `COL`/`CX`, `appear`, `slideIn`.

## World wiring: `world.tsx`
- `SCENES` maps beat id -> screen. `Back` picks the screen with `beatAt(t)`, draws `Backdrop`
  (or `SplitBg` for `vs`), `P1Frame`, the screen with a 0.12 s fade-out, then `CRT k 0.8`.
- `Front` = `CRT k 0.25` only (v6: add the series tag / DM card here or use the shell's).
- `Caption`: bitmap words, wrap to `r.w`, scale 6 (use 5 for v6's 258 px column), black outline,
  unsaid words at 45%, emphasis colours (`EMPH_COL` per team word, else yellow for `EMPH_WORDS`).
- `cutoutFilter`: soft dark drop shadow.

## Timing, beats, events
- `timing.ts`: `T.*` = every cue the screens use (`cue("phrase", nth?) - lead`), plus `end`,
  `follow`, `aiNews`, `total`.
- `../beats.ts`: one beat per script item (all `SIDE` in v3+, `END` at `T.end`).
- `events.ts`: 16 sound events from the same `T` constants (keywords drive the mixer).
- `emph.ts`: caption emphasis words.
