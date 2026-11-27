from __future__ import annotations

import copy

from brand.card_tokens import to_card_tokens
from brand.schema import BrandKit

from .conftest import GOOD_KIT


def _kit(**changes):
    data = copy.deepcopy(GOOD_KIT)
    data.update(changes)
    return BrandKit.model_validate({**data, "owner": "acct"})


def test_colours_map_by_role_and_name_comes_through():
    tokens, _ = to_card_tokens(_kit())
    assert tokens["brandName"] == "Test Brand"
    assert set(tokens["colors"]) == {"bg", "ink", "accent", "muted"}
    palette = {s.role: s.hex for s in _kit().visual.palette}
    assert tokens["colors"]["bg"] == palette["background"]
    assert tokens["colors"]["ink"] == palette["text"]
    assert tokens["colors"]["accent"] == palette["primary"]


def test_unshipped_font_falls_back_to_geist_and_says_so():
    data = copy.deepcopy(GOOD_KIT)
    data["visual"]["fonts"]["heading"] = "Poppins"
    tokens, notes = to_card_tokens(BrandKit.model_validate({**data, "owner": "acct"}))
    assert tokens["fonts"]["display"]["family"] == "Geist"
    assert tokens["fonts"]["display"]["file"] == "Geist-Variable.woff2"
    assert any("Poppins" in n for n in notes)


def test_shipped_font_is_used_directly():
    data = copy.deepcopy(GOOD_KIT)
    data["visual"]["fonts"]["heading"] = "Geist"
    tokens, notes = to_card_tokens(BrandKit.model_validate({**data, "owner": "acct"}))
    assert tokens["fonts"]["display"] == {"family": "Geist", "file": "Geist-Variable.woff2"}
    assert not any("Geist" in n for n in notes)
