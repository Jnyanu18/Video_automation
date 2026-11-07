'use strict';
// Dashboard-facing workflow changes on the simulated n8n runtime against mocks: creative options on intake, intake/content
// retry, uploaded-video intake (06), the explicit publish action, per-record avatar/voice, and status/options probes (07).
// Nothing here talks to a real Airtable, Apify, OpenAI, HeyGen, Blotato or n8n instance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createMock, GOOD, BASE_TRANSCRIPT, TOKENS } = require('../mock/mock-server.cjs');
const { Runner } = require('./n8n-sim.cjs');
const core = require('../lib/core.js');

const N8N_DIR = path.join(__dirname, '..', 'n8n');
const FILES = [
  '01-reel-intake.json', '02-content-generation.json', '03-human-approval.json', '04-heygen-video.json', '05-instagram-publishing.json',
  '06-video-upload-intake.json', '07-integration-status.json',
];
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
let mockUrl;

const makeRunner = (over = {}) => new Runner({ workflows: load(), env: { ...env, ...over }, credentials: { ...CREDS } });

test.before(async () => {
  mockUrl = await mock.listen();
  env = {
    N8N_WEBHOOK_BASE: 'http://n8n.sim', AIRTABLE_BASE_URL: mockUrl, AIRTABLE_BASE_ID: 'appSIM', AIRTABLE_TABLE: 'Reels',
    APIFY_BASE_URL: mockUrl, OPENAI_BASE_URL: mockUrl, HEYGEN_BASE_URL: mockUrl, HEYGEN_AVATAR_ID: 'avatar-sim', HEYGEN_VOICE_ID: 'voice-sim',
    HEYGEN_POLL_SECONDS: '1', HEYGEN_POLL_CAP_SECONDS: '1', MAX_POLL_ATTEMPTS: '6',
    PUBLISH_ADAPTER: 'mock', MOCK_PUBLISH_BASE_URL: mockUrl, BLOTATO_MEDIA_HOSTS: 'mock-blotato.test', BLOTATO_ACCOUNT_ID: 'acc_mock_1',
    PUBLISH_POLL_SECONDS: '1', PUBLISH_POLL_CAP_SECONDS: '1', MAX_PUBLISH_POLL_ATTEMPTS: '6', POST_CREATE_RETRY_SECONDS: '1',
  };
});
test.after(() => mock.close());
test.beforeEach(() => {
  mock.reset();
  runner = makeRunner();
});

const noExecutionErrors = () => assert.deepEqual(runner.executions.filter((e) => e.error), []);
const fp = (rec) => core.contentFingerprint(core.recordFromAirtable(rec));
const calls = (svc) => mock.state.calls.filter((c) => c.svc === svc);
const heygenPosts = () => calls('heygen').filter((c) => c.method === 'POST');
const createCalls = () => calls('blotato').filter((c) => c.method === 'POST' && c.path === '/v2/posts');
const byKey = (key) => mock.records().find((r) => r.fields.ReelKey === key);
const fieldsOf = (key) => (byKey(key) || { fields: {} }).fields;
const act = (action, rec, extra = {}) => runner.handleWebhook('POST', 'reels/approval', { headers: APPROVAL, body: { recordId: rec.id, action, actor: 'alice', ...extra } });
const submit = (code, extra = {}) => runner.handleWebhook('POST', 'reels/intake', { headers: INTAKE, body: { url: `https://www.instagram.com/reel/${code}/`, submittedBy: 'tester', ...extra } });

const SHA = 'a1'.repeat(32);
const uploadBody = (over = {}) => ({
  fileName: 'promo.mp4', sizeBytes: 5000000, mimeType: 'video/mp4', sha256: SHA, durationSeconds: 24,
  videoUrl: 'https://uploads.example.test/media/abc123.mp4', caption: 'Our new launch. Save this for later.', overlay: 'Launch day',
  hashtags: ['launch', 'brand'], submittedBy: 'alice', ...over,
});
const upload = (over, headers = INTERNAL) => runner.handleWebhook('POST', 'reels/upload', { headers, body: uploadBody(over) });

function seed(code, extra = {}) {
  const now = new Date().toISOString();
  const id = 'rec' + code.replace(/[^A-Za-z0-9]/g, '').padEnd(10, '0');
  const rec = {
    id, createdTime: now,
    fields: {
      ReelKey: 'ig_' + code, ReelURL: `https://www.instagram.com/reel/${code}/`, Status: 'APPROVED', ExtractionDone: true,
      SourceCaption: 'Morning routine tips', SourceTranscript: BASE_TRANSCRIPT, TranscriptSource: 'apify', ContentAttempts: 1, RetryCount: 0,
      Script: GOOD.script, Caption: GOOD.caption, Overlay: GOOD.overlay, Hashtags: GOOD.hashtags.map((t) => '#' + t).join(' '),
      ApprovedBy: 'alice', VideoAttempt: 1, CreatedTime: now, ModifiedTime: now, ...extra,
    },
  };
  if (!('ApprovedFingerprint' in extra)) rec.fields.ApprovedFingerprint = fp(rec);
  mock.state.records.set(id, rec);
  return rec;
}

// ---------------------------------------------------------------- pure logic
const CFG = core.cfgFromEnv({ BLOTATO_MEDIA_HOSTS: 'mock-blotato.test' });

test('submit options: optional, length-limited, control characters stripped, IDs charset-restricted', () => {
  assert.deepEqual(core.normalizeSubmitOptions({}), { ok: true, errors: [], options: {} });
  const good = core.normalizeSubmitOptions({ niche: ' fitness\u0000 ', brandVoice: 'Friendly', brandVoiceNotes: 'Short sentences', avatarId: 'avatar_1-b', voiceId: 'v1' });
  assert.deepEqual(good.options, { niche: 'fitness', brandVoice: 'Friendly', brandVoiceNotes: 'Short sentences', avatarId: 'avatar_1-b', voiceId: 'v1' });
  const bad = core.normalizeSubmitOptions({ niche: 'x'.repeat(61), brandVoiceNotes: 5, avatarId: 'a b', voiceId: '../x' });
  assert.deepEqual(bad.errors.sort(), ['AVATAR_ID_INVALID', 'BRAND_VOICE_NOTES', 'NICHE_TOO_LONG', 'VOICE_ID_INVALID']);
});

test('upload record validation covers file, video, content and options', () => {
  const ok = core.buildUploadRecord(uploadBody(), CFG, '2026-01-01T00:00:00.000Z');
  assert.equal(ok.ok, true);
  assert.equal(ok.key, 'up_' + SHA.slice(0, 16));
  assert.equal(ok.fields.Status, 'AWAITING_APPROVAL');
  assert.equal(ok.fields.SourceType, 'upload');
  assert.equal(ok.fields.Hashtags, '#launch #brand');
  assert.equal(ok.fields.VideoDuration, 24);
  assert.ok(core.keyFormula(ok.key).includes(ok.key));
  const errs = (o) => core.buildUploadRecord(uploadBody(o), CFG, 'now').errors;
  assert.ok(errs({ fileName: '../x.mp4' }).includes('FILE_NAME_INVALID'));
  assert.ok(errs({ sizeBytes: 0 }).includes('FILE_EMPTY'));
  assert.ok(errs({ sizeBytes: CFG.maxUploadBytes + 1 }).includes('FILE_TOO_LARGE'));
  assert.ok(errs({ mimeType: 'image/png' }).includes('FILE_TYPE_UNSUPPORTED'));
  assert.ok(errs({ sha256: 'xyz' }).includes('SHA256_INVALID'));
  assert.ok(errs({ videoUrl: 'http://uploads.example.test/a.mp4' }).includes('VIDEO_URL_NOT_PUBLIC_HTTPS'));
  assert.ok(errs({ durationSeconds: 1 }).includes('VIDEO_TOO_SHORT'));
  assert.ok(errs({ durationSeconds: 500 }).includes('VIDEO_TOO_LONG'));
  assert.ok(errs({ caption: '' }).includes('CAPTION_EMPTY'));
  assert.ok(errs({ hashtags: ['bad tag!'] }).includes('HASHTAG_FORMAT'));
  assert.ok(errs({ niche: 5 }).includes('NICHE'));
});

test('approval of uploaded videos: approve skips rendering, edit excludes the script, regenerate is refused, publish needs approval', () => {
  const now = Date.now();
  const rec = (x = {}) => ({
    id: 'recUPLOAD0001', key: 'up_a', status: 'AWAITING_APPROVAL', sourceType: 'upload', script: '', caption: 'Launch day caption', overlay: 'Launch', hashtags: '#launch',
    videoUrl: 'https://uploads.example.test/media/abc.mp4', videoDuration: 24, regenerationCount: 0, videoAttempt: 0, ...x,
  });
  const run = (r, req, cfg = CFG) => core.decideApproval({ record: r, req, cfg, now, runId: 'approval:1', phase: 'pre' });
  const q = (action, extra = {}) => core.validateApprovalRequest({ recordId: 'recUPLOAD0001', action, actor: 'alice', ...extra }).req;
  const fpr = core.contentFingerprint(rec());

  const a = run(rec(), q('approve', { expectedFingerprint: fpr }));
  assert.deepEqual([a.ok, a.fields.Status, a.trigger, a.httpStatus], [true, 'VIDEO_COMPLETED', null, 200]);
  assert.equal(a.fields.ApprovedFingerprint, fpr);
  const auto = run(rec(), q('approve', { expectedFingerprint: fpr }), { ...CFG, autoPublish: true });
  assert.deepEqual([auto.trigger, auto.httpStatus], ['publish', 202]);
  assert.equal(run(rec({ videoUrl: 'http://x/a.mp4' }), q('approve', { expectedFingerprint: fpr })).error, 'VIDEO_INVALID');
  assert.equal(run(rec({ caption: '' }), q('approve', { expectedFingerprint: core.contentFingerprint(rec({ caption: '' })) })).error, 'CONTENT_INVALID');

  const e = run(rec(), q('edit', { caption: 'A better caption', hashtags: 'x y' }));
  assert.deepEqual([e.ok, e.fields.Caption, e.fields.Hashtags], [true, 'A better caption', '#x #y']);
  assert.deepEqual(run(rec(), q('edit', { script: 'new words' })).errors, ['SCRIPT_NOT_APPLICABLE_TO_UPLOAD']);
  assert.equal(run(rec(), q('regenerate')).error, 'REGENERATE_NOT_SUPPORTED_FOR_UPLOAD');

  const approved = rec({ status: 'VIDEO_COMPLETED', approvedFingerprint: fpr });
  const p = run(approved, q('publish', { expectedFingerprint: fpr }));
  assert.deepEqual([p.ok, p.trigger, p.httpStatus, p.response.publishRequested], [true, 'publish', 202, true]);
  assert.equal(run(rec(), q('publish', { expectedFingerprint: fpr })).error, 'INVALID_STATE', 'not approved yet');
  assert.equal(run({ ...approved, approvedFingerprint: undefined }, q('publish', { expectedFingerprint: fpr })).error, 'NOT_APPROVED');
  assert.equal(run(approved, q('publish', { expectedFingerprint: 'f'.repeat(16) })).error, 'STALE_CONTENT');
  assert.equal(run({ ...approved, caption: 'changed later' }, q('publish', { expectedFingerprint: fpr })).error, 'STALE_CONTENT');
  assert.equal(run({ ...approved, videoUrl: '' }, q('publish', { expectedFingerprint: fpr })).error, 'VIDEO_INVALID');
  for (const s of ['READY_TO_PUBLISH', 'PUBLISHING', 'PUBLISHED']) {
    const d = run({ ...approved, status: s }, q('publish', { expectedFingerprint: fpr }));
    assert.deepEqual([d.ok, d.trigger, d.response.duplicate], [true, null, true], s);
  }
  assert.ok(core.validateApprovalRequest({ recordId: 'recUPLOAD0001', action: 'publish', actor: 'a' }).errors.includes('FINGERPRINT_REQUIRED'));
  assert.equal(core.decideVideoEntry({ record: { id: 'r', status: 'APPROVED', sourceType: 'upload', videoAttempt: 0 }, cfg: CFG, now }).reason, 'UPLOAD_NEEDS_NO_RENDER');
});

test('HeyGen request prefers the record avatar/voice, falls back to env, and prompts carry niche and brand voice', () => {
  const rec = { id: 'recA', key: 'ig_A', script: 'some words here', videoAttempt: 1 };
  rec.approvedFingerprint = core.contentFingerprint(rec);
  const e = { HEYGEN_AVATAR_ID: 'env_av', HEYGEN_VOICE_ID: 'env_vo' };
  assert.deepEqual([core.buildHeyGenRequest(rec, e).body.avatar_id, core.buildHeyGenRequest(rec, e).body.voice_id], ['env_av', 'env_vo']);
  const mine = core.buildHeyGenRequest({ ...rec, avatarId: 'my_av', voiceId: 'my_vo' }, e).body;
  assert.deepEqual([mine.avatar_id, mine.voice_id], ['my_av', 'my_vo']);
  assert.deepEqual(core.buildHeyGenRequest(rec, {}).errors, ['HEYGEN_AVATAR_ID_MISSING', 'HEYGEN_VOICE_ID_MISSING']);
  assert.ok(core.buildHeyGenRequest({ ...rec, sourceType: 'upload' }, e).errors.includes('UPLOADED_VIDEO_NEEDS_NO_RENDER'));
  const p = core.buildContentPrompt({ caption: 'c', transcript: 't', niche: 'fitness', brandVoice: 'Playful', brandVoiceNotes: 'no jargon' }, CFG, '');
  assert.ok(p.user.includes('Niche / topic area: fitness') && p.user.includes('Brand voice: Playful (no jargon)'));
  assert.ok(!core.buildContentPrompt({ caption: 'c', transcript: 't' }, CFG, '').user.includes('Brand voice'));
});

test('HeyGen option lists: only well-formed items with https previews, failures become warnings', () => {
  const o = core.normalizeHeyGenOptions(
    { data: [{ id: 'a1', name: 'A', preview_image_url: 'javascript:alert(1)', preview_video_url: 'https://x/v.mp4' }, { id: 'bad id' }, null], has_more: true },
    { data: [{ voice_id: 'v1', name: 'V', status: 'ACTIVE' }, { voice_id: 'v2', status: 'FAILED' }] },
    { error: { message: 'boom', httpCode: 500 } },
    { HEYGEN_AVATAR_ID: 'a1' },
  );
  assert.deepEqual(o.avatars.map((a) => [a.id, a.previewImageUrl, a.previewVideoUrl]), [['a1', '', 'https://x/v.mp4']]);
  assert.deepEqual(o.voices.map((v) => [v.id, v.scope]), [['v1', 'private']]);
  assert.equal(o.hasMoreAvatars, true);
  assert.equal(o.warnings.length, 1);
  assert.equal(o.defaults.avatarId, 'a1');
});

test('intake retry decision only proceeds for an unlocked SUBMITTED reel that never finished extraction', () => {
  const d = (x) => core.decideIntakeRetry({ record: { id: 'r1', status: 'SUBMITTED', reelUrl: 'https://www.instagram.com/reel/ABCDE12345/', key: 'ig_ABCDE12345', extractionDone: false, ...x }, cfg: CFG, now: Date.now() });
  assert.equal(d({}).action, 'proceed');
  assert.equal(d({ status: 'EXTRACTING' }).action, 'skip');
  assert.equal(d({ extractionDone: true }).reason, 'EXTRACTION_ALREADY_DONE');
  assert.equal(d({ lockedBy: 'x', lockedAt: new Date().toISOString() }).reason, 'LOCKED_BY_OTHER_RUN');
  assert.equal(d({ sourceType: 'upload' }).reason, 'NOT_A_REEL_URL_RECORD');
});

// ---------------------------------------------------------------- intake options and retries
test('intake stores niche, brand voice and avatar/voice choices and the prompt uses them', async () => {
  const res = await submit('OPTSREEL01', { niche: 'fitness', brandVoice: 'Playful', brandVoiceNotes: 'no jargon', avatarId: 'avatar_mock_ben', voiceId: 'voice_mock_en_m' });
  assert.equal(res.status, 202);
  await runner.idle();
  const f = fieldsOf('ig_OPTSREEL01');
  assert.deepEqual([f.Status, f.SourceType, f.Niche, f.BrandVoice, f.BrandVoiceNotes, f.AvatarID, f.VoiceID], ['AWAITING_APPROVAL', 'reel', 'fitness', 'Playful', 'no jargon', 'avatar_mock_ben', 'voice_mock_en_m']);
  assert.ok(mock.state.chatRequests[0].messages[1].content.includes('Niche / topic area: fitness'));
  noExecutionErrors();
});

test('intake rejects malformed options without creating anything', async () => {
  const res = await submit('OPTSREEL02', { avatarId: 'bad id!', niche: 'x'.repeat(100) });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.errors.sort(), ['AVATAR_ID_INVALID', 'NICHE_TOO_LONG']);
  assert.equal(mock.records().length, 0);
});

test('a reel that failed during extraction is retried from the saved URL without a duplicate record', async () => {
  mock.fault('apify', 500, 3);
  await submit('RETRYINT01');
  await runner.idle();
  const rec = byKey('ig_RETRYINT01');
  assert.deepEqual([rec.fields.Status, rec.fields.FailedFromState, rec.fields.ExtractionDone], ['FAILED', 'EXTRACTING', false]);
  const res = await act('retry', rec);
  assert.equal(res.status, 202);
  assert.deepEqual([res.body.trigger, res.body.triggerStatus], ['intake', 'QUEUED']);
  await runner.idle();
  assert.deepEqual([rec.fields.Status, rec.fields.RetryCount, rec.fields.ExtractionDone], ['AWAITING_APPROVAL', 1, true]);
  assert.equal(mock.records().length, 1);
  assert.equal(calls('apify').length, 4);
  assert.equal(rec.fields.LockedBy, undefined);
  noExecutionErrors();
});

test('a reel that failed during AI generation is retried without scraping again', async () => {
  mock.fault('openai.chat', 500, 50);
  await submit('RETRYGEN01');
  await runner.idle();
  const rec = byKey('ig_RETRYGEN01');
  assert.deepEqual([rec.fields.Status, rec.fields.FailedFromState, rec.fields.ExtractionDone], ['FAILED', 'EXTRACTING', true]);
  mock.fault('openai.chat', 500, 0);
  const res = await act('retry', rec);
  assert.deepEqual([res.status, res.body.trigger], [202, 'content']);
  await runner.idle();
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');
  assert.equal(calls('apify').length, 1, 'no second scrape');
  noExecutionErrors();
});

test('retry is not re-triggered for a record that is no longer failed (double click)', async () => {
  mock.fault('apify', 500, 3);
  await submit('RETRYINT02');
  await runner.idle();
  const rec = byKey('ig_RETRYINT02');
  const [a, b] = [await act('retry', rec), await act('retry', rec)];
  await runner.idle();
  assert.equal(a.status, 202);
  assert.equal(b.status, 409);
  assert.equal(calls('apify').length, 4);
});

// ---------------------------------------------------------------- uploaded videos (workflow 06)
test('an uploaded video skips extraction and generation and waits for approval', async () => {
  const res = await upload();
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'AWAITING_APPROVAL');
  const f = fieldsOf('up_' + SHA.slice(0, 16));
  assert.deepEqual([f.Status, f.SourceType, f.VideoURL, f.UploadFileName, f.UploadSizeBytes, f.ExtractionDone], ['AWAITING_APPROVAL', 'upload', 'https://uploads.example.test/media/abc123.mp4', 'promo.mp4', 5000000, true]);
  assert.equal(calls('apify').length + calls('openai').length + calls('heygen').length + calls('blotato').length, 0);
  noExecutionErrors();
});

test('uploading the same file twice, even concurrently, yields one record', async () => {
  mock.state.latencyMs = 10;
  const [a, b] = await Promise.all([upload(), upload()]);
  assert.equal([a, b].filter((r) => r.body.duplicate === false).length, 1);
  assert.equal(mock.records().length, 1);
  const again = await upload();
  assert.deepEqual([again.status, again.body.duplicate], [200, true]);
  assert.equal(mock.records().length, 1);
});

test('upload intake rejects invalid files and unauthenticated callers', async () => {
  for (const over of [{ mimeType: 'text/plain' }, { durationSeconds: 1 }, { videoUrl: 'http://insecure.test/a.mp4' }, { caption: '  ' }, { sha256: 'short' }]) {
    const r = await upload(over);
    assert.equal(r.status, 400, JSON.stringify(over));
    assert.equal(r.body.error, 'INVALID_UPLOAD');
  }
  assert.equal((await upload({}, {})).status, 403);
  assert.equal((await upload({}, INTAKE)).status, 403);
  assert.equal(mock.records().length, 0);
});

test('an uploaded video is only published after approval and an explicit publish request, exactly once', async () => {
  await upload();
  const rec = byKey('up_' + SHA.slice(0, 16));
  const fpr = fp(rec);

  assert.equal((await act('publish', rec, { expectedFingerprint: fpr })).status, 409, 'publish before approval is refused');
  assert.equal(createCalls().length, 0);

  const approved = await act('approve', rec, { expectedFingerprint: fpr });
  assert.deepEqual([approved.status, approved.body.status, approved.body.triggerStatus], [200, 'VIDEO_COMPLETED', 'NONE']);
  await runner.idle();
  assert.equal(rec.fields.Status, 'VIDEO_COMPLETED');
  assert.equal(createCalls().length, 0, 'approval alone does not publish');
  assert.equal(heygenPosts().length, 0, 'uploaded videos are never sent to HeyGen');

  const first = await act('publish', rec, { expectedFingerprint: fpr });
  assert.deepEqual([first.status, first.body.triggerStatus], [202, 'QUEUED']);
  await runner.idle();
  assert.equal(rec.fields.Status, 'PUBLISHED', rec.fields.ErrorLog);
  assert.ok(/^https:\/\/www\.instagram\.com\/reel\//.test(rec.fields.PublishedURL));
  assert.equal(createCalls().length, 1);
  assert.equal(createCalls()[0].body.post.content.text.includes('Our new launch'), true);

  const second = await act('publish', rec, { expectedFingerprint: fpr });
  assert.deepEqual([second.status, second.body.duplicate, second.body.trigger], [200, true, null]);
  await runner.idle();
  assert.equal(createCalls().length, 1, 'a second click never creates a second post');
  noExecutionErrors();
});

test('editing an uploaded video caption after approval-time view changes the fingerprint and invalidates stale approvals', async () => {
  await upload();
  const rec = byKey('up_' + SHA.slice(0, 16));
  const old = fp(rec);
  const edited = await act('edit', rec, { caption: 'Fresh caption that is better', expectedFingerprint: old });
  assert.equal(edited.status, 200);
  assert.notEqual(edited.body.fingerprint, old);
  assert.equal((await act('approve', rec, { expectedFingerprint: old })).body.error, 'STALE_CONTENT');
  assert.equal((await act('approve', rec, { expectedFingerprint: edited.body.fingerprint })).status, 200);
  assert.equal((await act('regenerate', rec)).status, 409);
});

test('publish request for an AI-generated reel refreshes the HeyGen URL and publishes once', async () => {
  mock.state.heygen.videos.set('vid_0001', { id: 'vid_0001', body: { title: 't' }, polls: 5, outcome: 'complete', pollsToFinish: 2, duration: 24 });
  const rec = seed('PUBGEN0001', { Status: 'VIDEO_COMPLETED', HeyGenVideoId: 'vid_0001', VideoURL: 'https://cdn.mock-heygen.invalid/video/vid_0001.mp4', VideoDuration: 24 });
  const wrongFp = await act('publish', rec, { expectedFingerprint: 'f'.repeat(16) });
  assert.equal(wrongFp.body.error, 'STALE_CONTENT');
  assert.equal(createCalls().length, 0);
  const ok = await act('publish', rec, { expectedFingerprint: fp(rec) });
  assert.equal(ok.status, 202);
  await runner.idle();
  assert.equal(rec.fields.Status, 'PUBLISHED', rec.fields.ErrorLog);
  assert.equal(createCalls().length, 1);
});

test('a failed publish is retryable from the dashboard action', async () => {
  const rec = seed('PUBFAIL001', { Status: 'VIDEO_COMPLETED', VideoURL: 'https://uploads.example.test/media/z.mp4', VideoDuration: 24, SourceType: 'upload', Script: '' });
  rec.fields.ApprovedFingerprint = fp(rec);
  mock.fault('blotato.media', 403, 5);
  await act('publish', rec, { expectedFingerprint: fp(rec) });
  await runner.idle();
  assert.equal(rec.fields.Status, 'FAILED');
  assert.equal(createCalls().length, 0);
  mock.fault('blotato.media', 403, 0);
  const r = await act('retry', rec);
  assert.deepEqual([r.status, r.body.trigger], [202, 'publish']);
  await runner.idle();
  assert.equal(rec.fields.Status, 'PUBLISHED', rec.fields.ErrorLog);
  assert.equal(createCalls().length, 1);
});

// ---------------------------------------------------------------- per-record avatar and voice
test('video generation uses the avatar and voice chosen for the record, else the env defaults', async () => {
  const chosen = seed('AVCHOSEN01', { AvatarID: 'avatar_mock_ben', VoiceID: 'voice_mock_my_clone' });
  const plain = seed('AVDEFAULT1');
  for (const rec of [chosen, plain]) {
    await runner.handleWebhook('POST', 'reels/video', { headers: INTERNAL, body: { recordId: rec.id } });
    await runner.idle();
  }
  const bodies = heygenPosts().map((c) => c.body);
  assert.deepEqual(bodies.map((b) => [b.avatar_id, b.voice_id]), [['avatar_mock_ben', 'voice_mock_my_clone'], ['avatar-sim', 'voice-sim']]);
  assert.equal(chosen.fields.Status, 'VIDEO_COMPLETED');
  noExecutionErrors();
});

// ---------------------------------------------------------------- status and options (workflow 07)
const status = (r = runner, headers = INTERNAL) => r.handleWebhook('POST', 'reels/status', { headers, body: {} });
const options = (r = runner, headers = INTERNAL) => r.handleWebhook('POST', 'reels/options', { headers, body: {} });

test('status probes every provider for real and reports configuration without exposing secrets', async () => {
  const res = await status();
  assert.equal(res.status, 200);
  const i = res.body.integrations;
  for (const k of ['n8n', 'airtable', 'apify', 'openai', 'heygen', 'blotato']) assert.equal(i[k].status, 'connected', k + ': ' + JSON.stringify(i[k]));
  assert.equal(i.heygen.account, 'mock-heygen-user');
  assert.deepEqual(i.blotato.account, { id: 'acc_mock_1', username: '@mock_brand', fullname: 'Mock Brand' });
  assert.equal(res.body.settings.publishAdapter, 'mock');
  assert.equal(res.body.settings.autoPublish, false);
  assert.equal(res.body.settings.defaultAvatarConfigured, true);
  const text = JSON.stringify(res.body);
  for (const secret of ['sim-airtable', 'sim-apify', 'sim-openai', 'sim-heygen', 'sim-blotato', 'internal-secret', 'approval-secret', 'intake-secret']) assert.ok(!text.includes(secret), secret + ' leaked');
  for (const svc of ['airtable', 'apify', 'openai', 'heygen', 'blotato']) assert.ok(calls(svc).length >= 1, svc + ' was probed');
  assert.ok(calls('blotato').every((c) => c.method === 'GET'), 'probes never publish');
  noExecutionErrors();
});

test('status reports real provider failures per integration', async () => {
  mock.fault('heygen.probe', 401, 1);
  mock.fault('apify.probe', 500, 5);
  mock.fault('blotato.probe', 403, 1);
  const i = (await status()).body.integrations;
  assert.deepEqual([i.heygen.status, i.heygen.code], ['error', 'AUTH_FAILED']);
  assert.deepEqual([i.apify.status, i.apify.code], ['error', 'UPSTREAM_ERROR']);
  assert.equal(i.blotato.status, 'error');
  assert.equal(i.openai.status, 'connected');
});

test('status reports missing configuration as unconfigured, and a missing Instagram account as an error', async () => {
  const r = makeRunner({ AIRTABLE_BASE_ID: '', PUBLISH_ADAPTER: 'blotato', BLOTATO_ACCOUNT_ID: '' });
  const i = (await status(r)).body.integrations;
  assert.deepEqual([i.airtable.status, i.airtable.missing], ['unconfigured', ['AIRTABLE_BASE_ID']]);
  assert.equal(i.blotato.status, 'unconfigured');
  assert.equal(calls('blotato').length, 0, 'no call is made with an unresolved adapter');
  const r2 = makeRunner({ BLOTATO_ACCOUNT_ID: 'acc_other' });
  assert.equal((await status(r2)).body.integrations.blotato.code, 'ACCOUNT_NOT_FOUND');
});

test('status and options require the internal token', async () => {
  assert.equal((await status(runner, {})).status, 403);
  assert.equal((await options(runner, APPROVAL)).status, 403);
  assert.equal(mock.state.calls.length, 0);
});

test('options lists HeyGen avatars and voices, and degrades to warnings when HeyGen fails', async () => {
  const res = await options();
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.avatars.map((a) => a.id), ['avatar_mock_anna', 'avatar_mock_ben']);
  assert.deepEqual(res.body.voices.map((v) => [v.id, v.scope]), [['voice_mock_my_clone', 'private'], ['voice_mock_en_f', 'public'], ['voice_mock_en_m', 'public']]);
  assert.equal(res.body.avatars[1].previewVideoUrl, '');
  assert.equal(res.body.warnings.length, 0);
  mock.fault('heygen.options', 500, 9);
  const bad = await options();
  assert.deepEqual([bad.body.avatars.length, bad.body.voices.length], [0, 0]);
  assert.equal(bad.body.warnings.length, 3);
});

test('Airtable list pagination in the mock hands out offsets like the real API', async () => {
  for (let i = 0; i < 5; i++) seed('PAGE00000' + i);
  const get = (q) => fetch(`${mockUrl}/v0/appSIM/Reels?${q}`, { headers: { authorization: TOKENS.airtable } }).then((r) => r.json());
  const p1 = await get('pageSize=2');
  assert.equal(p1.records.length, 2);
  const p2 = await get('pageSize=2&offset=' + p1.offset);
  const p3 = await get('pageSize=2&offset=' + p2.offset);
  assert.deepEqual([p2.records.length, p3.records.length, p3.offset], [2, 1, undefined]);
});
