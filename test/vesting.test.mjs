import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VestingSchedule } from '../src/utils/vesting.mjs';

describe('VestingSchedule (Unit)', () => {
  const opts = {
    totalAllocationWei: 1000000000000000000n, // 1 ETH
    startTimestampSec: 1000,
    cliffDurationSec: 500, // Cliff at 1500
    vestingDurationSec: 1000, // Ends at 2000
    revocable: true,
  };

  it('returns 0 vested before cliff timestamp', () => {
    const v = new VestingSchedule(opts);
    const res = v.calculateVestedAmount(1400);
    assert.equal(res.vestedWei, '0');
    assert.equal(res.status, 'CLIFF_PENDING');
  });

  it('calculates linear progress after cliff', () => {
    const v = new VestingSchedule(opts);
    const res = v.calculateVestedAmount(1500); // 50% elapsed
    assert.equal(res.vestedWei, '500000000000000000');
    assert.equal(res.status, 'VESTING');
  });

  it('returns 100% allocation after duration expires', () => {
    const v = new VestingSchedule(opts);
    const res = v.calculateVestedAmount(2500);
    assert.equal(res.vestedWei, opts.totalAllocationWei.toString());
    assert.equal(res.status, 'COMPLETED');
  });

  it('supports revocation when revocable is true', () => {
    const v = new VestingSchedule(opts);
    v.revoke();
    const res = v.calculateVestedAmount(1800);
    assert.equal(res.status, 'REVOKED');
    assert.equal(res.vestedWei, '0');
  });
});
