import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateEip1559Fees, suggestTiers, gweiToWei, FEE_PROFILES } from '../src/utils/gas-oracle.mjs';

describe('EIP-1559 Gas Oracle (Unit)', () => {
  const sampleBaseFee = 30000000000n; // 30 Gwei

  it('converts gwei to wei accurately', () => {
    assert.equal(gweiToWei(1.5), 1500000000n);
  });

  it('calculates STANDARD fee profile accurately', () => {
    const fees = calculateEip1559Fees(sampleBaseFee, 'STANDARD');
    assert.equal(fees.tier, 'STANDARD');
    assert.equal(fees.maxPriorityFeePerGas, '2000000000');
    assert.ok(BigInt(fees.maxFeePerGas) > sampleBaseFee);
  });

  it('FAST tier provides higher priority fee than SLOW', () => {
    const slow = calculateEip1559Fees(sampleBaseFee, 'SLOW');
    const fast = calculateEip1559Fees(sampleBaseFee, 'FAST');
    assert.ok(BigInt(fast.maxPriorityFeePerGas) > BigInt(slow.maxPriorityFeePerGas));
    assert.ok(BigInt(fast.maxFeePerGas) > BigInt(slow.maxFeePerGas));
  });

  it('computes accurate estimated transaction cost', () => {
    const fees = calculateEip1559Fees(sampleBaseFee, 'STANDARD');
    const cost = fees.estimatedCostForGas(21000);
    assert.equal(BigInt(cost), BigInt(fees.maxFeePerGas) * 21000n);
  });

  it('suggestTiers outputs all three profiles', () => {
    const tiers = suggestTiers(sampleBaseFee);
    assert.ok(tiers.slow);
    assert.ok(tiers.standard);
    assert.ok(tiers.fast);
  });

  it('throws TypeError for unknown tier', () => {
    assert.throws(() => calculateEip1559Fees(sampleBaseFee, 'ULTRA'), TypeError);
  });
});
