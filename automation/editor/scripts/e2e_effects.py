"""End-to-end check of the Phase 1 tools: scripted FakeClient -> agent loop -> REAL effects/audio tools -> REAL render
(FFmpeg cut + effects, Hyperframes captions/title, then the audio pass).

Usage: python scripts/e2e_effects.py [outdir]     (needs ffmpeg and app/node_modules; no API key)
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from agent import FakeClient, response, tool_use, run_agent  # noqa: E402
from services.render.audio import measure_loudness  # noqa: E402
from tools.edit.timeline import output_duration  # noqa: E402

out = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "out" / "e2e_effects").resolve()
out.mkdir(parents=True, exist_ok=True)

src = out / "source.mp4"  # 14 s, on-screen clock, 1500 Hz "voice" 0-5 s and 9-14 s, silence between
gate = "volume='if(between(t,0,5)+between(t,9,14),0.6,0)':eval=frame"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=14",
                "-f", "lavfi", "-i", "sine=f=1500:duration=14", "-af", gate, "-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-shortest", str(src)], check=True)
words = [{"word": w, "start": round(0.3 + i * 0.5, 2), "end": round(0.7 + i * 0.5, 2)} for i, w in
         enumerate("welcome to the effects demo of this editor".split())]
plan = {"version": 1, "source": {"path": str(src), "duration": 14.0, "width": 1280, "height": 720, "fps": 30},
        "output": {"width": 1080, "height": 1920, "fps": 30}, "keep": [{"id": "k1", "start": 0.0, "end": 14.0}],
        "captions": [], "reframe": {"mode": "none", "track": []}, "overlays": [], "style_ref": None, "notes": ""}

client = FakeClient([
    response(tool_use("cut_segments", {"remove": [{"start": 5.2, "end": 8.8}]})),            # drop the silence
    response(tool_use("set_captions", {"words": words, "style": "bold-pop", "max_words": 3})),
    response(tool_use("add_title", {"text": "Effects demo", "subtitle": "all tools", "start": 0.2, "end": 2.0})),
    response(tool_use("reframe_vertical", {"mode": "center", "width": 1080, "height": 1920})),
    response(tool_use("add_transition", {"kind": "wipe-left", "duration": 0.6, "all": True})),
    response(tool_use("set_speed", {"start": 1.0, "end": 3.0, "factor": 2.0})),
    response(tool_use("add_zoom", {"start": 9.5, "end": 12.0, "scale": 1.5, "cy": 0.45})),
    response(tool_use("set_color_grade", {"preset": "cinematic", "contrast": 1.05})),
    response(tool_use("add_music", {"generate": "calm", "volume_db": -14})),
    response(tool_use("duck_music_under_speech", {"amount_db": 12})),
    response(tool_use("mute_segments", {"ranges": [{"start": 12.0, "end": 12.5}]})),
    response(tool_use("normalize_loudness", {"target_lufs": -16})),
    response(tool_use("render_preview", {})),
    response("Cut the silence, added captions and a title, wiped between the two parts, sped up 1-3s, punched in on "
             "the second half, graded it cinematic, added ducked music, muted a cough and normalized to -16 LUFS."),
])
events = []
res = run_agent("e2e-fx", "Make this punchy", plan, None, client, workdir=str(out / "work"), on_event=events.append)
final = res["plan"]
errs = [e for e in events if e["type"] == "tool_finished" and (e.get("is_error") or e.get("error"))]
print("stop_reason:", res["stop_reason"], "| tool errors:", errs or "none")
for k in ("keep", "speed", "zooms", "transitions", "color_grade", "audio"):
    print(f"{k}: {json.dumps(final.get(k))[:200]}")
preview = next((v for v in sorted((out / "work").rglob("preview.mp4"), key=lambda p: p.stat().st_mtime)[::-1]), None)
print("preview:", preview)
probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration",
                                   "-of", "json", str(preview)], capture_output=True, text=True).stdout)
dur = float(probe["format"]["duration"])
print(f"timeline says {output_duration(final):.2f}s, file is {dur:.2f}s, streams: "
      f"{[(s['codec_type'], s.get('width')) for s in probe['streams']]}")
print("loudness:", measure_loudness(preview))
json.dump(final, open(out / "final_plan.json", "w"), indent=2)
assert not errs and abs(dur - output_duration(final)) < 0.2, "timeline and render disagree"
print("OK")
