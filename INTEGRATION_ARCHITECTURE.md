# GrowthOS — Unified AI Video Production Architecture

**Date:** November 15, 2026  
**Architectural Model:** System-of-Record Orchestrator with Specialist Agentic Satellite Intelligence

---

## 1. System Ownership Boundaries

To eliminate architectural drift and competing timeline models, ownership is strictly partitioned across four layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GROWTHOS CORE SYSTEM                            │
│                  (Application & System of Record)                     │
│  • Project Management & Workspace State (studio/store.py)             │
│  • Web Dashboard & User Interface (:8787 Expo SPA)                    │
│  • CanonicalEditPlan Timeline Persistence & Version History            │
│  • Human Approval Gates (Scorecard, Storyboard Sign-Off)              │
│  • Multi-Engine Render Scheduling & Output Publishing                  │
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │                                │
     Invokes for Editorial Intelligence      Invokes for Creative Direction
                    │                                │
┌───────────────────┴──────────────┐   ┌─────────────┴──────────────────┐
│   AGENTIC VIDEO EDITOR (AVE)     │   │         VISHNU STUDIO          │
│  (Primary Editorial Intelligence)│   │ (Creative Direction Specialist)│
│ • Creative Brief Interpretation  │   │ • Agency Creative Playbooks    │
│ • Raw Footage Indexing & Search  │   │   (direction, story-loops)     │
│ • Narrative Arc & Shot Selection │   │ • Remotion Keynote Compositions│
│ • Pacing, Trims & Transitions    │   │ • Automated Slide Carousels    │
│ • Multimodal Video Review (Gemini)│  │ • 1st-2-Seconds Hook Strategies│
│ • Transactional EditorialPatches │   │ • B-roll & Phrase Sync Rules   │
└──────────────────────────────────┘   └────────────────────────────────┘
                    │                                │
                    └────────────────┬───────────────┘
                                     │ Compiles into RenderPlan
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      RENDER EXECUTION INFRASTRUCTURE                   │
│                                                                        │
│   [ FFmpeg ]           [ HyperFrames/GSAP ]          [ Remotion ]      │
│   • Base trims         • Kinetic typography          • 3D & WebGL      │
│   • 9:16 reframe       • SVG gauges & cards          • Carousels       │
│   • Audio mastering    • BeginFrame fast-path        • Opus recipes    │
│   • EBU R128 norm      • ASS subtitle fallback       • Alpha overlays  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Canonical Data Flow & Contract

Every video production workflow (Footage-to-Video, Motion Graphics, or Hybrid) follows one shared, non-negotiable pipeline:

```
[User Brief / Raw Footage / References]
                  │
                  ▼
         1. CreativeBrief
                  │
                  ▼
         2. CreativePlan (Layer 1)
         • Brief interpretation & narrative beats
         • StyleGuide (palette, typography, audio mood)
                  │
                  ▼
      3. CanonicalEditPlan (Layer 2)
      • Exact timeline sequence: List[TimelineClip]
      • Visual overlays: List[OverlayItem]
      • Captions: List[CaptionGroup] (word timestamps)
      • Audio: AudioComposition (ducking, SFX cues, -14 LUFS)
      • Cryptographic SHA-256 fingerprint & revision history
                  │
                  ▼
         [ Human Approval Gate ]
                  │
                  ▼
         4. RenderPlan (Layer 3)
         • FFmpegRenderSpec (clip filters, audio mix)
         • HyperFramesRenderSpec (HTML variables, duration)
         • RemotionRenderSpec (composition props, alpha export)
                  │
                  ▼
         5. Render Output (.mp4)
                  │
                  ▼
         6. Dual-Tier QA Evaluation
         • Tier 1: Technical FFprobe (black frames, freeze, LUFS)
         • Tier 2: Creative Multimodal Review (Gemini 3.1 Pro)
                  │
      ┌───────────┴───────────┐
      ▼                       ▼
   [PASS]                  [FAIL]
      │                       │
Publish / Export       Targeted EditorialPatch -> Re-render
```

---

## 3. Integration Boundaries & Adapters

### A. AVE Integration Boundary (`automation/editor/integrations/ave/`)
AVE is invoked via a strict, type-safe Python interface (`AVEAdapter`):
* **Inputs:** `CreativeBrief`, list of raw footage file paths, optional style DNA reference.
* **Outputs:** 
  1. `FootageIndex` (PySceneDetect shots + Whisper word timestamps + Gemini visual tags).
  2. `EditorialPatch` proposals (atomic operations: `add_clip`, `trim_clip`, `add_overlay`, `add_sfx`).
  3. `ReviewScore` (adherence, pacing, visual_quality, watchability, overall + timestamped suggestions).
* **Guards:** AVE never mutates the timeline directly. It emits an `EditorialPatch`, which GrowthOS validates against `validate_timeline_consistency()` before applying.

### B. Vishnu Studio Integration Boundary (`automation/editor/integrations/vishnu/`)
Vishnu Studio is invoked as a specialist creative module (`VishnuBridge`):
* **Inputs:** Approved script or transcript segments.
* **Outputs:**
  1. Storyboard beat sheet (`direction` playbook: 1 visual state per second, hook moment in first 2.0s).
  2. Remotion carousel slides (`studio/carousel.py` -> 1080x1350 PNG slide decks).
  3. Remotion Keynote composition specs (`keynote.tsx`).
* **Execution:** Commands run via isolated subprocesses through `kit/remotion.mjs` restricted to `vishnu-studio/`.

---

## 4. Multi-Engine Rendering Contracts

| Engine | Inputs | Outputs | Fallback Behavior |
|---|---|---|---|
| **FFmpeg** | `FFmpegRenderSpec` | Master video/audio stream (MP4, H.264/AAC) | Stream copy on errors; baseline x264 software encode |
| **HyperFrames** | `HyperFramesRenderSpec` (HTML + GSAP) | Transparent overlays / burned MP4 | If Chrome crashes, auto-falls back to burning subtitles via FFmpeg `libass` |
| **Remotion** | `RemotionRenderSpec` | ProRes 4444 / WebM with alpha or standalone MP4 | Standard Remotion CLI rendering with memory cap |
| **Opus Motion** | Parametric JSON props via `cli/mgl.mjs` | Alpha video clips / web snippets | Pre-rendered still sheets / baseline SVG |

---

## 5. Security & Stability Policies

1. **Path Traversal Guards:** Media file paths must reside within authorized directories (`raw footage/`, `server/storage/`, `exported_ads/`). All paths outside these boundaries trigger HTTP 400.
2. **ContextVar Review Guard:** The Gemini review tool enforces `_ALLOWED_REVIEW_VIDEO_PATH` via `contextvars.ContextVar` to prevent arbitrary local file exfiltration through model tool calls.
3. **Transactional Patches:** Applying an `EditorialPatch` automatically snapshots the timeline. Any inconsistency triggers an immediate, atomic rollback.
4. **Hardware-Aware Concurrency:** HyperFrames headless Chrome rendering is capped at `workers=2` to prevent memory contention on non-GPU environments.
