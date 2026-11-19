# Head-yaw / face-box track for each DJI take (YuNet 5-point landmarks), every 3rd frame.
# yaw proxy = (nose_x - eye_mid_x) / eye_dist : ~0 facing the lens, negative = turned to his left
# (screen left), positive = his right. |yaw| < 0.35 counts as "towards the lens". Also logs the face
# box (source px) and detection score. Used by TAKES.md choices, takesheet.py, facestrip.py, measure.py.
# usage: py -3.11 presenter/gaze.py [take numbers...]   -> spine/takes/gaze.json (default: all TAKES)
# Needs opencv-python with cv2.FaceDetectorYN and the YuNet onnx at YUNET (pipeline_config.py).
import json, os, subprocess, sys
import cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline_config import TAKES, TAKES_DIR, YUNET, SRC_W, SRC_H, SRC_FPS, take_mp4

W, H = SRC_W // 4, SRC_H // 4
det = cv2.FaceDetectorYN.create(YUNET, "", (W, H), 0.6, 0.3, 5000)
OUTP = os.path.join(TAKES_DIR, "gaze.json")
out = json.load(open(OUTP)) if os.path.exists(OUTP) else {}
for n in (sys.argv[1:] or [str(t) for t in TAKES]):
    mp4 = take_mp4(n)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", mp4, "-vf", f"select='not(mod(n\\,3))',scale={W}:{H}", "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
    rows, i = [], 0
    while True:
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3: break
        img = np.frombuffer(b, np.uint8).reshape(H, W, 3)
        _, faces = det.detect(img)
        t = round(i * 3 / SRC_FPS, 3); i += 1
        if faces is None: rows.append([t, None]); continue
        f = max(faces, key=lambda r: r[2] * r[3])
        x, y, w, h = f[:4]; re, le, nose = f[4:6], f[6:8], f[8:10]
        ed = abs(le[0] - re[0]) + 1e-6
        yaw = (nose[0] - (le[0] + re[0]) / 2) / ed
        rows.append([t, round(float(yaw), 3), [round(float(v) * 4) for v in (x, y, w, h)], round(float(f[14]), 3), round(float(ed / w), 3)])
    out[str(n)] = rows
    ok = [r for r in rows if r[1] is not None]
    print(n, len(rows), "faces", len(ok), "median yaw", np.median([r[1] for r in ok]).round(3), flush=True)
json.dump(out, open(OUTP, "w"))
