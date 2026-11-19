import scipy.signal as sg
# Case-file score: D-minor dark-ambient bed + designed SFX + stand-in VO, mixed to public/mix.wav.
# Score role: continuous low score, never silent, VO always on top, music swells in VO gaps,
# drop-outs for reveals. All sound here is synthetic (generated in code) and the VO is a TTS stand-in.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import *
from designed import sub_drop, thud, whoosh, glass_ping, chime, data_chatter, tick, light_tone, blip

TAU = 2 * np.pi
vo = read(os.path.join(HERE, 'vo-standin.mp3'))
W = words()
END = W[-1]['e'] + 1.4
N = int(END * SR)
t = np.arange(N) / SR

def pad(notes, gain, lfo=0.05, cut0=300, cut1=900, seed=0):
    y = np.zeros(N)
    for i, n in enumerate(notes):
        f = hz(n)
        for d in (-0.12, 0.0, 0.11):  # detuned saws via additive partials (soft)
            ff = f * 2 ** (d / 12)
            for k in range(1, 7):
                y += np.sin(TAU * ff * k * t + i + k) / k ** 1.3
    y *= gain / (len(notes) * 3)
    cut = cut0 + (cut1 - cut0) * (0.5 + 0.5 * np.sin(TAU * lfo * t + seed))
    out = np.zeros(N)
    for a in range(0, N, SR // 10):  # block-wise filter sweep
        b = min(N, a + SR // 10 + 2048)
        out[a:min(N, a + SR // 10)] = lp(y[a:b], float(cut[a]), 2)[: min(N, a + SR // 10) - a]
    return out

# --- bed: D2/A2 drone, D minor pad that opens up in the second half
bed = stereo(pad(['D2', 'A2'], 1.0, 0.03, 180, 420), -0.1) + stereo(pad(['D3', 'F3', 'A3'], 0.55, 0.045, 350, 1400, 1), 0.15)
bed += stereo(pad(['C4', 'F4'], 0.25, 0.06, 600, 2200, 2), -0.3) * curve(t, [(0, 0), (15.9, 0), (17.0, 1), (26.8, 1), (27.4, 0)])[:, None]
bed = reverb(bed, decay=3.5, wet=0.35, bright=3000)[:N]
# intro rise, drop-out on "backdoor", near-silence on "Half a second", tail swell
cb = cue('backdoor'); ch = cue('Half', 1)
shape = curve(t, [(0, 0.0), (1.6, 0.9), (cb - 0.9, 1.0), (cb - 0.05, 0.25), (cb + 0.9, 1.0), (ch - 0.4, 1.1), (ch + 0.05, 0.35), (END - 1.2, 0.6), (END, 0)])

# --- pulse: soft low heartbeat that marks the investigation, faster once the backdoor is found
pulse = np.zeros((N, 2))
for k in np.arange(0.2, cb - 0.6, 1.0):
    put(pulse, thud(52, 0.45) * 0.55, k)
for k in np.arange(cb + 1.0, ch - 0.3, 0.5):
    put(pulse, thud(55, 0.35) * 0.45, k)

# --- sound events (visible hits; times from the same cues the picture uses)
sfx = np.zeros((N + SR * 4, 2))
for i, k in enumerate(np.arange(0.35, 1.9, 0.085)):  # typing `time ssh` on the terminal
    put(sfx, tick(1.6 + 0.3 * ((i * 7) % 3)) * 0.35, k + 0.02 * ((i * 5) % 3))
put(sfx, blip('A4', 0.3, 0.5), 2.3)                    # first result prints (0.299s)
put(sfx, thud(70) * 0.9, cue('half', 0) - 0.05)           # red 0.807s lands
put(sfx, glass_ping('D7') * 0.5, cue('half', 0))
put(sfx, blip('D5', 0.3, 0.5), cue('Not'))             # exit 0 / no errors
put(sfx, thud(60) * 0.7, cue('slow', 1))               # +500 ms stamp
put(sfx, whoosh(0.8, pan0=0.6, pan1=-0.6) * 0.7, cue('Andres') - 0.55)   # push through into the map
put(sfx, data_chatter(1.9, 40, lo='D5', shape='up') * 0.6, cue('down'))  # route drawing down the stack
for ph in ('Andres', 'down', 'tiny', 'xz'):
    put(sfx, thud(85) * 0.45, cue(ph))
put(sfx, glass_ping('A6') * 0.45, cue('xz'))
put(sfx, whoosh(0.9, lo=200, hi=3000, pan0=-0.5, pan1=0.5) * 0.7, cue('Inside') - 0.6)
put(sfx, sub_drop(2.4) * 0.9, cb)                       # the red block ignites
put(sfx, thud(75) * 0.6, cue('Jia'))                    # card lands
put(sfx, tick(1.0) * 0.6, cue('two'))
put(sfx, tick(1.2) * 0.6, cue('earning'))
put(sfx, whoosh(0.7, pan0=0.5, pan1=-0.5) * 0.6, cue('It had') - 0.45)
for i, k in enumerate(np.arange(cue('It had') + 0.15, cue('test'), 0.06)):  # quote typing on
    put(sfx, tick(2.0 + 0.2 * (i % 3)) * 0.18, k)
put(sfx, blip('F5', 0.35, 0.7), cue('Fedora'))
put(sfx, blip('A5', 0.35, 0.7), cue('Debian'))
put(sfx, sub_drop(2.6) * 0.7, ch - 0.02)
put(sfx, light_tone(3.2, 'D5') * 0.5, ch + 0.1)
put(sfx, chime('D5', 3.0) * 0.5, cue('close'))
sfx = sfx[:N]

# --- duck music under the VO (sidechain-style from the VO envelope)
vo = np.vstack([vo, np.zeros((max(0, N - len(vo)), 2))])[:N]
env = np.abs(vo).mean(1)
env = sg.lfilter([1 - 0.9993], [1, -0.9993], env) * 6
duck = 1 - 0.55 * np.clip(env / (env.max() * 0.35 + 1e-9), 0, 1)

music = (bed * shape[:, None] + pulse) * duck[:, None]
music *= db(-12) / max(1e-9, np.sqrt(np.mean(music ** 2)) * 4)
mix = vo * db(0) + music * db(-10) + sfx * db(-12)
mix = soft(mix * 0.9, 1.1)
write(os.path.join(ROOT, 'public', 'mix.wav'), mix, peak=-1.5)
write(os.path.join(ROOT, 'public', 'music-only.wav'), music * db(-10) + sfx * db(-12), peak=-3)
print('wrote', END, 's')
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
print('VO rms', round(rms(vo), 1), 'music rms', round(rms(music * db(-10)), 1), 'sfx rms', round(rms(sfx * db(-12)), 1))
