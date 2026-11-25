import urllib.request, http.cookiejar, json, time, sys

BASE = 'https://videoautomation-production-712a244d.up.railway.app'
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

results = []

def test_step(category, name, fn):
    try:
        t0 = time.time()
        detail = fn()
        dur = round((time.time() - t0) * 1000, 1)
        results.append({'cat': category, 'name': name, 'status': 'PASS', 'ms': dur, 'detail': detail or 'OK'})
        print(f'[PASS] {category} > {name} ({dur}ms): {detail or "OK"}')
    except Exception as e:
        results.append({'cat': category, 'name': name, 'status': 'FAIL', 'ms': 0, 'detail': str(e)})
        print(f'[FAIL] {category} > {name}: {e}')

csrf_token = None

# --- 1. AUTHENTICATION ---
def t_login():
    global csrf_token
    data = json.dumps({'email': 'jnyan8784@gmail.com', 'password': 'dev-password'}).encode('utf-8')
    req = urllib.request.Request(f'{BASE}/api/login', data=data, headers={'Content-Type': 'application/json'})
    res = opener.open(req)
    data = json.loads(res.read().decode())
    assert data.get('ok') is True, 'Login failed'
    csrf_token = data.get('csrfToken')
    assert csrf_token, 'Missing CSRF token'
    return f"User: {data.get('user', {}).get('name')}, CSRF token issued"

test_step('Auth', 'Login & Session Establishment', t_login)

def t_session():
    res = opener.open(f'{BASE}/api/session')
    data = json.loads(res.read().decode())
    assert data.get('ok') is True and data.get('authenticated') is True
    return f"Authenticated as {data.get('user', {}).get('email')}"

test_step('Auth', 'Session Verification (/api/session)', t_session)

# --- 2. CORE DASHBOARD & STATS ---
def t_overview():
    res = opener.open(f'{BASE}/api/editor/overview')
    data = json.loads(res.read().decode())
    assert data.get('ok') is True
    return f"Storyboards: {data.get('counts', {}).get('storyboards')}, Series: {data.get('counts', {}).get('series')}"

test_step('Dashboard', 'Overview Stats (/api/editor/overview)', t_overview)

def t_activity():
    res = opener.open(f'{BASE}/api/editor/activity')
    data = json.loads(res.read().decode())
    assert data.get('ok') is True
    return f"{len(data.get('events', []))} activity stream events logged"

test_step('Dashboard', 'Activity Stream (/api/editor/activity)', t_activity)

# --- 3. STORYBOARD ENGINE ---
active_sb_id = None

def t_sb_list():
    global active_sb_id
    res = opener.open(f'{BASE}/api/editor/storyboards')
    data = json.loads(res.read().decode())
    assert data.get('ok') is True
    sbs = data.get('storyboards', [])
    assert len(sbs) > 0, 'No storyboards found'
    active_sb_id = sbs[0]['id']
    return f"{len(sbs)} storyboards found (active: {active_sb_id})"

test_step('Storyboard', 'List Storyboards (/api/editor/storyboards)', t_sb_list)

def t_sb_get():
    res = opener.open(f'{BASE}/api/editor/storyboard/{active_sb_id}')
    data = json.loads(res.read().decode())
    assert data.get('ok') is True
    sb = data.get('data', {})
    scenes = sb.get('storyboard', {}).get('scenes_count', 0)
    return f"Title: {sb.get('storyboard', {}).get('title')}, Scenes: {scenes}, Status: {sb.get('status')}"

test_step('Storyboard', 'Get Storyboard Detail', t_sb_get)

def t_sb_scorecard():
    res = opener.open(f'{BASE}/api/editor/storyboard/{active_sb_id}/scorecard')
    data = json.loads(res.read().decode())
    assert data.get('ok') is True
    sc = data.get('scorecard', {})
    return f"Scorecard: {sc.get('status')} ({sc.get('score')})"

test_step('Storyboard', 'Objective Scorecard Check', t_sb_scorecard)

def t_sb_approve_unapprove():
    req1 = urllib.request.Request(f'{BASE}/api/editor/storyboard/{active_sb_id}/unapprove', data=b'{}',
                                  headers={'Content-Type': 'application/json', 'x-csrf-token': csrf_token})
    r1 = json.loads(opener.open(req1).read().decode())
    assert r1.get('data', {}).get('approved') is False, 'Unapprove failed'

    req2 = urllib.request.Request(f'{BASE}/api/editor/storyboard/{active_sb_id}/approve', data=b'{}',
                                  headers={'Content-Type': 'application/json', 'x-csrf-token': csrf_token})
    r2 = json.loads(opener.open(req2).read().decode())
    assert r2.get('data', {}).get('approved') is True, 'Approve failed'
    return 'Unapprove -> False, Approve -> True toggled smoothly'

test_step('Storyboard', 'Approval Toggle (Approve / Withdraw)', t_sb_approve_unapprove)

def t_sb_chat():
    msg = json.dumps({'message': 'Add karaoke captions and a subtle whoosh on opening hook'}).encode('utf-8')
    req = urllib.request.Request(f'{BASE}/api/editor/storyboard/{active_sb_id}/chat', data=msg,
                                 headers={'Content-Type': 'application/json', 'x-csrf-token': csrf_token})
    res = opener.open(req)
    assert res.status in (200, 202)
    data = json.loads(res.read().decode())
    return f"Revision accepted, status: {data.get('data', {}).get('status')}"

test_step('Storyboard', 'Gemini AI Storyboard Revision (/chat)', t_sb_chat)

def t_sb_render():
    msg = json.dumps({'quality': 'preview'}).encode('utf-8')
    req = urllib.request.Request(f'{BASE}/api/editor/storyboard/{active_sb_id}/render', data=msg,
                                 headers={'Content-Type': 'application/json', 'x-csrf-token': csrf_token})
    res = opener.open(req)
    assert res.status in (200, 202)
    rj = json.loads(res.read().decode()).get('render_job', {})
    return f"Render job: status={rj.get('status')}, quality={rj.get('quality')}"

test_step('Storyboard', 'Trigger Preview Render', t_sb_render)

# --- 4. VIDEO STREAMING & DELIVERY ---
def t_video_delivery():
    vid_url = None
    for _ in range(10):
        time.sleep(2)
        sb_data = json.loads(opener.open(f'{BASE}/api/editor/storyboard/{active_sb_id}').read().decode())['data']
        vid = sb_data.get('latest_preview') or sb_data.get('latest_render')
        if vid and vid.get('video_url'):
            vid_url = vid['video_url']
            break
    assert vid_url, 'No rendered video url available'
    stream_res = opener.open(f'{BASE}{vid_url}')
    assert stream_res.status == 200
    ctype = stream_res.headers.get('content-type')
    size = stream_res.headers.get('content-length')
    assert 'video' in ctype, f'Bad content type: {ctype}'
    return f"Streamed {vid_url} ({size} bytes, {ctype})"

test_step('Media Delivery', 'Rendered MP4 Video Delivery', t_video_delivery)

# --- 5. SOCIAL POSTS & PUBLISHING ---
def t_publishing_queue():
    res = opener.open(f'{BASE}/api/editor/publishing/queue')
    data = json.loads(res.read().decode())
    assert data.get('ok') is True
    return f"{len(data.get('queue', []))} posts scheduled in queue"

test_step('Publishing', 'Publishing Queue (/api/editor/publishing/queue)', t_publishing_queue)

def t_publishing_accounts():
    res = opener.open(f'{BASE}/api/editor/publishing/accounts')
    data = json.loads(res.read().decode())
    assert data.get('ok') is True
    platforms = [a.get('platform') for a in data.get('accounts', [])]
    return f"Connected platforms: {platforms}"

test_step('Publishing', 'Connected Social Accounts', t_publishing_accounts)

def t_post_generation():
    req = urllib.request.Request(f'{BASE}/api/editor/storyboard/{active_sb_id}/posts', data=b'{}',
                                 headers={'Content-Type': 'application/json', 'x-csrf-token': csrf_token})
    res = opener.open(req)
    data = json.loads(res.read().decode())
    assert data.get('ok') is True
    posts = data.get('posts', {})
    return f"Platforms generated: {list(posts.keys())}"

test_step('Publishing', 'AI Multi-Platform Post Generator', t_post_generation)

# --- 6. SERIES ENGINE ---
def t_series_list():
    res = opener.open(f'{BASE}/api/editor/series')
    data = json.loads(res.read().decode())
    assert data.get('ok') is True
    return f"{len(data.get('series', []))} episodic series configured"

test_step('Series Engine', 'Series Episodes List (/api/editor/series)', t_series_list)

# --- 7. EDITING MEMORY & STYLE DNA ---
def t_analytics():
    res = opener.open(f'{BASE}/api/editor/analytics')
    data = json.loads(res.read().decode())
    assert data.get('ok') is True
    return f"Analytics active for {data.get('counts', {}).get('storyboards')} storyboards"

test_step('Analytics', 'Performance Metrics & Insights', t_analytics)

def t_health():
    res = opener.open(f'{BASE}/api/editor/health')
    data = json.loads(res.read().decode())
    assert data.get('ok') is True
    services = data.get('services', [])
    online = [s['name'] for s in services if s.get('status') == 'ONLINE']
    return f"Online ({len(online)}/{len(services)}): {online[:4]}"

test_step('System Health', 'Integrations & Service Health Check', t_health)

# Summary
passed = sum(1 for r in results if r['status'] == 'PASS')
total = len(results)
print(f'\n======================================================')
print(f'FINAL AUDIT SUMMARY: {passed}/{total} TESTS PASSED ({(passed/total)*100:.1f}%)')
print(f'======================================================')
