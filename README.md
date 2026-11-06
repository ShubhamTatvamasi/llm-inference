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

### Learning tools (non-chapter pages)

- **`/lab/`, the Inference Lab** (`src/components/lab/`): one set of knobs (model, GPU, TP, precision, prompt/output length, batch) driving five linked views: HBM map, decode-step anatomy, roofline, throughput–latency curve, request timeline. The maths is in `labModel.ts` and uses the same assumptions as `capacityModel.ts`. State lives in the URL hash, so setups can be shared.
- **`/map/`, the Concept Map**: built automatically from the `../<slug>/` cross-links in the chapter MDX (`src/data/graph.ts`). The same graph powers the "Builds on / Comes up again in" box at the end of every chapter. To connect two chapters, just link one from the other.
- **`/glossary/`** (`src/data/glossary.ts`): each term is linked to the chapter that teaches it. The first mention of each term in a chapter gets a hover/tap definition, and terms are searchable from ⌘K. Mark very common words `hover: false`.
- Every `<Viz>` frame has a full-screen button (Esc closes it).

### Colour language

Use the semantic tokens (`C.prefill`, `C.decode`, `C.kv`, `C.weight`, `C.token`, `C.compute`, `C.mem`, `C.comm`, `C.waste`) so every diagram means the same thing by the same colour.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`.

1. Repository → **Settings → Pages → Source: GitHub Actions**.
2. The site is served under `/llm-inference/` because `base` in `astro.config.mjs` matches the repository name. If you rename the repo, update `BASE` there.
3. The custom domain `shubhamtatvamasi.com` comes from the user-site repository (`<user>.github.io`), so project repositories automatically appear at `shubhamtatvamasi.com/<repo>/`.
