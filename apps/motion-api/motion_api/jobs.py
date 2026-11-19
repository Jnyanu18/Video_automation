"""Job records, stored on disk so a restart does not lose a film."""
from __future__ import annotations

import json
import os
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path

JOBS_ROOT = Path(os.environ.get("MOTION_JOBS_ROOT", r"J:\ai editor\apps\motion-api\.jobs"))


@dataclass
class Job:
    id: str
    brief: str
    status: str = "queued"  # queued | running | done | failed
    created: float = field(default_factory=time.time)
    updated: float = field(default_factory=time.time)
    rounds: int = 0
    stills: list[float] = field(default_factory=list)
    final_path: str | None = None
    scorecard: dict | None = None
    errors: list[str] = field(default_factory=list)
    stopped: str = ""
    # Which store owns this job. Without it `dir` would resolve against the
    # module-level default and a job would persist somewhere its own store
    # never looks -- which is exactly what the persistence test caught.
    base: str = str(JOBS_ROOT)

    @property
    def dir(self) -> Path:
        return Path(self.base) / self.id

    def to_dict(self) -> dict:
        d = asdict(self)
        d["dir"] = str(self.dir)
        return d


class JobStore:
    """Small, file-backed, and safe to call from the worker thread."""

    def __init__(self, root: Path | None = None) -> None:
        self.root = Path(root or JOBS_ROOT)
        self.root.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._jobs: dict[str, Job] = {}
        self._load()

    def _load(self) -> None:
        for f in self.root.glob("*/job.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                data.pop("dir", None)
                data["base"] = str(self.root)
                job = Job(**data)
                self._jobs[job.id] = job
            except Exception:
                continue  # a corrupt record must not stop the service starting

    def _persist(self, job: Job) -> None:
        job.dir.mkdir(parents=True, exist_ok=True)
        (job.dir / "job.json").write_text(
            json.dumps(job.to_dict(), indent=2), encoding="utf-8"
        )

    def create(self, brief: str) -> Job:
        job = Job(id="mj_" + uuid.uuid4().hex[:12], brief=brief, base=str(self.root))
        with self._lock:
            self._jobs[job.id] = job
            self._persist(job)
        return job

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def list(self) -> list[Job]:
        with self._lock:
            return sorted(self._jobs.values(), key=lambda j: j.created, reverse=True)

    def update(self, job_id: str, **fields) -> Job | None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return None
            for k, v in fields.items():
                setattr(job, k, v)
            job.updated = time.time()
            self._persist(job)
            return job
