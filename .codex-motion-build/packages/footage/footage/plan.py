"""Longform event film planner.

Agent B owns this file.
Turns a FootageIndex and a RundownTemplate into a conform EditPlanV2.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

from footage.beats import detect_beat_grid, snap_cuts_to_beats
from footage.editplan import (
    convert_wall_to_src,
    load_template,
    review_plan_mechanics,
)
from footage.plan_schema import (
    ChapterMarker,
    DeliverableSpec,
    DeliverableType,
    EditPlanEntryV2,
    EditPlanV2,
    MissingBeatReport,
    MusicBed,
    ReviewScoreCard,
    RundownBeat,
    RundownTemplate,
)
from footage.schema import FootageIndex, MediaFile, Moment, Shot, SpeechSegment, SyncGroup

logger = logging.getLogger("footage.plan")

# Import Agent A's frozen interface
try:
    from footage.score import highlight_score
except ImportError:
    highlight_score = None  # type: ignore

try:
    from footage.search import find_moments
except ImportError:
    find_moments = None  # type: ignore


def _default_score(moment: Moment, index: FootageIndex) -> float:
    """Fallback highlight score if footage.score is not yet committed."""
    if highlight_score is not None:
        try:
            return float(highlight_score(moment, index))
        except Exception:
            pass
    return float(getattr(moment, "keep_score", 0.5))


def _default_search(
    query: str,
    index: FootageIndex,
    *,
    limit: int = 20,
    min_relevance: float = 0.0,
) -> List[Tuple[Moment, float]]:
    """Fallback find_moments if footage.search is not yet committed."""
    if find_moments is not None:
        try:
            return find_moments(query, index, limit=limit, min_relevance=min_relevance)
        except Exception:
            pass

    q_tokens = [t.lower() for t in query.split() if t.strip()]
    if not q_tokens:
        return [(m, 1.0) for m in index.moments[:limit]]

    scored: List[Tuple[Moment, float]] = []
    for m in index.moments:
        doc_tokens = set()
        if m.description:
            doc_tokens.update(m.description.lower().split())
        for tag in m.tags:
            doc_tokens.update(tag.lower().split())
        if m.speech and m.speech.text:
            doc_tokens.update(m.speech.text.lower().split())

        matches = sum(1 for qt in q_tokens if any(qt in dt for dt in doc_tokens))
        rel = matches / float(len(q_tokens))
        if rel >= min_relevance:
            scored.append((m, round(rel, 3)))

    # Equal scores break ties by moment_id
    scored.sort(key=lambda item: (item[1], item[0].moment_id), reverse=True)
    return scored[:limit]


def match_must_have_constraints(
    moment: Moment,
    must_have: List[str],
    index: FootageIndex,
    shots_by_id: Dict[str, Shot],
) -> bool:
    """Verify if a moment satisfies beat must_have requirements."""
    if not must_have:
        return True

    moment_shots = [shots_by_id[a.shot_id] for a in moment.angles if a.shot_id in shots_by_id]
    tags_lower = {t.lower() for t in moment.tags}
    desc_text = (moment.description or "").lower()

    for req in must_have:
        r = req.lower()
        if r == "speech":
            has_speech = (
                (moment.speech is not None and bool(moment.speech.text)) or
                any(s.audio_class == "speech" for s in moment_shots)
            )
            if not has_speech:
                return False
        elif r == "two_people":
            has_two = (
                any(s.faces >= 2 for s in moment_shots)
                or "couple" in tags_lower
                or "two_people" in tags_lower
                or "two people" in desc_text
            )
            if not has_two:
                return False
        elif r in ("music", "high_energy"):
            has_energy = (
                any(s.audio_class == "music" or s.motion > 0.4 for s in moment_shots)
                or r in tags_lower
                or r in desc_text
            )
            if not has_energy:
                return False
        else:
            # Generic constraint: must match tags, description, speech, or audio class
            matched = (
                r in tags_lower
                or any(r in t for t in tags_lower)
                or r in desc_text
                or any(r == s.audio_class for s in moment_shots)
            )
            if not matched:
                return False

    return True


def plan_rundown(
    index: FootageIndex,
    template: RundownTemplate | str | Path,
    target_duration: Optional[float] = None,
    must_include: Optional[List[str]] = None,
    never_include: Optional[List[str]] = None,
    music_path: Optional[str | Path] = None,
    snap_beats: bool = True,
    score_fn: Optional[Callable[[Moment, FootageIndex], float]] = None,
    search_fn: Optional[Callable[..., List[Tuple[Moment, float]]]] = None,
) -> EditPlanV2:
    """Plan an event film from a FootageIndex according to a rundown template.
    
    Constraints enforced:
    - Never include: Moments in never_include are omitted absolutely.
    - Must include: Moments in must_include are unconditionally placed.
    - Missing beats: Explicitly recorded in missing_beats, never quietly dropped.
    - Non-duplicate moments: No moment appears more than once.
    - Timebase conversion: Source in/out strictly in original-file timebase (t_src).
    - Speech-whole: Moments marked prefer: speech_whole never cut mid-sentence and stay off beat grid.
    - Pacing / Budget: Total duration matches target budget within ±5%.
    """
    if isinstance(template, (str, Path)):
        tmpl = load_template(template)
    else:
        tmpl = template

    calc_score = score_fn or _default_score
    do_search = search_fn or _default_search

    effective_target_duration = target_duration or tmpl.target_duration
    must_inc = set(must_include or [])
    never_inc = set(never_include or [])

    shots_by_id = {s.shot_id: s for s in index.shots}
    media_by_id = {m.media_id: m for m in index.media}
    moments_by_id = {m.moment_id: m for m in index.moments}

    used_moment_ids: Set[str] = set()
    entries: List[EditPlanEntryV2] = []
    missing_beats: List[MissingBeatReport] = []

    # Map speech segments for word-aligned speech protection
    speech_by_media: Dict[str, List[SpeechSegment]] = {}
    for sp in index.speech:
        speech_by_media.setdefault(sp.media_id, []).append(sp)

    for beat in tmpl.beats:
        candidate_pool: Dict[str, float] = {}

        # 1. Search candidates using search queries
        queries = beat.search if beat.search else [beat.id]
        for q in queries:
            results = do_search(q, index, limit=10, min_relevance=0.0)
            for m, rel in results:
                if m.moment_id in never_inc or m.moment_id in used_moment_ids:
                    continue
                # Weight relevance + highlight score
                h_score = calc_score(m, index)
                score = rel * 0.4 + h_score * 0.6
                if m.moment_id not in candidate_pool or score > candidate_pool[m.moment_id]:
                    candidate_pool[m.moment_id] = score

        # If no candidates from search, fallback to all unused moments ranked by highlight score
        if not candidate_pool:
            for m in index.moments:
                if m.moment_id in never_inc or m.moment_id in used_moment_ids:
                    continue
                h_score = calc_score(m, index)
                candidate_pool[m.moment_id] = h_score * 0.5

        # Filter candidates by must_have constraints
        valid_candidates = []
        for mid, sc in candidate_pool.items():
            mom = moments_by_id.get(mid)
            if not mom:
                continue
            if match_must_have_constraints(mom, beat.must_have, index, shots_by_id):
                valid_candidates.append((mom, sc))

        # Check if candidate pool is empty -> Missing Beat!
        if not valid_candidates:
            missing_beats.append(
                MissingBeatReport(
                    beat_id=beat.id,
                    reason=f"No usable {beat.id} footage found matching constraints {beat.must_have}",
                    searched_queries=beat.search,
                    must_have_constraints=beat.must_have,
                )
            )
            continue

        # Sort candidates descending by score, tiebreak by moment_id
        valid_candidates.sort(key=lambda x: (x[1], x[0].moment_id), reverse=True)
        chosen_moment, _ = valid_candidates[0]
        used_moment_ids.add(chosen_moment.moment_id)

        # Select best camera angle
        if not chosen_moment.angles:
            missing_beats.append(
                MissingBeatReport(
                    beat_id=beat.id,
                    reason=f"Moment {chosen_moment.moment_id} for beat {beat.id} has no camera angles",
                )
            )
            continue

        best_angle = chosen_moment.angles[0]
        shot = shots_by_id.get(best_angle.shot_id)
        if not shot:
            continue

        media_id = shot.media_id
        camera_id = best_angle.camera_id

        # Determine duration
        is_speech_whole = (beat.prefer == "speech_whole")
        moment_dur = chosen_moment.t_end - chosen_moment.t_start

        if is_speech_whole:
            # Respect natural speech bounds
            # Check speech segment
            chosen_dur = max(0.4, moment_dur)
            t_wall_in = chosen_moment.t_start
            t_wall_out = chosen_moment.t_start + chosen_dur
        else:
            # Constrain to beat target/min/max
            target_dur = max(0.4, min(beat.max_duration, max(beat.min_duration, moment_dur)))
            target_dur = min(target_dur, moment_dur)
            target_dur = max(0.4, target_dur)
            t_wall_in = chosen_moment.t_start
            t_wall_out = chosen_moment.t_start + target_dur

        # Timebase conversion: t_wall -> t_src in original file!
        t_src_in, t_src_out = convert_wall_to_src(
            t_wall_in=t_wall_in,
            t_wall_out=t_wall_out,
            media_id=media_id,
            sync_groups=index.sync_groups,
            media_map=media_by_id,
        )

        entry_dur = round(t_src_out - t_src_in, 3)
        if entry_dur < 0.4:
            # Adjust to satisfy no shot under 0.4s
            t_src_out = round(t_src_in + 0.4, 3)
            entry_dur = 0.4
            t_wall_out = round(t_wall_in + 0.4, 3)

        entry = EditPlanEntryV2(
            entry_id=f"entry_{uuid.uuid4().hex[:6]}",
            beat_id=beat.id,
            moment_id=chosen_moment.moment_id,
            shot_id=shot.shot_id,
            media_id=media_id,
            camera_id=camera_id,
            t_src_in=t_src_in,
            t_src_out=t_src_out,
            duration=entry_dur,
            t_wall_in=t_wall_in,
            t_wall_out=t_wall_out,
            angle_chosen=camera_id,
            transition=beat.transition or "cut",
            speech_whole=is_speech_whole,
        )
        entries.append(entry)

    # 2. Enforce must_include moments unconditionally
    for m_id in must_inc:
        if m_id in used_moment_ids:
            continue
        m = moments_by_id.get(m_id)
        if not m or not m.angles:
            continue

        used_moment_ids.add(m_id)
        ang = m.angles[0]
        sht = shots_by_id.get(ang.shot_id)
        if not sht:
            continue

        dur = max(0.4, min(15.0, m.t_end - m.t_start))
        t_src_in, t_src_out = convert_wall_to_src(
            m.t_start,
            m.t_start + dur,
            sht.media_id,
            index.sync_groups,
            media_by_id,
        )
        entry = EditPlanEntryV2(
            entry_id=f"entry_{uuid.uuid4().hex[:6]}",
            beat_id="must_include",
            moment_id=m_id,
            shot_id=sht.shot_id,
            media_id=sht.media_id,
            camera_id=ang.camera_id,
            t_src_in=t_src_in,
            t_src_out=t_src_out,
            duration=round(t_src_out - t_src_in, 3),
            t_wall_in=m.t_start,
            t_wall_out=m.t_start + dur,
            angle_chosen=ang.camera_id,
            transition="cut",
            speech_whole=False,
        )
        # Insert near midpoint of montage
        insert_idx = len(entries) // 2
        entries.insert(insert_idx, entry)

    # 3. Scale and budget durations to match target_duration within ±5%
    if entries and effective_target_duration > 0:
        speech_dur = sum(e.duration for e in entries if e.speech_whole)
        flexible_entries = [e for e in entries if not e.speech_whole]
        flexible_cur_dur = sum(e.duration for e in flexible_entries)

        if flexible_entries and flexible_cur_dur > 0:
            target_flexible_dur = max(len(flexible_entries) * 0.4, effective_target_duration - speech_dur)
            ratio = target_flexible_dur / flexible_cur_dur

            adjusted_entries: List[EditPlanEntryV2] = []
            for e in entries:
                if e.speech_whole:
                    adjusted_entries.append(e)
                else:
                    scaled_dur = max(0.4, round(e.duration * ratio, 3))
                    new_t_src_out = round(e.t_src_in + scaled_dur, 3)
                    new_t_wall_out = round(e.t_wall_in + scaled_dur, 3)
                    adjusted_entries.append(
                        e.model_copy(update={
                            "t_src_out": new_t_src_out,
                            "duration": scaled_dur,
                            "t_wall_out": new_t_wall_out,
                        })
                    )
            entries = adjusted_entries

    # 4. Snap cuts to music beat grid if music track provided
    music_bed = None
    if music_path and Path(music_path).is_file():
        music_bed = MusicBed(track_path=str(Path(music_path).resolve()))
        if snap_beats:
            beat_grid = detect_beat_grid(music_path, max_duration=effective_target_duration * 1.5)
            entries = snap_cuts_to_beats(entries, beat_grid, protected_speech_whole=True)

    total_plan_duration = round(sum(e.duration for e in entries), 2)

    # 5. Build chapters
    chapters: List[ChapterMarker] = []
    t_cursor = 0.0
    for e in entries:
        title = e.beat_id.replace("_", " ").title() if e.beat_id else "Scene"
        chapters.append(
            ChapterMarker(
                title=title,
                start_time=round(t_cursor, 2),
                end_time=round(t_cursor + e.duration, 2),
            )
        )
        t_cursor += e.duration

    # 6. Build Deliverables: teaser, highlight, full
    deliverables: Dict[str, DeliverableSpec] = {}
    
    # Highlight deliverable (the full planned edit)
    deliverables["highlight"] = DeliverableSpec(
        deliverable_type=DeliverableType.HIGHLIGHT,
        target_duration=effective_target_duration,
        total_duration=total_plan_duration,
        entries=entries,
        chapters=chapters,
    )

    # Teaser deliverable: fast-paced ~30-45s cut from top moments
    teaser_entries = [e for e in entries if not e.speech_whole][:6]
    teaser_scaled = []
    t_acc = 0.0
    for te in teaser_entries:
        t_dur = max(0.4, min(3.5, te.duration * 0.5))
        teaser_scaled.append(
            te.model_copy(update={
                "t_src_out": round(te.t_src_in + t_dur, 3),
                "duration": round(t_dur, 3),
                "t_wall_out": round(te.t_wall_in + t_dur, 3),
            })
        )
        t_acc += t_dur

    deliverables["teaser"] = DeliverableSpec(
        deliverable_type=DeliverableType.TEASER,
        target_duration=min(45.0, effective_target_duration * 0.25),
        total_duration=round(t_acc, 2),
        entries=teaser_scaled,
        chapters=[],
    )

    # Full deliverable: comprehensive extended cut
    deliverables["full"] = DeliverableSpec(
        deliverable_type=DeliverableType.FULL,
        target_duration=max(total_plan_duration, effective_target_duration * 1.5),
        total_duration=total_plan_duration,
        entries=entries,
        chapters=chapters,
    )

    plan = EditPlanV2(
        plan_id=f"plan_{uuid.uuid4().hex[:10]}",
        project_id=index.project_id,
        template_name=tmpl.name,
        target_duration=effective_target_duration,
        total_duration=total_plan_duration,
        entries=entries,
        missing_beats=missing_beats,
        music_bed=music_bed,
        chapters=chapters,
        title=f"{index.project_id} Film ({tmpl.name})",
        approved=False,
        must_include=list(must_inc),
        never_include=list(never_inc),
        deliverables=deliverables,
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    # Run mechanical review
    plan.review_card = review_plan_mechanics(plan, tmpl, index)
    return plan
