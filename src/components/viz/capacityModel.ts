/* First-order capacity model used by the capacity-planning chapter.
   Roofline-style estimates: decode reads weights + KV once per step; prefill is compute-bound.
   Efficiency factors are rough; real numbers come from load tests. */
import { kvBytesPerToken, kvReplication, type GPU, type Model } from '../../data/hardware';
import { peakFlops, touchedWeightBytes, attnFlopsPerCtx } from '../lab/labModel';

export interface PlanIn {
  model: Model; gpu: GPU; tp: number;
  wBytes: number; kvBytes: number;
  prompt: number; output: number;   // average tokens per request
  rps: number;                      // arrival rate, requests/s
  tpotSlo: number;                  // ms
  ttftSlo: number;                  // s
  util: number;                     // target utilisation of SLO capacity (headroom)
  memUtil?: number;                 // gpu_memory_utilization
}

const BW_EFF = 0.75, FLOP_EFF = 0.5, OVERHEAD_S = 0.002;

export function flopsTotal(g: GPU, tp: number, wBytes: number) {
  return peakFlops(g, wBytes) * tp * FLOP_EFF; // same precision → tensor-core rules as the Lab
}

/** Seconds per decode step for a batch of B sequences with average context ctx. */
export function stepTime(m: Model, g: GPU, tp: number, wBytes: number, kvBytes: number, B: number, ctx: number) {
  const bw = g.bwTBs * 1e12 * tp * BW_EFF;
  // MoE: the more tokens in the batch, the more distinct experts get touched (see labModel.touchedWeightBytes)
  const mem = (touchedWeightBytes(m, wBytes, B) + B * ctx * kvBytesPerToken(m, kvBytes) * kvReplication(m, tp)) / bw;
  const comp = (2 * m.activeParams * B + attnFlopsPerCtx(m) * ctx * B) / flopsTotal(g, tp, wBytes);
  const comm = tp > 1 ? 2 * m.layers * 12e-6 * Math.log2(tp) : 0; // two all-reduces per layer
  return Math.max(mem, comp) + comm + OVERHEAD_S;
}

/** Seconds to prefill one prompt (linear matmuls + quadratic attention). */
export function prefillTime(m: Model, g: GPU, tp: number, wBytes: number, prompt: number) {
  const f = flopsTotal(g, tp, wBytes);
  const linear = 2 * m.activeParams * prompt;
  const attn = 2 * m.layers * prompt * prompt * m.heads * m.headDim; // causal QKᵀ + AV
  const wRead = touchedWeightBytes(m, wBytes, prompt) / (g.bwTBs * 1e12 * tp * BW_EFF);
  return Math.max((linear + attn) / f, wRead);
}

export function plan(p: PlanIn) {
  const memUtil = p.memUtil ?? 0.9;
  const totalMem = p.gpu.memGB * 1e9 * p.tp;
  const budget = totalMem * memUtil;
  const weights = p.model.params * p.wBytes;
  const overhead = Math.max(1.5e9 * p.tp, 0.04 * totalMem);
  const kvAvail = budget - weights - overhead;
  const fits = kvAvail > 0;
  const kvTok = kvBytesPerToken(p.model, p.kvBytes) * kvReplication(p.model, p.tp); // across the TP group
  const seqTokens = p.prompt + p.output;
  const kvSeq = kvTok * seqTokens;
  const maxSeqMem = fits ? Math.floor(kvAvail / kvSeq) : 0;
  const avgCtx = p.prompt + p.output / 2;
  const pT = prefillTime(p.model, p.gpu, p.tp, p.wBytes, p.prompt);

  // effective TPOT includes time stolen by other requests' prefills
  const evalB = (B: number) => {
    const st = stepTime(p.model, p.gpu, p.tp, p.wBytes, p.kvBytes, B, avgCtx);
    const rpsRep = 1 / ((p.output * st) / B + pT);
    const prefillShare = Math.min(0.95, rpsRep * pT);
    return { st, rpsRep, tpot: st / (1 - prefillShare) };
  };
  let C = 0, best = evalB(1);
  const lim = Math.min(maxSeqMem, 1024);
  for (let B = 1; B <= lim; B++) {
    const e = evalB(B);
    if (e.tpot * 1000 <= p.tpotSlo) { C = B; best = e; } else break;
  }
  const limitedBy: 'memory' | 'latency' | 'none' = !fits || maxSeqMem === 0 ? 'none' : C === maxSeqMem || C === 1024 ? 'memory' : 'latency';
  const rpsRep = C > 0 ? best.rpsRep : 0;
  const outTokS = rpsRep * p.output;
  const replicas = rpsRep > 0 ? Math.max(1, Math.ceil(p.rps / (rpsRep * p.util))) : Infinity;
  const gpus = replicas * p.tp;
  const costHr = gpus * p.gpu.pricePerHr;
  const outPerHr = p.rps * p.output * 3600;
  const costPerM = costHr / (outPerHr / 1e6);
  const ttft = pT; // prefill emits the first token; excludes queueing
  const e2e = ttft + (p.output - 1) * best.tpot;
  const inflight = p.rps * e2e; // Little's law
  return {
    totalMem, budget, weights, overhead, kvAvail, fits, kvTok, kvSeq, maxSeqMem, pT, C,
    step: best.st, tpot: best.tpot, rpsRep, outTokS, replicas, gpus, costHr, costPerM,
    ttft, e2e, inflight, limitedBy, ttftOk: ttft <= p.ttftSlo,
  };
}

export const money = (x: number) => (!isFinite(x) ? '—' : x >= 100 ? `$${Math.round(x).toLocaleString('en-US')}` : `$${x.toFixed(2)}`);
