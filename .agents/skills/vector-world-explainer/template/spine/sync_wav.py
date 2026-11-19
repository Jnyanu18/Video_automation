# WAV <-> MP4 sync: cross-correlate each DJI mic WAV against its MP4's own audio track.
#   lag = WAV time - MP4 time of the same sound (wav_time = mp4_time + lag).
# usage: py -3.13 spine/sync_wav.py   -> spine/takes/sync.json {n: {lag, corr, mp4_dur, wav_dur}}
# Quantum v6 findings: the MP4s of some takes carry a SILENT track (-91 dB; corr is meaningless, check
# the durations instead), others carry the camera's copy of the mic ~35 ms late (wireless latency).
# Every WAV had exactly its MP4's duration, so WAV time = video time (lag 0). Always confirm with a
# lip-sync strip (presenter/faceqa.py) and note: on a later DJI take
# the raw file itself had the audio ~2 frames late vs the lips. Never assume; measure per session.
import json, os, subprocess, sys
import numpy as np
from scipy.signal import fftconvolve
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline_config import TAKES, TAKES_DIR, take_mp4, take_wav

SR = 8000


def pcm(path, stream=None):
    cmd = ["ffmpeg", "-v", "error", "-i", path] + (["-map", stream] if stream else []) + ["-ac", "1", "-ar", str(SR), "-f", "s16le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.int16).astype(np.float64)


res = {}
for n in TAKES:
    a = pcm(take_mp4(n), "0:a:0"); b = pcm(take_wav(n))
    L = min(len(a), len(b), SR * 40)
    a0 = a[:L] - a[:L].mean(); b0 = b[:L] - b[:L].mean()
    c = fftconvolve(b0, a0[::-1], mode="full")
    k = int(np.argmax(np.abs(c))); lag = (k - (L - 1)) / SR
    corr = c[k] / (np.linalg.norm(a0) * np.linalg.norm(b0) + 1e-12)
    y0, y1, y2 = np.abs(c[k - 1]), np.abs(c[k]), np.abs(c[k + 1])  # parabolic sub-sample peak
    lag += 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2) / SR
    mp4_db = 20 * np.log10(np.sqrt(np.mean(a ** 2)) / 32768 + 1e-12)
    res[n] = {"lag": round(lag, 4), "corr": round(float(corr), 3), "mp4_track_dbfs": round(float(mp4_db), 1), "mp4_dur": len(a) / SR, "wav_dur": len(b) / SR}
    print(n, res[n], flush=True)
json.dump(res, open(os.path.join(TAKES_DIR, "sync.json"), "w"), indent=1)
