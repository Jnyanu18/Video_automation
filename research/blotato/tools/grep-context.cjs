// Prints source context around matches in exported scripts (static read, no execution).
// Usage: node grep-context.cjs <exportDir> <regex> [radius=120] [max=40]
const fs = require('fs');
const path = require('path');
const [dir, pattern, radiusArg, maxArg] = process.argv.slice(2);
const radius = Number(radiusArg || 120), max = Number(maxArg || 40);
const re = new RegExp(pattern, 'g');
let shown = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!p.endsWith('.js')) continue;
    const s = fs.readFileSync(p, 'utf8');
    for (const m of s.matchAll(re)) {
      if (shown++ >= max) return;
      const a = Math.max(0, m.index - radius), b = Math.min(s.length, m.index + m[0].length + radius);
      console.log(`--- ${path.relative(dir, p)} @${m.index}\n${s.slice(a, b).replace(/\s+/g, ' ')}`);
    }
  }
})(dir);
