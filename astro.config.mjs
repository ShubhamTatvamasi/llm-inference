// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// The site is served from https://shubhamtatvamasi.com/<BASE>/
// BASE must match the GitHub repository name (GitHub Pages project site).
const BASE = '/llm-inference';

export default defineConfig({
  site: 'https://shubhamtatvamasi.com',
  base: BASE,
  trailingSlash: 'always',
  integrations: [mdx()],
  markdown: {
    processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }),
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark-default' }, defaultColor: 'dark' },
  },
});
