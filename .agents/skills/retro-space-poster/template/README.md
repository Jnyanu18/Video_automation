# Retro Space Poster film template

Working Remotion code from the first Retro Space Poster film (the SpaceX news Reel, "Seattle to Delhi
in 1 hour. On a rocket?", v6 staging). Copy this folder to `<project>/film/`; do not edit it in place.
It is a **world for the `news-qa-reel` shell**: the shell files are included so the template builds on
its own, but on a real project take `lib.ts`, `presenter.tsx`, `Film.tsx`, `captions.ts` and the spine
from the shell if they are newer.

`npx tsc --noEmit -p .` is clean with `node_modules` installed (`npm install`). With the sample spine,
`dump-beats` / `dump-events` resolve every cue, so the worked example renders as soon as you add media.

## Not included (bring your own)

- Media: `public/vo.wav` (his voice, cut by the shell), `public/proxy-1440.mp4`,
  `public/matte/m0-1440.webm` (VP9-alpha cut-out of the whole clip), `public/bed-retro.wav` (from `audio/mix.py`).
- `node_modules/`, `out/`. Fonts load at render time through `@remotion/google-fonts` (Anton, Archivo Black).
- A CC0 SFX folder for `audio/mix.py` (`SFX_LIB` env var; it needs `rubber-stamp.flac`, `short-whoosh.wav`,
  `card-riffle.flac`, `servo-arm.flac`, or edit `sound_for`).

## Spine files (sample data; replace with the shell's output)

| File | Schema |
|---|---|
| `src/edl.json` | `{segments: [{out, src, len}], intro: null \| {t, dur, text}, outro: {t, dur, text, silent?}, total, frames, items: [{type: "his", q, text}]}`. Seconds; `out` = output time, `src` = time in `proxy-1440.mp4`; `frames` = composition length at 30 fps. `items` is the script in order (`q: true` = a question he reads) |
| `src/words.json` | `[{w, s, e, src, spk, q}]` every spoken word in **output** seconds (`src` = source time, `q` = part of a read question). The outro words are excluded from captions by the shell |
| `src/vo_env.json` | per-frame voice RMS 0..1 (`voLevel(fr)`, missing frames read 0). The sample is truncated |
| `src/mattes.json` | `[{file, srcStart, frames}]` matte windows (the v6 presenter uses one whole-clip matte, `m0-1440.webm`) |

The samples are the source film's script and word timings (one 35.8 s segment, 1073 frames), so
`times.ts` and `beats.ts` resolve. `cue()` throws on a missing or repeated phrase: when the new spine
lands, every stale cue fails loudly; re-point it.

## Files

### Shell (from news-qa-reel; keep in sync with it)
| File | What it is |
|---|---|
| `src/lib.ts` | FPS, W/H, `WORDS`, `EDL`, `OUTRO`, `INTRO`, `FOOT_START`, `cue`/`cueEnd`, `TOTAL`, easing (`prog`, `progS`, `pop`, `popS`, `lerp`, `smooth`), `SoundEvent` |
| `src/presenter.tsx` | v6 staging: still mirrored cut-out bottom-left, `SIDE_S 0.88`, `SIDE_X -80`, `SIDE_Y 234`, right-edge feather, `SIDE_FACE` head box (re-measure per take). Older mode code is kept but unused |
| `src/Film.tsx` | Back -> Presenter -> Front -> Caption, `vo.wav` + bed. `regionFor("SIDE")` = right-column captions (x 692, y 1300, w 258). `WorldDef` = the world interface |
| `src/captions.ts` | automatic chunking (sentence punctuation, pause > 0.35 s, ~4 words / 24 chars), `isEmph` |
| `src/Root.tsx`, `src/index.ts` | registers composition `Film` (1080x1920, 30 fps, `TOTAL` frames) |
| `src/kit/{camera,finish,three-canvas}.tsx` | cstack kit (unused by this world; kept for 3D/camera worlds) |
| `dump-beats.mts`, `dump-events.mts`, `run-dump.mjs` | print beats/chunks and events JSON for the mixer and QA |
| `render_ig.sh`, `qa.sh`, `snap.sh`, `sheet.py` | Instagram-max render + master, QA receipts, stills + contact sheet |
| `audio/dsp.py`, `audio/designed.py`, `audio/mix.py` | DSP, designed SFX, the per-style score + SFX bed (`py audio/mix.py retro`) |

### World kit (reusable; change only to improve it)
| File | What it is |
|---|---|
| `src/world/kit.tsx` | palette, `COND` (Anton) / `BLACK` (Archivo Black), `HANDLE`, halftone patterns `ht(name)`, `PosterDefs` (patterns + `misreg`, `misreg-t`, `poster-shadow` filters), `PaperFinish` grain/vignette, `Ink`, `Badge`, `Stamp`, `starPath` |
| `src/world/rocket.tsx` | `Booster`, `Ship`, `Flame`, `Arms` (chopsticks, k 0 open -> 1 closed), `Tower` (+`TOWER_H`), `SnapBurst`, `Smoke` |
| `src/world/globe.tsx` | orthographic `Globe` (crude continents, graticule, halftone night side), `Arc` (dotted great-circle route with a `MiniRocket`), `CityDot`, `CITY` table, `proj`, `arcPts` |
| `src/world/widgets.tsx` | `Dial` (gauge in years), `BoardingPass` (landscape), `Calendar` (tear-off, flipping years), `PriceTag`, `Burst` (starburst text) |
| `src/world/ig.tsx` | `SeriesTag` (`SERIES` text) and `IGQuestion` (anonymous IG DM card), copied from the shell's v6 reference |

### Worked example (rewrite for every film)
| File | Rewrite |
|---|---|
| `src/beats.ts` | the beat table: `{id, s: cue("phrase") - lead, mode}`; all `SIDE` + `END` in the v6 format |
| `src/world/times.ts` | every animation time as `cue("...")` (+ small offsets) |
| `src/world/scenes.tsx` | `Back5` (landscape -> night board) and `Front5` (every graphic, scene by scene). Helpers inside are reusable: `vis`, `G`, `Hook`, `ATag`, `Slap`, `Chip`, `PlaneIcon`, `LoopArrow`, `Car`, `House`, `Store`, `GlobeBadge`, `Dot`, `VPass`, `fitW`, `TowerScene` |
| `src/world/world.tsx` | wires Back/Front, the IG question window (`IGQuestion a..b` and its text) and the poster `Caption`; `cutoutFilter` = screen-print outline |
| `src/world/events.ts` | sound events from `T` (keywords drive `mix.py`: whoosh, pop, card, snap/click/impact, stamp, page) |
| `src/world/emph.ts` | caption emphasis words |
| `audio/mix.py` | the `retro` style is in `STYLES`; `ARR` per beat id is optional (unknown ids get a default) |

## Instantiate for a new film

1. Copy this folder to `<project>/film/`; `npm install`; drop in the shell's spine (`src/edl.json`,
   `words.json`, `vo_env.json`, `mattes.json`) and media (`public/`).
2. Measure his head box from 3-4 stills and set `SIDE_FACE`.
3. Rewrite `beats.ts`, `times.ts`, the hook text, the `IGQuestion` text and window, `emph.ts`.
4. Stub `Front5` with the hook and one card per beat; `snap.sh` the whole timeline; then build the scenes.
5. `events.ts`, dumps, `mix.py retro`, `render_ig.sh Film <name> public/bed-retro.wav`, `qa.sh`.
   See `../reference/commands.md`.

## Adaptations made in this copy
- `v5.tsx` renamed `scenes.tsx`; the creator handle and series tag are constants (`HANDLE`, `SERIES`).
- Script `PY` defaults to `python` (set `PY=` to your real Python); `mix.py` reads `SFX_LIB`.
- `snap.sh` default composition is `Film`.
- Spine JSONs are samples (see above); no media.
