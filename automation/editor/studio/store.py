"""Durable store for the studio (storyboards, series, publishing queue, carousels, activity log).

Two backends behind one interface:
  * JSON file (default, unchanged): the whole state is written atomically after every change.
  * Database (when STUDIO_DATABASE_URL is set): one row per record, written on every change.
      - postgresql://...  Postgres: Supabase, AWS RDS, or any Postgres.
      - sqlite:///path    SQLite file: local development and tests.

Every record lives in one table, keyed by (namespace, collection, key). The namespace is the store's
path (one per account folder), so several accounts can share one database without seeing each other.

Everything is guarded by one re-entrant lock: handlers run in threads (FastAPI) and background workers
(jobs, scheduler). Within one process the in-memory copy is authoritative; the database is the durable copy.
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

COLLECTIONS = ("storyboards", "series", "publishing", "settings", "carousels", "longform_jobs")
MAX_EVENTS = 300
DATABASE_URL_ENV = "STUDIO_DATABASE_URL"
EVENTS_COLL, EVENTS_KEY = "events", "log"


class _SqlBackend:
    """One table, one row per record. Works with Postgres (psycopg) and SQLite (sqlite3)."""

    def __init__(self, url: str, namespace: str):
        self.namespace = namespace
        if url.startswith(("postgres://", "postgresql://")):
            import psycopg  # the Postgres driver; the only extra dependency for the database backend
            self.conn = psycopg.connect(url, autocommit=True)
            self.ph = "%s"
            real = "double precision"
        elif url.startswith("sqlite:///"):
            import sqlite3
            path = Path(url[len("sqlite:///"):])
            path.parent.mkdir(parents=True, exist_ok=True)
            self.conn = sqlite3.connect(str(path), check_same_thread=False, isolation_level=None)
            self.ph = "?"
            real = "real"
        else:
            raise ValueError(f"{DATABASE_URL_ENV} must start with postgresql:// or sqlite:///")
        self.conn.execute(
            f"create table if not exists studio_records ("
            f" namespace text not null, coll text not null, key text not null,"
            f" value text not null, updated_at {real} not null,"
            f" primary key (namespace, coll, key))"
        )

    def _sql(self, sql: str) -> str:
        return sql.replace("?", self.ph)

    def load_all(self) -> List[tuple]:
        cur = self.conn.execute(self._sql("select coll, key, value from studio_records where namespace = ?"), (self.namespace,))
        return cur.fetchall()

    def upsert(self, coll: str, key: str, value: Any) -> None:
        self.conn.execute(self._sql(
            "insert into studio_records (namespace, coll, key, value, updated_at) values (?, ?, ?, ?, ?)"
            " on conflict (namespace, coll, key) do update set value = excluded.value, updated_at = excluded.updated_at"
        ), (self.namespace, coll, key, json.dumps(value, ensure_ascii=False, default=str), time.time()))

    def delete(self, coll: str, key: str) -> None:
        self.conn.execute(self._sql("delete from studio_records where namespace = ? and coll = ? and key = ?"),
                          (self.namespace, coll, key))


class Store:
    def __init__(self, path: str | Path, database_url: Optional[str] = None, namespace: Optional[str] = None):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.data: Dict[str, Any] = {c: {} for c in COLLECTIONS}
        self.data["events"] = []
        url = database_url if database_url is not None else os.environ.get(DATABASE_URL_ENV, "").strip()
        self.db = _SqlBackend(url, namespace or str(self.path)) if url else None
        self.backend = self.db.conn.__class__.__module__.split(".")[0] if self.db else "json"
        self._load()

    # ------------------------------------------------------------ persistence
    def _load(self) -> None:
        if self.db is not None:
            rows = self.db.load_all()
            if rows:
                for coll, key, value in rows:
                    record = json.loads(value)
                    if coll == EVENTS_COLL and key == EVENTS_KEY:
                        self.data["events"] = record[-MAX_EVENTS:]
                    elif coll in self.data:
                        self.data[coll][key] = record
                self._recover_interrupted()
                self._persist_all()
                return
            # First start on the database: import the JSON file once, if there is one, so nothing is lost.
            raw = self._read_json()
            if raw is None:
                return
            self._apply_raw(raw)
            self._recover_interrupted()
            self._persist_all()
            return
        raw = self._read_json()
        if raw is None:
            return
        self._apply_raw(raw)
        self._recover_interrupted()

    def _read_json(self) -> Optional[dict]:
        if not self.path.is_file():
            return None
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            bad = self.path.with_suffix(".corrupt-" + time.strftime("%Y%m%d-%H%M%S"))
            try:
                self.path.replace(bad)  # keep the unreadable file for inspection instead of overwriting it
            except OSError:
                pass
            return None

    def _apply_raw(self, raw: dict) -> None:
        for c in COLLECTIONS:
            if isinstance(raw.get(c), dict):
                self.data[c] = raw[c]
        if isinstance(raw.get("events"), list):
            self.data["events"] = raw["events"][-MAX_EVENTS:]

    def _recover_interrupted(self) -> None:
        """Fail every record that was still in flight when the process last died.

        Background work runs in daemon threads, so a crash or a deploy kills it silently and
        nothing ever touches the record again. Left alone, the client watches a progress bar
        that will never move. Only in-flight states are rewritten, so this is idempotent and
        finished work is never disturbed.

        This runs on load rather than when each subsystem starts, so the sweep happens even
        if the scheduler or a worker never comes up.
        """
        for c in self.data["carousels"].values():
            if c.get("status") in ("writing", "rendering"):
                c["status"] = "failed"
                c["error"] = "The editor service restarted while this carousel was being made. Make it again."
        for j in self.data["longform_jobs"].values():
            if j.get("status") in ("running", "queued"):
                j["status"] = "failed"
                j["error"] = "The editor service restarted while this index job was running."
        for sb in self.data["storyboards"].values():
            if sb.get("status") == "processing":
                sb["status"] = "failed"
                sb["error"] = "The editor service restarted while this storyboard was being generated. Create it again."
            job = sb.get("render_job")
            if job and job.get("status") == "running":
                job["status"] = "failed"
                job["error"] = "The editor service restarted during the render."
        # Publishing is the one case that must not be retried automatically: the platform call
        # may have gone through moments before the crash, so a silent retry could post to a
        # client's account twice. It is marked outcome_unknown, which makes retry() refuse until
        # an operator checks the account and uses retry_confirmed().
        for p in self.data["publishing"].values():
            if p.get("status") == "PUBLISHING":
                p["status"] = "FAILED"
                p["outcome_unknown"] = True
                p["error"] = {"code": "OUTCOME_UNKNOWN", "retryable": False,
                              "message": "the service restarted while publishing; check the account before retrying"}

    def save(self) -> None:
        """JSON backend: rewrite the whole file atomically. Database backend: write every record."""
        with self.lock:
            if self.db is not None:
                self._persist_all()
                return
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.data, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
            os.replace(tmp, self.path)

    def _persist_all(self) -> None:
        with self.lock:
            for c in COLLECTIONS:
                for k, v in self.data[c].items():
                    self.db.upsert(c, k, v)
            self.db.upsert(EVENTS_COLL, EVENTS_KEY, self.data["events"])

    def _commit(self, coll: str, key: str) -> None:
        """Persist one changed record. Database: one row. JSON: the whole file."""
        with self.lock:
            if self.db is None:
                self.save()
                return
            if coll == EVENTS_COLL:
                self.db.upsert(EVENTS_COLL, EVENTS_KEY, self.data["events"])
            else:
                rec = self.data[coll].get(key)
                if rec is None:
                    self.db.delete(coll, key)
                else:
                    self.db.upsert(coll, key, rec)

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
            self._commit(coll, key)
            return value

    def update(self, coll: str, key: str, fn: Callable[[dict], Any]) -> Optional[dict]:
        """Mutate a record under the lock and persist. Returns the record, or None if it does not exist."""
        with self.lock:
            rec = self.data[coll].get(key)
            if rec is None:
                return None
            fn(rec)
            rec["updated_at"] = time.time()
            self._commit(coll, key)
            return rec

    def delete(self, coll: str, key: str) -> bool:
        with self.lock:
            gone = self.data[coll].pop(key, None) is not None
            if gone:
                self._commit(coll, key)
            return gone

    # ------------------------------------------------------------ activity log
    def log(self, kind: str, message: str, **extra: Any) -> None:
        with self.lock:
            self.data["events"].append({"ts": time.time(), "kind": kind, "message": message, **extra})
            del self.data["events"][:-MAX_EVENTS]
            self._commit(EVENTS_COLL, EVENTS_KEY)

    def events(self, limit: int = 30) -> List[dict]:
        with self.lock:
            return copy.deepcopy(self.data["events"][-limit:][::-1])
