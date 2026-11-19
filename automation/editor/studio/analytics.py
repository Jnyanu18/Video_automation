"""Dashboard numbers derived from what actually happened in the studio. No constants, no demo data.

Engagement (views, sends, saves...) only exists when someone records it on a published item, because the platforms'
analytics APIs are not connected; until then the engagement block says so instead of inventing figures.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List, Optional

from .store import Store

METRIC_FIELDS = ("views", "likes", "comments", "sends", "saves", "avg_watch_seconds", "completion_pct")


def _mean(xs: List[float]) -> Optional[float]:
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs), 3) if xs else None


def _check(sb: dict, name: str) -> Optional[dict]:
    return next((c for c in (sb.get("storyboard") or {}).get("scorecard", {}).get("checks", []) if c.get("name") == name), None)


def stage_of(sb: dict) -> str:
    st = sb.get("status")
    if st == "processing":
        return "analyzing"
    if st == "failed":
        return "failed"
    job = sb.get("render_job") or {}
    if job.get("status") == "running":
        return "rendering"
    if sb.get("latest_render"):
        return "rendered"
    if sb.get("approved"):
        return "approved"
    return "awaiting_approval"


def overview(store: Store) -> Dict[str, Any]:
    sbs, pubs, series = store.all("storyboards"), store.all("publishing"), store.all("series")
    by_stage: Dict[str, int] = defaultdict(int)
    for sb in sbs:
        by_stage[stage_of(sb)] += 1
    by_pub: Dict[str, int] = defaultdict(int)
    for p in pubs:
        by_pub[p.get("status", "UNKNOWN")] += 1
    scores = [(sb.get("storyboard") or {}).get("scorecard", {}).get("score") for sb in sbs if sb.get("status") == "ready"]
    pipeline = [
        {"key": "analyzing", "label": "Analyzing", "count": by_stage["analyzing"]},
        {"key": "awaiting_approval", "label": "Awaiting approval", "count": by_stage["awaiting_approval"], "alert": by_stage["awaiting_approval"] > 0},
        {"key": "approved", "label": "Approved", "count": by_stage["approved"]},
        {"key": "rendering", "label": "Rendering", "count": by_stage["rendering"]},
        {"key": "rendered", "label": "Rendered", "count": by_stage["rendered"]},
        {"key": "scheduled", "label": "Scheduled", "count": by_pub["SCHEDULED"] + by_pub["PUBLISHING"]},
        {"key": "published", "label": "Published", "count": by_pub["PUBLISHED"]},
    ]
    return {
        "ok": True,
        "kpis": {
            "storyboards": len(sbs),
            "in_pipeline": sum(by_stage[k] for k in ("analyzing", "awaiting_approval", "approved", "rendering")),
            "awaiting_approval": by_stage["awaiting_approval"],
            "rendering": by_stage["rendering"],
            "rendered": by_stage["rendered"],
            "scheduled": by_pub["SCHEDULED"] + by_pub["PUBLISHING"],
            "published": by_pub["PUBLISHED"],
            "failed": by_stage["failed"] + by_pub["FAILED"],
            "avg_score": _mean([s for s in scores if s is not None]),
            "series_active": sum(1 for s in series if s.get("status") == "ACTIVE"),
        },
        "pipeline": pipeline,
        "recent_activity": store.events(12),
        "next_scheduled": sorted((p for p in pubs if p.get("status") == "SCHEDULED" and p.get("scheduled_at")),
                                 key=lambda p: p["scheduled_at"])[:3],
    }


def engagement(pubs: List[dict]) -> Dict[str, Any]:
    rows = [p for p in pubs if p.get("status") == "PUBLISHED" and p.get("metrics")]
    if not rows:
        return {"connected": False, "reason": "No performance recorded yet. Open a published post and enter its numbers."}
    tot = {k: sum(float((p["metrics"] or {}).get(k) or 0) for p in rows) for k in ("views", "likes", "comments", "sends", "saves")}
    views = tot["views"]
    return {
        "connected": True, "posts_with_data": len(rows), "totals": {k: int(v) for k, v in tot.items()},
        "sends_per_1k_reach": round(tot["sends"] / views * 1000, 1) if views else None,
        "save_rate_pct": round(tot["saves"] / views * 100, 2) if views else None,
        "avg_watch_seconds": _mean([(p["metrics"] or {}).get("avg_watch_seconds") for p in rows]),
        "avg_completion_pct": _mean([(p["metrics"] or {}).get("completion_pct") for p in rows]),
    }


def analytics(store: Store) -> Dict[str, Any]:
    sbs = [s for s in store.all("storyboards") if s.get("status") == "ready"]
    pubs = store.all("publishing")
    dur = [(s["storyboard"] or {}).get("duration") or {} for s in sbs]
    rendered = [s for s in sbs if s.get("latest_render")]
    hooks = [_check(s, "three_second_hook") for s in sbs]
    hooks = [h for h in hooks if h and h.get("status") != "skipped"]
    send = [_check(s, "sendability_signal") for s in sbs]
    send = [h for h in send if h and h.get("status") != "skipped"]
    passes = [((s["storyboard"] or {}).get("scorecard") or {}).get("status") == "PASS" for s in sbs]

    by_style: Dict[str, List[dict]] = defaultdict(list)
    for s in sbs:
        by_style[s.get("style") or "unknown"].append(s)
    styles = []
    for name, items in by_style.items():
        styles.append({
            "style": name, "storyboards": len(items),
            "avg_score": _mean([((i["storyboard"] or {}).get("scorecard") or {}).get("score") for i in items]),
            "avg_reduction_pct": _mean([((i["storyboard"] or {}).get("duration") or {}).get("reduction_percent") for i in items]),
            "avg_output_seconds": _mean([((i["storyboard"] or {}).get("duration") or {}).get("output_seconds") for i in items]),
            "renders": sum(1 for i in items if i.get("latest_render")),
        })
    styles.sort(key=lambda x: (-(x["avg_score"] or 0), x["style"]))

    pub_by_sb = {p.get("storyboard_id"): p for p in pubs if p.get("status") == "PUBLISHED"}
    top = []
    for s in sorted(sbs, key=lambda x: -(((x["storyboard"] or {}).get("scorecard") or {}).get("score") or 0))[:5]:
        p = pub_by_sb.get(s["id"])
        top.append({
            "id": s["id"], "title": (s["storyboard"] or {}).get("title"), "style": s.get("style"),
            "score": ((s["storyboard"] or {}).get("scorecard") or {}).get("score"),
            "output_seconds": ((s["storyboard"] or {}).get("duration") or {}).get("output_seconds"),
            "rendered": bool(s.get("latest_render")), "published": bool(p),
            "metrics": (p or {}).get("metrics"),
        })
    return {
        "ok": True,
        "production": {
            "storyboards": len(sbs), "renders": len(rendered),
            "rendered_seconds": round(sum(float((s["latest_render"] or {}).get("duration") or 0) for s in rendered), 1),
            "avg_score": _mean([((s["storyboard"] or {}).get("scorecard") or {}).get("score") for s in sbs]),
            "scorecard_pass_rate_pct": round(100 * sum(passes) / len(passes), 1) if passes else None,
            "hook_pass_rate_pct": round(100 * sum(h["status"] == "pass" for h in hooks) / len(hooks), 1) if hooks else None,
            "sendability_rate_pct": round(100 * sum(h["status"] == "pass" for h in send) / len(send), 1) if send else None,
            "dead_air_removed_seconds": round(sum(float(d.get("removed_seconds") or 0) for d in dur), 1),
            "avg_reduction_pct": _mean([d.get("reduction_percent") for d in dur]),
        },
        "publishing": {k: sum(1 for p in pubs if p.get("status") == k) for k in ("SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED", "CANCELED")},
        "engagement": engagement(pubs),
        "by_style": styles,
        "top_storyboards": top,
        "recent_activity": store.events(15),
    }


def clean_metrics(raw: Dict[str, Any]) -> Dict[str, float]:
    """Validate a metrics payload: only known numeric fields, non-negative, percentages <= 100."""
    out: Dict[str, float] = {}
    for k in METRIC_FIELDS:
        if raw.get(k) in (None, ""):
            continue
        try:
            v = float(raw[k])
        except (TypeError, ValueError):
            raise ValueError(f"{k} must be a number")
        if v < 0 or (k == "completion_pct" and v > 100):
            raise ValueError(f"{k} is out of range")
        out[k] = v
    return out
