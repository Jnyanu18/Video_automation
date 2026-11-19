# GrowthOS — Repository Cleanup & Classification Report

**Date:** November 15, 2026  
**Status:** Audit & Proposal Only (Zero Deletions Executed in this Phase)  
**Safety Mandate:** Strictly preserve working code, raw footage, client deliverables, and active compositions.

---

## 1. File Classification Summary

Every file and directory across the workspace has been audited and classified into five categories:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WORKSPACE CLASSIFICATION                        │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────┤
│  KEEP (88%)  │ MIGRATE (4%) │ ARCHIVE (7%) │ DELETE (<1%) │ REVIEW (1%)│
└──────────────┴──────────────┴──────────────┴──────────────┴────────────┘
```

1. **`KEEP`**: Active, working source code, primary media libraries, client deliverables, and active compositions.
2. **`MIGRATE`**: Partially connected bridge modules that will be reorganized into dedicated integration namespaces in Phase 2/3.
3. **`ARCHIVE`**: Historical experiments, previous ad drafts, and interim render logs that should be preserved in an `archive/` folder.
4. **`DELETE`**: Confirmed temporary build artifacts, empty text files, and duplicate logs with zero preservation value.
5. **`REVIEW`**: Ambiguous client deliverables or unreferenced video clips requiring explicit user decision.

---

## 2. Detailed Classification Inventory

### A. Core Codebases & Infrastructure (`KEEP`)

| Path | Size / Files | Status | Reason & Dependencies |
|---|---|---|---|
| `automation/` | ~350 MB | **KEEP** | Primary GrowthOS Dashboard, Node Server (:8787), and FastAPI Engine (:8793). System of record. |
| `agentic-video-editor/` | ~600 MB | **KEEP** | Primary editorial intelligence brain (`ave` CLI, ADK, Gemini multimodal reviewer). |
| `vishnu-studio/` | ~450 MB | **KEEP** | Creative direction playbooks, Remotion Keynote composition lane, automated carousel generator. |
| `opus-motion-library/` | ~25 MB | **KEEP** | 616 parameterized motions, 97 transitions, 33 production recipes. |
| `remotion-templates/` | ~15 MB | **KEEP** | 81 ready-to-use Remotion templates and animation primitives. |
| `.agents/skills/` | ~1 MB | **KEEP** | Active workspace skills (`opus-motion`, `motion-graphics`, `hyperframes`, `direction`, `media-use`). |
| `assets/sfx/` | ~8 MB | **KEEP** | 40 CC0 studio sound effects used by the audio mastering pipeline. |

---

### B. Media & Footage Repositories (`KEEP`)

| Path | Size / Files | Status | Reason & Dependencies |
|---|---|---|---|
| `raw footage/ingested/` | 46.5 MB (10 files) | **KEEP** | Batch 1 downloaded Instagram reference reels. Used by style learning engine. |
| `raw footage/event test/` | 12.0 MB (5 files) | **KEEP** | Batch 2 downloaded reference reels (`DdO63LGPBsn`, `Da0DayIpsie`, `DLCcWGBpQlV`, `DYCWOHCzS4v`, `DWbRdy8CUOf`). |
| `raw footage/` (root clips) | 150.5 MB | **KEEP** | `event_source.mp4`, `video_track_30s.mp4`, `overlay.webm`, `event_meta.json`. Core benchmark test footage. |
| `rockcastle video reference/` | 57.02 MB (5 files) | **KEEP** | High-production client reference reels for Rockcastle luxury project. |
| `reference/` | 7.53 MB (4 files) | **KEEP** | Raw reference videos (`Video-20341.mp4`, etc.) used by style aggregation algorithms. |

---

### C. Active Compositions & Deliverables (`KEEP` vs `ARCHIVE`)

| Path | Size | Status | Action & Detail |
|---|---|---|---|
| `ailo-da0-reel/` | 10.38 MB | **KEEP** | Active source composition for official AILO Swiss-minimalist ad. |
| `ailo-da0-reel/assets/scenes/` | 0.2 MB | **KEEP** | Scene voiceover files `vo1.mp3` through `vo7.mp3` moved cleanly from root. |
| `ailo-ad-1/` | 5.13 MB | **KEEP** | Active source composition for AILO Kinetic Commercial ad. |
| `ailo-ad-2/` | 3.21 MB | **KEEP** | Active source composition for AILO Sleek Neo Launch ad. |
| `ailo-ad-3/` | 4.27 MB | **KEEP** | Active source composition for AILO Creative Burst ad. |
| `clients/` | 137.53 MB | **KEEP** | Active client project deliverables: `einstein-box`, `gritstones`, `rockcastle`. |
| `exported_ads/AILO_Official_Reel_Da0Style_V2.mp4` | 3.16 MB | **KEEP** | **Current approved production video ad.** |
| `exported_ads/AILO_Ad_1_Kinetic_Commercial.mp4` | 3.21 MB | **KEEP** | Completed production video ad. |
| `exported_ads/AILO_Ad_2_Sleek_Neo_Launch.mp4` | 1.66 MB | **KEEP** | Completed production video ad. |
| `exported_ads/AILO_Ad_3_Creative_Burst.mp4` | 2.58 MB | **KEEP** | Completed production video ad. |
| `exported_ads/AILO_Exact_Reference_Da0DayIpsie.mp4` | 2.32 MB | **ARCHIVE** | Move to `archive/reels/exported_ads/` (1:1 replica of reference reel, not branded ad). |
| `exported_ads/AILO_Reel_Custom_Script_Da0Style.mp4` | 2.22 MB | **ARCHIVE** | Move to `archive/reels/exported_ads/` (Draft V1 before brand color fix). |
| `reels/` | 32.42 MB | **ARCHIVE** | Move to `archive/reels/hyperframes_experiments/` (`ailo-launch`, `reel-b`, `reel-c`, `reel-d` and their render logs). |
| `export/` | 77.65 MB | **ARCHIVE** | Move to `archive/showcase_exports/` (`percentage_masterclass`, `Dubai_Diamond_Conference`, `AskVerb_YC2027`). |
| `experiments/` | 39.54 MB | **ARCHIVE** | Move to `archive/experiments/` (Director 2.0 intelligence audit data & keyframes). |

---

### D. Code Modules to Migrate (`MIGRATE`)

| Current Path | Proposed Target Path | Status | Technical Reason |
|---|---|---|---|
| `automation/editor/studio/ave_integration.py` | `automation/editor/integrations/ave/adapter.py` | **MIGRATE** | Decouple AVE bridge into a dedicated integration namespace with Pydantic v2 schemas. |
| `automation/editor/studio/vstudio.py` | `automation/editor/integrations/vishnu/bridge.py` | **MIGRATE** | Reorganize Vishnu Studio bridge into dedicated integration namespace. |
| `scripts/*.py` | `automation/editor/scripts/legacy/` | **MIGRATE** | Consolidate loose root scripts (`render_final.py`, `build_yc_soundtrack.py`) under editor scripts. |

---

### E. Proposed Deletion Candidates (`DELETE` - Zero Source Code)

| Exact File Path | Size | Reason for Deletion | Safety Check |
|---|---|---|---|
| `raw footage/event_source.txt` | 0 B | Empty 0-byte text file. | Verified 0 bytes, zero references in codebase. |
| `reels/reel-b/render.log` | 46.4 KB | Old transient render log. | Obsolete log from 11/11/2026. |
| `reels/reel-c/render.log` | 44.6 KB | Old transient render log. | Obsolete log from 11/11/2026. |
| `reels/reel-d/render.log` | 52.8 KB | Old transient render log. | Obsolete log from 11/11/2026. |

---

## 3. Proposed Unified Archive Directory Structure

Upon your explicit approval, inactive historical outputs will be moved non-destructively to `archive/`:

```
J:\ai editor\
└── archive\
    ├── experiments\
    │   └── director_2_intelligence_audit\      (from experiments/)
    ├── legacy_reels\
    │   ├── ailo-launch\                         (from reels/)
    │   └── reel-b-c-d\                          (from reels/)
    ├── previous_ad_drafts\
    │   ├── AILO_Exact_Reference_Da0DayIpsie.mp4 (from exported_ads/)
    │   └── AILO_Reel_Custom_Script_Da0Style.mp4 (from exported_ads/)
    └── showcase_exports\
        ├── education\                           (from export/)
        ├── event\                               (from export/)
        └── yc\                                  (from export/)
```

*Estimated Workspace Storage Reorganized:* ~165 MB archived non-destructively. Zero raw footage or production code touched.
