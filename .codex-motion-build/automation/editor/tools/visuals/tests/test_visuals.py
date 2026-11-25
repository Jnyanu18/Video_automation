import json, os, shutil, subprocess, sys
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
from tools import visuals as V
from tools.visuals import snippets
from tools.visuals.providers import LocalFolderProvider, StockAPIProvider, ChainProvider

PLAN = {"version": 1, "source": {"path": "in.mp4", "duration": 40.0, "width": 1920, "height": 1080, "fps": 30},
        "output": {"width": 1080, "height": 1920, "fps": 30}, "keep": [{"id": "k1", "start": 0, "end": 40}],
        "captions": [], "overlays": [], "notes": ""}

def mkwords(text, t0):
    out, t = [], t0
    for w in text.split():
        out.append({"word": w, "start": round(t, 2), "end": round(t + 0.3, 2)}); t += 0.33
    return out

WORDS = (mkwords("So um I think it is important to be honest.", 0.0)
         + mkwords("Last summer we drove the truck through Mumbai city streets to deliver 500 packages.", 5.0)
         + mkwords("Honestly I feel like the idea is maybe good.", 12.0)
         + mkwords("Our drone flew over the coconut farm at sunrise.", 20.0))
TR = {"words": WORDS}

def test_tools_interface():
    assert set(V.TOOLS) == {"suggest_broll_slots", "add_overlay", "add_title", "add_lower_third", "add_diagram"}
    for t in V.TOOLS.values():
        assert callable(t["fn"]) and t["description"] and t["input_schema"]["type"] == "object"

def test_suggest_default_scorer():
    r = V.suggest_broll_slots(PLAN, transcript=TR)
    slots = r["result"]["slots"]
    assert slots and r["plan"] == PLAN
    texts = " ".join(s["text"] for s in slots)
    assert "Mumbai" in texts and "drone" in texts
    assert "important to be honest" not in texts
    for s in slots:
        assert 1.0 <= s["end"] - s["start"] <= 4.0 and s["query"]

def test_suggest_pluggable_scorer_and_constraints():
    r = V.suggest_broll_slots(PLAN, transcript=TR, scorer=lambda t: 0.9, max_slots=2, min_gap=3.0)
    sl = r["result"]["slots"]
    assert len(sl) == 2 and sl[1]["start"] - sl[0]["end"] >= 3.0
    plan = json.loads(json.dumps(PLAN)); plan["overlays"] = [{"id": "o1", "kind": "title", "start": 5, "end": 9, "asset": "t", "params": {}}]
    r = V.suggest_broll_slots(plan, transcript=TR, scorer=lambda t: 0.9, max_slots=9, min_gap=0)
    assert all(not (s["start"] < 9 and s["end"] > 5) for s in r["result"]["slots"])

def test_suggest_skips_cut_and_empty():
    plan = json.loads(json.dumps(PLAN)); plan["keep"] = [{"id": "k", "start": 0, "end": 10}]
    r = V.suggest_broll_slots(plan, transcript=TR, scorer=lambda t: 1.0, max_slots=9)
    assert all(s["start"] < 10 for s in r["result"]["slots"])
    assert V.suggest_broll_slots(PLAN, transcript=None)["warnings"]

def test_segments_input_and_llm_scorer_fallback():
    class Bad:
        class messages:
            @staticmethod
            def create(**k): raise RuntimeError("no key")
    sc = V.make_llm_scorer(Bad())
    segs = {"segments": [{"text": "We flew a drone over the farm at sunrise", "start": 3, "end": 6}]}
    assert V.suggest_broll_slots(PLAN, transcript=segs, scorer=sc)["result"]["slots"]
    class Good:
        class messages:
            @staticmethod
            def create(**k):
                class M: content = [type("C", (), {"text": '{"score": 0.77, "reason": "r"}'})]
                return M
    assert V.make_llm_scorer(Good())("anything at all here ok") == (0.77, "r")

def test_local_provider_and_candidates(tmp_path):
    (tmp_path / "drone_farm_sunrise.mp4").write_bytes(b"x")
    (tmp_path / "city.mp4").write_bytes(b"x")
    (tmp_path / "city.json").write_text(json.dumps({"tags": ["mumbai", "street"], "duration": 5}))
    p = LocalFolderProvider(tmp_path)
    assert p.search("drone farm")[0]["title"] == "drone_farm_sunrise"
    assert p.search("mumbai street")[0]["title"] == "city"
    assert p.search("nothing") == []
    with pytest.raises(NotImplementedError):
        StockAPIProvider().search("x")
    assert ChainProvider(StockAPIProvider(), p).search("drone")
    r = V.suggest_broll_slots(PLAN, transcript=TR, provider=p)
    assert any(s.get("candidates") for s in r["result"]["slots"])
    r2 = V.suggest_broll_slots(PLAN, transcript=TR, provider=StockAPIProvider())
    assert any("not implemented" in w for w in r2["warnings"])

def test_add_overlay_pure_and_validation(tmp_path):
    before = json.dumps(PLAN, sort_keys=True)
    r = V.add_title(PLAN, "Hello <b>World</b>", 1, 4, subtitle="sub", workdir=str(tmp_path))
    assert json.dumps(PLAN, sort_keys=True) == before
    o = r["plan"]["overlays"][0]
    assert o["id"] == "o1" and o["kind"] == "title" and o["params"]["text"].startswith("Hello")
    html = Path(r["result"]["html_path"]).read_text()
    assert "&lt;b&gt;" in html and "<b>" not in html
    r2 = V.add_lower_third(r["plan"], "Jnyan", 5, 9, subtitle="Founder")
    assert [x["id"] for x in r2["plan"]["overlays"]] == ["o1", "o2"]
    assert V.add_overlay(PLAN, "bogus", 0, 1)["result"].get("error")
    assert V.add_overlay(PLAN, "title", 5, 5)["result"].get("error")
    assert V.add_overlay(PLAN, "broll", 1, 2)["result"].get("error")
    w = V.add_overlay(PLAN, "broll", 1, 99, asset="/nope.mp4")
    assert w["plan"]["overlays"][0]["end"] == 40.0 and len(w["warnings"]) == 2
    ov = V.add_title(r["plan"], "Again", 2, 3)
    assert any("overlaps" in x for x in ov["warnings"])

def test_snippets_local_gsap_no_cdn():
    for h in (snippets.title_html("T", "s"), snippets.lower_third_html("N", "r"),
              snippets.graphic_html("faster", "10x"), snippets.graphic_html("Look!", variant="callout", position="center")):
        assert 'src="vendor/gsap.min.js"' in h and "http" not in h.split("<style>")[0]
        assert "window.__timelines" in h and 'data-composition-id' in h
    for kind in ("title", "lower-third", "graphic"):
        snippets.overlay_html({"id": "o9", "kind": kind, "start": 0, "end": 3, "params": {"text": "x", "name": "y"}})

@pytest.mark.skipif(not (shutil.which("npx") and os.path.exists("/usr/bin/google-chrome") and (ROOT / "app/node_modules/hyperframes").exists()),
                    reason="hyperframes/chrome unavailable")
@pytest.mark.parametrize("kind", ["lower-third"])
def test_hyperframes_render(tmp_path, kind):
    h = snippets.overlay_html({"id": "r1", "kind": kind, "start": 0, "end": 2, "params": {"name": "Jnyan", "subtitle": "Founder, AILO"}})
    d = snippets.write_project(tmp_path / "proj", h, "r1")
    out = tmp_path / "out.mp4"
    env = dict(os.environ, HYPERFRAMES_BROWSER_PATH="/usr/bin/google-chrome")
    p = subprocess.run(["npx", "hyperframes", "render", str(d), "-q", "draft", "-o", str(out)], cwd=ROOT / "app",
                       env=env, capture_output=True, text=True, timeout=240)
    assert p.returncode == 0, p.stdout[-800:] + p.stderr[-800:]
    assert out.exists() and out.stat().st_size > 1000
