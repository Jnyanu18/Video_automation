# Scene catalogue

Every scene and prop in the template, with its file. Coordinates are 1080x1920 composition pixels.

## Backgrounds (`src/world/scenes.tsx`)

| Name | What | Notes |
|---|---|---|
| `Landscape` | cream sky bands, striped sun, teal halftone hills (misreg), navy ground, runway dashes | `horizon`, `sun=[x, y, r]`; source film: horizon 1200, sun (800, 960, 180) |
| `Night` | cream top, mustard halftone sun + 22 static orange rays, navy ground from y 1200 | crossfades in over 0.35 s at a beat |
| `Back5` | Landscape, then Night from `B.delhi.s - 0.2` | one set change per film is enough |

## Hero objects (`src/world/rocket.tsx`)

| Prop | Origin / size | Notes |
|---|---|---|
| `Booster` | bottom centre, 96 x 310 | cream steel, teal halftone shade side, orange band, grid fins (`fins` 0..1), vertical "SUPER HEAVY", `flame` length |
| `Ship` | bottom centre, 96 x 250 | nose cone, orange forward/aft flaps, mustard window |
| `Flame` | origin at the nozzle, pointing down | three nested teardrop inks, flicker from `fr` |
| `Arms` | pivot on the tower face | chopsticks: `k` 0 open (30 deg) -> 1 closed; use `popS(t, at, 9)` for a springy SNAP with overshoot |
| `Tower` | ground at tower centre, `TOWER_H` 680 | braced lattice (navy halftone), launch mount, two arm pairs at `yLow`/`yHigh`; children drawn between tower and arms |
| `SnapBurst` | centre of the clamp | 9 radial ink strokes + "SNAP!" for ~0.45 s |
| `Smoke` | ground at the launch point | 22 seeded billow puffs (cream with mustard/orange halftone), `amt` grow, `fade` |
| `TowerScene` (scenes.tsx) | right column, `translate(790 1296) scale(0.46)`, clipped to the column | the whole launch -> booster catch -> ship flip -> catch sequence driven by `T.launch`, `T.boosterBack`, `T.snap1`, `SHIP_IN`, `SHIP_FLIP`, `SNAP2` |

## Globe and routes (`src/world/globe.tsx`)

| Prop | Notes |
|---|---|
| `Globe v={cx, cy, R, lon0, lat0}` | orthographic; graticule, mustard continents with orange halftone, navy halftone night crescent, orange offset disc behind (misreg feel). Static: do not spin |
| `Arc a b v p` | dotted great-circle route lifted by `lift`, drawn to progress `p`, `MiniRocket` at the head; hidden-side points are skipped |
| `CityDot`, `Dot` (scenes) | city markers, optional label pill |
| `CITY` | SEA, DEL, NYC, LON, TYO, DXB, PAR, BJS, SIN, MOW, MEX, SFO, LOS, CHI ([lon, lat]); add more as needed |
| `GlobeBadge` (scenes) | the globe in a navy/teal round badge with a mustard ring and cream stars, top band right (`VIEW` cx 702, cy 528, R 168) |

## Widgets (`src/world/widgets.tsx`)

| Prop | Notes |
|---|---|
| `Dial` | semicircular gauge in years (0-25), highlighted band, needle; good for "Elon time vs my time" comparisons (hold >= 2.5 s) |
| `BoardingPass` | 600 x 300 landscape "ROCKET MAIL · BOARDING PASS", SEA -> DEL, optional "MADHAV'S PREDICTION" stamp |
| `VPass` (scenes) | the vertical boarding pass for the right column |
| `Calendar` | tear-off card; `flip` runs pages through years; label + sub |
| `PriceTag` | swinging tag "$$$$$" with strike and a stamp (keep `swing` 0: calm) |
| `Burst` | starburst with condensed text ("HELL YEAH!") |

## Cards, chips and type (`scenes.tsx`, `kit.tsx`)

| Helper | Notes |
|---|---|
| `Hook` | frame-0 headline, exactly his spoken hook, three lines left-aligned (navy / teal / orange), under the series tag |
| `ATag` | pill with a circled "A" + "MY ANSWER" / "SPACEX'S GOAL" |
| `Chip` | navy fact card, mustard head, cream lines (auto-condensed); used for PLAN:, MY TAKE:, REALITY CHECK |
| `Slap` | rotated stamp label |
| `Ink`, `Badge`, `Stamp`, `starPath` | kit type and era objects |
| comparison panels | "ROCKET REUSED = A PLANE" (two cream cards + navy "=" disc + orange strip) |
| `Car`, `House`, `Store`, `LoopArrow` | the road-card analogy: home -> grocery -> back home -> again tomorrow; a row of three cars with $$$ tags for "a new car every trip" |
| end card | cream speech bubble "YOUR TURN / WOULD YOU RIDE ONE?", "COMMENT BELOW" pill, "FOLLOW FOR MORE", "AI NEWS" starburst, `HANDLE` pill |

## IG format (`src/world/ig.tsx`)

`SeriesTag` (frame 0 to the end) and `IGQuestion` (anonymous DM card, `a..b` window, exact text) are
HTML over the SVG, mounted in `world.tsx`'s `Front`.

## Captions (`src/world/world.tsx`)

`Caption`: Archivo Black on a cream label, navy text and 3 px border, 7/8 px hard orange shadow,
emphasis words orange, unspoken words at 45% opacity; auto-fits 42 -> 32 px to <= 3 lines in the
right column, and shifts left if one word is too wide.

## Scene order in the source film (Front5)

hook (headline + HELL YEAH burst, tower launch) -> q (IG DM card; booster returns, low arms SNAP) ->
plane (MY ANSWER, ROCKET REUSED = A PLANE, DON'T THROW IT AWAY strip; ship flips, high arms SNAP;
PLAN: CATCH BOTH STAGES chip; MY TAKE: BEST THING!) -> car (road card, YOU DON'T LEAVE IT THERE, BACK
HOME, loop; right column rocket = your car, AGAIN TOMORROW calendar) -> buy (A NEW CAR EVERY TRIP? three
cars; DOESN'T MAKE SENSE) -> goal (SPACEX'S GOAL, THE BEST REUSABLE ROCKET; NEXT UP STARSHIP FLIGHT 15
chip) -> delhi (night board, globe, SEA->DEL then DEL->MEX arcs, SEATTLE TO DELHI text, boarding pass,
REALITY CHECK chip) -> ten (MADHAV'S PREDICTION, IN 10 YEARS, EVERYWHERE, six city arcs) -> end card.
