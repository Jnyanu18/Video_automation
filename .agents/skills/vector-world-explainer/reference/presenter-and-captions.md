# Presenter and captions

Two presenter variants share one API (`winAt`, `placeAt`, `faceBox`, `faceSpan`, `Avatar`, `WINS`),
so `CaptionView.tsx` and the scenes work with either.

## A. Real-face presenter (default; quantum v6)

### Takes
- Source: DJI on-camera takes (1512x2688 HEVC 10-bit, 29.97 fps, BT.709) + the DJI mic `.WAV` of the
  same name. Raw on `<RAW_TAKES_DIR>` (read only). Never decode them inside Remotion (10-bit HEVC is
  unreliable there); every frame Remotion sees comes from the matte webm.
- Judge per sentence, not per take (`TAKES.md`, example in `examples/TAKES-example.md`):
  - **words**: Whisper medium.en per take; large-v3 on doubtful words (137's "ten septillion" was heard
    as "tens of pillion" / "sub-billion": rejected for the hook);
  - **lens**: `presenter/gaze.py` YuNet yaw proxy (nose x - eye-mid x) / eye distance, |yaw| < 0.35 =
    to lens; report % per sentence. Choice is relative when every take is off-lens;
  - **face never covered**: `facestrip.py` dense crops every 0.2 s; reject hand over mouth/face;
  - **light/focus/framing** match within the sitting; reject false starts and mid-word starts.
- Prefer his stated favourite where it wins on merit; say where it lost and why.

### Sync
- `spine/sync_wav.py`: in v6 the MP4s of 129-134 had a silent track (-91 dB) and 135-137 the camera's
  copy of the mic ~35 ms late; every WAV had exactly its MP4's duration, so **WAV time = video time**.
- A later DJI take (OPT reel) had audio ~2 frames late vs the lips in the raw file itself. Always
  verify with lip-sync strips (`faceqa.py`: b/p/m onsets, frames -2..+3); never with automatic
  mouth/envelope correlation (his gestures make it meaningless).

### Matting (GPU)
- `presenter/matte.py`: RobustVideoMatting **resnet50** (torch.hub `PeterL1n/RobustVideoMatting`) on
  the RTX 5070 with the cu128 torch venv `<CUDA_VENV>` (read-only use), native 1512x2688,
  `downsample_ratio` 0.2, recurrent state warmed up 1 s before each piece and reset per piece.
- Alpha < 0.02 -> 0, > 0.985 -> 1; colour = untouched source pixel where alpha >= 0.985 (face, skin),
  RVM's decontaminated foreground only in the soft edge band (no beige-wall fringe).
- Output frame f of window k shows source frame nearest `src_in + (t - out_in)` from the splice map,
  so the picture is the same take as the voice; zoom cuts happen where the clip changes take.
- Masters: ProRes 4444 `yuva444p10le` in HEAVY; Remotion gets VP9 + alpha (`libvpx-vp9`, `yuva420p`,
  crf 12, `-auto-alt-ref 0`, limited range BT.709) in `public/face/w<k>.webm`.
- Speed: ~1,480 frames at full res in ~80 s (paper-lab's u2net CPU route: ~0.7 fps at 720 px plus a
  separate 1440 alpha upscale).
- Inspect with `mattesheet.py` (over purple, over magenta, alpha, hair zoom): hair, curls and glasses
  held, no halo; fast hands slightly soft. The matte keeps scraps of keyboard/chair at the very bottom:
  hidden by the body fade (`CLIP.cutY` 2290, `fade` 330 source rows).

### Staging (`src/kit/avatar.tsx`, `src/avatar-config.ts`)
- Floating half-body cut-out, lower right, over **live** animation (never a static full-frame head);
  his right shoulder past the frame edge; the left source edge feathered (`CLIP.edge` 150 px); body
  fades out above the keyboard rows; scene-coloured rim (`rim` per window) + back glow + soft contact
  shadow; slow bob.
- Entry: 9-frame pop-in from the right with overshoot (first frame fully off); exit 10 frames (last
  frame fully off). Window 1 is already on the cover at frame 0 (`from: "none"`).
- Placements `{t, s, fx, bottom}` in source-frame scale; eased 0.5 s reframes between sentences;
  **hard zoom cuts** (`cut: true`) on the frame where the clip jumps take or skips a pause, so a jump
  reads as a deliberate reframe (v6 had 8).
- Quantum v6 windows: 0-11.83 (hook, big on the cover, then the corner), 30.90-36.37 (myth),
  48.93-62.90 (pool), 82.60-100.63 (ending + AI wave + CTA, bigger beside the FOLLOW coin, punch-in on
  "hit follow") = 49.3 s of 101.7 s (48%).
- `checks/face-check.mts` asserts, for every fully-in frame, face right edge <= 1075, hair top >= 230,
  face bottom <= 1700. `qa.sh` makes the presenter-windows sheet; `faceqa.py` the zoom-cut and lip-sync
  strips.

## B. HeyGen fallback (quantum v2-v5)

- Only with his approval for the credits, and only in the look he approved. Default 3-4 s bursts
  of one sentence (v3: 4 bursts, 10.6 s of 84 s); long floating windows only when he asks (v5: 61.8 s).
- **Lip-sync to his real voice**: concatenate the window audio from his recording into one file,
  generate one job, then split by time. Record each window's offset inside the clip.
- **Download the result immediately** when the job completes (v5 lost ~3 hours because nobody
  fetched it), then verify: `ffprobe` (VP9, `alpha_mode=1`, 25 fps), cross-correlate its audio
  against the VO per window (v5: lag 0 ms, corr 0.999 on all four).
- The webm is 25 fps and has an Opus track: decode with `libvpx-vp9` to keep alpha, play it through
  `OffthreadVideo transparent muted`, and map **by time** (`startFrom` = clip seconds x 30), never by
  frame number.
- Measure the alpha bbox / hair top with `presenter/heygen_measure.py`; code in
  `template/src/presenter-heygen/` (placeholder silhouette until the clip arrives, so scenes can be
  composed around him).

## Captions (`src/captions.ts`, `src/CaptionView.tsx`)

- `LINES` are hand-chunked sense units checked word for word against `words.json` at load (throws on
  mismatch; `checks/cap-check.mts`). `~word` = spoken, not shown (filler only: "Now,", filler "like",
  "a", "basically"). `show` replaces the displayed words for an on-screen fact/grammar correction,
  highlighted across the spoken span. `hide` when a big stamp carries the line ("Well, no." -> NO.).
- Word-timed highlight: the line shows whole and dim; each word brightens as he says it; emphasis
  words take their colour and pop. Hook lines (0 - hook end) are condensed caps revealed word by word.
- Layout: centre (top 1362, shade fades out at its bottom) when he is off; a **left column ending 36
  px before his face** while he is on, using `faceSpan(start, end)` = the union of his per-frame face
  boxes over the caption's whole span (his real head moves; a single-frame box let text touch him).
- Cover headline (`HookTitle`): the question at frame 0, its words thump as he says them, it flies
  out as the camera dives into the hero object.
- Never a caption, label or bright light on his face; nothing in the IG UI bands; at most 2 lines.
