"""Voiceover with word timings (free neural voices via edge-tts). Only the words to be published are sent to the service."""
from __future__ import annotations

import asyncio
import re
import subprocess
from pathlib import Path
from typing import Any, Dict, List

VOICES = {"andrew": "en-US-AndrewNeural", "ava": "en-US-AvaNeural", "brian": "en-US-BrianNeural", "emma": "en-US-EmmaNeural",
          "ryan": "en-GB-RyanNeural", "sonia": "en-GB-SoniaNeural", "neerja": "en-IN-NeerjaNeural", "prabhat": "en-IN-PrabhatNeural",
          "guy": "en-US-GuyNeural", "jenny": "en-US-JennyNeural"}


async def _speak(text: str, voice: str, rate: str, pitch: str, path: Path) -> List[dict]:
    import edge_tts
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    words: List[dict] = []
    with open(path, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"text": ch["text"], "start": ch["offset"] / 1e7, "end": (ch["offset"] + ch["duration"]) / 1e7})
    return words


def duration(path: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    return float(r.stdout.strip())


def speak(text: str, path: Path, voice: str = "andrew", rate: str = "+6%", pitch: str = "+0Hz", tries: int = 3) -> Dict[str, Any]:
    """Synthesize `text` to an mp3. Returns {path, duration, words:[{text,start,end}]}."""
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        raise ValueError("nothing to say")
    v = VOICES.get(voice, voice)
    last: Exception = RuntimeError("no attempt")
    for _ in range(tries):
        try:
            words = asyncio.run(_speak(text, v, rate, pitch, Path(path)))
            if words:
                return {"path": str(path), "duration": duration(Path(path)), "words": words}
        except Exception as e:  # network hiccup: retry
            last = e
    raise RuntimeError(f"the voice service did not answer: {last}")
