'use strict';
// Staging and serving of uploaded videos. Each account has its OWN folder (<uploadDir>/users/<userId>), so one
// account's id can never resolve to another account's file: every call takes the signed-in account id and only
// ever looks inside that account's folder. A file only becomes publicly reachable (/media/<id>.mp4, needed by
// Blotato) once it has been submitted for a reel record; that one unauthenticated route resolves the owner
// through the owners/ pointer written when the file was staged.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { HttpError } = require('./http.cjs');
const { probeMp4 } = require('./mp4.cjs');

const ID_RE = /^[a-f0-9]{32}$/;
const USER_ID_RE = /^[a-z0-9][a-z0-9_-]{2,39}$/;

function requireUser(userId) {
  if (!USER_ID_RE.test(String(userId || ''))) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue');
  return String(userId);
}

function sanitizeFileName(raw) {
  let name = '';
  try {
    name = decodeURIComponent(String(raw || ''));
  } catch (e) {
    name = String(raw || '');
  }
  name = path.basename(name.replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f<>:"|?*]+/g, '').trim().slice(0, 150);
  return name || 'upload.mp4';
}

function createUploads(cfg) {
  const dir = cfg.uploadDir;
  const ownersDir = path.join(dir, 'owners');
  fs.mkdirSync(ownersDir, { recursive: true });

  // One upload folder per account.
  const userDir = (userId) => {
    const u = requireUser(userId);
    const d = path.join(dir, 'users', u);
    fs.mkdirSync(d, { recursive: true });
    return d;
  };
  const file = (userId, id, ext) => path.join(userDir(userId), id + ext);
  // Renders are written by the engine into this account's own workspace (EDITOR_USERS_DIR/<id>/renders).
  const renderDirFor = (userId) => path.join(cfg.editorUsersDir || cfg.renderDir, requireUser(userId), 'renders');

  const ownerFile = (id) => path.join(ownersDir, id + '.txt');
  const setOwner = (id, userId) => fs.writeFileSync(ownerFile(id), requireUser(userId), { mode: 0o600 });
  const ownerOf = (id) => {
    if (!ID_RE.test(id)) return null;
    try {
      const u = fs.readFileSync(ownerFile(id), 'utf8').trim();
      return USER_ID_RE.test(u) ? u : null;
    } catch (e) {
      return null;
    }
  };

  const readMeta = (userId, id) => {
    if (!ID_RE.test(id) || !USER_ID_RE.test(String(userId || ''))) return null;
    try {
      return JSON.parse(fs.readFileSync(file(userId, id, '.json'), 'utf8'));
    } catch (e) {
      return null;
    }
  };
  const writeMeta = (userId, meta) => fs.writeFileSync(file(userId, meta.id, '.json'), JSON.stringify(meta));

  async function remove(userId, id) {
    if (!ID_RE.test(id)) return;
    await Promise.all(['.mp4', '.json', '.part'].map((e) => fs.promises.rm(file(userId, id, e), { force: true })));
    await fs.promises.rm(ownerFile(id), { force: true });
  }

  async function stage(userId, req, rawFileName) {
    requireUser(userId);
    const declared = Number(req.headers['content-length']);
    if (!Number.isFinite(declared) || declared <= 0) throw new HttpError(411, 'LENGTH_REQUIRED', 'Content-Length is required');
    if (declared > cfg.maxUploadBytes) throw new HttpError(413, 'FILE_TOO_LARGE', 'The file is larger than the allowed ' + Math.round(cfg.maxUploadBytes / 1048576) + ' MB');
    const id = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256');
    let size = 0;
    const counter = new Transform({
      transform(chunk, enc, cb) {
        size += chunk.length;
        if (size > cfg.maxUploadBytes) return cb(new HttpError(413, 'FILE_TOO_LARGE', 'The file is larger than the allowed size'));
        hash.update(chunk);
        return cb(null, chunk);
      },
    });
    try {
      await pipeline(req, counter, fs.createWriteStream(file(userId, id, '.part'), { flags: 'wx', mode: 0o600 }));
    } catch (e) {
      await remove(userId, id);
      throw e instanceof HttpError ? e : new HttpError(400, 'UPLOAD_INTERRUPTED', 'The upload was interrupted');
    }
    if (size !== declared) {
      await remove(userId, id);
      throw new HttpError(400, 'UPLOAD_INCOMPLETE', 'The upload ended before all bytes arrived');
    }
    await fs.promises.rename(file(userId, id, '.part'), file(userId, id, '.mp4'));
    let probe;
    try {
      probe = await probeMp4(file(userId, id, '.mp4'));
    } catch (e) {
      probe = { ok: false, error: 'MP4_UNREADABLE' };
    }
    if (!probe.ok) {
      await remove(userId, id);
      throw new HttpError(422, 'FILE_NOT_A_VALID_VIDEO', 'The file is not a readable MP4/MOV video (' + probe.error + ')');
    }
    const meta = {
      id, userId: requireUser(userId), fileName: sanitizeFileName(rawFileName), sizeBytes: size, sha256: hash.digest('hex'),
      mimeType: probe.mimeType, durationSeconds: probe.durationSeconds, createdAt: new Date().toISOString(), submitted: false,
    };
    writeMeta(userId, meta);
    setOwner(id, userId);
    return meta;
  }

  function setSubmitted(userId, id, value) {
    const m = readMeta(userId, id);
    if (!m) return null;
    m.submitted = value;
    writeMeta(userId, m);
    return m;
  }

  async function cleanup(maxAgeMs) {
    let removed = 0;
    const usersRoot = path.join(dir, 'users');
    const accounts = await fs.promises.readdir(usersRoot).catch(() => []);
    for (const account of accounts) {
      if (!USER_ID_RE.test(account)) continue;
      for (const name of await fs.promises.readdir(path.join(usersRoot, account)).catch(() => [])) {
        const m = /^([a-f0-9]{32})\.(json|part)$/.exec(name);
        if (!m) continue;
        const st = await fs.promises.stat(path.join(usersRoot, account, name)).catch(() => null);
        if (!st || Date.now() - st.mtimeMs < maxAgeMs) continue;
        if (m[2] === 'json') {
          const meta = readMeta(account, m[1]);
          if (meta && meta.submitted) continue;
        }
        await remove(account, m[1]);
        removed += 1;
      }
    }
    return removed;
  }

  // Authenticated serving: the account id comes from the session, never from the request.
  function serve(userId, id, req, res) {
    const meta = readMeta(userId, id);
    if (!meta || !meta.submitted) return false;
    return streamFile(file(userId, id, '.mp4'), meta.mimeType, req, res);
  }

  // The one public route (/media/<id>.mp4, downloaded by Blotato): the owner comes from the pointer written at
  // staging time, and the file is still only served once it has been submitted.
  function servePublic(id, req, res) {
    const owner = ownerOf(id);
    if (!owner) return false;
    return serve(owner, id, req, res);
  }

  // Submitting a render records its owner, so the public URL Blotato downloads still resolves after sign-out.
  const claimRender = (userId, id) => {
    if (ID_RE.test(id)) setOwner(id, requireUser(userId));
  };

  function servePublicRender(id, req, res) {
    const owner = ownerOf(id);
    if (!owner) return false;
    return serveRender(owner, id, req, res);
  }

  // A render belongs to the account whose workspace it was rendered into. An id from another account resolves
  // to a path that does not exist there, so it 404s instead of streaming.
  function serveRender(userId, id, req, res) {
    if (!ID_RE.test(id) || !USER_ID_RE.test(String(userId || ''))) return false;
    return streamFile(path.join(renderDirFor(userId), id + '.mp4'), 'video/mp4', req, res);
  }

  // A finished render from the editor, described exactly like a staged upload (real size, hash and duration, never guessed).
  async function describeRender(userId, id) {
    if (!ID_RE.test(id) || !USER_ID_RE.test(String(userId || ''))) return null;
    const p = path.join(renderDirFor(userId), id + '.mp4');
    const st = await fs.promises.stat(p).catch(() => null);
    if (!st || !st.isFile()) return null;
    const probe = await probeMp4(p).catch(() => ({ ok: false }));
    if (!probe.ok) return null;
    const hash = crypto.createHash('sha256');
    await pipeline(fs.createReadStream(p), hash);
    return { id, fileName: 'ai-edited-reel.mp4', sizeBytes: st.size, sha256: hash.digest('hex'), mimeType: probe.mimeType || 'video/mp4', durationSeconds: probe.durationSeconds, submitted: false, isRender: true };
  }

  function streamFile(p, mimeType, req, res) {
    let st;
    try {
      st = fs.statSync(p);
    } catch (e) {
      return false;
    }
    const headers = { 'content-type': mimeType, 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff' };
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
    let start = 0;
    let end = st.size - 1;
    let status = 200;
    if (range && (range[1] || range[2])) {
      if (range[1]) {
        start = Number(range[1]);
        if (range[2]) end = Math.min(end, Number(range[2]));
      } else {
        start = Math.max(0, st.size - Number(range[2]));
      }
      if (start > end || start >= st.size) {
        res.writeHead(416, { 'content-range': 'bytes */' + st.size });
        res.end();
        return true;
      }
      status = 206;
      headers['content-range'] = `bytes ${start}-${end}/${st.size}`;
    }
    headers['content-length'] = end - start + 1;
    res.writeHead(status, headers);
    if (req.method === 'HEAD') {
      res.end();
      return true;
    }
    fs.createReadStream(p, { start, end }).on('error', () => res.destroy()).pipe(res);
    return true;
  }

  return { stage, setSubmitted, remove, cleanup, serve, servePublic, serveRender, servePublicRender, claimRender, describeRender, meta: readMeta,
    ownerOf, userDir, renderDirFor, filePath: (userId, id) => file(userId, id, '.mp4'), ID_RE };
}

module.exports = { createUploads, sanitizeFileName };
