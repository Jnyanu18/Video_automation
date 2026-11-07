"""Frame extraction, inspect_frames and the review_plan render+look+judge step."""
from __future__ import annotations

import base64
import json
import os
import re
import subprocess
from typing import Callable, List, Optional


def probe_duration(video: str) -> float:
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", video],
            capture_output=True, text=True, timeout=30,
        )
        return float(r.stdout.strip())
    except Exception:
        return 0.0


def sample_times(duration: float, n: int = 4) -> List[float]:
    """Midpoints of n equal segments (avoids black first/last frames)."""
    if duration <= 0 or n <= 0:
        return [0.0]
    return [round(duration * (i + 0.5) / n, 3) for i in range(n)]


def extract_frames(video: str, times: List[float], outdir: str, width: int = 640, prefix: str = "frame") -> List[str]:
    """Extract one JPEG per time with ffmpeg. Returns the paths that were created."""
    if not video or not os.path.exists(video):
        raise FileNotFoundError(f"video not found: {video}")
    os.makedirs(outdir, exist_ok=True)
    paths = []
    for i, t in enumerate(times):
        out = os.path.join(outdir, f"{prefix}_{i:02d}_{float(t):.2f}.jpg")
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-ss", str(max(0.0, float(t))), "-i", video,
             "-frames:v", "1", "-vf", f"scale={width}:-2", "-q:v", "4", out],
            capture_output=True, timeout=60,
        )
        if os.path.exists(out) and os.path.getsize(out) > 0:
            paths.append(out)
    return paths


def image_block(path: str) -> dict:
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    mt = "image/png" if path.lower().endswith(".png") else "image/jpeg"
    return {"type": "image", "source": {"type": "base64", "media_type": mt, "data": data}}


def inspect_frames(video: str, times: List[float], workdir: str, width: int = 640) -> dict:
    """Builtin tool: extract frames for Claude to look at (loop attaches them as image blocks)."""
    times = [float(t) for t in (times or [])][:8]
    if not times:
        raise ValueError("times must be a non-empty list of seconds")
    paths = extract_frames(video, times, os.path.join(workdir, "frames"), width=width, prefix="inspect")
    return {"images": paths, "times": times[: len(paths)], "video": video}


REVIEW_SYSTEM = (
    "You are a strict QA reviewer for an automated video editor. You are shown sample frames from a "
    "preview render and the edit plan. Check: captions legible, inside frame, not overlapping faces or "
    "each other; subject framed properly after reframing; overlays/titles not covering key content; "
    "no black/blank/corrupt frames; output looks consistent with the plan. "
    'Reply with ONLY JSON: {"pass": true|false, "issues": ["specific, actionable issue", ...]}.'
)


def run_scorecard(plan: dict, workdir: str) -> dict:
    """Objective checks from evals/ (cut mid-word, leftover silences, caption reading speed, loudness jumps, ...).

    Never raises: {"available": False, "reason"} when it cannot run (no source file, evals missing, decode error).
    Uses <workdir>/transcript.json (written by the transcribe tool) and the plan's style_ref when those exist.
    A FAIL here fails the review gate; WARN items are listed for Claude but do not block.
    """
    src = ((plan or {}).get("source") or {}).get("path")
    if not src or not os.path.isfile(src):
        return {"available": False, "reason": "source video not found"}
    try:
        from evals import evaluate
        transcript = None
        tpath = os.path.join(workdir, "transcript.json")
        if os.path.isfile(tpath):
            with open(tpath) as f:
                transcript = json.load(f)
            if not (transcript.get("words") if isinstance(transcript, dict) else transcript):
                transcript = None
        style = None
        ref = plan.get("style_ref")
        if ref and os.path.isfile(ref):
            with open(ref) as f:
                style = json.load(f)
        rep = evaluate(src, plan, transcript=transcript, style=style)
    except Exception as e:  # a broken checker must never break the edit
        return {"available": False, "reason": f"{type(e).__name__}: {e}"}
    pick = lambda st: [{"name": c["name"], "detail": c["detail"]} for c in rep["checks"] if c["status"] == st]  # noqa: E731
    return {"available": True, "overall": rep["overall"], "score": rep["score"], "failed": pick("fail"),
            "warnings": pick("warn"), "skipped": [c["name"] for c in rep["checks"] if c["status"] == "skipped"],
            "source_duration": rep["source_duration"], "output_duration": rep["output_duration"]}


def scorecard_issues(card: dict) -> List[str]:
    """Issue strings for Claude: FAIL items first, then WARN items."""
    if not card.get("available"):
        return []
    return ([f"[scorecard FAIL] {c['name']}: {c['detail']}" for c in card["failed"]]
            + [f"[scorecard warn] {c['name']}: {c['detail']}" for c in card["warnings"]])


# ---------------------------------------------------------------------------- claims check
_DONE = (r"(?:add(?:ed)?|insert(?:ed)?|plac(?:e|ed)|appl(?:y|ied)|set|made|creat(?:e|ed)|reframe[d]?|cut|remov(?:e|ed)|"
         r"trimm?(?:ed)?|sped|speed(?:ed)?|normali[sz]ed|mut(?:e|ed)|grad(?:e|ed)|zoom(?:ed)?|put|includ(?:e|ed)|enabled)")
_NEG = re.compile(r"\b(not|no|never|without|unable|couldn'?t|can'?t|cannot|didn'?t|failed|unavailable|if you|once i|i'?ll|i will|"
                  r"would|could)\b|n't", re.I)
_SENT = re.compile(r"(?<=[.!?])\s+|\n")


def _claim_checks(plan: dict):
    """(label, regex of what the reply says was done, is it true in the plan?)"""
    ov = plan.get("overlays") or []
    out = plan.get("output") or {}
    au = plan.get("audio") or {}
    src = (plan.get("source") or {}).get("duration") or 0
    kept = sum(k["end"] - k["start"] for k in plan.get("keep") or [])
    reframed = (plan.get("reframe") or {}).get("mode", "none") != "none"
    portrait = out.get("height", 0) > out.get("width", 1)
    return [
        ("a title/lower-third", r"\b(title|lower[- ]third)\b", any(o.get("kind") in ("title", "lower-third") for o in ov)),
        ("captions", r"\b(captions?|subtitles?)\b", bool(plan.get("captions"))),
        ("a center-crop / reframe", r"\b(center[- ]crop|centre[- ]crop|reframe[d]?|face[- ]follow\w*|crop(?:ped)?)\b", reframed),
        ("vertical output", r"\b(vertical|9:16|portrait)\b", portrait or reframed),
        ("music", r"\b(music|soundtrack|background track)\b", bool(au.get("music"))),
        ("a speed change", r"\b(sped up|speed(?:ed)? up|slow[- ]?mo(?:tion)?|slowed|speed change)\b", bool(plan.get("speed"))),
        ("a zoom", r"\b(zoom(?:ed)?|punch[- ]in)\b", bool(plan.get("zooms"))),
        ("a transition", r"\b(transitions?|crossfade|wipe)\b", bool(plan.get("transitions"))),
        ("a colour grade", r"\b(colou?r grade|graded|grade|cinematic look)\b", bool(plan.get("color_grade"))),
        ("loudness normalization", r"\b(normali[sz]ed|LUFS|loudness)\b", bool(au.get("loudness"))),
        ("muted audio", r"\bmut(?:e|ed|ing)\b", bool(au.get("mute"))),
        ("cuts (footage removed)", r"\b(cut|removed|trimmed|deleted|dead air|silences?|silent)\b", bool(src) and kept < src - 0.05),
    ]


def verify_claims(reply: str, plan: dict) -> List[str]:
    """Things the reply says were DONE that the current plan does not contain (empty list = nothing to flag).

    Heuristic on purpose: a sentence counts as a claim only if it has a completion verb ("added", "cut", "set"...) and no
    negation/future wording ("couldn't", "I'll", "if you"...). A false alarm only costs the model one extra turn to re-check
    the plan; a missed hallucination costs the user trust, so it errs on the side of checking.
    """
    found: List[str] = []
    for sent in (x for x in _SENT.split(reply or "") if x and x.strip()):
        if _NEG.search(sent) or not re.search(r"\b" + _DONE + r"\b", sent, re.I):
            continue
        for label, pat, ok in _claim_checks(plan or {}):
            if not ok and re.search(pat, sent, re.I) and label not in found:
                found.append(label)
    return found


def parse_verdict(text: str) -> dict:
    m = re.search(r"\{.*\}", text or "", re.S)
    if m:
        try:
            d = json.loads(m.group(0))
            return {"pass": bool(d.get("pass")), "issues": [str(i) for i in d.get("issues", [])]}
        except Exception:
            pass
    return {"pass": False, "issues": ["reviewer returned an unparseable verdict: " + (text or "")[:200]]}


def plan_digest(plan: dict) -> dict:
    keys = ("version", "revision", "source", "output", "keep", "captions", "reframe", "overlays", "style_ref", "notes",
            "speed", "zooms", "transitions", "color_grade", "audio")
    d = {k: plan.get(k) for k in keys if k in plan}
    if isinstance(d.get("reframe"), dict) and len(d["reframe"].get("track", [])) > 5:
        d["reframe"] = {**d["reframe"], "track": d["reframe"]["track"][:5] + ["..."]}
    return d


def review_once(*, client, model: str, plan: dict, video: str, workdir: str, round_no: int,
                on_usage: Optional[Callable] = None, n_frames: int = 4, max_tokens: int = 800,
                scorecard: Optional[dict] = None) -> dict:
    """Extract sample frames from the rendered preview and have Claude judge them.

    Models that cannot see images (client.supports_vision is False) skip the visual verdict: the objective scorecard
    (agent/review.py run_scorecard) is then the only automatic check, and the issue list says so.
    """
    if getattr(client, "supports_vision", True) is False:
        return {"pass": True, "issues": ["visual review skipped: this model cannot see images (scorecard only)"],
                "frames": [], "times": [], "preview": video, "visual_skipped": True}
    dur = probe_duration(video)
    times = sample_times(dur, n_frames)
    frames = extract_frames(video, times, os.path.join(workdir, "review"), prefix=f"r{round_no}")
    if not frames:
        return {"pass": False, "issues": ["could not extract any frames from the preview render"], "frames": [], "times": times}
    content = [{"type": "text", "text": "Edit plan:\n" + json.dumps(plan_digest(plan), default=str)[:6000]
                + (("\n\nAutomatic scorecard (objective checks, already counted separately): "
                    + json.dumps({k: scorecard[k] for k in ("overall", "failed", "warnings")}))
                   if scorecard and scorecard.get("available") else "")
                + f"\n\nSample frames at t={times} seconds of the preview:"}]
    content += [image_block(p) for p in frames]
    resp = client.messages.create(
        model=model, max_tokens=max_tokens, system=REVIEW_SYSTEM,
        messages=[{"role": "user", "content": content}],
    )
    if on_usage:
        on_usage(resp)
    text = "".join(_text_of(b) for b in _content_of(resp))
    verdict = parse_verdict(text)
    verdict.update(frames=frames, times=times, preview=video)
    return verdict


def _content_of(resp):
    return resp["content"] if isinstance(resp, dict) else resp.content


def _text_of(block) -> str:
    t = block.get("type") if isinstance(block, dict) else getattr(block, "type", None)
    if t != "text":
        return ""
    return block["text"] if isinstance(block, dict) else block.text
