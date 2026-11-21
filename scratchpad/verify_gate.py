import json
import urllib.request
import urllib.error
import http.cookiejar
import sys
import os
import time
from pathlib import Path

BASE_NODE = "http://127.0.0.1:8787"
BASE_ENGINE = "http://127.0.0.1:8793"

results = {}

def log_test(name, passed, detail=""):
    results[name] = {"passed": passed, "detail": detail}
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name}: {detail}")

print("=== STARTING FULL GATE VERIFICATION ===")

# -------------------------------------------------------------
# D1-1: User records in users.json
# -------------------------------------------------------------
users_file = Path(r"J:\ai editor\new project - marketing automatio\new project - marketing automatio\automation\server\storage\users.json")
if not users_file.exists():
    log_test("D1-1_users_file_exists", False, "users.json not found")
else:
    u_data = json.loads(users_file.read_text(encoding="utf-8"))
    users = u_data.get("users", [])
    has_alice = any(u["email"] == "alice@pilot.test" for u in users)
    has_bob = any(u["email"] == "bob@pilot.test" for u in users)
    log_test("D1-1_users_stored", len(users) >= 2 and has_alice and has_bob,
             f"{len(users)} users in users.json (alice and bob present)")

# -------------------------------------------------------------
# D1-2: Multi-user login & sessions
# -------------------------------------------------------------
def make_client():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    return opener, cj

alice_client, alice_cj = make_client()
bob_client, bob_cj = make_client()

alice_csrf = None
bob_csrf = None

def login(client, email, password):
    req = urllib.request.Request(
        f"{BASE_NODE}/api/login",
        data=json.dumps({"email": email, "password": password}).encode("utf-8"),
        headers={"Content-Type": "application/json", "Origin": BASE_NODE}
    )
    try:
        with client.open(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

# Alice login
status_a, body_a = login(alice_client, "alice@pilot.test", "AlicePilotPassword123")
alice_ok = (status_a == 200 and body_a.get("ok") is True)
alice_user = body_a.get("user", {})
alice_csrf = body_a.get("csrfToken")
log_test("D1-2_alice_login", alice_ok, f"Alice login status={status_a}, user={alice_user}, csrf={bool(alice_csrf)}")

# Bob login
status_b, body_b = login(bob_client, "bob@pilot.test", "BobPilotPassword123")
bob_ok = (status_b == 200 and body_b.get("ok") is True)
bob_user = body_b.get("user", {})
bob_csrf = body_b.get("csrfToken")
log_test("D1-2_bob_login", bob_ok, f"Bob login status={status_b}, user={bob_user}, csrf={bool(bob_csrf)}")

# Separate sessions
def get_session(client):
    req = urllib.request.Request(f"{BASE_NODE}/api/session")
    with client.open(req, timeout=5) as resp:
        return json.loads(resp.read().decode())

sess_a = get_session(alice_client)
sess_b = get_session(bob_client)
separate = (sess_a.get("user", {}).get("id") == alice_user.get("id") and
            sess_b.get("user", {}).get("id") == bob_user.get("id") and
            alice_user.get("id") != bob_user.get("id"))
log_test("D1-2_separate_sessions", separate,
         f"Alice id={sess_a.get('user', {}).get('id')}, Bob id={sess_b.get('user', {}).get('id')}")

# -------------------------------------------------------------
# D1-4: Engine lockdown
# -------------------------------------------------------------
try:
    req = urllib.request.Request(f"{BASE_ENGINE}/api/editor/overview")
    with urllib.request.urlopen(req, timeout=3) as resp:
        log_test("D1-4_engine_rejects_unheadered", False, f"Returned {resp.status} instead of 401")
except urllib.error.HTTPError as e:
    log_test("D1-4_engine_rejects_unheadered", e.code == 401, f"Returned HTTP {e.code} for unheadered call")

# -------------------------------------------------------------
# Client request helper with CSRF
# -------------------------------------------------------------
def client_req(client, csrf, path, method="GET", body=None, extra_headers=None):
    headers = {"Content-Type": "application/json", "Origin": BASE_NODE}
    if csrf and method not in ("GET", "HEAD"):
        headers["X-CSRF-Token"] = csrf
    if extra_headers:
        headers.update(extra_headers)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(f"{BASE_NODE}{path}", data=data, headers=headers, method=method)
    try:
        with client.open(req, timeout=30) as resp:
            content = resp.read()
            try:
                return resp.status, json.loads(content.decode())
            except:
                return resp.status, content
    except urllib.error.HTTPError as e:
        content = e.read()
        try:
            return e.code, json.loads(content.decode())
        except:
            return e.code, content

# -------------------------------------------------------------
# D2-1: Motion storyboard creation
# -------------------------------------------------------------
status, sb_res = client_req(
    alice_client,
    alice_csrf,
    "/api/editor/motion/storyboard",
    method="POST",
    body={"prompt": "Fast, high-contrast motion reel for a pilot client. Three bold cuts.", "duration": 4.0}
)
alice_sb_id = sb_res.get("id") or (sb_res.get("storyboard") or {}).get("id")
log_test("D2-1_motion_storyboard_created", status == 200 and bool(alice_sb_id),
         f"Alice motion storyboard status={status}, id={alice_sb_id}")

status_bob_sb, b_sb_res = client_req(
    bob_client,
    bob_csrf,
    "/api/editor/motion/storyboard",
    method="POST",
    body={"prompt": "Confidential teaser for Bob client. Bold typography.", "duration": 4.0}
)
bob_sb_id = b_sb_res.get("id") or (b_sb_res.get("storyboard") or {}).get("id")
log_test("D2-1_bob_storyboard_created", status_bob_sb == 200 and bool(bob_sb_id),
         f"Bob motion storyboard status={status_bob_sb}, id={bob_sb_id}")

# -------------------------------------------------------------
# D1-3: Cross-tenant isolation probes
# -------------------------------------------------------------
# Probe P1: Alice tries to fetch Bob's storyboard by ID -> expect 404
st_cross, cross_body = client_req(alice_client, alice_csrf, f"/api/editor/storyboard/{bob_sb_id}")
log_test("D1-3_probe_P1_alice_reads_bob_sb", st_cross == 404,
         f"Alice GET Bob sb {bob_sb_id} -> returned HTTP {st_cross} (expected 404)")

# Probe P2: Bob tries to fetch Alice's storyboard by ID -> expect 404
st_cross_b, _ = client_req(bob_client, bob_csrf, f"/api/editor/storyboard/{alice_sb_id}")
log_test("D1-3_probe_P2_bob_reads_alice_sb", st_cross_b == 404,
         f"Bob GET Alice sb {alice_sb_id} -> returned HTTP {st_cross_b} (expected 404)")

# Probe P3: Storyboard listings are isolated
st_list_a, list_a = client_req(alice_client, alice_csrf, "/api/editor/storyboards")
items_a = list_a.get("storyboards", []) if isinstance(list_a, dict) else list_a
a_has_bob = any(s.get("id") == bob_sb_id for s in items_a)
a_has_alice = any(s.get("id") == alice_sb_id for s in items_a)
log_test("D1-3_probe_P3_listing_isolation", (not a_has_bob and a_has_alice),
         f"Alice list count={len(items_a)}, Bob sb present={a_has_bob}, Alice sb present={a_has_alice}")

# Probe P4: Forged X-Studio-User header stripped by Node
st_forge, forge_res = client_req(
    alice_client,
    alice_csrf,
    f"/api/editor/storyboard/{bob_sb_id}",
    extra_headers={"X-Studio-User": bob_user.get("id")}
)
log_test("D1-3_probe_P4_forged_header_stripped", st_forge == 404,
         f"Alice with forged header X-Studio-User:{bob_user.get('id')} -> returned HTTP {st_forge} (expected 404)")

# -------------------------------------------------------------
# D2-2: Approval Gate Reuse
# -------------------------------------------------------------
# Attempt final render of Alice's storyboard before approval -> expect 409 NOT_APPROVED
st_rend_pre, rend_pre = client_req(
    alice_client,
    alice_csrf,
    f"/api/editor/storyboard/{alice_sb_id}/render",
    method="POST",
    body={"quality": "final"}
)
log_test("D2-2_render_unapproved_refused", st_rend_pre == 409,
         f"Render before approval returned HTTP {st_rend_pre} (expected 409 NOT_APPROVED)")

# Now Approve Alice's storyboard
st_appr, appr_res = client_req(
    alice_client,
    alice_csrf,
    f"/api/editor/storyboard/{alice_sb_id}/approve",
    method="POST"
)
log_test("D2-2_approve_storyboard", st_appr == 200, f"Approve returned HTTP {st_appr}")

# -------------------------------------------------------------
# D2-3: Dashboard lane split
# -------------------------------------------------------------
st_ov, ov_res = client_req(alice_client, alice_csrf, "/api/editor/overview")
kpis = ov_res.get("kpis", {})
lanes = ov_res.get("lanes", [])
motion_count = next((l["count"] for l in lanes if "motion" in l["label"].lower()), None)
footage_count = next((l["count"] for l in lanes if "footage" in l["label"].lower()), None)
log_test("D2-3_dashboard_lane_split", motion_count is not None and footage_count is not None,
         f"Lanes overview: {lanes}, KPIs: {kpis}")

# -------------------------------------------------------------
# Throttling test (at the end so IP isn't throttled during main checks)
# -------------------------------------------------------------
throttled = False
throttle_client, _ = make_client()
for attempt in range(1, 8):
    st, resp = login(throttle_client, "alice@pilot.test", f"WrongPassword_{attempt}")
    if st == 429:
        throttled = True
        log_test("D1-2_login_throttling", True, f"Throttled with 429 at attempt {attempt}")
        break
if not throttled:
    log_test("D1-2_login_throttling", False, "Never throttled with 429 across 7 attempts")

# Summary
total = len(results)
passed = sum(1 for r in results.values() if r["passed"])
print(f"\n=== GATE RESULT: {passed}/{total} PROBES PASSED ===")
if passed == total:
    print("ALL GATE PROBES PASSED!")
    sys.exit(0)
else:
    print("SOME PROBES FAILED!")
    sys.exit(1)
