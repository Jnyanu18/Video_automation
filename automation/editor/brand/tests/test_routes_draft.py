"""Drafting step and HTTP routes. No real model is called: the client is a fake that returns a canned reply."""
from __future__ import annotations

import copy
import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from brand.draft import draft_kit
from brand.routes import register_brand_routes

from .conftest import GOOD_KIT


class FakeClient:
    def __init__(self, reply_text: str = "", raise_error: bool = False):
        self.reply_text = reply_text
        self.raise_error = raise_error
        self.calls = 0

        class _Messages:
            def create(inner, **kwargs):  # noqa: N805
                self.calls += 1
                if self.raise_error:
                    raise RuntimeError("provider down")
                return {"content": [{"type": "text", "text": self.reply_text}]}

        self.messages = _Messages()


def _reply_for(kit: dict) -> str:
    return "Here is the draft:\n" + json.dumps(kit)


def test_no_client_means_no_draft():
    kit, problems = draft_kit(None, "some text", "https://example.test", "acct")
    assert kit is None
    assert "no LLM client" in problems[0]


def test_empty_source_means_no_draft():
    kit, problems = draft_kit(FakeClient(), "   ", "https://example.test", "acct")
    assert kit is None and problems == ["the source text is empty"]


def test_model_failure_is_reported_not_invented():
    kit, problems = draft_kit(FakeClient(raise_error=True), "text", "https://example.test", "acct")
    assert kit is None
    assert problems == ["the model call failed: RuntimeError"]


def test_reply_without_json_is_refused():
    kit, problems = draft_kit(FakeClient("no json here"), "text", "https://example.test", "acct")
    assert kit is None and "did not contain a JSON object" in problems[0]


def test_draft_is_forced_to_draft_and_unverified():
    raw = copy.deepcopy(GOOD_KIT)
    raw["status"] = {k: "approved" for k in raw["status"]}
    raw["facts"]["proof_points"][0]["verified"] = True
    raw["facts"]["approved_claims"] = ["Model says this is approved."]
    kit, problems = draft_kit(FakeClient(_reply_for(raw)), "source text", "https://example.test", "acct")
    assert problems == []
    assert set(kit["status"].values()) == {"draft"}
    assert all(p["verified"] is False for p in kit["facts"]["proof_points"])
    assert kit["facts"]["approved_claims"] == []
    assert kit["version"] == 1
    assert kit["owner"] == "acct"


def test_invalid_draft_is_refused_with_reasons():
    raw = copy.deepcopy(GOOD_KIT)
    raw["visual"]["palette"] = []  # breaks the palette rules
    kit, problems = draft_kit(FakeClient(_reply_for(raw)), "source text", "https://example.test", "acct")
    assert kit is None
    assert problems


@pytest.fixture
def api(tmp_path):
    app = FastAPI()
    client_holder = {"client": None}
    register_brand_routes(app, "acct", tmp_path, lambda: client_holder["client"])
    return TestClient(app), client_holder, tmp_path


def _kit_body():
    body = copy.deepcopy(GOOD_KIT)
    body.pop("owner", None)
    return body


def test_get_brand_is_null_before_save(api):
    client, _, _ = api
    assert client.get("/api/editor/brand").json() == {"ok": True, "kit": None}


def test_put_then_get_round_trip(api):
    client, _, _ = api
    resp = client.put("/api/editor/brand", json=_kit_body())
    assert resp.status_code == 200, resp.text
    assert resp.json()["kit"]["owner"] == "acct"
    assert client.get("/api/editor/brand").json()["kit"]["brand"]["name"] == "Test Brand"


def test_put_invalid_kit_is_400(api):
    client, _, _ = api
    body = _kit_body()
    body["visual"]["palette"] = []
    resp = client.put("/api/editor/brand", json=body)
    assert resp.status_code == 400
    assert resp.json()["detail"]["error"] == "INVALID_KIT"


def test_put_with_stale_expected_version_is_409(api):
    client, _, _ = api
    client.put("/api/editor/brand", json=_kit_body())
    resp = client.put("/api/editor/brand?expected_version=99", json=_kit_body())
    assert resp.status_code == 409


def test_draft_route_saves_nothing(api):
    client, holder, _ = api
    holder["client"] = FakeClient(_reply_for(copy.deepcopy(GOOD_KIT)))
    resp = client.post("/api/editor/brand/draft", json={"source_url": "https://example.test", "source_text": "About us"})
    body = resp.json()
    assert body["ok"] is True
    assert "Nothing is saved" in body["note"]
    assert client.get("/api/editor/brand").json()["kit"] is None


def test_brief_route_defaults_to_live_and_rejects_bad_purpose(api):
    client, _, _ = api
    client.put("/api/editor/brand", json=_kit_body())
    resp = client.get("/api/editor/brand/brief?purpose=copy")
    assert resp.status_code == 200
    assert "BRAND BRIEF (copy, live)" in resp.json()["brief"]
    assert client.get("/api/editor/brand/brief?purpose=poster").status_code == 400
    assert client.get("/api/editor/brand/brief?purpose=copy&mode=final").status_code == 400


def test_check_route_reports_failures_and_logo_rule(api):
    client, _, _ = api
    client.put("/api/editor/brand", json=_kit_body())
    output = {"text": ["plain text"], "colours_used": [], "fonts_used": [], "has_logo": False,
              "cta": "", "duration_s": 10.0, "aspect": "9:16"}
    copy_ok = client.post("/api/editor/brand/check", json={"kind": "copy", "output": output}).json()
    assert copy_ok["ok"] is True
    final = client.post("/api/editor/brand/check", json={"kind": "final_video", "output": output}).json()
    assert final["ok"] is False
    assert any(f["code"] == "logo_missing" for f in final["failures"])
    assert client.post("/api/editor/brand/check", json={"kind": "poster", "output": output}).status_code == 400
