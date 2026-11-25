"""Caption styles as data. Renderers (services/render, Hyperframes) read these by name."""
from __future__ import annotations

CAPTION_STYLES: dict[str, dict] = {
    "bold-pop": {
        "description": "Big bold uppercase text, centered, white with thick outline; words pop in with a scale bounce.",
        "font": {"family": "Montserrat, Arial Black, sans-serif", "weight": 900, "size_pct": 7.0, "uppercase": True},
        "color": "#FFFFFF", "highlight_color": "#FFE600", "stroke": {"color": "#000000", "width_pct": 0.5},
        "background": None, "position": {"anchor": "center", "y_pct": 62}, "max_words": 3,
        "animation": {"in": "pop", "duration": 0.15, "per_word": False},
    },
    "clean-lower": {
        "description": "Understated sentence-case subtitle at the lower third with a soft shadow.",
        "font": {"family": "Inter, Helvetica, sans-serif", "weight": 600, "size_pct": 4.2, "uppercase": False},
        "color": "#FFFFFF", "highlight_color": None, "stroke": None, "shadow": "0 2px 12px rgba(0,0,0,.8)",
        "background": None, "position": {"anchor": "bottom", "y_pct": 86}, "max_words": 8,
        "animation": {"in": "fade", "duration": 0.12, "per_word": False},
    },
    "karaoke": {
        "description": "Words highlight one by one as spoken (needs word timings; falls back to whole-caption).",
        "font": {"family": "Poppins, Arial, sans-serif", "weight": 800, "size_pct": 5.5, "uppercase": False},
        "color": "#FFFFFF", "highlight_color": "#00E5FF", "stroke": {"color": "#000000", "width_pct": 0.35},
        "background": None, "position": {"anchor": "center", "y_pct": 70}, "max_words": 5,
        "animation": {"in": "none", "duration": 0.0, "per_word": True},
    },
    "boxed": {
        "description": "Dark rounded box behind white text, bottom center. High legibility on busy footage.",
        "font": {"family": "Inter, Helvetica, sans-serif", "weight": 700, "size_pct": 4.5, "uppercase": False},
        "color": "#FFFFFF", "highlight_color": None, "stroke": None,
        "background": {"color": "rgba(0,0,0,0.65)", "radius_pct": 1.2, "padding_pct": 1.5},
        "position": {"anchor": "bottom", "y_pct": 84}, "max_words": 7,
        "animation": {"in": "slide-up", "duration": 0.15, "per_word": False},
    },
}

DEFAULT_STYLE = "bold-pop"


def get_style(name: str) -> dict:
    if name not in CAPTION_STYLES:
        raise KeyError(f"unknown caption style {name!r}; available: {sorted(CAPTION_STYLES)}")
    return CAPTION_STYLES[name]
