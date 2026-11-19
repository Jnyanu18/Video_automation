# Word-timestamp transcripts of every DJI mic WAV (untouched originals on RAW_DIR, read only).
# faster-whisper medium.en on CPU (never CUDA for whisper on this machine; int8).
# usage: py -3.13 spine/transcribe_takes.py      -> spine/takes/t<n>.words.json  [{w, s, e, p}]
# Re-check doubtful words (numbers, names, "septillion") with large-v3 on a short clip of that take.
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline_config import TAKES, TAKES_DIR, take_wav
from faster_whisper import WhisperModel

m = WhisperModel("medium.en", device="cpu", compute_type="int8")
for n in TAKES:
    dst = os.path.join(TAKES_DIR, f"t{n}.words.json")
    if os.path.exists(dst): continue
    segs, info = m.transcribe(take_wav(n), language="en", word_timestamps=True, beam_size=5, vad_filter=False)
    words = []
    for s in segs:
        for w in s.words:
            words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)})
    json.dump(words, open(dst, "w"), indent=0)
    print(n, len(words), " ".join(w["w"] for w in words), flush=True)
