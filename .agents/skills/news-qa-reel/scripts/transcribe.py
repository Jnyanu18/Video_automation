# Word-timed transcript of a take: faster-whisper medium.en on CPU (int8), no VAD (it eats short words between pauses).
# usage: python scripts/transcribe.py <audio-or-video> <out.json> [model]
#   writes <out.json> {"words": [{"w","s","e"}], "duration"} and <out>.txt (one timed line per segment)
# Transcribe the SAME audio the spine will cut (the mic WAV if you use one), so word times line up.
# On Windows run it with a real Python (py -3.13 / the python.org install), not the Microsoft Store "python3" alias,
# and keep it on CPU: device="cpu", compute_type="int8" (GPU builds of ctranslate2 often miss cuDNN).
import json, os, sys
from faster_whisper import WhisperModel

src, out = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else "medium.en"
M = WhisperModel(model, device="cpu", compute_type="int8")
segs, info = M.transcribe(src, word_timestamps=True, language="en", vad_filter=False)
words, lines = [], []
for s in segs:
    lines.append(f"{s.start:8.2f}-{s.end:8.2f} {s.text.strip()}")
    words += [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for w in s.words]
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
json.dump({"words": words, "duration": info.duration}, open(out, "w", encoding="utf-8"))
open(os.path.splitext(out)[0] + ".txt", "w", encoding="utf-8").write("\n".join(lines))
print("done", out, len(words), "words", f"{info.duration:.1f}s")
