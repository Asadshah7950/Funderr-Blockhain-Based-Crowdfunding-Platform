import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ReentrancyGuard, ReentrancyError } from '../src/utils/reentrancy-guard.mjs';

describe('ReentrancyGuard (Unit)', () => {
  it('executes async operation successfully', async () => {
    const guard = new ReentrancyGuard();
    const result = await guard.runExclusive('k1', async () => 'done');
    assert.equal(result, 'done');
    assert.equal(guard.isLocked('k1'), false);
  });

  it('rejects re-entrant call with same key', async () => {
    const guard = new ReentrancyGuard();
    let reentrancyCaught = false;

    await guard.runExclusive('reentrant-test', async () => {
      try {
        await guard.runExclusive('reentrant-test', async () => 'nested');
      } catch (err) {
        if (err instanceof ReentrancyError) reentrancyCaught = true;
      }
    });

    assert.equal(reentrancyCaught, true);
  });

  it('releases lock even on thrown error', async () => {
    const guard = new ReentrancyGuard();
    await assert.rejects(
      () => guard.runExclusive('fail-key', async () => { throw new Error('boom'); }),
      { message: 'boom' }
    );
    assert.equal(guard.isLocked('fail-key'), false);
  });

  it('allows distinct keys concurrently', async () => {
    const guard = new ReentrancyGuard();
    const p1 = guard.runExclusive('k1', async () => 10);
    const p2 = guard.runExclusive('k2', async () => 20);
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1, 10);
    assert.equal(r2, 20);
  });
});
