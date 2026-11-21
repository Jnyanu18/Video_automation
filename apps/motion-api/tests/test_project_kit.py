"""The JSON-project render path. No node, no browser: the shell-out is faked."""
import json
from pathlib import Path

import pytest

from motion_api import project_kit
from motion_api.project_kit import ProjectError, ProjectRenderer

PROJECT = {
    "version": 1, "id": "demo", "revision": 3, "title": "Demo",
    "canvas": {"width": 1080, "height": 1920, "fps": 60, "durationInFrames": 900},
    "brand": {}, "style": {}, "assets": [], "scenes": [], "audio": {},
}


class FakeRun:
    def __init__(self, returncode=0, stdout="", stderr=""):
        self.returncode, self.stdout, self.stderr = returncode, stdout, stderr


@pytest.fixture()
def job(tmp_path, monkeypatch):
    d = tmp_path / "job"
    (d / "out").mkdir(parents=True)
    (d / "project.json").write_text(json.dumps(PROJECT), encoding="utf-8")
    (tmp_path / "skill" / "starter" / "node_modules").mkdir(parents=True)
    monkeypatch.delenv("CHROME_PATH", raising=False)
    return d


@pytest.fixture()
def renderer(tmp_path):
    return ProjectRenderer(skill_root=tmp_path / "skill")


def test_prepare_says_how_to_fix_a_missing_install(tmp_path):
    r = ProjectRenderer(skill_root=tmp_path / "nothing-installed")
    with pytest.raises(ProjectError, match="npm ci"):
        r.prepare(tmp_path / "job")


def test_validate_returns_the_starter_summary(job, renderer, monkeypatch):
    monkeypatch.setattr(project_kit, "_npx",
                        lambda *a, **k: FakeRun(stdout="Valid: demo revision 3\n"))
    assert renderer.validate(job) == "Valid: demo revision 3"


def test_validate_surfaces_the_schema_error(job, renderer, monkeypatch):
    monkeypatch.setattr(project_kit, "_npx",
                        lambda *a, **k: FakeRun(1, stderr="scenes: array must contain at least 1"))
    with pytest.raises(ProjectError, match="at least 1"):
        renderer.validate(job)


def test_validate_refuses_before_the_project_is_written(tmp_path, renderer):
    (tmp_path / "empty").mkdir()
    with pytest.raises(ProjectError, match="write project.json"):
        renderer.validate(tmp_path / "empty")


def test_seconds_become_frames_and_out_of_range_is_clamped(job, renderer, monkeypatch):
    """The director thinks in seconds; one bad time must not throw the pass away."""
    seen = {}

    def fake(args, cwd, timeout):
        seen["args"] = args
        out = job / "out" / "stills"
        out.mkdir(parents=True, exist_ok=True)
        stills = []
        for a in args:
            if a.isdigit():
                p = out / f"f{int(a):05d}.jpg"
                p.write_bytes(b"\xff\xd8jpeg")
                stills.append({"frame": int(a), "path": str(p)})
        return FakeRun(stdout=json.dumps({"stills": stills, "fps": 60, "durationInFrames": 900}))

    monkeypatch.setattr(project_kit, "_npx", fake)
    # 2s -> frame 120; 999s is past the end -> clamped to the last frame, 899
    stills = renderer.render_stills(job, [2.0, 999.0])
    frames = [a for a in seen["args"] if a.isdigit()]
    assert frames == ["120", "899"]
    assert [s.seconds for s in stills] == [2.0, 999.0]
    assert stills[0].jpeg == b"\xff\xd8jpeg"


def test_stills_are_capped_per_call(job, renderer):
    with pytest.raises(ProjectError, match="at most"):
        renderer.render_stills(job, [float(i) for i in range(17)])


def test_a_still_the_renderer_did_not_write_is_an_error(job, renderer, monkeypatch):
    monkeypatch.setattr(project_kit, "_npx", lambda *a, **k: FakeRun(
        stdout=json.dumps({"stills": [{"frame": 60, "path": str(job / "out" / "nope.jpg")}],
                           "fps": 60, "durationInFrames": 900})))
    with pytest.raises(ProjectError, match="not written"):
        renderer.render_stills(job, [1.0])


def test_build_audio_explains_itself_instead_of_failing(job, renderer):
    """A raised error here invites the model to 'fix' it by inventing a score."""
    msg = renderer.build_audio(job)
    assert "audio.cues" in msg and "No score" in msg


def test_final_render_is_refused_when_the_project_is_not_final_valid(job, renderer, monkeypatch):
    monkeypatch.setattr(project_kit, "_npx",
                        lambda *a, **k: FakeRun(1, stderr="Voiceover is pending; resolve it"))
    card = renderer.render_final(job, "film.mp4")
    assert card.path is None and card.ok is False
    assert "pending" in (card.error or "")


def test_final_render_passes_the_exact_revision_for_approval(job, renderer, monkeypatch):
    calls = []

    def fake(args, cwd, timeout):
        calls.append(args)
        if "validate.ts" in " ".join(args):
            return FakeRun(stdout="Valid")
        (job / "out" / "film.mp4").write_bytes(b"\x00\x00\x00\x18ftypmp42")
        return FakeRun(stdout="Approved export saved")

    monkeypatch.setattr(project_kit, "_npx", fake)
    monkeypatch.setattr(project_kit, "_measure_loudness", lambda p: (-14.1, -1.8))
    card = renderer.render_final(job, "film.mp4")
    render_args = calls[-1]
    assert "--approved-revision" in render_args
    assert render_args[render_args.index("--approved-revision") + 1] == "3"
    assert card.ok is True and card.duration == 15.0 and card.fps == 60.0


def test_an_unmeasured_render_is_reported_not_quietly_passed(job, renderer, monkeypatch):
    def fake(args, cwd, timeout):
        if "validate.ts" in " ".join(args):
            return FakeRun(stdout="Valid")
        (job / "out" / "film.mp4").write_bytes(b"\x00")
        return FakeRun(stdout="saved")

    monkeypatch.setattr(project_kit, "_npx", fake)
    monkeypatch.setattr(project_kit, "_measure_loudness", lambda p: None)
    card = renderer.render_final(job, "film.mp4")
    assert card.path is not None
    assert card.ok is False and "loudness was not measured" in card.error


def test_the_output_name_cannot_escape_the_job_directory(job, renderer, monkeypatch):
    written = {}

    def fake(args, cwd, timeout):
        if "validate.ts" in " ".join(args):
            return FakeRun(stdout="Valid")
        out = Path(args[args.index(str(job / "project.json")) + 1])
        written["out"] = out
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(b"\x00")
        return FakeRun(stdout="saved")

    monkeypatch.setattr(project_kit, "_npx", fake)
    monkeypatch.setattr(project_kit, "_measure_loudness", lambda p: (-14.0, -2.0))
    renderer.render_final(job, "../../escape.mp4")
    assert written["out"].parent == job / "out"
    assert ".." not in written["out"].name
