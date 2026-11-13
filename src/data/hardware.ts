import { ACCELS, CALC_GPUS } from './accelerators';

/* Shared, reusable reference numbers so every chapter quotes the same specs.
   GPU numbers are spec-sheet peak, DENSE (no 2:4 sparsity). Treat as approximate.
   Model numbers come from the public model configs. */

export interface GPU {
  id: string;
  name: string;
  memGB: number;        // HBM / VRAM capacity (GB, decimal as marketed)
  bwTBs: number;        // memory bandwidth TB/s
  bf16TF: number;       // dense BF16/FP16 tensor TFLOPS
  fp8TF: number | null; // dense FP8 TFLOPS (null = unsupported)
  fp4TF: number | null; // dense FP4 TFLOPS
  int8TOPS: number | null;
  linkGBs: number;      // GPU↔GPU bandwidth per GPU, GB/s. NVLink/Infinity Fabric: BOTH directions summed
                        // (H100 900 = 450 each way). PCIe cards: per direction. Halve NVLink for α–β maths.
  sms: number;          // streaming multiprocessors / compute units
  l2MB: number;         // last-level on-chip cache (MI300X: 256 MB Infinity Cache; its true L2 is 4 MB per XCD)
  smemKB: number;       // on-chip shared memory (configurable L1/SMEM) per SM, KB
  pricePerHr: number;   // rough cloud on-demand USD/GPU-hour (illustrative)
}

/** The GPUs offered in chapter calculators and the Lab, derived from the full accelerator catalog
    (src/data/accelerators.ts) so every page quotes the same specs. pricePerHr = midpoint of the
    catalog's on-demand range. */
export const GPUS: GPU[] = CALC_GPUS.map(([catalogId, id, name]) => {
  const a = ACCELS.find((x) => x.id === catalogId)!;
  return {
    id, name, memGB: a.memGB, bwTBs: a.bwTBs, bf16TF: a.bf16 ?? 0, fp8TF: a.fp8 ?? null, fp4TF: a.fp4 ?? null,
    int8TOPS: a.int8 ?? null, linkGBs: a.link?.GBs ?? 32, sms: a.cores ?? 0, l2MB: a.sramMB ?? 0,
    smemKB: a.smemKB ?? 0, pricePerHr: a.price ? Math.round(((a.price[0] + a.price[1]) / 2) * 100) / 100 : 0,
  };
});

export interface Model {
  id: string;
  name: string;
  params: number;        // total parameters
  activeParams: number;  // parameters used per token (== params for dense)
  layers: number;
  hidden: number;
  heads: number;         // query heads
  kvHeads: number;       // KV heads (== heads → MHA, 1 → MQA, else GQA)
  headDim: number;
  ffn: number;           // MLP intermediate size (per expert for MoE)
  vocab: number;
  maxCtx: number;
  attn: 'MHA' | 'GQA' | 'MQA' | 'MLA';
  mlaDim?: number;       // MLA: cached latent + rope dims per token per layer
  experts?: { total: number; active: number; shared?: number };
}

export const MODELS: Model[] = [
  { id: 'llama2-7b', name: 'Llama 2 7B (MHA)', params: 6.74e9, activeParams: 6.74e9, layers: 32, hidden: 4096, heads: 32, kvHeads: 32, headDim: 128, ffn: 11008, vocab: 32000, maxCtx: 4096, attn: 'MHA' },
  { id: 'llama3-8b', name: 'Llama 3.1 8B', params: 8.03e9, activeParams: 8.03e9, layers: 32, hidden: 4096, heads: 32, kvHeads: 8, headDim: 128, ffn: 14336, vocab: 128256, maxCtx: 131072, attn: 'GQA' },
  { id: 'qwen3-8b', name: 'Qwen3 8B', params: 8.2e9, activeParams: 8.2e9, layers: 36, hidden: 4096, heads: 32, kvHeads: 8, headDim: 128, ffn: 12288, vocab: 151936, maxCtx: 131072, attn: 'GQA' },
  { id: 'qwen3-32b', name: 'Qwen3 32B', params: 32.8e9, activeParams: 32.8e9, layers: 64, hidden: 5120, heads: 64, kvHeads: 8, headDim: 128, ffn: 25600, vocab: 151936, maxCtx: 131072, attn: 'GQA' },
  { id: 'llama3-70b', name: 'Llama 3.1 70B', params: 70.6e9, activeParams: 70.6e9, layers: 80, hidden: 8192, heads: 64, kvHeads: 8, headDim: 128, ffn: 28672, vocab: 128256, maxCtx: 131072, attn: 'GQA' },
  { id: 'llama3-405b', name: 'Llama 3.1 405B', params: 405e9, activeParams: 405e9, layers: 126, hidden: 16384, heads: 128, kvHeads: 8, headDim: 128, ffn: 53248, vocab: 128256, maxCtx: 131072, attn: 'GQA' },
  { id: 'mixtral-8x7b', name: 'Mixtral 8x7B (MoE)', params: 46.7e9, activeParams: 12.9e9, layers: 32, hidden: 4096, heads: 32, kvHeads: 8, headDim: 128, ffn: 14336, vocab: 32000, maxCtx: 32768, attn: 'GQA', experts: { total: 8, active: 2 } },
  { id: 'qwen3-30b-a3b', name: 'Qwen3 30B-A3B (MoE)', params: 30.5e9, activeParams: 3.3e9, layers: 48, hidden: 2048, heads: 32, kvHeads: 4, headDim: 128, ffn: 768, vocab: 151936, maxCtx: 131072, attn: 'GQA', experts: { total: 128, active: 8 } },
  { id: 'deepseek-v3', name: 'DeepSeek-V3 671B (MoE, MLA)', params: 671e9, activeParams: 37e9, layers: 61, hidden: 7168, heads: 128, kvHeads: 128, headDim: 128, ffn: 2048, vocab: 129280, maxCtx: 131072, attn: 'MLA', mlaDim: 576, experts: { total: 256, active: 8, shared: 1 } },
];

export const DTYPES = [
  { id: 'fp32', name: 'FP32', bytes: 4 },
  { id: 'bf16', name: 'BF16 / FP16', bytes: 2 },
  { id: 'fp8', name: 'FP8', bytes: 1 },
  { id: 'int8', name: 'INT8', bytes: 1 },
  { id: 'int4', name: 'INT4', bytes: 0.5 },
  { id: 'fp4', name: 'FP4', bytes: 0.5 },
] as const;

/** KV-cache bytes for ONE token across ALL layers. */
export function kvBytesPerToken(m: Model, bytesPerElem = 2) {
  if (m.attn === 'MLA' && m.mlaDim) return m.layers * m.mlaDim * bytesPerElem;
  return 2 /* K and V */ * m.layers * m.kvHeads * m.headDim * bytesPerElem;
}

/** Copies of each token's KV a tensor-parallel group stores. GQA/MHA shard KV heads across ranks, but once
    TP exceeds the KV-head count the heads are replicated. MLA's compressed latent is shared by all heads, so
    every rank keeps the full latent: TP adds memory for weights but none for KV. */
export const kvReplication = (m: Model, tp: number) => (m.attn === 'MLA' ? tp : Math.max(1, tp / m.kvHeads));

/** KV-cache bytes for one token held by EACH GPU of a TP group. */
export const kvBytesPerGpu = (m: Model, tp: number, bytesPerElem = 2) =>
  (kvBytesPerToken(m, bytesPerElem) * kvReplication(m, tp)) / tp;

/** Weight bytes. */
export const weightBytes = (m: Model, bytesPerParam = 2) => m.params * bytesPerParam;

export const getGPU = (id: string) => GPUS.find((g) => g.id === id)!;
export const getModel = (id: string) => MODELS.find((m) => m.id === id)!;
export const GB = 1e9;
export const GiB = 1024 ** 3;
