"""The 30-minute lane (2026-10-26): idea to a finished, mixed, numbered video, on the single-take engine.

    python lanes/animated/fast.py new <slug> "Title" [--funnel top|middle|bottom]
    python lanes/animated/fast.py voice <slug>      script.md -> Christopher's voice -> words.json (prints the words)
    python lanes/animated/fast.py board <slug>      scenes.json -> storyboard stills, and one music take made meanwhile
    python lanes/animated/fast.py final <slug>      render -> mix the music under the voice -> -14 LUFS -> publish/NN-<slug>/

Claude writes script.md after `new` and scenes.json after `voice` (the views are in faceless.tsx, the engine in
single.tsx). Vishnu's yes on the script and on the storyboard are the two checks; `final` waits for the second.
Every step's time goes into videos/<slug>/timings.json, so the slow step is always the one we can see.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))
from common import ROOT, VIDEOS, video_dir

PY = sys.executable
# An acted take (2026-11-06): pauses up to 0.35 s and sounds down to -60 dB are kept and the speed-up is light, so the v3
# emotion cues ([sighs], [curious]) are not trimmed away; tempo 1.12 with a 0.1 s trim clipped them on 33 and 34.
CHRISTOPHER = {"voice_id": "RolvCZ4e0AkAR2dzyTx0", "model": "eleven_v3", "tempo": 1.04, "keep_pause": 0.35, "floor_db": -60}
PUBLISH = ROOT / "publish"
CHECK_SCRIPT, CHECK_BOARD = "Script", "Storyboard"


def run(*args, env=None):
    import os
    e = dict(os.environ, **(env or {}))
    subprocess.run([str(a) for a in args], check=True, cwd=ROOT, env=e)


def timed(slug: str, step: str, t0: float) -> None:
    f = video_dir(slug) / "timings.json"
    data = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    data[step] = round(time.time() - t0, 1)
    f.write_text(json.dumps(data, indent=1) + "\n", encoding="utf-8")
    print(f"[{step}: {data[step]:.0f} s]")


def ticked(slug: str, name: str) -> bool:
    return bool(re.search(rf"^- \[x\] {name}\b", (video_dir(slug) / "CHECKS.md").read_text(encoding="utf-8"), re.M))


def new(slug: str, title: str, funnel: str) -> None:
    d = VIDEOS / slug
    if d.exists():
        sys.exit(f"videos/{slug} already exists.")
    (d / "voice").mkdir(parents=True)
    (d / "brief.md").write_text(f"# Brief: {title}\n\n- **Funnel:** {funnel}\n- **Reference:** \n- **Our twist:** \n- **Facts and sources:** \n- **Music:** \n", encoding="utf-8")
    (d / "script.md").write_text(f"# {title}\n\n<!-- One paragraph per thought; each becomes one voice file. No em dashes, no \"not X, not Y\" chains. -->\n\n", encoding="utf-8")
    (d / "scenes.json").write_text("[]\n", encoding="utf-8")
    (d / "words.json").write_text("[]\n", encoding="utf-8")
    (d / "cues.json").write_text("[]\n", encoding="utf-8")
    (d / "voice" / "settings.json").write_text(json.dumps(CHRISTOPHER) + "\n", encoding="utf-8")
    (d / "voice" / "PICKED.txt").write_text("Voice: Christopher (RolvCZ4e0AkAR2dzyTx0), the faceless videos' voice (Vishnu, 2026-10-26).\n", encoding="utf-8")
    (d / "CHECKS.md").write_text(
        f"# Checks: {title}\n\nTwo checks, both Vishnu's.\n\n"
        f"- [x] 0b Voice pick: the faceless videos' voice: Christopher (RolvCZ4e0AkAR2dzyTx0)\n"
        f"- [ ] {CHECK_SCRIPT}: script.md and brief.md\n- [ ] {CHECK_BOARD}: stills/contact-sheet.png\n", encoding="utf-8")
    pascal = "".join(p.capitalize() for p in slug.split("-"))
    (ROOT / "remotion" / "src" / "lanes" / "animated" / f"{slug}.tsx").write_text(f'''import React from "react";
import {{ Word }} from "../../kit/theme";
import {{ Single, SingleSpec }} from "./single";
import scenesJson from "../../../../videos/{slug}/scenes.json";
import wordsJson from "../../../../videos/{slug}/words.json";

// {title} (fast lane). Everything it shows is scenes.json; the engine is single.tsx.

const words = wordsJson as Word[];
export const seconds = words.length ? words[words.length - 1].end + 1.8 : 5;

export const {pascal}: React.FC = () => (
  <Single slug="{slug}" specs={{scenesJson as SingleSpec[]}} words={{words}} seconds={{seconds}} />
);
''', encoding="utf-8")
    reg = ROOT / "remotion" / "src" / "lanes" / "animated" / "registry.ts"
    text = reg.read_text(encoding="utf-8")
    text = f'import {{ {pascal}, seconds as {pascal}Seconds }} from "./{slug}";\n' + text
    text = text.replace("  // registry:entries\n", f'  // registry:entries\n  {{ slug: "{slug}", Scene: {pascal}, seconds: {pascal}Seconds }},\n')
    reg.write_text(text, encoding="utf-8")
    print(f"Made videos/{slug}/. Next: Claude writes brief.md and script.md, Vishnu ticks '{CHECK_SCRIPT}'.")


def voice(slug: str) -> None:
    if not ticked(slug, CHECK_SCRIPT):
        sys.exit(f"Tick '{CHECK_SCRIPT}' in CHECKS.md first (Vishnu's yes on the script).")
    t0 = time.time()
    run(PY, "lanes/animated/speak.py", slug, "--force")  # the fast lane's own Script check stands in for the old stage gates
    timed(slug, "voice", t0)
    t0 = time.time()
    run(PY, "lanes/animated/transcribe.py", slug, "--force")
    timed(slug, "words", t0)
    words = json.loads((video_dir(slug) / "words.json").read_text(encoding="utf-8"))
    print(" ".join(f"{w['w']}@{w['start']:.1f}" for w in words))


def music_plan(slug: str) -> Path:
    """One composition section per scene, the styles from the brief's Music line."""
    d = video_dir(slug)
    cues = json.loads((d / "cues.json").read_text(encoding="utf-8"))
    m = re.search(r"\*\*Music:\*\*\s*(.+)", (d / "brief.md").read_text(encoding="utf-8"))
    styles = [s.strip() for s in (m.group(1) if m and m.group(1).strip() else "modern light electronic, plucky synth, 112 bpm").split(",") if s.strip()]
    plan = {"positive_global_styles": ["instrumental", "sparse, leaves room for a voice", *styles],
            "negative_global_styles": ["vocals", "singing", "lead melody in the vocal range", "aggressive EDM"],
            "sections": [{"section_name": c["id"], "positive_local_styles": ["builds a little" if i == len(cues) - 2 else "steady"],
                          "negative_local_styles": [], "duration_ms": max(3000, int((c["end"] - c["start"]) * 1000)), "lines": []}
                         for i, c in enumerate(cues)]}
    (d / "music").mkdir(exist_ok=True)
    f = d / "music" / "plan.json"
    f.write_text(json.dumps(plan, indent=1) + "\n", encoding="utf-8")
    return f


def board(slug: str) -> None:
    d = video_dir(slug)
    t0 = time.time()
    run(PY, "lanes/animated/scenes.py", slug)
    cues = json.loads((d / "cues.json").read_text(encoding="utf-8"))
    end = cues[-1]["end"]
    # No music is made here (Vishnu, 2026-10-29): he picks a track we already have, copied into music/ as track-1.mp3.
    music = None
    times = [round(0.4 + k * 2.4, 1) for k in range(int((end - 0.4) / 2.4) + 1)]
    run(PY, "lanes/animated/stills.py", slug, "--fmt", "9x16", "--force", "--at", ",".join(map(str, times)), env={"STUDIO_ONLY": f"{slug},_sfx"})
    if music:
        music.wait()
    timed(slug, "board", t0)
    print(f"Storyboard: videos/{slug}/stills/contact-sheet.png. Music: videos/{slug}/music/track-1.mp3. Vishnu ticks '{CHECK_BOARD}'.")


def final(slug: str, track: str = "track-1") -> None:
    if not ticked(slug, CHECK_BOARD):
        sys.exit(f"Tick '{CHECK_BOARD}' in CHECKS.md first (Vishnu's yes on the storyboard).")
    d = video_dir(slug)
    t0 = time.time()
    run(PY, "lanes/animated/render.py", slug, "--only", "9x16", "--force", env={"STUDIO_ONLY": f"{slug},_sfx"})
    timed(slug, "render", t0)
    t0 = time.time()
    out = d / "out"
    picture = out / "picture.mp4"
    shutil.move(str(out / f"{slug}-9x16.mp4"), picture)
    specs = json.loads((d / "scenes.json").read_text(encoding="utf-8"))
    cues = json.loads((d / "cues.json").read_text(encoding="utf-8"))
    drops = [f"{max(0, c['start'] - 0.5):.2f}-{c['start'] - 0.05:.2f}" for s, c in zip(specs, cues) if s.get("drop")]
    args = [PY, "kit/music.py", "mix", picture, d / "music" / f"{track}.mp3", out / f"{slug}-9x16.mp4"]
    for w in drops:
        args += ["--drop", w]
    run(*args)
    # kept (overwritten each run) so the music can be remixed without a new render (2026-11-06)
    picture.replace(out / "picture-voice.mp4")
    timed(slug, "mix", t0)
    PUBLISH.mkdir(exist_ok=True)
    taken = [int(p.name[:2]) for p in PUBLISH.iterdir() if p.is_dir() and p.name[:2].isdigit()]
    taken += [int(p.name[:2]) for p in (PUBLISH / "posted").iterdir() if p.is_dir() and p.name[:2].isdigit()] if (PUBLISH / "posted").exists() else []
    n = max(taken, default=0) + 1
    dst = PUBLISH / f"{n:02d}-{slug}"
    dst.mkdir()
    shutil.move(str(out / f"{slug}-9x16.mp4"), dst / f"{n:02d}-{slug}.mp4")  # moved, never copied: one copy on disk
    for f in ("thumb-1.png", "thumb-2.png", "thumb-3.png"):
        if (out / f).exists():
            shutil.copy2(out / f, dst / f)
    if (d / "dm-guide.md").exists():  # every guide is a document, not markdown (Vishnu, 2026-11-02)
        run(PY, "kit/guide_docx.py", slug)
    for f in ("posts.md", "dm-guide.docx"):
        if (d / f).exists():
            shutil.copy2(d / f, dst / f)
    total = sum(json.loads((d / "timings.json").read_text(encoding="utf-8")).values())
    print(f"Published publish/{dst.name}/. Machine time for this video: {total / 60:.1f} min.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["new", "voice", "board", "final"])
    ap.add_argument("slug")
    ap.add_argument("title", nargs="?", default="")
    ap.add_argument("--funnel", default="top", choices=["top", "middle", "bottom"])
    ap.add_argument("--track", default="track-1", help="the music take he picked, e.g. track-3")
    a = ap.parse_args()
    {"new": lambda: new(a.slug, a.title or a.slug, a.funnel), "voice": lambda: voice(a.slug),
     "board": lambda: board(a.slug), "final": lambda: final(a.slug, a.track)}[a.cmd]()


if __name__ == "__main__":
    main()
