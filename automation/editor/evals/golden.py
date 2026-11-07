"""Golden-set runner: score every video in a folder.

Per video `foo.mp4` it looks for sidecars in the same folder:
  foo.plan.json        EditPlan to score (else a baseline silence-cut plan is generated, or plan_fn(video))
  foo.transcript.json  word timings for the mid-word check (optional)
Writes golden_report.json into the folder (or out_path) and returns the summary dict.
"""
from __future__ import annotations

import glob
import json
import os
from typing import Callable, Optional

from styles import media_utils as mu

from .checks import evaluate, render_scorecard

VIDEO_EXT = (".mp4", ".mov", ".mkv", ".webm", ".m4v")


def baseline_plan(video: str, max_pause: float = 0.3, pad: float = 0.1, min_seg: float = 0.4) -> dict:
    """Dumb reference edit: drop silences > max_pause (keeping `pad` each side). A floor to compare
    real planners against, not a product."""
    info = mu.probe(video)
    dur = info["duration"]
    samples = mu.decode_audio(video)
    sil = mu.find_silences(samples, 16000, -35.0, max_pause) if samples.size else []
    spans, t = [], 0.0
    for s, e in sil:
        a, b = s + pad, e - pad
        if b - a <= 0.05:
            continue
        spans.append([t, a])
        t = b
    spans.append([t, dur])
    merged = []
    for a, b in spans:
        if b - a < min_seg and merged:
            merged[-1][1] = b          # absorb a too-short piece into the previous one
        elif b - a >= min_seg or not merged:
            merged.append([a, b])
    return {
        "version": 1,
        "source": {"path": video, "duration": dur, "width": info["width"], "height": info["height"],
                   "fps": info["fps"]},
        "output": {"width": info["width"], "height": info["height"], "fps": info["fps"]},
        "keep": [{"id": f"k{i + 1}", "start": round(a, 3), "end": round(b, 3)} for i, (a, b) in enumerate(merged)],
        "captions": [], "reframe": {"mode": "none", "track": []}, "overlays": [],
        "style_ref": None, "notes": "baseline silence-cut plan",
    }


def _load(path):
    with open(path) as f:
        return json.load(f)


def run_golden(folder: str, plan_fn: Optional[Callable[[str], dict]] = None, style: Optional[dict] = None,
               out_path: Optional[str] = None, verbose: bool = True) -> dict:
    vids = sorted(p for p in glob.glob(os.path.join(folder, "*")) if p.lower().endswith(VIDEO_EXT))
    rows = []
    for v in vids:
        stem = os.path.splitext(v)[0]
        plan_p, tr_p = stem + ".plan.json", stem + ".transcript.json"
        origin, transcript = "?", None
        try:
            if os.path.exists(plan_p):
                plan, origin = _load(plan_p), "sidecar"
            elif plan_fn:
                plan, origin = plan_fn(v), "plan_fn"
            else:
                plan, origin = baseline_plan(v), "baseline"
            transcript = _load(tr_p) if os.path.exists(tr_p) else None
            rep = evaluate(v, plan, transcript, style)
        except Exception as e:  # keep the batch going; a broken video is a result, not a crash
            rep = {"video": v, "overall": "ERROR", "score": None, "checks": [], "error": repr(e),
                   "source_duration": None, "output_duration": None}
        rep["plan_origin"], rep["has_transcript"] = origin, transcript is not None
        rows.append(rep)
        if verbose:
            print(render_scorecard(rep) if rep["overall"] != "ERROR" else f"ERROR {v}: {rep['error']}")
            print()
    scores = [r["score"] for r in rows if r["score"] is not None]
    summary = {
        "folder": folder, "count": len(rows),
        "passed": sum(r["overall"] == "PASS" for r in rows),
        "warned": sum(r["overall"] == "WARN" for r in rows),
        "failed": sum(r["overall"] in ("FAIL", "ERROR") for r in rows),
        "mean_score": round(sum(scores) / len(scores), 3) if scores else None,
        "results": rows,
    }
    if verbose:
        print(f"GOLDEN SET: {summary['count']} videos, {summary['passed']} pass, {summary['warned']} warn, "
              f"{summary['failed']} fail, mean score {summary['mean_score']}")
    out_path = out_path or os.path.join(folder, "golden_report.json")
    with open(out_path, "w") as f:
        json.dump(summary, f, indent=2)
    summary["report_path"] = out_path
    return summary
