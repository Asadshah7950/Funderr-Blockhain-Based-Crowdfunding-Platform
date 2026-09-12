/**
 * Continuous Linear Token Vesting Engine with Cliff.
 * Calculates vested token distributions for project milestone beneficiaries.
 */

export class VestingSchedule {
  constructor(options) {
    const { totalAllocationWei, startTimestampSec, cliffDurationSec, vestingDurationSec, revocable = true } = options;
    if (!totalAllocationWei || !startTimestampSec || !vestingDurationSec) {
      throw new TypeError('Missing required vesting parameters');
    }
    this.totalAllocation = BigInt(totalAllocationWei);
    this.start = BigInt(startTimestampSec);
    this.cliff = this.start + BigInt(cliffDurationSec || 0);
    this.duration = BigInt(vestingDurationSec);
    this.end = this.start + this.duration;
    this.revocable = Boolean(revocable);
    this.revoked = false;
  }

  calculateVestedAmount(currentTimestampSec) {
    if (this.revoked) return { vestedWei: '0', status: 'REVOKED' };
    const now = BigInt(currentTimestampSec);

    // Before cliff — 0 vested
    if (now < this.cliff) {
      return { vestedWei: '0', status: 'CLIFF_PENDING' };
    }

    // Past full vesting duration — 100% vested
    if (now >= this.end) {
      return { vestedWei: this.totalAllocation.toString(), status: 'COMPLETED' };
    }

    // Linear continuous interpolation
    const elapsed = now - this.start;
    const vested = (this.totalAllocation * elapsed) / this.duration;
    return { vestedWei: vested.toString(), status: 'VESTING' };
  }

  revoke() {
    if (!this.revocable) throw new Error('Schedule is non-revocable');
    this.revoked = true;
  }
}
