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
  const serverPath = path.resolve(__dirname, '..', 'editor', 'studio', 'presets.py');
  const content = fs.readFileSync(serverPath, 'utf8');
  assert.ok(content.includes('viral_hook_fast_pace'), 'contains viral_hook_fast_pace preset');
  assert.ok(content.includes('educational_talking_head'), 'contains educational_talking_head preset');
  assert.ok(content.includes('cinematic_punch'), 'contains cinematic_punch preset');
  assert.ok(content.includes('karaoke'), 'supports karaoke caption style');
});

test('app.cjs delegates /api/editor/ routes to the editor proxy (port 8793 by default)', () => {
  const root = path.resolve(__dirname, '..', 'server');
  const app = fs.readFileSync(path.join(root, 'app.cjs'), 'utf8');
  const proxy = fs.readFileSync(path.join(root, 'editor-proxy.cjs'), 'utf8');
  const cfg = fs.readFileSync(path.join(root, 'config.cjs'), 'utf8');
  assert.ok(app.includes("p.startsWith('/api/editor/')") && app.includes('editorProxy'), 'app.cjs routes /api/editor/');
  assert.ok(cfg.includes('8793'), 'config defaults to port 8793');
  assert.ok(proxy.includes('EDITOR_SERVICE_UNAVAILABLE'), 'handles an unavailable service gracefully');
});
