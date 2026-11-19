"""The motion-graphics lane: a prompt becomes an ordinary storyboard that the EXISTING approve/render path owns.

The browser (HyperFrames) render is stubbed with a tiny real mp4 so the lane can be tested without Chrome; every
other step (spec composition, validation, the project build, the plan, approval, the gate, the render) is real.
"""
from __future__ import annotations

import subprocess
import sys
import threading
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import api_server  # noqa: E402
from studio import analytics, health, motion_api, motion_reel  # noqa: E402

PROMPT = ("Still editing reels by hand. Cutting, captions, sound, posting. "
          "20 hrs saved every week. 3.2x organic traffic in six months.")


def make_mp4(path: Path, seconds: float = 3.0) -> None:
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"testsrc2=s=216x384:r=15:d={seconds}",
                    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", str(path)], check=True)


@pytest.fixture
def env(tmp_path, monkeypatch):
    work, renders = tmp_path / "work", tmp_path / "renders"
    work.mkdir()
    monkeypatch.delenv("EDITOR_MEDIA_ROOTS", raising=False)
    monkeypatch.setattr(health, "gemini_probe", lambda: {"status": "ONLINE", "detail": "test", "provider": "test"})
    monkeypatch.setattr(motion_api, "render_motion_project",
                        lambda project_dir, out_mp4, fps=30.0, quality="looks": make_mp4(Path(out_mp4)))
    app = api_server.create_app(tmp_path / "state.json", renders, work, start_scheduler=False)
    media = tmp_path / "media"
    media.mkdir()
    motion_api.register_motion_routes(app, app.state.store, work, renders, threading.Semaphore(1), [media])
    return {"app": app, "client": TestClient(app), "store": app.state.store, "tmp": tmp_path, "media": media}


def wait_ready(client, sb_id, timeout=90):
    for _ in range(int(timeout * 10)):
        sb = client.get(f"/api/editor/storyboard/{sb_id}").json()["data"]
        if sb["status"] != "processing":
            return sb
        time.sleep(0.1)
    raise AssertionError("motion job never finished")


# ------------------------------------------------------------------ D2-1: a prompt produces a storyboard
def test_prompt_becomes_a_motion_storyboard(env):
    c = env["client"]
    r = c.post("/api/editor/motion/reel", json={"prompt": PROMPT, "title": "AILO", "button": "Book a call",
                                                "url": "accelerationlogics.com"})
    assert r.status_code == 202, r.text
    sb_id = r.json()["storyboard_id"]
    sb = wait_ready(c, sb_id)
    assert sb["status"] == "ready", sb.get("error")
    assert sb["lane"] == "motion" and sb["approved"] is False and sb["approved_at"] is None
    assert sb["renders"] == [] and sb["render_job"] is None and sb["latest_render"] is None
    card = sb["storyboard"]
    assert card["scenes_count"] >= 3 and 12 <= card["duration"]["output_seconds"] <= 60
    assert card["scorecard"]["status"] in ("PASS", "WARN") and card["scorecard"]["failed_checks"] == []
    # the HyperFrames project was really built from the spec
    proj = Path(sb["workdir"]) / "motion"
    assert (proj / "index.html").is_file() and (proj / "reel.json").is_file()
    assert 'data-composition-id="main"' in (proj / "index.html").read_text(encoding="utf-8")


def test_the_motion_record_matches_the_footage_record_shape(env):
    sb = env["client"].post("/api/editor/motion/reel", json={"prompt": PROMPT}).json()["data"]
    for key in ("id", "status", "error", "video_path", "style", "prompt", "series", "storyboard", "workdir",
                "agent_reply", "events", "messages", "approved", "approved_at", "latest_render", "latest_preview",
                "renders", "render_job"):
        assert key in sb, f"motion record is missing {key}"


def test_an_empty_prompt_is_refused(env):
    assert env["client"].post("/api/editor/motion/reel", json={"prompt": "..."}).status_code == 400


def test_preview_does_not_create_anything(env):
    r = env["client"].post("/api/editor/motion/preview", json={"prompt": PROMPT})
    assert r.status_code == 200 and r.json()["storyboard"]["scenes_count"] >= 3
    assert env["store"].all("storyboards") == []


def test_composed_spec_always_validates():
    for prompt in (PROMPT, "One line only", "Ship faster, cut less, post more", "50% fewer edits. 2x reach."):
        motion_reel.validate(motion_api.compose_spec(prompt, title="Demo"))


def test_on_screen_text_never_carries_an_em_dash():
    spec = motion_api.compose_spec("Edit reels — by hand. Cutting — captions — sound.", title="A — B")
    motion_reel.validate(spec)  # validate refuses em dashes itself


# ------------------------------------------------------------------ D2-2: the EXISTING approval gate
def test_final_render_is_refused_until_the_motion_storyboard_is_approved(env):
    c = env["client"]
    sb_id = c.post("/api/editor/motion/reel", json={"prompt": PROMPT, "title": "AILO"}).json()["storyboard_id"]
    wait_ready(c, sb_id)

    blocked = c.post(f"/api/editor/storyboard/{sb_id}/render", json={"quality": "final"})
    assert blocked.status_code == 409
    assert blocked.json()["error"] == "NOT_APPROVED" and blocked.json()["ok"] is False

    ok = c.post(f"/api/editor/storyboard/{sb_id}/approve")
    assert ok.status_code == 200 and ok.json()["data"]["approved"] is True

    allowed = c.post(f"/api/editor/storyboard/{sb_id}/render", json={"quality": "final"})
    assert allowed.status_code == 202, allowed.text
    for _ in range(1200):
        job = c.get(f"/api/editor/storyboard/{sb_id}").json()["data"].get("render_job") or {}
        if job.get("status") in ("done", "failed"):
            break
        time.sleep(0.1)
    assert job["status"] == "done", job.get("error")
    sb = c.get(f"/api/editor/storyboard/{sb_id}").json()["data"]
    assert len(sb["renders"]) == 1 and sb["latest_render"]["quality"] == "final"
    assert (env["tmp"] / "renders" / f"{sb['latest_render']['render_id']}.mp4").is_file()


# ------------------------------------------------------------------ D2-3: the lane split
def test_overview_splits_the_lanes_and_changes_no_existing_number(env):
    store = env["store"]
    before = env["client"].get("/api/editor/overview").json()
    assert {l["key"]: l["count"] for l in before["lanes"]} == {"footage": 0, "motion": 0}

    store.put("storyboards", "old1", {"id": "old1", "status": "ready", "approved": False})  # pre-lane record
    store.put("storyboards", "old2", {"id": "old2", "status": "ready", "approved": True})
    store.put("storyboards", "f1", {"id": "f1", "lane": "footage", "status": "ready", "approved": False})
    store.put("storyboards", "m1", {"id": "m1", "lane": "motion", "status": "ready", "approved": False})
    store.put("storyboards", "m2", {"id": "m2", "lane": "motion", "status": "processing"})

    after = env["client"].get("/api/editor/overview").json()
    assert {l["key"]: l["count"] for l in after["lanes"]} == {"footage": 3, "motion": 2}
    assert after["kpis"]["storyboards"] == 5
    # every pre-existing figure still comes from the same places
    assert [p["key"] for p in after["pipeline"]] == [p["key"] for p in before["pipeline"]]
    assert after["kpis"].keys() == before["kpis"].keys()


def test_a_record_without_a_lane_counts_as_footage():
    assert analytics.lane_of({}) == "footage"
    assert analytics.lane_of({"lane": "nonsense"}) == "footage"
    assert analytics.lane_of({"lane": "motion"}) == "motion"


def test_both_footage_creation_paths_tag_their_lane():
    src = Path(api_server.__file__).read_text(encoding="utf-8")
    assert src.count('"error": None, "lane": "footage"') == 2


# ------------------------------------------------------------------ media containment (client-supplied specs)
def photos_spec(src: Path) -> dict:
    return {"name": "x", "scenes": [
        {"kind": "headline", "theme": "dark", "duration": 4.0, "lines": ["A *hook*"]},
        {"kind": "photos", "theme": "light", "duration": 4.0, "title": "Look", "images": [{"src": str(src), "label": "one"}]},
        {"kind": "cta", "theme": "dark", "duration": 4.5, "lines": ["*Go*"], "button": "Go", "url": "x.com"}]}


def test_a_spec_may_use_media_inside_this_tenants_roots(env, tmp_path):
    img = env["media"] / "shot.png"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=64x64:d=1",
                    "-frames:v", "1", str(img)], check=True)
    r = env["client"].post("/api/editor/motion/preview", json={"prompt": "a motion test", "spec": photos_spec(img)})
    assert r.status_code == 200, r.text


def test_a_spec_may_not_reach_a_file_outside_the_roots(env, tmp_path):
    outside = tmp_path / "other-tenant.png"
    outside.write_bytes(bytes([0x89, 0x50, 0x4E, 0x47]))
    for path in (outside, env["media"] / ".." / "other-tenant.png"):
        for route in ("/api/editor/motion/preview", "/api/editor/motion/reel"):
            r = env["client"].post(route, json={"prompt": "a motion test", "spec": photos_spec(path)})
            assert r.status_code == 400, f"{route} accepted {path}: {r.status_code} {r.text}"
    assert env["store"].all("storyboards") == []


def test_a_spec_may_not_reach_an_arbitrary_readable_file(env, tmp_path):
    secret = tmp_path / "secrets.env"
    secret.write_text("TOKEN=hunter2", encoding="utf-8")
    r = env["client"].post("/api/editor/motion/reel", json={"prompt": "a motion test", "spec": photos_spec(secret)})
    assert r.status_code == 400 and "outside" in r.text or "unsupported" in r.text
    assert env["store"].all("storyboards") == []


def test_every_src_in_the_spec_is_checked_not_just_photos(env, tmp_path):
    outside = tmp_path / "clip.mp4"
    make_mp4(outside, 1.0)
    spec = photos_spec(outside)
    spec["scenes"][1] = {"kind": "clips", "theme": "light", "duration": 4.0, "title": "Clips",
                         "clips": [{"src": str(outside), "start": 0, "label": "a"}]}
    assert env["client"].post("/api/editor/motion/reel", json={"prompt": "a motion test", "spec": spec}).status_code == 400


def test_media_inside_a_root_must_still_be_a_renderable_kind(env):
    """The photos copy keeps the source extension, so a readable non-image inside a root must not be copyable."""
    secret = env["media"] / "dropped.env"
    secret.write_text("TOKEN=hunter2", encoding="utf-8")
    r = env["client"].post("/api/editor/motion/reel", json={"prompt": "a motion test", "spec": photos_spec(secret)})
    assert r.status_code == 400 and "unsupported media type" in r.text, r.text

    clip = env["media"] / "inside.mp4"          # a video is renderable, but not by a photos scene
    make_mp4(clip, 1.0)
    r2 = env["client"].post("/api/editor/motion/reel", json={"prompt": "a motion test", "spec": photos_spec(clip)})
    assert r2.status_code == 400 and "unsupported media type" in r2.text, r2.text
    assert env["store"].all("storyboards") == []


def junction(link: Path, target: Path) -> bool:
    """A Windows directory junction, the way `J:\ai editor\automation` is one. False if the OS will not make it."""
    if not hasattr(subprocess, "run") or not sys.platform.startswith("win"):
        try:
            link.symlink_to(target, target_is_directory=True)
            return True
        except (OSError, NotImplementedError):
            return False
    return subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(target)],
                          capture_output=True, text=True).returncode == 0


def test_a_junction_does_not_change_the_answer_and_cannot_escape_a_root(env, tmp_path):
    img = env["media"] / "shot.png"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=64x64:d=1",
                    "-frames:v", "1", str(img)], check=True)
    link = tmp_path / "link-to-media"
    if not junction(link, env["media"]):
        pytest.skip("this OS/user cannot create a directory junction")
    # the SAME file, named through the junction, must get the SAME answer
    r = env["client"].post("/api/editor/motion/preview", json={"prompt": "a motion test", "spec": photos_spec(link / "shot.png")})
    assert r.status_code == 200, r.text

    # a junction INSIDE the root that points out of it must not become a way out
    outside = tmp_path / "other-tenant"
    outside.mkdir()
    escape = outside / "theirs.png"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=green:s=64x64:d=1",
                    "-frames:v", "1", str(escape)], check=True)
    if junction(env["media"] / "out", outside):
        r2 = env["client"].post("/api/editor/motion/reel",
                                json={"prompt": "a motion test", "spec": photos_spec(env["media"] / "out" / "theirs.png")})
        assert r2.status_code == 400, f"a junction walked out of the root: {r2.status_code} {r2.text}"
