/* Facts derived from the raw chapter MDX at build time: diagram titles and reading time.
   Nothing to maintain by hand (same idea as graph.ts). */
import { qId } from '../lib/url';

const raw = import.meta.glob('../pages/*.mdx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const bySlug = new Map(Object.entries(raw).map(([p, src]) => [p.split('/').pop()!.replace(/\.mdx$/, ''), src]));

/** Titles of the `<Viz title="…">` frames in a chapter, in page order. */
export function vizTitles(slug: string): string[] {
  return [...(bySlug.get(slug) ?? '').matchAll(/<Viz\b[^>]*?\btitle="([^"]+)"/g)].map((m) => m[1]);
}

/** Reading time in minutes: prose at 220 wpm plus about 45 s to play with each diagram. */
export function readingMinutes(slug: string): number {
  const src = bySlug.get(slug) ?? '';
  const prose = src
    .replace(/^---[\s\S]*?---/, '')
    .replace(/^import .*$/gm, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const words = prose.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
  return Math.max(1, Math.round(words / 220 + vizTitles(slug).length * 0.75));
}

export interface Question { id: string; slug: string; q: string; level: 'core' | 'mid' | 'senior' }
const decodeAttr = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** The interview questions of one chapter (`<Q q="…" level="…">`), in page order. */
export function questions(slug: string): Question[] {
  return [...(bySlug.get(slug) ?? '').matchAll(/<Q\b([^>]*?)>/g)].flatMap((m) => {
    const q = /\bq="([^"]*)"/.exec(m[1])?.[1];
    if (!q) return [];
    const text = decodeAttr(q);
    const level = (/\blevel="(core|mid|senior)"/.exec(m[1])?.[1] ?? 'core') as Question['level'];
    return [{ id: qId(text), slug, q: text, level }];
  });
}
