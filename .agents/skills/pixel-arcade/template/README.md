# Pixel Arcade film template

Working Remotion code from the Pixel Arcade film ("Is Xbox losing to PlayStation? Here's my
take.", 39.7 s, v3). Copy this folder to `<project>/film/`; do not edit it in place. It typechecks
(`npx tsc --noEmit -p .`) and its cues resolve against the sample spine included here.

**Staging note:** `presenter.tsx`, `Film.tsx` and `world/scenes.tsx` are the **v3** staging
(presenter 0.66 scale, captions at x 555). New films must take the **news-qa-reel** shell's v6
`presenter.tsx` / `Film.tsx` / IG components and rescale the screens (see SKILL.md, "the template
is on the v3 staging").

## Not included (bring per project)
- Media: `public/proxy-1440.mp4`, `public/matte/m0-1440.webm` (whole-clip cut-out of his take),
  `public/matte/idle-m1440.webm` (his silent "listening" footage for ElevenLabs lines),
  `public/vo.wav`, `public/bed-arcade.wav`. The news-qa-reel shell builds all of them.
- `node_modules/`, `out/`. No fonts are needed (the font is drawn in code).

## Files

### Shell (from news-qa-reel; replace with its current version)
| File | What |
|---|---|
| `src/lib.ts` | FPS/W/H, `WORDS`, N-segment `EDL` from `edl.json`, `srcAt`, `outOf`, `cue`, `cueEnd`, `OUTRO`, `INTRO`, `TOTAL`, easing (`prog`, `progS`, `pop`, `popS`, `lerp`, `smooth`), `SoundEvent` |
| `src/presenter.tsx` | v3: always the still mirrored cut-out bottom-left; real take vs idle matte per EDL segment (`idle`) |
| `src/Film.tsx` | Back -> Presenter -> Front -> Caption -> vo.wav (+ bed); `regionFor`; `WorldDef` |
| `src/captions.ts` | automatic chunks (punctuation, pause > 0.35 s, ~4 words / 24 chars) + `isEmph` |
| `src/Root.tsx`, `src/index.ts` | registers `Film` (1080x1920, 30 fps, `TOTAL` frames) |
| `src/kit/*` | shared shell kit (camera, film grain, a safe ThreeCanvas); unused by this world |
| `dump-beats.mts`, `dump-events.mts`, `run-dump.mjs` | JSON dumps for the mixer and QA |
| `render_ig.sh`, `qa.sh`, `snap.sh`, `sheet.py` | Instagram-max render, QA receipts, stills, contact sheet |
| `audio/dsp.py`, `audio/designed.py`, `audio/mix.py` | DSP + synthetic SFX + the bed (style `arcade`, defaults music -11 dB, FX -19 dB) |

### World (this skill)
| File | Reusable vs rewrite |
|---|---|
| `src/world/px.tsx` | **Kit, keep:** palette, 5x7 bitmap font, sprites, PxPanel, PxBar, PxLayer, CRT. Add glyphs/sprites as needed |
| `src/world/scenes.tsx` | Worked examples: Backdrop/SplitBg/P1Frame are reusable; Hook...EndCard are the c6 screens; build new screens per topic |
| `src/world/world.tsx` | Back/Front/Caption wiring + `SCENES` map (edit the map and `EMPH_COL`) |
| `src/world/timing.ts` | rewrite: every cue the screens use |
| `src/beats.ts` | rewrite: one beat per script item (`SIDE`, `END`) |
| `src/world/events.ts` | rewrite from the same `T` constants (<= 25/min) |
| `src/world/emph.ts` | rewrite: caption emphasis words |
| `audio/mix.py` | `ARR` (per-beat arrangement) still has paper-film ids; unknown ids get the default. Add your beat ids if you want sections |

## Spine schema (sample files in `src/`)
The included `edl.json` / `words.json` are the real c6 v3 spine (text and times only) so the
template's cues resolve. Replace them with your film's spine from news-qa-reel.

- `src/edl.json`
  ```json
  { "clip": "id", "version": "v3",
    "segments": [ { "out": 0.0, "src": 0.0, "len": 5.9, "idle": true } ],
    "intro": null,
    "outro": { "t": 37.29, "dur": 1.21, "text": "Follow for more AI news." },
    "total": 39.7, "frames": 1191,
    "items": [ { "type": "el|his|q", "text": "..." } ] }
  ```
  `segments`: output start `out`, source start `src` (seconds in the clip's proxy), length `len`;
  `idle: true` = an ElevenLabs line plays over his silent listening footage. `frames` = the
  composition length. `items` = the script in order (`el` ElevenLabs, `his` his take, `q` a question
  he reads, shown as an anonymous IG DM card in v6).
- `src/words.json`: `[{ "w": "Xbox", "s": 0.0, "e": 0.4, "src": -1, "el": true }]`, every spoken word
  in **output** seconds (his and ElevenLabs, outro excluded), `src` = source time or -1 for EL.
- `src/vo_env.json`: per-frame voice RMS 0..1 (`voLevel(fr)`); `[]` is fine (reads 0).
- `src/mattes.json`: `[{ "file": "matte/m0-1440.webm", "srcStart": 0, "frames": N }]`.

## Instantiate for a new film
1. Copy to `<project>/film/`, drop in the shell's current v6 `lib.ts`, `presenter.tsx`, `Film.tsx`,
   `captions.ts` and the spine; `npm install`.
2. Write `WORLD-NOTES.md` (concept, palette, hero sprite, beat table) and `timing.ts` + `beats.ts`.
3. Stub one screen per beat (headline + panel), snap the timeline, then build screens beat by beat
   in the v6 zones; export `events.ts`.
4. `dump-beats`, `dump-events`, `mix.py arcade`, `render_ig.sh`, `qa.sh` (reference/commands.md).
