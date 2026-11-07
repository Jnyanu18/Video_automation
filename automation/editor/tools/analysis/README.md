# tools/analysis (agent D)

Tools per docs/CONTRACT.md: `from tools.analysis import TOOLS` -> `analyze_video`, `transcribe`, `detect_silences`,
`detect_scenes`, `track_faces`. Each is `fn(plan, **args) -> {"plan", "result", "warnings"}`; input plan is never mutated.
All times are source-time seconds. Pass `workdir=` to also write JSON (`analysis.json`, `silences.json`, `scenes.json`,
`transcript.json`, `face_track.json`). `video=` defaults to `plan.source.path`.

Run tests: `python3 -m pytest tools/analysis/tests -q` (from repo root; needs ffmpeg, opencv, jsonschema; face test uses skimage's bundled astronaut image and skips if skimage is missing).

## Tools
- `analyze_video`: ffprobe + silences + scenes + transcript. Fills `plan.source` (path, duration, width, height, fps) and a default `keep`. Skips audio analyses if no audio stream.
- `detect_silences`: ffmpeg silencedetect (`noise_db`, `min_len`). Fixes the prototype bug where a silence running to EOF was dropped (closed at duration). Returns `silences` and complementary `speech`.
- `detect_scenes`: ffmpeg scene score (`threshold`, `min_scene_len`) -> `cuts`, `scenes`.
- `transcribe`: pluggable. `backend=fixture` (JSON via `transcript_fixture=` or env `CE_TRANSCRIPT_FIXTURE`), `faster-whisper` (`model_size`, `language`), `auto` (fixture if given else whisper), or `register_backend(name, fn)`. Returns `words` [{word,start,end}], caption-sized `segments`, `text`. If the backend fails (e.g. model download blocked) `status` is `"unavailable"`, words are empty and a warning says so.
- `track_faces`: samples at `sample_fps`, picks the main face (largest, continuity-preferring), holds through gaps, EMA + deadband + max-speed smoothing, writes `plan.reframe = {mode, track:[{t,cx,cy}]}`. No face -> mode `center` + warning. Detectors: `opencv-haar` (default; cascade vendored in `models/`, fully offline), `mediapipe` (needs `model_path=` .tflite, not bundled), `fixture`, or a callable `(frame_bgr, t) -> [(x,y,w,h) normalized]`.

## Verified here (real runs)
ffmpeg-generated media: silences (incl. trailing, no-audio), scene cut, analyze_video (plan validates against tools/edit/editplan.schema.json), Haar tracking of a real face panning across a frame, center fallback, custom/fixture detectors, smoothing.
## Not verified / stubbed
- faster-whisper with a real model (download blocked): only the graceful-failure path ran. Fixture backend is what tests use.
- MediaPipe: installed version (0.10.32) has no legacy `solutions`; the Tasks detector is coded but untested (needs a .tflite).
- Haar is frontal-face only and was tested on one real face image; profile/occluded faces will fall back to held positions.
