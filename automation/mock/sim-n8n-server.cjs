'use strict';
// Development/test stand-in for n8n: serves the generated workflow JSON files over HTTP (POST /webhook/<path>) using the
// in-process simulator in test/n8n-sim.cjs, wired to the mock provider services. It is NOT n8n and performs no real calls.
const fs = require('fs');
const http = require('http');
const path = require('path');
const { Runner } = require('../test/n8n-sim.cjs');
const { TOKENS } = require('./mock-server.cjs');

const N8N_DIR = path.join(__dirname, '..', 'n8n');
const FILES = [
  '01-reel-intake.json', '02-content-generation.json', '03-human-approval.json', '04-heygen-video.json',
  '05-instagram-publishing.json', '06-video-upload-intake.json', '07-integration-status.json',
];

function createSimN8n(opts) {
  const tokens = Object.assign({ intake: 'dev-intake-token', internal: 'dev-internal-token', approval: 'dev-approval-token' }, opts.tokens || {});
  const mockUrl = opts.mockUrl;
  const env = Object.assign({
    N8N_WEBHOOK_BASE: 'http://n8n.sim', AIRTABLE_BASE_URL: mockUrl, AIRTABLE_BASE_ID: 'appSIM', AIRTABLE_TABLE: 'Reels',
    APIFY_BASE_URL: mockUrl, OPENAI_BASE_URL: mockUrl, HEYGEN_BASE_URL: mockUrl,
    HEYGEN_AVATAR_ID: 'avatar_mock_anna', HEYGEN_VOICE_ID: 'voice_mock_en_f',
    HEYGEN_POLL_SECONDS: '1', HEYGEN_POLL_CAP_SECONDS: '2', MAX_POLL_ATTEMPTS: '10',
    PUBLISH_ADAPTER: 'mock', MOCK_PUBLISH_BASE_URL: mockUrl, BLOTATO_MEDIA_HOSTS: 'mock-blotato.test', BLOTATO_ACCOUNT_ID: 'acc_mock_1',
    PUBLISH_POLL_SECONDS: '1', PUBLISH_POLL_CAP_SECONDS: '2', MAX_PUBLISH_POLL_ATTEMPTS: '10', POST_CREATE_RETRY_SECONDS: '1',
  }, opts.env || {});
  const credentials = {
    'Reels Intake Webhook Auth': { header: 'X-Reels-Token', value: tokens.intake },
    'Reels Internal Webhook Auth': { header: 'X-Reels-Token', value: tokens.internal },
    'Reels Approval Webhook Auth': { header: 'X-Reels-Token', value: tokens.approval },
    'Apify API Token': { header: 'Authorization', value: TOKENS.apify },
    'Airtable Personal Access Token': { header: 'Authorization', value: TOKENS.airtable },
    'OpenAI API': { header: 'Authorization', value: TOKENS.openai },
    'HeyGen API Key': { header: 'x-api-key', value: TOKENS.heygen },
    'Blotato API Key': { header: 'blotato-api-key', value: TOKENS.blotato },
  };
  const workflows = FILES.map((f) => JSON.parse(fs.readFileSync(path.join(N8N_DIR, f), 'utf8')));
  const runner = new Runner({ workflows, env, credentials, waitScale: opts.waitScale === undefined ? 0.05 : opts.waitScale });

  const server = http.createServer((req, res) => {
    const m = /^\/webhook\/(.+)$/.exec(String(req.url).split('?')[0]);
    const send = (status, body) => {
      const s = JSON.stringify(body);
      res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(s) });
      res.end(s);
    };
    if (req.method !== 'POST' || !m) return send(404, { message: 'webhook not registered' });
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      let body = {};
      try {
        body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
      } catch (e) {
        return send(400, { message: 'bad json' });
      }
      runner.handleWebhook('POST', m[1], { headers: req.headers, body }).then((r) => send(r.status, r.body), () => send(500, { message: 'simulator error' }));
    });
  });

  return {
    runner, tokens, env,
    listen: (port = 0) => new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`))),
    close: () => new Promise((resolve) => { server.closeAllConnections && server.closeAllConnections(); server.close(() => resolve()); }),
  };
}

module.exports = { createSimN8n };
