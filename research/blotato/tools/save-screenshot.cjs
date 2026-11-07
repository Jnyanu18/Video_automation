// Extracts the PNG artifact from a REA capture_web_screenshot Evidence JSON file.
// Usage: node save-screenshot.cjs <evidence.json> <out.png>
const fs = require('fs');
const crypto = require('crypto');
const [src, out] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(src, 'utf8'));

function findPng(node) {
  if (!node || typeof node !== 'object') return null;
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string' && v.startsWith('iVBORw0KGgo')) return v;
    const r = findPng(v);
    if (r) return r;
  }
  return null;
}

const b64 = findPng(data);
if (!b64) { console.error('No PNG found'); process.exit(1); }
const buf = Buffer.from(b64, 'base64');
fs.writeFileSync(out, buf);
const url = JSON.stringify(data).match(/"url":"(https:[^"]+)"/);
console.log(JSON.stringify({ out, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex'), evidence_id: data.evidence_id, url: url && url[1] }));
