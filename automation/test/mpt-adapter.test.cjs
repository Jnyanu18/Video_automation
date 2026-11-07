'use strict';
// MoneyPrinterTurbo adapter against a fake MoneyPrinterTurbo; the adapter output must satisfy workflow 04's own HeyGen checks.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const core = require('../lib/core.js');
const { createMptAdapter, toMptTask, keywordsFrom } = require('../adapters/mpt/adapter.cjs');

const listen = (s) => new Promise((r) => s.listen(0, '127.0.0.1', () => r('http://127.0.0.1:' + s.address().port)));

function fakeMpt() {
  const st = { tasks: new Map(), created: [], keys: [] };
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      st.keys.push(req.headers['x-api-key']);
      const url = new URL(req.url, 'http://x');
      const json = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
      if (req.headers['x-api-key'] !== 'mpt-key') return json(401, {});
      if (req.method === 'POST' && url.pathname === '/api/v1/videos') {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        st.created.push(body);
        const id = '11111111-2222-3333-4444-' + String(st.created.length).padStart(12, '0');
        st.tasks.set(id, { state: 4, progress: 20 });
        return json(200, { status: 200, data: { task_id: id } });
      }
      if (req.method === 'GET' && url.pathname === '/api/v1/tasks') return json(200, { status: 200, data: { tasks: [] } });
      const t = /^\/api\/v1\/tasks\/([\w-]+)$/.exec(url.pathname);
      if (t) {
        const task = st.tasks.get(t[1]);
        if (!task) return json(404, {});
        return json(200, { status: 200, data: Object.assign({ task_id: t[1] }, task) });
      }
      const d = /^\/api\/v1\/download\/([\w-]+)\/(final-1\.mp4)$/.exec(url.pathname);
      if (d) { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(Buffer.from('not-really-an-mp4')); }
      return json(404, {});
    });
  });
  return { server, st };
}

test('keywordsFrom picks frequent meaningful words and skips stopwords', () => {
  const k = keywordsFrom('Morning routines build habits. Habits shape your morning and your routines, routines everywhere', 3);
  assert.equal(k.length, 3);
  assert.deepEqual([...k].sort(), ['habits', 'morning', 'routines']);
  assert.ok(!k.includes('your') && !k.includes('and'));
});

test('toMptTask maps the HeyGen-shaped body and handles local sources', () => {
  const r = toMptTask({ script: 'Small habits compound quietly over time', title: 'Reel ig_x', voice_id: 'en-US-GuyNeural' }, { videoSource: 'pexels' });
  assert.equal(r.ok, true);
  assert.equal(r.task.video_aspect, '9:16');
  assert.equal(r.task.voice_name, 'en-US-GuyNeural');
  assert.equal(r.task.video_script, 'Small habits compound quietly over time');
  assert.equal(toMptTask({ script: '' }, {}).error, 'SCRIPT_MISSING');
  assert.equal(toMptTask({ script: 'x y z' }, { videoSource: 'local' }).error, 'LOCAL_MATERIALS_NOT_CONFIGURED');
  assert.deepEqual(toMptTask({ script: 'x y z' }, { videoSource: 'local', localMaterials: ['a.mp4'] }).task.video_materials, [{ provider: 'local', url: 'a.mp4', duration: 0 }]);
});

test('adapter: create is idempotent, polls to completed, publishes a public url and survives a restart', async () => {
  const fm = fakeMpt();
  const mBase = await listen(fm.server);
  const renderDir = fs.mkdtempSync(path.join(os.tmpdir(), 'renders-'));
  const mk = () => createMptAdapter({ mptUrl: mBase, mptApiKey: 'mpt-key', token: 'tok', publicBaseUrl: 'https://reels.example.com', renderDir, ffprobe: 'definitely-not-installed' });
  let a = mk();
  const base = await listen(a.server);
  const H = { 'x-api-key': 'tok', 'content-type': 'application/json' };
  const call = async (method, p, body, headers) => { const r = await fetch(base + p, { method, headers: headers || H, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json() }; };
  try {
    assert.equal((await call('GET', '/v3/users/me', null, {})).status, 401);
    assert.equal((await call('GET', '/v3/users/me')).body.data.username, 'moneyprinterturbo');

    const body = { type: 'avatar', avatar_id: 'mpt', voice_id: 'en-US-AriaNeural', script: 'Small habits compound quietly. Start today and keep going.', title: 'Reel ig_abc12' };
    const c1 = await call('POST', '/v3/videos', body, Object.assign({ 'idempotency-key': 'ig_abc12:heygen:fp:1' }, H));
    const c2 = await call('POST', '/v3/videos', body, Object.assign({ 'idempotency-key': 'ig_abc12:heygen:fp:1' }, H));
    assert.equal(c1.status, 200);
    assert.equal(c1.body.data.video_id, c2.body.data.video_id, 'same Idempotency-Key replays the same job');
    assert.equal(fm.st.created.length, 1, 'only one MoneyPrinterTurbo task was started');
    const id = c1.body.data.video_id;
    assert.match(id, /^[A-Za-z0-9_-]{4,100}$/, 'passes workflow 04 id check');

    const pending = await call('GET', '/v3/videos/' + id);
    assert.equal(core.interpretHeyGenStatus(pending.body, 1, core.cfgFromEnv({})).state, 'pending');

    fm.st.tasks.set(id, { state: 1, progress: 100, videos: ['/tasks/' + id + '/final-1.mp4'], audio_duration: 14 });
    const done = await call('GET', '/v3/videos/' + id);
    const r = core.interpretHeyGenStatus(done.body, 2, core.cfgFromEnv({}));
    assert.equal(r.state, 'completed');
    assert.match(r.videoUrl, /^https:\/\/reels\.example\.com\/render\/[a-f0-9]{32}\.mp4$/);
    assert.equal(core.validateVideo({ videoUrl: r.videoUrl, duration: r.duration }, core.cfgFromEnv({})).ok, true, 'passes workflow 04 video validation');
    const file = path.join(renderDir, r.videoUrl.split('/').pop());
    assert.equal(fs.readFileSync(file, 'utf8'), 'not-really-an-mp4');

    // a second poll reuses the same file; a restarted adapter remembers jobs and renders
    assert.equal((await call('GET', '/v3/videos/' + id)).body.data.video_url, r.videoUrl);
    a.server.close();
    a = mk();
    const base2 = await listen(a.server);
    const again = await (await fetch(base2 + '/v3/videos/' + id, { headers: H })).json();
    assert.equal(again.data.video_url, r.videoUrl);
    const replay = await (await fetch(base2 + '/v3/videos', { method: 'POST', headers: Object.assign({ 'idempotency-key': 'ig_abc12:heygen:fp:1' }, H), body: JSON.stringify(body) })).json();
    assert.equal(replay.data.video_id, id);
    a.server.close();
  } finally { a.server.close(); fm.server.close(); }
});

test('adapter: failed renders and bad configuration become failed statuses the workflow understands', async () => {
  const fm = fakeMpt();
  const mBase = await listen(fm.server);
  const renderDir = fs.mkdtempSync(path.join(os.tmpdir(), 'renders-'));
  const a = createMptAdapter({ mptUrl: mBase, mptApiKey: 'mpt-key', publicBaseUrl: '', renderDir });
  const base = await listen(a.server);
  const get = async (p) => (await fetch(base + p)).json();
  try {
    const created = await (await fetch(base + '/v3/videos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ script: 'A real script about habits and routines.' }) })).json();
    const id = created.data.video_id;
    fm.st.tasks.set(id, { state: -1, failed_stage: 'materials', error: 'no valid local video materials were found' });
    const failed = await get('/v3/videos/' + id);
    const r = core.interpretHeyGenStatus(failed, 1, core.cfgFromEnv({}));
    assert.equal(r.state, 'failed');
    assert.equal(r.code, 'MPT_MATERIALS');

    fm.st.tasks.set(id, { state: 1, videos: ['/tasks/' + id + '/final-1.mp4'] });
    const noBase = await get('/v3/videos/' + id);
    assert.equal(noBase.data.status, 'failed');
    assert.equal(noBase.data.failure_code, 'NO_PUBLIC_BASE_URL');

    assert.equal((await get('/v3/videos/unknownid1')).error, 'NOT_FOUND');
    const empty = await fetch(base + '/v3/videos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ script: '' }) });
    assert.equal(empty.status, 400);
  } finally { a.server.close(); fm.server.close(); }
});
