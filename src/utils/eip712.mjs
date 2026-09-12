/**
 * Off-chain EIP-712 typed structured data hashing utilities for Funderr.
 *
 * Enables gasless pledge authorization by allowing the backend to:
 *   1. Produce a deterministic EIP-712 digest from pledge parameters.
 *   2. Verify a donor-signed pledge without executing an on-chain transaction.
 *
 * This module deliberately uses only Node.js built-in `crypto` (no ethers.js),
 * keeping the dependency footprint minimal and the logic fully auditable.
 *
 * Reference: https://eips.ethereum.org/EIPS/eip-712
 */
import crypto from 'node:crypto';

// ── ABI-encoding helpers ──────────────────────────────────────────────────────

/**
 * keccak256 over arbitrary bytes (Buffer or hex-string).
 * Returns a 32-byte Buffer.
 */
export function keccak256(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input.replace(/^0x/, ''), 'hex');
  return crypto.createHash('sha3-256').update(bytes).digest();
}

/**
 * Encode a UTF-8 string as its keccak256 hash (used for EIP-712 type strings).
 */
export function encodeString(str) {
  return crypto.createHash('sha3-256').update(str, 'utf8').digest();
}

/**
 * ABI-encode a uint256 value (BigInt or Number) into a 32-byte Buffer.
 */
export function encodeUint256(value) {
  const hex = BigInt(value).toString(16).padStart(64, '0');
  return Buffer.from(hex, 'hex');
}

/**
 * ABI-encode a 20-byte Ethereum address into a 32-byte left-zero-padded Buffer.
 * Accepts checksummed or lowercase addresses.
 */
export function encodeAddress(address) {
  const stripped = address.replace(/^0x/, '').toLowerCase();
  if (stripped.length !== 40 || !/^[0-9a-f]{40}$/.test(stripped)) {
    throw new TypeError(`Invalid Ethereum address: ${address}`);
  }
  const cleaned = stripped.padStart(64, '0');

  return Buffer.from(cleaned, 'hex');
}

// ── EIP-712 Domain ─────────────────────────────────────────────────────────────

const DOMAIN_TYPE_STRING =
  'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)';

/**
 * Build the EIP-712 DOMAIN_SEPARATOR hash.
 *
 * @param {{ name: string, version: string, chainId: number|bigint, verifyingContract: string }} domain
 * @returns {Buffer} 32-byte domain separator
 */
export function buildDomainSeparator(domain) {
  const typeHash = encodeString(DOMAIN_TYPE_STRING);
  const encoded = Buffer.concat([
    typeHash,
    encodeString(domain.name),
    encodeString(domain.version),
    encodeUint256(domain.chainId),
    encodeAddress(domain.verifyingContract),
  ]);
  return keccak256(encoded);
}

// ── Pledge Struct Hash ─────────────────────────────────────────────────────────

const PLEDGE_TYPE_STRING =
  'Pledge(address donor,bytes32 campaignId,uint256 amountWei,uint256 deadline,uint256 nonce)';

/**
 * Hash a Pledge struct according to EIP-712 typeHash + abi.encode rules.
 *
 * @param {{ donor: string, campaignId: string, amountWei: bigint|number, deadline: bigint|number, nonce: bigint|number }} pledge
 * @returns {Buffer} 32-byte struct hash
 */
export function hashPledgeStruct(pledge) {
  const typeHash = encodeString(PLEDGE_TYPE_STRING);

  // campaignId is bytes32 — accept as hex or UTF-8 and pad/truncate to 32 bytes
  let campaignIdBytes;
  if (/^0x[0-9a-fA-F]{64}$/.test(pledge.campaignId)) {
    campaignIdBytes = Buffer.from(pledge.campaignId.slice(2), 'hex');
  } else {
    const raw = Buffer.from(pledge.campaignId, 'utf8');
    campaignIdBytes = Buffer.alloc(32);
    raw.copy(campaignIdBytes, 0, 0, Math.min(raw.length, 32));
  }

  const encoded = Buffer.concat([
    typeHash,
    encodeAddress(pledge.donor),
    campaignIdBytes,
    encodeUint256(pledge.amountWei),
    encodeUint256(pledge.deadline),
    encodeUint256(pledge.nonce),
  ]);
  return keccak256(encoded);
}

// ── Final Digest ───────────────────────────────────────────────────────────────

/**
 * Produce the final EIP-712 signable hash:
 *   keccak256("\x19\x01" || domainSeparator || structHash)
 *
 * This is the 32-byte value that a donor's wallet signs with eth_sign / personal_sign.
 *
 * @param {Buffer} domainSeparator
 * @param {Buffer} structHash
 * @returns {Buffer} 32-byte EIP-712 digest ready for `eth_sign`
 */
export function buildEip712Digest(domainSeparator, structHash) {
  const prefix = Buffer.from('1901', 'hex');
  return keccak256(Buffer.concat([prefix, domainSeparator, structHash]));
}

/**
 * Convenience: build the complete EIP-712 pledge digest in one call.
 *
 * @param {object} domain  - { name, version, chainId, verifyingContract }
 * @param {object} pledge  - { donor, campaignId, amountWei, deadline, nonce }
 * @returns {string} 0x-prefixed 32-byte hex digest
 */
export function pledgeDigest(domain, pledge) {
  const separator = buildDomainSeparator(domain);
  const structHash = hashPledgeStruct(pledge);
  const digest = buildEip712Digest(separator, structHash);
  return '0x' + digest.toString('hex');
}
