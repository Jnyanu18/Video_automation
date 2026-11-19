# Spine + footage for one news-Q&A clip: his real take -> tightened, sped, denoised voice + a matching footage proxy.
#
# usage:  python scripts/build_spine.py <clips.json> <clip-id> <film-dir>
#   e.g.  python scripts/build_spine.py concept/clips.json c2-bubble clips/c2-bubble/film
# Paths inside clips.json are relative to the clips.json file's folder (the project root).
#
# clips.json (see examples/clips.example.json):
#   {"defaults": {...optional, any per-clip key...},
#    "clips": [{"id": "c2-bubble",
#               "video": "source/take.MP4",              the camera file (footage)
#               "audio": "source/take.WAV",              optional: a separate mic WAV in sync with the transcript;
#                                                        default = the video's own audio (extracted once)
#               "transcript": "analysis/take.json",       faster-whisper words {"words": [{"w","s","e"}...]} (transcribe.py)
#               "items": [{"r": [first_word_start, last_word_start]},                       a span of the take (source s)
#                         {"r": [...], "q": true},                                          a question he reads out
#                         {"r": [...], "fix": [["dweller", "jeweller"], ["um", ""]]},       caption-only fixes ("" drops)
#                         {"r": [...], "outro_from": "follow"}],                            where the spoken outro starts
#               "speed": 1.10, "gap": 0.18, "keep": 0.05, "frame": "landscape-crop" | "portrait", "no_denoise": false}]}
#
# What it does (the "flawless" v8 settings are the defaults):
# - Each item = the words whose start lies in r. Inside an item every pause >= GAP s is cut, keeping KEEP s of air on
#   each side (this also removes ums/ahs, which Whisper does not time as words). Item edges snap to the quietest
#   10 ms within +-0.1 s (padded so no word is clipped); every cut is on the 1/30 s grid with 12 ms fades.
# - The footage proxy is cut from the SAME spans, so footage time == output time (lips stay in sync):
#   landscape-crop: a (0.76*H)xH window around his median face x (Haar, 1 fps) -> 1440x1894, padded to 1440x2560 at
#   the bottom (the top 666 px are empty; the cut-out removes the background anyway). portrait: scaled to 1440x2560.
# - A 1.6 s TAIL of his footage (room tone -18 dB) follows the last word for the end card.
# - Outro: if an item has "outro_from", OUTRO.t = that word (end card from there; those words leave the captions);
#   otherwise OUTRO.t = just after his last word and the end card is silent text ("silent": true).
# - SPEED (his preference ~1.10x; 1.15x was "5% too fast"): voice (atempo, pitch kept) and footage (setpts) are
#   sped TOGETHER, words/outro/envelope rescaled; the EDL becomes one segment.
# - Denoise: DeepFilterNet3 at a 20 dB attenuation limit in its own venv (DFN_PYTHON env var = that venv's python;
#   scripts/denoise_dfn.py). Skipped with a warning if DFN_PYTHON is unset. The noisy copy is kept in source/.
# Writes <film>/public/proxy-1440.mp4, public/vo.wav, src/words.json, src/vo_env.json, src/edl.json, src/edl-spans.json.
# Then run scripts/matte_clip.sh <film-dir>.
import json, math, os, shutil, subprocess, sys
import numpy as np, scipy.io.wavfile as wf

CJ, CID, FILM = sys.argv[1], sys.argv[2], os.path.abspath(sys.argv[3])
ROOT = os.path.dirname(os.path.abspath(CJ))
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(CJ, encoding="utf-8"))
C = {**D.get("defaults", {}), **next(c for c in D["clips"] if c["id"] == CID)}
P = lambda p: p if os.path.isabs(p) else os.path.join(ROOT, p)
FPS, G = 30, 1 / 30
TAIL = C.get("tail", 1.6)
GAP, KEEP, SPEED = C.get("gap", 0.18), C.get("keep", 0.05), C.get("speed", 1.10)
OUTRO_TEXT = C.get("outro_text", "Follow for more AI news.")
MP4 = P(C["video"])
run = lambda *a: subprocess.run(a, check=True, capture_output=True)
for d in ("public", "src", "source"): os.makedirs(f"{FILM}/{d}", exist_ok=True)

# ---- audio: separate mic WAV if given, else the video's own audio (48 kHz stereo PCM)
if C.get("audio"):
    WAV = P(C["audio"])
else:
    WAV = f"{FILM}/source/take-audio-48k.wav"
    if not os.path.exists(WAV):
        run("ffmpeg", "-v", "error", "-y", "-i", MP4, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", WAV)
sr, A = wf.read(WAV)
A = A.astype(np.float32) / (32768 if A.dtype == np.int16 else (2 ** 31 if A.dtype == np.int32 else 1))
if A.ndim == 1: A = A[:, None].repeat(2, 1)
A = A[:, :2]
m = A.mean(1); hop = sr // 100; n = len(m) // hop
db = 20 * np.log10(np.sqrt((m[: n * hop] ** 2).reshape(n, hop).mean(1)) + 1e-9)
W = json.load(open(P(C["transcript"]), encoding="utf-8"))["words"]

def quiet(t, pad):  # source seconds -> quietest 10 ms within +-0.1 s, padded, on the frame grid
    i0, i1 = max(0, int((t - 0.1) * 100)), min(n - 1, int((t + 0.1) * 100))
    i = i0 + int(np.argmin(db[i0:i1 + 1]))
    return round((i / 100 + pad) / G) * G

def item_words(r):
    ws = [k for k, w in enumerate(W) if r[0] - 0.05 <= w["s"] <= r[1] + 0.05]
    assert ws, f"no words in range {r}"
    return ws[0], ws[-1]

def spans_for(i0, i1):
    s, e = quiet(W[i0]["s"], -0.04), quiet(W[i1]["e"], 0.08)
    out, cur = [], s
    for k in range(i0, i1):
        a, b = W[k]["e"], W[k + 1]["s"]
        if b - a >= GAP:
            c0 = math.ceil((a + KEEP) / G) * G; c1 = math.floor((b - KEEP) / G) * G
            if c1 - c0 >= 0.12 - 1e-6: out.append([cur, c0]); cur = c1
    out.append([cur, e])
    return [[round(x * 30) / 30, round(y * 30) / 30] for x, y in out if y - x > 0.05]

items = []
for it in C["items"]:
    i0, i1 = item_words(it["r"])
    items.append({**it, "i0": i0, "i1": i1, "spans": spans_for(i0, i1)})

# ---- audio + words + EDL (footage time == output time)
FADE = int(0.012 * sr); ramp = np.linspace(0, 1, FADE)[:, None]
parts, spans, words, t, outro = [], [], [], 0.0, None
for it in items:
    fixes = [list(f) for f in it.get("fix", [])]
    for s, e in it["spans"]:
        seg = A[int(s * sr):int(e * sr)].copy(); seg[:FADE] *= ramp; seg[-FADE:] *= ramp[::-1]
        spans.append({"out": round(t, 6), "src": round(t, 6), "len": round(e - s, 6), "srcAbs": round(s, 6)})
        for w in W[it["i0"]:it["i1"] + 1]:
            if s - 0.15 <= w["s"] < e:
                so = t + max(0.0, w["s"] - s); eo = t + min(e - s, w["e"] - s); txt = w["w"].strip()
                for f in fixes:  # first match of each fix, caption text only
                    if f[0] is not None and txt == f[0]: txt = f[1]; f[0] = None; break
                # outro_from matches the RAW transcript word (before caption fixes)
                if it.get("outro_from") and outro is None and w["w"].strip().lower().startswith(it["outro_from"].lower()):
                    outro = {"t": round(so, 6), "dur": None, "text": OUTRO_TEXT}
                if txt: words.append({"w": txt, "s": round(so, 3), "e": round(max(eo, so + 0.08), 3), "src": round(w["s"], 3), "spk": "his", "q": bool(it.get("q"))})
        parts.append(seg); t += e - s
speech_end = t
last = items[-1]["spans"][-1][1]
tail = A[int(last * sr):int((last + TAIL) * sr)].copy() * 10 ** (-18 / 20)
tail[:FADE] *= ramp; tail[-FADE * 4:] *= np.linspace(1, 0, FADE * 4)[:, None]
spans.append({"out": round(t, 6), "src": round(t, 6), "len": TAIL, "srcAbs": round(last, 6), "tail": True})
parts.append(tail); t += TAIL
if outro is None: outro = {"t": round(speech_end + 0.15, 6), "dur": None, "text": OUTRO_TEXT, "silent": True}
outro["dur"] = round(t - outro["t"] - 0.3, 3)
vo = np.concatenate(parts); total = round(len(vo) / sr * 30) / 30; vo = vo[: int(total * sr)]
wf.write(f"{FILM}/public/vo.wav", sr, (np.clip(vo, -1, 1) * 32767).astype(np.int16))
words = [w for w in words if w["s"] < outro["t"] - 0.01]
spf = sr // FPS

def envelope(x, frames):
    mono = x.astype(np.float32).mean(1) if x.ndim > 1 else x.astype(np.float32)
    env = [float(np.sqrt((mono[i * spf:(i + 1) * spf] ** 2).mean())) if len(mono[i * spf:(i + 1) * spf]) else 0.0 for i in range(frames)]
    mx = max(env) or 1.0
    return [round(v / mx, 3) for v in env]

# ---- source geometry + crop window (median face centre over the used spans, Haar on 1 fps samples)
import cv2
cap = cv2.VideoCapture(MP4)
SW, SH = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
FRAME = C.get("frame", "landscape-crop" if SW > SH else "portrait")
x0 = 0
if FRAME == "landscape-crop":
    fc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    k = SW / 672; xs = []
    for sp in spans[:-1]:
        for tt in np.arange(sp["srcAbs"], sp["srcAbs"] + sp["len"], 1.0):
            cap.set(cv2.CAP_PROP_POS_MSEC, tt * 1000); ok, fr = cap.read()
            if not ok: continue
            g = cv2.cvtColor(cv2.resize(fr, (672, int(SH / k))), cv2.COLOR_BGR2GRAY)
            f = fc.detectMultiScale(g, 1.1, 5, minSize=(40, 40))
            if len(f): x, y, w_, h_ = max(f, key=lambda r: r[2] * r[3]); xs.append((x + w_ / 2) * k)
    cx = float(np.median(xs)) if xs else SW / 2
    CW = int(round(SH * 1150 / 1512)) // 2 * 2
    x0 = int(min(max(cx - CW / 2, 0), SW - CW)) // 2 * 2
    VF = f"crop={CW}:{SH}:{x0}:0,scale=1440:1894:flags=lanczos,pad=1440:2560:0:666:black,fps=30"
    print(f"face x median {cx:.0f} from {len(xs)} samples -> crop x {x0}..{x0 + CW} of {SW}x{SH}")
else:
    VF = "scale=1440:2560:flags=lanczos:force_original_aspect_ratio=increase,crop=1440:2560,fps=30"
    print(f"portrait source {SW}x{SH} -> 1440x2560 (re-measure SIDE_FACE from a still)")
cap.release()

# ---- proxy: each span cut from the raw (crop, scale, 30 fps CFR, crf 12), then concatenated (stream copy)
tmp = f"{FILM}/source/spanparts"; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
lst = []
for k, sp in enumerate(spans):
    p = f"{tmp}/{k:03d}.mp4"; nf = int(round(sp["len"] * FPS))
    run("ffmpeg", "-v", "error", "-y", "-ss", f"{max(0, sp['srcAbs'] - 1):.3f}", "-i", MP4, "-ss", f"{min(1, sp['srcAbs']):.3f}",
        "-vf", VF, "-frames:v", str(nf), "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "12", "-pix_fmt", "yuv420p", p)
    lst.append(f"file '{p}'")
open(f"{tmp}/list.txt", "w").write("\n".join(lst))
run("ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{tmp}/list.txt", "-c", "copy", f"{FILM}/public/proxy-1440.mp4")
shutil.rmtree(tmp, ignore_errors=True)
nfr = int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames",
                          "-of", "csv=p=0", f"{FILM}/public/proxy-1440.mp4"], capture_output=True, text=True).stdout.strip())
print("proxy frames", nfr, "expected", sum(int(round(s["len"] * FPS)) for s in spans))

frames = int(round(total * FPS))
env = envelope(vo, frames)
if SPEED != 1.0:  # footage (setpts) and voice (atempo, pitch kept) by the same factor: lips stay synced
    frames = int(round(total / SPEED * FPS)); total = frames / FPS
    raw = f"{FILM}/source/proxy-1440-1x.mp4"; shutil.move(f"{FILM}/public/proxy-1440.mp4", raw)
    run("ffmpeg", "-v", "error", "-y", "-i", raw, "-vf", f"setpts=PTS/{SPEED},fps=30", "-frames:v", str(frames),
        "-c:v", "libx264", "-preset", "medium", "-crf", "12", "-pix_fmt", "yuv420p", f"{FILM}/public/proxy-1440.mp4")
    run("ffmpeg", "-v", "error", "-y", "-i", f"{FILM}/public/vo.wav", "-af", f"atempo={SPEED}", "-ar", str(sr), f"{FILM}/source/vo-fast.wav")
    _, v2 = wf.read(f"{FILM}/source/vo-fast.wav"); v2 = v2[: int(total * sr)]
    if len(v2) < int(total * sr): v2 = np.concatenate([v2, np.zeros((int(total * sr) - len(v2),) + v2.shape[1:], v2.dtype)])
    wf.write(f"{FILM}/public/vo.wav", sr, v2)
    for w in words: w["s"] = round(w["s"] / SPEED, 3); w["e"] = round(w["e"] / SPEED, 3)
    outro["t"] = round(outro["t"] / SPEED, 6); outro["dur"] = round(total - outro["t"] - 0.3, 3)
    env = envelope(v2, frames)
    for sp in spans: sp["out"] = sp["src"] = round(sp["out"] / SPEED, 6); sp["len"] = round(sp["len"] / SPEED, 6)
    speech_end /= SPEED
    print("speed", SPEED, "->", f"{total:.2f}s")
json.dump(words, open(f"{FILM}/src/words.json", "w"), indent=0)
json.dump(env, open(f"{FILM}/src/vo_env.json", "w"))

# ---- denoise (Madhav 2026-10-24: "static that keeps going on"): DeepFilterNet3, 20 dB limit, isolated venv
DFN = os.environ.get("DFN_PYTHON")
if C.get("no_denoise"):
    print("denoise skipped (no_denoise)")
elif DFN and os.path.exists(DFN):
    shutil.copyfile(f"{FILM}/public/vo.wav", f"{FILM}/source/vo-noisy.wav")
    run(DFN, os.path.join(HERE, "denoise_dfn.py"), f"{FILM}/source/vo-noisy.wav", f"{FILM}/source/vo-dfn.wav", str(C.get("dfn_limit", 20)))
    run("ffmpeg", "-v", "error", "-y", "-i", f"{FILM}/source/vo-dfn.wav", "-ar", str(sr), "-ac", "2", "-c:a", "pcm_s16le", f"{FILM}/public/vo.wav")
    print("denoised (DeepFilterNet3, limit", C.get("dfn_limit", 20), "dB)")
else:
    print("WARNING: NOT denoised. Set DFN_PYTHON to the DeepFilterNet venv's python (see reference/pipeline-commands.md)")

json.dump(spans, open(f"{FILM}/src/edl-spans.json", "w"), indent=0)
segs = [{"out": 0, "src": 0, "len": total}] if SPEED != 1.0 else [{"out": s["out"], "src": s["src"], "len": s["len"]} for s in spans]
meta = {"clip": CID, "version": "v6", "source": os.path.basename(MP4), "frame": FRAME, "crop_x": x0, "segments": segs, "speed": SPEED,
        "gap": GAP, "keep": KEEP, "intro": None, "outro": outro, "srcEnd": total, "total": total, "frames": int(round(total * FPS)),
        "items": [{"type": "his", "q": bool(it.get("q")), "text": " ".join(W[k]["w"].strip() for k in range(it["i0"], it["i1"] + 1))} for it in items]}
json.dump(meta, open(f"{FILM}/src/edl.json", "w"), indent=1)
print(CID, f"{len(spans)} spans, total {total:.2f}s ({meta['frames']} f), speech {speech_end:.2f}s, words {len(words)}, "
      f"outro {outro['t']:.2f}{' (silent)' if outro.get('silent') else ''}")
