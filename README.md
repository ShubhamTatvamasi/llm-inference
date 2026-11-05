# Token by Token: LLM inference & serving, visualized

An interactive, visual guide to how large language models are served. It follows a request through tokenization and attention, then the KV cache, GPU kernels, batching, schedulers, parallelism and production routing. Each chapter has live, interactive diagrams.

Live at **https://shubhamtatvamasi.com/llm-inference/**

## Stack

- [Astro](https://astro.build) (static output) + MDX for chapter content
- KaTeX for formulas
- Plain TypeScript + SVG for diagrams, using a small shared toolkit in `src/lib/viz.ts`. There is no UI framework.
- Self-hosted Geist / Geist Mono fonts
- Deployed to GitHub Pages with GitHub Actions

## Develop

```bash
npm install
npm run dev        # http://localhost:4321/llm-inference/
npm run build      # outputs to dist/
npm run preview
```

## Project layout

```
src/
  data/chapters.ts      # navigation, ordering, parts: the single source of truth
  data/hardware.ts      # shared GPU + model specs used by calculators
  lib/viz.ts            # SVG/DOM helpers, player (play/pause/step), controls, colours
  styles/global.css     # design tokens (system / light / dark), prose + diagram styles
  layouts/              # Base (header, ⌘K palette, theme) and Chapter (sidebar, pager)
  components/           # Viz frame, Callout, Interview/Q, Sidebar, home/Lifecycle
  components/viz/       # one .astro file per interactive diagram
  pages/                # index.astro + one <slug>.mdx per chapter
```

### Adding a chapter

1. Register it in `src/data/chapters.ts`.
2. Create `src/pages/<slug>.mdx` with `layout: ../layouts/Chapter.astro`.
3. Build diagrams in `src/components/viz/`. Each one renders a `<div data-viz="name">` and calls `mountAll('name', root => …)` from `src/lib/viz.ts`.

### Colour language

Use the semantic tokens (`C.prefill`, `C.decode`, `C.kv`, `C.weight`, `C.token`, `C.compute`, `C.mem`, `C.comm`, `C.waste`) so every diagram means the same thing by the same colour.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`.

1. Repository → **Settings → Pages → Source: GitHub Actions**.
2. The site is served under `/llm-inference/` because `base` in `astro.config.mjs` matches the repository name. If you rename the repo, update `BASE` there.
3. The custom domain `shubhamtatvamasi.com` comes from the user-site repository (`<user>.github.io`), so project repositories automatically appear at `shubhamtatvamasi.com/<repo>/`.
