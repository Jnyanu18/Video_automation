'use strict';
// Loads env files for a local `npm run server`. Nothing here is required in Docker:
// there the values arrive as real environment variables (compose `env_file:` / `environment:`)
// and these files are excluded from the image by .dockerignore.
//
// Precedence, lowest first:
//   automation/.env   -> the production file compose also reads
//   server/.env       -> dashboard-specific overrides
//   the real environment -> always wins, so `PORT=9000 npm run server` still works
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = [path.join(ROOT, '.env'), path.join(__dirname, '.env')];

function parseEnv(text) {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    // Strip one layer of matching quotes; leave the inside untouched.
    if (v.length >= 2 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

// Returns the merged env plus the list of files that actually contributed, for logging.
function loadEnvFiles(realEnv, files) {
  const merged = {};
  const loaded = [];
  for (const file of files || FILES) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (e) {
      continue; // absent is the normal case
    }
    Object.assign(merged, parseEnv(text));
    loaded.push(path.relative(ROOT, file).split(path.sep).join('/'));
  }
  // The real environment wins over every file.
  return { env: Object.assign(merged, realEnv || {}), loaded };
}

module.exports = { loadEnvFiles, parseEnv, FILES };
