import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ReentrancyGuard } from '../src/utils/reentrancy-guard.mjs';

describe('ReentrancyGuard', () => {
  test('executes normal asynchronous operations cleanly', async () => {
    const guard = new ReentrancyGuard();
    const res = await guard.run(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 'ok';
    });
    assert.strictEqual(res, 'ok');
    assert.strictEqual(guard.isLocked(), false);
  });

  test('reentrancy attempts throw ReentrancyGuard error', async () => {
    const guard = new ReentrancyGuard();
    await assert.rejects(async () => {
      await guard.run(async () => {
        // Attempt recursive call while locked
        await guard.run(async () => 'forbidden');
      });
    }, /ReentrancyGuard: reentrant call detected/);
    assert.strictEqual(guard.isLocked(), false);
  });
});
