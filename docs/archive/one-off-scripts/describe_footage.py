import os
import cv2
import numpy as np

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def analyze_img(path):
    img = cv2.imread(path)
    if img is None:
        return "None"
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    edges = cv2.Canny(gray, 100, 200)
    edge_density = float(np.sum(edges > 0)) / (h * w)
    
    # Check if there is high text/contrast or motion
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    return f"Faces={len(faces)}, Sharpness={laplacian_var:.1f}, EdgeDensity={edge_density:.3f}"

print("--- ANALYZING CUTS CLIPS ---")
for i in range(10):
    thumb = f'raw footage/cuts/clip_{i:02d}_thumb.jpg'
    res = analyze_img(thumb)
    print(f"clip_{i:02d}: {res}")

print("\n--- ANALYZING SAMPLE SCENES FROM EVENT SOURCE ---")
for i in [0, 1, 2, 4, 6, 11, 14, 18, 22, 26, 31, 38, 45, 48, 51, 62, 63]:
    files = [f for f in sorted(os.listdir('raw footage/scene_analysis')) if f.startswith(f'scene_{i:02d}_')]
    if files:
        res = analyze_img(os.path.join('raw footage/scene_analysis', files[0]))
        print(f"scene_{i:02d} ({files[0]}): {res}")
