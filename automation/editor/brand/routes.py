"""HTTP routes for the brand kit. Mounted from api_server.create_app with one call.

    GET  /api/editor/brand                 the saved kit, or {"kit": null}
    PUT  /api/editor/brand                 validate and save a kit (409 on a version conflict)
    POST /api/editor/brand/draft           draft a kit from pasted text; nothing is saved
    GET  /api/editor/brand/brief           the brief text for purpose and mode
    POST /api/editor/brand/check           check a finished output against the saved kit

The server never fetches the brand's website itself: the text is pasted in by the person, so the server makes no
outbound request to an address someone else chose.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, Dict, Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from .draft import draft_kit
from .prompt import MODES, PURPOSES, compile_brand_brief
from .store import BrandError, load_kit, save_kit
from .validator import check_output, validate_kit

OUTPUT_KINDS = ("final_video", "end_card", "preview", "copy", "image")


class DraftIn(BaseModel):
    source_url: str = Field(default="", max_length=500)
    source_text: str = Field(min_length=1, max_length=60000)


class CheckIn(BaseModel):
    kind: str
    output: Dict[str, Any]


def register_brand_routes(app: FastAPI, user_id: Optional[str], work_dir: Path,
                          client_factory: Callable[[], Any]) -> None:
    owner = user_id or "local"
    root = Path(work_dir)

    @app.get("/api/editor/brand")
    def get_brand():
        kit = load_kit(root, owner)
        return {"ok": True, "kit": kit.model_dump() if kit else None}

    @app.put("/api/editor/brand")
    def put_brand(body: Dict[str, Any], expected_version: Optional[int] = Query(default=None)):
        ok, errors = validate_kit({**body, "owner": owner})
        if not ok:
            raise HTTPException(400, detail={"error": "INVALID_KIT", "errors": errors})
        try:
            from .schema import BrandKit
            kit = save_kit(root, BrandKit.model_validate({**body, "owner": owner}), owner, expected_version=expected_version)
        except BrandError as exc:
            status = 409 if "version" in str(exc).lower() or "conflict" in str(exc).lower() else 400
            raise HTTPException(status, detail={"error": "BRAND_ERROR", "message": str(exc)}) from exc
        return {"ok": True, "kit": kit.model_dump()}

    @app.post("/api/editor/brand/draft")
    def post_draft(body: DraftIn):
        kit, problems = draft_kit(client_factory(), body.source_text, body.source_url, owner)
        if kit is None:
            return {"ok": False, "kit": None, "problems": problems}
        return {"ok": True, "kit": kit, "problems": [],
                "note": "Draft only. Nothing is saved until a person reviews and saves it."}

    @app.get("/api/editor/brand/brief")
    def get_brief(purpose: str = Query(...), mode: str = Query(default="live")):
        if purpose not in PURPOSES:
            raise HTTPException(400, f"purpose must be one of {', '.join(PURPOSES)}")
        if mode not in MODES:
            raise HTTPException(400, f"mode must be one of {', '.join(MODES)}")
        kit = load_kit(root, owner)
        if kit is None:
            raise HTTPException(404, "No brand kit is saved for this account")
        return {"ok": True, "purpose": purpose, "mode": mode, "brief": compile_brand_brief(kit, purpose, mode)}

    @app.post("/api/editor/brand/check")
    def post_check(body: CheckIn):
        if body.kind not in OUTPUT_KINDS:
            raise HTTPException(400, f"kind must be one of {', '.join(OUTPUT_KINDS)}")
        kit = load_kit(root, owner)
        if kit is None:
            raise HTTPException(404, "No brand kit is saved for this account")
        try:
            failures = check_output(kit, body.output, kind=body.kind)
        except (KeyError, ValueError, TypeError) as exc:
            raise HTTPException(400, f"bad output description: {exc}") from exc
        return {"ok": not failures, "failures": [f.to_dict() for f in failures]}
