const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../lib/core.js');
const cfg = c.cfgFromEnv({});

const goodScript = 'Small habits compound quietly over time. Pick one tiny action you can repeat daily, attach it to something you already do, and track it for two weeks. When it feels automatic, add a second habit on top. Progress feels slow at first, then suddenly obvious, because consistency beats intensity every single time you show up.';
const reel = { caption: 'Morning routine tips', transcript: 'wake early drink water stretch for ten minutes and write down three goals before checking your phone', owner: 'x' };

test('state machine allows forward path and blocks skips', () => {
  assert.ok(c.canTransition('APPROVED', 'VIDEO_GENERATING'));
  assert.ok(!c.canTransition('SUBMITTED', 'PUBLISHED'));
  assert.ok(!c.canTransition('PUBLISHED', 'FAILED'));
  assert.throws(() => c.assertTransition('REJECTED', 'APPROVED'));
});

test('url validation', () => {
  assert.equal(c.normalizeReelUrl('https://www.instagram.com/reel/ABC123xyz/?igsh=1').key, 'ig_ABC123xyz');
  for (const bad of ['http://instagram.com/reel/ABC123xyz/', 'https://evil.com/reel/ABC123xyz/', 'https://instagram.com.evil.com/reel/ABC123xyz/', '', null])
    assert.equal(c.normalizeReelUrl(bad).ok, false);
});

test('key formula rejects injection', () => {
  assert.throws(() => c.keyFormula("ig_x'),1=1,('"));
  assert.equal(c.keyFormula('ig_ABC123xyz'), "{ReelKey}='ig_ABC123xyz'");
});

test('apify normalization: empty, no media, too long, transcript shapes', () => {
  assert.equal(c.normalizeApifyItems([], 'ABC', cfg).error, 'REEL_NOT_FOUND_OR_PRIVATE');
  assert.equal(c.normalizeApifyItems([{ shortCode: 'ABC' }], 'ABC', cfg).error, 'NO_MEDIA');
  assert.equal(c.normalizeApifyItems([{ shortCode: 'ABC', videoUrl: 'u', videoDuration: 999 }], 'ABC', cfg).error, 'SOURCE_TOO_LONG');
  const r = c.normalizeApifyItems([{ shortCode: 'ABC', videoUrl: 'u', transcript: [{ text: 'hello there this is a long transcript' }] }], 'ABC', cfg);
  assert.equal(r.reel.transcriptSource, 'apify');
  const n = c.normalizeApifyItems([{ shortCode: 'ABC', audioUrl: 'a', caption: 'x' }], 'ABC', cfg);
  assert.ok(n.needsStt);
});

test('source text fallback', () => {
  const base = { caption: 'short', transcript: '' };
  assert.equal(c.resolveSourceText(base, '').error, 'NO_SOURCE_CONTENT');
  assert.equal(c.resolveSourceText(base, 'a transcript long enough to be accepted here').reel.transcriptSource, 'stt');
  assert.ok(c.resolveSourceText({ caption: 'c'.repeat(50), transcript: '' }, '').reel.lowContext);
});

test('content validation', () => {
  const ok = c.validateContent({ script: goodScript, caption: 'Tiny habits win', overlay: 'Tiny habits', hashtags: ['habits', '#growth'] }, reel, cfg);
  assert.ok(ok.ok, ok.errors.join());
  assert.equal(ok.content.hashtags, '#habits #growth');
  const copy = c.validateContent({ script: reel.transcript + ' ' + reel.transcript, caption: 'x', overlay: '', hashtags: [] }, reel, cfg);
  assert.ok(copy.errors.some((e) => e.startsWith('SCRIPT_TOO_SIMILAR') || e.startsWith('SCRIPT_TOO_SHORT')));
  const bad = c.validateContent({ script: 'short', caption: 'c'.repeat(2300), overlay: 'o'.repeat(90), hashtags: ['bad tag!'] }, reel, cfg);
  assert.ok(['SCRIPT_TOO_SHORT', 'CAPTION_TOO_LONG', 'OVERLAY_TOO_LONG', 'HASHTAG_FORMAT'].every((p) => bad.errors.some((e) => e.startsWith(p))));
  const similar = c.validateContent({ script: reel.transcript.split(' ').concat(goodScript.split(' ').slice(0, 55)).join(' '), caption: 'x', overlay: '', hashtags: [] }, reel, { ...cfg, maxScriptOverlap: 0.1 });
  assert.ok(similar.errors.includes('SCRIPT_TOO_SIMILAR_TO_SOURCE'));
});

test('llm parsing', () => {
  assert.ok(c.parseLLMContent('```json\n{"a":1}\n```').ok);
  assert.equal(c.parseLLMContent('nope').errors[0], 'INVALID_JSON');
  assert.equal(c.parseLLMContent('[1]').ok, false);
});

test('approval verification', () => {
  const base = { recordId: 'rec1', decision: 'approve', exp: 2000, sig: 'abc', expectedSig: 'abc', now: 1000 };
  assert.ok(c.verifyApproval(base).ok);
  assert.equal(c.verifyApproval({ ...base, now: 3000 }).error, 'LINK_EXPIRED');
  assert.equal(c.verifyApproval({ ...base, sig: 'abd' }).error, 'BAD_SIGNATURE');
  assert.equal(c.verifyApproval({ ...base, decision: 'x' }).error, 'BAD_DECISION');
});

test('entry guard: state, extraction, lock', () => {
  const rec = { id: 'r', status: 'APPROVED', extractionDone: true, lockedBy: '', lockedAt: null };
  const p = { record: rec, expectedStates: ['APPROVED'], now: Date.now(), lockTtlMs: 60000 };
  assert.equal(c.decideEntry(p).action, 'proceed');
  assert.equal(c.decideEntry({ ...p, record: { ...rec, status: 'PUBLISHED' } }).action, 'skip');
  assert.equal(c.decideEntry({ ...p, record: { ...rec, lockedBy: 'x', lockedAt: new Date().toISOString() } }).reason, 'LOCKED_BY_OTHER_RUN');
  assert.equal(c.decideEntry({ ...p, record: { ...rec, lockedBy: 'x', lockedAt: new Date(Date.now() - 3600000).toISOString() }, resume: true }).action, 'resume');
  assert.equal(c.decideEntry({ ...p, requireExtraction: true, record: { ...rec, extractionDone: false } }).reason, 'EXTRACTION_NOT_DONE');
});

test('retry planning and stuck detection', () => {
  assert.equal(c.planRetry({ status: 'FAILED', retryCount: 5, failedFromState: 'APPROVED' }, cfg).error, 'RETRY_LIMIT_REACHED');
  assert.equal(c.planRetry({ status: 'FAILED', retryCount: 0, failedFromState: 'APPROVED' }, cfg).stage, 'video');
  assert.equal(c.planRetry({ status: 'PUBLISHED' }, cfg).error, 'NOT_FAILED');
  assert.ok(c.isStuck({ status: 'VIDEO_GENERATING', modifiedTime: new Date(Date.now() - 2 * 3600000).toISOString() }, cfg, Date.now()));
});

test('heygen request, status, video validation', () => {
  const env = { HEYGEN_AVATAR_ID: 'a', HEYGEN_VOICE_ID: 'v' };
  const approved = { id: 'rec1', key: 'ig_ABC123xyz', script: 's', caption: 'c', overlay: 'o', hashtags: '#a' };
  approved.approvedFingerprint = c.contentFingerprint(approved);
  const r = c.buildHeyGenRequest({ ...approved, videoAttempt: 2 }, env);
  assert.equal(r.body.aspect_ratio, '9:16');
  assert.equal(r.idempotencyKey, `ig_ABC123xyz:heygen:${approved.approvedFingerprint}:2`);
  assert.match(r.idempotencyKey, /^[A-Za-z0-9_\-:.]{1,255}$/);
  assert.ok(c.buildHeyGenRequest(approved, {}).errors.includes('HEYGEN_AVATAR_ID_MISSING'));
  assert.deepEqual(c.buildHeyGenRequest({ ...approved, approvedFingerprint: undefined }, env).errors, ['NOT_APPROVED']);
  assert.deepEqual(c.buildHeyGenRequest({ ...approved, script: 'edited after approval' }, env).errors, ['CONTENT_CHANGED_AFTER_APPROVAL']);
  assert.equal(c.interpretHeyGenStatus({ data: { status: 'processing' } }, 1, cfg).state, 'pending');
  assert.equal(c.interpretHeyGenStatus({ data: { status: 'processing' } }, 40, cfg).state, 'timeout');
  assert.equal(c.interpretHeyGenStatus({ data: { status: 'failed', failure_code: 'X' } }, 1, cfg).code, 'X');
  assert.ok(!c.validateVideo({ videoUrl: 'http://x', duration: 1 }, cfg).ok);
  assert.ok(c.validateVideo({ videoUrl: 'https://x', duration: 20 }, cfg).ok);
});

test('blotato and meta builders', () => {
  const p = { accountId: 'a', mediaUrl: 'https://database.blotato.com/x.mp4', caption: 'c', hashtags: '#a' };
  assert.equal(c.buildBlotatoPost(p, cfg).body.post.target.mediaType, 'reel');
  assert.ok(c.buildBlotatoPost({ ...p, mediaUrl: 'https://evilblotato.com/x' }, cfg).errors.includes('MEDIA_URL_NOT_BLOTATO_HOSTED'));
  assert.equal(c.interpretBlotatoStatus({ status: 'published', publicUrl: 'u' }, 1, cfg).state, 'published');
  assert.equal(c.interpretBlotatoStatus({ status: 'in-progress' }, 99, cfg).state, 'timeout');
  assert.ok(!c.buildMetaContainer({ videoUrl: 'http://x', caption: 'c' }).ok);
  assert.equal(c.buildMetaContainer({ videoUrl: 'https://x/v.mp4', caption: 'c' }).body.media_type, 'REELS');
  assert.equal(c.interpretMetaStatus('IN_PROGRESS', 5, 5).state, 'timeout');
});

test('http error classification, redaction, backoff, idempotency', () => {
  assert.equal(c.classifyHttpError(403, { subscriptionStatus: 'x' }).code, 'SUBSCRIPTION_REQUIRED');
  assert.ok(c.classifyHttpError(429).retryable);
  assert.ok(!c.classifyHttpError(400).retryable);
  assert.ok(c.classifyHttpError(503).retryable);
  const r = c.redact({ apiKey: 'sk-1', nested: { Authorization: 'Bearer abc' }, msg: 'Bearer tok123' });
  assert.equal(JSON.stringify(r).includes('sk-1'), false);
  assert.equal(JSON.stringify(r).includes('tok123'), false);
  assert.ok(c.backoffDelayMs(3) === 8000 && c.backoffDelayMs(20) === 60000);
  assert.match(c.makeIdempotencyKey('ig_a b', 'x/y'), /^[A-Za-z0-9_:.-]+$/);
  assert.throws(() => c.toAirtableFields({ nope: 1 }));
  assert.ok(c.appendErrorLog('', { token: 'secret' }).includes('[REDACTED]'));
});

test('failure description, failure fields and content/source fields', () => {
  const v = c.describeFailure({ ok: false, error: 'NO_MEDIA', message: 'no media' }, 'Extraction');
  assert.deepEqual([v.code, v.retryable], ['NO_MEDIA', false]);
  const h = c.describeFailure({ error: { message: 'Request failed', httpCode: '503', description: '{"x":1}' } }, 'Apify');
  assert.deepEqual([h.code, h.retryable, h.httpStatus], ['UPSTREAM_ERROR', true, 503]);
  assert.equal(c.describeFailure({ error: { message: 'boom' } }, 'x').code, 'NODE_ERROR');
  assert.equal(c.describeFailure({ error: { httpCode: '403', description: '{"subscriptionStatus":"x"}' } }, 'x').code, 'SUBSCRIPTION_REQUIRED');
  const f = c.buildFailureFields({ failure: h, existingLog: 'old', failedFromState: 'EXTRACTING', now: '2026-01-01T00:00:00Z' });
  assert.equal(f.Status, 'FAILED');
  assert.equal(f.LockedBy, '');
  assert.ok(f.ErrorLog.endsWith('old'));
  assert.equal(c.contentFields({ script: 's', caption: 'c', overlay: 'o', hashtags: '#a' }, 2).ContentAttempts, 2);
  const s = c.sourceFields({ caption: 'c', transcript: 't', transcriptSource: 'none', duration: null, owner: 'o', audioUrl: '', lowContext: true }, 'now');
  assert.ok(s.ErrorLog.includes('LOW_CONTEXT'));
  assert.equal('SourceDuration' in s, false);
  assert.equal(c.newRecordFields({ key: 'ig_a', url: 'u' }, 'me').Status, 'SUBMITTED');
});

test('llm response extraction', () => {
  assert.equal(c.extractLLMText({ choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }).text, 'x');
  assert.equal(c.extractLLMText({ choices: [{ message: { refusal: 'no' } }] }).error, 'LLM_REFUSAL');
  assert.equal(c.extractLLMText({ choices: [{ message: { content: 'x' }, finish_reason: 'length' }] }).error, 'LLM_TRUNCATED');
  assert.equal(c.extractLLMText({}).error, 'LLM_EMPTY_RESPONSE');
});

// ---------------------------------------------------------------- approval and video decisions
const NOW = Date.parse('2026-01-01T12:00:00Z');
const awaiting = (extra = {}) => ({
  id: 'recAAAAAAAA', key: 'ig_ABC123xyz', status: 'AWAITING_APPROVAL', script: goodScript, caption: 'Tiny habits, big results.', overlay: 'Tiny habits win', hashtags: '#habits #growth',
  sourceCaption: reel.caption, sourceTranscript: reel.transcript, regenerationCount: 0, videoAttempt: 0, retryCount: 0, ...extra,
});
const req = (action, extra = {}) => c.validateApprovalRequest({ recordId: 'recAAAAAAAA', action, actor: 'alice', expectedFingerprint: c.contentFingerprint(awaiting()), ...extra }).req;
const decide = (record, r, phase = 'pre', runId = 'approval:1') => c.decideApproval({ record, req: r, cfg, now: NOW, runId, phase });

test('fingerprint is stable, content-sensitive and whitespace-trimmed', () => {
  const a = c.contentFingerprint(awaiting());
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.equal(a, c.contentFingerprint({ ...awaiting(), script: `  ${goodScript}\n` }));
  assert.notEqual(a, c.contentFingerprint({ ...awaiting(), script: goodScript + ' x' }));
  assert.notEqual(a, c.contentFingerprint({ ...awaiting(), overlay: 'other' }));
});

test('approval request validation', () => {
  const v = (b) => c.validateApprovalRequest(b);
  assert.ok(!v(null).ok);
  assert.ok(v({ recordId: 'recAAAAAAAA', action: 'view' }).ok);
  assert.ok(v({ recordId: 'recAAAAAAAA', action: 'approve', actor: 'a' }).errors.includes('FINGERPRINT_REQUIRED'));
  assert.ok(v({ recordId: 'recAAAAAAAA', action: 'approve', actor: 'a', expectedFingerprint: 'zz' }).errors.includes('BAD_FINGERPRINT'));
  assert.ok(v({ recordId: 'recAAAAAAAA', action: 'reject', actor: 'a', reason: 'x' }).errors.includes('REASON_REQUIRED_3_TO_500_CHARS'));
  assert.ok(v({ recordId: 'recAAAAAAAA', action: 'edit', actor: 'a' }).errors.includes('EDIT_EMPTY'));
  assert.ok(v({ recordId: 'recAAAAAAAA', action: 'edit', actor: 'a', script: 5 }).errors.includes('BAD_SCRIPT'));
  assert.ok(v({ recordId: 'recAAAAAAAA', action: 'regenerate' }).errors.includes('ACTOR_REQUIRED'));
  assert.ok(v({ recordId: "rec'; x", action: 'view' }).errors.includes('BAD_RECORD_ID'));
  assert.ok(v({ recordId: 'recAAAAAAAA', action: 'nuke' }).errors.includes('BAD_ACTION'));
  assert.equal(v({ recordId: 'recAAAAAAAA', action: 'edit', actor: 'a', hashtags: ['x', ' y '] }).req.edit.hashtags, 'x y');
});

test('decideApproval: approve, edit, reject, regenerate paths', () => {
  const ok = decide(awaiting(), req('approve'));
  assert.equal(ok.ok, true);
  assert.equal(ok.trigger, 'video');
  assert.equal(ok.fields.Status, 'APPROVED');
  assert.equal(ok.fields.ApprovedFingerprint, c.contentFingerprint(awaiting()));
  assert.equal(ok.fields.LockedBy, '');
  assert.equal(ok.fields.VideoAttempt, 1);
  assert.equal(decide(awaiting(), req('approve', { expectedFingerprint: '0'.repeat(16) })).error, 'STALE_CONTENT');
  assert.equal(decide(awaiting({ script: 'too short' }), req('approve', { expectedFingerprint: c.contentFingerprint(awaiting({ script: 'too short' })) })).error, 'CONTENT_INVALID');
  assert.equal(decide(awaiting({ status: 'CONTENT_GENERATED' }), req('approve')).error, 'INVALID_STATE');

  const edit = decide(awaiting(), req('edit', { script: `${goodScript} Keep going.`, hashtags: 'x, y' }));
  assert.equal(edit.ok, true);
  assert.equal(edit.fields.Hashtags, '#x #y');
  assert.notEqual(edit.response.fingerprint, c.contentFingerprint(awaiting()));
  assert.equal(decide(awaiting(), req('edit', { script: 'Visit https://x.example now and then keep going for a little while longer please okay' })).error, 'CONTENT_INVALID');
  assert.deepEqual(decide(awaiting(), req('edit', { script: reel.transcript.repeat(2) })).errors.includes('SCRIPT_TOO_SIMILAR_TO_SOURCE'), true);
  assert.equal(decide(awaiting({ status: 'APPROVED' }), req('edit', { caption: 'x' })).error, 'INVALID_STATE');

  const rej = decide(awaiting(), req('reject', { reason: 'off brand' }));
  assert.equal(rej.fields.Status, 'REJECTED');
  assert.equal(rej.fields.RejectedReason, 'off brand');
  assert.equal(decide(awaiting({ status: 'REJECTED' }), req('reject', { reason: 'again' })).needsClaim, false);

  const regen = decide(awaiting(), req('regenerate', { note: 'shorter' }));
  assert.equal(regen.trigger, 'content');
  assert.equal(regen.fields.Status, 'EXTRACTING');
  assert.equal(regen.fields.RegenerationNote, 'shorter');
  assert.equal(decide(awaiting({ status: 'REJECTED' }), req('regenerate')).ok, true);
  assert.equal(decide(awaiting({ regenerationCount: cfg.maxRegenerations }), req('regenerate')).error, 'REGENERATION_LIMIT_REACHED');
  assert.equal(decide(awaiting({ status: 'EXTRACTING' }), req('regenerate')).error, 'INVALID_STATE');
  assert.ok(c.canTransition('AWAITING_APPROVAL', 'EXTRACTING'));
});

test('decideApproval: idempotent duplicates, viewing, locks and retry', () => {
  const fp = c.contentFingerprint(awaiting());
  const approved = awaiting({ status: 'APPROVED', approvedFingerprint: fp });
  const again = decide(approved, req('approve'));
  assert.deepEqual([again.ok, again.needsClaim, again.trigger], [true, false, 'video']);
  const running = decide({ ...approved, status: 'VIDEO_GENERATING', lockedBy: '77', lockedAt: new Date(NOW).toISOString() }, req('approve'));
  assert.deepEqual([running.ok, running.needsClaim, running.trigger], [true, false, null]);
  assert.equal(decide({ ...approved, approvedFingerprint: 'f'.repeat(16) }, req('approve')).error, 'STALE_CONTENT');

  const view = decide(awaiting(), c.validateApprovalRequest({ recordId: 'recAAAAAAAA', action: 'view' }).req);
  assert.equal(view.response.fingerprint, fp);
  assert.equal(view.fields, null);

  const fresh = new Date(NOW - 30000).toISOString();
  assert.equal(decide(awaiting({ lockedBy: 'approval:9', lockedAt: fresh }), req('approve')).error, 'RECORD_BUSY');
  assert.equal(decide(awaiting({ lockedBy: '123', lockedAt: new Date(NOW - 10 * 60000).toISOString() }), req('approve')).error, 'RECORD_BUSY');
  assert.equal(decide(awaiting({ lockedBy: 'approval:9', lockedAt: new Date(NOW - 5 * 60000).toISOString() }), req('approve')).ok, true);
  assert.equal(decide(awaiting({ lockedBy: 'approval:other' }), req('approve'), 'post').error, 'LOCK_LOST');
  const mine = decide(awaiting({ lockedBy: 'approval:1', status: 'CONTENT_GENERATED' }), req('approve'), 'post');
  assert.deepEqual([mine.ok, mine.releaseLock], [false, true]);

  const failed = { id: 'recAAAAAAAA', status: 'FAILED', failedFromState: 'APPROVED', retryCount: 0, videoAttempt: 2 };
  const retry = decide(failed, req('retry'));
  assert.deepEqual([retry.fields.Status, retry.fields.RetryCount, retry.trigger], ['APPROVED', 1, 'video']);
  assert.equal(decide({ ...failed, failedFromState: 'VIDEO_GENERATING' }, req('retry')).fields.Status, 'VIDEO_GENERATING');
  assert.equal(decide({ ...failed, failedFromState: 'AWAITING_APPROVAL' }, req('retry')).error, 'RETRY_NOT_SUPPORTED');
  const intakeRetry = decide({ ...failed, failedFromState: 'EXTRACTING', extractionDone: false }, req('retry'));
  assert.deepEqual([intakeRetry.fields.Status, intakeRetry.trigger], ['SUBMITTED', 'intake']);
  const contentRetry = decide({ ...failed, failedFromState: 'EXTRACTING', extractionDone: true }, req('retry'));
  assert.deepEqual([contentRetry.fields.Status, contentRetry.trigger], ['EXTRACTING', 'content']);
  const savedRetry = decide({ ...failed, failedFromState: 'CONTENT_GENERATED' }, req('retry'));
  assert.deepEqual([savedRetry.fields.Status, savedRetry.trigger, savedRetry.httpStatus], ['AWAITING_APPROVAL', null, 200]);
  assert.equal(decide({ ...failed, videoAttempt: cfg.maxVideoAttempts + 1 }, req('retry')).error, 'VIDEO_ATTEMPT_LIMIT_REACHED');
  assert.equal(decide(awaiting(), req('retry')).error, 'NOT_FAILED');
  assert.equal(decide(null, req('view')).error, 'RECORD_NOT_FOUND');
});

test('video entry decision, polling interpretation and field builders', () => {
  const rec = (x) => ({ id: 'rec1', status: 'APPROVED', videoAttempt: 1, ...x });
  const entry = (r) => c.decideVideoEntry({ record: r, cfg, now: NOW });
  assert.deepEqual(entry(rec()), { action: 'proceed', reason: 'OK' });
  assert.equal(entry(rec({ status: 'VIDEO_GENERATING', heygenVideoId: 'v1' })).action, 'resume');
  assert.equal(entry(rec({ status: 'AWAITING_APPROVAL' })).action, 'skip');
  assert.equal(entry(rec({ lockedBy: 'x', lockedAt: new Date(NOW).toISOString() })).action, 'skip');
  assert.equal(entry(rec({ videoAttempt: cfg.maxVideoAttempts + 1 })).reason, 'VIDEO_ATTEMPT_LIMIT');

  const p = (data, attempt = 0) => c.interpretPoll(data, { attempt }, { ...cfg, maxPollAttempts: 3 });
  assert.equal(p({ data: { status: 'processing' } }).state, 'pending');
  assert.equal(p({ data: { status: 'processing' } }, 2).state, 'timeout');
  assert.equal(p({ data: { status: 'failed', failure_code: 'bad_avatar', failure_message: 'nope' } }).terminalJob, true);
  const done = p({ data: { status: 'completed', video_url: 'https://cdn.example/v.mp4', duration: 21.5, thumbnail_url: 'https://cdn.example/t.jpg' } });
  assert.deepEqual([done.state, done.duration], ['completed', 21.5]);
  assert.equal(p({ data: { status: 'completed', video_url: 'https://cdn.example/v.mp4', duration: 0.5 } }).error, 'VIDEO_INVALID');
  assert.equal(p({ data: { status: 'completed', video_url: 'http://insecure/v.mp4', duration: 20 } }).error, 'VIDEO_INVALID');
  assert.equal(p({ error: { message: 'x', httpCode: '503' } }).state, 'pending');
  assert.equal(p({ error: { message: 'x', httpCode: '503' } }, 2).state, 'timeout');
  assert.equal(p({ error: { message: 'x', httpCode: '401' } }).state, 'fatal');
  assert.equal(p({ error: { message: 'x', httpCode: '404' } }).state, 'fatal');

  assert.deepEqual([1, 2, 3, 4, 5].map((n) => c.pollDelaySeconds(n, cfg)), [10, 20, 40, 60, 60]);
  assert.equal(c.videoSubmitFields('v1', 2, 'now').HeyGenVideoId, 'v1');
  const cf = c.videoCompleteFields({ videoUrl: 'https://x/v.mp4', duration: 20 }, 'now');
  assert.deepEqual([cf.Status, cf.VideoDuration, 'ThumbnailURL' in cf, cf.LockedBy], ['VIDEO_COMPLETED', 20, false, '']);
  assert.deepEqual(c.videoFailureExtras({ terminalJob: true }, { videoAttempt: 2 }), { HeyGenVideoId: null, VideoAttempt: 3, HeyGenStatus: 'failed' });
  assert.deepEqual(c.videoFailureExtras({ terminalJob: false, state: 'timeout' }, { videoAttempt: 2 }), { HeyGenStatus: 'timeout' });
});
