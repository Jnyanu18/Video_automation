'use strict';
// Postiz adapter (against a fake Postiz API) and the provider-neutral LLM request builder. No real service is contacted.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const core = require('../lib/core.js');
const { createPostizAdapter, toPostizPost, toBlotatoStatus, mediaHandleUrl, parseMediaHandle } = require('../adapters/postiz/adapter.cjs');

// ---------- LLM request builder ----------
test('buildChatRequest defaults to strict json_schema (OpenAI)', () => {
  const p = core.buildContentPrompt({ caption: 'c', transcript: 't' }, core.cfgFromEnv({}), '');
  const r = core.buildChatRequest(p, core.cfgFromEnv({}), 'gpt-4o-mini');
  assert.equal(r.response_format.type, 'json_schema');
  assert.equal(r.model, 'gpt-4o-mini');
  assert.equal(r.messages.length, 2);
});

test('buildChatRequest json_object mode (Groq/Ollama) drops the schema and states the keys in the prompt', () => {
  const p = core.buildContentPrompt({ caption: 'c', transcript: 't' }, core.cfgFromEnv({}), '');
  const r = core.buildChatRequest(p, core.cfgFromEnv({ LLM_JSON_MODE: 'json_object' }), 'openai/gpt-oss-120b');
  assert.deepEqual(r.response_format, { type: 'json_object' });
  assert.match(r.messages[0].content, /hashtags \(array of strings\)/);
});

test('buildChatRequest none mode (Claude compat endpoint) sends no response_format', () => {
  const p = core.buildContentPrompt({ caption: 'c', transcript: 't' }, core.cfgFromEnv({}), '');
  const r = core.buildChatRequest(p, core.cfgFromEnv({ LLM_JSON_MODE: 'none' }), 'claude-sonnet-5-5');
  assert.equal(r.response_format, undefined);
  assert.match(r.messages[0].content, /no markdown/);
});

test('an unknown LLM_JSON_MODE falls back to json_schema', () => {
  const p = core.buildContentPrompt({ caption: 'c', transcript: 't' }, core.cfgFromEnv({}), '');
  assert.equal(core.buildChatRequest(p, core.cfgFromEnv({ LLM_JSON_MODE: 'bogus' }), 'm').response_format.type, 'json_schema');
});

test('open models that wrap JSON in code fences still parse', () => {
  assert.equal(core.parseLLMContent('```json\n{"script":"a","caption":"b","overlay":"c","hashtags":[]}\n```').ok, true);
});

// ---------- adapter resolution ----------
test('postiz adapter needs a localhost adapter URL and an integration id', () => {
  assert.equal(core.resolvePublishAdapter({ PUBLISH_ADAPTER: 'postiz' }).ok, false);
  const ok = core.resolvePublishAdapter({ PUBLISH_ADAPTER: 'postiz', POSTIZ_INTEGRATION_ID: 'int_1' });
  assert.equal(ok.ok, true);
  assert.equal(ok.baseUrl, 'http://127.0.0.1:8790');
  assert.equal(core.resolvePublishAdapter({ PUBLISH_ADAPTER: 'postiz', POSTIZ_INTEGRATION_ID: 'x', POSTIZ_ADAPTER_URL: 'https://evil.example' }).ok, false);
});

test('postiz media handles pass the media host check only for the postiz adapter', () => {
  const url = mediaHandleUrl({ id: 'u1', path: 'https://postiz.example/uploads/a.mp4' });
  assert.equal(core.isBlotatoMediaUrl(url, core.cfgFromEnv({ PUBLISH_ADAPTER: 'postiz' })), true);
  assert.equal(core.isBlotatoMediaUrl(url, core.cfgFromEnv({ PUBLISH_ADAPTER: 'mock' })), false);
  assert.deepEqual(parseMediaHandle(url), { id: 'u1', path: 'https://postiz.example/uploads/a.mp4' });
  assert.equal(parseMediaHandle('https://postiz.media/!!!'), null);
});

// ---------- pure mapping ----------
test('toPostizPost maps a Blotato-shaped body to a Postiz reel post', () => {
  const url = mediaHandleUrl({ id: 'u1', path: 'https://postiz.example/uploads/a.mp4' });
  const r = toPostizPost({ post: { accountId: 'int_1', content: { text: 'hello', mediaUrls: [url] } } }, 'instagram', '2026-01-01T00:00:00.000Z');
  assert.equal(r.ok, true);
  assert.equal(r.body.type, 'now');
  assert.equal(r.body.posts[0].integration.id, 'int_1');
  assert.deepEqual(r.body.posts[0].value[0].image, [{ id: 'u1', path: 'https://postiz.example/uploads/a.mp4' }]);
  assert.deepEqual(r.body.posts[0].settings, { __type: 'instagram', post_type: 'post' });
  assert.equal(toPostizPost({ post: { accountId: 'x', content: { text: 't', mediaUrls: ['https://other.example/x.mp4'] } } }).error, 'MEDIA_NOT_STAGED_THROUGH_ADAPTER');
  assert.equal(toPostizPost({ post: { accountId: 'x', content: { text: 't', mediaUrls: [] } } }).error, 'EXACTLY_ONE_VIDEO_REQUIRED');
});

test('toBlotatoStatus maps Postiz states', () => {
  assert.deepEqual(toBlotatoStatus({ state: 'PUBLISHED', releaseURL: 'https://instagram.com/reel/x/' }), { status: 'published', publicUrl: 'https://instagram.com/reel/x/' });
  assert.equal(toBlotatoStatus({ state: 'ERROR', error: 'bad media' }).status, 'failed');
  assert.equal(toBlotatoStatus({ state: 'QUEUE' }).status, 'in-progress');
  assert.equal(toBlotatoStatus(undefined).status, 'in-progress');
  // the workflow interprets these exactly like Blotato statuses
  assert.equal(core.interpretPublishPoll(toBlotatoStatus({ state: 'PUBLISHED', releaseURL: 'https://i.example/r/' }), { attempt: 0 }, core.cfgFromEnv({})).state, 'published');
  assert.equal(core.interpretPublishPoll(toBlotatoStatus({ state: 'ERROR', error: 'x' }), { attempt: 0 }, core.cfgFromEnv({})).state, 'failed');
  assert.equal(core.interpretPublishPoll(toBlotatoStatus({ state: 'QUEUE' }), { attempt: 0 }, core.cfgFromEnv({})).state, 'pending');
});

// ---------- end to end against a fake Postiz ----------
function fakePostiz() {
  const state = { posts: [], uploads: [], auth: [], bodies: [], listCalls: 0, failUpload: false };
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      const url = new URL(req.url, 'http://x');
      state.auth.push(req.headers.authorization);
      const json = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
      if (url.pathname === '/video.mp4') { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(Buffer.from('fakevideo')); }
      if (url.pathname === '/api/public/v1/integrations') return json(200, [{ id: 'int_1', identifier: 'instagram', name: 'Brand', disabled: false }, { id: 'int_x', identifier: 'x', name: 'X' }]);
      if (url.pathname === '/api/public/v1/upload') {
        if (state.failUpload) return json(500, {});
        state.uploads.push(raw.length);
        return json(200, { id: 'up_1', name: 'reel.mp4', path: 'http://postiz.local/uploads/reel.mp4' });
      }
      if (url.pathname === '/api/public/v1/posts' && req.method === 'POST') {
        const b = JSON.parse(raw.toString());
        state.bodies.push(b);
        const p = { id: 'post_' + (state.posts.length + 1) + '_abcdefgh', state: 'QUEUE' };
        state.posts.push(p);
        return json(200, [{ postId: p.id, integration: b.posts[0].integration.id }]);
      }
      if (url.pathname === '/api/public/v1/posts' && req.method === 'GET') { state.listCalls++; return json(200, { posts: state.posts }); }
      return json(404, {});
    });
  });
  return { server, state };
}

const listen = (s) => new Promise((r) => s.listen(0, '127.0.0.1', () => r('http://127.0.0.1:' + s.address().port)));
const call = async (base, method, path, body, headers) => {
  const r = await fetch(base + path, { method, headers: Object.assign(body ? { 'content-type': 'application/json' } : {}, headers || {}), body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json() };
};

test('adapter: accounts, stage media, create post, poll until published', async () => {
  const fp = fakePostiz();
  const pBase = await listen(fp.server);
  const { server } = createPostizAdapter({ apiUrl: pBase + '/api/public/v1', apiKey: 'postiz-key', token: 'shim-token', statusCacheSeconds: 0 });
  const base = await listen(server);
  const H = { authorization: 'shim-token' };
  try {
    assert.equal((await call(base, 'GET', '/v2/users/me/accounts')).status, 401);
    const acc = await call(base, 'GET', '/v2/users/me/accounts', null, H);
    assert.deepEqual(acc.body.items.map((i) => i.id), ['int_1']);

    const media = await call(base, 'POST', '/v2/media', { url: pBase + '/video.mp4' }, H);
    assert.equal(media.status, 200);
    assert.match(media.body.url, /^https:\/\/postiz\.media\//);
    assert.equal(fp.state.uploads.length, 1);

    const created = await call(base, 'POST', '/v2/posts', { post: { accountId: 'int_1', content: { text: 'cap #tag', mediaUrls: [media.body.url] } } }, H);
    assert.equal(created.status, 200);
    assert.equal(core.classifyPublishCreate(created.body, { attempt: 0 }, core.cfgFromEnv({})).kind, 'created');
    assert.equal(fp.state.bodies[0].posts[0].settings.__type, 'instagram');
    assert.equal(fp.state.bodies[0].posts[0].value[0].content, 'cap #tag');
    assert.ok(fp.state.auth.every((a) => a === 'postiz-key' || a === undefined), 'only the Postiz key is sent upstream');

    const id = created.body.postSubmissionId;
    assert.equal((await call(base, 'GET', '/v2/posts/' + id, null, H)).body.status, 'in-progress');
    fp.state.posts[0].state = 'PUBLISHED';
    fp.state.posts[0].releaseURL = 'https://www.instagram.com/reel/ABC/';
    const done = await call(base, 'GET', '/v2/posts/' + id, null, H);
    assert.deepEqual(done.body, { status: 'published', publicUrl: 'https://www.instagram.com/reel/ABC/' });
  } finally { server.close(); fp.server.close(); }
});

test('adapter: status polls are cached to respect the Postiz listing limit', async () => {
  const fp = fakePostiz();
  const pBase = await listen(fp.server);
  const { server } = createPostizAdapter({ apiUrl: pBase + '/api/public/v1', apiKey: 'k', statusCacheSeconds: 60 });
  const base = await listen(server);
  try {
    for (let i = 0; i < 5; i++) await call(base, 'GET', '/v2/posts/post_1_abcdefgh');
    assert.equal(fp.state.listCalls, 1);
  } finally { server.close(); fp.server.close(); }
});

test('adapter: rejects unknown or non-instagram accounts and surfaces upload failures', async () => {
  const fp = fakePostiz();
  const pBase = await listen(fp.server);
  const { server } = createPostizAdapter({ apiUrl: pBase + '/api/public/v1', apiKey: 'k', statusCacheSeconds: 0 });
  const base = await listen(server);
  try {
    const bad = await call(base, 'POST', '/v2/posts', { post: { accountId: 'nope', content: { text: 't', mediaUrls: [] } } });
    assert.equal(bad.status, 404);
    // a definite 4xx is "not created" for the workflow, so it is not retried
    assert.equal(core.classifyPublishCreate({ error: { message: 'x', httpCode: '404' } }, { attempt: 0 }, core.cfgFromEnv({})).kind !== 'created', true);
    fp.state.failUpload = true;
    const up = await call(base, 'POST', '/v2/media', { url: pBase + '/video.mp4' });
    assert.equal(up.status, 502);
    assert.equal(up.body.error, 'POSTIZ_UPLOAD_FAILED');
    assert.equal((await call(base, 'POST', '/v2/media', { url: 'ftp://x' })).status, 400);
  } finally { server.close(); fp.server.close(); }
});
