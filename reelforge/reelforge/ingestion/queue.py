"""Background ingestion queue and worker for unlimited reference reels."""
from __future__ import annotations

import concurrent.futures
import json
import logging
import threading
import time
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable

from pydantic import BaseModel, Field

from .downloader import ReelDownloader
from ..analysis.pipeline import analyze_single_reel
from ..schemas.analysis import ReelAnalysis
from ..db.connection import get_db

log = logging.getLogger("reelforge.ingestion.queue")

class IngestionItem(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:10])
    source: str
    status: str = "queued" # queued, downloading, analyzing, completed, failed
    progress: int = 0
    reel_id: Optional[str] = None
    title: Optional[str] = None
    error: Optional[str] = None
    created_at: float = Field(default_factory=time.time)
    finished_at: Optional[float] = None

class IngestionQueue:
    """
    Manages concurrent ingestion and analysis of reference reels.
    Never hardcodes limits (scales from 1 to 200+ reels).
    Fault-tolerant: one failure does not halt or affect other reels.
    """

    def __init__(self, workspace_path: str, max_workers: int = 2):
        self.ws_path = Path(workspace_path)
        self.ref_dir = self.ws_path / "Reference"
        self.cache_dir = self.ws_path / ".reelforge" / "cache"
        self.ref_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.downloader = ReelDownloader(self.ref_dir)
        self.max_workers = max_workers
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=max_workers)
        self._items: Dict[str, IngestionItem] = {}
        self._lock = threading.Lock()

    def add(self, source: str, title: Optional[str] = None) -> IngestionItem:
        """Add a single URL or local file to ingestion queue."""
        item = IngestionItem(source=source.strip(), title=title)
        with self._lock:
            self._items[item.id] = item

        # Record in DB
        try:
            with get_db(self.ws_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO job_queue (id, queue_name, status, payload_json) VALUES (?, ?, ?, ?)",
                    (item.id, "ingest_reel", item.status, json.dumps({"source": item.source, "title": item.title}))
                )
        except Exception as e:
            log.warning("DB record failed: %s", e)


        # Submit task to executor
        self.executor.submit(self._process_item, item.id)
        return item

    def add_bulk(self, sources: List[str]) -> List[IngestionItem]:
        """Add multiple URLs or files at once."""
        items = []
        for s in sources:
            s_clean = s.strip()
            if s_clean:
                items.append(self.add(s_clean))
        return items

    def _process_item(self, item_id: str) -> None:
        with self._lock:
            item = self._items.get(item_id)
            if not item:
                return
            item.status = "downloading"
            item.progress = 20

        log.info("Processing ingestion item [%s]: %s", item_id, item.source)

        try:
            # 1. Download or copy file
            dl_res = self.downloader.ingest(item.source, name=item.title)
            if not dl_res.get("ok"):
                raise RuntimeError(dl_res.get("error", "Download failed"))

            local_video = Path(dl_res["local_path"])
            folder_name = Path(dl_res["folder"]).name
            title = dl_res.get("title", folder_name)

            with self._lock:
                item.reel_id = folder_name
                item.title = title
                item.status = "analyzing"
                item.progress = 50

            # 2. Run analysis pipeline
            analysis = analyze_single_reel(local_video, cache_dir=self.cache_dir)

            # 3. Save to DB reference_reels table
            try:
                with get_db(self.ws_path) as conn:
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO reference_reels 
                        (id, workspace_id, source_url, local_path, title, duration, analysis_json, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            folder_name,
                            str(self.ws_path),
                            item.source,
                            str(local_video),
                            title,
                            analysis.duration,
                            analysis.model_dump_json(),
                            "analyzed"
                        )
                    )
            except Exception as e:

                log.warning("DB insert failed for reel %s: %s", folder_name, e)

            with self._lock:
                item.status = "completed"
                item.progress = 100
                item.finished_at = time.time()

            log.info("Finished analysis for [%s] -> %s", item_id, folder_name)

        except Exception as e:
            log.error("Failed processing reel [%s]: %s", item_id, e)
            with self._lock:
                item.status = "failed"
                item.progress = 0
                item.error = str(e)
                item.finished_at = time.time()

        # Update DB job_queue
        try:
            with get_db(self.ws_path) as conn:
                conn.execute(
                    "UPDATE job_queue SET status = ?, error = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (item.status, item.error, item.id)
                )
        except Exception:
            pass


    def get_status(self, item_id: str) -> Optional[IngestionItem]:
        with self._lock:
            return self._items.get(item_id)

    def list_all(self) -> List[IngestionItem]:
        with self._lock:
            return list(self._items.values())

    def get_analyzed_reels(self) -> List[ReelAnalysis]:
        """Load all cached ReelAnalysis objects for style aggregation."""
        analyses = []
        if not self.cache_dir.exists():
            return []

        for cache_file in self.cache_dir.glob("*.json"):
            try:
                data = json.loads(cache_file.read_text(encoding="utf-8"))
                analyses.append(ReelAnalysis(**data))
            except Exception as e:
                log.warning("Error reading cached reel %s: %s", cache_file.name, e)

        return analyses

    def close(self):
        """Cleanly shutdown executor threads."""
        self.executor.shutdown(wait=False)

