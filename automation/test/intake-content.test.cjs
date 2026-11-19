'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createMock } = require('../mock/mock-server.cjs');
const { Runner } = require('./n8n-sim.cjs');
const core = require('../lib/core.js');

const N8N_DIR = path.join(__dirname, '..', 'n8n');
const FILES = ['01-reel-intake.json', '02-content-generation.json', '03-human-approval.json', '04-heygen-video.json', '05-instagram-publishing.json'];
const load = () => FILES.map((f) => JSON.parse(fs.readFileSync(path.join(N8N_DIR, f), 'utf8')));

const CREDS = {
  'Reels Intake Webhook Auth': { header: 'X-Reels-Token', value: 'intake-secret' },
  'Reels Internal Webhook Auth': { header: 'X-Reels-Token', value: 'internal-secret' },
  'Reels Approval Webhook Auth': { header: 'X-Reels-Token', value: 'approval-secret' },
  'HeyGen API Key': { header: 'x-api-key', value: 'sim-heygen' },
  'Apify API Token': { header: 'Authorization', value: 'Bearer sim-apify' },
  'Airtable Personal Access Token': { header: 'Authorization', value: 'Bearer sim-airtable' },
  'OpenAI API': { header: 'Authorization', value: 'Bearer sim-openai' },
};
const INTAKE = { 'X-Reels-Token': 'intake-secret' };
const INTERNAL = { 'X-Reels-Token': 'internal-secret' };
const reelUrl = (code) => `https://www.instagram.com/reel/${code}/`;

const mock = createMock();
let runner;
let env;

test.before(async () => {
  const url = await mock.listen();
  env = {
    N8N_WEBHOOK_BASE: 'http://n8n.sim', AIRTABLE_BASE_URL: url, AIRTABLE_BASE_ID: 'appSIM', AIRTABLE_TABLE: 'Reels',
    APIFY_BASE_URL: url, OPENAI_BASE_URL: url,
  };
});
test.after(() => mock.close());
test.beforeEach(() => {
  mock.reset();
  runner = new Runner({ workflows: load(), env: { ...env }, credentials: CREDS });
});

const submit = (code, headers = INTAKE) => runner.handleWebhook('POST', 'reels/intake', { headers, body: { url: reelUrl(code), submittedBy: 'tester' } });
const byKey = (code) => mock.records().find((r) => r.fields.ReelKey === 'ig_' + code);
const fieldsOf = (code) => (byKey(code) || { fields: {} }).fields;
const chatCalls = () => mock.state.chatRequests.length;
const apifyCalls = () => mock.count('apify');
const noExecutionErrors = () => assert.deepEqual(runner.executions.filter((e) => e.error), []);

async function runToEnd(code) {
  const res = await submit(code);
  await runner.idle();
  return res;
}

function assertFailed(code, expectedCode, from = 'EXTRACTING') {
  const f = fieldsOf(code);
  assert.equal(f.Status, 'FAILED');
  assert.equal(f.FailedFromState, from);
  assert.ok(f.ErrorLog.includes(expectedCode), `ErrorLog should include ${expectedCode}: ${f.ErrorLog}`);
  assert.equal(f.LockedBy, undefined, 'lock must be released on failure');
  for (const secret of ['sim-apify', 'sim-openai', 'sim-airtable', 'intake-secret', 'internal-secret']) assert.ok(!f.ErrorLog.includes(secret), 'secret leaked into ErrorLog');
  noExecutionErrors();
}

// ---------------------------------------------------------------- happy path
test('happy path: reel -> Apify -> OpenAI -> Airtable AWAITING_APPROVAL with structured content', async () => {
  const res = await runToEnd('GOODREEL01');
  assert.equal(res.status, 202);
  assert.equal(res.body.duplicate, false);
  assert.equal(res.body.key, 'ig_GOODREEL01');
  const f = fieldsOf('GOODREEL01');
  assert.equal(f.Status, 'AWAITING_APPROVAL');
  assert.equal(f.ExtractionDone, true);
  assert.equal(f.TranscriptSource, 'apify');
  assert.equal(f.SourceOwner, 'sourcecreator');
  assert.equal(f.ContentAttempts, 1);
  assert.ok(f.Script.split(' ').length >= 53 && f.Caption && f.Overlay);
  assert.equal(f.Hashtags, '#habits #consistency #selfimprovement');
  assert.equal(f.LockedBy, undefined);
  assert.equal(f.SubmittedBy, 'tester');
  assert.equal(apifyCalls(), 1);
  assert.equal(chatCalls(), 1);
  assert.ok(mock.state.chatRequests[0].response_format.json_schema.strict);
  noExecutionErrors();
});

test('generated content never copies the source transcript', async () => {
  await runToEnd('GOODREEL01');
  const f = fieldsOf('GOODREEL01');
  assert.ok(core.ngramOverlap(f.Script, f.SourceTranscript, 5) <= 0.2);
});

// ---------------------------------------------------------------- input validation and auth
test('invalid URLs are rejected with 400 and nothing is created or scraped', async () => {
  for (const bad of ['http://www.instagram.com/reel/ABCDE12345/', 'https://evil.com/reel/ABCDE12345/', 'https://instagram.com.evil.com/reel/ABCDE12345/', 'not a url', '', 'https://www.instagram.com/reel/ab/']) {
    const res = await runner.handleWebhook('POST', 'reels/intake', { headers: INTAKE, body: { url: bad } });
    assert.equal(res.status, 400, bad);
    assert.equal(res.body.ok, false);
  }
  const missing = await runner.handleWebhook('POST', 'reels/intake', { headers: INTAKE, body: {} });
  assert.equal(missing.status, 400);
  assert.equal(mock.records().length, 0);
  assert.equal(apifyCalls(), 0);
});

test('webhook requires its auth header', async () => {
  assert.equal((await submit('GOODREEL01', {})).status, 403);
  assert.equal((await submit('GOODREEL01', { 'X-Reels-Token': 'wrong' })).status, 403);
  assert.equal(mock.records().length, 0);
});

test('formula injection attempts cannot reach Airtable', async () => {
  const res = await runner.handleWebhook('POST', 'reels/intake', { headers: INTAKE, body: { url: "https://www.instagram.com/reel/ABCDE12345'),1=1,('/" } });
  assert.equal(res.status, 400);
  assert.equal(mock.count('airtable'), 0);
});

// ---------------------------------------------------------------- duplicate prevention
test('sequential duplicate submission returns the existing record and does not re-scrape', async () => {
  await runToEnd('GOODREEL01');
  const again = await submit('GOODREEL01');
  assert.equal(again.status, 200);
  assert.equal(again.body.duplicate, true);
  assert.equal(again.body.status, 'AWAITING_APPROVAL');
  await runner.idle();
  assert.equal(mock.records().length, 1);
  assert.equal(apifyCalls(), 1);
  assert.equal(chatCalls(), 1);
});

test('URL variants of the same reel map to one record', async () => {
  await runToEnd('GOODREEL01');
  const res = await runner.handleWebhook('POST', 'reels/intake', { headers: INTAKE, body: { url: 'https://instagram.com/someuser/reel/GOODREEL01/?igsh=abc' } });
  assert.equal(res.body.duplicate, true);
  assert.equal(mock.records().length, 1);
});

test('concurrent duplicate submissions leave exactly one record and one pipeline run', async () => {
  for (let i = 0; i < 5; i++) {
    mock.reset();
    mock.state.latencyMs = 12;
    const code = 'RACEREEL0' + i;
    const [a, b] = await Promise.all([submit(code), submit(code)]);
    await runner.idle();
    assert.equal([a, b].filter((r) => r.body.duplicate === false).length, 1, `iteration ${i}`);
    assert.equal(mock.records().filter((r) => r.fields.ReelKey === 'ig_' + code).length, 1);
    assert.equal(apifyCalls(), 1);
    assert.equal(chatCalls(), 1);
    assert.equal(fieldsOf(code).Status, 'AWAITING_APPROVAL');
  }
});

// ---------------------------------------------------------------- extraction failures
test('private/unavailable reel (empty Apify dataset) fails cleanly', async () => {
  await runToEnd('PRIVATE001');
  assertFailed('PRIVATE001', 'REEL_NOT_FOUND_OR_PRIVATE');
  assert.equal(chatCalls(), 0);
});

test('reel longer than the limit is rejected', async () => {
  await runToEnd('LONGVID001');
  assertFailed('LONGVID001', 'SOURCE_TOO_LONG');
  assert.equal(chatCalls(), 0);
});

test('reel without media is rejected; mismatched reel is rejected', async () => {
  await runToEnd('NOMEDIA001');
  assertFailed('NOMEDIA001', 'NO_MEDIA');
  await runToEnd('MISMATCH01');
  assertFailed('MISMATCH01', 'REEL_MISMATCH');
});

test('Apify transient 503s are retried and the run succeeds', async () => {
  mock.fault('apify', 503, 2);
  await runToEnd('GOODREEL01');
  assert.equal(apifyCalls(), 3);
  assert.equal(fieldsOf('GOODREEL01').Status, 'AWAITING_APPROVAL');
  noExecutionErrors();
});

test('Apify persistent failure exhausts retries and marks FAILED as retryable', async () => {
  mock.fault('apify', 500, 50);
  await runToEnd('GOODREEL01');
  assert.equal(apifyCalls(), 3);
  assertFailed('GOODREEL01', 'UPSTREAM_ERROR');
  assert.ok(fieldsOf('GOODREEL01').ErrorLog.includes('"retryable":true'));
  assert.equal(chatCalls(), 0);
});

test('Apify auth failure is non-retryable and does not leak the token', async () => {
  mock.fault('apify', 401, 50);
  await runToEnd('GOODREEL01');
  assertFailed('GOODREEL01', 'AUTH_FAILED');
  assert.ok(fieldsOf('GOODREEL01').ErrorLog.includes('"retryable":false'));
});

// ---------------------------------------------------------------- transcript fallback
test('missing transcript falls back to speech-to-text', async () => {
  await runToEnd('NOTRANS001');
  const f = fieldsOf('NOTRANS001');
  assert.equal(f.TranscriptSource, 'stt');
  assert.ok(f.SourceTranscript.includes('spoken transcript'));
  assert.equal(mock.state.sttRequests.length, 1);
  assert.ok(mock.state.sttRequests[0].bytes > 2048);
  assert.ok(mock.state.chatRequests[0].messages[1].content.includes('spoken transcript'));
  assert.equal(f.Status, 'AWAITING_APPROVAL');
});

test('STT failure with a usable caption continues with a LOW_CONTEXT warning', async () => {
  mock.fault('openai.stt', 500, 10);
  await runToEnd('NOTRANS001');
  const f = fieldsOf('NOTRANS001');
  assert.equal(f.Status, 'AWAITING_APPROVAL');
  assert.equal(f.TranscriptSource, 'none');
  assert.ok(f.ErrorLog.includes('LOW_CONTEXT'));
  noExecutionErrors();
});

test('STT failure with no usable caption fails with NO_SOURCE_CONTENT', async () => {
  mock.fault('openai.stt', 500, 10);
  await runToEnd('NOTRANSSHORT1');
  assertFailed('NOTRANSSHORT1', 'NO_SOURCE_CONTENT');
  assert.equal(chatCalls(), 0);
});

test('audio download failure falls through to the no-source-content check', async () => {
  mock.fault('media.audio', 404, 10);
  await runToEnd('NOTRANSSHORT1');
  assertFailed('NOTRANSSHORT1', 'NO_SOURCE_CONTENT');
  assert.equal(mock.state.sttRequests.length, 0);
});

// ---------------------------------------------------------------- content generation
test('invalid JSON from the model is retried then fails with CONTENT_VALIDATION_FAILED', async () => {
  await runToEnd('BADJSON001');
  assert.equal(chatCalls(), 3);
  assertFailed('BADJSON001', 'CONTENT_VALIDATION_FAILED');
  assert.ok(fieldsOf('BADJSON001').ErrorLog.includes('INVALID_JSON'));
  assert.equal(fieldsOf('BADJSON001').Script, undefined);
});

test('a rejected first attempt is retried with validation feedback and then succeeds', async () => {
  await runToEnd('RETRYONCE1');
  assert.equal(chatCalls(), 2);
  assert.ok(!mock.state.chatRequests[0].messages[1].content.includes('Fix these problems'));
  assert.ok(mock.state.chatRequests[1].messages[1].content.includes('SCRIPT_TOO_SHORT'));
  const f = fieldsOf('RETRYONCE1');
  assert.equal(f.Status, 'AWAITING_APPROVAL');
  assert.equal(f.ContentAttempts, 2);
});

test('script copied from the source is rejected as too similar', async () => {
  await runToEnd('COPYCAT001');
  assert.equal(chatCalls(), 3);
  assertFailed('COPYCAT001', 'SCRIPT_TOO_SIMILAR_TO_SOURCE');
});

test('model refusal fails immediately without retrying', async () => {
  await runToEnd('REFUSAL001');
  assert.equal(chatCalls(), 1);
  assertFailed('REFUSAL001', 'LLM_REFUSAL');
});

test('OpenAI 429 is retried by the HTTP node', async () => {
  mock.fault('openai.chat', 429, 1);
  await runToEnd('GOODREEL01');
  assert.equal(chatCalls(), 2);
  assert.equal(fieldsOf('GOODREEL01').Status, 'AWAITING_APPROVAL');
});

test('OpenAI auth failure marks the record FAILED', async () => {
  mock.fault('openai.chat', 401, 50);
  await runToEnd('GOODREEL01');
  assertFailed('GOODREEL01', 'AUTH_FAILED');
});

// ---------------------------------------------------------------- Airtable failures
test('Airtable create failure returns 502 and never scrapes', async () => {
  mock.fault('airtable.create', 500, 50);
  const res = await submit('GOODREEL01');
  await runner.idle();
  assert.equal(res.status, 502);
  assert.equal(mock.records().length, 0);
  assert.equal(apifyCalls(), 0);
});

test('Airtable lookup failure returns 503 and creates nothing', async () => {
  mock.fault('airtable.list', 500, 50);
  const res = await submit('GOODREEL01');
  await runner.idle();
  assert.equal(res.status, 503);
  assert.equal(mock.records().length, 0);
});

// ---------------------------------------------------------------- content workflow idempotency
function seedExtracted(code, extra = {}) {
  const now = new Date().toISOString();
  const rec = { id: 'recSEED' + code.length + 'ABCD', createdTime: now, fields: { ReelKey: 'ig_' + code, ReelURL: reelUrl(code), Status: 'EXTRACTING', ExtractionDone: true, SourceCaption: 'Morning routine tips', SourceTranscript: 'Wake up early drink a glass of water stretch for ten minutes and write down your top three goals before you check your phone', TranscriptSource: 'apify', ContentAttempts: 0, RetryCount: 0, CreatedTime: now, ModifiedTime: now, ...extra } };
  mock.state.records.set(rec.id, rec);
  return rec;
}
const generate = (id) => runner.handleWebhook('POST', 'reels/content', { headers: INTERNAL, body: { recordId: id } });

test('content webhook: re-triggering an already processed record does nothing', async () => {
  const rec = seedExtracted('SEEDREEL01');
  await generate(rec.id);
  await runner.idle();
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');
  await generate(rec.id);
  await runner.idle();
  assert.equal(chatCalls(), 1);
  assert.equal(rec.fields.ContentAttempts, 1);
});

test('content webhook: concurrent triggers generate once (claim + settle + verify)', async () => {
  const rec = seedExtracted('SEEDREEL02');
  await Promise.all([generate(rec.id), generate(rec.id)]);
  await runner.idle();
  assert.equal(chatCalls(), 1);
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');
  assert.ok(runner.executions.some((e) => e.trace.includes('Stop: Lost Claim')));
});

test('content webhook: a fresh lock held by another run blocks generation', async () => {
  const rec = seedExtracted('SEEDREEL03', { LockedBy: 'other-run', LockedAt: new Date().toISOString() });
  await generate(rec.id);
  await runner.idle();
  assert.equal(chatCalls(), 0);
  assert.equal(rec.fields.Status, 'EXTRACTING');
});

test('content webhook: a stale lock is taken over', async () => {
  const rec = seedExtracted('SEEDREEL04', { LockedBy: 'dead-run', LockedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() });
  await generate(rec.id);
  await runner.idle();
  assert.equal(rec.fields.Status, 'AWAITING_APPROVAL');
});

test('content webhook: wrong state, unfinished extraction and malformed ids are ignored', async () => {
  const wrong = seedExtracted('SEEDREEL05', { Status: 'APPROVED' });
  const early = seedExtracted('SEEDREEL06X', { ExtractionDone: false });
  await generate(wrong.id);
  await generate(early.id);
  await generate("rec'; DROP");
  await generate(undefined);
  await runner.idle();
  assert.equal(chatCalls(), 0);
  assert.equal(wrong.fields.Status, 'APPROVED');
  assert.equal((await runner.handleWebhook('POST', 'reels/content', { headers: {}, body: { recordId: wrong.id } })).status, 403);
});

// ---------------------------------------------------------------- notifications
test('notifications fire on success and failure when configured, and never break the run', async () => {
  runner.env.NOTIFY_WEBHOOK_URL = env.APIFY_BASE_URL + '/notify';
  await runToEnd('GOODREEL01');
  await runToEnd('PRIVATE001');
  assert.equal(mock.state.notifications.length, 2);
  assert.ok(mock.state.notifications[0].text.includes('ready for approval'));
  assert.ok(mock.state.notifications[1].text.includes('FAILED'));
  mock.fault('notify', 500, 10);
  await runToEnd('GOODREEL02');
  assert.equal(fieldsOf('GOODREEL02').Status, 'AWAITING_APPROVAL');
  noExecutionErrors();
});

// ---------------------------------------------------------------- workflow JSON structure
const KNOWN_TYPES = new Set(['n8n-nodes-base.webhook', 'n8n-nodes-base.code', 'n8n-nodes-base.if', 'n8n-nodes-base.httpRequest', 'n8n-nodes-base.respondToWebhook', 'n8n-nodes-base.noOp', 'n8n-nodes-base.wait']);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

test('workflow JSON: structure, connections, credentials and secrets', () => {
  for (const wf of load()) {
    const names = wf.nodes.map((n) => n.name);
    assert.equal(new Set(names).size, names.length, 'unique names');
    assert.equal(new Set(wf.nodes.map((n) => n.id)).size, names.length, 'unique ids');
    for (const n of wf.nodes) {
      assert.ok(KNOWN_TYPES.has(n.type), n.type);
      assert.ok(Array.isArray(n.position) && n.position.length === 2);
      for (const c of Object.values(n.credentials || {})) {
        assert.deepEqual(Object.keys(c).sort(), ['id', 'name']);
        assert.equal(c.id, 'REPLACE_ME');
      }
    }
    const reached = new Set(wf.nodes.filter((n) => n.type.endsWith('webhook')).map((n) => n.name));
    for (const [from, c] of Object.entries(wf.connections)) {
      assert.ok(names.includes(from));
      for (const outs of c.main) for (const t of outs) assert.ok(names.includes(t.node), `${from} -> ${t.node}`);
    }
    let grew = true;
    while (grew) {
      grew = false;
      for (const [from, c] of Object.entries(wf.connections)) {
        if (!reached.has(from)) continue;
        for (const outs of c.main) for (const t of outs) if (!reached.has(t.node)) { reached.add(t.node); grew = true; }
      }
    }
    assert.deepEqual(names.filter((n) => !reached.has(n)), [], 'unreachable nodes');
    const text = JSON.stringify(wf);
    for (const re of [/sk-[A-Za-z0-9]{20,}/, /apify_api_[A-Za-z0-9]+/, /pat[A-Za-z0-9]{14}\.[a-f0-9]{20,}/, /secret-token/i]) assert.ok(!re.test(text), String(re));
  }
});

test('workflow JSON: every HTTP node has auth where needed, timeout, error handling, and retries on remote calls', () => {
  for (const wf of load()) {
    for (const n of wf.nodes.filter((x) => x.type.endsWith('httpRequest'))) {
      const url = n.parameters.url;
      assert.ok(n.onError, `${wf.name}/${n.name} needs onError`);
      assert.ok(n.parameters.options.timeout > 0, `${n.name} timeout`);
      if (/AIRTABLE|APIFY|OPENAI|HEYGEN|N8N_WEBHOOK/.test(url)) {
        assert.ok(n.credentials, `${n.name} must reference a credential`);
        assert.ok(n.retryOnFail, `${n.name} must retry`);
      }
    }
  }
});

test('workflow JSON: Code nodes compile and avoid unavailable APIs', () => {
  for (const wf of load()) {
    for (const n of wf.nodes.filter((x) => x.type.endsWith('.code'))) {
      assert.doesNotThrow(() => new AsyncFunction('$input', '$env', '$', '$execution', '$workflow', n.parameters.jsCode), n.name);
      assert.ok(!/\brequire\(|\bprocess\.|\bfetch\(|\bimport\s*\(/.test(n.parameters.jsCode), `${n.name} uses an API that n8n Code nodes block`);
      assert.ok(!/module\.exports/.test(n.parameters.jsCode));
    }
  }
});

test('workflow JSON: Airtable status literals are valid states and writes only use known fields', () => {
  const known = new Set(Object.values(core.AIRTABLE_FIELD_MAP));
  for (const wf of load()) {
    for (const n of wf.nodes.filter((x) => x.type.endsWith('httpRequest') && x.parameters.jsonBody)) {
      for (const m of n.parameters.jsonBody.matchAll(/Status: '([A-Z_]+)'/g)) assert.ok(core.STATES.includes(m[1]), m[1]);
      for (const m of n.parameters.jsonBody.matchAll(/\b([A-Z][A-Za-z]+): (?:'|String|new|null)/g)) {
        if (['Status', 'LockedBy', 'LockedAt'].includes(m[1])) assert.ok(known.has(m[1]));
      }
    }
  }
});

test('Code nodes embed only the library functions they use', () => {
  const [intake] = load();
  const node = intake.nodes.find((n) => n.name === 'Validate Input');
  assert.ok(node.parameters.jsCode.includes('function normalizeReelUrl'));
  assert.ok(!node.parameters.jsCode.includes('function validateContent'));
});

test('generated JSON is up to date with the generator', () => {
  const { build } = require('../n8n/build/generate-workflows.cjs');
  const fresh = build(false);
  for (const f of FILES) assert.deepEqual(fresh[f], JSON.parse(fs.readFileSync(path.join(N8N_DIR, f), 'utf8')), `${f} is stale: run npm run build`);
});
