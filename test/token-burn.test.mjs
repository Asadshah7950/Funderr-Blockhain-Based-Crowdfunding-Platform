import { test, describe } from 'node:test';
import assert from 'node:assert';
import { TokenBurnAllocator } from '../src/utils/token-burn.mjs';

describe('TokenBurnAllocator', () => {
  test('calculates and tracks deflationary token burn allocations', () => {
    const allocator = new TokenBurnAllocator(150); // 1.5%
    const res1 = allocator.processTransaction(10000);
    assert.strictEqual(res1.burnAmount, 150);
    assert.strictEqual(res1.netAmount, 9850);
    assert.strictEqual(res1.cumulativeBurned, 150);

    const res2 = allocator.processTransaction(20000);
    assert.strictEqual(res2.burnAmount, 300);
    assert.strictEqual(res2.cumulativeBurned, 450);
  });
});
