"""Footage Intelligence Engine (Director 2.0 Layer A).
Performs multi-modal video analysis: scene segmentation, keyframe extraction,
shot classification, face detection, transcript indexing, and semantic search.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ._common import probe
from .scenes import detect_scenes
from .silences import detect_silences
from .transcribe import transcribe

@dataclass
class SearchResult:
    scene_id: str
    start: float
    end: float
    match_type: str  # "speech", "visual", "shot_type"
    snippet: str
    confidence: float
    keyframe_path: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id": self.scene_id,
            "start": round(self.start, 2),
            "end": round(self.end, 2),
            "duration": round(self.end - self.start, 2),
            "match_type": self.match_type,
            "snippet": self.snippet,
            "confidence": round(self.confidence, 3),
            "keyframe_path": self.keyframe_path,
        }

def extract_keyframe(video_path: str, timestamp: float, output_path: str, width: int = 640) -> bool:
    """Extract a representative still JPEG keyframe at a timestamp."""
    try:
        cmd = [
            "ffmpeg", "-y", "-v", "error",
            "-ss", str(max(0.0, timestamp)),
            "-i", video_path,
            "-frames:v", "1",
            "-vf", f"scale={width}:-2",
            "-q:v", "3",
            output_path,
        ]
        res = subprocess.run(cmd, capture_output=True, timeout=30)
        return res.returncode == 0 and os.path.isfile(output_path) and os.path.getsize(output_path) > 0
    except Exception:
        return False

def classify_shot(duration: float, face_count: int = 0, motion_score: float = 0.0) -> Dict[str, Any]:
    """Classify camera shot framing and pacing."""
    if face_count >= 1:
        framing = "Close-Up / Talking Head"
    elif duration > 6.0:
        framing = "Wide Establishing Shot"
    else:
        framing = "Medium Action Shot"

    return {
        "framing": framing,
        "face_detected": face_count > 0,
        "motion": "Dynamic / Active" if motion_score > 0.4 else "Steady / Static",
    }

def build_footage_index(video_path: str, workdir: str) -> Dict[str, Any]:
    """Analyze source footage and build a persistent structured media index."""
    vpath = Path(video_path)
    if not vpath.is_file():
        raise FileNotFoundError(f"Media file not found: {video_path}")

    wdir = Path(workdir)
    wdir.mkdir(parents=True, exist_ok=True)
    keyframes_dir = wdir / "keyframes"
    keyframes_dir.mkdir(parents=True, exist_ok=True)

    info = probe(str(vpath))
    dur = float(info.get("duration", 0.0))
    media_id = hashlib.md5(f"{vpath.name}_{dur}".encode()).hexdigest()[:12]

    # 1. Base plan for tools
    dummy_plan = {
        "source": {"path": str(vpath), **info},
        "keep": [{"id": "k1", "start": 0.0, "end": dur}],
    }

    # 2. Scene detection
    scenes_res = detect_scenes(dummy_plan, video=str(vpath), workdir=str(wdir))
    detected_scenes = scenes_res.get("result", {}).get("scenes", [])
    if not detected_scenes:
        detected_scenes = [{"id": "sc_01", "start": 0.0, "end": dur}]

    # 3. Silence detection
    silences_res = detect_silences(dummy_plan, video=str(vpath), workdir=str(wdir))
    silences = silences_res.get("result", {}).get("silences", [])

    # 4. Transcription
    trans_res = transcribe(dummy_plan, video=str(vpath), workdir=str(wdir))
    transcript_data = trans_res.get("result", {})
    words = transcript_data.get("words", [])
    segments = transcript_data.get("segments", [])

    # 5. Face detection track (sample at 2 fps across source video)
    face_raw_points: List[Dict[str, Any]] = []
    face_coverage_overall = 0.0
    try:
        from .faces import track_faces
        face_track_res = track_faces(
            dummy_plan,
            video=str(vpath),
            sample_fps=2.0,
            detector="opencv-haar",
            set_reframe=False,
            workdir=str(wdir),
        )
        face_raw_points = face_track_res.get("result", {}).get("raw", [])
        face_coverage_overall = float(face_track_res.get("result", {}).get("coverage", 0.0))
    except Exception:
        face_raw_points = []
        face_coverage_overall = 0.0

    # 6. Assemble enriched scene index
    enriched_scenes = []
    for idx, sc in enumerate(detected_scenes):
        s_start = float(sc.get("start", 0.0))
        s_end = float(sc.get("end", dur))
        s_mid = (s_start + s_end) / 2.0

        # Extract representative keyframe
        kf_filename = f"kf_{idx:03d}_{s_mid:.2f}s.jpg"
        kf_path = str(keyframes_dir / kf_filename)
        has_kf = extract_keyframe(str(vpath), s_mid, kf_path)

        # Match spoken words inside scene
        scene_words = [w for w in words if s_start <= float(w.get("start", 0)) < s_end]
        scene_text = " ".join(w.get("word", "").strip() for w in scene_words)
        if not scene_text:
            scene_text = " ".join(seg.get("text", "") for seg in segments if s_start <= float(seg.get("start", 0)) < s_end)

        # Derive visual tags from content
        tags = []
        if idx == 0:
            tags.append("hook")
            tags.append("introduction")
        if any(k in scene_text.lower() for k in ["pricing", "cost", "dollar", "pay", "$"]):
            tags.append("pricing")
        if any(k in scene_text.lower() for k in ["demo", "screen", "dashboard", "click", "feature", "build"]):
            tags.append("product_demo")
        if any(k in scene_text.lower() for k in ["problem", "mistake", "fail", "wrong", "die", "hard"]):
            tags.append("core_problem")
        if any(k in scene_text.lower() for k in ["follow", "subscribe", "tomorrow", "part 2", "send this"]):
            tags.append("cta")

        # Real face detection mapped to scene interval
        scene_face_points = [p for p in face_raw_points if s_start <= float(p.get("t", 0.0)) < s_end]
        if scene_face_points:
            face_hits = sum(1 for p in scene_face_points if p.get("found"))
            scene_face_coverage = face_hits / len(scene_face_points)
            has_face = face_hits > 0 and scene_face_coverage >= 0.20
            face_count = 1 if has_face else 0
        else:
            scene_face_coverage = face_coverage_overall if (face_raw_points and face_coverage_overall > 0.4) else 0.0
            face_count = 1 if scene_face_coverage >= 0.20 else 0

        shot_meta = classify_shot(s_end - s_start, face_count=face_count)

        enriched_scenes.append({
            "scene_id": f"scene_{idx+1:02d}",
            "start": round(s_start, 3),
            "end": round(s_end, 3),
            "duration": round(s_end - s_start, 3),
            "keyframe": kf_path if has_kf else None,
            "transcript": scene_text.strip(),
            "words_count": len(scene_words),
            "visual_tags": tags,
            "face_coverage": round(scene_face_coverage, 3),
            "camera": shot_meta,
        })

    index_data = {
        "media_id": media_id,
        "video_path": str(vpath),
        "duration": dur,
        "resolution": f"{info.get('width', 1080)}x{info.get('height', 1920)}",
        "fps": info.get("fps", 30.0),
        "audio_stream": info.get("has_audio", True),
        "scenes_count": len(enriched_scenes),
        "silences_count": len(silences),
        "total_speech_words": len(words),
        "scenes": enriched_scenes,
    }

    # Persist index to file
    index_file = wdir / f"index_{media_id}.json"
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(index_data, f, indent=2)
    index_data["index_file"] = str(index_file)

    return index_data

def search_footage(index: Dict[str, Any], query: str, limit: int = 5) -> List[SearchResult]:
    """Semantic footage search over transcript, visual tags, and scene moments.
    Never invents timestamps; points strictly to verified source ranges.
    """
    if not query or not index or "scenes" not in index:
        return []

    q_clean = query.strip().lower()
    terms = re.findall(r"\w+", q_clean)
    results: List[Tuple[float, SearchResult]] = []

    for sc in index["scenes"]:
        orig_text = sc.get("transcript", "")
        text = orig_text.lower()
        tags = [t.lower() for t in sc.get("visual_tags", [])]
        framing = sc.get("camera", {}).get("framing", "").lower()
        score = 0.0
        match_type = "speech"
        matched_snippet = orig_text or f"Scene {sc['scene_id']}"

        # 1. Exact phrase match in speech
        if q_clean in text:
            score += 1.0
            matched_snippet = f"...{orig_text}..."

        # 2. Term overlap in speech
        term_matches = sum(1 for t in terms if t in text)
        if terms:
            score += (term_matches / len(terms)) * 0.7

        # 3. Visual tag matches (e.g. "product demo", "pricing", "hook", "problem")
        for tag in tags:
            if any(t in tag for t in terms):
                score += 0.8
                match_type = "visual"
                matched_snippet = f"[Visual Tag: {tag.replace('_', ' ').title()}] {matched_snippet}"

        # 4. Shot framing matches (e.g. "close-up", "wide shot")
        if any(t in framing for t in terms):
            score += 0.6
            match_type = "shot_type"

        if score > 0.2:
            sr = SearchResult(
                scene_id=sc["scene_id"],
                start=sc["start"],
                end=sc["end"],
                match_type=match_type,
                snippet=matched_snippet[:180],
                confidence=min(1.0, score),
                keyframe_path=sc.get("keyframe"),
            )
            results.append((score, sr))

    results.sort(key=lambda x: x[0], reverse=True)
    return [r[1] for r in results[:limit]]
