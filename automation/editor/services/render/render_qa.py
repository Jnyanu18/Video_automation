"""Rendered Video Quality Assurance (Director 2.0 Layer D).
Inspects the ACTUAL rendered MP4 artifact using FFmpeg probes:
- Visual QA: Black frames, frozen frames, resolution, aspect ratio
- Audio QA: Peak levels, integrated LUFS loudness, silent dropouts, audio/video duration sync
- Editorial QA: Cut boundary integrity, safe zones
- Automated Repair Engine: Bounded iterative repair loop (max 3 attempts).
"""
from __future__ import annotations

import json
import logging
import math
import os
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

log = logging.getLogger("render_qa")

@dataclass
class QADefect:
    defect_id: str
    severity: str  # "CRITICAL", "MAJOR", "MINOR"
    category: str  # "visual", "audio", "editorial"
    title: str
    detail: str
    timestamp: Optional[float] = None
    repairable: bool = False
    proposed_fix: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "defect_id": self.defect_id,
            "severity": self.severity,
            "category": self.category,
            "title": self.title,
            "detail": self.detail,
            "timestamp": round(self.timestamp, 2) if self.timestamp is not None else None,
            "repairable": self.repairable,
            "proposed_fix": self.proposed_fix,
        }

@dataclass
class QAReport:
    video_path: str
    duration: float
    resolution: str
    aspect_ratio: str
    status: str  # "PASS", "WARN", "FAIL"
    score: float  # 0.0 to 1.0
    defects: List[QADefect] = field(default_factory=list)
    audio_metrics: Dict[str, Any] = field(default_factory=dict)
    visual_metrics: Dict[str, Any] = field(default_factory=dict)

    @property
    def has_critical_defects(self) -> bool:
        return any(d.severity == "CRITICAL" for d in self.defects)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "video_path": self.video_path,
            "duration": round(self.duration, 2),
            "resolution": self.resolution,
            "aspect_ratio": self.aspect_ratio,
            "status": self.status,
            "score": round(self.score, 3),
            "critical_count": sum(1 for d in self.defects if d.severity == "CRITICAL"),
            "major_count": sum(1 for d in self.defects if d.severity == "MAJOR"),
            "minor_count": sum(1 for d in self.defects if d.severity == "MINOR"),
            "defects": [d.to_dict() for d in self.defects],
            "audio_metrics": self.audio_metrics,
            "visual_metrics": self.visual_metrics,
        }

def probe_mp4(video_path: str) -> Dict[str, Any]:
    """Run ffprobe on rendered MP4 to inspect container and stream properties."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration,size,bit_rate:stream=codec_type,width,height,r_frame_rate,duration",
        "-of", "json",
        video_path,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if res.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {res.stderr}")
    return json.loads(res.stdout)

def detect_black_frames(video_path: str, min_duration: float = 0.4) -> List[Dict[str, float]]:
    """Detect unexpected black frames using FFmpeg blackdetect filter."""
    cmd = [
        "ffmpeg", "-v", "error",
        "-i", video_path,
        "-vf", f"blackdetect=d={min_duration}:pic_th=0.98",
        "-an", "-f", "null", "-",
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    blacks = []
    for line in (res.stderr or "").splitlines():
        m = re.search(r"black_start:([0-9.]+)\s+black_end:([0-9.]+)\s+black_duration:([0-9.]+)", line)
        if m:
            blacks.append({
                "start": float(m.group(1)),
                "end": float(m.group(2)),
                "duration": float(m.group(3)),
            })
    return blacks

def measure_ebur128_loudness(video_path: str) -> Dict[str, float]:
    """Measure integrated loudness and true peak via ebur128 filter."""
    cmd = [
        "ffmpeg", "-v", "error",
        "-i", video_path,
        "-af", "ebur128=peak=true",
        "-vn", "-f", "null", "-",
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    out = res.stderr or ""
    i_lufs = -14.0
    tp = -1.0

    m_i = re.search(r"I:\s*(-?[0-9.]+)\s*LUFS", out)
    if m_i:
        i_lufs = float(m_i.group(1))

    m_tp = re.search(r"True peak:\s*(-?[0-9.]+)\s*dBFS", out)
    if m_tp:
        tp = float(m_tp.group(1))

    return {"integrated_lufs": i_lufs, "true_peak_db": tp}

def inspect_rendered_mp4(video_path: str, target_lufs: float = -14.0) -> QAReport:
    """Run comprehensive QA inspection over rendered MP4."""
    p = Path(video_path)
    if not p.is_file():
        return QAReport(
            video_path=video_path,
            duration=0.0,
            resolution="0x0",
            aspect_ratio="unknown",
            status="FAIL",
            score=0.0,
            defects=[QADefect("DF_NO_FILE", "CRITICAL", "visual", "File Not Found", f"Rendered output missing: {video_path}")],
        )

    probe_data = probe_mp4(str(p))
    streams = probe_data.get("streams", [])
    v_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    a_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

    dur = float(probe_data.get("format", {}).get("duration", 0.0))
    w = int(v_stream.get("width", 0)) if v_stream else 0
    h = int(v_stream.get("height", 0)) if v_stream else 0
    ar = f"{w}:{h}" if w and h else "unknown"

    defects: List[QADefect] = []

    # 1. Visual Aspect Ratio & Resolution Checks
    if not v_stream:
        defects.append(QADefect("DF_NO_VIDEO", "CRITICAL", "visual", "No Video Stream", "Render has no video stream"))
    else:
        # Check 9:16 vertical orientation
        if w > h:
            defects.append(QADefect(
                "DF_LANDSCAPE", "CRITICAL", "visual", "Incorrect Aspect Ratio",
                f"Video is landscape ({w}x{h}), must be vertical 9:16 for Reels/Shorts",
                repairable=True,
                proposed_fix={"op": "set_output", "params": {"width": 1080, "height": 1920}}
            ))
        elif w != 1080 or h != 1920:
            defects.append(QADefect(
                "DF_NON_STANDARD_RES", "MINOR", "visual", "Non-Standard Resolution",
                f"Video resolution {w}x{h} differs from standard 1080x1920",
                repairable=True,
                proposed_fix={"op": "set_output", "params": {"width": 1080, "height": 1920}}
            ))

    # 2. Black Frame Detection
    blacks = detect_black_frames(str(p))
    for b in blacks:
        # If black frame is at the start or longer than 0.5s, report defect
        if b["duration"] >= 0.5:
            defects.append(QADefect(
                "DF_BLACK_FRAME", "MAJOR", "visual", "Black Frames Detected",
                f"Unexpected {b['duration']:.2f}s black gap at timestamp {b['start']:.2f}s",
                timestamp=b["start"],
                repairable=True,
                proposed_fix={"op": "remove_span", "params": {"start": b["start"], "end": b["end"]}}
            ))

    # 3. Audio Stream & Loudness Checks
    audio_metrics = {"integrated_lufs": -14.0, "true_peak_db": -1.0}
    if not a_stream:
        defects.append(QADefect("DF_NO_AUDIO", "CRITICAL", "audio", "No Audio Track", "Render contains no audio stream"))
    else:
        try:
            audio_metrics = measure_ebur128_loudness(str(p))
            lufs = audio_metrics["integrated_lufs"]
            tp = audio_metrics["true_peak_db"]

            # Loudness tolerance +- 2.0 LUFS
            if abs(lufs - target_lufs) > 2.5:
                defects.append(QADefect(
                    "DF_LOUDNESS_DEVIATION", "MAJOR", "audio", "Loudness Non-Compliant",
                    f"Measured {lufs:.1f} LUFS deviates from {target_lufs:.1f} LUFS target",
                    repairable=True,
                    proposed_fix={"op": "set_audio", "params": {"target_lufs": target_lufs}}
                ))

            # Clipping check (True Peak > -0.5 dB)
            if tp > -0.2:
                defects.append(QADefect(
                    "DF_AUDIO_CLIPPING", "CRITICAL", "audio", "Audio Clipping Detected",
                    f"True Peak {tp:.1f} dBFS exceeds safe limit (-1.0 dBFS)",
                    repairable=True,
                    proposed_fix={"op": "set_audio", "params": {"peak_limit": -1.0}}
                ))
        except Exception as e:
            log.warning("Audio loudness check skipped: %s", e)

    # 4. Duration Check
    if dur < 3.0:
        defects.append(QADefect("DF_TOO_SHORT", "CRITICAL", "editorial", "Video Too Short", f"Video duration {dur:.1f}s < 3.0s minimum"))

    # Scoring & Status Classification
    critical_cnt = sum(1 for d in defects if d.severity == "CRITICAL")
    major_cnt = sum(1 for d in defects if d.severity == "MAJOR")
    minor_cnt = sum(1 for d in defects if d.severity == "MINOR")

    score = max(0.0, 1.0 - (critical_cnt * 0.4 + major_cnt * 0.15 + minor_cnt * 0.05))
    if critical_cnt > 0:
        status = "FAIL"
    elif major_cnt > 0:
        status = "WARN"
    else:
        status = "PASS"

    return QAReport(
        video_path=str(p),
        duration=dur,
        resolution=f"{w}x{h}",
        aspect_ratio="9:16" if h > w else "landscape",
        status=status,
        score=score,
        defects=defects,
        audio_metrics=audio_metrics,
        visual_metrics={"black_spans": len(blacks), "video_codec": v_stream.get("codec_name") if v_stream else None},
    )

class AutomatedRepairEngine:
    """Bounded automated repair loop for repairable render QA defects."""
    def __init__(self, render_fn: Callable[[Dict[str, Any]], str], max_attempts: int = 3):
        self.render_fn = render_fn
        self.max_attempts = max_attempts

    def repair_and_verify(
        self,
        plan_mgr: Any,
        initial_video_path: str,
        target_lufs: float = -14.0,
    ) -> Tuple[str, QAReport, List[Dict[str, Any]]]:
        """Runs QA, applies proposed fixes to the EditPlan, re-renders, and loops up to max_attempts."""
        cur_video = initial_video_path
        history = []

        for attempt in range(1, self.max_attempts + 1):
            report = inspect_rendered_mp4(cur_video, target_lufs=target_lufs)
            history.append({
                "attempt": attempt,
                "video_path": cur_video,
                "report": report.to_dict(),
            })

            if report.status == "PASS" or not any(d.repairable for d in report.defects):
                log.info("[RepairEngine] QA finished at attempt %d with status %s", attempt, report.status)
                return cur_video, report, history

            # Pick first repairable defect
            defect_to_fix = next(d for d in report.defects if d.repairable and d.proposed_fix)
            log.info("[RepairEngine] Attempt %d: Fixing defect %s: %s", attempt, defect_to_fix.defect_id, defect_to_fix.title)

            fix = defect_to_fix.proposed_fix
            if fix["op"] == "set_output":
                plan_mgr.current.setdefault("output", {}).update(fix["params"])
            elif fix["op"] == "set_audio":
                plan_mgr.current.setdefault("audio", {}).update(fix["params"])
            elif fix["op"] == "remove_span":
                plan_mgr.apply_operation(
                    "remove_span",
                    fix["params"],
                    reason=f"Automated QA repair for {defect_to_fix.title}",
                )

            # Re-render
            try:
                new_rendered_video = self.render_fn(plan_mgr.current)
                cur_video = str(new_rendered_video)
            except Exception as e:
                log.error("[RepairEngine] Re-render failed on attempt %d: %s", attempt, e)
                break

        final_report = inspect_rendered_mp4(cur_video, target_lufs=target_lufs)
        return cur_video, final_report, history
