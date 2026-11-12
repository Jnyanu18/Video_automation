"""The Vishnu studio bridge, against a throw-away fake studio folder (the real one is never touched)."""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import api_server  # noqa: E402
from agent import FakeClient, response  # noqa: E402
from services.api.editor_api import adapters  # noqa: E402
from studio import carousel, health, vstudio  # noqa: E402

CHECKS = "# Checks: Demo\n\nTwo checks.\n\n- [x] 0b Voice pick: the voice\n- [ ] Script: script.md and brief.md\n- [ ] Storyboard: stills/contact-sheet.png\n"


@pytest.fixture
def studio(tmp_path):
    root = tmp_path / "vishnu-studio"
    for d in ("lanes/carousel", "lanes/animated", "kit", "videos/_sfx", "videos/_music", "videos/demo/voice", "videos/demo/out",
              "videos/deck", "videos/deck/out", "videos/talk/raw", "node_modules/.bin"):
        (root / d).mkdir(parents=True)
    (root / "node_modules/.bin/remotion").write_text("")
    (root / "videos/demo/CHECKS.md").write_text(CHECKS, encoding="utf-8")
    (root / "videos/demo/brief.md").write_text("# Brief: A demo explainer\n", encoding="utf-8")
    (root / "videos/demo/scenes.json").write_text("[]")
    (root / "videos/demo/out/demo-9x16.mp4").write_bytes(b"x")
    (root / "videos/demo/out/notes.txt").write_text("not served")
    (root / "videos/deck/slides.md").write_text("# Slides: Deck\n\n## cover\ntitle: Hi\n", encoding="utf-8")
    (root / "videos/deck/out/slide-01.png").write_bytes(b"png")
    return root


def fake_vs(root, runner=None):
    return vstudio.VStudio(root, runner=runner or (lambda *a, **k: subprocess.CompletedProcess(a, 0, "ok\n", "")))


def test_library_infers_lanes_checks_and_serves_only_safe_outputs(studio):
    vs = fake_vs(studio)
    by = {v["slug"]: v for v in vs.videos()}
    assert by["demo"]["lane"] == "animated" and by["deck"]["lane"] == "carousel" and by["talk"]["lane"] == "talking-head"
    assert by["demo"]["title"] == "A demo explainer" and by["demo"]["signed_off"] is False
    assert [c["done"] for c in by["demo"]["checks"]] == [True, False, False]
    assert by["demo"]["outputs"] == ["demo-9x16.mp4"]                                    # notes.txt is not a served output
    assert vs.file_path("demo", "demo-9x16.mp4").is_file()
    for bad in (("demo", "../CHECKS.md"), ("demo", "notes.txt"), ("..", "slide-01.png"), ("demo", "slide-09.png")):
        with pytest.raises(vstudio.StudioError):
            vs.file_path(*bad)


def test_signoffs_change_only_the_named_line(studio):
    vs = fake_vs(studio)
    assert [c["done"] for c in vs.tick("demo", "Script", True)] == [True, True, False]
    assert (studio / "videos/demo/CHECKS.md").read_text(encoding="utf-8") == CHECKS.replace("- [ ] Script", "- [x] Script")
    assert [c["done"] for c in vs.tick("demo", "Script", False)] == [True, False, False]
    with pytest.raises(vstudio.StudioError, match="no stage"):
        vs.tick("demo", "Final", True)
    with pytest.raises(vstudio.StudioError):
        vs.tick("../demo", "Script", True)


def test_readiness_says_exactly_what_is_missing(studio, monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    r = fake_vs(studio).readiness()
    by = {i["id"]: i for i in r["items"]}
    assert by["folder"]["ok"] and by["remotion"]["ok"] and r["carousel_ready"] is (by["node"]["ok"] and by["py_pil"]["ok"])
    (studio / "node_modules/.bin/remotion").unlink()
    gone = fake_vs(studio).readiness()
    assert gone["carousel_ready"] is False and "pnpm install" in {i["id"]: i for i in gone["items"]}["remotion"]["fix"]
    assert vstudio.VStudio(None).readiness()["present"] is False


def test_music_is_found_only_when_tracks_exist_and_ids_are_stable(studio):
    vs = fake_vs(studio)
    assert vs.music() == []
    (studio / "videos/_music/bed.mp3").write_bytes(b"a")
    (studio / "videos/demo/music").mkdir()
    (studio / "videos/demo/music/track-1.mp3").write_bytes(b"b")
    (studio / "videos/demo/music/readme.txt").write_text("x")
    tracks = vs.music()
    assert {t["name"] for t in tracks} == {"bed", "track-1"} and tracks == vs.music()
    assert vs.music_path(tracks[0]["id"]).is_file()
    with pytest.raises(vstudio.StudioError):
        vs.music_path("nope")


def test_jobs_run_whitelisted_commands_and_report_failures(studio, monkeypatch):
    monkeypatch.setattr(vstudio.shutil, "which", lambda n: f"/bin/{n}")
    seen = {}

    def runner(argv, **kw):
        seen.update(argv=argv, cwd=kw["cwd"])
        return subprocess.CompletedProcess(argv, 1, "", "boom: something broke")
    vs = fake_vs(studio, runner)
    j = vs.start_job("carousel", vs.carousel_argv("deck"))
    for _ in range(50):
        if vs.job(j["id"])["status"] != "running":
            break
        time.sleep(0.05)
    done = vs.job(j["id"])
    assert done["status"] == "failed" and "boom" in done["error"] and seen["cwd"] == str(studio)
    assert seen["argv"][-2:] == ["lanes/carousel/render.py", "deck"]
    with pytest.raises(vstudio.StudioError):
        vs.carousel_argv("../etc")
    assert vs.install_argv()[1:] == ["install", "--frozen-lockfile"]


# ------------------------------------------------------------------------------------------ carousel slides
def test_validation_enforces_the_studio_rules():
    raw = {"slides": [
        {"kind": "step", "kicker": "ai", "title": "How to [[ship]] \U0001F680 an agent — safely (really)", "sub": "x" * 300, "bullets": ["one", "", "two", "three", "four", "five"]},
        {"title": "Step A", "bullets": ["a"]}, {"title": "Step B", "tip": "A real lesson"}, {"title": ""}]}
    s = carousel.validate(raw)
    assert [x["kind"] for x in s] == ["cover", "step", "step"] and "[[ship]]" in s[0]["title"]
    assert "—" not in s[0]["title"] and "\U0001F680" not in s[0]["title"] and len(s[0]["sub"]) <= 110 and len(s[0]["bullets"]) == 4
    assert s[1]["kicker"] == "STEP 1" and s[-1]["cta"] == "Save this for later."
    with pytest.raises(ValueError, match="at least 3"):
        carousel.validate({"slides": [{"title": "only"}]})
    with pytest.raises(ValueError):
        carousel.validate("nonsense")


def test_markdown_round_trips_through_the_studios_parser():
    slides = carousel.validate({"slides": [{"title": "Cover [[gold]]", "kicker": "TOPIC", "sub": "Sub line"},
                                           {"kicker": "STEP 1", "title": "First", "bullets": ["a b", "c d"], "tip": "A tip"},
                                           {"kicker": "STEP 2", "title": "Second", "cta": "Send this on"}]})
    back = carousel.parse(carousel.to_markdown(slides, "note"))
    assert [b["kind"] for b in back] == ["cover", "step", "step"] and back[1]["bullets"] == ["a b", "c d"] and back[2]["cta"] == "Send this on"
    assert back[0]["title"] == "Cover [[gold]]"


def test_the_real_studio_parser_agrees_with_ours():
    real = vstudio.find_studio(Path(__file__).resolve())
    if not real or not (real / "lanes/carousel/render.py").is_file():
        pytest.skip("the real studio is not next to this repo")
    import importlib.util
    sys.path.insert(0, str(real / "kit"))
    try:
        spec = importlib.util.spec_from_file_location("vs_carousel_render", real / "lanes/carousel/render.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
    except Exception as e:  # PIL etc. missing: not what this test is about
        pytest.skip(f"cannot import the studio's renderer: {e}")
    md = carousel.to_markdown(carousel.template("Title here", ["Sentence number one is long enough.", "Sentence number two is long enough.",
                                                               "Sentence number three is long enough.", "Sentence number four is long enough."]))
    assert mod.parse(md) == carousel.parse(md)


def test_template_and_llm_paths():
    sents = [f"This is sentence {i} and it has enough words." for i in range(1, 9)]
    t = carousel.generate(None, "Hello world", sents)
    assert t["generated_by"] == "template" and len(t["slides"]) >= 3
    c = FakeClient([response(json.dumps({"slides": [{"title": "T [[x]]"}, {"title": "A"}, {"title": "B", "cta": "Comment GO"}]}))])
    c.api_key, c.model = "k", "m"
    g = carousel.generate(c, "T", sents)
    assert g["generated_by"] == "llm" and g["slides"][-1]["cta"] == "Comment GO"
    bad = FakeClient([response("sorry, no")])
    bad.api_key, bad.model = "k", "m"
    assert carousel.generate(bad, "T", sents)["generated_by"] == "template"


# ------------------------------------------------------------------------------------------ through the API
@pytest.fixture
def env(tmp_path, studio, monkeypatch):
    monkeypatch.setenv("VISHNU_STUDIO_DIR", str(studio))
    monkeypatch.setattr(health, "gemini_probe", lambda: {"status": "ONLINE", "detail": "t", "provider": "t"})
    monkeypatch.setattr(vstudio.shutil, "which", lambda n: f"/bin/{n}")
    monkeypatch.setattr(vstudio.importlib.util, "find_spec", lambda n: object())
    work = tmp_path / "work"
    work.mkdir()
    app = api_server.create_app(tmp_path / "s.json", tmp_path / "r", work, start_scheduler=False)
    return app, TestClient(app), studio


def fake_render(studio):
    def runner(argv, cwd=None, **kw):
        if "carousel/render.py" in " ".join(argv):
            slug = argv[-1]
            out = Path(cwd) / "videos" / slug / "out"
            out.mkdir(parents=True, exist_ok=True)
            slides = (Path(cwd) / "videos" / slug / "slides.md").read_text(encoding="utf-8").count("## ")
            for i in range(slides):
                (out / f"slide-{i + 1:02d}.png").write_bytes(b"png")
            (out / "contact-sheet.png").write_bytes(b"png")
        return subprocess.CompletedProcess(argv, 0, "done\n", "")
    return runner


def wait_car(c, cid, timeout=20):
    end = time.time() + timeout
    while time.time() < end:
        car = next(x for x in c.get("/api/editor/vstudio/carousels").json()["carousels"] if x["id"] == cid)
        if car["status"] not in ("writing", "rendering"):
            return car
        time.sleep(0.1)
    raise AssertionError("carousel timed out")


def test_status_library_and_the_human_gate(env):
    app, c, studio = env
    s = c.get("/api/editor/vstudio/status").json()
    assert s["present"] and s["carousel_ready"] and s["videos"] == 3
    assert c.post("/api/editor/vstudio/videos/demo/gate", json={"stage": "Script", "done": True}).json()["checks"][1]["done"] is True
    assert c.post("/api/editor/vstudio/videos/demo/gate", json={"stage": "Nope"}).status_code == 404
    assert c.get("/api/editor/vstudio/file/demo/demo-9x16.mp4").status_code == 200
    assert c.get("/api/editor/vstudio/file/demo/notes.txt").status_code == 404
    assert c.get("/api/editor/vstudio/file/..%2Fdemo/slide-01.png").status_code in (404, 422)


def test_carousel_from_text_end_to_end(env, monkeypatch):
    app, c, studio = env
    app.state.vstudio.runner = fake_render(studio)
    monkeypatch.setattr(adapters, "_make_client", lambda: None)
    text = "Most founders build before they ask. Ask five people to pay first. If none will pay, you have your answer. Then build the smallest thing. Send it to a friend who is stuck."
    r = c.post("/api/editor/vstudio/carousel", json={"text": text, "title": "Validate before you build"})
    assert r.status_code == 202
    car = wait_car(c, r.json()["carousel"]["id"])
    assert car["status"] == "ready" and car["generated_by"] == "template" and "contact-sheet.png" in car["files"]
    slug = car["slug"]
    md = (studio / "videos" / slug / "slides.md").read_text(encoding="utf-8")
    assert md.count("## ") == len(car["slides"]) and "Check every line" in md
    assert "- [ ] Slides" in (studio / "videos" / slug / "CHECKS.md").read_text(encoding="utf-8")   # a person still signs it off
    assert c.get(f"/api/editor/vstudio/file/{slug}/slide-01.png").status_code == 200
    assert any(v["slug"] == slug and v["lane"] == "carousel" for v in c.get("/api/editor/vstudio/videos").json()["videos"])
    assert c.post(f"/api/editor/vstudio/videos/{slug}/gate", json={"stage": "Slides"}).json()["checks"][0]["done"] is True


def test_a_failed_render_is_reported_and_an_unready_studio_is_explained(env, monkeypatch):
    app, c, studio = env
    monkeypatch.setattr(adapters, "_make_client", lambda: None)
    app.state.vstudio.runner = lambda argv, **kw: subprocess.CompletedProcess(argv, 1, "", "remotion: browser download failed")
    r = c.post("/api/editor/vstudio/carousel", json={"text": "One sentence here. Two sentences here. Three sentences here. Four here.", "title": "x y"})
    car = wait_car(c, r.json()["carousel"]["id"])
    assert car["status"] == "failed" and "browser download failed" in car["error"]
    (studio / "node_modules/.bin/remotion").unlink()
    r = c.post("/api/editor/vstudio/carousel", json={"text": "a b c d. e f g h. i j k l."})
    assert r.status_code == 409 and r.json()["error"] == "STUDIO_NOT_READY" and "Install it from this screen" in r.json()["message"]
    assert c.post("/api/editor/vstudio/carousel", json={"text": "too short."}).status_code in (400, 409)


def test_install_job_uses_pnpm_with_a_frozen_lockfile(env):
    app, c, studio = env
    seen = {}
    app.state.vstudio.runner = lambda argv, **kw: (seen.update(argv=argv) or subprocess.CompletedProcess(argv, 0, "installed\n", ""))
    j = c.post("/api/editor/vstudio/install").json()["job"]
    for _ in range(40):
        got = c.get(f"/api/editor/vstudio/jobs/{j['id']}").json()["job"]
        if got["status"] != "running":
            break
        time.sleep(0.05)
    assert got["status"] == "done" and seen["argv"][1:] == ["install", "--frozen-lockfile"]
    assert c.get("/api/editor/vstudio/jobs/nope").status_code == 404


def test_library_music_goes_under_the_voice_and_revokes_approval(env, tmp_path, monkeypatch):
    app, c, studio = env
    bed = studio / "videos/_music/bed.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "sine=f=220:d=4", str(bed)], check=True)
    tracks = c.get("/api/editor/vstudio/music").json()["tracks"]
    assert [t["name"] for t in tracks] == ["bed"] and "path" not in tracks[0]
    # a ready storyboard to put it on
    work = tmp_path / "work"
    video = work / "v.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=15:d=4", "-f", "lavfi", "-i", "sine=f=300:d=4",
                    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(video)], check=True)
    store = app.state.store
    plan = {"version": 1, "source": {"path": str(video), "duration": 4.0, "width": 320, "height": 180, "fps": 15}, "output": {"width": 1080, "height": 1920, "fps": 15},
            "keep": [{"id": "k1", "start": 0.0, "end": 4.0}], "captions": [], "reframe": {"mode": "center", "track": []}, "zooms": [], "transitions": [], "overlays": [], "notes": ""}
    store.put("storyboards", "sb_m", {"id": "sb_m", "status": "ready", "error": None, "video_path": str(video), "style": "viral_hook_fast_pace", "prompt": "", "series": None,
                                      "plan": plan, "storyboard": None, "workdir": str(work / "sb_m"), "agent_reply": "", "events": [], "messages": [], "approved": True,
                                      "approved_at": 1.0, "latest_render": None, "latest_preview": None, "renders": [], "render_job": None})
    (work / "sb_m").mkdir()
    r = c.post("/api/editor/storyboard/sb_m/music", json={"track_id": tracks[0]["id"], "volume_db": -22})
    assert r.status_code == 200, r.text
    d = c.get("/api/editor/storyboard/sb_m?include_plan=true").json()["data"]
    assert d["plan"]["audio"]["music"]["volume_db"] == -22 and d["plan"]["audio"]["duck"]["enabled"] and d["approved"] is False and d["approval_reset"] is True
    assert c.post("/api/editor/storyboard/sb_m/music", json={"track_id": "nope"}).status_code == 404
    off = c.post("/api/editor/storyboard/sb_m/music", json={"track_id": None}).json()["data"]
    assert "music" not in c.get("/api/editor/storyboard/sb_m?include_plan=true").json()["data"]["plan"].get("audio", {}) and off["id"] == "sb_m"
