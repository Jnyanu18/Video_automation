# Paper Lab film template

Starting code for a new Paper Lab reel. It comes from the first Paper Lab film
("What if intelligence is just good compression?"). Copy this folder to `<project>/film/`;
do not edit it in place.

## Not included yet (add before the film will build)

The main session is generalising these files and will add them here. Until then, copy them from the
source project's `film/src/` and `scripts/` and adapt them:
- `src/lib.ts`: FPS, W/H, `WORDS`, the **EDL** (`[{out, src, len}]`, N segments), `srcAt`, `outOf`, `cue`,
  `cueEnd`, `TOTAL`, easing helpers (`prog`, `progS`, `pop`, `smooth`, `lerp`), `SoundEvent`.
- `src/beats.ts`: the beat table (`{id, s: cue(...) - lead, mode, tile?}`), `BEATS`, `B`, `beatAt`, `inBeat`.
- `src/presenter.tsx`: the presenter state machine, footage and matte layers, `SIDE_FACE`.
- `scripts/build_spine.py`: EDL -> `vo.wav`, `words.json` (output time), `vo_env.json`, `analysis/edl.json`.
Also from the source project: `scripts/transcribe.py`, `scripts/matte_ranges.sh`; and from
`~/.claude/skills/animated-video/templates/remotion-film/`: `board.py` (key-frame board).

## Not included on purpose (generate or copy per project)

- Media: `public/proxy-1080.mp4`, `public/matte/cN.mp4` + `mN.webm`, `public/vo.wav`,
  `public/bed-paper.wav`, `public/madhav-still.png` (a still from the **current take**, never an
  older photo of the presenter).
- Paper textures `public/paper/{board,cork,navy}.jpg`: run `py -3.13 src/paper/make_textures.py`
  (deterministic, seed 7, 1240x2200).
- `node_modules/`, `out/`, `src/words.json`, `src/vo_env.json`, `src/mattes.json` (generated).

## Files

### Reusable kit and shell (keep; change only to improve them)
| File | What it is |
|---|---|
| `src/Film.tsx` | Film shell: Back -> Presenter -> Front -> Caption, `vo.wav` + bed audio. `regionFor(mode)` = face-safe caption regions. `WorldDef` = the interface a world implements |
| `src/index.ts`, `src/Root.tsx` | Remotion entry; Root registers `FilmPaper` (add style-frame or debug comps as needed) |
| `src/paper/kit.tsx` | palette, fonts, shared SVG filters/patterns, `torn`, `Scrap`, `Card`, `Tape`, `Pin`, `Draw`, `Dotted`, `circlePath`, `Stamp`, `Polaroid`, `Photo`, `Clipping`, `WebPage`, `CodeSheet`, `BgImage`, motion helpers (`twos`, `boil`, `back`, `pS`, `rnd`) |
| `src/paper/cube.tsx` | `GoldCube` (orthographic 3D origami cube: turn, squash, glow, unfold into a net, pencil-outline faces) and `Sparkle`. Restyle or replace with this film's hero object |
| `src/paper/dressing.tsx` | desk dressing for board edges (pencil, clip, coffee ring, sticky, scraps) |
| `src/paper/make_textures.py` | regenerates the paper textures |
| `audio/dsp.py`, `audio/designed.py` | DSP helpers (filters, reverb, put/fade, read/write, loudness, `cue()` mirror) and ~30 designed SFX |
| `render.sh`, `finalize.sh`, `qa.sh`, `snap.sh`, `sheet.py` | render, master, QA receipts, stills, contact sheet |
| `dump-beats.mts`, `dump-events.mts` | print beats/chunks and events as JSON for the mixer and QA |
| `package.json`, `tsconfig.json` | Remotion 4 + React 19 + google-fonts (+ three, only needed for a 3D world) |

### Video-specific (rewrite for every film; the copies here are worked examples)
| File | Rewrite |
|---|---|
| `src/captions.ts` | `LINES` (verbatim sense-unit chunks) and `EMPH`. The chunk builder and checks below them are reusable |
| `src/paper/T.ts` | every cue the scenes use (`cue("phrase")`), `HOOK_WORDS` slice, the `HAND` hand-off times (keep the boundary -0.25/+0.4/+1.5 relation to the presenter) |
| `src/paper/caption.tsx` | `PaperCaption` is reusable; edit its `STRONG` set. `Hook` needs a new `LINES` layout (word indices, sizes, baselines), new `FLUTTER` snippets and a new key word |
| `src/paper/front.tsx` | overlays for FULL/FWD beats (notes, stickers, "?" marks, the hero object beside him, CTA tape) and the end card text. `Note`, `Sticker`, `QMark` and the end-card unfold are reusable patterns |
| `src/paper/world.tsx` | the `SCENES` windows list and the cut-out/tile styling (`cutoutFilter`, `tileStyle` are reusable) |
| `src/paper/events.ts` | the sound events list (keep the `e()` helper, `px()` pan) |
| `src/paper/{cork,lab,books,notebook,recall,cosmos,path,cta2,end}.tsx` | one file per set/act. Treat them as worked examples of the scene vocabulary in `reference/art-direction.md`; build new sets for the new topic |
| `audio/mix.py` | `ARR` per beat id, score key/chords, the CTA/score choices; `sound_for` keyword map is reusable. Reads `END` from `out/beats.json` |
| `src/paper/README-source-film.md` | the source film's world README (beat-by-beat description + known weaknesses), kept as an example of the README each world should have |

## Adaptations made in this copy
- `Root.tsx` registers only `FilmPaper` (the source also had a 3D world, a debug world and style frames).
- `dump-events.mts` dumps only the paper world.
- `audio/mix.py` reads the film length from `out/beats.json` instead of a constant.
- `snap.sh` caps frames with `MAXF` (set it to `TOTAL - 1`) instead of a fixed number.
- `kit.tsx` `IMG.still` points to `public/madhav-still.png`; export it from the current take.

## Instantiate for a new video

1. Copy this folder to `<project>/film/` (`scripts/` goes to `<project>/scripts/`); `lib.ts`, `beats.ts`, `presenter.tsx` are included (v2, N-segment EDL read from `src/edl.json`);
   `npm install`; run `make_textures.py`; copy the intermediate into `public/`.
2. `py -3.13 scripts/plan_cuts.py` (pause trims + `WORD_CUTS`), then `scripts/build_spine.py` (writes `src/edl.json`, `words.json`, `vo_env.json`, `public/vo.wav`; `TOTAL` comes from edl.json); write `beats.ts`, `captions.ts` `LINES`, `T.ts`.
3. Stub `world.tsx` with one scene per beat (BgImage + a label) and `front.tsx` with only the
   `Hook`; snapshot the whole timeline to check presenter modes, captions and hand-offs.
4. Build sets beat by beat from the approved storyboard; export `events.ts` as you go.
5. `dump-beats`, `dump-events`, `mix.py`, `render.sh`, `finalize.sh`, `qa.sh` (see
   `reference/pipeline-commands.md`).

## v2 additions (2026-10-14, the tightening pass)

- `scripts/plan_cuts.py`: silences < -42 dB longer than 0.42 s are shortened to ~0.33 s (cuts >= 0.2 s only,
  none within 1.2 s of a word cut); `WORD_CUTS` remove filler/adjectives, chosen from 10 ms RMS and snapped to
  the 1/30 s grid. Verify by re-transcribing `public/vo.wav` with Whisper.
- `scripts/build_spine.py`: N-segment EDL + optional voice-clone outro (clarity chain, level-matched
  to the presenter's last sentences) placed while the end card grows, then a 1 s hold. Words whose start Whisper placed inside a
  trimmed silence are clamped, not dropped (otherwise captions lose words).
- `src/presenter.tsx`: matte layers split per EDL segment; zoom cut (`punch`) flips a 7% punch-in at every cut in
  FULL/FWD so pause trims read as deliberate cuts.
- `run-dump.mjs`: DOM stub so `dump-events` runs under Node (bundle with `--outfile=out/dump-events.mjs`, copy this to `out/`).

## v3 additions (2026-10-15): Instagram-max delivery
- Default delivery is now 1440x2560. `scripts/hires_1440.sh` builds a 1440 copy from the RAW, plus SIDE cut-outs (colour at 1440, alpha from the 720 u2net matte upscaled, so there's no re-matting). `presenter.tsx` `HI = true` uses them.
- `render_ig.sh <comp> <name> <bed>`: `--scale=1.3333333333333333` (fewer digits gives 2559.99 px and Remotion refuses non-integer sizes), then one x264 encode (crf 14, maxrate = min(24M, 0.95*300MB*8/dur), AAC 128k, faststart).
- Word-level cuts: when Whisper merges repeated words ("it can, it can"), re-align on a short clip and patch the source times in `build_spine.py` before mapping.
