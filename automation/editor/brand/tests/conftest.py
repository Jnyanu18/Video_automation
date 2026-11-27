"""Shared fixtures. The kit here is made-up test data, never AILO's brand."""
from __future__ import annotations

import copy
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

EXAMPLE_PATH = Path(__file__).resolve().parents[1] / "examples" / "ailo.draft.json"

GOOD_KIT = {
    "brand": {"name": "Test Brand", "legal_name": "Test Brand Pty Ltd",
              "one_liner": "Testing things well.", "tagline": "Test it right."},
    "facts": {
        "history": "Founded in a test lab.",
        "mission": "Make tests clear.",
        "expertise": ["unit testing", "fixtures"],
        "proof_points": [
            {"text": "Ran 1000 tests in CI", "verified": True, "source": "CI log"},
            {"text": "Won an industry award", "verified": False},
        ],
        "approved_claims": ["Tests run in under a minute."],
    },
    "voice": {
        "adjectives": ["clear", "warm"],
        "words_to_use": ["simple"],
        "words_to_avoid": ["cheap", "revolutionary"],
        "banned_claims": ["guaranteed results"],
    },
    "visual": {
        "palette": [
            {"hex": "#1A73E8", "role": "primary", "share": 0.5},
            {"hex": "#FF8800", "role": "accent", "share": 0.2},
            {"hex": "#FFFFFF", "role": "background", "share": 0.2},
            {"hex": "#111111", "role": "text", "share": 0.1},
        ],
        "fonts": {"heading": "Test Sans", "body": "Test Serif"},
        "logo": {"full": "logo/full.svg", "mono": "logo/mono.svg", "min_px": 96},
        "imagery": "Bright, uncluttered photography.",
        "reference_images": ["refs/one.jpg"],
    },
    "motion": {"easing": "power2.out", "avg_shot_seconds": 2.0, "pacing": "fast cuts"},
    "captions": {"font": "Test Sans", "text_colour": "#111111", "highlight_colour": "#FF8800", "position": "bottom"},
    "music": {"mood": "upbeat", "bpm_min": 110, "bpm_max": 128, "licensed": True},
    "ctas": ["Book a demo", "Learn more"],
    "aspect_ratios": ["9:16", "16:9"],
    "status": {g: "approved" for g in ("brand", "facts", "voice", "visual", "motion", "captions", "music", "ctas", "aspect_ratios")},
    "version": 1,
    "updated_at": "2026-11-01T00:00:00+00:00",
    "owner": "acct-test-1",
}


@pytest.fixture
def good_kit() -> dict:
    """A fresh, valid, fully approved kit dict. Tests mutate their own copy."""
    return copy.deepcopy(GOOD_KIT)


@pytest.fixture
def good_output() -> dict:
    return {
        "text": ["Tests run in under a minute.", "Book a demo today."],
        "colours_used": ["#1a73e8", "#111111"],
        "fonts_used": ["Test Sans"],
        "has_logo": True,
        "cta": "Book a demo",
        "duration_s": 12.0,
        "aspect": "9:16",
    }
