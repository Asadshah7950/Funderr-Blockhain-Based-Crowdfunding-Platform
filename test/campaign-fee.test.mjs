import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CampaignFeeCalculator } from '../src/utils/campaign-fee.mjs';

describe('CampaignFeeCalculator', () => {
  test('applies standard basis point fee for normal tiers', () => {
    const calc = new CampaignFeeCalculator();
    // 5% of 10,000 = 500
    assert.strictEqual(calc.calculateFee(10000), 500);
    assert.strictEqual(calc.calculateNetProceeds(10000), 9500);
  });

  test('applies reduced rate for high tier campaigns and respects cap', () => {
    const calc = new CampaignFeeCalculator({ maxFeeCap: 2000 });
    // 3% of 60,000 = 1800
    assert.strictEqual(calc.calculateFee(60000), 1800);
    // 3% of 100,000 = 3000 -> capped at 2000
    assert.strictEqual(calc.calculateFee(100000), 2000);
  });
});
