"""Drives packages/motion-kit from Python.

Every method shells out to the kit's CLI and parses what it prints. The kit is
the contract: `render.mjs --stills ... --format jpeg --width N`, and
`render.mjs --final --name f.mp4 --json`, which prints one JSON object on
stdout with logs on stderr.

`Renderer` is a protocol so the agent loop can be tested without Remotion.
"""
from __future__ import annotations

import base64
import json
import os
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol

KIT_ROOT = Path(os.environ.get("MOTION_KIT_ROOT", r"J:\ai editor\packages\motion-kit"))
STILL_WIDTH = 540
MAX_STILLS_PER_CALL = 16


@dataclass
class Scorecard:
    path: str | None = None
    duration: float | None = None
    fps: float | None = None
    width: int | None = None
    height: int | None = None
    lufs: float | None = None
    peak: float | None = None
    error: str | None = None

    @property
    def ok(self) -> bool:
        if self.error or self.path is None or self.lufs is None or self.peak is None:
            return False
        # The rubric: -14 LUFS +/-1, true peak at or under -1.5 dBTP.
        return abs(self.lufs + 14.0) <= 1.0 and self.peak <= -1.5

    def failures(self) -> list[str]:
        out: list[str] = []
        if self.error:
            out.append(self.error)
        if self.lufs is not None and abs(self.lufs + 14.0) > 1.0:
            out.append(f"loudness {self.lufs} LUFS is outside -14 +/-1")
        if self.peak is not None and self.peak > -1.5:
            out.append(f"true peak {self.peak} dBTP is above -1.5")
        return out


@dataclass
class Still:
    seconds: float
    jpeg: bytes

    def to_blocks(self) -> list[dict]:
        return [
            {"type": "text", "text": f"t={self.seconds:.2f}s"},
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": base64.b64encode(self.jpeg).decode("ascii"),
                },
            },
        ]


class Renderer(Protocol):
    def build_audio(self, job_dir: Path) -> str: ...
    def render_stills(self, job_dir: Path, times: list[float]) -> list[Still]: ...
    def render_final(self, job_dir: Path, name: str) -> Scorecard: ...


class KitRenderer:
    """The real one: runs node and python in the job directory."""

    def __init__(self, kit_root: Path = KIT_ROOT, timeout: int = 1800) -> None:
        self.kit_root = Path(kit_root)
        self.timeout = timeout

    def _run(self, job_dir: Path, cmd: list[str]) -> subprocess.CompletedProcess:
        env = dict(os.environ)
        env.setdefault("NODE_ENV", "production")
        return subprocess.run(
            cmd, cwd=job_dir, env=env, capture_output=True, text=True,
            timeout=self.timeout, shell=False,
        )

    def prepare(self, job_dir: Path) -> None:
        """Lay out a job directory from the kit without copying node_modules.

        node_modules is hundreds of megabytes; copying it per job would dominate
        the run time. The kit's own copy is reused in place via NODE_PATH and by
        running render.mjs from the kit root with --project.
        """
        job_dir.mkdir(parents=True, exist_ok=True)
        for rel in ("src", "public", "package.json", "tsconfig.json",
                    "score.py", "scorelib.py", "gate.py"):
            src = self.kit_root / rel
            dst = job_dir / rel
            if dst.exists() or not src.exists():
                continue
            if src.is_dir():
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)

    def build_audio(self, job_dir: Path) -> str:
        p = self._run(job_dir, ["python", "score.py"])
        if p.returncode != 0:
            raise RuntimeError(f"build_audio failed:\n{p.stderr.strip() or p.stdout.strip()}")
        return (p.stdout or p.stderr).strip()

    def render_stills(self, job_dir: Path, times: list[float]) -> list[Still]:
        if not times:
            raise ValueError("render_stills needs at least one time")
        if len(times) > MAX_STILLS_PER_CALL:
            raise ValueError(f"at most {MAX_STILLS_PER_CALL} stills per call")
        cmd = ["node", str(self.kit_root / "render.mjs"), "--stills",
               *[f"{t:g}" for t in times], "--format", "jpeg", "--width", str(STILL_WIDTH)]
        p = self._run(job_dir, cmd)
        if p.returncode != 0:
            raise RuntimeError(f"render_stills failed:\n{p.stderr.strip()}")
        stills: list[Still] = []
        for t in times:
            f = job_dir / "out" / "stills" / f"t{t:.2f}.jpg"
            if not f.is_file():
                raise RuntimeError(f"expected still not written: {f}")
            stills.append(Still(seconds=t, jpeg=f.read_bytes()))
        return stills

    def render_final(self, job_dir: Path, name: str) -> Scorecard:
        safe = Path(name).name
        if not safe.endswith(".mp4"):
            safe += ".mp4"
        cmd = ["node", str(self.kit_root / "render.mjs"), "--final", "--name", safe, "--json"]
        p = self._run(job_dir, cmd)
        line = next((l for l in reversed(p.stdout.splitlines()) if l.strip().startswith("{")), "")
        if not line:
            raise RuntimeError(f"render_final printed no JSON:\n{p.stderr.strip()}")
        return Scorecard(**{k: v for k, v in json.loads(line).items()
                            if k in Scorecard.__dataclass_fields__})
