/**
 * Escrow Tranche Timelock Calculator.
 * Computes progressive milestone unlock schedules and handles emergency dispute freezes.
 */

export class EscrowSchedule {
  constructor(totalAmountWei, tranches) {
    if (!Array.isArray(tranches) || tranches.length === 0) {
      throw new TypeError('Tranches must be a non-empty array');
    }
    const totalBps = tranches.reduce((sum, t) => sum + t.basisPoints, 0);
    if (totalBps !== 10000) {
      throw new Error(`Tranche basis points must sum to 10000 (got ${totalBps})`);
    }
    this.totalAmount = BigInt(totalAmountWei);
    this.tranches = tranches;
    this.isFrozen = false;
  }

  calculateUnlocks(currentTimestampSec) {
    if (this.isFrozen) {
      return { totalUnlockedWei: '0', unlockedTranches: [], status: 'FROZEN' };
    }
    let totalUnlocked = 0n;
    const unlocked = [];

    for (const [index, t] of this.tranches.entries()) {
      if (currentTimestampSec >= t.unlockTimestampSec) {
        const trancheAmount = (this.totalAmount * BigInt(t.basisPoints)) / 10000n;
        totalUnlocked += trancheAmount;
        unlocked.push({ index, id: t.id, amountWei: trancheAmount.toString() });
      }
    }

    return {
      totalUnlockedWei: totalUnlocked.toString(),
      unlockedTranches: unlocked,
      status: 'ACTIVE',
    };
  }

  freeze() {
    this.isFrozen = true;
  }

  unfreeze() {
    this.isFrozen = false;
  }
}
