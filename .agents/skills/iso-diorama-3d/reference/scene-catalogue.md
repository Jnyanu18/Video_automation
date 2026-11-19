# Scene catalogue (first film: "Robots will take these jobs first")

All paths are under `template/src/`. Tile coordinates: grid (gx, gz), spacing `SP = 4.2`; screen
right = +x -z, screen down = +x +z. Tile-local coordinates: centre 0, slab top y = 0, `HALF = 1.85`.

## Island layout (`world/cam.ts` `TILE`)

| Grid | Tile | Component (`world/tiles.tsx`) | What happens |
|---|---|---|---|
| (1,1) | food delivery | `FoodTile` (ring road, `Scooter`) | rider swaps to a robot, drives ~2 s, parks |
| (0,1) | car driving | `CarTile` (`Car`, human/robot heads) | driver swaps; car drives once then parks |
| (-1,1) | warehouse | `WareTile` (`Crate` stacks) | worker swaps on the supply-chain line |
| (-1,0) | coal mine | `CoalTile` (rock, rails, cart) | miner with helmet swaps first in the chain |
| (-1,-1) | chai corner (old house tile) | `HouseTile` (`Cup`, benches, kettle table; `CHAI_A/B`, `CHAI_BOT`) | two friends sit, one lifts a cup on "sip", chat dots on "gossip", a robot stands at the edge |
| (0,-1) | jeweller | `JewelTile` (`DIAMOND` anchor) | counter with a diamond; camera close-up on "which diamond"; a customer appears; stays human |
| (1,-1) | art gallery | `GalleryTile` (`paintingTex`, `PAINTING`, `ART_GUY`, `ART_BOT`) | art guy before a painting; camera pushes to the painting on "value of a painting"; a robot walks in with "?" |
| (1,0) | factory line | `FactoryTile` (`FACTORY_SLOTS`) | three workers flip to robots; conveyor runs ~2.4 s on "pattern" then stops |
| (0,0) | plaza | `PlazaTile` (`Squad`, the scale; `SCALE_POS`, `scaleTilt`, `panWorld`) | 3-robot squad on "humanoid robot", 8 walk out radially on "everywhere"; the human-vs-robot scale rises on the question and tips to the robot on "repetitive" |

Shared tile pieces: `TileBase` (coloured slab; a lavender robot flag pops when the tile is taken, a
butter heart flag + warm emissive glow for human tiles at `GLOW`), `Walker` (disabled in v5: swaps are
puff pops), `side()` offset helper.

## Island and decor (`world/scene.tsx`)
`Island` (3 layered rounded slabs, inverted 4-sided rocky cone underneath, floating rocks, cream
paths, edge trees and bushes), `Clouds` (static), `CamRig` (sets the three.js orthographic camera
from `camLive(t)` each frame), lights, sunset lerp.

## Primitives (`world/parts.tsx`)
`C` palette, `clay`, `useLiveMat`, `rbox`, `G`, `Box`, `Ball`, `Cyl`, `Cap`, `Blob`, `FACE_CAM`,
`Human`, `Robot`, `Puff`, `swapAt`, `SwapRobot` (walks beside the worker, hops in at `ts`), `Tree`,
`Bush`, `Coin`.

## Timing (`world/timing.ts`, `world/times.ts`)
- `T`: every cue the world uses, from the words (hook end, the two read questions with `qEnd()` that
  walks to the end of the `q` words, every keyword).
- `SW` / `CHAIN`: the five supply-chain swaps 0.15-0.2 s apart after "put a humanoid robot";
  `SQUAD`, `NIGHT`, `SCALE`, `BELT`, `GLOW`, `SUNSET`.

## HTML overlays (`world/overlays.tsx`)
| Piece | When / where |
|---|---|
| `SeriesTag` | frame 0 to the end, top-left chip |
| `Hook` | frame 0 headline "ROBOTS WILL TAKE / THESE JOBS FIRST." + coral "Is yours on the list?" pill, until his first question |
| `QBubble` | anonymous IG DM card for each question he reads (exact words, a key phrase in butter) |
| `ATag` | coral "A / MY ANSWER" above the caption column for 1.9 s at each answer start |
| `worldLabels(t)` | all beat pills: HUMANOID ROBOTS, EVERYWHERE, ANYWHERE IN THE SUPPLY CHAIN + the 5-slot chain (MINE > FACTORY > WAREHOUSE > ROAD > DELIVERY, slots fill with robot icons), RUNS 24/7 stamp + moon, HUMAN / ROBOT pan labels (projected from `panWorld`), IT DEPENDS, REPETITIVE, PATTERN-BASED, ART-BASED WORK, THE VALUE OF A PAINTING, HOW WOULD AI KNOW?, HUMAN FEELING + hearts, A ROBOT CAN'T... / SIT WITH US / HAVE A SIP / GOSSIP, THAT VALUE STAYS WITH HUMANS, JEWELLER, WHICH DIAMOND + WHICH PERSON, A ROBOT CAN'T TAKE THAT, MADHAV'S TAKE / THE ARTISTIC TOUCH / STAYS HUMAN stamp, JEWELLER / ART / CHAI list |
| `CommentCard` | IG comment prompt with the exact spoken question, "Comment below" typed on the word |
| `EndCard` | `EndTitle` + follow card + handle |
Helpers: `win(t, a, b)` pop-in/fade-out window, `A()` = `project(t, p)`, `RC()` clamps a projected
label into the top band, `clr()` skips small effects over his head, `ext()` text extrusion.

## Captions (`world/caption.tsx`)
`DioramaCaption`: measures words with a canvas, wraps to the right column at 54/50/46/42 px (max 3
lines), shifts left only if one word is wider than the column; display fixes ("24" "-7" -> "24/7",
"-based" -> "based").

## Sound events (`world/events.ts`)
20 soft events (~22/min): hook card, question cards, squad pop, stream whoosh, chain pops, night
bloom, scale land, pattern whoosh, painting push, hearts chime, sip/gossip pops, diamond chime,
stamp, glow bloom, comment card, follow card.
