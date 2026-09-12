import { test, describe } from 'node:test';
import assert from 'node:assert';
import { DisputeResolutionEngine } from '../src/utils/dispute-resolution.mjs';

describe('DisputeResolutionEngine', () => {
  test('automatically resolves dispute when juror threshold is reached', () => {
    const engine = new DisputeResolutionEngine(3);
    const id = engine.openDispute('camp-1', 'Deliverables not met', 5000);

    engine.castVote(id, '0xJuror1', true);
    engine.castVote(id, '0xJuror2', true);
    engine.castVote(id, '0xJuror3', false);

    const dispute = engine.getDispute(id);
    assert.strictEqual(dispute.status, 'RESOLVED');
    assert.strictEqual(dispute.verdict, 'REFUND_BACKERS');
  });
});
