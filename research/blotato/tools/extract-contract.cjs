// Extracts `name:{path:"...",method:"..."}` contract entries (ts-rest style) from exported scripts.
// Static read only. Usage: node extract-contract.cjs <exportDir> [--md]
const fs = require('fs');
const path = require('path');
const [dir, flag] = process.argv.slice(2);
const rows = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!p.endsWith('.js')) continue;
    const s = fs.readFileSync(p, 'utf8');
    const M = '(?:"([A-Z]+)"|[\\w$]+\\.([A-Z]+))';
    const re = new RegExp(`([A-Za-z_$][\\w$]*):\\{path:"([^"]+)",method:${M}`, 'g');
    for (const m of s.matchAll(re)) {
      const name = m[1], p2 = m[2], method = m[3] || m[4];
      // Limit look-ahead to this entry (stop at the next contract entry).
      let tail = s.slice(m.index + m[0].length, m.index + 2500);
      const next = tail.search(/[A-Za-z_$][\w$]*:\{path:"/);
      if (next > 0) tail = tail.slice(0, next);
      const summary = (tail.match(/summary:"([^"]{0,160})"/) || [])[1] || '';
      const desc = (tail.match(/description:"([^"]{0,200})"/) || [])[1] || '';
      const tags = (tail.match(/tags:\[([^\]]*)\]/) || [])[1] || '';
      rows.push({ file: path.basename(p), name, method, path: p2, tags: tags.replace(/"/g, ''), summary: summary || desc });
    }
  }
})(dir);
const seen = new Set();
const uniq = rows.filter(r => { const k = `${r.method} ${r.path} ${r.name}`; if (seen.has(k)) return false; seen.add(k); return true; })
  .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
if (flag === '--md') {
  console.log('| Method | Path | Contract key | Tags | Summary/description (from bundle) |\n|---|---|---|---|---|');
  for (const r of uniq) console.log(`| ${r.method} | \`${r.path}\` | \`${r.name}\` | ${r.tags} | ${r.summary.replace(/\|/g, '\\|').replace(/\\n/g, ' ')} |`);
} else {
  for (const r of uniq) console.log(`${r.method.padEnd(6)} ${r.path.padEnd(48)} ${r.name.padEnd(30)} [${r.tags}] ${r.file}`);
  console.log(`TOTAL ${uniq.length}`);
}
