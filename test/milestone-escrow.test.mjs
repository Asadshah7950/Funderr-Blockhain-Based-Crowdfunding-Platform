import { test, describe } from 'node:test';
import assert from 'node:assert';
import { MilestoneEscrow } from '../src/utils/milestone-escrow.mjs';

describe('MilestoneEscrow', () => {
  test('creates milestones and releases funds upon required vote threshold', () => {
    const escrow = new MilestoneEscrow(1000, 0.6);
    const m1 = escrow.addMilestone('Phase 1: Architecture Draft', 400);

    escrow.castVote(m1, '0xAAA', true);
    escrow.castVote(m1, '0xBBB', true);
    escrow.castVote(m1, '0xCCC', false); // 2/3 = 66.7% >= 60%

    const result = escrow.releaseMilestone(m1);
    assert.strictEqual(result.releasedAmount, 400);
    assert.strictEqual(result.remainingVault, 600);
  });

  test('rejects release when approval ratio falls below threshold', () => {
    const escrow = new MilestoneEscrow(1000, 0.6);
    const m1 = escrow.addMilestone('Phase 1', 300);

    escrow.castVote(m1, '0xAAA', true);
    escrow.castVote(m1, '0xBBB', false);
    escrow.castVote(m1, '0xCCC', false); // 1/3 = 33.3% < 60%

    assert.throws(() => escrow.releaseMilestone(m1), /Insufficient approval ratio/);
  });
});
