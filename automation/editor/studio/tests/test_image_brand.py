"""Brand rules on image generation: banned words refused, palette and style added to the prompt, damaged kit fails closed.

Uses FakeProvider and the real AILO example kit. No network, no API key.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from brand import image_brief  # noqa: E402
from studio.images import FakeProvider, register_image_routes  # noqa: E402

EXAMPLE = Path(__file__).resolve().parents[2] / "brand" / "examples" / "ailo.draft.json"
OWNER = "alice"


def example_kit() -> dict:
    data = json.loads(EXAMPLE.read_text(encoding="utf-8"))
    data["owner"] = OWNER
    return data


def real_kit() -> dict:
    """The AILO example with real banned terms (the draft itself only holds placeholders)."""
    data = example_kit()
    data["voice"]["words_to_avoid"] = ["cheap"]
    data["voice"]["banned_claims"] = ["guaranteed results"]
    data["visual"]["imagery"] = "warm natural light, real farm photography"
    return data


def save_kit(work_dir: Path, data: dict) -> None:
    (work_dir / "brand").mkdir(parents=True, exist_ok=True)
    (work_dir / "brand" / "kit.json").write_text(json.dumps(data), encoding="utf-8")


def client_for(work_dir: Path) -> TestClient:
    app = FastAPI()

    @app.exception_handler(HTTPException)
    async def _http_error(_request, exc: HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"ok": False, "message": str(exc.detail)})

    register_image_routes(app, OWNER, work_dir, provider_factory=lambda: FakeProvider())
    return TestClient(app)


# ---- banned words -------------------------------------------------------------------------------

def test_banned_word_matches_whole_words_case_insensitively():
    kit = {"voice": {"words_to_avoid": ["cheap"], "banned_claims": []}}
    assert image_brief.find_banned("A CHEAP looking poster", kit) == ["cheap"]
    assert image_brief.find_banned("the cheapest poster", kit) == []  # not a substring match


def test_banned_claims_are_checked_too():
    kit = {"voice": {"words_to_avoid": [], "banned_claims": ["guaranteed results"]}}
    assert image_brief.find_banned("Guaranteed results in a week", kit) == ["guaranteed results"]


def test_no_banned_terms_means_no_hits():
    assert image_brief.find_banned("a calm river at dawn", example_kit()) == []


# ---- the composed prompt -----------------------------------------------------------------------

def test_compose_adds_style_palette_and_avoid_list():
    kit = real_kit()
    out = image_brief.compose("a farm at sunrise", kit)
    assert out.startswith("a farm at sunrise")
    assert "Visual style:" in out
    assert "primary #FF8A4C" in out
    assert "accent #FFB088" in out
    assert "Avoid showing or implying:" in out


def test_apply_without_kit_passes_the_prompt_through():
    assert image_brief.apply("a farm at sunrise", None) == {"provider_prompt": "a farm at sunrise", "brand": None}


def test_summary_records_what_was_applied():
    s = image_brief.summary(real_kit())
    assert s["kit_version"] == real_kit()["version"]
    assert {"role": "primary", "hex": "#FF8A4C"} in s["palette"]
    assert s["imagery"] == "warm natural light, real farm photography"


# ---- the route ---------------------------------------------------------------------------------

def test_route_refuses_a_banned_word_before_calling_the_provider(tmp_path):
    term = "cheap"
    save_kit(tmp_path, real_kit())
    res = client_for(tmp_path).post("/api/editor/images", json={"prompt": f"a {term} advert"})
    assert res.status_code == 400
    assert term in res.json()["message"]


def test_route_applies_the_kit_and_keeps_the_users_prompt(tmp_path):
    save_kit(tmp_path, example_kit())
    res = client_for(tmp_path).post("/api/editor/images", json={"prompt": "a farm at sunrise, wide shot"})
    assert res.status_code == 202
    job = res.json()["data"]
    assert job["prompt"] == "a farm at sunrise, wide shot"
    assert "primary #FF8A4C" in job["provider_prompt"]
    assert job["brand"]["kit_version"] == example_kit()["version"]


def test_route_without_a_kit_is_unchanged(tmp_path):
    res = client_for(tmp_path).post("/api/editor/images", json={"prompt": "a farm at sunrise, wide shot"})
    assert res.status_code == 202
    job = res.json()["data"]
    assert job["provider_prompt"] == job["prompt"]
    assert job["brand"] is None


def test_damaged_kit_fails_closed(tmp_path):
    (tmp_path / "brand").mkdir()
    (tmp_path / "brand" / "kit.json").write_text("{not json", encoding="utf-8")
    res = client_for(tmp_path).post("/api/editor/images", json={"prompt": "a farm at sunrise, wide shot"})
    assert res.status_code == 409
    assert "paused" in res.json()["message"]


def test_another_owners_kit_is_not_applied(tmp_path):
    data = example_kit()
    data["owner"] = "someone-else"
    save_kit(tmp_path, data)
    res = client_for(tmp_path).post("/api/editor/images", json={"prompt": "a farm at sunrise, wide shot"})
    assert res.status_code == 202
    assert res.json()["data"]["brand"] is None


def test_placeholder_terms_in_a_draft_kit_are_not_rules():
    kit = example_kit()  # the AILO draft: its banned lists hold only PLACEHOLDER text
    assert image_brief.find_banned("a calm river at dawn", kit) == []
    out = image_brief.compose("a calm river at dawn", kit)
    assert "PLACEHOLDER" not in out
    assert "Avoid showing" not in out
