# Music + sound-effects bed (worked example: the quantum film v5/v6; the VO plays separately in Remotion).
# REUSABLE: score helpers, phrase duck, place(), the 1-4 kHz FX-band duck, cc0(). PER FILM: CHORDS /
# section() arrangement, the id -> sound map (SND here + snd_v5.py), the ending. Unmapped ids are reported.
# Everything is timed from out/events.json (bundled from src/events.ts: every act's events, built
# from the same constants the scenes draw with) and src/words.json. Run from film/:
#   npx esbuild dump-events.mts --bundle --platform=node --format=esm --log-level=error | node --input-type=module > out/events.json
#   py audio/mix.py            -> public/bed.wav (+ out/mix-preview.wav = VO + bed, stems, out/cue-sheet.json)
# Sources: SYNTHETIC = generated here or by audio/designed.py (never auditioned by a human; levels
# measured only). CC0 = video-edit skill sfx library (Freesound CC0 recordings, catalog.json).
# v3: Madhav appears only in four short bursts (avatar-in / avatar-out events from
# src/avatar-config.ts); the animation keeps moving behind him, so its effects stay.
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import *
import designed as D

FILM = ROOT
sys.path.insert(0, FILM)
from pipeline_config import SFX_LIB as SFX  # CC0 library (video-edit skill assets/sfx)
ev = json.load(open(os.path.join(FILM, "out", "events.json")))
E = {e["id"]: e for e in ev["events"]}
BT = ev["beats"]
W = words()
VO_END = W[-1]["e"]
END = VO_END + 1.45  # = TOTAL in src/beats.ts
N = int(END * SR)
TAU = 2 * np.pi


_CC0 = {}


def cc0(name, gain_db=0.0, start=0.0, dur=None):
    if name not in _CC0:
        _CC0[name] = read(os.path.join(SFX, name))  # v5: cache decoded samples (the mix re-used them ~100x)
    x = _CC0[name]
    x = x[int(start * SR):]
    if dur:
        x = fade(x[: int(dur * SR)], 0.005, min(0.3, dur * 0.3))
    return x * db(gain_db)


# ---------------- score (SYNTHETIC): F minor, slow, warm; one chord per 2.4 s ----------------
CHORDS = [["F2", "Ab3", "C4", "F4"], ["Db2", "F3", "Ab3", "Db4"], ["Ab1", "Eb3", "Ab3", "C4"], ["Eb2", "G3", "Bb3", "Eb4"]]
SLOT = 2.4


def pad(notes, dur, cutoff=1800, seed=1):
    t = secs(dur)
    y = np.zeros(len(t))
    for j, n in enumerate(notes):
        f0 = hz(n)
        for d in (-0.07, 0.0, 0.06):
            f1 = f0 * 2 ** (d / 12)
            y += sum(np.sin(TAU * f1 * k * t + j + k) / k for k in range(1, 6)) * (0.5 if j == 0 else 0.3)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.6)
    return stereo(lp(y * env, cutoff) * 0.08)


def pluck(n, dur=1.2):
    t = secs(dur)
    f0 = hz(n)
    y = (np.sin(TAU * f0 * t) + 0.3 * np.sin(TAU * 2 * f0 * t)) * np.exp(-t / 0.35)
    return fade(y, 0.003, 0.1)


def section(t):
    """Arrangement by time (v5 timeline): (pad gain, pad cutoff, arp on, high octave, pulse)."""
    if t < BT["supercomputer"]:
        return 0.75, 1300, 1, 0, 0       # the cover: a curious plucked figure over the chip
    if t < BT["what"] - 0.2:
        return 1.0, 1700, 0, 0, 1        # the race: pulse, deep time passing
    if t < BT["quantumComputer"]:
        return 0.5, 900, 0, 0, 0         # "what is it?": thin, a question
    if t < BT["laptop"] - 0.1:
        return 0.9, 2000, 1, 0, 0        # "a quantum computer ... you will understand it": lift
    if t < BT["checks"] - 0.2:
        return 1.0, 1900, 1, 0, 0        # bits, qubit
    if t < BT["no"]:
        return 1.0, 1300, 0, 0, 1        # "does it try every answer at once?"
    if t < BT["interference"] - 0.3:
        return 0.35, 600, 0, 0, 0        # "no.": the myth collapses, thin drone
    if t < BT["stack"] - 0.4:
        return 0.9, 1900, 1, 0, 0        # interference
    if t < BT["imagine"] - 0.2:
        return 0.72, 2000, 1, 0, 0       # "so when you look": settle
    if t < BT["combined"] - 0.3:
        return 0.8, 1900, 1, 0, 0        # the pool: playful plucks
    if t < BT["probability"] - 0.2:
        return 1.0, 2300, 1, 0, 0        # the waves combine: lift
    if t < BT["link"] - 0.2:
        return 0.85, 2100, 1, 0, 0       # probability goes up
    if t < BT["instagram"] - 0.2:
        return 0.85, 2200, 1, 0, 1       # scale: pulse
    if t < BT["soA"] - 0.2:
        return 0.8, 2000, 1, 0, 0        # uses, hard problems
    if t < BT["heresWhy"] - 0.2:
        return 0.6, 1100, 0, 0, 0        # "a whole new kind of computer": glassy, open
    if t < BT["quantumComputing"] - 0.1:
        return 0.55, 1200, 0, 0, 0       # "here's why I want you to know": intimate
    if t < BT["soQC"] - 0.2:
        return 1.0, 2300, 1, 0, 1        # the next AI wave: builds
    return 0.9, 2200, 1, 0, 0            # "the next thing you have to learn"


music = np.zeros((N + SR * 6, 2))
GRID_END = BT["hit"] - 0.25            # the grid stops; the ending is placed by hand below
nslots = int(GRID_END / SLOT) + 1
for s in range(nslots):
    t0 = s * SLOT
    if t0 >= GRID_END:
        break
    g, cut, arp, hi, pulse = section(t0 + 0.01)
    ch = CHORDS[s % 4]
    dur = min(SLOT, GRID_END - t0)
    put(music, pad(ch, dur + 0.6, cut, s), t0, g)
    put(music, stereo(np.sin(TAU * hz(ch[0]) * secs(dur)) * np.exp(-secs(dur) / 1.5) * 0.12), t0, g)
    if arp:
        pat = [ch[1], ch[2], ch[3], ch[2], ch[3], ch[1]]
        for k, n in enumerate(pat):
            if t0 + k * SLOT / 6 < GRID_END:
                nn = n[:-1] + str(int(n[-1]) + 1)
                put(music, stereo(pluck(nn), -0.4 + 0.16 * k) * 0.05, t0 + k * SLOT / 6, g)
    if hi:
        put(music, D.light_tone(dur + 0.5, ch[3][:-1] + "5") * 0.18, t0, g)
    if pulse:
        for k in range(4):
            if t0 + k * SLOT / 4 < GRID_END:
                put(music, D.thud(55, 0.4) * 0.12, t0 + k * SLOT / 4, g)

# The ending (v5): "hit follow" opens to Ab major with plucks; it resolves on the last word and rings
# out to the final frame.
def chord_at(notes, t0, dur, g, cut=2000, arp=False, hi=False, pulse=0):
    put(music, pad(notes, dur + 0.6, cut, int(t0 * 10)), t0, g)
    put(music, stereo(np.sin(TAU * hz(notes[0]) * secs(dur)) * np.exp(-secs(dur) / 1.8) * 0.12), t0, g)
    if arp:
        for k, n in enumerate([notes[1], notes[2], notes[3], notes[2]] * 2):
            if k * dur / 8 < dur:
                put(music, stereo(pluck(n[:-1] + str(int(n[-1]) + 1)), -0.4 + 0.1 * k) * 0.05, t0 + k * dur / 8, g)
    if hi:
        put(music, D.light_tone(dur + 0.5, notes[3][:-1] + "5") * 0.18, t0, g)
    for k in range(pulse):
        put(music, D.thud(55, 0.4) * 0.12 * (0.7 + 0.3 * k / max(1, pulse)), t0 + k * dur / pulse, g)


RESOLVE = VO_END - 0.05
chord_at(["Ab1", "Eb3", "Ab3", "C4"], GRID_END, RESOLVE - GRID_END, 1.0, 2300, arp=True)
chord_at(["Ab1", "Eb3", "Ab3", "C4"], RESOLVE, END - RESOLVE + 0.4, 1.1, 2400, hi=True)
put(music, D.chime("Ab5", 3.0) * 0.5, RESOLVE, 1.0)
music = reverb(music[:N], decay=2.8, wet=0.25, bright=4000)[:N]

# phrase-level duck under the voice: merge words < 0.4 s apart, ramp 0.2 s, -8 dB
tt = np.arange(N) / SR
duck = np.ones(N)
phr = []
for w in W:
    if phr and w["s"] - phr[-1][1] < 0.4:
        phr[-1][1] = w["e"]
    else:
        phr.append([w["s"], w["e"]])
for s0, e0 in phr:
    a, b = int((s0 - 0.2) * SR), int((e0 + 0.15) * SR)
    duck[max(0, a):b] = np.minimum(duck[max(0, a):b], db(-8))
# v3: short breaths between phrases (< 1.3 s) keep a partial duck (-5 dB), so the score doesn't
# swell up in the gap and back down (heard as swells at 39 s and 46 s in v2)
for (s0, e0), (s1, e1) in zip(phr, phr[1:]):
    if s1 - e0 < 1.3:
        a, b = int((e0 + 0.15) * SR), int((s1 - 0.2) * SR)
        if b > a:
            duck[a:b] = np.minimum(duck[a:b], db(-5))
k = int(0.3 * SR)
duck = np.convolve(duck, np.ones(k) / k, mode="same")
music *= duck[:, None]
# fade in over the first 0.15 s (the cover frame already has music), out over the last 0.5 s
music *= curve(tt, [(0, 0.3), (0.15, 1), (END - 0.5, 1), (END, 0)])[:, None]

# ---------------- sound effects cue sheet ----------------
fx = np.zeros((N + SR * 6, 2))
CUES = []
VO = read(os.path.join(FILM, "public", "vo.wav")).mean(1)
VOB = bp(VO, 1000, 4000)
FX_DB_PRE = float(os.environ.get("FX_DB", -11))
_r = lambda a: 10 * np.log10(np.mean(a ** 2) + 1e-12)
dur_of = lambda e, d=1.0: (e.get("dur") or d * 30) / 30
at = lambda e: e["fr"] / 30


def place(e, x, gain_db=0.0, offset=0.0, src="SYNTHETIC", gap=16.0):
    """Place an effect; if it lands under speech, cap it `gap` dB under the VO in the 1-4 kHz band."""
    eid = e["id"]
    a0 = int((at(e) + offset) * SR)
    seg = VOB[max(0, a0): a0 + len(x)]
    if len(seg) and _r(seg) > -45:
        lvl = _r(bp(x.mean(1)[: len(seg)], 1000, 4000)) + gain_db + FX_DB_PRE
        if _r(seg) - lvl < gap:
            gain_db -= gap - (_r(seg) - lvl)
    pan = e.get("x", 0) or 0
    if x.ndim == 2 and pan:
        a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        x = np.stack([x.mean(1) * np.cos(a) * 1.41, x.mean(1) * np.sin(a) * 1.41], 1)
    put(fx, x, at(e) + offset, db(gain_db))
    CUES.append((eid, round(at(e) + offset, 2), src, round(gain_db, 1)))


def marker(dur=0.28, seed=3):
    t = secs(dur)
    y = bp(noise(len(t), seed), 1800, 6500) * (0.6 + 0.4 * np.sin(TAU * 38 * t)) * np.sin(np.pi * t / dur) ** 0.5
    return stereo(fade(y * 0.5, 0.005, 0.04))


def coin_spin(dur=5.8):
    t = secs(dur)
    rate = 6 + 22 * np.minimum(1, t / 1.2)
    am = 0.55 + 0.45 * np.sin(TAU * np.cumsum(rate) / SR)
    y = sum(a * np.sin(TAU * f * t) for f, a in [(2650, 1), (3920, 0.6), (5210, 0.35), (1830, 0.4)])
    env = np.minimum(1, t / 0.15) * np.exp(-t / 6)
    return stereo(fade(y * am * env * 0.12, 0.01, 0.5))


def ice(dur=1.6, seed=8):
    out = np.zeros((int(dur * SR) + SR, 2))
    r = np.random.default_rng(seed)
    for k in range(40):
        tt0 = r.uniform(0, dur) * (r.uniform() ** 0.6)
        put(out, D.glass_ping(f"{['C', 'D', 'F', 'G', 'A'][k % 5]}7", 0.6) * r.uniform(0.05, 0.2), tt0)
    return out


def ticks(dur, r0=6, r1=22, seed=1):
    """A stopwatch running fast: clock ticks accelerating."""
    out = np.zeros((int(dur * SR) + SR // 2, 2))
    t, k = 0.0, 0
    while t < dur:
        put(out, D.tick(1.4 + 0.3 * (k % 2)) * 0.6, t)
        r = r0 + (r1 - r0) * (t / dur)
        t += 1 / r
        k += 1
    return out


def stomps(dur, n=3):
    out = np.zeros((int(dur * SR) + SR, 2))
    for k in range(n):
        put(out, D.thud(48 + 6 * (k % 2), 0.45), k * dur / n, 0.9)
    return out


def dip(x, depth=0.5):
    """Carve the 1-4 kHz voice band out of a bed (about -6 dB at depth 0.5)."""
    return x - depth * bp(x, 1000, 4000)


def loop(name, dur, gain_db=0.0, start=0.0):
    x = cc0(name, gain_db, start)
    n = int(dur * SR)
    reps = int(np.ceil(n / len(x))) + 1
    return fade(np.concatenate([x] * reps)[:n], 0.4, 0.8)


# id -> [(factory(eid) -> array, gain_db, offset_s, source)]. Unmapped ids are reported.
S = lambda f, g=0.0, o=0.0, src="SYNTHETIC": (f, g, o, src)
SND = {
    # hook
    "chip-hum": [S(lambda e: dip(fade(cc0("electrical-hum.flac", -22, 0, dur_of(e)), 0.05, 0.6)), -8, 0, "CC0 electrical-hum")],
    "hall-room": [S(lambda e: dip(loop("server-room.flac", dur_of(e), -16)), -8, 0, "CC0 server-room")],
    "watch-start": [S(lambda e: cc0("relay-click.flac", -8), 0, -0.01, "CC0 relay-click")],
    "watch-ticks": [S(lambda e: ticks(dur_of(e)), -16)],
    "watch-done": [S(lambda e: D.chime("C6", 2.0), -12), S(lambda e: cc0("relay-click.flac", -10), -8, -0.01, "CC0 relay-click")],
    "power-on": [S(lambda e: fade(D.power_up(0.65), 0.005, 0.25), -18), S(lambda e: cc0("impact-deep.flac", -14), -14, 0, "CC0 impact-deep")],
    "counter-in": [S(lambda e: D.counter(dur_of(e), 10, 40), -10)],
    "counter-roll": [S(lambda e: D.data_chatter(dur_of(e), 18, 21, "C5", 12) * 0.5, -16)],
    "tape-in": [S(lambda e: D.whoosh(0.5, 300, 3000, -0.2, 0.2), -12)],
    "dino-steps": [S(lambda e: stomps(dur_of(e)), -11)],
    "sun-dies": [S(lambda e: D.sub_drop(1.4), -9), S(lambda e: D.glass_ping("Eb6", 1.6), -20, 0.5)],
    "galaxy": [S(lambda e: D.light_tone(1.6, "C6") * 0.5, -16)],
    "times": [S(lambda e: D.blip("Eb4", 0.35), -8)],
    "tape-run": [S(lambda e: cc0("whoosh-fast.flac", -10), -0.05, 0, "CC0 whoosh-fast")],
    "strike": [S(lambda e: marker(0.26, 3), -5), S(lambda e: marker(0.24, 5), -6, 4 / 30)],
    "myth-blink": [S(lambda e: D.alert_low("F3", 0.3), -12), S(lambda e: D.alert_low("F3", 0.3), -14, 0.42), S(lambda e: D.alert_low("F3", 0.3), -16, 0.84)],
    "clear": [S(lambda e: cc0("whoosh-deep.flac", -12), 0, -0.05, "CC0 whoosh-deep")],
    "avatar-in": [S(lambda e: D.whoosh(0.25, 500, 3000, 0.8, 0.5, 5, 0.3), -20)],
    "avatar-out": [S(lambda e: D.whoosh(0.22, 500, 2500, 0.5, 0.9, 6, 0.3), -24)],
    "tag": [S(lambda e: D.whoosh(0.35, 500, 3000, 0, 0.4, 19, 0.3), -20)],
    "tag-off": [S(lambda e: D.whoosh(0.3, 400, 2500, 0.3, 0.8, 20, 0.3), -22)],
    "coin-land-start": [S(lambda e: D.thud(100, 0.25), -14), S(lambda e: cc0("glass-ting.flac", -18), 0, 0.02, "CC0 glass-ting")],
    "qubits-dark": [S(lambda e: D.slow_down(0.6), -14)],
    "cooler": [S(lambda e: D.riser(1.0, "C5", "C6"), -20), S(lambda e: D.chime("F6", 2.0), -16, 0.85)],
    "push-laptop": [S(lambda e: cc0("whoosh-deep.flac", -6), -10, 0.4, "CC0 whoosh-deep")],
    # bits
    "xray": [S(lambda e: D.power_up(0.9) * 0.5, -6)],
    "switches": [S(lambda e: D.data_chatter(1.4, 40), -18)],
    "coin-drop": [S(lambda e: D.thud(90, 0.4), -6), S(lambda e: cc0("glass-ting.flac", -12), 0, 0.02, "CC0 glass-ting")],
    "heads": [S(lambda e: D.blip("C6", 0.3), -12)],
    "tails": [S(lambda e: cc0("card-riffle.flac", -14, 0, 0.25), 0, -0.1, "CC0 card-riffle"), S(lambda e: D.blip("Ab5", 0.3), -12, 0.15)],
    # qubit
    "spin-up": [S(lambda e: coin_spin(dur_of(e, 5.8)), -4)],
    "ripple": [S(lambda e: D.sonar("Eb5", 2.6) * 0.6, -6)],
    # myth
    "clones": [S(lambda e: D.swarm(dur_of(e, 1.6)), -8)],
    "no": [S(lambda e: D.alert_low("Bb2"), -4)],
    "lamp-on-1": [S(lambda e: cc0("relay-click.flac", -4), 0, -0.02, "CC0 relay-click"), S(lambda e: D.light_tone(1.2, "F5") * 0.4, -12, 0.03)],
    "lamp-on-2": [S(lambda e: cc0("relay-click.flac", -4), -16, -0.02, "CC0 relay-click")],
    "lamp-off": [S(lambda e: cc0("relay-click.flac", -7), 0, -0.02, "CC0 relay-click")],
    "land": [S(lambda e: D.thud(80, 0.4), -6), S(lambda e: cc0("glass-ting.flac", -14), 0, 0.02, "CC0 glass-ting")],
    "red-x": [S(lambda e: cc0("rubber-stamp.flac", -6), 0, -0.05, "CC0 rubber-stamp")],
    # interference
    "waves-in": [S(lambda e: fade(cc0("ocean-surface.flac", -12, 2.0, 2.2), 0.3, 0.8), 0, -0.1, "CC0 ocean-surface")],
    "cancel": [S(lambda e: D.slow_down(1.4), -8)],
    "stack": [S(lambda e: D.riser(0.8, "F4", "C6"), -24, -0.8)],
    "look-right": [S(lambda e: D.chime("F5", 2.6), -14, 0.2)],
    # scale
    "link": [S(lambda e: D.light_zip(0.5, -0.6, 0.6), -14, 0.45)],
    "as-one": [S(lambda e: D.thud(60, 0.4), -14)],
    "count-50": [S(lambda e: lp(D.counter(dur_of(e, 1.8)), 2500), -16)],
    "quadrillion": [S(lambda e: lp(D.glass_ping("Ab6", 2.2), 3000), -18, 0.75)],
    "out-window": [S(lambda e: cc0("whoosh-deep.flac", -6), -14, -0.32, "CC0 whoosh-deep"), S(lambda e: D.riser(1.2, "C4", "C6"), -14, -0.8)],
    "atoms": [S(lambda e: D.light_tone(2.2, "C6") * 0.5, -16)],
    # uses
    "phone-shrug": [S(lambda e: D.blip("Eb5", 0.25), -10), S(lambda e: D.blip("Bb4", 0.3), -10, 0.16)],
    "molecule": [S(lambda e: D.bubbles(1.0), -10)],
    "padlock": [S(lambda e: cc0("padlock-open.flac", -6), 0, -0.02, "CC0 padlock-open")],
    # cold
    "pull-back": [S(lambda e: cc0("whoosh-deep.flac", -8), -9, -0.05, "CC0 whoosh-deep")],
    "frost": [S(lambda e: lp(ice(dur_of(e, 1.6)), 3000), -24)],
    # ---- v2 middle-act events (step 6) ----
    "screen-pull": [S(lambda e: D.whoosh(0.7, 300, 3000, 0, 0, 7, 0.4), -14)],
    "dive": [S(lambda e: D.dive(1.0), -16)],
    "ripple-bits": [S(lambda e: D.data_chatter(0.6, 60, 22), -20)],
    "push-hero": [S(lambda e: D.whoosh(0.5, 400, 4000, 0, 0, 8, 0.4), -20)],
    "zero": [S(lambda e: D.blip("C5", 0.25), -12)],
    "one": [S(lambda e: D.blip("G5", 0.25), -12)],
    "coin-lift": [S(lambda e: D.light_zip(0.5, -0.2, 0.2), -12)],
    "tails-land": [S(lambda e: D.thud(100, 0.3), -10), S(lambda e: cc0("glass-ting.flac", -16), 0, 0.02, "CC0 glass-ting")],
    "qubit-label": [S(lambda e: D.blip("Ab5", 0.3), -16)],
    "rattle": [S(lambda e: cc0("tile-clicks.flac", -14, 0, 0.5), -8, 0, "CC0 tile-clicks")],
    "spin-up": [S(lambda e: lp(coin_spin(6.1), 2500), -10)],
    "spin": [],
    "blend": [S(lambda e: D.light_tone(0.9, "C6") * 0.5, -16)],
    "sweep-heads": [S(lambda e: D.whoosh(0.5, 500, 3500, -0.5, 0.5, 9, 0.3), -16)],
    "sweep-tails": [S(lambda e: D.whoosh(0.5, 500, 3500, 0.5, -0.5, 10, 0.3), -16)],
    "ease-out": [], "settle": [], "board-settle": [], "space": [],
    "whip-down": [S(lambda e: cc0("whoosh-fast.flac", -8), -9, -0.08, "CC0 whoosh-fast")],
    "whip-land": [S(lambda e: D.thud(70, 0.3), -12)],
    "whip-up": [S(lambda e: cc0("whoosh-fast.flac", -8), -9, -0.08, "CC0 whoosh-fast")],
    "whip-land-up": [S(lambda e: D.thud(70, 0.3), -12)],
    "coin-flip": [S(lambda e: coin_spin(dur_of(e, 0.6)) if at(e) < 70 else cc0("card-riffle.flac", -12, 0, 0.3), -14)],
    "lamp-press": [S(lambda e: D.tick(0.7), -8)],
    "lamp-press-2": [S(lambda e: D.tick(0.75), -18)],
    "source-glow": [S(lambda e: D.sonar("Eb6", 1.2) * 0.4, -16)],
    "follow-out": [S(lambda e: D.whoosh(0.4, 400, 3000, 0, 0.4, 18, 0.3), -16)],
    "next-label": [S(lambda e: D.convert(True), -14)],
    "ghosts-vanish": [S(lambda e: D.light_zip(0.4, 0.4, -0.4), -14)],
    "coin-fall": [S(lambda e: D.whoosh(0.4, 600, 4000, 0, 0, 11, 0.3), -14)],
    "push-in": [S(lambda e: cc0("whoosh-deep.flac", -14), 0, -0.05, "CC0 whoosh-deep")],
    "x-peel": [S(lambda e: cc0("card-riffle.flac", -14, 0, 0.3), 0, 0, "CC0 card-riffle")],
    "coin-return": [S(lambda e: D.light_zip(0.7, 0.3, -0.5), -14)],
    "source": [S(lambda e: D.sonar("Eb6", 1.5) * 0.5, -12)],
    "path-pull": [S(lambda e: D.whoosh(0.6, 300, 2500, 0, 0, 12, 0.3), -16)],
    "coin-lift-2": [S(lambda e: D.light_zip(0.5, -0.2, 0.3), -20)],
    "coin-fall-2": [S(lambda e: D.whoosh(0.4, 600, 4000, 0, 0, 13, 0.3), -14)],
    "stand-up": [S(lambda e: D.pop(520), -14), S(lambda e: D.pop(660), -14, 0.3)],
    "hop": [S(lambda e: D.whoosh(0.3, 600, 3000, 0, 0, 14, 0.3), -16)],
    "hop-land": [S(lambda e: D.thud(60, 0.3), -16)],
    "stream": [S(lambda e: D.light_zip(1.0, -0.5, 0.5), -14)],
    "galaxy": [S(lambda e: D.light_tone(1.6, "C6") * 0.5, -16)],
    "universe": [S(lambda e: D.glass_ping("C7", 2.0), -20, 0.55)],
    "dive-window": [S(lambda e: cc0("whoosh-deep.flac", -8), -10, 0.13, "CC0 whoosh-deep")],
    "pull-out-window": [S(lambda e: cc0("whoosh-deep.flac", -10), 0, -0.05, "CC0 whoosh-deep")],
    "scroll": [S(lambda e: D.data_chatter(0.4, 30, 23), -18)],
    "phone-squash": [S(lambda e: D.blip("C4", 0.2), -14)],
    "phone-settle": [S(lambda e: D.thud(120, 0.2), -14)],
    "phone-droop": [S(lambda e: D.slow_down(0.5), -14)],
    "pixels": [S(lambda e: D.scramble(0.6), -12)],
    "molecule-aside": [S(lambda e: D.whoosh(0.4, 400, 3000, 0, -0.5, 15, 0.3), -16)],
    "padlock-up": [S(lambda e: D.pop(420), -12)],
    "push-keyhole": [S(lambda e: cc0("whoosh-deep.flac", -8), 0, -0.05, "CC0 whoosh-deep")],
    "chip-glow": [S(lambda e: D.light_tone(1.2, "F5") * 0.6, -14)],
    "vapour": [S(lambda e: lp(D.wind(1.4) * 0.6, 3000), -20)],
    "frost-climb": [S(lambda e: lp(ice(1.0, 9), 3000), -20)],
    # ---- ending / cta / tease ----
    "chandelier-slide": [S(lambda e: cc0("servo-arm.flac", -16, 0, dur_of(e, 1.0)), 0, 0, "CC0 servo-arm")],
    "laptop-in": [S(lambda e: D.whoosh(0.5, 300, 3000, -0.7, -0.2, 16, 0.4), -12)],
    "laptop-land": [S(lambda e: D.thud(90, 0.3), -10)],
    "ghost-zoom": [S(lambda e: cc0("whoosh-fast.flac", -10), 0, -0.05, "CC0 whoosh-fast")],
    "neq": [S(lambda e: cc0("impact-deep.flac", -8), 0, -0.02, "CC0 impact-deep")],
    "ghost-smash": [S(lambda e: D.glitch(0.4), -10), S(lambda e: cc0("glass-ting.flac", -14), 0, 0.03, "CC0 glass-ting")],
    "machine-hum": [S(lambda e: D.sonar("F5", 1.5) * 0.5, -12)],
    "shards-land": [S(lambda e: cc0("tile-clicks.flac", -16, 0, 0.5), 0, 0, "CC0 tile-clicks")],
    "chip-turn": [S(lambda e: D.convert(True), -20)],
    "push-chip": [S(lambda e: cc0("whoosh-deep.flac", -8), 0, -0.05, "CC0 whoosh-deep")],
    "into-maze": [S(lambda e: D.light_tone(0.8, "Ab5") * 0.5, -14)],
    "maze-waves": [S(lambda e: fade(cc0("ocean-surface.flac", -12, 2.0, 1.6), 0.3, 0.6), 0, -0.1, "CC0 ocean-surface")],
    "wrong-tint": [S(lambda e: D.alert_low("F3", 0.3), -14)],
    "cancel-final": [S(lambda e: D.slow_down(1.2), -13)],
    "stack-final": [S(lambda e: D.riser(0.6, "F4", "C6"), -16, -0.5), S(lambda e: D.chime("C6", 2.0), -16, 0.6)],
    "coin-exit": [S(lambda e: D.thud(80, 0.3), -14)],
    "coin-rise": [S(lambda e: D.light_zip(0.5, -0.2, 0.2), -12)],
    "whip-study": [S(lambda e: cc0("whoosh-fast.flac", -8), -9, -0.08, "CC0 whoosh-fast")],
    "coin-settle": [S(lambda e: D.thud(70, 0.4), -12)],
    "follow": [S(lambda e: D.thud(60, 0.5), -14), S(lambda e: D.chime("Ab5", 3.0), -18, 0.05)],
    "coin-sweep": [S(lambda e: D.glass_ping("C7", 1.5), -16)],
    "fly-window": [S(lambda e: cc0("whoosh-deep.flac", -6), -10, -0.05, "CC0 whoosh-deep")],
    "coin-star": [S(lambda e: D.glass_ping("Eb7", 2.0), -12)],
    "globe": [S(lambda e: D.riser(0.7, "C4", "G5"), -14)],
    "lock-hover": [S(lambda e: fade(cc0("electrical-hum.flac", -20, 0, 0.3), 0.05, 0.1), -8, 0, "CC0 electrical-hum")],
    "lock-land": [S(lambda e: cc0("vault-clank.flac", -6), -8, -0.02, "CC0 vault-clank")],
    "shackle-shut": [S(lambda e: cc0("padlock-close.flac", -6), -10, -0.02, "CC0 padlock-close")],
    "crack-1": [S(lambda e: lp(cc0("electric-spark-crackle.flac", -12, 0, 0.5), 3000), -6, 0, "CC0 electric-spark-crackle"), S(lambda e: D.glitch(0.3), -14)],
    "crack-2": [S(lambda e: lp(cc0("electric-spark-crackle.flac", -12, 0.6, 0.5), 3000), -6, 0, "CC0 electric-spark-crackle")],
    "crack-3": [S(lambda e: lp(cc0("electric-spark-crackle.flac", -11, 1.2, 0.6), 3000), -6, 0, "CC0 electric-spark-crackle"), S(lambda e: D.glitch(0.3, 41), -14)],
    "net-flicker": [S(lambda e: D.data_chatter(dur_of(e), 14, 24, "C6", 10) * 0.4, -20)],
    "crack-4": [S(lambda e: cc0("impact-deep.flac", -10), 0, -0.02, "CC0 impact-deep"), S(lambda e: cc0("electric-spark-crackle.flac", -10, 0, 0.8), 0, 0, "CC0 electric-spark-crackle")],
    "final-move": [S(lambda e: D.whoosh(0.6, 300, 2000, 0, 0, 17, 0.25), -18)],
    "final-glint": [S(lambda e: D.glass_ping("Eb7", 2.2), -12)],
}

from snd_v5 import v5_snd
SND.update(v5_snd(S, D, cc0, dip, fade, lp, ice, ticks, coin_spin, dur_of))

MISSING = []
for e in ev["events"]:
    eid = e["id"]
    if eid not in SND:
        MISSING.append(eid)
        continue
    for fac, g, o, src in SND[eid]:
        place(e, fac(e), g, o, src)
if MISSING:
    print("UNMAPPED events:", MISSING)

# The effects bus ducks in the 1-4 kHz band under every phrase (6 dB, 0.2 s ramps), so effects keep
# their body but never mask consonants. Then the whole bed fades to silence over the last 0.75 s.
fx = fx[:N]
band = bp(fx, 1000, 4000)
RAMP = int(0.2 * SR)
gduck = np.convolve(np.where(duck < 0.99, db(-10), 1.0), np.ones(RAMP) / RAMP, mode="same")  # v5: -10 dB (was -6)
fx = fx - band * (1 - gduck)[:, None]
tail = curve(tt, [(0, 1), (END - 0.75, 1), (END - 0.02, 0)])[:, None]
fx *= tail
music = music[:N] * tail
MUSIC_DB, FX_DB = float(os.environ.get("MUSIC_DB", -9)), float(os.environ.get("FX_DB", -11))
write(os.path.join(FILM, "out", "stem-music.wav"), music[:N] * db(MUSIC_DB))
write(os.path.join(FILM, "out", "stem-fx.wav"), fx[:N] * db(FX_DB))
bed = music[:N] * db(MUSIC_DB) + fx[:N] * db(FX_DB)
write(os.path.join(FILM, "public", "bed.wav"), bed)
vo = read(os.path.join(FILM, "public", "vo.wav"))
pre = bed.copy()
pre[: min(N, len(vo))] += vo[: min(N, len(vo))]
write(os.path.join(FILM, "out", "mix-preview.wav"), pre)
json.dump([{"id": c[0], "t": c[1], "source": c[2], "gain_db": c[3]} for c in CUES], open(os.path.join(FILM, "out", "cue-sheet.json"), "w"), indent=1)
print("cues", len(CUES), "bed", loudness(os.path.join(FILM, "public", "bed.wav")))
print("mix", loudness(os.path.join(FILM, "out", "mix-preview.wav")))
