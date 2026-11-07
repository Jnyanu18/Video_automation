# 🎬 Video Automation — Instagram Reels Pipeline

> AI-powered tool that turns a viral Instagram reel (or your own raw footage) into a new, original, publish-ready reel — with a human approving every step.

Built for **Rockcastle** · Powered by n8n, Groq, Airtable, Higgsfield & Gemini AI

---

## What it does

```
Reel URL ──► Scrape + Transcript ──► AI writes ORIGINAL script ──► You approve/edit
    ──► Higgsfield renders cinematic 9:16 video ──► You approve ──► Publish to Instagram
```

Or with your own footage:

```
Upload raw footage ──► Gemini AI edits (cuts silences, reframes, adds captions)
    ──► Storyboard for approval ──► Render ──► Publish
```

**Content rule:** The output must always be original. The pipeline automatically rejects scripts too similar to the source reel. Source footage is never reused.

---

## Architecture

```
Browser
  └─► Dashboard :8787 (Node, zero-dependency)
        └─► n8n :5678  (7 workflows)
              ├─► Apify          — scrape + transcript
              ├─► Groq / Gemini  — AI script writing
              ├─► Airtable       — state store (59-field Reels table)
              ├─► Higgsfield :8794 adapter ──► Higgsfield API (cinematic video)
              ├─► MPT adapter :8791 ──► MoneyPrinterTurbo (faceless fallback)
              └─► Postiz adapter :8790 ──► Instagram publish

Public internet ──► cloudflared tunnel ──► public-media :8792
                    (serves ONLY /render/<id>.mp4 and /media/<id>.mp4)
```

| Component | Location | Notes |
|---|---|---|
| Dashboard backend | `automation/server/` | Zero-dependency Node 18+, session + CSRF |
| Frontend (Expo Web) | `automation/app/` | React Native Web, built → `automation/web/dist/` |
| n8n Workflows | `automation/n8n/*.json` | **Generated** — edit the generator, never the JSON |
| Workflow generator | `automation/n8n/build/generate-workflows.cjs` | Embeds only the core functions each node needs |
| Core logic | `automation/lib/core.js` | State machine, validators, request builders |
| Higgsfield adapter | `automation/adapters/higgsfield/` | Cinematic AI video generation |
| MPT adapter | `automation/adapters/mpt/` | Faceless video fallback (MoneyPrinterTurbo) |
| Postiz adapter | `automation/adapters/postiz/` | Instagram publishing |
| Public media server | `automation/scripts/public-media.cjs` | Only safe thing to expose via tunnel |
| Tests | `automation/test/` | 208 tests, all mock-based |

---

## Tech Stack

| Layer | Tech | Why |
|---|---|---|
| Orchestration | [n8n](https://n8n.io) (self-hosted) | Visual workflows, free |
| State | [Airtable](https://airtable.com) | Free tier, no DB setup |
| Scraping | [Apify](https://apify.com) | Instagram reel scraper |
| Script AI | [Groq](https://groq.com) (`openai/gpt-oss-120b`) | Free, fast JSON mode |
| Video AI | [Higgsfield](https://higgsfield.ai) | Cinematic 9:16 generation, 50+ models |
| Edit AI | [Gemini](https://ai.google.dev) (`gemini-3.5-flash`) | Free, tool-calling agent |
| Video render | [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | Local, MIT, fallback |
| Publish | [Postiz](https://postiz.com) | Instagram scheduling |
| Tunnel | [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) | Free https for video URLs |
| Frontend | Expo Router + React Native Web | Single codebase, web-first |

---

## Verified End-to-End ✅

The following has been run on a real Windows PC against real services:

- **Reel URL → Script → Approval → MoneyPrinterTurbo video → Public HTTPS URL** (record `recF8d2ChFFdpdE9r`)
- **Gemini AI video edit** on raw footage: silence cut, 9:16 reframe, scorecard FAIL→PASS in 89 s, preview MP4 produced
- **208 unit tests** green (mock-based, no API keys needed)
- **94 vitest** (web) + **246 pytest** (AI editor) all pass

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+ with `uv` or `pip`
- FFmpeg (on PATH)
- `cloudflared` for the public tunnel

### 1 — Accounts to create (all free tiers work)

| Service | Sign up | Key goes in |
|---|---|---|
| [Airtable](https://airtable.com) | Create a base, add `Reels` table | `AIRTABLE_BASE_ID`, `AIRTABLE_WRITE_TOKEN`, `AIRTABLE_READ_TOKEN` |
| [Apify](https://apify.com) | Free monthly credit | `APIFY_TOKEN` |
| [Groq](https://console.groq.com) | Free API key | `LLM_API_KEY` (credential `OpenAI API` in n8n) |
| [Higgsfield](https://console.higgsfield.ai) | Pay-as-you-go, ~$0.04–0.20/s | `HIGGSFIELD_API_KEY` |
| [Pixabay](https://pixabay.com/api/docs/) | Free key | `PIXABAY_API_KEY` (optional MPT fallback) |

### 2 — Install and configure

```powershell
cd automation
npm run n8n:install       # one-time: downloads n8n (~500 MB)
```

Copy `automation/env.example` to `automation/.env.local` and fill in your keys.

```powershell
npm run setup:local       # writes secrets into n8n, imports all 7 workflows
```

### 3 — Start the stack

```powershell
npm run start:all         # n8n + adapters + public media + dashboard
```

In a **separate terminal** (needed for video HTTPS links):

```powershell
cloudflared tunnel --url http://127.0.0.1:8792
# Copy the printed https://xxxx.trycloudflare.com
# Set PUBLIC_BASE_URL= in .env.local, then restart start:all
```

> ⏳ Wait ~60 seconds after n8n starts before the dashboard shows green.

- **Dashboard:** http://127.0.0.1:8787
- **n8n editor:** http://127.0.0.1:5678

### 4 — First run

1. Open Settings — fix any red integrations
2. **New Reel → From URL** — paste any public Instagram reel
3. Watch it scrape → AI write script → reach "Awaiting Approval"
4. Read the script, edit if you want, click Approve
5. The video renders and appears as a preview link
6. Click Publish to send to Instagram

---

## AI Video Editor (raw footage pipeline)

The `ai-video-editor/` folder is a full AI video editing system:

```
Raw video ──► Gemini agent (tool-calling) ──► EditPlan ──► FFmpeg cut
    ──► Hyperframes karaoke captions ──► preview MP4
```

```powershell
# From ai-video-editor/
pip install anthropic faster-whisper opencv-python  # one time
python scripts/edit_video.py my_footage.mp4 "cut silences, make it vertical 9:16" --out out/edit
```

Requires a Gemini API key in `ai-video-editor/.env` (see `.env.example`).

### What the AI editor can do (all verified)

- ✅ Silence detection and cutting
- ✅ Vertical reframe (9:16, face-follow or center)
- ✅ Karaoke word-by-word captions (Hyperframes)
- ✅ Zoom, speed, transitions, colour grade
- ✅ Background music + sidechain ducking
- ✅ Objective scorecard — auto-retries bad cuts
- ✅ Style extraction from reference videos

---

## Development

```powershell
# Tests (must stay green; run after any lib/core.js or generator change)
cd automation
npm run build    # regenerate n8n workflow JSON
npm test         # 208 tests

# Frontend rebuild
cd automation/app
npm run build:web

# AI editor tests
cd "ai-video-editor"
npx vitest run           # 94 TypeScript tests
python -m pytest agent/ tools/ evals/ services/ -q   # ~230 Python tests
```

### Key rules for contributors

1. **Never** commit `.env.local` or any API key — it is gitignored
2. Edit `automation/n8n/build/generate-workflows.cjs` and `automation/lib/core.js` — **never** the generated JSON
3. Run `npm run build` then `npm test` after every change
4. Run `npm test` again before pushing — 208 must stay green
5. Tunnel only port 8792 (public media), never 8787 (dashboard)

---

## Project Structure

```
├── automation/
│   ├── adapters/
│   │   ├── higgsfield/     # Higgsfield AI video adapter (port 8794)
│   │   ├── mpt/            # MoneyPrinterTurbo adapter (port 8791)
│   │   └── postiz/         # Instagram publish adapter (port 8790)
│   ├── app/                # Expo Router frontend (React Native Web)
│   ├── docs/               # Setup guides, API docs, Airtable schema
│   ├── lib/
│   │   └── core.js         # State machine + all pure logic
│   ├── mock/               # Mock services for local testing
│   ├── n8n/
│   │   ├── build/          # Workflow generator (edit this, not the JSON)
│   │   └── *.json          # Generated workflow files (01–07)
│   ├── scripts/            # start-all, setup-local, public-media
│   ├── server/             # Dashboard backend (zero-dependency Node)
│   ├── test/               # 208 unit tests
│   └── web/dist/           # Built frontend (served by backend)
├── ai-video-editor/        # AI video editing system (Gemini + FFmpeg)
├── research/blotato/       # Competitive research
└── HANDOFF.md              # Agent handoff notes (session log)
```

---

## Roadmap

- [x] Reel URL → AI script → human approval → video → public URL
- [x] MoneyPrinterTurbo faceless video (local fallback)
- [x] Raw footage upload pipeline
- [x] Gemini AI video editor (silence cut, reframe, captions)
- [x] **Reference Style & AI Storyboard Editor** (inspired by [winkguys reel](https://www.instagram.com/reels/DfJ52pVzp67/))
- [x] **Interactive Storyboard review & AI revision chat in Dashboard**
- [ ] **Higgsfield cinematic video** (adapter built, needs API key)
- [ ] **Visual prompt** in AI script (Higgsfield-ready cinematic description)
- [ ] Real stock footage via Pixabay
- [ ] Instagram publish (Postiz Cloud or Meta Graph API)
- [ ] Content calendar / scheduling
- [ ] Brand kits (voice, fonts, colours per client)
- [ ] Multi-platform (more coming)

---

## Licence

MIT (automation pipeline) · Apache-2.0 (Hyperframes) · See `ai-video-editor/README.md` for editor licences.

---

## Credits

Built by **Jnyanu18** for Rockcastle.  
Architecture inspired by [Blotato](https://blotato.com) (research in `research/blotato/`).
