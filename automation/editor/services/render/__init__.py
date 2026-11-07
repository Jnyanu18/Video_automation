"""Render worker: EditPlan -> mp4 (FFmpeg cut/reframe + Hyperframes captions/overlays)."""
import tempfile

from .render import (  # noqa: F401
    render_preview, render_final, render_preview_info, render_final_info, RenderError,
)

__all__ = ["render_preview", "render_final", "render_preview_info", "render_final_info", "RenderError", "TOOLS"]


def _as_tool(info_fn):
    """Wrap a render_*_info function in the shared tool contract: fn(plan, workdir=...) -> {plan, result, warnings}."""
    def run(plan: dict, workdir: str | None = None, **_) -> dict:
        info = info_fn(plan, workdir or tempfile.mkdtemp(prefix="render_"))
        return {"plan": plan, "result": info, "warnings": list(info.get("warnings") or [])}
    return run


_EMPTY_INPUT = {"type": "object", "properties": {}}

# Tools Claude (agent/) can call. The plan is never modified by rendering.
TOOLS = {
    "render_preview": {
        "fn": _as_tool(render_preview_info),
        "description": "Render a fast, low-resolution preview of the current edit plan and return the video path. "
                       "Use it to check your work before telling the user an edit is done.",
        "input_schema": _EMPTY_INPUT,
    },
    "render_final": {
        "fn": _as_tool(render_final_info),
        "description": "Render the full-quality final video of the current edit plan. Slow: only on explicit user request.",
        "input_schema": _EMPTY_INPUT,
    },
}
