# Overlay Madhav's matted face segments (ProRes 4444 + alpha) onto the board-only render with ffmpeg.
# Geometry matches Board.tsx (1920x1080 design space) scaled to the output size; fades: in 0.2 s, out 0.17 s.
# usage: composite_faces.py <board.mp4> <out.mp4> [t_offset_s] [duration_s]   (offset/duration = test a section)
import json, os, subprocess, sys
MATTE = os.environ.get('MATTE_DIR', 'matte')
board, out = sys.argv[1], sys.argv[2]
off = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
dur = float(sys.argv[4]) if len(sys.argv) > 4 else None
T = json.load(open('film-board/src/timeline.json', encoding='utf8'))
OW, OH = map(int, subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', board], capture_output=True, text=True).stdout.strip().strip(',').split(',')[:2])
k = OW / 1920
segs = [s for s in T['segments'] if s['who'] == 'F']
if dur is not None: segs = [s for s in segs if s['t1'] > off and s['t0'] < off + dur]
inputs, filt, last = ['-i', board], [], '0:v'
for i, s in enumerate(segs, 1):
    big = bool(s.get('full'))
    H = 1080 if big else 700; Wd = H * 1500 / 1134
    left = -230 if big else 1920 - Wd + 150; top = 1080 - H
    w, h, x, y = round(Wd * k / 2) * 2, round(H * k / 2) * 2, round(left * k), round(top * k)
    t0, t1 = s['t0'] - off, s['t1'] - off
    inputs += ['-itsoffset', f'{t0:.3f}', '-i', f'{MATTE}/{s["id"]}.mov']
    filt.append(f'[{i}:v]scale={w}:{h}:flags=lanczos,format=yuva444p,fade=t=in:st={t0:.3f}:d=0.2:alpha=1,fade=t=out:st={t1 - 0.17:.3f}:d=0.17:alpha=1[f{i}]')
    filt.append(f"[{last}][f{i}]overlay=x={x}:y={y}:enable='between(t,{t0:.3f},{t1:.3f})':eof_action=pass:format=auto[v{i}]")
    last = f'v{i}'
filt.append(f'[{last}]format=yuv420p[vout]')
cmd = ['ffmpeg', '-v', 'error', '-y'] + inputs + ['-filter_complex', ';'.join(filt), '-map', '[vout]', '-map', '0:a?'] + (['-t', str(dur)] if dur else []) + \
      ['-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', '-c:a', 'copy', out]
subprocess.run(cmd, check=True); print('composited', len(segs), 'face segments ->', out)
