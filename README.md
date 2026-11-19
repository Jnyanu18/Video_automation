# AI Video Studio & Growth Operating System

An AI-assisted short-form video studio. **Paste a link or pick a file, click Auto-edit, review, approve, publish.** Every number on the dashboard is computed from real records.

```
link or file ─► download (yt-dlp) ─► transcribe ─► tighten silences without cutting words ─► karaoke captions
            ─► AI DIRECTOR: hook title, speaker card, animated diagrams, zooms, sound effects, closing line
            ─► storyboard + objective scorecard ─► YOU APPROVE ─► render (FFmpeg + HyperFrames + audio mix)
            ─► post text (Instagram / YouTube Short / X) ─► schedule / publish ─► record results ─► analytics
```

## What came from where

The studio began as four separate projects. Their best parts now live in one engine, `automation/editor`, behind one dashboard:

| Project | What was kept and where it went |
|---|---|
| **automation** | The dashboard server and app, the publishing adapters (Postiz, MoneyPrinterTurbo) and the n8n / HeyGen approval pipeline. Renders flow into it with **Send to approval pipeline** |
| **editor** | The engine itself: edit tools, timeline, render pipeline, scorecard, agent, approval gate |
| **reelforge** | Downloading a reel from a link (now `studio/ingest.py`), **learning one style from several reference reels** (`styles/aggregate.py`, Studio screen), and the storyboard-then-approve flow. The standalone ReelForge app is legacy |
| **vishnu-studio** | **Connected through `studio/vstudio.py` (screen: Vishnu Studio).** Carousels are fully automatic: a storyboard's transcript becomes slides (`studio/carousel.py`) rendered by the studio's own Remotion carousel lane. The studio's video library, its sign-offs (ticked only by a person pressing a button) and its music tracks are visible and usable from the dashboard. Its playbook also powers the rest: the `direction` and `story-loops` skills became the AI director's rules (`studio/director.py`); the `captions` skill became the post-text writer (`studio/posts.py`); its first-two-seconds rule and storyboard-before-render rule are enforced by the scorecard and the approval gate. Its **animated (narrated) lane stays human-directed**: its scenes are hand-built per video (about 6 of 53 scene types are generic), so the dashboard shows its readiness and library but does not generate those videos |
| **agentic-video-editor** | **Integrated via `studio/ave_integration.py` (`/api/editor/ave/*`).** Multi-agent ensemble (Director → Trim Refiner → Editor → Reviewer) with automated retry loop. Provides PySceneDetect ContentDetector shot splitting, DTC/UGC ad pipeline manifests (`pipelines/ugc-ad.yaml`), style templates (`styles/dtc-testimonial.yaml`), and Gemini 3.1 Pro native video review (`ReviewScore`: adherence, pacing, visual quality, watchability, overall + feedback). Also available via the `ave edit` CLI |

| Folder | State |
|---|---|
| `automation/editor/` | **Primary.** FastAPI :8793. Tested end to end |
| `automation/server/`, `automation/app/` | **Primary.** Node :8787 + Expo / React Native Web dashboard |
| `automation/n8n/`, `automation/adapters/` | Tested against mocks and a simulated n8n only; not run against real providers |
| `vishnu-studio/` | Independent Remotion studio; supplies the playbook above |
| `reelforge/` | Legacy; features absorbed (see above) |
| `education-video/`, `event-graphics/`, `yc-graphics/`, `scripts/` | One-off HyperFrames compositions and FFmpeg render scripts |

`automation/` at the repository root is a junction to `new project - marketing automatio/new project - marketing automatio/automation`; `start-studio.ps1` creates it if missing.

## How it works

1. **Source.** Paste a link (Instagram, YouTube, TikTok and similar; use only videos you own or may edit), upload a file, or pick one from `raw footage/`. Links are fetched into `raw footage/ingested/`. Paths outside the allowed media folders are refused.
2. **Auto-edit (background job, progress shown live).** The tool transcribes with faster-whisper, removes silences **without cutting inside a word**, and adds word-by-word karaoke captions. Then the **director** reads the transcript and decides what to show: one structured LLM call proposes a hook title, a speaker card (only for a name actually said), up to 7 **animated diagrams** (counter, easy-vs-hard, others-vs-us, step flow, before-after), zooms, 3 to 5 sound effects and a closing share line. Plain code validates and snaps all of it to the transcript, and the same deterministic runner executes it. With no LLM a plainer built-in planner is used and the storyboard says so.
3. **Or describe it yourself.** The older agent path (tool calls from a written request) is still there, along with **recipes** (`automation/editor/recipes/*.json`, fixed steps with no LLM, API only) for repeatable edits.
4. **Scorecard** (objective, not taste): cuts inside a word, leftover silence, caption length and reading speed, loudness jumps at cuts, **3-second hook** (warn > 0.6 s, **fail > 1.5 s** to the first spoken word) and **share trigger** (also read from on-screen text). A FAIL blocks approval.
5. **Approval gate.** Previews are allowed for review; a **final render is refused until you approve the storyboard**. Revising withdraws the approval.
6. **Render.** FFmpeg cuts, reframes and zooms; HyperFrames draws captions, titles and the animated diagrams in a headless browser; the audio pass mixes voice, music, **sound effects**, then normalises loudness. The generated animation script is syntax-checked before rendering. If the browser render fails, **captions are burned in with FFmpeg and a warning says what could not be drawn**.
7. **Post text.** *Write post text* produces the Instagram caption, YouTube Short title and description, and X post from what the video says, following the studio's captions rules (hook first, no hype or emojis, no invented numbers, no bracketed asides in paste-ready text). It pre-fills Publishing.
8. **Publish.** Schedule on Instagram through the Postiz adapter. A create request that may have reached the platform is an *unknown outcome* and is never retried automatically. Platforms without a connector show **Not connected**.
9. **Learn.** Record reach, sends, saves and completion on a published post; Analytics derives rates from those numbers. Learn a **style** from 1 to 5 reference reels in the Studio screen.

A finished render can also enter the approval pipeline of the n8n/HeyGen system (**Send to approval pipeline**) with its real duration, size and hash.

## Dashboard

Overview · New edit (**Auto-edit** from a link or file) · AI Studio (watch the cut, revise it in plain language, learn a style from reference reels) · Storyboard (what the director decided, scenes, SFX, scorecard, approve, preview/final render, post text, send to publishing) · Content Intelligence (live checks) · Series Engine (episodes with hooks and open loops, each linked to its storyboard) · Media Library (renders, 40 CC0 sound effects with audition) · Publishing · Analytics · Automation (n8n workflows and live pipeline counts) · Settings (defaults for new edits, thresholds) · Integrations (live probes).

Empty and error states are shown as such: no screen falls back to sample data.

## Setup

Requirements: Node 18+, Python 3.11+, FFmpeg on `PATH`, Chrome (for HyperFrames; optional, captions fall back to FFmpeg).

```powershell
# editor engine
cd automation\editor
pip install -r requirements.txt     # includes yt-dlp for links
cd app; npm install; cd ..          # HyperFrames CLI
# automation\editor\.env
#   EDITOR_LLM=gemini
#   GEMINI_API_KEY=...

# dashboard
cd ..\app; npm install
cd ..; npm run setup:local           # writes automation\.env.local (dashboard password, optional providers)
```

Publishing needs: `PUBLISH_ADAPTER=postiz`, `POSTIZ_API_URL`, `POSTIZ_API_KEY`, and `PUBLIC_BASE_URL` set to the **public https** address of the media server (port 8792), for example a Cloudflare tunnel, so Instagram can download the video.

LLM choice (`automation/editor/.env`): `EDITOR_LLM=gemini` with `GEMINI_API_KEY`, or `EDITOR_LLM=anthropic` with `ANTHROPIC_API_KEY` (optional `EDITOR_LLM_MODEL`) to use Claude. The director and post-text writer need one; without it they fall back to plainer built-in versions.

Optional environment: `EDITOR_MEDIA_ROOTS` (extra folders videos may be read from), `EDITOR_MAX_ITERATIONS` (agent steps, default 10), `HYPERFRAMES_TIMEOUT` (seconds, default 900), `EDITOR_SFX_DIR`.

## Run

```powershell
.\start-studio.ps1        # or start-studio.bat
```

Dashboard http://127.0.0.1:8787 · Editor API http://127.0.0.1:8793/docs · n8n :5678 (if installed). State is saved in `automation/editor/work/studio_state.json`, so a restart loses nothing.

Rebuild the web bundle after changing the UI: `cd automation\app && npm run build:web`.

## Tests

```powershell
cd automation;        npm test                  # 223 Node tests (mocks + a fake editor service)
cd automation\editor; python -m pytest          # ~285 Python tests: tools, timeline, render (real FFmpeg), agent, API
cd automation\app;    npx tsc --noEmit; npx expo lint
```

The API tests drive a scripted LLM client, real FFmpeg and a fake publishing adapter; none need network access or API keys.

## The Vishnu studio connection

- **What the dashboard does with it:** shows what is installed and what is missing (with a one-click Remotion install), renders carousels, lists the studio's videos with their sign-offs, and lists its music tracks (none are included in this copy; tracks you add under `videos/_music` or `videos/*/music` appear automatically and can be put under a storyboard's voice).
- **Rules kept in code:** only whitelisted commands run (carousel render, install), always inside the studio folder; a job never ticks a sign-off, only a person pressing the button does; ElevenLabs music is not exposed (its own rule: voices only).
- **What was added inside `vishnu-studio/`:** `remotion/src/carousel-index.ts` and `carousel-root.tsx` (a carousel-only Remotion entry, because Remotion otherwise bundles every video's scenes and one missing data file stops the render), and one line in `kit/remotion.mjs` so the entry can be chosen with `STUDIO_ENTRY`. The bridge re-applies them if missing. `pnpm install` created `node_modules` there, and the first render downloads a headless browser (about 110 MB).
- **Check carousel text by hand.** Names come from a machine transcript.

## Known limits

- The n8n workflows and the HeyGen / Blotato / Apify / Airtable path have not run against real accounts.
- Only Instagram has a publishing connector. Engagement figures are entered by hand.
- Style cloning needs a local reference video (downloading by URL is not implemented).
- `faster-whisper` downloads its model on first use; transcription is CPU-bound.

## License & credits

Studio pipeline: MIT · HyperFrames: Apache-2.0 · Built by Jnyanu18.
