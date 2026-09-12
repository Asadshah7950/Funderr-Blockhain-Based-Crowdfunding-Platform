import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CampaignStatus,
  CampaignTransitionError,
  transition,
  allowedTransitions,
  isTerminal,
  Campaign,
} from '../src/utils/campaign-state.mjs';

describe('Campaign State Machine (Unit)', () => {

  describe('transition()', () => {
    it('allows DRAFT → ACTIVE', () => {
      assert.equal(transition(CampaignStatus.DRAFT, CampaignStatus.ACTIVE), CampaignStatus.ACTIVE);
    });

    it('allows DRAFT → CANCELLED', () => {
      assert.equal(transition(CampaignStatus.DRAFT, CampaignStatus.CANCELLED), CampaignStatus.CANCELLED);
    });

    it('allows ACTIVE → FUNDED', () => {
      assert.equal(transition(CampaignStatus.ACTIVE, CampaignStatus.FUNDED), CampaignStatus.FUNDED);
    });

    it('allows ACTIVE → EXPIRED', () => {
      assert.equal(transition(CampaignStatus.ACTIVE, CampaignStatus.EXPIRED), CampaignStatus.EXPIRED);
    });

    it('allows FUNDED → COMPLETED', () => {
      assert.equal(transition(CampaignStatus.FUNDED, CampaignStatus.COMPLETED), CampaignStatus.COMPLETED);
    });

    it('rejects DRAFT → COMPLETED (skipping states)', () => {
      assert.throws(
        () => transition(CampaignStatus.DRAFT, CampaignStatus.COMPLETED),
        CampaignTransitionError
      );
    });

    it('rejects COMPLETED → ACTIVE (backwards)', () => {
      assert.throws(
        () => transition(CampaignStatus.COMPLETED, CampaignStatus.ACTIVE),
        CampaignTransitionError
      );
    });

    it('rejects CANCELLED → ACTIVE (resurrection)', () => {
      assert.throws(
        () => transition(CampaignStatus.CANCELLED, CampaignStatus.ACTIVE),
        CampaignTransitionError
      );
    });
  });

  describe('allowedTransitions()', () => {
    it('returns valid next states for ACTIVE', () => {
      const next = allowedTransitions(CampaignStatus.ACTIVE);
      assert.ok(next.includes(CampaignStatus.FUNDED));
      assert.ok(next.includes(CampaignStatus.CANCELLED));
      assert.ok(next.includes(CampaignStatus.EXPIRED));
    });

    it('returns empty array for terminal states', () => {
      assert.deepEqual(allowedTransitions(CampaignStatus.COMPLETED), []);
      assert.deepEqual(allowedTransitions(CampaignStatus.CANCELLED), []);
      assert.deepEqual(allowedTransitions(CampaignStatus.EXPIRED), []);
    });
  });

  describe('isTerminal()', () => {
    it('returns true for COMPLETED, CANCELLED, EXPIRED', () => {
      assert.equal(isTerminal(CampaignStatus.COMPLETED), true);
      assert.equal(isTerminal(CampaignStatus.CANCELLED), true);
      assert.equal(isTerminal(CampaignStatus.EXPIRED), true);
    });

    it('returns false for non-terminal statuses', () => {
      assert.equal(isTerminal(CampaignStatus.DRAFT), false);
      assert.equal(isTerminal(CampaignStatus.ACTIVE), false);
      assert.equal(isTerminal(CampaignStatus.FUNDED), false);
    });
  });

  describe('Campaign entity', () => {
    it('starts in DRAFT status', () => {
      const c = new Campaign('camp-1');
      assert.equal(c.status, CampaignStatus.DRAFT);
    });

    it('supports chained transitions', () => {
      const c = new Campaign('camp-2');
      c.transitionTo(CampaignStatus.ACTIVE).transitionTo(CampaignStatus.FUNDED).transitionTo(CampaignStatus.COMPLETED);
      assert.equal(c.status, CampaignStatus.COMPLETED);
    });

    it('records full history', () => {
      const c = new Campaign('camp-3');
      c.transitionTo(CampaignStatus.ACTIVE);
      c.transitionTo(CampaignStatus.CANCELLED);
      assert.equal(c.history.length, 3);
      assert.equal(c.history[0].status, CampaignStatus.DRAFT);
      assert.equal(c.history[2].status, CampaignStatus.CANCELLED);
    });

    it('isTerminal returns correct value', () => {
      const c = new Campaign('camp-4');
      assert.equal(c.isTerminal, false);
      c.transitionTo(CampaignStatus.ACTIVE).transitionTo(CampaignStatus.EXPIRED);
      assert.equal(c.isTerminal, true);
    });

    it('throws on invalid transition', () => {
      const c = new Campaign('camp-5');
      assert.throws(() => c.transitionTo(CampaignStatus.COMPLETED), CampaignTransitionError);
    });

    it('throws TypeError for unknown initial status', () => {
      assert.throws(() => new Campaign('c', 'LIMBO'), TypeError);
    });
  });
});
