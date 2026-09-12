import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EscrowSchedule } from '../src/utils/escrow-timelock.mjs';

describe('EscrowSchedule (Unit)', () => {
  const tranches = [
    { id: 't1', basisPoints: 3000, unlockTimestampSec: 1000 },
    { id: 't2', basisPoints: 3000, unlockTimestampSec: 2000 },
    { id: 't3', basisPoints: 4000, unlockTimestampSec: 3000 },
  ];
  const total = 1000000000000000000n; // 1 ETH

  it('rejects tranche configs that do not sum to 10000 bps', () => {
    assert.throws(
      () => new EscrowSchedule(total, [{ id: 'bad', basisPoints: 5000, unlockTimestampSec: 100 }]),
      /sum to 10000/
    );
  });

  it('unlocks 0 wei before any timestamp', () => {
    const esc = new EscrowSchedule(total, tranches);
    const res = esc.calculateUnlocks(500);
    assert.equal(res.totalUnlockedWei, '0');
    assert.equal(res.unlockedTranches.length, 0);
  });

  it('unlocks first tranche after first timestamp', () => {
    const esc = new EscrowSchedule(total, tranches);
    const res = esc.calculateUnlocks(1500);
    assert.equal(res.unlockedTranches.length, 1);
    assert.equal(res.totalUnlockedWei, '300000000000000000');
  });

  it('unlocks all tranches when all timestamps pass', () => {
    const esc = new EscrowSchedule(total, tranches);
    const res = esc.calculateUnlocks(4000);
    assert.equal(res.unlockedTranches.length, 3);
    assert.equal(res.totalUnlockedWei, total.toString());
  });

  it('freezes unlocks during dispute', () => {
    const esc = new EscrowSchedule(total, tranches);
    esc.freeze();
    const res = esc.calculateUnlocks(4000);
    assert.equal(res.status, 'FROZEN');
    assert.equal(res.totalUnlockedWei, '0');
  });
});
