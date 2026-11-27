"""Draft a brand kit from a brand's own text (for example its website), for a person to review.

The model reads the text and returns a kit as JSON. The result is never trusted as it comes back:
  * every status is forced to "draft", so nothing is approved by the model;
  * every proof point is forced to verified=false, so no claim is used as a fact until a person checks it;
  * the kit must pass validate_kit, or the draft is refused with the reasons;
  * with no LLM client, nothing is drafted (no template is invented).
"""
from __future__ import annotations

import copy
import json
import re
from typing import Any, Dict, List, Optional, Tuple

from .validator import validate_kit

GROUPS = ("brand", "facts", "voice", "visual", "motion", "captions", "music", "ctas", "aspect_ratios")
MAX_SOURCE_CHARS = 24000

SYSTEM = """You draft a brand kit for a marketing video tool from the brand's own text.
Return ONE JSON object and nothing else. Use only facts that appear in the source text.
Rules:
- Do not invent facts, numbers, clients, awards, dates, founders, prices or credentials.
- If a field is not in the source, write the string "PLACEHOLDER - <what is missing>" (or an empty list).
- Every proof point must be an object {"text": "...", "verified": false, "source": "<url or null>"}.
- Colours must be 6-digit hex (#RRGGBB) only if the source states them; otherwise use placeholder colours and say so in the note.
- Leave all status values as "draft".
- Keys: brand{name,legal_name,one_liner,tagline,note}, facts{history,mission,expertise,proof_points,approved_claims,note},
  voice{adjectives,words_to_use,words_to_avoid,banned_claims,note}, visual{palette[{hex,role,share,note}],fonts{heading,body,note},
  logo{full,mono,min_px,note},imagery,reference_images,note}, motion{easing,avg_shot_seconds,pacing,note},
  captions{font,text_colour,highlight_colour,position,note}, music{mood,bpm_min,bpm_max,licensed,note},
  ctas[], aspect_ratios[], status{brand,facts,voice,visual,motion,captions,music,ctas,aspect_ratios}, version, updated_at, owner.
"""

_JSON_RE = re.compile(r"\{.*\}", re.S)


def _force_draft(kit: Dict[str, Any], owner: str) -> Dict[str, Any]:
    out = copy.deepcopy(kit)
    out["status"] = {g: "draft" for g in ("brand", "facts", "voice", "visual", "motion", "captions", "music", "ctas", "aspect_ratios")}
    out["version"] = 1
    out["updated_at"] = ""
    out["owner"] = owner
    facts = out.get("facts") or {}
    for pp in facts.get("proof_points") or []:
        if isinstance(pp, dict):
            pp["verified"] = False
    facts["approved_claims"] = []  # the model never approves a claim
    out["facts"] = facts
    return out


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    m = _JSON_RE.search(text or "")
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def draft_kit(client: Any, source_text: str, source_url: str, owner: str) -> Tuple[Optional[Dict[str, Any]], List[str]]:
    """Return (kit, problems). kit is None when nothing usable came back; problems explains why."""
    if client is None:
        return None, ["no LLM client is configured, so no draft was made"]
    text = (source_text or "").strip()
    if not text:
        return None, ["the source text is empty"]
    text = text[:MAX_SOURCE_CHARS]
    msg = f"Source URL: {source_url}\n\nSource text:\n{text}"
    try:
        resp = client.messages.create(model=getattr(client, "model", None) or "claude-sonnet-5-5", system=SYSTEM,
                                      max_tokens=4000, messages=[{"role": "user", "content": msg}])
    except Exception as exc:  # network or provider failure: report it, never invent a kit
        return None, [f"the model call failed: {type(exc).__name__}"]
    blocks = resp.get("content", []) if isinstance(resp, dict) else getattr(resp, "content", [])
    reply = "".join((b.get("text", "") if isinstance(b, dict) else getattr(b, "text", "")) for b in blocks)
    raw = _extract_json(reply)
    if raw is None:
        return None, ["the model reply did not contain a JSON object"]
    kit = _force_draft(raw, owner)
    ok, errors = validate_kit(kit)
    if not ok:
        return None, errors
    return kit, []
