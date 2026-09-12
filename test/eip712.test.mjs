import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  keccak256,
  encodeString,
  encodeUint256,
  encodeAddress,
  buildDomainSeparator,
  hashPledgeStruct,
  buildEip712Digest,
  pledgeDigest,
} from '../src/utils/eip712.mjs';

const DOMAIN = {
  name: 'Funderr',
  version: '1',
  chainId: 11155111, // Sepolia
  verifyingContract: '0x71C8418013F8934614f20C2075D658659C2A5235',
};

const PLEDGE = {
  donor: '0xAbCdEf0123456789012345678901234567890123',
  campaignId: 'camp-2026-alpha',
  amountWei: 5000000000000000n,   // 0.005 ETH
  deadline: 1893456000n,           // 2030-01-01
  nonce: 1n,
};

describe('EIP-712 Typed Data Utilities (Unit)', () => {
  describe('encodeUint256', () => {
    it('encodes zero as 32 zero bytes', () => {
      const encoded = encodeUint256(0n);
      assert.equal(encoded.length, 32);
      assert.ok(encoded.every(b => b === 0));
    });

    it('encodes max uint256 correctly', () => {
      const max = (2n ** 256n) - 1n;
      const encoded = encodeUint256(max);
      assert.equal(encoded.length, 32);
      assert.ok(encoded.every(b => b === 0xff));
    });
  });

  describe('encodeAddress', () => {
    it('encodes an address into 32 bytes with 12 leading zeros', () => {
      const encoded = encodeAddress('0xAbCdEf0123456789012345678901234567890123');
      assert.equal(encoded.length, 32);
      // First 12 bytes must be zero-padding
      for (let i = 0; i < 12; i++) assert.equal(encoded[i], 0);
    });

    it('throws on invalid address length', () => {
      assert.throws(() => encodeAddress('0xBadAddress'), TypeError);
    });
  });

  describe('buildDomainSeparator', () => {
    it('produces a 32-byte buffer', () => {
      const sep = buildDomainSeparator(DOMAIN);
      assert.equal(sep.length, 32);
    });

    it('is deterministic across calls', () => {
      const sep1 = buildDomainSeparator(DOMAIN);
      const sep2 = buildDomainSeparator(DOMAIN);
      assert.equal(sep1.toString('hex'), sep2.toString('hex'));
    });

    it('changes when any domain field changes', () => {
      const sep1 = buildDomainSeparator(DOMAIN);
      const sep2 = buildDomainSeparator({ ...DOMAIN, chainId: 1 });
      assert.notEqual(sep1.toString('hex'), sep2.toString('hex'));
    });
  });

  describe('hashPledgeStruct', () => {
    it('produces a 32-byte struct hash', () => {
      const hash = hashPledgeStruct(PLEDGE);
      assert.equal(hash.length, 32);
    });

    it('is deterministic for identical pledges', () => {
      const h1 = hashPledgeStruct(PLEDGE);
      const h2 = hashPledgeStruct(PLEDGE);
      assert.equal(h1.toString('hex'), h2.toString('hex'));
    });

    it('changes when pledge amount changes', () => {
      const h1 = hashPledgeStruct(PLEDGE);
      const h2 = hashPledgeStruct({ ...PLEDGE, amountWei: 1n });
      assert.notEqual(h1.toString('hex'), h2.toString('hex'));
    });
  });

  describe('pledgeDigest', () => {
    it('returns a 0x-prefixed 66-char hex string', () => {
      const digest = pledgeDigest(DOMAIN, PLEDGE);
      assert.ok(digest.startsWith('0x'));
      assert.equal(digest.length, 66);
    });

    it('is deterministic across environments', () => {
      const d1 = pledgeDigest(DOMAIN, PLEDGE);
      const d2 = pledgeDigest(DOMAIN, PLEDGE);
      assert.equal(d1, d2);
    });

    it('changes when donor changes', () => {
      const d1 = pledgeDigest(DOMAIN, PLEDGE);
      const d2 = pledgeDigest(DOMAIN, { ...PLEDGE, donor: '0x0000000000000000000000000000000000000001' });
      assert.notEqual(d1, d2);
    });
  });
});
