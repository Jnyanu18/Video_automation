"""Color palette extraction via dominant color clustering on extracted frames."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Dict, Any
from ..schemas.analysis import PaletteColor

log = logging.getLogger("reelforge.analysis.palette")

def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}".upper()

def extract_palette(frames: List[Path], k: int = 5) -> List[PaletteColor]:
    """Extract top dominant colors across sampled frames."""
    if not frames:
        return [
            PaletteColor(hex="#000000", rgb=[0, 0, 0], percentage=50.0),
            PaletteColor(hex="#FFFFFF", rgb=[255, 255, 255], percentage=50.0),
        ]

    try:
        from PIL import Image
    except ImportError:
        return [
            PaletteColor(hex="#000000", rgb=[0, 0, 0], percentage=50.0),
            PaletteColor(hex="#FFFFFF", rgb=[255, 255, 255], percentage=50.0),
        ]

    # Sample up to 10 frames evenly spaced
    step = max(1, len(frames) // 10)
    sampled = frames[::step][:10]

    color_counts: Dict[str, int] = {}
    total_pixels = 0

    for fpath in sampled:
        try:
            with Image.open(fpath) as img:
                img = img.convert("RGB")
                # Downsample to 64x64 for speed
                small = img.resize((64, 64))
                # Quantize to k colors
                quant = small.quantize(colors=k, method=Image.Quantize.FASTOCTREE)
                palette = quant.getpalette()[:k*3]
                counts = quant.getcolors()

                if not counts or not palette:
                    continue

                for count, idx in counts:
                    r = palette[idx * 3]
                    g = palette[idx * 3 + 1]
                    b = palette[idx * 3 + 2]
                    h = rgb_to_hex(r, g, b)
                    color_counts[h] = color_counts.get(h, 0) + count
                    total_pixels += count
        except Exception as e:
            log.warning("Failed analyzing palette from %s: %s", fpath, e)

    if not color_counts or total_pixels == 0:
        return [
            PaletteColor(hex="#000000", rgb=[0, 0, 0], percentage=50.0),
            PaletteColor(hex="#FFFFFF", rgb=[255, 255, 255], percentage=50.0),
        ]

    sorted_colors = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)[:k]
    result: List[PaletteColor] = []
    for h, cnt in sorted_colors:
        r = int(h[1:3], 16)
        g = int(h[3:5], 16)
        b = int(h[5:7], 16)
        pct = round((cnt / total_pixels) * 100, 1)
        result.append(PaletteColor(hex=h, rgb=[r, g, b], percentage=pct))

    return result
