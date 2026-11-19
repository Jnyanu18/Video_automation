"""Stage 1, the voice: python lanes/animated/speak.py <slug> [--only N] [--force] [--from-files]

--from-files: Vishnu's own takes (recorded, or made with a web voice clone of his voice) dropped into
voice/ as part-01.wav, part-02.m4a and so on, one per paragraph. They are converted and joined the same
way, and the result is not a draft.

One voice file per script paragraph (voice/part-NN.mp3), then joined into voice/voice.mp3 with a short
pause between paragraphs, so a single bad take is re-rolled with --only N.

The ElevenLabs voice ELEVENLABS_VOICE_ID is used when a key is set: ELEVENLABS_API_KEY, then
ELEVENLABS_API_KEY_2, _3 and so on, each tried in turn when the one before is out of credits. Otherwise a
stand-in voice is used and voice/DRAFT-VOICE.txt marks it: never publish that. Keys are read from the
environment (or the Windows user environment, so no restart is needed) and never printed or written.

--sample: the voice pick. Speaks the first paragraph to voice/sample.mp3 and writes the voice's name into
CHECKS.md as '0b Voice pick'. The full run waits until Vishnu has heard it and that line is ticked, and asks
again whenever ELEVENLABS_VOICE_ID changes.
"""
import argparse
import asyncio
import json
import os
import re
import subprocess
import urllib.error
import urllib.request
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))  # common.py, captions.py
from common import require, script_paragraphs, ticked, video_dir

STAND_IN = "en-IN-PrabhatNeural"  # Indian English male, the closest free stand-in
PAUSE = 0.1  # no dead space (Vishnu, 2026-10-29): the gap between parts, the same as every silence inside one
PICK = "0b Voice pick"
API = "https://api.elevenlabs.io/v1"


def env(name: str) -> str:
    """A variable from this process, or from the Windows user environment if it was set after start."""
    if os.environ.get(name):
        return os.environ[name]
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
            return winreg.QueryValueEx(k, name)[0]
    except (ImportError, OSError):
        return ""


def keys() -> list[str]:
    found = [env("ELEVENLABS_API_KEY")] + [env(f"ELEVENLABS_API_KEY_{n}") for n in range(2, 10)]
    return [k for k in found if k]


_key = 0  # index of the key in use; moves on when one runs out of credits


def call(url: str, body: dict | None = None) -> bytes:
    global _key
    ks = keys()
    while _key < len(ks):
        req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                                     headers={"xi-api-key": ks[_key], "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")
            # Out of credits, the voice lives on another account (a clone is per account), or the feature needs a
            # paid plan (Music, 2026-10-23: key 1 is free): try the next key.
            if not any(c in detail for c in ("quota_exceeded", "voice_not_found", "paid_plan_required")):
                raise SystemExit(f"ElevenLabs refused (key {_key + 1}, HTTP {e.code}): {detail[:300]}")
            why = ("is out of credits" if "quota_exceeded" in detail else
                   "is on a free plan" if "paid_plan_required" in detail else "does not have this voice")
            print(f"ElevenLabs key {_key + 1} {why}; trying the next one.")
            _key += 1
    raise SystemExit(f"No ElevenLabs key ({len(ks)}) could do this: each is out of credits or lacks the voice. "
                     f"Add ELEVENLABS_API_KEY_{len(ks) + 1}, or add the voice to an account that has credits.")


def voice_name(voice: str) -> str:
    return json.loads(call(f"{API}/voices/{voice}")).get("name", "unnamed")


VOICE, MODEL, TEMPO = "", "eleven_multilingual_v2", 1.0
KEEP, FLOOR = 0.1, -45
SAY: dict[str, str] = {}
SETTINGS = {
    # v3 reads emotion cues in the script ([softly], [curious]); its stability is 0, 0.5 or 1.
    "eleven_v3": {"stability": 0.5},
    "eleven_multilingual_v2": {"stability": 0.45, "similarity_boost": 0.85, "style": 0.15},
}


def choose(vdir) -> None:
    """This video's voice and model: voice/settings.json if it exists, else ELEVENLABS_VOICE_ID on v2.
    "say" in settings.json spells a word the way it should be spoken, e.g. {"Auralion": "Aura Lion"}: the voice
    gets the spoken spelling, the script (and so the captions' check) keeps the real one."""
    global VOICE, MODEL, TEMPO, SAY, KEEP, FLOOR
    p = vdir / "settings.json"
    s = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    VOICE = s.get("voice_id") or env("ELEVENLABS_VOICE_ID")
    MODEL = s.get("model") or MODEL
    TEMPO = float(s.get("tempo", 1.0))
    SAY = s.get("say", {})
    # "keep_pause" (seconds) and "floor_db": how long a silence inside a part may stay, and how quiet counts as silence.
    # The defaults (0.1 s, -45 dB) cut breaths, the pause after a cue and the soft tail of a laugh, which made the v3
    # emotion cues sound clipped (Vishnu, 2026-11-06); an acted take uses about 0.35 s and -60 dB.
    KEEP = float(s.get("keep_pause", 0.1))
    FLOOR = int(s.get("floor_db", -45))


def eleven(text: str, out) -> None:
    for written, spoken in SAY.items():
        text = text.replace(written, spoken)
    if MODEL != "eleven_v3":
        text = re.sub(r" ?\[[a-z -]+\] ?", " ", text).strip()  # only v3 understands the cues
    out.write_bytes(call(f"{API}/text-to-speech/{VOICE}?output_format=mp3_44100_128", {
        "text": text,
        "model_id": MODEL,
        "voice_settings": SETTINGS.get(MODEL, {}),
    }))


def set_pick_line(slug: str, line: str) -> None:
    """Write (or rewrite, unticked) the voice pick line in CHECKS.md, just under the brief."""
    p = video_dir(slug) / "CHECKS.md"
    text = p.read_text(encoding="utf-8")
    text = re.sub(rf"^- \[.\] {PICK}.*\n", "", text, flags=re.M)
    text = re.sub(r"^(- \[.\] 0 Brief.*\n)", rf"\1{line}\n", text, count=1, flags=re.M)
    p.write_text(text, encoding="utf-8")


def picked_id(slug: str) -> str:
    """The voice id on the ticked pick line, or '' if there is none."""
    if not ticked(slug, PICK):
        return ""
    m = re.search(rf"^- \[x\] {PICK}.*\(([^)]+)\)", (video_dir(slug) / "CHECKS.md").read_text(encoding="utf-8"),
                  re.M | re.I)
    return m.group(1) if m else ""


def stand_in(text: str, out) -> None:
    import edge_tts

    async def go():
        await edge_tts.Communicate(text, STAND_IN, rate="+4%").save(str(out))

    asyncio.run(go())


def join_parts(vdir, n: int, tempo: float = 1.0) -> None:
    """Join every part with a short pause; parts from an earlier run are reused unless re-rolled. `tempo` speeds
    the whole voice up without changing its pitch (voice/settings.json "tempo", for a voice that speaks slowly)."""
    parts = [vdir / f"part-{i:02d}.mp3" for i in range(1, n + 1)]
    missing = [p.name for p in parts if not p.exists()]
    if missing:
        raise SystemExit(f"Missing {missing}: run without --only first.")
    # Each part is cut on its own into voice/cut/part-NN.wav (tempo applied), and those are what transcribe.py times,
    # so the words line up with the joined file. No dead space (Vishnu, 2026-10-29): every silence, leading and inside,
    # is cut to 0.1 s; it took the Jarvis voice from 56.1 s to 47.8 s. ElevenLabs also ends some parts mid-sound, and
    # the jump to silence clicks at every join (Vishnu heard it, 2026-10-28): a fade too short to hear at each end of
    # every part removes it, applied after the cut so the cut's own edges are covered too.
    speed = f",atempo={tempo}" if tempo != 1.0 else ""
    trim = (f"silenceremove=start_periods=1:start_threshold={FLOOR}dB:start_silence=0.05"
            f":stop_periods=-1:stop_duration={KEEP}:stop_threshold={FLOOR}dB:stop_silence={KEEP}")
    edges = "afade=t=in:d=0.008,areverse,afade=t=in:d=0.025,areverse"
    cut = vdir / "cut"
    cut.mkdir(exist_ok=True)
    for p in parts:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(p), "-af",
                        f"aresample=44100,aformat=channel_layouts=mono{speed},{trim},{edges}", str(cut / f"{p.stem}.wav")], check=True)
    # Pad each with the short pause and join in one filter graph. (The concat demuxer silently drops time when parts
    # and pauses differ in sample rate.)
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for p in parts:
        cmd += ["-i", str(cut / f"{p.stem}.wav")]
    chains = [f"[{k}:a]anull" + (f",apad=pad_dur={PAUSE}" if k < len(parts) - 1 else "") + f"[a{k}]" for k in range(len(parts))]
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
    ap.add_argument("--sample", action="store_true", help="the voice pick: speak paragraph 1 to voice/sample.mp3")
    a = ap.parse_args()

    require(a.slug, "0 Brief", a.force)
    d = video_dir(a.slug)
    vdir = d / "voice"
    vdir.mkdir(exist_ok=True)
    paras = script_paragraphs(a.slug, cues=True)
    if not paras:
        raise SystemExit("script.md has no spoken paragraphs yet.")

    choose(vdir)
    voice = VOICE
    if a.sample:
        if not (keys() and voice):
            raise SystemExit("Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID first (see brand/VOICE-SETUP.md).")
        name = f"{voice_name(voice)} on {MODEL}"
        eleven(paras[0], vdir / "sample.mp3")
        set_pick_line(a.slug, f"- [ ] {PICK}: {name} ({voice}), heard in voice/sample.mp3")
        print(f"The selected voice is {name} ({voice}). Sample: videos/{a.slug}/voice/sample.mp3. "
              f"Ask Vishnu: continue with it, or change it?")
        return

    cloned = a.from_files or bool(keys() and voice)
    if cloned and not a.from_files and picked_id(a.slug) != voice and not a.force:
        raise SystemExit(f"The voice ({voice}) has not been picked for this video. Run with --sample, let Vishnu "
                         f"hear it, and tick '{PICK}' in CHECKS.md.")
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
        join_parts(vdir, len(paras), TEMPO)

    (vdir / "meta.json").write_text(json.dumps({"draft": not cloned}) + "\n", encoding="utf-8")
    if cloned:
        marker.unlink(missing_ok=True)
        print("Voice: Vishnu's own takes." if a.from_files else f"Voice: ElevenLabs ({voice}).")
    else:
        marker.write_text("Made with a stand-in voice. Do not publish. Set ELEVENLABS_API_KEY and "
                          "ELEVENLABS_VOICE_ID and run speak.py again.\n", encoding="utf-8")
        print("Voice: STAND-IN (draft). Not for publishing.")
    print(f"Wrote videos/{a.slug}/voice/voice.mp3. Listen to the whole take, then tick '1 Voice' in CHECKS.md.")


if __name__ == "__main__":
    main()
