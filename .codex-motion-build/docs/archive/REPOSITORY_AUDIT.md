# GrowthOS — Complete Repository Audit

**Date:** November 15, 2026  
**Auditor:** Principal AI Architect, Video Production Engineer, Technical Auditor  
**Audit Scope:** Full workspace (`J:\ai editor`), sub-repositories, packages, dependencies, and media assets.

---

## 1. Executive Assessment

The GrowthOS workspace is a comprehensive multi-engine AI video production studio. It contains mature, working infrastructure across five interconnected codebases:
1. **GrowthOS Core (`automation/`)**: FastAPI backend (:8793), Node.js server (:8787), and Expo / React Native Web SPA.
2. **Agentic Video Editor (`agentic-video-editor/`)**: Google ADK & Gemini 3.1 Pro agentic pipeline (`ave`).
3. **Vishnu Studio (`vishnu-studio/`)**: Remotion React studio, creative direction playbooks (`direction`, `story-loops`), and automated slide carousels.
4. **Opus Motion Library (`opus-motion-library/`)**: 616 parameterized Remotion motions, 97 transitions, 148 styles, and 33 recipes.
5. **Remotion Templates (`remotion-templates/`)**: 81 pre-built motion graphics compositions.

The underlying infrastructure is **exceptionally capable and stable** (394 Python tests passing, 223 Node tests passing, zero TypeScript errors). However, previous workflows have left temporary experiment artifacts, unclassified render outputs, and partial duplicate paths that require formal consolidation.

---

## 2. Workspace & Repository Boundaries

The workspace consists of five distinct Git and directory domains:

```
J:\ai editor\
├── automation\                       [Junction -> new project - marketing automatio\automation]
├── new project - marketing automatio\ [Main Git Repo: origin/main, feature/growthos-p0-foundation]
│   └── automation\
│       ├── app\                      (React Native Web / Expo SPA Dashboard)
│       ├── server\                   (Node.js Express API & Proxy :8787)
│       └── editor\                   (FastAPI Python Video Engine :8793)
├── agentic-video-editor\             [Independent Git Repo: origin/main]
│   ├── src\agents\                   (Director, Trim Refiner, Editor, Reviewer)
│   ├── pipelines\                    (ugc-ad.yaml)
│   └── styles\                       (dtc-testimonial.yaml)
├── vishnu-studio\                    [Standalone Studio Directory - No .git]
│   ├── remotion\                     (React 19 / Remotion 4 Keynote compositions)
│   ├── kit\                          (remotion.mjs runner)
│   └── .claude\skills\               (Agency direction playbooks)
├── opus-motion-library\              [Independent Git Repo: origin/main]
│   ├── cli\                          (mgl.mjs catalog & render CLI)
│   └── src\motions\                  (616 motions across 18 families)
├── remotion-templates\               [Independent Git Repo: origin/main]
├── raw footage\                      (Ingested client & reference footage: 209.02 MB)
├── rockcastle video reference\       (Client reference videos: 57.02 MB)
├── exported_ads\                     (Production-ready rendered MP4s: 15.47 MB)
├── reels\                            (HyperFrames ad experiments: 32.42 MB)
├── clients\                          (Active client deliverables: 137.53 MB)
├── export\                           (Legacy showcase deliverables: 77.65 MB)
└── experiments\                      (Director 2.0 intelligence audit data: 39.54 MB)
```

---

## 3. Existing System Capabilities & Operational Status

| Subsystem | Location | Tech Stack | Status | Evaluation & Operational Role |
|---|---|---|---|---|
| **GrowthOS Dashboard** | `automation/app/` | React Native Web, Expo, TypeScript | **Fully Functional** | 19 screens covering Ingest, Studio, Storyboard, Footage, Timeline, QA, Publishing, Analytics. Zero TS errors. **System of Record.** |
| **GrowthOS Node Server** | `automation/server/` | Node.js, Express (:8787) | **Fully Functional** | Session management, media file streaming, proxying to FastAPI, Postiz publishing adapters. |
| **GrowthOS FastAPI Engine** | `automation/editor/` | Python 3.12, FastAPI (:8793) | **Fully Functional** | Timeline processing, whisper word alignment, silence cutting, scorecard checks, FFmpeg cut/audio master, HyperFrames render. |
| **P0 Schemas & AI Router** | `automation/editor/tools/edit/` & `agent/` | Pydantic v2, Python 3.12 | **Fully Functional** | Layer 1 `CreativePlan`, Layer 2 `CanonicalEditPlan`, Layer 3 `RenderPlan`, adapters, capability AI router. 9/9 tests pass. |
| **Agentic Video Editor (AVE)** | `agentic-video-editor/` | Google ADK, Gemini 3.1 Pro, PySceneDetect | **Fully Functional** | Native video scene analysis (`analyze_footage`), rendered MP4 judge (`reviewer.py`), trim refiner. Installed in editable mode (`ave`). |
| **Vishnu Studio** | `vishnu-studio/` | Remotion 4, React 19, TypeScript | **Fully Functional** | Agency direction playbooks, carousel slide generator (`studio/carousel.py`), keynote lane (`keynote.tsx`). |
| **Opus Motion Library** | `opus-motion-library/` | Remotion, React 19, SVG, Three.js | **Fully Functional** | 616 motions, 97 transitions, 33 recipes. Supports alpha ProRes/WebM overlays via `mgl.mjs`. |
| **HyperFrames Engine** | `automation/editor/app/` | Node.js, Chrome, GSAP | **Fully Functional** | Frame-accurate browser-based rendering with BeginFrame fast path and FFmpeg libass subtitle fallback. |

---

## 4. Duplicate Implementations & Overlap Analysis

1. **Editorial Planning:**
   * `automation/editor/studio/director.py` (text transcript prompt) vs `automation/editor/agent/director_engine.py` (staged reasoning) vs `agentic-video-editor/src/agents/director.py` (ADK Gemini planner).
   * *Resolution:* Consolidated under the P0 `CanonicalEditPlan` contract in Phase 2. AVE becomes the primary reasoning brain, dispatching to Vishnu Studio when motion direction is needed.
2. **Video & Scene Analysis:**
   * `automation/editor/tools/analysis/footage_intelligence.py` (OpenCV + Haar face detection + PySceneDetect) vs `agentic-video-editor/src/tools/analyze.py` (Gemini File API video upload).
   * *Resolution:* Combine them into a 2-tier pipeline: Fast local deterministic pass (Whisper + PySceneDetect) followed by semantic Gemini video tagging.
3. **Rendered Video QA:**
   * `automation/editor/services/render/render_qa.py` (FFprobe stream, black frames, freeze, LUFS) vs `agentic-video-editor/src/agents/reviewer.py` (Gemini qualitative review).
   * *Resolution:* Unified in Phase 2: Technical QA (FFprobe) runs first; if clean, Creative QA (Gemini) scores watchability and pacing.

---

## 5. Dependency & Environment Analysis

* **Python Environment:** Python 3.12.4 on Windows x64.
  * `automation/editor/requirements.txt`: FastAPI, Uvicorn, Pydantic v2, faster-whisper, numpy, opencv-python, jsonschema, anthropic, pytest, yt-dlp.
  * `agentic-video-editor/pyproject.toml`: google-adk, google-genai, scenedetect[opencv], moviepy, pysubs2, click, pyyaml.
  * *Status:* No conflicting version pins. Both packages share the virtual environment cleanly.
* **Node Environment:** Node.js v20.x, npm, pnpm.
  * `automation/package.json`: Express, Postiz client, Airtable client.
  * `automation/app/package.json`: Expo 51, React Native Web 0.19, Lucide icons.
  * `vishnu-studio/package.json`: Remotion 4.0, React 19.
  * `opus-motion-library/package.json`: React 19, Three.js, Remotion.
* **Hardware & Acceleration Constraints:**
  * System GPU: Intel(R) UHD Graphics (shared memory). No NVIDIA CUDA driver.
  * *Constraint:* Deep neural nets (e.g. PyTorch image generation or local Whisper large-v3) must run in CPU-quantized mode (faster-whisper int8) or offloaded to hosted Gemini APIs.

---

## 6. Current Git State

* **Main Repository (`new project - marketing automatio`):**
  * Current Branch: `feature/growthos-p0-foundation`
  * Head Commit: `aed177e` (*feat(growthos-p0): 3-layer edit plan separation, adapters, and capability AI router*)
  * Uncommitted modifications: `automation/app/src/api/editor.ts`, `automation/app/src/app/(app)/qa.tsx`, `automation/editor/api_server.py`.
  * Untracked: `automation/editor/studio/ave_integration.py`, `test_ave_integration.py`.
* **Sub-Repositories:**
  * `agentic-video-editor`: Clean on branch `main`.
  * `opus-motion-library`: Clean on branch `main`.
  * `remotion-templates`: Clean on branch `main`.
