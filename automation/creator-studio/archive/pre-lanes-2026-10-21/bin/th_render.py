"""Talking head, step 6, the final: python bin/th_render.py <slug> [--force]

Renders out/<slug>-9x16.mp4 at full size, evens out the loudness for social platforms, writes
captions.srt, three thumbnail candidates and description.md, and records the edit choices in format.md
so a video that does well can be repeated. Title and thumbnail are Vishnu's call.
"""
import argparse
import re
import subprocess
from collections import Counter
from common import ROOT, read_json, require, script_paragraphs, video_dir
from captions import write_srt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    require(a.slug, "5 Edit", a.force)
    d = video_dir(a.slug)
    work, out = d / "work", d / "out"
    out.mkdir(exist_ok=True)
    edit = read_json(work / "edit.json")
    node = ["node", str(ROOT / "bin" / "remotion.mjs")]

    raw = work / "final-raw.mp4"
    final = out / f"{a.slug}-9x16.mp4"
    subprocess.run(node + ["th-render", a.slug, str(raw), "1"], check=True, cwd=ROOT)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw), "-c:v", "copy",
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                    str(final)], check=True)
    raw.unlink()

    write_srt(edit["words"], out / "captions.srt")

    beats = edit["beats"]
    picks = [0.6]
    first = next((b for b in beats if b["kind"] in ("text", "stat")), None)
    if first:
        picks.append(first["at"] + 0.8)
    picks.append(edit["videoSeconds"] * 0.5)
    frames = [int(t * 30) for t in picks]
    subprocess.run(node + ["th-stills", a.slug, str(out), ",".join(map(str, frames))], check=True, cwd=ROOT)
    for k, f in enumerate(frames, 1):
        src = out / f"frame-{f:05d}.png"
        if src.exists():
            src.replace(out / f"thumb-{k}.png")

    paras = script_paragraphs(a.slug)
    url = (edit.get("endCard") or {}).get("url", "")
    desc = ["# Description draft", "", "<!-- Title: Vishnu picks. Thumbnail: one of thumb-1..3.png. -->", "",
            paras[0] if paras else "", "", url]
    (out / "description.md").write_text("\n".join(desc).strip() + "\n", encoding="utf-8")

    kinds = Counter(b["kind"] for b in beats)
    summary = [f"- Length: {edit['videoSeconds'] + (edit['endSeconds'] if edit.get('endCard') else 0):.1f}s "
               f"({edit['videoSeconds']:.1f}s of talking plus the end card)",
               f"- Beats: {', '.join(f'{n} {k}' for k, n in kinds.items()) or 'none'}",
               f"- Captions: {'on' if edit['captions'] else 'off'}; music: "
               f"{edit['music']['src'] if edit.get('music') else 'none'}",
               f"- First beat at: {beats[0]['at']:.1f}s ({beats[0]['kind']})" if beats else "- No beats",
               f"- Rendered: {final.name}"]
    fmt_path = d / "format.md"
    if fmt_path.exists():
        fmt = fmt_path.read_text(encoding="utf-8")
        fmt = re.sub(r"<!-- auto:edit -->.*?<!-- /auto:edit -->",
                     "<!-- auto:edit -->\n" + "\n".join(summary) + "\n<!-- /auto:edit -->", fmt, flags=re.S)
        fmt_path.write_text(fmt, encoding="utf-8")
    posts = d / "posts.md"
    if not posts.exists():
        posts.write_text(f"# Posts: {a.slug}\n\n<!-- Write it with the `captions` skill: X, Instagram, YouTube Short or long "
                         "form, LinkedIn. -->\n", encoding="utf-8")
    print("Next: write posts.md (captions skill) once the video is approved.")
    print(f"Wrote {final.relative_to(ROOT)}, captions.srt, thumb-1..3.png, description.md, and updated format.md. "
          "Watch the final, pick the title and thumbnail, then tick '6 Render'. Fill in the results table in "
          "format.md after 48 hours.")


if __name__ == "__main__":
    main()
