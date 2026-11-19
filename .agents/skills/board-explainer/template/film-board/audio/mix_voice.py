# Caleb-style sound: voice only. No music, no pencil scratches, no whooshes (measured on the reference: pauses are
# breath/room tone ~20 dB under speech, energy mostly 1-8 kHz, nothing tonal). We add one thing: a constant, very
# quiet room tone so cuts between his DJI take (room) and ElevenLabs (studio-dry) never drop to digital silence.
# usage: mix_voice.py [_ig]  -> public/mix<suffix>.wav
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import SR, db, lp, hp, noise, stereo, write, read
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUF = sys.argv[1] if len(sys.argv) > 1 else ''
vo = read(os.path.join(ROOT, 'public', f'vo_master{SUF}.wav')); N = len(vo)
room = hp(lp(noise(N, 5), 3500), 120)                      # soft, warm hiss
room = room / (np.sqrt(np.mean(room ** 2)) + 1e-12) * db(-62)
mix = vo + stereo(room)
write(os.path.join(ROOT, 'public', f'mix{SUF}.wav'), mix, peak=-1.5)
print('voice-only mix', round(N / SR, 1), 's')
