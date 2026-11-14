/* First-order performance model behind the Inference Lab.
   Same assumptions as the capacity-planning chapter (src/components/viz/capacityModel.ts):
   decode reads every touched weight + the batch's KV cache once per step, prefill is
   compute-bound, and achieved efficiency is a fixed fraction of the spec sheet.
   Throughput and cost include the GPU time spent prefilling newly arriving requests.
   Every term is returned separately so the Lab can draw *why* a step takes as long as it does. */
import { kvBytesPerToken, kvReplication, type GPU, type Model } from '../../data/hardware';

export const BW_EFF = 0.75;    // achieved / peak HBM bandwidth
export const FLOP_EFF = 0.5;   // achieved / peak tensor FLOPs (MFU)
export const STEP_OVERHEAD = 0.002; // s per step: scheduler, sampling, launch gaps
export const MEM_UTIL = 0.9;   // gpu_memory_utilization

export interface LabIn {
  model: Model; gpu: GPU; tp: number;
  wBytes: number;   // bytes per weight
  kvBytes: number;  // bytes per KV element
  prompt: number; output: number; batch: number;
}

export function peakFlops(g: GPU, wBytes: number) {
  // 4-bit weights on a chip with FP4 tensor cores are served as W4A4 (NVFP4 / MXFP4) and get FP4 FLOPs;
  // elsewhere 4-bit is weight-only and dequantised on the fly, so the math runs at FP8 (if present) or BF16.
  // 8-bit weights use FP8 tensor cores, or INT8 (W8A8, e.g. SmoothQuant) on chips without FP8.
  if (wBytes <= 0.5 && g.fp4TF) return g.fp4TF * 1e12;
  if (wBytes <= 1) return (g.fp8TF ?? g.int8TOPS ?? g.bf16TF) * 1e12;
  return g.bf16TF * 1e12;
}

/** Attention FLOPs per token per unit of context. MLA (absorbed) attends in the 512-dim latent with a
    64-dim RoPE part, so each head does 2·(576 + 512) FLOPs per cached token instead of 4·headDim. */
export const attnFlopsPerCtx = (m: Model) =>
  m.attn === 'MLA' && m.mlaDim ? 2 * m.layers * m.heads * (m.mlaDim + (m.mlaDim - 64)) : 4 * m.layers * m.heads * m.headDim;

/** Bytes of weights a decode step must read: MoE batches touch more experts as B grows. */
export function touchedWeightBytes(m: Model, wBytes: number, B: number) {
  if (!m.experts) return m.params * wBytes;
  // Each token picks k of E routed experts, so an expert stays untouched with prob (1-k/E)^B.
  // R = routed-expert params, solved from active = (params - R) + R·k/E.
  const kE = m.experts.active / m.experts.total;
  const R = (m.params - m.activeParams) / (1 - kE);
  return (m.params - R * Math.pow(1 - kE, Math.max(1, B))) * wBytes;
}

/** Per-direction GPU↔GPU bandwidth. hardware.ts quotes NVLink / Infinity Fabric as both
    directions summed (H100: 900 = 450 each way) but PCIe cards per direction. */
export const linkPerDir = (g: GPU) => (g.linkGBs > 100 ? g.linkGBs / 2 : g.linkGBs) * 1e9;

export function decodeStep(p: LabIn, B = p.batch) {
  const { model: m, gpu: g, tp } = p;
  const bw = g.bwTBs * 1e12 * tp * BW_EFF;
  const flops = peakFlops(g, p.wBytes) * tp * FLOP_EFF;
  const ctx = p.prompt + p.output / 2; // average context over a request's life
  const kvTok = kvBytesPerToken(m, p.kvBytes) * kvReplication(m, tp); // bytes across the TP group
  const wB = touchedWeightBytes(m, p.wBytes, B);
  const kvB = B * ctx * kvTok;
  const tWeights = wB / bw;
  const tKV = kvB / bw;
  const linFlops = 2 * m.activeParams * B;
  const attnFlops = attnFlopsPerCtx(m) * ctx * B; // q·K and p·V over the context
  const tCompute = (linFlops + attnFlops) / flops;
  // two all-reduces of B×hidden activations per layer (ring: 2(n-1)/n of the data, plus latency)
  const tComm = tp > 1
    ? 2 * m.layers * (12e-6 * Math.log2(tp) + (2 * (tp - 1) / tp) * (B * m.hidden * 2) / linkPerDir(g))
    : 0;
  const tMem = tWeights + tKV;
  const step = Math.max(tMem, tCompute) + tComm + STEP_OVERHEAD;
  const bytes = wB + kvB;
  const ai = (linFlops + attnFlops) / bytes; // arithmetic intensity, FLOPs per byte
  const bound: 'weights' | 'kv' | 'compute' = tCompute > tMem ? 'compute' : tKV > tWeights ? 'kv' : 'weights';
  return { step, tWeights, tKV, tCompute, tComm, tOverhead: STEP_OVERHEAD, tMem, ai, bound, wB, kvB, ctx };
}

export function prefill(p: LabIn) {
  const { model: m, gpu: g, tp, prompt: n } = p;
  const flops = peakFlops(g, p.wBytes) * tp * FLOP_EFF;
  const lin = 2 * m.activeParams * n;
  const attn = 2 * m.layers * n * n * m.heads * m.headDim; // causal: half of 4·L·n²·H·d (prefill runs MLA un-absorbed)
  const tCompute = (lin + attn) / flops;
  // a long prompt routes enough tokens to touch nearly every MoE expert, so read the touched set, not just active params
  const tWeights = touchedWeightBytes(m, p.wBytes, n) / (g.bwTBs * 1e12 * tp * BW_EFF);
  const ai = (lin + attn) / (m.params * p.wBytes + n * kvBytesPerToken(m, p.kvBytes));
  return { t: Math.max(tCompute, tWeights), tCompute, tWeights, attnShare: attn / (lin + attn), ai };
}

export function memory(p: LabIn) {
  const total = p.gpu.memGB * 1e9 * p.tp;
  const budget = total * MEM_UTIL;
  const weights = p.model.params * p.wBytes;
  const overhead = Math.max(1.5e9 * p.tp, 0.04 * total); // activations, CUDA graphs, workspace
  const kvAvail = budget - weights - overhead;
  const kvTok = kvBytesPerToken(p.model, p.kvBytes) * kvReplication(p.model, p.tp); // across the TP group
  const perSeq = kvTok * (p.prompt + p.output); // a full-length request's KV
  const maxSeqs = kvAvail > 0 ? Math.floor(kvAvail / perSeq) : 0;
  const kvUsed = Math.min(Math.max(0, kvAvail), p.batch * perSeq);
  return { total, budget, weights, overhead, kvAvail, kvTok, perSeq, maxSeqs, kvUsed, fits: kvAvail > 0 };
}

export function evaluate(p: LabIn) {
  const mem = memory(p);
  const d = decodeStep(p);
  const pf = prefill(p);
  const ttft = pf.t; // prefill's last position emits the first token (queueing not modelled)
  // Steady state: each finished request is replaced by a new one, and its prefill takes the GPU
  // for pf.t. So the average gap between a user's tokens is longer than one decode step.
  // Same treatment as capacityModel.plan(): prefill and decode time-share the GPU.
  // Engines fold new prompts into decode steps (chunked prefill), so the weights are already being
  // streamed and a prompt's marginal cost is its FLOPs, not another full weight read.
  const pfCost = pf.tCompute;
  const cycle = (p.output * d.step) / p.batch + pfCost; // GPU-seconds per completed request
  const pfShare = Math.min(0.95, pfCost / cycle);       // fraction of GPU time spent on prefill
  const tpot = d.step / (1 - pfShare);
  const e2e = ttft + (p.output - 1) * tpot;
  const perUser = 1 / tpot;
  const total = p.batch / tpot; // output tokens/s, prefill time included
  const reqPerS = total / p.output;
  const gpus = p.tp;
  const costPerM = (gpus * p.gpu.pricePerHr) / (total * 3600) * 1e6;
  return { mem, d, pf, ttft, tpot, step: d.step, pfShare, e2e, perUser, total, reqPerS, costPerM };
}

/** Throughput vs per-user speed as the batch grows: the serving trade-off curve. */
export function sweep(p: LabIn, Bs: number[]) {
  return Bs.map((B) => {
    const r = evaluate({ ...p, batch: B });
    return { B, perUser: r.perUser, total: r.total, bound: r.d.bound };
  });
}
