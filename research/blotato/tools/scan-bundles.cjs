// Static string scan over exported web scripts (no execution).
// Usage: node scan-bundles.cjs <exportDir>
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); } })(dir);

const hosts = new Map(), apiPaths = new Map(), routes = new Map(), envs = new Map();
const vendors = {
  'Next.js': /__NEXT_DATA__|next-router|__next_f|next\/dist/,
  React: /react\.production|__SECRET_INTERNALS|useSyncExternalStore/,
  'React Query (TanStack)': /QueryClient|useQuery|tanstack/,
  PostHog: /posthog/i,
  Sentry: /sentry/i,
  Stripe: /stripe/i,
  'Radix UI': /radix/i,
  'Tailwind (cn/twMerge)': /twMerge|tailwind-merge/,
  Zod: /ZodError|zod/,
  Axios: /axios/i,
  Supabase: /supabase/i,
  Firebase: /firebase/i,
  Clerk: /clerk/i,
  'Stytch': /stytch/i,
  'Intercom': /intercom/i,
  'Crisp': /crisp/i,
  'Google Tag/Ads': /googletagmanager|gtag\(|_gcl_/,
  'Meta Pixel': /fbq\(|connect\.facebook\.net/,
  'Rewardful/Affiliates': /rewardful|firstpromoter|tolt/i,
  'tRPC': /trpc/i,
  'GraphQL': /graphql/i,
  'Socket/Realtime': /socket\.io|pusher|ably|WebSocket\(/,
  'Mantine': /mantine/i,
  'Chakra': /chakra/i,
  'MUI': /@mui|MuiButton/,
  'shadcn/cmdk': /cmdk/,
  'Framer Motion': /framer-motion|motion\.div/,
  'date-fns': /date-fns/,
  'dayjs': /dayjs/,
  'FullCalendar': /fullcalendar/i,
  'Uppy/Upload': /uppy|filepond|dropzone/i,
  'Cloudinary': /cloudinary/i,
  'AWS S3': /amazonaws\.com|s3\./,
  'Google Cloud Storage': /storage\.googleapis\.com/,
  'Remotion': /remotion/i,
  'Canva': /canva/i,
};
const vendorHits = {};
const inc = (m, k, f) => { const v = m.get(k) || new Set(); v.add(path.basename(f)); m.set(k, v); };

for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})(\/[^"'`\s)]*)?/gi)) inc(hosts, m[1].toLowerCase(), f);
  for (const m of s.matchAll(/["'`](\/(?:api|v\d|trpc|graphql)[a-zA-Z0-9_\-/{}:$.]*)["'`]/g)) inc(apiPaths, m[1], f);
  for (const m of s.matchAll(/["'`](\/[a-z][a-z0-9\-]*(?:\/[a-z0-9\-[\]:]+)*)["'`]/g)) {
    const r = m[1];
    if (/\.(js|css|png|svg|jpg|ico|json|woff2?)$/.test(r) || r.startsWith('/_next')) continue;
    inc(routes, r, f);
  }
  for (const m of s.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) inc(envs, m[0], f);
  for (const [name, re] of Object.entries(vendors)) if (re.test(s)) (vendorHits[name] ||= []).push(path.basename(f));
}
const dump = (title, m) => { console.log(`\n## ${title} (${m.size})`); [...m.entries()].sort().forEach(([k, v]) => console.log(`${k}  [${[...v].length} file(s)]`)); };
dump('Hosts', hosts); dump('API-like paths', apiPaths); dump('Route-like strings', routes); dump('NEXT_PUBLIC env names', envs);
console.log('\n## Vendor signatures');
for (const [k, v] of Object.entries(vendorHits)) console.log(`${k}: ${v.length} file(s)`);
