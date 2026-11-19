# Canvas explainer: Remotion template

Working Remotion code for the black-canvas marker world, taken from the drug-discovery news Reel ("OpenAI just bought
Orchestra Bio", October 2026, v3) and set up so a new film starts from it. Copy this folder to `<project>/film/`;
don't edit it in place. It typechecks as shipped (`npx tsc --noEmit -p .`, tested with Remotion 4.0.535 + React 19)
and renders the small **starter world** (`src/world/`) over the sample spine.

## Not included (generate per project)

- `node_modules/` (`npm install`), `out/`.
- Media in `public/`: `vo.wav` (the spine voice), `proxy-1440.mp4` (his take, H.264 1440x2560),
  `matte/m0-1440.webm` (VP9-alpha cut-out of the take) and `matte/idle-m1440.webm` (his silent "listening" footage,
  played under voice-clone lines), `bed-canvas.wav` (from `audio/mix.py`). No footage, voice, fonts or music ship here.
- Fonts: Ink Free (a Windows system font; the fallback is Segoe Print/cursive), Consolas or IBM Plex Mono, Segoe UI.
  Install IBM Plex Mono yourself if you want it (OFL).
- The real spine of the drug film. `src/edl.json`, `src/words.json`, `src/vo_env.json` and `src/mattes.json` are a
  9-second **sample** (schema below), so `src/world-drug/` typechecks but won't render until you give it its own spine.

## Files

### Reusable kit and shell (keep; change only to improve them)
| File | What it is |
|---|---|
| `src/kit/ink.tsx` | marker kit: palette `COL`, fonts `INK`/`MONO`/`SANS`, `RoughDefs` (feTurbulence + feDisplacementMap rough-ink filter; `boil` = frames per seed step, 0 = static), `Stroke` (SVG `pathLength=1` dash reveal), `DashStroke`, `Write` (Ink Free letters written on one by one, optional black halo `glow`), `Pop`, path builders `ellipseD`/`rectD`/`arrowD`/`checkD`/`crossD`, `Arrow`, and two example props `Bottle`, `Tag` |
| `src/kit/camera.tsx` | `camAt(frame, keys)` keyed world camera (log-space zoom), `parallax`, `inverse`, `toScreen`, `shake`, `handheld`, `Camera`/`Layer` |
| `src/kit/finish.tsx` | bloom on bright ink, vignette, moving grain (stops dark gradients banding after Instagram recompression) |
| `src/Film.tsx` | shell: Back -> Presenter -> Front -> Caption, `vo.wav` (+ optional bed). `regionFor(mode)` = caption region; `WorldDef` = what a world implements |
| `src/lib.ts` | `STAGING` ("v6" default / "v3"), spine loading (`EDL`, `srcAt`, `outOf`, `OUTRO`, `TOTAL`), `cue(phrase, nth?)` / `cueEnd` (throw on missing or ambiguous phrase), easing (`prog`, `progS`, `pop`, `popS`, `smooth`, `lerp`) |
| `src/captions.ts` | automatic chunking of the words (break at punctuation, a pause > 0.35 s, or ~4 words / 24 chars) |
| `src/presenter.tsx` | the real presenter: always the still, mirrored cut-out bottom-left; one `<Sequence>` per EDL segment, real take or idle matte per segment. The v1/v2 state machine (FULL/FWD/SIDE/OUT, tile hand-offs into sketched frames) is still in the file, switched off |
| `audio/dsp.py`, `audio/designed.py`, `audio/mix.py` | DSP helpers, synthetic SFX, and the bed: `py -3.13 audio/mix.py canvas` = D-minor "lab notebook" piano-pluck score + SFX from `out/events.json` (marker, stamp, pop, whoosh...) ducked -15 dB under phrases and kept >= 20 dB under the voice's 1-4 kHz band. Set `SFX_LIB` to a CC0 SFX folder |
| `render_ig.sh` | Instagram-max delivery: render at `--scale=1.3333333333333333` (1440x2560), mix VO + bed, one x264 encode (crf 14, maxrate min(24M, 0.95*300MB*8/dur)), AAC 128k, faststart, about -14 LUFS |
| `qa.sh`, `snap.sh`, `sheet.py` | technical QA receipts + contact/cuts sheets; stills at given seconds (`COMP=Film ./snap.sh out/dev 0 2.5 ...`) |
| `dump-beats.mts`, `dump-events.mts`, `run-dump.mjs` | write `out/beats.json` and `out/events.json` for the mixer and QA |

Set `PY` to the real Python 3.13 for the shell scripts (never the Windows Store `python3` alias).

### Film-specific (rewrite for every film)
| File | Rewrite |
|---|---|
| `src/beats.ts` | the beat table: `{id, s: K.<cue> - lead, mode}`; with v3+/v6 staging every beat is `SIDE` and only picks the page; last beat `END` at `OUTRO.t - 0.3` |
| `src/world/cues.ts` | every time the world uses, as `cue("phrase")` |
| `src/world/emph.ts` | caption emphasis words |
| `src/world/camera.ts` | `PG` page origins (one 1080x1920 page each, ~220 px gutters), page `ORDER`, `MAP` (end zoom-out framing) |
| `src/world/pages.tsx` | one component per page; first element drawn 1.5 s before its beat (`pre(id)`); connector arrows |
| `src/world/world.tsx` | which pages are drawn, `SERIES_TAG`, `BOIL`, end card, caption style, cut-out rim filter |
| `src/world/events.ts` | sound events (sparse: <= ~25/min) |

### Worked example: `src/world-drug/`
The drug-discovery film's complete canvas (10 pages: hook/news card, years timeline + hourglass, question + YES,
pattern-recognition dot grid + lens, protein + brute-force tries counter + fit, lock and millions of keys, AI-penetration
gauge, Rx bottle `$$$` -> `$`, lifeline + heart + confetti, IG-style comment sheet; then the zoom-out map end card).
It has its own `beats.ts`, and it is laid out for the **v3** staging (set `STAGING = "v3"`). To run it, give it its spine,
copy `world-drug/beats.ts` over `src/beats.ts` (fix its imports to `./world-drug/cues`) and point `Root.tsx` and
`captions.ts` at `world-drug`. Its beat table, script and fact chips are in `../examples/drug-discovery/`.

## Spine schema (`src/*.json`)

All times are **output seconds** (the cut film), on the 1/30 s grid.

`edl.json`
```json
{
  "clip": "sample", "version": "v1",
  "segments": [ { "out": 0.0, "src": 0.0, "len": 3.0, "idle": true },
                { "out": 3.0, "src": 10.0, "len": 4.0, "idle": false } ],
  "intro": null,
  "outro": { "t": 7.1, "dur": 1.2, "text": "Follow for more AI news." },
  "srcEnd": 9.0, "total": 9.0, "frames": 270,
  "items": [ { "type": "el", "text": "..." }, { "type": "his", "text": "..." } ]
}
```
- `segments`: his take laid end to end. `out` = where it starts in the film, `src` = seconds into
  `public/proxy-1440.mp4` (or into the idle matte when `idle: true`, used under voice-clone lines so he is seen
  listening), `len` = length. Segments must be contiguous and cover the whole film.
- `outro`: the spoken "Follow for more ..." line (a voice-clone take); the end card writes on with it.
- `intro`: optional voice-clone line before his first words, or `null`.
- `total` / `frames`: film length (`frames = round(total * 30)`). `items`: the script in order (`el` = voice clone,
  `his` = his real words), kept for QA and the mixer.

`words.json`: `[{ "w": "Could", "s": 3.1, "e": 3.3, "src": 10.1, "el": false }, ...]`. One entry per spoken word with
punctuation kept on the word; `src` = source time (-1 for voice-clone words); `el: true` for voice-clone words.
Captions and every `cue()` read this file, so it must match the audio exactly (re-transcribe the final `vo.wav`).

`vo_env.json`: per-frame voice level 0..1 (`frames` entries), for anything that should react to speech.

`mattes.json`: `[{ "file": "matte/m0.webm", "srcStart": 0, "frames": 600 }]`: the matte ranges (one whole-clip
matte is enough for the always-cut-out staging).

## New film in six steps
1. Copy this folder; `npm install`; put the media in `public/`; write the spine (`src/edl.json`, `words.json`,
   `vo_env.json`, `mattes.json`) from the project's spine script.
2. Keep `STAGING = "v6"` unless asked otherwise; measure his head box on 3-4 stills and update `SIDE_FACE`.
3. Write `cues.ts`, `beats.ts`, `camera.ts` (`PG`, `ORDER`, `MAP`), then stub one page per beat with a heading only;
   `npx tsc -p .`; stills at every beat start to check zones, captions and the camera.
4. Build the pages from the approved storyboard, beat by beat; `events.ts` as you go.
5. Dump timing for the mixer, then build the bed:
   ```bash
   npx esbuild dump-beats.mts --bundle --platform=node --format=esm --outfile=out/dump-beats.mjs --log-level=error && node out/dump-beats.mjs > out/beats.json
   npx esbuild dump-events.mts --bundle --platform=node --format=esm --outfile=out/dump-events.mjs --log-level=error && cp run-dump.mjs out/ && node out/run-dump.mjs > out/events.json
   py -3.13 audio/mix.py canvas
   ```
6. `./render_ig.sh Film <name> public/bed-canvas.wav`, then `./qa.sh out/<name>.mp4 ../qa/<name>`.
