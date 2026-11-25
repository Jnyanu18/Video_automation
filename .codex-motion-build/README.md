# AILO Studio

Two products in one workspace.

**1. AI Video Editor** - upload 3-4 minutes of raw footage, get an edited cut in
about 30 seconds. Transcribe, cut silences without clipping words, karaoke
captions, an AI director that decides what to show, an objective scorecard, a
human approval gate, then render and publish.

**2. Motion-graphics films** - ads, reels and launch films built from images and
motion graphics, with no filmed footage. A creative brief goes in; Claude directs
the film, writes it in code, renders frames, looks at them, critiques its own
work and iterates until it passes a rubric.

They share a renderer, a director brain and a media layer. They are separate
products, not one tool with two modes.

---

## Layout

| Path | What it is |
|---|---|
| `automation/` | **Product 1.** FastAPI engine on :8793, Node gateway on :8787, Expo dashboard. A junction into `new project - marketing automatio/` (see Gotchas). |
| `packages/motion-kit/` | **Product 2's renderer.** The one shared Remotion kit. Was copied per-film; now consumed, not duplicated. |
| `skills/motion-director/` | The director's craft: process, motion vocabulary, craft rules, sound design, critic rubric. Read by the model, not by the engine. |
| `apps/motion-api/` | **Product 2's service.** Specified in `skills/motion-director/references/api-integration.md`. **Not yet built.** |
| `projects/` | 16 films, each self-contained. |
| `clients/` | Einstein Box, Gritstones, Rockcastle - source assets and delivered films. |
| `media/` | `exports/` (output), `reference/` (material we study). |
| `raw footage/` | Source footage for Product 1. Despite the name, much of it is intermediates. |
| `assets/sfx/` | 40 pre-cleared CC0 sound effects. |
| `tools/` | Scripts worth running again, plus `cleanup/` and its undo logs. |
| `docs/archive/` | Superseded architecture docs and 32 one-off job scripts. |
| `vishnu-studio/` | A separate Remotion studio (vishnubuilds.ai). The engine bridges to it. |
| `.restructure/` | Baseline manifest and the reversible move logs. |

Third-party clones live outside the tree in `J:\_vendor\`. The product imports none of them.

---

## Running Product 1

```powershell
cd automation\editor
pip install -r requirements.txt
cd app; npm install; cd ..          # HyperFrames CLI
# automation\editor\.env : EDITOR_LLM=gemini, GEMINI_API_KEY=...
cd ..\app; npm install              # dashboard
cd ..; npm run setup:local
```

Needs Node 18+, Python 3.11+, FFmpeg on `PATH`, and Chrome for the rich render
path. **Without Chrome, captions silently fall back to FFmpeg and the better
visuals just do not appear** - it does not error.

## Running Product 2

```powershell
cd packages\motion-kit
node render.mjs --stills 1.0 2.5 --format jpeg --width 540   # frames to look at
node render.mjs --final --name film.mp4 --json               # render + scorecard
python gate.py                                               # loudness gate
```

`--json` prints one JSON object on stdout (`path`, `duration`, `fps`, `width`,
`height`, `lufs`, `peak`); logs go to stderr so stdout stays parseable. Set
`CHROME_PATH` if Remotion cannot find a browser.

Audio mixes to **-2.0 dBTP** so the delivered AAC lands under the **-1.5 dBTP**
gate. The 0.5 dB gap is deliberate encode headroom, not an inconsistency.

---

## Gotchas

These cost hours if you do not know them.

- **`automation/` and `reelforge/` are Windows directory junctions**, not
  folders, both pointing into `new project - marketing automatio/new project -
  marketing automatio/`. `os.path.islink()` returns **False** for a junction, so
  any script that walks the tree counts everything twice and may follow one into
  the engine. Test the reparse-point bit instead. Run git from the nested repo
  root with `-c core.longpaths=true`.
- **Some folders cannot be moved.** The engine finds `raw footage/`,
  `assets/sfx/` and `vishnu-studio/` by walking *up* the tree, which only works
  because resolving the junction passes back through the workspace root. Move
  them and resolution fails **silently** - no error, just missing media. Set
  `EDITOR_MEDIA_ROOTS`, `EDITOR_SFX_DIR` and `VISHNU_STUDIO_DIR` first.
- **Twelve `reel.json` files hardcode absolute `J:/ai editor/clients/...` paths**
  (six engine reel specs under `automation/editor/studio/reels/`, six in client
  project folders). Moving anything inside `clients/` means rewriting them in the
  same step.
- **Agentic Video Editor is wired in by a machine-global editable install**
  (`pip install -e` pointing at `agentic-video-editor/`). On any machine without
  it, the AVE integration reports itself unavailable rather than failing loudly.
- **Two copies of the 40 sound effects exist** - `assets/sfx/` and
  `automation/editor/assets/sfx/`. The engine finds its own copy first. The
  engine copy is untracked in the engine repo, so a `git clean` there removes it
  and 20 tests start failing with a `FileNotFoundError`.
- Moves during the restructure went through `.restructure/move.py`, which logs
  every move and can reverse any run with `--undo`.

## Status

Verified by running it, on 2026-11-19:

- Product 1: **414 Python tests and 223 Node tests pass.**
- Product 2: the kit renders stills and finished films from a clean checkout.
- `apps/motion-api/` is **not built yet** - the spec is written, the kit CLI it
  needs is ready, the service is not.
- Product 1's engine was being modified by a separate workstream (multi-user
  accounts, a HyperFrames-based motion lane) while this restructure ran, so
  anything under `automation/` may have moved on since.

The documents in `docs/archive/` describe an older, partly aspirational plan -
one of them specifies an `integrations/` directory that does not exist. Treat
them as history. **Trust the code, not the docs.**
