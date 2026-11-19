"""Style sheet revision engine from plain-English feedback."""
from __future__ import annotations

import copy
import json
import logging
import os
from typing import Dict, Any, Tuple, Optional

from ..schemas.style import StyleSheet, StyleSheetPatch

log = logging.getLogger("reelforge.style.reviser")

def revise_style(current_style: StyleSheet, user_feedback: str, api_key: Optional[str] = None) -> Tuple[StyleSheet, Dict[str, Any]]:
    """Revise a StyleSheet based on plain-English instructions and return (new_style, diff)."""
    key = api_key or os.environ.get("ANTHROPIC_API_KEY")
    patch_data: Dict[str, Any] = {}

    if key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=key)
            model = os.environ.get("REELFORGE_MODEL", "claude-3-7-sonnet-20250219")

            prompt = (
                f"Current Style Sheet (v{current_style.version}):\n"
                f"{current_style.model_dump_json(indent=2)}\n\n"
                f"User requested change: \"{user_feedback}\"\n\n"
                "Return a JSON patch with only the modified sections. Example:\n"
                "{\n"
                '  "fonts": {"family": "Montserrat", "color_hex": "#FFFF00"},\n'
                '  "captions": {"style": "clean_box"},\n'
                '  "change_reason": "Switched font to Montserrat and made color yellow"\n'
                "}\n"
                "Respond ONLY with valid JSON."
            )

            resp = client.messages.create(
                model=model,
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}]
            )
            text = resp.content[0].text.strip()
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            patch_data = json.loads(text.strip())
        except Exception as e:
            log.warning("LLM style revision failed, applying heuristic fallback: %s", e)
            patch_data = {"change_reason": user_feedback}
    else:
        # Heuristic fallback for offline/test environments
        lower = user_feedback.lower()
        if "faster" in lower or "quicker" in lower:
            patch_data = {"pacing": {"avg_cut_interval_seconds": max(1.0, current_style.pacing.avg_cut_interval_seconds - 0.4)}, "change_reason": "Tightened cut intervals"}
        elif "yellow" in lower:
            patch_data = {"fonts": {"color_hex": "#FFFF00"}, "change_reason": "Changed font color to yellow"}
        else:
            patch_data = {"change_reason": f"Updated per feedback: {user_feedback}"}

    # Validate patch against schema
    patch = StyleSheetPatch(**patch_data)
    new_style_dict = copy.deepcopy(current_style.model_dump())
    new_style_dict["version"] += 1

    diff = {}
    if patch.fonts:
        new_style_dict["fonts"].update(patch.fonts)
        diff["fonts"] = patch.fonts
    if patch.colors:
        new_style_dict["colors"] = patch.colors
        diff["colors"] = patch.colors
    if patch.captions:
        new_style_dict["captions"].update(patch.captions)
        diff["captions"] = patch.captions
    if patch.pacing:
        new_style_dict["pacing"].update(patch.pacing)
        diff["pacing"] = patch.pacing
    if patch.sound:
        new_style_dict["sound"].update(patch.sound)
        diff["sound"] = patch.sound

    new_style_dict["summary"] = f"v{new_style_dict['version']}: {patch.change_reason or user_feedback}"
    diff["change_reason"] = patch.change_reason or user_feedback

    return StyleSheet(**new_style_dict), diff
