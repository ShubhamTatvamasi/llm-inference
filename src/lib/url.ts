/** Prefix a site-relative path with the configured base, e.g. u('kv-cache/') → '/llm-inference/kv-cache/'. */
export function u(path = '') {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
  return base + path.replace(/^\//, '');
}

/** URL of a chapter page. */
export const chapterUrl = (slug: string) => u(`${slug}/`);
