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

    def _plan_path(self, project_id: str, plan_id: str) -> Path:
        pdir = self.longform_dir / project_id / "plans"
        pdir.mkdir(parents=True, exist_ok=True)
        return pdir / f"{plan_id}.json"

    def start_plan_job(
        self,
        project_id: str,
        template: str,
        target_duration: Optional[float] = None,
        must_include: Optional[List[str]] = None,
        never_include: Optional[List[str]] = None,
        music_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Start background film planning job."""
        if not is_footage_available():
            raise RuntimeError("Footage package is not installed.")

        import footage.index
        import footage.plan
        import footage.editplan

        idx_path = self._index_path(project_id)
        if not idx_path.is_file():
            raise FileNotFoundError(f"Index not found for project: {project_id}")

        jid = f"lfp_{uuid.uuid4().hex[:10]}"
        job = {
            "id": jid,
            "job_id": jid,
            "project_id": project_id,
            "template": template,
            "status": "running",
            "progress": 0.0,
            "message": "Planning film edit",
            "plan_id": None,
            "plan": None,
            "error": None,
            "created_at": time.time(),
            "updated_at": time.time(),
        }
        self.store.put("longform_jobs", jid, job)

        def run():
            try:
                index = footage.index.read_index(idx_path)
                plan = footage.plan.plan_rundown(
                    index=index,
                    template=template,
                    target_duration=target_duration,
                    must_include=must_include,
                    never_include=never_include,
                    music_path=music_path,
                )
                plan_file = self._plan_path(project_id, plan.plan_id)
                footage.editplan.write_edit_plan(plan, plan_file)

                self.store.update(
                    "longform_jobs",
                    jid,
                    lambda rec: rec.update(
                        status="done",
                        progress=1.0,
                        message="Plan generated successfully",
                        plan_id=plan.plan_id,
                        plan=plan.model_dump(),
                        updated_at=time.time(),
                    ),
                )
            except Exception as e:
                logger.exception("Longform plan job failed: %s", e)
                self.store.update(
                    "longform_jobs",
                    jid,
                    lambda rec: rec.update(
                        status="failed",
                        error=str(e),
                        message=f"Planning failed: {e}",
                        updated_at=time.time(),
                    ),
                )

        thread = threading.Thread(target=run, daemon=True, name=f"plan_{jid}")
        thread.start()
        return dict(job)

    def get_plan(self, project_id: str, plan_id: str) -> Dict[str, Any]:
        """Retrieve an existing plan including missing-beat report."""
        if not is_footage_available():
            raise RuntimeError("Footage package is not installed.")

        import footage.editplan

        plan_file = self._plan_path(project_id, plan_id)
        if not plan_file.is_file():
            raise FileNotFoundError(f"Plan not found: {plan_id} for project {project_id}")

        plan = footage.editplan.read_edit_plan(plan_file)
        return plan.model_dump()

    def approve_plan(self, project_id: str, plan_id: str) -> Dict[str, Any]:
        """Approve an edit plan for final conform rendering."""
        if not is_footage_available():
            raise RuntimeError("Footage package is not installed.")

        import footage.editplan

        plan_file = self._plan_path(project_id, plan_id)
        if not plan_file.is_file():
            raise FileNotFoundError(f"Plan not found: {plan_id} for project {project_id}")

        plan = footage.editplan.read_edit_plan(plan_file)
        plan = footage.editplan.approve_plan(plan)
        footage.editplan.write_edit_plan(plan, plan_file)
        return plan.model_dump()

    def start_render_job(
        self,
        project_id: str,
        plan_id: str,
        deliverable: str = "highlight",
        allow_unapproved: bool = False,
    ) -> Dict[str, Any]:
        """Start conform render job for an approved plan."""
        if not is_footage_available():
            raise RuntimeError("Footage package is not installed.")

        import footage.editplan
        import footage.render
        import footage.index

        plan_file = self._plan_path(project_id, plan_id)
        if not plan_file.is_file():
            raise FileNotFoundError(f"Plan not found: {plan_id} for project {project_id}")

        plan = footage.editplan.read_edit_plan(plan_file)
        if not plan.approved and not allow_unapproved:
            from footage.render import PlanNotApprovedError
            raise PlanNotApprovedError(
                f"Plan '{plan_id}' is not approved. 409 NOT_APPROVED: Call approve endpoint before rendering."
            )

        idx_path = self._index_path(project_id)
        index = footage.index.read_index(idx_path) if idx_path.is_file() else None

        jid = f"lfr_{uuid.uuid4().hex[:10]}"
        out_mp4 = self.longform_dir / project_id / "renders" / f"{plan.project_id}_{deliverable}_{jid}.mp4"
        out_mp4.parent.mkdir(parents=True, exist_ok=True)

        job = {
            "id": jid,
            "job_id": jid,
            "project_id": project_id,
            "plan_id": plan_id,
            "deliverable": deliverable,
            "status": "running",
            "progress": 0.0,
            "message": "Rendering conform edit",
            "output_path": None,
            "result": None,
            "error": None,
            "created_at": time.time(),
            "updated_at": time.time(),
        }
        self.store.put("longform_jobs", jid, job)

        def run():
            try:
                res = footage.render.conform_render(
                    plan=plan,
                    out_path=out_mp4,
                    deliverable=deliverable,
                    index=index,
                    allow_unapproved=allow_unapproved,
                )
                self.store.update(
                    "longform_jobs",
                    jid,
                    lambda rec: rec.update(
                        status="done",
                        progress=1.0,
                        message="Render complete",
                        output_path=str(out_mp4),
                        result=res,
                        updated_at=time.time(),
                    ),
                )
            except Exception as e:
                logger.exception("Longform render job failed: %s", e)
                self.store.update(
                    "longform_jobs",
                    jid,
                    lambda rec: rec.update(
                        status="failed",
                        error=str(e),
                        message=f"Render failed: {e}",
                        updated_at=time.time(),
                    ),
                )

        thread = threading.Thread(target=run, daemon=True, name=f"render_{jid}")
        thread.start()
        return dict(job)
