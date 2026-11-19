"""Original 128 BPM soundtrack for the CALMIND reel. Every cue sits on the same beat grid as Reel.tsx."""
from pathlib import Path
import subprocess
import wave

import numpy as np
from PIL import Image
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).parent / 'public'
SR = 48000
DUR = 15.0
B = 60 / 128
BAR = 4 * B
HB = B / 2
N = int(SR * DUR)
out = np.zeros((N, 2))
rng = np.random.default_rng(1128)

EM9 = [164.81, 196.00, 246.94, 293.66, 369.99]


def add(sig, at, gain=1.0, pan=0.0):
    k = int(round(at * SR))
    if k < 0:
        sig, k = sig[-k:], 0
    n = min(len(sig), N - k)
    if n <= 0:
        return
    out[k:k + n, 0] += sig[:n] * gain * np.sqrt(0.5 * (1 - pan))
    out[k:k + n, 1] += sig[:n] * gain * np.sqrt(0.5 * (1 + pan))


def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.normal(0, 1, int(d * SR))


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], fs=SR, btype='band', output='sos'), x)


def hp(x, f):
    return sosfilt(butter(2, f, fs=SR, btype='high', output='sos'), x)


def lp(x, f):
    return sosfilt(butter(2, f, fs=SR, btype='low', output='sos'), x)


def kick(at, g=1.0):
    t = tt(.42)
    ph = 2 * np.pi * (45 * t + 115 * .03 * (1 - np.exp(-t / .03)))
    s = np.sin(ph) * np.exp(-t * 9.5) + hp(noise(.42), 2500) * np.exp(-t * 160) * .25
    add(s, at, .9 * g)


def clap(at, g=.4):
    t = tt(.25)
    env = np.exp(-t * 22) * .6
    for o in (0, .010, .021):
        env = env + np.where(t >= o, np.exp(-(t - o) * 120), 0)
    add(bp(noise(.25), 900, 5000) * env * .45, at, g)


def hat(at, g=.07, pan=0.0):
    t = tt(.05)
    add(hp(noise(.05), 7500) * np.exp(-t * 90), at, g, pan)


def tone(at, f, d, g=.2, kind='sine', pan=0.0, f2=None, att=.004):
    t = tt(d)
    fr = np.full_like(t, f) if f2 is None else f * (f2 / f) ** (t / d)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    w = {'sine': np.sin(ph), 'tri': 2 / np.pi * np.arcsin(np.sin(ph)),
         'square': np.sign(np.sin(ph)) * .6, 'saw': 2 * ((ph / (2 * np.pi)) % 1) - 1}[kind]
    add(w * np.minimum(1, t / att) * np.exp(-t * (5 / d)), at, g, pan)


def bowl(at, f0=196.0, g=.5):
    t = tt(5.0)
    s = np.zeros_like(t)
    for ratio, a, dec in [(1, 1, 4.5), (2.76, .55, 2.8), (5.40, .3, 1.7), (8.93, .14, 1.0)]:
        f = f0 * ratio
        s += a * .5 * (np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * (f + .7) * t)) * np.exp(-t / dec)
    s *= np.minimum(1, t / .003)
    add(s, at, g, -.2)
    add(s, at + .013, g * .55, .3)


def swell(at, d, lo, hi, g):
    t = tt(d)
    add(bp(noise(d), lo, hi) * np.sin(np.pi * t / d) ** 2, at, g)


def whoosh(at, d=.25, g=.15):
    t = tt(d)
    n = noise(d)
    x = t / d
    add((bp(n, 400, 1500) * (1 - x) + bp(n, 2500, 9000) * x) * np.sin(np.pi * x) ** 2, at, g)


def riser(at, d, g=.2):
    t = tt(d)
    n = noise(d)
    x = t / d
    add((bp(n, 600, 2000) * (1 - x) + hp(n, 5000) * x) * x ** 2.2, at, g)


def impact(at, g=.6):
    t = tt(1.0)
    fr = 95 * (30 / 95) ** t
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 3.2) + bp(noise(1.0), 200, 2000) * np.exp(-t * 14) * .5
    add(s, at, g)


def pluck(at, f, g=.16, pan=0.0, d=.35):
    t = tt(d)
    w = np.sin(2 * np.pi * f * t) + .35 * np.sin(4 * np.pi * f * t) + .12 * np.sin(6 * np.pi * f * t)
    add(w * np.minimum(1, t / .002) * np.exp(-t * 11), at, g, pan)


def ping(at, f, g=.1, pan=0.0):
    t = tt(.12)
    add(np.sin(2 * np.pi * f * t) * np.exp(-t * 38) * np.minimum(1, t / .001), at, g, pan)
    add(np.sin(3 * np.pi * f * t) * np.exp(-t * 50), at + .06, g * .7, pan)


def pad(t0, t1, freqs, g, envfn=None):
    d = t1 - t0
    t = tt(d)
    s = np.zeros_like(t)
    for f in freqs:
        for det in (-.18, .18):
            ph = 2 * np.pi * f * (1 + det / 100) * t + rng.uniform(0, 6.28)
            s += 2 * ((ph / (2 * np.pi)) % 1) - 1
    s = lp(s, 1800) / len(freqs)
    e = envfn(t) if envfn else np.minimum(1, t / .4) * np.minimum(1, (d - t) / .4)
    add(s * e, t0, g)


def bass(at, f, d, g=.24):
    t = tt(d)
    w = np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)
    add(w * np.minimum(1, t / .005) * np.exp(-t * (3 / d)), at, g)


def beat_bar(start, kick_g=.9, clap_g=.4, hats=8, hat_g=.06, basses=None):
    for q in range(4):
        at = start + q * B
        kick(at, kick_g)
        if q % 2 == 1 and clap_g:
            clap(at, clap_g)
        if basses:
            bass(at, basses[q], B * .95)
    for j in range(hats):
        hat(start + j * BAR / hats, hat_g * (1.3 if j % 2 else .8), .3 if j % 2 else -.3)


# 0  NOISE: four half-beat stabs, notification pings, then hard stop into one breath
for q in range(4):
    at = q * HB
    kick(at, .85)
    tone(at, [220, 247, 277, 330][q], .14, .12, 'square', .3 if q % 2 else -.3)
for j in range(16):
    hat(j * 2 * B / 16, .05, .5 if j % 2 else -.5)
for at in np.sort(rng.uniform(0, .86, 9)):
    ping(float(at), float(rng.choice([1760, 2093, 2349, 2637, 3136])), .09, float(rng.uniform(-.6, .6)))
tone(.30, 150, .25, .05, 'square')
bowl(2 * B, 196, .55)
swell(2 * B + .02, .9, 300, 1200, .12)
riser(BAR - .45, .45, .1)

# 1  BREATHE: beat returns; the pad inhales for two beats and exhales for two
beat_bar(BAR, .7, 0, 4, .05, [82.41] * 4)
pad(BAR, 2 * BAR + .2, EM9, .13, lambda t: np.sin(np.pi * np.clip(t / BAR, 0, 1)) ** 1.5)
swell(BAR, 2 * B, 500, 2500, .09)
swell(BAR + 2 * B, 2 * B, 300, 1000, .07)
riser(2 * BAR - .45, .45, .15)

# 2  MOVE: one pluck per pose, short whoosh into each morph
beat_bar(2 * BAR, .95, .4, 8, .07, [82.41, 98.0, 110.0, 123.47])
for q, f in enumerate([659.25, 783.99, 880.0, 987.77]):
    pluck(2 * BAR + q * B, f, .17, -.2 + q * .13)
    whoosh(2 * BAR + q * B - .09, .16, .1)

# 3  FLOW: sixteenth-note liquid arpeggio
beat_bar(3 * BAR, .9, .35, 16, .045, [82.41, 82.41, 73.42, 73.42])
arp = [329.63, 392.0, 493.88, 587.33, 739.99, 587.33, 493.88, 392.0]
for j in range(16):
    pluck(3 * BAR + j * B / 4, arp[j % 8], .085, np.sin(j * .7) * .5, .25)
pad(3 * BAR, 4 * BAR, EM9, .05)
riser(4 * BAR - .5, .5, .22)

# 4  THE APP: phone lands on the cut, UI ticks as tiles arrive, tap on the first tile
impact(4 * BAR, .55)
beat_bar(4 * BAR, .85, .4, 8, .06, [82.41, 82.41, 98.0, 110.0])
for i in range(5):
    tone(4 * BAR + .25 + i * .07, 2400, .03, .06, 'sine', .2 * (i % 2 * 2 - 1))
ping(4 * BAR + 2 * B, 1318.51, .11)
pad(4 * BAR, 6 * BAR, EM9, .05)

# 5  INSIDE: each screen swap gets a whoosh and a bright blip
beat_bar(5 * BAR, .95, .4, 16, .05, [82.41, 98.0, 110.0, 123.47])
for q, f in enumerate([987.77, 1174.66, 1318.51, 1479.98]):
    whoosh(5 * BAR + q * B - .1, .2, .13)
    pluck(5 * BAR + q * B, f, .1, .3 if q % 2 else -.3, .2)
riser(6 * BAR - .45, .45, .2)

# 6  DAILY: six half-beat stabs, rising
for c in range(6):
    at = 6 * BAR + c * HB
    kick(at, .8)
    tone(at, 220 * 2 ** (c / 7), .16, .15, 'square', .35 if c % 2 else -.35)
    t = tt(.06)
    add(bp(noise(.06), 1500 + c * 400, 7000) * np.exp(-t * 40), at, .2)
riser(6 * BAR + 3 * B - .45, .45, .24)
for j in range(4):
    clap(6 * BAR + 2 * B + j * B / 4, .15 + j * .05)

# 7  LAUNCH: one hit, the bowl again, the chord rings out; chimes on tagline and CTA
L = 6 * BAR + 3 * B
impact(L, .8)
kick(L, 1.0)
bowl(L, 196, .55)
bass(L, 41.2, 2.2, .3)
pad(L, DUR, EM9, .11, lambda t: np.minimum(1, t / .05) * np.exp(-t * .55))
tone(L + .5, 1318.51, .9, .09)
tone(L + .7, 1760.0, 1.0, .08)

out = np.tanh(out * 1.3) / np.tanh(1.3)
out *= np.minimum(1, (N - np.arange(N)) / (SR * .35))[:, None]
out *= .89 / np.max(np.abs(out))
raw = ROOT / 'soundtrack-raw.wav'
with wave.open(str(raw), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9',
                '-ar', '48000', '-c:a', 'pcm_s16le', str(ROOT / 'soundtrack.wav')], check=True)
raw.unlink()
Image.fromarray(rng.integers(0, 256, (320, 320), dtype=np.uint8)).save(ROOT / 'grain.png')
print('soundtrack.wav and grain.png written')
