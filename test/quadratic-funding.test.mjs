import { test, describe } from 'node:test';
import assert from 'node:assert';
import { QuadraticFundingPool } from '../src/utils/quadratic-funding.mjs';

describe('QuadraticFundingPool', () => {
  test('allocates matching funds according to quadratic formula', () => {
    const qf = new QuadraticFundingPool(1000);
    // Project A: 1 donation of 100 -> (sqrt(100))^2 = 100
    qf.addContribution('ProjectA', '0xUser1', 100);

    // Project B: 10 donations of 10 -> (10 * sqrt(10))^2 = 100 * 10 = 1000
    for (let i = 0; i < 10; i++) {
      qf.addContribution('ProjectB', `0xDonor${i}`, 10);
    }

    const allocs = qf.computeAllocations();
    // Project B receives significantly higher share due to broader donor count
    assert(allocs.get('ProjectB') > allocs.get('ProjectA'));
    const total = allocs.get('ProjectA') + allocs.get('ProjectB');
    assert(Math.abs(total - 1000) < 1.0);
  });
});
