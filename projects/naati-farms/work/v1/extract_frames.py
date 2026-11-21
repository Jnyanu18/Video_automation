"""Extract the exact source frames each shot uses into public/frames/<clip>-<variant>/<sourceFrame>.jpg.
Remotion's offthread video extractor failed under parallel load on this machine ("No frame found at position"),
so the film shows image sequences instead (kit footage.tsx `seq`). Frame files are named by absolute source frame
index at 30 fps, so film code maps time -> floor(t*30) with no offset bookkeeping.
Ranges are (clip, variant, first_s, last_s); keep them in step with src/film.tsx."""
import json
import math
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
CLIPS = HERE / 'clips'                      # graded SDR proxies (moved out of public/)
OUT = HERE.parent / 'public' / 'frames'
FPS = 30
LAND = {'1562', '1564', '1570', '1573', '1593'}

U = [
    ('1508', 'full', 1.0, 3.9), ('1376', 'full', 0.0, 2.9), ('1152', 'full', 2.5, 5.4), ('1441', 'full', 2.0, 4.1),
    ('1381', 'full', 8.4, 11.1), ('1151', 'full', 5.4, 6.1), ('1561', 'full', 7.0, 7.7), ('1337', 'full', 15.4, 16.1),
    ('1363', 'full', 3.0, 3.95), ('1564', 'full', 8.6, 10.45), ('1562', 'full', 17.2, 18.3),
    ('1593', 'med', 1.2, 3.3), ('1336', 'full', 1.0, 2.9), ('1570', 'med', 3.0, 4.7), ('1564', 'med', 12.5, 18.6),
]
GRID_IN = {'1151': 1.0, '1381': 14.0, '1152': 4.5, '1561': 3.5, '1564': 14.0, '1337': 6.0, '1593': 1.5, '1562': 6.0,
           '1336': 2.5, '1573': 1.5, '1570': 6.5, '1363': 9.0}
STRIP_IN = {'1151': 3.0, '1564': 2.0, '1561': 5.0, '1336': 0.5, '1381': 11.0, '1570': 4.0, '1363': 5.0, '1337': 12.0}
U += [(c, 'small', a, a + 4.1) for c, a in GRID_IN.items()]
U += [(c, 'small', a, a + 6.1) for c, a in STRIP_IN.items()]


def dur(cid):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
                                          str(CLIPS / f'c{cid}.mp4')]).strip())


# union per (clip, variant) -> one continuous range, clamped to the clip
ranges = {}
for c, v, a, b in U:
    lo, hi = ranges.get((c, v), (a, b))
    ranges[(c, v)] = (min(lo, a), max(hi, b))

SCALE = {'full': None, 'med': 'scale=iw/2:-2', 'small': None}


def job(key):
    c, v = key
    a, b = ranges[key]
    last_possible = math.floor(dur(c) * FPS) - 1
    k0, k1 = max(0, math.floor(a * FPS)), min(last_possible, math.ceil(b * FPS))
    d = OUT / f'{c}-{v}'
    d.mkdir(parents=True, exist_ok=True)
    src = CLIPS / (f's{c}.mp4' if v == 'small' else f'c{c}.mp4')
    vf = SCALE[v]
    cmd = ['ffmpeg', '-v', 'error', '-y', '-ss', f'{(k0 - .4) / FPS:.5f}' if k0 > 0 else '0', '-i', str(src),
           '-frames:v', str(k1 - k0 + 1), '-start_number', str(k0), '-q:v', '3' if v != 'small' else '4']
    if vf:
        cmd += ['-vf', vf]
    subprocess.run(cmd + [str(d / '%d.jpg')], check=True)
    got = sorted(int(p.stem) for p in d.glob('*.jpg'))
    return f'{c}-{v}', {'first': got[0], 'last': got[-1], 'n': len(got)}


with ThreadPoolExecutor(6) as ex:
    index = dict(ex.map(job, sorted(ranges)))
(OUT / 'index.json').write_text(json.dumps(index, indent=1, sort_keys=True), encoding='utf8')
total = sum(x['n'] for x in index.values())
print(f'{len(index)} sequences, {total} frames')
for k, x in sorted(index.items()):
    print(f'  {k:12s} {x["first"]:>4d}-{x["last"]:<4d} ({x["n"]})')
