'use strict';
// Pilot accounts. A handful of invited clients, so the user list is a small JSON file next to the uploads,
// not a database: there is no database in this stack and the Node server has no npm dependencies.
// Every write is atomic (temp file in the same directory + rename), so a crash mid-write cannot corrupt it.
// The file holds real scrypt password hashes: it is gitignored and never served.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword, verifyHash } = require('./auth.cjs');

// Account ids are also directory names (uploads, engine workspace): keep them boring and filesystem-safe.
const ID_RE = /^[a-z0-9][a-z0-9_-]{2,39}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;

const normalizeEmail = (e) => String(e || '').trim().toLowerCase();

function newUserId() {
  return 'u' + crypto.randomBytes(8).toString('hex');
}

function createUsers(cfg) {
  const file = cfg.usersFile || path.join(cfg.uploadDir, 'users.json');
  const dir = path.dirname(file);

  function readAll() {
    let raw;
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch (e) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.users) ? parsed.users : [];
      return list.filter((u) => u && ID_RE.test(u.id) && u.email && u.password_hash);
    } catch (e) {
      throw new Error('users file is corrupt: ' + file);
    }
  }

  function writeAll(list) {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = path.join(dir, '.users.' + process.pid + '.' + crypto.randomBytes(4).toString('hex') + '.tmp');
    const fd = fs.openSync(tmp, 'wx', 0o600);
    try {
      fs.writeSync(fd, JSON.stringify({ version: 1, users: list }, null, 2));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, file); // atomic on the same volume: readers see the old file or the new one, never half
  }

  function find(email) {
    const e = normalizeEmail(email);
    return readAll().find((u) => normalizeEmail(u.email) === e) || null;
  }

  function get(id) {
    return readAll().find((u) => u.id === id) || null;
  }

  function create(email, password, name) {
    const e = normalizeEmail(email);
    if (!EMAIL_RE.test(e)) throw new Error('Enter a valid email address');
    if (typeof password !== 'string' || password.length < 10) throw new Error('The password must be at least 10 characters');
    if (password.length > 200) throw new Error('The password is too long');
    const list = readAll();
    if (list.some((u) => normalizeEmail(u.email) === e)) throw new Error('An account with that email already exists: ' + e);
    let id = newUserId();
    while (list.some((u) => u.id === id)) id = newUserId();
    const user = {
      id,
      email: e,
      name: String(name || e.split('@')[0]).slice(0, 40),
      password_hash: hashPassword(password),
      created_at: new Date().toISOString(),
    };
    writeAll(list.concat([user]));
    return user;
  }

  function setPassword(email, password) {
    if (typeof password !== 'string' || password.length < 10) throw new Error('The password must be at least 10 characters');
    const list = readAll();
    const u = list.find((x) => normalizeEmail(x.email) === normalizeEmail(email));
    if (!u) throw new Error('No account with that email: ' + email);
    u.password_hash = hashPassword(password);
    writeAll(list);
    return u;
  }

  // Constant-time-ish: an unknown email still pays for one scrypt, so timing does not reveal who exists.
  const DECOY = hashPassword(crypto.randomBytes(24).toString('hex'));

  function authenticate(email, password) {
    if (typeof password !== 'string' || !password || password.length > 200) return null;
    const u = find(email);
    const ok = verifyHash(password, u ? u.password_hash : DECOY);
    return ok && u ? { id: u.id, email: u.email, name: u.name || u.email.split('@')[0] } : null;
  }

  const list = () => readAll().map((u) => ({ id: u.id, email: u.email, name: u.name, created_at: u.created_at }));

  return { file, create, setPassword, authenticate, find, get, list, count: () => readAll().length };
}

module.exports = { createUsers, newUserId, ID_RE, EMAIL_RE, normalizeEmail };
