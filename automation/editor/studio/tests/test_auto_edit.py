"""Link/file -> transcript -> director -> storyboard, without network, API keys or a speech model."""
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
from studio import director, health, ingest, posts  # noqa: E402

SCRIPT = ["Hi I'm Vishnu and I'm the founder of Ascorp.", "I built Trade Palette and it has more than 2600 users.",
          "Putting AI inside a product is the easy part.", "The hard part is to trust it to act without breaking anything.",
          "Big companies like AWS and Google Cloud build their own agents.", "Users just ask and Ascorp shows what it will change.",
          "Only after they say yes it does it.", "We are live and have one customer deployed.",
          "People will no longer click through menus.", "They just ask an agent and get things done.", "Looking forward to hear from you."]


def build_transcript():
    words, t, sents = [], 0.5, []
    for line in SCRIPT:
        ws = line.split()
        start = t
        for w in ws:
            words.append({"word": w, "start": round(t, 3), "end": round(t + 0.32, 3)})
            t += 0.35
        sents.append({"start": start, "end": round(t - 0.03, 3), "text": line})
        t += 0.45
    return {"words": words, "segments": sents, "language": "en"}, round(t + 1.0, 1)


TRANSCRIPT, DURATION = build_transcript()
SENT = {i: s for i, s in enumerate(TRANSCRIPT["segments"])}


def good_plan():
    s = SENT
    return {"hook": {"text": "AI in your product is easy. Trusting it is hard."}, "speaker": {"name": "Vishnu", "role": "Founder, Ascorp"},
            "beats": [
                {"template": "counter", "start": s[1]["start"], "end": s[1]["end"] + 0.1, "value": 2600, "suffix": "+", "caption": "users on Trade Palette"},
                {"template": "versus", "start": s[2]["start"], "end": s[3]["end"], "left": {"tag": "EASY", "text": "Put AI in a product", "value": 1, "tone": "good"},
                 "right": {"tag": "HARD", "text": "Trust it to act", "value": 0.3, "tone": "bad"}},
                {"template": "brands", "start": s[4]["start"], "end": s[4]["end"] + 0.1, "top": ["AWS", "Google Cloud"], "top_caption": "build their own agents",
                 "bottom": "Ascorp", "bottom_caption": "the agent for everyone else"}],
            "zooms": [{"start": s[3]["start"], "end": s[3]["start"] + 2.0}], "sfx": [{"name": "whoosh", "at": 0.5}, {"name": "pop", "at": s[1]["start"]}],
            "cta": {"text": "Send this to a founder building with AI."}}


SFX = ["whoosh", "pop", "riser", "drop"]


# ------------------------------------------------------------------------------------------ director
def test_clean_repairs_and_drops_instead_of_guessing():
    raw = good_plan()
    raw["beats"] += [{"template": "flow", "start": SENT[3]["start"], "end": SENT[3]["end"], "steps": ["a", "b"]},       # overlaps the versus card
                     {"template": "nonsense", "start": 20, "end": 26},                                                   # unknown template
                     {"template": "counter", "start": 1.0, "end": 9.0, "value": 5, "caption": "too early for a card"}]  # before the speaker card ends
    raw["sfx"] += [{"name": "laser", "at": 3}, {"name": "pop", "at": s_at(SENT[1]["start"] + 0.2)}]
    plan, warn = director.clean(raw, DURATION, director.sentences(TRANSCRIPT), SFX)
    assert [b["template"] for b in plan["beats"]] == ["counter", "versus", "brands"]
    assert plan["beats"][0]["start"] >= 4.7 and plan["beats"][-1]["end"] <= DURATION - 2.6
    assert any("overlaps" in w for w in warn) and any("laser" in w for w in warn)
    assert [s["name"] for s in plan["sfx"]] == ["whoosh", "pop"]  # the second pop is under 1 s from the first
    assert plan["cta"]["end"] == DURATION and plan["hook"]["end"] == 2.6


def s_at(x):
    return round(x, 3)


def test_clean_caps_counts_and_snaps_times_to_sentences():
    raw = good_plan()
    raw["beats"] = [{"template": "counter", "start": SENT[1]["start"] + 0.4, "end": SENT[1]["end"] + 0.1, "value": 9, "caption": "x"},
                    {"template": "shift", "start": SENT[8]["start"] + 0.4, "end": SENT[9]["end"], "from": "Menus", "to": "Ask"}]
    plan, _ = director.clean(raw, DURATION, director.sentences(TRANSCRIPT), SFX)
    assert plan["beats"][0]["start"] == 4.7                                  # the speaker card owns the opening seconds
    assert plan["beats"][1]["start"] == round(SENT[8]["start"], 3)           # snapped onto the sentence start
    raw["zooms"] = [{"start": 6 + i * 4.0, "end": 8 + i * 4.0} for i in range(9)]
    assert len(director.clean(raw, DURATION, director.sentences(TRANSCRIPT), SFX)[0]["zooms"]) <= director.MAX_ZOOMS


def test_heuristic_planner_finds_the_speaker_numbers_and_contrast():
    plan, source, warn = director.make_plan(None, TRANSCRIPT, DURATION, "viral_hook_fast_pace", "", SFX)
    assert source == "heuristic" and any("no LLM" in w for w in warn)
    assert plan["speaker"] == {"name": "Vishnu", "role": "Founder, Ascorp"}
    kinds = {b["template"]: b for b in plan["beats"]}
    assert kinds["counter"]["value"] == 2600 and kinds["versus"]["left"]["tag"] == "EASY" and plan["cta"] and plan["sfx"][0]["name"] == "whoosh"


def test_llm_plan_is_used_when_valid_retried_when_not_json_and_replaced_when_useless():
    def client(*replies):
        c = FakeClient([response(r) for r in replies])
        c.api_key, c.model = "k", "m"
        return c
    plan, source, _ = director.make_plan(client(json.dumps(good_plan())), TRANSCRIPT, DURATION, "s", "", SFX)
    assert source == "llm" and len(plan["beats"]) == 3
    c = client("Sure! here you go", "```json\n" + json.dumps(good_plan()) + "\n```")
    assert director.make_plan(c, TRANSCRIPT, DURATION, "s", "", SFX)[1] == "llm" and len(c.calls) == 2   # one retry
    plan, source, warn = director.make_plan(client(json.dumps({"hook": {"text": "x"}, "beats": []})), TRANSCRIPT, DURATION, "s", "", SFX)
    assert source == "heuristic" and any("no usable diagram beats" in w for w in warn)


def test_no_speech_means_nothing_to_direct():
    with pytest.raises(ValueError, match="no speech"):
        director.make_plan(None, {"words": [], "segments": []}, 10.0, "s", "", SFX)


def test_every_planned_step_is_a_real_tool_call():
    from studio import recipes
    plan, _ = director.clean(good_plan(), DURATION, director.sentences(TRANSCRIPT), SFX)
    recipes.validate(director.base_steps() + director.to_steps(plan), adapters.collect_tools())


# ------------------------------------------------------------------------------------------ ingest
def test_urls_are_validated():
    assert ingest.validate_url("https://www.instagram.com/reel/abc/")
    for bad in ["http://instagram.com/reel/x", "https://evil.example.com/v.mp4", "file:///c:/x.mp4", "instagram.com/reel/x", "https://instagram.com.evil.io/x"]:
        with pytest.raises(ingest.IngestError):
            ingest.validate_url(bad)


class FakeRun:
    def __init__(self, tmp, fail=None):
        self.tmp, self.fail, self.cmds = tmp, fail, []

    def __call__(self, cmd, **kw):
        self.cmds.append(cmd)
        if self.fail:
            return subprocess.CompletedProcess(cmd, 1, "", self.fail)
        out = Path(self.tmp) / "instagram_ABC.mp4"
        out.write_bytes(b"video")
        return subprocess.CompletedProcess(cmd, 0, str(out) + "\n", "")


def test_download_builds_a_safe_command_and_reports_failures(tmp_path):
    run = FakeRun(tmp_path)
    p = ingest.download("https://www.instagram.com/reel/ABC/", tmp_path, runner=run)
    assert p.name == "instagram_ABC.mp4" and "--no-playlist" in run.cmds[0] and run.cmds[0][-1] == "https://www.instagram.com/reel/ABC/"
    with pytest.raises(ingest.IngestError, match="login"):
        ingest.download("https://www.instagram.com/reel/ABC/", tmp_path, runner=FakeRun(tmp_path, "ERROR: login required"))


def test_ingest_job_runs_in_the_background(tmp_path):
    jobs = ingest.IngestJobs(tmp_path, runner=FakeRun(tmp_path))
    j = jobs.start("https://www.instagram.com/reel/ABC/")
    end = time.time() + 5
    while time.time() < end and jobs.get(j["id"])["status"] == "running":
        time.sleep(0.05)
    assert jobs.get(j["id"])["status"] == "done" and jobs.get(j["id"])["path"].endswith("instagram_ABC.mp4")


# ------------------------------------------------------------------------------------------ posts
def test_sanitize_enforces_the_paste_ready_rules():
    dirty = "This is a game changer \u2014 really [your name] (about 100 characters) \U0001F680 \nSecond line."
    out = posts.sanitize(dirty)
    assert "\u2014" not in out and "[" not in out and "(" not in out and "game changer" not in out.lower() and "\U0001F680" not in out
    assert len(posts.sanitize("word " * 100, 40)) <= 41


def test_clean_limits_hashtags_and_lengths():
    raw = {"instagram": {"caption": "Hook line.\n\nBody. #a #b #c #d #e", "cover_text": "one two three four five six seven eight"},
           "youtube_short": {"title": "t" * 300, "description": "d"}, "x": {"post": "Hook #one #two and more " * 20, "reply": "r"}}
    out = posts.clean(raw)
    assert out["instagram"]["caption"].count("#") == 3 and len(out["youtube_short"]["title"]) <= 100
    assert len(out["x"]["post"]) <= 240 and out["x"]["post"].count("#") <= 1 and len(out["instagram"]["cover_text"]) <= 32


def test_posts_fall_back_to_a_template_and_use_the_llm_when_it_answers():
    t = posts.generate(None, "AI in your product is easy", ["First sentence.", "Second sentence."], "Title")
    assert t["generated_by"] == "template" and t["instagram"]["caption"].startswith("AI in your product is easy")
    c = FakeClient([response(json.dumps({"instagram": {"caption": "Trust is the hard part.\n\nWe ask before we act. #ai", "cover_text": "Trust it"},
                                         "youtube_short": {"title": "The hard part of AI", "description": "d"}, "x": {"post": "Trust is hard. Agree?", "reply": ""}}))])
    c.api_key, c.model = "k", "m"
    assert posts.generate(c, "h", ["s"], "t")["generated_by"] == "llm"


# ------------------------------------------------------------------------------------------ the whole chain through the API
@pytest.fixture
def env(tmp_path, monkeypatch):
    work = tmp_path / "work"
    work.mkdir()
    fx = tmp_path / "transcript.json"
    fx.write_text(json.dumps(TRANSCRIPT))
    monkeypatch.setenv("CE_TRANSCRIPT_FIXTURE", str(fx))
    monkeypatch.setattr(health, "gemini_probe", lambda: {"status": "ONLINE", "detail": "t", "provider": "t"})
    app = api_server.create_app(tmp_path / "s.json", tmp_path / "r", work, start_scheduler=False)
    v = work / "talk.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"testsrc2=s=320x180:r=15:d={DURATION}", "-f", "lavfi", "-i", f"sine=f=300:d={DURATION}",
                    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(v)], check=True)
    return app, TestClient(app), v, work


def wait_done(c, sb, timeout=90):
    end = time.time() + timeout
    while time.time() < end:
        d = c.get(f"/api/editor/storyboard/{sb}").json()["data"]
        if d["status"] != "processing":
            return d
        time.sleep(0.4)
    raise AssertionError("auto edit timed out: " + str(d.get("stage_text")))


def llm(monkeypatch, reply):
    c = FakeClient([response(reply)] * 3)
    c.api_key, c.model = "k", "m"
    monkeypatch.setattr(adapters, "_make_client", lambda: c)
    return c


def test_auto_edit_a_file_end_to_end(env, monkeypatch):
    _, c, video, _ = env
    llm(monkeypatch, json.dumps(good_plan()))
    r = c.post("/api/editor/reel/auto", json={"video_path": str(video)})
    assert r.status_code == 202
    d = wait_done(c, r.json()["storyboard_id"])
    assert d["status"] == "ready", d.get("error")
    assert d["director"]["source"] == "llm" and len(d["director"]["plan"]["beats"]) == 3
    full = c.get(f"/api/editor/storyboard/{d['id']}?include_plan=true").json()["data"]["plan"]
    kinds = [o["kind"] for o in full["overlays"]]
    assert kinds.count("diagram") == 3 and kinds.count("title") == 2 and "lower-third" in kinds       # hook + CTA titles, speaker card, 3 diagrams
    assert full["captions"] and len(full["audio"]["sfx"]) == 2 and full["audio"]["loudness"]["target_lufs"] == -14
    assert "Planned by the LLM director" in d["agent_reply"] and d["storyboard"]["growth_signals"]["sendability"]["status"] == "pass"
    stages = [e["text"] for e in d["events"] if e["type"] == "message"]
    assert any("Transcribing" in s for s in stages) and any("director" in s for s in stages)
    # approval gate still applies to the auto path
    assert c.post(f"/api/editor/storyboard/{d['id']}/render", json={"quality": "final"}).status_code == 409


def test_auto_edit_without_an_llm_uses_the_heuristic_director(env, monkeypatch):
    _, c, video, _ = env
    monkeypatch.setattr(adapters, "_make_client", lambda: None)
    d = wait_done(c, c.post("/api/editor/reel/auto", json={"video_path": str(video)}).json()["storyboard_id"])
    assert d["status"] == "ready" and d["director"]["source"] == "heuristic" and d["director"]["plan"]["beats"]
    assert any("no LLM" in w for w in d["director"]["warnings"])


def test_auto_edit_from_a_link(env, monkeypatch):
    app, c, video, work = env
    monkeypatch.setattr(adapters, "_make_client", lambda: None)
    monkeypatch.setattr(ingest, "ytdlp_path", lambda: "yt-dlp")
    dl = work / "ingested"
    dl.mkdir()

    def fake_run(cmd, **kw):
        out = dl / "instagram_XYZ.mp4"
        out.write_bytes(video.read_bytes())
        return subprocess.CompletedProcess(cmd, 0, str(out) + "\n", "")
    # the route closes over the app's IngestJobs: patch the module-level runner it uses
    monkeypatch.setattr(ingest, "download", lambda url, out_dir, on_progress=None, runner=None: Path(fake_run(["x"]).stdout.strip()))
    d = wait_done(c, c.post("/api/editor/reel/auto", json={"url": "https://www.instagram.com/reel/XYZ/"}).json()["storyboard_id"])
    assert d["status"] == "ready", d.get("error")
    assert d["source_url"] == "https://www.instagram.com/reel/XYZ/" and d["video_path"].endswith("instagram_XYZ.mp4")


def test_auto_edit_validates_input_and_explains_failures(env, monkeypatch):
    _, c, video, work = env
    assert c.post("/api/editor/reel/auto", json={}).status_code == 400
    assert c.post("/api/editor/reel/auto", json={"url": "https://x.com/a", "video_path": str(video)}).status_code == 400
    assert c.post("/api/editor/reel/auto", json={"url": "https://evil.example.com/v.mp4"}).status_code == 400
    assert c.post("/api/editor/reel/auto", json={"video_path": str(work.parent / "outside.mp4")}).status_code == 404
    monkeypatch.setenv("CE_TRANSCRIPT_FIXTURE", str(work / "empty.json"))
    (work / "empty.json").write_text(json.dumps({"words": []}))
    d = wait_done(c, c.post("/api/editor/reel/auto", json={"video_path": str(video)}).json()["storyboard_id"])
    assert d["status"] == "failed" and ("No speech" in d["error"] or "no words" in d["error"].lower() or "speech" in d["error"].lower())


def test_posts_endpoint(env, monkeypatch):
    _, c, video, _ = env
    llm(monkeypatch, json.dumps(good_plan()))
    sb = wait_done(c, c.post("/api/editor/reel/auto", json={"video_path": str(video)}).json()["storyboard_id"])["id"]
    monkeypatch.setattr(adapters, "_make_client", lambda: None)
    p = c.post(f"/api/editor/storyboard/{sb}/posts").json()["posts"]
    assert p["generated_by"] == "template" and p["instagram"]["caption"].startswith("AI in your product is easy")
    assert c.get(f"/api/editor/storyboard/{sb}").json()["data"]["posts"]["x"]["post"]
    assert c.post("/api/editor/storyboard/nope/posts").status_code == 404
