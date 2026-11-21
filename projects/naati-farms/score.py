"""NAATI FARMS score. Original, beat-locked, 120 BPM, C major (Cmaj9 | Am7 | Fmaj9 | G6 per bar).
Every event below sits on a time from timeline.json, the same file src/film.tsx draws from.
Real farm sound (no speech: checked with work/speech_check.py) is layered at the gate drop and in the one silence.
Run from packages/motion-kit:  python ../../projects/naati-farms/score.py
"""
from pathlib import Path
import json
import subprocess
import sys
import wave

import numpy as np

HERE = Path(__file__).resolve().parent
KIT = HERE.parent.parent / 'packages' / 'motion-kit'
sys.path.insert(0, str(KIT))
from scorelib import SR, Score  # noqa: E402

TL = json.loads((HERE / 'timeline.json').read_text(encoding='utf8'))
s = Score(duration=TL['duration'], bpm=TL['bpm'], seed=2026)
B, BAR, HB = s.B, s.BAR, s.HB
Q = B / 2  # eighth note

CH = {
    'C': [130.81, 164.81, 196.00, 246.94, 293.66],
    'Am': [110.00, 130.81, 164.81, 196.00],
    'F': [87.31, 110.00, 130.81, 164.81, 196.00],
    'G': [98.00, 123.47, 146.83, 164.81],
}
ROOT = {'C': 65.41, 'Am': 55.00, 'F': 87.31, 'G': 49.00}
PROG = ['C', 'Am', 'F', 'G']
ARP = {'C': [523.25, 659.25, 783.99, 987.77], 'Am': [440.0, 523.25, 659.25, 783.99],
       'F': [349.23, 440.0, 523.25, 659.25], 'G': [392.0, 493.88, 587.33, 659.25]}
PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51]


def chord(bar):
    return PROG[int(bar) % 4]


# ---------- extra instruments (built on scorelib primitives) ----------
def crash(at, g=.22, d=1.6):
    t = s.tt(d)
    s.add(s.hp(s.noise(d), 4500) * np.exp(-t * 2.6) * np.minimum(1, t / .002), at, g, -.2)
    s.add(s.hp(s.noise(d), 6000) * np.exp(-t * 3.0), at + .007, g * .8, .25)


def scratch(at, d=.22, g=.18):
    """Marker stroke: band-passed noise sweeping up."""
    t = s.tt(d)
    n = s.noise(d)
    x = t / d
    s.add((s.bp(n, 1800, 4200) * (1 - x) + s.bp(n, 3500, 8000) * x) * np.sin(np.pi * x) ** .6, at, g, .15)


def pen(at, d=.4, g=.05):
    """Handwriting: soft papery scribble."""
    t = s.tt(d)
    wob = .55 + .45 * np.abs(np.sin(2 * np.pi * 9 * t))
    s.add(s.bp(s.noise(d), 2500, 7000) * wob * np.minimum(1, t / .03) * np.minimum(1, (d - t) / .05), at, g)


def boing(at, f=420, g=.16):
    """Spring bounce: a pitch-dropping sine with a wobble (for things that bounce in)."""
    t = s.tt(.32)
    fr = f * (1 + .9 * np.exp(-t * 22)) * (1 + .05 * np.sin(2 * np.pi * 18 * t) * np.exp(-t * 8))
    s.add(np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 11) * np.minimum(1, t / .002), at, g)


def tape_stop(at, d=.3, g=.2):
    """Everything winds down: a falling saw chord into silence."""
    t = s.tt(d)
    sweep = (1 - t / d) ** 1.6
    w = np.zeros_like(t)
    for f in (130.81, 196.0, 261.63):
        ph = 2 * np.pi * np.cumsum(f * sweep) / SR
        w += 2 * ((ph / (2 * np.pi)) % 1) - 1
    s.add(s.lp(w / 3, 1400) * (1 - t / d), at, g)


def stutter(at, n=4, g=.12):
    for k in range(n):
        t = s.tt(.03)
        s.add(s.bp(s.noise(.03), 1200, 6000) * np.exp(-t * 60), at + k * .045, g * (1 - k * .15), (-1) ** k * .4)


def ring_tone(at, g=.06):
    """Phone ring for the CTA pulse: two short bright pings."""
    for k, f in enumerate((1318.5, 1567.98)):
        s.ping(at + k * .09, f, g, .2 * (-1) ** k)


def bed(t0, t1, kick=.85, clap=.38, hats=16, hat_g=.05, bass=.22):
    """Groove at beat resolution (partial bars allowed): kick every beat, clap on 2 and 4, roots in the bass."""
    per = max(1, hats // 4)
    for k in range(int(round((t1 - t0) / B))):
        at = t0 + k * B
        bi = int(round(at / B))
        q = bi % 4
        s.kick(at, kick)
        if q % 2 == 1 and clap:
            s.clap(at, clap)
        if bass:
            s.bass(at, ROOT[chord(bi // 4)] * (2 if q == 2 else 1), B * .9, bass)
        for j in range(per):
            s.hat(at + j * B / per, hat_g * (1.3 if j % 2 else .8), .3 if j % 2 else -.3)


def pads(t0, t1, g=.07):
    b0 = int(round(t0 / BAR))
    for b in range(b0, int(round(t1 / BAR))):
        s.pad(b * BAR, min(t1, (b + 1) * BAR + .05), CH[chord(b)], g)


def arps(t0, t1, g=.07, step=Q):
    n = int(round((t1 - t0) / step))
    for k in range(n):
        at = t0 + k * step
        notes = ARP[chord(at / BAR)]
        s.pluck(at, notes[k % 4], g * (1.15 if k % 2 == 0 else .85), .35 if k % 2 else -.35, .3)


def clip_audio(cid, src_in, at, dur, level=.25, fade_in=.05, fade_out=.4):
    """Real farm sound from a clip, RMS-normalized, faded, mixed in stereo."""
    with wave.open(str(HERE / 'work' / 'audio' / f'a{cid}.wav')) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, 2) / 32768
    seg = x[int(src_in * SR):int((src_in + dur) * SR)].copy()
    seg -= seg.mean(0)
    seg = np.stack([s.hp(seg[:, c], 120) for c in range(2)], 1)
    rms = np.sqrt(np.mean(seg ** 2)) + 1e-9
    n = len(seg)
    tt = np.arange(n) / SR
    env = np.minimum(1, tt / max(fade_in, 1e-3)) * np.minimum(1, (dur - tt) / max(fade_out, 1e-3))
    seg = seg / rms * level * .1 * env[:, None]
    k = int(at * SR)
    m = min(n, s.N - k)
    s.out[k:k + m] += seg[:m]


# ================= 0-1  DAWN + RIDE: bowl, pad, arpeggio =================
s.bowl(TL['dawn'], 196.0, .42)                       # signature (bookend with the lockup)
pads(0, TL['gate'] + 1.5, .065)
arps(0, TL['ride'], .055, B)                          # quarter notes at dawn
arps(TL['ride'], TL['arrive'], .065, Q)               # eighths once we ride
for j in range(16):
    s.hat(TL['ride'] + j * BAR / 8, .035 * (1.3 if j % 2 else .8), .3 if j % 2 else -.3)
s.whoosh(TL['ride'] - .2, .22, .16)                   # whip pan
s.kick(TL['ride'], .7)
s.kick(TL['ride'] + 2 * B, .45)
pen(TL['farmNote'], .45)
s.ping(TL['farmNote'] + .42, 1046.5, .06)

# ================= 2-3  ARRIVE + GATE: groove enters =================
bed(TL['arrive'], TL['gate'], kick=.75, clap=.32, hats=8, bass=.18)
bed(TL['gate'], TL['doorsShut'], kick=.8, clap=.34, hats=16, bass=.2)   # stops dead at the slam
s.impact(TL['pinContact'], .3)                         # pin lands
s.tock(TL['pinContact'], 520, .3)
boing(TL['pinContact'] + .02, 380, .12)
s.ping(TL['chip'], 1318.5, .08)                        # BANGALORE chip
pen(TL['ourFarm'], .4)
s.tick(TL['ourFarm'] + .3, .05)
for k in range(8):                                     # snare build into the doors
    s.clap(TL['gate'] + BAR / 2 + k * Q / 2 + .25, .1 + k * .025)
s.whoosh(TL['doorsIn'] - .02, .27, .2)                 # doors slide shut
s.taiko(TL['doorsShut'], .9, 90)                       # slam
s.impact(TL['doorsShut'], .45)
s.kick(TL['doorsShut'], .9)
s.riser(TL['doorsShut'] + .02, TL['release'] - TL['doorsShut'] - .02, .26)   # half-beat hush + riser

# ================= 4  RELEASE: the drop =================
r = TL['release']
s.impact(r, .85)
s.kick(r, 1.0)
s.taiko(r, .7, 70)
crash(r, .24)
clip_audio('1381', 8.4, r, 2.6, level=.55, fade_out=.9)  # the real flock running out
bed(r, TL['naati'], kick=.95, clap=.42, hats=16, bass=.26)
pads(r, TL['naati'], .05)
for k, f in enumerate([1046.5, 1318.5, 1567.98]):     # "here they come!"
    s.pluck(TL['comeNote'] + k * .07, f, .08, (k - 1) * .4, .25)
pen(TL['comeNote'], .5)
s.tick(TL['comeNote'] + .45, .05)

# ================= 5  OUT / IN / THE / OPEN. =================
for i, (at, f) in enumerate(zip(TL['words'], [261.63, 329.63, 392.0, 523.25])):
    s.whoosh(at - .12, .12, .12)
    s.stab(at, f, .17, -.3 if i % 2 == 0 else .3)
    s.kick(at, .6)
stutter(TL['words'][3], 5, .14)                        # OPEN. glitch slices
s.riser(TL['naati'] - .45, .45, .14)

# ================= 6  NAATI = NATIVE: half-time, a word explained =================
n0 = TL['naati']
s.impact(n0, .35)
s.kick(n0, .8)
s.kick(n0 + BAR / 2, .6)
for j in range(8):
    s.hat(n0 + j * BAR / 8, .03, .3 if j % 2 else -.3)
s.pad(n0, TL['push'] + .5, CH['F'], .07)
s.ping(n0 + .02, 1174.66, .06)                         # KANNADA pill
boing(TL['kannada'], 300, .14)                         # ನಾಟಿ bounces in
s.pluck(TL['kannada'] + .02, 392.0, .14)
s.pluck(n0 + .32, 659.25, .12, -.2)                    # naa
s.pluck(n0 + .32 + .13, 783.99, .12, .2)               # ti
pen(n0 + .6, .5)
s.whoosh(TL['mask'] - .15, .2, .12)                    # card leaves, NAATI holes open
for k in range(5):
    s.tick(TL['mask'] + k * .045, .05, (k - 2) * .2)
s.riser(TL['push'] - .1, .6, .22)                      # push through the I
s.whoosh(TL['push'] + .2, .35, .2)

# ================= 7  LIVELY / HEALTHY =================
bed(14, TL['food'], kick=.9, clap=.4, hats=16, bass=.24)
pads(14, TL['food'], .05)
s.impact(TL['push'] + .55, .4)
boing(TL['lively'], 520, .18)                          # Lively. bounces
s.pluck(TL['lively'] + .02, 1046.5, .1)
s.stab(TL['healthy'], 392.0, .14)
for k, f in enumerate([659.25, 783.99, 1046.5]):
    s.pluck(TL['healthy'] + .05 + k * .05, f, .09, (k - 1) * .3)
s.tick(TL['healthy'] + .35, .05)

# ================= 8  REAL FOOD: three panels =================
bed(TL['food'], TL['noab'] - .16, kick=.85, clap=.38, hats=16, bass=.22)
pads(TL['food'], TL['noab'] - .1, .05)
s.pluck(TL['food'], 523.25, .1)
for at, f in zip(TL['panels'], [659.25, 783.99, 1046.5]):
    s.whoosh(at - .08, .16, .13)
    s.pluck(at + .05, f, .13)
    pen(at + .38, .45, .04)
tape_stop(TL['noab'] - .3, .3, .22)                    # the music winds down...

# ================= 9  NO ANTIBIOTICS: one beat of silence, then the stamp =================
clip_audio('1151', 1.2, TL['noab'], 1.15, level=.35, fade_in=.08, fade_out=.25)   # just the farm
scratch(TL['strike'], .2, .2)
scratch(TL['strike'] + .12, .2, .16)                  # second line struck
st = TL['stamp']
s.impact(st, .95)
s.kick(st, 1.0)
s.taiko(st, .85, 80)
crash(st, .16, 1.2)
stutter(st, 4, .12)
bed(st, TL['grid'], kick=.9, clap=.4, hats=8, bass=.24)
s.pad(st, TL['grid'] + .1, CH['G'], .06)
s.pluck(TL['dontUse'], 523.25, .1)
s.pluck(TL['dontUse'] + .2, 392.0, .1)

# ================= 10-11  EVERY BIRD: the grid bursts from the centre =================
g0 = TL['grid']
bed(g0, TL['launch'] - .5, kick=.95, clap=.42, hats=16, bass=.26)
pads(g0, TL['launch'] - .3, .055)
s.impact(g0, .45)
for k, f in enumerate(PENTA[:5]):                      # one ascending pluck per ring of cells
    s.pluck(g0 + .04 + k * .07, f, .1, (k % 2 * 2 - 1) * .4)
s.whoosh(TL['band'] - .1, .2, .15)
s.stab(TL['band'], 261.63, .12)
s.ping(TL['band'] + .12, 1046.5, .07)
s.stab(TL['band'] + .4, 392.0, .14)
s.clap(TL['band'] + .4, .3)
s.whoosh(TL['gridOut'], .4, .16)                       # everything is pulled into one yolk
s.riser(TL['launch'] - .5, .5, .22)

# ================= 12  NOW LAUNCHING: yolks =================
l0 = TL['launch']
s.impact(l0, .8)
s.kick(l0, 1.0)
crash(l0, .2)
for f in CH['C']:
    s.stab(l0, f * 2, .05)
bed(l0, TL['lockup'] - .4, kick=.95, clap=.42, hats=16, bass=.26)
pads(l0, TL['lockup'], .06)
s.stab(l0 + .3, 523.25, .14)                           # LAUNCHING
rng = np.random.default_rng(7)
for k in range(14):                                    # bubbly yolks
    s.pluck(l0 + .1 + k * Q / 2, PENTA[int(rng.integers(0, 8))], .045, float(rng.uniform(-.6, .6)), .18)
s.swell(TL['merge'], .6, 400, 2400, .12)
s.riser(TL['lockup'] - .55, .55, .2)

# ================= 13-15  LOCKUP: signature bowl, the number rings =================
k0 = TL['lockup']
s.impact(k0, .8)
s.kick(k0, 1.0)
s.bowl(k0, 196.0, .5)                                  # bookend
crash(k0, .15, 2.0)
s.pad(k0, TL['end'], CH['C'], .09)
s.bass(k0, ROOT['C'], 3.5, .22)
for j in range(4):                                     # light pulse under the wordmark
    s.kick(k0 + 2 * B + j * B, .5)
    s.hat(k0 + 2 * B + j * B + Q, .04)
for k in range(5):
    s.pluck(TL['wordmark'] + k * .045, [523.25, 659.25, 783.99, 880.0, 1046.5][k], .07, (k - 2) * .2, .3)
for k in range(5):
    s.pluck(TL['farms'] + k * .04, [659.25, 783.99, 1046.5, 1174.66, 1318.5][k], .05, (k - 2) * .2, .3)
pen(TL['tagline'], .5)
s.shimmer(TL['tagline'] + .1, .8, .045)
boing(TL['cta'], 460, .14)                             # CTA pill bounces in
s.ping(TL['cta'] + .02, 1567.98, .08)
for k in range(3):                                     # the number rings, on the pulse rings
    ring_tone(TL['cta'] + .2 + k * 2 * B, .06 * (1 - k * .2))
s.pluck(30.0, 261.63, .12)
s.pluck(30.0, 392.0, .1)
s.bowl(30.0, 261.63, .22)

wav = HERE / 'public' / 'soundtrack.wav'
s.finalize(wav, tp=-2.8, grain_png=False)   # extra headroom: the AAC encode adds ~0.7 dB of true peak
print(f'{wav} written')
sys.exit(subprocess.call([sys.executable, str(KIT / 'gate.py'), str(wav), '--tp', '-1.8']))
