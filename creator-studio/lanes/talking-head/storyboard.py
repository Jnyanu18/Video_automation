"""Talking head, the storyboard: python lanes/talking-head/storyboard.py <slug>

The rule never broken (Vishnu, 2026-10-23): no preview or final render until he has approved this. Reads
work/edit.json (from plan.py --no-preview), draws one still per beat with renderStill (single frames are
cheap), and lays them out on work/storyboard.png with each beat's time, the words spoken, what is on screen,
the look and the sound. Writes the same as a table in work/storyboard.md, with the music, the length and the
covers listed. Cover stills, if any, are made with kit/remotion.mjs cover and shown under out/covers/.
"""
import argparse
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))  # common.py
from common import ROOT, read_json, video_dir

TILE_W, TILE_H, TEXT_H = 360, 640, 250


def spoken(words, t0, t1):
    return " ".join(w["w"] for w in words if w["start"] < t1 and w["end"] > t0)


def num(v, decimals=0):
    return f"{v:,.{decimals}f}"


def on_screen(b):
    k = b["kind"]
    if k == "zoom":
        return f"zoom to {b['scale']}"
    if k == "text":
        return f'card: "{b["text"]}"'
    if k == "stat":
        return f"stat: {b['prefix']}{num(b['value'])}{b['suffix']} {b['label']}"
    if k == "chips":
        return "chips: " + " / ".join(c["text"] for c in b["items"])
    if k == "glass":
        return f"liquid glass: {b['title']} {b['prefix']}{num(b['endValue'], b['decimals'])}{b['suffix']}"
    if k == "panel":
        parts = [x.split("/")[-1] for x in b["parts"]]
        return f"{b['look']}: " + " / ".join(x.lstrip("*!") for x in parts)
    if k == "screen":
        return 'full screen: "' + " ".join(w["text"] for w in b["words"]) + '"'
    return k


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    a = ap.parse_args()
    d = video_dir(a.slug)
    work = d / "work"
    edit = read_json(work / "edit.json")
    words, beats = edit["words"], edit["beats"]
    settings = dict(re.findall(r"^([\w-]+):\s*(.+)$", (d / "edit.md").read_text(encoding="utf-8"), re.M))

    # Numbers count up, so show them once they have landed; everything else just after it appears.
    frames = [int((b["at"] + (b["dur"] * 0.8 if b["kind"] in ("stat", "glass") or b.get("look") in ("term", "doodle", "versions", "count") else min(0.6, b["dur"] / 2))) * 30) for b in beats]
    stills = work / "storyboard"
    shutil.rmtree(stills, ignore_errors=True)
    stills.mkdir()
    if edit.get("engine", "remotion") == "hyperframes":
        import hf
        hf.check(hf.build(a.slug))
        last = int(edit["videoSeconds"] * 30) - 1
        for f, p in zip(frames, hf.stills(a.slug, [min(f, last) / 30 for f in frames])):
            shutil.copy2(p, stills / f"frame-{min(f, last):05d}.png")
    else:
        subprocess.run(["node", str(ROOT / "kit" / "remotion.mjs"), "th-stills", a.slug, str(stills),
                        ",".join(map(str, frames))], check=True, cwd=ROOT)

    from PIL import Image, ImageDraw, ImageFont
    font = lambda s, bold=False: ImageFont.truetype("C:/Windows/Fonts/" + ("segoeuib.ttf" if bold else "segoeui.ttf"), s)
    cols = 5
    rows = math.ceil(len(beats) / cols)
    pad = 16
    sheet = Image.new("RGB", (cols * (TILE_W + pad) + pad, rows * (TILE_H + TEXT_H + pad) + pad + 90), "#f2f2f2")
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 24), f"Storyboard: {a.slug}  .  {edit['videoSeconds']:.1f}s + end card  .  style {edit['style']}  .  "
                       f"music {settings.get('music-mix', 'none')}", font=font(30, True), fill="#111")
    rows_md = []
    for i, (b, f) in enumerate(zip(beats, frames)):
        x = pad + (i % cols) * (TILE_W + pad)
        y = 90 + pad + (i // cols) * (TILE_H + TEXT_H + pad)
        p = stills / f"frame-{min(f, int(edit['videoSeconds'] * 30) - 1):05d}.png"
        if p.exists():
            sheet.paste(Image.open(p).convert("RGB").resize((TILE_W, TILE_H)), (x, y))
        say = spoken(words, b["at"], b["at"] + b["dur"])
        what = on_screen(b)
        sound = Path(b["sound"]).stem if b.get("sound") else "-"
        dr.rectangle([x, y + TILE_H, x + TILE_W, y + TILE_H + TEXT_H], fill="#ffffff")
        dr.text((x + 12, y + TILE_H + 8), f"{i + 1}.  {b['at']:.1f}s  ({b['dur']:.1f}s)", font=font(22, True), fill="#111")
        lines, cur = [], ""
        for word in f'"{say}"'.split():
            if len(cur) + len(word) > 34:
                lines.append(cur)
                cur = word
            else:
                cur = f"{cur} {word}".strip()
        lines.append(cur)
        dr.multiline_text((x + 12, y + TILE_H + 40), "\n".join(lines[:4]), font=font(19), fill="#444", spacing=3)
        dr.text((x + 12, y + TILE_H + 150), what[:38], font=font(19, True), fill="#a97a00")
        dr.text((x + 12, y + TILE_H + 180), what[38:76], font=font(19, True), fill="#a97a00")
        dr.text((x + 12, y + TILE_H + 212), f"sound: {sound}", font=font(18), fill="#5c6472")
        rows_md.append(f"| {i + 1} | {b['at']:.1f}s | {say} | {what} | {sound} |")
    sheet.save(work / "storyboard.png")

    covers = sorted((d / "out" / "covers").glob("cover-*.png")) if (d / "out" / "covers").exists() else []
    md = [f"# Storyboard: {a.slug}", "",
          f"Length {edit['videoSeconds']:.1f}s plus a {edit['endSeconds']}s end card. Style `{edit['style']}`. "
          f"Captions {'on' if edit['captions'] else 'off'}. Lower third: "
          f"{edit['lowerThird']['name'] + ', ' + edit['lowerThird']['line'] + ' at ' + str(edit['lowerThird']['at']) + 's' if edit.get('lowerThird') else 'none'}.",
          f"End card: {edit['endCard']['question'] + ' / ' + edit['endCard']['url'] if edit.get('endCard') else 'none'}.",
          f"Music: {settings.get('music-mix', 'none')}. Sound effects at {edit['sfxVolume']}.", "",
          "| # | At | Spoken | On screen | Sound |", "| --- | --- | --- | --- | --- |", *rows_md, "",
          "Covers: " + (", ".join(f"out/covers/{c.name}" for c in covers) if covers else "none yet"), "",
          "Nothing is rendered until Vishnu approves this storyboard."]
    (work / "storyboard.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"Wrote work/storyboard.png and work/storyboard.md ({len(beats)} beats). Show both to Vishnu; render only on his yes.")


if __name__ == "__main__":
    main()
