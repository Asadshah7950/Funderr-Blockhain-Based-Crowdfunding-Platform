/**
 * Async Re-entrancy Guard for Web3 pledge state transitions.
 * Prevents double-spending, race conditions, and recursive execution in asynchronous workflows.
 */

export class ReentrancyError extends Error {
  constructor(key) {
    super(`Re-entrancy detected for execution context "${key}". Concurrent access denied.`);
    this.name = 'ReentrancyError';
    this.key = key;
  }
}

export class ReentrancyGuard {
  constructor() {
    this._lockedKeys = new Set();
  }

  async runExclusive(key, asyncFn) {
    if (!key || typeof key !== 'string') {
      throw new TypeError('Lock key must be a non-empty string');
    }
    if (this._lockedKeys.has(key)) {
      throw new ReentrancyError(key);
    }
    this._lockedKeys.add(key);
    try {
      return await asyncFn();
    } finally {
      this._lockedKeys.delete(key);
    }
  }

  isLocked(key) {
    return this._lockedKeys.has(key);
  }

  get activeLocksCount() {
    return this._lockedKeys.size;
  }
}
