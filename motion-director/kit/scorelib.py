"""Original, beat-locked score synthesis for motion films. Deterministic (seeded); no licensed audio.

Usage (see score.py):
    s = Score(duration=15.0, bpm=128)
    s.beat_bar(s.BAR * 1, kick_g=.9, clap_g=.4, hats=8, basses=[82.41] * 4)
    s.bowl(0.94); s.impact(7.5); ...
    s.finalize('public/soundtrack.wav')      # two-pass loudnorm to -14 LUFS, TP -2.0
"""
from pathlib import Path
import json
import re
import subprocess
import wave

import numpy as np
from PIL import Image
from scipy.signal import butter, sosfilt

SR = 48000
CHORDS = {
    'Em9': [164.81, 196.00, 246.94, 293.66, 369.99],
    'Cmaj9': [130.81, 164.81, 196.00, 246.94, 293.66],
    'Am7': [110.0, 130.81, 164.81, 196.0],
    'Dm9': [146.83, 174.61, 220.0, 261.63, 329.63],
}


class Score:
    def __init__(self, duration, bpm, seed=1128):
        self.dur = duration
        self.B = 60 / bpm
        self.BAR = 4 * self.B
        self.HB = self.B / 2
        self.N = int(SR * duration)
        self.out = np.zeros((self.N, 2))
        self.rng = np.random.default_rng(seed)

    # ---------- plumbing ----------
    def add(self, sig, at, gain=1.0, pan=0.0):
        k = int(round(at * SR))
        if k < 0:
            sig, k = sig[-k:], 0
        n = min(len(sig), self.N - k)
        if n <= 0:
            return
        self.out[k:k + n, 0] += sig[:n] * gain * np.sqrt(0.5 * (1 - pan))
        self.out[k:k + n, 1] += sig[:n] * gain * np.sqrt(0.5 * (1 + pan))

    @staticmethod
    def tt(d):
        return np.arange(int(d * SR)) / SR

    def noise(self, d):
        return self.rng.normal(0, 1, int(d * SR))

    @staticmethod
    def bp(x, lo, hi):
        return sosfilt(butter(2, [lo, hi], fs=SR, btype='band', output='sos'), x)

    @staticmethod
    def hp(x, f):
        return sosfilt(butter(2, f, fs=SR, btype='high', output='sos'), x)

    @staticmethod
    def lp(x, f):
        return sosfilt(butter(2, f, fs=SR, btype='low', output='sos'), x)

    # ---------- instruments ----------
    def kick(self, at, g=1.0):
        t = self.tt(.42)
        ph = 2 * np.pi * (45 * t + 115 * .03 * (1 - np.exp(-t / .03)))
        self.add(np.sin(ph) * np.exp(-t * 9.5) + self.hp(self.noise(.42), 2500) * np.exp(-t * 160) * .25, at, .9 * g)

    def clap(self, at, g=.4):
        t = self.tt(.25)
        env = np.exp(-t * 22) * .6
        for o in (0, .010, .021):
            env = env + np.where(t >= o, np.exp(-(t - o) * 120), 0)
        self.add(self.bp(self.noise(.25), 900, 5000) * env * .45, at, g)

    def hat(self, at, g=.07, pan=0.0):
        t = self.tt(.05)
        self.add(self.hp(self.noise(.05), 7500) * np.exp(-t * 90), at, g, pan)

    def tone(self, at, f, d, g=.2, kind='sine', pan=0.0, f2=None, att=.004):
        t = self.tt(d)
        fr = np.full_like(t, f) if f2 is None else f * (f2 / f) ** (t / d)
        ph = 2 * np.pi * np.cumsum(fr) / SR
        w = {'sine': np.sin(ph), 'tri': 2 / np.pi * np.arcsin(np.sin(ph)),
             'square': np.sign(np.sin(ph)) * .6, 'saw': 2 * ((ph / (2 * np.pi)) % 1) - 1}[kind]
        self.add(w * np.minimum(1, t / att) * np.exp(-t * (5 / d)), at, g, pan)

    def bowl(self, at, f0=196.0, g=.5):
        t = self.tt(5.0)
        s = np.zeros_like(t)
        for ratio, a, dec in [(1, 1, 4.5), (2.76, .55, 2.8), (5.40, .3, 1.7), (8.93, .14, 1.0)]:
            f = f0 * ratio
            s += a * .5 * (np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * (f + .7) * t)) * np.exp(-t / dec)
        s *= np.minimum(1, t / .003)
        self.add(s, at, g, -.2)
        self.add(s, at + .013, g * .55, .3)

    def swell(self, at, d, lo=300, hi=1200, g=.12):
        t = self.tt(d)
        self.add(self.bp(self.noise(d), lo, hi) * np.sin(np.pi * t / d) ** 2, at, g)

    def whoosh(self, at, d=.25, g=.15):
        t = self.tt(d)
        n = self.noise(d)
        x = t / d
        self.add((self.bp(n, 400, 1500) * (1 - x) + self.bp(n, 2500, 9000) * x) * np.sin(np.pi * x) ** 2, at, g)

    def riser(self, at, d, g=.2):
        t = self.tt(d)
        n = self.noise(d)
        x = t / d
        self.add((self.bp(n, 600, 2000) * (1 - x) + self.hp(n, 5000) * x) * x ** 2.2, at, g)

    def impact(self, at, g=.6):
        t = self.tt(1.0)
        fr = 95 * (30 / 95) ** t
        self.add(np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 3.2) + self.bp(self.noise(1.0), 200, 2000) * np.exp(-t * 14) * .5, at, g)

    def pluck(self, at, f, g=.16, pan=0.0, d=.35):
        t = self.tt(d)
        w = np.sin(2 * np.pi * f * t) + .35 * np.sin(4 * np.pi * f * t) + .12 * np.sin(6 * np.pi * f * t)
        self.add(w * np.minimum(1, t / .002) * np.exp(-t * 11), at, g, pan)

    def ping(self, at, f, g=.1, pan=0.0):
        t = self.tt(.12)
        self.add(np.sin(2 * np.pi * f * t) * np.exp(-t * 38) * np.minimum(1, t / .001), at, g, pan)
        self.add(np.sin(3 * np.pi * f * t) * np.exp(-t * 50), at + .06, g * .7, pan)

    def tick(self, at, g=.06, pan=0.0):
        self.tone(at, 2400, .03, g, 'sine', pan)

    def pad(self, t0, t1, freqs, g=.1, envfn=None):
        d = t1 - t0
        t = self.tt(d)
        s = np.zeros_like(t)
        for f in freqs:
            for det in (-.18, .18):
                ph = 2 * np.pi * f * (1 + det / 100) * t + self.rng.uniform(0, 6.28)
                s += 2 * ((ph / (2 * np.pi)) % 1) - 1
        s = self.lp(s, 1800) / len(freqs)
        e = envfn(t) if envfn else np.minimum(1, t / .4) * np.minimum(1, (d - t) / .4)
        self.add(s * e, t0, g)

    def bass(self, at, f, d, g=.24):
        t = self.tt(d)
        w = np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)
        self.add(w * np.minimum(1, t / .005) * np.exp(-t * (3 / d)), at, g)

    def stab(self, at, f, g=.15, pan=0.0):
        self.tone(at, f, .16, g, 'square', pan)
        t = self.tt(.06)
        self.add(self.bp(self.noise(.06), 1500, 7000) * np.exp(-t * 40), at, .2)

    # ---------- groove ----------
    def beat_bar(self, start, kick_g=.9, clap_g=.4, hats=8, hat_g=.06, basses=None):
        for q in range(4):
            at = start + q * self.B
            if kick_g:
                self.kick(at, kick_g)
            if q % 2 == 1 and clap_g:
                self.clap(at, clap_g)
            if basses:
                self.bass(at, basses[q], self.B * .95)
        for j in range(hats):
            self.hat(start + j * self.BAR / hats, hat_g * (1.3 if j % 2 else .8), .3 if j % 2 else -.3)

    # ---------- output ----------
    def finalize(self, path, lufs=-14, tp=-2.0, fade_out=.35, grain_png=True):
        out = np.tanh(self.out * 1.3) / np.tanh(1.3)
        out *= np.minimum(1, (self.N - np.arange(self.N)) / (SR * fade_out))[:, None]
        out *= .89 / max(1e-9, np.max(np.abs(out)))
        path = Path(path)
        raw = path.with_name(path.stem + '-raw.wav')
        with wave.open(str(raw), 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((out * 32767).astype('<i2').tobytes())
        # Two-pass loudnorm: pass 1 measures the file, pass 2 applies that measurement linearly.
        # Single-pass loudnorm is a streaming estimate and misses the target on short clips.
        probe = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', str(raw), '-af',
                                f'loudnorm=I={lufs}:TP={tp}:LRA=9:print_format=json',
                                '-f', 'null', '-'], capture_output=True, text=True, check=True)
        blocks = re.findall(r'\{[^{}]*"input_i"[^{}]*\}', probe.stderr, re.S)
        if not blocks:
            raise RuntimeError('loudnorm pass 1 produced no JSON:\n' + probe.stderr[-1000:])
        m = json.loads(blocks[-1])
        af = (f"loudnorm=I={lufs}:TP={tp}:LRA=9"
              f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
              f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
              f":offset={m['target_offset']}:linear=true")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', af,
                        '-ar', '48000', '-c:a', 'pcm_s16le', str(path)], check=True)
        raw.unlink()
        if grain_png:
            Image.fromarray(self.rng.integers(0, 256, (320, 320), dtype=np.uint8)).save(path.parent / 'grain.png')
