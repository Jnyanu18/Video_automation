"""Full stack over HTTP, the same calls web/ makes: API (FastAPI) -> agent loop -> REAL tools -> REAL render (FFmpeg + Hyperframes).

Claude's decisions are replayed from a script (EDITOR_AGENT=scripted) because no API key is assumed; everything else is real.
Usage: python scripts/fullstack_http.py [outdir] [--keep-running]   (--keep-running leaves the API up on :8800 for the browser test)
Exit code 1 if any check fails.
"""
import json
import subprocess
import sys
import threading
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

args = [a for a in sys.argv[1:] if not a.startswith("--")]
KEEP = "--keep-running" in sys.argv
OUT = Path(args[0] if args else ROOT / "out" / "fullstack").resolve()
PORT = 8800
BASE = f"http://127.0.0.1:{PORT}"
OUT.mkdir(parents=True, exist_ok=True)

results: list[tuple[str, bool, str]] = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}  {detail}", flush=True)
    return ok


# ---------- inputs ----------
src = OUT / "talk.mp4"  # 14 s, on-screen clock, "voice" 0-5 s and 9-14 s, SILENCE 5-9 s
gate = "volume='if(between(t,0,5)+between(t,9,14),0.6,0)':eval=frame"
font = r"fontfile='C\:/Windows/Fonts/arial.ttf':" if sys.platform == "win32" else ""
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=14",
                "-f", "lavfi", "-i", "sine=f=1500:duration=14", "-af", gate, "-vf",
                f"drawtext={font}text='%{{pts\\:hms}}':fontcolor=white:fontsize=64:box=1:boxcolor=black@0.6:x=30:y=30",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(src)], check=True)

words = [{"word": w, "start": round(0.3 + i * 0.5, 2), "end": round(0.7 + i * 0.5, 2)}
         for i, w in enumerate("welcome to the effects demo of this editor".split())]
script = {"turns": [
    {"match": "clean up", "steps": [
        {"tool": "detect_silences", "input": {}},
        {"tool": "cut_segments", "input": {"remove": [{"start": 5.2, "end": 8.8}]}},
        {"tool": "set_captions", "input": {"words": words, "style": "karaoke", "max_words": 3}},
        {"tool": "add_title", "input": {"text": "Full stack", "subtitle": "over HTTP", "start": 0.2, "end": 2.0}},
        {"tool": "add_transition", "input": {"kind": "wipe-left", "duration": 0.6, "all": True}},
        {"tool": "set_color_grade", "input": {"preset": "cinematic"}},
        {"tool": "review_plan", "input": {}},
        {"say": "{\"pass\": true, \"issues\": []}"},
        {"say": "Cut the silence, added karaoke captions and a title, wiped between the parts and graded it cinematic."}]},
    {"match": "music", "steps": [
        {"tool": "add_music", "input": {"generate": "calm", "volume_db": -14}},
        {"tool": "duck_music_under_speech", "input": {"amount_db": 12}},
        {"tool": "normalize_loudness", "input": {"target_lufs": -16}},
        {"say": "Added a calm music bed that ducks under your voice, normalized to -16 LUFS."}]},
    {"match": "speed", "steps": [
        {"tool": "set_speed", "input": {"start": 1.0, "end": 3.0, "factor": 2.0}},
        {"tool": "add_zoom", "input": {"start": 9.5, "end": 12.0, "scale": 1.5, "cy": 0.45}},
        {"say": "Sped up 1-3 s to 2x and punched in on the second half."}]}]}
(OUT / "script.json").write_text(json.dumps(script, indent=1))

# ---------- start the API ----------
import os  # noqa: E402

data = OUT / "data"
env = {**os.environ, "EDITOR_DATA_DIR": str(data), "EDITOR_AGENT": "scripted", "EDITOR_RENDER": "real",
       "EDITOR_AGENT_SCRIPT": str(OUT / "script.json"), "PYTHONUNBUFFERED": "1"}
env.pop("ANTHROPIC_API_KEY", None)
logf = open(OUT / "api.log", "w")
api = subprocess.Popen([sys.executable, "-m", "uvicorn", "editor_api.main:app_factory", "--factory", "--port", str(PORT)],
                       cwd=ROOT / "services" / "api", env=env, stdout=logf, stderr=subprocess.STDOUT)
http = httpx.Client(base_url=BASE, timeout=60)
try:
    for _ in range(60):
        try:
            if http.get("/health").json().get("ok"):
                break
        except Exception:
            time.sleep(0.5)
    else:
        raise SystemExit("API did not start; see " + str(OUT / "api.log"))
    print(f"API up on {BASE}; agent=scripted render=real data={data}", flush=True)

    # ---------- SSE listener (what the browser's EventSource does) ----------
    events: list[tuple[str, dict]] = []
    stop = threading.Event()

    def listen(pid):
        try:
            with httpx.stream("GET", f"{BASE}/projects/{pid}/events", timeout=None) as r:
                name = None
                for line in r.iter_lines():
                    if stop.is_set():
                        return
                    if line.startswith("event:"):
                        name = line[6:].strip()
                    elif line.startswith("data:") and name:
                        try:
                            events.append((name, json.loads(line[5:])))
                        except Exception:
                            pass
        except Exception:
            pass

    def jobs(pid):
        return http.get(f"/projects/{pid}").json()["jobs"]

    def wait_idle(pid, label, timeout=1200):
        t0 = time.time()
        time.sleep(1.0)
        while time.time() - t0 < timeout:
            js = jobs(pid)
            if js and all(j["status"] in ("done", "error") for j in js):
                bad = [j for j in js if j["status"] == "error"]
                return not bad, (bad[0].get("error") if bad else f"{len(js)} jobs, {time.time() - t0:.0f}s")
            time.sleep(1.5)
        return False, f"timeout waiting for {label}"

    def probe(path):
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration",
                            "-of", "json", str(path)], capture_output=True, text=True, check=True)
        d = json.loads(r.stdout)
        v = next(s for s in d["streams"] if s["codec_type"] == "video")
        return float(d["format"]["duration"]), v["width"], v["height"], any(s["codec_type"] == "audio" for s in d["streams"])

    # ---------- 1. create + upload (multipart field "file", as web/lib/api.ts) ----------
    print("1. create project, open SSE, upload", flush=True)
    pid = http.post("/projects", json={"name": "fullstack"}).json()["id"]
    threading.Thread(target=listen, args=(pid,), daemon=True).start()
    time.sleep(0.5)
    with open(src, "rb") as f:
        r = http.post(f"/projects/{pid}/upload", files={"file": ("talk.mp4", f, "video/mp4")}, timeout=300)
    check("upload accepted (201)", r.status_code == 201, str(r.status_code))
    proj = http.get(f"/projects/{pid}").json()
    plan = proj["plan"]
    check("plan v1 created from a real ffprobe", plan and abs(plan["source"]["duration"] - 14.0) < 0.3
          and plan["source"]["width"] == 1280, json.dumps(plan["source"]) if plan else "no plan")
    pv = http.get(f"/projects/{pid}/render", params={"quality": "preview"})
    check("preview falls back to the uploaded source before any render", pv.status_code == 200 and len(pv.content) > 10000,
          f"{pv.status_code} {len(pv.content)} bytes")
    fin = http.get(f"/projects/{pid}/render", params={"quality": "final"})
    check("final is a clean 404 before a final render", fin.status_code == 404, str(fin.status_code))

    # ---------- 2. chat turns ----------
    def chat(text):
        r = http.post(f"/projects/{pid}/messages", json={"content": text})
        check(f"message accepted: {text!r}", r.status_code == 202, str(r.status_code))
        ok, d = wait_idle(pid, text)
        check(f"jobs finished without error after {text!r}", ok, d)
        return http.get(f"/projects/{pid}").json()

    from tools.edit._common import load_schema  # noqa: E402
    from tools.edit.timeline import output_duration  # noqa: E402
    import jsonschema  # noqa: E402

    print("2a. 'clean up' turn: cut, karaoke captions, title, transition, grade, review gate (scorecard)", flush=True)
    p = chat("please clean up this video")
    plan = p["plan"]
    check("keep cut around the silence", [(round(k["start"], 1), round(k["end"], 1)) for k in plan["keep"]] == [(0.0, 5.2), (8.8, 14.0)], str(plan["keep"]))
    check("captions karaoke with word timings", plan["captions"] and plan["captions"][0]["style"] == "karaoke" and plan["captions"][0].get("words"), "")
    check("transition + grade + title in plan", plan.get("transitions") and plan.get("color_grade") and plan["overlays"], "")
    jsonschema.validate(plan, load_schema())
    check("plan validates against editplan.schema.json", True)
    check("assistant reply stored", p["messages"][-1]["role"] == "assistant" and "karaoke" in p["messages"][-1]["content"], p["messages"][-1]["content"][:60])
    names = [n for n, _ in events]
    check("SSE: agent + tool + scorecard + plan + render events seen",
          all(k in names for k in ("agent.started", "tool_started", "tool_finished", "scorecard", "plan.updated", "render.started", "render.done", "message")),
          str(sorted(set(names))))
    card = next(d for n, d in events if n == "scorecard")
    check("scorecard ran against the real source", card.get("available") is True and card.get("overall") in ("PASS", "WARN"), json.dumps({k: card.get(k) for k in ("overall", "score", "failed")}))
    prev = http.get(f"/projects/{pid}/render", params={"quality": "preview"})
    (OUT / "preview_a.mp4").write_bytes(prev.content)
    dur, w, h, aud = probe(OUT / "preview_a.mp4")
    want = output_duration(plan)
    check("preview duration == timeline math (transition shortens it)", abs(dur - want) < 0.25, f"file {dur:.2f}s vs timeline {want:.2f}s")
    check("preview is the 360-wide portrait render with audio", (w, h) == (360, 640) and aud, f"{w}x{h} audio={aud}")

    print("2b. 'music' turn", flush=True)
    p = chat("add some music and level it")
    plan = p["plan"]
    check("audio block in plan", plan["audio"]["music"]["path"].endswith(".wav") and plan["audio"]["duck"]["enabled"] and plan["audio"]["loudness"]["target_lufs"] == -16, str(plan.get("audio"))[:120])
    check("music file lives under the project's agent workdir", "agent" in plan["audio"]["music"]["path"], plan["audio"]["music"]["path"])
    print("2c. 'speed' turn", flush=True)
    p = chat("speed up the start and zoom in later")
    plan = p["plan"]
    check("speed + zoom in plan", plan["speed"][0]["factor"] == 2.0 and plan["zooms"], "")
    jsonschema.validate(plan, load_schema())
    check("final plan validates against the schema", True)
    time.sleep(1.0)
    dur_expected = output_duration(plan)
    prev = http.get(f"/projects/{pid}/render", params={"quality": "preview"})
    (OUT / "preview_c.mp4").write_bytes(prev.content)
    dur, w, h, aud = probe(OUT / "preview_c.mp4")
    check("latest preview duration == timeline math (cut + speed + transition)", abs(dur - dur_expected) < 0.3, f"file {dur:.2f}s vs timeline {dur_expected:.2f}s")

    # ---------- 3. final render, the way the Render final button does it ----------
    print("3. POST /render {quality: final}", flush=True)
    before = http.get(f"/projects/{pid}").json()
    r = http.post(f"/projects/{pid}/render", json={"quality": "final"})
    check("final render queued (202)", r.status_code == 202, str(r.status_code))
    ok, d = wait_idle(pid, "final render", timeout=1800)
    check("final render finished", ok, d)
    after = http.get(f"/projects/{pid}").json()
    finals = [a for a in after["assets"] if a["kind"] == "render_final"]
    check("render_final asset records the plan version it was made from", finals and finals[-1]["meta"]["plan_version"] == after["plan_version"],
          str(finals[-1]["meta"]) if finals else "no asset")
    fin = http.get(f"/projects/{pid}/render", params={"quality": "final"})
    check("final download is an mp4", fin.status_code == 200 and fin.headers["content-type"].startswith("video/mp4") and len(fin.content) > 10000,
          f"{fin.status_code} {fin.headers.get('content-type')} {len(fin.content)} bytes")
    (OUT / "final.mp4").write_bytes(fin.content)
    fdur, fw, fh, faud = probe(OUT / "final.mp4")
    check("final is full size 1080x1920 with audio", (fw, fh) == (1080, 1920) and faud, f"{fw}x{fh} audio={faud}")
    check("final duration == timeline math", abs(fdur - dur_expected) < 0.3, f"file {fdur:.2f}s vs timeline {dur_expected:.2f}s")
    from services.render.audio import measure_loudness  # noqa: E402
    lufs = measure_loudness(OUT / "final.mp4")["lufs"]
    check("final loudness within 1 LU of the -16 target", abs(lufs + 16) < 1.0, f"{lufs:.1f} LUFS")
    done_events = [d for n, d in events if n == "render.done" and d.get("quality") == "final"]
    check("SSE announced the final render", bool(done_events), "")
    check("plan_version unchanged by rendering", after["plan_version"] == before["plan_version"], f"{before['plan_version']} -> {after['plan_version']}")

    # ---------- 4. picture checks on the final ----------
    import cv2  # noqa: E402
    import numpy as np  # noqa: E402

    def frame(t):
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", str(OUT / "final.mp4"), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"],
                           capture_output=True, check=True)
        return cv2.imdecode(np.frombuffer(r.stdout, np.uint8), cv2.IMREAD_COLOR)

    for t, name in ((0.5, "final_0.5.png"), (1.2, "final_1.2.png"), (fdur - 2.0, "final_end.png")):
        cv2.imwrite(str(OUT / name), frame(t))
    f = frame(1.2)
    yellow = ((f[..., 2] > 200) & (f[..., 1] > 170) & (f[..., 0] < 110)).sum()
    check("karaoke highlight pixels visible in the final at t=1.2", yellow > 200, f"{int(yellow)} yellow px")
    check("title text visible at t=0.5 (white pixels in the middle band)", (frame(0.5)[900:1020, :, :].min(axis=2) > 235).sum() > 500, "")
    print("  frames saved under", OUT, flush=True)
finally:
    stop.set()
    if KEEP:
        print(f"\nAPI left running on {BASE} (pid {api.pid}); project data in {OUT / 'data'}", flush=True)
        (OUT / "api.pid").write_text(str(api.pid))
    else:
        api.terminate()
        try:
            api.wait(10)
        except Exception:
            api.kill()

bad = [r for r in results if not r[1]]
print(f"\n{len(results) - len(bad)}/{len(results)} checks passed")
for n, _, d in bad:
    print("  FAILED:", n, d)
sys.exit(1 if bad else 0)
