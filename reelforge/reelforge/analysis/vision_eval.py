"""Vision evaluation for qualitative style metrics (typography, layout, transitions)."""
from __future__ import annotations

import base64
import json
import logging
import os
from pathlib import Path
from typing import List, Optional
from ..schemas.analysis import VisionStyleMetrics

log = logging.getLogger("reelforge.analysis.vision_eval")

def evaluate_vision(frames: List[Path], api_key: Optional[str] = None, model: Optional[str] = None) -> VisionStyleMetrics:
    """Evaluate visual style from sampled frame images using Anthropic API."""
    key = api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not key or not frames:
        # Graceful fallback when running offline or without API key
        return VisionStyleMetrics(
            font_family_estimate="Inter",
            font_weight="bold",
            font_color_hex="#FFFFFF",
            highlight_color_hex="#FFDD00",
            caption_position="middle",
            transition_types=["hard_cut"],
            camera_motions=["punch_zoom"]
        )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        use_model = model or os.environ.get("REELFORGE_MODEL", "claude-3-7-sonnet-20250219")

        # Select up to 3 representative frames (e.g. beginning, middle, end)
        sample = [frames[0], frames[len(frames)//2], frames[-1]]
        image_contents = []

        for fpath in sample:
            data = base64.b64encode(fpath.read_bytes()).decode("utf-8")
            image_contents.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": data,
                }
            })

        prompt_text = (
            "Analyze these 3 frames from an Instagram/TikTok reel and extract visual editing style.\n"
            "Respond ONLY with valid JSON having these exact keys:\n"
            "{\n"
            '  "font_family_estimate": "Inter" or similar,\n'
            '  "font_weight": "bold" or "normal",\n'
            '  "font_color_hex": "#FFFFFF",\n'
            '  "highlight_color_hex": "#FFDD00",\n'
            '  "caption_position": "middle" or "bottom" or "top",\n'
            '  "transition_types": ["hard_cut", "whip_pan"],\n'
            '  "camera_motions": ["punch_zoom", "center"]\n'
            "}"
        )

        resp = client.messages.create(
            model=use_model,
            max_tokens=600,
            messages=[{
                "role": "user",
                "content": image_contents + [{"type": "text", "text": prompt_text}]
            }]
        )

        reply_text = resp.content[0].text.strip()
        if "```" in reply_text:
            reply_text = reply_text.split("```")[1]
            if reply_text.startswith("json"):
                reply_text = reply_text[4:]
        data = json.loads(reply_text.strip())
        return VisionStyleMetrics(**data)
    except Exception as e:
        log.warning("Vision evaluation fell back to default: %s", e)
        return VisionStyleMetrics()
