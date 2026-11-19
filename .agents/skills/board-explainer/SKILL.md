---
name: board-explainer
description: >-
  Madhav's "Board" explainer: a Caleb-Writes-Code-style iPad blackboard (pure black, hand-drawn monoline
  marker strokes in white/blue/green/yellow/red drawn on at the speed of speech, a visible pencil tip, red
  stamp arrows, hand-lettered labels, one diagram that grows per board) mixed with Madhav's REAL face and
  voice from his DJI talking-head take (matted cut-out, his own jokes and Hinglish asides), and his ElevenLabs
  Madhav Voice filling in the factual parts he didn't cover. No HeyGen. Instagram 9:16 first (1440x2560),
  YouTube 16:9 optional. Use when he says "like Caleb / Code with Caleb", "blackboard / iPad drawing
  explainer", "put me on the board", "use my recording plus ElevenLabs to fill gaps", or wants a tech news /
  security / CS explainer in this format. Runs inside animated-video's stages; not the infinite black canvas
  with avatar frames (canvas-explainer) or the purple neon decode look (decode-explainer, whose clarity rules apply).
---

# Board explainer (iPad board + real face + ElevenLabs fill)

**One of Madhav's favourite skills** (Oct 25, 2026: PHP2Shell reel, "absolutely flawless... I'm going to ask you to
build more of these again and again"). Treat this as the default for tech/security explainers built on his own take.
Protect what made it work: his real face for his own lines, ElevenLabs only for facts he didn't cover, a hand-drawn
board that teaches with a toy model (lockers / sticky note), voice-only sound, ≤ 3:00 for Instagram, and a corrected,
sourced caption.

## Start a new one fast
1. New project folder in `Documents/Content Creation/<slug>-<date>/` with `live/`, `film-board/`, `scripts/`, `post/`.
2. Copy `template/` from this skill into it (`template/live`, `template/film-board`, `template/scripts`). Link
   `film-board/node_modules` to an existing Remotion install (junction) instead of reinstalling.
3. Edit only the per-film inputs: `live/segments.json` (his take in/out), `live/plan.json` (F/V rows + ElevenLabs text),
   `live/board_spec_ig.py` (the drawings), then run in order: `transcribe_takes.py` → `el_tts_v4.py all` →
   `assemble_ig.py` → `matte_segments.py` (CUDA venv) → `board_spec_ig.py` → `film-board/audio/mix_voice.py _ig` →
   render `BoardIG` (board only) → `scripts/deliver_ig.sh` (composite face + encode + QA).
4. Machine settings are environment variables (`TAKE_WAV`, `TAKE_MP4`, `MATTE_DIR`, `ELEVENLABS_VOICE_ID`,
   `ELEVENLABS_API_KEY`, `PY`, `BOARD`, `COMP`, `OUT`) used by `live/matte_segments.py`, `scripts/composite_faces*.py` and `scripts/deliver_ig.sh`.
   Set them per film.
5. The worked example (plan, fact notes, caption) is in `examples/php2shell-2026-10/`; frames are in `docs/board-explainer/`.

First film: PHP2Shell, Oct 23-24 2026. Project: `Documents/Content Creation/decode-php2shell-2026-10-23/`
(`live/` = planning + audio + matting scripts, `film-board/` = Remotion board, `scripts/composite_faces.py`).
Reference analysis: `analysis/ref-6VmA4x1lh1M/ANALYSIS.md` (Caleb Writes Code, "PHP security crisis explained..").
Read `~/.claude/skills/decode-explainer/SKILL.md` for the clarity rules (toy model first, define before use,
one colour = one meaning) and `AGENTS.md` for approvals/delivery. Copy the method, never Caleb's drawings or
words: our own diagram layout, our own analogies, his own humour.

## 1. Inputs and plan (stop for approval)
1. Find his take on the DJI card (the camera card, newest `DJI_*_NNNN_D.MP4` + `.WAV` mic track; never write to
   the card). Copy the take into the project. The voice library already gets mic WAVs as `2026-MM-DD_dji-mic_NNN.wav`;
   check before copying (don't duplicate).
2. Transcribe the mic WAV with faster-whisper large-v3 on CPU, word timestamps (`live/transcribe_takes.py`).
3. Fact-check every line he says. Use his real face only for lines that are accurate (and good). Lines that teach
   something wrong are left out and re-said correctly by the ElevenLabs voice. Note each excluded line + reason.
4. Write `PLAN-*.md`: numbered rows, **F** (his face: take in/out + words) or **V** (ElevenLabs text), and what the
   board draws on each line. Quote the ElevenLabs cost. Get approval (format: Instagram 9:16 is the default).

## 2. Voice
- **F lines:** the mic WAV on the video clock (the WAV has no wireless delay; the camera's own audio runs ~74 ms
  late). Chain: highpass 75, afftdn nr=10, light EQ, 2.5:1 comp; type-normalised to -16 LUFS.
- **V lines:** settings come from memory `feedback-voice-settings`. When he asks for clone strength: `eleven_v4`,
  stability 0.33, similarity 1.0, clone_strength 0.75 through the REST `with-timestamps` endpoint
  (`live/el_tts_v4.py`; key from env, never printed). Billing ≈ 0.44 × characters (exact in the `character-cost`
  header). Whisper-verify every line.
- `live/assemble.py` builds the master VO in plan order (gaps 0.35 s, 0.45 s on F↔V switches) and
  `film-board/src/timeline.json` with every word's master time.

## 3. Face cut-out
- `live/matte_segments.py` (CUDA venv a CUDA PyTorch venv, RVM resnet50): one ProRes 4444+alpha clip per F segment,
  time-mapped to 30 fps, crop around him, alpha feathered at the crop edges (hands leaving frame fade, no hard
  line). Store on a big disk (`$MATTE_DIR`, on a big disk). Check one frame on black + magenta first.
- **Composite faces in ffmpeg, not in Remotion** (`scripts/composite_faces.py`): Remotion `OffthreadVideo` of
  ProRes alpha made the 1440p render ~3x slower and the render crashed at 78%. Render the board alone, then
  overlay each segment with `-itsoffset`, scale, alpha fades (in 0.2 s, out 0.17 s), `enable=between(t,t0,t1)`.

## 4. The board
- **Sound: voice only** (like Caleb; he called synthetic pencil scratches/whooshes "very bad"). Use
  `film-board/audio/mix_voice.py`: master VO + room tone at -62 dB. No music or SFX unless he asks.
- Data-driven: `live/board_spec.py` defines every stroke / text / fill / stamp / logo in board coordinates and
  times it to a word with `W(segment, word, off)`; writes `film-board/src/items.json`.
- Look: black `#050505`; strokes 3-6 px round caps with a hand jitter; colours white `#f2f0ea`, blue `#7d97ff`
  (PHP/system actions), green `#62e08f` (data/OK), yellow `#ffd84a` (labels/notes), red `#ff5a5a` (danger/
  attacker), teal (memory in use), grey (free/secondary); hand lettering in **Kalam 700**; an SVG pencil filter
  (displacement wobble + grain); an Apple-Pencil-style tip follows the current stroke head; flat red block
  "stamp" arrows pop in to point; draw speed ≈ 900 px/s for strokes, 0.045 s/char for text.
- Text reveal clip width: chars × size × 0.64 + 60 (narrower estimates clip the last letters of caps).
- Cue matching strips quotes/punctuation (`'shell'` must match `shell`).
- Boards are pages; the camera pans between them (Instagram: stacked vertically like scrolling a notebook).
- **Instagram 9:16 layout (1080x1920 design, render --scale=1.3333333333333333 → 1440x2560):** content zone
  y 170-1000 (always visible), captions y ~1040, his cut-out bottom (width ~1180, y 1028-1920; the hook line
  larger). Zone y 1150-1560 is for VO-only annotations (he covers it when he speaks). Keep text ≥ 44 px.
- **YouTube 16:9:** board shrinks to 84% toward top-left while he speaks; his cut-out bottom-right (700 px tall).
- **Instagram, as built on PHP2Shell (Oct 24; follows memory `feedback-face-size-ig-questions`):** his cut-out mirrored,
  bottom-left, matte frame shown at H=1371 / left=-651 in 1080x1920 space (measured: head top sits at ~16% of the matte
  frame, head centre ~52% after the flip → head top lands at ~40% height, head centre ~25% from the left). Same size for
  every line (a bigger hook pushed his hair into the caption band). Graphics in the top band (y 230-660) and right
  column (x 650-1040, y 780-1420); VO-only notes may use the left half below y 760 and must auto-fade before his next
  line (`vo=True` in `live/board_spec_ig.py`). Captions: y ~676 on his lines (just above his head), y ~1540 on VO lines.
- **Cover (frame 0):** the title must already be on the page (t0 < 0) and his face must be there; hold a clear-face
  frame (not the first frame, which is often a blurred gesture) with an overlay until his first line starts.
- **No empty pages:** switch to a new page on the word that starts its first drawing, not at the start of the line
  (page 3 switched 5 s early and showed black).
- **Pacing:** the IG cut runs at 1.1x (voice via atempo, mattes via `setpts=PTS/1.1`) with 0.25/0.32 s gaps.
- ffmpeg compositor gotcha: adding an extra input (the cover still) shifts input numbers; track each `-i` index.
- Instagram in-app Reels are capped at 3:00: plan for ≤ 2:55. PHP2Shell v1 was 3:38 and had to be trimmed (cut stopgaps,
  repeated VO, vague lines; trim a face line's start with `FTRIM`, a VO line's end with `VEND` in `assemble_ig.py`).

## 5. Render + QA
- `npx remotion bundle` copies `public/` into every bundle: never put big media (mattes) in `public/`.
- Time a 300-frame section first and give an ETA from it; later boards are heavier (more items on screen).
- Instagram delivery: 1440x2560, H.264 High, CRF ~14, maxrate = min(24M, 0.95 × 300 MB × 8 / duration), AAC,
  faststart, -14 LUFS. Check: decode, black runs, loudness, contact sheet, lip strips on an F segment, Whisper on
  the delivered audio. Report the four QA states separately. Nothing is uploaded without his approval.

## 6. Publishing (InstantDM Later), learned Oct 25
- The InstantDM API is plan-blocked (403). Use the signed-in web app **https://app.instantdm.com/later**
  (NOT instantdm.com/later, which is the logged-out marketing site) in the relay browser, in your own tab.
- Reconcile first: read the Later calendar and the published posts (Instagram DM → Posts, image alt = caption) so
  nothing is duplicated. Leave every other schedule untouched.
- Stage → stop → confirm: Reel, trial off, upload the exact master through the modal's own file input (not the Crisp
  chat input), "Upload Custom" for the cover (file chooser via `browser_file_upload`, path under Content Creation),
  caption pasted exactly. Verify on the CDN: video Content-Length + ETag = local MD5; cover downloaded SHA256; caption
  textarea SHA256 = file. Then stop for the final OK.
- There is no "post now": the picker only blocks whole past hours, so choose the next 5-minute slot with a buffer;
  if it has passed when the OK arrives, take the next slot and say so. Never press Enter in the date field.
- After Schedule: capture the `create_id` from `POST /schedule`, close the automation prompt with the X (no automation
  unless asked), reopen the record read-only for the manage-post URL and readback, and re-read the whole calendar.
  On Oct 25 another schedule (Freshers, Oct 27) vanished from the calendar minutes later with no click from us:
  always re-check every existing record after saving and report differences immediately; never recreate silently.
- Captions must be fact-checked against primary sources on the posting day (PHP's own advisories corrected the
  video's "default setups are safe" line; the caption said so explicitly). Receipts go in `post/`.
