import os
import glob
import cv2

clip_files = sorted(glob.glob('raw footage/cuts/*.mp4'))
print(f"Found {len(clip_files)} pre-cut clips:")
for c in clip_files:
    cap = cv2.VideoCapture(c)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    dur = frames / fps if fps > 0 else 0
    ret, frame = cap.read()
    if ret:
        thumb_name = os.path.basename(c).replace('.mp4', '_thumb.jpg')
        cv2.imwrite(f'raw footage/cuts/{thumb_name}', frame)
    print(f"  {os.path.basename(c)}: {w}x{h} @ {fps:.1f}fps | {dur:.2f}s | {frames} frames")
    cap.release()
