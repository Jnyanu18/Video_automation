# news-qa-reel film template (the shell)

The Remotion shell every news-Q&A reel shares: spine access, v6 presenter staging, auto-chunked right-column
captions, the IG format components, the audio mixer, Instagram-max render, true-peak fix and QA gates. It ships
with a **tiny sample spine and a minimal sample world**, so it typechecks and renders stills without any media
(the presenter is a grey placeholder silhouette while `edl.json` has `"sample": true`).

**A new style only supplies `src/world/`** (plus its own `beats.ts`). World skills such as glass-bubble-3d,
iso-diorama-3d, retro-space-poster and pixel-arcade plug into this shell.

## Install
`scripts/install_template.sh <project>/clips/<id>/film` copies this folder (or refreshes only the shell files in an
existing film), then `npm install` or links `NODE_MODULES_FROM`. Then run `scripts/build_spine.py` (overwrites the
sample `edl.json`, `words.json`, `vo_env.json`) and `scripts/matte_clip.sh`.

## Files

### Shell (reuse as is; improve here, not per clip)
| File | What it is |
|---|---|
| `src/lib.ts` | `WORDS` (spk, q), `EDL`, `OUTRO` (t, dur, silent), `ITEMS`, `TOTAL`, `cue()` / `cueEnd()` (throw on missing/ambiguous phrases), `voLevel`, easing (`progS`, `popS`, `live`, `smooth`, `lerp`), `IS_SAMPLE` |
| `src/presenter.tsx` | v6 staging (`STAGE` scale 0.88 at -80, 234; mirrored; feather 82-100%), the cut-out per EDL segment (`m0` / optional `twin` / `idle` mattes), `SIDE_FACE` (re-measure per take), `presenter()` compat |
| `src/Film.tsx` | Back -> Presenter -> Front -> Caption, `vo.wav` + optional bed; `WorldDef`; `CAPTION_REGION` (right column) |
| `src/captions.ts` | captions chunked automatically from words (punctuation, > 0.35 s pause, ~4 words / 24 chars); `isEmph` from `world/emph.ts` |
| `src/series.ts` | **parameters**: series tag text, handle, CTA, "Anonymous", "IG question", "MY ANSWER" |
| `src/ig/` | `zones.ts` (layout boxes), `theme.ts`, `SeriesTag`, `HookCard`, `IGQuestion` + `AutoQuestions` (DM cards from `q` words), `questions.ts`, `AnswerTag`, `CommentCard`, `EndCard`, `Chip`, `RightCaption`, `Plane`; import from `../ig` |
| `src/kit/` | `three-canvas.tsx` (three.js canvas that never captures an empty frame), `finish.tsx` (bloom, vignette, grain), `camera.tsx` (2D camera keys) from the cstack animated-video starter |
| `src/index.ts`, `src/Root.tsx` | entry; one composition `Film` 1080x1920 @30, `TOTAL` frames |
| `audio/mix.py`, `dsp.py`, `designed.py` | synthetic score per style + event SFX + ducking -> `public/bed-<style>.wav`; prints VO-to-bed ratio |
| `render_ig.sh` | render at `--scale=1.3333333333333333 --gl=angle`, mix, one x264 encode within IG limits, then `fix_tp.sh` |
| `fix_tp.sh` | true-peak gate: audio-only limiter remux if TP > -1 dBTP |
| `qa.sh` | decode, blackdetect, loudness/TP, frame 0, last second, contact + cuts sheets, `gates.txt` PASS/FAIL |
| `snap.sh`, `sheet.py` | stills at given seconds + a labelled sheet (`COMP=Film`, `PAR`, `MAXF`, `BUNDLE`, `KEEP`) |
| `dump-beats.mts`, `dump-events.mts`, `run-dump.mjs` | beats/chunks and events as JSON for mix.py and qa.sh |
| `package.json`, `tsconfig.json` | Remotion 4 + React 19 (+ three / R3F for 3D worlds) |

### Per clip (rewrite)
| File | What to write |
|---|---|
| `src/beats.ts` | the beat table: `S(id, cue("phrase") - 0.1)` per item / new picture, `end` at `OUTRO.t - 0.3` |
| `src/world/world.tsx` | the `World: WorldDef` (Back, Front, Caption, cutoutFilter). Front must include `SeriesTag`, `HookCard`, `AutoQuestions` (or custom `IGQuestion`s), the comment card and `EndCard`; the rest is your style |
| `src/world/emph.ts` | caption emphasis words |
| `src/world/events.ts` | sound events (<= 25 per minute) from the same constants the world draws with |
| `src/edl.json`, `words.json`, `vo_env.json` | written by `scripts/build_spine.py` (the sample ones are placeholders) |
| `audio/mix.py` | add a `STYLES` row for a new style if none fits |

## Spine JSON schema (written by build_spine.py)
- `edl.json`: `{clip, version, source, frame, crop_x, segments: [{out, src, len, twin?, idle?}], speed, gap, keep,
  intro: null, outro: {t, dur, text, silent?}, total, frames, items: [{type: "his", q, text}], sample?}`
- `words.json`: `[{w, s, e, src, spk: "his", q}]` in output seconds (after speed); outro words excluded.
- `vo_env.json`: per-frame voice RMS, normalised 0-1 (`voLevel(fr)`; drives mouth flaps, pulses).

## Media expected in `public/` (never committed)
`proxy-1440.mp4` (from build_spine), `matte/m0-1440.webm` (from matte_clip.sh), `vo.wav`, `bed-<style>.wav`
(from mix.py); optional `matte/twin-m1440.webm`. No fonts are bundled: the components use system fonts
(Segoe UI / Helvetica / Arial); a world may load Google Fonts through `@remotion/google-fonts`.

## Check
`npx tsc -p .` must pass; `./snap.sh out/stills 0 3.5 5.5 8 11.9` renders the sample (no media needed).
