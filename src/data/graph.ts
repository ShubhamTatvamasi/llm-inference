/* Concept graph derived at build time from the cross-links chapters already make
   (`../kv-cache/`, `href="../roofline/"`). Nothing to maintain by hand: link a chapter
   from another and the edge appears on the map and in both chapters' "Connections". */
import { chapters } from './chapters';

const raw = import.meta.glob('../pages/*.mdx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const slugs = new Set(chapters.map((c) => c.slug));
const order = new Map(chapters.map((c, i) => [c.slug, i]));

export interface Edge { from: string; to: string; weight: number }

export const edges: Edge[] = (() => {
  const out: Edge[] = [];
  for (const [path, src] of Object.entries(raw)) {
    const from = path.split('/').pop()!.replace(/\.mdx$/, '');
    if (!slugs.has(from)) continue;
    const counts = new Map<string, number>();
    for (const m of src.matchAll(/\.\.\/([a-z0-9-]+)\/(?:#[\w-]+)?/g)) {
      const to = m[1];
      if (to !== from && slugs.has(to)) counts.set(to, (counts.get(to) ?? 0) + 1);
    }
    for (const [to, weight] of counts) out.push({ from, to, weight });
  }
  return out;
})();

/** Earlier chapters this one leans on, and later chapters that build on it (either link direction). */
export function connections(slug: string) {
  const me = order.get(slug)!;
  const near = new Map<string, number>();
  for (const e of edges) {
    if (e.from === slug) near.set(e.to, (near.get(e.to) ?? 0) + e.weight);
    if (e.to === slug) near.set(e.from, (near.get(e.from) ?? 0) + e.weight);
  }
  const sorted = [...near.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  return {
    before: sorted.filter((s) => order.get(s)! < me).slice(0, 5).sort((a, b) => order.get(a)! - order.get(b)!),
    after: sorted.filter((s) => order.get(s)! > me).slice(0, 5).sort((a, b) => order.get(a)! - order.get(b)!),
  };
}
