"""Find the next reel to make (2026-11-06): python kit/scout.py [--days 21] [--only claude]

The slow part of every video was finding a good reel in the niche. This does that part:
    1. searches YouTube Shorts for each query in research/scout/config.json, plus the watched channels;
    2. reads each Short's numbers (views, likes, comments, posted time, length, channel size);
    3. reads each channel's last 30 Shorts and takes the median, its normal day;
    4. ranks by the multiple over that median (views / normal day), which is the only "went viral" that
       says the idea worked and not the account size;
    5. pulls the full spoken script of the top ones from the auto-captions (nothing is downloaded);
    6. writes research/scout/<date>.md and .json, skipping anything already offered or studied.

Claude then reads the report against research/scout/taste.md and offers Vishnu 3 to 5 ideas (the scout skill).
Reading only, at human volume: about 6 searches and a few dozen lookups a run, once a day at most.
Instagram is not read here: it rate-limits (HTTP 429 on 2026-11-06); links he sends go through kit/study.py.
"""
import argparse
import json
import math
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, read_json, write_json

YTDLP = r"D:\toolbox\.venv\Scripts\yt-dlp.exe"
DIR = ROOT / "research" / "scout"
CACHE = DIR / "cache.json"
SEEN = DIR / "seen.json"
HOOKS = ROOT / "tools" / "instagram-agent-skill" / "skills" / "ig-reel" / "hooks.json"
DAY = 86400


def sh(*a, timeout=180):
    try:
        return subprocess.run([str(x) for x in a], capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=timeout)
    except subprocess.TimeoutExpired:
        return subprocess.CompletedProcess(a, 1, "", "timeout")


def count(s):
    """'88K views' -> 88000."""
    m = re.search(r"([\d.,]+)\s*([KMB]?)", s or "", re.I)
    if not m:
        return 0
    n = float(m.group(1).replace(",", ""))
    return int(n * {"": 1, "K": 1e3, "M": 1e6, "B": 1e9}[m.group(2).upper()])


def short_id(url):
    m = re.search(r"(?:shorts/|v=)([A-Za-z0-9_-]{11})", url)
    return m.group(1) if m else None


def search(query, limit):
    """This month's Shorts for a query, most viewed first, through OpenCLI (the logged-in browser)."""
    r = sh(shutil.which("opencli") or "opencli", "youtube", "search", query, "--type", "shorts", "--upload",
           "month", "--sort", "views", "--limit", limit, "--keep-tab", "false", "-f", "json")
    try:
        rows = json.loads(r.stdout[r.stdout.index("["):])
    except ValueError:
        print(f"  search failed for {query!r}: {r.stderr.strip().splitlines()[-1:] or 'no output'}")
        return []
    return [i for i in (short_id(x.get("url", "")) for x in rows) if i]


def channel_shorts(url, n=30):
    """The channel's latest Shorts with their views (one flat listing, no per-video calls)."""
    r = sh(YTDLP, "--flat-playlist", "--playlist-end", n, "-J", url.rstrip("/") + "/shorts")
    try:
        return [(e["id"], e.get("view_count")) for e in json.loads(r.stdout)["entries"] if e.get("id")]
    except (ValueError, KeyError, TypeError):
        return []


def details(vid):
    r = sh(YTDLP, "-J", "--skip-download", f"https://www.youtube.com/shorts/{vid}")
    try:
        d = json.loads(r.stdout)
    except ValueError:
        return None
    keep = ["id", "title", "channel", "channel_url", "uploader_id", "channel_follower_count", "view_count",
            "like_count", "comment_count", "timestamp", "duration", "description"]
    out = {k: d.get(k) for k in keep}
    out["description"] = (out["description"] or "")[:600]
    out["read_at"] = time.time()
    return out


def transcript(vid):
    """The spoken script with times, from YouTube's auto-captions. Nothing else is downloaded."""
    with tempfile.TemporaryDirectory() as tmp:
        sh(YTDLP, "--skip-download", "--write-auto-subs", "--write-subs", "--sub-langs", "en-orig,en,en.*",
           "--sub-format", "json3", "-o", str(Path(tmp) / "s.%(ext)s"), f"https://www.youtube.com/shorts/{vid}")
        files = sorted(Path(tmp).glob("*.json3"), key=lambda p: ("en-orig" not in p.name, p.name))
        if not files:
            return []
        lines, cur, t0 = [], "", None
        for ev in json.loads(files[0].read_text(encoding="utf-8")).get("events", []):
            for s in ev.get("segs") or []:
                w = s.get("utf8", "")
                if w.strip() and t0 is None:
                    t0 = (ev.get("tStartMs", 0) + s.get("tOffsetMs", 0)) / 1000
                cur += w
                if re.search(r"[.!?]\s*$", cur) or len(cur) > 90:
                    if cur.strip():
                        lines.append((t0 or 0, " ".join(cur.split())))
                    cur, t0 = "", None
        if cur.strip():
            lines.append((t0 or 0, " ".join(cur.split())))
        return lines


def formulas():
    """The 26 hook formulas from the Instagram skill (its hooks.json is data; only the regexes are used)."""
    try:
        d = json.loads(HOOKS.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    by = {h["id"]: h for h in d["hooks"]}
    return [(by[i]["name"], re.compile(by[i]["match"], re.I)) for i in d.get("classify_order", by) if i in by]


def studied():
    """IDs we already studied or offered (seen.json: id -> what Vishnu said), so nothing is offered twice."""
    ids = {p.name for p in (ROOT / "research" / "viral").iterdir() if p.is_dir()}
    if SEEN.exists():
        ids |= set(read_json(SEEN))
    return ids


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, help="newest only: posted within this many days (config max_age_days)")
    ap.add_argument("--only", help="run just the queries containing this word")
    ap.add_argument("--refresh", action="store_true", help="ignore the cache and read every number again")
    a = ap.parse_args()
    cfg = read_json(DIR / "config.json")
    days = a.days or cfg["max_age_days"]
    cache = read_json(CACHE) if CACHE.exists() and not a.refresh else {"videos": {}, "channels": {}}
    now = time.time()

    # Search ignores its date filter for Shorts, so search is for finding channels; freshness comes from the
    # watchlist: each watched channel's latest Shorts, where its standouts (2x its own median) are picked.
    queries = [q for q in cfg["queries"] if not a.only or a.only.lower() in q.lower()]
    found = {}
    for q in queries:
        ids = search(q, cfg["per_query"])
        print(f"  {q!r}: {len(ids)} Shorts")
        for i in ids:
            found.setdefault(i, q)
    watch = cache.setdefault("watch", {})
    for ch in cfg.get("channels", []):
        watch.setdefault(f"https://www.youtube.com/{ch}", {"name": ch, "added": f"{datetime.now():%Y-%m-%d}", "why": "config"})
    urls = list(watch)
    with ThreadPoolExecutor(4) as ex:
        for c, listing in zip(urls, ex.map(channel_shorts, urls)):
            v = [n for _, n in listing if n]
            med = statistics.median(v) if v else None
            cache["channels"][c] = {"median": med, "n": len(v), "read_at": now}
            for i, views in listing[:10]:
                if med and views and views >= max(cfg["min_views"], 2 * med):
                    found.setdefault(i, f"watch: {watch[c]['name']}")
    print(f"  watchlist: {len(urls)} channels")

    skip = studied()
    todo = [i for i in found if i not in skip
            and (i not in cache["videos"] or now - cache["videos"][i]["read_at"] > DAY)]
    print(f"{len(found)} found, {len(todo)} to read")
    with ThreadPoolExecutor(4) as ex:
        for d in ex.map(details, todo):
            if d:
                cache["videos"][d["id"]] = d

    rows = []
    for i, q in found.items():
        d = cache["videos"].get(i)
        if i in skip or not d or not d.get("timestamp") or not d.get("view_count"):
            continue
        age = (now - d["timestamp"]) / DAY
        if age > days or (d.get("duration") or 999) > cfg["max_length_s"] or d["view_count"] < cfg["min_views"]:
            continue
        rows.append(dict(d, age=age, source=q))

    chans = {r["channel_url"] for r in rows if r.get("channel_url")}
    stale = [c for c in chans if c not in cache["channels"] or now - cache["channels"][c]["read_at"] > 3 * DAY]
    with ThreadPoolExecutor(4) as ex:
        for c, listing in zip(stale, ex.map(channel_shorts, stale)):
            v = [n for _, n in listing if n]
            cache["channels"][c] = {"median": statistics.median(v) if v else None, "n": len(v), "read_at": now}
    write_json(CACHE, cache)

    for r in rows:
        med = (cache["channels"].get(r["channel_url"]) or {}).get("median")
        r["median"] = med
        r["multiple"] = r["view_count"] / med if med else None
        r["per_day"] = r["view_count"] / max(r["age"], 0.5)
        r["like_rate"] = (r.get("like_count") or 0) / r["view_count"]
    rows = [r for r in rows if r["multiple"] is None or r["multiple"] >= 1.5]  # under 1.5x is that account's normal day
    # The multiple first; a channel without a readable median ranks by views a day, scaled down so it never jumps the queue.
    rows.sort(key=lambda r: -(r["multiple"] if r["multiple"] else r["per_day"] / 1e6))
    for r in rows:  # a channel that beat itself 3x is worth watching from now on
        if (r["multiple"] or 0) >= 3 and r["channel_url"] not in watch:
            watch[r["channel_url"]] = {"name": r["channel"], "added": f"{datetime.now():%Y-%m-%d}",
                                       "why": f"{r['multiple']:.0f}x on {r['id']}"}
    write_json(CACHE, cache)
    rows = rows[:cfg["show"]]

    hooks = formulas()
    for r in rows[:cfg["transcripts"]]:
        r["script"] = transcript(r["id"])
        first = " ".join(t for s, t in r["script"] if s < 3.0) or (r["script"][0][1] if r["script"] else "")
        r["hook"] = first
        r["formula"] = next((n for n, p in hooks if p.search(first)), "unclassified") if first else ""

    stamp = datetime.now().strftime("%Y-%m-%d") + (f"-{a.only.lower()}" if a.only else "")  # a narrow run never overwrites the full one
    write_json(DIR / f"{stamp}.json", rows)
    (DIR / f"{stamp}.md").write_text(report(rows, days, len(found)), encoding="utf-8")
    print(f"Wrote research/scout/{stamp}.md ({len(rows)} reels, {sum(1 for r in rows if r.get('script'))} with scripts)")


def n(x):
    return "?" if x is None else f"{x / 1e6:.1f}M" if x >= 1e6 else f"{x / 1e3:.0f}K" if x >= 1e3 else str(int(x))


def report(rows, days, found):
    when = lambda r: datetime.fromtimestamp(r["timestamp"], timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out = [f"# Scout {datetime.now():%Y-%m-%d}", "",
           f"YouTube Shorts posted in the last {days} days, {found} found, ranked by views over the channel's own "
           "median (its normal day). Above 3x is a signal, under 1.5x is that account's normal day.", "",
           "| # | Reel | Channel | Posted | Views | x normal | Views a day | Likes | Comments | Length | Hook formula |",
           "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"]
    for k, r in enumerate(rows, 1):
        mult = f"{r['multiple']:.1f}x" if r.get("multiple") else "?"
        out.append(f"| {k} | [{r['title'][:60].replace('|', '/')}](https://www.youtube.com/shorts/{r['id']}) | {r['channel'].replace('|', '/')} "
                   f"({n(r.get('channel_follower_count'))}) | {when(r)[:10]} ({r['age']:.0f} d) | {n(r['view_count'])} "
                   f"| {mult} | {n(r['per_day'])} | {n(r.get('like_count'))} ({r['like_rate']:.1%}) "
                   f"| {n(r.get('comment_count'))} | {r.get('duration')} s | {r.get('formula', '')} |")
    for k, r in enumerate(rows, 1):
        if not r.get("script"):
            continue
        out += ["", f"## {k}. {r['title']}", "",
                f"https://www.youtube.com/shorts/{r['id']} · {r['channel']} ({n(r.get('channel_follower_count'))} subscribers) "
                f"· posted {when(r)} · found by {r['source']}",
                f"Views {r['view_count']:,} ({r['multiple']:.1f}x the channel's median of {n(r['median'])}) · "
                f"likes {r.get('like_count') or 0:,} · comments {r.get('comment_count') or 0:,} · {r.get('duration')} s"
                if r.get("multiple") else f"Views {r['view_count']:,} · channel median unreadable", "",
                f"Hook (first 3 s): \"{r['hook']}\" ({r['formula']})", "", "Script:", ""]
        out += [f"- {s:5.1f}  {t}" for s, t in r["script"]]
    out += ["", "Numbers read from YouTube at the time of the run. Copy the structure, never the words or the visuals."]
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    main()
