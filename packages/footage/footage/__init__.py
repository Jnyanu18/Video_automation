"""AILO Footage — Long-form video indexing, triage, and multi-cam synchronization."""

__version__ = "0.1.0"

from footage.schema import (
    FootageIndex,
    MediaFile,
    Shot,
    Moment,
    MomentAngle,
    MomentSpeech,
    SyncGroup,
    SpeechSegment,
    WordTimestamp,
    IndexStats,
    RejectReason,
    Person,
)
from footage.index import read_index, write_index, index_footage
from footage.score import highlight_score, ScoreConfig
from footage.search import find_moments
from footage.plan_schema import (
    EditPlanV2,
    EditPlanEntryV2,
    RundownTemplate,
    RundownBeat,
    MissingBeatReport,
    DeliverableType,
    DeliverableSpec,
    ReviewScoreCard,
)
from footage.plan import plan_rundown
from footage.editplan import (
    load_template,
    list_templates,
    convert_wall_to_src,
    convert_src_to_wall,
    read_edit_plan,
    write_edit_plan,
    approve_plan,
    revoke_approval,
    review_plan_mechanics,
)
from footage.beats import detect_beat_grid, snap_cuts_to_beats
from footage.render import conform_render, render_all_deliverables, PlanNotApprovedError

__all__ = [
    "FootageIndex",
    "MediaFile",
    "Shot",
    "Moment",
    "MomentAngle",
    "MomentSpeech",
    "SyncGroup",
    "SpeechSegment",
    "WordTimestamp",
    "IndexStats",
    "RejectReason",
    "read_index",
    "write_index",
    "index_footage",
    "Person",
    "highlight_score",
    "ScoreConfig",
    "find_moments",
    "EditPlanV2",
    "EditPlanEntryV2",
    "RundownTemplate",
    "RundownBeat",
    "MissingBeatReport",
    "DeliverableType",
    "DeliverableSpec",
    "ReviewScoreCard",
    "plan_rundown",
    "load_template",
    "list_templates",
    "convert_wall_to_src",
    "convert_src_to_wall",
    "read_edit_plan",
    "write_edit_plan",
    "approve_plan",
    "revoke_approval",
    "review_plan_mechanics",
    "detect_beat_grid",
    "snap_cuts_to_beats",
    "conform_render",
    "render_all_deliverables",
    "PlanNotApprovedError",
]
