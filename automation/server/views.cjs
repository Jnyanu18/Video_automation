'use strict';
// View models for the dashboard. The browser only ever receives these, never raw Airtable records.
const core = require('../lib/core.js');

const GENERATING = ['SUBMITTED', 'EXTRACTING', 'CONTENT_GENERATED', 'APPROVED', 'VIDEO_GENERATING'];
const READY = ['VIDEO_COMPLETED', 'READY_TO_PUBLISH', 'PUBLISHING'];

const safeUrl = (u) => (typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u) ? u : '');

function parseErrorLog(log) {
  const out = [];
  String(log || '').split('\n').forEach((line) => {
    const m = /^\[([^\]]+)\]\s+(\{.*\})\s*$/.exec(line.trim());
    if (!m) return;
    try {
      const e = JSON.parse(m[2]);
      out.push({ at: m[1], source: String(e.source || ''), code: String(e.code || ''), message: String(e.message || ''), retryable: !!e.retryable, httpStatus: Number(e.httpStatus) || 0 });
    } catch (err) {
      /* ignore unreadable log lines */
    }
  });
  return out;
}

const REEL_STEPS = [['intake', 'Submitted'], ['extraction', 'Extraction'], ['content', 'AI content'], ['approval', 'Approval'], ['video', 'Video'], ['publish', 'Publish']];
const UPLOAD_STEPS = [['upload', 'Uploaded'], ['approval', 'Approval'], ['publish', 'Publish']];

function progress(r) {
  const upload = r.sourceType === 'upload';
  const defs = upload ? UPLOAD_STEPS : REEL_STEPS;
  const idxFor = (status) => {
    if (upload) {
      if (status === 'AWAITING_APPROVAL' || status === 'REJECTED') return 1;
      return 2;
    }
    switch (status) {
      case 'SUBMITTED': return 1;
      case 'EXTRACTING': return r.extractionDone ? 2 : 1;
      case 'CONTENT_GENERATED': return 2;
      case 'AWAITING_APPROVAL': case 'REJECTED': return 3;
      case 'APPROVED': case 'VIDEO_GENERATING': return 4;
      default: return 5;
    }
  };
  let current;
  let state;
  if (r.status === 'PUBLISHED') {
    current = defs.length;
    state = 'done';
  } else if (r.status === 'FAILED') {
    current = idxFor(r.failedFromState || 'SUBMITTED');
    state = 'failed';
  } else {
    current = idxFor(r.status);
    state = r.status === 'REJECTED' ? 'rejected' : r.status === 'AWAITING_APPROVAL' || r.status === 'VIDEO_COMPLETED' ? 'waiting' : 'active';
  }
  return defs.map(([key, label], i) => ({ key, label, state: i < current ? 'done' : i === current ? state : 'pending' }));
}

function actionsFor(r, cfg, now) {
  const fingerprint = core.contentFingerprint(r);
  const probe = (action, edit) => {
    const d = core.decideApproval({
      record: r, cfg, now, runId: 'dashboard-dry-run', phase: 'pre',
      req: { action, recordId: r.id, actor: 'dashboard', expectedFingerprint: fingerprint, edit: edit || {}, reason: 'dry run', note: '' },
    });
    return d;
  };
  const result = (d, allowDup, extraOk) => {
    const can = (d.ok && (allowDup || !(d.response && d.response.duplicate))) || (!!extraOk && extraOk.indexOf(d.error) !== -1);
    return can ? { allowed: true } : { allowed: false, reason: d.error || 'NOT_ALLOWED', detail: d.errors || undefined };
  };
  const edit = r.sourceType === 'upload' ? { caption: r.caption } : {};
  const approvedAge = r.modifiedTime ? now - Date.parse(r.modifiedTime) : 0;
  const retry = probe('retry');
  return {
    edit: result(probe('edit', edit), true, ['CONTENT_INVALID']),
    approve: result(probe('approve'), false),
    reject: result(probe('reject'), false),
    regenerate: result(probe('regenerate'), false),
    publish: result(probe('publish'), false),
    retry: result(retry, true),
    resume: r.status === 'APPROVED' && approvedAge > 60000 && !r.lockedBy ? { allowed: true } : { allowed: false, reason: 'NOT_STALLED' },
  };
}

function relativeMedia(url, cfg) {
  if (typeof url !== 'string') return '';
  const mRender = /\/render\/([a-f0-9]{32}\.mp4)$/.exec(url);
  if (mRender) return '/render/' + mRender[1];
  const mMedia = /\/media\/([a-f0-9]{32}\.mp4)$/.exec(url);
  if (mMedia) return '/media/' + mMedia[1];
  const prefix = cfg && cfg.publicBaseUrl ? cfg.publicBaseUrl + '/media/' : null;
  return prefix && url.startsWith(prefix) ? '/media/' + url.slice(prefix.length) : url;
}

function baseOf(r, cfg, now) {
  const errors = parseErrorLog(r.errorLog);
  const lockAgeMs = r.lockedAt ? now - Date.parse(r.lockedAt) : Infinity;
  const upload = r.sourceType === 'upload';
  const created = r.createdTime || null;
  const updated = r.modifiedTime || created;
  return {
    id: r.id, key: r.key, status: r.status, sourceType: r.sourceType, reelUrl: safeUrl(r.reelUrl), niche: r.niche, brandVoice: r.brandVoice,
    title: upload ? r.uploadFileName || r.key : r.key ? String(r.key).replace(/^ig_/, '') : r.id,
    caption: r.caption, createdAt: created, updatedAt: updated, submittedBy: r.submittedBy,
    publishedUrl: safeUrl(r.publishedUrl), publishedAt: r.publishedAt || null,
    error: errors[0] || null, retryCount: r.retryCount, failedFrom: r.failedFromState || null,
    busy: !!(r.lockedBy && lockAgeMs < cfg.core.lockTtlMinutes * 60000),
    stuck: core.isStuck(r, cfg.core, now),
  };
}

function toRow(rec, cfg, now) {
  const r = core.recordFromAirtable(rec);
  const b = baseOf(r, cfg, now);
  return Object.assign(b, { caption: String(b.caption).slice(0, 140), retryable: r.status === 'FAILED' && core.planRetry(r, cfg.core).ok });
}

function toDetail(rec, cfg, now) {
  const r = core.recordFromAirtable(rec);
  const b = baseOf(r, cfg, now);
  const videoUrl = safeUrl(r.videoUrl);
  return Object.assign(b, {
    fingerprint: core.contentFingerprint(r),
    approvedFingerprint: r.approvedFingerprint || null,
    source: { caption: r.sourceCaption, transcript: r.sourceTranscript, transcriptSource: r.transcriptSource || 'none', owner: r.sourceOwner || '', duration: r.sourceDuration || null },
    content: { script: r.script, caption: r.caption, overlay: r.overlay, hashtags: core.splitHashtags(r.hashtags) },
    brandVoiceNotes: r.brandVoiceNotes, avatarId: r.avatarId, voiceId: r.voiceId,
    upload: r.sourceType === 'upload' ? { fileName: r.uploadFileName, sizeBytes: r.uploadSizeBytes || 0 } : null,
    approval: { approvedBy: r.approvedBy || null, approvedAt: r.approvedAt || null, rejectedReason: r.rejectedReason || null, regenerationCount: r.regenerationCount, regenerationNote: r.regenerationNote || null, maxRegenerations: cfg.core.maxRegenerations },
    video: {
      status: r.heygenStatus || null, id: r.heygenVideoId || null, url: videoUrl, previewUrl: videoUrl ? relativeMedia(videoUrl, cfg) : '',
      thumbnailUrl: safeUrl(r.thumbnailUrl), duration: r.videoDuration || null, attempt: r.videoAttempt, pollAttempts: r.pollAttempts,
      submittedAt: r.videoSubmittedAt || null, completedAt: r.videoCompletedAt || null, maxPollAttempts: cfg.core.maxPollAttempts,
    },
    publish: {
      adapter: r.publishAdapter || null, status: r.publishStatus || null, postSubmissionId: r.postSubmissionId || null,
      publishedUrl: safeUrl(r.publishedUrl), publishedAt: r.publishedAt || null, startedAt: r.publishIntentAt || null, pollAttempts: r.publishPollAttempts,
    },
    errors: parseErrorLog(r.errorLog).slice(0, 5),
    lastAction: r.lastAction ? { action: r.lastAction, by: r.lastActionBy || '', at: r.lastActionAt || null } : null,
    progress: progress(r),
    actions: actionsFor(r, cfg.core, now),
  });
}

function summarize(records, cfg, now) {
  const byStatus = {};
  core.STATES.forEach((s) => { byStatus[s] = 0; });
  let stuck = 0;
  records.forEach((rec) => {
    const r = core.recordFromAirtable(rec);
    if (byStatus[r.status] !== undefined) byStatus[r.status] += 1;
    if (core.isStuck(r, cfg.core, now)) stuck += 1;
  });
  const sum = (list) => list.reduce((n, s) => n + (byStatus[s] || 0), 0);
  return {
    totals: {
      submitted: records.length, awaitingApproval: byStatus.AWAITING_APPROVAL, generating: sum(GENERATING), readyToPublish: sum(READY),
      published: byStatus.PUBLISHED, failed: byStatus.FAILED, rejected: byStatus.REJECTED,
    },
    byStatus, stuck,
  };
}

function recentActivity(records, cfg, now, limit) {
  return records
    .map((rec) => toRow(rec, cfg, now))
    .sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0))
    .slice(0, limit || 10)
    .map((r) => ({ id: r.id, title: r.title, sourceType: r.sourceType, status: r.status, at: r.updatedAt, error: r.error ? r.error.message : null }));
}

module.exports = { toRow, toDetail, summarize, recentActivity, parseErrorLog, progress, actionsFor, GENERATING, READY, safeUrl };
