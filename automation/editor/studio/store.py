"""Small durable store for the studio (storyboards, series, publishing queue, activity log).

One JSON file, written atomically after every change, so a restart of the editor service never loses work.
Everything is guarded by one re-entrant lock: handlers run in threads (FastAPI) and background workers (jobs, scheduler).
"""
from __future__ import annotations

import copy
import json
import os
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

COLLECTIONS = ("storyboards", "series", "publishing", "settings", "carousels")
MAX_EVENTS = 300


class Store:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.data: Dict[str, Any] = {c: {} for c in COLLECTIONS}
        self.data["events"] = []
        self._load()

    # ------------------------------------------------------------ persistence
    def _load(self) -> None:
        if not self.path.is_file():
            return
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            bad = self.path.with_suffix(".corrupt-" + time.strftime("%Y%m%d-%H%M%S"))
            try:
                self.path.replace(bad)  # keep the unreadable file for inspection instead of overwriting it
            except OSError:
                pass
            return
        for c in COLLECTIONS:
            if isinstance(raw.get(c), dict):
                self.data[c] = raw[c]
        if isinstance(raw.get("events"), list):
            self.data["events"] = raw["events"][-MAX_EVENTS:]
        for c in self.data["carousels"].values():
            if c.get("status") in ("writing", "rendering"):
                c["status"] = "failed"
                c["error"] = "The editor service restarted while this carousel was being made. Make it again."
        # jobs that were running when the process died can never finish: surface that instead of spinning forever
        for sb in self.data["storyboards"].values():
            if sb.get("status") == "processing":
                sb["status"] = "failed"
                sb["error"] = "The editor service restarted while this storyboard was being generated. Create it again."
            job = sb.get("render_job")
            if job and job.get("status") == "running":
                job["status"] = "failed"
                job["error"] = "The editor service restarted during the render."

    def save(self) -> None:
        with self.lock:
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.data, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
            os.replace(tmp, self.path)

    # ------------------------------------------------------------ access
    def new_id(self, prefix: str) -> str:
        return f"{prefix}_{uuid.uuid4().hex[:12]}"

    def get(self, coll: str, key: str) -> Optional[dict]:
        with self.lock:
            return self.data[coll].get(key)

    def snapshot(self, coll: str, key: str) -> Optional[dict]:
        with self.lock:
            v = self.data[coll].get(key)
            return copy.deepcopy(v) if v is not None else None

    def all(self, coll: str) -> List[dict]:
        with self.lock:
            return copy.deepcopy(list(self.data[coll].values()))

    def put(self, coll: str, key: str, value: dict) -> dict:
        with self.lock:
            value["updated_at"] = time.time()
            value.setdefault("created_at", value["updated_at"])
            self.data[coll][key] = value
            self.save()
            return value

    def update(self, coll: str, key: str, fn: Callable[[dict], Any]) -> Optional[dict]:
        """Mutate a record under the lock and persist. Returns the record, or None if it does not exist."""
        with self.lock:
            rec = self.data[coll].get(key)
            if rec is None:
                return None
            fn(rec)
            rec["updated_at"] = time.time()
            self.save()
            return rec

    def delete(self, coll: str, key: str) -> bool:
        with self.lock:
            gone = self.data[coll].pop(key, None) is not None
            if gone:
                self.save()
            return gone

    # ------------------------------------------------------------ activity log
    def log(self, kind: str, message: str, **extra: Any) -> None:
        with self.lock:
            self.data["events"].append({"ts": time.time(), "kind": kind, "message": message, **extra})
            del self.data["events"][:-MAX_EVENTS]
            self.save()

    def events(self, limit: int = 30) -> List[dict]:
        with self.lock:
            return copy.deepcopy(self.data["events"][-limit:][::-1])
