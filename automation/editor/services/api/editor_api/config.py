import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[2]  # services/api/editor_api -> repo root


def data_dir() -> Path:
    p = Path(os.environ.get("EDITOR_DATA_DIR", HERE.parent / ".data"))
    p.mkdir(parents=True, exist_ok=True)
    return p


def agent_mode() -> str:
    """auto (real agent if importable AND ANTHROPIC_API_KEY set), fake, real, scripted (real loop + tools, replayed Claude: EDITOR_AGENT_SCRIPT)."""
    return os.environ.get("EDITOR_AGENT", "auto")


def render_mode() -> str:
    """auto (real renderer if importable), fake, real."""
    return os.environ.get("EDITOR_RENDER", "auto")
