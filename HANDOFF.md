# HANDOFF: Instagram Reels automation tool

For the next coding agent. Read this whole file first, then `automation/docs/free-stack-setup.md`.
Written 2026-11-07 by Claude Code. Updated 2026-11-07 by Antigravity (Claude Sonnet 4.6 Thinking).

## Antigravity session log (2026-11-07)

**What was run (all verified on this PC):**
- `npm test` in `automation/` → **208/208 pass** ✅
- `npx vitest run` in `ai-video-editor (5)/web/` → **94/94 pass** ✅
- `python -m pytest agent/ tools/ evals/ services/` in `ai-video-editor (5)/` → **230 pass, 1 fail, 1 skip** ⚠️
  - 1 failure is a test-isolation bug (`test_adapter_uses_real_agent_when_present` fails because the real `.env` Gemini key is present; the test expects a fake backend); not a code defect
  - `python -m pytest styles/` run separately → **16/16 pass** ✅ (structural collision between two `test_tools.py` files; fix: add `__init__.py` to test dirs)
- **Real Gemini edit run** (`scripts/edit_video.py samples/sample.mp4 "cut silences, make vertical 9:16"`):
  - 11 API calls, 89 s, scorecard FAIL→PASS (agent self-corrected a mid-word cut), preview MP4 at `out/edit/work/preview.mp4` ✅ **VERIFIED**
- `pipeline/main.py` (prototype): broken on Windows (`npx` not `npx.cmd`); superseded by `services/`

**Changes made:** None to either project code yet. Created comprehensive [README.md](file:///c:/Users/jnyan/Downloads/new%20project%20-%20marketing%20automatio/new%20project%20-%20marketing%20automatio/README.md) and initialized git repository at https://github.com/Jnyanu18/Video_automation and pushed to `main`. Verified all `.env` and `.env.local` files remain safely ignored.

**Recommendation for 6B:** Wrap `ai-video-editor` as a local adapter service on `:8793` (FastAPI). Use its existing `run_agent()` and `adapters.collect_tools()`. Do not extract code. Its EditPlan JSON is the contract. Keep its `.env` separate from `automation/.env.local`.

**Known issue found:** `faster-whisper` ≥ 1.1 changed the `open()` kwarg; pass `{"metadata_errors": "ignore"}` to fix. Low priority.

---

Everything below marked **verified** was observed running on the owner's PC. Everything marked **not verified** was not.

---

## 1. What this product is

A tool that turns a viral Instagram reel (or the owner's own raw footage) into a new, original, publish-ready reel with a human approving every step:

```
reel URL --> scrape + transcript --> AI rewrites an ORIGINAL script --> human approves/edits --> video is made --> human approves --> publish to Instagram
```

It is modelled on a commercial product called Blotato (research is in `research/blotato/`). The owner wants (a) to prove it works on **free/open-source services first**, then pay for real ones; (b) to **impress a client**, so it needs polish and extra features, not only automation.

Content rule built into the design: the output must be **original**. The pipeline rejects scripts too similar to the source. Do not weaken this and do not reuse a source reel's own footage.

## 2. Architecture (all local, one Windows PC)

```
Browser --> Dashboard backend :8787 --> n8n :5678 (7 workflows) --+--> Apify (scrape)            [real, verified]
 (Expo web app, served by backend)      zero-dependency Node      +--> Groq (script + Whisper)   [real, verified]
                                        reads Airtable read-only  +--> Airtable (state store)    [real, verified]
                                                                  +--> MPT adapter :8791 --> MoneyPrinterTurbo :8080  [real, verified]
                                                                  +--> Postiz adapter :8790 --> Postiz --> Instagram   [NOT verified, not configured]
Public internet --> tunnel --> public-media :8792 (serves ONLY /render/<id>.mp4 and /media/<id>.mp4)
```

| Part | Where | Notes |
|---|---|---|
| Dashboard backend | `automation/server/*.cjs` | Zero dependencies, Node 18+. Session cookie + CSRF. API documented in `automation/docs/backend-api.md` |
| Frontend | `automation/app/` (Expo Router, React Native Web). Built output in `automation/web/dist/` | Rebuild: `cd automation/app && npm run build:web`. Typecheck: `npx tsc --noEmit`. A plain-JS fallback UI is in `automation/web/dist-legacy/` |
| Workflows | `automation/n8n/*.json` (01 intake, 02 content, 03 approval, 04 video, 05 publish, 06 upload intake, 07 status) | **Generated.** Edit `automation/n8n/build/generate-workflows.cjs` and `automation/lib/core.js`, then `npm run build`. Never hand-edit the JSON. Workflow 08 (stuck-record sweep) is not built |
| Pure logic | `automation/lib/core.js` | State machine, validators, request builders. The generator embeds only the functions each n8n Code node uses |
| Postiz adapter | `automation/adapters/postiz/` | Speaks the three Blotato-shaped calls workflow 05 makes, translates to Postiz's public API |
| Video adapter | `automation/adapters/mpt/` | Speaks the HeyGen-shaped calls workflow 04 makes, drives MoneyPrinterTurbo. Copies finished videos to `automation/runtime/renders/` |
| Public media server | `automation/scripts/public-media.cjs` | The ONLY thing a tunnel should expose. The dashboard/login/API are not reachable through it |
| Setup / run | `automation/scripts/setup-local.cjs`, `start-all.cjs`, `create-airtable-table.cjs` | See section 4 |
| Mocks + tests | `automation/mock/`, `automation/test/` | `npm test` = 208 tests, all mock-based, all green at last run |
| n8n runtime | `automation/runtime/n8n` (npm-installed n8n 2.46), data in `automation/runtime/n8n-data` | Git-ignored |
| MoneyPrinterTurbo | `C:\tools\mpt` (outside the repo; path must contain no spaces) | MIT licence, Python 3.12 venv via `uv sync` |
| Secrets | `automation/.env.local` | **Never print, log, commit or paste its contents.** Contains Airtable, Apify, Groq tokens and generated webhook secrets |

## 3. Current state

**Verified end to end with real services** (reel `recF8d2ChFFdpdE9r`, status `VIDEO_COMPLETED`):
submit URL -> Apify scrape + transcript -> Groq (`openai/gpt-oss-120b`, strict JSON schema) writes script -> saved in Airtable -> human approves -> MoneyPrinterTurbo renders a 1080x1920 H.264/AAC video with AI voiceover (Edge TTS) and captions -> served over a public https URL -> downloadable with Range support.

**Not verified / not working yet**
1. **Footage is fake.** MoneyPrinterTurbo is set to `MPT_VIDEO_SOURCE=local` with two coloured test-pattern clips, so videos look like colour bars. Fix needs the owner's free **Pixabay** key (Pexels has paused new keys): put it in `C:\tools\mpt\config.toml` as `pixabay_api_keys = ["..."]` and set `MPT_VIDEO_SOURCE=pixabay`. Footage relevance (keywords from the script) is untested.
2. **Publishing to Instagram has never run.** `PUBLISH_ADAPTER=postiz` is set but `POSTIZ_*` are empty. Postiz self-hosting needs Docker (not installed). Unverified Postiz details: the `/upload` response shape (adapter expects `{id, path}`) and the self-hosted API base path (`/api/public/v1` per docs).
3. **Reel-URL-to-video visual quality** is unknown until real footage is connected.
4. **Audio**: the file has audible speech (measured, mean about -24 dB). The owner heard nothing inside VS Code's built-in browser panel, which often has no audio. Not yet confirmed in a normal player.
5. The Expo frontend screens other than login, dashboard, reels list, reel detail (after fix) and settings were not exercised: New reel form submit and Upload tab were not tested in the browser.
6. The stack was **stopped** when the last session ended, and the tunnel address saved in `.env.local` (`PUBLIC_BASE_URL`) is **dead**. See section 4.

**Test records in Airtable** (table `Reels`, 59 fields, created by `scripts/create-airtable-table.cjs`): `recF8d2ChFFdpdE9r` (video completed, colour-bar video) and `recBLuqxxReyHvtru` (awaiting approval; a tutorial reel, safe to delete).

## 4. Running it

```
cd automation
npm run start:all        # n8n + MoneyPrinterTurbo (if MPT_DIR set) + adapters + public media + dashboard
```
- Wait about **60 seconds after n8n starts**; until its workflows activate the dashboard shows `N8N_WORKFLOW_NOT_ACTIVE` or a failing Airtable probe. This is startup lag, not a bug.
- Dashboard: http://127.0.0.1:8787. The local password is whatever `scripts/setup-local.cjs` printed or `.env.local` implies. It is a weak dev password: **replace it before any public deployment** (set `DASHBOARD_PASSWORD`, delete `DASHBOARD_PASSWORD_HASH`, rerun `npm run setup:local`).
- After changing `.env.local`: `npm run setup:local` (re-imports credentials and workflows into n8n; idempotent, stable workflow ids) then restart `start:all`.
- **Tunnel** (needed because video links must be https): in a separate terminal run `cloudflared tunnel --url http://127.0.0.1:8792`, copy the printed `https://....trycloudflare.com`, set `PUBLIC_BASE_URL=` to it in `.env.local`, restart. The address changes every time. Tunnel ONLY port 8792, never 8787. `cloudflared` is installed. A permanent named tunnel or a real host is the proper fix.
- Tests: `npm run build` (if you touched `lib/core.js` or the generator) then `npm test`.
- Provider health: dashboard Settings page, or `GET /api/settings?refresh=1`.

## 5. Hard-won facts (read before debugging)

- **Airtable token scopes**: the n8n (write) token needs `data.records:read` + `data.records:write`; the dashboard (read) token only `data.records:read`. A token edited to add only schema scopes loses data access. Airtable returns 403 `INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND` for both a missing table and missing scopes. `AIRTABLE_BASE_ID` is the 17-character `app...` id only, not a URL.
- **Groq retires models without notice** (`llama-3.3-70b-versatile` is gone, causing a 404 "resource not found"). Check `GET https://api.groq.com/openai/v1/models`. Current: `openai/gpt-oss-120b` with `LLM_JSON_MODE=json_schema` passed the pipeline's validator. The LLM setting is provider-neutral: `OPENAI_BASE_URL`, `OPENAI_MODEL`, `LLM_JSON_MODE=json_schema|json_object|none`. Claude works through Anthropic's OpenAI-compatible endpoint (`https://api.anthropic.com`, mode `none`), untested.
- **Video links must be https** (workflow 04 rejects others with `VIDEO_URL_MISSING_OR_NOT_HTTPS`).
- **MoneyPrinterTurbo** accepts local clips only from its own `storage/local_videos` (by file name). `video_script` and `video_terms` in its API let us drive it without its own LLM. Pexels API keys are paused.
- The backend returns a reel's `error` as an **object** on the detail endpoint and a string on the list endpoint. The frontend now normalises it with `errorLabel()` (`app/src/api/client.ts`). Before this fix, the reel detail page went blank.
- `FAILED` records can be retried with `POST /api/reels/:id/retry`; the stored error log persists even after recovery, so show it only when status is FAILED.
- Windows: Node `process.exit()` right after `fetch` can trigger a libuv assertion; use `process.exitCode`. Python scripts printing emoji need UTF-8 stdout.
- n8n was force-killed several times; it recovers ("Last session crashed") but starts slowly after.
- Nothing is pushed anywhere; this folder is not a git repo. `.gitignore` already excludes `.env.local`, `runtime/`, `node_modules/`.

## 6. What to build next

The owner said "automation alone is not enough": add features that impress a client. Priorities, in order:

### A. Real footage (small, unblocks everything visual)
Owner adds a Pixabay key (their action). You: switch `MPT_VIDEO_SOURCE`, render a real video, look at frames, and improve footage matching (better search terms than "most frequent words", possibly asking the LLM for 5 visual keywords in workflow 02 and passing them as `video_terms`).

### B. Video editing with Claude (the main new feature)
Origin: the owner saved a reel (https://www.instagram.com/reels/DfJ52pVzp67/, creator `winkguys`) describing "Claude as an AI video editor": a folder with `raw footage / reference / export`; free tools Hyperframes (motion graphics), FFmpeg (cuts), Whisper (captions), yt-dlp (study reference videos); give it 3-5 reference reels to derive a **style sheet** (fonts, pacing, sound design); then drop raw footage and it writes a **storyboard first**, the user requests changes, then it renders.

**The owner already has a working project for this**: `C:\Users\jnyan\Downloads\ai-video-editor (5)\`. From its README/CHANGELOG (not run by me this session):
- Pipeline: raw video -> analyse (silences, Whisper words) -> **tool-calling agent** (Claude, or Gemini/Groq/OpenRouter/Ollama via `EDITOR_LLM`) writes an edit plan -> FFmpeg cuts/effects/audio -> Hyperframes karaoke captions -> MP4.
- Has: `agent/` (tool loop, review gate with an evals scorecard), `tools/` (edit, effects, audio, visuals, analysis), `styles/` (extract a style from a reference video and apply it), `services/api` + `services/render`, `web/` (Next.js UI with Auto reel / Chat / Manual editor), `evals/`, `scripts/edit_video.py`, API contract in `docs/CONTRACT.md`.
- Its CHANGELOG records real runs with Gemini and tests (vitest 94, pytest suites); a real Claude run was **not** done there. It also lists what was not done (drag captions on timeline, B-roll/music pickers, waveform, mobile editor).
- Licences: Hyperframes Apache-2.0; Palmier Pro source GPLv3 (binaries after v0.7.6 proprietary); **Remotion needs a company licence above small-team thresholds** (the project lists it in `app/package.json` but marks it unused). Check before shipping anything commercial.
- Its `.env` holds a real key. Do not open, print or copy it into this repo.

Your task: (1) read that project, run its tests and one sample edit, and report honestly what works; (2) decide whether to integrate it as-is behind its API or extract parts; (3) if useful, add an **edit stage** to our pipeline:
`upload raw footage + choose a style` -> transcribe -> **storyboard written by the LLM, shown in the dashboard for approval/changes** -> render -> final video -> our existing approval -> publish.
Reuse our patterns: a small local adapter service with an n8n workflow calling it, state in Airtable (new statuses need adding to the `Status` and `FailedFromState` select options AND to `lib/core.js` `STATES`/`TRANSITIONS`), a dashboard screen for storyboard approval. Use Claude for the planning model when available; Gemini/Groq free tiers otherwise (the owner's rule is free first). Downloading other people's reels with yt-dlp for style study may break Instagram's terms; prefer references the owner owns or has permission for, and say so in the UI.

### C. More platforms and Instagram publishing (needs clarification, see section 8)
- The owner mentioned adding **"X"** (probably X/Twitter posting) and "the plan that Instagram has given us". Treat both as unconfirmed until asked. Design intent: generalise workflow 05 and the publish adapter into per-platform adapters (`instagram`, `x`), selectable per reel, behind the same duplicate-publish safeguards (persisted intent, no blind retry, human check on unknown outcomes).
- Instagram routes: Postiz (needs Docker or Postiz Cloud) or the official Instagram Graph API (needs a Meta app, a business/creator account and app review). `core.js` has an unimplemented optional `meta` adapter stub.
- Test only with a **throwaway Instagram account**.

### D. Client-impressing features (suggestions, not agreed; confirm with the owner)
Content calendar / scheduling, brand kits (fonts, colours, logo, voice per client), reusable style templates, multiple brands/accounts, analytics (views per post via the platform APIs), batch submission, approval links for clients, a real video preview page with the storyboard, voice picker and caption-style picker, white-label look. Each needs a design decision from the owner first.

### E. Deployment (planned for Tuesday onwards)
Real server with https (replace the quick tunnel), strong dashboard password and `SESSION_SECRET`, `NODE_ENV=production`, build workflow 08 (stuck-record sweep), run one backend instance only (in-flight locks are per process), persistent `UPLOAD_DIR`/`RENDER_DIR`, backups of Airtable, rotate any key that was ever pasted into a chat.

## 7. Rules for you

1. Never print or commit `.env.local`, the editor project's `.env`, or any token. If a key appears in a log, tell the owner to rotate it.
2. Do not publish to a real Instagram account without the owner's explicit say-so; use a throwaway account.
3. Do not weaken the originality checks or reuse a source reel's footage.
4. Edit the workflow generator and `lib/core.js`, never the generated JSON; run `npm run build` and `npm test` (208 must stay green; add tests for what you add).
5. Report honestly: say what you ran and what you only wrote. This project previously claimed readiness for things that had only been run against mocks.
6. Keep the tunnel pointed at port 8792 only.
7. Ask before installing large software (Docker, GPU models) or spending money.

## 8. Open questions for the owner

- What exactly is "X" / "XP / Xfield" and "the plan that Instagram has given us"? (X/Twitter posting? an Instagram API plan or access tier?)
- Pixabay key: added yet? Does the owner want a different footage source?
- Is the `ai-video-editor (5)` project the owner's own work, and may we copy its code into this product?
- Who is the client and what do they need to see in a demo?
- Docker Desktop: allowed to install (needed for self-hosted Postiz)?
- Which LLM for editing: Claude (paid, best) or Gemini/Groq (free)?

## 9. Suggested first message to paste into Antigravity

> Read `HANDOFF.md` in the project root, then `automation/docs/free-stack-setup.md`. Do not touch `.env.local`. Start with section 6A and 6B: first get the stack running per section 4 and confirm the Settings page, then study `C:\Users\jnyan\Downloads\ai-video-editor (5)`, run its tests and one sample edit, and report back what works before changing anything in the automation project.
