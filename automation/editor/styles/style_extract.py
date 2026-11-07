"""Extract an objective style profile from a reference video (see styles/README.md for the schema)."""
from __future__ import annotations

import json
import os
import re
import subprocess
from typing import List, Optional

import cv2
import numpy as np

from . import media_utils as mu

SCHEMA_VERSION = 1


# ---------------------------------------------------------------- measurements
def detect_cuts(path: str, threshold: float = 0.3) -> List[float]:
    """Scene-cut timestamps (s) using ffmpeg's scene score on a downscaled stream."""
    p = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-an",
         "-vf", f"scale=320:-2,select='gt(scene,{threshold})',showinfo", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    return sorted(float(m) for m in re.findall(r"pts_time:([\d.]+)", p.stderr))


def shot_lengths(cuts: List[float], duration: float) -> List[float]:
    edges = [0.0] + [c for c in cuts if 0 < c < duration] + [duration]
    return [b - a for a, b in zip(edges, edges[1:]) if b - a > 1e-6]


def sample_frames(path: str, n: int = 12, width: int = 320) -> List[np.ndarray]:
    cap = cv2.VideoCapture(path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    frames = []
    if total <= 0:
        cap.release()
        return frames
    for i in np.linspace(0, max(total - 2, 0), n).astype(int):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(i))
        ok, fr = cap.read()
        if not ok:
            continue
        h, w = fr.shape[:2]
        frames.append(cv2.resize(fr, (width, max(2, int(h * width / w)))))
    cap.release()
    return frames


def color_palette(frames: List[np.ndarray], k: int = 5) -> dict:
    if not frames:
        return {"colors": [], "brightness": None, "saturation": None}
    px = np.concatenate([cv2.resize(f, (48, 48)).reshape(-1, 3) for f in frames]).astype(np.float32)
    k = min(k, len(px))
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    cv2.setRNGSeed(0)
    _, labels, centers = cv2.kmeans(px, k, None, crit, 3, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.flatten(), minlength=k) / len(labels)
    order = np.argsort(-counts)
    colors = []
    for i in order:
        b, g, r = [int(round(c)) for c in centers[i]]
        colors.append({"hex": f"#{r:02x}{g:02x}{b:02x}", "weight": round(float(counts[i]), 3)})
    hsv = [cv2.cvtColor(f, cv2.COLOR_BGR2HSV) for f in frames]
    return {
        "colors": colors,
        "brightness": round(float(np.mean([h[..., 2].mean() for h in hsv])) / 255, 3),
        "saturation": round(float(np.mean([h[..., 1].mean() for h in hsv])) / 255, 3),
    }


def detect_captions(frames: List[np.ndarray]) -> dict:
    """HEURISTIC burned-in caption finder. Text rows have dense, strong horizontal-gradient edges
    that are bright against their surroundings. We vote across frames for the row band that stands
    out; confidence = share of frames voting for the winner. Low confidence => reported as 'none'."""
    none = {"detected": False, "position": "none", "size_frac": None, "confidence": 0.0}
    if len(frames) < 3:
        return none
    votes, sizes = [], []
    for fr in frames:
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        h, w = g.shape
        core = g[:, int(w * 0.1): int(w * 0.9)]
        gx = np.abs(cv2.Sobel(core, cv2.CV_32F, 1, 0, ksize=3))
        strong = (gx > 200).mean(axis=1)  # per-row density of strong vertical edges
        bright = (core > 215).mean(axis=1)
        score = strong * (bright > 0.01)
        thr = max(0.04, 3 * float(np.median(strong)))
        rows = score > thr
        # merge small gaps, take longest run
        best, cur_s, gap = (0, 0), None, 0
        for y in range(h + 1):
            on = y < h and rows[y]
            if on:
                if cur_s is None:
                    cur_s = y
                gap = 0
            elif cur_s is not None:
                gap += 1
                if gap > 3 or y == h:
                    end = y - gap + 1
                    if end - cur_s > best[1] - best[0]:
                        best = (cur_s, end)
                    cur_s, gap = None, 0
        run = best[1] - best[0]
        if 0.02 * h <= run <= 0.25 * h:
            votes.append((best[0] + best[1]) / 2 / h)
            sizes.append(run / h)
    conf = len(votes) / len(frames)
    if conf < 0.4:
        return {**none, "confidence": round(conf, 2)}
    centre = float(np.median(votes))
    # positional consistency: most votes must be near the median
    if np.mean(np.abs(np.array(votes) - centre) < 0.08) < 0.6:
        return {**none, "confidence": round(conf * 0.5, 2)}
    pos = "top" if centre < 0.33 else ("middle" if centre < 0.62 else "bottom")
    return {"detected": True, "position": pos, "center_y_frac": round(centre, 3),
            "size_frac": round(float(np.median(sizes)), 3), "confidence": round(conf, 2)}


# ---------------------------------------------------------------- profile
def _pct(a, p):
    return float(np.percentile(a, p)) if len(a) else None


def derive_edit_params(pacing: dict, speech: dict, audio: dict, captions: dict, src: dict) -> dict:
    """Map measurements to EditPlan-level knobs. Documented heuristics, not ground truth."""
    p90 = pacing.get("p90_pause")
    max_pause = round(min(max(p90, 0.15), 0.8), 2) if p90 else 0.25
    asl = pacing.get("avg_shot_length") or src["duration"]
    wpm = speech.get("words_per_minute")
    wpm = speech.get("articulation_wpm") or wpm
    fast = (wpm is not None and wpm >= 170) or asl < 2.5
    cap_style = "bold-pop" if fast else "clean-lower"
    pos = captions["position"] if captions.get("detected") else ("middle" if fast else "bottom")
    w, h = src["width"], src["height"]
    aspect = "9:16" if h > w * 1.2 else ("1:1" if abs(w - h) <= 0.1 * max(w, h) else "16:9")
    return {
        "max_pause": max_pause,
        "target_shot_length": round(float(asl), 2),
        "caption_style": cap_style,
        "caption_max_words": 3 if fast else 5,
        "caption_position": pos,
        "output_aspect": aspect,
        "target_lufs": audio.get("integrated_lufs"),
    }


def extract_style(video: str, name: Optional[str] = None, transcript=None,
                  scene_threshold: float = 0.3, n_frames: int = 12) -> dict:
    """Measure `video` and return a style profile dict. `transcript` (optional) is anything accepted
    by media_utils.load_transcript_words; it enables speech pace."""
    info = mu.probe(video)
    dur = info["duration"]
    cuts = detect_cuts(video, scene_threshold) if info["has_video"] else []
    shots = shot_lengths(cuts, dur)

    samples = mu.decode_audio(video)
    sr = 16000
    sil = mu.find_silences(samples, sr, thresh_db=-35.0, min_dur=0.2) if samples.size else []
    # ignore leading/trailing silence: they are not editorial pauses
    inner = [(a, b) for a, b in sil if a > 0.05 and b < dur - 0.05]
    pauses = [b - a for a, b in inner]
    speech_ratio = None
    if samples.size:
        speech_ratio = round(1 - sum(b - a for a, b in sil) / max(dur, 1e-6), 3)

    words = mu.load_transcript_words(transcript) if transcript is not None else []
    wpm = art_wpm = None
    if words:
        span = max(words[-1]["end"] - words[0]["start"], 1e-6)
        wpm = round(len(words) / span * 60, 1)
        # articulation rate: pauses >= 0.3s between words do not count as speaking time
        talk = sum(w["end"] - w["start"] for w in words) + sum(
            g for g in (b["start"] - a["end"] for a, b in zip(words, words[1:])) if 0 < g < 0.3)
        art_wpm = round(len(words) / max(talk, 1e-6) * 60, 1)

    lufs, lra = mu.integrated_lufs(video) if info["has_audio"] else (None, None)
    frames = sample_frames(video, n_frames) if info["has_video"] else []

    pacing = {
        "shot_count": len(shots),
        "avg_shot_length": round(float(np.mean(shots)), 3) if shots else None,
        "median_shot_length": round(float(np.median(shots)), 3) if shots else None,
        "cuts_per_minute": round(len(cuts) / dur * 60, 2) if dur else None,
        "pause_count": len(pauses),
        "avg_pause": round(float(np.mean(pauses)), 3) if pauses else None,
        "p90_pause": round(_pct(pauses, 90), 3) if pauses else None,
        "max_pause_observed": round(max(pauses), 3) if pauses else None,
        "speech_ratio": speech_ratio,
    }
    speech = {"words": len(words), "words_per_minute": wpm, "articulation_wpm": art_wpm}
    audio = {"has_audio": info["has_audio"], "integrated_lufs": lufs, "lra": lra}
    captions = detect_captions(frames)
    src = {"path": os.path.abspath(video), "duration": round(dur, 3), "width": info["width"],
           "height": info["height"], "fps": info["fps"]}
    return {
        "schema_version": SCHEMA_VERSION,
        "name": name or os.path.splitext(os.path.basename(video))[0],
        "source": src,
        "pacing": pacing,
        "speech": speech,
        "audio": audio,
        "captions": captions,
        "palette": color_palette(frames),
        "edit_params": derive_edit_params(pacing, speech, audio, captions, src),
    }


def save_style(profile: dict, path: str) -> str:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w") as f:
        json.dump(profile, f, indent=2)
    return path


def load_style(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="Extract a style profile from a reference video")
    ap.add_argument("video")
    ap.add_argument("-o", "--out", help="output JSON (default styles/<name>.json)")
    ap.add_argument("--transcript", help="transcript JSON for speech pace")
    ap.add_argument("--name")
    a = ap.parse_args(argv)
    prof = extract_style(a.video, a.name, a.transcript)
    out = a.out or os.path.join(os.path.dirname(os.path.abspath(__file__)), prof["name"] + ".json")
    save_style(prof, out)
    print(json.dumps(prof["edit_params"], indent=2))
    print("wrote", out)


if __name__ == "__main__":
    main()
