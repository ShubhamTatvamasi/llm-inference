/* The Lab's "coach": everything that reasons about a setup rather than drawing it.
   - summarize(): the headline numbers of one setup (with the KV-capacity cap applied)
   - suggest():   try each single-knob change and rank the ones that help
   - EXERCISES:   goals a reader can reach by turning the knobs, checked automatically
   All of it runs the same first-order model as the panels (labModel.ts). */
import { GPUS, getGPU, getModel } from '../../data/hardware';
import { evaluate, type LabIn } from './labModel';

export const B_STEPS = [1, 2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512];
export const P_STEPS = [128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];
export const O_STEPS = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];
export const W_DT = [{ value: 'bf16', label: 'BF16', b: 2 }, { value: 'fp8', label: 'FP8 / INT8', b: 1 }, { value: 'int4', label: 'INT4 / FP4', b: 0.5 }];
export const KV_DT = [{ value: 'bf16', label: 'BF16', b: 2 }, { value: 'fp8', label: 'FP8', b: 1 }];
export const TPS = [1, 2, 4, 8];
/** Per-user speed targets in tok/s; 0 means no target. */
export const SLO_STEPS = [0, 10, 20, 30, 40, 50, 75, 100];

/** Lab state. `s` is the per-user speed target (tok/s, 0 = none). */
export interface St { m: string; g: string; tp: number; w: string; kv: string; p: number; o: number; b: number; s: number }
export const DEFAULT: St = { m: 'llama3-8b', g: 'h100', tp: 1, w: 'bf16', kv: 'bf16', p: 2048, o: 512, b: 32, s: 0 };

export const toInput = (st: St): LabIn => ({
  model: getModel(st.m), gpu: getGPU(st.g), tp: st.tp,
  wBytes: W_DT.find((d) => d.value === st.w)!.b, kvBytes: KV_DT.find((d) => d.value === st.kv)!.b,
  prompt: st.p, output: st.o, batch: st.b,
});

export function summarize(st: St) {
  const inp = toInput(st);
  const asked = evaluate(inp);
  const fits = asked.mem.fits && asked.mem.maxSeqs >= 1;
  const over = fits && st.b > asked.mem.maxSeqs; // more requests than KV slots: the extra ones queue
  // only the requests that fit actually run, so speed and cost are those of the running batch
  const running = over ? asked.mem.maxSeqs : st.b;
  const r = over ? evaluate({ ...inp, batch: running }) : asked;
  const meetsSlo = st.s === 0 || r.perUser >= st.s;
  return { inp, r, fits, over, running, total: r.total, cost: r.costPerM, perUser: r.perUser, ttft: r.ttft, tpot: r.tpot, reqPerS: r.reqPerS, maxSeqs: asked.mem.maxSeqs, meetsSlo, ok: fits && !over && meetsSlo };
}
export type Summary = ReturnType<typeof summarize>;

/** Largest batch that fits in the KV cache and keeps the per-user target, or null if none does. */
export function bestBatch(st: St): number | null {
  let best: number | null = null;
  for (const b of B_STEPS) { if (summarize({ ...st, b }).ok) best = b; }
  return best;
}

export interface Suggestion {
  label: string;
  /** chapter that explains why this helps */
  ch: string;
  st: St;
  cost: number;
  /** relative change vs the current setup (0.25 = +25%); NaN when the current setup does not run */
  dCost: number; dTotal: number; dUser: number;
}

type Move = { label: string; ch: string; apply: (st: St) => St | null };
function moves(st: St): Move[] {
  const out: Move[] = [];
  const wi = W_DT.findIndex((d) => d.value === st.w);
  if (wi < W_DT.length - 1) out.push({ label: `Weights → ${W_DT[wi + 1].label}`, ch: 'quantization', apply: (x) => ({ ...x, w: W_DT[wi + 1].value }) });
  if (wi === 0) out.push({ label: `Weights → ${W_DT[2].label}`, ch: 'quantization', apply: (x) => ({ ...x, w: W_DT[2].value }) });
  if (st.kv !== 'fp8') out.push({ label: 'KV cache → FP8', ch: 'kv-cache', apply: (x) => ({ ...x, kv: 'fp8' }) });
  if (st.tp < 8) out.push({ label: `${st.tp * 2}× GPUs`, ch: 'parallelism', apply: (x) => ({ ...x, tp: st.tp * 2 }) });
  if (st.tp > 1) out.push({ label: `${st.tp / 2}× GPU${st.tp / 2 > 1 ? 's' : ''}`, ch: 'parallelism', apply: (x) => ({ ...x, tp: st.tp / 2 }) });
  out.push({ label: 'Best batch', ch: 'batching', apply: (x) => { const b = bestBatch(x); return b && b !== x.b ? { ...x, b } : null; } });
  return out;
}

/** The single-knob changes worth making, cheapest first. If the setup does not run and no single
    change fixes it, pairs of changes are tried. A different GPU is offered separately (cheapest one). */
export function suggest(st: St, max = 4): Suggestion[] {
  const cur = summarize(st);
  const mk = (label: string, ch: string, next: St): Suggestion | null => {
    const s = summarize(next);
    if (!s.ok || !Number.isFinite(s.cost)) return null;
    const rel = (a: number, b: number) => (cur.fits ? a / b - 1 : NaN);
    return { label, ch, st: next, cost: s.cost, dCost: rel(s.cost, cur.cost), dTotal: rel(s.total, cur.total), dUser: rel(s.perUser, cur.perUser) };
  };
  const named = (m: Move, next: St) => (m.label === 'Best batch' ? `Batch → ${next.b}` : m.label);
  const found: Suggestion[] = [];
  const ms = moves(st);
  for (const m of ms) {
    const next = m.apply(st); if (!next) continue;
    const s = mk(named(m, next), m.ch, next); if (s) found.push(s);
  }
  if (!cur.ok && !found.length) {
    for (let i = 0; i < ms.length; i++) for (let j = 0; j < ms.length; j++) {
      if (i === j) continue;
      const a = ms[i].apply(st); if (!a) continue;
      const b = ms[j].apply(a); if (!b) continue;
      if (ms[i].label !== 'Best batch' && i > j) continue; // each unordered pair once; batch is re-fitted last
      const s = mk(`${named(ms[i], a)} + ${named(ms[j], b)}`, ms[i].ch, b); if (s) found.push(s);
    }
  }
  // the cheapest other GPU for this model and precision, at its own best batch
  let alt: Suggestion | null = null;
  for (const g of GPUS) {
    if (g.id === st.g) continue;
    const base = { ...st, g: g.id };
    const b = summarize(base).ok ? st.b : bestBatch(base);
    if (!b) continue;
    const s = mk(`Switch to ${st.tp}× ${g.name}${b !== st.b ? ` at batch ${b}` : ''}`, 'gpu', { ...base, b });
    if (s && (!alt || s.cost < alt.cost)) alt = s;
  }
  // knob changes first (cheapest first); the hardware switch is a bigger decision, so it comes last
  const seen = new Set<string>();
  const knobs = found
    .filter((s) => !cur.ok || s.cost < cur.cost * 0.97)
    .sort((a, b) => a.cost - b.cost)
    .filter((s) => { const k = JSON.stringify(s.st); if (seen.has(k)) return false; seen.add(k); return true; });
  const hw = alt && (!cur.ok || alt.cost < cur.cost * 0.97) ? [alt] : [];
  return [...knobs.slice(0, max - hw.length), ...hw];
}

export interface Exercise {
  id: string; title: string; goal: string; hint: string;
  /** shown once solved */
  lesson: string; ch: string;
  start: St;
  check: (st: St, s: Summary) => boolean;
}

export const EXERCISES: Exercise[] = [
  {
    id: 'fit', title: 'Make it fit', ch: 'quantization',
    goal: 'Get Llama 3 70B running on RTX 4090s, using no more than 2 cards.',
    hint: 'Two cards hold 48 GB. At which weight precision do 70 billion parameters come in under that, with room left for a KV cache?',
    lesson: 'Bytes per weight decide whether a model loads at all: BF16 needs 141 GB, FP8 about 71 GB and 4-bit about 35 GB. Quantization buys memory first and speed second.',
    start: { m: 'llama3-70b', g: 'rtx4090', tp: 1, w: 'bf16', kv: 'bf16', p: 1024, o: 256, b: 1, s: 0 },
    check: (st, s) => st.m === 'llama3-70b' && st.g === 'rtx4090' && st.tp <= 2 && s.fits && !s.over,
  },
  {
    id: 'batch', title: 'Nearly free throughput', ch: 'batching',
    goal: 'On one H100 with Llama 3 8B, reach 2,500 tok/s in total while every user still gets at least 40 tok/s.',
    hint: 'At batch 1 the GPU reads all the weights to make one token. Raise the batch and watch which of the two numbers moves faster.',
    lesson: 'A decode step costs about the same whether it produces 1 token or 100, because the weight read dominates. Batching is why serving is affordable; the KV cache and your latency target set where it stops.',
    start: { m: 'llama3-8b', g: 'h100', tp: 1, w: 'bf16', kv: 'bf16', p: 2048, o: 512, b: 1, s: 0 },
    check: (st, s) => st.m === 'llama3-8b' && st.g === 'h100' && st.tp === 1 && s.fits && !s.over && s.total >= 2500 && s.perUser >= 40,
  },
  {
    id: 'context', title: 'The long-context squeeze', ch: 'kv-cache',
    goal: 'Fit at least 24 concurrent requests with 32k-token prompts on a single H100 (Llama 3 8B).',
    hint: 'Look at panel 1: the weights are not the problem. What is each request holding, and in how many bytes per element?',
    lesson: 'With long prompts the KV cache, not the weights, fills the GPU. Halving its precision doubles the requests that fit; so would a model with fewer KV heads or a shorter context.',
    start: { m: 'llama3-8b', g: 'h100', tp: 1, w: 'bf16', kv: 'bf16', p: 32768, o: 512, b: 8, s: 0 },
    check: (st, s) => st.m === 'llama3-8b' && st.g === 'h100' && st.tp === 1 && st.p >= 32768 && s.fits && s.maxSeqs >= 24,
  },
  {
    id: 'cost', title: 'Cut the bill', ch: 'capacity-planning',
    goal: 'Serve Llama 3 70B on H100s for under $1.50 per million output tokens, with at least 30 tok/s per user.',
    hint: 'The starting point costs about $13. Three knobs each help a lot: how many tokens share a step, how many bytes a step reads, and how many GPUs you pay for.',
    lesson: 'Cost per token is GPU price divided by throughput. Batch size moves it most, precision next, and extra GPUs only pay off when they let the batch grow.',
    start: { m: 'llama3-70b', g: 'h100', tp: 4, w: 'bf16', kv: 'bf16', p: 2048, o: 512, b: 8, s: 30 },
    check: (st, s) => st.m === 'llama3-70b' && st.g === 'h100' && s.fits && !s.over && s.cost <= 1.5 && s.perUser >= 30,
  },
  {
    id: 'hardware', title: 'Shop around', ch: 'gpu',
    goal: 'Serve Llama 3 70B for under $0.80 per million output tokens with at least 20 tok/s per user. Any hardware.',
    hint: 'Decode is bound by memory bandwidth and by how many requests fit. Which chips give the most of both per dollar? The suggestions under the stats will point at one.',
    lesson: 'For decode-heavy serving, what matters is memory capacity and bandwidth per dollar, not peak FLOPs. A chip that holds the whole model on one device also avoids paying for tensor parallelism.',
    start: { m: 'llama3-70b', g: 'h100', tp: 4, w: 'fp8', kv: 'fp8', p: 2048, o: 512, b: 64, s: 20 },
    check: (st, s) => st.m === 'llama3-70b' && s.fits && !s.over && s.cost <= 0.8 && s.perUser >= 20,
  },
];
