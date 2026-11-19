import cv2

cap = cv2.VideoCapture('raw footage/event_source.mp4')
fps = cap.get(cv2.CAP_PROP_FPS)

# Let's save a frame at 0.5s, 1.8s, 3.5s, 7.0s, 13.0s, 28.0s, 33.0s, 38.0s, 44.0s, 52.0s, 65.0s, 81.5s, 83.5s
timestamps = [0.5, 1.8, 3.5, 7.0, 13.0, 28.0, 33.0, 38.0, 44.0, 50.8, 52.0, 65.0, 73.8, 81.5, 83.5]

for t in timestamps:
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(f'raw footage/scene_analysis/inspect_{t:.1f}s.jpg', frame)
        print(f"Captured frame at {t:.1f}s, mean BGR: {frame.mean(axis=(0,1)).astype(int)}")

cap.release()
