export class QuadraticFundingPool {
  constructor(matchingPoolAmount = 0) {
    this.matchingPoolAmount = matchingPoolAmount;
    this.contributionsByProject = new Map();
  }

  addContribution(projectId, contributorAddress, amount) {
    if (amount <= 0) throw new Error('Contribution amount must be positive');
    if (!this.contributionsByProject.has(projectId)) {
      this.contributionsByProject.set(projectId, []);
    }
    this.contributionsByProject.get(projectId).push({
      contributor: contributorAddress.toLowerCase(),
      amount,
    });
  }

  computeAllocations() {
    const projectWeights = new Map();
    let totalWeightSum = 0;

    for (const [projectId, contribs] of this.contributionsByProject.entries()) {
      let sumSqrt = 0;
      for (const c of contribs) {
        sumSqrt += Math.sqrt(c.amount);
      }
      const weight = Math.pow(sumSqrt, 2);
      projectWeights.set(projectId, weight);
      totalWeightSum += weight;
    }

    const allocations = new Map();
    for (const [projectId, weight] of projectWeights.entries()) {
      const share = totalWeightSum > 0 ? (weight / totalWeightSum) * this.matchingPoolAmount : 0;
      allocations.set(projectId, Number(share.toFixed(4)));
    }
    return allocations;
  }
}
