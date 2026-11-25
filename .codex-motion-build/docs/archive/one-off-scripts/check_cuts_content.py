import cv2
import numpy as np

for i in range(10):
    cap = cv2.VideoCapture(f'raw footage/cuts/clip_{i:02d}.mp4')
    frames = []
    for _ in range(5):
        ret, frame = cap.read()
        if ret:
            frames.append(frame)
    cap.release()
    if frames:
        m = np.mean(frames[0], axis=(0,1))
        print(f"clip_{i:02d}: mean BGR={m.astype(int)}")
