export class DisputeResolutionEngine {
  constructor(jurorThreshold = 3) {
    this.jurorThreshold = jurorThreshold;
    this.disputes = new Map();
  }

  openDispute(campaignId, reason, contestedAmount) {
    const disputeId = `disp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const dispute = {
      id: disputeId,
      campaignId,
      reason,
      contestedAmount,
      status: 'OPEN',
      votes: new Map(),
      verdict: null,
    };
    this.disputes.set(disputeId, dispute);
    return disputeId;
  }

  castVote(disputeId, jurorAddress, refundBackers) {
    const d = this.disputes.get(disputeId);
    if (!d) throw new Error('Dispute not found');
    if (d.status !== 'OPEN') throw new Error('Dispute is not open for voting');
    d.votes.set(jurorAddress.toLowerCase(), Boolean(refundBackers));

    if (d.votes.size >= this.jurorThreshold) {
      this._resolve(d);
    }
  }

  _resolve(dispute) {
    const refunds = Array.from(dispute.votes.values()).filter(Boolean).length;
    const release = dispute.votes.size - refunds;
    dispute.verdict = refunds > release ? 'REFUND_BACKERS' : 'RELEASE_FUNDS';
    dispute.status = 'RESOLVED';
  }

  getDispute(disputeId) {
    return this.disputes.get(disputeId);
  }
}
