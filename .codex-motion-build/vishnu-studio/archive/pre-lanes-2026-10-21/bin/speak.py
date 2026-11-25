"""Stage 1, the voice: python bin/speak.py <slug> [--only N] [--force] [--from-files]

--from-files: Vishnu's own takes (recorded, or made with a web voice clone of his voice) dropped into
voice/ as part-01.wav, part-02.m4a and so on, one per paragraph. They are converted and joined the same
way, and the result is not a draft.

One voice file per script paragraph (voice/part-NN.mp3), then joined into voice/voice.mp3 with a short
pause between paragraphs, so a single bad take is re-rolled with --only N.

Vishnu's cloned voice is used when ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are set in the
environment. Otherwise a stand-in voice is used and voice/DRAFT-VOICE.txt marks it: never publish that.
The key is read from the environment only, never printed or written anywhere.
"""
import argparse
import asyncio
import json
import os
import subprocess
import urllib.request
from common import require, script_paragraphs, video_dir

STAND_IN = "en-IN-PrabhatNeural"  # Indian English male, the closest free stand-in
PAUSE = 0.35


def eleven(text: str, out) -> None:
    voice = os.environ["ELEVENLABS_VOICE_ID"]
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
        data=json.dumps({
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.85, "style": 0.15},
        }).encode(),
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        out.write_bytes(r.read())


def stand_in(text: str, out) -> None:
    import edge_tts

    async def go():
        await edge_tts.Communicate(text, STAND_IN, rate="+4%").save(str(out))

    asyncio.run(go())


def join_parts(vdir, n: int) -> None:
    """Join every part with a short pause; parts from an earlier run are reused unless re-rolled."""
    parts = [vdir / f"part-{i:02d}.mp3" for i in range(1, n + 1)]
    missing = [p.name for p in parts if not p.exists()]
    if missing:
        raise SystemExit(f"Missing {missing}: run without --only first.")
    # Resample every part to one format and pad each with a short pause, then join. (The concat
    # demuxer silently drops time when parts and pauses differ in sample rate.)
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for p in parts:
        cmd += ["-i", str(p)]
    chains = [f"[{k}:a]aresample=44100,aformat=channel_layouts=mono"
              + (f",apad=pad_dur={PAUSE}" if k < len(parts) - 1 else "") + f"[a{k}]" for k in range(len(parts))]
    graph = ";".join(chains) + ";" + "".join(f"[a{k}]" for k in range(len(parts))) + f"concat=n={len(parts)}:v=0:a=1[out]"
    cmd += ["-filter_complex", graph, "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "160k", str(vdir / "voice.mp3")]
    subprocess.run(cmd, check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--only", type=int, help="re-roll one paragraph, numbered from 1")
    ap.add_argument("--force", action="store_true", help="run without the brief ticked (draft only)")
    ap.add_argument("--from-files", action="store_true",
                    help="use Vishnu's own takes (voice/part-NN.wav/.m4a/.mp3...) made outside, e.g. a web voice clone")
    a = ap.parse_args()

    require(a.slug, "0 Brief", a.force)
    d = video_dir(a.slug)
    vdir = d / "voice"
    vdir.mkdir(exist_ok=True)
    paras = script_paragraphs(a.slug)
    if not paras:
        raise SystemExit("script.md has no spoken paragraphs yet.")

    cloned = a.from_files or bool(os.environ.get("ELEVENLABS_API_KEY") and os.environ.get("ELEVENLABS_VOICE_ID"))
    say = eleven if cloned else stand_in
    marker = vdir / "DRAFT-VOICE.txt"

    exts = (".wav", ".m4a", ".flac", ".ogg", ".webm", ".mp3")
    take = next((p for ext in exts if (p := vdir / f"take{ext}").exists()), None) if a.from_files else None
    if take:
        # One take of the whole script: it is the voice track as is, no parts and no joining.
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(take), "-ac", "1", "-ar", "44100",
                        "-c:a", "libmp3lame", "-b:a", "192k", str(vdir / "voice.mp3")], check=True)
        print(f"whole take: {take.name}")
    elif a.from_files:
        # Takes come in as whatever the web tool downloads; each becomes part-NN.mp3 like a generated one.
        missing = []
        for i in range(1, len(paras) + 1):
            src = next((p for ext in (".wav", ".m4a", ".flac", ".ogg", ".webm")
                        if (p := vdir / f"part-{i:02d}{ext}").exists()), None)
            if src:
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-ac", "1", "-ar", "44100",
                                "-c:a", "libmp3lame", "-b:a", "192k", str(vdir / f"part-{i:02d}.mp3")], check=True)
                print(f"part {i:02d}: {src.name}")
            elif not (vdir / f"part-{i:02d}.mp3").exists():
                missing.append(f"part-{i:02d}")
        if missing:
            raise SystemExit(f"No take for {missing} in videos/{a.slug}/voice/. Drop in take.<ext> (the whole "
                             f"script) or one part-NN.<ext> per script paragraph.")

    for i, text in enumerate(paras, 1):
        if a.from_files or (a.only and i != a.only):
            continue
        out = vdir / f"part-{i:02d}.mp3"
        print(f"part {i:02d}: {text[:70]}{'...' if len(text) > 70 else ''}")
        say(text, out)

    if not take:
        join_parts(vdir, len(paras))

    (vdir / "meta.json").write_text(json.dumps({"draft": not cloned}) + "\n", encoding="utf-8")
    if cloned:
        marker.unlink(missing_ok=True)
        print("Voice: Vishnu's own takes." if a.from_files else "Voice: Vishnu's clone.")
    else:
        marker.write_text("Made with a stand-in voice. Do not publish. Set ELEVENLABS_API_KEY and "
                          "ELEVENLABS_VOICE_ID and run speak.py again.\n", encoding="utf-8")
        print("Voice: STAND-IN (draft). Not for publishing.")
    print(f"Wrote videos/{a.slug}/voice/voice.mp3. Listen to the whole take, then tick '1 Voice' in CHECKS.md.")


if __name__ == "__main__":
    main()
