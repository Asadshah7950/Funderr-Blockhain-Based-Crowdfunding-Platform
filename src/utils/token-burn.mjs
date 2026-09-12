export class TokenBurnAllocator {
  constructor(burnRateBps = 100) { // 1% = 100 bps
    this.burnRateBps = burnRateBps;
    this.totalBurned = 0;
  }

  calculateBurn(transactionAmount) {
    if (transactionAmount <= 0) return 0;
    return Math.floor((transactionAmount * this.burnRateBps) / 10000);
  }

  processTransaction(amount) {
    const burn = this.calculateBurn(amount);
    const netAmount = amount - burn;
    this.totalBurned += burn;
    return { netAmount, burnAmount: burn, cumulativeBurned: this.totalBurned };
  }
}
