# Pipeline commands (in order)

Paths: `$SKILL` = this skill folder; the project is `reel-YYYY-MM-DD-<slug>/` with `source/ analysis/ concept/
clips/<id>/film/ qa/`. Use a real Python 3 with numpy, scipy, opencv-python, Pillow and faster-whisper (`PY`).
Tools: ffmpeg/ffprobe, Node 20+, `npx hyperframes` (for `remove-background`).

```bash
# 0. intake: copy off the card, hash, probe (never write to the raw)
sha256sum source/*.MP4 source/*.WAV > analysis/raw-source.sha256
ffprobe -v error -show_entries stream=codec_name,profile,width,height,pix_fmt,r_frame_rate:format=duration source/take.MP4
ffmpeg -hide_banner -nostats -i source/take.WAV -af ebur128=peak=true -f null - 2>&1 | tail -12

# 1. transcribe (CPU, int8, word timestamps) -> analysis/take.json + .txt
$PY $SKILL/scripts/transcribe.py source/take.WAV analysis/take.json

# 2. fact-check -> CHECKPOINT.md cut log; 3. write concept/clips.json (examples/clips.example.json)

# 4. film folder + spine + matte (per clip)
NODE_MODULES_FROM=<an existing film's node_modules, optional> $SKILL/scripts/install_template.sh clips/c1/film
DFN_PYTHON=<dfn venv python> $PY $SKILL/scripts/build_spine.py concept/clips.json c1 clips/c1/film
$SKILL/scripts/matte_clip.sh clips/c1/film                    # ~0.7 fps on CPU: a 60 s clip takes ~45 min
$PY $SKILL/scripts/transcribe.py clips/c1/film/public/vo.wav qa/c1-vo-check.json   # word check

# 5. world + beats, then stills (re-measure SIDE_FACE first)
cd clips/c1/film && npx tsc -p .
PAR=3 MAXF=$(( $(jq .frames src/edl.json) - 1 )) ./snap.sh out/stills 0 3 6 10 20 30 40 50   # -> out/stills/sheet.png
rm -rf out/bundle-*

# 6. finish: dumps -> mix -> render 1440x2560 -> true-peak gate -> QA gates -> cache prune
PY=$PY $SKILL/scripts/finish_clip.sh clips/c1/film bubble c1-v1 qa/c1-v1
cat qa/c1-v1/gates.txt

# housekeeping any time
$SKILL/scripts/prune_remotion_cache.sh 30
```

DeepFilterNet venv (once): `python -m venv dfn && dfn/Scripts/pip install deepfilternet` (Linux/macOS:
`dfn/bin/pip`), then `DFN_PYTHON=$(pwd)/dfn/Scripts/python.exe`.

Optional fills (approval first): `$PY $SKILL/scripts/gen_el_lines.py concept/el-lines.json source-derived/el --dry-run`,
then without `--dry-run`; a HeyGen twin render is matted with `$SKILL/scripts/matte.sh`.
