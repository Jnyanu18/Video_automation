"""Assembles the cached system prefix.

The skill and its references are identical for every job, so they go in one
stable block with a cache_control breakpoint at the end. Per-job content (the
brief, the brand kit, the asset list) must go in the first USER message, never
here, or the cache is invalidated on every request.
"""
from __future__ import annotations

import os
from pathlib import Path

SKILL_ROOT = Path(os.environ.get("MOTION_SKILL_ROOT", r"J:\ai editor\skills\motion-director"))

# Read in a fixed order: a reordering would change the bytes and void the cache.
REFERENCE_ORDER = [
    "lessons.md",
    "director-process.md",
    "motion-vocabulary.md",
    "craft-rules.md",
    "sound-design.md",
    "critic-rubric.md",
    "build-guide.md",
]

TOOL_CONTRACT = """
## How you work here

You are driving a real renderer through four tools.

- `write_file` accepts only `src/film.tsx`, `score.py`, `plan.md`, or a new file
  directly under `src/kit/`. Anything else is refused.
- `build_audio` runs `score.py` and reports measured LUFS and true peak.
- `render_stills` returns the frames as images. Look at every one before judging
  your work; do not assume a frame is correct because the code reads correctly.
- `render_final` renders at full resolution and returns the scorecard.

Write `plan.md` first: the insight, three concepts with scores, the winner and
why, the beat map, and the shot table. Then build, then look, then fix.

Mix audio to -2.0 dBTP so the delivered AAC lands under the -1.5 dBTP gate.
Target -14 LUFS, plus or minus 1.
"""


def _read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def build_system_blocks(skill_root: Path | None = None) -> list[dict]:
    """One big stable block, cached at its end."""
    root = Path(skill_root or SKILL_ROOT)
    parts: list[str] = []

    skill = _read(root / "SKILL.md")
    if skill:
        parts.append(skill)

    refs = root / "references"
    seen: set[str] = set()
    for name in REFERENCE_ORDER:
        text = _read(refs / name)
        if text:
            parts.append("\n\n# reference: " + name + "\n\n" + text)
            seen.add(name)
    if refs.is_dir():
        for extra in sorted(p.name for p in refs.glob("*.md")):
            if extra in seen or extra == "api-integration.md":
                continue  # api-integration describes THIS service; the model does not need it
            parts.append("\n\n# reference: " + extra + "\n\n" + _read(refs / extra))

    parts.append(TOOL_CONTRACT)

    return [
        {
            "type": "text",
            "text": "\n".join(parts),
            "cache_control": {"type": "ephemeral"},
        }
    ]
