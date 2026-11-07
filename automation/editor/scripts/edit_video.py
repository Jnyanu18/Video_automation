"""Edit a video from the command line with a free (or any) LLM driving the real tools.

    python scripts/edit_video.py my.mp4 "cut the silences, add karaoke captions, make it vertical" [--final] [--out out/edit]
    python scripts/edit_video.py --check            # verifies the key/model with one tiny request, edits nothing

Model: EDITOR_LLM=gemini (key in GEMINI_API_KEY or a .env file at the repo root, see .env.example), or ANTHROPIC_API_KEY for Claude.
Prints: the tool calls the model made, its reply, the preview/final path and the objective scorecard (before and after).
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from agent import run_agent  # noqa: E402
from agent.openai_compat import LLMError, load_dotenv, make_client_from_env  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("video", nargs="?")
ap.add_argument("prompt", nargs="?")
ap.add_argument("--out", default=str(ROOT / "out" / "edit"))
ap.add_argument("--final", action="store_true", help="also render the full-quality final MP4")
ap.add_argument("--size", default="1080x1920", help="output size of the initial plan (default vertical 1080x1920)")
ap.add_argument("--check", action="store_true", help="only test the LLM connection")
ap.add_argument("--max-iterations", type=int, default=20)
a = ap.parse_args()

load_dotenv()
try:
    client = make_client_from_env()
except LLMError as e:
    sys.exit(f"LLM setup problem: {e}")
if client is None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("No model configured. Set EDITOR_LLM=gemini and GEMINI_API_KEY (see .env.example), or ANTHROPIC_API_KEY.")
    import anthropic
    client = anthropic.Anthropic()
name = f"{getattr(client, 'model', 'claude')} via {getattr(client, 'base_url', 'api.anthropic.com')}"

if a.check:
    try:
        r = client.messages.create(model="x", max_tokens=400, messages=[{"role": "user", "content": "Reply with the single word: ready"}])
    except LLMError as e:
        sys.exit(f"FAILED: {e}")
    print(f"OK: {name} answered {r['content'][0]['text']!r}; vision={getattr(client, 'supports_vision', True)}")
    if hasattr(client, "list_models"):
        try:
            print("models available:", ", ".join(client.list_models()[:25]))
        except Exception as e:  # noqa: BLE001
            print("(could not list models:", e, ")")
    sys.exit(0)

if not (a.video and a.prompt):
    ap.error("video and prompt are required (or use --check)")
video = Path(a.video).resolve()
if not video.is_file():
    sys.exit(f"video not found: {video}")
out = Path(a.out).resolve()
out.mkdir(parents=True, exist_ok=True)

probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration",
                                   "-of", "json", str(video)], capture_output=True, text=True, check=True).stdout)
v = next(s for s in probe["streams"] if s["codec_type"] == "video")
num, den = (v["r_frame_rate"].split("/") + ["1"])[:2]
fps = round(float(num) / float(den), 3) if float(den) else 30.0
W, H = (int(x) for x in a.size.lower().split("x"))
dur = float(probe["format"]["duration"])
plan = {"version": 1, "source": {"path": str(video), "duration": dur, "width": v["width"], "height": v["height"], "fps": fps},
        "output": {"width": W, "height": H, "fps": fps}, "keep": [{"id": "k1", "start": 0.0, "end": dur}], "captions": [],
        "reframe": {"mode": "none", "track": []}, "overlays": [], "style_ref": None, "notes": ""}

from agent.review import run_scorecard  # noqa: E402
from tools.edit.timeline import output_duration  # noqa: E402

work = out / "work"
before = run_scorecard(plan, str(work))
print(f"model: {name}\nvideo: {video.name} ({dur:.1f}s {v['width']}x{v['height']})\nprompt: {a.prompt}\n", flush=True)


def show(e):
    t = e["type"]
    if t == "tool_started":
        print(f"  -> {e['name']} {json.dumps(e.get('input'))[:140]}", flush=True)
    elif t == "tool_finished":
        print(f"     {'ok ' if e['ok'] else 'ERR'} {e['summary'][:160]}", flush=True)
    elif t == "claim_check":
        print(f"  !! claims check: reply said it did {e['problems']} but the plan has none; sending the model back", flush=True)
    elif t == "scorecard":
        print(f"  scorecard round {e['round']}: {e.get('overall')} {e.get('failed') or ''}", flush=True)


t0 = time.time()
from services.api.editor_api import adapters  # noqa: E402

res = run_agent("cli", a.prompt, plan, adapters.collect_tools(), client, workdir=str(work), on_event=show,
                max_iterations=a.max_iterations)
final = res["plan"]
print(f"\nreply: {res['reply']}\nstop: {res['stop_reason']}  api calls: {res['usage']['api_calls']}  {time.time() - t0:.0f}s", flush=True)
(out / "plan.json").write_text(json.dumps(final, indent=2))

from services.render import render_final, render_preview  # noqa: E402

try:
    prev = render_preview(final, str(work))
    print(f"preview: {prev}")
    if a.final:
        print(f"final:   {render_final(final, str(work))}")
except Exception as e:  # noqa: BLE001
    print(f"render failed: {e}")
after = run_scorecard(final, str(work))
for label, c in (("before", before), ("after ", after)):
    if c.get("available"):
        print(f"scorecard {label}: {c['overall']} score={c['score']} output={c['output_duration']}s "
              f"fails={[f['name'] for f in c['failed']]} warns={[w['name'] for w in c['warnings']]}")
    else:
        print(f"scorecard {label}: unavailable ({c.get('reason')})")
print(f"timeline output duration: {output_duration(final):.2f}s   plan saved: {out / 'plan.json'}")
