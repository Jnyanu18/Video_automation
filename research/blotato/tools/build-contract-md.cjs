// Builds network/internal-api-contract.md from exported bundles + public OpenAPI (static, offline).
// Usage: node build-contract-md.cjs <exportDir> <openapi.json> <out.md>
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const [dir, openapiPath, out] = process.argv.slice(2);
const raw = execFileSync(process.execPath, [path.join(__dirname, 'extract-contract.cjs'), dir], { encoding: 'utf8' });
const rows = raw.trim().split('\n').filter(l => !l.startsWith('TOTAL')).map(l => {
  const m = l.match(/^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+(\S+)$/);
  return m && { method: m[1], path: m[2], key: m[3], tags: m[4], file: m[5] };
}).filter(Boolean);
const oa = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
const pub = new Set();
for (const [p, v] of Object.entries(oa.paths)) for (const m of Object.keys(v)) pub.add(`${m.toUpperCase()} ${p.replace(/^\/v2/, '').replace(/\{([^}]+)\}/g, ':$1')}`);
const groupOf = r => r.path.split('/')[1];
let md = `# Internal dashboard API contract (static extraction)

Source: chunk \`${rows[0]?.file}\` served on the logged-out \`/login\` page of https://my.blotato.com.
Extraction: static string parse of exported bundle (no execution, no requests sent). Tool: \`tools/extract-contract.cjs\`.
Client wiring (CONFIRMED in bundle): \`fetch("https://backend.blotato.com" + "/v2" + path, { mode: "cors", credentials: "include" })\` - cookie-session auth for the dashboard.
Public API (DOCUMENTED, https://backend.blotato.com/openapi.json, OpenAPI ${oa.openapi}, "${oa.info.title}" ${oa.info.version}): header \`blotato-api-key\`.

Confidence: entries are CONFIRMED as present in shipped client code. Server reachability, permissions and request/response behavior are UNVERIFIED (no authenticated traffic observed).

Totals: ${rows.length} contract endpoints in bundle; ${rows.filter(r => pub.has(`${r.method} ${r.path}`)).length} also in public OpenAPI; ${rows.filter(r => !pub.has(`${r.method} ${r.path}`)).length} internal-only. Public OpenAPI has ${pub.size} operations.

| Method | Path (prefix /v2) | Contract key | Tags | Public OpenAPI? |
|---|---|---|---|---|
`;
let last = '';
for (const r of rows) {
  const g = groupOf(r);
  if (g !== last) last = g;
  md += `| ${r.method} | \`${r.path}\` | \`${r.key}\` | ${r.tags} | ${pub.has(`${r.method} ${r.path}`) ? 'yes' : '**internal-only**'} |\n`;
}
const missing = [...pub].filter(k => !rows.some(r => `${r.method} ${r.path}` === k));
md += `\n## Public OpenAPI operations not found in the login-shell contract\n\n${missing.length ? missing.map(m => `- \`${m}\``).join('\n') : '- none'}\n`;
fs.writeFileSync(out, md);
console.log(JSON.stringify({ rows: rows.length, public: pub.size, missing: missing.length }));
