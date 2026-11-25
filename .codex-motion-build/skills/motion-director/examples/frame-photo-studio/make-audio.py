#!/usr/bin/env python3
"""Original deterministic studio-reel score. No samples, providers or downloads.

NumPy synthesizes every sound. Standard-library WAV output is PCM24. Installed
FFmpeg/ffprobe are used for read-only loudness/peak and container measurements.
Writes only public/studio-score.wav and audio-report.json beside this script.
"""
from pathlib import Path
import hashlib
import json
import math
import re
import subprocess
import wave

import numpy as np


ROOT = Path(__file__).resolve().parent
SR, FPS, SECONDS, BPM = 48_000, 60, 15, 120
N = SR * SECONDS
SEED = 161803398
RNG = np.random.default_rng(SEED)
CUTS = [0, 120, 270, 420, 570, 720, 900]
ACCENTS = [16, 120, 144, 282, 420, 450, 570, 720, 762]
MUSIC = np.zeros((N, 2), dtype=np.float64)
FX = np.zeros_like(MUSIC)
EVENTS = []
COUNTS = {}


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def db(value):
    return 20 * math.log10(max(float(value), 1e-15))


def envelope(n, attack=.003, release=.02):
    result = np.ones(n)
    a, r = min(n, max(1, round(attack * SR))), min(n, max(1, round(release * SR)))
    result[:a] *= np.sin(np.linspace(0, math.pi / 2, a)) ** 2
    result[-r:] *= np.cos(np.linspace(0, math.pi / 2, r)) ** 2
    return result


def add(bus, x, when, gain, pan=0.0, name=None):
    start = round(when * SR)
    if start < 0:
        raise ValueError('Do not silently trim a source at the beginning')
    count = min(len(x), N - start)
    if count <= 0:
        return
    angle = (pan + 1) * math.pi / 4
    bus[start:start + count] += x[:count, None] * gain * np.array([math.cos(angle), math.sin(angle)])
    if name:
        COUNTS[name] = COUNTS.get(name, 0) + 1


def noise(duration, low, high):
    n = round(duration * SR)
    f = np.fft.rfftfreq(n, 1 / SR)
    bins = np.fft.rfft(RNG.standard_normal(n))
    shape = (1 - np.exp(-(f / max(low, 1)) ** 4)) * np.exp(-(f / high) ** 4)
    result = np.fft.irfft(bins * shape, n)
    return result / max(float(np.sqrt(np.mean(result ** 2))), 1e-12)


def kick():
    t = np.arange(round(.29 * SR)) / SR
    frequency = 48 + 120 * np.exp(-t / .018)
    phase = 2 * math.pi * np.cumsum(frequency) / SR
    body = np.sin(phase) * np.exp(-t / .064)
    # Quiet rounded contact, not a large EDM-style sub/drop.
    contact = .07 * noise(.29, 1500, 5000) * np.exp(-t / .003)
    return (body + contact) * envelope(len(t), .0012, .045)


def snap():
    t = np.arange(round(.17 * SR)) / SR
    x = noise(.17, 700, 6500) * np.exp(-t / .023)
    x += .18 * np.sin(2 * math.pi * 175 * t) * np.exp(-t / .032)
    return x * envelope(len(t), .0017, .035)


def hat():
    t = np.arange(round(.075 * SR)) / SR
    return noise(.075, 5200, 11000) * np.exp(-t / .012) * envelope(len(t), .001, .025)


def bass(midi, duration=.37):
    t = np.arange(round(duration * SR)) / SR
    f = hz(midi)
    fundamental = np.sin(2 * math.pi * f * t)
    upper = .28 * np.sin(2 * math.pi * 2 * f * t) * np.exp(-t / .16)
    upper += .10 * np.sin(2 * math.pi * 3 * f * t) * np.exp(-t / .075)
    return (fundamental + upper) * np.exp(-t / .19) * envelope(len(t), .006, .06)


def pluck(midi, duration=.8):
    t = np.arange(round(duration * SR)) / SR
    f = hz(midi)
    x = np.sin(2 * math.pi * f * t + .22 * np.sin(2 * math.pi * f * 2 * t) * np.exp(-t / .08))
    x += .13 * np.sin(2 * math.pi * f * 2.002 * t) * np.exp(-t / .09)
    return x * np.exp(-t / .21) * envelope(len(t), .005, .13)


def chord(notes, duration):
    t = np.arange(round(duration * SR)) / SR
    x = np.zeros(len(t))
    for j, midi in enumerate(notes):
        f = hz(midi)
        phase = float(RNG.uniform(0, 2 * math.pi))
        x += (np.sin(2 * math.pi * f * t + phase)
              + .16 * np.sin(2 * math.pi * f * 1.0018 * t + phase + .3)) / len(notes)
    return x * envelope(len(t), .04, .35) * np.exp(-t / 1.5)


def shutter():
    """Original two-curtain mechanical transient with a brief low body."""
    t = np.arange(round(.23 * SR)) / SR
    air = noise(.23, 800, 7500)
    first = np.exp(-t / .008)
    second = np.where(t >= .032, np.exp(-np.maximum(0, t - .032) / .012), 0)
    body = .23 * np.sin(2 * math.pi * 255 * t) * np.exp(-t / .022)
    x = .8 * air * (first + .62 * second) + body
    return x * envelope(len(t), .0006, .035)


def tape_click():
    t = np.arange(round(.10 * SR)) / SR
    f = 620 * np.exp(-t / .016) + 190
    x = .4 * np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-t / .013)
    x += .13 * noise(.10, 1800, 7000) * np.exp(-t / .006)
    return x * envelope(len(t), .001, .035)


def whoosh():
    """0.28s lead, smooth envelope crest on target, then a 0.12s tail."""
    lead, release = .28, .12
    n = round((lead + release) * SR)
    a = round(lead * SR)
    env = np.concatenate((np.sin(np.linspace(0, math.pi / 2, a, endpoint=False)) ** 2,
                          np.cos(np.linspace(0, math.pi / 2, n - a)) ** 2))
    t = np.arange(n) / SR
    # A restrained airy swish with subtle stereo-friendly modulation.
    x = noise(lead + release, 700, 7000) * (.85 + .15 * np.sin(2 * math.pi * 13 * t))
    return x * env


def write_pcm24(path, x):
    values = np.rint(np.clip(x, -1, 1) * (2 ** 23 - 1)).astype(np.int32)
    unsigned = values.astype(np.uint32).reshape(-1)
    data = np.column_stack((unsigned & 255, (unsigned >> 8) & 255,
                            (unsigned >> 16) & 255)).astype(np.uint8)
    with wave.open(str(path), 'wb') as out:
        out.setnchannels(2)
        out.setsampwidth(3)
        out.setframerate(SR)
        out.writeframes(data.tobytes())


def read_pcm24(path):
    with wave.open(str(path), 'rb') as source:
        header = {'sampleRate': source.getframerate(), 'channels': source.getnchannels(),
                  'sampleWidthBytes': source.getsampwidth(), 'samplesPerChannel': source.getnframes()}
        raw = np.frombuffer(source.readframes(source.getnframes()), dtype=np.uint8)
    b = raw.reshape(-1, 3).astype(np.int32)
    values = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
    values = np.where(values & 0x800000, values - 0x1000000, values)
    return values.reshape(-1, 2).astype(np.float64) / (2 ** 23), header


def measure(path):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path),
                             '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                            capture_output=True, text=True, check=True)
    summary = result.stderr.rsplit('Summary:', 1)[-1]
    integrated = re.search(r'I:\s*([-\d.]+) LUFS', summary)
    peak = re.search(r'Peak:\s*([-\d.]+) dBFS', summary)
    if not integrated or not peak:
        raise RuntimeError('FFmpeg did not return a loudness/true-peak summary')
    return {'integratedLufs': float(integrated.group(1)), 'truePeakDbtp': float(peak.group(1))}


def main():
    # Warm minor/major suspended voicings: an original rhythmic texture, no song quote.
    harmonies = [
        (0, 2, 42, [57, 61, 64, 68], [73, 76, 68]),
        (2, 4.5, 45, [57, 61, 64, 71], [76, 73, 71]),
        (4.5, 7, 38, [54, 57, 61, 64], [73, 69, 66]),
        (7, 9.5, 40, [56, 59, 61, 66], [71, 66, 73]),
        (9.5, 12, 42, [57, 61, 64, 68], [76, 73, 68]),
        (12, 15, 45, [57, 61, 64, 68], [73, 76, 69]),
    ]
    for start, end, root, notes, melody in harmonies:
        add(MUSIC, chord(notes, min(2.3, end - start + .2)), start, .058, -.26, 'chord')
        # Deliberate gaps around product clicks; no continuous eighth-note bass.
        for index, offset in enumerate([.0, .75, 1.5, 2.125]):
            at = start + offset
            if at >= end - .12 or at > 13.8:
                continue
            pitch = root + (7 if index == 2 else 0)
            add(MUSIC, bass(pitch), at, .115 if index == 0 else .082, -.08, 'bass')
        for index, offset in enumerate([.25, 1.25, 1.875]):
            at = start + offset
            if at >= end - .12 or at > 13.6:
                continue
            x = pluck(melody[index])
            pan = (-.42, .4, -.2)[index]
            add(MUSIC, x, at, (.045, .034, .029)[index], pan, 'synth-pluck')
            add(MUSIC, x, at + .117, .004, -pan)

    # Broken, compact 120-BPM groove: backbeat snaps and selected offbeat hats.
    # No four-on-the-floor drop, long sub tails or busy continuous percussion.
    for bar in range(7):
        base = bar * 2
        kick_offsets = [0, 1.25] if bar % 2 == 0 else [0, 1, 1.75]
        for offset in kick_offsets:
            at = base + offset
            if at < 13.9 and abs(at - 7) > .06:
                add(MUSIC, kick(), at, .185 if offset == 0 else .14, 0, 'kick')
        for offset in [.5, 1.5]:
            if base + offset < 13.8:
                add(MUSIC, snap(), base + offset, .033 if bar == 0 else .039, .05, 'snap')
        for j, offset in enumerate([.25, .75, 1.25, 1.75]):
            at = base + offset
            if at < 13.8 and min(abs(at - 4.7), abs(at - 7)) > .13:
                add(MUSIC, hat(), at, .010 if j % 2 else .013, -.3 if j % 2 else .3, 'hat')

    # The last second resolves harmonically and opens space before the fade.
    add(MUSIC, chord([57, 61, 64, 68], 1.3), 13.85, .048, .15, 'closing-chord')
    add(MUSIC, bass(45, .75), 13.85, .075, -.05, 'closing-bass')

    for i, frame in enumerate(ACCENTS):
        at = frame / FPS
        kind = 'mechanical-shutter' if frame in [282, 420] else 'tape-click'
        x = shutter() if kind == 'mechanical-shutter' else tape_click()
        add(FX, x, at, .073 if kind == 'mechanical-shutter' else .038,
            -.13 if i % 2 else .13, kind)
        EVENTS.append({'eventId': f'accent-{frame}', 'targetFrame': frame,
                       'targetSeconds': at, 'source': kind, 'sourceStartSeconds': at,
                       'anchor': 'synthesized transient onset', 'sourceAnchorOffsetSeconds': 0,
                       'evidence': 'Scheduled sample onset; perceptual alignment not reviewed'})

    for frame in [120, 450, 720]:
        at = frame / FPS
        add(FX, whoosh(), at - .28, .022, -.28, 'lead-whoosh')
        add(FX, whoosh(), at - .28, .012, .34)
        EVENTS.append({'eventId': f'lead-whoosh-{frame}', 'targetFrame': frame,
                       'targetSeconds': at, 'source': 'airy-whoosh',
                       'sourceStartSeconds': at - .28, 'anchor': 'authored envelope crest',
                       'sourceAnchorOffsetSeconds': .28,
                       'evidence': 'Envelope crest computed at target; noisy waveform/perception not peak-verified'})

    # A short, smooth dip keeps the two photo shutters distinct from the groove.
    for frame in [282, 420]:
        target = frame / FPS
        first, last = round((target - .035) * SR), round((target + .12) * SR)
        position = np.linspace(-1, 1, last - first)
        duck = 1 - .34 * np.cos(position * math.pi / 2) ** 2
        MUSIC[first:last] *= duck[:, None]

    mix = MUSIC + FX
    # Zero-phase infrasonic cleanup; this is sample synthesis/processing, not a
    # claim of a physical room, analog console or provider-generated instrument.
    freqs = np.fft.rfftfreq(N, 1 / SR)
    highpass = np.zeros_like(freqs)
    highpass[1:] = 1 / np.sqrt(1 + (25 / freqs[1:]) ** 8)
    mix = np.fft.irfft(np.fft.rfft(mix, axis=0) * highpass[:, None], n=N, axis=0)
    master = np.ones(N)
    attack, tail = round(.015 * SR), round(.5 * SR)
    master[:attack] = np.sin(np.linspace(0, math.pi / 2, attack)) ** 2
    master[-tail:] = np.cos(np.linspace(0, math.pi / 2, tail)) ** 2
    mix *= master[:, None]
    mix[0] = 0
    mix[-1] = 0

    # First place the score at a conservative RMS. Gentle symmetric saturation
    # rounds coincident drum/effect crests; final measured gain retains headroom.
    gain = min(10 ** (-18 / 20) / float(np.sqrt(np.mean(mix ** 2))),
               10 ** (-2 / 20) / float(np.abs(mix).max()))
    mix *= gain
    mix = np.tanh(1.2 * mix) / 1.2
    path = ROOT / 'public' / 'studio-score.wav'
    path.parent.mkdir(parents=True, exist_ok=True)
    write_pcm24(path, mix)
    initial_measurement = measure(path)
    additional_db = min(-16 - initial_measurement['integratedLufs'],
                        -1.8 - initial_measurement['truePeakDbtp'])
    mix *= 10 ** (additional_db / 20)
    write_pcm24(path, mix)
    loudness = measure(path)
    decoded, header = read_pcm24(path)
    peak_db = db(np.abs(decoded).max())
    rms_db = db(np.sqrt(np.mean(decoded ** 2)))
    assert decoded.shape == (N, 2) and np.isfinite(decoded).all()
    assert header == {'sampleRate': SR, 'channels': 2, 'sampleWidthBytes': 3, 'samplesPerChannel': N}
    assert peak_db <= -1.5 and loudness['truePeakDbtp'] <= -1.5
    assert np.all(decoded[0] == 0) and np.all(decoded[-1] == 0)
    spectrum = np.abs(np.fft.rfft(decoded, axis=0)) ** 2
    sub30_fraction = float(spectrum[freqs < 30].sum() / spectrum.sum())
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
                            'stream=codec_name,sample_rate,channels,bits_per_sample,duration:format=duration',
                            '-of', 'json', str(path)], capture_output=True, text=True, check=True)
    report = {
        'file': 'public/studio-score.wav', 'origin': 'Original deterministic procedural composition and synthesis',
        'seed': SEED, 'durationSeconds': SECONDS, 'sampleRate': SR, 'channels': 2,
        'encoding': 'PCM signed 24-bit little endian WAV', 'samplesPerChannel': N,
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bpm': BPM,
        'style': 'Premium punchy editorial groove: warm plucked synth/bass, compact broken kicks, soft snaps, sparse hats and mechanical photo/tape accents',
        'voice': False, 'apiCalls': False, 'downloadedAssets': False,
        'visualFps': FPS, 'sceneBoundaryFrames': CUTS,
        'events': sorted(EVENTS, key=lambda e: (e['targetFrame'], e['eventId'])), 'soundCounts': COUNTS,
        'decodedSamplePeakDbfs': peak_db, 'decodedRmsDbfs': rms_db,
        'measuredIntegratedLufs': loudness['integratedLufs'], 'measuredTruePeakDbtp': loudness['truePeakDbtp'],
        'channelPeakDbfs': [db(np.abs(decoded[:, i]).max()) for i in range(2)],
        'dcOffset': [float(decoded[:, i].mean()) for i in range(2)],
        'fractionOfSpectralEnergyBelow30Hz': sub30_fraction,
        'masterGainDb': db(gain) + additional_db, 'initialMeasurement': initial_measurement,
        'masterProcessing': ['25 Hz infrasonic cleanup', 'Gentle tanh transient rounding before final measured gain',
                             'Short entrance and 0.5-second ending fade; no hard clipping or brickwall limiter'],
        'endingFadeSeconds': .5, 'firstAndLastSamplesAreZero': True,
        'ffprobe': json.loads(probe.stdout),
        'verification': ['Original script executed', 'Decoded PCM24 duration/channels/sample count checked',
                         'FFmpeg ebur128 integrated loudness and oversampled true peak measured',
                         'Sample peak and measured true peak below -1.5 dB',
                         'First/last samples zero; finite samples; original synthesis only'],
        'limitations': ['No human listening or visual playback review completed',
                        'Event schedules verify source/envelope arithmetic, not perceptual sync'],
    }
    (ROOT / 'audio-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ['file', 'durationSeconds', 'sampleRate', 'channels',
                                                  'measuredIntegratedLufs', 'measuredTruePeakDbtp',
                                                  'decodedSamplePeakDbfs', 'decodedRmsDbfs']}))


if __name__ == '__main__':
    main()
