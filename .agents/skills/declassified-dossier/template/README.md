# Declassified Dossier film template

Starting code for a new film in the Declassified Dossier world. It is the source film's final v6 code
("The US just banned a Chinese AI. Was that fair?" DeepSeek news Reel, Oct 2026). Copy this folder to
`<project>/film/`; never edit it in place. It typechecks as shipped (`npx tsc --noEmit -p .`, checked
with the source film's node_modules).

**Important:** `src/edl.json`, `src/words.json`, `src/vo_env.json`, `src/mattes.json` are a tiny SAMPLE spine
(see `src/SPINE-SCHEMA.md`). `src/world/T.ts` (and through it `beats.ts`, `scenes.tsx`, `ig.tsx`, `events.ts`)
still cues the source film's phrases, so **with the sample spine `cue()` throws at module load**
(`cue not found: ...`) until you rewrite `T.ts` and `beats.ts` for the new film's real `words.json`. That is
deliberate; tsc is unaffected.

## The shell vs the world
The shell (`Film.tsx`, `lib.ts`, `captions.ts`, `presenter.tsx`, `beats.ts` conventions, `kit/`, scripts) belongs
to the `news-qa-reel` skill and is copied here only so the template compiles on its own. If news-qa-reel's shell
is newer, use it and copy only `src/world/**` (+ `audio/mix.py` style `dossier`) from here. This world is pure
SVG/HTML: it does not use three.js or `src/kit/*` (kept for shell parity; `package.json` is the shared shell's).

## Not included on purpose (generate per project)
- Textures `src/world/tex/{desk,manila,memo}.jpg`: run `py src/world/make_textures.py` (seeded, deterministic).
- Media: `public/proxy-1440.mp4`, `public/matte/m0-1440.webm` (+ `idle-m1440.webm` if a segment is `idle`),
  `public/vo.wav`, `public/bed-dossier.wav`. No footage, voice, music or font files are ever copied into the skill.
- The real spine (`src/edl.json`, `words.json`, `vo_env.json`, `mattes.json`): built by news-qa-reel's clip builder.
- `node_modules/`, `out/`.

## Files

### Reusable (keep; change only to improve them)
| File | What it is |
|---|---|
| `src/world/kit.tsx` | palette, fonts (Anton, Courier Prime), textures, `Defs` (shadows, worn ink, pencil grain, paper patterns, steel/brass), `Sheet`, `Type`, `Stamp`, `Redact`, `Hi`, `Clip`, `Pencil`, `loopPath`, `arrowHead`, `StringLine`, `Pin`, `torn`, `dealt`, motion helpers; `HANDLE`, `SERIES` |
| `src/world/scenes.tsx` (helpers) | `Slot` + `BAND_TF` / `COL_TF` (zone mapping, slide-in, column fade-right exit), `TopSheet`, `ColSheet`, `Tick`, `ATag`, `QCard`, `CarSide`, `Person`, `Bunker`, `WarMap`, the hidden-wire path helper (`wireAt`) |
| `src/world/ig.tsx` (components) | `SeriesTag`, `IGQuestion` (anonymous IG DM card), `qWords` (recolour key words on their cue), `Plane` icon |
| `src/world/world.tsx` | `WorldDef`: desk + lamp `Back`, SVG `Front` (Defs + Scenes) + `IGOverlay`, memo-strip `Caption` (`capLayout`: 46 -> 34 px, <= 3 lines, shift-left rule), `cutoutFilter` |
| `src/world/make_textures.py`, `assets.d.ts` | texture generator; `*.jpg` module typing |
| `src/Film.tsx`, `lib.ts`, `captions.ts`, `presenter.tsx`, `Root.tsx`, `index.ts`, `kit/*` | the news-qa-reel shell (v6 staging) |
| `audio/mix.py`, `dsp.py`, `designed.py` | score + SFX bed (`dossier` style, paper SFX family), DSP helpers, designed SFX. CC0 files come from `SFX_DIR` (default `~/.claude/skills/video-edit/assets/sfx`) |
| `render_ig.sh`, `qa.sh`, `snap.sh`, `sheet.py`, `dump-beats.mts`, `dump-events.mts`, `run-dump.mjs` | delivery render, QA receipts, stills sheet, JSON dumps for the mixer. `PY` env var = a real Python 3.13 |
| `package.json`, `tsconfig.json`, `remotion.config.ts` | Remotion 4.0.535 + React 19 + @remotion/google-fonts (three / R3F listed by the shared shell, unused here) |

### Film-specific (rewrite for every film; the copies here are worked examples)
| File | Rewrite |
|---|---|
| `src/world/T.ts` | every cue the scenes use (`cue`, `wAt` for repeated single words) |
| `src/beats.ts` | the beat table (all SIDE, END at `OUTRO.t - 0.3`), cued from his words |
| `src/world/scenes.tsx` (the 20 scene components + `Scenes`) | one component per idea, each with a band and/or column `Slot`; see `../reference/scene-catalogue.md` |
| `src/world/ig.tsx` (`IGOverlay`) | the exact questions he reads, their beat windows and recoloured words |
| `src/world/world.tsx` (`STRONG`) | caption words that get the highlighter |
| `src/world/emph.ts` | caption emphasis words (red) |
| `src/world/events.ts` | sound events (<= 25/min) from the same cues |
| `src/presenter.tsx` (`SIDE_FACE`) | re-measure the head box for the new take |
| `audio/mix.py` | `ARR` per beat id if needed; `STYLES["dossier"]` is the world's sound |
| `WORLD-NOTES-source-film.md` | the source film's world notes, v1 -> v6 (keep one like it for every film) |

## Instantiate for a new film
1. Copy this folder to `<project>/film/`; `npm install` (or junction a recent film's `node_modules`);
   `py src/world/make_textures.py`.
2. Build the spine with news-qa-reel (real `edl.json`, `words.json`, `vo_env.json`, `mattes.json` + media in
   `public/`). Re-measure `SIDE_FACE` in `presenter.tsx` for the new take.
3. Rewrite `world/T.ts` and `beats.ts` on the new words; replace `Scenes` with one stub `Slot` per beat (a `TopSheet`
   with the line typed on it) plus the hook and the IG questions; `npx tsc -p .`; stills of every beat start (`snap.sh`).
4. Build the documents beat by beat from the approved storyboard (reuse the helpers and the worked scenes as
   patterns); keep `events.ts` in step.
5. `dump-beats`, `dump-events`, `audio/mix.py dossier`, `render_ig.sh`, `qa.sh` (see `../reference/pipeline-commands.md`).
