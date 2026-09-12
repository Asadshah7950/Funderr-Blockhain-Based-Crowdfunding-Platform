export class CampaignFeeCalculator {
  constructor(options = {}) {
    // basis points: 500 = 5%, 300 = 3%, 150 = 1.5%
    this.standardFeeBps = options.standardFeeBps || 500;
    this.highTierThreshold = options.highTierThreshold || 50000;
    this.highTierFeeBps = options.highTierFeeBps || 300;
    this.maxFeeCap = options.maxFeeCap || 10000;
  }

  calculateFee(totalRaised) {
    if (totalRaised <= 0) return 0;
    const feeRateBps = totalRaised >= this.highTierThreshold ? this.highTierFeeBps : this.standardFeeBps;
    const calculatedFee = (totalRaised * feeRateBps) / 10000;
    return Math.min(this.maxFeeCap, Math.round(calculatedFee * 100) / 100);
  }

  calculateNetProceeds(totalRaised) {
    const fee = this.calculateFee(totalRaised);
    return Math.round((totalRaised - fee) * 100) / 100;
  }
}
