"""Original, rights-free background music made from scratch with numpy (drums, bass, pads, plucks).
No samples, no third-party audio. Styles: drive (energetic house), chill (lo-fi), pulse (tech / cinematic)."""
from __future__ import annotations

from pathlib import Path
from typing import Dict

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

SR = 44100
STYLES: Dict[str, dict] = {
    "drive": {"bpm": 122, "root": 57, "prog": [0, -4, -2, -5], "minor": True},   # Am F G Em-ish, driving
    "chill": {"bpm": 88, "root": 53, "prog": [0, 5, -4, 7], "minor": False},
    "pulse": {"bpm": 104, "root": 50, "prog": [0, 0, -2, -4], "minor": True},
}


def _hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def _lp(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    b, a = butter(order, f / (SR / 2), "low")
    return lfilter(b, a, x)


def _hp(x: np.ndarray, f: float) -> np.ndarray:
    b, a = butter(2, f / (SR / 2), "high")
    return lfilter(b, a, x)


def _env(n: int, atk: float, dec: float, sus: float = 0.0, rel: float = 0.0) -> np.ndarray:
    t = np.arange(n) / SR
    e = np.where(t < atk, t / max(atk, 1e-4), np.exp(-(t - atk) / max(dec, 1e-3)))
    e = sus + (1 - sus) * e if sus else e
    if rel:
        r = int(rel * SR)
        e[-r:] *= np.linspace(1, 0, min(r, n))
    return e


def _kick(n: int) -> np.ndarray:
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.95


def _snare(n: int, rng) -> np.ndarray:
    t = np.arange(n) / SR
    noise = _hp(rng.standard_normal(n), 1500) * np.exp(-t * 22)
    return (noise * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28) * 0.4) * 0.8


def _hat(n: int, rng, open_: bool = False) -> np.ndarray:
    t = np.arange(n) / SR
    return _hp(rng.standard_normal(n), 7000) * np.exp(-t * (18 if open_ else 70)) * 0.35


def _saw(freq: float, n: int, detune: float = 0.0) -> np.ndarray:
    t = np.arange(n) / SR
    return 2 * ((t * freq * (1 + detune)) % 1.0) - 1


def _put(buf: np.ndarray, snd: np.ndarray, at: int, gain: float = 1.0) -> None:
    if at >= len(buf):
        return
    end = min(len(buf), at + len(snd))
    buf[at:end] += snd[: end - at] * gain


def make(style: str, seconds: float, path: Path, seed: int = 7, build: bool = True) -> Path:
    """Write a stereo 16-bit wav of `seconds` in `style`; return the path."""
    if style not in STYLES:
        raise ValueError(f"unknown music style {style!r}; choose from {', '.join(STYLES)}")
    cfg = STYLES[style]
    rng = np.random.default_rng(seed)
    beat = 60.0 / cfg["bpm"]
    bar = beat * 4
    total = int((seconds + 1.0) * SR)
    drums, bass, pad, lead = (np.zeros(total) for _ in range(4))
    bars = int(np.ceil((seconds + 1.0) / bar))
    third = 3 if cfg["minor"] else 4
    for b in range(bars):
        t0 = b * bar
        root = cfg["root"] + cfg["prog"][b % 4]
        sec = t0 / max(seconds, 1)  # 0..1 progress, used for the build
        intensity = 0.35 + 0.65 * min(1.0, sec * 2.2) if build else 1.0
        chord = [root, root + third, root + 7, root + 12]
        # pad (soft, detuned saws, low-passed)
        n = int(bar * SR)
        p = sum(_saw(_hz(m), n, d) for m in chord for d in (-0.004, 0.004))
        p = _lp(p, 1400 if style != "chill" else 900) * _env(n, 0.25, 9.0, 0.7, 0.25) * 0.045
        _put(pad, p, int(t0 * SR), intensity)
        for s in range(16):  # sixteenth grid
            at = int((t0 + s * beat / 4) * SR)
            if style in ("drive", "pulse"):
                if s % 4 == 0:
                    _put(drums, _kick(int(0.35 * SR)), at, 0.9 * (1 if intensity > 0.4 else 0.0))
                if s % 8 == 4 and style == "drive" and intensity > 0.5:
                    _put(drums, _snare(int(0.3 * SR), rng), at, 0.55)
                if s % 4 == 2:
                    _put(drums, _hat(int(0.12 * SR), rng, s % 8 == 6), at, 0.55 * intensity)
                if style == "pulse" and s % 2 == 0:  # pulsing eighth-note bass
                    f = _hz(root - 24)
                    nn = int(beat / 2 * SR)
                    bs = np.sin(2 * np.pi * f * np.arange(nn) / SR) + 0.35 * np.sin(4 * np.pi * f * np.arange(nn) / SR)
                    _put(bass, bs * _env(nn, 0.005, 0.18), at, 0.32)
            else:  # chill: lazy kick / snare / swung hats
                if s in (0, 10):
                    _put(drums, _kick(int(0.4 * SR)), at, 0.8)
                if s in (4, 12):
                    _put(drums, _snare(int(0.3 * SR), rng), at, 0.35)
                if s % 2 == 0:
                    _put(drums, _hat(int(0.1 * SR), rng), at + (int(0.012 * SR) if s % 4 == 2 else 0), 0.4)
            if style == "drive" and s % 4 == 0:  # off-beat sub bass
                nn = int(beat * 0.9 * SR)
                f = _hz(root - 24)
                bs = np.sin(2 * np.pi * f * np.arange(nn) / SR)
                _put(bass, bs * _env(nn, 0.01, 0.35, 0.0, 0.05), at + int(beat / 2 * SR), 0.5)
            if style == "chill" and s in (0, 6, 10):
                nn = int(beat * 1.4 * SR)
                f = _hz(root - 24)
                _put(bass, np.sin(2 * np.pi * f * np.arange(nn) / SR) * _env(nn, 0.02, 0.6), at, 0.4)
            # pluck arpeggio on the chord
            if (style == "drive" and s % 2 == 0) or (style == "pulse" and s % 4 == 2) or (style == "chill" and s % 4 == 0):
                note = chord[(s // 2 + b) % 4] + (12 if style != "chill" else 0)
                nn = int(0.28 * SR)
                t = np.arange(nn) / SR
                pl = (np.sin(2 * np.pi * _hz(note) * t) + 0.4 * np.sin(4 * np.pi * _hz(note) * t)) * np.exp(-t * (9 if style != "chill" else 5))
                _put(lead, pl, at, 0.16 * intensity)
    mix = drums * 0.9 + _lp(bass, 220, 2) * 1.1 + pad + _lp(lead, 5000)
    # a small stereo spread: lead and pad slightly delayed on one side
    d = int(0.014 * SR)
    left = mix.copy()
    right = mix.copy()
    right[d:] += (pad + lead)[:-d] * 0.35
    out = np.stack([left, right], axis=1)[: int(seconds * SR)]
    fade_in, fade_out = int(0.4 * SR), int(1.2 * SR)
    out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    out[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
    out = out / (np.max(np.abs(out)) + 1e-9) * 0.89
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(str(path), SR, (out * 32767).astype(np.int16))
    return Path(path)
