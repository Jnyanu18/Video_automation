# Glass Bubble 3D film template

Starting code for a new film in the Glass Bubble 3D world. It is the source film's final v6 code ("I barely write code
anymore" / AI-bubble news Reel, Oct 2026). Copy this folder to `<project>/film/`; never edit it in place.
It typechecks as shipped (`npx tsc --noEmit -p .`, checked with the source film's node_modules).

**Important:** `src/edl.json`, `src/words.json`, `src/vo_env.json`, `src/mattes.json` are a tiny SAMPLE spine
(see `src/SPINE-SCHEMA.md`). `src/world/timing.ts` (and through it `beats.ts`, `rig.ts`, `events.ts`) still cues the
source film's phrases, so **with the sample spine `cue()` throws at module load** (`cue not found: is the AI boom`)
until you rewrite `timing.ts` and `beats.ts` for the new film's real `words.json`. That is deliberate; tsc is unaffected.

## The shell vs the world
The shell (`Film.tsx`, `lib.ts`, `captions.ts`, `presenter.tsx`, `beats.ts` conventions, `kit/`, scripts) belongs to the
`news-qa-reel` skill and is copied here only so the template compiles on its own. If news-qa-reel's shell is newer, use it
and copy only `src/world/**` (+ `audio/mix.py` style "bubble") from here.

## Not included on purpose (generate per project)
- Media: `public/proxy-1440.mp4`, `public/matte/m0-1440.webm` (+ `idle-m1440.webm`), `public/vo.wav`,
  `public/bed-bubble.wav`. No footage, voice, music or font files are ever copied into the skill.
- The real spine (`src/edl.json`, `words.json`, `vo_env.json`, `mattes.json`): built by news-qa-reel's clip builder.
- `node_modules/`, `out/`.
- `front.tsx` (a small transparent 3D bubble over full-frame footage, v1-v2): nothing imports it in v6.

## Files

### Reusable (keep; change only to improve them)
| File | What it is |
|---|---|
| `src/world/bubble-mats.ts` | the shaders: thin-film soap/glass shell (fresnel, highlights, wobble, ripple, crack -> gold), glass planet, studio sky, floor pool |
| `src/world/cam.ts`, `mats.ts`, `parts.tsx` | the luminous-cosmos-3d 3D kit: poses + `orbit/project/unproject/keyed`, glow/halo/text/motes materials + the `FACE` mask, `CamRig`, `GlowPoints`, `Halo`, `EnvMap`, `Motes`, `Fog`, palette |
| `src/world/scene.tsx` | `Studio`, `Bubble`, `City` (instanced data-centre city), `Coins`, `Objects` (5 low-poly icons on threads), `Markets` (unused pattern), `Desk` (monitor + live editor + agent orb + workflow nodes + moon) |
| `src/world/tex.ts` | canvas textures (glyphs, moon, laptop/phone screens) and the live code editor `drawEditor(g, t)`; `UI_FONT`, `CODE_FONT` |
| `src/world/overlay.tsx` (components) | `Chip` (glass chip), `anchor()` (3D -> pixel), `SeriesTag`, `IGQuestion` + `qWords`, `ATag`, `Beams`, `Plain` (bar comparison card), `Pipeline` (grid + AI stamps), `CommentPrompt`, `EndCard`; `HANDLE`, `SERIES` constants |
| `src/world/caption.tsx` | `BubbleCaption`: measured wrapping into the right column, 54 -> 42 px, emphasis colours + pop |
| `src/world/world.tsx` | `WorldDef`: one Back canvas inside `Finish`, mount windows, lights, face-mask uniforms, cut-out glow |
| `src/kit/three-canvas.tsx`, `finish.tsx`, `camera.tsx` | shell kit: delayRender-safe ThreeCanvas, bloom/vignette/grain, 2D camera (unused by this world) |
| `src/Film.tsx`, `lib.ts`, `captions.ts`, `presenter.tsx`, `Root.tsx`, `index.ts` | the news-qa-reel shell (v6 staging) |
| `audio/mix.py`, `dsp.py`, `designed.py` | score + SFX bed (`bubble` style), DSP helpers, designed SFX |
| `render_ig.sh`, `qa.sh`, `snap.sh`, `sheet.py`, `dump-beats.mts`, `dump-events.mts`, `run-dump.mjs` | delivery render, QA receipts, stills sheet, JSON dumps for the mixer |
| `package.json`, `tsconfig.json`, `remotion.config.ts` | Remotion 4.0.535 + React 19 + three 0.186 + @react-three/fiber 9 + @remotion/three |

### Film-specific (rewrite for every film; the copies here are worked examples)
| File | Rewrite |
|---|---|
| `src/world/timing.ts` | every cue (`cue`, `cueEnd`, `lastStart`), `FREEZE`, and the screen points where the bubble sits per pose |
| `src/beats.ts` | the beat table (all SIDE, END at `OUTRO.t - 0.3`), cued from `T` |
| `src/world/rig.ts` | `deskK`/`cityK` windows, `bubbleAt` (what happens to the bubble when), poses, `OBJ_*` icons + words, `STEPS`, camera `KEYS` |
| `src/world/overlay.tsx` (`Overlays`, `HookTitle`, `ROWS`, texts) | the exact hook headline, the questions, every chip's words and cue |
| `src/world/tex.ts` (`HUMAN`, `AGENT`, `SPEC`, `AGENT_T`) | the editor's code lines and timing |
| `src/world/emph.ts` | caption emphasis words |
| `src/world/events.ts` | sound events (<= 25/min) from the same constants |
| `audio/mix.py` | `ARR` per beat id if needed; `STYLES["bubble"]` is the world's sound |
| `WORLD-NOTES-source-film.md` | the source film's world notes, v1 -> v6 (keep one like it for every film) |

## Instantiate for a new film
1. Copy this folder to `<project>/film/`; `npm install` (or junction a recent film's `node_modules`).
2. Build the spine with news-qa-reel (real `edl.json`, `words.json`, `vo_env.json`, `mattes.json` + media in `public/`).
   Re-measure `SIDE_FACE` in `presenter.tsx` for the new take.
3. Rewrite `world/timing.ts` and `beats.ts` on the new words; stub the overlays (hook + questions + one chip per beat);
   `npx tsc -p .`; stills of every beat start (`snap.sh`).
4. Decide per beat what the bubble does and where it sits (`rig.ts`), build scenes beat by beat from the approved
   storyboard, keep `events.ts` in step.
5. `dump-beats`, `dump-events`, `audio/mix.py bubble`, `render_ig.sh`, `qa.sh` (see `../reference/pipeline-commands.md`).
