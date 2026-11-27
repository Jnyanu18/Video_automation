"""Brand rules for image prompts: the palette, the imagery style and the banned words, applied before a provider call.

Unlike the copy checks in brand/checks.py (report only), these are hard rules for images: a prompt that uses a banned
word or claim is refused, and the palette and style are added to the prompt the provider receives.

Kit fields used: visual.palette (hex + role), visual.imagery, voice.words_to_avoid, voice.banned_claims.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

ROLE_ORDER = ("primary", "accent", "neutral", "background", "text")


def _terms(kit: Dict[str, Any]) -> List[str]:
    voice = kit.get("voice") or {}
    out: List[str] = []
    for key in ("words_to_avoid", "banned_claims"):
        for term in voice.get(key) or []:
            # A draft kit holds placeholder text where the brand has not stated a term. Placeholders are not rules.
            if isinstance(term, str) and term.strip() and not term.strip().upper().startswith("PLACEHOLDER"):
                out.append(term.strip())
    return out


def find_banned(prompt: str, kit: Dict[str, Any]) -> List[str]:
    """Banned words or claims that appear in the prompt, whole words and case-insensitive."""
    hits = []
    for term in _terms(kit):
        if re.search(r"(?<!\w)" + re.escape(term) + r"(?!\w)", prompt, re.IGNORECASE):
            hits.append(term)
    return hits


def _imagery(kit: Dict[str, Any]) -> Optional[str]:
    """The stated imagery style, or None when it is empty or still a placeholder."""
    text = ((kit.get("visual") or {}).get("imagery") or "").strip()
    return None if (not text or text.upper().startswith("PLACEHOLDER")) else text


def _swatches(kit: Dict[str, Any]) -> List[Dict[str, Any]]:
    swatches = ((kit.get("visual") or {}).get("palette") or [])
    return [s for s in swatches if isinstance(s, dict) and s.get("hex") and s.get("role")]


def compose(prompt: str, kit: Dict[str, Any]) -> str:
    """The prompt the provider receives: the user's prompt plus the brand's style, palette and what to avoid."""
    parts = [prompt.strip()]
    imagery = _imagery(kit)
    if imagery:
        parts.append(f"Visual style: {imagery.rstrip('.')}.")
    swatches = sorted(_swatches(kit), key=lambda s: ROLE_ORDER.index(s["role"]) if s["role"] in ROLE_ORDER else 99)
    if swatches:
        colours = ", ".join(f"{s['role']} {s['hex']}" for s in swatches)
        parts.append(f"Colour palette, use only these as the dominant tones: {colours}.")
    avoid = _terms(kit)
    if avoid:
        parts.append("Avoid showing or implying: " + "; ".join(avoid) + ".")
    return " ".join(parts)


def summary(kit: Dict[str, Any]) -> Dict[str, Any]:
    """What was applied, stored on the image job so the gallery can show it."""
    return {
        "kit_version": kit.get("version"),
        "palette": [{"role": s["role"], "hex": s["hex"]} for s in _swatches(kit)],
        "imagery": _imagery(kit),
        "avoided_terms": len(_terms(kit)),
    }


def apply(prompt: str, kit: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Without a kit the prompt passes through unchanged. Returns {"provider_prompt", "brand"}."""
    if not kit:
        return {"provider_prompt": prompt, "brand": None}
    return {"provider_prompt": compose(prompt, kit), "brand": summary(kit)}
