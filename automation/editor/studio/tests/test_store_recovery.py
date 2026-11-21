"""Restart recovery: no job may be left in flight after the process dies.

Background work runs in daemon threads, so a deploy or a crash kills it silently and the
record is never touched again. Without this sweep the client watches a progress bar forever.
"""
from __future__ import annotations

import json

from studio.store import Store


def _write_state(tmp_path, data: dict):
    p = tmp_path / "studio_state.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    return p


def test_interrupted_storyboard_and_render_are_failed(tmp_path):
    path = _write_state(tmp_path, {
        "storyboards": {
            "sb1": {"id": "sb1", "status": "processing"},
            "sb2": {"id": "sb2", "status": "ready", "render_job": {"status": "running"}},
            "sb3": {"id": "sb3", "status": "ready", "render_job": {"status": "done"}},
        },
    })
    s = Store(path)
    assert s.data["storyboards"]["sb1"]["status"] == "failed"
    assert "restarted" in s.data["storyboards"]["sb1"]["error"]
    assert s.data["storyboards"]["sb2"]["render_job"]["status"] == "failed"
    # A finished render must not be rewritten.
    assert s.data["storyboards"]["sb3"]["render_job"]["status"] == "done"


def test_interrupted_carousel_and_longform_jobs_are_failed(tmp_path):
    path = _write_state(tmp_path, {
        "carousels": {"c1": {"status": "rendering"}, "c2": {"status": "writing"}, "c3": {"status": "done"}},
        "longform_jobs": {"j1": {"status": "running"}, "j2": {"status": "queued"}, "j3": {"status": "done"}},
    })
    s = Store(path)
    assert [c["status"] for c in (s.data["carousels"][k] for k in ("c1", "c2", "c3"))] == ["failed", "failed", "done"]
    assert [j["status"] for j in (s.data["longform_jobs"][k] for k in ("j1", "j2", "j3"))] == ["failed", "failed", "done"]


def test_post_interrupted_mid_publish_fails_but_is_not_auto_retryable(tmp_path):
    """The platform call may have succeeded just before the crash, so an automatic retry
    could post to a client's account twice. Fail it, and mark the outcome unknown so that
    Publisher.retry refuses until an operator has checked the account."""
    path = _write_state(tmp_path, {
        "publishing": {
            "p1": {"id": "p1", "status": "PUBLISHING", "error": None},
            "p2": {"id": "p2", "status": "SCHEDULED"},
            "p3": {"id": "p3", "status": "PUBLISHED"},
        },
    })
    s = Store(path)
    p1 = s.data["publishing"]["p1"]
    assert p1["status"] == "FAILED"
    assert p1["error"]["code"] == "OUTCOME_UNKNOWN"
    assert p1["error"]["retryable"] is False
    assert p1["outcome_unknown"] is True
    assert "check the account" in p1["error"]["message"]
    # Untouched: a queued post must still be picked up, a published one must stay published.
    assert s.data["publishing"]["p2"]["status"] == "SCHEDULED"
    assert s.data["publishing"]["p3"]["status"] == "PUBLISHED"


def test_an_interrupted_post_is_only_resendable_after_the_operator_confirms(tmp_path):
    """The point of the sweep: the stuck row becomes actionable, but not silently resent."""
    import pytest

    from studio.publishing import Publisher

    path = _write_state(tmp_path, {"publishing": {"p1": {"id": "p1", "title": "t", "status": "PUBLISHING"}}})
    sched = Publisher.__new__(Publisher)  # no network, no threads: retry() only touches the store
    sched.store = Store(path)

    with pytest.raises(ValueError, match="may have reached the platform"):
        sched.retry("p1")
    sched.store.update("publishing", "p1", lambda r: r.update(outcome_unknown=False))
    assert sched.store.get("publishing", "p1")["outcome_unknown"] is False


def test_recovery_is_idempotent_and_survives_a_second_load(tmp_path):
    path = _write_state(tmp_path, {"longform_jobs": {"j1": {"status": "running"}}})
    Store(path).save()
    again = Store(path)
    assert again.data["longform_jobs"]["j1"]["status"] == "failed"


def test_missing_and_empty_collections_do_not_raise(tmp_path):
    # An older state file predates longform_jobs entirely.
    path = _write_state(tmp_path, {"storyboards": {}})
    s = Store(path)
    assert s.data["publishing"] == {}
    assert s.data["longform_jobs"] == {}
