"""Longform footage indexing and multi-camera moments engine adapter.

Provides background job management for long-form event indexing, persisting state
through studio/store.py, with graceful degradation when footage package is not installed.
"""

from __future__ import annotations

import logging
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from studio.store import Store

logger = logging.getLogger("studio.longform")


def is_footage_available() -> bool:
    """Check if ailo-footage package is installed and importable."""
    try:
        import footage  # noqa: F401
        import footage.schema  # noqa: F401
        import footage.index  # noqa: F401
        return True
    except ImportError:
        return False


class LongformManager:
    """Manages background indexing jobs and index retrieval."""

    def __init__(self, store: Store, work_dir: Path | str):
        self.store = store
        self.work_dir = Path(work_dir).resolve()
        self.longform_dir = self.work_dir / "longform"
        self.longform_dir.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()

    def _index_path(self, project_id: str) -> Path:
        return self.longform_dir / project_id / "index.json"

    def start_index_job(
        self,
        source_dir: str | Path,
        project_id: Optional[str] = None,
        camera_map: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Start background indexing job."""
        if not is_footage_available():
            raise RuntimeError("Footage indexing package (packages/footage) is not installed.")

        import footage.index

        src = Path(source_dir).resolve()
        if not src.exists():
            raise FileNotFoundError(f"Source footage path does not exist: {src}")

        proj_id = project_id or src.name or f"proj_{uuid.uuid4().hex[:8]}"
        jid = f"lfi_{uuid.uuid4().hex[:10]}"
        out_index_path = self._index_path(proj_id)
        proj_work_dir = self.longform_dir / proj_id / "work"

        job = {
            "id": jid,
            "job_id": jid,
            "project_id": proj_id,
            "source_dir": str(src),
            "status": "running",
            "progress": 0.0,
            "message": "Starting index job",
            "stats": None,
            "error": None,
            "created_at": time.time(),
            "updated_at": time.time(),
        }
        self.store.put("longform_jobs", jid, job)

        def run():
            def on_prog(msg: str, frac: float):
                self.store.update(
                    "longform_jobs",
                    jid,
                    lambda rec: rec.update(
                        progress=round(frac, 3),
                        message=msg,
                        updated_at=time.time(),
                    ),
                )

            try:
                index = footage.index.index_footage(
                    source_dir=src,
                    work_dir=proj_work_dir,
                    out_path=out_index_path,
                    project_id=proj_id,
                    camera_map=camera_map,
                    on_progress=on_prog,
                )
                stats_dict = index.stats.model_dump()
                self.store.update(
                    "longform_jobs",
                    jid,
                    lambda rec: rec.update(
                        status="done",
                        progress=1.0,
                        message="Index complete",
                        stats=stats_dict,
                        updated_at=time.time(),
                    ),
                )
            except Exception as e:
                logger.exception("Longform index job failed: %s", e)
                self.store.update(
                    "longform_jobs",
                    jid,
                    lambda rec: rec.update(
                        status="failed",
                        error=str(e),
                        message=f"Failed: {e}",
                        updated_at=time.time(),
                    ),
                )

        thread = threading.Thread(target=run, daemon=True, name=f"longform_{jid}")
        thread.start()
        return dict(job)

    def get_job(self, jid: str) -> Optional[Dict[str, Any]]:
        """Retrieve job record by ID."""
        return self.store.get("longform_jobs", jid)

    def get_moments(
        self,
        project_id: str,
        tag: Optional[str] = None,
        keep: Optional[bool] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Retrieve paged moments from a project's index."""
        if not is_footage_available():
            raise RuntimeError("Footage indexing package is not installed.")

        import footage.index

        idx_path = self._index_path(project_id)
        if not idx_path.is_file():
            raise FileNotFoundError(f"Index not found for project: {project_id}")

        index = footage.index.read_index(idx_path)
        shots_by_id = {s.shot_id: s for s in index.shots}

        filtered = index.moments
        if keep is not None:
            if keep:
                filtered = [
                    m for m in filtered
                    if any(shots_by_id.get(a.shot_id) and shots_by_id[a.shot_id].reject_reason is None for a in m.angles)
                ]
            else:
                filtered = [
                    m for m in filtered
                    if all(shots_by_id.get(a.shot_id) and shots_by_id[a.shot_id].reject_reason is not None for a in m.angles)
                ]

        if tag:
            tag_lower = tag.lower()
            filtered = [m for m in filtered if any(tag_lower in t.lower() for t in m.tags)]

        total = len(filtered)
        start_idx = max(0, (page - 1) * limit)
        end_idx = start_idx + limit
        paged = [m.model_dump() for m in filtered[start_idx:end_idx]]

        return {
            "project_id": project_id,
            "total": total,
            "page": page,
            "limit": limit,
            "moments": paged,
        }

    def get_rejected(self, project_id: str) -> Dict[str, Any]:
        """Retrieve shots rejected by triage with documented reasons."""
        if not is_footage_available():
            raise RuntimeError("Footage indexing package is not installed.")

        import footage.index

        idx_path = self._index_path(project_id)
        if not idx_path.is_file():
            raise FileNotFoundError(f"Index not found for project: {project_id}")

        index = footage.index.read_index(idx_path)
        rejected = [
            s.model_dump()
            for s in index.shots
            if s.reject_reason is not None
        ]

        return {
            "project_id": project_id,
            "total_rejected": len(rejected),
            "rejected_shots": rejected,
        }
