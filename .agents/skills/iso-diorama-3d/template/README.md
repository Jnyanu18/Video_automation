# Iso Diorama film template

Working Remotion code from the first Iso Diorama film ("Robots will take these jobs first. Is yours
on the list?", Oct 2026 news batch, v6/v7 visuals). Copy this folder to `<project>/clips/<id>/film/`
(or `<project>/film/`); do not edit it in place. It typechecks as shipped (`npx tsc --noEmit -p .`
once `node_modules` is installed) and `dump-beats` / `dump-events` run on the sample spine.

## Not included (bring or generate per film)

- Media: `public/proxy-1440.mp4` (the take, cut by the spine), `public/matte/m0-1440.webm` (whole-clip
  VP9-alpha matte; `idle-m1440.webm` / `twin-m1440.webm` only if your EDL has `idle` / `twin` segments),
  `public/vo.wav`, `public/bed-iso.wav` (made by `audio/mix.py`).
- `node_modules/`, `out/`. Fonts load from `@remotion/google-fonts` (Fredoka). No font, music or footage files ship.
- CC0 SFX library: set `SFX_LIB` to a folder containing the files `mix.py` names (`whoosh-deep.flac`,
  `glass-ting.flac`, ...); everything else is synthesised in `audio/designed.py`.

## Spine files (sample data: replace with your film's)

The news-qa-reel shell writes these. The copies here are the first film's word timings (his spoken
text only; kept so every `cue()` in `world/timing.ts` resolves and the template runs) with an
anonymised source name, an empty envelope and a one-entry matte list.

| File | Schema |
|---|---|
| `src/words.json` | `[{ w, s, e, src, spk, q }]`: word text, start/end in **output** seconds, source seconds, speaker (`"his"`, `"el"`, `"twin"`), `q: true` for words of a question he reads |
| `src/edl.json` | `{ clip, version, source, lo, segments: [{ out, src, len, idle?, twin? }], speed, gap, intro: {t,dur,text} \| null, outro: {t, dur, text, silent?}, srcEnd, total, frames, items: [{ type, q, text }] }` |
| `src/vo_env.json` | per-frame normalised voice RMS (`number[]`, may be empty; `voLevel()` returns 0) |
| `src/mattes.json` | `[{ file, srcStart, frames }]` |

`lib.ts` reads these (`EDL`, `OUTRO`, `INTRO`, `TOTAL`, `cue`, `cueEnd`, `srcAt`, `outOf`).

## Files

### Shell (owned by news-qa-reel; keep in sync with that skill rather than editing here)
| File | What it is |
|---|---|
| `src/Film.tsx` | Back -> Presenter -> Front -> Caption -> `vo.wav` + bed. `regionFor()` (v6: captions in the right column x 692, y 1300, w 258). `WorldDef` interface |
| `src/lib.ts` | FPS/W/H, words, EDL maths, `cue`/`cueEnd`, easing (`prog`, `progS`, `pop`, `popS`, `smooth`, `lerp`), `SoundEvent` |
| `src/presenter.tsx` | v6 staging: always the cut-out, scale 0.88 at (-80, 234), mirrored, right edge feathered; one `<Sequence>` per EDL segment; `SIDE_FACE` = { x 0, y 830, w 780, h 640 }. Older modes (FULL/FWD/tile) kept but unused |
| `src/captions.ts` | automatic chunking (sentence punctuation, pause > 0.35 s, 4 words / 24 chars), `isEmph` |
| `src/beats.ts` | the beat table (rewrite per film); API `Mode`, `BEATS`, `beatIdx`, `beatAt`, `B`, `inBeat` |
| `src/Root.tsx`, `src/index.ts` | registers composition `Film` (1080x1920, 30 fps, `TOTAL` frames) |
| `src/kit/three-canvas.tsx` | ThreeCanvas that never releases a frame before the scene is drawn |
| `src/kit/camera.tsx`, `src/kit/finish.tsx` | 2D SVG camera / grain-bloom finish (shared kit; unused by this world) |

### World (this skill)
| File | Reuse |
|---|---|
| `src/world/world.tsx` | reusable: sky, sunset, night overlay, one orthographic `ThreeCanvas`, `World: WorldDef` with the cut-out filter (white sticker edge + plum drop shadow) |
| `src/world/cam.ts` | reusable maths (`DIR`, `RIGHT`, `UP`, `camCentre`, `project`); rewrite `TILE` and `KEYS` |
| `src/world/parts.tsx` | reusable: palette `C`, clay materials, primitives, `Human`, `Robot`, `Puff`, `swapAt`, `SwapRobot`, decor |
| `src/world/ui.tsx` | reusable: Fredoka, `Pill`, `Stamp`, `Sparkle`, icons, `Heart` |
| `src/world/caption.tsx` | reusable `DioramaCaption` (edit `disp()` display fixes per film) |
| `src/world/scene.tsx` | reusable island + lights + `CamRig`; edit which tiles are placed |
| `src/world/tiles.tsx` | worked examples: the nine tiles of the first film. Build new tiles per topic |
| `src/world/overlays.tsx` | reusable patterns (`SeriesTag`, `QBubble` DM card, `ATag`, `CommentCard`, `EndCard`, `RC`/`clr` clamps); rewrite `Hook`, `worldLabels`, the question texts and the end title |
| `src/world/timing.ts`, `times.ts` | rewrite: every cue and derived event time |
| `src/world/events.ts`, `emph.ts` | rewrite: sound events and caption emphasis words |
| `audio/mix.py`, `dsp.py`, `designed.py` | shared mixer; `python audio/mix.py iso` (levels -11 / -26 built in; `MUSIC_DB` / `FX_DB` env override) |
| `render_ig.sh`, `qa.sh`, `snap.sh`, `sheet.py`, `dump-*.mts`, `run-dump.mjs` | Instagram-max render, QA receipts, stills, dumps. `PY` env var = your Python |

## Instantiate for a new video

1. Copy this folder; `npm install`; drop in your spine files and media from the news-qa-reel shell.
2. Rewrite `beats.ts` (one beat per script item, all SIDE, END from `OUTRO.t - 0.3`) and `timing.ts`
   from the new words. `npx tsc -p .` then `dump-beats` to make sure every cue resolves.
3. Plan the island: which tile each sentence lives on; replace tiles in `tiles.tsx`, the `TILE` map and
   camera `KEYS` in `cam.ts`, the placements in `scene.tsx`.
4. Rewrite `overlays.tsx` labels (`worldLabels`), the hook, the DM-card texts and the end title.
5. `events.ts` + `emph.ts`; stills at every beat; fix; then mix, render and QA (`../reference/commands.md`).
