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

# v2 shots (clip, variant, first_s, last_s). Keep in step with src/film.tsx.
U = [
    ('1561', 'full', 6.0, 9.7), ('1562', 'full', 2.0, 4.3), ('1381', 'full', 7.9, 10.5),
    ('1151', 'full', 5.4, 6.0), ('1336', 'full', 1.0, 1.6), ('1337', 'full', 15.4, 16.0),
    ('1564', 'full', 8.6, 9.7), ('1593', 'full', 1.2, 2.4), ('1152', 'full', 2.5, 5.0),
    ('1564', 'full', 18.0, 20.2), ('1564', 'med', 14.0, 23.9),
]
GRID_IN = {'1151': 1.0, '1381': 14.0, '1152': 4.5, '1561': 3.5, '1564': 14.0, '1337': 6.0, '1593': 1.5, '1562': 6.0,
           '1336': 2.5, '1573': 1.5, '1570': 6.5, '1363': 9.0}
U += [(c, 'small', a, a + 4.3) for c, a in GRID_IN.items()]
# Neutral grade over the warm proxies (prep.sh pushed saturation 1.2 and a warm balance): calmer colour for the
# black-and-white identity, and less glare from the green shade nets.
GRADE = 'eq=saturation=0.84:contrast=1.04,colorbalance=rs=-.02:bs=.025:rm=-.02:bm=.025:rh=-.01:bh=.015'


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
    vf = ','.join(x for x in (SCALE[v], GRADE) if x)
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
