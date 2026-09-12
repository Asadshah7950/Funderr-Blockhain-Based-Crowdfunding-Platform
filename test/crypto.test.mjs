import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashCampaignMetadata,
  generatePledgeToken,
  verifyPledgeToken,
} from '../src/utils/crypto.mjs';

describe('Cryptographic Helpers (Unit)', () => {
  const secretKey = 'test-super-secret-signing-key';

  describe('hashCampaignMetadata', () => {
    it('generates consistent SHA-256 hash regardless of object key order', () => {
      const metaA = { title: 'Medical Relief', targetEth: 10, category: 'Health' };
      const metaB = { category: 'Health', title: 'Medical Relief', targetEth: 10 };
      
      const hashA = hashCampaignMetadata(metaA);
      const hashB = hashCampaignMetadata(metaB);

      assert.equal(hashA, hashB);
      assert.equal(hashA.length, 64);
    });

    it('produces different hashes for distinct metadata', () => {
      const hash1 = hashCampaignMetadata({ title: 'Campaign 1' });
      const hash2 = hashCampaignMetadata({ title: 'Campaign 2' });
      assert.notEqual(hash1, hash2);
    });
  });

  describe('generatePledgeToken & verifyPledgeToken', () => {
    it('generates a valid token and successfully verifies it', () => {
      const pledge = {
        campaignId: 'camp-1234',
        donor: '0x71C8418013F8934614f20C2075D658659C2A5235',
        amountEth: 2.5,
        timestamp: Date.now(),
      };

      const token = generatePledgeToken(pledge, secretKey);
      assert.ok(typeof token === 'string' && token.includes('.'));

      const result = verifyPledgeToken(token, secretKey);
      assert.equal(result.valid, true);
      assert.equal(result.payload.campaignId, 'camp-1234');
      assert.equal(result.payload.donor, '0x71c8418013f8934614f20c2075d658659c2a5235');
      assert.equal(result.payload.amountEth, 2.5);
    });

    it('rejects tokens signed with different secret key', () => {
      const pledge = { campaignId: 'c1', donor: '0x123', amountEth: 1 };
      const token = generatePledgeToken(pledge, secretKey);
      const result = verifyPledgeToken(token, 'different-wrong-secret');

      assert.equal(result.valid, false);
      assert.equal(result.error, 'Invalid signature');
    });

    it('detects tampered payload', () => {
      const pledge = { campaignId: 'c1', donor: '0x123', amountEth: 1 };
      const token = generatePledgeToken(pledge, secretKey);
      const [payloadB64, sig] = token.split('.');
      
      const tamperedPayload = Buffer.from(
        JSON.stringify({ campaignId: 'c1', donor: '0x123', amountEth: 9999 })
      ).toString('base64url');

      const tamperedToken = `${tamperedPayload}.${sig}`;
      const result = verifyPledgeToken(tamperedToken, secretKey);

      assert.equal(result.valid, false);
      assert.equal(result.error, 'Invalid signature');
    });

    it('rejects expired tokens when beyond maxAgeMs', () => {
      const oldPledge = {
        campaignId: 'c1',
        donor: '0x123',
        amountEth: 1,
        timestamp: Date.now() - 5000,
      };
      const token = generatePledgeToken(oldPledge, secretKey);
      const result = verifyPledgeToken(token, secretKey, 2000);

      assert.equal(result.valid, false);
      assert.equal(result.error, 'Token expired');
    });

    it('rejects invalid or malformed tokens', () => {
      assert.equal(verifyPledgeToken('random-garbage', secretKey).valid, false);
      assert.equal(verifyPledgeToken(null, secretKey).valid, false);
      assert.equal(verifyPledgeToken('', secretKey).valid, false);
    });
  });
});
