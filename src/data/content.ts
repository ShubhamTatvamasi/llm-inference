/* Facts derived from the raw chapter MDX at build time: diagram titles and reading time.
   Nothing to maintain by hand (same idea as graph.ts). */
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
