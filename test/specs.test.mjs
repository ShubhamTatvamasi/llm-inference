/* Invariant tests for the numeric core: the first-order performance model, the KV-cache maths,
   and the agreement between the slim calculator GPU list (gpus.ts) and the full catalog
   (accelerators.ts). Run with:  npm test   (node --import ./test/register.mjs --test test/) */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { GPUS, getGPU } from '../src/data/gpus.ts';
import { MODELS, getModel, kvBytesPerToken, kvBytesPerGpu, kvReplication } from '../src/data/hardware.ts';
import { ACCELS } from '../src/data/accelerators.ts';
import { decodeCeiling, priceMid } from '../src/data/accelType.ts';
import { peakFlops, touchedWeightBytes, evaluate, memory, decodeStep } from '../src/components/lab/labModel.ts';
import { plan } from '../src/components/viz/capacityModel.ts';

const llama8b = getModel('llama3-8b');
const llama2 = getModel('llama2-7b');
const deepseek = getModel('deepseek-v3');
const mixtral = getModel('mixtral-8x7b');
const h100 = getGPU('h100');

describe('KV-cache bytes', () => {
  test('Llama 3.1 8B in BF16 is 128 KiB per token (the number quoted in the chapter)', () => {
    assert.equal(kvBytesPerToken(llama8b, 2), 131072); // 2 × 32 layers × 8 kv heads × 128 d_head × 2 B
  });
  test('MHA Llama 2 7B is 4× larger (32 KV heads)', () => {
    assert.equal(kvBytesPerToken(llama2, 2), 2 * 32 * 32 * 128 * 2); // 524288
  });
  test('MLA (DeepSeek-V3) caches the compressed latent only', () => {
    assert.equal(kvBytesPerToken(deepseek, 2), 61 * 576 * 2); // layers × mlaDim × bytes
  });
});

describe('KV replication under tensor parallelism', () => {
  test('GQA: heads shard until TP exceeds the KV-head count, then replicate', () => {
    assert.equal(kvReplication(llama8b, 1), 1);   // 8 heads, 1 GPU
    assert.equal(kvReplication(llama8b, 8), 1);   // 8 heads, 8 GPUs → one head each
    assert.equal(kvReplication(llama8b, 16), 2);  // 8 heads, 16 GPUs → each head on 2 ranks
  });
  test('MLA: every rank keeps the full latent', () => {
    assert.equal(kvReplication(deepseek, 8), 8);
  });
  test('per-GPU KV is consistent with the replication factor', () => {
    for (const tp of [1, 2, 4, 8, 16]) {
      assert.ok(Math.abs(kvBytesPerGpu(llama8b, tp) * tp / kvReplication(llama8b, tp) - kvBytesPerToken(llama8b)) < 1e-6);
    }
    // GQA: doubling TP beyond the KV-head count doesn't change per-GPU KV
    assert.equal(kvBytesPerGpu(llama8b, 8), kvBytesPerGpu(llama8b, 16));
  });
});

describe('weight reads (MoE "touched experts")', () => {
  test('dense models always read all parameters', () => {
    assert.equal(touchedWeightBytes(llama8b, 2, 1), llama8b.params * 2);
    assert.equal(touchedWeightBytes(llama8b, 2, 1000), llama8b.params * 2);
  });
  test('MoE reads the active set at batch 1 and approaches every expert for a large batch', () => {
    const b1 = touchedWeightBytes(mixtral, 1, 1);
    const bBig = touchedWeightBytes(mixtral, 1, 4096);
    assert.ok(b1 >= mixtral.activeParams && b1 < mixtral.params, `batch-1 read ${b1} outside (active, total)`);
    assert.ok(bBig > b1 && bBig < mixtral.params * 1.01);
  });
  test('MoE weight reads grow monotonically with the batch', () => {
    let prev = 0;
    for (const b of [1, 2, 4, 8, 16, 64, 256]) {
      const v = touchedWeightBytes(mixtral, 1, b);
      assert.ok(v >= prev, `read fell at B=${b}`);
      prev = v;
    }
  });
});

describe('precision → tensor-core peak (peakFlops)', () => {
  test('BF16 weights run at BF16 peak', () => {
    assert.equal(peakFlops(h100, 2), h100.bf16TF * 1e12);
  });
  test('FP8 weights fall back to INT8 on chips without FP8 (A100)', () => {
    assert.equal(peakFlops(getGPU('a100'), 1), getGPU('a100').int8TOPS * 1e12);
  });
  test('4-bit weights use FP4 tensor cores where available (B200)', () => {
    assert.equal(peakFlops(getGPU('b200'), 0.5), getGPU('b200').fp4TF * 1e12);
  });
});

describe('decode step', () => {
  test('is decomposed consistently: tMem = weights + KV, step ≥ tMem + comm', () => {
    const d = decodeStep({ model: llama8b, gpu: h100, tp: 1, wBytes: 2, kvBytes: 2, prompt: 2048, output: 512, batch: 1 });
    assert.ok(Math.abs(d.tMem - (d.tWeights + d.tKV)) < 1e-12);
    assert.ok(d.step >= d.tMem + d.tComm);
    assert.ok(d.step > 0 && d.ctx === 2048 + 256);
  });
  test('single-stream BF16 decode is memory-bound and dominated by weights', () => {
    const d = decodeStep({ model: llama8b, gpu: h100, tp: 1, wBytes: 2, kvBytes: 2, prompt: 2048, output: 512, batch: 1 });
    assert.equal(d.bound, 'weights');
    assert.ok(d.tWeights > d.tKV);
  });
  test('tensor parallelism reduces the weight read per GPU', () => {
    const one = decodeStep({ model: llama8b, gpu: h100, tp: 1, wBytes: 2, kvBytes: 2, prompt: 2048, output: 512, batch: 1 });
    const two = decodeStep({ model: llama8b, gpu: h100, tp: 8, wBytes: 2, kvBytes: 2, prompt: 2048, output: 512, batch: 1 });
    assert.ok(two.tWeights < one.tWeights); // ¼ still visible once comm/overhead are excluded
  });
});

describe('memory budgeting', () => {
  test('the default Lab setup (8B BF16 on 1×H100, b=32) fits with headroom', () => {
    const m = memory({ model: llama8b, gpu: h100, tp: 1, wBytes: 2, kvBytes: 2, prompt: 2048, output: 512, batch: 32 });
    assert.ok(m.fits);
    assert.ok(m.maxSeqs >= 32, `only ${m.maxSeqs} sequences fit`);
  });
  test('a 70B BF16 model does not fit on one RTX 4090', () => {
    const m = memory({ model: getModel('llama3-70b'), gpu: getGPU('rtx4090'), tp: 1, wBytes: 2, kvBytes: 2, prompt: 1024, output: 256, batch: 1 });
    assert.ok(!m.fits || m.maxSeqs < 1);
  });
});

describe('evaluate (end to end)', () => {
  test('throughput equals per-user speed × batch, and cost is finite', () => {
    const r = evaluate({ model: llama8b, gpu: h100, tp: 1, wBytes: 2, kvBytes: 2, prompt: 2048, output: 512, batch: 32 });
    assert.ok(Math.abs(r.total - r.perUser * 32) < 1e-6);
    assert.ok(r.ttft > 0 && r.e2e > r.ttft && r.perUser > 1 && r.perUser < 500);
    assert.ok(r.costPerM > 0 && r.step > 0);
  });
  test('bigger batch grows total throughput', () => {
    const b1 = evaluate({ model: llama8b, gpu: h100, tp: 1, wBytes: 2, kvBytes: 2, prompt: 2048, output: 512, batch: 1 });
    const b64 = evaluate({ model: llama8b, gpu: h100, tp: 1, wBytes: 2, kvBytes: 2, prompt: 2048, output: 512, batch: 64 });
    assert.ok(b64.total > b1.total);
  });
});

describe('capacity planning', () => {
  test('produces a deployment with at least the requested GPUs and a sane TPOT', () => {
    const p = plan({ model: getModel('llama3-70b'), gpu: h100, tp: 2, wBytes: 1, kvBytes: 1, prompt: 3000, output: 500, rps: 1, tpotSlo: 200, ttftSlo: 10, util: 0.7 });
    assert.ok(p.gpus >= 2 && Math.abs(p.gpus % 2) < 1e-9);
    assert.ok(p.tpot > 0 && p.costPerM > 0 && p.ttft > 0);
  });
  test('more traffic → more replicas', () => {
    const low = plan({ model: getModel('llama3-70b'), gpu: h100, tp: 2, wBytes: 1, kvBytes: 1, prompt: 3000, output: 500, rps: 0.1, tpotSlo: 200, ttftSlo: 10, util: 0.7 });
    const high = plan({ model: getModel('llama3-70b'), gpu: h100, tp: 2, wBytes: 1, kvBytes: 1, prompt: 3000, output: 500, rps: 50, tpotSlo: 200, ttftSlo: 10, util: 0.7 });
    assert.ok(high.gpus >= low.gpus);
  });
});

describe('calculator GPU list ↔ full catalog (no silent drift)', () => {
  const byCalc = new Map(ACCELS.filter((a) => a.calc).map((a) => [a.calc, a]));
  test('every GPU in gpus.ts comes from a catalog entry with that calc id', () => {
    assert.equal(GPUS.length, 11);
    assert.equal(byCalc.size, 11);
    for (const g of GPUS) assert.ok(byCalc.has(g.id), `no catalog entry with calc="${g.id}"`);
  });
  test('numeric specs match the catalog exactly', () => {
    for (const g of GPUS) {
      const a = byCalc.get(g.id);
      assert.ok(a, `${g.id} missing from catalog`);
      assert.equal(g.memGB, a.memGB, `${g.id} memGB`);
      assert.equal(g.bwTBs, a.bwTBs, `${g.id} bwTBs`);
      assert.equal(g.bf16TF, a.bf16 ?? 0, `${g.id} bf16TF`);
      assert.equal(g.fp8TF, a.fp8 ?? null, `${g.id} fp8TF`);
      assert.equal(g.fp4TF, a.fp4 ?? null, `${g.id} fp4TF`);
      assert.equal(g.int8TOPS, a.int8 ?? null, `${g.id} int8TOPS`);
      assert.equal(g.linkGBs, a.link?.GBs ?? 32, `${g.id} linkGBs`);
      assert.equal(g.sms, a.cores ?? 0, `${g.id} sms`);
      assert.equal(g.l2MB, a.sramMB ?? 0, `${g.id} l2MB`);
      assert.equal(g.smemKB, a.smemKB ?? 0, `${g.id} smemKB`);
      const want = a.price ? Math.round(((a.price[0] + a.price[1]) / 2) * 100) / 100 : 0;
      assert.equal(g.pricePerHr, want, `${g.id} pricePerHr`);
    }
  });
  test('getGPU resolves every id and ids are unique', () => {
    assert.equal(new Set(GPUS.map((g) => g.id)).size, GPUS.length);
    for (const g of GPUS) assert.equal(getGPU(g.id).id, g.id);
  });
});

describe('catalog sanity', () => {
  test('every chip has positive, finite specs and a source', () => {
    for (const a of ACCELS) {
      assert.ok(a.memGB > 0 && a.bwTBs > 0, `${a.id} must have memory + bandwidth`);
      assert.ok(Number.isFinite(a.bwTBs), `${a.id} bwTBs finite`);
      assert.ok((a.sources ?? []).length > 0, `${a.id} needs at least one source`);
    }
  });
  test('decode ceiling rises with bandwidth', () => {
    const w = 16.06e9; // Llama 8B in BF16
    const h1 = ACCELS.find((a) => a.calc === 'h100');
    const h2 = ACCELS.find((a) => a.calc === 'h200');
    assert.ok(h1 && h2, 'catalog needs calc ids h100/h200');
    assert.ok(decodeCeiling(h2, w) > decodeCeiling(h1, w));
  });
  test('priced catalog entries have a finite midpoint for cost math', () => {
    for (const a of ACCELS) {
      if (a.price) { const m = priceMid(a); assert.ok(m != null && m > 0 && Number.isFinite(m), `${a.id} price midpoint`); }
    }
  });
});

describe('MODELS catalog', () => {
  test('models are internally consistent', () => {
    for (const m of MODELS) {
      assert.ok(m.params > 0 && m.layers > 0 && m.hidden > 0, `${m.id} positive dims`);
      assert.ok(m.activeParams > 0 && m.activeParams <= m.params, `${m.id} active <= total`);
      if (m.experts) assert.ok(m.experts.active <= m.experts.total && m.experts.active >= 1, `${m.id} expert counts`);
      assert.ok(Number.isFinite(kvBytesPerToken(m, 2)), `${m.id} kv bytes finite`);
    }
  });
});
