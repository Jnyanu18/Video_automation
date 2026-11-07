'use strict';
// Staging and serving of operator-uploaded videos. Files are stored under random ids; a file only becomes publicly
// reachable (/media/<id>.mp4, needed by Blotato) once it has been submitted for a reel record.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { HttpError } = require('./http.cjs');
const { probeMp4 } = require('./mp4.cjs');

const ID_RE = /^[a-f0-9]{32}$/;

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
  fs.mkdirSync(dir, { recursive: true });
  const file = (id, ext) => path.join(dir, id + ext);

  const readMeta = (id) => {
    if (!ID_RE.test(id)) return null;
    try {
      return JSON.parse(fs.readFileSync(file(id, '.json'), 'utf8'));
    } catch (e) {
      return null;
    }
  };
  const writeMeta = (meta) => fs.writeFileSync(file(meta.id, '.json'), JSON.stringify(meta));

  async function remove(id) {
    if (!ID_RE.test(id)) return;
    await Promise.all(['.mp4', '.json', '.part'].map((e) => fs.promises.rm(file(id, e), { force: true })));
  }

  async function stage(req, rawFileName) {
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
      await pipeline(req, counter, fs.createWriteStream(file(id, '.part'), { flags: 'wx', mode: 0o600 }));
    } catch (e) {
      await remove(id);
      throw e instanceof HttpError ? e : new HttpError(400, 'UPLOAD_INTERRUPTED', 'The upload was interrupted');
    }
    if (size !== declared) {
      await remove(id);
      throw new HttpError(400, 'UPLOAD_INCOMPLETE', 'The upload ended before all bytes arrived');
    }
    await fs.promises.rename(file(id, '.part'), file(id, '.mp4'));
    let probe;
    try {
      probe = await probeMp4(file(id, '.mp4'));
    } catch (e) {
      probe = { ok: false, error: 'MP4_UNREADABLE' };
    }
    if (!probe.ok) {
      await remove(id);
      throw new HttpError(422, 'FILE_NOT_A_VALID_VIDEO', 'The file is not a readable MP4/MOV video (' + probe.error + ')');
    }
    const meta = {
      id, fileName: sanitizeFileName(rawFileName), sizeBytes: size, sha256: hash.digest('hex'), mimeType: probe.mimeType,
      durationSeconds: probe.durationSeconds, createdAt: new Date().toISOString(), submitted: false,
    };
    writeMeta(meta);
    return meta;
  }

  function setSubmitted(id, value) {
    const m = readMeta(id);
    if (!m) return null;
    m.submitted = value;
    writeMeta(m);
    return m;
  }

  async function cleanup(maxAgeMs) {
    let removed = 0;
    for (const name of await fs.promises.readdir(dir)) {
      const m = /^([a-f0-9]{32})\.(json|part)$/.exec(name);
      if (!m) continue;
      const st = await fs.promises.stat(path.join(dir, name)).catch(() => null);
      if (!st || Date.now() - st.mtimeMs < maxAgeMs) continue;
      if (m[2] === 'json') {
        const meta = readMeta(m[1]);
        if (meta && meta.submitted) continue;
      }
      await remove(m[1]);
      removed += 1;
    }
    return removed;
  }

  function serve(id, req, res) {
    const meta = readMeta(id);
    if (!meta || !meta.submitted) return false;
    return streamFile(file(id, '.mp4'), meta.mimeType, req, res);
  }

  // Videos rendered by the faceless-video adapter (adapters/mpt) are dropped into cfg.renderDir under an unguessable id.
  function serveRender(id, req, res) {
    if (!ID_RE.test(id) || !cfg.renderDir) return false;
    return streamFile(path.join(cfg.renderDir, id + '.mp4'), 'video/mp4', req, res);
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

  return { stage, setSubmitted, remove, cleanup, serve, serveRender, meta: readMeta, ID_RE };
}

module.exports = { createUploads, sanitizeFileName };
