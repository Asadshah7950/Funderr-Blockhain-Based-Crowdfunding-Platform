import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TokenBucketLimiter, TooManyRequestsError } from '../src/utils/token-bucket.mjs';

describe('TokenBucketLimiter (Unit)', () => {
  let limiter;

  beforeEach(() => {
    limiter = new TokenBucketLimiter({ capacity: 5, refillRate: 1 });
  });

  describe('constructor', () => {
    it('throws TypeError when capacity or refillRate is missing', () => {
      assert.throws(() => new TokenBucketLimiter({ capacity: 5 }), TypeError);
      assert.throws(() => new TokenBucketLimiter({ refillRate: 1 }), TypeError);
    });
  });

  describe('consume()', () => {
    it('allows requests up to capacity', () => {
      const key = 'donor:abc';
      for (let i = 0; i < 5; i++) {
        assert.equal(limiter.consume(key), true);
      }
    });

    it('denies request when bucket is empty', () => {
      const key = 'donor:xyz';
      for (let i = 0; i < 5; i++) limiter.consume(key);
      assert.equal(limiter.consume(key), false);
    });

    it('isolates buckets per key', () => {
      for (let i = 0; i < 5; i++) limiter.consume('donor:a');
      assert.equal(limiter.consume('donor:b'), true);
    });

    it('fresh bucket for unknown key starts at capacity', () => {
      assert.equal(limiter.consume('brand-new-key'), true);
    });
  });

  describe('remaining()', () => {
    it('returns full capacity for unseen key', () => {
      assert.equal(limiter.remaining('unseen'), 5);
    });

    it('returns reduced count after consumption', () => {
      limiter.consume('key');
      limiter.consume('key');
      const r = limiter.remaining('key');
      assert.ok(r <= 3 && r >= 2);
    });
  });

  describe('retryAfterMs()', () => {
    it('returns 0 when tokens are available', () => {
      assert.equal(limiter.retryAfterMs('new-key'), 0);
    });

    it('returns positive ms when bucket is empty', () => {
      const key = 'throttled';
      for (let i = 0; i < 5; i++) limiter.consume(key);
      const delay = limiter.retryAfterMs(key);
      assert.ok(delay > 0);
    });
  });

  describe('clear()', () => {
    it('removes all bucket state', () => {
      limiter.consume('key-a');
      limiter.consume('key-b');
      assert.equal(limiter.size, 2);
      limiter.clear();
      assert.equal(limiter.size, 0);
    });
  });
});
