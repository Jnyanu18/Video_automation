"""Remove only the known storyboard seed from local tenant state.

Run while the editor API is stopped so its in-memory store cannot restore it.
"""

import json
import os
from pathlib import Path
import shutil


WORKSPACE = Path(__file__).resolve().parents[3]
TENANT_ROOT = WORKSPACE / "automation" / "runtime" / "users"


def inside(path: Path, root: Path) -> bool:
    return path.resolve().is_relative_to(root.resolve())


def main() -> None:
    for state_path in TENANT_ROOT.glob("*/studio_state.json"):
        tenant_dir = state_path.parent.resolve()
        data = json.loads(state_path.read_text(encoding="utf-8"))
        storyboard = data.get("storyboards", {}).get("sb1")
        if not storyboard:
            continue
        source = Path(storyboard.get("video_path") or "")
        workdir = Path(storyboard.get("workdir") or "")
        renders = storyboard.get("renders") or []
        if not (
            storyboard.get("prompt") == "Event Highlights Edit"
            and source.name == "sample_event.mp4"
            and source.parent.resolve() == tenant_dir
            and workdir.name == "sb1"
            and workdir.parent.resolve() == tenant_dir
            and inside(tenant_dir, WORKSPACE)
            and all(render.get("backend") == "ffmpeg-emergency" for render in renders)
        ):
            print(f"Preserved nonseed sb1 in {state_path}")
            continue
        del data["storyboards"]["sb1"]
        data["events"] = [event for event in data.get("events", []) if event.get("id") != "sb1"]
        temp_path = state_path.with_suffix(".json.tmp")
        temp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(temp_path, state_path)
        if workdir.is_dir():
            shutil.rmtree(workdir)
        if source.is_file():
            source.unlink()
        for render in renders:
            render_id = render.get("render_id")
            if not isinstance(render_id, str) or not render_id.isalnum():
                continue
            render_path = tenant_dir / "renders" / f"{render_id}.mp4"
            if render_path.is_file():
                render_path.unlink()
        print(f"Removed seeded sb1 from {tenant_dir}")


if __name__ == "__main__":
    main()
