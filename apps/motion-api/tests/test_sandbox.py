"""The sandbox is the one place a model-authored string becomes a real path."""
import os

import pytest

from motion_api import sandbox


@pytest.fixture()
def job(tmp_path):
    d = tmp_path / "job"
    (d / "src" / "kit").mkdir(parents=True)
    return d


@pytest.mark.parametrize(
    "path",
    [
        "src/film.tsx",
        "score.py",
        "plan.md",
        "src/kit/figure.tsx",
        "src/kit/helpers.ts",
        r"src\film.tsx",  # Windows separators are normalised, not rejected
    ],
)
def test_allowed_paths(job, path):
    assert sandbox.resolve_write_path(job, path).is_relative_to(job.resolve())


@pytest.mark.parametrize(
    "path",
    [
        "../escape.tsx",
        "src/../../escape.tsx",
        "src/kit/../../../escape.tsx",
        r"..\..\escape.tsx",
        "/etc/passwd",
        r"C:\Windows\System32\drivers\etc\hosts",
        "J:/ai editor/automation/editor/api_server.py",
        "package.json",
        "render.mjs",
        "src/kit/nested/deep.tsx",
        "src/film.exe",
        "src/kit/.hidden.tsx",
        "",
        "   ",
        "src/fi\x00le.tsx",
    ],
)
def test_rejected_paths(job, path):
    with pytest.raises(sandbox.SandboxError):
        sandbox.resolve_write_path(job, path)


def test_write_actually_writes(job):
    p = sandbox.write(job, "src/film.tsx", "export const film = 1;\n")
    assert p.read_text(encoding="utf-8").startswith("export const film")
    assert p.is_relative_to(job.resolve())


def test_write_refuses_to_leave_the_job_dir(job, tmp_path):
    victim = tmp_path / "victim.tsx"
    victim.write_text("original", encoding="utf-8")
    with pytest.raises(sandbox.SandboxError):
        sandbox.write(job, "../victim.tsx", "overwritten")
    assert victim.read_text(encoding="utf-8") == "original"


@pytest.mark.skipif(os.name != "nt", reason="junctions are a Windows thing")
def test_junction_inside_the_job_is_not_a_way_out(job, tmp_path):
    """A junction planted under src/kit/ must not become an escape hatch.

    os.path.islink() returns False for a junction, which is exactly why the
    sandbox tests the reparse-point bit instead.
    """
    outside = tmp_path / "outside"
    outside.mkdir()
    link = job / "src" / "kit" / "link"
    rc = os.system(f'cmd /c mklink /J "{link}" "{outside}" >nul 2>&1')
    if rc != 0 or not link.exists():
        pytest.skip("could not create a junction here")
    with pytest.raises(sandbox.SandboxError):
        sandbox.resolve_write_path(job, "src/kit/link/evil.tsx")
