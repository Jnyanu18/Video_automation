"""Skills the creative director reads at runtime.

The director (studio/director_worker.py) is given the core skill text in its system prompt and an index of every other
skill file. It reads the recipes it needs with the `read_skill` tool while it works, exactly like a person opening the
manual. Nothing here is transcribed into Python: edit a skill file and the next job follows it.

Skill roots, first match wins for a given relative path:
    1. DIRECTOR_SKILLS_DIRS (os.pathsep-separated), for a deployment that mounts its own pack
    2. <editor>/skills            the pack vendored into the engine (ships in the Docker image)

Layout under a root:
    givemotion/SKILL.md                 core of the rendering skill (always in the system prompt)
    givemotion/references/**.md         technique recipes and API reference (read on demand)
    director/lessons.md                 taste principles from client feedback (always in the system prompt)
    director/*.md                       other director principles (read on demand)

Refresh the vendored pack from the repo copy with:  python -m studio.director_skills sync
"""
from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path
from typing import Dict, List, Optional

EDITOR_ROOT = Path(__file__).resolve().parents[1]
VENDORED = EDITOR_ROOT / "skills"
CORE = "givemotion/SKILL.md"
LESSONS = "director/lessons.md"
MAX_READ_CHARS = 60_000


class SkillError(ValueError):
    pass


def roots() -> List[Path]:
    extra = [Path(p) for p in (os.environ.get("DIRECTOR_SKILLS_DIRS") or "").split(os.pathsep) if p.strip()]
    return [r for r in [*extra, VENDORED] if r.is_dir()]


def _resolve(rel: str) -> Path:
    """The file for a relative skill path, refusing anything outside the skill roots."""
    rel = (rel or "").strip().replace("\\", "/").lstrip("/")
    if rel.startswith(".agents/skills/"):  # paths as the skill text itself writes them
        rel = rel[len(".agents/skills/"):]
    if rel.startswith("references/"):  # givemotion's own SKILL.md links are relative to its folder
        rel = "givemotion/" + rel
    if not rel or ".." in Path(rel).parts or not rel.endswith(".md"):
        raise SkillError(f"not a skill file: {rel!r}")
    for root in roots():
        p = (root / rel).resolve()
        if root.resolve() in p.parents and p.is_file():
            return p
    raise SkillError(f"no such skill file: {rel}. Call list_skills for the index.")


def read(rel: str) -> str:
    text = _resolve(rel).read_text(encoding="utf-8")
    if len(text) > MAX_READ_CHARS:
        text = text[:MAX_READ_CHARS] + "\n\n[truncated]"
    return text


def _purpose(path: Path) -> str:
    """One line that says what the file is for: its 'Purpose:' line, else its first heading."""
    try:
        lines = path.read_text(encoding="utf-8").splitlines()[:30]
    except OSError:
        return ""
    for line in lines:
        if line.lower().startswith("purpose:"):
            return line.split(":", 1)[1].strip()[:160]
    for line in lines:
        if line.startswith("#"):
            return line.lstrip("# ").strip()[:160]
    return ""


def index() -> List[Dict[str, str]]:
    """Every readable skill file with a one-line purpose, de-duplicated across roots."""
    seen: Dict[str, Dict[str, str]] = {}
    for root in roots():
        for p in sorted(root.rglob("*.md")):
            rel = p.relative_to(root).as_posix()
            if rel not in seen and "node_modules" not in p.parts:
                seen[rel] = {"path": rel, "purpose": _purpose(p)}
    return list(seen.values())


def core_text() -> str:
    """The text that is always in the director's system prompt: the rendering skill's core and the client lessons."""
    parts = [f"<skill path=\"{CORE}\">\n{read(CORE)}\n</skill>"]
    try:
        parts.append(f"<skill path=\"{LESSONS}\">\n{read(LESSONS)}\n</skill>")
    except SkillError:
        pass
    return "\n\n".join(parts)


def index_text() -> str:
    rows = [f"- {e['path']}: {e['purpose']}" for e in index() if e["path"] not in (CORE, LESSONS)]
    return "\n".join(rows)


def available() -> Optional[str]:
    """None when the core skill is present, else the reason the director cannot run."""
    try:
        _resolve(CORE)
        return None
    except SkillError as exc:
        return str(exc)


# ------------------------------------------------------------------ sync from the repo copy (developer step)
def sync(repo_root: Optional[Path] = None) -> List[str]:
    """Copy the givemotion pack and the director principles from the repo into the vendored folder."""
    base = Path(repo_root) if repo_root else _find_repo_root()
    src_gm = base / ".agents" / "skills" / "givemotion"
    src_dir = base / "skills" / "motion-director" / "references"
    if not (src_gm / "SKILL.md").is_file():
        raise SkillError(f"givemotion skill not found at {src_gm}")
    shutil.rmtree(VENDORED / "givemotion", ignore_errors=True)
    shutil.copytree(src_gm, VENDORED / "givemotion")
    copied = ["givemotion/"]
    (VENDORED / "director").mkdir(parents=True, exist_ok=True)
    for name in ("lessons.md", "critic-rubric.md", "craft-rules.md", "automatic-direction.md"):
        if (src_dir / name).is_file():
            shutil.copy2(src_dir / name, VENDORED / "director" / name)
            copied.append(f"director/{name}")
    return copied


def _find_repo_root() -> Path:
    for p in EDITOR_ROOT.parents:
        if (p / ".agents" / "skills" / "givemotion" / "SKILL.md").is_file():
            return p
    raise SkillError("could not find the repo copy of the givemotion skill above the editor folder")


if __name__ == "__main__":
    if sys.argv[1:] == ["sync"]:
        print("synced:", ", ".join(sync()))
    elif sys.argv[1:] == ["index"]:
        print(index_text())
    else:
        print("usage: python -m studio.director_skills sync|index", file=sys.stderr)
        raise SystemExit(2)
