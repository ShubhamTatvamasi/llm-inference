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
npm run check      # after a build: fails on broken links, bad #anchors, duplicate ids, dead search results
```

## Project layout

```
src/
  data/chapters.ts      # navigation, ordering, parts: the single source of truth
  data/accelerators.ts  # the accelerator catalog (specs, prices, sources): single source of truth for hardware
  data/accelType.ts     # catalog types, conventions (dense FLOPs, bidirectional links) and derived metrics
  data/hardware.ts      # model specs, KV helpers, and the calculator GPU list derived from the catalog
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

- **`/lab/`, the Inference Lab** (`src/components/lab/`): one set of knobs (model, GPU, TP, precision, prompt/output length, batch) driving five linked views: HBM map, decode-step anatomy, roofline, throughput–latency curve, request timeline. The maths is in `labModel.ts` and uses the same assumptions as `capacityModel.ts`. `labCoach.ts` adds the parts that reason about a setup: a pinned baseline with per-number deltas, a per-user speed target, ranked "what would help" suggestions (each single-knob change is evaluated with the same model), and five auto-checked exercises. State, including the baseline, lives in the URL hash, so setups can be shared.
- **`/hardware/`, Inference Hardware** (`src/components/hw/`): 76 GPUs and accelerators (NVIDIA, AMD, TPU, Trainium, Gaudi, Ascend, SRAM chips, Apple silicon and desktop boxes) with a sortable explorer, per-chip spec sheets, side-by-side compare, a capacity × bandwidth map, a ridge-point-by-year chart and a "what should I run this on" calculator that runs the Lab's model on every priced chip. View state lives in the query string (`?gpu=…&cmp=…`).
- **`/map/`, the Concept Map**: built automatically from the `../<slug>/` cross-links in the chapter MDX (`src/data/graph.ts`). The same graph powers the "Builds on / Comes up again in" box at the end of every chapter. To connect two chapters, just link one from the other.
- **`/paths/`, Learning Paths** (`src/data/paths.ts`): curated reading orders for a goal or role, with time estimates and progress. Following a path stores its id in `localStorage` (`tbt-path`), and each chapter in it then shows "next in your path" above the pager. To add a path, add an entry to `paths.ts`; unknown slugs fail the build.
- **`/review/`, Review**: spaced-repetition flashcards built from every `<Q>` in the chapters. Questions are read from the MDX at build time (`questions()` in `src/data/content.ts`); the answer is pulled from the rendered chapter page when a card is flipped, so it always matches the chapter. Progress (a Leitner box and due day per card) lives in `localStorage` under `tbt-review`. `/review/?chapter=<slug>` opens one chapter's deck. Rewording a question gives it a new id and resets its progress.
- **`/cheatsheet/`, Cheat Sheet** (`src/data/cheatsheet.ts`): the formulas and numbers worth memorising, each with the slug of the chapter it comes from. KaTeX is rendered at build time, so a bad expression fails the build. If you change a number in a chapter, change it here too.
- **`/glossary/`** (`src/data/glossary.ts`): each term is linked to the chapter that teaches it. The first mention of each term in a chapter gets a hover/tap definition, and terms are searchable from ⌘K. Mark very common words `hover: false`.
- **⌘K search** (`src/data/search.ts` → `/search.json`): chapters, every section heading, every diagram, every interview question, the tools and the glossary. The index is one cached file, fetched the first time the palette opens; chapters reuse it for the glossary hover definitions. Nothing to register: a new `##` heading or `<Viz title="…">` is searchable after the next build.
- Every `<Viz>` frame has a full-screen button (Esc closes it) and a stable anchor (`#viz-<slugified-title>`), so a diagram can be linked directly. Renaming a diagram changes its anchor.
- Chapters show a reading time (`src/data/content.ts`), a collapsible "On this page" list on screens too narrow for the side contents, and a `#` link on each section heading. The home page button resumes the last chapter read.

### Colour language

Use the semantic tokens (`C.prefill`, `C.decode`, `C.kv`, `C.weight`, `C.token`, `C.compute`, `C.mem`, `C.comm`, `C.waste`) so every diagram means the same thing by the same colour.

## Deploy

`.github/workflows/deploy.yml` builds, runs `npm run check`, and publishes to GitHub Pages on every push to `main`. A broken link or anchor stops the deploy.

1. Repository → **Settings → Pages → Source: GitHub Actions**.
2. The site is served under `/llm-inference/` because `base` in `astro.config.mjs` matches the repository name. If you rename the repo, update `BASE` there.
3. The custom domain `shubhamtatvamasi.com` comes from the user-site repository (`<user>.github.io`), so project repositories automatically appear at `shubhamtatvamasi.com/<repo>/`.
