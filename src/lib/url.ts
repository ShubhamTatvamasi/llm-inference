/** Prefix a site-relative path with the configured base, e.g. u('kv-cache/') → '/llm-inference/kv-cache/'. */
export function u(path = '') {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
  return base + path.replace(/^\//, '');
}

/** URL of a chapter page. */
export const chapterUrl = (slug: string) => u(`${slug}/`);

/** Stable id fragment from free text: 'KV cache growth' → 'kv-cache-growth'. */
export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Anchor id of a `<Viz title="…">` frame, so search and other pages can deep-link to a diagram. */
export const vizId = (title: string) => `viz-${slugify(title)}`;
