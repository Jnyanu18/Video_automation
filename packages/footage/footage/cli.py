"""Command Line Interface for footage package."""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, Optional
import cv2
import numpy as np

from footage.index import index_footage, read_index
from footage.schema import FootageIndex
from footage import cli_plan

# Setup stderr logger for CLI
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("footage.cli")


def parse_camera_map(raw_map: Optional[str]) -> Dict[str, str]:
    """Parse key=val,key2=val2 string into dictionary."""
    if not raw_map:
        return {}
    res = {}
    for pair in raw_map.split(","):
        pair = pair.strip()
        if "=" in pair:
            k, v = pair.split("=", 1)
            res[k.strip()] = v.strip()
    return res


def cmd_index(args: argparse.Namespace) -> int:
    """Execute index command."""
    src = Path(args.source_dir).resolve()
    if not src.exists():
        print(f"Error: source directory not found: {src}", file=sys.stderr)
        return 1

    work = Path(args.work).resolve() if args.work else (src.parent / "work").resolve()
    out = Path(args.out).resolve() if args.out else (work / "index.json").resolve()
    cam_map = parse_camera_map(args.camera_map)

    def on_prog(msg: str, frac: float):
        if not args.json:
            print(f"[{int(frac * 100):3d}%] {msg}", file=sys.stderr, flush=True)

    try:
        idx = index_footage(
            source_dir=src,
            work_dir=work,
            out_path=out,
            camera_map=cam_map,
            on_progress=on_prog,
        )
    except Exception as e:
        logger.exception("Indexing failed: %s", e)
        return 1

    if args.json:
        # Output strictly valid JSON to stdout
        sys.stdout.write(idx.model_dump_json(indent=2))
        sys.stdout.flush()
    else:
        stats = idx.stats
        print("\n=== FootageIndex v2 Complete ===", file=sys.stderr)
        print(f"Index written to: {out}", file=sys.stderr)
        print(f"Total source duration: {stats.total_source_seconds:.1f}s across {stats.media_count} files", file=sys.stderr)
        print(f"Shots: {stats.shots} | Moments: {stats.moments}", file=sys.stderr)
        print(f"Kept: {stats.kept_seconds:.1f}s ({stats.keep_ratio * 100:.1f}%)", file=sys.stderr)
        print(f"Wall time: {stats.index_wall_seconds:.1f}s (Realtime factor: {stats.realtime_factor:.1f}x)", file=sys.stderr)
        print(f"Model calls: {stats.model_calls}", file=sys.stderr)

    return 0


def cmd_stats(args: argparse.Namespace) -> int:
    """Execute stats command."""
    idx_path = Path(args.index_file).resolve()
    if not idx_path.is_file():
        print(f"Error: index file not found: {idx_path}", file=sys.stderr)
        return 1

    idx = read_index(idx_path)
    if args.json:
        sys.stdout.write(idx.stats.model_dump_json(indent=2))
        sys.stdout.flush()
    else:
        stats = idx.stats
        print(f"=== FootageIndex Stats for {idx.project_id} ===")
        print(f"Source duration: {stats.total_source_seconds:.2f} s")
        print(f"Media files:     {stats.media_count}")
        print(f"Total shots:     {stats.shots}")
        print(f"Moments:         {stats.moments}")
        print(f"Kept duration:   {stats.kept_seconds:.2f} s")
        print(f"Keep ratio:      {stats.keep_ratio:.4f} ({stats.keep_ratio * 100:.1f}%)")
        print(f"Proxy transcode: {stats.proxy_seconds:.2f} s")
        print(f"Index wall time: {stats.index_wall_seconds:.2f} s")
        print(f"Realtime factor: {stats.realtime_factor:.2f}x")
        print(f"Model calls:     {stats.model_calls}")
    return 0


def cmd_sheet(args: argparse.Namespace) -> int:
    """Generate contact sheet JPEGs of moments."""
    idx_path = Path(args.index_file).resolve()
    if not idx_path.is_file():
        print(f"Error: index file not found: {idx_path}", file=sys.stderr)
        return 1

    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    idx = read_index(idx_path)
    shots_by_id = {s.shot_id: s for s in idx.shots}
    media_by_id = {m.media_id: m for m in idx.media}

    moments_to_render = idx.moments
    if args.kept_only:
        # Filter moments that contain kept shots
        moments_to_render = [
            m for m in moments_to_render
            if any(shots_by_id.get(a.shot_id) and shots_by_id[a.shot_id].reject_reason is None for a in m.angles)
        ]

    if not moments_to_render:
        print("No moments to generate sheets for.", file=sys.stderr)
        return 0

    sheet_tiles = []
    tile_w, tile_h = 320, 180

    for m in moments_to_render:
        if not m.angles:
            continue
        best_angle = m.angles[0]
        shot = shots_by_id.get(best_angle.shot_id)
        if not shot:
            continue
        media = media_by_id.get(shot.media_id)
        if not media or not media.proxy_path:
            continue

        cap = cv2.VideoCapture(str(media.proxy_path))
        if not cap.isOpened():
            continue

        # Sample frame at mid-point of shot
        mid_sec = (shot.start + shot.end) / 2.0
        cap.set(cv2.CAP_PROP_POS_MSEC, mid_sec * 1000.0)
        ret, frame = cap.read()
        cap.release()

        if not ret or frame is None:
            tile = np.zeros((tile_h, tile_w, 3), dtype=np.uint8)
        else:
            tile = cv2.resize(frame, (tile_w, tile_h))

        # Annotate tile with moment info
        status_text = "KEPT" if shot.reject_reason is None else f"REJ: {shot.reject_reason.value}"
        color = (0, 220, 0) if shot.reject_reason is None else (0, 0, 220)

        cv2.rectangle(tile, (0, tile_h - 40), (tile_w, tile_h), (0, 0, 0), -1)
        label = f"{m.moment_id} | {best_angle.camera_id} | {status_text}"
        cv2.putText(tile, label, (8, tile_h - 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        sub_label = f"q={best_angle.quality:.2f} t={shot.start:.1f}s-{shot.end:.1f}s"
        cv2.putText(tile, sub_label, (8, tile_h - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.40, color, 1)

        sheet_tiles.append(tile)

    # Tile into grid of 3 columns
    cols = 3
    rows = int(np.ceil(len(sheet_tiles) / cols))
    grid = np.zeros((rows * tile_h, cols * tile_w, 3), dtype=np.uint8)

    for idx_tile, tile in enumerate(sheet_tiles):
        r = idx_tile // cols
        c = idx_tile % cols
        grid[r * tile_h:(r + 1) * tile_h, c * tile_w:(c + 1) * tile_w] = tile

    sheet_path = out_dir / "contact_sheet.jpg"
    cv2.imwrite(str(sheet_path), grid, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
    print(f"Generated contact sheet: {sheet_path} ({len(sheet_tiles)} moments)", file=sys.stderr)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="footage", description="AILO Footage Indexer")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # index
    p_idx = subparsers.add_parser("index", help="Index a footage directory")
    p_idx.add_argument("source_dir", help="Path to raw footage directory")
    p_idx.add_argument("--out", "-o", help="Path to write index JSON")
    p_idx.add_argument("--work", "-w", help="Path to working directory (proxies/cache)")
    p_idx.add_argument("--camera-map", help="Mapping of camera overrides e.g. A=CAM_A,B=CAM_B")
    p_idx.add_argument("--json", action="store_true", help="Output only valid JSON to stdout")

    # stats
    p_stat = subparsers.add_parser("stats", help="Show stats of an index JSON")
    p_stat.add_argument("index_file", help="Path to index JSON")
    p_stat.add_argument("--json", action="store_true", help="Output stats as JSON")

    # sheet
    p_sheet = subparsers.add_parser("sheet", help="Generate contact sheet JPEGs")
    p_sheet.add_argument("index_file", help="Path to index JSON")
    p_sheet.add_argument("--out", "-o", required=True, help="Output directory for sheets")
    p_sheet.add_argument("--kept-only", action="store_true", help="Only include kept moments")

    cli_plan.register(subparsers)

    args = parser.parse_args()

    if hasattr(args, "func"):
        return args.func(args)

    if args.command == "index":
        return cmd_index(args)
    elif args.command == "stats":
        return cmd_stats(args)
    elif args.command == "sheet":
        return cmd_sheet(args)

    return 0


if __name__ == "__main__":
    sys.exit(main())
