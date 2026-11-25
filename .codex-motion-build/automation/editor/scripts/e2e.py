"""End-to-end check: agent loop (scripted FakeClient standing in for Claude) -> REAL tools -> REAL render.

Not covered (needs an API key / network): real Claude decisions, real Whisper transcription.
Usage: HYPERFRAMES_BROWSER_PATH=/usr/bin/google-chrome python3 scripts/e2e.py [outdir]
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from agent import FakeClient, response, tool_use, run_agent  # noqa: E402

out = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "out" / "e2e").resolve()
out.mkdir(parents=True, exist_ok=True)

# 1) Synthetic source: 12s 1280x720, tone with a 3s silent gap (4s..7s)
src = out / "source.mp4"
subprocess.run(
    ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=12",
     "-f", "lavfi", "-i", "sine=frequency=440:duration=12", "-af", "volume='if(between(t,4,7),0,1)':eval=frame",
     "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(src)], check=True)

# 2) Transcript fixture (stands in for Whisper): speech 0-4s and 7-12s
words = [{"word": w, "start": round(0.3 + i * 0.5, 2), "end": round(0.7 + i * 0.5, 2)} for i, w in
         enumerate("this is a quick test of the editor".split())]
words += [{"word": w, "start": round(7.2 + i * 0.5, 2), "end": round(7.6 + i * 0.5, 2)} for i, w in
          enumerate("and now the silence is gone".split())]
fixture = out / "transcript.json"
fixture.write_text(json.dumps({"words": words}))

# 3) Initial plan, built like services/api does on upload
plan = {
    "version": 1,
    "source": {"path": str(src), "duration": 12.0, "width": 1280, "height": 720, "fps": 30},
    "output": {"width": 1080, "height": 1920, "fps": 30},
    "keep": [{"id": "k1", "start": 0.0, "end": 12.0}],
    "captions": [], "reframe": {"mode": "none", "track": []}, "overlays": [], "style_ref": None, "notes": "",
}

# 4) Scripted "Claude": calls the REAL tools in a realistic order, ends with a real preview render
client = FakeClient([
    response(tool_use("detect_silences", {})),
    response(tool_use("transcribe", {"backend": "fixture", "transcript_fixture": str(fixture)})),
    response(tool_use("cut_silences", {"silences": [{"start": 4.0, "end": 7.0}]})),
    response(tool_use("set_captions", {"words": words, "style": "bold-pop", "max_words": 3})),
    response(tool_use("add_title", {"text": "Editor test", "subtitle": "end to end", "start": 0.2, "end": 2.2})),
    response(tool_use("add_lower_third", {"name": "Test Speaker", "subtitle": "Demo", "start": 2.4, "end": 4.4,
                                          "style": "clean"})),
    response(tool_use("reframe_vertical", {"mode": "center", "width": 1080, "height": 1920})),
    response(tool_use("render_preview", {})),
    response("Removed the 3s silence, added captions, a title and a lower third, and reframed to 9:16."),
])

events = []
res = run_agent("e2e", "Clean this up for Reels", plan, None, client, workdir=str(out / "work"),
                on_event=lambda e: events.append(e))

final = res["plan"]
print("reply:", res["reply"])
print("stop_reason:", res["stop_reason"], "| revision:", final.get("revision"), "| schema version:", final.get("version"))
print("keep:", [(round(k["start"], 2), round(k["end"], 2)) for k in final["keep"]])
print("captions:", len(final["captions"]), "| overlays:", [(o["kind"], o["id"]) for o in final["overlays"]])
print("tool events:", [(e["type"], e.get("name") or e.get("tool")) for e in events if e["type"].startswith("tool_")])
errs = [e for e in events if e["type"] == "tool_finished" and (e.get("is_error") or e.get("error"))]
print("tool errors:", errs or "none")

vids = sorted((out / "work").rglob("*.mp4"), key=lambda p: p.stat().st_mtime)
preview = next((v for v in reversed(vids) if "preview" in v.name), None)
print("preview:", preview)
if preview:
    info = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height,codec_type:format=duration",
                           "-of", "json", str(preview)], capture_output=True, text=True).stdout
    print(json.dumps(json.loads(info), indent=1))
json.dump(final, open(out / "final_plan.json", "w"), indent=2)
