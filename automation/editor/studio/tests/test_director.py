"""The headless creative director: skills at runtime, tool safety, the queue, and one full job driven end to end.

The end-to-end test replaces Claude with a scripted client that makes the same tool calls Claude would. Everything
else is real: the job folder, the staged files, givemotion check and render, delivery, storyboard.json.
"""
from __future__ import annotations

import copy
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio import agent_bridge as ab  # noqa: E402
from studio import director_skills as skills  # noqa: E402
from studio import director_tools as dt  # noqa: E402
from studio import director_worker as dw  # noqa: E402

COMPOSITION = """<!doctype html>
<html data-width="1080" data-height="1920" data-fps="30" data-duration="2">
<head><style>
:root { --bg: #0b0d12; --ink: #fff; --accent: #ff8a4c; }
body { background: var(--bg); color: var(--ink); font-family: Inter, sans-serif; }
.scene { display: grid; place-items: center; }
h1 { font-size: 160px; margin: 0; letter-spacing: -0.03em; }
</style></head>
<body><section class="scene"><h1 id="t" data-split="chars">Fresh</h1></section>
<script>gm.timeline('.scene').from('#t .gm-char', { y: 140, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'expo.out' }, 0.1);</script>
</body></html>
"""


def _givemotion_ok() -> bool:
    npx = shutil.which("npx")
    if not npx:
        return False
    try:
        return subprocess.run([npx, "givemotion", "--version"], capture_output=True, text=True, timeout=120).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


@pytest.fixture
def queue(tmp_path, monkeypatch):
    q = tmp_path / "queue"
    q.mkdir()
    monkeypatch.setattr(ab, "QUEUE_DIR", q)
    return q


def _job(queue_dir: Path, **over) -> dict:
    job = {"id": "aj_" + "ab12cd34ef56", "user_id": "local", "status": "queued", "created_at": time.time(),
           "prompt": "A 2 second sting that says Fresh.", "kind": "motion", "format": "9:16", "duration": 2,
           "title": None, "clips": [], "assets": [], "reference_url": None, "reference_video_id": None,
           "reference_video_path": None, "audio_path": None, "direction": {}, "updates": [], "output": None, "error": None}
    job.update(over)
    ab.write_job(job)
    return job


# ------------------------------------------------------------------ skills at runtime
def test_core_skill_is_vendored_and_loaded():
    assert skills.available() is None, "editor/skills/givemotion/SKILL.md must ship with the engine"
    core = skills.core_text()
    assert "givemotion: HTML in, video out" in core
    assert "Lessons" in core  # client feedback principles always in the prompt


def test_skill_index_lists_technique_recipes():
    paths = {e["path"] for e in skills.index()}
    assert "givemotion/references/techniques/kinetic-type.md" in paths
    assert "director/critic-rubric.md" in paths


def test_read_skill_accepts_the_paths_the_skill_text_uses():
    a = skills.read("givemotion/references/techniques/logo-reveal.md")
    assert skills.read("references/techniques/logo-reveal.md") == a
    assert skills.read(".agents/skills/givemotion/references/techniques/logo-reveal.md") == a


@pytest.mark.parametrize("bad", ["../api_server.py", "givemotion/../../api_server.py", "/etc/passwd", "x.py", ""])
def test_read_skill_refuses_paths_outside_the_skills(bad):
    with pytest.raises(skills.SkillError):
        skills.read(bad)


def test_system_prompt_is_built_from_the_skill_files_and_cached():
    blocks = dw.system_blocks()
    assert blocks[-1]["cache_control"] == {"type": "ephemeral"}
    text = blocks[0]["text"]
    assert "<skills_always_loaded>" in text and "givemotion/references/techniques/kinetic-type.md" in text


# ------------------------------------------------------------------ tool safety
def test_validate_catches_missing_and_wrong_fields():
    assert dt.validate("write_file", {"path": "video.html"}) == "missing required field 'content'"
    assert "should be" in dt.validate("look", {"times": "1,2"})
    assert dt.validate("write_file", {"path": "a.html", "content": "x", "rogue": 1}) == "unknown field 'rogue'"
    assert dt.validate("write_file", {"path": "a.html", "content": "x"}) is None


def test_write_file_stays_inside_the_project(queue):
    ctx = dt.prepare_context(_job(queue))
    out, err = dt.run_tool(ctx, "write_file", {"path": "../escape.html", "content": "x"})
    assert err and "inside the project" in out
    out, err = dt.run_tool(ctx, "write_file", {"path": "evil.py", "content": "x"})
    assert err
    out, err = dt.run_tool(ctx, "write_file", {"path": "media/clip01.mp4.html", "content": "x"})
    assert err and "media/" in out
    out, err = dt.run_tool(ctx, "write_file", {"path": "video.html", "content": "<p>a</p>"})
    assert not err
    out, err = dt.run_tool(ctx, "write_file", {"path": "video.html", "content": "<p>b</p>", "append": True})
    assert (ctx.build / "video.html").read_text(encoding="utf-8") == "<p>a</p><p>b</p>"


def test_client_files_are_staged_under_media(queue, tmp_path):
    clip = tmp_path / "My Wedding Clip.mov"
    subprocess.run(["ffmpeg", "-hide_banner", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=320x240:d=1",
                    "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-shortest", "-c:v", "libx264", "-c:a", "aac",
                    str(clip)], check=True)
    logo = tmp_path / "logo.png"
    subprocess.run(["ffmpeg", "-hide_banner", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=64x64",
                    "-frames:v", "1", str(logo)], check=True)
    ctx = dt.prepare_context(_job(queue, kind="edit", clips=[str(clip)], assets=[str(logo)]))
    names = {m["name"]: m for m in ctx.media}
    assert "media/clip01.mov" in names and names["media/clip01.mov"]["has_audio"] is True
    assert names["media/clip01.mov"]["original_name"] == "My Wedding Clip.mov"
    assert "media/image01.png" in names
    assert (ctx.build / "media" / "clip01.mov").is_file()


def test_make_captions_moves_words_to_the_edited_timeline(queue):
    ctx = dt.prepare_context(_job(queue))
    ctx.words["media/clip01.mp4"] = [{"word": "hello", "start": 10.0, "end": 10.4},
                                     {"word": "world", "start": 10.5, "end": 10.9},
                                     {"word": "later", "start": 30.0, "end": 30.3}]
    dt.run_tool(ctx, "make_captions", {"segments": [{"name": "media/clip01.mp4", "from": 10.0, "duration": 2.0, "at": 4.0}]})
    words = json.loads((ctx.build / "captions.json").read_text(encoding="utf-8"))
    assert [w["word"] for w in words] == ["hello", "world"]
    assert words[0]["start"] == 4.0 and words[1]["end"] == pytest.approx(4.9)


def test_deliver_refuses_without_a_render(queue):
    ctx = dt.prepare_context(_job(queue))
    out, err = dt.run_tool(ctx, "deliver", {"note": "Here it is", "scenes": [{"start": 0, "end": 2, "title": "Hook"}]})
    assert err and "render" in out
    assert ab.read_job(ctx.id)["status"] == "queued"


def test_a_crashing_tool_comes_back_as_an_error_not_an_exception(queue, monkeypatch):
    ctx = dt.prepare_context(_job(queue))
    monkeypatch.setitem(dt.HANDLERS, "list_skills", lambda ctx, **_: 1 / 0)
    out, err = dt.run_tool(ctx, "list_skills", {})
    assert err and "ZeroDivisionError" in out


# ------------------------------------------------------------------ the queue
def test_claim_is_exclusive(queue):
    job = _job(queue)
    assert dw.claim(job["id"])["status"] == "working"
    assert dw.claim(job["id"]) is None


def test_interrupted_jobs_are_requeued_once_then_failed(queue):
    job = _job(queue)
    dw.claim(job["id"])
    assert dw.recover_orphans() == 1
    assert ab.read_job(job["id"])["status"] == "queued"
    dw.claim(job["id"])
    dw.recover_orphans()
    assert ab.read_job(job["id"])["status"] == "failed"


def test_start_background_needs_a_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setenv("DIRECTOR_WORKER", "auto")
    assert dw.start_background() is None


def test_rolling_cache_breakpoint_is_only_on_the_newest_user_block():
    msgs = [{"role": "user", "content": [{"type": "text", "text": "a"}]},
            {"role": "assistant", "content": [{"type": "text", "text": "b"}]},
            {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "x", "content": []}]}]
    dw._move_cache_breakpoint(msgs)
    dw._move_cache_breakpoint(msgs)
    assert "cache_control" not in msgs[0]["content"][0]
    assert msgs[2]["content"][-1]["cache_control"] == {"type": "ephemeral"}


# ------------------------------------------------------------------ one job, end to end
class ScriptedClaude:
    """Stands in for the API: returns scripted turns and records every request."""

    def __init__(self, turns):
        self.turns = list(turns)
        self.requests = []
        self.messages = self

    def create(self, **kw):
        self.requests.append(copy.deepcopy(kw))  # the real API serialises at call time; later turns edit the list
        content = self.turns.pop(0)
        return {"content": content, "stop_reason": "tool_use" if any(b["type"] == "tool_use" for b in content) else "end_turn",
                "usage": {"input_tokens": 1000, "output_tokens": 500, "cache_creation_input_tokens": 0,
                          "cache_read_input_tokens": 8000}}


def _use(i, name, **inp):
    return {"type": "tool_use", "id": f"tu{i}", "name": name, "input": inp}


@pytest.mark.skipif(not _givemotion_ok(), reason="givemotion CLI not available")
def test_a_plain_brief_becomes_a_delivered_film(queue):
    job = _job(queue)
    dw.claim(job["id"])
    fake = ScriptedClaude([
        [_use(1, "progress", text="Reading your brief.", stage=1), _use(2, "list_skills"),
         _use(3, "read_skill", path="givemotion/references/techniques/kinetic-type.md")],
        [_use(4, "write_file", path="video.html", content=COMPOSITION)],
        [_use(5, "check")],
        [_use(6, "progress", text="Rendering your film.", stage=5), _use(7, "render")],
        [_use(8, "deliver", note="Your sting is ready.",
              scenes=[{"start": 0, "end": 2, "title": "Fresh", "action": "word slams in", "on_screen": "Fresh"}])],
    ])
    result = dw.run_job(job["id"], fake)

    assert result["status"] == "done", json.dumps(json.loads((queue / job["id"] / "director_log.json").read_text()), indent=1)
    done = ab.read_job(job["id"])
    assert done["status"] == "done" and done["output"]["duration_s"] == pytest.approx(2.0, abs=0.1)
    assert (queue / job["id"] / "output.mp4").stat().st_size > 1000
    assert json.loads((queue / job["id"] / "storyboard.json").read_text())["scenes"][0]["title"] == "Fresh"
    # nothing the client can read names the model or the vendor
    public = json.dumps(ab.public_job(done)).lower()
    assert "claude" not in public and "anthropic" not in public
    # the requests were shaped for Opus 5.5: effort set, cached system prompt, rolling breakpoint, eager tool streaming
    first = fake.requests[0]
    assert first["output_config"] == {"effort": "high"} and first["model"] == dw.model_name()
    assert first["system"][-1]["cache_control"] == {"type": "ephemeral"}
    assert any(t.get("eager_input_streaming") for t in first["tools"])
    later = fake.requests[2]["messages"]
    assert later[-1]["content"][-1]["cache_control"] == {"type": "ephemeral"}
    # the skill it asked for came back as the real file
    tool_results = fake.requests[1]["messages"][-1]["content"]
    assert any("kinetic" in json.dumps(r).lower() for r in tool_results)


def test_a_director_that_never_delivers_fails_the_job_cleanly(queue):
    job = _job(queue)
    dw.claim(job["id"])
    fake = ScriptedClaude([[{"type": "text", "text": "thinking"}]] * 4)
    result = dw.run_job(job["id"], fake)
    assert result["status"] == "failed"
    failed = ab.read_job(job["id"])
    assert failed["status"] == "failed" and "claude" not in json.dumps(failed).lower()
