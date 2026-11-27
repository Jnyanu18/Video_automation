"""export_tokens shape, and store: version bump, round trip, owner checks, atomic write, refusal of invalid kits."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from brand.schema import BrandKit
from brand.store import BrandError, KIT_FILE, kit_path, load_kit, save_kit
from brand.tokens import export_tokens
from brand.tests.conftest import EXAMPLE_PATH


# ---------------------------------------------------------------- tokens
def test_tokens_shape(good_kit):
    tokens = export_tokens(good_kit)
    assert set(tokens) == {"kit_version", "colours", "fonts", "caption", "logo", "easing", "motion", "aspect_ratios"}
    assert tokens["kit_version"] == 1
    assert set(tokens["colours"]) == {"primary", "accent", "background", "text", "neutral"}
    assert tokens["colours"]["neutral"] == []
    assert tokens["colours"]["primary"] == ["#1A73E8"]
    assert set(tokens["caption"]) == {"font", "text_colour", "highlight_colour", "position"}
    assert set(tokens["logo"]) == {"full", "mono", "min_px"}
    assert tokens["easing"] == "power2.out"
    assert tokens["aspect_ratios"] == ["9:16", "16:9"]


def test_tokens_hold_no_facts_or_copy_rules(good_kit):
    dumped = json.dumps(export_tokens(good_kit))
    for private in ("Ran 1000 tests", "Won an industry award", "guaranteed results", "Book a demo", "Founded in a test lab"):
        assert private not in dumped


def test_tokens_colours_sorted_by_share_within_role(good_kit):
    good_kit["visual"]["palette"].append({"hex": "#00AA00", "role": "accent", "share": 0.0})
    good_kit["visual"]["palette"].append({"hex": "#0000AA", "role": "accent", "share": 0.0})
    accent = export_tokens(good_kit)["colours"]["accent"]
    assert accent == ["#FF8800", "#0000AA", "#00AA00"]


def test_tokens_accept_a_brandkit(good_kit):
    assert export_tokens(BrandKit.model_validate(good_kit)) == export_tokens(good_kit)


def test_tokens_are_json_serialisable(good_kit):
    json.dumps(export_tokens(good_kit))


# ---------------------------------------------------------------- store
def test_save_bumps_version(tmp_path, good_kit):
    first = save_kit(tmp_path, good_kit, "acct-1")
    assert first.version == 1
    second = save_kit(tmp_path, good_kit, "acct-1")
    third = save_kit(tmp_path, first.model_dump(), "acct-1")
    assert (second.version, third.version) == (2, 3)


def test_save_ignores_incoming_version(tmp_path, good_kit):
    good_kit["version"] = 99
    save_kit(tmp_path, good_kit, "acct-1")
    assert save_kit(tmp_path, good_kit, "acct-1").version == 2


def test_save_sets_owner_and_timestamp(tmp_path, good_kit):
    stored = save_kit(tmp_path, good_kit, "acct-1")
    assert stored.owner == "acct-1"
    assert stored.updated_at and "T" in stored.updated_at


def test_round_trip(tmp_path, good_kit):
    saved = save_kit(tmp_path, good_kit, "acct-1")
    loaded = load_kit(tmp_path, "acct-1")
    assert loaded == saved


def test_load_missing_returns_none(tmp_path):
    assert load_kit(tmp_path, "acct-1") is None


def test_load_for_other_owner_returns_none(tmp_path, good_kit):
    save_kit(tmp_path, good_kit, "acct-1")
    assert load_kit(tmp_path, "acct-2") is None
    assert load_kit(tmp_path, "") is None


def test_save_refused_for_other_owner(tmp_path, good_kit):
    save_kit(tmp_path, good_kit, "acct-1")
    with pytest.raises(BrandError, match="another account"):
        save_kit(tmp_path, good_kit, "acct-2")
    assert load_kit(tmp_path, "acct-1").version == 1


def test_save_requires_owner(tmp_path, good_kit):
    with pytest.raises(BrandError, match="owner id is required"):
        save_kit(tmp_path, good_kit, "  ")


def test_expected_version_conflict(tmp_path, good_kit):
    save_kit(tmp_path, good_kit, "acct-1")
    with pytest.raises(BrandError, match="changed since you loaded it"):
        save_kit(tmp_path, good_kit, "acct-1", expected_version=0)
    assert save_kit(tmp_path, good_kit, "acct-1", expected_version=1).version == 2


def test_invalid_kit_is_not_written(tmp_path, good_kit):
    good_kit["visual"]["palette"][0]["hex"] = "#12345"
    with pytest.raises(BrandError, match="six hex digits"):
        save_kit(tmp_path, good_kit, "acct-1")
    assert not kit_path(tmp_path).exists()


def test_corrupt_file_raises_and_is_not_overwritten(tmp_path, good_kit):
    path = kit_path(tmp_path)
    path.parent.mkdir(parents=True)
    path.write_text("{not json", encoding="utf-8")
    with pytest.raises(BrandError, match="cannot be read"):
        save_kit(tmp_path, good_kit, "acct-1")
    assert path.read_text(encoding="utf-8") == "{not json"


def test_no_temp_files_left_behind(tmp_path, good_kit):
    save_kit(tmp_path, good_kit, "acct-1")
    names = sorted(p.name for p in kit_path(tmp_path).parent.iterdir())
    assert names == [KIT_FILE]


def test_kit_lives_under_brand_folder(tmp_path, good_kit):
    save_kit(tmp_path, good_kit, "acct-1")
    assert kit_path(tmp_path) == Path(tmp_path) / "brand" / "kit.json"
    assert kit_path(tmp_path).is_file()


def test_example_draft_can_be_saved_as_draft(tmp_path):
    data = json.loads(EXAMPLE_PATH.read_text(encoding="utf-8"))
    data["owner"] = "acct-example"
    stored = save_kit(tmp_path, data, "acct-example")
    assert stored.version == 1
    assert all(getattr(stored.status, g) == "draft" for g in ("brand", "facts", "voice"))
