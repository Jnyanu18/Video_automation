'use strict';
// Single-operator authentication: scrypt password check, signed HttpOnly session cookie, CSRF token, login throttling.
const crypto = require('crypto');

const COOKIE = 'reels_session';
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(password), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('hex'), key.toString('hex')].join('$');
}

function verifyHash(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltHex, keyHex] = parts;
  try {
    const expected = Buffer.from(keyHex, 'hex');
    const actual = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch (e) {
    return false;
  }
}

const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();

function createAuth(cfg) {
  const revoked = new Map();
  const attempts = new Map();
  const b64 = (buf) => Buffer.from(buf).toString('base64url');
  const sign = (data) => crypto.createHmac('sha256', cfg.sessionSecret).update(data).digest('base64url');

  function checkPassword(password) {
    if (typeof password !== 'string' || !password || password.length > 200) return false;
    if (cfg.passwordHash) return verifyHash(password, cfg.passwordHash);
    return !!cfg.passwordPlain && crypto.timingSafeEqual(digest(password), digest(cfg.passwordPlain));
  }

  function throttle(ip, now) {
    const a = attempts.get(ip);
    if (a && a.until > now) return Math.ceil((a.until - now) / 1000);
    return 0;
  }

  function failed(ip, now) {
    const a = attempts.get(ip) || { count: 0, until: 0, first: now };
    if (now - a.first > 15 * 60000) { a.count = 0; a.first = now; }
    a.count += 1;
    if (a.count >= 5) a.until = now + Math.min(15 * 60000, 30000 * Math.pow(2, a.count - 5));
    attempts.set(ip, a);
  }

  function issue(name, now) {
    const sid = crypto.randomBytes(12).toString('hex');
    const exp = now + cfg.sessionHours * 3600000;
    const payload = { sid, name, exp, csrf: crypto.randomBytes(24).toString('base64url') };
    const body = b64(JSON.stringify(payload));
    return { token: body + '.' + sign(body), session: payload };
  }

  function read(token, now) {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const good = sign(body);
    if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
    try {
      const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (!p || typeof p.exp !== 'number' || p.exp <= now || revoked.has(p.sid)) return null;
      return p;
    } catch (e) {
      return null;
    }
  }

  function revoke(session) {
    if (!session) return;
    revoked.set(session.sid, session.exp);
    for (const [k, exp] of revoked) if (exp < Date.now()) revoked.delete(k);
  }

  function cookie(token, maxAgeSec) {
    return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${cfg.cookieSecure ? '; Secure' : ''}`;
  }

  return { COOKIE, checkPassword, throttle, failed, clearFailures: (ip) => attempts.delete(ip), issue, read, revoke, cookie };
}

module.exports = { createAuth, hashPassword, verifyHash };
