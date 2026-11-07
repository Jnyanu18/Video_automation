'use strict';
// Workflows 03 (approval) and 04 (HeyGen) run on the simulated n8n runtime against mock Airtable/Apify/OpenAI/HeyGen.
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
  };
});
test.after(() => mock.close());
test.beforeEach(() => {
  mock.reset();
  runner = new Runner({ workflows: load(), env: { ...env }, credentials: { ...CREDS } });
});

const noExecutionErrors = () => assert.deepEqual(runner.executions.filter((e) => e.error), []);
const heygenCalls = () => mock.state.calls.filter((c) => c.svc === 'heygen');
const heygenPosts = () => heygenCalls().filter((c) => c.method === 'POST');
const videos = () => [...mock.state.heygen.videos.values()];
const fp = (rec) => core.contentFingerprint(core.recordFromAirtable(rec));

function seed(code, extra = {}) {
  const now = new Date().toISOString();
  const id = 'rec' + code.replace(/[^A-Za-z0-9]/g, '').padEnd(10, '0');
  const rec = {
    id, createdTime: now,
    fields: {
      ReelKey: 'ig_' + code, ReelURL: `https://www.instagram.com/reel/${code}/`, Status: 'AWAITING_APPROVAL', ExtractionDone: true,
      SourceCaption: 'Morning routine tips', SourceTranscript: BASE_TRANSCRIPT, TranscriptSource: 'apify', ContentAttempts: 1, RetryCount: 0,
      Script: GOOD.script, Caption: GOOD.caption, Overlay: GOOD.overlay, Hashtags: GOOD.hashtags.map((t) => '#' + t).join(' '),
      CreatedTime: now, ModifiedTime: now, ...extra,
    },
  };
  mock.state.records.set(id, rec);
  return rec;
}
function seedApproved(code, extra = {}) {
  const rec = seed(code, { Status: 'APPROVED', ApprovedBy: 'alice', VideoAttempt: 1, ...extra });
  if (!('ApprovedFingerprint' in extra)) rec.fields.ApprovedFingerprint = fp(rec);
  return rec;
}

const act = (action, rec, extra = {}, headers = APPROVAL) => runner.handleWebhook('POST', 'reels/approval', { headers, body: { recordId: rec.id, action, actor: 'alice', ...extra } });
const approve = (rec, extra = {}) => act('approve', rec, { expectedFingerprint: fp(rec), ...extra });
const generateVideo = (rec) => runner.handleWebhook('POST', 'reels/video', { headers: INTERNAL, body: { recordId: rec.id } });
async function approveAndRun(rec) {
  const res = await approve(rec);
  await runner.idle();
  return res;
}

function assertVideoFailed(rec, code, from) {
  const f = rec.fields;
  assert.equal(f.Status, 'FAILED');
  assert.equal(f.FailedFromState, from);
  assert.ok(f.ErrorLog.includes(code), `ErrorLog should include ${code}: ${f.ErrorLog}`);
  assert.equal(f.LockedBy, undefined, 'lock must be released');
  for (const secret of [TOKENS.heygen, 'sim-airtable', 'internal-secret', 'approval-secret']) assert.ok(!f.ErrorLog.includes(secret), 'secret leaked into ErrorLog');
  noExecutionErrors();
}

// ---------------------------------------------------------------- end to end
test('end to end: intake -> content -> approval pause -> approve -> HeyGen -> Airtable', async () => {
  const code = 'E2EREEL001';
  const intake = await runner.handleWebhook('POST', 'reels/intake', { headers: INTAKE, body: { url: `https://www.instagram.com/reel/${code}/`, submittedBy: 'tester' } });
  assert.equal(intake.status, 202);
  await runner.idle();
  const rec = mock.records().find((r) => r.fields.ReelKey === 'ig_' + code);
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');

  // Paused: nothing reaches HeyGen, and a direct trigger of the video workflow is ignored.
  await generateVideo(rec);
  await runner.idle();
  assert.equal(heygenCalls().length, 0);
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');

  const view = await act('view', rec, {});
  assert.equal(view.status, 200);
  assert.equal(view.body.fingerprint, fp(rec));
  assert.equal(view.body.content.script, rec.fields.Script);

  const res = await approve(rec);
  assert.equal(res.status, 202);
  assert.deepEqual([res.body.status, res.body.trigger, res.body.triggerStatus], ['APPROVED', 'video', 'QUEUED']);
  await runner.idle();

  const f = rec.fields;
  assert.equal(f.Status, 'VIDEO_COMPLETED');
  assert.equal(f.HeyGenVideoId, 'vid_0001');
  assert.match(f.VideoURL, /^https:\/\/.*\/video\/vid_0001\.mp4$/);
  assert.equal(f.VideoDuration, 24);
  assert.match(f.ThumbnailURL, /thumb/);
  assert.equal(f.VideoAttempt, 1);
  assert.equal(f.ApprovedBy, 'alice');
  assert.equal(f.ApprovedFingerprint, fp(rec));
  assert.equal(f.HeyGenStatus, 'completed');
  assert.ok(f.VideoCompletedAt && f.ApprovedAt);
  assert.equal(f.LockedBy, undefined);

  assert.equal(heygenPosts().length, 1);
  const post = heygenPosts()[0];
  assert.equal(post.body.script, f.Script);
  assert.deepEqual([post.body.type, post.body.avatar_id, post.body.voice_id, post.body.aspect_ratio], ['avatar', 'avatar-sim', 'voice-sim', '9:16']);
  assert.equal(post.idempotencyKey, `ig_${code}:heygen:${fp(rec)}:1`);
  assert.ok(heygenCalls().filter((c) => c.method === 'GET').length >= 2, 'job was polled until completion');
  noExecutionErrors();
});

// ---------------------------------------------------------------- approval: auth, validation, pause
test('approval webhook: auth, input validation and unknown records never change state or reach HeyGen', async () => {
  const rec = seed('APPRVL0001');
  assert.equal((await act('view', rec, {}, {})).status, 403);
  assert.equal((await act('view', rec, {}, { 'X-Reels-Token': 'internal-secret' })).status, 403);
  const bad = [
    await act('approve', rec, {}),
    await act('approve', rec, { expectedFingerprint: 'nope' }),
    await act('reject', rec, { reason: 'x' }),
    await act('edit', rec, {}),
    await act('nuke', rec, {}),
    await runner.handleWebhook('POST', 'reels/approval', { headers: APPROVAL, body: { action: 'view', recordId: "rec'; DROP" } }),
    await runner.handleWebhook('POST', 'reels/approval', { headers: APPROVAL, body: { action: 'approve', recordId: rec.id, expectedFingerprint: fp(rec) } }),
  ];
  for (const r of bad) assert.equal(r.status, 400, JSON.stringify(r.body));
  assert.equal((await act('view', { id: 'recDOESNOTEXIST' }, {})).status, 404);
  const stale = await approve(rec, { expectedFingerprint: '0'.repeat(16) });
  assert.deepEqual([stale.status, stale.body.error], [409, 'STALE_CONTENT']);
  await runner.idle();
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');
  assert.equal(rec.fields.LockedBy, undefined);
  assert.equal(heygenCalls().length, 0);
});

test('approval does not accept content that fails validation (e.g. edited in Airtable to include a URL)', async () => {
  const rec = seed('APPRVL0002', { Script: `${GOOD.script} Buy now at https://spam.example/offer` });
  const res = await approve(rec);
  assert.deepEqual([res.status, res.body.error], [422, 'CONTENT_INVALID']);
  assert.ok(res.body.errors.includes('URL_IN_SCRIPT'));
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');
  assert.equal(heygenCalls().length, 0);
});

test('approve is only possible from AWAITING_APPROVAL', async () => {
  for (const [i, status] of ['EXTRACTING', 'CONTENT_GENERATED', 'REJECTED', 'FAILED'].entries()) {
    const rec = seed('APPRVL01' + i, { Status: status });
    const res = await approve(rec);
    assert.deepEqual([res.status, res.body.error], [409, 'INVALID_STATE'], status);
    assert.equal(rec.fields.Status, status);
  }
  await runner.idle();
  assert.equal(heygenCalls().length, 0);
});

// ---------------------------------------------------------------- editing
test('editing the script updates content, changes the fingerprint and keeps the record awaiting approval', async () => {
  const rec = seed('EDITREEL01');
  const before = fp(rec);
  const newScript = `${GOOD.script} Keep going every single day.`;
  const res = await act('edit', rec, { script: newScript, overlay: 'New overlay', hashtags: 'focus, #habits', expectedFingerprint: before });
  assert.equal(res.status, 200);
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');
  assert.equal(rec.fields.Script, newScript);
  assert.equal(rec.fields.Overlay, 'New overlay');
  assert.equal(rec.fields.Caption, GOOD.caption);
  assert.equal(rec.fields.Hashtags, '#focus #habits');
  assert.equal(rec.fields.LastAction, 'edit');
  assert.equal(rec.fields.LastActionBy, 'alice');
  assert.equal(rec.fields.LockedBy, undefined);
  assert.notEqual(fp(rec), before);
  assert.equal(res.body.fingerprint, fp(rec));

  const stale = await approve(rec, { expectedFingerprint: before });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error, 'STALE_CONTENT');
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');

  const ok = await approve(rec, { expectedFingerprint: res.body.fingerprint });
  assert.equal(ok.status, 202);
  await runner.idle();
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(heygenPosts()[0].body.script, newScript, 'HeyGen receives the edited, approved script');
});

test('invalid edits are rejected with reasons and leave the record untouched', async () => {
  const rec = seed('EDITREEL02');
  const snapshot = JSON.stringify(rec.fields);
  const cases = [
    [{ script: 'Too short.' }, 'SCRIPT_TOO_SHORT'],
    [{ script: `${GOOD.script} See https://spam.example` }, 'URL_IN_SCRIPT'],
    [{ script: `${BASE_TRANSCRIPT} ${BASE_TRANSCRIPT}` }, 'SCRIPT_TOO_SIMILAR_TO_SOURCE'],
    [{ overlay: 'x'.repeat(81) }, 'OVERLAY_TOO_LONG'],
    [{ hashtags: 'bad tag!' }, 'HASHTAG_FORMAT'],
    [{ script: 'word '.repeat(400) }, 'SCRIPT_TOO_LONG'],
  ];
  for (const [edit, code] of cases) {
    const res = await act('edit', rec, edit);
    assert.equal(res.status, 422, code);
    assert.ok(res.body.errors.some((e) => e.startsWith(code)), `${code} in ${res.body.errors}`);
  }
  assert.equal(JSON.stringify(rec.fields), snapshot);
});

test('editing is blocked after approval or rejection and with a stale fingerprint', async () => {
  const approved = seedApproved('EDITREEL03');
  const rejected = seed('EDITREEL04', { Status: 'REJECTED' });
  assert.equal((await act('edit', approved, { caption: 'new caption' })).body.error, 'INVALID_STATE');
  assert.equal((await act('edit', rejected, { caption: 'new caption' })).body.error, 'INVALID_STATE');
  const rec = seed('EDITREEL05');
  assert.equal((await act('edit', rec, { caption: 'new caption', expectedFingerprint: 'a'.repeat(16) })).body.error, 'STALE_CONTENT');
  assert.equal(rec.fields.Caption, GOOD.caption);
});

// ---------------------------------------------------------------- rejection and regeneration
test('rejection stops the pipeline: reason stored, no video, and approve afterwards is refused', async () => {
  const rec = seed('REJECT0001');
  const res = await act('reject', rec, { reason: 'Off brand tone' });
  assert.equal(res.status, 200);
  assert.equal(rec.fields.Status, 'REJECTED');
  assert.equal(rec.fields.RejectedReason, 'Off brand tone');
  assert.equal(rec.fields.LastAction, 'reject');
  assert.equal(rec.fields.LockedBy, undefined);
  assert.equal((await approve(rec)).body.error, 'INVALID_STATE');
  const again = await act('reject', rec, { reason: 'Off brand tone' });
  assert.deepEqual([again.status, again.body.duplicate], [200, true]);
  await generateVideo(rec);
  await runner.idle();
  assert.equal(heygenCalls().length, 0);
  assert.equal(rec.fields.Status, 'REJECTED');
});

test('regenerate from AWAITING_APPROVAL re-runs content generation with reviewer guidance and returns to approval', async () => {
  const rec = seed('REGEN00001');
  const before = fp(rec);
  const res = await act('regenerate', rec, { note: 'Make it punchier', expectedFingerprint: before });
  assert.deepEqual([res.status, res.body.status, res.body.triggerStatus], [202, 'EXTRACTING', 'QUEUED']);
  await runner.idle();
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');
  assert.equal(rec.fields.RegenerationCount, 1);
  assert.equal(rec.fields.ContentAttempts, 1);
  assert.equal(mock.state.chatRequests.length, 1);
  const prompt = mock.state.chatRequests[0].messages.map((m) => m.content).join('\n');
  assert.ok(prompt.includes('Reviewer guidance: Make it punchier'));
  assert.equal(heygenCalls().length, 0);
  noExecutionErrors();
});

test('regenerate from REJECTED works, and is limited', async () => {
  const rec = seed('REGEN00002', { Status: 'REJECTED', RejectedReason: 'meh' });
  const res = await act('regenerate', rec, {});
  assert.equal(res.status, 202);
  await runner.idle();
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');
  assert.equal(rec.fields.RegenerationNote, undefined);

  const capped = seed('REGEN00003', { RegenerationCount: 5 });
  const blocked = await act('regenerate', capped, {});
  assert.deepEqual([blocked.status, blocked.body.error], [409, 'REGENERATION_LIMIT_REACHED']);
  assert.equal(capped.fields.Status, 'AWAITING_APPROVAL');
  assert.equal((await act('regenerate', seed('REGEN00004', { Status: 'EXTRACTING' }), {})).body.error, 'INVALID_STATE');
  assert.equal((await act('regenerate', seed('REGEN00005', { Status: 'APPROVED' }), {})).body.error, 'INVALID_STATE');
});

// ---------------------------------------------------------------- concurrency and duplicate prevention
test('concurrent approvals create exactly one HeyGen job', async () => {
  const rec = seed('CONCUR0001');
  const results = await Promise.all([approve(rec), approve(rec)]);
  await runner.idle();
  assert.ok(results.some((r) => r.status === 202), JSON.stringify(results.map((r) => r.body)));
  for (const r of results) assert.ok([202, 200, 409, 423].includes(r.status), String(r.status));
  assert.equal(heygenPosts().length, 1);
  assert.equal(videos().length, 1);
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(rec.fields.LockedBy, undefined);
  noExecutionErrors();
});

test('approve and reject at the same time resolve to exactly one outcome and release the lock', async () => {
  const rec = seed('CONCUR0002');
  const [a, r] = await Promise.all([approve(rec), act('reject', rec, { reason: 'changed my mind' })]);
  await runner.idle();
  const approvedWon = rec.fields.Status === 'VIDEO_COMPLETED';
  if (approvedWon) {
    assert.equal(rec.fields.RejectedReason, undefined);
    assert.equal(heygenPosts().length, 1);
    assert.notEqual(r.status, 200);
  } else {
    assert.equal(rec.fields.Status, 'REJECTED');
    assert.equal(heygenPosts().length, 0);
    assert.notEqual(a.status, 202);
  }
  assert.equal(rec.fields.LockedBy, undefined, 'no lock may be left behind');
});

test('approving again after the video exists is an idempotent no-op', async () => {
  const rec = seed('CONCUR0003');
  await approveAndRun(rec);
  const again = await approve(rec);
  await runner.idle();
  assert.deepEqual([again.status, again.body.duplicate, again.body.triggerStatus], [200, true, 'NONE']);
  assert.equal(heygenPosts().length, 1);
});

test('re-approving an APPROVED record whose video trigger was lost re-triggers once', async () => {
  const rec = seedApproved('CONCUR0004');
  const res = await approve(rec);
  await runner.idle();
  assert.deepEqual([res.status, res.body.duplicate, res.body.triggerStatus], [202, true, 'QUEUED']);
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(heygenPosts().length, 1);
});

test('a failed trigger is reported to the caller and the record stays APPROVED for a safe retry', async () => {
  const rec = seed('CONCUR0005');
  runner.env.N8N_WEBHOOK_BASE = 'http://n8n.sim';
  const original = runner.handleWebhook.bind(runner);
  runner.handleWebhook = async (m, p, o) => (p === 'reels/video' && o.headers['X-Reels-Token'] === 'internal-secret' && runner.breakVideo ? { status: 503, body: {} } : original(m, p, o));
  runner.breakVideo = true;
  const res = await approve(rec);
  assert.deepEqual([res.status, res.body.status, res.body.triggerStatus], [202, 'APPROVED', 'FAILED']);
  assert.equal(rec.fields.Status, 'APPROVED');
  assert.equal(heygenCalls().length, 0);
  runner.breakVideo = false;
  const retry = await approve(rec);
  await runner.idle();
  assert.equal(retry.body.triggerStatus, 'QUEUED');
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(heygenPosts().length, 1);
});

test('video webhook: concurrent triggers submit one job (claim + settle + verify)', async () => {
  const rec = seedApproved('CONCUR0006');
  await Promise.all([generateVideo(rec), generateVideo(rec)]);
  await runner.idle();
  assert.equal(heygenPosts().length, 1);
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.ok(runner.executions.some((e) => e.trace.includes('Stop: Lost Claim')));
});

test('video webhook: unapproved, wrong-state and malformed requests never reach HeyGen', async () => {
  const recs = ['AWAITING_APPROVAL', 'REJECTED', 'EXTRACTING', 'CONTENT_GENERATED', 'VIDEO_COMPLETED', 'PUBLISHED'].map((s, i) => seed('GUARD0000' + i, { Status: s }));
  for (const r of recs) await generateVideo(r);
  await generateVideo({ id: "rec'; DROP" });
  await generateVideo({ id: undefined });
  await generateVideo({ id: 'recDOESNOTEXIST' });
  await runner.idle();
  assert.equal(heygenCalls().length, 0);
  assert.deepEqual(recs.map((r) => r.fields.Status), ['AWAITING_APPROVAL', 'REJECTED', 'EXTRACTING', 'CONTENT_GENERATED', 'VIDEO_COMPLETED', 'PUBLISHED']);
  assert.equal((await runner.handleWebhook('POST', 'reels/video', { headers: {}, body: { recordId: recs[0].id } })).status, 403);
  assert.equal((await runner.handleWebhook('POST', 'reels/video', { headers: APPROVAL, body: { recordId: recs[0].id } })).status, 403);
});

test('video webhook: a fresh lock held by another run blocks submission', async () => {
  const rec = seedApproved('GUARD0010', { LockedBy: 'other-run', LockedAt: new Date().toISOString() });
  await generateVideo(rec);
  await runner.idle();
  assert.equal(heygenCalls().length, 0);
  assert.equal(rec.fields.Status, 'APPROVED');
});

test('approval actions are refused while another run holds a fresh lock', async () => {
  const rec = seed('GUARD0011', { LockedBy: '4242', LockedAt: new Date().toISOString() });
  const res = await approve(rec);
  assert.deepEqual([res.status, res.body.error], [423, 'RECORD_BUSY']);
  assert.equal(rec.fields.LockedBy, '4242');
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');
});

// ---------------------------------------------------------------- integrity of the approval
test('content changed after approval is refused before any HeyGen call', async () => {
  const rec = seedApproved('TAMPER0001');
  rec.fields.Script = `${GOOD.script} Secretly edited after approval.`;
  await generateVideo(rec);
  await runner.idle();
  assertVideoFailed(rec, 'CONTENT_CHANGED_AFTER_APPROVAL', 'APPROVED');
  assert.equal(heygenCalls().length, 0);
});

test('a record set to APPROVED without going through the approval workflow is not generated', async () => {
  const rec = seed('TAMPER0002', { Status: 'APPROVED' });
  await generateVideo(rec);
  await runner.idle();
  assertVideoFailed(rec, 'NOT_APPROVED', 'APPROVED');
  assert.equal(heygenCalls().length, 0);
});

test('missing HeyGen configuration fails clearly without calling HeyGen', async () => {
  delete runner.env.HEYGEN_AVATAR_ID;
  const rec = seedApproved('TAMPER0003');
  await generateVideo(rec);
  await runner.idle();
  assertVideoFailed(rec, 'HEYGEN_AVATAR_ID_MISSING', 'APPROVED');
  assert.equal(heygenCalls().length, 0);
});

// ---------------------------------------------------------------- HeyGen submission failures and retries
test('transient HeyGen submit errors are retried and still produce a single job', async () => {
  mock.fault('heygen.create', 503, 2);
  const rec = seedApproved('SUBMIT0001');
  await generateVideo(rec);
  await runner.idle();
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(heygenPosts().length, 3);
  assert.equal(videos().length, 1);
  assert.equal(new Set(heygenPosts().map((p) => p.idempotencyKey)).size, 1, 'every retry reuses the same Idempotency-Key');
});

test('a lost submit response does not create a second job: the retry replays the same Idempotency-Key', async () => {
  mock.fault('heygen.create.lost', 500, 1);
  const rec = seedApproved('SUBMIT0002');
  await generateVideo(rec);
  await runner.idle();
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(heygenPosts().length, 2);
  assert.equal(videos().length, 1, 'only one billable job exists');
  assert.equal(rec.fields.HeyGenVideoId, 'vid_0001');
});

test('persistent submit failure marks FAILED(APPROVED) without bumping the attempt; retry then succeeds with one job', async () => {
  mock.fault('heygen.create', 500, 3);
  const rec = seedApproved('SUBMIT0003');
  await generateVideo(rec);
  await runner.idle();
  assertVideoFailed(rec, 'UPSTREAM_ERROR', 'APPROVED');
  assert.equal(rec.fields.VideoAttempt, 1);
  assert.equal(rec.fields.HeyGenVideoId, undefined);
  assert.equal(videos().length, 0);

  const retry = await act('retry', rec, {});
  await runner.idle();
  assert.deepEqual([retry.status, retry.body.status, retry.body.triggerStatus], [202, 'APPROVED', 'QUEUED']);
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(rec.fields.RetryCount, 1);
  assert.equal(rec.fields.FailedFromState, undefined);
  assert.equal(videos().length, 1);
});

test('HeyGen auth failure is reported without leaking the key and creates nothing', async () => {
  runner.creds['HeyGen API Key'] = { header: 'x-api-key', value: 'wrong-key-123' };
  const rec = seedApproved('SUBMIT0004');
  await generateVideo(rec);
  await runner.idle();
  assertVideoFailed(rec, 'AUTH_FAILED', 'APPROVED');
  assert.ok(!rec.fields.ErrorLog.includes('wrong-key-123'));
  assert.equal(videos().length, 0);
});

test('HeyGen rejecting the request (400) fails fast and is logged', async () => {
  runner.env.HEYGEN_RESOLUTION = '8k';
  const rec = seedApproved('SUBMIT0005');
  await generateVideo(rec);
  await runner.idle();
  assertVideoFailed(rec, 'BAD_REQUEST', 'APPROVED');
  assert.equal(videos().length, 0);
});

// ---------------------------------------------------------------- asynchronous job tracking
test('the job id is stored before polling and progress is recorded while polling', async () => {
  mock.state.heygen.pollsToFinish = 4;
  const rec = seedApproved('POLL000001');
  await generateVideo(rec);
  await runner.idle();
  const patches = mock.state.calls.filter((c) => c.svc === 'airtable' && c.method === 'PATCH' && c.body && c.body.fields);
  const idx = (pred) => patches.findIndex((p) => pred(p.body.fields));
  const saved = idx((f) => f.HeyGenVideoId === 'vid_0001' && f.Status === 'VIDEO_GENERATING');
  const firstGet = mock.state.calls.findIndex((c) => c.svc === 'heygen' && c.method === 'GET');
  assert.ok(saved >= 0);
  assert.ok(mock.state.calls.indexOf(patches[saved]) < firstGet, 'job id saved before first poll');
  assert.ok(patches.some((p) => p.body.fields.PollAttempts >= 1 && p.body.fields.HeyGenStatus), 'heartbeat written');
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(heygenCalls().filter((c) => c.method === 'GET').length, 4);
});

test('resume: an in-flight job after a crash is polled to completion without submitting again', async () => {
  const create = await fetch(`${mock.url}/v3/videos`, { method: 'POST', headers: { 'x-api-key': TOKENS.heygen, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'avatar', avatar_id: 'a', voice_id: 'v', script: 's', aspect_ratio: '9:16' }) });
  const { data } = await create.json();
  const rec = seedApproved('RESUME0001', { Status: 'VIDEO_GENERATING', HeyGenVideoId: data.video_id, PollAttempts: 2, LockedBy: 'dead-run', LockedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() });
  mock.state.calls.length = 0;
  await generateVideo(rec);
  await runner.idle();
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(heygenPosts().length, 0, 'no second job');
  assert.equal(videos().length, 1);
  assert.equal(rec.fields.HeyGenVideoId, data.video_id);
});

test('resume is blocked while another run holds a fresh lock', async () => {
  const rec = seedApproved('RESUME0002', { Status: 'VIDEO_GENERATING', HeyGenVideoId: 'vid_9999', LockedBy: 'live-run', LockedAt: new Date().toISOString() });
  await generateVideo(rec);
  await runner.idle();
  assert.equal(heygenCalls().length, 0);
  assert.equal(rec.fields.Status, 'VIDEO_GENERATING');
});

test('transient poll errors are retried; persistent poll errors end in FAILED(VIDEO_GENERATING) keeping the job id', async () => {
  mock.fault('heygen.poll', 503, 2);
  const ok = seedApproved('POLL000002');
  await generateVideo(ok);
  await runner.idle();
  assert.equal(ok.fields.Status, 'VIDEO_COMPLETED');

  mock.reset();
  mock.fault('heygen.poll', 503, 1000);
  runner.env.MAX_POLL_ATTEMPTS = '2';
  const bad = seedApproved('POLL000003');
  await generateVideo(bad);
  await runner.idle();
  assertVideoFailed(bad, 'POLL_TIMEOUT', 'VIDEO_GENERATING');
  assert.equal(bad.fields.HeyGenVideoId, 'vid_0001');
  assert.equal(heygenPosts().length, 1);
});

test('polling stops immediately on a non-retryable error (job not found / bad key)', async () => {
  mock.fault('heygen.poll', 404, 1000);
  const rec = seedApproved('POLL000004');
  await generateVideo(rec);
  await runner.idle();
  assertVideoFailed(rec, 'NOT_FOUND', 'VIDEO_GENERATING');
  assert.ok(heygenCalls().filter((c) => c.method === 'GET').length <= 3, 'only the HTTP node retries, no polling loop');
});

test('timeout keeps the job; a later retry resumes the same job instead of paying for a new one', async () => {
  mock.state.heygen.outcome = 'never';
  runner.env.MAX_POLL_ATTEMPTS = '3';
  const rec = seedApproved('TIMEOUT001');
  await generateVideo(rec);
  await runner.idle();
  assertVideoFailed(rec, 'POLL_TIMEOUT', 'VIDEO_GENERATING');
  assert.equal(rec.fields.HeyGenVideoId, 'vid_0001');
  assert.equal(heygenCalls().filter((c) => c.method === 'GET').length, 3);

  mock.state.heygen.videos.get('vid_0001').outcome = 'complete';
  const retry = await act('retry', rec, {});
  await runner.idle();
  assert.equal(retry.body.status, 'VIDEO_GENERATING');
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(heygenPosts().length, 1);
  assert.equal(videos().length, 1);
});

test('a render failure clears the job, advances the attempt and a retry submits a new job with a new key', async () => {
  mock.state.heygen.outcome = 'fail';
  const rec = seedApproved('RENDER0001');
  await generateVideo(rec);
  await runner.idle();
  assertVideoFailed(rec, 'avatar_unavailable', 'APPROVED');
  assert.ok(rec.fields.ErrorLog.includes('vid_0001'), 'failed job id kept in the log');
  assert.equal(rec.fields.HeyGenVideoId, undefined);
  assert.equal(rec.fields.VideoAttempt, 2);

  mock.state.heygen.outcome = 'complete';
  const retry = await act('retry', rec, {});
  await runner.idle();
  assert.equal(retry.status, 202);
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(videos().length, 2);
  const keys = heygenPosts().map((p) => p.idempotencyKey);
  assert.equal(new Set(keys).size, 2);
  assert.ok(keys[0].endsWith(':1') && keys[1].endsWith(':2'));
  assert.equal(rec.fields.HeyGenVideoId, 'vid_0002');
});

test('retries are capped so a failing render cannot spend credits forever', async () => {
  mock.state.heygen.outcome = 'fail';
  const rec = seedApproved('RENDER0002');
  await generateVideo(rec);
  await runner.idle();
  for (let i = 0; i < 6; i++) {
    const r = await act('retry', rec, {});
    await runner.idle();
    if (r.status !== 202) {
      assert.equal(r.body.error, 'VIDEO_ATTEMPT_LIMIT_REACHED');
      break;
    }
  }
  assert.equal(videos().length, 3, 'MAX_VIDEO_ATTEMPTS jobs at most');
  assert.equal(rec.fields.Status, 'FAILED');
});

test('retry is only offered for failed records at a retryable stage', async () => {
  const notFailed = seed('RETRY00001');
  const wrongStage = seed('RETRY00002', { Status: 'FAILED', FailedFromState: 'AWAITING_APPROVAL' });
  assert.equal((await act('retry', notFailed, {})).body.error, 'NOT_FAILED');
  assert.equal((await act('retry', wrongStage, {})).body.error, 'RETRY_NOT_SUPPORTED');
  assert.equal(wrongStage.fields.Status, 'FAILED');
});

test('an unusable finished video (too short) is treated as a failed job', async () => {
  mock.state.heygen.duration = 1;
  const rec = seedApproved('INVALID001');
  await generateVideo(rec);
  await runner.idle();
  assertVideoFailed(rec, 'VIDEO_INVALID', 'APPROVED');
  assert.equal(rec.fields.VideoAttempt, 2);
  assert.equal(rec.fields.VideoURL, undefined);
});

test('notifications: video ready and video failed, and a broken notifier never breaks the run', async () => {
  runner.env.NOTIFY_WEBHOOK_URL = env.APIFY_BASE_URL + '/notify';
  const ok = seedApproved('NOTIFY0001');
  await generateVideo(ok);
  await runner.idle();
  mock.state.heygen.outcome = 'fail';
  const bad = seedApproved('NOTIFY0002');
  await generateVideo(bad);
  await runner.idle();
  assert.ok(mock.state.notifications.some((n) => n.text.includes('Video ready')));
  assert.ok(mock.state.notifications.some((n) => n.text.includes('FAILED (video)')));
  mock.reset();
  mock.fault('notify', 500, 10);
  const rec = seedApproved('NOTIFY0003');
  await generateVideo(rec);
  await runner.idle();
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
});

test('Airtable failure while storing the job id is logged with the HeyGen id and the retry replays the same job', async () => {
  const rec = seedApproved('STORE00001');
  const orig = mock.state.records.get(rec.id);
  let patchFailures = 0;
  // Fail the Save Job PATCH (the one that stores HeyGenVideoId) for all HTTP retries.
  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    if (init && init.method === 'PATCH' && typeof init.body === 'string' && init.body.includes('"HeyGenVideoId"') && patchFailures < 3) {
      patchFailures += 1;
      return new Response(JSON.stringify({ error: { type: 'FAULT' } }), { status: 503, headers: { 'content-type': 'application/json' } });
    }
    return realFetch(url, init);
  };
  try {
    await generateVideo(rec);
    await runner.idle();
  } finally {
    global.fetch = realFetch;
  }
  assert.equal(orig.fields.Status, 'FAILED');
  assert.equal(orig.fields.FailedFromState, 'APPROVED');
  assert.ok(orig.fields.ErrorLog.includes('vid_0001'));
  assert.equal(orig.fields.VideoAttempt, 1);

  await act('retry', rec, {});
  await runner.idle();
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(videos().length, 1, 'same Idempotency-Key replayed the existing job');
  assert.equal(heygenPosts().length, 2);
  assert.equal(new Set(heygenPosts().map((p) => p.idempotencyKey)).size, 1);
});

// ---------------------------------------------------------------- workflow JSON
test('workflow 03/04 JSON: only workflow 04 talks to HeyGen, and its calls are authenticated, idempotent and retried', () => {
  const [intake, content, approval, video] = load();
  for (const wf of [intake, content, approval]) assert.ok(!wf.nodes.some((n) => /HEYGEN|heygen/.test(String(n.parameters.url || ''))), `${wf.name} must not call HeyGen`);
  const submit = video.nodes.find((n) => n.name === 'Submit Video');
  assert.equal(submit.parameters.method, 'POST');
  assert.ok(submit.parameters.headerParameters.parameters.some((h) => h.name === 'Idempotency-Key'));
  assert.ok(submit.retryOnFail && submit.maxTries >= 2);
  assert.equal(submit.credentials.httpHeaderAuth.name, 'HeyGen API Key');
  const poll = video.nodes.find((n) => n.name === 'Poll Status');
  assert.equal(poll.parameters.method, 'GET');
  assert.equal(poll.credentials.httpHeaderAuth.name, 'HeyGen API Key');
  assert.equal(video.nodes.filter((n) => /HEYGEN_BASE_URL/.test(n.parameters.url || '') && n.parameters.method === 'POST').length, 1, 'exactly one node can create a video');
});

test('workflow 03 JSON: webhook uses its own credential and responses carry dynamic status codes', () => {
  const approval = load()[2];
  const hook = approval.nodes.find((n) => n.type.endsWith('webhook'));
  assert.equal(hook.credentials.httpHeaderAuth.name, 'Reels Approval Webhook Auth');
  assert.equal(hook.parameters.path, 'reels/approval');
  assert.equal(hook.parameters.responseMode, 'responseNode');
  assert.ok(approval.nodes.filter((n) => n.type.endsWith('respondToWebhook')).every((n) => n.parameters.options.responseCode !== undefined));
});
