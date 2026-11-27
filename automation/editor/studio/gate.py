"""Publish gate: one verdict from every automatic check before a reel can be published.

PASS   nothing to look at: publish.
REVIEW something is missing or unclear: a person must acknowledge it before publishing.
BLOCK  a hard failure (broken render, failed scorecard-grade defect): publishing is refused.

Deterministic checks (the director plan, the rendered file's QA) can BLOCK. The optional Claude frame review can only ask for
REVIEW, because a model's visual opinion is not reliable enough to block a post on its own.
"""
from __future__ import annotations

import json
import logging
import tempfile
from typing import Any, Dict, List, Optional

from services.render.render_qa import inspect_rendered_mp4

log = logging.getLogger("gate")

PASS, REVIEW, BLOCK = "PASS", "REVIEW", "BLOCK"
_RANK = {PASS: 0, REVIEW: 1, BLOCK: 2}
_DEFECT_LEVEL = {"CRITICAL": BLOCK, "MAJOR": REVIEW, "MINOR": PASS}


def _check(name: str, level: str, detail: str) -> Dict[str, str]:
    return {"name": name, "level": level, "detail": detail}


def plan_checks(dplan: Optional[dict]) -> List[dict]:
    """Does the director plan have the parts the playbook asks for? Missing parts need a person, not a block."""
    if not dplan:  # hand-made edits and recipes have no director plan: the playbook checks do not apply to them
        return [_check("director plan", PASS, "no director plan (hand-made edit): playbook checks not applicable")]
    out = []
    if dplan.get("hook"):
        out.append(_check("hook", PASS, dplan["hook"]["text"]))
    else:
        out.append(_check("hook", REVIEW, "no hook title in the first 3 seconds"))
    if dplan.get("rehook"):
        out.append(_check("rehook", PASS, f"rehook at {float(dplan['rehook']['start']):.1f}s"))
    else:
        out.append(_check("rehook", REVIEW, "no rehook between 25% and 40% of the way through"))
    if dplan.get("cta"):
        out.append(_check("call to action", PASS, dplan["cta"]["text"]))
    else:
        out.append(_check("call to action", REVIEW, "no closing call to action"))
    return out


def render_checks(path: str) -> List[dict]:
    """The rendered file itself: black frames, loudness, duration sync, missing output (render_qa does the measuring)."""
    rep = inspect_rendered_mp4(path)
    if not rep.defects:
        lufs = (rep.audio_metrics or {}).get("integrated_lufs")
        detail = "no defects" + (f" (loudness {float(lufs):.1f} LUFS)" if lufs is not None else "")
        return [_check("render", PASS, detail)]
    return [_check(d.title, _DEFECT_LEVEL.get(d.severity, REVIEW), d.detail) for d in rep.defects]


def visual_checks(client: Any, path: str, dplan: Optional[dict]) -> List[dict]:
    """Claude looks at sampled frames of the render. Its findings are REVIEW at most."""
    from agent.review import review_once

    model = getattr(client, "model", None) or "claude-sonnet-5-5"
    summary = json.dumps(dplan or {}, default=str)[:5000]
    try:
        with tempfile.TemporaryDirectory(prefix="gate_") as wd:
            v = review_once(client=client, model=model, plan={"notes": "Director plan: " + summary}, video=path,
                            workdir=wd, round_no=1, n_frames=4)
    except Exception as exc:  # the check is advisory: a failure is a REVIEW note, never a crash
        log.warning("visual review failed: %s", exc)
        return [_check("visual review", REVIEW, f"could not run ({type(exc).__name__})")]
    if v.get("visual_skipped"):
        return [_check("visual review", PASS, "skipped: this model cannot see images")]
    if v.get("pass"):
        return [_check("visual review", PASS, "frames look right")]
    return [_check("visual review", REVIEW, "; ".join(v.get("issues") or ["flagged, no detail given"]))]


def verdict(checks: List[dict]) -> Dict[str, Any]:
    worst = max((c["level"] for c in checks), key=lambda lv: _RANK[lv], default=PASS)
    return {
        "verdict": worst,
        "checks": checks,
        "blocked_by": [c["name"] for c in checks if c["level"] == BLOCK],
        "needs_review": [c["name"] for c in checks if c["level"] == REVIEW],
    }


def check_for_publish(render_path: str, dplan: Optional[dict], visual_client: Any = None) -> Dict[str, Any]:
    """Every check that applies before a reel is published. The visual check runs only when a client is given."""
    checks = plan_checks(dplan) + render_checks(render_path)
    if visual_client is not None:
        checks += visual_checks(visual_client, render_path, dplan)
    return verdict(checks)
