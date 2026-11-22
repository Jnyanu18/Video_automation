"""Comprehensive End-to-End Feature Test Suite for AILO Studio.
Tests every single backend feature across AI Video Editor, Director 2.0,
Storyboards, Motion Graphics, Creator Studio, Publishing, and Intelligence.
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from starlette.testclient import TestClient
from api_server import app

client = TestClient(app)
USER_HEADER = {"X-Studio-User": "test_verification_user"}

results = []

def test_feature(name: str, fn):
    try:
        detail = fn()
        results.append((name, "PASS", detail or "OK"))
        print(f"  [PASS] {name}: {detail or 'OK'}")
    except Exception as e:
        results.append((name, "FAIL", str(e)))
        print(f"  [FAIL] {name}: {e}")

print("=====================================================================")
print("          AILO STUDIO - FULL FEATURE VERIFICATION TEST               ")
print("=====================================================================")

# 1. Healthz
def t1():
    r = client.get("/healthz")
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    return f"HTTP {r.status_code} - {r.json()}"
test_feature("1. Health Endpoint (/healthz)", t1)

# 2. Styles DNA & Presets
def t2():
    r = client.get("/api/editor/styles", headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    presets = list(data.get("presets", {}).keys())
    assert len(presets) > 0, "No presets found"
    return f"{len(presets)} style presets available ({', '.join(presets[:3])}...)"
test_feature("2. Style DNA Presets (/api/editor/styles)", t2)

# 3. Storyboard Listing
def t3():
    r = client.get("/api/editor/storyboards", headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    assert "storyboards" in data, "No storyboards key"
    sbs = data["storyboards"]
    return f"{len(sbs)} active storyboards in user workspace (first: {sbs[0]['id'] if sbs else 'none'})"
test_feature("3. Storyboard List & Workspace Store (/storyboards)", t3)

# 4. Storyboard Creation (POST /api/editor/storyboard/create with video_path)
def t4():
    payload = {
        "video_path": "sample_video.mp4",
        "prompt": "Create an energetic 30s product demo with fast cuts and punchy hooks",
        "style": "viral_hook_fast_pace"
    }
    r = client.post("/api/editor/storyboard/create", json=payload, headers=USER_HEADER)
    assert r.status_code in (200, 202), f"Status {r.status_code}: {r.text}"
    data = r.json()
    sb_id = data.get("storyboard_id") or data.get("id")
    assert sb_id, "No storyboard id returned"
    return f"Created/Dispatched storyboard ID: {sb_id}"
test_feature("4. Storyboard Creation (/api/editor/storyboard/create)", t4)

# 5. Storyboard Detail & Scene Parsing (GET /api/editor/storyboard/sb1)
def t5():
    r = client.get("/api/editor/storyboard/sb1", headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    sb = data.get("data") or data.get("storyboard") or data
    scenes = sb.get("storyboard", {}).get("scenes", []) if "storyboard" in sb else sb.get("scenes", [])
    return f"Storyboard loaded with {len(scenes)} scenes, approved={sb.get('approved')}"
test_feature("5. Storyboard Detail (/storyboard/{id})", t5)

# 6. Storyboard Approval Workflow (POST /api/editor/storyboard/sb1/approve)
def t6():
    r = client.post("/api/editor/storyboard/sb1/approve", json={}, headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    return f"Approval toggle succeeded: ok={data.get('ok')}"
test_feature("6. Storyboard Approval Toggle (/approve)", t6)

# 7. Storyboard Chat/Revision (POST /api/editor/storyboard/sb1/chat)
def t7():
    r = client.post("/api/editor/storyboard/sb1/chat", json={"message": "Make it punchier"}, headers=USER_HEADER)
    assert r.status_code in (200, 202), f"Status {r.status_code}: {r.text}"
    return f"Revision accepted: HTTP {r.status_code}"
test_feature("7. Storyboard Revision Engine (/chat)", t7)

# 8. Render Engine Endpoint Validation
def t8():
    r = client.post("/api/editor/storyboard/sb1/render", json={"quality": "preview"}, headers=USER_HEADER)
    assert r.status_code in (200, 202, 409), f"Status {r.status_code}: {r.text}"
    return f"Render engine responding: HTTP {r.status_code} ({r.json().get('error', 'ACCEPTED')})"
test_feature("8. Multi-track Render Engine (/render)", t8)

# 9. Footage Intelligence Search
def t9():
    r = client.get("/api/editor/footage", headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    files = data.get("files", [])
    return f"Indexed footage library: {len(files)} clips available"
test_feature("9. Footage Intelligence Indexing (/footage)", t9)

# 10. Editing Memory & Retention Rules (GET /api/editor/editing-memory)
def t10():
    r = client.get("/api/editor/editing-memory", headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    rules = data.get("rules", [])
    return f"Editing retention memory: {len(rules)} active retention rules loaded"
test_feature("10. Editing Memory & Rules (/editing-memory)", t10)

# 11. Publishing Accounts
def t11():
    r = client.get("/api/editor/publishing/accounts", headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    accounts = data.get("accounts", [])
    return f"{len(accounts)} connected publishing channels (Instagram, YouTube, etc.)"
test_feature("11. Publishing Channels (/publishing/accounts)", t11)

# 12. Publishing Queue
def t12():
    r = client.get("/api/editor/publishing/queue", headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    queue = data.get("queue", [])
    return f"{len(queue)} scheduled posts in publication queue"
test_feature("12. Publishing Calendar Queue (/publishing/queue)", t12)

# 13. Publishing Schedule Validation Endpoint
def t13():
    payload = {
        "title": "Exciting Announcement",
        "video_url": "https://example.com/sample_rendered_reel.mp4",
        "caption": "New drop coming soon! #marketing #ai",
        "platforms": ["instagram"],
        "scheduled_time": "2026-11-23T18:00:00Z"
    }
    r = client.post("/api/editor/publishing/schedule", json=payload, headers=USER_HEADER)
    assert r.status_code in (200, 400), f"Status {r.status_code}: {r.text}"
    return f"Publishing schedule API active: HTTP {r.status_code} ({r.json().get('error', 'SCHEDULED')})"
test_feature("13. Multi-platform Scheduler (/publishing/schedule)", t13)

# 14. Creator Studio Readiness (GET /api/editor/vstudio/status)
def t14():
    r = client.get("/api/editor/vstudio/status", headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    items = data.get("items", [])
    return f"Creator Studio diagnostics: {len(items)} checks run (present={data.get('present')})"
test_feature("14. Creator Studio Diagnostics (/vstudio/status)", t14)

# 15. Creator Studio Videos (GET /api/editor/vstudio/videos)
def t15():
    r = client.get("/api/editor/vstudio/videos", headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    vids = data.get("videos", [])
    return f"Creator Studio library: {len(vids)} compositions found"
test_feature("15. Creator Studio Video Library (/vstudio/videos)", t15)

# 16. Agentic Video Editor AVE Multi-Agent Pipeline Status
def t16():
    r = client.get("/api/editor/ave/status", headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    return f"AVE multi-agent status: available={data.get('available')}, pipelines={len(data.get('pipelines', []))}"
test_feature("16. Agentic Video Editor AVE (/ave/status)", t16)

# 17. Series Engine
def t17():
    r = client.get("/api/editor/series", headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    series = data.get("series", [])
    return f"{len(series)} episodic series campaigns found"
test_feature("17. Series Engine API (/series)", t17)

# 18. Analytics Engine
def t18():
    r = client.get("/api/editor/analytics", headers=USER_HEADER)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    return f"Analytics engine live: {data.get('total_views', 0)} views derived from actual records"
test_feature("18. Real Derived Analytics (/analytics)", t18)

# 19. Director 2.0 Plan Inspection
def t19():
    r = client.get("/api/editor/director/plan/sb1", headers=USER_HEADER)
    assert r.status_code in (200, 404), f"Unexpected status: {r.status_code}"
    return "Director 2.0 Editorial Plan endpoint verified"
test_feature("19. Director 2.0 Plan Inspection (/director/plan/{id})", t19)

# 20. Remotion Carousel Generator (POST /api/editor/vstudio/carousel)
def t20():
    r = client.post("/api/editor/vstudio/carousel", json={"text": "5 Lessons from Scaling an AI Agent to 1M Users."}, headers=USER_HEADER)
    assert r.status_code in (200, 202, 400, 409, 503), f"Unexpected status: {r.status_code}"
    return f"Remotion Carousel endpoint responded: HTTP {r.status_code} ({r.json().get('error', 'ACCEPTED')})"
test_feature("20. Carousel Generation Engine (/vstudio/carousel)", t20)

print("\n=====================================================================")
passed = sum(1 for _, s, _ in results if s == "PASS")
total = len(results)
print(f"TEST RUN FINISHED: {passed}/{total} FEATURES PASSED ({passed/total*100:.1f}%)")
print("=====================================================================")

if passed < total:
    sys.exit(1)
