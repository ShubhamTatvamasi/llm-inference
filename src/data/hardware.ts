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
  linkGBs: number;      // GPU↔GPU bandwidth per GPU (NVLink/IF; PCIe if none), GB/s
  sms: number;          // streaming multiprocessors / compute units
  l2MB: number;
  smemKB: number;       // on-chip shared memory (configurable L1/SMEM) per SM, KB
  pricePerHr: number;   // rough cloud on-demand USD/GPU-hour (illustrative)
}

export const GPUS: GPU[] = [
  { id: 'rtx4090', name: 'RTX 4090 24GB', memGB: 24, bwTBs: 1.01, bf16TF: 165, fp8TF: 330, fp4TF: null, int8TOPS: 660, linkGBs: 32, sms: 128, l2MB: 72, smemKB: 100, pricePerHr: 0.4 },
  { id: 'l40s', name: 'L40S 48GB', memGB: 48, bwTBs: 0.864, bf16TF: 362, fp8TF: 733, fp4TF: null, int8TOPS: 733, linkGBs: 32, sms: 142, l2MB: 96, smemKB: 100, pricePerHr: 0.9 },
  { id: 'a100', name: 'A100 80GB SXM', memGB: 80, bwTBs: 2.04, bf16TF: 312, fp8TF: null, fp4TF: null, int8TOPS: 624, linkGBs: 600, sms: 108, l2MB: 40, smemKB: 164, pricePerHr: 1.5 },
  { id: 'h100', name: 'H100 80GB SXM', memGB: 80, bwTBs: 3.35, bf16TF: 989, fp8TF: 1979, fp4TF: null, int8TOPS: 1979, linkGBs: 900, sms: 132, l2MB: 50, smemKB: 228, pricePerHr: 2.5 },
  { id: 'h200', name: 'H200 141GB', memGB: 141, bwTBs: 4.8, bf16TF: 989, fp8TF: 1979, fp4TF: null, int8TOPS: 1979, linkGBs: 900, sms: 132, l2MB: 50, smemKB: 228, pricePerHr: 3.5 },
  { id: 'mi300x', name: 'MI300X 192GB', memGB: 192, bwTBs: 5.3, bf16TF: 1307, fp8TF: 2615, fp4TF: null, int8TOPS: 2615, linkGBs: 896, sms: 304, l2MB: 256, smemKB: 64, pricePerHr: 3.0 },
  { id: 'b200', name: 'B200 180GB', memGB: 180, bwTBs: 8.0, bf16TF: 2250, fp8TF: 4500, fp4TF: 9000, int8TOPS: 4500, linkGBs: 1800, sms: 148, l2MB: 126, smemKB: 228, pricePerHr: 5.5 },
];

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

/** Weight bytes. */
export const weightBytes = (m: Model, bytesPerParam = 2) => m.params * bytesPerParam;

export const getGPU = (id: string) => GPUS.find((g) => g.id === id)!;
export const getModel = (id: string) => MODELS.find((m) => m.id === id)!;
export const GB = 1e9;
export const GiB = 1024 ** 3;
