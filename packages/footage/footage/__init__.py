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
)
from footage.index import read_index, write_index, index_footage

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
]
