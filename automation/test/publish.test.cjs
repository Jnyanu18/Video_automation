'use strict';
// Workflow 05 (Instagram publishing through the Blotato adapter) on the simulated n8n runtime against the mock Blotato API.
// Nothing here talks to a real Blotato, HeyGen, Airtable or n8n instance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createMock, GOOD, BASE_TRANSCRIPT, TOKENS } = require('../mock/mock-server.cjs');
const { Runner } = require('./n8n-sim.cjs');
const core = require('../lib/core.js');

const N8N_DIR = path.join(__dirname, '..', 'n8n');
const FILES = ['01-reel-intake.json', '02-content-generation.json', '03-human-approval.json', '04-heygen-video.json', '05-instagram-publishing.json'];
const load = () => FILES.map((f) => JSON.parse(fs.readFileSync(path.join(N8N_DIR, f), 'utf8')));

const CREDS = {
  'Reels Intake Webhook Auth': { header: 'X-Reels-Token', value: 'intake-secret' },
  'Reels Internal Webhook Auth': { header: 'X-Reels-Token', value: 'internal-secret' },
  'Reels Approval Webhook Auth': { header: 'X-Reels-Token', value: 'approval-secret' },
  'Apify API Token': { header: 'Authorization', value: 'Bearer sim-apify' },
  'Airtable Personal Access Token': { header: 'Authorization', value: 'Bearer sim-airtable' },
  'OpenAI API': { header: 'Authorization', value: 'Bearer sim-openai' },
  'HeyGen API Key': { header: 'x-api-key', value: TOKENS.heygen },
  'Blotato API Key': { header: 'blotato-api-key', value: TOKENS.blotato },
};
const INTAKE = { 'X-Reels-Token': 'intake-secret' };
const INTERNAL = { 'X-Reels-Token': 'internal-secret' };
const APPROVAL = { 'X-Reels-Token': 'approval-secret' };

const mock = createMock();
let runner;
let env;

test.before(async () => {
  const url = await mock.listen();
  env = {
    N8N_WEBHOOK_BASE: 'http://n8n.sim', AIRTABLE_BASE_URL: url, AIRTABLE_BASE_ID: 'appSIM', AIRTABLE_TABLE: 'Reels',
    APIFY_BASE_URL: url, OPENAI_BASE_URL: url, HEYGEN_BASE_URL: url, HEYGEN_AVATAR_ID: 'avatar-sim', HEYGEN_VOICE_ID: 'voice-sim',
    HEYGEN_POLL_SECONDS: '1', HEYGEN_POLL_CAP_SECONDS: '1', MAX_POLL_ATTEMPTS: '6',
    PUBLISH_ADAPTER: 'mock', MOCK_PUBLISH_BASE_URL: url, BLOTATO_MEDIA_HOSTS: 'mock-blotato.test',
    PUBLISH_POLL_SECONDS: '1', PUBLISH_POLL_CAP_SECONDS: '1', MAX_PUBLISH_POLL_ATTEMPTS: '6', POST_CREATE_RETRY_SECONDS: '1',
  };
});
test.after(() => mock.close());
test.beforeEach(() => {
  mock.reset();
  runner = new Runner({ workflows: load(), env: { ...env }, credentials: { ...CREDS } });
});

const noExecutionErrors = () => assert.deepEqual(runner.executions.filter((e) => e.error), []);
const blotatoCalls = () => mock.state.calls.filter((c) => c.svc === 'blotato');
const mediaCalls = () => blotatoCalls().filter((c) => c.path === '/v2/media');
const createCalls = () => blotatoCalls().filter((c) => c.method === 'POST' && c.path === '/v2/posts');
const statusCalls = () => blotatoCalls().filter((c) => c.method === 'GET');
const posts = () => [...mock.state.blotato.posts.values()];
const fp = (rec) => core.contentFingerprint(core.recordFromAirtable(rec));
const hasFault = (name) => assert.ok(!mock.state.faults[name] || mock.state.faults[name].times >= 0);

const HEYGEN_URL = (id) => `https://cdn.mock-heygen.invalid/video/${id}.mp4`;

function seedVideo(code, extra = {}) {
  const now = new Date().toISOString();
  const id = 'rec' + code.replace(/[^A-Za-z0-9]/g, '').padEnd(10, '0');
  mock.state.heygen.videos.set('vid_0001', { id: 'vid_0001', body: { title: 't' }, polls: 5, outcome: 'complete', pollsToFinish: 2, duration: 24 });
  const rec = {
    id, createdTime: now,
    fields: {
      ReelKey: 'ig_' + code, ReelURL: `https://www.instagram.com/reel/${code}/`, Status: 'VIDEO_COMPLETED', ExtractionDone: true,
      SourceCaption: 'Morning routine tips', SourceTranscript: BASE_TRANSCRIPT, TranscriptSource: 'apify', ContentAttempts: 1, RetryCount: 0,
      Script: GOOD.script, Caption: GOOD.caption, Overlay: GOOD.overlay, Hashtags: GOOD.hashtags.map((t) => '#' + t).join(' '),
      ApprovedBy: 'alice', VideoAttempt: 1, HeyGenVideoId: 'vid_0001', VideoURL: HEYGEN_URL('vid_0001'), VideoDuration: 24, HeyGenStatus: 'completed',
      CreatedTime: now, ModifiedTime: now, ...extra,
    },
  };
  if (!('ApprovedFingerprint' in extra)) rec.fields.ApprovedFingerprint = fp(rec);
  mock.state.records.set(id, rec);
  return rec;
}

const publish = (rec, headers = INTERNAL) => runner.handleWebhook('POST', 'reels/publish', { headers, body: { recordId: rec.id } });
const publishAndWait = async (rec) => {
  const res = await publish(rec);
  await runner.idle();
  return res;
};
const act = (action, rec, extra = {}) => runner.handleWebhook('POST', 'reels/approval', { headers: APPROVAL, body: { recordId: rec.id, action, actor: 'alice', ...extra } });
const retry = async (rec) => {
  const res = await act('retry', rec);
  await runner.idle();
  return res;
};

function assertPublishFailed(rec, code, from) {
  const f = rec.fields;
  assert.equal(f.Status, 'FAILED', f.ErrorLog);
  assert.equal(f.FailedFromState, from);
  assert.ok(String(f.ErrorLog).includes(code), `ErrorLog should include ${code}: ${f.ErrorLog}`);
  assert.equal(f.LockedBy, undefined, 'lock must be released');
  for (const secret of [TOKENS.blotato, TOKENS.heygen, 'sim-airtable', 'internal-secret', 'approval-secret']) assert.ok(!String(f.ErrorLog).includes(secret), 'secret leaked into ErrorLog');
  noExecutionErrors();
}

// ---------------------------------------------------------------- pure logic
const CFG = core.cfgFromEnv({ BLOTATO_MEDIA_HOSTS: 'mock-blotato.test' });

test('adapter resolution: mock needs an explicit non-Blotato origin; blotato is pinned to the production host and needs an account', () => {
  const r = core.resolvePublishAdapter({ PUBLISH_ADAPTER: 'mock', MOCK_PUBLISH_BASE_URL: 'http://127.0.0.1:4010/' });
  assert.deepEqual([r.ok, r.adapter, r.baseUrl, r.accountId], [true, 'mock', 'http://127.0.0.1:4010', 'acc_mock_1']);
  assert.equal(core.resolvePublishAdapter({}).error, 'ADAPTER_CONFIG_INVALID', 'defaults to mock, which then needs a URL');
  for (const bad of ['https://backend.blotato.com', 'https://api.blotato.io', 'http://127.0.0.1:4010/v2', 'ftp://x', 'http://user@evil.test']) {
    assert.equal(core.resolvePublishAdapter({ PUBLISH_ADAPTER: 'mock', MOCK_PUBLISH_BASE_URL: bad }).error, 'ADAPTER_CONFIG_INVALID', bad);
  }
  const live = core.resolvePublishAdapter({ PUBLISH_ADAPTER: 'blotato', BLOTATO_ACCOUNT_ID: 'acc_1' });
  assert.deepEqual([live.ok, live.baseUrl, live.accountId], [true, 'https://backend.blotato.com', 'acc_1']);
  assert.equal(core.resolvePublishAdapter({ PUBLISH_ADAPTER: 'blotato' }).error, 'ADAPTER_CONFIG_INVALID');
  assert.equal(core.resolvePublishAdapter({ PUBLISH_ADAPTER: 'blotato', BLOTATO_ACCOUNT_ID: 'a', BLOTATO_BASE_URL: 'http://localhost:4010' }).error, 'ADAPTER_CONFIG_INVALID');
  assert.equal(core.resolvePublishAdapter({ PUBLISH_ADAPTER: 'meta' }).error, 'ADAPTER_NOT_IMPLEMENTED');
});

test('publish entry decisions: track, unknown, invalid, publish and skip', () => {
  const base = { id: 'recX', status: 'VIDEO_COMPLETED', heygenVideoId: 'v', caption: 'c', script: 's', overlay: 'o', hashtags: '#a' };
  const rec = (x = {}) => {
    const r = { ...base, ...x };
    r.approvedFingerprint = 'approvedFingerprint' in x ? x.approvedFingerprint : core.contentFingerprint(r);
    return r;
  };
  const decide = (r) => core.decidePublishEntry({ record: r, cfg: CFG, now: Date.now() });
  assert.deepEqual([decide(rec()).action, decide(rec()).stage], ['publish', 'media']);
  assert.deepEqual([decide(rec({ blotatoMediaUrl: 'https://mock-blotato.test/m.mp4' })).action, decide(rec({ blotatoMediaUrl: 'x' })).stage], ['publish', 'post']);
  assert.equal(decide(rec({ postSubmissionId: 'sub_0001', status: 'PUBLISHING' })).action, 'track');
  assert.equal(decide(rec({ publishIntentAt: new Date().toISOString(), status: 'PUBLISHING' })).action, 'unknown');
  assert.equal(decide(rec({ postSubmissionId: 'sub_1', publishIntentAt: 'x', status: 'PUBLISHING' })).action, 'track', 'a known id wins over the intent');
  assert.deepEqual(decide(rec({ approvedFingerprint: undefined })).errors, ['NOT_APPROVED']);
  assert.deepEqual(decide(rec({ approvedFingerprint: 'stale' })).errors, ['CONTENT_CHANGED_AFTER_APPROVAL']);
  assert.deepEqual(decide(rec({ heygenVideoId: undefined })).errors, ['VIDEO_MISSING']);
  for (const status of ['APPROVED', 'AWAITING_APPROVAL', 'PUBLISHED', 'FAILED', 'VIDEO_GENERATING']) assert.equal(decide(rec({ status })).action, 'skip', status);
  assert.equal(decide(rec({ status: 'PUBLISHING', lockedBy: 'x', lockedAt: new Date().toISOString() })).action, 'skip', 'fresh foreign lock');
});

test('create-post classification: only definite not-created answers may be retried', () => {
  const c = (input, attempt = 0) => core.classifyPublishCreate(input, { attempt }, CFG);
  assert.deepEqual([c({ postSubmissionId: 'sub_0001' }).kind, c({ postSubmissionId: 'sub_0001' }).postSubmissionId], ['created', 'sub_0001']);
  for (const bad of [{}, { postSubmissionId: '' }, { postSubmissionId: 'x' }, { postSubmissionId: 'has space id' }, { postSubmissionId: 12345678 }]) {
    assert.deepEqual([c(bad).kind, c(bad).error], ['unknown', 'PUBLISH_OUTCOME_UNKNOWN'], JSON.stringify(bad));
  }
  const err = (httpCode, description) => ({ error: { message: 'x', httpCode: String(httpCode), description } });
  assert.equal(c(err(429)).kind, 'retry');
  assert.equal(c(err(429), 2).kind, 'not_created', 'attempts exhausted');
  for (const code of [500, 502, 503, 408, 0]) assert.equal(c(err(code)).kind, 'unknown', String(code));
  assert.equal(c({ error: { message: 'timeout of 60000ms exceeded' } }).kind, 'unknown');
  const r422 = c(err(422));
  assert.deepEqual([r422.kind, r422.error, r422.ok], ['not_created', 'BAD_REQUEST', false]);
  assert.equal(c(err(401)).error, 'AUTH_FAILED');
  assert.equal(c(err(403, JSON.stringify({ subscriptionStatus: 'inactive' }))).error, 'SUBSCRIPTION_REQUIRED');
  assert.ok(c(err(429)).delay >= 1);
});

test('status interpretation: pending, published, failed, timeout and error handling', () => {
  const p = (input, attempt = 0, cfg = CFG) => core.interpretPublishPoll(input, { attempt }, cfg);
  assert.deepEqual([p({ status: 'in-progress' }).state, p({ status: 'in-progress' }).attempt], ['pending', 1]);
  assert.equal(p({ status: 'scheduled' }).state, 'pending');
  const done = p({ status: 'published', publicUrl: 'https://www.instagram.com/reel/abc/' });
  assert.deepEqual([done.state, done.publicUrl], ['published', 'https://www.instagram.com/reel/abc/']);
  assert.equal(p({ status: 'published', publicUrl: 'javascript:alert(1)' }).publicUrl, undefined);
  const failed = p({ status: 'failed', errorMessage: 'rejected' });
  assert.deepEqual([failed.state, failed.error, failed.terminalJob, failed.message], ['failed', 'PUBLISH_FAILED', true, 'rejected']);
  const last = CFG.maxPublishPollAttempts - 1;
  assert.deepEqual([p({ status: 'in-progress' }, last).state, p({ status: 'in-progress' }, last).error], ['timeout', 'PUBLISH_POLL_TIMEOUT']);
  assert.equal(p({ status: 'scheduled' }, last).state, 'timeout');
  assert.equal(p({ error: { httpCode: '503', message: 'down' } }).state, 'pending');
  assert.equal(p({ error: { httpCode: '503', message: 'down' } }, last).error, 'PUBLISH_POLL_TIMEOUT');
  const fatal = p({ error: { httpCode: '404', message: 'nf' } });
  assert.deepEqual([fatal.state, fatal.error, fatal.terminalJob], ['fatal', 'NOT_FOUND', false]);
  assert.equal(core.publishPollDelaySeconds(1, CFG), 5);
  assert.equal(core.publishPollDelaySeconds(10, CFG), 60);
});

test('video url and staged media helpers', () => {
  const rec = { videoUrl: 'https://old.example/v.mp4' };
  assert.deepEqual(core.pickVideoUrl({ data: { status: 'completed', video_url: 'https://new.example/v.mp4' } }, rec), { ok: true, videoUrl: 'https://new.example/v.mp4', source: 'heygen' });
  assert.equal(core.pickVideoUrl({ error: { message: 'x' } }, rec).source, 'record');
  assert.equal(core.pickVideoUrl({ data: { status: 'processing' } }, rec).source, 'record');
  assert.equal(core.pickVideoUrl({ data: { status: 'completed', video_url: 'http://insecure.example/v.mp4' } }, {}).error, 'VIDEO_URL_UNAVAILABLE');
  assert.equal(core.parseStagedMedia({ url: 'https://mock-blotato.test/media/1.mp4', id: 'm1' }, CFG).ok, true);
  for (const bad of [{ url: 'https://evil.example/1.mp4' }, { url: 'http://mock-blotato.test/1.mp4' }, {}, null]) assert.equal(core.parseStagedMedia(bad, CFG).error, 'MEDIA_URL_NOT_BLOTATO_HOSTED');
});

test('publish field helpers write only known Airtable fields and clear the post state on a confirmed failure', () => {
  const known = new Set(Object.values(core.AIRTABLE_FIELD_MAP));
  const now = '2030-01-01T00:00:00.000Z';
  const all = [
    core.publishMediaFields('https://mock-blotato.test/m.mp4', now), core.publishIntentFields('mock', now), core.publishSubmittedFields('sub_0001', now),
    core.publishCompleteFields({ publicUrl: 'https://www.instagram.com/reel/x/' }, now), core.publishFailureExtras({ terminalJob: true }), core.publishFailureExtras({ state: 'timeout' }),
  ];
  for (const f of all) for (const k of Object.keys(f)) assert.ok(known.has(k), k);
  assert.deepEqual([all[1].Status, all[1].PublishIntentAt, all[1].PublishAdapter], ['PUBLISHING', now, 'mock']);
  assert.deepEqual([all[3].Status, all[3].PublishedURL, all[3].PublishedAt, all[3].LockedBy], ['PUBLISHED', 'https://www.instagram.com/reel/x/', now, '']);
  assert.deepEqual([all[4].PostSubmissionId, all[4].PublishIntentAt, all[4].PublishStatus], [null, null, 'failed']);
  assert.equal('PostSubmissionId' in all[5], false, 'a timeout keeps the post id');
});

test('approval retry routes publish-stage failures to the publish workflow', () => {
  const cfg = core.cfgFromEnv({});
  for (const from of ['VIDEO_COMPLETED', 'READY_TO_PUBLISH', 'PUBLISHING']) {
    const d = core.decideApproval({ req: { action: 'retry', recordId: 'recX', actor: 'a' }, record: { id: 'recX', status: 'FAILED', failedFromState: from, retryCount: 0, videoAttempt: 1 }, cfg, now: Date.now() });
    assert.deepEqual([d.ok, d.trigger], [true, 'publish'], from);
  }
  assert.equal(cfg.autoPublish, false, 'publishing is opt-in');
});

// ---------------------------------------------------------------- publishing: success
test('publishes a completed video: media staged, Reel created once, status tracked, and post id and result stored in Airtable', async () => {
  const rec = seedVideo('PUBLISH001');
  const res = await publish(rec);
  assert.equal(res.status, 200);
  await runner.idle();
  const f = rec.fields;
  assert.equal(f.Status, 'PUBLISHED');
  assert.equal(f.PostSubmissionId, 'sub_0001');
  assert.match(f.PublishedURL, /^https:\/\/www\.instagram\.com\/reel\/MOCK0001\/$/);
  assert.equal(f.PublishStatus, 'published');
  assert.equal(f.PublishAdapter, 'mock');
  assert.ok(f.PublishedAt && f.PublishIntentAt);
  assert.match(f.BlotatoMediaURL, /^https:\/\/mock-blotato\.test\/media\/media_0001\.mp4$/);
  assert.equal(f.LockedBy, undefined);
  assert.equal(f.ErrorLog, undefined);

  assert.equal(mediaCalls().length, 1);
  assert.equal(createCalls().length, 1);
  assert.ok(statusCalls().length >= 2, 'status polled until published');
  const body = createCalls()[0].body.post;
  assert.equal(body.accountId, 'acc_mock_1');
  assert.deepEqual([body.content.platform, body.target.targetType, body.target.mediaType, body.target.shareToFeed], ['instagram', 'instagram', 'reel', true]);
  assert.deepEqual(body.content.mediaUrls, [f.BlotatoMediaURL]);
  assert.equal(body.content.text, `${GOOD.caption}\n\n#habits #consistency #selfimprovement`);
  assert.equal(mediaCalls()[0].body.url, HEYGEN_URL('vid_0001'));
  noExecutionErrors();
});

test('the next stage never starts without a completed, approved video: wrong states, bad auth and bad input are ignored', async () => {
  const recs = ['APPROVED', 'AWAITING_APPROVAL', 'PUBLISHED', 'FAILED', 'VIDEO_GENERATING', 'REJECTED'].map((s, i) => seedVideo('WRONGST00' + i, { Status: s }));
  for (const rec of recs) await publish(rec);
  assert.equal((await publish(recs[0], {})).status, 403);
  assert.equal((await publish(recs[0], APPROVAL)).status, 403);
  await runner.handleWebhook('POST', 'reels/publish', { headers: INTERNAL, body: { recordId: "rec'; DROP" } });
  await runner.handleWebhook('POST', 'reels/publish', { headers: INTERNAL, body: {} });
  await runner.handleWebhook('POST', 'reels/publish', { headers: INTERNAL, body: { recordId: 'recDOESNOTEXIST' } });
  await runner.idle();
  assert.equal(blotatoCalls().length, 0);
  assert.deepEqual(recs.map((r) => r.fields.Status), ['APPROVED', 'AWAITING_APPROVAL', 'PUBLISHED', 'FAILED', 'VIDEO_GENERATING', 'REJECTED']);
});

test('publishing is opt-in after video generation: default leaves VIDEO_COMPLETED, AUTO_PUBLISH=true publishes end to end', async () => {
  const code = 'E2EAUTO001';
  const submit = async () => {
    const intake = await runner.handleWebhook('POST', 'reels/intake', { headers: INTAKE, body: { url: `https://www.instagram.com/reel/${code}/`, submittedBy: 'tester' } });
    assert.equal(intake.status, 202);
    await runner.idle();
    const rec = mock.records().find((r) => r.fields.ReelKey === 'ig_' + code);
    assert.equal((await act('approve', rec, { expectedFingerprint: fp(rec) })).status, 202);
    await runner.idle();
    return rec;
  };
  const manual = await submit();
  assert.equal(manual.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(blotatoCalls().length, 0, 'nothing is published without opt-in');

  // A manual trigger publishes it.
  await publishAndWait(manual);
  assert.equal(manual.fields.Status, 'PUBLISHED');

  mock.reset();
  runner = new Runner({ workflows: load(), env: { ...env, AUTO_PUBLISH: 'true' }, credentials: { ...CREDS } });
  const auto = await submit();
  assert.equal(auto.fields.Status, 'PUBLISHED');
  assert.equal(auto.fields.PostSubmissionId, 'sub_0001');
  assert.equal(createCalls().length, 1);
  assert.equal(mock.count('heygen') > 0, true);
  noExecutionErrors();
});

// ---------------------------------------------------------------- duplicate prevention
test('publishing an already published record is a no-op', async () => {
  const rec = seedVideo('DUPPUB0001');
  await publishAndWait(rec);
  assert.equal(rec.fields.Status, 'PUBLISHED');
  const before = blotatoCalls().length;
  await publishAndWait(rec);
  await publishAndWait(rec);
  assert.equal(blotatoCalls().length, before);
  assert.equal(posts().length, 1);
});

test('concurrent triggers create exactly one post', async () => {
  const rec = seedVideo('DUPPUB0002');
  await Promise.all([publish(rec), publish(rec), publish(rec)]);
  await runner.idle();
  assert.equal(rec.fields.Status, 'PUBLISHED');
  assert.equal(createCalls().length, 1);
  assert.equal(posts().length, 1);
  assert.equal(mediaCalls().length, 1);
  assert.ok(runner.executions.some((e) => e.trace.includes('Stop: Lost Claim') || e.trace.includes('Stop: Skipped')));
  noExecutionErrors();
});

test('a fresh lock held by another run blocks publishing', async () => {
  const rec = seedVideo('LOCKED0001', { LockedBy: 'live-run', LockedAt: new Date().toISOString() });
  await publishAndWait(rec);
  assert.equal(blotatoCalls().length, 0);
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
});

test('resume: a stored post id is tracked to completion without creating another post', async () => {
  const rec = seedVideo('RESUME0001', { Status: 'PUBLISHING', BlotatoMediaURL: 'https://mock-blotato.test/media/media_0001.mp4', PublishIntentAt: new Date().toISOString(), PostSubmissionId: 'sub_0001', PublishPollAttempts: 2, LockedBy: 'dead-run', LockedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() });
  mock.state.blotato.posts.set('sub_0001', { id: 'sub_0001', body: {}, polls: 0, outcome: 'publish', pollsToFinish: 2 });
  await publishAndWait(rec);
  assert.equal(rec.fields.Status, 'PUBLISHED');
  assert.equal(rec.fields.PostSubmissionId, 'sub_0001');
  assert.equal(createCalls().length, 0);
  assert.equal(mediaCalls().length, 0);
  assert.equal(posts().length, 1);
});

test('an intent without a post id (crash around the create call) stops for a human instead of posting', async () => {
  const rec = seedVideo('INTENT0001', { Status: 'PUBLISHING', BlotatoMediaURL: 'https://mock-blotato.test/media/media_0001.mp4', PublishIntentAt: new Date().toISOString(), LockedBy: 'dead-run', LockedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() });
  await publishAndWait(rec);
  assertPublishFailed(rec, 'PUBLISH_OUTCOME_UNKNOWN', 'PUBLISHING');
  assert.equal(blotatoCalls().length, 0);
  assert.ok(rec.fields.PublishIntentAt, 'the intent is kept as evidence');
});

test('ambiguous create outcome (response lost): no automatic re-post, retries stay blocked, and an operator can attach the existing post id', async () => {
  mock.fault('blotato.post.lost', 500, 1);
  const rec = seedVideo('AMBIG00001');
  await publishAndWait(rec);
  assertPublishFailed(rec, 'PUBLISH_OUTCOME_UNKNOWN', 'PUBLISHING');
  assert.equal(rec.fields.PublishStatus, 'unknown');
  assert.equal(rec.fields.PostSubmissionId, undefined);
  assert.ok(rec.fields.PublishIntentAt);
  assert.equal(createCalls().length, 1, 'the create call is never retried automatically');
  assert.equal(posts().length, 1, 'the post really exists at the provider');

  const r1 = await retry(rec);
  assert.equal(r1.status, 202);
  assertPublishFailed(rec, 'PUBLISH_OUTCOME_UNKNOWN', 'PUBLISHING');
  assert.equal(createCalls().length, 1, 'a manual retry does not create a duplicate either');

  // Operator verified the post in Blotato and records its id.
  rec.fields.PostSubmissionId = 'sub_0001';
  await retry(rec);
  assert.equal(rec.fields.Status, 'PUBLISHED');
  assert.equal(createCalls().length, 1);
  assert.equal(posts().length, 1);
});

test('a 5xx on create is ambiguous and never retried', async () => {
  mock.fault('blotato.post', 503, 5);
  const rec = seedVideo('AMBIG00002');
  await publishAndWait(rec);
  assertPublishFailed(rec, 'PUBLISH_OUTCOME_UNKNOWN', 'PUBLISHING');
  assert.equal(createCalls().length, 1);
  assert.equal(posts().length, 0);
});

test('Airtable failure while storing the post id keeps the id in the ErrorLog and blocks duplicate creation on retry', async () => {
  const rec = seedVideo('STOREID001');
  let failures = 0;
  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    if (init && init.method === 'PATCH' && typeof init.body === 'string' && init.body.includes('"PostSubmissionId"') && failures < 5) {
      failures += 1;
      return new Response(JSON.stringify({ error: { type: 'FAULT' } }), { status: 503, headers: { 'content-type': 'application/json' } });
    }
    return realFetch(url, init);
  };
  try {
    await publishAndWait(rec);
  } finally {
    global.fetch = realFetch;
  }
  assertPublishFailed(rec, 'sub_0001', 'PUBLISHING');
  assert.equal(rec.fields.PostSubmissionId, undefined);
  assert.equal(createCalls().length, 1);

  await retry(rec);
  assertPublishFailed(rec, 'PUBLISH_OUTCOME_UNKNOWN', 'PUBLISHING');
  assert.equal(createCalls().length, 1);
  rec.fields.PostSubmissionId = 'sub_0001';
  await retry(rec);
  assert.equal(rec.fields.Status, 'PUBLISHED');
  assert.equal(posts().length, 1);
});

// ---------------------------------------------------------------- failures and retries
test('rate limiting on create is retried with the same request until it is accepted: one post', async () => {
  mock.fault('blotato.post', 429, 2);
  const rec = seedVideo('RATELIM001');
  await publishAndWait(rec);
  assert.equal(rec.fields.Status, 'PUBLISHED');
  assert.equal(createCalls().length, 3);
  assert.equal(posts().length, 1);
  assert.deepEqual(createCalls()[0].body, createCalls()[2].body);
  noExecutionErrors();
});

test('persistent rate limiting fails as not created (safe to retry); the staged media is reused', async () => {
  mock.fault('blotato.post', 429, 1000);
  const rec = seedVideo('RATELIM002');
  await publishAndWait(rec);
  assertPublishFailed(rec, 'RATE_LIMITED', 'READY_TO_PUBLISH');
  assert.equal(createCalls().length, CFG.maxPostCreateAttempts);
  assert.equal(rec.fields.PublishIntentAt, undefined, 'intent cleared: nothing was created');
  assert.equal(rec.fields.PublishStatus, 'not_created');
  assert.ok(rec.fields.BlotatoMediaURL);

  mock.state.faults = {};
  const r = await retry(rec);
  assert.equal(r.status, 202);
  assert.equal(rec.fields.Status, 'PUBLISHED');
  assert.equal(mediaCalls().length, 1, 'media is not uploaded again');
  assert.equal(posts().length, 1);
});

test('a rejected request (422) fails fast without retry or intent, and a retry after fixing it publishes once', async () => {
  mock.fault('blotato.post', 422, 1);
  const rec = seedVideo('REJECT0001');
  await publishAndWait(rec);
  assertPublishFailed(rec, 'BAD_REQUEST', 'READY_TO_PUBLISH');
  assert.equal(createCalls().length, 1);
  assert.equal(rec.fields.PublishIntentAt, undefined);
  await retry(rec);
  assert.equal(rec.fields.Status, 'PUBLISHED');
  assert.equal(posts().length, 1);
  assert.equal(mediaCalls().length, 1);
});

test('subscription/credential problems fail clearly (no spend, no secrets in logs)', async () => {
  mock.fault('blotato.media', 403, 5);
  const noSub = seedVideo('SUBSCR0001');
  await publishAndWait(noSub);
  assertPublishFailed(noSub, 'SUBSCRIPTION_REQUIRED', 'VIDEO_COMPLETED');
  assert.equal(createCalls().length, 0);
  assert.equal(noSub.fields.BlotatoMediaURL, undefined);

  mock.reset();
  runner = new Runner({ workflows: load(), env: { ...env }, credentials: { ...CREDS, 'Blotato API Key': { header: 'blotato-api-key', value: 'wrong-key-value' } } });
  const badKey = seedVideo('SUBSCR0002');
  await publishAndWait(badKey);
  assertPublishFailed(badKey, 'AUTH_FAILED', 'VIDEO_COMPLETED');
  assert.ok(!badKey.fields.ErrorLog.includes('wrong-key-value'));
  assert.equal(createCalls().length, 0);
});

test('transient media upload errors are retried and still produce one upload record and one post', async () => {
  mock.fault('blotato.media', 503, 2);
  const rec = seedVideo('MEDIA00001');
  await publishAndWait(rec);
  assert.equal(rec.fields.Status, 'PUBLISHED');
  assert.equal(mediaCalls().length, 3);
  assert.equal(mock.state.blotato.media.size, 1);
  assert.equal(posts().length, 1);
});

test('persistent media upload failure fails from VIDEO_COMPLETED without touching the post API', async () => {
  mock.fault('blotato.media', 500, 100);
  const rec = seedVideo('MEDIA00002');
  await publishAndWait(rec);
  assertPublishFailed(rec, 'UPSTREAM_ERROR', 'VIDEO_COMPLETED');
  assert.equal(createCalls().length, 0);
  mock.state.faults = {};
  await retry(rec);
  assert.equal(rec.fields.Status, 'PUBLISHED');
});

test('transient status errors are retried; persistent ones time out keeping the post id and a retry only tracks it', async () => {
  mock.fault('blotato.status', 503, 2);
  const ok = seedVideo('POLLERR001');
  await publishAndWait(ok);
  assert.equal(ok.fields.Status, 'PUBLISHED');

  mock.reset();
  mock.fault('blotato.status', 503, 1000);
  runner.env.MAX_PUBLISH_POLL_ATTEMPTS = '2';
  const bad = seedVideo('POLLERR002');
  await publishAndWait(bad);
  assertPublishFailed(bad, 'PUBLISH_POLL_TIMEOUT', 'PUBLISHING');
  assert.equal(bad.fields.PostSubmissionId, 'sub_0001');
  assert.equal(createCalls().length, 1);

  mock.state.faults = {};
  await retry(bad);
  assert.equal(bad.fields.Status, 'PUBLISHED');
  assert.equal(createCalls().length, 1, 'retry tracks the existing post');
  assert.equal(posts().length, 1);
});

test('status polling stops at once on a non-retryable error', async () => {
  mock.fault('blotato.status', 404, 1000);
  const rec = seedVideo('POLLERR003');
  await publishAndWait(rec);
  assertPublishFailed(rec, 'NOT_FOUND', 'PUBLISHING');
  assert.equal(rec.fields.PostSubmissionId, 'sub_0001');
  assert.ok(statusCalls().length <= 3, 'only the HTTP node retries, no polling loop');
});

test('a post still in progress after the polling budget times out; the id is kept and later completion is picked up without re-posting', async () => {
  mock.state.blotato.outcome = 'never';
  runner.env.MAX_PUBLISH_POLL_ATTEMPTS = '3';
  const rec = seedVideo('TIMEOUT001');
  await publishAndWait(rec);
  assertPublishFailed(rec, 'PUBLISH_POLL_TIMEOUT', 'PUBLISHING');
  assert.equal(statusCalls().length, 3);
  assert.equal(rec.fields.PostSubmissionId, 'sub_0001');

  mock.state.blotato.posts.get('sub_0001').outcome = 'publish';
  const r = await retry(rec);
  assert.equal(r.body.status, 'PUBLISHING');
  assert.equal(rec.fields.Status, 'PUBLISHED');
  assert.equal(createCalls().length, 1);
});

test('a platform failure clears the failed submission and a manual retry creates a new post', async () => {
  mock.state.blotato.outcome = 'fail';
  const rec = seedVideo('PLATFAIL01');
  await publishAndWait(rec);
  assertPublishFailed(rec, 'PUBLISH_FAILED', 'READY_TO_PUBLISH');
  assert.ok(rec.fields.ErrorLog.includes('Instagram rejected the media'));
  assert.ok(rec.fields.ErrorLog.includes('sub_0001'), 'failed submission id kept in the log');
  assert.equal(rec.fields.PostSubmissionId, undefined);
  assert.equal(rec.fields.PublishIntentAt, undefined);
  assert.equal(rec.fields.PublishStatus, 'failed');
  assert.ok(rec.fields.BlotatoMediaURL);

  mock.state.blotato.outcome = 'publish';
  const r = await retry(rec);
  assert.equal(r.status, 202);
  assert.equal(rec.fields.Status, 'PUBLISHED');
  assert.equal(rec.fields.PostSubmissionId, 'sub_0002');
  assert.equal(posts().length, 2, 'only the confirmed-failed submission preceded it');
  assert.equal(mediaCalls().length, 1);
});

test('polling progress is recorded in Airtable while the post is in progress', async () => {
  mock.state.blotato.pollsToFinish = 4;
  const rec = seedVideo('PROGRESS01');
  await publishAndWait(rec);
  assert.equal(rec.fields.Status, 'PUBLISHED');
  assert.equal(rec.fields.PublishPollAttempts, 3);
  assert.equal(statusCalls().length, 4);
});

// ---------------------------------------------------------------- preconditions and configuration
test('content changed after approval, unapproved records and missing videos are refused before any Blotato call', async () => {
  const changed = seedVideo('PRECOND001');
  changed.fields.Script = GOOD.script + ' One more edited sentence appended later on.';
  const unapproved = seedVideo('PRECOND002', { ApprovedFingerprint: undefined });
  delete unapproved.fields.ApprovedFingerprint;
  const noVideo = seedVideo('PRECOND003');
  delete noVideo.fields.HeyGenVideoId;
  delete noVideo.fields.VideoURL;
  for (const rec of [changed, unapproved, noVideo]) await publishAndWait(rec);
  assertPublishFailed(changed, 'CONTENT_CHANGED_AFTER_APPROVAL', 'VIDEO_COMPLETED');
  assertPublishFailed(unapproved, 'NOT_APPROVED', 'VIDEO_COMPLETED');
  assertPublishFailed(noVideo, 'VIDEO_MISSING', 'VIDEO_COMPLETED');
  assert.equal(blotatoCalls().length, 0);
});

test('adapter misconfiguration fails clearly without any Blotato or media call', async () => {
  const cases = [
    [{ PUBLISH_ADAPTER: 'mock', MOCK_PUBLISH_BASE_URL: '' }, 'ADAPTER_CONFIG_INVALID'],
    [{ PUBLISH_ADAPTER: 'blotato' }, 'ADAPTER_CONFIG_INVALID'],
    [{ PUBLISH_ADAPTER: 'blotato', BLOTATO_ACCOUNT_ID: 'acc_1', BLOTATO_BASE_URL: env.MOCK_PUBLISH_BASE_URL }, 'ADAPTER_CONFIG_INVALID'],
    [{ PUBLISH_ADAPTER: 'meta' }, 'ADAPTER_NOT_IMPLEMENTED'],
  ];
  for (const [over, code] of cases) {
    mock.reset();
    runner = new Runner({ workflows: load(), env: { ...env, ...over }, credentials: { ...CREDS } });
    const rec = seedVideo('ADAPTER001');
    await publishAndWait(rec);
    assertPublishFailed(rec, code, 'VIDEO_COMPLETED');
    assert.equal(blotatoCalls().length, 0, JSON.stringify(over));
  }
});

test('the HeyGen URL is refreshed at publish time and falls back to the stored URL; no URL at all fails clearly', async () => {
  const fresh = seedVideo('VIDURL0001', { VideoURL: 'https://expired.example/old.mp4' });
  await publishAndWait(fresh);
  assert.equal(fresh.fields.Status, 'PUBLISHED');
  assert.equal(mediaCalls()[0].body.url, HEYGEN_URL('vid_0001'), 'fresh URL, not the stored one');

  mock.reset();
  const fallback = seedVideo('VIDURL0002', { HeyGenVideoId: 'vid_9999', VideoURL: 'https://stored.example/video.mp4' });
  mock.state.heygen.videos.delete('vid_0001');
  await publishAndWait(fallback);
  assert.equal(fallback.fields.Status, 'PUBLISHED');
  assert.equal(mediaCalls()[0].body.url, 'https://stored.example/video.mp4');

  mock.reset();
  const none = seedVideo('VIDURL0003', { HeyGenVideoId: 'vid_9999' });
  delete none.fields.VideoURL;
  mock.state.heygen.videos.delete('vid_0001');
  await publishAndWait(none);
  assertPublishFailed(none, 'VIDEO_URL_UNAVAILABLE', 'VIDEO_COMPLETED');
  assert.equal(blotatoCalls().length, 0);
});

test('a media URL that is not Blotato-hosted is never submitted as a post', async () => {
  const rec = seedVideo('HOSTCHK001', { Status: 'READY_TO_PUBLISH', BlotatoMediaURL: 'https://evil.example/video.mp4' });
  await publishAndWait(rec);
  assertPublishFailed(rec, 'POST_REQUEST_INVALID', 'READY_TO_PUBLISH');
  assert.equal(createCalls().length, 0);
});

test('notifications: published and failed, and a broken notifier never breaks the run', async () => {
  runner.env.NOTIFY_WEBHOOK_URL = env.APIFY_BASE_URL + '/notify';
  const ok = seedVideo('NOTIFY0001');
  await publishAndWait(ok);
  mock.state.blotato.outcome = 'fail';
  const bad = seedVideo('NOTIFY0002');
  await publishAndWait(bad);
  assert.ok(mock.state.notifications.some((n) => n.text.includes('Reel published')));
  assert.ok(mock.state.notifications.some((n) => n.text.includes('FAILED (publish)')));
  mock.reset();
  mock.fault('notify', 500, 10);
  const rec = seedVideo('NOTIFY0003');
  await publishAndWait(rec);
  assert.equal(rec.fields.Status, 'PUBLISHED');
  hasFault('notify');
});

// ---------------------------------------------------------------- workflow JSON
test('workflow 05 JSON: the single create call is authenticated, never auto-retried and only reachable through the adapter URL', () => {
  const wfs = load();
  const publishWf = wfs[4];
  const create = publishWf.nodes.find((n) => n.name === 'Create Post');
  assert.equal(create.parameters.method, 'POST');
  assert.ok(!create.retryOnFail, 'Create Post has no idempotency key, so n8n must not retry it');
  assert.equal(create.onError, 'continueErrorOutput');
  assert.equal(create.credentials.httpHeaderAuth.name, 'Blotato API Key');
  assert.match(create.parameters.url, /adapter\.baseUrl \+ '\/v2\/posts'/);
  const creators = publishWf.nodes.filter((n) => n.type.endsWith('httpRequest') && n.parameters.method === 'POST' && /\/v2\/posts/.test(n.parameters.url));
  assert.equal(creators.length, 1, 'exactly one node can create a post');
  for (const name of ['Stage Media', 'Poll Post Status']) {
    const n = publishWf.nodes.find((x) => x.name === name);
    assert.equal(n.credentials.httpHeaderAuth.name, 'Blotato API Key');
    assert.ok(n.retryOnFail && n.maxTries >= 2, name);
  }
  const hook = publishWf.nodes.find((n) => n.type.endsWith('webhook'));
  assert.equal(hook.credentials.httpHeaderAuth.name, 'Reels Internal Webhook Auth');
  assert.equal(hook.parameters.path, 'reels/publish');
  // The intent is written before the create call, and the post id is stored right after it.
  const order = (a, b) => assert.ok(publishWf.connections[a].main.flat().some((c) => c.node === b), `${a} -> ${b}`);
  order('Write Intent', 'Init Create');
  order('Create Post', 'Classify Create');
  order('Save Post ID', 'Init Poll (New)');
});

test('workflow JSON: no secret values or production hosts are embedded, and only workflow 05 talks to Blotato', () => {
  const wfs = load();
  for (const wf of wfs) {
    const text = JSON.stringify(wf);
    assert.ok(!text.includes(TOKENS.blotato), `${wf.name} embeds a Blotato secret`);
    // The production host only appears inside the adapter guard (a constant), never as a node URL.
    assert.ok(!wf.nodes.some((n) => /backend\.blotato\.com/.test(String(n.parameters.url || ''))), `${wf.name} hard-codes the production host in a node URL`);
    assert.ok(wf === wfs[4] || !wf.nodes.some((n) => /blotato/i.test(JSON.stringify([n.credentials, n.parameters.url, n.parameters.jsonBody]))), `${wf.name} unexpectedly calls Blotato`);
    for (const n of wf.nodes.filter((x) => x.credentials)) {
      for (const c of Object.values(n.credentials)) assert.equal(c.id, 'REPLACE_ME');
    }
  }
  const auto = wfs[3].nodes.find((n) => n.name === 'Trigger Publish');
  assert.ok(auto.retryOnFail && /reels\/publish/.test(auto.parameters.url));
  assert.equal(wfs[3].nodes.find((n) => n.name === 'IF Auto Publish').parameters.conditions.conditions[0].leftValue, "={{ $env.AUTO_PUBLISH === 'true' }}");
});
