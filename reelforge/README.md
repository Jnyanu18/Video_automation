# ReelForge: Local AI Video Editor

> **ReelForge** is a local AI video editor replicating the creator workflow seen in the reference Instagram reel (Claude Desktop project folder workflow). Point it at a workspace folder, install tools with one message, feed it any number of reference reels to learn a style, drop in raw footage, review/tweak an interactive storyboard, and render finished 9:16 vertical reels locally.

---

## ⚡ Quickstart

### 1. Installation
Install ReelForge in editable mode:
```bash
cd "new project - marketing automatio/reelforge"
pip install -e .
```

### 2. Start the Local Studio
Launch the local server and web studio with one command:
```bash
reelforge start
```
This opens `http://127.0.0.1:8000` with the local studio interface.

### 3. CLI Commands
- `reelforge doctor`: Check local dependencies (FFmpeg, yt-dlp, faster-whisper, HyperFrames)
- `reelforge install`: Confirm and install missing tools
- `reelforge start --port 8000`: Start local studio

---

## 🏗️ Architecture & Features

### 1. Workspace Structure
Default directory: `~/Desktop/AI Video Editor/`
```text
AI Video Editor/
├── Raw Footage/       User's original source videos (never modified or deleted)
├── Reference/         Reference reels downloaded via yt-dlp or dropped in
├── Output/            Final 9:16 rendered MP4 videos
└── .reelforge/        SQLite DB (reelforge.db), caches, styles/, logs/
```

### 2. One-Message Tool Setup
Users can type `"Install these 4 tools and set them up in my workspace"` in plain English.
- Checks FFmpeg, yt-dlp, faster-whisper, and HyperFrames.
- **Safety**: Never runs installation commands without explicit user confirmation (`-y` or button click).

### 3. Unlimited Reference Reels
- Supports single URLs, bulk URLs, channel/playlist URLs, or dropped files.
- No hard limit (scales from 1 to 200+ reels).
- **Independent & Resumable Caching**: Each reel is downloaded, frames extracted at 2 fps (0.5s interval), transcribed via Whisper, analyzed for scene cuts (`gt(scene, 0.3)`), and cached in `.reelforge/cache/<reel_id>.json`. Adding the 200th reel never reprocesses the first 199.

### 4. Hierarchical Map-Reduce Style Aggregator
- Combines reference reel analyses in batches ($K=10$) into tree summaries.
- Computes mathematical medians and modes for cut intervals, speech WPM, and loudness (LUFS).
- Flags outliers instead of averaging them away.
- Generates versioned `StyleSheet` (v1, v2...) with plain-English summaries and approval buttons.
- Supports conversational revisions (e.g. `"make cuts faster and text yellow"`).

### 5. Storyboard Before Render
- Given raw footage + approved style sheet: transcribes speech and generates structured `StoryboardPlan` (default 6 scenes: hook -> value -> CTA).
- UI displays scene cards with thumbnail timings, captions, camera motions (`punch_zoom_1.15x`, `center`), and transitions.
- **NOTHING renders until the user clicks 'Generate video'**.
- Plain-English revisions produce validated JSON patches with full Undo/Redo history.

### 6. Deterministic Renderer
- **Draft Mode**: Fast 540x960 rendering for rapid iteration.
- **Final Mode**: Full 1080x1920 H.264 + AAC vertical video.
- ASS subtitle burning with styled typography, casing, and positioning.
- Background audio ducking and normalized loudness.
- Primary renderer delegates to HyperFrames when configured, with transparent fallback to deterministic `FFmpegAssRenderer`.

---

## 🧪 Testing

Run the full automated test suite:
```bash
pytest tests/ -v
```
All 9 unit and integration tests pass green.
