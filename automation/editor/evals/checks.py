"""Automatic EditPlan quality checks. All times are SOURCE seconds (the plan's own convention).

Every check returns {"name", "status": pass|warn|fail|skipped, "score": 0..1 or None, "value", "detail"}.
These are objective proxies. They do NOT measure whether the edit is good: see evals/README.md.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np

from styles import media_utils as mu

DEFAULTS = {
    "min_segment": 0.4,
    "word_guard": 0.02,        # a cut this close to a word edge is not "inside" the word
    "max_caption_chars": 84,   # two lines of 42
    "warn_cps": 20.0,          # characters per second reading speed
    "fail_cps": 25.0,
    "min_caption_dur": 0.7,
    "max_pause": 0.6,          # longest silence tolerated in output (overridden by style max_pause)
    "max_silence_ratio": 0.08,
    "silence_db": -35.0,
    "silence_min": 0.3,
    "jump_warn_db": 6.0,
    "jump_fail_db": 10.0,
    "jump_window": 0.25,
}


def _res(name, status, score, value, detail=""):
    return {"name": name, "status": status, "score": score, "value": value, "detail": detail}


def merged_keeps(plan: dict, join_gap: float = 0.01) -> List[Tuple[float, float]]:
    """Sorted keep spans with touching/overlapping spans merged (those are not real cuts)."""
    ks = sorted((float(k["start"]), float(k["end"])) for k in plan.get("keep", []) if k["end"] > k["start"])
    out: List[List[float]] = []
    for a, b in ks:
        if out and a <= out[-1][1] + join_gap:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return [(a, b) for a, b in out]


def cut_points(segs: List[Tuple[float, float]], src_dur: float) -> List[float]:
    """Source times where the edit cuts through the source (excludes file start/end)."""
    pts = []
    for i, (a, b) in enumerate(segs):
        if a > 0.01:
            pts.append(a)
        if b < src_dur - 0.01:
            pts.append(b)
    return pts


# ------------------------------------------------------------------ checks
def check_segments(segs, min_len) -> dict:
    short = [(round(a, 2), round(b - a, 2)) for a, b in segs if b - a < min_len - 1e-9]
    if not segs:
        return _res("min_segment", "fail", 0.0, 0, "plan has no keep segments")
    if short:
        return _res("min_segment", "fail", 1 - len(short) / len(segs), len(short),
                    f"{len(short)}/{len(segs)} segments < {min_len}s, e.g. start/len {short[:3]}")
    return _res("min_segment", "pass", 1.0, 0, f"{len(segs)} segments, shortest {min(b - a for a, b in segs):.2f}s")


def check_mid_word(segs, words, src_dur, guard) -> dict:
    if not words:
        return _res("no_cut_mid_word", "skipped", None, None, "no transcript supplied")
    pts = cut_points(segs, src_dur)
    if not pts:
        return _res("no_cut_mid_word", "pass", 1.0, 0, "no internal cuts")
    starts = np.array([w["start"] for w in words])
    ends = np.array([w["end"] for w in words])
    bad = []
    for t in pts:
        hit = np.where((starts + guard < t) & (t < ends - guard))[0]
        if hit.size:
            bad.append((round(t, 2), words[int(hit[0])]["word"]))
    if bad:
        return _res("no_cut_mid_word", "fail", 1 - len(bad) / len(pts), len(bad),
                    f"{len(bad)}/{len(pts)} cuts inside a word, e.g. {bad[:3]}")
    return _res("no_cut_mid_word", "pass", 1.0, 0, f"{len(pts)} cuts, none inside a word")


def check_captions(caps, c) -> List[dict]:
    if not caps:
        return [_res("caption_length", "skipped", None, None, "no captions"),
                _res("caption_reading_speed", "skipped", None, None, "no captions")]
    long_ = [x["id"] for x in caps if len(x["text"]) > c["max_caption_chars"]]
    r1 = (_res("caption_length", "pass", 1.0, 0, f"{len(caps)} captions within {c['max_caption_chars']} chars")
          if not long_ else
          _res("caption_length", "warn", 1 - len(long_) / len(caps), len(long_),
               f"{len(long_)} captions over {c['max_caption_chars']} chars: {long_[:5]}"))
    fast, vfast, brief = [], [], []
    for x in caps:
        d = max(x["end"] - x["start"], 1e-6)
        cps = len(x["text"]) / d
        if cps > c["fail_cps"]:
            vfast.append((x["id"], round(cps, 1)))
        elif cps > c["warn_cps"]:
            fast.append((x["id"], round(cps, 1)))
        if d < c["min_caption_dur"] and len(x["text"]) > 12:
            brief.append(x["id"])
    n = len(caps)
    problems = len(vfast) + len(fast) + len(brief)
    status = "fail" if vfast else ("warn" if problems else "pass")
    detail = "all captions readable" if not problems else (
        f"too fast (>{c['fail_cps']} cps): {vfast[:3]}; fast (>{c['warn_cps']}): {fast[:3]}; "
        f"flash-by (<{c['min_caption_dur']}s): {brief[:3]}")
    r2 = _res("caption_reading_speed", status, max(0.0, 1 - problems / n), problems, detail)
    return [r1, r2]


def check_silence(segs, silences, c) -> dict:
    out_dur = sum(b - a for a, b in segs)
    if out_dur <= 0:
        return _res("silence_remaining", "fail", 0.0, None, "empty output")
    rem = []
    for s, e in silences:
        for a, b in segs:
            lo, hi = max(s, a), min(e, b)
            if hi - lo >= c["silence_min"]:
                rem.append(hi - lo)
    total, longest = sum(rem), max(rem, default=0.0)
    ratio = total / out_dur
    ok = longest <= c["max_pause"] and ratio <= c["max_silence_ratio"]
    score = max(0.0, 1 - min(1.0, ratio / (c["max_silence_ratio"] * 2)))
    status = "pass" if ok else ("fail" if longest > 2 * c["max_pause"] else "warn")
    return _res("silence_remaining", status, score if not ok else 1.0, round(ratio, 4),
                f"{len(rem)} silences >= {c['silence_min']}s remain, total {total:.2f}s "
                f"({ratio:.1%} of output), longest {longest:.2f}s (limit {c['max_pause']}s)")


def check_reduction(segs, src_dur, min_reduction=0.0) -> dict:
    out = sum(b - a for a, b in segs)
    if out <= 0:
        return _res("duration_reduction", "fail", 0.0, None, "output is empty")
    red = 1 - out / src_dur
    if red < -1e-6:
        return _res("duration_reduction", "fail", 0.0, round(red, 4), "output longer than source")
    st = "pass" if red > max(min_reduction, 0.0) + 1e-9 or (red == 0 and min_reduction == 0) else "warn"
    return _res("duration_reduction", st, 1.0 if st == "pass" else 0.5, round(red, 4),
                f"{src_dur:.1f}s -> {out:.1f}s ({red:.1%} removed)")


def check_loudness_jumps(segs, samples, sr, src_dur, c) -> dict:
    if samples.size == 0:
        return _res("loudness_jumps", "skipped", None, None, "source has no audio")
    pts = [(segs[i][1], segs[i + 1][0]) for i in range(len(segs) - 1)]
    w = c["jump_window"]
    jumps = []
    for end_a, start_b in pts:
        la = samples[int(max(0, end_a - w) * sr): int(end_a * sr)]
        lb = samples[int(start_b * sr): int(min(src_dur, start_b + w) * sr)]
        if la.size < sr * 0.1 or lb.size < sr * 0.1:
            continue
        da, db = mu.rms_db(la), mu.rms_db(lb)
        if min(da, db) < -50:  # one side is digital silence: not a level mismatch, covered by silence check
            continue
        jumps.append((round(end_a, 2), round(abs(da - db), 1)))
    if not jumps:
        return _res("loudness_jumps", "pass", 1.0, 0.0, "no measurable cuts between speech segments")
    worst = max(j for _, j in jumps)
    bad = [x for x in jumps if x[1] > c["jump_warn_db"]]
    status = "fail" if worst > c["jump_fail_db"] else ("warn" if bad else "pass")
    return _res("loudness_jumps", status, max(0.0, 1 - len(bad) / len(jumps)), worst,
                f"{len(jumps)} cuts measured, worst {worst} dB; over {c['jump_warn_db']} dB: {bad[:3]}")


# ------------------------------------------------------------------ driver
def evaluate(video: str, plan: dict, transcript=None, style: Optional[dict] = None,
             config: Optional[Dict] = None) -> dict:
    """Run all checks. transcript: anything media_utils.load_transcript_words accepts. style: a
    style profile (its edit_params.max_pause becomes the silence limit)."""
    c = {**DEFAULTS, **(config or {})}
    if style and "max_pause" not in (config or {}):
        c["max_pause"] = max(style["edit_params"]["max_pause"], 0.3)
    info = mu.probe(video)
    src_dur = info["duration"]
    segs = merged_keeps(plan)
    words = mu.load_transcript_words(transcript) if transcript is not None else []
    samples = mu.decode_audio(video)
    silences = mu.find_silences(samples, 16000, c["silence_db"], c["silence_min"]) if samples.size else []

    checks = [check_segments(segs, c["min_segment"]),
              check_mid_word(segs, words, src_dur, c["word_guard"])]
    checks += check_captions(plan.get("captions", []), c)
    checks.append(check_silence(segs, silences, c) if samples.size else
                  _res("silence_remaining", "skipped", None, None, "source has no audio"))
    checks.append(check_reduction(segs, src_dur, c.get("min_reduction", 0.0)))
    checks.append(check_loudness_jumps(segs, samples, 16000, src_dur, c))

    scored = [x["score"] for x in checks if x["score"] is not None]
    statuses = {x["status"] for x in checks}
    overall = "FAIL" if "fail" in statuses else ("WARN" if "warn" in statuses else "PASS")
    return {
        "video": video,
        "source_duration": round(src_dur, 3),
        "output_duration": round(sum(b - a for a, b in segs), 3),
        "overall": overall,
        "score": round(float(np.mean(scored)), 3) if scored else None,
        "checks": checks,
    }


def render_scorecard(report: dict) -> str:
    icon = {"pass": "PASS", "warn": "WARN", "fail": "FAIL", "skipped": "skip"}
    lines = [f"Scorecard: {report['video']}",
             f"  source {report['source_duration']}s -> output {report['output_duration']}s",
             "  " + "-" * 74]
    for ch in report["checks"]:
        sc = "  -  " if ch["score"] is None else f"{ch['score']:.2f}"
        lines.append(f"  [{icon[ch['status']]}] {ch['name']:<22} {sc}  {ch['detail']}")
    lines.append("  " + "-" * 74)
    lines.append(f"  OVERALL {report['overall']}   score {report['score']}   "
                 "(automatic checks only; no human-judgement layer)")
    return "\n".join(lines)
