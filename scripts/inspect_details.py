import cv2
import glob

# Inspect what is in cuts
for f in sorted(glob.glob('raw footage/cuts/*_thumb.jpg')):
    img = cv2.imread(f)
    print(f, img.shape)

# Let's inspect selected scenes from event_source
key_scenes = [0, 1, 2, 4, 6, 11, 14, 18, 22, 26, 31, 38, 48, 51, 62, 63]
print("\nInspecting key scenes:")
for s_id in key_scenes:
    files = glob.glob(f'raw footage/scene_analysis/scene_{s_id:02d}_*.jpg')
    if files:
        img = cv2.imread(files[0])
        print(f"Scene {s_id:02d}: {files[0]} shape={img.shape}")
