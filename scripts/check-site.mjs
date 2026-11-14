#!/usr/bin/env node
/* Post-build check, run in CI before deploying (npm run check).
   Walks dist/ and fails the build on anything a reader would hit as a dead end:
     - internal links and assets that do not exist
     - #anchors that are not on the target page (chapter cross-links, the search index)
     - duplicate ids on a page (an anchor would land on the wrong one)
     - pages without exactly one <h1>, a <title> or a meta description
   No dependencies: plain Node. */
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const BASE = process.argv[3] ?? '/llm-inference/';
if (!fs.existsSync(dist)) { console.error(`check-site: ${dist} not found. Run "npm run build" first.`); process.exit(2); }

const files = fs.readdirSync(dist, { recursive: true }).map(String).filter((f) => f.endsWith('.html'));
const pages = new Map();
for (const f of files) {
  const html = fs.readFileSync(path.join(dist, f), 'utf8');
  // attributes inside <script>/<style> are code, not markup
  const markup = html.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<style\b[\s\S]*?<\/style>/g, '');
  pages.set(f, { markup, ids: [...markup.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]) });
}

const problems = [];
const report = (file, msg) => problems.push(`${file}: ${msg}`);
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#38;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");

function checkLink(from, href, fromUrl) {
  if (/^(https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(href)) return;
  let target;
  try { target = new URL(decode(href), fromUrl); } catch { return report(from, `unparseable link "${href}"`); }
  if (!target.pathname.startsWith(BASE)) return report(from, `link leaves the site base ${BASE}: "${href}"`);
  const rel = decodeURIComponent(target.pathname.slice(BASE.length));
  const file = rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel;
  if (!fs.existsSync(path.join(dist, file))) return report(from, `broken link "${href}" (no ${file})`);
  const id = decodeURIComponent(target.hash.slice(1));
  if (id && file.endsWith('.html') && !pages.get(file)?.ids.includes(id)) report(from, `broken anchor "${href}" (no id="${id}" on ${file})`);
}

for (const [file, { markup, ids }] of pages) {
  const url = new URL(BASE + file.replace(/index\.html$/, ''), 'http://site');
  const seen = new Set();
  for (const id of ids) { if (seen.has(id)) report(file, `duplicate id="${id}"`); seen.add(id); }
  for (const m of markup.matchAll(/\s(?:href|src)="([^"]*)"/g)) checkLink(file, m[1], url);
  const h1 = (markup.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) report(file, `expected exactly one <h1>, found ${h1}`);
  if (!/<title>[^<]+<\/title>/.test(markup)) report(file, 'missing <title>');
  if (!/<meta name="description" content="[^"]{20,}"/.test(markup)) report(file, 'missing or very short meta description');
}

// every search result must land somewhere real
const searchFile = path.join(dist, 'search.json');
let searchCount = 0;
if (fs.existsSync(searchFile)) {
  const items = JSON.parse(fs.readFileSync(searchFile, 'utf8'));
  searchCount = items.length;
  for (const it of items) checkLink(`search.json ("${it.t}")`, it.h, new URL(BASE, 'http://site'));
} else report('search.json', 'missing: the ⌘K palette has nothing to search');

// every sitemap entry must be a built page
const sitemap = path.join(dist, 'sitemap.xml');
if (fs.existsSync(sitemap)) {
  for (const m of fs.readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) checkLink('sitemap.xml', new URL(m[1]).pathname, new URL(BASE, 'http://site'));
}

if (problems.length) {
  // the same broken target on every page (a nav link, say) is one problem, not forty
  const byMsg = new Map();
  for (const p of problems) { const [file, ...rest] = p.split(': '); const msg = rest.join(': '); byMsg.set(msg, [...(byMsg.get(msg) ?? []), file]); }
  const lines = [...byMsg].map(([msg, where]) => `  ✗ ${msg}\n      in ${[...new Set(where)].slice(0, 3).join(', ')}${new Set(where).size > 3 ? ` and ${new Set(where).size - 3} more` : ''}`);
  console.error(`check-site: ${byMsg.size} problem${byMsg.size > 1 ? 's' : ''}\n${lines.join('\n')}`);
  process.exit(1);
}
console.log(`check-site: ${pages.size} pages, ${searchCount} search entries, all links and anchors resolve.`);
