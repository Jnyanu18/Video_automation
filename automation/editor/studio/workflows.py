"""The automation hub's data: the real n8n workflows from disk, plus live counts for the editor's own stages."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from . import health
from .analytics import overview
from .store import Store

N8N_DIR = Path(__file__).resolve().parents[2] / "n8n"

# What each n8n workflow does, in pipeline order (the JSON only carries a title and node list).
PURPOSE = {
    "01": ("Reel Intake", "Validate an Instagram reel URL, deduplicate, scrape with Apify and transcribe the source."),
    "02": ("Content Generation", "Write an original script, caption and hashtags with the LLM; validate and hold for approval."),
    "03": ("Human Approval", "Edit / approve / reject / regenerate with a content fingerprint so stale approvals are refused."),
    "04": ("HeyGen Video", "Submit the approved script to HeyGen with an idempotency key and poll until the video exists."),
    "05": ("Instagram Publishing", "Stage media and create the post exactly once; never retry an ambiguous create."),
    "06": ("Video Upload Intake", "Register an uploaded video by file hash and send it to approval, skipping extraction."),
    "07": ("Integration Status", "Probe n8n, Airtable, Apify, OpenAI, HeyGen and Blotato/Postiz with the stored credentials."),
}


def n8n_workflows() -> List[Dict[str, Any]]:
    out = []
    for f in sorted(N8N_DIR.glob("0*.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        num = f.name[:2]
        webhooks = [n.get("parameters", {}).get("path") for n in d.get("nodes", []) if str(n.get("type", "")).endswith("webhook")]
        title, purpose = PURPOSE.get(num, (d.get("name", f.stem), ""))
        out.append({"id": f"n8n_{num}", "number": int(num), "name": d.get("name", f.stem), "title": title, "purpose": purpose,
                    "nodes": len(d.get("nodes", [])), "webhooks": [w for w in webhooks if w], "file": f.name})
    return out


def hub(store: Store) -> Dict[str, Any]:
    st, _ = health.http_get("http://127.0.0.1:5678/healthz", 1.5)
    reachable = st == 200 or health.port_open(5678)
    wfs = n8n_workflows()
    for w in wfs:
        w["status"] = "AVAILABLE" if reachable else "ENGINE_OFFLINE"
    ov = overview(store)
    return {
        "ok": True,
        "n8n": {"reachable": reachable, "url": "http://127.0.0.1:5678",
                "note": None if reachable else "n8n is not running. Install with `npm run n8n:install`, then start the stack."},
        "workflows": wfs,
        "editor_pipeline": ov["pipeline"],
        "recent_activity": ov["recent_activity"],
    }
