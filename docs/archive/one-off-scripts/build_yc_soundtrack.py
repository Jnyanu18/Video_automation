import numpy as np
import wave, math, subprocess

sr = 44100
dur = 60.99
total_samples = int(sr * dur)

# 1. Load clean voice
with wave.open('raw footage/yc/audio/clean_voice.wav', 'rb') as wf:
    n = wf.getnframes()
    voice_raw = np.frombuffer(wf.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
    # Average stereo to mono for processing
    if wf.getnchannels() == 2:
        voice = (voice_raw[0::2] + voice_raw[1::2]) / 2.0
    else:
        voice = voice_raw

if len(voice) > total_samples:
    voice = voice[:total_samples]
else:
    voice = np.pad(voice, (0, total_samples - len(voice)))

# 2. Synthesize modern tech ambient background score (Stripe / Apple / YC style)
# Warm chord progression in Eb major (Ebmaj7 -> Cm7 -> Abmaj7 -> Bb)
music = np.zeros(total_samples, dtype=np.float32)
chords = [
    [155.56, 196.00, 233.08, 293.66], # Ebmaj7
    [130.81, 155.56, 196.00, 233.08], # Cm7
    [103.83, 130.81, 155.56, 207.65], # Abmaj7
    [116.54, 146.83, 174.61, 233.08]  # Bb
]

loop_s = 8.0 # 2s per chord
for i in range(int(dur / loop_s) + 1):
    base_t = i * loop_s
    for c_idx, freqs in enumerate(chords):
        st = base_t + c_idx * 2.0
        s_idx = int(st * sr)
        e_idx = min(int((st + 2.0) * sr), total_samples)
        if s_idx >= total_samples: break
        
        t = np.linspace(0, (e_idx - s_idx) / sr, e_idx - s_idx)
        chord_w = np.zeros(e_idx - s_idx, dtype=np.float32)
        for f in freqs:
            # Soft analog pad
            chord_w += (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * (0.8 + 0.2 * np.cos(2 * np.pi * 0.5 * t))
        
        # Envelope with soft attack
        env = np.ones(e_idx - s_idx, dtype=np.float32)
        fade_n = int(0.1 * sr)
        if len(env) > 2 * fade_n:
            env[:fade_n] = np.linspace(0, 1, fade_n)
            env[-fade_n:] = np.linspace(1, 0, fade_n)
            
        music[s_idx:e_idx] += chord_w * env * 0.05

# 3. Add subtle SFX on key product reveals
sfx = np.zeros(total_samples, dtype=np.float32)

def add_ui_click(hit_t):
    idx = int(hit_t * sr)
    dur_s = 0.04
    l = int(dur_s * sr)
    if idx + l <= total_samples:
        t = np.linspace(0, dur_s, l)
        sfx[idx:idx+l] += np.sin(2 * np.pi * 950 * t) * np.exp(-t * 90.0) * 0.15

def add_ui_swoosh(hit_t):
    idx = int(hit_t * sr)
    dur_s = 0.35
    l = int(dur_s * sr)
    if idx + l <= total_samples:
        t = np.linspace(0, dur_s, l)
        sfx[idx:idx+l] += np.random.uniform(-1, 1, l) * np.sin(np.pi * t / dur_s) * 0.12

# Subtle clicks when UI actions occur (TradePilot 5s, AskVerb 26s, safe execution 38s)
add_ui_swoosh(5.2)
add_ui_click(6.0)
add_ui_click(26.2)
add_ui_swoosh(31.5)
add_ui_click(37.5) # Confirmation click

# Master mix: Voice (1.0), Music (-22dB ~ 0.08), SFX (0.3)
master_audio = voice * 0.95 + music * 0.08 + sfx * 0.25

# Peak normalize
max_val = np.max(np.abs(master_audio))
if max_val > 0.95:
    master_audio = master_audio / max_val * 0.95

audio_i16 = (master_audio * 32767).astype(np.int16)
stereo = np.column_stack((audio_i16, audio_i16))

with wave.open('raw footage/yc/audio/master_audio_mixed.wav', 'wb') as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    wf.writeframes(stereo.tobytes())

print("master_audio_mixed.wav generated successfully.")
