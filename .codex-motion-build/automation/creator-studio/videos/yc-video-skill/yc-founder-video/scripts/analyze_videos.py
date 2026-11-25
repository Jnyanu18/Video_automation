"""Compare accepted and rejected YC founder videos, from the ycarena.com Partner Simulator list.

Needs Python 3.9+ and yt-dlp on the PATH (pip install yt-dlp). Downloads captions only, never the videos, prints
the table, then deletes the captions.

    python analyze_videos.py            # all ~100 videos, about 3 minutes
    python analyze_videos.py --limit 10 # a quick test
"""
import argparse, glob, json, re, shutil, statistics as st, subprocess, tempfile, urllib.request
from pathlib import Path

LIST = "https://ycarena.com/assets/js/applications.js"
SIGNALS = {
    "Money traction ($, revenue, paying, MRR)": r"(\$|\bdollars?\b|\brevenue\b|\bpaying\b|\bmrr\b|\barr\b)",
    "Any number": r"\b(\d[\d,.]*|hundred|thousand|million|billion|percent|twice|doubl\w*)\b",
    "Traction (users, customers, growth, waitlist)": r"\b(users|customers|revenue|paying|growing|grew|growth|waitlist|pilot|sales)\b",
    "Founder background (worked at, PhD, built)": r"\b(worked at|engineer at|former|ex-?\w+|phd|previously|built|founded|co-?founded|sold|exited|acquired)\b",
    "Hype words": r"\b(revolution\w*|disrupt\w*|passion\w*|dream\w*|game.?chang\w*|world.?class|seamless\w*)\b",
    "Market size talk (TAM, billion market)": r"\b(tam|total addressable|billion dollar market|market size)\b",
    "Asks to be accepted": r"\b(accept us|pick us|please (accept|choose|pick))\b",
}


def videos():
    js = urllib.request.urlopen(urllib.request.Request(LIST, headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read().decode()
    rows = re.findall(r'\{videoId:"([^"]+)",wasAccepted:!([01])', js)
    return [(vid, flag == "0") for vid, flag in rows]


def caption_text(path):
    lines = []
    for line in open(path, encoding="utf-8", errors="replace"):
        line = re.sub(r"<[^>]+>", "", line.strip())
        if not line or "-->" in line or line.startswith(("WEBVTT", "Kind:", "Language:")):
            continue
        if not lines or lines[-1] != line:
            lines.append(line)
    return re.sub(r"(\b.{20,}?\b)( \1)+", r"\1", " ".join(lines)).lower()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    vids = videos()[: a.limit or None]
    tmp = Path(tempfile.mkdtemp())
    try:
        (tmp / "ids.txt").write_text("\n".join(v for v, _ in vids))
        subprocess.run(["yt-dlp", "--skip-download", "--write-auto-subs", "--write-subs", "--sub-langs", "en.*",
                        "--sub-format", "vtt", "-o", str(tmp / "%(id)s.%(ext)s"), "--print-to-file",
                        "%(id)s|%(duration)s", str(tmp / "meta.txt"), "--no-simulate", "-a", str(tmp / "ids.txt"),
                        "--ignore-errors", "-q", "--no-warnings"], check=False)
        dur = dict(l.strip().split("|") for l in open(tmp / "meta.txt") if "|" in l) if (tmp / "meta.txt").exists() else {}
        rows = []
        for vid, acc in vids:
            subs = sorted(glob.glob(str(tmp / f"{vid}.en*.vtt")), key=lambda f: ("orig" not in f, len(f)))
            if not subs or dur.get(vid, "NA") in ("NA", ""):
                continue
            rows.append((acc, float(dur[vid]), caption_text(subs[0])))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    A = [r for r in rows if r[0]]
    R = [r for r in rows if not r[0]]
    if not A or not R:
        raise SystemExit("Not enough captions came back to compare.")
    pct = lambda g, f: f"{100 * sum(bool(f(r)) for r in g) / len(g):.0f}%"
    print(f"{len(A)} accepted, {len(R)} rejected (captions found)\n")
    print(f"{'Signal':48} Accepted  Rejected")
    for name, rx in SIGNALS.items():
        print(f"{name:48} {pct(A, lambda r: re.search(rx, r[2])):>8}  {pct(R, lambda r: re.search(rx, r[2])):>8}")
    print(f"{'Median length (seconds)':48} {st.median(r[1] for r in A):>8.0f}  {st.median(r[1] for r in R):>8.0f}")
    print(f"{'Over 75 seconds':48} {pct(A, lambda r: r[1] > 75):>8}  {pct(R, lambda r: r[1] > 75):>8}")
    print("\nKeyword counts on auto-captions: signals, not proof.")


if __name__ == "__main__":
    main()
