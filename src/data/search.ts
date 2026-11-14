/* The ⌘K search index, served once as /search.json and cached by the browser (it used to be
   inlined into every page). Entries: chapters, tools, every chapter section (h2/h3), every
   diagram, and the glossary. Chapters also read the glossary entries from here for the
   in-prose hover definitions, so there is one shared download for both features. */
import { chapters, parts, chapterIndex } from './chapters';
import { glossary, termId } from './glossary';
import { vizTitles } from './content';
import { u, chapterUrl, vizId } from '../lib/url';

export interface SearchItem {
  /** kind: c chapter · t tool · s section · d diagram · g glossary term */
  k: 'c' | 't' | 's' | 'd' | 'g';
  /** badge shown on the left (chapter number or a symbol) */
  n: string;
  /** title */
  t: string;
  /** extra search keywords, never shown */
  s?: string;
  /** one-line description shown under the title */
  b: string;
  /** right-hand label */
  p: string;
  /** href */
  h: string;
  /** glossary only: slug of the chapter that teaches the term, and whether to offer it on hover */
  c?: string; a?: string[]; x?: 1;
}

type Heading = { depth: number; slug: string; text: string };

export function buildSearchIndex(headings: Record<string, Heading[]>): SearchItem[] {
  const num = (slug: string) => String(chapterIndex(slug) + 1).padStart(2, '0');
  const out: SearchItem[] = [
    ...chapters.map((c): SearchItem => ({
      k: 'c', n: num(c.slug), t: c.title, s: c.short, b: c.blurb,
      p: parts.find((p) => p.id === c.part)!.title, h: chapterUrl(c.slug),
    })),
    { k: 't', n: '◆', t: 'Inference Lab', s: 'lab playground simulator calculator', b: 'Model + GPU + workload → memory, step time, roofline, throughput–latency, cost.', p: 'Tool', h: u('lab/') },
    { k: 't', n: '◆', t: 'Inference Hardware', s: 'hardware gpu gpus accelerator tpu trainium mi300x mi355x h100 h200 b200 b300 gb200 rubin rtx 4090 5090 spec specs compare buy', b: 'Every inference GPU and accelerator: specs, charts, compare, and what to run your model on.', p: 'Tool', h: u('hardware/') },
    { k: 't', n: '◆', t: 'Concept Map', s: 'map graph prerequisites path', b: 'How every chapter connects; get a reading path to any topic.', p: 'Tool', h: u('map/') },
    { k: 't', n: '◆', t: 'Glossary', s: 'glossary terms definitions', b: `${glossary.length} short definitions, each linked to its chapter.`, p: 'Tool', h: u('glossary/') },
  ];
  for (const c of chapters) {
    for (const hd of headings[c.slug] ?? []) {
      if (hd.depth === 2 || hd.depth === 3) out.push({ k: 's', n: '§', t: hd.text, b: `${num(c.slug)} · ${c.title}`, p: 'Section', h: `${chapterUrl(c.slug)}#${hd.slug}` });
    }
    for (const title of vizTitles(c.slug)) out.push({ k: 'd', n: '▶', t: title, s: 'diagram interactive', b: `${num(c.slug)} · ${c.title}`, p: 'Diagram', h: `${chapterUrl(c.slug)}#${vizId(title)}` });
  }
  for (const g of glossary) {
    out.push({ k: 'g', n: 'Aa', t: g.term, s: (g.aliases ?? []).join(' '), b: g.def, p: 'Glossary', h: u(`glossary/#${termId(g.term)}`), c: g.ch, a: g.aliases, ...(g.hover === false ? { x: 1 as const } : {}) });
  }
  return out;
}
