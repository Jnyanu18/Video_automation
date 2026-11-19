# RVM (resnet50, GPU) cut-out of each face segment of take 0162, time-mapped to the film's 30 fps clock.
# Landscape 2688x1512 source; crop x 344..2344 (2000 px, him + gesture room), alpha feathered at the crop's
# left/right/top edges so arms/hands leaving the frame fade instead of showing a hard line.
# Output: $MATTE_DIR/<id>.mov (ProRes 4444 + alpha, 1500x1134 = 0.75 scale)
import json, os, subprocess, sys
import numpy as np, torch, torch.nn.functional as Fn
SRC = os.environ.get('TAKE_MP4', 'src/take.MP4'); OUT = os.environ.get('MATTE_DIR', 'matte'); os.makedirs(OUT, exist_ok=True)
W, H, SFPS, FPS = 2688, 1512, 30000 / 1001, 30
X0, CW = 344, 2000; OW, OH = 1500, 1134; DSR = 0.25; FEATHER = 70
T = json.load(open('../film-board/src/timeline.json', encoding='utf8'))
segs = [s for s in T['segments'] if s['who'] == 'F' and (len(sys.argv) < 2 or s['id'] in sys.argv[1:])]
dev = 'cuda'; model = torch.hub.load('PeterL1n/RobustVideoMatting', 'resnet50', trust_repo=True).to(dev).eval()
edge = np.ones((H, CW), np.float32)
r = np.linspace(0, 1, FEATHER)
edge[:, :FEATHER] *= r[None, :]; edge[:, -FEATHER:] *= r[::-1][None, :]; edge[:FEATHER, :] *= r[:, None]
edge_t = torch.from_numpy(edge).to(dev)
@torch.no_grad()
def run(s):
    a, b = s['src_in'], s['src_out']; dur = s['t1'] - s['t0']
    nout = int(round(dur * FPS)) + 1
    need = [min(int(round((a + k / FPS) * SFPS)), int(b * SFPS)) for k in range(nout)]
    i0, i1 = need[0], need[-1]; w0 = max(0, i0 - 30)  # 1 s warm-up for the recurrent state
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{max(0, (w0 - 0.5) / SFPS):.6f}', '-i', SRC, '-frames:v', str(i1 - w0 + 1),
           '-vf', f'crop={CW}:{H}:{X0}:0,scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24', '-f', 'rawvideo', '-']
    src = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=CW * H * 3 * 2)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{OW}x{OH}', '-r', str(FPS), '-i', '-',
                            '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuva444p10le', '-c:v', 'prores_ks', '-profile:v', '4444', '-qscale:v', '5',
                            os.path.join(OUT, s['id'] + '.mov')], stdin=subprocess.PIPE)
    rec = [None] * 4; cache = {}; idx = w0; k = 0
    while k < nout:
        buf = src.stdout.read(CW * H * 3)
        if len(buf) < CW * H * 3: break
        img = torch.from_numpy(np.frombuffer(buf, np.uint8).reshape(H, CW, 3).copy()).to(dev).permute(2, 0, 1).float().div(255).unsqueeze(0)
        fgr, pha, *rec = model(img, *rec, downsample_ratio=DSR)
        if idx >= i0:
            al = pha[0, 0] * edge_t
            al = torch.where(al < 0.02, torch.zeros_like(al), torch.where(al > 0.985, torch.ones_like(al), al))
            col = torch.where((al > 0.985)[None], img[0], fgr[0])  # true pixels inside, decontaminated colour in the edge band
            rgba = torch.cat([col, al[None]], 0).unsqueeze(0)
            rgba = Fn.interpolate(rgba, size=(OH, OW), mode='bilinear', align_corners=False)[0]
            frame = (rgba.clamp(0, 1) * 255).byte().permute(1, 2, 0).cpu().numpy()
            while k < nout and need[k] == idx:
                enc.stdin.write(frame.tobytes()); k += 1
        idx += 1
    while k < nout: enc.stdin.write(frame.tobytes()); k += 1  # pad with the last frame if the source ran short
    src.stdout.close(); src.wait(); enc.stdin.close(); enc.wait()
    print(s['id'], 'frames', nout, flush=True)
for s in segs: run(s)
