// Summarizes a REA inspect_web_page / capture_browser_scenario Evidence JSON.
// Prints keys of normalized_result, and compact lists of scripts, resources, requests.
// Usage: node summarize-capture.cjs <evidence.json> [jsonPathDotted]
const fs = require('fs');
const [src, path] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(src, 'utf8'));
let node = data;
if (path) for (const p of path.split('.')) node = node?.[p];

function shape(v, depth = 0) {
  if (Array.isArray(v)) return `array(${v.length})` + (v.length && depth < 2 ? ` of ${shape(v[0], depth + 1)}` : '');
  if (v && typeof v === 'object') {
    if (depth >= 2) return `{${Object.keys(v).join(',')}}`;
    return '{' + Object.entries(v).map(([k, x]) => `${k}: ${shape(x, depth + 1)}`).join(', ') + '}';
  }
  if (typeof v === 'string') return v.length > 120 ? `string(${v.length})` : JSON.stringify(v);
  return String(v);
}

if (!path) {
  console.log('evidence_id', data.evidence_id);
  for (const [k, v] of Object.entries(data.normalized_result || {})) console.log(`- ${k}: ${shape(v)}`);
} else {
  console.log(typeof node === 'string' ? node : JSON.stringify(node, null, 1).slice(0, 20000));
}
