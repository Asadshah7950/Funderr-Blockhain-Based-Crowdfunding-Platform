/**
 * Cryptographic helpers for Funderr Web3 Crowdfunding Platform.
 * Provides HMAC-SHA256 pledge authorization tokens and canonical metadata digests.
 */
import crypto from 'node:crypto';

/**
 * Generate a deterministic canonical SHA-256 hash of campaign metadata for IPFS/Storage indexing.
 * Sorts keys recursively to ensure stability regardless of property order.
 */
export function hashCampaignMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    throw new TypeError('Metadata must be a non-null object');
  }
  const sortKeys = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = sortKeys(obj[key]);
        return result;
      }, {});
  };

  const canonicalJson = JSON.stringify(sortKeys(metadata));
  return crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}

/**
 * Generate a signed pledge authorization token using HMAC-SHA256.
 * @param {Object} pledge - { campaignId, donor, amountEth, timestamp, nonce }
 * @param {string} secretKey - Server secret key
 * @returns {string} Base64URL-encoded token containing payload and signature
 */
export function generatePledgeToken(pledge, secretKey) {
  if (!pledge || typeof pledge !== 'object') {
    throw new TypeError('Pledge payload must be an object');
  }
  if (!secretKey || typeof secretKey !== 'string') {
    throw new TypeError('Secret key must be a non-empty string');
  }

  const payload = {
    campaignId: pledge.campaignId,
    donor: (pledge.donor || '').toLowerCase(),
    amountEth: pledge.amountEth,
    timestamp: pledge.timestamp || Date.now(),
    nonce: pledge.nonce || crypto.randomBytes(8).toString('hex'),
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify a pledge authorization token against expected secret and freshness window.
 * @param {string} token - Signed token string (payloadB64.signature)
 * @param {string} secretKey - Server secret key
 * @param {number} [maxAgeMs=3600000] - Allowed token age in milliseconds (default 1h)
 * @returns {{ valid: boolean, payload?: Object, error?: string }}
 */
export function verifyPledgeToken(token, secretKey, maxAgeMs = 3600000) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Invalid token format' };
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [payloadB64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secretKey)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, error: 'Invalid signature' };
  }

  try {
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);

    if (Date.now() - payload.timestamp > maxAgeMs) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Corrupted payload' };
  }
}
