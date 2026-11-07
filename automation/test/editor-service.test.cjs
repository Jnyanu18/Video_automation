'use strict';
// Tests for the AI Video Editor service integration (FastAPI editor server proxy + style presets)
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

test('editor service files are in place', () => {
  const root = path.resolve(__dirname, '..');
  assert.ok(fs.existsSync(path.join(root, 'editor', 'api_server.py')), 'api_server.py exists');
  assert.ok(fs.existsSync(path.join(root, 'editor', 'styles', 'tools.py')), 'styles/tools.py exists');
  assert.ok(fs.existsSync(path.join(root, 'editor', 'agent', 'loop.py')), 'agent/loop.py exists');
  assert.ok(fs.existsSync(path.join(root, 'editor', 'tools', 'edit', 'timeline.py')), 'tools/edit/timeline.py exists');
});

test('preset styles have required fields', () => {
  const serverPath = path.resolve(__dirname, '..', 'editor', 'api_server.py');
  const content = fs.readFileSync(serverPath, 'utf8');
  assert.ok(content.includes('viral_hook_fast_pace'), 'contains viral_hook_fast_pace preset');
  assert.ok(content.includes('educational_talking_head'), 'contains educational_talking_head preset');
  assert.ok(content.includes('cinematic_punch'), 'contains cinematic_punch preset');
  assert.ok(content.includes('karaoke'), 'supports karaoke caption style');
});

test('app.cjs proxies /api/editor/ routes to port 8793', () => {
  const appPath = path.resolve(__dirname, '..', 'server', 'app.cjs');
  const content = fs.readFileSync(appPath, 'utf8');
  assert.ok(content.includes("p.startsWith('/api/editor/')"), 'app.cjs checks /api/editor/');
  assert.ok(content.includes('8793'), 'targets port 8793');
  assert.ok(content.includes('EDITOR_SERVICE_UNAVAILABLE'), 'handles unavailable service gracefully');
});
