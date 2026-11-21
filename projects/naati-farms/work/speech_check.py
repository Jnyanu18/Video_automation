"""Find human speech in the clip audio (so the mix never carries someone talking) and map loud non-speech events."""
import sys
import wave
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel
from scipy.signal import resample_poly

AUD = Path(__file__).parent / 'audio'
ids = sys.argv[1:]
model = WhisperModel('base', device='cpu', compute_type='int8')
for i in ids:
    p = AUD / f'a{i}.wav'
    with wave.open(str(p)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, 2).mean(1) / 32768
        sr = w.getframerate()
    x16 = resample_poly(x, 1, 3).astype(np.float32)
    segs, info = model.transcribe(x16, vad_filter=True, language=None)
    segs = list(segs)
    speech = [(round(s.start, 1), round(s.end, 1), s.text.strip(), round(s.no_speech_prob, 2)) for s in segs]
    hop = sr // 10
    rms = np.array([np.sqrt(np.mean(x[k:k + hop] ** 2)) for k in range(0, len(x) - hop, hop)])
    db = 20 * np.log10(rms + 1e-9)
    loud = [round(k / 10, 1) for k in np.argsort(db)[::-1][:5]]
    print(f'{i}: lang={info.language}:{info.language_probability:.2f} median {np.median(db):.1f} dB, loudest @ {sorted(loud)} max {db.max():.1f} dB')
    for s in speech:
        print('    speech?', s)
