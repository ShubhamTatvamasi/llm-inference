/* First-order model for a KV cache service.
   A hit replaces prefill with a lookup plus a reload from a lower tier. The point of a
   *shared* cache service is that the hit rate stops falling as replicas are added.
   Pure functions so the diagram and the tests cannot disagree. */

export interface CacheInputs {
  promptTokens: number; // tokens in the reusable prefix
  prefillTps: number;   // prefill throughput, tokens/s
  kvKiB: number;        // KV bytes per token, KiB
  tierGBs: number;      // effective reload bandwidth, GB/s
  reuse: number;        // 0..1: share of requests whose prefix exists in the cluster
  replicas: number;     // engine replicas behind a round-robin router
}

/** Time to prefill the prefix from scratch, ms. */
export const prefillMs = (i: CacheInputs) => (i.promptTokens / i.prefillTps) * 1000;

/** KV bytes for the prefix, GiB. */
export const kvGiB = (i: CacheInputs) => (i.promptTokens * i.kvKiB) / (1024 * 1024);

/** Time to move the prefix from the cache tier to HBM, ms. Excludes lookup and setup. */
export const reloadMs = (i: CacheInputs) => (kvGiB(i) / i.tierGBs) * 1000;

/** Hit rate when the cache is private to each replica and routing is uniform: reuse / R. */
export const localHit = (i: CacheInputs) => i.reuse / Math.max(1, i.replicas);

/** Effective TTFT for a given hit rate: miss → prefill, hit → reload. */
export const effectiveTtftMs = (i: CacheInputs, hit: number) =>
  (1 - hit) * prefillMs(i) + hit * reloadMs(i);

export const ttftLocalMs = (i: CacheInputs) => effectiveTtftMs(i, localHit(i));
export const ttftSharedMs = (i: CacheInputs) => effectiveTtftMs(i, i.reuse);

/** Net GPU-hours of prefill avoided per million requests: a hit saves prefill but pays the reload. */
export const gpuHoursSavedPerMillion = (i: CacheInputs, hit: number) =>
  (1e6 * hit * (prefillMs(i) - reloadMs(i))) / 1000 / 3600;

/** Cache capacity needed to hold `prefixes` copies of the prefix, GiB. */
export const capacityGiB = (prefixes: number, i: CacheInputs) => prefixes * kvGiB(i);
