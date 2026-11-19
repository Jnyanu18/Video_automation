# Instagram face composite: Madhav's matted segments, MIRRORED, bottom-left, ~50% of the 9:16 screen (head top ~40%
# of the height), sped up to match the 1.1x voice (setpts), fades in 0.2 s / out 0.17 s.
# usage: composite_faces_ig.py <board.mp4> <out.mp4> [t_offset_s duration_s]
import json, os, subprocess, sys
MATTE = os.environ.get('MATTE_DIR', 'matte')
board, out = sys.argv[1], sys.argv[2]
off = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
dur = float(sys.argv[4]) if len(sys.argv) > 4 else None
T = json.load(open('film-board/src/timeline_ig.json', encoding='utf8')); SPEED = T.get('speed', 1.0)
OW = int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', board], capture_output=True, text=True).stdout.strip().strip(','))
k = OW / 1080
def geom(full):
    # measured: head top at ~16% of the matte frame, head centre at ~52% after the flip
    H = 1371; W = H * 1500 / 1134
    left = -651; top = 1920 - H
    return round(W * k / 2) * 2, round(H * k / 2) * 2, round(left * k), round(top * k)
segs = [s for s in T['segments'] if s['who'] == 'F']
if dur is not None: segs = [s for s in segs if s['t1'] > off and s['t0'] < off + dur]
inputs, filt, last = ['-i', board], [], '0:v'
for i, s in enumerate(segs, 1):
    w, h, x, y = geom(bool(s.get('full')))
    t0, t1 = s['t0'] - off, s['t1'] - off
    inputs += ['-i', f'{MATTE}/{s["id"]}.mov']; vi = len([q for q in inputs if q == '-i']) - 1
    opener = i == 1 and off == 0 and t0 < 0.6  # the cover: he is on screen from frame 0, first frame held until his line starts
    pre = f"trim=start={s.get('matte_skip', 0):.3f},setpts=(PTS-STARTPTS)/{SPEED}+{max(t0, 0):.3f}/TB"
    fin = '' if opener else f'fade=t=in:st={t0:.3f}:d=0.2:alpha=1,'
    filt.append(f'[{vi}:v]{pre},fps=30,hflip,scale={w}:{h}:flags=lanczos,format=yuva444p,{fin}fade=t=out:st={t1 - 0.17:.3f}:d=0.17:alpha=1[f{i}]')
    if opener:  # cover: a clear-face frame of the hook, held from frame 0 until his line starts
        inputs += ['-loop', '1', '-t', f'{t0 + 0.1:.3f}', '-i', f'{MATTE}/f01_cover.png']
        ci = len([a for a in inputs if a == '-i']) - 1
        filt.append(f'[{ci}:v]hflip,scale={w}:{h}:flags=lanczos,format=yuva444p[cov]')
        filt.append(f"[{last}][cov]overlay=x={x}:y={y}:enable='lt(t,{t0:.3f})':format=auto[c{i}]")
        last = f'c{i}'
    filt.append(f"[{last}][f{i}]overlay=x={x}:y={y}:enable='between(t,{t0:.3f},{t1:.3f})':eof_action=pass:format=auto[v{i}]")
    last = f'v{i}'
filt.append(f'[{last}]format=yuv420p[vout]')
cmd = ['ffmpeg', '-v', 'error', '-y'] + inputs + ['-filter_complex', ';'.join(filt), '-map', '[vout]', '-map', '0:a?'] + (['-t', str(dur)] if dur else []) + \
      ['-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', '-c:a', 'copy', out]
subprocess.run(cmd, check=True); print('composited', len(segs), 'face segments ->', out)
