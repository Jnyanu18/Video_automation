# ReelForge: Local AI Video Editor

> **ReelForge** is a local AI video editor replicating the creator workflow seen in the reference Instagram reel (Claude Desktop project folder workflow). Point it at a workspace folder, install tools with one message, feed it any number of reference reels to learn an editing style, drop in raw footage, review/tweak an interactive storyboard, and render finished 9:16 vertical reels locally.

---

## ⚡ Quickstart

### 1. Installation
Install ReelForge in editable mode:
```bash
cd "new project - marketing automatio/reelforge"
pip install -e .
```

### 2. Verify Your Environment
Check installed dependencies:
```bash
python -m reelforge.cli doctor
```
Or with the installed entrypoint:
```bash
reelforge doctor
```

### 3. Start the Local Studio
Launch the local server and web studio:
```bash
reelforge start
```
Open `http://127.0.0.1:8000` in your browser.

---

## 🏗️ Architecture & Verification Status

| Feature / Spec Item | Status | Verification Details & Real Commands |
| :--- | :--- | :--- |
| **Workspace Manager** | **VERIFIED** | Initializes `Raw Footage/`, `Reference/`, `Output/`, `.reelforge/`. Verified in `tests/test_stage1.py` and `tests/verify_e2e_real_files.py`. Raw footage is strictly read-only. |
| **System Doctor** | **VERIFIED** | Live checks for FFmpeg, yt-dlp, faster-whisper, HyperFrames, and Anthropic API key. Command: `python -m reelforge.cli doctor`. |
| **One-Message Installer** | **VERIFIED** | Confirmation-gated tool installer (`ToolInstaller.execute(confirm=True)`). Tested in `tests/test_stage1.py`. |
| **Reference Ingestion Queue** | **VERIFIED** | Ingests URLs or files, extracts frames at 2 fps, runs scene detection and Whisper transcription, caches per reel in `.reelforge/cache/<reel_id>.json`. |
| **Crash-Resume Queue** | **VERIFIED** | Verified with `python tests/verify_crash_resume.py`. Simulates process kill mid-batch; cached reels are preserved and remaining reels resume without reprocessing. |
| **Hierarchical Map-Reduce Style Aggregator** | **VERIFIED** | Tested with 55 dummy reels and 5 real video files (`tests/verify_e2e_real_files.py`). Merges numeric cuts/WPM via mathematical medians/modes with bounded context. |
| **Storyboard Planner & Editor** | **VERIFIED** | Generates `StoryboardPlan` with scene cards, out-durations, and camera motions. Revisions validated against `StoryboardPatch` schema with undo/redo history. |
| **FFmpeg + ASS Subtitle Renderer** | **VERIFIED** | Verified via `ffprobe` in `tests/verify_e2e_real_files.py`. Produces 540x960 Drafts and 1080x1920 Final MP4s with punch zooms and burned-in styled subtitles. |
| **HyperFrames Headless Renderer** | **VERIFIED** | Verified headlessly via `npx hyperframes render`. Renders 1080x1920 30fps H.264 video using headless Chrome (`chrome-headless-shell`). |
| **FastAPI Backend & Chat Router** | **VERIFIED** | Tested with `pytest tests/test_server.py`. Serves REST endpoints and modern web studio at `http://127.0.0.1:8000`. |

---

## ⚠️ Explicit List of Stubbed / Heuristic Parts

1. **Anthropic API Vision Evaluation (`reelforge/analysis/vision_eval.py`):**
   - When `ANTHROPIC_API_KEY` is present, calls `claude-3-7-sonnet-20250219` to estimate font families, transitions, and motion styling from extracted frames.
   - When `ANTHROPIC_API_KEY` is absent (offline/local mode), uses a deterministic heuristic fallback returning `"Inter"`, `"bold"`, and `"middle"` caption positioning.
2. **Storyboard LLM Generation (`reelforge/storyboard/generator.py`):**
   - With an API key, calls Anthropic Claude to craft hook-body-CTA scene rationale.
   - Without an API key, falls back to a deterministic pacing slicer that cuts the footage into balanced scenes respecting the style sheet cut intervals.
3. **Storyboard LLM Revision (`reelforge/storyboard/editor.py`):**
   - With an API key, uses LLM to return a validated `StoryboardPatch` JSON.
   - Without an API key, uses deterministic keyword heuristics (`"shorten intro"`, `"zoom"`, `"remove scene N"`).
4. **yt-dlp Social Media Downloads Behind Login Gates:**
   - yt-dlp works cleanly for public URLs and local files. Reference reels on platforms requiring active user session cookies (e.g. private Instagram accounts) will fail download; users must drop the video file directly into `Reference/` or provide public URLs.

---

## 🧪 Running Automated Tests

Run the full pytest suite:
```bash
pytest tests/ -v
```
Run the real video end-to-end audit:
```bash
python tests/verify_e2e_real_files.py
```
Run the crash-resume audit:
```bash
python tests/verify_crash_resume.py
```
