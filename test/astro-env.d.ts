/* Ambient types so `tsc` (npm run typecheck) understands the Astro/Vite import.meta surface
   used by the data/lib modules: import.meta.env.BASE_URL and import.meta.glob. The .astro
   components and the glob-consuming data files (content.ts, graph.ts, search.ts) are not in the
   type-checked program — they are validated by the Astro build and the site check. */
interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly [key: string]: unknown;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly glob: (pattern: string, options?: unknown) => unknown;
}
