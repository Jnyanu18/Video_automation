"""Map a brand kit to the token shape the title and end cards read (services/render/combine.py render_cards).

Card shape: {brandName, colors{bg, ink, accent, muted}, fonts{display{family,file}, mono{family,file}}, logo?}.
Font files must exist in packages/motion-kit/public. The motion kit ships Geist only. A brand font without a file there
falls back to Geist, and the mapping says so in notes, so nothing is silently wrong.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

from .schema import BrandKit

SHIPPED_FONTS = {"geist": "Geist-Variable.woff2", "geist mono": "GeistMono-Variable.woff2"}


def _first(kit: BrandKit, role: str, fallback: str) -> str:
    for s in kit.visual.palette:
        if s.role == role:
            return s.hex
    return fallback


def _font(family: str) -> Tuple[Dict[str, str], str]:
    key = family.strip().casefold()
    if key in SHIPPED_FONTS:
        return {"family": family.strip(), "file": SHIPPED_FONTS[key]}, ""
    return {"family": "Geist", "file": SHIPPED_FONTS["geist"]}, (
        f"brand font '{family}' has no font file in motion-kit/public; the card uses Geist instead"
    )


def to_card_tokens(kit: BrandKit) -> Tuple[Dict[str, Any], List[str]]:
    """Return (tokens, notes). notes explain every substitution."""
    notes: List[str] = []
    display, note = _font(kit.visual.fonts.heading)
    if note:
        notes.append(note)
    mono, note = _font("Geist Mono")
    tokens = {
        "brandName": kit.brand.name,
        "colors": {
            "bg": _first(kit, "background", "#000000"),
            "ink": _first(kit, "text", "#FFFFFF"),
            "accent": _first(kit, "primary", "#FF8A4C"),
            "muted": _first(kit, "neutral", "#FFD4B8"),
        },
        "fonts": {"display": display, "mono": mono},
    }
    if kit.visual.logo.full.startswith(("http://", "https://")):
        notes.append("logo is a web address; the card needs a local file, so it is not used")
    return tokens, notes
