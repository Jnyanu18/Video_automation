'use strict';
// Generates importable n8n workflow JSON. Code-node bodies embed only the lib/core.js functions they use.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.resolve(__dirname, '..');
const CORE_SRC = fs.readFileSync(path.join(ROOT, 'lib', 'core.js'), 'utf8');

function loadChunks(src) {
  const chunks = [];
  let cur = null;
  for (const line of src.split('\n')) {
    if (/^if \(typeof module/.test(line)) break;
    const m = /^(?:function|const|let|var)\s+([A-Za-z0-9_$]+)/.exec(line);
    if (m) {
      cur = { name: m[1], text: line };
      chunks.push(cur);
    } else if (cur) cur.text += '\n' + line;
  }
  return chunks;
}

const CHUNKS = loadChunks(CORE_SRC);

function libFor(body) {
  const needed = new Set();
  const visit = (text) => {
    for (const c of CHUNKS) {
      if (!needed.has(c.name) && new RegExp('\\b' + c.name + '\\b').test(text)) {
        needed.add(c.name);
        visit(c.text);
      }
    }
  };
  visit(body);
  return CHUNKS.filter((c) => needed.has(c.name)).map((c) => c.text.trimEnd()).join('\n\n');
}

const uuid = (seed) => {
  const h = crypto.createHash('md5').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

const AUTH = {
  airtable: { type: 'predefined', cred: 'airtableTokenApi', name: 'Airtable Personal Access Token' },
  openai: { type: 'predefined', cred: 'openAiApi', name: 'OpenAI API' },
  apify: { type: 'generic', cred: 'httpHeaderAuth', name: 'Apify API Token' },
  internal: { type: 'generic', cred: 'httpHeaderAuth', name: 'Reels Internal Webhook Auth' },
  heygen: { type: 'generic', cred: 'httpHeaderAuth', name: 'HeyGen API Key' },
  blotato: { type: 'generic', cred: 'httpHeaderAuth', name: 'Blotato API Key' },
};

class Workflow {
  constructor(name) {
    this.name = name;
    this.nodes = [];
    this.links = [];
  }

  add(type, version, name, parameters, extra = {}) {
    if (this.nodes.some((n) => n.name === name)) throw new Error('duplicate node name ' + name);
    const node = { parameters, id: uuid(this.name + '/' + name), name, type, typeVersion: version, position: [0, 0], ...extra };
    this.nodes.push(node);
    return name;
  }

  link(from, to, out = 0) {
    this.links.push({ from, to, out });
  }

  webhook(name, { path: p, auth, respond }) {
    const credName = { intake: 'Reels Intake Webhook Auth', approval: 'Reels Approval Webhook Auth' }[auth] || 'Reels Internal Webhook Auth';
    return this.add('n8n-nodes-base.webhook', 2, name, {
      httpMethod: 'POST', path: p, authentication: 'headerAuth', responseMode: respond, options: {},
    }, { webhookId: uuid('hook/' + p), credentials: { httpHeaderAuth: { id: 'REPLACE_ME', name: credName } } });
  }

  code(name, body) {
    const lib = libFor(body);
    return this.add('n8n-nodes-base.code', 2, name, { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: (lib ? lib + '\n\n' : '') + body.trim() + '\n' });
  }

  ifNode(name, expr) {
    return this.add('n8n-nodes-base.if', 2.2, name, {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{ id: uuid(this.name + name), leftValue: '={{ ' + expr + ' }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
      options: {},
    });
  }

  respond(name, code, bodyExpr) {
    return this.add('n8n-nodes-base.respondToWebhook', 1.1, name, {
      respondWith: 'json', responseBody: '={{ ' + bodyExpr + ' }}', options: { responseCode: typeof code === 'string' ? '={{ ' + code + ' }}' : code },
    });
  }

  noop(name) {
    return this.add('n8n-nodes-base.noOp', 1, name, {});
  }

  // seconds: a number, or {expr} for an expression
  wait(name, seconds) {
    const amount = typeof seconds === 'object' ? '={{ ' + seconds.expr + ' }}' : seconds;
    return this.add('n8n-nodes-base.wait', 1.1, name, { amount, unit: 'seconds' }, { webhookId: uuid('wait/' + name) });
  }

  http(name, o) {
    const p = { method: o.method || 'GET', url: '={{ ' + o.url + ' }}' };
    const extra = {};
    const a = AUTH[o.auth];
    if (a) {
      if (a.type === 'predefined') Object.assign(p, { authentication: 'predefinedCredentialType', nodeCredentialType: a.cred });
      else Object.assign(p, { authentication: 'genericCredentialType', genericAuthType: a.cred });
      extra.credentials = { [a.cred]: { id: 'REPLACE_ME', name: a.name } };
    }
    if (o.query) {
      p.sendQuery = true;
      p.queryParameters = { parameters: o.query.map(([n, v]) => ({ name: n, value: v })) };
    }
    if (o.headers) {
      p.sendHeaders = true;
      p.headerParameters = { parameters: o.headers.map(([n, v]) => ({ name: n, value: v })) };
    }
    if (o.json) {
      Object.assign(p, { sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: '={{ ' + o.json + ' }}' });
    }
    if (o.multipart) {
      Object.assign(p, { sendBody: true, contentType: 'multipart-form-data', bodyParameters: { parameters: o.multipart } });
    }
    const response = {};
    if (o.file) response.responseFormat = 'file';
    p.options = { timeout: o.timeout || 30000 };
    if (o.file) p.options.response = { response };
    if (o.retry) Object.assign(extra, { retryOnFail: true, maxTries: o.retry[0], waitBetweenTries: o.retry[1] });
    if (o.onError) extra.onError = o.onError;
    if (o.always) extra.alwaysOutputData = true;
    return this.add('n8n-nodes-base.httpRequest', 4.2, name, p, extra);
  }

  toJSON() {
    const names = new Set(this.nodes.map((n) => n.name));
    const connections = {};
    for (const l of this.links) {
      if (!names.has(l.from) || !names.has(l.to)) throw new Error(`bad link ${l.from} -> ${l.to}`);
      const c = (connections[l.from] ||= { main: [] });
      while (c.main.length <= l.out) c.main.push([]);
      c.main[l.out].push({ node: l.to, type: 'main', index: 0 });
    }
    // BFS layout
    const incoming = new Set(this.links.map((l) => l.to));
    const depth = new Map();
    const queue = this.nodes.filter((n) => !incoming.has(n.name)).map((n) => (depth.set(n.name, 0), n.name));
    const rows = {};
    while (queue.length) {
      const cur = queue.shift();
      const d = depth.get(cur);
      for (const l of this.links.filter((x) => x.from === cur)) {
        if (!depth.has(l.to)) {
          depth.set(l.to, d + 1);
          queue.push(l.to);
        }
      }
    }
    for (const n of this.nodes) {
      const d = depth.get(n.name) || 0;
      rows[d] = (rows[d] || 0) + 1;
      n.position = [d * 280, (rows[d] - 1) * 160];
    }
    return {
      name: this.name, nodes: this.nodes, connections, active: false,
      settings: { executionOrder: 'v1' }, pinData: {}, meta: { templateCredsSetupCompleted: false },
    };
  }
}

const AT_BASE = "($env.AIRTABLE_BASE_URL || 'https://api.airtable.com') + '/v0/' + $env.AIRTABLE_BASE_ID + '/' + ($env.AIRTABLE_TABLE || 'Reels')";
const atRecord = (idExpr) => `${AT_BASE} + '/' + ${idExpr}`;
const WEBHOOK = (p) => `$env.N8N_WEBHOOK_BASE + '/webhook/${p}'`;

// Fail: <label> -> Mark Failed -> optional notification. Returns the Mark Failed node name.
function failChain(wf, o) {
  const markFailed = wf.http('Mark Failed', {
    method: 'PATCH', url: atRecord('$json.recordId'), auth: 'airtable', json: '{ fields: $json.fields }', retry: [3, 2000], onError: 'continueRegularOutput',
  });
  const ifNotify = wf.ifNode('IF Notify Failure', '!!$env.NOTIFY_WEBHOOK_URL');
  const notify = wf.http('Notify Failure', {
    method: 'POST', url: '$env.NOTIFY_WEBHOOK_URL', auth: null, onError: 'continueRegularOutput', timeout: 10000,
    json: `{ text: 'Reel pipeline FAILED (${o.stage}) record ' + ($json.id || 'unknown') + ': ' + String(($json.fields && $json.fields.ErrorLog) || '').slice(0, 300) }`,
  });
  wf.link(markFailed, ifNotify);
  wf.link(ifNotify, notify, 0);
  return {
    markFailed,
    fail(label, from, fromOut, failedFrom, extraTo, extra = {}) {
      const failedExpr = typeof failedFrom === 'object' ? failedFrom.expr : JSON.stringify(failedFrom);
      const n = wf.code('Fail: ' + label, `
const failure = describeFailure($input.first().json, ${JSON.stringify(label)});
${extra.failureExpr ? `Object.assign(failure, ${extra.failureExpr});` : ''}
const recordId = ${o.recordIdExpr};
const fields = Object.assign(buildFailureFields({ failure, existingLog: ${o.existingLogExpr}, failedFromState: ${failedExpr}, now: new Date().toISOString() }), ${extra.fieldsExpr || '{}'});
return [{ json: { recordId, failure, fields } }];`);
      wf.link(from, n, fromOut);
      wf.link(n, markFailed);
      if (extraTo) wf.link(n, extraTo);
      return n;
    },
  };
}

function buildIntake() {
  const wf = new Workflow('01 - Reel Intake');
  const hook = wf.webhook('Webhook: Submit Reel', { path: 'reels/intake', auth: 'intake', respond: 'responseNode' });
  const validate = wf.code('Validate Input', `
const body = $input.first().json.body || {};
const norm = normalizeReelUrl(body.url);
if (!norm.ok) return [{ json: { ok: false, error: norm.error } }];
const so = normalizeSubmitOptions(body);
if (!so.ok) return [{ json: { ok: false, error: 'INVALID_OPTIONS', errors: so.errors } }];
return [{ json: { ok: true, key: norm.key, url: norm.url, shortCode: norm.shortCode, formula: keyFormula(norm.key), submittedBy: body.submittedBy || 'api', options: so.options } }];`);
  const ifValid = wf.ifNode('IF Input Valid', '$json.ok');
  const r400 = wf.respond('Respond 400', 400, '{ ok: false, error: $json.error, errors: $json.errors || [] }');
  const find = wf.http('Find Existing', {
    url: AT_BASE, auth: 'airtable', query: [['filterByFormula', '={{ $json.formula }}'], ['maxRecords', '1']], retry: [3, 2000], onError: 'continueErrorOutput',
  });
  const r503 = wf.respond('Respond 503', 503, "{ ok: false, error: 'STORE_UNAVAILABLE' }");
  const dedup = wf.code('Dedup Decision', `
const recs = $input.first().json.records || [];
const v = $('Validate Input').first().json;
if (recs.length) {
  const r = recordFromAirtable(recs[0]);
  return [{ json: { duplicate: true, recordId: r.id, status: r.status, key: v.key } }];
}
return [{ json: { duplicate: false, key: v.key } }];`);
  const ifDup = wf.ifNode('IF Duplicate', '$json.duplicate');
  const rDup = wf.respond('Respond Duplicate', 200, '{ ok: true, duplicate: true, recordId: $json.recordId, status: $json.status, key: $json.key }');
  const build = wf.code('Build New Record', `
const v = $('Validate Input').first().json;
return [{ json: { fields: newRecordFields(v, v.submittedBy, v.options) } }];`);
  const create = wf.http('Create Record', {
    method: 'POST', url: AT_BASE, auth: 'airtable', json: '{ fields: $json.fields }', retry: [3, 2000], onError: 'continueErrorOutput',
  });
  const r502 = wf.respond('Respond 502', 502, "{ ok: false, error: 'RECORD_CREATE_FAILED' }");
  const verify = wf.http('Verify Unique', {
    url: AT_BASE, auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput',
    query: [['filterByFormula', "={{ $('Validate Input').first().json.formula }}"], ['sort[0][field]', 'CreatedTime'], ['sort[0][direction]', 'asc']],
  });
  const unique = wf.code('Unique Decision', `
const recs = $input.first().json.records || [];
const mine = $('Create Record').first().json.id;
const winner = recs.length ? recs[0].id : mine;
return [{ json: { isWinner: winner === mine, recordId: mine, winnerId: winner, key: $('Validate Input').first().json.key } }];`);
  const ifWinner = wf.ifNode('IF Is Winner', '$json.isWinner');
  const del = wf.http('Delete Duplicate Record', { method: 'DELETE', url: atRecord("$('Unique Decision').first().json.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueRegularOutput' });
  const rRace = wf.respond('Respond Duplicate (Race)', 200, "{ ok: true, duplicate: true, recordId: $('Unique Decision').first().json.winnerId, key: $('Unique Decision').first().json.key }");
  const rAcc = wf.respond('Respond Accepted', 202, "{ ok: true, duplicate: false, recordId: $json.recordId, key: $json.key, status: 'SUBMITTED' }");
  // Both entry paths (new submission, retry of a never-extracted record) converge here; everything below reads the record from Record Ref.
  const recordRef = wf.code('Record Ref', `
let recordId = null;
try { recordId = $('Unique Decision').first().json.recordId; } catch (e) { recordId = null; }
const src = recordId ? $('Validate Input').first().json : $('Retry Decision').first().json;
return [{ json: { recordId: recordId || src.recordId, url: src.url, shortCode: src.shortCode, key: src.key } }];`);
  const claim = wf.http('Claim Extracting', {
    method: 'PATCH', url: atRecord("$('Record Ref').first().json.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput',
    json: "{ fields: { Status: 'EXTRACTING', LockedBy: String($execution.id), LockedAt: new Date().toISOString() } }",
  });
  const apifyIn = wf.code('Build Apify Input', `
const v = $('Record Ref').first().json;
return [{ json: { body: apifyRequestBody(v.url, { includeTranscript: true }) } }];`);
  const apify = wf.http('Run Apify Scraper', {
    method: 'POST', auth: 'apify', json: '$json.body', timeout: 180000, retry: [3, 3000], onError: 'continueErrorOutput', always: true,
    url: "($env.APIFY_BASE_URL || 'https://api.apify.com') + '/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items'",
  });
  const normalize = wf.code('Normalize Reel', `
const items = $input.all().map((i) => i.json).filter((j) => j && Object.keys(j).length > 0);
const v = $('Record Ref').first().json;
return [{ json: normalizeApifyItems(items, v.shortCode, cfgFromEnv($env)) }];`);
  const ifExtract = wf.ifNode('IF Extract OK', '$json.ok');
  const ifStt = wf.ifNode('IF Needs STT', '$json.needsStt');
  const dl = wf.http('Download Audio', { url: '$json.reel.audioUrl || $json.reel.videoUrl', file: true, timeout: 60000, retry: [2, 2000], onError: 'continueErrorOutput' });
  const stt = wf.http('Transcribe Audio', {
    method: 'POST', auth: 'openai', timeout: 120000, retry: [2, 3000], onError: 'continueErrorOutput',
    url: "($env.OPENAI_BASE_URL || 'https://api.openai.com') + '/v1/audio/transcriptions'",
    multipart: [
      { parameterType: 'formBinaryData', name: 'file', inputDataFieldName: 'data' },
      { name: 'model', value: "={{ $env.OPENAI_STT_MODEL || 'whisper-1' }}" },
      { name: 'response_format', value: 'json' },
    ],
  });
  const merge = wf.code('Merge Source', `
const n = $('Normalize Reel').first().json;
let stt = '';
try { stt = $('Transcribe Audio').first().json.text || ''; } catch (e) { stt = ''; }
const r = resolveSourceText(n.reel, stt);
if (!r.ok) return [{ json: { ok: false, error: r.error, message: r.message } }];
return [{ json: { ok: true, reel: r.reel, fields: sourceFields(r.reel, new Date().toISOString()) } }];`);
  const ifSource = wf.ifNode('IF Source OK', '$json.ok');
  const save = wf.http('Save Source', {
    method: 'PATCH', url: atRecord("$('Record Ref').first().json.recordId"), auth: 'airtable', json: '{ fields: $json.fields }', retry: [3, 2000], onError: 'continueErrorOutput',
  });
  const trigger = wf.http('Trigger Content Workflow', {
    method: 'POST', url: WEBHOOK('reels/content'), auth: 'internal', json: "{ recordId: $('Record Ref').first().json.recordId }", retry: [3, 3000], onError: 'continueErrorOutput', timeout: 15000,
  });

  const fc = failChain(wf, {
    stage: 'intake',
    recordIdExpr: "(() => { try { return $('Record Ref').first().json.recordId; } catch (e) { return $('Create Record').first().json.id; } })()",
    existingLogExpr: "''",
  });

  // Retry entry: a record that failed before extraction finished is re-run from the saved URL (triggered by workflow 03).
  const rHook = wf.webhook('Webhook: Retry Intake', { path: 'reels/intake-retry', auth: 'internal', respond: 'responseNode' });
  const rValidate = wf.code('Retry Validate', `
const body = $input.first().json.body || {};
const ok = typeof body.recordId === 'string' && /^rec[A-Za-z0-9]{6,30}$/.test(body.recordId);
return [{ json: { ok, recordId: ok ? body.recordId : null } }];`);
  const rIfValid = wf.ifNode('IF Retry Request Valid', '$json.ok');
  const rR400 = wf.respond('Respond 400 (Retry)', 400, "{ ok: false, error: 'INVALID_REQUEST' }");
  const rGet = wf.http('Get Record (Retry)', { url: atRecord('$json.recordId'), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput' });
  const rR503 = wf.respond('Respond 503 (Retry)', 503, "{ ok: false, error: 'STORE_UNAVAILABLE' }");
  const rDecide = wf.code('Retry Decision', `
const record = recordFromAirtable($input.first().json);
const d = decideIntakeRetry({ record, cfg: cfgFromEnv($env), now: Date.now() });
const norm = d.action === 'proceed' ? normalizeReelUrl(d.url) : { ok: false, error: d.reason };
return [{ json: { proceed: d.action === 'proceed' && norm.ok, reason: norm.ok ? d.reason : norm.error, recordId: record.id, url: norm.url, shortCode: norm.shortCode, key: record.key } }];`);
  const rIfGo = wf.ifNode('IF Retry Proceed', '$json.proceed');
  const rAccepted = wf.respond('Respond Retry Accepted', 202, "{ ok: true, recordId: $json.recordId, status: 'SUBMITTED' }");
  const rSkipped = wf.respond('Respond Retry Skipped', 200, '{ ok: true, skipped: true, reason: $json.reason }');
  wf.link(rHook, rValidate);
  wf.link(rValidate, rIfValid);
  wf.link(rIfValid, rGet, 0);
  wf.link(rIfValid, rR400, 1);
  wf.link(rGet, rDecide, 0);
  wf.link(rGet, rR503, 1);
  wf.link(rDecide, rIfGo);
  wf.link(rIfGo, rAccepted, 0);
  wf.link(rIfGo, rSkipped, 1);
  wf.link(rAccepted, recordRef);

  wf.link(hook, validate);
  wf.link(validate, ifValid);
  wf.link(ifValid, find, 0);
  wf.link(ifValid, r400, 1);
  wf.link(find, dedup, 0);
  wf.link(find, r503, 1);
  wf.link(dedup, ifDup);
  wf.link(ifDup, rDup, 0);
  wf.link(ifDup, build, 1);
  wf.link(build, create);
  wf.link(create, verify, 0);
  wf.link(create, r502, 1);
  wf.link(verify, unique, 0);
  fc.fail('Verify Unique', verify, 1, 'SUBMITTED', wf.respond('Respond 503 (Verify)', 503, "{ ok: false, error: 'STORE_UNAVAILABLE' }"));
  wf.link(unique, ifWinner);
  wf.link(ifWinner, rAcc, 0);
  wf.link(ifWinner, del, 1);
  wf.link(del, rRace);
  wf.link(rAcc, recordRef);
  wf.link(recordRef, claim);
  wf.link(claim, apifyIn, 0);
  fc.fail('Claim', claim, 1, 'SUBMITTED');
  wf.link(apifyIn, apify);
  wf.link(apify, normalize, 0);
  fc.fail('Apify', apify, 1, 'EXTRACTING');
  wf.link(normalize, ifExtract);
  wf.link(ifExtract, ifStt, 0);
  fc.fail('Extraction', ifExtract, 1, 'EXTRACTING');
  wf.link(ifStt, dl, 0);
  wf.link(ifStt, merge, 1);
  wf.link(dl, stt, 0);
  wf.link(dl, merge, 1);
  wf.link(stt, merge, 0);
  wf.link(stt, merge, 1);
  wf.link(merge, ifSource);
  wf.link(ifSource, save, 0);
  fc.fail('Source', ifSource, 1, 'EXTRACTING');
  wf.link(save, trigger, 0);
  fc.fail('Save Source', save, 1, 'EXTRACTING');
  fc.fail('Trigger Content', trigger, 1, 'EXTRACTING');
  return wf;
}

function buildContent() {
  const wf = new Workflow('02 - Content Generation');
  const hook = wf.webhook('Webhook: Generate Content', { path: 'reels/content', auth: 'internal', respond: 'onReceived' });
  const validate = wf.code('Validate Request', `
const body = $input.first().json.body || {};
const ok = typeof body.recordId === 'string' && /^rec[A-Za-z0-9]{6,30}$/.test(body.recordId);
return [{ json: { ok, recordId: ok ? body.recordId : null } }];`);
  const ifValid = wf.ifNode('IF Request Valid', '$json.ok');
  const stopInvalid = wf.noop('Stop: Invalid Request');
  const get = wf.http('Get Record', { url: atRecord('$json.recordId'), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput' });
  const stopRead = wf.noop('Stop: Record Not Readable');
  const guard = wf.code('Entry Guard', `
const record = recordFromAirtable($input.first().json);
const cfg = cfgFromEnv($env);
const d = decideEntry({ record, expectedStates: ['EXTRACTING'], requireExtraction: true, now: Date.now(), lockTtlMs: cfg.lockTtlMinutes * 60000, resume: false });
return [{ json: { proceed: d.action !== 'skip', reason: d.reason, recordId: record.id } }];`);
  const ifGuard = wf.ifNode('IF Guard Passed', '$json.proceed');
  const stopSkip = wf.noop('Stop: Skipped');
  const claim = wf.http('Claim Record', {
    method: 'PATCH', url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput',
    json: '{ fields: { LockedBy: String($execution.id), LockedAt: new Date().toISOString() } }',
  });
  const stopClaim = wf.noop('Stop: Claim Failed');
  const settle = wf.wait('Settle Claim', 2);
  const verifyClaim = wf.http('Verify Claim', { url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput' });
  const check = wf.code('Check Claim', `
return [{ json: { held: lockHeld(recordFromAirtable($input.first().json), String($execution.id)) } }];`);
  const ifHeld = wf.ifNode('IF Claim Held', '$json.held');
  const stopLost = wf.noop('Stop: Lost Claim');
  const prompt = wf.code('Build Prompt', `
const inp = $input.first().json;
const attempt = inp.attempt || 1;
const record = recordFromAirtable($('Verify Claim').first().json);
const guidance = record.regenerationNote ? 'Reviewer guidance: ' + record.regenerationNote : '';
const feedback = [guidance, inp.feedback].filter(Boolean).join(' | ');
const p = buildContentPrompt({ caption: record.sourceCaption, transcript: record.sourceTranscript, niche: record.niche, brandVoice: record.brandVoice, brandVoiceNotes: record.brandVoiceNotes }, cfgFromEnv($env), feedback);
const request = buildChatRequest(p, cfgFromEnv($env), $env.OPENAI_MODEL || 'gpt-4o-mini');
return [{ json: { attempt, request } }];`);
  const openai = wf.http('OpenAI Generate', {
    method: 'POST', auth: 'openai', json: '$json.request', timeout: 90000, retry: [3, 3000], onError: 'continueErrorOutput',
    url: "($env.OPENAI_BASE_URL || 'https://api.openai.com') + '/v1/chat/completions'",
  });
  const output = wf.code('Validate Output', `
const attempt = $('Build Prompt').first().json.attempt;
const record = recordFromAirtable($('Verify Claim').first().json);
const cfg = cfgFromEnv($env);
const fail = (error, errors, retry) => [{ json: { ok: false, error, errors, message: errors.join('; '), attempt, retry: retry && attempt < cfg.maxContentAttempts } }];
const t = extractLLMText($input.first().json);
if (!t.ok) return fail(t.error, [t.error], false);
const parsed = parseLLMContent(t.text);
if (!parsed.ok) return fail('CONTENT_VALIDATION_FAILED', parsed.errors, true);
const v = validateContent(parsed.data, { caption: record.sourceCaption, transcript: record.sourceTranscript }, cfg);
if (!v.ok) return fail('CONTENT_VALIDATION_FAILED', v.errors, true);
return [{ json: { ok: true, attempt, content: v.content, fields: contentFields(v.content, attempt) } }];`);
  const ifValidOut = wf.ifNode('IF Content Valid', '$json.ok');
  const ifRetry = wf.ifNode('IF Can Retry', '$json.retry');
  const next = wf.code('Next Attempt', `
const j = $input.first().json;
return [{ json: { attempt: j.attempt + 1, feedback: j.errors.join('; ') } }];`);
  const saveContent = wf.http('Save Content', {
    method: 'PATCH', url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', json: '{ fields: $json.fields }', retry: [3, 2000], onError: 'continueErrorOutput',
  });
  const await_ = wf.http('Await Approval', {
    method: 'PATCH', url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput',
    json: "{ fields: { Status: 'AWAITING_APPROVAL', LockedBy: '', LockedAt: null } }",
  });
  const ifNotify = wf.ifNode('IF Notify Ready', '!!$env.NOTIFY_WEBHOOK_URL');
  const notify = wf.http('Notify Ready', {
    method: 'POST', url: '$env.NOTIFY_WEBHOOK_URL', onError: 'continueRegularOutput', timeout: 10000,
    json: "{ text: 'Reel ready for approval: record ' + $json.id + '. Script: ' + String($json.fields.Script || '').slice(0, 200) + ' (POST /webhook/reels/approval, action view|edit|approve|reject|regenerate)' }",
  });

  const fc = failChain(wf, {
    stage: 'content', recordIdExpr: "$('Entry Guard').first().json.recordId",
    existingLogExpr: "recordFromAirtable($('Verify Claim').first().json).errorLog",
  });

  wf.link(hook, validate);
  wf.link(validate, ifValid);
  wf.link(ifValid, get, 0);
  wf.link(ifValid, stopInvalid, 1);
  wf.link(get, guard, 0);
  wf.link(get, stopRead, 1);
  wf.link(guard, ifGuard);
  wf.link(ifGuard, claim, 0);
  wf.link(ifGuard, stopSkip, 1);
  wf.link(claim, settle, 0);
  wf.link(claim, stopClaim, 1);
  wf.link(settle, verifyClaim);
  wf.link(verifyClaim, check, 0);
  wf.link(verifyClaim, stopClaim, 1);
  wf.link(check, ifHeld);
  wf.link(ifHeld, prompt, 0);
  wf.link(ifHeld, stopLost, 1);
  wf.link(prompt, openai);
  wf.link(openai, output, 0);
  fc.fail('OpenAI', openai, 1, 'EXTRACTING');
  wf.link(output, ifValidOut);
  wf.link(ifValidOut, saveContent, 0);
  wf.link(ifValidOut, ifRetry, 1);
  wf.link(ifRetry, next, 0);
  fc.fail('Content', ifRetry, 1, 'EXTRACTING');
  wf.link(next, prompt);
  wf.link(saveContent, await_, 0);
  fc.fail('Save Content', saveContent, 1, 'EXTRACTING');
  wf.link(await_, ifNotify, 0);
  fc.fail('Await Approval', await_, 1, 'CONTENT_GENERATED');
  wf.link(ifNotify, notify, 0);
  return wf;
}

// Approval is a state in Airtable (AWAITING_APPROVAL), not an open execution: nothing downstream runs until this webhook moves the record on.
function buildApproval() {
  const wf = new Workflow('03 - Human Approval');
  const hook = wf.webhook('Webhook: Approval Action', { path: 'reels/approval', auth: 'approval', respond: 'responseNode' });
  const validate = wf.code('Validate Request', `
return [{ json: validateApprovalRequest($input.first().json.body) }];`);
  const ifValid = wf.ifNode('IF Request Valid', '$json.ok');
  const r400 = wf.respond('Respond 400', 400, "{ ok: false, error: 'INVALID_REQUEST', errors: $json.errors }");
  const get = wf.http('Get Record', { url: atRecord('$json.req.recordId'), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput' });
  const readError = wf.code('Describe Read Error', `
const f = describeFailure($input.first().json, 'Airtable');
const notFound = f.httpStatus === 404;
return [{ json: { ok: false, status: notFound ? 404 : 503, error: notFound ? 'RECORD_NOT_FOUND' : 'STORE_UNAVAILABLE' } }];`);
  const rErr = wf.respond('Respond Error', '$json.status', "{ ok: false, error: $json.error, errors: $json.errors || [], currentStatus: $json.currentStatus || null, fingerprint: $json.fingerprint || null }");
  const decidePre = wf.code('Decide (Pre-Claim)', `
const record = recordFromAirtable($input.first().json);
const req = $('Validate Request').first().json.req;
return [{ json: decideApproval({ record, req, cfg: cfgFromEnv($env), now: Date.now(), runId: 'approval:' + $execution.id, phase: 'pre' }) }];`);
  const ifPreOk = wf.ifNode('IF Decision OK (Pre)', '$json.ok');
  const ifClaim = wf.ifNode('IF Needs Claim', '$json.needsClaim');
  const claim = wf.http('Claim Record', {
    method: 'PATCH', url: atRecord("$('Validate Request').first().json.req.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput',
    json: "{ fields: { LockedBy: 'approval:' + $execution.id, LockedAt: new Date().toISOString() } }",
  });
  const r503 = wf.respond('Respond 503', 503, "{ ok: false, error: 'STORE_UNAVAILABLE' }");
  const settle = wf.wait('Settle Claim', 1);
  const verifyClaim = wf.http('Verify Claim', { url: atRecord("$('Validate Request').first().json.req.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput' });
  const decidePost = wf.code('Decide (Post-Claim)', `
const record = recordFromAirtable($input.first().json);
const req = $('Validate Request').first().json.req;
return [{ json: decideApproval({ record, req, cfg: cfgFromEnv($env), now: Date.now(), runId: 'approval:' + $execution.id, phase: 'post' }) }];`);
  const ifPostOk = wf.ifNode('IF Decision OK (Post)', '$json.ok');
  const ifRelease = wf.ifNode('IF Release Needed', '$json.releaseLock');
  const release = wf.http('Release Lock', {
    method: 'PATCH', url: atRecord("$('Validate Request').first().json.req.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueRegularOutput',
    json: '{ fields: { LockedBy: "", LockedAt: null } }',
  });
  const rErrPost = wf.respond('Respond Error (Post)', "$('Decide (Post-Claim)').first().json.status", "{ ok: false, error: $('Decide (Post-Claim)').first().json.error, errors: $('Decide (Post-Claim)').first().json.errors || [], currentStatus: $('Decide (Post-Claim)').first().json.currentStatus || null }");
  const apply = wf.http('Apply Decision', {
    method: 'PATCH', url: atRecord("$('Validate Request').first().json.req.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput',
    json: "{ fields: $('Decide (Post-Claim)').first().json.fields }",
  });
  const r502 = wf.respond('Respond 502', 502, "{ ok: false, error: 'UPDATE_FAILED' }");
  const plan = wf.code('Plan Trigger', `
let d;
try { d = $('Decide (Post-Claim)').first().json; } catch (e) { d = $('Decide (Pre-Claim)').first().json; }
return [{ json: { trigger: d.trigger || null, path: { content: 'reels/content', publish: 'reels/publish', intake: 'reels/intake-retry' }[d.trigger] || 'reels/video', recordId: d.response.recordId, decision: d } }];`);
  const ifTrigger = wf.ifNode('IF Has Trigger', '!!$json.trigger');
  const trigger = wf.http('Trigger Workflow', {
    method: 'POST', url: "$env.N8N_WEBHOOK_BASE + '/webhook/' + $json.path", auth: 'internal', json: '{ recordId: $json.recordId }', retry: [3, 3000], onError: 'continueRegularOutput', timeout: 15000,
  });
  const build = wf.code('Build Response', `
const plan = $('Plan Trigger').first().json;
let triggerStatus = 'NONE';
if (plan.trigger) {
  let t;
  try { t = $('Trigger Workflow').first().json; } catch (e) { t = { error: { message: 'not executed' } }; }
  triggerStatus = t && t.error ? 'FAILED' : 'QUEUED';
}
return [{ json: { httpStatus: plan.decision.httpStatus, body: Object.assign({}, plan.decision.response, { trigger: plan.trigger, triggerStatus }) } }];`);
  const rOk = wf.respond('Respond Result', '$json.httpStatus', '$json.body');

  wf.link(hook, validate);
  wf.link(validate, ifValid);
  wf.link(ifValid, get, 0);
  wf.link(ifValid, r400, 1);
  wf.link(get, decidePre, 0);
  wf.link(get, readError, 1);
  wf.link(readError, rErr);
  wf.link(decidePre, ifPreOk);
  wf.link(ifPreOk, ifClaim, 0);
  wf.link(ifPreOk, rErr, 1);
  wf.link(ifClaim, claim, 0);
  wf.link(ifClaim, plan, 1);
  wf.link(claim, settle, 0);
  wf.link(claim, r503, 1);
  wf.link(settle, verifyClaim);
  wf.link(verifyClaim, decidePost, 0);
  wf.link(verifyClaim, r503, 1);
  wf.link(decidePost, ifPostOk);
  wf.link(ifPostOk, apply, 0);
  wf.link(ifPostOk, ifRelease, 1);
  wf.link(ifRelease, release, 0);
  wf.link(ifRelease, rErrPost, 1);
  wf.link(release, rErrPost);
  wf.link(apply, plan, 0);
  wf.link(apply, r502, 1);
  wf.link(plan, ifTrigger);
  wf.link(ifTrigger, trigger, 0);
  wf.link(ifTrigger, build, 1);
  wf.link(trigger, build);
  wf.link(build, rOk);
  return wf;
}

function buildVideo() {
  const wf = new Workflow('04 - HeyGen Video Generation');
  const hook = wf.webhook('Webhook: Generate Video', { path: 'reels/video', auth: 'internal', respond: 'onReceived' });
  const validate = wf.code('Validate Request', `
const body = $input.first().json.body || {};
const ok = typeof body.recordId === 'string' && /^rec[A-Za-z0-9]{6,30}$/.test(body.recordId);
return [{ json: { ok, recordId: ok ? body.recordId : null } }];`);
  const ifValid = wf.ifNode('IF Request Valid', '$json.ok');
  const stopInvalid = wf.noop('Stop: Invalid Request');
  const get = wf.http('Get Record', { url: atRecord('$json.recordId'), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput' });
  const stopRead = wf.noop('Stop: Record Not Readable');
  const guard = wf.code('Entry Guard', `
const record = recordFromAirtable($input.first().json);
const d = decideVideoEntry({ record, cfg: cfgFromEnv($env), now: Date.now() });
return [{ json: { proceed: d.action !== 'skip', reason: d.reason, recordId: record.id } }];`);
  const ifGuard = wf.ifNode('IF Guard Passed', '$json.proceed');
  const stopSkip = wf.noop('Stop: Skipped');
  const claim = wf.http('Claim Record', {
    method: 'PATCH', url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput',
    json: '{ fields: { LockedBy: String($execution.id), LockedAt: new Date().toISOString() } }',
  });
  const stopClaim = wf.noop('Stop: Claim Failed');
  const settle = wf.wait('Settle Claim', 2);
  const verifyClaim = wf.http('Verify Claim', { url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput' });
  const check = wf.code('Check Claim', `
const record = recordFromAirtable($input.first().json);
const held = lockHeld(record, String($execution.id));
const d = decideVideoEntry({ record: Object.assign({}, record, { lockedBy: '', lockedAt: null }), cfg: cfgFromEnv($env), now: Date.now() });
return [{ json: { held: held && d.action !== 'skip', resume: d.action === 'resume', reason: d.reason } }];`);
  const ifHeld = wf.ifNode('IF Claim Held', '$json.held');
  const stopLost = wf.noop('Stop: Lost Claim');
  const ifResume = wf.ifNode('IF Resume Existing Job', '$json.resume');

  const initResume = wf.code('Init Poll (Resume)', `
const record = recordFromAirtable($('Verify Claim').first().json);
return [{ json: { recordId: record.id, videoId: record.heygenVideoId, videoAttempt: Math.max(1, record.videoAttempt), attempt: record.pollAttempts } }];`);
  const buildSubmit = wf.code('Build Submit', `
const record = recordFromAirtable($('Verify Claim').first().json);
const r = buildHeyGenRequest(record, $env);
if (!r.ok) return [{ json: { ok: false, error: 'HEYGEN_REQUEST_INVALID', message: r.errors.join('; ') } }];
return [{ json: { ok: true, idempotencyKey: r.idempotencyKey, body: r.body, videoAttempt: Math.max(1, record.videoAttempt) } }];`);
  const ifBuilt = wf.ifNode('IF Submit Request Valid', '$json.ok');
  const submit = wf.http('Submit Video', {
    method: 'POST', auth: 'heygen', json: '$json.body', headers: [['Idempotency-Key', '={{ $json.idempotencyKey }}']], timeout: 60000, retry: [3, 3000], onError: 'continueErrorOutput',
    url: "($env.HEYGEN_BASE_URL || 'https://api.heygen.com') + '/v3/videos'",
  });
  const parse = wf.code('Parse Submit', `
const id = $input.first().json && $input.first().json.data && $input.first().json.data.video_id;
if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{4,100}$/.test(id)) return [{ json: { ok: false, error: 'HEYGEN_NO_VIDEO_ID', message: 'HeyGen response did not include data.video_id' } }];
return [{ json: { ok: true, videoId: id, videoAttempt: $('Build Submit').first().json.videoAttempt } }];`);
  const ifParsed = wf.ifNode('IF Submit Parsed', '$json.ok');
  const jobFields = wf.code('Build Job Fields', `
const p = $input.first().json;
return [{ json: { fields: videoSubmitFields(p.videoId, p.videoAttempt, new Date().toISOString()) } }];`);
  const saveJob = wf.http('Save Job', {
    method: 'PATCH', url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', json: '{ fields: $json.fields }', retry: [3, 2000], onError: 'continueErrorOutput',
  });
  const initNew = wf.code('Init Poll (New)', `
const p = $('Parse Submit').first().json;
return [{ json: { recordId: $('Entry Guard').first().json.recordId, videoId: p.videoId, videoAttempt: p.videoAttempt, attempt: 0 } }];`);

  const loop = wf.noop('Poll Loop Entry');
  const poll = wf.http('Poll Status', {
    url: "($env.HEYGEN_BASE_URL || 'https://api.heygen.com') + '/v3/videos/' + encodeURIComponent($json.videoId)", auth: 'heygen', timeout: 30000, retry: [3, 3000], onError: 'continueRegularOutput',
  });
  const interpret = wf.code('Interpret Status', `
const state = $('Poll Loop Entry').first().json;
return [{ json: interpretPoll($input.first().json, state, cfgFromEnv($env)) }];`);
  const ifPending = wf.ifNode('IF Still Pending', "$json.state === 'pending'");
  const next = wf.code('Next Poll', `
const s = $('Poll Loop Entry').first().json;
const r = $input.first().json;
return [{ json: { recordId: s.recordId, videoId: s.videoId, videoAttempt: s.videoAttempt, attempt: r.attempt, status: r.status, delay: pollDelaySeconds(r.attempt, cfgFromEnv($env)) } }];`);
  const heartbeat = wf.http('Heartbeat', {
    method: 'PATCH', url: atRecord('$json.recordId'), auth: 'airtable', retry: [2, 2000], onError: 'continueRegularOutput',
    json: '{ fields: { LockedAt: new Date().toISOString(), PollAttempts: $json.attempt, HeyGenStatus: String($json.status) } }',
  });
  const pause = wf.wait('Wait Before Next Poll', { expr: '$json.delay' });
  const ifDone = wf.ifNode('IF Video Completed', "$json.state === 'completed'");
  const doneFields = wf.code('Build Completion Fields', `
return [{ json: { fields: videoCompleteFields($input.first().json, new Date().toISOString()) } }];`);
  const saveVideo = wf.http('Save Video', {
    method: 'PATCH', url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', json: '{ fields: $json.fields }', retry: [3, 2000], onError: 'continueErrorOutput',
  });
  const ifNotify = wf.ifNode('IF Notify Ready', '!!$env.NOTIFY_WEBHOOK_URL');
  const notify = wf.http('Notify Video Ready', {
    method: 'POST', url: '$env.NOTIFY_WEBHOOK_URL', onError: 'continueRegularOutput', timeout: 10000,
    json: "{ text: 'Video ready: record ' + $json.id + ' (' + $json.fields.VideoDuration + 's)' }",
  });
  // Publishing is opt-in (AUTO_PUBLISH=true); a failed trigger leaves the record VIDEO_COMPLETED for a manual trigger.
  const ifAuto = wf.ifNode('IF Auto Publish', "$env.AUTO_PUBLISH === 'true'");
  const triggerPublish = wf.http('Trigger Publish', {
    method: 'POST', url: WEBHOOK('reels/publish'), auth: 'internal', json: '{ recordId: $json.id }', retry: [3, 3000], onError: 'continueRegularOutput', timeout: 15000,
  });

  const fc = failChain(wf, {
    stage: 'video', recordIdExpr: "$('Entry Guard').first().json.recordId",
    existingLogExpr: "recordFromAirtable($('Verify Claim').first().json).errorLog",
  });

  wf.link(hook, validate);
  wf.link(validate, ifValid);
  wf.link(ifValid, get, 0);
  wf.link(ifValid, stopInvalid, 1);
  wf.link(get, guard, 0);
  wf.link(get, stopRead, 1);
  wf.link(guard, ifGuard);
  wf.link(ifGuard, claim, 0);
  wf.link(ifGuard, stopSkip, 1);
  wf.link(claim, settle, 0);
  wf.link(claim, stopClaim, 1);
  wf.link(settle, verifyClaim);
  wf.link(verifyClaim, check, 0);
  wf.link(verifyClaim, stopClaim, 1);
  wf.link(check, ifHeld);
  wf.link(ifHeld, ifResume, 0);
  wf.link(ifHeld, stopLost, 1);
  wf.link(ifResume, initResume, 0);
  wf.link(ifResume, buildSubmit, 1);
  wf.link(initResume, loop);

  wf.link(buildSubmit, ifBuilt);
  wf.link(ifBuilt, submit, 0);
  fc.fail('Build Request', ifBuilt, 1, 'APPROVED');
  wf.link(submit, parse, 0);
  fc.fail('Submit Video', submit, 1, 'APPROVED');
  wf.link(parse, ifParsed);
  wf.link(ifParsed, jobFields, 0);
  fc.fail('Parse Submit', ifParsed, 1, 'APPROVED');
  wf.link(jobFields, saveJob);
  wf.link(saveJob, initNew, 0);
  // The job exists at HeyGen but its id was not stored: the same idempotency key replays it on retry, so keep the attempt number.
  fc.fail('Save Job', saveJob, 1, 'APPROVED', null, { failureExpr: "{ videoId: $('Parse Submit').first().json.videoId }" });
  wf.link(initNew, loop);

  wf.link(loop, poll);
  wf.link(poll, interpret);
  wf.link(interpret, ifPending);
  wf.link(ifPending, next, 0);
  wf.link(ifPending, ifDone, 1);
  wf.link(next, heartbeat);
  wf.link(next, pause);
  wf.link(pause, loop);
  wf.link(ifDone, doneFields, 0);
  fc.fail('Video', ifDone, 1, { expr: "$input.first().json.terminalJob ? 'APPROVED' : 'VIDEO_GENERATING'" }, null, {
    fieldsExpr: "videoFailureExtras($input.first().json, $('Poll Loop Entry').first().json)",
    failureExpr: "{ videoId: $('Poll Loop Entry').first().json.videoId, polls: $input.first().json.attempt }",
  });
  wf.link(doneFields, saveVideo);
  wf.link(saveVideo, ifNotify, 0);
  wf.link(saveVideo, ifAuto, 0);
  fc.fail('Save Video', saveVideo, 1, 'VIDEO_GENERATING');
  wf.link(ifNotify, notify, 0);
  wf.link(ifAuto, triggerPublish, 0);
  return wf;
}

const BLOTATO = (p) => `$('Plan Publish').first().json.adapter.baseUrl + '${p}'`;

function buildPublish() {
  const wf = new Workflow('05 - Instagram Publishing');
  const hook = wf.webhook('Webhook: Publish Reel', { path: 'reels/publish', auth: 'internal', respond: 'onReceived' });
  const validate = wf.code('Validate Request', `
const body = $input.first().json.body || {};
const ok = typeof body.recordId === 'string' && /^rec[A-Za-z0-9]{6,30}$/.test(body.recordId);
return [{ json: { ok, recordId: ok ? body.recordId : null } }];`);
  const ifValid = wf.ifNode('IF Request Valid', '$json.ok');
  const stopInvalid = wf.noop('Stop: Invalid Request');
  const get = wf.http('Get Record', { url: atRecord('$json.recordId'), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput' });
  const stopRead = wf.noop('Stop: Record Not Readable');
  const guard = wf.code('Entry Guard', `
const record = recordFromAirtable($input.first().json);
const d = decidePublishEntry({ record, cfg: cfgFromEnv($env), now: Date.now() });
return [{ json: { proceed: d.action !== 'skip', reason: d.reason, recordId: record.id } }];`);
  const ifGuard = wf.ifNode('IF Guard Passed', '$json.proceed');
  const stopSkip = wf.noop('Stop: Skipped');
  const claim = wf.http('Claim Record', {
    method: 'PATCH', url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput',
    json: '{ fields: { LockedBy: String($execution.id), LockedAt: new Date().toISOString() } }',
  });
  const stopClaim = wf.noop('Stop: Claim Failed');
  const settle = wf.wait('Settle Claim', 2);
  const verifyClaim = wf.http('Verify Claim', { url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput' });
  const check = wf.code('Check Claim', `
const record = recordFromAirtable($input.first().json);
const held = lockHeld(record, String($execution.id));
const d = decidePublishEntry({ record: Object.assign({}, record, { lockedBy: '', lockedAt: null }), cfg: cfgFromEnv($env), now: Date.now() });
return [{ json: { held: held && d.action !== 'skip', reason: d.reason } }];`);
  const ifHeld = wf.ifNode('IF Claim Held', '$json.held');
  const stopLost = wf.noop('Stop: Lost Claim');

  const plan = wf.code('Plan Publish', `
const record = recordFromAirtable($('Verify Claim').first().json);
const d = decidePublishEntry({ record: Object.assign({}, record, { lockedBy: '', lockedAt: null }), cfg: cfgFromEnv($env), now: Date.now() });
const stop = (error, message, failedFrom) => [{ json: { ok: false, route: 'fail', recordId: record.id, error, message, failedFrom } }];
if (d.action === 'unknown') return stop(d.reason, d.message, d.failedFrom);
if (d.action === 'invalid') return stop(d.reason, d.errors.join('; '), d.failedFrom);
if (d.action === 'skip') return stop('ENTRY_REJECTED', d.reason, record.status);
const adapter = resolvePublishAdapter($env);
if (!adapter.ok) return stop(adapter.error, adapter.message, record.status);
return [{ json: {
  ok: true, route: d.action, recordId: record.id, status: record.status, adapter,
  mediaUrl: record.blotatoMediaUrl || '', heygenVideoId: record.heygenVideoId || '', videoUrl: record.videoUrl || '',
  postSubmissionId: record.postSubmissionId || '', pollAttempts: record.publishPollAttempts,
} }];`);
  const ifPlanOk = wf.ifNode('IF Plan OK', '$json.ok');
  const ifTrack = wf.ifNode('IF Resume Tracking', "$json.route === 'track'");
  const initResume = wf.code('Init Poll (Resume)', `
const p = $input.first().json;
return [{ json: { recordId: p.recordId, postSubmissionId: p.postSubmissionId, attempt: p.pollAttempts } }];`);

  // Stage 1: stage media with Blotato (safe to repeat; an orphaned upload is harmless)
  const ifStaged = wf.ifNode('IF Media Staged', '!!$json.mediaUrl');
  const ifRefresh = wf.ifNode('IF Can Refresh URL', '!!$json.heygenVideoId');
  const refresh = wf.http('Refresh Video URL', {
    url: "($env.HEYGEN_BASE_URL || 'https://api.heygen.com') + '/v3/videos/' + encodeURIComponent($json.heygenVideoId)", auth: 'heygen', retry: [2, 2000], onError: 'continueRegularOutput',
  });
  const pick = wf.code('Pick Video URL', `
const plan = $('Plan Publish').first().json;
return [{ json: pickVideoUrl($input.first().json, { videoUrl: plan.videoUrl }) }];`);
  const ifUrl = wf.ifNode('IF Video URL OK', '$json.ok');
  const stage = wf.http('Stage Media', {
    method: 'POST', url: BLOTATO('/v2/media'), auth: 'blotato', json: '{ url: $json.videoUrl }', timeout: 120000, retry: [3, 2000], onError: 'continueErrorOutput',
  });
  const checkMedia = wf.code('Check Media', `
return [{ json: parseStagedMedia($input.first().json, cfgFromEnv($env)) }];`);
  const ifMedia = wf.ifNode('IF Media OK', '$json.ok');
  const mediaFields = wf.code('Build Media Fields', `
return [{ json: { fields: publishMediaFields($input.first().json.mediaUrl, new Date().toISOString()) } }];`);
  const saveMedia = wf.http('Save Media', {
    method: 'PATCH', url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', json: '{ fields: $json.fields }', retry: [3, 2000], onError: 'continueErrorOutput',
  });

  // Stage 2: create the post exactly once. No n8n retry on Create Post: the API has no idempotency key.
  const buildPost = wf.code('Build Post', `
const j = $input.first().json;
const plan = $('Plan Publish').first().json;
const record = recordFromAirtable($('Verify Claim').first().json);
const mediaUrl = j.fields ? recordFromAirtable(j).blotatoMediaUrl : j.mediaUrl;
const r = buildBlotatoPost({ accountId: plan.adapter.accountId, mediaUrl, caption: record.caption, hashtags: record.hashtags }, cfgFromEnv($env));
if (!r.ok) return [{ json: { ok: false, error: 'POST_REQUEST_INVALID', message: r.errors.join('; ') } }];
return [{ json: { ok: true, body: r.body } }];`);
  const ifBuilt = wf.ifNode('IF Post Built', '$json.ok');
  const intentFields = wf.code('Build Intent Fields', `
const plan = $('Plan Publish').first().json;
return [{ json: { fields: publishIntentFields(plan.adapter.adapter, new Date().toISOString()) } }];`);
  const intent = wf.http('Write Intent', {
    method: 'PATCH', url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', json: '{ fields: $json.fields }', retry: [3, 2000], onError: 'continueErrorOutput',
  });
  const initCreate = wf.code('Init Create', `
return [{ json: { attempt: 0 } }];`);
  const createLoop = wf.noop('Create Loop Entry');
  const create = wf.http('Create Post', {
    method: 'POST', url: BLOTATO('/v2/posts'), auth: 'blotato', json: "$('Build Post').first().json.body", timeout: 60000, onError: 'continueErrorOutput',
  });
  const classify = wf.code('Classify Create', `
const state = $('Create Loop Entry').first().json;
return [{ json: classifyPublishCreate($input.first().json, state, cfgFromEnv($env)) }];`);
  const ifCreated = wf.ifNode('IF Post Created', "$json.kind === 'created'");
  const ifRetry = wf.ifNode('IF Create Retry', "$json.kind === 'retry'");
  const createWait = wf.wait('Wait Before Create Retry', { expr: '$json.delay' });
  const submittedFields = wf.code('Build Submitted Fields', `
const p = $input.first().json;
return [{ json: { fields: publishSubmittedFields(p.postSubmissionId, new Date().toISOString()) } }];`);
  const saveId = wf.http('Save Post ID', {
    method: 'PATCH', url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', json: '{ fields: $json.fields }', retry: [5, 2000], onError: 'continueErrorOutput',
  });
  const initNew = wf.code('Init Poll (New)', `
return [{ json: { recordId: $('Entry Guard').first().json.recordId, postSubmissionId: $('Classify Create').first().json.postSubmissionId, attempt: 0 } }];`);

  // Stage 3: track the submission until Blotato reports a terminal status
  const loop = wf.noop('Poll Loop Entry');
  const poll = wf.http('Poll Post Status', {
    url: BLOTATO("/v2/posts/' + encodeURIComponent($json.postSubmissionId) + '"), auth: 'blotato', timeout: 30000, retry: [3, 3000], onError: 'continueRegularOutput',
  });
  const interpret = wf.code('Interpret Status', `
const state = $('Poll Loop Entry').first().json;
return [{ json: interpretPublishPoll($input.first().json, state, cfgFromEnv($env)) }];`);
  const ifPending = wf.ifNode('IF Still Pending', "$json.state === 'pending'");
  const next = wf.code('Next Poll', `
const s = $('Poll Loop Entry').first().json;
const r = $input.first().json;
return [{ json: { recordId: s.recordId, postSubmissionId: s.postSubmissionId, attempt: r.attempt, status: r.status, delay: publishPollDelaySeconds(r.attempt, cfgFromEnv($env)) } }];`);
  const heartbeat = wf.http('Heartbeat', {
    method: 'PATCH', url: atRecord('$json.recordId'), auth: 'airtable', retry: [2, 2000], onError: 'continueRegularOutput',
    json: '{ fields: { LockedAt: new Date().toISOString(), PublishPollAttempts: $json.attempt, PublishStatus: String($json.status) } }',
  });
  const pause = wf.wait('Wait Before Next Poll', { expr: '$json.delay' });
  const ifDone = wf.ifNode('IF Published', "$json.state === 'published'");
  const doneFields = wf.code('Build Published Fields', `
return [{ json: { fields: publishCompleteFields($input.first().json, new Date().toISOString()) } }];`);
  const savePublished = wf.http('Save Published', {
    method: 'PATCH', url: atRecord("$('Entry Guard').first().json.recordId"), auth: 'airtable', json: '{ fields: $json.fields }', retry: [3, 2000], onError: 'continueErrorOutput',
  });
  const ifNotify = wf.ifNode('IF Notify Published', '!!$env.NOTIFY_WEBHOOK_URL');
  const notify = wf.http('Notify Published', {
    method: 'POST', url: '$env.NOTIFY_WEBHOOK_URL', onError: 'continueRegularOutput', timeout: 10000,
    json: "{ text: 'Reel published: record ' + $json.id + ' ' + ($json.fields.PublishedURL || '') }",
  });

  const fc = failChain(wf, {
    stage: 'publish', recordIdExpr: "$('Entry Guard').first().json.recordId",
    existingLogExpr: "recordFromAirtable($('Verify Claim').first().json).errorLog",
  });
  const planStatus = { expr: "$('Plan Publish').first().json.status" };
  const notCreated = 'toAirtableFields({ publishIntentAt: null, publishStatus: \'not_created\' })';

  wf.link(hook, validate);
  wf.link(validate, ifValid);
  wf.link(ifValid, get, 0);
  wf.link(ifValid, stopInvalid, 1);
  wf.link(get, guard, 0);
  wf.link(get, stopRead, 1);
  wf.link(guard, ifGuard);
  wf.link(ifGuard, claim, 0);
  wf.link(ifGuard, stopSkip, 1);
  wf.link(claim, settle, 0);
  wf.link(claim, stopClaim, 1);
  wf.link(settle, verifyClaim);
  wf.link(verifyClaim, check, 0);
  wf.link(verifyClaim, stopClaim, 1);
  wf.link(check, ifHeld);
  wf.link(ifHeld, plan, 0);
  wf.link(ifHeld, stopLost, 1);
  wf.link(plan, ifPlanOk);
  fc.fail('Plan', ifPlanOk, 1, { expr: '$input.first().json.failedFrom' });
  wf.link(ifPlanOk, ifTrack, 0);
  wf.link(ifTrack, initResume, 0);
  wf.link(ifTrack, ifStaged, 1);
  wf.link(initResume, loop);

  wf.link(ifStaged, buildPost, 0);
  wf.link(ifStaged, ifRefresh, 1);
  wf.link(ifRefresh, refresh, 0);
  wf.link(ifRefresh, pick, 1);
  wf.link(refresh, pick);
  wf.link(pick, ifUrl);
  wf.link(ifUrl, stage, 0);
  fc.fail('Video URL', ifUrl, 1, planStatus);
  wf.link(stage, checkMedia, 0);
  fc.fail('Stage Media', stage, 1, planStatus);
  wf.link(checkMedia, ifMedia);
  wf.link(ifMedia, mediaFields, 0);
  fc.fail('Media Invalid', ifMedia, 1, planStatus);
  wf.link(mediaFields, saveMedia);
  wf.link(saveMedia, buildPost, 0);
  fc.fail('Save Media', saveMedia, 1, planStatus);

  wf.link(buildPost, ifBuilt);
  wf.link(ifBuilt, intentFields, 0);
  fc.fail('Build Post', ifBuilt, 1, 'READY_TO_PUBLISH');
  wf.link(intentFields, intent);
  wf.link(intent, initCreate, 0);
  fc.fail('Write Intent', intent, 1, 'READY_TO_PUBLISH', null, { fieldsExpr: notCreated });
  wf.link(initCreate, createLoop);
  wf.link(createLoop, create);
  wf.link(create, classify, 0);
  wf.link(create, classify, 1);
  wf.link(classify, ifCreated);
  wf.link(ifCreated, submittedFields, 0);
  wf.link(ifCreated, ifRetry, 1);
  wf.link(ifRetry, createWait, 0);
  wf.link(createWait, createLoop);
  fc.fail('Create Post', ifRetry, 1, { expr: "$input.first().json.kind === 'unknown' ? 'PUBLISHING' : 'READY_TO_PUBLISH'" }, null, {
    fieldsExpr: "($input.first().json.kind === 'unknown' ? toAirtableFields({ publishStatus: 'unknown' }) : " + notCreated + ')',
  });
  wf.link(submittedFields, saveId);
  wf.link(saveId, initNew, 0);
  // The post exists but its id could not be stored: keep the id in the ErrorLog so an operator can recover it.
  fc.fail('Save Post ID', saveId, 1, 'PUBLISHING', null, { failureExpr: "{ postSubmissionId: $('Classify Create').first().json.postSubmissionId }" });
  wf.link(initNew, loop);

  wf.link(loop, poll);
  wf.link(poll, interpret);
  wf.link(interpret, ifPending);
  wf.link(ifPending, next, 0);
  wf.link(ifPending, ifDone, 1);
  wf.link(next, heartbeat);
  wf.link(next, pause);
  wf.link(pause, loop);
  wf.link(ifDone, doneFields, 0);
  fc.fail('Publish', ifDone, 1, { expr: "$input.first().json.terminalJob ? 'READY_TO_PUBLISH' : 'PUBLISHING'" }, null, {
    fieldsExpr: 'publishFailureExtras($input.first().json)',
    failureExpr: "{ postSubmissionId: $('Poll Loop Entry').first().json.postSubmissionId, polls: $input.first().json.attempt }",
  });
  wf.link(doneFields, savePublished);
  wf.link(savePublished, ifNotify, 0);
  fc.fail('Save Published', savePublished, 1, 'PUBLISHING', null, { failureExpr: "{ postSubmissionId: $('Poll Loop Entry').first().json.postSubmissionId }" });
  wf.link(ifNotify, notify, 0);
  return wf;
}

// An uploaded, already-rendered video skips extraction and HeyGen: it is validated, stored and waits in AWAITING_APPROVAL.
function buildUpload() {
  const wf = new Workflow('06 - Video Upload Intake');
  const hook = wf.webhook('Webhook: Upload Intake', { path: 'reels/upload', auth: 'internal', respond: 'responseNode' });
  const validate = wf.code('Validate Upload', `
const body = $input.first().json.body || {};
const r = buildUploadRecord(body, cfgFromEnv($env), new Date().toISOString());
if (!r.ok) return [{ json: { ok: false, error: 'INVALID_UPLOAD', errors: r.errors } }];
return [{ json: { ok: true, key: r.key, formula: keyFormula(r.key), fields: r.fields } }];`);
  const ifValid = wf.ifNode('IF Upload Valid', '$json.ok');
  const r400 = wf.respond('Respond 400', 400, '{ ok: false, error: $json.error, errors: $json.errors || [] }');
  const find = wf.http('Find Existing', {
    url: AT_BASE, auth: 'airtable', query: [['filterByFormula', '={{ $json.formula }}'], ['maxRecords', '1']], retry: [3, 2000], onError: 'continueErrorOutput',
  });
  const r503 = wf.respond('Respond 503', 503, "{ ok: false, error: 'STORE_UNAVAILABLE' }");
  const dedup = wf.code('Dedup Decision', `
const recs = $input.first().json.records || [];
const v = $('Validate Upload').first().json;
if (recs.length) {
  const r = recordFromAirtable(recs[0]);
  return [{ json: { duplicate: true, recordId: r.id, status: r.status, key: v.key } }];
}
return [{ json: { duplicate: false, key: v.key } }];`);
  const ifDup = wf.ifNode('IF Duplicate', '$json.duplicate');
  const rDup = wf.respond('Respond Duplicate', 200, '{ ok: true, duplicate: true, recordId: $json.recordId, status: $json.status, key: $json.key }');
  const build = wf.code('Build New Record', `
return [{ json: { fields: $('Validate Upload').first().json.fields } }];`);
  const create = wf.http('Create Record', {
    method: 'POST', url: AT_BASE, auth: 'airtable', json: '{ fields: $json.fields }', retry: [3, 2000], onError: 'continueErrorOutput',
  });
  const r502 = wf.respond('Respond 502', 502, "{ ok: false, error: 'RECORD_CREATE_FAILED' }");
  const verify = wf.http('Verify Unique', {
    url: AT_BASE, auth: 'airtable', retry: [3, 2000], onError: 'continueErrorOutput',
    query: [['filterByFormula', "={{ $('Validate Upload').first().json.formula }}"], ['sort[0][field]', 'CreatedTime'], ['sort[0][direction]', 'asc']],
  });
  const r503v = wf.respond('Respond 503 (Verify)', 503, "{ ok: false, error: 'STORE_UNAVAILABLE' }");
  const unique = wf.code('Unique Decision', `
const recs = $input.first().json.records || [];
const mine = $('Create Record').first().json.id;
const winner = recs.length ? recs[0].id : mine;
return [{ json: { isWinner: winner === mine, recordId: mine, winnerId: winner, key: $('Validate Upload').first().json.key } }];`);
  const ifWinner = wf.ifNode('IF Is Winner', '$json.isWinner');
  const del = wf.http('Delete Duplicate Record', { method: 'DELETE', url: atRecord("$('Unique Decision').first().json.recordId"), auth: 'airtable', retry: [3, 2000], onError: 'continueRegularOutput' });
  const rRace = wf.respond('Respond Duplicate (Race)', 200, "{ ok: true, duplicate: true, recordId: $('Unique Decision').first().json.winnerId, key: $('Unique Decision').first().json.key }");
  const rOk = wf.respond('Respond Created', 201, "{ ok: true, duplicate: false, recordId: $json.recordId, key: $json.key, status: 'AWAITING_APPROVAL' }");
  const ifNotify = wf.ifNode('IF Notify Ready', '!!$env.NOTIFY_WEBHOOK_URL');
  const notify = wf.http('Notify Ready', {
    method: 'POST', url: '$env.NOTIFY_WEBHOOK_URL', onError: 'continueRegularOutput', timeout: 10000,
    json: "{ text: 'Uploaded video ready for approval: record ' + $('Unique Decision').first().json.recordId }",
  });
  wf.link(hook, validate);
  wf.link(validate, ifValid);
  wf.link(ifValid, find, 0);
  wf.link(ifValid, r400, 1);
  wf.link(find, dedup, 0);
  wf.link(find, r503, 1);
  wf.link(dedup, ifDup);
  wf.link(ifDup, rDup, 0);
  wf.link(ifDup, build, 1);
  wf.link(build, create);
  wf.link(create, verify, 0);
  wf.link(create, r502, 1);
  wf.link(verify, unique, 0);
  wf.link(verify, r503v, 1);
  wf.link(unique, ifWinner);
  wf.link(ifWinner, rOk, 0);
  wf.link(ifWinner, del, 1);
  wf.link(del, rRace);
  wf.link(rOk, ifNotify);
  wf.link(ifNotify, notify, 0);
  return wf;
}

// Read-only probes for the dashboard: real provider calls through n8n's credentials, so the browser never sees a key.
function buildStatus() {
  const wf = new Workflow('07 - Integration Status');
  const hook = wf.webhook('Webhook: Integration Status', { path: 'reels/status', auth: 'internal', respond: 'responseNode' });
  const conf = wf.code('Check Configuration', `
const adapter = resolvePublishAdapter($env);
const cfg = cfgFromEnv($env);
const missing = {
  n8n: $env.N8N_WEBHOOK_BASE ? [] : ['N8N_WEBHOOK_BASE'],
  airtable: $env.AIRTABLE_BASE_ID ? [] : ['AIRTABLE_BASE_ID'],
  blotato: adapter.ok ? [] : [adapter.message],
};
const settings = {
  publishAdapter: adapter.adapter, autoPublish: cfg.autoPublish, minVideoSeconds: cfg.minVideoSeconds, maxVideoSeconds: cfg.maxVideoSeconds,
  maxUploadMb: Math.round(cfg.maxUploadBytes / 1048576), notifyConfigured: !!$env.NOTIFY_WEBHOOK_URL, defaultAvatarConfigured: !!$env.HEYGEN_AVATAR_ID,
  defaultVoiceConfigured: !!$env.HEYGEN_VOICE_ID, openaiModel: $env.OPENAI_MODEL || 'gpt-4o-mini', approvalRequired: true,
};
return [{ json: { missing, settings, blotatoBase: adapter.ok ? adapter.baseUrl : '', accountId: adapter.ok ? adapter.accountId : '' } }];`);
  const pAirtable = wf.http('Probe Airtable', { url: AT_BASE, auth: 'airtable', query: [['pageSize', '1'], ['fields[]', 'ReelKey']], timeout: 15000, onError: 'continueRegularOutput' });
  const pApify = wf.http('Probe Apify', { url: "($env.APIFY_BASE_URL || 'https://api.apify.com') + '/v2/users/me'", auth: 'apify', timeout: 15000, onError: 'continueRegularOutput' });
  const pOpenai = wf.http('Probe OpenAI', { url: "($env.OPENAI_BASE_URL || 'https://api.openai.com') + '/v1/models'", auth: 'openai', timeout: 15000, onError: 'continueRegularOutput' });
  const pHeygen = wf.http('Probe HeyGen', { url: "($env.HEYGEN_BASE_URL || 'https://api.heygen.com') + '/v3/users/me'", auth: 'heygen', timeout: 15000, onError: 'continueRegularOutput' });
  const pBlotato = wf.http('Probe Blotato', {
    url: "($('Check Configuration').first().json.blotatoBase || 'https://unconfigured.invalid') + '/v2/users/me/accounts'", auth: 'blotato',
    query: [['platform', 'instagram']], timeout: 15000, onError: 'continueRegularOutput',
  });
  const assemble = wf.code('Assemble Status', `
const c = $('Check Configuration').first().json;
const get = (n) => $(n).first().json || {};
const data = (n) => get(n).data || {};
const heygen = summarizeProbe('heygen', [], get('Probe HeyGen'), { account: String(data('Probe HeyGen').username || '') });
const blotatoProbe = get('Probe Blotato');
let blotato = summarizeProbe('blotato', c.missing.blotato, blotatoProbe, {});
if (blotato.status === 'connected') {
  const items = Array.isArray(blotatoProbe.items) ? blotatoProbe.items : [];
  const accounts = items.filter((i) => i && i.platform === 'instagram').map((i) => ({ id: String(i.id), username: String(i.username || ''), fullname: String(i.fullname || '') }));
  blotato.accounts = accounts;
  blotato.accountId = c.accountId;
  blotato.account = accounts.find((a) => a.id === c.accountId) || null;
  if (!blotato.account) blotato = Object.assign(blotato, { status: 'error', code: 'ACCOUNT_NOT_FOUND', message: 'The configured account id (BLOTATO_ACCOUNT_ID / POSTIZ_INTEGRATION_ID) is not one of the connected Instagram accounts' });
}
blotato.adapter = c.settings.publishAdapter;
const integrations = {
  n8n: { service: 'n8n', status: c.missing.n8n.length ? 'unconfigured' : 'connected', configured: !c.missing.n8n.length, missing: c.missing.n8n, message: c.missing.n8n.length ? 'Missing configuration: ' + c.missing.n8n.join(', ') : 'Workflows reachable' },
  airtable: summarizeProbe('airtable', c.missing.airtable, get('Probe Airtable'), {}),
  apify: summarizeProbe('apify', [], get('Probe Apify'), { account: String(data('Probe Apify').username || '') }),
  openai: summarizeProbe('openai', [], get('Probe OpenAI'), { model: c.settings.openaiModel }),
  heygen: $env.HEYGEN_ENABLED === 'false'
    ? { service: 'heygen', status: 'unconfigured', configured: false, missing: ['HEYGEN_ENABLED'], message: 'Disabled: use video upload instead of AI avatars' }
    : heygen,
  blotato: blotato,
};
return [{ json: { ok: true, checkedAt: new Date().toISOString(), integrations, settings: c.settings } }];`);
  const respond = wf.respond('Respond Status', 200, '$json');
  wf.link(hook, conf);
  wf.link(conf, pAirtable);
  wf.link(pAirtable, pApify);
  wf.link(pApify, pOpenai);
  wf.link(pOpenai, pHeygen);
  wf.link(pHeygen, pBlotato);
  wf.link(pBlotato, assemble);
  wf.link(assemble, respond);

  const oHook = wf.webhook('Webhook: Creative Options', { path: 'reels/options', auth: 'internal', respond: 'responseNode' });
  const oAvatars = wf.http('List Avatars', {
    url: "($env.HEYGEN_BASE_URL || 'https://api.heygen.com') + '/v3/avatars/looks'", auth: 'heygen', query: [['limit', '50']], timeout: 20000, onError: 'continueRegularOutput',
  });
  const oPrivate = wf.http('List Private Voices', {
    url: "($env.HEYGEN_BASE_URL || 'https://api.heygen.com') + '/v3/models/audio/voices'", auth: 'heygen', query: [['type', 'private'], ['limit', '100']], timeout: 20000, onError: 'continueRegularOutput',
  });
  const oPublic = wf.http('List Public Voices', {
    url: "($env.HEYGEN_BASE_URL || 'https://api.heygen.com') + '/v3/models/audio/voices'", auth: 'heygen', query: [['type', 'public'], ['limit', '100']], timeout: 20000, onError: 'continueRegularOutput',
  });
  const oAssemble = wf.code('Assemble Options', `
const o = normalizeHeyGenOptions($('List Avatars').first().json, $('List Private Voices').first().json, $input.first().json, $env);
return [{ json: Object.assign({ ok: true }, o) }];`);
  const oRespond = wf.respond('Respond Options', 200, '$json');
  wf.link(oHook, oAvatars);
  wf.link(oAvatars, oPrivate);
  wf.link(oPrivate, oPublic);
  wf.link(oPublic, oAssemble);
  wf.link(oAssemble, oRespond);
  return wf;
}

const FILES = {
  '01-reel-intake.json': buildIntake, '02-content-generation.json': buildContent,
  '03-human-approval.json': buildApproval, '04-heygen-video.json': buildVideo, '05-instagram-publishing.json': buildPublish,
  '06-video-upload-intake.json': buildUpload, '07-integration-status.json': buildStatus,
};

function build(write = true) {
  const out = {};
  for (const [file, fn] of Object.entries(FILES)) {
    out[file] = fn().toJSON();
    if (write) fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(out[file], null, 2) + '\n');
  }
  return out;
}

if (require.main === module) {
  const out = build(true);
  for (const [f, w] of Object.entries(out)) console.log(f, w.nodes.length + ' nodes');
}

module.exports = { build, libFor, CHUNKS };
