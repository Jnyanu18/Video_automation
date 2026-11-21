"""The JSON-project renderer: the skill's starter, driven from a job directory.

This is the second of the two render paths the skill describes.

  * `kit.KitRenderer` - the model writes `src/film.tsx` and `score.py`. Maximum
    expressive range, because the model writes the picture in code.
  * `ProjectRenderer` (here) - the model writes `project.json` only. The scenes are
    drawn by components that already exist and are already reviewed, so nothing the
    model emits is executed as code. Copy, colour and timing stay editable by a
    client afterwards, which the .tsx path cannot offer.

Prefer this path. Fall back to the kit when the concept genuinely needs a motion the
registered scene kinds cannot express; the skill calls that custom-component mode.

Everything shells out to the starter, so the schema stays the single source of truth:
`validateProject()` is the only validator, and it is the same one the starter's own
CLI uses. Nothing is re-implemented here.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

from .kit import MAX_STILLS_PER_CALL, STILL_WIDTH, Scorecard, Still

SKILL_ROOT = Path(os.environ.get("MOTION_SKILL_ROOT", r"J:\ai editor\skills\motion-director"))
PROJECT_FILE = "project.json"


class ProjectError(RuntimeError):
    pass


def _npx(args: list[str], cwd: Path, timeout: int) -> subprocess.CompletedProcess:
    env = dict(os.environ)
    env.setdefault("NODE_ENV", "production")
    return subprocess.run(
        ["npx", "--no-install", *args],
        cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout, shell=os.name == "nt",
    )


class ProjectRenderer:
    """Implements the same Renderer protocol the director already calls."""

    def __init__(self, skill_root: Path = SKILL_ROOT, timeout: int = 1800) -> None:
        self.skill_root = Path(skill_root)
        self.starter = self.skill_root / "starter"
        self.scripts = self.skill_root / "scripts"
        self.timeout = timeout

    # -- setup ---------------------------------------------------------
    def prepare(self, job_dir: Path) -> None:
        job_dir = Path(job_dir)
        job_dir.mkdir(parents=True, exist_ok=True)
        (job_dir / "out").mkdir(exist_ok=True)
        if not (self.starter / "node_modules").is_dir():
            raise ProjectError(
                f"The starter has no node_modules. Run `npm ci` in {self.starter} once."
            )

    # -- validation ----------------------------------------------------
    def validate(self, job_dir: Path, final: bool = False) -> str:
        """Run the starter's own validateProject. Returns its one-line summary."""
        f = Path(job_dir) / PROJECT_FILE
        if not f.is_file():
            raise ProjectError("write project.json before validating it")
        args = ["tsx", str(self.scripts / "validate.ts"), str(f)]
        if final:
            args.append("--final")
        p = _npx(args, self.starter, 180)
        if p.returncode != 0:
            raise ProjectError(_clean(p.stderr or p.stdout))
        return (p.stdout or "").strip()

    # -- the Renderer protocol ------------------------------------------
    def build_audio(self, job_dir: Path) -> str:
        """The project path has no score to synthesise: cues reference staged assets.

        Returning a sentence rather than raising keeps the director's loop honest -
        it asked a reasonable question and gets a real answer instead of an error it
        might try to 'fix' by inventing a score.
        """
        return ("No score is built on the project path. Sound comes from audio.cues "
                "referencing staged assets, and from audio.voiceover. Set a cue's from/"
                "durationInFrames on the same frames as the scene it belongs to.")

    def render_stills(self, job_dir: Path, times: list[float]) -> list[Still]:
        if not times:
            raise ProjectError("render_stills needs at least one time")
        if len(times) > MAX_STILLS_PER_CALL:
            raise ProjectError(f"at most {MAX_STILLS_PER_CALL} stills per call")
        job_dir = Path(job_dir)
        project = json.loads((job_dir / PROJECT_FILE).read_text(encoding="utf-8"))
        fps = int(project["canvas"]["fps"])
        total = int(project["canvas"]["durationInFrames"])
        frames: list[int] = []
        for t in times:
            f = int(round(float(t) * fps))
            # The director thinks in seconds; the composition is bounded in frames.
            # Clamp rather than fail, so one out-of-range request does not throw the
            # whole look-and-fix pass away.
            frames.append(max(0, min(total - 1, f)))

        out_dir = job_dir / "out" / "stills"
        args = ["tsx", str(self.scripts / "render-stills.ts"), str(job_dir / PROJECT_FILE),
                str(out_dir), *[str(f) for f in frames],
                "--scale", f"{STILL_WIDTH / int(project['canvas']['width']):.4f}"]
        chrome = os.environ.get("CHROME_PATH")
        if chrome:
            args += ["--browser", chrome]
        p = _npx(args, self.starter, self.timeout)
        if p.returncode != 0:
            raise ProjectError(_clean(p.stderr or p.stdout))
        payload = json.loads((p.stdout or "").strip().splitlines()[-1])

        stills: list[Still] = []
        for t, entry in zip(times, payload["stills"]):
            path = Path(entry["path"])
            if not path.is_file():
                raise ProjectError(f"expected still not written: {path}")
            stills.append(Still(seconds=float(t), jpeg=path.read_bytes()))
        return stills

    def render_final(self, job_dir: Path, name: str) -> Scorecard:
        job_dir = Path(job_dir)
        f = job_dir / PROJECT_FILE
        project = json.loads(f.read_text(encoding="utf-8"))
        try:
            self.validate(job_dir, final=True)
        except ProjectError as e:
            return Scorecard(error=str(e))

        # The name comes from the model. Strip separators, then collapse dot runs and
        # leading dots, so "../../x.mp4" becomes "x.mp4" rather than "....x.mp4" - it
        # could not escape either way, since this is joined to out/, but a file called
        # "....x.mp4" is a bug report waiting to happen.
        safe = "".join(c for c in (name or "") if c.isalnum() or c in "._-")
        safe = re.sub(r"\.{2,}", ".", safe).lstrip("._-") or "film.mp4"
        if not safe.endswith(".mp4"):
            safe += ".mp4"
        out = job_dir / "out" / safe
        args = ["tsx", str(self.scripts / "render.ts"), str(f), str(out),
                "--approved-revision", str(int(project["revision"]))]
        chrome = os.environ.get("CHROME_PATH")
        if chrome:
            args += ["--browser", chrome]
        p = _npx(args, self.starter, self.timeout)
        if p.returncode != 0:
            return Scorecard(error=_clean(p.stderr or p.stdout))
        if not out.is_file():
            return Scorecard(error=f"the render reported success but wrote no file: {out}")

        canvas = project["canvas"]
        card = Scorecard(
            path=str(out),
            duration=round(int(canvas["durationInFrames"]) / int(canvas["fps"]), 3),
            fps=float(canvas["fps"]),
            width=int(canvas["width"]),
            height=int(canvas["height"]),
        )
        measured = _measure_loudness(out)
        if measured is None:
            # Be explicit rather than silently passing a film nobody measured.
            card.error = ("rendered, but loudness was not measured (ffmpeg with ebur128 "
                          "is needed to score -14 LUFS / -1.5 dBTP)")
        else:
            card.lufs, card.peak = measured
        return card


def _measure_loudness(mp4: Path) -> tuple[float, float] | None:
    """Integrated loudness and true peak, via ffmpeg's ebur128. None if unavailable."""
    try:
        p = subprocess.run(
            ["ffmpeg", "-nostats", "-i", str(mp4), "-filter_complex",
             "ebur128=peak=true", "-f", "null", "-"],
            capture_output=True, text=True, timeout=600,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    lufs = peak = None
    for line in reversed((p.stderr or "").splitlines()):
        s = line.strip()
        if lufs is None and s.startswith("I:") and "LUFS" in s:
            lufs = float(s.split()[1])
        elif peak is None and s.startswith("Peak:") and "dBFS" in s:
            peak = float(s.split()[1])
        if lufs is not None and peak is not None:
            break
    if lufs is None or peak is None:
        return None
    return lufs, peak


def _clean(text: str) -> str:
    """Keep the useful end of a node stack trace, not the whole thing."""
    lines = [l for l in (text or "").splitlines() if l.strip()]
    return "\n".join(lines[-12:]) if lines else "the renderer failed with no output"
