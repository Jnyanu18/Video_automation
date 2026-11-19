# Music + sound-effects bed for one film (VO stays separate, untouched, in Remotion).
#   py audio/mix.py <style>   (paper|cosmos|dossier|bubble|iso|retro|arcade|canvas) -> public/bed-<style>.wav, out/mix-<film>-preview.wav (VO + bed),
#                                      out/cue-sheet-<film>.json, out/music-<film>.wav (stem)
# Timing comes from out/beats.json (dump-beats.mts) and out/events-<film>.json (dump-events.mts).
# Sources: SYNTHETIC = generated here or by audio/designed.py (never auditioned by a human; levels
# measured only). CC0 = optional one-shot files in $SFX_DIR (rubber-stamp.flac, card-riffle.flac, servo-arm.flac,
# short-whoosh.wav, whoosh-deep.flac, glass-ting.flac); any missing file falls back to a synthetic sound.
# Levels: MUSIC_DB / FX_DB env vars override the per-family defaults (news batch used e.g. iso MUSIC_DB=-11 FX_DB=-26).
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import *
import designed as D

FILM = sys.argv[1] if len(sys.argv) > 1 else "paper"
# SFX family: paper-like worlds use the paper sound set; glass/3D/digital worlds the cosmos set.
FAM = "paper" if FILM in ("paper", "dossier", "retro", "canvas") else "cosmos"
SFX = os.environ.get("SFX_DIR", os.path.join(ROOT, "sfx"))
BJ = json.load(open(os.path.join(ROOT, "out", "beats.json")))
BT = {b["id"]: b["s"] for b in BJ["beats"]}
W = words()
EDLJ = json.load(open(os.path.join(ROOT, "src", "edl.json")))
END = EDLJ["total"]  # v2: pause-trimmed EDL + spoken outro
N = int(END * SR)
TAU = 2 * np.pi
evp = os.path.join(ROOT, "out", "events.json")
EVENTS = json.load(open(evp)) if os.path.exists(evp) else []


def cc0(name, gain_db=0.0, dur=None):
    p = os.path.join(SFX, name)
    if os.path.exists(p):
        x = read(p)
    else:  # no CC0 library: a soft synthetic stand-in
        n = int((dur or 0.5) * SR)
        x = D.glass_ping("C7", dur or 1.2) * 0.3 if "ting" in name else stereo(bp(noise(n, 9), 300, 4000) * np.hanning(n) * 0.3)
    if dur:
        x = fade(x[: int(dur * SR)], 0.004, min(0.25, dur * 0.3))
    return x * db(gain_db)


# ---------------- score (SYNTHETIC) ----------------
# per style: chords, seconds per chord, pad brightness, pluck decay, pluck voice, reverb (decay, wet)
STYLES = {
    # D major, warm and curious: felt pad + wooden mallet plucks
    "paper": ([["D2", "F#3", "A3", "C#4"], ["B1", "D3", "F#3", "A3"], ["G1", "D3", "F#3", "B3"], ["A1", "E3", "A3", "B3"]], 2.4, 1.0, 0.22, "mallet", (2.6, 0.22)),
    # F major / D minor, airy wonder: glassy pad + bell arps
    "cosmos": ([["F2", "A3", "C4", "E4"], ["D2", "F3", "A3", "E4"], ["Bb1", "D3", "F3", "A3"], ["C2", "E3", "G3", "C4"]], 3.2, 1.3, 0.6, "bell", (4.0, 0.32)),
    # C minor, tense intelligence-briefing: dark pad, muted plucks, ticking pulse
    "dossier": ([["C2", "Eb3", "G3", "Bb3"], ["Ab1", "C3", "Eb3", "G3"], ["F1", "C3", "Ab3", "C4"], ["G1", "D3", "G3", "B3"]], 2.0, 0.8, 0.12, "mallet", (2.2, 0.2)),
    # Eb major shimmer: glass bells over a slowly swelling pad
    "bubble": ([["Eb2", "G3", "Bb3", "D4"], ["C2", "Eb3", "G3", "D4"], ["Ab1", "C3", "Eb3", "G3"], ["Bb1", "D3", "F3", "Bb3"]], 2.8, 1.4, 0.7, "bell", (4.2, 0.34)),
    # G major, playful toy-town: marimba arps
    "iso": ([["G2", "B3", "D4", "F#4"], ["E2", "G3", "B3", "D4"], ["C2", "G3", "B3", "E4"], ["D2", "F#3", "A3", "C#4"]], 2.0, 1.1, 0.3, "mallet", (2.0, 0.2)),
    # A minor space-age: warm analog pad, sine lead plucks, long echo
    "retro": ([["A1", "E3", "A3", "C4"], ["F1", "C3", "A3", "E4"], ["D2", "F3", "A3", "C4"], ["E2", "G#3", "B3", "E4"]], 3.0, 0.9, 0.5, "sine", (3.4, 0.3)),
    # E minor chiptune: square-wave arps, fast
    "arcade": ([["E2", "G3", "B3", "E4"], ["C2", "G3", "C4", "E4"], ["D2", "F#3", "A3", "D4"], ["B1", "F#3", "B3", "D#4"]], 1.6, 1.6, 0.18, "square", (1.4, 0.12)),
    # D minor, thoughtful lab-notebook: soft piano-ish plucks
    "canvas": ([["D2", "F3", "A3", "C4"], ["Bb1", "D3", "F3", "A3"], ["F1", "C3", "F3", "A3"], ["C2", "E3", "G3", "C4"]], 2.6, 1.0, 0.45, "piano", (3.0, 0.26)),
}
CHORDS, SLOT, PAD_BRIGHT, PLUCK_DECAY, VOICE, REV = STYLES[FILM]

SEMI = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
def f0(n):
    return 440.0 * 2 ** ((SEMI[n[:-1]] + (int(n[-1]) - 4) * 12 - 9) / 12)
def up(n, k=1):
    return n[:-1] + str(int(n[-1]) + k)


def pad(notes, dur, cutoff=1800, seed=1):
    t = secs(dur)
    y = np.zeros(len(t))
    for j, n in enumerate(notes):
        for d in (-0.06, 0.0, 0.07):
            fq = f0(n) * 2 ** (d / 12)
            y += sum(np.sin(TAU * fq * k * t + j + k + seed) / k ** (1.6 / PAD_BRIGHT) for k in range(1, 6)) * (0.5 if j == 0 else 0.3)
    env = np.minimum(1, t / 0.7) * np.minimum(1, (dur - t) / 0.7)
    return stereo(lp(y * env, cutoff) * 0.07)


def pluck(n, dur=1.4):
    t = secs(dur)
    fq = f0(n)
    if VOICE == "mallet":  # wooden mallet: fundamental + 4th partial, fast decay
        y = (np.sin(TAU * fq * t) + 0.35 * np.sin(TAU * 4 * fq * t) * np.exp(-t / 0.05)) * np.exp(-t / PLUCK_DECAY)
    elif VOICE == "square":  # chiptune: band-limited square, short
        y = sum(np.sin(TAU * fq * k * t) / k for k in (1, 3, 5, 7, 9)) * 0.7 * np.exp(-t / PLUCK_DECAY)
    elif VOICE == "sine":  # analog sine lead with slight vibrato
        y = np.sin(TAU * fq * t + 0.15 * np.sin(TAU * 5.5 * t)) * np.exp(-t / PLUCK_DECAY)
    elif VOICE == "piano":  # piano-ish: few harmonics, hammer decay
        y = (np.sin(TAU * fq * t) + 0.4 * np.sin(TAU * 2 * fq * t) * np.exp(-t / 0.3) + 0.15 * np.sin(TAU * 3 * fq * t) * np.exp(-t / 0.15)) * np.exp(-t / PLUCK_DECAY)
    else:                # bell: inharmonic partials, long decay
        y = (np.sin(TAU * fq * t) + 0.4 * np.sin(TAU * 2.76 * fq * t) * np.exp(-t / 0.4) + 0.2 * np.sin(TAU * 5.4 * fq * t) * np.exp(-t / 0.15)) * np.exp(-t / PLUCK_DECAY)
    return fade(y, 0.002, 0.15)


# arrangement per beat: (gain, cutoff, arp density 0..2, high tone, pulse)
ARR = {
    "hook": (0.55, 1100, 1, 0, 0), "think": (0.6, 1200, 1, 0, 0),
    "internet": (0.85, 1700, 2, 0, 1), "slice": (0.85, 1700, 1, 0, 1), "network": (0.95, 2000, 2, 0, 1),
    "rules": (1.0, 2200, 2, 1, 0), "sizes": (0.75, 1300, 0, 1, 1),
    "beautiful": (1.0, 2300, 1, 1, 0), "maybe": (0.9, 1900, 1, 0, 0),
    "books": (0.85, 1800, 2, 0, 0), "algebra": (0.7, 1500, 1, 0, 0), "practice": (0.85, 1900, 2, 0, 1),
    "nn": (1.0, 2300, 2, 1, 0), "recall": (0.9, 2000, 2, 0, 0), "amazing": (1.0, 2300, 1, 1, 0),
    "question": (0.45, 800, 0, 0, 0), "cosmos": (1.0, 2500, 1, 1, 1), "path": (0.85, 1900, 1, 0, 0),
    "agi": (0.8, 1600, 0, 1, 0), "cta1": (0.9, 2000, 1, 0, 0), "cta2": (1.0, 2300, 2, 1, 1), "cta3": (1.0, 2300, 2, 1, 0),
    "end": (1.0, 2400, 0, 1, 0),
}
def section(t):
    bid = [b for b in BJ["beats"] if b["s"] <= t][-1]["id"]
    return ARR.get(bid, (0.85, 1900, 1, 0, 0) if bid not in ("intro", "end") else (0.6, 1400, 0, 1, 0))


music = np.zeros((N + SR * 8, 2))
RES = W[-1]["e"] - 0.1  # resolve on the last word ("luck")
nslots = int(RES / SLOT) + 1
for s in range(nslots):
    t0 = s * SLOT
    if t0 >= RES:
        break
    g, cut, arp, hi, pulse = section(t0 + 0.01)
    ch = CHORDS[s % 4]
    dur = min(SLOT, RES - t0)
    put(music, pad(ch, dur + 0.7, cut, s), t0, g)
    put(music, stereo(np.sin(TAU * f0(ch[0]) * secs(dur)) * np.exp(-secs(dur) / 1.6) * 0.1), t0, g)
    if arp:
        pat = [ch[1], ch[2], ch[3], ch[2], up(ch[1]), ch[3]] if arp == 2 else [ch[2], ch[3], ch[2]]
        for k, n in enumerate(pat):
            tk = t0 + k * SLOT / len(pat)
            if tk < RES:
                put(music, stereo(pluck(up(n)), -0.45 + 0.18 * (k % 6)) * (0.05 if FAM == "paper" else 0.035), tk, g)
    if hi:
        put(music, D.light_tone(dur + 0.6, f0(up(ch[3][:-1] + "4"))) * (0.10 if FAM == "paper" else 0.16), t0, g)
    if pulse:
        for k in range(4):
            if t0 + k * SLOT / 4 < RES:
                put(music, D.thud(55 if FAM == "paper" else 48, 0.35) * 0.09, t0 + k * SLOT / 4, g)
# the resolve: tonic on the last word, ringing out to the final frame
TON = CHORDS[0]
put(music, pad(TON, END - RES + 1.0, 2400, 99), RES, 1.1)
put(music, D.chime(f0(up(TON[2])), 3.0) * 0.45, RES, 1.0)
music = reverb(music[:N], decay=REV[0], wet=REV[1], bright=4200)[:N]

# phrase-level duck under the voice: merge words < 0.4 s apart, ramp 0.2 s
tt = np.arange(N) / SR
duck = np.ones(N)
phr = []
for w in W:
    if phr and w["s"] - phr[-1][1] < 0.4:
        phr[-1][1] = w["e"]
    else:
        phr.append([w["s"], w["e"]])
phr.append([EDLJ["outro"]["t"], EDLJ["outro"]["t"] + EDLJ["outro"]["dur"]])  # duck under the outro too
for s0, e0 in phr:
    a, b = int((s0 - 0.2) * SR), int((e0 + 0.15) * SR)
    duck[max(0, a):b] = np.minimum(duck[max(0, a):b], db(-15))  # v2: his voice first (was -9)
k = int(0.2 * SR)
duck = np.convolve(duck, np.ones(k) / k, mode="same")
music *= duck[:, None]
music *= curve(tt, [(0, 0.4), (0.2, 1), (END - 0.6, 1), (END, 0)])[:, None]

# ---------------- sound effects from the world's events ----------------
fx = np.zeros((N + SR * 6, 2))
CUES = []
VO = read(os.path.join(ROOT, "public", "vo.wav")).mean(1)[:N]
VOB = bp(VO, 1000, 4000)
_r = lambda a: 10 * np.log10(np.mean(a ** 2) + 1e-12)


def crinkle(dur=0.5, seed=1):
    t = secs(dur)
    rng = np.random.default_rng(seed)
    clicks = (rng.random(len(t)) < 0.004 + 0.01 * np.sin(np.pi * t / dur)) * rng.normal(0, 1, len(t))
    y = bp(clicks + 0.15 * noise(len(t), seed), 1500, 9000) * np.sin(np.pi * t / dur) ** 0.6
    return stereo(fade(y * 0.6, 0.003, 0.05))


def page_flip(dur=0.32, seed=2):
    t = secs(dur)
    sweep = np.exp(-((t - dur * 0.6) / (dur * 0.25)) ** 2)
    y = bp(noise(len(t), seed), 900, 7000) * sweep
    return stereo(fade(y * 0.55, 0.004, 0.04))


def paper_tap(seed=3):
    t = secs(0.12)
    y = bp(noise(len(t), seed), 400, 3000) * np.exp(-t / 0.018) + 0.4 * np.sin(TAU * 180 * t) * np.exp(-t / 0.03)
    return stereo(fade(y * 0.6, 0.001, 0.03))


def marker(dur=0.3, seed=4):
    t = secs(dur)
    y = bp(noise(len(t), seed), 1800, 6500) * (0.6 + 0.4 * np.sin(TAU * 38 * t)) * np.sin(np.pi * t / dur) ** 0.5
    return stereo(fade(y * 0.45, 0.005, 0.04))


def snip(seed=5):
    t = secs(0.09)
    y = bp(noise(len(t), seed), 3000, 10000) * np.exp(-t / 0.012)
    return stereo(fade(np.concatenate([y, np.zeros(int(0.05 * SR)), y * 0.8]) * 0.7, 0.001, 0.02))


def mixl(*xs):
    n = max(len(x) for x in xs); o = np.zeros((n, 2))
    for x in xs: o[: len(x)] += x
    return o


KEY = [up(n, 2) for n in CHORDS[0]]


def sound_for(e, i):
    s = (e["id"] + " " + e.get("what", "")).lower()
    d = e.get("dur") or 0.6
    has = lambda *ws: any(w in s for w in ws)
    note = KEY[i % 4]
    if FILM == "arcade":
        if has("coin", "score", "point"): return D.blip(f0(note) * 2, 0.12, 0.8) * 0.5, "SYNTHETIC coin", 0
        if has("hit", "impact", "punch", "ko", "versus", "vs"): return mixl(stereo(D.thud(70, 0.25).mean(1)), D.glitch(0.2, seed=60 + i) * 0.4), "SYNTHETIC hit", 0
        if has("select", "click", "beep", "menu"): return stereo(pluck(note, 0.2)) * 0.4, "SYNTHETIC beep", 0
    if FAM == "paper":
        if has("type", "typewriter", "key"): return mixl(paper_tap(i) * 0.8, snip(i) * 0.3), "SYNTHETIC type-tap", -3
        if has("stamp"): return cc0("rubber-stamp.flac", -4), "CC0 rubber-stamp", 0
        if has("unfold", "bloom", "end card", "endcard"): return mixl(D.chime(f0(KEY[0]), 2.4) * 0.5, crinkle(0.6, i)), "SYNTHETIC chime+crinkle", 0
        if has("fold", "crumpl", "crush", "squash", "compress", "squeez"): return crinkle(min(1.2, max(0.35, d)), i), "SYNTHETIC crinkle", -2
        if has("flip", "page", "riffle"): return page_flip(seed=i), "SYNTHETIC page-flip", -3
        if has("shuffle", "pile", "stack", "deck"): return cc0("card-riffle.flac", -8, 0.8), "CC0 card-riffle", 0
        if has("slice", "cut", "snip", "scissor", "cutter"): return snip(i), "SYNTHETIC snip", -2
        if has("marker", "draw", "ink", "circle", "underline", "write", "pencil", "arrow", "scribble", "thread"): return marker(min(0.6, max(0.2, d)), i), "SYNTHETIC marker", -5
        if has("smudge", "lossy", "glitch", "error", "blur"): return mixl(crinkle(0.4, i) * 0.7, stereo(D.thud(90, 0.3).mean(1)) * 0.5), "SYNTHETIC smudge", -3
        if has("robot", "servo", "hand"): return cc0("servo-arm.flac", -12, 0.7), "CC0 servo-arm", 0
        if has("whoosh", "fly", "flight", "polaroid", "tile", "travel", "swoop", "pan", "camera", "pull"): return cc0("short-whoosh.wav", -9), "CC0 short-whoosh", 0
        if has("node", "light", "fill", "pulse"): return stereo(pluck(up(note)) * 0.25), "SYNTHETIC mallet", 0
        return paper_tap(i), "SYNTHETIC paper-tap", -2
    else:
        if has("glitch", "lossy", "error", "misremember"): return D.glitch(0.4, seed=40 + i) * 0.6, "SYNTHETIC glitch", 0
        if has("bloom", "end card", "endcard", "seed born", "unfold"): return mixl(D.power_up(0.9) * 0.4, D.chime(f0(KEY[0]), 2.6) * 0.5), "SYNTHETIC power-up+chime", 0
        if has("slice", "cut", "plane"): return D.laser_cut(0.34, seed=110 + i) * 0.5, "SYNTHETIC laser-cut", 0
        if has("collapse", "converge", "compress", "squeez", "spiral", "assemble"): return D.unscramble(min(1.6, max(0.6, d))) * 0.4, "SYNTHETIC unscramble", 0
        if has("flip", "page"): return D.light_zip(0.4) * 0.35, "SYNTHETIC light-zip", 0
        if has("whoosh", "fly", "flight", "tile", "travel", "dolly", "camera", "swoop", "orbit"): return cc0("whoosh-deep.flac", -12, 1.2), "CC0 whoosh-deep", 0
        if has("pulse", "node", "fire", "spark"): return D.blip(f0(note), 0.25, 0.6) * 0.5, "SYNTHETIC blip", 0
        if has("check", "works", "correct"): return cc0("glass-ting.flac", -8, 1.5), "CC0 glass-ting", 0
        return D.glass_ping(f0(up(note)), 1.6) * 0.35, "SYNTHETIC glass-ping", -2


FX_DB = float(os.environ.get("FX_DB", -14 if FAM == "paper" else -17))
for i, e in enumerate(EVENTS):
    x, src, g = sound_for(e, i)
    g += FX_DB
    t0 = e["t"] - 0.03  # land a frame before the visible hit
    a0 = int(t0 * SR)
    seg = VOB[max(0, a0): a0 + len(x)]
    if len(seg) > 1000 and _r(seg) > -45:  # under speech: keep the effect at least 12 dB under the voice band
        lvl = _r(bp(x.mean(1)[: len(seg)], 1000, 4000)) + g
        if _r(seg) - lvl < 20:  # v2: effects at least 20 dB under his voice band (was 12)
            g -= 20 - (_r(seg) - lvl)
    pan = e.get("x", 0) or 0
    if pan:
        a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
        x = np.stack([x.mean(1) * np.cos(a) * 1.41, x.mean(1) * np.sin(a) * 1.41], 1)
    put(fx, x, max(0, t0), db(g))
    CUES.append({"id": e["id"], "t": round(t0, 2), "src": src, "gain_db": round(g, 1)})

MUSIC_DB = float(os.environ.get("MUSIC_DB", -7.5 if FAM == "paper" else -9))
bed = music[:N] * db(MUSIC_DB) + fx[:N]
bed *= curve(tt, [(0, 1), (END - 0.5, 1), (END, 0)])[:, None]
write(os.path.join(ROOT, "public", f"bed-{FILM}.wav"), bed)
write(os.path.join(ROOT, "out", f"music-{FILM}.wav"), music[:N] * db(MUSIC_DB))
vo2 = read(os.path.join(ROOT, "public", "vo.wav"))[:N]
write(os.path.join(ROOT, "out", f"mix-{FILM}-preview.wav"), vo2 + bed[: len(vo2)])
json.dump(CUES, open(os.path.join(ROOT, "out", f"cue-sheet-{FILM}.json"), "w"), indent=1)

# VO-to-bed ratio in the 1-4 kHz band during speech (50 ms frames)
hop = int(0.05 * SR)
vb, bb = bp(vo2.mean(1), 1000, 4000), bp(bed[: len(vo2)].mean(1), 1000, 4000)
rat = []
for s0, e0 in phr:
    for a in range(int(s0 * SR), int(e0 * SR) - hop, hop):
        v, b_ = _r(vb[a:a + hop]), _r(bb[a:a + hop])
        if v > -40:
            rat.append(v - b_)
rat = np.array(rat)
print(FILM, "events", len(EVENTS), "| VO-bed 1-4k dB median %.1f p10 %.1f, %d%% < 12 dB" % (np.median(rat), np.percentile(rat, 10), 100 * np.mean(rat < 12)))
