export class MilestoneEscrow {
  constructor(totalDeposit = 0, requiredVoteRatio = 0.6) {
    this.vaultBalance = totalDeposit;
    this.requiredVoteRatio = requiredVoteRatio;
    this.milestones = [];
  }

  addMilestone(description, amount) {
    if (amount > this.vaultBalance) {
      throw new Error('Milestone amount exceeds remaining vault balance');
    }
    const milestone = {
      id: this.milestones.length + 1,
      description,
      amount,
      released: false,
      votes: new Map(),
    };
    this.milestones.push(milestone);
    return milestone.id;
  }

  castVote(milestoneId, voterAddress, approve) {
    const m = this.milestones.find((x) => x.id === milestoneId);
    if (!m) throw new Error('Milestone not found');
    if (m.released) throw new Error('Milestone already released');
    m.votes.set(voterAddress.toLowerCase(), Boolean(approve));
  }

  releaseMilestone(milestoneId) {
    const m = this.milestones.find((x) => x.id === milestoneId);
    if (!m) throw new Error('Milestone not found');
    if (m.released) throw new Error('Milestone already released');

    const totalVotes = m.votes.size;
    if (totalVotes === 0) throw new Error('No votes cast for milestone');

    const approvals = Array.from(m.votes.values()).filter(Boolean).length;
    const approvalRatio = approvals / totalVotes;

    if (approvalRatio < this.requiredVoteRatio) {
      throw new Error(`Insufficient approval ratio: ${(approvalRatio * 100).toFixed(1)}% < ${(this.requiredVoteRatio * 100).toFixed(1)}%`);
    }

    m.released = true;
    this.vaultBalance -= m.amount;
    return { releasedAmount: m.amount, remainingVault: this.vaultBalance };
  }
}
