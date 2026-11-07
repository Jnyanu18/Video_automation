# styles/ (agent H): style cloning

Measure a reference video, write a style profile JSON, and push that profile into an EditPlan.

```bash
# from repo root
python -m styles ref.mp4 -o styles/myref.json [--transcript ref.transcript.json] [--name myref]
python -c "from styles import apply_style, load_style; ..."
python -m pytest styles -q
```

## API
- `extract_style(video, name=None, transcript=None) -> dict` (profile), `save_style(profile, path)`, `load_style(path)`
- `apply_style(plan, style, style_path=None, silences=None, set_output_size=True) -> plan` (returns a copy)
- `styles.media_utils`: probe, decode_audio, find_silences, integrated_lufs, transcript normaliser (also used by `evals/`)
- `styles.synth`: synthetic ffmpeg test media

`transcript` = list of `{word,start,end}`, `{"words": [...]}`, or whisper-style `{"segments":[{"words":[...]}]}` (seconds).

## Profile schema (`schema_version: 1`)
```
name, source{path,duration,width,height,fps}
pacing{shot_count, avg_shot_length, median_shot_length, cuts_per_minute,
       pause_count, avg_pause, p90_pause, max_pause_observed, speech_ratio}
speech{words, words_per_minute (incl. pauses), articulation_wpm (pauses >=0.3s excluded)}   # null w/o transcript
audio{has_audio, integrated_lufs, lra}
captions{detected, position: top|middle|bottom|none, center_y_frac, size_frac (text height / frame height), confidence}
palette{colors:[{hex,weight}] (5 k-means clusters over 12 sampled frames), brightness, saturation}
edit_params{max_pause, target_shot_length, caption_style, caption_max_words,
            caption_position, output_aspect: 9:16|1:1|16:9, target_lufs}
```
`edit_params` is the part the editor consumes; the rest is evidence. Derivation (heuristics, tune freely):
- `max_pause` = p90 of interior silences in the reference (-35 dB, >=0.2 s), clamped to 0.15..0.8 (0.25 if none)
- `target_shot_length` = average shot length from ffmpeg scene cuts (threshold 0.3)
- fast pace (articulation >= 170 wpm or avg shot < 2.5 s) -> `caption_style` "bold-pop", 3 words/caption, else "clean", 5 words
- `caption_position` = detected burned-in caption band, else middle (fast) / bottom

## What apply_style does to a plan
- sets `style_ref`; sets every caption's `style`; re-splits captions longer than `caption_max_words` (time split proportionally to word count)
- sets `output.width/height` from the aspect ratio (1080x1920 / 1080x1080 / 1920x1080)
- if `silences=[(s,e),...]` (source time) is given, shortens each silence longer than `max_pause` down to `max_pause` inside `keep`
- records `max_pause, target_shot_length, caption_position, target_lufs` as one line `[style_hints] {json}` at the end of `plan.notes` (EditPlan has no first-class fields for them; idempotent)
- It does NOT change shot length by itself (that needs B-roll/zoom decisions) and does not normalise loudness; those consumers read the hints.
- Caption style names "bold-pop" and "clean" must exist in tools/edit (owner E); change the mapping in `derive_edit_params` if not.

## Verified vs not
Tested (pytest, synthetic ffmpeg media): cut counts/avg shot length, pause lengths, LUFS present, wpm math, palette, caption
band detection on drawtext text (bottom, 9:16), save/load, apply_style (immutability, re-chunking, pause tightening, idempotent notes).
Smoke-run on samples/sample.mp4. NOT verified: accuracy on real social videos. Caption detection is a heuristic (edge density +
brightness voting) and will miss stylised/animated text or fire on busy backgrounds; check `captions.confidence`. Scene detection
can miss soft dissolves and fire on flashes. Palette is global, not per-scene. No audio-music/SFX or motion/zoom analysis.
