"""Image generation lane: validation, the job round trip, account isolation and the Gemini adapter.

Everything runs against FakeProvider or a fake HTTP opener. No network, no API key.
"""
from __future__ import annotations

import base64
import io
import json
import sys
import time
import urllib.error
from pathlib import Path

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio import images  # noqa: E402
from studio.images import FakeProvider, GeminiImageProvider, ImageError, ImageStore, register_image_routes  # noqa: E402

PNG = images.FAKE_PNG
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64


def bare_app() -> FastAPI:
    """A FastAPI app that answers errors in the engine's shape ({ok, error, message}), as api_server does."""
    app = FastAPI()

    @app.exception_handler(HTTPException)
    async def _http_error(_request, exc: HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"ok": False, "error": "ERROR", "message": str(exc.detail)})

    return app


def make_client(work_dir: Path, user: str = "alice", provider: FakeProvider | None = None) -> tuple[TestClient, FakeProvider]:
    app = bare_app()
    fake = provider or FakeProvider()
    register_image_routes(app, user, work_dir, provider_factory=lambda: fake)
    return TestClient(app), fake


def wait_job(client: TestClient, job_id: str, timeout: float = 10.0) -> dict:
    for _ in range(int(timeout * 20)):
        job = client.get(f"/api/editor/images/jobs/{job_id}").json()["data"]
        if job["status"] in ("done", "failed"):
            return job
        time.sleep(0.05)
    raise AssertionError("image job never finished")


@pytest.fixture
def work(tmp_path):
    return tmp_path / "work"


# ------------------------------------------------------------------ validation
@pytest.mark.parametrize("prompt,ok", [("ab", False), ("abc", True), ("x" * 2000, True), ("x" * 2001, False), ("   ", False)])
def test_prompt_length_is_three_to_two_thousand(prompt, ok):
    if ok:
        assert images.validate_prompt(prompt) == prompt.strip()
    else:
        with pytest.raises(ImageError):
            images.validate_prompt(prompt)


def test_reference_must_be_an_image_by_its_bytes_not_its_name():
    assert images.validate_reference(PNG) == "image/png"
    assert images.validate_reference(JPEG) == "image/jpeg"
    with pytest.raises(ImageError):
        images.validate_reference(b"<html>not an image</html>")
    with pytest.raises(ImageError):
        images.validate_reference(b"")


def test_reference_size_limit_is_ten_megabytes():
    too_big = PNG + b"\x00" * (10 * 1024 * 1024)
    with pytest.raises(ImageError):
        images.validate_reference(too_big)


# ------------------------------------------------------------------ endpoints
def test_generate_and_view_round_trip(work):
    client, fake = make_client(work)
    r = client.post("/api/editor/images", json={"prompt": "a red bicycle in the rain"})
    assert r.status_code == 202
    job = r.json()["data"]
    assert job["provider"] == "fake" and job["status"] in ("queued", "running", "done")
    done = wait_job(client, job["id"])
    assert done["status"] == "done" and done["error"] is None
    assert fake.calls == [{"prompt": "a red bicycle in the rain", "reference": False}]

    gallery = client.get("/api/editor/images").json()["data"]
    assert len(gallery["images"]) == 1
    img = gallery["images"][0]
    assert img["id"] == done["image_id"]
    assert img["provider"] == "fake" and img["model"] == "fake-image-1"
    assert img["mime_type"] == "image/png" and img["size_bytes"] == len(PNG)
    assert isinstance(img["cost_estimate_usd"], float)

    f = client.get(f"/api/editor/images/{img['id']}/file")
    assert f.status_code == 200
    assert f.headers["content-type"].startswith("image/png")
    assert f.content == PNG


def test_reference_image_is_passed_to_the_provider(work):
    client, fake = make_client(work)
    up = client.post("/api/editor/images/reference", content=PNG, headers={"Content-Type": "image/png", "X-File-Name": "ref.png"})
    assert up.status_code == 201
    upload_id = up.json()["data"]["referenceUploadId"]
    job = client.post("/api/editor/images", json={"prompt": "same product, studio light", "referenceUploadId": upload_id}).json()["data"]
    assert wait_job(client, job["id"])["status"] == "done"
    assert fake.calls[-1] == {"prompt": "same product, studio light", "reference": True}


def test_reference_upload_rejects_non_images_and_oversize(work):
    client, _ = make_client(work)
    bad = client.post("/api/editor/images/reference", content=b"hello", headers={"Content-Type": "text/plain"})
    assert bad.status_code == 400
    big = client.post("/api/editor/images/reference", content=PNG + b"\x00" * (10 * 1024 * 1024 + 1))
    assert big.status_code == 413


def test_prompt_and_reference_are_validated_on_create(work):
    client, _ = make_client(work)
    assert client.post("/api/editor/images", json={"prompt": "hi"}).status_code == 400
    assert client.post("/api/editor/images", json={"prompt": "a cat", "referenceUploadId": "f" * 32}).status_code == 400
    assert client.post("/api/editor/images", json={"prompt": "a cat", "referenceUploadId": "../etc"}).status_code == 400


def test_provider_failure_is_recorded_and_not_added_to_gallery(work):
    client, _ = make_client(work, provider=FakeProvider(fail_with="The image model returned no image (SAFETY)."))
    job = client.post("/api/editor/images", json={"prompt": "something risky"}).json()["data"]
    done = wait_job(client, job["id"])
    assert done["status"] == "failed"
    assert "SAFETY" in done["error"]
    assert client.get("/api/editor/images").json()["data"]["images"] == []


def test_unknown_job_and_image_return_404(work):
    client, _ = make_client(work)
    assert client.get("/api/editor/images/jobs/" + "a" * 32).status_code == 404
    assert client.get("/api/editor/images/not-an-id/file").status_code == 404
    assert client.get("/api/editor/images/" + "b" * 32 + "/file").status_code == 404


def test_missing_key_is_reported_before_a_job_starts(work, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    app = bare_app()
    register_image_routes(app, "alice", work)  # default Gemini provider, no key set
    client = TestClient(app)
    r = client.post("/api/editor/images", json={"prompt": "a lemon tree"})
    assert r.status_code == 503
    assert "GEMINI_API_KEY" in r.json()["message"]


# ------------------------------------------------------------------ isolation and recovery
def test_accounts_do_not_see_each_others_gallery(tmp_path):
    alice, _ = make_client(tmp_path / "alice-work", "alice")
    bob, _ = make_client(tmp_path / "bob-work", "bob")
    job = alice.post("/api/editor/images", json={"prompt": "alice's poster"}).json()["data"]
    wait_job(alice, job["id"])
    assert len(alice.get("/api/editor/images").json()["data"]["images"]) == 1
    assert bob.get("/api/editor/images").json()["data"]["images"] == []
    assert bob.get(f"/api/editor/images/jobs/{job['id']}").status_code == 404
    image_id = alice.get("/api/editor/images").json()["data"]["images"][0]["id"]
    assert bob.get(f"/api/editor/images/{image_id}/file").status_code == 404


def test_owner_check_blocks_cross_account_reads_on_a_shared_store(tmp_path):
    # Defence in depth: even if two owners ever shared a store file, each read is filtered by owner.
    store = ImageStore(tmp_path)
    store.put_job({"id": "c" * 32, "owner": "alice", "status": "done", "created_at": 1})
    assert store.get_job("c" * 32, "bob") is None
    assert store.get_job("c" * 32, "alice") is not None


def test_jobs_running_at_restart_are_marked_failed(tmp_path):
    store = ImageStore(tmp_path)
    store.put_job({"id": "d" * 32, "owner": "alice", "status": "running", "created_at": 1})
    reopened = ImageStore(tmp_path)
    job = reopened.get_job("d" * 32, "alice")
    assert job["status"] == "failed" and "restart" in job["error"]


# ------------------------------------------------------------------ Gemini adapter (fake HTTP only)
class _Resp:
    def __init__(self, payload: dict):
        self._body = json.dumps(payload).encode("utf-8")

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_gemini_adapter_parses_an_inline_image_and_sends_the_key_only_in_the_header():
    seen = {}

    def opener(req, timeout):
        seen["url"] = req.full_url
        seen["headers"] = {k.lower(): v for k, v in req.header_items()}
        seen["body"] = json.loads(req.data.decode("utf-8"))
        b64 = base64.b64encode(PNG).decode("ascii")
        return _Resp({"candidates": [{"content": {"parts": [{"inlineData": {"mimeType": "image/png", "data": b64}}]}}]})

    p = GeminiImageProvider(model="test-model", api_key="SECRET-TEST-KEY", opener=opener)
    out = p.generate("a boat", images.Reference(JPEG, "image/jpeg"))
    assert out.data == PNG and out.mime_type == "image/png"
    assert seen["url"].endswith("/models/test-model:generateContent")
    assert seen["headers"]["x-goog-api-key"] == "SECRET-TEST-KEY"
    assert "SECRET-TEST-KEY" not in seen["url"] and "SECRET-TEST-KEY" not in json.dumps(seen["body"])
    parts = seen["body"]["contents"][0]["parts"]
    assert parts[0] == {"text": "a boat"} and parts[1]["inline_data"]["mime_type"] == "image/jpeg"


def test_gemini_adapter_never_echoes_the_key_in_an_error():
    def opener(req, timeout):
        raise urllib.error.HTTPError(req.full_url, 400, "Bad Request", {}, io.BytesIO(b'{"error": "invalid key SECRET-TEST-KEY"}'))

    p = GeminiImageProvider(model="m", api_key="SECRET-TEST-KEY", opener=opener)
    with pytest.raises(ImageError) as info:
        p.generate("a boat")
    assert "HTTP 400" in str(info.value)
    assert "SECRET-TEST-KEY" not in str(info.value)


def test_gemini_adapter_reports_a_response_with_no_image():
    def opener(req, timeout):
        return _Resp({"candidates": [{"finishReason": "SAFETY", "content": {"parts": [{"text": "no"}]}}]})

    with pytest.raises(ImageError, match="SAFETY"):
        GeminiImageProvider(model="m", api_key="k", opener=opener).generate("x y z")


def test_provider_selection_rejects_unknown_names(monkeypatch):
    monkeypatch.setenv("EDITOR_IMAGE_PROVIDER", "nope")
    with pytest.raises(ImageError):
        images.get_provider()
    monkeypatch.setenv("EDITOR_IMAGE_PROVIDER", "gemini")
    assert isinstance(images.get_provider(), GeminiImageProvider)
