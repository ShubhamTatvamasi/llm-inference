/* Invariants for the KV cache service model. The diagram, the chapter's worked
   numbers and the cheat sheet all quote this same arithmetic. */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  prefillMs, kvGiB, reloadMs, localHit, effectiveTtftMs,
  ttftLocalMs, ttftSharedMs, gpuHoursSavedPerMillion, capacityGiB,
} from '../src/components/viz/cacheModel.ts';

const base = {
  promptTokens: 8000, prefillTps: 12000, kvKiB: 128,
  tierGBs: 50, reuse: 0.8, replicas: 8,
};

describe('KV cache service: request arithmetic', () => {
  test('8K tokens at 12k tok/s is about 667 ms of prefill', () => {
    assert.ok(Math.abs(prefillMs(base) - 666.6667) < 0.01);
  });
  test('8K tokens of 128 KiB/token is just under 1 GiB', () => {
    assert.ok(Math.abs(kvGiB(base) - 0.9765625) < 1e-9);
  });
  test('reload time is KV bytes divided by tier bandwidth', () => {
    assert.ok(Math.abs(reloadMs(base) - 19.53125) < 1e-6);
    assert.ok(reloadMs({ ...base, tierGBs: 7 }) > reloadMs(base));
    assert.ok(reloadMs({ ...base, kvKiB: 320 }) > reloadMs(base));
  });
  test('effective TTFT interpolates between prefill and reload', () => {
    assert.equal(effectiveTtftMs(base, 0), prefillMs(base));
    assert.equal(effectiveTtftMs(base, 1), reloadMs(base));
    assert.ok(effectiveTtftMs(base, 0.5) > reloadMs(base));
    assert.ok(effectiveTtftMs(base, 0.5) < prefillMs(base));
  });
});

describe('KV cache service: shared vs private', () => {
  test('a private cache loses the hit rate as replicas are added', () => {
    assert.equal(localHit({ ...base, replicas: 1 }), base.reuse);
    assert.equal(localHit({ ...base, replicas: 8 }), base.reuse / 8);
    assert.ok(localHit({ ...base, replicas: 16 }) < localHit(base));
  });
  test('one replica is the only case where local and shared agree', () => {
    const one = { ...base, replicas: 1 };
    assert.equal(ttftLocalMs(one), ttftSharedMs(one));
  });
  test('sharing beats a private cache whenever there is more than one replica', () => {
    for (const replicas of [2, 4, 8, 32]) {
      assert.ok(ttftSharedMs({ ...base, replicas }) < ttftLocalMs({ ...base, replicas }), `R=${replicas}`);
    }
  });
  test('a larger reuse share lowers shared TTFT', () => {
    assert.ok(ttftSharedMs({ ...base, reuse: 0.9 }) < ttftSharedMs({ ...base, reuse: 0.5 }));
  });
});

describe('KV cache service: what a hit is worth', () => {
  test('saved GPU time scales linearly with the hit rate', () => {
    const full = gpuHoursSavedPerMillion(base, 1);
    const half = gpuHoursSavedPerMillion(base, 0.5);
    assert.ok(Math.abs(full - 2 * half) < 1e-9);
    assert.ok(full > 0);
  });
  test('a reload slower than the prefill it replaces makes a hit a net loss', () => {
    const slow = { ...base, promptTokens: 1000, tierGBs: 0.5 };
    assert.ok(reloadMs(slow) > prefillMs(slow));
    assert.ok(gpuHoursSavedPerMillion(slow, 1) < 0);
  });
  test('cache capacity grows with the number of retained prefixes', () => {
    assert.ok(Math.abs(capacityGiB(1000, base) - 976.5625) < 1e-9);
    assert.equal(capacityGiB(0, base), 0);
  });
});
