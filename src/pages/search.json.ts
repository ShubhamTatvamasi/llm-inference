// /llm-inference/search.json: the ⌘K index (chapters, sections, diagrams, tools, glossary).
import type { APIRoute } from 'astro';
import { buildSearchIndex } from '../data/search';

type Heading = { depth: number; slug: string; text: string };
const pages = import.meta.glob('./*.mdx', { eager: true }) as Record<string, { getHeadings: () => Heading[] }>;

export const GET: APIRoute = () => {
  const headings: Record<string, Heading[]> = {};
  for (const [path, mod] of Object.entries(pages)) headings[path.replace(/^\.\/|\.mdx$/g, '')] = mod.getHeadings();
  return new Response(JSON.stringify(buildSearchIndex(headings)), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
