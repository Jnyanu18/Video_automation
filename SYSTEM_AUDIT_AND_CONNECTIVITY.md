# AILO Studio — Comprehensive System Audit & Connectivity Report

**Audit Date:** November 2026  
**Workspace:** `J:\ai editor`  
**Git Branch:** `pilot-accounts`  
**Target Services:** Node Gateway (:8787 / :10000), FastAPI Editor Engine (:8793), Motion API (:8795), Expo Web Dashboard  

---

## 1. Executive Verdict & Core Diagnosis

The project contains **over 70,000 lines of robust, well-architected backend code, complete render engines, and 50+ production skills**. However, the frontend currently feels broken, disconnected, and non-functional to the user.

### Why Does the Frontend Feel Broken?
1. **The Dual-Backend Identity Crisis:**  
   The application is split between two incompatible historical architectures:
   - **Universe A (Legacy Blotato Stack):** Relies on `n8n` (:5678), `Airtable`, `Apify`, and `HeyGen` (`/api/reels`, `/api/options`, `/api/summary`).
   - **Universe B (FastAPI AI Video Editor Engine):** Standalone engine on `:8793` with multi-tenant SQLite stores, HyperFrames, Remotion, and Gemini Director (`/api/editor/*`).  
   *The frontend mixes both indiscriminately.* For example, creating a reel in `/new` (Mode 1) requires Universe A, but editing in `/studio` requires Universe B. A button in `storyboard.tsx` even attempts to send a Universe B render into Universe A's Airtable upload endpoint!

2. **The "Demo Data" Fallback Trap:**  
   When the database is empty (e.g. a new account or clean deployment), screens do not show clear empty states. Instead, they fall back to **hardcoded mock arrays** (e.g., `sb1` in Storyboard, `rec_01` in Editing Memory, `DEMO_QUEUE` in Publishing). When the user clicks "Approve", "Final Render", "Revise", or "Schedule", the frontend sends requests to the backend with fake IDs like `sb1`, resulting in **404 Not Found** errors!

3. **Pure Mock Screens With Zero Wiring:**  
   Key flagship screens—specifically **Timeline Editor (`timeline.tsx`)** and **Publishing (`publishing.tsx`)**—are completely hardcoded visual shells. `timeline.tsx` makes zero API calls, and `publishing.tsx` only calls `toast()` on submit, ignoring the real publishing backend engine that exists in `studio/publishing.py`!

4. **Cloud Container Gaps (Render.com Deployment):**  
   On Render.com, the cloud container was missing the studio folder in its build context, `pnpm`, `pillow`, and `edge-tts`, causing Creator Studio to show "Setup needed" and disabling video/carousel generation.

---

## 2. Screen-by-Screen Audit Matrix

Every screen in [automation/app/src/app/(app)/](file:///j:/ai%20editor/automation/app/src/app/(app)/) was audited against its API calls and backend route handlers:

| Screen / Route | Intended Purpose | API Calls Made | Backend Handler | Status | Why It Fails / Current Reality |
|:---|:---|:---|:---|:---:|:---|
| **Overview**<br>`/` (`index.tsx`) | Executive dashboard & pipeline metrics | `editor.overview()`<br>`editor.health()` | `GET /api/editor/overview`<br>`GET /api/editor/health` | **PARTIAL** | Works if storyboards exist in SQLite. If empty, shows 0s. The recent reels list and activity feeds are disconnected from real rendering events. |
| **New Reel**<br>`/new` (`new.tsx`) | Intake: Raw footage upload, auto-edit, or reel remake | `editor.autoEdit()`<br>`editor.createStoryboard()`<br>`post('/api/reels')`<br>`post('/api/reels/upload')` | `POST /api/editor/reel/auto`<br>`POST /api/editor/storyboard/create`<br>`POST /api/reels` | **SPLIT** | • **Auto-Edit mode:** Works if Gemini key is set.<br>• **URL Remake mode:** Fails with 502/500 if n8n/Airtable/Apify are not running.<br>• **Upload mode:** Fails if Airtable is unconfigured. |
| **AI Studio**<br>`/studio` (`studio.tsx`) | Chat-based prompt revisions with AI Director | `editor.styles()`<br>`editor.chat()`<br>`editor.copilot()`<br>`editor.render()` | `POST /api/editor/storyboard/{id}/chat`<br>`POST /api/editor/copilot/chat` | **BROKEN (Empty)** | Depends on `useStoryboards()`. If no storyboard is loaded, chat is disabled or fails. Copilot chat fails if Gemini API key is missing. |
| **Storyboard**<br>`/storyboard` (`storyboard.tsx`) | Scene cards, approvals, scorecard, renders | `editor.storyboards()`<br>`editor.approve()`<br>`editor.render()`<br>`editor.posts()` | `POST /api/editor/storyboard/{id}/approve`<br>`POST /api/editor/storyboard/{id}/render` | **BROKEN (Trap)** | When database has no storyboards, falls back to `demoStoryboards` (`id: 'sb1'`). Clicking "Approve" or "Render" calls `/sb1` $\to$ **404 Not Found**. Button "Send to approval pipeline" calls legacy `/api/reels/upload` and crashes. |
| **Creator Studio**<br>`/creator-studio` | Remotion carousels, video library, music | `editor.vsStatus()`<br>`editor.vsVideos()`<br>`editor.vsMakeCarousel()` | `GET /api/editor/vstudio/status`<br>`POST /api/editor/vstudio/carousel` | **WORKING (Local)**<br>⚠️ Needs deploy on cloud | Local junction works. On cloud (Render), was failing due to missing folder and pnpm (fixed in Dockerfile). |
| **Motion Graphics**<br>`/motion` (`motion.tsx`) | Brief-to-video motion reels via Remotion | `editor.motionPreview()`<br>`editor.motionCreate()`<br>`editor.render()` | `POST /api/editor/motion/preview`<br>`POST /api/editor/motion/reel` | **PARTIAL** | Backend routes exist in `studio/motion_api.py`. Fails in containers lacking Chrome or where Remotion dependencies aren't built. |
| **Timeline Editor**<br>`/timeline` (`timeline.tsx`) | Multi-track video/audio/caption editor | **NONE** | **NONE** | ❌ **MOCK ONLY** | **100% hardcoded dummy data.** Shows fake tracks (`v1`, `c1`, `Punch-In Zooms`). Moving clips does nothing; no API calls; cannot save or render. |
| **Publishing**<br>`/publishing` (`publishing.tsx`) | Social scheduling & multi-platform dispatch | **NONE** | Backend has routes (`/api/editor/publishing/*`) | ❌ **MOCK ONLY** | **Completely disconnected.** Uses `DEMO_PLATFORMS` and `DEMO_QUEUE`. Submit button only shows `toast()`. Ignores the real Python publishing engine! |
| **Series Engine**<br>`/series` (`series.tsx`) | Multi-episode content series from niche | `editor.series()`<br>`editor.generateSeries()`<br>`editor.episodeStoryboard()` | `GET /api/editor/series`<br>`POST /api/editor/series/generate` | **PARTIAL** | UI is wired, but marked "Coming soon". Requires Gemini LLM to generate structure. Fails if footage is not staged in workdir. |
| **Footage Intel**<br>`/footage` (`footage.tsx`) | Semantic search across raw video clips | `post('/api/editor/media/search')` | `POST /api/editor/media/search` | **STUBBED** | Displays hardcoded fallback scenes. Endpoint searches `runtime/users/{uid}/footage/`. If no clips were indexed, search returns empty and UI shows static cards. |
| **Style DNA**<br>`/styles` (`styles.tsx`) | Inspect visual style presets & pacing | `get('/api/editor/styles/dna')` | `GET /api/editor/styles/dna` | **READ-ONLY** | Endpoint returns JSON presets. Screen displays cards, but has zero controls to create, modify, or tune styles. |
| **Multi-Version**<br>`/versions` (`versions.tsx`) | A/B variant cut comparisons | `get('/api/editor/versions')` | `GET /api/editor/versions` | **READ-ONLY** | Displays hardcoded cards (`ver_retention_a`, `ver_educational_b`). Clicking cards does nothing; no render or compare action. |
| **Render QA**<br>`/qa` (`qa.tsx`) | Objective defect inspector & audio metrics | `get('/api/editor/qa/inspect')` | `GET /api/editor/qa/inspect` | **STUBBED** | Falls back to a mock report for `sample_reel.mp4`. If user has no active render, shows hardcoded metrics (-14.1 LUFS). |
| **Editing Memory**<br>`/editing-memory` | Algorithmic retention rules & past reach | `get('/api/editor/editing-memory')` | `GET /api/editor/editing-memory` | **READ-ONLY** | Displays hardcoded records (`rec_01`, `rec_02`). No mechanism to apply rules to an active storyboard. |
| **Media Library**<br>`/media` (`media.tsx`) | Browse rendered videos and 40 CC0 SFX | `editor.media()` | `GET /api/editor/media`<br>`GET /api/editor/sfx` | **WORKING** | Audio player works for SFX. Falls back to 8 demo videos if no real renders exist. |
| **Integrations**<br>`/integrations` (`integrations.tsx`) | Live health probes of services & APIs | `editor.health()`<br>`get('/api/settings')` | `GET /api/editor/integrations/health` | **WORKING** | Accurately tests and reports live status of Node, FastAPI, FFmpeg, Whisper, and APIs. |
| **Reel Detail**<br>`/reels/[id]` | Legacy Airtable reel approval & publish | `get('/api/reels/{id}')`<br>`post('/api/reels/{id}/approve')` | Node Gateway $\to$ Airtable / n8n | ⚠️ **ISOLATED** | Only sees legacy Airtable records. Completely unaware of FastAPI storyboards. |
| **Client Demo**<br>`/demo` (`demo.tsx`) | Pitch demo screen for prospective clients | **NONE** | **NONE** | ❌ **MOCK ONLY** | Unsplash images with non-functional radio buttons. |

---

## 3. How Everything Is Connected (System Topology)

```mermaid
flowchart TD
    subgraph Browser ["User Browser (React Native Web / Expo)"]
        Nav["Navigation Bar"]
        ScreenA["Screens (Studio, Storyboard, Motion, Creator Studio)"]
        ScreenB["Mock Screens (Timeline, Publishing, Demo)"]
        ScreenC["Legacy Screens (/reels/[id])"]
    end

    subgraph Gateway ["Node Gateway (:8787 / :10000)"]
        AuthMiddleware["Auth & Session (scrypt cookie)"]
        EditorProxy["editor-proxy.cjs (Rewrites & Injects X-Studio-User)"]
        LegacyRoutes["Legacy Handlers (/api/reels, /api/options)"]
    end

    subgraph UniverseB ["FastAPI AI Editor Engine (:8793)"]
        Tenancy["tenancy.py (Tenant Isolation Router)"]
        SQLite["SQLite Store (runtime/users/{uid}/studio.db)"]
        Director["Gemini AI Director (agent/loop.py)"]
        Renderer["HyperFrames (chrome-headless-shell)"]
        RemotionEngine["Remotion Kit & Creator Studio"]
        PublishEngine["studio/publishing.py (UNCONNECTED TO UI)"]
    end

    subgraph UniverseA ["Legacy Automation Stack"]
        N8N["n8n Workflows (:5678)"]
        AirtableStore["Airtable Database"]
        HeyGen["HeyGen API"]
    end

    Browser -->|HTTP Requests| Gateway
    Gateway --> AuthMiddleware

    AuthMiddleware -->|"/api/editor/*"| EditorProxy
    EditorProxy -->|"Private HTTP + X-Studio-User"| Tenancy
    Tenancy --> SQLite
    Tenancy --> Director
    Tenancy --> Renderer
    Tenancy --> RemotionEngine
    Tenancy -.->|Exists but UNCALLED by publishing.tsx| PublishEngine

    AuthMiddleware -->|"/api/reels/*"| LegacyRoutes
    LegacyRoutes -.->|Requires API Keys| N8N
    N8N -.-> AirtableStore
    N8N -.-> HeyGen

    ScreenB -.->|Zero API Calls (Dead End)| Browser
```

---

## 4. What Is Built vs. What Is Unbuilt

### What HAS Been Built (The Strong Foundation)
- **FastAPI Engine (`automation/editor/api_server.py`):** 61 working endpoints covering storyboard creation, automatic scene cutting, subtitle generation, and sound mixing.
- **Multi-Tenant Security (`studio/tenancy.py`):** Clean filesystem and database isolation per user account.
- **Remotion Creator Studio (`automation/creator-studio/`):** Complete Remotion project with 60+ video templates, custom mascots (Pixel Vishnu), and Instagram carousel renderer.
- **Audio Engineering Pipeline:** Dynamic music ducking, silent drops on punchlines, and `-14 LUFS` / `-1.5 dBTP` broadcast compliance gates.
- **AI Director Loop:** Gemini multimodal prompt pipeline that inspects video transcripts and plans scene-by-scene edits.
- **50+ Design Skills (`.agents/skills/`):** Full craft knowledge for GSAP, Remotion, copywriting, psychological hooks, and sound design.

### What Is UNBUILT or DISCONNECTED (The Root of the Problem)
1. **Frontend-to-Backend Publishing Connection:**  
   Backend has `studio/publishing.py` with queue management, account linking, and scheduling. **Frontend `publishing.tsx` is completely disconnected and calls none of it.**
2. **Timeline Editor Data Binding:**  
   `timeline.tsx` has beautiful drag tracks, but it is **not bound to `EditPlan` or `Storyboard` data**.
3. **Storyboard Empty State & Action Handlers:**  
   `storyboard.tsx` lacks a proper empty state and falls back to fake `sb1`, causing 404 errors when clicked.
4. **Unified Ingestion:**  
   The application lacks a single consolidated video project model. Projects created via the AI Editor live in FastAPI SQLite, while projects created via URL scraping live in Airtable.
5. **Interactive Controls on Intelligence Screens:**  
   `styles.tsx`, `versions.tsx`, `footage.tsx`, and `editing-memory.tsx` are static read-only views with no action buttons to apply their intelligence to real videos.

---

## 5. The Exact Roadmap to Refine and Connect Everything

To transform AILO Studio from a collection of isolated modules into a seamless, fully working product:

### Phase 1: Eliminate All Mock Data Traps (Immediate)
- **Fix `storyboard.tsx`:** Remove `demoStoryboards` (`sb1`). If `storyboards` is empty, render a clean, high-converting EmptyState with a 1-click button to upload raw footage or generate a demo.
- **Wire `publishing.tsx`:** Connect `publishing.tsx` directly to `editor.queue()`, `editor.accounts()`, and `editor.schedule()`, deleting the hardcoded `DEMO_PLATFORMS` and `DEMO_QUEUE`.

### Phase 2: Connect the Timeline to Real Storyboards
- **Bind `timeline.tsx` to Active Storyboard:** Pass `?sb=<id>` into `timeline.tsx`, parse `storyboard.scenes` into timeline tracks (Video Track from scene timings, Caption Track from scene captions, SFX Track from scene sound effects), and allow real playback and edits.

### Phase 3: Unify the Video Pipeline (Bridge Universe A & B)
- **Deprecate Legacy Airtable Ingestion:** Redirect all reel creation in `/new` to create FastAPI Storyboards directly. Eliminate dependency on external Airtable/n8n for core editing features.
- Make `/reels/[id]` an alias to `/storyboard?sb=[id]` so there is only one unified video detail view.

### Phase 4: Make Intelligence Screens Actionable
- **Footage Search:** Connect search results directly into the Storyboard Creator.
- **Style DNA:** Add a "Use this Style" button on each preset card that opens `/new` with that style pre-selected.
- **Editing Memory:** Add an "Apply Retention Rules to Cut" action.
