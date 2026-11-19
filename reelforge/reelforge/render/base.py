"""Abstract Base Renderer interface for ReelForge."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel

from ..schemas.storyboard import StoryboardPlan
from ..schemas.style import StyleSheet

class RenderResult(BaseModel):
    success: bool
    output_path: str
    duration: float
    resolution: str
    render_engine: str
    render_time_seconds: float
    error: Optional[str] = None
    metadata: Dict[str, Any] = {}

class BaseRenderer(ABC):
    """Abstract interface for all ReelForge video rendering engines."""

    @abstractmethod
    def render(
        self,
        storyboard: StoryboardPlan,
        style_sheet: StyleSheet,
        output_path: str,
        quality: str = "draft", # "draft" (540x960) or "final" (1080x1920)
        audio_track_path: Optional[str] = None
    ) -> RenderResult:
        """Render a StoryboardPlan into a 9:16 vertical video."""
        pass
