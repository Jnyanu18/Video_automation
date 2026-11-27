"""export_tokens(kit) -> the machine tokens the renderers read (composition.py and packages/motion-kit).

Shape (keys are always present; lists may be empty):

{
  "kit_version": int,                       # the kit's version, so a renderer can cache by it
  "colours": {                              # every palette role, each a list of hex strings
      "primary":    ["#RRGGBB", ...],       # highest share first, then hex
      "accent":     [...],
      "background": [...],
      "text":       [...],
      "neutral":    [...],
  },
  "fonts": {"heading": str, "body": str},
  "caption": {                              # for the caption style in composition.py
      "font": str,
      "text_colour": "#RRGGBB",
      "highlight_colour": "#RRGGBB",        # the active-word colour (composition.py KARAOKE_ACTIVE)
      "position": "top" | "middle" | "bottom",
  },
  "logo": {"full": str, "mono": str, "min_px": int},   # file paths or URLs as the kit holds them
  "easing": str,
  "motion": {"avg_shot_seconds": float, "pacing": str},
  "aspect_ratios": [str, ...],              # e.g. "9:16"
}

Only the tokens are exported. Facts, claims and copy rules never reach a renderer.
"""
from __future__ import annotations

from typing import Any, Dict, Union

from .schema import PALETTE_ROLES, BrandKit
from .validator import _as_kit


def export_tokens(kit: Union[BrandKit, Dict[str, Any]]) -> Dict[str, Any]:
    model = _as_kit(kit)
    colours: Dict[str, list] = {role: [] for role in PALETTE_ROLES}
    for swatch in sorted(model.visual.palette, key=lambda s: (-s.share, s.hex)):
        colours[swatch.role].append(swatch.hex)
    return {
        "kit_version": model.version,
        "colours": colours,
        "fonts": {"heading": model.visual.fonts.heading, "body": model.visual.fonts.body},
        "caption": {
            "font": model.captions.font,
            "text_colour": model.captions.text_colour,
            "highlight_colour": model.captions.highlight_colour,
            "position": model.captions.position,
        },
        "logo": {"full": model.visual.logo.full, "mono": model.visual.logo.mono, "min_px": model.visual.logo.min_px},
        "easing": model.motion.easing,
        "motion": {"avg_shot_seconds": model.motion.avg_shot_seconds, "pacing": model.motion.pacing},
        "aspect_ratios": list(model.aspect_ratios),
    }
