# GrowthOS — Phased Implementation Roadmap

**Date:** November 15, 2026  
**Status:** Planning & Dependency Ordering (Execution paused pending Phase 1 approval)

---

## Roadmap Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Repository Audit & Safe Cleanup Proposal [COMPLETE]           │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 2: AVE Integration as Primary Editorial Intelligence             │
│          • Adapter layer in automation/editor/integrations/ave/        │
│          • Pydantic v2 contract enforcement                            │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 3: Vishnu Studio Integration                                     │
│          • Creative direction specialist & Remotion Keynote bridge     │
│          • Automated slide carousels & agency playbooks                │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 4: Reference DNA Intelligence                                    │
│          • Pacing, typography, and motion extraction from reels        │
│          • Reusable style profiles (da0-minimalist, keynote-vishnu)    │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 5: Three Production Workflows                                    │
│          • Workflow A: Footage-to-Video                                │
│          • Workflow B: Motion Graphics Studio                          │
│          • Workflow C: Hybrid Production                               │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 6: Rendering Architecture Hardening                              │
│          • FFmpeg + HyperFrames + Remotion RenderPlan compiler         │
│          • Render caching, failure recovery & telemetry                │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 7: Unified Dashboard Integration                                 │
│          • Workflow selectors on existing React Native Web UI          │
│          • Real-time progress, live QA radar, revision inspector       │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 8: Real-World Acceptance Testing                                 │
│          • End-to-end media tests across all 3 workflows               │
│          • Failure recovery & hardware resource benchmarking           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Phase Breakdown

### Phase 2: AVE Integration as Primary Editorial Intelligence
* **Goal:** Connect `agentic-video-editor` (`ave`) as the primary agentic reasoning engine behind GrowthOS.
* **Deliverables:**
  * `automation/editor/integrations/ave/adapter.py`: Type-safe adapter translating AVE's internal structures to `CanonicalEditPlan` and `EditorialPatch`.
  * `automation/editor/integrations/ave/vision.py`: Gemini multimodal video analysis with frame-accurate timestamp reconciliation.
* **Testing:** Pytest verifying brief interpretation, shot selection, and patch generation on test clips without direct timeline mutation.
* **Acceptance Gate:** AVE proposes edits exclusively as validated transactional patches.

### Phase 3: Vishnu Studio Integration
* **Goal:** Connect Vishnu Studio as the specialist creative direction and Remotion composition provider.
* **Deliverables:**
  * `automation/editor/integrations/vishnu/bridge.py`: Clean subprocess runner for Remotion keynote rendering and automated carousel generation.
  * System prompt integration embedding Vishnu's `direction`, `story-loops`, and `first-2-seconds` rules into AVE's Director agent.
* **Testing:** Generate a 5-slide Remotion carousel and keynote scene via bridge commands.
* **Acceptance Gate:** Carousel and keynote assets compile deterministically with zero third-party license conflicts.

### Phase 4: Reference DNA Intelligence
* **Goal:** Extract reusable visual, motion, and acoustic signatures from reference reels (like `@da0dayipsie`).
* **Deliverables:**
  * `automation/editor/tools/analysis/reference_dna.py`: Analyzes scene duration distribution, color schemes, font styling, and cut cadence.
  * `references/dna/da0-minimalist.json` and `references/dna/keynote-vishnu.json`: Structured profiles.
* **Testing:** Run DNA extractor on `raw footage/event test/Instagram_Da0DayIpsie.mp4` and assert generated profile matches visual parameters.
* **Acceptance Gate:** Profile produces original creative compositions matching the reference aesthetic without duplicating copyrighted content.

### Phase 5: Three Production Workflows
* **Goal:** Implement the three unified workflows through the shared `CanonicalEditPlan`.
* **Deliverables:**
  * Workflow A (Footage-to-Video): PySceneDetect + Whisper + AVE shot selection + FFmpeg cuts.
  * Workflow B (Motion Graphics Studio): Brief + Reference DNA + HyperFrames/Remotion generation.
  * Workflow C (Hybrid Production): Real camera footage coexisting with animated UI/motion overlays on one timeline.
* **Testing:** Pipeline integration tests for each workflow generating valid `CanonicalEditPlan` instances.
* **Acceptance Gate:** All three workflows serialize and deserialize identically.

### Phase 6: Rendering Architecture Hardening
* **Goal:** Ensure all render engines consume compiled `RenderPlan` specifications with automatic failover.
* **Deliverables:**
  * Direct `RenderPlan` consumption in `cut.py` and `composition.py`.
  * Failover handler: If headless Chrome BeginFrame fails, fall back to FFmpeg subtitle burns.
* **Testing:** Fault injection test (simulate browser crash and verify automated fallback).
* **Acceptance Gate:** Zero orphaned browser processes; deterministic render outputs.

### Phase 7: Unified Dashboard Integration
* **Goal:** Expose the three workflows in the existing GrowthOS React Native Web UI without redesigning the frontend.
* **Deliverables:**
  * Mode selector (Footage / Motion / Hybrid) in `new.tsx`.
  * Real-time progress streaming via Server-Sent Events (SSE).
  * Multimodal QA radar display in `qa.tsx`.
* **Testing:** TypeScript check (`npx tsc --noEmit`) + browser interaction verification.
* **Acceptance Gate:** Zero mocked controls; every button triggers a real backend operation.

### Phase 8: Real-World Acceptance Testing
* **Goal:** Final end-to-end verification across all three workflows using real video files.
* **Deliverables:**
  * Complete acceptance report with rendered MP4 outputs, QA scorecards, and resource logs.
* **Acceptance Gate:** 100% compliance with technical and creative QA standards.
