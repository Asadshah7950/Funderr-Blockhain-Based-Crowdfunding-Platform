import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PermitHelper } from '../src/utils/permit-helper.mjs';

describe('PermitHelper', () => {
  test('computes deterministic domain separator and permit hash', () => {
    const domain = PermitHelper.createDomainSeparator('FunderrToken', '1', 1, '0xContract123');
    const hash = PermitHelper.hashPermit('0xAlice', '0xBob', 500, 0, 1893456000, domain);
    assert.strictEqual(hash.length, 64);
  });

  test('validates deadline boundary conditions', () => {
    const future = Date.now() + 10000;
    const past = Date.now() - 10000;
    assert.strictEqual(PermitHelper.isPermitValid(future), true);
    assert.strictEqual(PermitHelper.isPermitValid(past), false);
  });
});
