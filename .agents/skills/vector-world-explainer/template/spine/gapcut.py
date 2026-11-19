# Voice-over gap cut: Madhav's own recording (Windows Sound Recorder "Recording (N).wav" or a DJI mic
# WAV) with the dead air between words tightened. Cuts happen ONLY in the gaps between Whisper
# words, never inside a word, and the result is re-transcribed and diffed word for word.
#
#   py -3.13 spine/gapcut.py <recording.wav>     -> <project>/audio/vo-real.wav
#                                                  + vo-real.words.json (words of the OUTPUT)
#                                                  + gapcut.segments.json (kept source spans)
# Rules (quantum v5, rec55: 122 s -> 114 s):
#  - a gap is cut only if it is > CUT_OVER (0.30 s) between one word's end and the next word's start;
#  - PAD (0.06 s) of room tone stays after a word's end and before the next word's start, so the
#    kept silence at every cut is KEEP (0.24 s) in total; 15 ms fades on every piece;
#  - the clean-up chain (highpass 75, afftdn -50, 2.5:1 compressor, loudnorm -16 LUFS / -1.5 dBTP)
#    runs once over the joined result.
# Lesson (the "won't" -> "would" incident): the first attempt cut silence by an energy threshold and
# clipped the "n't" off "won't", so he said "it would make Instagram faster" - the opposite claim.
# Whisper caught it. So: cut in word gaps only, keep PAD on both sides, and ALWAYS re-transcribe the
# output and compare it with the input transcript (this script fails loudly on any difference).
# Archive an untouched copy of the recording first.
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline_config import PROJECT
from faster_whisper import WhisperModel

CUT_OVER, KEEP, PAD, FADE = 0.30, 0.24, 0.06, 0.015
src = sys.argv[1]
out_dir = os.path.join(PROJECT, "audio"); os.makedirs(out_dir, exist_ok=True)
out = os.path.join(out_dir, "vo-real.wav")
m = WhisperModel("medium.en", device="cpu", compute_type="int8")


def words(path):
    segs, _ = m.transcribe(path, language="en", word_timestamps=True, beam_size=5, vad_filter=False)
    return [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)} for s in segs for w in s.words]


norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())
W = words(src)
json.dump(W, open(os.path.join(out_dir, "recording.words.json"), "w"), indent=0)
segs = []; s = max(0.0, W[0]["s"] - 0.15); prev = W[0]["e"]
for w in W[1:]:
    if w["s"] - prev > CUT_OVER:
        segs.append((s, prev + PAD)); s = w["s"] - PAD
    prev = w["e"]
segs.append((s, prev + 0.35))
filt, parts = [], []
for i, (a, b) in enumerate(segs):
    b2 = b + (KEEP - 2 * PAD if i < len(segs) - 1 else 0)  # the rest of the kept gap comes from this side's own tone
    filt.append(f"[0]atrim={a:.3f}:{b2:.3f},asetpts=N/SR/TB,afade=t=in:d={FADE},areverse,afade=t=in:d={FADE},areverse[a{i}]")
    parts.append(f"[a{i}]")
fc = ";".join(filt) + ";" + "".join(parts) + f"concat=n={len(segs)}:v=0:a=1,highpass=f=75,afftdn=nf=-50,acompressor=ratio=2.5:threshold=-24dB:attack=10:release=150,loudnorm=I=-16:TP=-1.5:LRA=11[o]"
fcp = os.path.join(out_dir, "gapcut.fc.txt"); open(fcp, "w").write(fc)
json.dump(segs, open(os.path.join(out_dir, "gapcut.segments.json"), "w"))
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-filter_complex_script", fcp, "-map", "[o]", "-ar", "48000", "-ac", "1", out], check=True)
W2 = words(out)
json.dump(W2, open(os.path.join(out_dir, "vo-real.words.json"), "w"), indent=0)
a, b = [norm(x["w"]) for x in W], [norm(x["w"]) for x in W2]
print(len(segs), "pieces; kept", round(sum(y - x for x, y in segs), 2), "s of", round(W[-1]["e"], 2))
if a != b:
    import difflib
    for op in difflib.SequenceMatcher(None, a, b).get_opcodes():
        if op[0] != "equal": print("WORD CHANGE", op[0], a[op[1]:op[2]], "->", b[op[3]:op[4]])
    sys.exit("gapcut changed the words: inspect each change (a clipped word, or a Whisper re-hearing?) before using vo-real.wav")
print("words identical before/after the cut:", len(a))
