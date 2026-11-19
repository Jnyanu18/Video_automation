# Art direction: Vector World

From the quantum film (`film-v6/ART-BIBLE.md`, `STORYBOARD.md`, `style-frames/NOTES.md`, the v2-v6
review loop). Rich colour, gradients and glow are welcome when they make the
teaching clearer. Pick a new palette per film if the topic wants it; keep the rules.

## Look

- **Flat-vector picture book in SVG**, drawn in code (Remotion): soft shapes, gradients used for
  light, one cosy world the camera drifts through. Everything is **original**:
  our own world, characters and motifs; never borrow another studio's characters or assets.
- **World (quantum):** an indigo/violet observatory-study at night (`kit/room.tsx`, `Study` in
  `scenes-example/stage.tsx`): wall + porthole window onto a ringed planet and night sky, plant, table,
  mug and near leaf as out-of-focus foreground, a top-down desk for the maze beats, and space for scale.
- **Depth:** foreground / subject / background, parallax `Layer`s, a camera that rarely stops
  (`Camera` keys + `handheld`). Flat style gets depth from overlap, scale and value.
- **Finish** (`kit/finish.tsx`): bloom on anything bright, soft vignette, moving fine grain (prevents
  banding in dark gradients after Instagram recompresses).

## Palette (`kit/palette.tsx` `C`), one meaning per accent

| Colour | Hex | Meaning |
|---|---|---|
| ink / wall | `#120A33`, `#1E1550` -> `#3A2779` | the night world |
| **gold** | `#FFCB57` (hi `#FFE38A`, deep `#C46F1D`) | the hero object, the right answer, the one hot light |
| **teal** | `#35C3B4` (hi `#8FF3E3`) | the mechanism (waves, links, cold, "gate = an operation") |
| **coral** | `#FF6B5A` | the myth, wrong, cancel |
| rose / lilac | `#F2678E`, `#CFC4F5` | world props only |
| cream / white | `#FFF4D6`, `#FFF8EC` | type |

Captions use the same meanings (`em`: gold / coral / teal / big). Neutral words stay neutral
("SUPERCOMPUTER" and "60" were wrongly teal/gold once).

## Type

Barlow Condensed 800 for hero numbers and headlines (`COND`), Nunito 900 for captions and labels
(`NUNITO`), Google Sans only for a real brand lockup (editorial use). Loaded with
`@remotion/google-fonts` and explicit weights (not ad-hoc CDN links). At most ~8 words of on-screen
text besides captions; real names and numbers only; labels >= ~38 px on 1080 wide.

## Light

One brightest thing per shot, and it lights its surroundings (table pools, wall wash, rim on
props). Glow only where a light source is. `transitions.ts` `CUT_GLOWS` carry the pushed-through
object's light across a cut as a local radial glow, never a flat full-screen flash.

## The hero object: the coin

`kit/coin.tsx`: heads = 1, tails = 0, hand-drawn numerals (no font), bead ring, specular sheen,
faces drawn in a unit space and foreshortened together; `SpinCoin` has a real spin cycle (rx squash
+ face swap + precession, moving contact shadow) and `SpinArcs` speed arcs. Planted on the desk in
the hook, it becomes the bit, spins as the qubit, falls into the maze, links into the chain, flies to
the galaxy, and returns as the end card (FOLLOW coin). Every new film needs one hero object that can
carry the throughline this way.

## Scene vocabulary from the quantum film (`template/src/scenes-example/`)

| Act | Picture | Teaching device |
|---|---|---|
| hook: **chip race** | Willow-style 105-qubit chip in a gold holder inside a stopwatch bezel in a supercomputer hall; "5 MIN vs 10 SEPTILLION YEARS"; exact 10^25 odometer that freezes once its digits slot in; deep-time tape (T-rex 66 MILLION, the Sun dies 5 BILLION, galaxy 13.8 BILLION, x 725 TRILLION); footnote "Willow, Dec 2024 · benchmark task" | a real, named hook object + an honest comparison at true scale |
| bits: **laptop -> bits -> coin** | pull out of the laptop screen, x-ray the deck, dive into a field of flickering 0/1 switches, the hero switch shows 0 then 1, pops out as the coin and lands flat (heads / tails) | zoom from the familiar into the mechanism |
| qubit: **spinning-coin superposition** | the coin is flicked onto its edge and spins (trail, arcs, light sweeping the room); a hand taps it ("gate = an operation"); gold/teal ripples and a soft sphere on "superposition" | a physical metaphor with a real motion cycle |
| myth: **maze + desk lamp "look"** | top-down maze board; mouse clones flood every corridor; freeze + big coral NO. stamp on "No."; the desk lamp clicks on for "look"; ghosts vanish; the coin drops into one dead end; red X | the myth shown, then broken |
| interference: **wave interference** | lamp off, the coin glows teal as the source; waves flood the corridors; wrong branches flatten (cancel), the solution path stacks gold; lamp on, coin lands on the exit ("EXIT = ANSWER" tag) | the real mechanism on the same board |
| pool: **pool analogy** | his own analogy: two kids splash in a night pool; wave trains with equal length/width brackets; in sync -> bigger gold wave (right answer), out of sync -> cancel (wrong answers, coral); probability pillars rise | his words staged literally, comparison held >= 3 s |
| scale: **linked coins + exact 2^50 counter** | five coins link with teal threads and spin as one; chain to 50; 1,125,899,906,842,624 rolls up exactly; fly through the porthole: **galaxy**, "300 QUBITS", atom haze | exact numbers, then cosmic scale |
| uses | Instagram-like "Photogram" phone shrugs (no real logo); pixels become a molecule; a padlock cracks | concrete uses and a non-use |
| problems: **hard-problems gallery** | molecule/protein, delivery routes exploding into a tangle, battery lattice, combination lock; the gold **dilution-fridge chandelier** drops in and threads solve each | named problem classes, not "everything" |
| ending | ≠ "faster laptop" ghost; "whole new kind of computer": the chandelier warms, the chip turns, dive into the die | the thesis line as an image |
| aiwave: **AI wave** | AI tiles riding a great wave with the chip on the crest; a neural-net glyph fixes coral qubit errors ("AI-decoded error correction"); a student surfs the wave with a laptop and tosses the coin | the "why you should care" beat |
| cta: **FOLLOW coin** | the coin lands, the maze lights, "NEXT BIG BREAKTHROUGHS" shelf, FOLLOW slams in on "follow", @madhav_somani under it, still end card with glint/motes | a deliberate ending that holds still |

## Finish bar (every shot)

- No more than ~1/4 of the frame flat colour; the picture continues behind captions and behind him.
- Something meaningful changes every 1.5-3 s; actions land on their word within a few frames.
- Comparisons hold >= 3 s with both items visible and labels readable.
- Life: anticipation, overshoot, settle; never linear easing; secondary motion (steam, motes, leaves).
- Every frame from the frame number + seeded `random()`; never `Math.random`/`Date`.
- Transitions through content (push through an object, match on the coin, whip-tilt carrying
  momentum); no crossfades, no flat flashes.
- Watch for: ghosting from opacity fades on solid objects, a recurring object changing scale, an
  empty first frame of an act, an unstable last frame, things teleporting (the coin's return through
  maze walls at 80-130 px/frame became an arc through the air at ~15 px/frame).

## Frame and safe zones (1080x1920 comp, rendered at 4/3)

- Instagram UI: top ~220 px, bottom y > 1500 (keep the bottom band calm), right rail x > 930 at
  y > 1100.
- While he is on screen (lower right): key visuals in the **top stage** (y 230-1120, full width) and
  the **left column**; never a key visual, label or bright light under his face box (`faceBox(fr)`).
  Backgrounds still run full frame behind him.
- Captions: centre layout y 1362-1520; side layout = left column ending 36 px before his face.
