"""Image generation lane: a prompt (and optional reference image) becomes a PNG/JPEG/WebP in the account's gallery.

Flow: POST /api/editor/images creates a job and returns at once; a daemon thread calls the provider adapter and
writes the file under this account's work folder; the browser polls GET /api/editor/images/jobs/{id}. Gallery and
job state live in one JSON file per account (work_dir/images/images.json), written atomically under a lock.

Isolation: every path comes from work_dir, which create_app already scopes to one account. The owner id is stored
on each record and checked again on every read, so one account's id can never reach another account's files.

PROVIDERS: only Google "Nano Banana 2" (a Gemini image model) is implemented. To add Flux, OpenAI gpt-image or
Ideogram, subclass ImageProvider, implement generate() and cost_estimate_usd(), and add the class to PROVIDERS.
Nothing else changes. The provider is picked by EDITOR_IMAGE_PROVIDER (default "gemini").

Environment: GEMINI_API_KEY (or GOOGLE_API_KEY) for the default provider, EDITOR_IMAGE_MODEL (model id),
EDITOR_IMAGE_COST_USD (per-image cost estimate recorded on each image; the default is a rough figure, not a quote).
The key is never returned, logged or echoed in an error message.
"""
from __future__ import annotations

from brand import image_brief
from brand.store import BrandError, load_kit
import base64
import json
import logging
import os
import re
import threading
import time
import urllib.error
import urllib.request
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

log = logging.getLogger("ai_editor_server.images")

PROMPT_MIN = 3
PROMPT_MAX = 2000
REFERENCE_MAX_BYTES = 10 * 1024 * 1024
ID_RE = re.compile(r"^[a-f0-9]{32}$")
DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image-preview"
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_COST_USD = 0.04
EXT_BY_MIME = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
# A valid 1x1 PNG, used only by FakeProvider (tests).
FAKE_PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")


class ImageError(Exception):
    """A user-facing problem: bad input, missing configuration, or a provider failure."""


# ------------------------------------------------------------------ validation
def sniff_image(data: bytes) -> Optional[str]:
    """Image type from the file's own bytes (never from the file name). None when it is not PNG, JPEG or WebP."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_prompt(prompt: Any) -> str:
    text = str(prompt or "").strip()
    if len(text) < PROMPT_MIN or len(text) > PROMPT_MAX:
        raise ImageError(f"Write a prompt of {PROMPT_MIN} to {PROMPT_MAX} characters.")
    return text


def validate_reference(data: bytes) -> str:
    if not data:
        raise ImageError("Choose an image file.")
    if len(data) > REFERENCE_MAX_BYTES:
        raise ImageError("The reference image must be 10 MB or smaller.")
    mime = sniff_image(data)
    if mime is None:
        raise ImageError("The reference must be a PNG, JPEG or WebP image.")
    return mime


# ------------------------------------------------------------------ provider adapter
@dataclass(frozen=True)
class Reference:
    data: bytes
    mime_type: str


@dataclass(frozen=True)
class Generated:
    data: bytes
    mime_type: str


class ImageProvider(ABC):
    """One image model behind one interface. Subclass this to add a vendor."""

    name: str = "base"
    model: str = ""

    @abstractmethod
    def generate(self, prompt: str, reference: Optional[Reference] = None) -> Generated:
        """Return the image bytes. Raise ImageError with a safe, readable message on failure."""

    def ready_reason(self) -> Optional[str]:
        """None when the provider can run now, otherwise the reason it cannot (shown before a job starts)."""
        return None

    def cost_estimate_usd(self) -> float:
        try:
            return float(os.environ.get("EDITOR_IMAGE_COST_USD", DEFAULT_COST_USD))
        except ValueError:
            return DEFAULT_COST_USD


class GeminiImageProvider(ImageProvider):
    """Google Nano Banana 2 through the Gemini generateContent REST endpoint (no SDK needed)."""

    name = "gemini"

    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None, timeout: float = 180.0, opener: Callable = None):
        self.model = model or os.environ.get("EDITOR_IMAGE_MODEL") or DEFAULT_IMAGE_MODEL
        self._api_key = api_key if api_key is not None else (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "")
        self.timeout = timeout
        self._opener = opener or urllib.request.urlopen

    def ready_reason(self) -> Optional[str]:
        return None if self._api_key else "GEMINI_API_KEY is not set in the engine environment, so images cannot be generated."

    def _safe(self, text: str) -> str:
        out = text.replace(self._api_key, "[key]") if self._api_key else text
        return out[:300]

    def generate(self, prompt: str, reference: Optional[Reference] = None) -> Generated:
        if not self._api_key:
            raise ImageError(self.ready_reason())
        parts: List[Dict[str, Any]] = [{"text": prompt}]
        if reference is not None:
            parts.append({"inline_data": {"mime_type": reference.mime_type, "data": base64.b64encode(reference.data).decode("ascii")}})
        body = {"contents": [{"role": "user", "parts": parts}], "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}}
        req = urllib.request.Request(
            f"{GEMINI_BASE}/models/{self.model}:generateContent",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": self._api_key},
            method="POST",
        )
        try:
            with self._opener(req, timeout=self.timeout) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                detail = self._safe(e.read().decode("utf-8", "replace"))
            except Exception:
                detail = ""
            raise ImageError(f"The image model returned HTTP {e.code}. {detail}".strip())
        except (urllib.error.URLError, OSError, TimeoutError) as e:
            raise ImageError(f"Could not reach the image model ({type(e).__name__}).")
        except ValueError:
            raise ImageError("The image model sent an unreadable response.")

        for cand in payload.get("candidates") or []:
            for part in (cand.get("content") or {}).get("parts") or []:
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    data = base64.b64decode(inline["data"])
                    mime = sniff_image(data)
                    if mime is None:
                        raise ImageError("The image model returned data that is not a PNG, JPEG or WebP image.")
                    return Generated(data, mime)
        reason = ((payload.get("candidates") or [{}])[0].get("finishReason")
                  or (payload.get("promptFeedback") or {}).get("blockReason") or "no image in the response")
        raise ImageError(f"The image model returned no image ({reason}).")


class FakeProvider(ImageProvider):
    """Deterministic provider for tests. Never touches the network."""

    name = "fake"

    def __init__(self, fail_with: Optional[str] = None, model: str = "fake-image-1"):
        self.model = model
        self.fail_with = fail_with
        self.calls: List[Dict[str, Any]] = []

    def generate(self, prompt: str, reference: Optional[Reference] = None) -> Generated:
        self.calls.append({"prompt": prompt, "reference": reference is not None})
        if self.fail_with:
            raise ImageError(self.fail_with)
        return Generated(FAKE_PNG, "image/png")


PROVIDERS: Dict[str, Callable[[], ImageProvider]] = {"gemini": GeminiImageProvider}


def get_provider() -> ImageProvider:
    key = (os.environ.get("EDITOR_IMAGE_PROVIDER") or "gemini").strip().lower()
    factory = PROVIDERS.get(key)
    if factory is None:
        raise ImageError(f"Unknown image provider '{key}'.")
    return factory()


# ------------------------------------------------------------------ per-account store
class ImageStore:
    """Gallery and job records for one account, in one JSON file. Files sit beside it."""

    def __init__(self, work_dir: Path):
        self.root = Path(work_dir) / "images"
        self.refs = self.root / "refs"
        self.path = self.root / "images.json"
        self.root.mkdir(parents=True, exist_ok=True)
        self.refs.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.data: Dict[str, Dict[str, dict]] = {"jobs": {}, "images": {}}
        self._load()
        self._recover_interrupted()

    def _load(self) -> None:
        if not self.path.is_file():
            return
        try:
            loaded = json.loads(self.path.read_text(encoding="utf-8"))
            self.data = {"jobs": dict(loaded.get("jobs") or {}), "images": dict(loaded.get("images") or {})}
        except (OSError, ValueError):
            log.warning("Image store %s is unreadable; starting with an empty gallery", self.path)

    def _save(self) -> None:
        tmp = self.path.with_name("images.json.tmp")
        tmp.write_text(json.dumps(self.data, ensure_ascii=False, indent=1), encoding="utf-8")
        os.replace(tmp, self.path)

    def _recover_interrupted(self) -> None:
        # Jobs run in daemon threads. A restart kills them, so anything still queued or running is marked failed.
        with self.lock:
            changed = False
            for job in self.data["jobs"].values():
                if job.get("status") in ("queued", "running"):
                    job.update(status="failed", error="Interrupted by an engine restart. Generate it again.", finished_at=time.time())
                    changed = True
            if changed:
                self._save()

    def reference_path(self, upload_id: str) -> Optional[Path]:
        if not ID_RE.match(upload_id or ""):
            return None
        return next((p for p in self.refs.glob(f"{upload_id}.*") if p.is_file()), None)

    def save_reference(self, data: bytes, mime: str) -> str:
        upload_id = uuid.uuid4().hex
        (self.refs / f"{upload_id}{EXT_BY_MIME[mime]}").write_bytes(data)
        return upload_id

    def put_job(self, job: dict) -> None:
        with self.lock:
            self.data["jobs"][job["id"]] = job
            self._save()

    def update_job(self, job_id: str, **fields: Any) -> None:
        with self.lock:
            self.data["jobs"][job_id].update(fields)
            self._save()

    def get_job(self, job_id: str, owner: str) -> Optional[dict]:
        with self.lock:
            job = self.data["jobs"].get(job_id)
            return dict(job) if job and job.get("owner") == owner else None

    def recent_jobs(self, owner: str, limit: int = 10) -> List[dict]:
        with self.lock:
            mine = [dict(j) for j in self.data["jobs"].values() if j.get("owner") == owner]
        return sorted(mine, key=lambda j: j.get("created_at", 0), reverse=True)[:limit]

    def add_image(self, image: dict) -> None:
        with self.lock:
            self.data["images"][image["id"]] = image
            self._save()

    def get_image(self, image_id: str, owner: str) -> Optional[dict]:
        with self.lock:
            img = self.data["images"].get(image_id)
            return dict(img) if img and img.get("owner") == owner else None

    def list_images(self, owner: str) -> List[dict]:
        with self.lock:
            mine = [dict(i) for i in self.data["images"].values() if i.get("owner") == owner]
        return sorted(mine, key=lambda i: i.get("created_at", 0), reverse=True)


# ------------------------------------------------------------------ background jobs
class ImageJobs:
    def __init__(self, store: ImageStore):
        self.store = store

    def start(self, owner: str, prompt: str, reference_upload_id: Optional[str], provider: ImageProvider,
              provider_prompt: Optional[str] = None, brand: Optional[dict] = None) -> dict:
        job_id = uuid.uuid4().hex
        job = {
            "id": job_id, "owner": owner, "status": "queued", "prompt": prompt,
            "provider_prompt": provider_prompt or prompt, "brand": brand,
            "reference_upload_id": reference_upload_id, "provider": provider.name, "model": provider.model,
            "cost_estimate_usd": provider.cost_estimate_usd(), "image_id": None, "error": None,
            "created_at": time.time(), "started_at": None, "finished_at": None,
        }
        self.store.put_job(job)
        threading.Thread(target=self._run, args=(job_id, provider), daemon=True, name=f"img_{job_id[:8]}").start()
        return dict(job)

    def _run(self, job_id: str, provider: ImageProvider) -> None:
        store = self.store
        try:
            with store.lock:
                job = dict(store.data["jobs"][job_id])
            store.update_job(job_id, status="running", started_at=time.time())
            reference = None
            if job.get("reference_upload_id"):
                path = store.reference_path(job["reference_upload_id"])
                if path is None:
                    raise ImageError("The reference image is no longer on the server. Upload it again.")
                data = path.read_bytes()
                reference = Reference(data, validate_reference(data))
            generated = provider.generate(job.get("provider_prompt") or job["prompt"], reference)
            image_id = uuid.uuid4().hex
            filename = f"{image_id}{EXT_BY_MIME.get(generated.mime_type, '.png')}"
            (store.root / filename).write_bytes(generated.data)
            store.add_image({
                "id": image_id, "owner": job["owner"], "job_id": job_id, "prompt": job["prompt"],
                "reference_upload_id": job.get("reference_upload_id"), "provider": provider.name, "model": provider.model,
                "mime_type": generated.mime_type, "file": filename, "size_bytes": len(generated.data),
                "cost_estimate_usd": job["cost_estimate_usd"], "created_at": time.time(),
                "brand": job.get("brand"),
            })
            store.update_job(job_id, status="done", image_id=image_id, finished_at=time.time())
        except ImageError as e:
            store.update_job(job_id, status="failed", error=str(e), finished_at=time.time())
        except Exception:  # report, never crash the thread silently
            log.exception("Image job %s failed", job_id)
            store.update_job(job_id, status="failed", error="Image generation failed unexpectedly. Try again.", finished_at=time.time())


# ------------------------------------------------------------------ API
class ImageRequest(BaseModel):
    prompt: str = ""
    referenceUploadId: Optional[str] = None


def register_image_routes(app: FastAPI, user_id: Optional[str], work_dir: Path,
                          provider_factory: Optional[Callable[[], ImageProvider]] = None) -> None:
    owner = user_id or "local"
    store = ImageStore(work_dir)
    jobs = ImageJobs(store)

    @app.post("/api/editor/images/reference", status_code=201)
    async def upload_image_reference(request: Request):
        declared = request.headers.get("content-length", "")
        if declared.isdigit() and int(declared) > REFERENCE_MAX_BYTES:
            raise HTTPException(413, "The reference image must be 10 MB or smaller.")
        data = await request.body()
        if len(data) > REFERENCE_MAX_BYTES:
            raise HTTPException(413, "The reference image must be 10 MB or smaller.")
        try:
            mime = validate_reference(data)
        except ImageError as e:
            raise HTTPException(400, str(e))
        name = Path(unquote(request.headers.get("x-file-name", "reference"))).name[:150]
        upload_id = store.save_reference(data, mime)
        return {"ok": True, "data": {"referenceUploadId": upload_id, "mimeType": mime, "sizeBytes": len(data), "fileName": name}}

    @app.post("/api/editor/images", status_code=202)
    def create_image_job(req: ImageRequest):
        try:
            prompt = validate_prompt(req.prompt)
        except ImageError as e:
            raise HTTPException(400, str(e))
        ref_id = req.referenceUploadId
        if ref_id is not None and store.reference_path(ref_id) is None:
            raise HTTPException(400, "The reference image was not found. Upload it again.")
        try:
            kit = load_kit(store.root.parent, owner)
        except BrandError as e:
            # Fail closed: with a damaged kit, images would ignore the brand rules, so they wait until it is fixed.
            raise HTTPException(409, f"Your brand kit cannot be read, so images are paused until it is fixed on the Brand screen. ({e})")
        if kit is not None:
            banned = image_brief.find_banned(prompt, kit.model_dump(mode="json"))
            if banned:
                raise HTTPException(400, "This prompt uses words your brand avoids: " + ", ".join(banned) + ". Change them and try again.")
        try:
            provider = (provider_factory or get_provider)()
        except ImageError as e:
            raise HTTPException(400, str(e))
        reason = provider.ready_reason()
        if reason:
            raise HTTPException(503, reason)
        applied = image_brief.apply(prompt, kit.model_dump(mode="json") if kit is not None else None)
        return {"ok": True, "data": jobs.start(owner, prompt, ref_id, provider,
                                               provider_prompt=applied["provider_prompt"], brand=applied["brand"])}

    @app.get("/api/editor/images/jobs/{job_id}")
    def get_image_job(job_id: str):
        job = store.get_job(job_id, owner) if ID_RE.match(job_id) else None
        if job is None:
            raise HTTPException(404, "Image job not found.")
        return {"ok": True, "data": job}

    @app.get("/api/editor/images")
    def list_images():
        return {"ok": True, "data": {"images": store.list_images(owner), "jobs": store.recent_jobs(owner)}}

    @app.get("/api/editor/images/{image_id}/file")
    def get_image_file(image_id: str):
        img = store.get_image(image_id, owner) if ID_RE.match(image_id) else None
        if img is None:
            raise HTTPException(404, "Image not found.")
        path = (store.root / img["file"]).resolve()
        if path.parent != store.root.resolve() or not path.is_file():
            raise HTTPException(404, "Image file not found.")
        return FileResponse(path, media_type=img["mime_type"], filename=f"{image_id}{path.suffix}")
