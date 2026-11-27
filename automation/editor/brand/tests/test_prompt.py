"""compile_brand_brief: deterministic, budgeted, only approved and verified facts, rules always present."""
from __future__ import annotations

import copy

import pytest

from brand.prompt import PURPOSES, TOKEN_BUDGET, compile_brand_brief


def test_every_purpose_compiles(good_kit):
    for purpose in PURPOSES:
        text = compile_brand_brief(good_kit, purpose)
        assert text.startswith(f"BRAND BRIEF ({purpose}, live)")
        assert "Do not invent anything" in text


def test_unknown_purpose_rejected(good_kit):
    with pytest.raises(ValueError, match="purpose must be one of"):
        compile_brand_brief(good_kit, "poster")


def test_output_is_deterministic(good_kit):
    first = compile_brand_brief(good_kit, "copy")
    assert compile_brand_brief(good_kit, "copy") == first


def test_output_ignores_key_order(good_kit):
    reordered = {k: good_kit[k] for k in reversed(list(good_kit))}
    reordered["visual"]["palette"] = list(reversed(good_kit["visual"]["palette"]))
    assert compile_brand_brief(reordered, "motion_brief") == compile_brand_brief(good_kit, "motion_brief")


def test_no_timestamps_in_output(good_kit):
    text = compile_brand_brief(good_kit, "copy")
    assert good_kit["updated_at"] not in text
    assert "2026-11-01" not in text


def test_unverified_proof_point_never_appears(good_kit):
    for purpose in PURPOSES:
        assert "Won an industry award" not in compile_brand_brief(good_kit, purpose)


def test_verified_proof_point_appears_when_facts_approved(good_kit):
    text = compile_brand_brief(good_kit, "copy")
    assert "verified proof points: Ran 1000 tests in CI" in text
    assert "approved claims: Tests run in under a minute." in text


def test_facts_withheld_while_facts_group_is_draft(good_kit):
    good_kit["status"]["facts"] = "draft"
    text = compile_brand_brief(good_kit, "copy")
    assert "NOT APPROVED (do not use these sections yet): facts" in text
    assert "FACTS (approved" not in text
    assert "Ran 1000 tests in CI" not in text
    assert "Founded in a test lab." not in text


def test_live_brief_skips_every_draft_group(good_kit):
    good_kit["status"]["voice"] = "draft"
    text = compile_brand_brief(good_kit, "copy", mode="live")
    assert "NOT APPROVED (do not use these sections yet): voice" in text
    assert "DRAFT - preview only" not in text


def test_preview_brief_includes_draft_groups_and_is_marked(good_kit):
    good_kit["status"]["facts"] = "draft"
    text = compile_brand_brief(good_kit, "copy", mode="preview")
    assert "BRAND BRIEF (copy, preview)" in text
    assert "DRAFT - preview only. Do not publish this output as final." in text
    # Facts never come from a draft group, even in preview: the facts section is still withheld.
    assert "No facts are approved yet" in text
    assert "Ran 1000 tests in CI" not in text
    assert "NOT APPROVED" not in text


def test_banned_words_always_present_even_in_live_mode(good_kit):
    good_kit["status"]["voice"] = "draft"
    text = compile_brand_brief(good_kit, "copy", mode="live")
    assert "never use these words" in text


def test_unknown_mode_rejected(good_kit):
    with pytest.raises(ValueError, match="mode must be one of"):
        compile_brand_brief(good_kit, "copy", mode="final")


def test_copy_brief_has_facts_voice_and_ctas(good_kit):
    text = compile_brand_brief(good_kit, "copy")
    for heading in ("FACTS", "VOICE", "CALLS TO ACTION"):
        assert heading in text
    assert "- Book a demo" in text


def test_edit_plan_has_motion_and_captions_not_facts(good_kit):
    text = compile_brand_brief(good_kit, "edit_plan")
    assert "MOTION" in text and "CAPTIONS" in text
    assert "FACTS" not in text


def test_image_prompt_has_palette_not_ctas(good_kit):
    text = compile_brand_brief(good_kit, "image_prompt")
    assert "primary colour #1A73E8" in text
    assert "CALLS TO ACTION" not in text


def test_palette_sorted_by_role_then_hex(good_kit):
    text = compile_brand_brief(good_kit, "image_prompt")
    lines = [line for line in text.splitlines() if " colour #" in line]
    roles = [line.split(" colour ")[0].lstrip("- ") for line in lines]
    assert roles == ["primary", "accent", "background", "text"]


def test_banned_words_and_claims_always_listed(good_kit):
    for purpose in PURPOSES:
        text = compile_brand_brief(good_kit, purpose)
        assert "never use these words: cheap; revolutionary" in text
        assert "never make these claims: guaranteed results" in text


def test_brief_fits_token_budget(good_kit):
    for purpose in PURPOSES:
        assert len(compile_brand_brief(good_kit, purpose)) // 4 <= TOKEN_BUDGET


def test_oversized_kit_is_refused_not_truncated(good_kit):
    big = copy.deepcopy(good_kit)
    big["voice"]["words_to_use"] = [f"word number {i} with some padding text" for i in range(400)]
    with pytest.raises(ValueError, match="over the 1500-token budget"):
        compile_brand_brief(big, "copy")
