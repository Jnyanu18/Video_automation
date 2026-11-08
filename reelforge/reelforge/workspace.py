"""Workspace initialization, inspection, and file tracking for ReelForge."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, Any, List
from .config import ReelForgeConfig

log = logging.getLogger("reelforge.workspace")

class WorkspaceManager:
    def __init__(self, workspace_path: Path | str | None = None):
        cfg = ReelForgeConfig()
        if workspace_path:
            cfg.workspace_path = Path(workspace_path).resolve()
        self.config = cfg
        self.config.setup_dirs()
        self._init_logger()

    def _init_logger(self) -> None:
        log_file = self.config.logs_dir / "reelforge.log"
        self._handler = logging.FileHandler(log_file, encoding="utf-8")
        formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(name)s: %(message)s")
        self._handler.setFormatter(formatter)
        log.addHandler(self._handler)
        log.setLevel(logging.INFO)
        log.info("Initialized workspace at: %s", self.config.workspace_path)

    def close(self) -> None:
        """Release file locks and handlers."""
        if hasattr(self, "_handler") and self._handler:
            self._handler.close()
            log.removeHandler(self._handler)
            self._handler = None

    @property
    def root(self) -> Path:
        return self.config.workspace_path

    @property
    def dot_dir(self) -> Path:
        return self.config.dot_dir


    def status(self) -> Dict[str, Any]:
        """Inspect the current workspace and count footage, references, and outputs."""
        video_exts = {".mp4", ".mov", ".mkv", ".webm", ".avi"}
        
        raw_files = [f.name for f in self.config.raw_dir.glob("*") if f.is_file() and f.suffix.lower() in video_exts]
        
        # References: direct video files or subfolders
        ref_items = []
        for p in self.config.reference_dir.iterdir():
            if p.is_dir():
                ref_items.append({"name": p.name, "type": "folder"})
            elif p.is_file() and p.suffix.lower() in video_exts:
                ref_items.append({"name": p.name, "type": "file"})
                
        output_files = [f.name for f in self.config.output_dir.glob("*.mp4") if f.is_file()]
        
        return {
            "path": str(self.config.workspace_path),
            "workspace_root": str(self.config.workspace_path),
            "exists": self.config.workspace_path.is_dir(),
            "folders": {
                "raw_footage": str(self.config.raw_dir),
                "reference": str(self.config.reference_dir),
                "output": str(self.config.output_dir),
                "dot_dir": str(self.config.dot_dir),
            },
            "raw_footage_count": len(raw_files),
            "raw_files": sorted(raw_files),
            "reference_count": len(ref_items),
            "reference_items": ref_items,
            "output_count": len(output_files),
            "output_files": sorted(output_files),
            "database_initialized": self.config.db_path.is_file(),
        }


    def list_raw_videos(self) -> List[Path]:
        video_exts = {".mp4", ".mov", ".mkv", ".webm", ".avi"}
        return [f for f in self.config.raw_dir.glob("*") if f.is_file() and f.suffix.lower() in video_exts]

    def list_reference_items(self) -> List[Path]:
        video_exts = {".mp4", ".mov", ".mkv", ".webm", ".avi"}
        items = []
        for p in self.config.reference_dir.iterdir():
            if p.is_dir() or (p.is_file() and p.suffix.lower() in video_exts):
                items.append(p)
        return items
