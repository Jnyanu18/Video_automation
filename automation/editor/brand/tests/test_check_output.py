"""check_output: banned words and claims, off-palette colours, fonts, logo, CTA and aspect checks."""
from __future__ import annotations

import pytest

from brand.validator import Failure, check_output


def _codes(failures):
    return sorted(f.code for f in failures)


def test_clean_output_passes(good_kit, good_output):
    assert check_output(good_kit, good_output) == []


def test_failures_are_objects_with_code_and_message(good_kit, good_output):
    good_output["has_logo"] = False
    (failure,) = check_output(good_kit, good_output)
    assert isinstance(failure, Failure)
    assert failure.code == "logo_missing" and "logo" in failure.message


@pytest.mark.parametrize("line", ["This is CHEAP software.", "a Revolutionary idea", "so cheap!"])
def test_banned_word_caught_case_insensitively(good_kit, good_output, line):
    good_output["text"] = [line]
    assert _codes(check_output(good_kit, good_output)) == ["banned_word"]


def test_banned_word_is_whole_word_only(good_kit, good_output):
    good_kit["voice"]["words_to_avoid"] = ["cheap"]
    good_output["text"] = ["Cheapest prices, no cheapskates."]
    assert check_output(good_kit, good_output) == []


def test_banned_claim_phrase_caught(good_kit, good_output):
    good_output["text"] = ["We offer GUARANTEED   results, every time."]
    failures = check_output(good_kit, good_output)
    assert _codes(failures) == ["banned_claim"]
    assert "guaranteed results" in failures[0].message


def test_banned_word_reported_once_even_if_repeated(good_kit, good_output):
    good_output["text"] = ["cheap", "cheap and cheap"]
    assert _codes(check_output(good_kit, good_output)) == ["banned_word"]


def test_off_palette_colour_caught(good_kit, good_output):
    good_output["colours_used"] = ["#1A73E8", "#123456"]
    failures = check_output(good_kit, good_output)
    assert _codes(failures) == ["off_palette_colour"]
    assert "#123456" in failures[0].message


def test_palette_colour_matches_regardless_of_case(good_kit, good_output):
    good_output["colours_used"] = ["#ff8800"]
    assert check_output(good_kit, good_output) == []


def test_unknown_font_caught(good_kit, good_output):
    good_output["fonts_used"] = ["Test Sans", "Comic Relief"]
    failures = check_output(good_kit, good_output)
    assert _codes(failures) == ["unknown_font"]
    assert "Comic Relief" in failures[0].message


def test_caption_font_counts_as_kit_font(good_kit, good_output):
    good_kit["captions"]["font"] = "Caption Face"
    good_output["fonts_used"] = ["Caption Face"]
    assert check_output(good_kit, good_output) == []


def test_missing_logo_caught_by_default(good_kit, good_output):
    good_output["has_logo"] = False
    assert _codes(check_output(good_kit, good_output)) == ["logo_missing"]


def test_missing_logo_allowed_when_not_required(good_kit, good_output):
    good_output["has_logo"] = False
    assert check_output(good_kit, good_output, logo_required=False) == []


def test_unapproved_cta_caught(good_kit, good_output):
    good_output["cta"] = "Buy now"
    failures = check_output(good_kit, good_output)
    assert _codes(failures) == ["unapproved_cta"]


def test_approved_cta_matches_regardless_of_case(good_kit, good_output):
    good_output["cta"] = "learn MORE"
    assert check_output(good_kit, good_output) == []


def test_empty_cta_means_no_cta(good_kit, good_output):
    good_output["cta"] = ""
    assert check_output(good_kit, good_output) == []


def test_unapproved_aspect_caught(good_kit, good_output):
    good_output["aspect"] = "1:1"
    assert _codes(check_output(good_kit, good_output)) == ["unapproved_aspect"]


def test_all_failures_returned_together(good_kit, good_output):
    good_output.update(text=["cheap"], colours_used=["#000001"], fonts_used=["Nope"],
                       has_logo=False, cta="Buy", aspect="1:1")
    assert _codes(check_output(good_kit, good_output)) == [
        "banned_word", "logo_missing", "off_palette_colour", "unapproved_aspect", "unapproved_cta", "unknown_font",
    ]


def test_malformed_output_raises(good_kit, good_output):
    del good_output["duration_s"]
    with pytest.raises(ValueError, match="missing keys: duration_s"):
        check_output(good_kit, good_output)


def test_invalid_kit_raises(good_kit, good_output):
    good_kit["visual"]["palette"] = []
    with pytest.raises(ValueError, match="invalid brand kit"):
        check_output(good_kit, good_output)


def test_logo_needed_by_kind():
    from brand.validator import logo_needed
    assert logo_needed("final_video") is True
    assert logo_needed("end_card") is True
    assert logo_needed("preview") is False
    assert logo_needed("copy") is False
    assert logo_needed("image") is False
    assert logo_needed(None) is True  # no kind keeps the strict default
    with pytest.raises(ValueError, match="kind must be one of"):
        logo_needed("poster")


def test_check_output_uses_kind_for_logo(good_kit):
    from brand.validator import check_output
    out = {"text": ["Hello"], "colours_used": [], "fonts_used": [], "has_logo": False,
           "cta": "", "duration_s": 10.0, "aspect": "9:16"}
    assert not any(f.code == "logo_missing" for f in check_output(good_kit, out, kind="copy"))
    assert any(f.code == "logo_missing" for f in check_output(good_kit, out, kind="final_video"))
    assert not any(f.code == "logo_missing" for f in check_output(good_kit, out, kind="final_video", logo_required=False))
