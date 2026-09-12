import crypto from 'node:crypto';

/**
 * Standard cryptographic Merkle Tree for off-chain donor verification.
 * Leaves are sorted and hashed with SHA-256 for deterministic root generation.
 */
export class MerkleTree {
  constructor(leaves) {
    if (!Array.isArray(leaves) || leaves.length === 0) {
      throw new TypeError('Leaves must be a non-empty array');
    }
    this.leaves = leaves.map(l => MerkleTree.hash(l)).sort(Buffer.compare);
    this.layers = [this.leaves];
    this._buildTree();
  }

  static hash(data) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
    return crypto.createHash('sha256').update(buf).digest();
  }

  static combineHash(left, right) {
    const sorted = [left, right].sort(Buffer.compare);
    return crypto.createHash('sha256').update(Buffer.concat(sorted)).digest();
  }

  _buildTree() {
    let current = this.layers[0];
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        if (i + 1 < current.length) {
          next.push(MerkleTree.combineHash(current[i], current[i + 1]));
        } else {
          next.push(current[i]);
        }
      }
      this.layers.push(next);
      current = next;
    }
  }

  getRoot() {
    return this.layers[this.layers.length - 1][0].toString('hex');
  }

  getProof(leafData) {
    const targetHash = MerkleTree.hash(leafData);
    let index = this.leaves.findIndex(l => l.equals(targetHash));
    if (index === -1) return null;

    const proof = [];
    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isRightNode = index % 2 === 1;
      const pairIndex = isRightNode ? index - 1 : index + 1;

      if (pairIndex < layer.length) {
        proof.push({
          position: isRightNode ? 'left' : 'right',
          data: layer[pairIndex].toString('hex')
        });
      }
      index = Math.floor(index / 2);
    }
    return proof;
  }

  static verifyProof(leafData, proof, rootHex) {
    let current = MerkleTree.hash(leafData);
    for (const node of proof) {
      const nodeBuf = Buffer.from(node.data, 'hex');
      current = node.position === 'left'
        ? MerkleTree.combineHash(nodeBuf, current)
        : MerkleTree.combineHash(current, nodeBuf);
    }
    return current.toString('hex') === rootHex;
  }
}
