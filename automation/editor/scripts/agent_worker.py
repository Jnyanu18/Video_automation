"""Worker side of the Claude Director queue (studio/agent_bridge.py).

    python scripts/agent_worker.py watch [--interval 3]     heartbeat + print one line per new queued job (for a monitor)
    python scripts/agent_worker.py list [--all]             queued/working jobs (or every job)
    python scripts/agent_worker.py show <job_id>            the full job JSON
    python scripts/agent_worker.py claim <job_id>           mark working; prints the brief and the job folder
    python scripts/agent_worker.py progress <job_id> "..."  add a progress line the website shows live
    python scripts/agent_worker.py done <job_id> <video.mp4> [--note "..."]   copy the video in, probe it, mark done
    python scripts/agent_worker.py fail <job_id> "reason"   mark failed with a reason the client can read

Every command only touches files under the queue folder, so the website picks changes up on its next poll.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from studio import agent_bridge as ab  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def heartbeat(worker: str) -> None:
    ab.QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = ab.QUEUE_DIR / "_worker.tmp"
    tmp.write_text(json.dumps({"t": time.time(), "worker": worker}), encoding="utf-8")
    tmp.replace(ab.QUEUE_DIR / "_worker.json")


def brief_line(j: dict) -> str:
    extra = []
    if j.get("clips"):
        extra.append(f"{len(j['clips'])} clip(s)")
    if j.get("assets"):
        extra.append(f"{len(j['assets'])} library file(s)")
    prompt = " ".join(str(j.get("prompt", "")).split())
    return (f"{j['id']} kind={j['kind']} format={j['format']} duration={j['duration']}s user={j.get('user_id')}"
            f"{' [' + ', '.join(extra) + ']' if extra else ''} :: {prompt[:300]}")


def cmd_watch(a) -> None:
    seen = set()
    while True:
        heartbeat(a.worker)
        for j in ab.all_jobs():
            if j.get("status") == "queued" and j["id"] not in seen:
                seen.add(j["id"])
                print("NEW JOB " + brief_line(j), flush=True)
        time.sleep(a.interval)


def cmd_list(a) -> None:
    for j in ab.all_jobs():
        if a.all or j.get("status") in ("queued", "working"):
            print(f"[{j['status']:9s}] " + brief_line(j))


def cmd_show(a) -> None:
    print(json.dumps(ab.read_job(a.job_id), indent=1, ensure_ascii=False))


def cmd_claim(a) -> None:
    rev = ab.read_job(a.job_id) or {}
    note = ("Your creative director is working on the change." if rev.get("revision")
            else "Your creative director is reading the brief and planning the film.")
    j = ab.update_job(a.job_id, status="working", started_at=time.time(), note=note)
    keys = ("id", "kind", "format", "duration", "title", "prompt", "clips", "assets", "reference_url", "reference_video_id",
            "reference_video_path", "direction", "revision", "parent", "root")
    print(json.dumps({k: j.get(k) for k in keys if j.get(k) is not None}, indent=1, ensure_ascii=False))
    print("JOB_DIR", ab.job_dir(a.job_id))
    if j.get("parent"):  # a change request: build on the previous version's project folder
        print("PARENT_DIR", ab.job_dir(j["parent"]))


def cmd_progress(a) -> None:
    ab.update_job(a.job_id, note=a.text)
    print("ok")


def probe(path: Path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                          "-show_entries", "format=duration", "-of", "json", str(path)], capture_output=True, text=True)
    d = json.loads(out.stdout or "{}")
    s = (d.get("streams") or [{}])[0]
    return {"width": s.get("width"), "height": s.get("height"), "duration": round(float((d.get("format") or {}).get("duration") or 0), 2)}


def cmd_done(a) -> None:
    src = Path(a.video)
    if not src.is_file():
        sys.exit(f"no such video: {src}")
    dst = ab.job_dir(a.job_id) / "output.mp4"
    shutil.copyfile(src, dst)
    if a.scenes:  # scene cards for the Storyboard and Timeline screens (studio/agent_storyboards.py)
        sc = json.loads(Path(a.scenes).read_text(encoding="utf-8"))
        if not isinstance(sc.get("scenes"), list) or not sc["scenes"]:
            sys.exit("--scenes needs {\"scenes\": [{start, end, title, action, on_screen, sfx}, ...]}")
        (ab.job_dir(a.job_id) / "storyboard.json").write_text(json.dumps(sc, indent=1, ensure_ascii=False), encoding="utf-8")
    info = probe(dst)
    info["size_mb"] = round(dst.stat().st_size / 1e6, 2)
    ab.update_job(a.job_id, status="done", finished_at=time.time(), output=info,
                  note=a.note or f"Video ready: {info['duration']}s, {info['width']}x{info['height']}.")
    print("done", json.dumps(info))


def cmd_fail(a) -> None:
    ab.update_job(a.job_id, status="failed", error=a.reason, note="Stopped: " + a.reason)
    print("failed")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    w = sub.add_parser("watch"); w.add_argument("--interval", type=float, default=3.0); w.add_argument("--worker", default="claude-code-local"); w.set_defaults(fn=cmd_watch)
    l = sub.add_parser("list"); l.add_argument("--all", action="store_true"); l.set_defaults(fn=cmd_list)
    s = sub.add_parser("show"); s.add_argument("job_id"); s.set_defaults(fn=cmd_show)
    c = sub.add_parser("claim"); c.add_argument("job_id"); c.set_defaults(fn=cmd_claim)
    g = sub.add_parser("progress"); g.add_argument("job_id"); g.add_argument("text"); g.set_defaults(fn=cmd_progress)
    d = sub.add_parser("done"); d.add_argument("job_id"); d.add_argument("video"); d.add_argument("--note"); d.add_argument("--scenes", help="storyboard.json with the scene list"); d.set_defaults(fn=cmd_done)
    f = sub.add_parser("fail"); f.add_argument("job_id"); f.add_argument("reason"); f.set_defaults(fn=cmd_fail)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
