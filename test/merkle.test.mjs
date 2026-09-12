import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MerkleTree } from '../src/utils/merkle.mjs';

describe('MerkleTree (Unit)', () => {
  const donors = ['0x1111', '0x2222', '0x3333', '0x4444'];

  it('generates a deterministic 64-character hex root', () => {
    const tree = new MerkleTree(donors);
    assert.equal(tree.getRoot().length, 64);
  });

  it('generates valid proof that verifies against root', () => {
    const tree = new MerkleTree(donors);
    const root = tree.getRoot();
    const proof = tree.getProof('0x2222');
    assert.ok(proof.length > 0);
    assert.equal(MerkleTree.verifyProof('0x2222', proof, root), true);
  });

  it('rejects tampered leaf with valid proof', () => {
    const tree = new MerkleTree(donors);
    const root = tree.getRoot();
    const proof = tree.getProof('0x2222');
    assert.equal(MerkleTree.verifyProof('0x9999', proof, root), false);
  });

  it('returns null proof for non-existent leaf', () => {
    const tree = new MerkleTree(donors);
    assert.equal(tree.getProof('0xNotThere'), null);
  });

  it('throws on empty leaves array', () => {
    assert.throws(() => new MerkleTree([]), TypeError);
  });
});
