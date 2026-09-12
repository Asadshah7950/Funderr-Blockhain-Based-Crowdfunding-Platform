/**
 * Token Bucket Rate Limiter for Funderr.
 *
 * Implements the Token Bucket algorithm for per-donor, per-campaign API rate limiting.
 * Provides smoother traffic shaping than the sliding-window rate limiter (which exists
 * in time-off-microservice) because it allows short bursts up to the bucket capacity.
 *
 * Algorithm:
 *  - Bucket starts full at `capacity` tokens.
 *  - Tokens refill at `refillRate` tokens/second continuously.
 *  - Each API call consumes `tokensPerRequest` tokens.
 *  - If insufficient tokens exist, the request is DENIED.
 *
 * @example
 *   const limiter = new TokenBucketLimiter({ capacity: 10, refillRate: 2 });
 *   const key = `donor:${donorAddress}:campaign:${campaignId}`;
 *   if (!limiter.consume(key)) throw new TooManyRequestsError();
 */

export class TooManyRequestsError extends Error {
  constructor(key, retryAfterMs) {
    super(`Rate limit exceeded for key "${key}". Retry after ${retryAfterMs}ms.`);
    this.name = 'TooManyRequestsError';
    this.key = key;
    this.retryAfterMs = retryAfterMs;
  }
}

export class TokenBucketLimiter {
  /**
   * @param {object} options
   * @param {number} options.capacity        - Maximum tokens the bucket can hold
   * @param {number} options.refillRate      - Tokens added per second
   * @param {number} [options.tokensPerRequest=1] - Tokens consumed per call
   */
  constructor(options = {}) {
    if (!options.capacity || !options.refillRate) {
      throw new TypeError('TokenBucketLimiter requires capacity and refillRate');
    }
    this._capacity = options.capacity;
    this._refillRate = options.refillRate;       // tokens/sec
    this._tokensPerRequest = options.tokensPerRequest ?? 1;
    /** @type {Map<string, {tokens: number, lastRefill: number}>} */
    this._buckets = new Map();
  }

  /**
   * Refill tokens for a bucket based on elapsed time since last refill.
   * @param {{ tokens: number, lastRefill: number }} bucket
   * @returns {{ tokens: number, lastRefill: number }}
   */
  _refill(bucket) {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000; // seconds
    const added = elapsed * this._refillRate;
    return {
      tokens: Math.min(this._capacity, bucket.tokens + added),
      lastRefill: now,
    };
  }

  /**
   * Attempt to consume tokens for a given key.
   * @param {string} key       - Unique bucket identifier (e.g. "donor:0xABC:campaign:123")
   * @param {number} [n]       - Tokens to consume (defaults to tokensPerRequest)
   * @returns {boolean} true if allowed, false if rate-limited
   */
  consume(key, n) {
    const cost = n ?? this._tokensPerRequest;
    let bucket = this._buckets.get(key) || { tokens: this._capacity, lastRefill: Date.now() };
    bucket = this._refill(bucket);

    if (bucket.tokens < cost) {
      this._buckets.set(key, bucket);
      return false;
    }

    bucket.tokens -= cost;
    this._buckets.set(key, bucket);
    return true;
  }

  /**
   * Get remaining tokens for a key without consuming any.
   * @param {string} key
   * @returns {number}
   */
  remaining(key) {
    const bucket = this._buckets.get(key);
    if (!bucket) return this._capacity;
    return Math.min(this._capacity, this._refill(bucket).tokens);
  }

  /**
   * Estimate milliseconds until at least `n` tokens are available.
   * @param {string} key
   * @param {number} [n]
   * @returns {number} ms until tokens available (0 if already available)
   */
  retryAfterMs(key, n) {
    const cost = n ?? this._tokensPerRequest;
    const avail = this.remaining(key);
    if (avail >= cost) return 0;
    const deficit = cost - avail;
    return Math.ceil((deficit / this._refillRate) * 1000);
  }

  /** Clear all bucket state (useful in tests). */
  clear() {
    this._buckets.clear();
  }

  /** Number of active buckets in memory. */
  get size() {
    return this._buckets.size;
  }
}
