'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHiggsfieldAdapter, toHiggsfieldTask, authHeader } = require('../adapters/higgsfield/adapter.cjs');

const listen = (s) => new Promise((r) => s.listen(0, '127.0.0.1', () => r('http://127.0.0.1:' + s.address().port)));

function fakeHiggsfield() {
  const st = { requests: new Map(), created: [], authHeaders: [] };
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      st.authHeaders.push(req.headers.authorization);
      const url = new URL(req.url, 'http://x');
      const json = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };

      const mDl = /^\/mock-download\/([\w.-]+)$/.exec(url.pathname);
      if (mDl) {
        res.writeHead(200, { 'content-type': 'video/mp4' });
        return res.end(Buffer.from('fake-mp4-data-for-higgsfield'));
      }

      if (req.headers.authorization !== 'Key test-key-id:test-secret') {
        return json(401, { error: 'UNAUTHORIZED' });
      }

      if (req.method === 'GET' && url.pathname === '/v1/models') {
        return json(200, { data: [{ id: 'kling-v3' }] });
      }

      if (req.method === 'POST' && url.pathname === '/v1/text-to-video') {
        const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
        st.created.push(body);
        const reqId = 'hf_req_' + String(st.created.length).padStart(8, '0');
        st.requests.set(reqId, { status: 'processing', progress: 40 });
        return json(200, { request_id: reqId, status: 'processing' });
      }

      const mStatus = /^\/v1\/requests\/([\w-]+)\/status$/.exec(url.pathname);
      if (mStatus) {
        const item = st.requests.get(mStatus[1]);
        if (!item) return json(404, { error: 'NOT_FOUND' });
        return json(200, item);
      }

      const mReq = /^\/v1\/requests\/([\w-]+)$/.exec(url.pathname);
      if (mReq) {
        const item = st.requests.get(mReq[1]);
        if (!item) return json(404, { error: 'NOT_FOUND' });
        return json(200, item);
      }

      return json(404, { error: 'NOT_FOUND' });
    });
  });
  return { server, st };
}

test('authHeader handles Key prefix cleanly', () => {
  assert.equal(authHeader(''), '');
  assert.equal(authHeader('id:secret'), 'Key id:secret');
  assert.equal(authHeader('Key id:secret'), 'Key id:secret');
  assert.equal(authHeader('key id:secret'), 'key id:secret');
});

test('toHiggsfieldTask prefers visual_prompt over script and formats 9:16', () => {
  const t1 = toHiggsfieldTask({ script: 'Voice script', visual_prompt: 'Cinematic drone shot over city at night' }, { model: 'kling-v3' });
  assert.equal(t1.ok, true);
  assert.equal(t1.task.prompt, 'Cinematic drone shot over city at night');
  assert.equal(t1.task.aspect_ratio, '9:16');
  assert.equal(t1.task.model, 'kling-v3');

  const t2 = toHiggsfieldTask({ script: 'Voice script only' }, {});
  assert.equal(t2.ok, true);
  assert.equal(t2.task.prompt, 'Voice script only');

  const t3 = toHiggsfieldTask({}, {});
  assert.equal(t3.ok, false);
  assert.equal(t3.error, 'PROMPT_MISSING');
});

test('Higgsfield adapter lifecycle: health, submit, idempotency, poll, download', async () => {
  const fake = fakeHiggsfield();
  const fakeUrl = await listen(fake.server);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-test-'));

  const adapter = createHiggsfieldAdapter({
    apiKey: 'test-key-id:test-secret',
    baseUrl: fakeUrl,
    model: 'kling-v3',
    duration: 5,
    token: 'my-adapter-token',
    publicBaseUrl: 'https://public.example.com',
    renderDir: tmpDir,
    ffprobe: 'fake-nonexistent-ffprobe',
  });
  const adapterUrl = await listen(adapter.server);

  try {
    // 1. Healthz
    const h = await fetch(adapterUrl + '/healthz');
    assert.equal(h.status, 200);

    // 2. Token auth check
    const badAuth = await fetch(adapterUrl + '/v3/users/me', { headers: { 'x-api-key': 'wrong' } });
    assert.equal(badAuth.status, 401);

    // 3. GET /v3/users/me
    const me = await fetch(adapterUrl + '/v3/users/me', { headers: { 'x-api-key': 'my-adapter-token' } });
    assert.equal(me.status, 200);
    const meJson = await me.json();
    assert.equal(meJson.data.username, 'higgsfield');

    // 4. POST /v3/videos
    const createRes = await fetch(adapterUrl + '/v3/videos', {
      method: 'POST',
      headers: {
        'x-api-key': 'my-adapter-token',
        'content-type': 'application/json',
        'idempotency-key': 'idem-hf-1',
      },
      body: JSON.stringify({
        visual_prompt: 'High-speed camera tracking a supercar in neon rain',
        script: 'Listen closely.',
      }),
    });
    assert.equal(createRes.status, 200);
    const createData = await createRes.json();
    assert.ok(createData.data.video_id);
    const videoId = createData.data.video_id;

    // 5. Idempotency test
    const reCreate = await fetch(adapterUrl + '/v3/videos', {
      method: 'POST',
      headers: {
        'x-api-key': 'my-adapter-token',
        'content-type': 'application/json',
        'idempotency-key': 'idem-hf-1',
      },
      body: JSON.stringify({ visual_prompt: 'Different prompt' }),
    });
    const reData = await reCreate.json();
    assert.equal(reData.data.video_id, videoId);
    assert.equal(fake.st.created.length, 1); // Not duplicated

    // 6. Poll processing status
    const poll1 = await fetch(adapterUrl + '/v3/videos/' + videoId, { headers: { 'x-api-key': 'my-adapter-token' } });
    assert.equal(poll1.status, 200);
    const poll1Data = await poll1.json();
    assert.equal(poll1Data.data.status, 'processing');

    // 7. Update status to completed on fake server
    fake.st.requests.set(videoId, {
      status: 'completed',
      video_url: fakeUrl + '/mock-download/final.mp4',
    });

    // 8. Poll again -> adapter downloads and finalizes
    const poll2 = await fetch(adapterUrl + '/v3/videos/' + videoId, { headers: { 'x-api-key': 'my-adapter-token' } });
    assert.equal(poll2.status, 200);
    const poll2Data = await poll2.json();
    assert.equal(poll2Data.data.status, 'completed');
    assert.ok(poll2Data.data.video_url.startsWith('https://public.example.com/render/'));
    assert.equal(poll2Data.data.duration, 5);

    // 9. Verify downloaded file exists
    const filename = path.basename(poll2Data.data.video_url);
    assert.ok(fs.existsSync(path.join(tmpDir, filename)));

  } finally {
    adapter.server.close();
    fake.server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
