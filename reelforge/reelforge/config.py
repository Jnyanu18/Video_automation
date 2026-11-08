"""Configuration management for ReelForge.
Reads settings from environment variables; never hardcodes sensitive keys.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field

def get_default_workspace() -> Path:
    desktop = Path.home() / "Desktop"
    if desktop.is_dir():
        return desktop / "AI Video Editor"
    return Path.home() / "AI Video Editor"

DEFAULT_WORKSPACE = str(get_default_workspace())
REELFORGE_MODEL = os.environ.get("REELFORGE_MODEL", "claude-3-7-sonnet-20250219")


class ReelForgeConfig(BaseModel):
    # LLM settings
    model: str = Field(default_factory=lambda: os.environ.get("REELFORGE_MODEL", "claude-3-7-sonnet-20250219"))
    anthropic_api_key: Optional[str] = Field(default_factory=lambda: os.environ.get("ANTHROPIC_API_KEY"))
    
    # Workspace structure
    workspace_path: Path = Field(default_factory=get_default_workspace)
    raw_footage_dir_name: str = "Raw Footage"
    reference_dir_name: str = "Reference"
    output_dir_name: str = "Output"
    dot_dir_name: str = ".reelforge"
    
    # Rendering resolutions
    final_width: int = 1080
    final_height: int = 1920
    draft_width: int = 540
    draft_height: int = 960
    default_fps: float = 30.0

    # Ingestion concurrency
    max_concurrent_ingestions: int = Field(default_factory=lambda: int(os.environ.get("REELFORGE_MAX_WORKERS", 3)))

    @property
    def raw_dir(self) -> Path:
        return self.workspace_path / self.raw_footage_dir_name

    @property
    def reference_dir(self) -> Path:
        return self.workspace_path / self.reference_dir_name

    @property
    def output_dir(self) -> Path:
        return self.workspace_path / self.output_dir_name

    @property
    def dot_dir(self) -> Path:
        return self.workspace_path / self.dot_dir_name

    @property
    def db_path(self) -> Path:
        return self.dot_dir / "reelforge.db"

    @property
    def logs_dir(self) -> Path:
        return self.dot_dir / "logs"

    @property
    def cache_dir(self) -> Path:
        return self.dot_dir / "cache"

    @property
    def styles_dir(self) -> Path:
        return self.dot_dir / "styles"

    def setup_dirs(self) -> None:
        """Create all required workspace subfolders deterministically."""
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.reference_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.dot_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.styles_dir.mkdir(parents=True, exist_ok=True)
