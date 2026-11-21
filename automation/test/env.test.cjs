'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadEnvFiles, parseEnv } = require('../server/env.cjs');
const { loadConfig } = require('../server/config.cjs');

function tmpEnv(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-test-'));
  const file = path.join(dir, '.env');
  fs.writeFileSync(file, contents, 'utf8');
  return file;
}

test('parseEnv handles comments, quotes, export and empty values', () => {
  const p = parseEnv(['# a comment', 'A=1', 'export B="two words"', "C='x'", 'junk line', 'D=', '  E = 5  '].join('\n'));
  assert.deepStrictEqual(p, { A: '1', B: 'two words', C: 'x', D: '', E: '5' });
});

test('parseEnv keeps characters that matter inside secrets', () => {
  // scrypt hashes and base64 secrets contain $, : and = - none of them may be mangled.
  const hash = 'scrypt$16384$8$1$YWJj=$ZGVm==';
  assert.strictEqual(parseEnv('DASHBOARD_PASSWORD_HASH=' + hash).DASHBOARD_PASSWORD_HASH, hash);
});

test('a later file overrides an earlier one', () => {
  const first = tmpEnv('PORT=1111\nONLY_FIRST=a\n');
  const second = tmpEnv('PORT=2222\n');
  const { env, loaded } = loadEnvFiles({}, [first, second]);
  assert.strictEqual(env.PORT, '2222');
  assert.strictEqual(env.ONLY_FIRST, 'a');
  assert.strictEqual(loaded.length, 2);
});

test('the real environment wins over every file', () => {
  const file = tmpEnv('PORT=1111\n');
  assert.strictEqual(loadEnvFiles({ PORT: '9999' }, [file]).env.PORT, '9999');
});

test('missing files are not an error and are not reported as loaded', () => {
  const { env, loaded } = loadEnvFiles({ KEEP: 'me' }, [path.join(os.tmpdir(), 'definitely-absent-' + Date.now())]);
  assert.deepStrictEqual(loaded, []);
  assert.strictEqual(env.KEEP, 'me');
});

test('without the files, production settings are lost: dev mode and a throwaway session secret', () => {
  // This is the bug the loader fixes: server/.env was read by nothing, so a production
  // start silently became a development one with a new secret on every restart.
  const bare = {};
  const a = loadConfig(bare);
  const b = loadConfig(bare);
  assert.strictEqual(a.isProd, false);
  assert.notStrictEqual(a.sessionSecret, b.sessionSecret);
});

test('with the files, the configured secret is used and production mode holds', () => {
  const file = tmpEnv('NODE_ENV=production\nSESSION_SECRET=' + 'z'.repeat(48) + '\nDASHBOARD_PASSWORD_HASH=x\n');
  const cfg = loadConfig(loadEnvFiles({}, [file]).env);
  assert.strictEqual(cfg.isProd, true);
  assert.strictEqual(cfg.sessionSecret, 'z'.repeat(48));
  assert.deepStrictEqual(cfg.problems, []);
  assert.deepStrictEqual(cfg.warnings, []);
});
