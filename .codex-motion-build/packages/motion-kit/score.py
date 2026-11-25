"""Per-film score. Mirror src/film.tsx: one block per section, events on the same times as the picture."""
from pathlib import Path
import subprocess
import sys

from scorelib import CHORDS, Score

s = Score(duration=4 * 60 / 128 * 4, bpm=128)
B, BAR, HB = s.B, s.BAR, s.HB

# SLAM: four half-beat stabs
for c in range(4):
    s.kick(c * HB, .85)
    s.stab(c * HB, [220, 247, 277, 330][c], .12, .3 if c % 2 else -.3)
s.riser(BAR - .45, .45, .15)

# MORPH: groove + one pluck per shape change
s.beat_bar(BAR, .9, .4, 8, .06, [82.41, 98.0, 110.0, 123.47])
for i, f in enumerate([659.25, 783.99, 880.0]):
    s.whoosh(BAR + i * BAR / 3 - .08, .16, .1)
    s.pluck(BAR + i * BAR / 3, f, .16)

# LIQUID: arpeggio over a pad
s.beat_bar(2 * BAR, .85, .35, 16, .045, [82.41] * 4)
arp = [329.63, 392.0, 493.88, 587.33]
for j in range(16):
    s.pluck(2 * BAR + j * B / 4, arp[j % 4], .08, .4 if j % 2 else -.4, .25)
s.pad(2 * BAR, 3 * BAR, CHORDS['Em9'], .06)
s.riser(3 * BAR - .45, .45, .2)

# LOCKUP: impact + bowl, chord rings out
s.impact(3 * BAR, .7)
s.kick(3 * BAR, 1.0)
s.bowl(3 * BAR, 196, .5)
s.pad(3 * BAR, s.dur, CHORDS['Em9'], .1)

wav = Path(__file__).parent / 'public' / 'soundtrack.wav'
s.finalize(wav)
print(f'{wav} written')
sys.exit(subprocess.call([sys.executable, str(Path(__file__).parent / 'gate.py'), str(wav),
                          '--tp', '-1.8']))
