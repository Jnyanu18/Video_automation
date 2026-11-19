'use strict';
// Creates the `Reels` table (every field in docs/airtable-schema.md) in your Airtable base through the Airtable API.
//
//   AIRTABLE_SCHEMA_TOKEN=pat... node scripts/create-airtable-table.cjs
//
// The token is only needed for this one run: create a temporary personal access token with scopes schema.bases:read and
// schema.bases:write and access to the base, run this, then delete the token. It is never written to disk.
// The base id is read from AIRTABLE_BASE_ID (environment or .env.local). Use --dry-run to print the definition only.
const { loadEnv } = require('./lib.cjs');

const STATUSES = ['SUBMITTED', 'EXTRACTING', 'CONTENT_GENERATED', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'VIDEO_GENERATING', 'VIDEO_COMPLETED', 'READY_TO_PUBLISH', 'PUBLISHING', 'PUBLISHED', 'FAILED'];
const DATE = { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' };

const text = (...names) => names.map((name) => ({ name, type: 'singleLineText' }));
const long = (...names) => names.map((name) => ({ name, type: 'multilineText' }));
const url = (...names) => names.map((name) => ({ name, type: 'url' }));
const num = (precision, ...names) => names.map((name) => ({ name, type: 'number', options: { precision } }));
const date = (...names) => names.map((name) => ({ name, type: 'dateTime', options: DATE }));
const select = (name, choices) => ({ name, type: 'singleSelect', options: { choices: choices.map((c) => ({ name: c })) } });

// The first field is the table's primary field. Names must match AIRTABLE_FIELD_MAP in lib/core.js exactly.
const FIELDS = [
  ...text('ReelKey'), ...url('ReelURL'), select('Status', STATUSES),
  ...long('SourceCaption', 'SourceTranscript'), select('TranscriptSource', ['apify', 'stt', 'none']),
  ...num(1, 'SourceDuration'), ...text('SourceOwner'), ...url('AudioURL'),
  { name: 'ExtractionDone', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
  ...long('Script', 'Caption', 'Overlay', 'Hashtags'), ...num(0, 'ContentAttempts'),
  ...text('ApprovedBy', 'RejectedReason'), ...date('ApprovedAt'),
  ...text('HeyGenVideoId'), ...num(1, 'VideoDuration'), ...url('VideoURL', 'ThumbnailURL'), ...num(0, 'VideoAttempt', 'PollAttempts'),
  ...text('HeyGenStatus'), ...date('VideoSubmittedAt', 'VideoCompletedAt'), ...text('ApprovedFingerprint'),
  ...long('RegenerationNote'), ...num(0, 'RegenerationCount'), ...text('LastAction', 'LastActionBy'), ...date('LastActionAt'),
  select('PublishAdapter', ['mock', 'blotato', 'meta', 'postiz']), ...text('PostSubmissionId', 'ContainerId', 'PublishedURL'),
  ...url('BlotatoMediaURL'), ...date('PublishIntentAt'), ...text('PublishStatus'), ...num(0, 'PublishPollAttempts'), ...date('PublishedAt'),
  ...num(0, 'RetryCount'), select('FailedFromState', STATUSES), ...long('ErrorLog'), ...text('LockedBy'), ...date('LockedAt'), ...text('SubmittedBy'),
  select('SourceType', ['reel', 'upload']), ...text('Niche', 'BrandVoice'), ...long('BrandVoiceNotes'), ...text('AvatarID', 'VoiceID'),
  ...text('UploadFileName'), ...num(0, 'UploadSizeBytes'), ...text('UploadSha256'),
];
const COMPUTED = [
  { name: 'CreatedTime', type: 'createdTime' },
  { name: 'ModifiedTime', type: 'lastModifiedTime', options: {} },
];

async function create(base, token, fields) {
  const r = await fetch('https://api.airtable.com/v0/meta/bases/' + base + '/tables', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Reels', description: 'Instagram reels pipeline state (managed by the automation)', fields }),
  });
  let body = {};
  try { body = await r.json(); } catch (e) { /* not json */ }
  return { status: r.status, body };
}

async function main() {
  const env = Object.assign({}, loadEnv(), process.env);
  const base = String(env.AIRTABLE_BASE_ID || '').trim();
  const token = String(env.AIRTABLE_SCHEMA_TOKEN || '').trim();
  if (process.argv.includes('--dry-run')) { console.log(JSON.stringify([...FIELDS, ...COMPUTED].map((f) => f.name + ':' + f.type))); return; }
  if (!/^app[A-Za-z0-9]{14}$/.test(base)) { console.error('AIRTABLE_BASE_ID must be the 17-character id that starts with "app" (not the whole URL).'); process.exitCode = 1; return; }
  if (!token) { console.error('Set AIRTABLE_SCHEMA_TOKEN for this run (scopes schema.bases:read + schema.bases:write, access to the base).'); process.exitCode = 1; return; }

  // Airtable refuses computed fields while creating a table, so create the table first and add them afterwards.
  const r = await create(base, token, FIELDS);
  if (r.status !== 200) {
    const e = (r.body && r.body.error) || {};
    console.error('Airtable returned HTTP ' + r.status + ': ' + (e.type || '') + ' ' + (e.message || JSON.stringify(r.body)));
    if (r.status === 403 || r.status === 401) console.error('Check that the token has schema.bases:write and that this base is selected under Access.');
    if (r.status === 422 && /DUPLICATE/i.test(JSON.stringify(r.body))) console.error('A table named "Reels" already exists. Rename or delete it, then rerun.');
    process.exitCode = 1;
    return;
  }
  let count = (r.body.fields || []).length;
  for (const f of COMPUTED) {
    const fr = await fetch('https://api.airtable.com/v0/meta/bases/' + base + '/tables/' + r.body.id + '/fields', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(f),
    });
    if (fr.status === 200) count++;
    else console.warn('Could not add "' + f.name + '" (HTTP ' + fr.status + '): add it by hand as a "' + (f.type === 'createdTime' ? 'Created time' : 'Last modified time') + '" field.');
  }
  console.log('Created table "' + r.body.name + '" (' + r.body.id + ') with ' + count + ' fields.');
  console.log('You can now delete the temporary schema token and the empty "Table 1" if it is still there.');
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
