"""Audio delivery gate. Measures a media file and exits non-zero if it misses the spec.

    python gate.py out/film.mp4
    python gate.py public/soundtrack.wav --lufs -14 --tol 1.0 --tp -1.5
    python gate.py out/film.mp4 --json     # machine-readable: {"lufs":..,"peak":..} or {"lufs":null,"peak":null,"error":".."}; always exit 0

Spec comes from references/critic-rubric.md: -14 LUFS +/- 1 integrated, true peak <= -1.5 dBTP on the DELIVERED file. (scorelib finalize() mixes to TP -2.0 to leave encode headroom.)
"""
import argparse
import json
import re
import subprocess
import sys


class MeasureError(Exception):
    pass


def measure(path):
    p = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', str(path),
                        '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    if p.returncode != 0:
        raise MeasureError(f'ffmpeg could not read {path}: {p.stderr[-400:]}')
    blocks = re.findall(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr, re.S)
    if not blocks:
        raise MeasureError(f'loudnorm produced no JSON for {path}')
    return json.loads(blocks[-1])


ap = argparse.ArgumentParser()
ap.add_argument('media')
ap.add_argument('--lufs', type=float, default=-14.0)
ap.add_argument('--tol', type=float, default=1.0)
ap.add_argument('--tp', type=float, default=-1.5)
ap.add_argument('--json', action='store_true', help='print one JSON object {lufs, peak[, error]} and exit 0')
a = ap.parse_args()


def measured(path):
    d = measure(path)
    raw_i, raw_tp = str(d['input_i']), str(d['input_tp'])
    if 'inf' in raw_i.lower() or 'inf' in raw_tp.lower():
        raise MeasureError(f'{path} is silent or unmeasurable (I={raw_i}, TP={raw_tp})')
    return float(raw_i), float(raw_tp)


if a.json:
    try:
        i, tp = measured(a.media)
        print(json.dumps({'lufs': round(i, 2), 'peak': round(tp, 2)}))
    except Exception as e:  # any failure must still yield valid JSON
        print(json.dumps({'lufs': None, 'peak': None, 'error': str(e)}))
    sys.exit(0)

try:
    i, tp = measured(a.media)
except MeasureError as e:
    sys.exit(f'FAIL  {e}')

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
