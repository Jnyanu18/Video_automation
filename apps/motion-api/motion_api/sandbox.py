r"""Path guard for the only tool that writes to disk.

Claude writes the film's source code, so `write_file` is the one place where a
model-authored string becomes a path on a real filesystem. Everything here is
deny-by-default: a path is allowed only if it matches the allowlist AND resolves
to somewhere inside the job directory.

Rejecting on the *resolved* path is what makes it safe on Windows, where
`src/../../../etc` and `src\..\..\x` and a junction planted inside the job
dir all have to be caught after resolution, not before.
"""
from __future__ import annotations

import os
import re
import stat
from pathlib import Path, PurePosixPath

# Exactly what the spec allows Claude to write.
ALLOWED_EXACT = {"src/film.tsx", "score.py", "plan.md"}
ALLOWED_PREFIX = "src/kit/"
ALLOWED_SUFFIXES = {".tsx", ".ts", ".py", ".md"}

_SAFE_SEGMENT = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


class SandboxError(ValueError):
    """The requested path is not writable by the model."""


def _is_reparse_point(p: Path) -> bool:
    """True for a Windows junction or symlink.

    os.path.islink() returns False for junctions, so it cannot be used on its
    own here - a junction dropped into the job directory would otherwise be a
    way out of it.
    """
    try:
        attrs = os.lstat(p).st_file_attributes  # type: ignore[attr-defined]
    except (OSError, AttributeError):
        return False
    return bool(attrs & stat.FILE_ATTRIBUTE_REPARSE_POINT)


def resolve_write_path(job_dir: Path, rel_path: str) -> Path:
    """Return the absolute path to write, or raise SandboxError.

    `rel_path` is whatever the model produced, so it is treated as hostile.
    """
    if not isinstance(rel_path, str) or not rel_path.strip():
        raise SandboxError("path must be a non-empty string")
    if "\x00" in rel_path:
        raise SandboxError("path contains a null byte")

    # Normalise separators before any comparison; the model may emit either.
    norm = rel_path.replace("\\", "/").strip()

    if norm.startswith("/") or re.match(r"^[A-Za-z]:", norm):
        raise SandboxError(f"absolute paths are not allowed: {rel_path!r}")

    pure = PurePosixPath(norm)
    if any(part in ("..", ".") for part in pure.parts):
        raise SandboxError(f"relative traversal is not allowed: {rel_path!r}")
    for part in pure.parts:
        if not _SAFE_SEGMENT.match(part):
            raise SandboxError(f"unsafe path segment {part!r} in {rel_path!r}")

    allowed = norm in ALLOWED_EXACT or (
        norm.startswith(ALLOWED_PREFIX) and len(pure.parts) == 3
    )
    if not allowed:
        raise SandboxError(
            f"{rel_path!r} is not writable. Allowed: "
            f"{sorted(ALLOWED_EXACT)} or a new file directly under {ALLOWED_PREFIX!r}"
        )
    if pure.suffix not in ALLOWED_SUFFIXES:
        raise SandboxError(f"extension {pure.suffix!r} is not allowed")

    job_dir = job_dir.resolve()
    target = (job_dir / norm).resolve()

    # The decisive check: wherever the string pointed, it must land inside the job.
    if target != job_dir and job_dir not in target.parents:
        raise SandboxError(f"path escapes the job directory: {rel_path!r}")

    # A reparse point anywhere between the job root and the target is an escape
    # hatch, so walk the chain explicitly: target first, then each parent up to
    # (but not including) the job directory itself.
    chain = [target, *target.parents]
    for probe in chain:
        if probe == job_dir:
            break
        if probe.exists() and _is_reparse_point(probe):
            raise SandboxError(f"path crosses a link or junction: {rel_path!r}")

    return target


def write(job_dir: Path, rel_path: str, content: str) -> Path:
    """Validate then write. Returns the path written."""
    target = resolve_write_path(job_dir, rel_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return target
