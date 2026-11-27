"""validate_kit: a valid kit passes, and each rule has a failing case with a readable message."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from brand.validator import validate_kit, validate_version_bump
from brand.schema import BrandKit

EXAMPLE_PATH = Path(__file__).resolve().parents[1] / "examples" / "ailo.draft.json"


def _errors_for(kit: dict) -> str:
    ok, errors = validate_kit(kit)
    assert not ok, "expected validation to fail"
    return "\n".join(errors)


def test_valid_kit_passes(good_kit):
    assert validate_kit(good_kit) == (True, [])


def test_example_draft_validates():
    data = json.loads(EXAMPLE_PATH.read_text(encoding="utf-8"))
    assert validate_kit(data) == (True, [])


def test_non_object_rejected():
    ok, errors = validate_kit(["not", "a", "dict"])
    assert not ok and "JSON object" in errors[0]


def test_unknown_field_rejected(good_kit):
    good_kit["voice"]["tone_of_voice"] = "friendly"
    msg = _errors_for(good_kit)
    assert "voice.tone_of_voice" in msg and "unknown field" in msg


@pytest.mark.parametrize("bad", ["#12345", "123456", "#GG0000", "#1234567", "red", ""])
def test_hex_must_be_six_digits(good_kit, bad):
    good_kit["visual"]["palette"][1]["hex"] = bad
    msg = _errors_for(good_kit)
    assert "six hex digits" in msg


def test_hex_is_normalised_to_upper_case(good_kit):
    good_kit["visual"]["palette"][0]["hex"] = "#1a73e8"
    ok, _ = validate_kit(good_kit)
    assert ok
    assert BrandKit.model_validate(good_kit).visual.palette[0].hex == "#1A73E8"


def test_palette_needs_exactly_one_primary(good_kit):
    good_kit["visual"]["palette"][1]["role"] = "primary"  # two primaries now
    assert "exactly one primary colour (found 2)" in _errors_for(good_kit)


def test_palette_with_no_primary_fails(good_kit):
    good_kit["visual"]["palette"][0]["role"] = "neutral"
    assert "exactly one primary colour (found 0)" in _errors_for(good_kit)


def test_palette_needs_exactly_one_text_colour(good_kit):
    good_kit["visual"]["palette"][3]["role"] = "neutral"  # zero text colours
    assert "exactly one text colour (found 0)" in _errors_for(good_kit)


def test_palette_shares_must_sum_to_one(good_kit):
    good_kit["visual"]["palette"][0]["share"] = 0.4  # sum 0.9
    assert "shares must sum to 1.0 within 0.01 (sum is 0.900)" in _errors_for(good_kit)


def test_palette_shares_within_tolerance_pass(good_kit):
    good_kit["visual"]["palette"][0]["share"] = 0.505  # sum 1.005
    assert validate_kit(good_kit) == (True, [])


def test_share_must_be_between_zero_and_one(good_kit):
    good_kit["visual"]["palette"][0]["share"] = 1.5
    assert "visual.palette.0.share" in _errors_for(good_kit)


@pytest.mark.parametrize("group,field,bad", [
    ("voice", "words_to_use", [""]),
    ("voice", "words_to_avoid", ["   "]),
    ("voice", "banned_claims", [""]),
    ("facts", "approved_claims", [" "]),
    ("facts", "expertise", [""]),
    ("ctas", None, [""]),
])
def test_words_and_claims_must_be_non_empty(good_kit, group, field, bad):
    if field is None:
        good_kit[group] = bad
    else:
        good_kit[group][field] = bad
    assert "at least 1 character" in _errors_for(good_kit)


@pytest.mark.parametrize("count", [1, 6])
def test_adjectives_need_two_to_five(good_kit, count):
    good_kit["voice"]["adjectives"] = [f"word{i}" for i in range(count)]
    assert "voice.adjectives" in _errors_for(good_kit)


def test_proof_point_needs_verified_flag(good_kit):
    del good_kit["facts"]["proof_points"][0]["verified"]
    assert "facts.proof_points.0.verified" in _errors_for(good_kit)


def test_version_must_be_positive(good_kit):
    good_kit["version"] = 0
    assert "version" in _errors_for(good_kit)


def test_status_must_be_draft_or_approved(good_kit):
    good_kit["status"]["voice"] = "published"
    assert "status.voice" in _errors_for(good_kit)


def test_bpm_min_cannot_exceed_bpm_max(good_kit):
    good_kit["music"]["bpm_min"] = 130
    assert "bpm_min (130) must not be above bpm_max (128)" in _errors_for(good_kit)


def test_caption_colours_must_be_palette_colours(good_kit):
    good_kit["captions"]["highlight_colour"] = "#00FF00"
    assert "captions.highlight_colour #00FF00 must be one of the palette colours" in _errors_for(good_kit)


def test_aspect_ratio_format(good_kit):
    good_kit["aspect_ratios"] = ["portrait"]
    assert "aspect ratio 'portrait' must look like 9:16" in _errors_for(good_kit)


def test_at_least_one_aspect_ratio(good_kit):
    good_kit["aspect_ratios"] = []
    assert "aspect_ratios" in _errors_for(good_kit)


def test_brand_name_required(good_kit):
    good_kit["brand"]["name"] = ""
    assert "brand.name" in _errors_for(good_kit)


def test_logo_min_px_must_be_positive(good_kit):
    good_kit["visual"]["logo"]["min_px"] = 0
    assert "visual.logo.min_px" in _errors_for(good_kit)


def test_approved_group_with_placeholder_note_fails(good_kit):
    good_kit["voice"]["note"] = "PLACEHOLDER: copied from a draft"
    assert "group 'voice' is marked approved but still holds placeholder values" in _errors_for(good_kit)


def test_draft_group_with_placeholder_note_passes(good_kit):
    good_kit["voice"]["note"] = "PLACEHOLDER: still to check"
    good_kit["status"]["voice"] = "draft"
    assert validate_kit(good_kit) == (True, [])


def test_version_bump_must_increase():
    assert validate_version_bump(3, 4) == []
    assert "must increase" in validate_version_bump(3, 3)[0]
    assert "must increase" in validate_version_bump(3, 2)[0]


def test_approved_group_with_nested_placeholder_is_rejected(good_kit):
    from brand.validator import validate_kit
    good_kit["status"]["visual"] = "approved"
    good_kit["visual"]["fonts"]["heading"] = "PLACEHOLDER - heading font"
    ok, errors = validate_kit(good_kit)
    assert not ok
    assert any("'visual' is marked approved but still holds placeholder values" in e for e in errors)


def test_draft_group_with_placeholder_is_allowed(good_kit):
    from brand.validator import validate_kit
    good_kit["status"]["visual"] = "draft"
    good_kit["visual"]["fonts"]["heading"] = "PLACEHOLDER - heading font"
    ok, _ = validate_kit(good_kit)
    assert ok
