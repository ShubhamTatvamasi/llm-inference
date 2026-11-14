/* Client-side loader for /search.json. One fetch per page, shared by the ⌘K palette and the
   glossary hover definitions; the browser cache makes it free on later pages. */
import type { SearchItem } from '../data/search';
export type { SearchItem };

let pending: Promise<SearchItem[]> | undefined;

export function loadSearchIndex(): Promise<SearchItem[]> {
  const src = document.querySelector<HTMLElement>('[data-search-src]')?.dataset.searchSrc;
  pending ??= fetch(src!).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`search index: HTTP ${r.status}`))));
  pending.catch(() => { pending = undefined; }); // allow a retry after a network failure
  return pending;
}

/** Rank items for a query: every word must match; title hits beat keyword and description hits. */
export function searchItems(items: SearchItem[], query: string): SearchItem[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return items.filter((it) => it.k === 'c' || it.k === 't');
  const kindBoost: Record<SearchItem['k'], number> = { c: 14, t: 14, g: 3, s: 2, d: 1, q: 0 };
  const scored: { it: SearchItem; score: number; i: number }[] = [];
  items.forEach((it, i) => {
    const title = it.t.toLowerCase();
    const keys = `${it.s ?? ''} ${it.p}`.toLowerCase();
    const body = it.b.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (title === t) score += 40;
      else if (title.startsWith(t)) score += 24;
      else if (new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(title)) score += 16;
      else if (title.includes(t)) score += 10;
      else if (keys.includes(t)) score += 6;
      else if (body.includes(t)) score += 2;
      else return;
    }
    scored.push({ it, score: score + kindBoost[it.k], i });
  });
  return scored.sort((a, b) => b.score - a.score || a.i - b.i).slice(0, 60).map((x) => x.it);
}
