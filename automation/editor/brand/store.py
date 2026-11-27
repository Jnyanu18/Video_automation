"""Brand kit storage: one kit.json per account at work_dir/brand/kit.json.

Same pattern as studio/images.py: every path comes from work_dir, which is already scoped to one account. The owner id
is stored in the file and checked on every read and write, so one account's id never reaches another account's kit.

load_kit(work_dir, owner) -> BrandKit | None
    None when there is no kit, or when the kit belongs to a different owner (the two cases look the same to the caller).
    Raises BrandError when the stored file exists but is not a valid kit (it is never silently overwritten).

save_kit(work_dir, kit, owner, *, expected_version=None) -> BrandKit
    Validates the kit, sets owner and updated_at, and bumps version to stored + 1 (the incoming version is ignored).
    If expected_version is given and differs from the stored version, the save is refused (a conflict). The write is
    atomic (temp file, then os.replace) and runs under a lock.

Limits: the lock is per process. Two engine processes writing the same account at once are not covered.
"""
from __future__ import annotations

import json
import logging
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Union

from .schema import BrandKit
from .validator import validate_kit, validate_version_bump

log = logging.getLogger("ai_editor_server.brand")

BRAND_DIR = "brand"
KIT_FILE = "kit.json"
_LOCK = threading.RLock()


class BrandError(Exception):
    """A user-facing problem with a kit: invalid input, a conflict, or a stored file that cannot be read."""


def kit_path(work_dir: Union[str, Path]) -> Path:
    return Path(work_dir) / BRAND_DIR / KIT_FILE


def _read_raw(path: Path) -> Optional[Dict[str, Any]]:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise BrandError(f"the stored brand kit at {path.name} cannot be read ({type(exc).__name__})") from exc
    if not isinstance(data, dict):
        raise BrandError("the stored brand kit is not a JSON object")
    return data


def load_kit(work_dir: Union[str, Path], owner: str) -> Optional[BrandKit]:
    """Return this owner's kit, or None when there is none or it belongs to someone else."""
    with _LOCK:
        data = _read_raw(kit_path(work_dir))
    if data is None or not owner or data.get("owner") != owner:
        return None
    ok, errors = validate_kit(data)
    if not ok:
        raise BrandError("the stored brand kit is not valid: " + "; ".join(errors))
    return BrandKit.model_validate(data)


def save_kit(work_dir: Union[str, Path], kit: Union[BrandKit, Dict[str, Any]], owner: str,
             *, expected_version: Optional[int] = None) -> BrandKit:
    """Validate and store the kit with the next version number. Returns the stored kit."""
    if not owner or not str(owner).strip():
        raise BrandError("an owner id is required to save a brand kit")
    data: Dict[str, Any] = kit.model_dump() if isinstance(kit, BrandKit) else dict(kit)
    path = kit_path(work_dir)
    with _LOCK:
        current = _read_raw(path)
        if current is not None and current.get("owner") != owner:
            raise BrandError("this brand kit belongs to another account")
        stored_version = int(current.get("version", 0)) if current else 0
        if expected_version is not None and expected_version != stored_version:
            raise BrandError(f"the kit changed since you loaded it (stored version {stored_version}); reload and try again")
        data["owner"] = owner
        data["version"] = stored_version + 1
        data["updated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        ok, errors = validate_kit(data)
        if not ok:
            raise BrandError("the brand kit is not valid: " + "; ".join(errors))
        problems = validate_version_bump(stored_version, data["version"])
        if problems:
            raise BrandError("; ".join(problems))
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_name(f"{KIT_FILE}.{uuid.uuid4().hex}.tmp")
        try:
            tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
            os.replace(tmp, path)
        finally:
            if tmp.exists():
                tmp.unlink()
    log.info("brand kit saved at version %s", data["version"])
    return BrandKit.model_validate(data)
