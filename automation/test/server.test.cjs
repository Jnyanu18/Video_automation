'use strict';
// Dashboard backend against the mock providers and the simulated n8n runtime (real HTTP between all three).
// Mock-tested only: no real Airtable, Apify, OpenAI, HeyGen, Blotato, Instagram or n8n is contacted.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createMock, GOOD, BASE_TRANSCRIPT } = require('../mock/mock-server.cjs');
const { createSimN8n } = require('../mock/sim-n8n-server.cjs');
const { loadConfig } = require('../server/config.cjs');
const { createApp } = require('../server/app.cjs');
const { hashPassword, verifyHash } = require('../server/auth.cjs');
const { buildTestMp4, probeMp4 } = require('../server/mp4.cjs');
const core = require('../lib/core.js');

const PASSWORD = 'correct horse battery staple';
const SECRET = 's'.repeat(48);
const mock = createMock();
let sim;
let app;
let base;
let tmp;
let webDir;
const extraApps = [];

const backendEnv = (over) => ({
  PORT: '0', HOST: '127.0.0.1', DASHBOARD_PASSWORD: PASSWORD, SESSION_SECRET: SECRET,
  N8N_WEBHOOK_BASE: sim.url, N8N_INTAKE_TOKEN: sim.tokens.intake, N8N_APPROVAL_TOKEN: sim.tokens.approval, N8N_INTERNAL_TOKEN: sim.tokens.internal,
  AIRTABLE_BASE_URL: mock.url, AIRTABLE_BASE_ID: 'appSIM', AIRTABLE_TABLE: 'Reels', AIRTABLE_READ_TOKEN: 'sim-airtable',
  PUBLIC_BASE_URL: 'https://reels.example.test', UPLOAD_DIR: path.join(tmp, 'uploads-' + Math.random().toString(36).slice(2)), WEB_DIR: webDir,
  RECORD_CACHE_MS: '0', LIVE_POLL_ACTIVE_MS: '150', LIVE_POLL_IDLE_MS: '150', ...over,
});

async function startBackend(over) {
  const cfg = loadConfig(backendEnv(over));
  cfg.quiet = true;
  assert.deepEqual(cfg.problems, []);
  const a = createApp(cfg);
  const addr = await a.listen();
  return { app: a, cfg, base: `http://127.0.0.1:${addr.port}` };
}

test.before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reels-dash-'));
  webDir = path.join(tmp, 'web');
  fs.mkdirSync(path.join(webDir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(webDir, 'index.html'), '<!doctype html><title>Reels</title><div id="root"></div>');
  fs.writeFileSync(path.join(webDir, 'assets', 'app.js'), 'console.log(1)');
  await mock.listen();
  sim = createSimN8n({ mockUrl: mock.url });
  sim.url = await sim.listen();
  const b = await startBackend();
  app = b.app;
  base = b.base;
});
test.after(async () => {
  for (const a of extraApps) await a.close();
  await app.close();
  await sim.close();
  await mock.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});
let testNo = 0;
// ids restart after reset(); keep them unique so the backend's per-record guards from earlier tests never apply
test.beforeEach(() => { mock.reset(); mock.state.seq = ++testNo * 1000; });

// ---------------------------------------------------------------- client helpers
class Client {
  constructor(url) {
    this.url = url || base;
    this.cookie = '';
    this.csrf = '';
  }

  async raw(method, p, opts) {
    const o = opts || {};
    const headers = Object.assign({}, o.headers);
    if (this.cookie) headers.cookie = this.cookie;
    if (this.csrf && method !== 'GET') headers['x-csrf-token'] = this.csrf;
    Object.assign(headers, o.headers);
    let body = o.rawBody;
    if (o.body !== undefined) {
      body = JSON.stringify(o.body);
      headers['content-type'] = 'application/json';
    }
    return fetch(this.url + p, { method, headers, body });
  }

  async call(method, p, body, headers) {
    const res = await this.raw(method, p, { body, headers });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* not json */ }
    return { status: res.status, body: json, text, headers: res.headers };
  }

  get(p) { return this.call('GET', p); }
  post(p, body, headers) { return this.call('POST', p, body === undefined ? {} : body, headers); }

  async login(password) {
    const r = await this.call('POST', '/api/login', { password: password || PASSWORD, name: 'alice' });
    if (r.status === 200) {
      this.cookie = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
      this.csrf = r.body.csrfToken;
    }
    return r;
  }
}

async function authed() {
  const c = new Client();
  const r = await c.login();
  assert.equal(r.status, 200);
  return c;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const calls = (svc) => mock.state.calls.filter((c) => c.svc === svc);
const posts = (svc, p) => calls(svc).filter((c) => c.method === 'POST' && (!p || c.path === p));
const SECRET_STRINGS = ['sim-airtable', 'sim-apify', 'sim-openai', 'sim-heygen', 'sim-blotato', 'dev-intake-token', 'dev-internal-token', 'dev-approval-token', PASSWORD, SECRET];
const noSecrets = (text) => SECRET_STRINGS.forEach((s) => assert.ok(!text.includes(s), 'leaked: ' + s));

function seed(code, extra) {
  const now = new Date().toISOString();
  const id = 'rec' + code.replace(/[^A-Za-z0-9]/g, '').padEnd(10, '0');
  const rec = {
    id, createdTime: now,
    fields: Object.assign({
      ReelKey: 'ig_' + code, ReelURL: `https://www.instagram.com/reel/${code}/`, Status: 'AWAITING_APPROVAL', ExtractionDone: true,
      SourceCaption: 'Morning routine tips', SourceTranscript: BASE_TRANSCRIPT, TranscriptSource: 'apify', ContentAttempts: 1, RetryCount: 0,
      Script: GOOD.script, Caption: GOOD.caption, Overlay: GOOD.overlay, Hashtags: GOOD.hashtags.map((t) => '#' + t).join(' '),
      VideoAttempt: 0, CreatedTime: now, ModifiedTime: now, SourceType: 'reel',
    }, extra),
  };
  mock.state.records.set(id, rec);
  return rec;
}

async function createReel(c, code, extra) {
  const r = await c.post('/api/reels', Object.assign({ url: `https://www.instagram.com/reel/${code}/` }, extra));
  assert.ok([200, 202].includes(r.status), JSON.stringify(r.body));
  await sim.runner.idle();
  return r.body.recordId;
}
const detail = async (c, id) => (await c.get('/api/reels/' + id)).body.reel;
const mp4 = (sec, o) => buildTestMp4(sec === undefined ? 24 : sec, o);
const uploadFile = (c, buf, name, type) => c.raw('POST', '/api/uploads', { rawBody: buf, headers: { 'content-type': type || 'video/mp4', 'x-file-name': encodeURIComponent(name || 'promo clip.mp4') } })
  .then(async (res) => ({ status: res.status, body: await res.json() }));

// ---------------------------------------------------------------- authentication
test('every API route except login and session requires sign-in', async () => {
  const c = new Client();
  for (const p of ['/api/summary', '/api/reels', '/api/reels/recABCDEFGHIJ', '/api/settings', '/api/options', '/api/events']) assert.equal((await c.get(p)).status, 401, p);
  for (const p of ['/api/reels', '/api/reels/upload', '/api/uploads', '/api/reels/recABCDEFGHIJ/approve', '/api/logout']) assert.equal((await c.post(p, {})).status, 401, p);
  const s = await c.get('/api/session');
  assert.deepEqual([s.status, s.body.authenticated], [200, false]);
});

test('login sets an HttpOnly SameSite=Strict cookie, wrong passwords are refused', async () => {
  const c = new Client();
  assert.equal((await c.login('wrong password')).status, 401);
  const ok = await c.call('POST', '/api/login', { password: PASSWORD, name: 'alice' });
  assert.equal(ok.status, 200);
  const cookie = ok.headers.getSetCookie()[0];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/, 'PUBLIC_BASE_URL is https, so the cookie is Secure');
  assert.equal(ok.body.user.name, 'alice');
  c.cookie = cookie.split(';')[0];
  c.csrf = ok.body.csrfToken;
  const s = await c.get('/api/session');
  assert.deepEqual([s.body.authenticated, s.body.user.name], [true, 'alice']);
  noSecrets(ok.text);
});

test('state-changing calls need the CSRF token and a same-origin Origin header', async () => {
  const c = await authed();
  const noCsrf = await c.call('POST', '/api/logout', {}, { 'x-csrf-token': 'nope' });
  assert.equal(noCsrf.status, 403);
  const res = await fetch(base + '/api/reels', { method: 'POST', headers: { cookie: c.cookie, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, 'CSRF_FAILED');
  const cross = await c.call('POST', '/api/reels', { url: 'x' }, { origin: 'https://evil.example' });
  assert.deepEqual([cross.status, cross.body.error], [403, 'BAD_ORIGIN']);
});

test('logout revokes the session', async () => {
  const c = await authed();
  assert.equal((await c.post('/api/logout')).status, 200);
  assert.equal((await c.get('/api/summary')).status, 401);
});

test('repeated wrong passwords are throttled per client', async () => {
  const b = await startBackend();
  extraApps.push(b.app);
  const c = new Client(b.base);
  const results = [];
  for (let i = 0; i < 6; i++) results.push((await c.login('bad-' + i)).status);
  assert.deepEqual(results, [401, 401, 401, 401, 401, 429]);
  assert.equal((await c.login(PASSWORD)).status, 429, 'even the right password waits out the lockout');
});

test('password hashing uses salted scrypt and the config refuses weak production settings', () => {
  const h = hashPassword('a long enough password');
  assert.match(h, /^scrypt\$/);
  assert.ok(verifyHash('a long enough password', h));
  assert.ok(!verifyHash('another password', h));
  assert.notEqual(h, hashPassword('a long enough password'));
  const prod = loadConfig({ NODE_ENV: 'production', DASHBOARD_PASSWORD: 'plain', SESSION_SECRET: 'short' });
  assert.equal(prod.problems.length, 2);
  assert.equal(loadConfig({ NODE_ENV: 'production', DASHBOARD_PASSWORD_HASH: h, SESSION_SECRET: SECRET }).problems.length, 0);
});

// ---------------------------------------------------------------- listing, summary, detail
test('summary, history filters and pagination reflect real Airtable records', async () => {
  const c = await authed();
  seed('AWAIT00001');
  seed('AWAIT00002');
  seed('GEN0000001', { Status: 'VIDEO_GENERATING' });
  seed('READY00001', { Status: 'VIDEO_COMPLETED' });
  seed('PUB0000001', { Status: 'PUBLISHED', PublishedURL: 'https://www.instagram.com/reel/ZZZ/' });
  seed('FAILED0001', { Status: 'FAILED', FailedFromState: 'VIDEO_GENERATING', ErrorLog: '[2026-01-01T00:00:00.000Z] {"source":"HeyGen","code":"UPSTREAM_ERROR","message":"HeyGen down","retryable":true,"httpStatus":503}' });
  const s = (await c.get('/api/summary')).body;
  assert.deepEqual(s.totals, { submitted: 6, awaitingApproval: 2, generating: 1, readyToPublish: 1, published: 1, failed: 1, rejected: 0 });
  assert.equal(s.recent.length, 6);

  const list = (await c.get('/api/reels?status=AWAITING_APPROVAL')).body;
  assert.deepEqual([list.total, list.items.length], [2, 2]);
  assert.equal(list.counts.FAILED, 1);
  const failed = (await c.get('/api/reels?status=FAILED')).body.items[0];
  assert.deepEqual([failed.error.code, failed.error.message, failed.retryable], ['UPSTREAM_ERROR', 'HeyGen down', true]);
  assert.equal((await c.get('/api/reels?q=PUB0000001')).body.total, 1);
  const p1 = (await c.get('/api/reels?pageSize=4&page=1')).body;
  const p2 = (await c.get('/api/reels?pageSize=4&page=2')).body;
  assert.deepEqual([p1.items.length, p2.items.length, p1.pages], [4, 2, 2]);
  assert.equal((await c.get('/api/reels?pageSize=4&page=99')).body.page, 2, 'page is clamped');
  noSecrets(JSON.stringify([s, list, p1]));
});

test('reel detail exposes content, fingerprint, workflow progress and which actions are allowed', async () => {
  const c = await authed();
  const rec = seed('DETAIL0001', { Niche: 'fitness', BrandVoice: 'Playful' });
  const d = await detail(c, rec.id);
  assert.equal(d.status, 'AWAITING_APPROVAL');
  assert.equal(d.fingerprint, core.contentFingerprint(core.recordFromAirtable(rec)));
  assert.deepEqual([d.content.script, d.content.overlay], [GOOD.script, GOOD.overlay]);
  assert.deepEqual(d.progress.map((s) => [s.key, s.state]), [['intake', 'done'], ['extraction', 'done'], ['content', 'done'], ['approval', 'waiting'], ['video', 'pending'], ['publish', 'pending']]);
  assert.deepEqual([d.actions.approve.allowed, d.actions.edit.allowed, d.actions.reject.allowed, d.actions.regenerate.allowed], [true, true, true, true]);
  assert.deepEqual([d.actions.publish.allowed, d.actions.retry.allowed], [false, false]);
  assert.equal(d.actions.publish.reason, 'INVALID_STATE');
  assert.equal((await c.get('/api/reels/recDOESNOTEXIST')).status, 404);
  assert.equal((await c.get('/api/reels/not-an-id')).status, 404);
});

test('only https URLs are ever handed to the browser', async () => {
  const c = await authed();
  const rec = seed('XSSCHECK01', { Status: 'VIDEO_COMPLETED', VideoURL: 'javascript:alert(1)', ThumbnailURL: 'http://insecure.test/x.png', ReelURL: 'javascript:alert(2)' });
  const d = await detail(c, rec.id);
  assert.deepEqual([d.video.url, d.video.thumbnailUrl, d.reelUrl], ['', '', '']);
});

// ---------------------------------------------------------------- submit, review, approve, generate, publish
test('submitting a Reel URL runs extraction and AI generation and stops at approval', async () => {
  const c = await authed();
  const id = await createReel(c, 'SUBMIT00001', { niche: 'fitness', brandVoice: 'Playful', avatarId: 'avatar_mock_ben', voiceId: 'voice_mock_en_m' });
  const d = await detail(c, id);
  assert.deepEqual([d.status, d.niche, d.brandVoice, d.avatarId, d.submittedBy], ['AWAITING_APPROVAL', 'fitness', 'Playful', 'avatar_mock_ben', 'alice']);
  assert.ok(d.content.script.length > 20);
  assert.equal(posts('heygen').length, 0, 'HeyGen is not called before approval');
  assert.equal(calls('blotato').length, 0);
});

test('invalid URLs, options and unknown avatars are rejected before anything is created', async () => {
  const c = await authed();
  const bad = await c.post('/api/reels', { url: 'https://example.com/video' });
  assert.deepEqual([bad.status, bad.body.error], [400, 'INVALID_URL']);
  assert.equal((await c.post('/api/reels', { url: 'https://www.instagram.com/reel/GOODCODE01/', niche: 'x'.repeat(80) })).body.error, 'INVALID_OPTIONS');
  const noAvatar = await c.post('/api/reels', { url: 'https://www.instagram.com/reel/GOODCODE01/', avatarId: 'avatar_does_not_exist' });
  assert.deepEqual([noAvatar.status, noAvatar.body.error], [400, 'AVATAR_NOT_FOUND']);
  assert.equal((await c.post('/api/reels', { url: 'https://www.instagram.com/reel/GOODCODE01/', voiceId: 'nope_voice' })).body.error, 'VOICE_NOT_FOUND');
  assert.equal(mock.records().length, 0);
  assert.equal(posts('airtable').length, 0);
});

test('a missing default avatar must be chosen by the operator', async () => {
  const noDefault = createSimN8n({ mockUrl: mock.url, env: { HEYGEN_AVATAR_ID: '', HEYGEN_VOICE_ID: '' } });
  const url = await noDefault.listen();
  const b = await startBackend({ N8N_WEBHOOK_BASE: url, N8N_INTAKE_TOKEN: noDefault.tokens.intake, N8N_APPROVAL_TOKEN: noDefault.tokens.approval, N8N_INTERNAL_TOKEN: noDefault.tokens.internal });
  const c = new Client(b.base);
  await c.login();
  const r = await c.post('/api/reels', { url: 'https://www.instagram.com/reel/NODEFAULT01/' });
  assert.deepEqual([r.status, r.body.error], [400, 'AVATAR_REQUIRED']);
  const ok = await c.post('/api/reels', { url: 'https://www.instagram.com/reel/NODEFAULT01/', avatarId: 'avatar_mock_anna', voiceId: 'voice_mock_en_f' });
  assert.equal(ok.status, 202);
  await noDefault.runner.idle();
  await b.app.close();
  await noDefault.close();
});

test('double submission of the same Reel never creates two records', async () => {
  const c = await authed();
  mock.state.latencyMs = 15;
  const url = 'https://www.instagram.com/reel/DOUBLE00001/';
  const rs = await Promise.all([c.post('/api/reels', { url }), c.post('/api/reels', { url }), c.post('/api/reels', { url })]);
  await sim.runner.idle();
  assert.equal(mock.records().filter((r) => r.fields.ReelKey === 'ig_DOUBLE00001').length, 1);
  assert.ok(rs.some((r) => r.status === 202));
  const again = await c.post('/api/reels', { url });
  assert.deepEqual([again.status, again.body.duplicate], [200, true]);
  assert.equal(calls('apify').length, 1);
});

test('editing, stale-content protection, rejection reasons and regeneration work through the real workflows', async () => {
  const c = await authed();
  const id = await createReel(c, 'REVIEW00001');
  let d = await detail(c, id);
  const edited = await c.post(`/api/reels/${id}/edit`, { expectedFingerprint: d.fingerprint, overlay: 'Edited overlay' });
  assert.equal(edited.status, 200);
  assert.notEqual(edited.body.fingerprint, d.fingerprint);
  const stale = await c.post(`/api/reels/${id}/approve`, { expectedFingerprint: d.fingerprint });
  assert.deepEqual([stale.status, stale.body.error], [409, 'STALE_CONTENT']);
  assert.equal((await c.post(`/api/reels/${id}/reject`, { expectedFingerprint: edited.body.fingerprint })).status, 400, 'a reason is required');
  const regen = await c.post(`/api/reels/${id}/regenerate`, { expectedFingerprint: edited.body.fingerprint, note: 'More energetic' });
  assert.equal(regen.status, 202);
  await sim.runner.idle();
  d = await detail(c, id);
  assert.deepEqual([d.status, d.approval.regenerationCount], ['AWAITING_APPROVAL', 1]);
  assert.equal((await c.post(`/api/reels/${id}/reject`, { expectedFingerprint: d.fingerprint, reason: 'Off brand' })).status, 200);
  d = await detail(c, id);
  assert.deepEqual([d.status, d.approval.rejectedReason], ['REJECTED', 'Off brand']);
  assert.equal(posts('heygen').length, 0, 'nothing is sent to HeyGen for rejected or edited content');
});

test('approval triggers HeyGen once, then publishing happens only on an explicit request and only once', async () => {
  const c = await authed();
  const id = await createReel(c, 'FULLFLOW001');
  let d = await detail(c, id);
  assert.equal((await c.post(`/api/reels/${id}/publish`, { expectedFingerprint: d.fingerprint })).status, 409, 'cannot publish before approval');
  const approve = await c.post(`/api/reels/${id}/approve`, { expectedFingerprint: d.fingerprint });
  assert.deepEqual([approve.status, approve.body.status], [202, 'APPROVED']);
  await sim.runner.idle();
  d = await detail(c, id);
  assert.equal(d.status, 'VIDEO_COMPLETED', JSON.stringify(d.errors));
  assert.ok(d.video.url.startsWith('https://') && d.video.duration > 0);
  assert.equal(posts('heygen').length, 1);
  assert.equal(posts('blotato', '/v2/posts').length, 0, 'approval alone does not publish');
  assert.equal(d.actions.publish.allowed, true);

  const results = await Promise.all([1, 2, 3].map(() => c.post(`/api/reels/${id}/publish`, { expectedFingerprint: d.fingerprint })));
  await sim.runner.idle();
  assert.equal(results.filter((r) => r.status === 202).length, 1, JSON.stringify(results.map((r) => [r.status, r.body && r.body.error])));
  d = await detail(c, id);
  assert.equal(d.status, 'PUBLISHED', JSON.stringify(d.errors));
  assert.ok(d.publish.publishedUrl.startsWith('https://'));
  assert.equal(posts('blotato', '/v2/posts').length, 1);
  const again = await c.post(`/api/reels/${id}/publish`, { expectedFingerprint: d.fingerprint });
  assert.ok([200, 409].includes(again.status));
  await sim.runner.idle();
  assert.equal(posts('blotato', '/v2/posts').length, 1, 'a later click never creates a second post');
  assert.deepEqual(d.progress.map((s) => s.state), ['done', 'done', 'done', 'done', 'done', 'done']);
});

test('a failed generation is retried from the dashboard and succeeds', async () => {
  const c = await authed();
  mock.fault('apify', 500, 3);
  const r = await c.post('/api/reels', { url: 'https://www.instagram.com/reel/RETRYUI0001/' });
  await sim.runner.idle();
  const id = r.body.recordId;
  let d = await detail(c, id);
  assert.deepEqual([d.status, d.failedFrom, d.error.source], ['FAILED', 'EXTRACTING', 'Apify']);
  assert.equal(d.actions.retry.allowed, true);
  const retry = await c.post(`/api/reels/${id}/retry`, {});
  assert.equal(retry.status, 202);
  await sim.runner.idle();
  d = await detail(c, id);
  assert.equal(d.status, 'AWAITING_APPROVAL');
  assert.equal(mock.records().length, 1);
  assert.equal((await c.post(`/api/reels/${id}/retry`, {})).status, 409, 'not failed any more');
});

test('a stalled approved reel can be resumed without creating a second HeyGen job', async () => {
  const c = await authed();
  const old = new Date(Date.now() - 10 * 60000).toISOString();
  const rec = seed('RESUME00001', { Status: 'APPROVED', ApprovedBy: 'alice', VideoAttempt: 1, ModifiedTime: old });
  rec.fields.ApprovedFingerprint = core.contentFingerprint(core.recordFromAirtable(rec));
  let d = await detail(c, rec.id);
  assert.equal(d.actions.resume.allowed, true);
  const r = await c.post(`/api/reels/${rec.id}/resume`, {});
  assert.equal(r.status, 202, JSON.stringify(r.body));
  await sim.runner.idle();
  d = await detail(c, rec.id);
  assert.equal(d.status, 'VIDEO_COMPLETED');
  assert.equal(posts('heygen').length, 1);
  assert.equal((await c.post(`/api/reels/${rec.id}/resume`, {})).status, 409);
});

test('unknown actions and malformed ids are rejected', async () => {
  const c = await authed();
  assert.equal((await c.post('/api/reels/recABCDEFGHIJ/explode', {})).status, 404);
  assert.equal((await c.post('/api/reels/xyz/approve', {})).status, 404);
  const r = await c.post('/api/reels/recABCDEFGHIJ/approve', {});
  assert.deepEqual([r.status, r.body.error], [400, 'INVALID_REQUEST']);
});

// ---------------------------------------------------------------- uploads
test('MP4 probing reads duration and rejects non-video or damaged files', async () => {
  const f = path.join(tmp, 'probe.mp4');
  fs.writeFileSync(f, mp4(12.5));
  assert.deepEqual(await probeMp4(f), { ok: true, brand: 'isom', mimeType: 'video/mp4', durationSeconds: 12.5 });
  fs.writeFileSync(f, mp4(30, { moovLast: true, padBytes: 5000 }));
  assert.equal((await probeMp4(f)).durationSeconds, 30);
  fs.writeFileSync(f, mp4(5, { brand: 'qt  ' }));
  assert.equal((await probeMp4(f)).mimeType, 'video/quicktime');
  fs.writeFileSync(f, mp4(5, { noVideo: true }));
  assert.equal((await probeMp4(f)).error, 'MP4_NO_VIDEO_TRACK');
  fs.writeFileSync(f, Buffer.from('this is definitely not a video file'));
  assert.equal((await probeMp4(f)).error, 'NOT_MP4_OR_MOV');
  fs.writeFileSync(f, mp4(5).subarray(0, 40));
  assert.equal((await probeMp4(f)).ok, false);
});

test('an uploaded video is validated, stored, reviewed, approved and published without HeyGen', async () => {
  const c = await authed();
  const up = await uploadFile(c, mp4(24), 'promo clip.mp4');
  assert.equal(up.status, 201, JSON.stringify(up.body));
  const u = up.body.upload;
  assert.deepEqual([u.fileName, u.durationSeconds, u.mimeType], ['promo clip.mp4', 24, 'video/mp4']);
  assert.equal((await new Client().raw('GET', `/media/${u.uploadId}.mp4`)).status, 404, 'staged files are not public');
  assert.equal((await new Client().raw('GET', u.previewUrl)).status, 401, 'staged preview needs sign-in');
  assert.equal((await c.raw('GET', u.previewUrl)).status, 200);

  const sub = await c.post('/api/reels/upload', { uploadId: u.uploadId, caption: 'Our launch day. Save this one.', overlay: 'Launch day', hashtags: ['launch', '#brand'], niche: 'marketing' });
  assert.equal(sub.status, 201, JSON.stringify(sub.body));
  const id = sub.body.recordId;
  let d = await detail(c, id);
  assert.deepEqual([d.status, d.sourceType, d.upload.fileName, d.content.hashtags], ['AWAITING_APPROVAL', 'upload', 'promo clip.mp4', ['#launch', '#brand']]);
  assert.equal(d.video.url, `https://reels.example.test/media/${u.uploadId}.mp4`);
  assert.equal(d.video.previewUrl, `/media/${u.uploadId}.mp4`, 'the dashboard previews through its own server');
  assert.deepEqual(d.progress.map((s) => s.key), ['upload', 'approval', 'publish']);
  assert.equal(d.actions.regenerate.allowed, false);

  const pub = new Client();
  const whole = await pub.raw('GET', `/media/${u.uploadId}.mp4`);
  assert.deepEqual([whole.status, whole.headers.get('content-type'), whole.headers.get('accept-ranges')], [200, 'video/mp4', 'bytes']);
  const size = (await whole.arrayBuffer()).byteLength;
  const part = await pub.raw('GET', `/media/${u.uploadId}.mp4`, { headers: { range: 'bytes=0-9' } });
  assert.deepEqual([part.status, part.headers.get('content-range'), (await part.arrayBuffer()).byteLength], [206, `bytes 0-9/${size}`, 10]);
  assert.equal((await pub.raw('GET', `/media/${u.uploadId}.mp4`, { headers: { range: 'bytes=999999-' } })).status, 416);

  assert.equal((await c.post(`/api/reels/${id}/approve`, { expectedFingerprint: d.fingerprint })).status, 200);
  await sim.runner.idle();
  assert.equal(posts('heygen').length, 0);
  assert.equal(posts('blotato', '/v2/posts').length, 0);
  d = await detail(c, id);
  assert.equal(d.status, 'VIDEO_COMPLETED');
  const publishRes = await c.post(`/api/reels/${id}/publish`, { expectedFingerprint: d.fingerprint });
  assert.equal(publishRes.status, 202, JSON.stringify(publishRes.body));
  await sim.runner.idle();
  assert.equal((await detail(c, id)).status, 'PUBLISHED');
  assert.equal(posts('blotato', '/v2/posts').length, 1);
});

test('uploads are refused for the wrong type, bad files, bad lengths, bad metadata and oversize files', async () => {
  const c = await authed();
  assert.equal((await uploadFile(c, Buffer.from('<html>'), 'x.mp4', 'text/html')).status, 415);
  const notVideo = await uploadFile(c, Buffer.from('definitely not a video, just text bytes'), 'fake.mp4');
  assert.deepEqual([notVideo.status, notVideo.body.error], [422, 'FILE_NOT_A_VALID_VIDEO']);
  const short = await uploadFile(c, mp4(1), 'short.mp4');
  assert.deepEqual([short.status, short.body.error], [422, 'VIDEO_DURATION_OUT_OF_RANGE']);
  assert.equal((await uploadFile(c, mp4(200), 'long.mp4')).status, 422);
  const ok = await uploadFile(c, mp4(20), 'a/../../evil.mp4');
  assert.equal(ok.body.upload.fileName, 'evil.mp4', 'path parts are stripped');
  const id = ok.body.upload.uploadId;
  const noCaption = await c.post('/api/reels/upload', { uploadId: id, caption: '  ' });
  assert.deepEqual([noCaption.status, noCaption.body.error, noCaption.body.errors], [400, 'INVALID_UPLOAD', ['CAPTION_EMPTY']]);
  assert.equal((await c.post('/api/reels/upload', { uploadId: 'f'.repeat(32), caption: 'x y z' })).status, 404);
  assert.equal(mock.records().length, 0);

  const small = await startBackend({ MAX_UPLOAD_MB: '0.0005' });
  extraApps.push(small.app);
  const sc = new Client(small.base);
  await sc.login();
  const big = await uploadFile(sc, mp4(20, { padBytes: 4000 }), 'big.mp4');
  assert.deepEqual([big.status, big.body.error], [413, 'FILE_TOO_LARGE']);
  assert.deepEqual(fs.readdirSync(small.cfg.uploadDir), [], 'nothing is left behind');
});

test('uploading identical content twice yields one record and no orphan file', async () => {
  const c = await authed();
  const buf = mp4(18);
  const a = (await uploadFile(c, buf, 'one.mp4')).body.upload;
  const b = (await uploadFile(c, buf, 'two.mp4')).body.upload;
  const meta = { caption: 'Same video again. Worth a watch.', hashtags: ['a'] };
  const first = await c.post('/api/reels/upload', Object.assign({ uploadId: a.uploadId }, meta));
  const second = await c.post('/api/reels/upload', Object.assign({ uploadId: b.uploadId }, meta));
  assert.deepEqual([first.status, second.status, second.body.duplicate], [201, 200, true]);
  assert.equal(mock.records().length, 1);
  assert.equal((await new Client().raw('GET', `/media/${a.uploadId}.mp4`)).status, 200);
  assert.equal((await new Client().raw('GET', `/media/${b.uploadId}.mp4`)).status, 404, 'the duplicate file was discarded');
});

test('a rejected submission leaves the staged file private', async () => {
  const c = await authed();
  const u = (await uploadFile(c, mp4(20), 'p.mp4')).body.upload;
  mock.fault('airtable.create', 500, 50);
  const r = await c.post('/api/reels/upload', { uploadId: u.uploadId, caption: 'Valid caption for this video.', hashtags: [] });
  assert.ok(r.status >= 500, JSON.stringify(r.body));
  mock.fault('airtable.create', 500, 0);
  assert.equal((await new Client().raw('GET', `/media/${u.uploadId}.mp4`)).status, 404);
  const retry = await c.post('/api/reels/upload', { uploadId: u.uploadId, caption: 'Valid caption for this video.', hashtags: [] });
  assert.equal(retry.status, 201, JSON.stringify(retry.body));
});

test('uploads are disabled until PUBLIC_BASE_URL is an https address', async () => {
  const b = await startBackend({ PUBLIC_BASE_URL: '' });
  extraApps.push(b.app);
  const c = new Client(b.base);
  await c.login();
  const r = await uploadFile(c, mp4(20), 'x.mp4');
  assert.deepEqual([r.status, r.body.error], [503, 'UPLOADS_NOT_CONFIGURED']);
  const s = await c.get('/api/settings');
  assert.equal(s.body.backend.uploads.enabled, false);
});

// ---------------------------------------------------------------- settings and options
test('settings report real integration status from the workflows and never expose credentials', async () => {
  const c = await authed();
  const r = await c.get('/api/settings?refresh=1');
  assert.equal(r.status, 200);
  const w = r.body.workflows;
  assert.equal(w.ok, true);
  for (const k of ['n8n', 'airtable', 'apify', 'openai', 'heygen', 'blotato']) assert.equal(w.integrations[k].status, 'connected', k);
  assert.deepEqual([r.body.backend.airtableRead.status, r.body.backend.webhooks], ['connected', { n8nBaseConfigured: true, intakeToken: true, approvalToken: true, internalToken: true }]);
  noSecrets(r.text);
  mock.fault('heygen.probe', 401, 1);
  const again = await c.get('/api/settings');
  assert.equal(again.body.workflows.integrations.heygen.status, 'connected', 'cached for a short time to avoid hammering providers');
});

test('settings surface a provider failure and an unreachable or misconfigured n8n', async () => {
  const b = await startBackend({ N8N_INTERNAL_TOKEN: 'wrong-token' });
  extraApps.push(b.app);
  const c = new Client(b.base);
  await c.login();
  const bad = await c.get('/api/settings');
  assert.deepEqual([bad.body.workflows.ok, bad.body.workflows.error], [false, 'N8N_AUTH_FAILED']);
  const down = await startBackend({ N8N_WEBHOOK_BASE: 'http://127.0.0.1:1' });
  extraApps.push(down.app);
  const d = new Client(down.base);
  await d.login();
  assert.equal((await d.get('/api/settings')).body.workflows.error, 'N8N_UNREACHABLE');
  const sub = await d.post('/api/reels', { url: 'https://www.instagram.com/reel/NOTREACHED1/', avatarId: '', voiceId: '' });
  assert.equal(sub.status, 502);
  assert.equal(sub.body.error, 'N8N_UNREACHABLE');
  const none = await startBackend({ N8N_WEBHOOK_BASE: '' });
  extraApps.push(none.app);
  const n = new Client(none.base);
  await n.login();
  assert.equal((await n.get('/api/settings')).body.workflows.error, 'N8N_NOT_CONFIGURED');
});

test('creative options come from HeyGen through the workflows; failures are reported honestly', async () => {
  const c = await authed();
  const r = (await c.get('/api/options?refresh=1')).body;
  assert.equal(r.ok, true);
  assert.deepEqual(r.avatars.map((a) => a.id), ['avatar_mock_anna', 'avatar_mock_ben']);
  assert.ok(r.voices.length >= 3 && r.presets.niches.length > 3);
  mock.fault('heygen.options', 500, 9);
  const bad = (await c.get('/api/options?refresh=1')).body;
  assert.equal(bad.ok, true);
  assert.equal(bad.avatars.length, 0);
  assert.ok(bad.warnings.length > 0);
});

// ---------------------------------------------------------------- live updates
async function readEvents(c, ms) {
  const ctl = new AbortController();
  const res = await fetch(base + '/api/events', { headers: { cookie: c.cookie }, signal: ctl.signal });
  assert.equal(res.headers.get('content-type'), 'text/event-stream; charset=utf-8');
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = '';
  const timer = setTimeout(() => ctl.abort(), ms || 4000);
  return {
    async until(re) {
      while (!re.test(text)) {
        const { value, done } = await reader.read().catch(() => ({ done: true }));
        if (done) break;
        text += dec.decode(value);
      }
      return text;
    },
    close() { clearTimeout(timer); ctl.abort(); },
  };
}

test('record changes are pushed over server-sent events', async () => {
  const c = await authed();
  const rec = seed('LIVE0000001');
  const ev = await readEvents(c);
  await ev.until(/event: hello/);
  await sleep(120);
  rec.fields.Status = 'FAILED';
  rec.fields.ModifiedTime = new Date(Date.now() + 1000).toISOString();
  const text = await ev.until(/event: reel[\s\S]*FAILED/);
  ev.close();
  assert.match(text, /event: reel\ndata: \{"id":"recLIVE0000001"/);
  assert.match(text, /event: summary/);
});

test('the server only polls Airtable while a dashboard is connected', async () => {
  const c = await authed();
  seed('IDLE0000001');
  const ev = await readEvents(c);
  await ev.until(/event: hello/);
  await sleep(400);
  ev.close();
  await sleep(300);
  const before = calls('airtable').length;
  await sleep(700);
  assert.equal(calls('airtable').length, before, 'no background polling without clients');
  assert.ok(before >= 2, 'polled while connected');
});

// ---------------------------------------------------------------- static files and headers
test('the web app is served with security headers, SPA fallback and no path traversal', async () => {
  const c = new Client();
  const index = await c.call('GET', '/');
  assert.equal(index.status, 200);
  assert.match(index.text, /id="root"/);
  assert.match(index.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(index.headers.get('x-frame-options'), 'DENY');
  assert.equal((await c.call('GET', '/history')).text, index.text, 'client-side routes fall back to index.html');
  assert.equal((await c.call('GET', '/assets/app.js')).status, 200);
  assert.equal((await c.call('GET', '/assets/missing.js')).status, 404);
  const trav = await c.call('GET', '/..%2f..%2fpackage.json');
  assert.ok([200, 404].includes(trav.status));
  assert.ok(!trav.text.includes('"scripts"'));
  assert.equal((await c.call('GET', '/healthz')).body.ok, true);
  assert.equal((await c.call('GET', '/api/nope')).status, 401);
});

test('the backend source never contains provider credentials or reads them from the environment', () => {
  const dir = path.join(__dirname, '..', 'server');
  const src = fs.readdirSync(dir).filter((f) => f.endsWith('.cjs')).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  for (const name of ['OPENAI_API_KEY', 'HEYGEN_API_KEY', 'APIFY_TOKEN', 'BLOTATO_API_KEY', 'INSTAGRAM']) assert.ok(!src.includes(name), name);
  assert.ok(!/api\.heygen\.com|api\.openai\.com|api\.apify\.com|backend\.blotato\.com/.test(src), 'no provider hosts: providers are reached only through n8n');
});

test('rendered videos are served at /render/<id>.mp4 with range support; unknown ids are 404', async () => {
  const renderDir = fs.mkdtempSync(path.join(tmp, 'renders-'));
  const id = 'a'.repeat(32);
  fs.writeFileSync(path.join(renderDir, id + '.mp4'), Buffer.from('0123456789'));
  const b = await startBackend({ RENDER_DIR: renderDir });
  extraApps.push(b.app);
  const full = await fetch(b.base + '/render/' + id + '.mp4');
  assert.equal(full.status, 200);
  assert.equal(full.headers.get('content-type'), 'video/mp4');
  assert.equal(await full.text(), '0123456789');
  const part = await fetch(b.base + '/render/' + id + '.mp4', { headers: { range: 'bytes=2-4' } });
  assert.equal(part.status, 206);
  assert.equal(await part.text(), '234');
  assert.equal((await fetch(b.base + '/render/' + 'b'.repeat(32) + '.mp4')).status, 404);
});
