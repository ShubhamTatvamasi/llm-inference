// /llm-inference/sitemap.xml: every chapter plus the tool pages, generated at build time.
// The user-site robots.txt should list it:  Sitemap: https://shubhamtatvamasi.com/llm-inference/sitemap.xml
import type { APIRoute } from 'astro';
import { chapters } from '../data/chapters';

export const GET: APIRoute = ({ site }) => {
  const base = new URL(import.meta.env.BASE_URL.replace(/\/?$/, '/'), site);
  const paths = ['', 'lab/', 'map/', 'glossary/', ...chapters.map((c) => `${c.slug}/`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `  <url><loc>${new URL(p, base).href}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
