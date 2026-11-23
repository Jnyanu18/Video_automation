import os
import sys
import json
import shutil
import subprocess
from pathlib import Path

WORK_DIR = Path(__file__).resolve().parent / "work"
LIBRARY_FILE = WORK_DIR / "creative_library.json"
RENDERS_DIR = WORK_DIR / "renders"

def get_video_duration(path: Path) -> float:
    try:
        cmd = [
            "ffprobe", "-v", "error", "-show_entries",
            "format=duration", "-of", "default=noprint_wrappers=1:nokey=1",
            str(path)
        ]
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True).strip()
        return round(float(out), 1)
    except Exception:
        return 15.0

def categorize_video(filename: str) -> str:
    name_lower = filename.lower()
    if "motion" in name_lower or "graphic" in name_lower or "kinetic" in name_lower:
        if "ai" in name_lower or "edit" in name_lower or "hybrid" in name_lower or "reel" in name_lower:
            return "hybrid"
        return "motion_graphics"
    elif "ai" in name_lower or "talking" in name_lower or "hook" in name_lower or "founder" in name_lower:
        return "ai_editing"
    elif "hybrid" in name_lower or "naati" in name_lower or "rockcastle" in name_lower:
        return "hybrid"
    return "motion_graphics"

def ingest_videos_from_path(source_dir_str: str):
    source_dir = Path(source_dir_str)
    if not source_dir.exists():
        print(f"Error: Path {source_dir} does not exist.")
        return

    RENDERS_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)

    video_files = list(source_dir.glob("*.mp4")) + list(source_dir.glob("*.mov"))
    if not video_files:
        video_files = [f for f in source_dir.rglob("*.mp4")] + [f for f in source_dir.rglob("*.mov")]

    print(f"Found {len(video_files)} video files in {source_dir}")

    existing_library = []
    if LIBRARY_FILE.exists():
        try:
            with open(LIBRARY_FILE, "r") as f:
                existing_library = json.load(f)
        except Exception:
            existing_library = []

    editorial_titles = [
        ("SIGNAL / NOISE", "MAKE YOURSELF HEARD.", "#3A1708", "#130802", "#FF6433"),
        ("FORM FOLLOWS FEELING.", "DESIGN WITH INTENT.", "#142821", "#06100C", "#34D399"),
        ("BEYOND THE BRIEF.", "THINK A LITTLE BIGGER.", "#3D150B", "#140602", "#F97316"),
        ("ZERO TO ONE.", "THE REAL CODE JOURNEY.", "#1C1635", "#090714", "#818CF8"),
        ("SPEED & TASTE.", "EVERY FRAME MEASURED.", "#2A1828", "#0E070D", "#E879F9"),
        ("CRAFT MATTERS.", "CODE POWERED VISUALS.", "#271E0B", "#0D0A03", "#FBBF24"),
        ("DARK MODE.", "6 MONTHS IN 30 SECONDS.", "#111827", "#030712", "#60A5FA"),
        ("SYSTEMS IN MOTION.", "PRECISION MEETS STORY.", "#1E1528", "#090510", "#A78BFA"),
        ("BUILD IN PUBLIC.", "HOOK IN FIRST 0.3 SECONDS.", "#17202A", "#070C12", "#38BDF8"),
        ("THE NEXT LEAP.", "AUTONOMOUS CREATIVE ENGINE.", "#2B1214", "#0E0405", "#F87171"),
    ]

    new_entries = []
    for idx, vfile in enumerate(video_files[:10]):
        duration_sec = get_video_duration(vfile)
        category = categorize_video(vfile.name)
        
        # Copy to renders dir for instant streaming via /render/<filename>
        target_render = RENDERS_DIR / vfile.name
        if not target_render.exists():
            shutil.copy2(vfile, target_render)

        style_tup = editorial_titles[idx % len(editorial_titles)]

        entry = {
            "id": f"film-{idx+1:02d}",
            "number": f"{idx+1:02d} / {category.upper().replace('_', ' ')}",
            "graphicTitle": style_tup[0],
            "tagline": style_tup[1],
            "title": vfile.stem.replace("_", " ").replace("-", " ").title(),
            "category": category,
            "format": f"{category.replace('_', ' ').title()} • {int(duration_sec)}s • 1080×1920",
            "status": "READY",
            "duration": f"{int(duration_sec)}s",
            "gradientStart": style_tup[2],
            "gradientEnd": style_tup[3],
            "accentColor": style_tup[4],
            "videoUrl": f"/render/{vfile.name}",
            "localPath": str(vfile.resolve()),
        }
        new_entries.append(entry)

    with open(LIBRARY_FILE, "w") as f:
        json.dump(new_entries, f, indent=2)

    print(f"Successfully ingested {len(new_entries)} videos into {LIBRARY_FILE}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        ingest_videos_from_path(sys.argv[1])
    else:
        # Default scan media folder
        default_dir = Path(__file__).resolve().parent.parent / "media"
        print(f"Scanning default directory: {default_dir}")
        ingest_videos_from_path(str(default_dir))
