# Per-line edge-tts with controlled gaps: lines starting with "|" begin a new section (longer gap).
# Writes one VO file + words.json with absolute timings. Stand-in voice only.
import asyncio, json, subprocess, sys, os, tempfile
lines_path, voice, rate, out_wav, out_json = sys.argv[1:6]
GAP, SECTION = 0.32, 0.62
async def one(text, mp3):
    import edge_tts
    c = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary"); ws = []
    with open(mp3, "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio": f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                s = ch["offset"] / 1e7; ws.append({"w": ch["text"], "s": s, "e": s + ch["duration"] / 1e7})
    return ws
async def main():
    tmp = tempfile.mkdtemp(); parts = []; words = []; t = 0.15
    for i, raw in enumerate(l for l in open(lines_path, encoding="utf8").read().splitlines() if l.strip()):
        sec = raw.startswith("|"); text = raw.lstrip("|")
        if i: t += SECTION if sec else GAP
        mp3 = os.path.join(tmp, f"{i}.mp3"); ws = await one(text, mp3)
        a, b = ws[0]["s"] - 0.04, ws[-1]["e"] + 0.12   # trim the TTS's own lead/tail silence
        wav = os.path.join(tmp, f"{i}.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-ss", f"{max(0,a):.3f}", "-to", f"{b:.3f}", "-ar", "48000", "-ac", "1", wav], check=True)
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav], capture_output=True, text=True).stdout)
        parts.append((wav, t))
        words += [{"w": w["w"], "s": round(t + w["s"] - max(0, a), 3), "e": round(t + w["e"] - max(0, a), 3)} for w in ws]
        t += dur
    inputs = sum([["-i", p] for p, _ in parts], [])
    flt = "".join(f"[{k}]adelay={int(s*1000)}[d{k}];" for k, (_, s) in enumerate(parts)) + "".join(f"[d{k}]" for k in range(len(parts))) + f"amix=inputs={len(parts)}:normalize=0[o]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", flt, "-map", "[o]", "-ar", "48000", out_wav], check=True)
    json.dump(words, open(out_json, "w"), indent=0); print(round(t, 2), "s,", len(words), "words")
asyncio.run(main())
