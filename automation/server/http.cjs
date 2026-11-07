'use strict';
// Small HTTP helpers shared by the backend modules.

class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.extra = extra || {};
  }
}

function sendJson(res, status, body, headers) {
  if (res.headersSent) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(payload) }, headers || {}));
  res.end(payload);
}

function readJson(req, limit) {
  const max = limit || 65536;
  return new Promise((resolve, reject) => {
    const type = String(req.headers['content-type'] || '');
    if (!type.toLowerCase().startsWith('application/json')) return reject(new HttpError(415, 'JSON_REQUIRED', 'Content-Type must be application/json'));
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > max) {
        reject(new HttpError(413, 'BODY_TOO_LARGE', 'Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!size) return resolve({});
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!v || typeof v !== 'object' || Array.isArray(v)) return reject(new HttpError(400, 'BAD_JSON', 'Body must be a JSON object'));
        return resolve(v);
      } catch (e) {
        return reject(new HttpError(400, 'BAD_JSON', 'Body is not valid JSON'));
      }
    });
    req.on('error', () => reject(new HttpError(400, 'BAD_REQUEST', 'Request aborted')));
  });
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

function clientIp(req, trustProxy) {
  if (trustProxy) {
    const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (xf) return xf;
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

module.exports = { HttpError, sendJson, readJson, parseCookies, clientIp };
