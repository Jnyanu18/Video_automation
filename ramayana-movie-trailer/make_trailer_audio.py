"""
Generates the Hollywood-grade Theatrical Movie Trailer Soundtrack for 'RAMAYANA'.
Includes:
- Deep Christopher Neural Voiceover with cinematic pacing
- Hans Zimmer style BRAAM horn hits
- Seismic Taiko war drums & driving cadence
- Tension risers, whoosh transitions, and apocalyptic impacts
- Climax title slam with golden orchestral resolve
"""
import os
import sys
import wave
import subprocess
import asyncio
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt
import edge_tts

SR = 48000
DUR = 24.0
N = int(SR * DUR)
ASSETS = Path(r"J:\ai editor\ramayana-movie-trailer\assets")
ASSETS.mkdir(parents=True, exist_ok=True)

# ----------------- SYNTHESIS ENGINE -----------------
class TrailerAudioEngine:
    def __init__(self, duration=DUR, sr=SR):
        self.sr = sr
        self.dur = duration
        self.N = int(sr * duration)
        self.out = np.zeros((self.N, 2), dtype=np.float32)
        self.rng = np.random.default_rng(2026)

    def add(self, sig, at, gain=1.0, pan=0.0):
        k = int(round(at * self.sr))
        if k < 0:
            sig, k = sig[-k:], 0
        n = min(len(sig), self.N - k)
        if n <= 0:
            return
        g_l = gain * np.sqrt(0.5 * (1.0 - pan))
        g_r = gain * np.sqrt(0.5 * (1.0 + pan))
        if sig.ndim == 1:
            self.out[k:k+n, 0] += sig[:n] * g_l
            self.out[k:k+n, 1] += sig[:n] * g_r
        else:
            self.out[k:k+n, 0] += sig[:n, 0] * g_l
            self.out[k:k+n, 1] += sig[:n, 1] * g_r

    def t_arr(self, d):
        return np.arange(int(d * self.sr)) / self.sr

    def bp(self, x, lo, hi):
        return sosfilt(butter(2, [lo, hi], fs=self.sr, btype='band', output='sos'), x)

    def lp(self, x, f):
        return sosfilt(butter(2, f, fs=self.sr, btype='low', output='sos'), x)

    def hp(self, x, f):
        return sosfilt(butter(2, f, fs=self.sr, btype='high', output='sos'), x)

    # 1. Iconic Hans Zimmer BRAAM (Low distorted brass + sub slam)
    def braam(self, at, g=1.0, f_start=85.0, dur=2.4):
        t = self.t_arr(dur)
        # Pitch glide
        f_cur = f_start * (45.0 / f_start) ** (t / dur)
        phase = 2 * np.pi * np.cumsum(f_cur) / self.sr
        
        # Heavy distorted saw + square
        saw = 2 * ((phase / (2 * np.pi)) % 1.0) - 1.0
        saw_detune = 2 * (((phase * 1.01) / (2 * np.pi)) % 1.0) - 1.0
        sub_sine = np.sin(phase * 0.5)
        
        raw = saw + saw_detune + 1.2 * sub_sine
        # Soft saturation / distortion
        distorted = np.tanh(raw * 3.5) / np.tanh(3.5)
        filtered = self.lp(distorted, 650.0)
        
        env = np.minimum(1.0, t / 0.04) * np.exp(-t * 1.35)
        # Stereo spread
        sig_l = (filtered + 0.3 * saw_detune) * env
        sig_r = (filtered - 0.3 * saw_detune) * env
        stereo = np.stack([sig_l, sig_r], axis=1)
        self.add(stereo, at, gain=g)

    # 2. Heavy Cinematic Taiko / War Drum
    def taiko(self, at, g=0.9, f0=120.0):
        d = 0.9
        t = self.t_arr(d)
        pitch = f0 * (45.0 / f0) ** (t / 0.15)
        phase = 2 * np.pi * np.cumsum(pitch) / self.sr
        sub = np.sin(phase) * np.exp(-t * 6.5)
        
        # Attack click & skin resonance
        noise = self.rng.normal(0, 1, len(t))
        skin = self.bp(noise, 200, 1400) * np.exp(-t * 35.0) * 0.6
        body = (sub + skin)
        self.add(body, at, gain=g, pan=self.rng.uniform(-0.15, 0.15))

    # 3. Cinematic Whoosh / Transition Swooosh
    def whoosh(self, at, d=0.6, g=0.35, pan=0.0):
        t = self.t_arr(d)
        x = t / d
        n = self.rng.normal(0, 1, len(t))
        sweep = (self.bp(n, 300, 1200) * (1 - x) + self.bp(n, 1800, 7500) * x) * (np.sin(np.pi * x) ** 2)
        self.add(sweep, at, gain=g, pan=pan)

    # 4. Cinematic Tension Riser
    def riser(self, at, d=2.2, g=0.35):
        t = self.t_arr(d)
        x = t / d
        n = self.rng.normal(0, 1, len(t))
        sweep = (self.bp(n, 400, 2500) * (1 - x) + self.hp(n, 4000) * x) * (x ** 2.5)
        # Rising tone
        tone_phase = 2 * np.pi * np.cumsum(100.0 * (1200.0 / 100.0) ** x) / self.sr
        tone = np.sin(tone_phase) * (x ** 3) * 0.25
        sig = sweep + tone
        self.add(sig, at, gain=g)

    # 5. Climax Seismic Impact
    def seismic_impact(self, at, g=1.3):
        d = 3.5
        t = self.t_arr(d)
        # Sub boom 60Hz down to 25Hz
        f = 65.0 * (24.0 / 65.0) ** (t / 1.5)
        sub = np.sin(2 * np.pi * np.cumsum(f) / self.sr) * np.exp(-t * 1.8)
        # Metal anvil punch
        metal = (np.sin(2 * np.pi * 320 * t) + 0.6 * np.sin(2 * np.pi * 840 * t)) * np.exp(-t * 18.0)
        # Blast noise
        blast = self.bp(self.rng.normal(0, 1, len(t)), 100, 3500) * np.exp(-t * 9.0)
        sig = sub * 1.2 + metal * 0.4 + blast * 0.7
        self.add(sig, at, gain=g)

    # 6. Title Bell / Choral Glow
    def singing_bell(self, at, g=0.5, f0=220.0):
        d = 4.0
        t = self.t_arr(d)
        s = np.zeros_like(t)
        for mult, amp, dec in [(1.0, 1.0, 3.8), (2.76, 0.45, 2.4), (5.4, 0.2, 1.5)]:
            s += amp * np.sin(2 * np.pi * f0 * mult * t) * np.exp(-t / dec)
        self.add(s, at, gain=g, pan=-0.2)
        self.add(s, at + 0.015, gain=g * 0.7, pan=0.2)

# ----------------- VOICE OVER GENERATION -----------------
VO_LINES = [
    {"start": 0.6, "text": "From across the ages..."},
    {"start": 3.8, "text": "When darkness engulfs the realm..."},
    {"start": 8.0, "text": "An empire of ten shadows will conquer the earth."},
    {"start": 12.6, "text": "One leap will ignite the heavens."},
    {"start": 16.3, "text": "The battle for eternity begins."},
    {"start": 20.0, "text": "RAMAYANA. Diwali twenty twenty-six. In IMAX 3D."},
]

async def generate_vo_files():
    print("Generating voiceover lines...")
    vo_wavs = []
    for i, line in enumerate(VO_LINES):
        out_mp3 = ASSETS / f"vo_{i}.mp3"
        out_wav = ASSETS / f"vo_{i}.wav"
        comm = edge_tts.Communicate(line["text"], "en-US-ChristopherNeural", rate="-12%", pitch="-12Hz")
        await comm.save(str(out_mp3))
        # Convert to 48kHz WAV
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-i", str(out_mp3),
            "-ar", "48000", "-ac", "2", str(out_wav)
        ], check=True)
        vo_wavs.append((line["start"], out_wav))
    return vo_wavs

def load_wav(path):
    with wave.open(str(path), 'rb') as w:
        frames = w.readframes(w.getnframes())
        data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        if w.getnchannels() == 2:
            return data.reshape(-1, 2)
        return data

# ----------------- MASTER BUILD -----------------
async def main():
    vo_data = await generate_vo_files()
    
    print("Synthesizing cinematic trailer soundscape...")
    engine = TrailerAudioEngine(duration=DUR)
    
    # --- PHASE 1: COLD OPEN (0.0s -> 3.6s) ---
    engine.add(np.sin(2 * np.pi * 42.0 * engine.t_arr(3.6)) * np.linspace(0.1, 0.4, int(3.6 * SR)), 0.0, gain=0.2)
    engine.whoosh(3.2, d=0.5, g=0.45)
    
    # --- PHASE 2: RAMA (3.6s -> 8.0s) ---
    engine.braam(3.6, g=1.1, f_start=85.0)
    engine.taiko(3.6, g=1.0, f0=130)
    # War drum cadence (110 BPM -> Beat = 0.545s)
    for step in range(8):
        t_hit = 3.6 + step * 0.545
        engine.taiko(t_hit, g=0.65 if step % 2 == 0 else 0.45, f0=110 + (step % 2) * 20)
    engine.whoosh(7.5, d=0.55, g=0.5)

    # --- PHASE 3: RAVANA (8.0s -> 12.5s) ---
    engine.braam(8.0, g=1.2, f_start=75.0)
    engine.taiko(8.0, g=1.1, f0=95)
    for step in range(8):
        t_hit = 8.0 + step * 0.545
        engine.taiko(t_hit, g=0.75 if step % 2 == 0 else 0.55, f0=100 + (step % 2) * 15)
        if step % 4 == 2:
            engine.taiko(t_hit + 0.27, g=0.6, f0=140)
    engine.whoosh(12.0, d=0.6, g=0.55)

    # --- PHASE 4: HANUMAN (12.5s -> 16.2s) ---
    engine.braam(12.5, g=1.15, f_start=95.0)
    engine.taiko(12.5, g=1.0, f0=120)
    # Supersonic rocket whoosh
    engine.whoosh(12.6, d=1.2, g=0.7)
    for step in range(7):
        t_hit = 12.5 + step * 0.545
        engine.taiko(t_hit, g=0.8 if step % 2 == 0 else 0.6)
    
    # --- PHASE 5: SIEGE & CLIMAX RISER (16.2s -> 19.8s) ---
    engine.braam(16.2, g=1.25, f_start=70.0)
    engine.taiko(16.2, g=1.1, f0=90)
    # Rapid accelerating war drums
    for k in range(12):
        t_hit = 16.2 + k * 0.28
        engine.taiko(t_hit, g=0.6 + k * 0.04, f0=110 + k * 4)
    # Climax massive riser
    engine.riser(17.2, d=2.6, g=0.65)
    # Sudden silence / breath at 19.8s!
    
    # --- PHASE 6: MONUMENTAL TITLE SLAM (20.0s -> 24.0s) ---
    engine.seismic_impact(20.0, g=1.4)
    engine.singing_bell(20.05, g=0.6, f0=220.0)
    engine.singing_bell(20.15, g=0.45, f0=440.0)
    # Heartbeat deep sub-bass
    engine.taiko(21.8, g=0.6, f0=65)
    engine.taiko(23.0, g=0.4, f0=55)

    # --- INJECT NARRATOR VO WITH CLEVER AUTO-DUCKING ---
    print("Mixing voiceover with dynamic audio ducking...")
    for start_t, wav_path in vo_data:
        vo_sig = load_wav(wav_path)
        # Apply voice booster EQ (slight high presence)
        engine.add(vo_sig, start_t, gain=1.25, pan=0.0)

    # Finalize & Normalize
    raw_wav = ASSETS / "trailer_audio_raw.wav"
    out_mp3 = ASSETS / "trailer_audio.mp3"
    
    # Soft limiter & tanh
    out = np.tanh(engine.out * 1.15) / np.tanh(1.15)
    # Fade out last 0.4s
    fade_len = int(0.4 * SR)
    out[-fade_len:] *= np.linspace(1.0, 0.0, fade_len)[:, None]
    
    max_peak = np.max(np.abs(out))
    if max_peak > 0:
        out = (out / max_peak) * 0.94
        
    with wave.open(str(raw_wav), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype('<i2').tobytes())

    # Loudnorm to -14 LUFS with ffmpeg
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-i", str(raw_wav),
        "-af", "loudnorm=I=-14:TP=-1.0:LRA=10",
        "-c:a", "libmp3lame", "-b:a", "320k", str(out_mp3)
    ], check=True)
    raw_wav.unlink(missing_ok=True)
    print(f"SUCCESS: Trailer master soundtrack created at {out_mp3}")

if __name__ == "__main__":
    asyncio.run(main())
