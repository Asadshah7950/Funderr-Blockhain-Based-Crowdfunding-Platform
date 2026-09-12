import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  isValidEthAddress,
  formatEthAddress,
  validateCampaignGoal,
  sanitizeCampaignInput,
} from '../src/utils/validators.mjs';

describe('Validators & Sanitization (Unit)', () => {
  describe('validateEmail', () => {
    it('accepts valid email addresses', () => {
      assert.equal(validateEmail('test@example.com'), true);
      assert.equal(validateEmail('user.name+tag@sub.domain.org'), true);
    });

    it('rejects invalid email formats', () => {
      assert.equal(validateEmail('invalid-email'), false);
      assert.equal(validateEmail('user@'), false);
      assert.equal(validateEmail('@domain.com'), false);
      assert.equal(validateEmail(null), false);
    });
  });

  describe('isValidEthAddress', () => {
    it('validates 40-character hex ethereum addresses with 0x prefix', () => {
      assert.equal(isValidEthAddress('0x71C8418013F8934614f20C2075D658659C2A5235'), true);
      assert.equal(isValidEthAddress('0x0000000000000000000000000000000000000000'), true);
    });

    it('rejects malformed ethereum addresses', () => {
      assert.equal(isValidEthAddress('0xinvalid'), false);
      assert.equal(isValidEthAddress('71C8418013F8934614f20C2075D658659C2A5235'), false);
      assert.equal(isValidEthAddress('0x123'), false);
      assert.equal(isValidEthAddress(null), false);
    });
  });

  describe('formatEthAddress', () => {
    it('shortens valid address to 0x1234...abcd format', () => {
      const formatted = formatEthAddress('0x71C8418013F8934614f20C2075D658659C2A5235');
      assert.equal(formatted, '0x71C8...5235');
    });

    it('returns empty string on invalid address', () => {
      assert.equal(formatEthAddress('bad-address'), '');
    });
  });

  describe('validateCampaignGoal', () => {
    it('validates positive numeric amounts within reasonable bounds', () => {
      const result = validateCampaignGoal('5.5');
      assert.equal(result.valid, true);
      assert.equal(result.value, 5.5);
    });

    it('rejects negative numbers and non-numeric strings', () => {
      assert.equal(validateCampaignGoal('-1').valid, false);
      assert.equal(validateCampaignGoal('zero').valid, false);
    });

    it('rejects values exceeding maximum limit', () => {
      assert.equal(validateCampaignGoal('500000').valid, false);
    });
  });

  describe('sanitizeCampaignInput', () => {
    it('trims whitespace and validates minimum lengths', () => {
      const sanitized = sanitizeCampaignInput('   Solar Clean Water   ', '  Providing clean water to underserved villages across the globe.  ');
      assert.equal(sanitized.title, 'Solar Clean Water');
      assert.equal(sanitized.isValid, true);
    });

    it('flags titles or descriptions that are too short', () => {
      const sanitized = sanitizeCampaignInput('ab', 'short');
      assert.equal(sanitized.isValid, false);
    });
  });
});
