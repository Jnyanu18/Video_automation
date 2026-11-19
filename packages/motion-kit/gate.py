"""Audio delivery gate. Measures a media file and exits non-zero if it misses the spec.

    python gate.py out/film.mp4
    python gate.py public/soundtrack.wav --lufs -14 --tol 1.0 --tp -1.5

Spec comes from references/critic-rubric.md: -14 LUFS +/- 1 integrated, true peak <= -1.5 dBTP on the DELIVERED file. (scorelib finalize() mixes to TP -2.0 to leave encode headroom.)
"""
import argparse
import json
import re
import subprocess
import sys


def measure(path):
    p = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', str(path),
                        '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit(f'FAIL  ffmpeg could not read {path}\n{p.stderr[-800:]}')
    blocks = re.findall(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr, re.S)
    if not blocks:
        sys.exit(f'FAIL  loudnorm produced no JSON for {path}')
    return json.loads(blocks[-1])


ap = argparse.ArgumentParser()
ap.add_argument('media')
ap.add_argument('--lufs', type=float, default=-14.0)
ap.add_argument('--tol', type=float, default=1.0)
ap.add_argument('--tp', type=float, default=-1.5)
a = ap.parse_args()

d = measure(a.media)
raw_i, raw_tp = str(d['input_i']), str(d['input_tp'])
if 'inf' in raw_i.lower() or 'inf' in raw_tp.lower():
    sys.exit(f'FAIL  {a.media} is silent or unmeasurable (I={raw_i}, TP={raw_tp})')
i, tp = float(raw_i), float(raw_tp)

fails = []
if abs(i - a.lufs) > a.tol:
    fails.append(f'integrated {i:+.2f} LUFS is outside {a.lufs:+.1f} +/- {a.tol}')
if tp > a.tp:
    fails.append(f'true peak {tp:+.2f} dBTP exceeds {a.tp:+.1f}')

print(f'{a.media}:  {i:+.2f} LUFS   true peak {tp:+.2f} dBTP   '
      f'(target {a.lufs:+.1f} +/- {a.tol}, TP <= {a.tp:+.1f})')
for f in fails:
    print('FAIL  ' + f)
print('PASS' if not fails else 'GATE FAILED')
sys.exit(1 if fails else 0)
