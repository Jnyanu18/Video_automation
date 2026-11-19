"""Background music: make a track with ElevenLabs Music, and mix it under the voice of a finished video.

    python kit/music.py make <slug> "<prompt>" --seconds 50 [--takes 3]
    python kit/music.py plan <slug> <plan.json> [--takes 3]
    python kit/music.py mix <in.mp4> <track.mp3> <out.mp4> [--drop 12.4-13.1 ...] [--bed -26]

plan composes to the story instead of one looping mood (Vishnu, 2026-10-23): plan.json is an ElevenLabs
composition plan, global styles plus one section per part of the video, each with its own styles and its length
in milliseconds (3,000 or more), taken from the cut's real timings.

make writes videos/<slug>/music/track-1.mp3 and so on, one per take, for Vishnu to pick from by ear (a pick is a
check like the voice). Uses the same rotating ELEVENLABS_API_KEY, _2, ... as narration; tracks from a paid plan
may be used commercially (Eleven Music terms).

mix keeps the picture as it is and builds the sound: the music levelled to a quiet bed (--bed, in LUFS), ducked
further whenever he speaks (sidechain: fast attack, slow release, so it breathes back up between lines), silent
during each --drop window (the beat of silence before a punchline), faded out at the end, then the whole mix
brought to -14 LUFS like every other final.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "lanes" / "animated"))
from speak import API, call  # noqa: E402  (key rotation lives there)


def duration(p: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(p)],
                         capture_output=True, text=True, check=True).stdout
    return float(json.loads(out)["format"]["duration"])


def make(slug: str, prompt: str, seconds: float, takes: int) -> None:
    out = ROOT / "videos" / slug / "music"
    out.mkdir(parents=True, exist_ok=True)
    n = len(list(out.glob("track-*.mp3")))
    for i in range(takes):
        audio = call(f"{API}/music", {"prompt": prompt, "music_length_ms": int(seconds * 1000)})
        p = out / f"track-{n + i + 1}.mp3"
        p.write_bytes(audio)
        print(f"{p}  ({duration(p):.1f}s)")
    (out / "prompt.txt").write_text(prompt + "\n", encoding="utf-8")


def plan(slug: str, plan_file: Path, takes: int) -> None:
    out = ROOT / "videos" / slug / "music"
    out.mkdir(parents=True, exist_ok=True)
    body = {"composition_plan": json.loads(plan_file.read_text(encoding="utf-8"))}
    n = len(list(out.glob("track-*.mp3")))
    for i in range(takes):
        p = out / f"track-{n + i + 1}.mp3"
        p.write_bytes(call(f"{API}/music", body))
        print(f"{p}  ({duration(p):.1f}s)")


def mix(src: Path, track: Path, dst: Path, drops: list[str], bed: float) -> None:
    d = duration(src)
    mute = "".join(f",volume=enable='between(t,{a},{b})':volume=0" for a, b in (w.split("-") for w in drops))
    graph = (
        # the voice padded with silence to the picture's length: sidechaincompress stops when its key stops, which cut the
        # music 1.6 s before the end card finished (33-claude-killed-instagram, 2026-11-06)
        f"[0:a]apad=whole_dur={d:.3f},asplit=2[voice][key];"
        f"[1:a]loudnorm=I={bed}:TP=-6,atrim=0:{d:.3f},afade=t=in:d=0.3,afade=t=out:st={max(0, d - 1.5):.3f}:d=1.5{mute}[bed];"
        # a gentle duck: at ratio 6 the bed vanished under a voice that never pauses (34-three-agents: music heard in 14%
        # of the film, earshot critical, 2026-11-06); ratio 2.5 keeps it under the voice the whole time
        "[bed][key]sidechaincompress=threshold=0.05:ratio=2.5:attack=60:release=500[ducked];"
        # loudnorm alone overshot its -1.5 dBTP target (32-floorplan-map measured -0.2 dBTP with earshot, 2026-11-06), and
        # the AAC encode adds more: a hard limit at -2 dBFS after it keeps the final at or under about -1 dBTP.
        # duration=longest: the music runs under the end card to the last frame (with duration=first the sound stopped
        # when the voice track did, 1.6 s before the picture ended on 33-claude-killed-instagram, 2026-11-06)
        "[voice][ducked]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,"
        "aresample=48000,alimiter=limit=0.79:attack=1:release=50:level=disabled[a]"
    )
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-i", str(track), "-filter_complex", graph,
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", str(dst)], check=True)
    print(dst)


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    m = sub.add_parser("make")
    m.add_argument("slug")
    m.add_argument("prompt")
    m.add_argument("--seconds", type=float, required=True)
    m.add_argument("--takes", type=int, default=3)
    pl = sub.add_parser("plan")
    pl.add_argument("slug")
    pl.add_argument("plan_file", type=Path)
    pl.add_argument("--takes", type=int, default=3)
    x = sub.add_parser("mix")
    x.add_argument("src", type=Path)
    x.add_argument("track", type=Path)
    x.add_argument("dst", type=Path)
    x.add_argument("--drop", action="append", default=[], help="seconds a-b with no music, e.g. 12.4-13.1")
    # -19: at -26 the bed was heard in only 29% of a reel whose voice never pauses (34-three-agents, earshot, 2026-11-06); -19 gave 86%
    x.add_argument("--bed", type=float, default=-19, help="music loudness before ducking, LUFS")
    a = ap.parse_args()
    if a.cmd in ("make", "plan"):
        # 36,000 of 40,000 credits went on music in one week (2026-10-22 to 10-28); Vishnu: no ElevenLabs music.
        sys.exit("ElevenLabs music is off (Vishnu, 2026-10-29). Pick a track we already have (videos/*/music/).")
    if a.cmd == "make":
        make(a.slug, a.prompt, a.seconds, a.takes)
    elif a.cmd == "plan":
        plan(a.slug, a.plan_file, a.takes)
    else:
        mix(a.src, a.track, a.dst, a.drop, a.bed)


if __name__ == "__main__":
    main()
