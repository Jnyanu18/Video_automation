"""
Ramayana Cinematic Teaser — original score, 96 BPM, 15 seconds.
Sections mirror src/film.tsx exactly: 6 × BAR (each BAR = 2.5s).

  s1  t=0.0–2.5   THE BOW       — conch breath + string tension + taiko hit
  s2  t=2.5–5.0   THE LINE      — choir swell, sustained horn, slow bass heartbeat
  s3  t=5.0–7.5   TEN HEADS     — taiko storm, ten staggered hits, low crackle
  s4  t=7.5–10.0  THE LEAP      — fire crackle, brass fanfare, momentum whoosh
  s5  t=10.0–12.5 THE ARROW     — string twang, riser, massive impact + shard shimmer
  s6  t=12.5–15.0 THE SUN       — choir resolution, bell shimmer, final reverb tail
"""
from pathlib import Path
from scorelib import CHORDS, Score

BPM = 96
s = Score(duration=15.0, bpm=BPM)
B, BAR, HB = s.B, s.BAR, s.HB   # B=0.625s  BAR=2.5s  HB=0.3125s

# ── s1: THE BOW  (0.0–2.5) ──────────────────────────────────────────────────
# Conch call opens. Bow-draw string tension rises. Taiko slam on the draw.
s.horn(0.0, 146.83, 1.4, g=.18, swell=1.1)          # low D horn / conch breath
s.swell(0.0, 2.5, lo=80, hi=380, g=.08)             # sub-bass breathe-in
s.twang(2.3, 220, g=.28)                             # bow string twang
s.taiko(2.4, g=.95, f0=90)                           # taiko slam on bow draw
s.riser(1.8, 0.65, g=.18)                            # tension riser into taiko

# ── s2: THE LINE  (2.5–5.0) ─────────────────────────────────────────────────
# Choir opens — the dharma line is being drawn. Horn holds. Heartbeat bass.
s.choir(2.5, 5.2, [146.83, 196.0, 246.94, 293.66], g=.14, attack=.55, release=.9)
s.horn(2.6, 196.0, 2.2, g=.15, swell=.9)
for q in range(4):
    s.bass(2.5 + q * B, 73.42, B * .9, g=.22)      # heartbeat (D1)
    s.kick(2.5 + q * B, g=.45)

# ── s3: TEN HEADS  (5.0–7.5) ────────────────────────────────────────────────
# Ten taiko hits — one per head multiplication. Crackle of dark energy.
for i in range(10):
    t_hit = 5.0 + i * (BAR / 10)
    s.taiko(t_hit, g=.55 + .04 * i, f0=100 + i * 4)
    if i % 2 == 0:
        s.kick(t_hit, g=.6)
s.crackle(5.0, 7.5, g=.1, density=50)
s.pad(5.0, 7.5, [73.42, 110.0, 146.83], g=.07)      # dark drone
s.taiko(7.3, g=1.0, f0=78)                           # big slam heading into leap

# ── s4: THE LEAP  (7.5–10.0) ────────────────────────────────────────────────
# Fire crackle. Brass fanfare launch. Momentum whoosh through the sky.
s.crackle(7.5, 9.0, g=.14, density=70)              # Lanka fire
s.horn(7.6, 220.0, 1.8, g=.22, swell=.5)            # brass fanfare — Hanuman!
s.horn(7.7, 293.66, 1.6, g=.16, swell=.4)           # second voice of fanfare
for j in range(4):
    s.whoosh(7.5 + j * HB, .3, g=.09 * (1 + j * .1))
s.taiko(9.3, g=.85, f0=95)                           # landing thud

# ── s5: THE ARROW  (10.0–12.5) ──────────────────────────────────────────────
# Draw tension. Twang. Riser climax. Massive impact + shard shimmer.
s.swell(10.0, 1.3, lo=60, hi=600, g=.14)            # bow pull tension
s.twang(11.2, 196.0, g=.38)                          # arrow release twang
s.riser(10.8, .55, g=.22)                            # climax riser
s.impact(11.25, g=.9)                                # arrow impact
s.kick(11.25, g=1.0)
s.taiko(11.25, g=.8, f0=65)                          # sub-bass earth shake
s.shimmer(11.4, 0.6, g=.09, base=1046.5)            # shard sparkle

# ── s6: THE SUN  (12.5–15.0) ────────────────────────────────────────────────
# Every line converges into one point. Choir resolves to D major. Bell. Silence.
s.choir(12.5, 15.4, [146.83, 185.0, 220.0, 293.66, 369.99], g=.17, attack=.5, release=1.0)
s.bowl(12.5, 196.0, g=.55)                          # singing bowl on resolution
s.horn(12.6, 293.66, 2.6, g=.12, swell=1.2)        # horn fades to silence
s.shimmer(13.2, 1.1, g=.07, base=1318.5)            # title-card shimmer
s.shimmer(14.1, 0.8, g=.05, base=2093.0)            # star harmonic
# Soft bass heartbeat — the epic continues forever
for q in range(2):
    s.bass(12.5 + q * BAR * .5, 73.42, B * .9, g=.12)

s.finalize(Path(__file__).parent / 'public' / 'soundtrack.wav')
print('✓ public/soundtrack.wav written  (Ramayana — 96 BPM — 15.0s)')
