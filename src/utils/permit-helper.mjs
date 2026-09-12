import crypto from 'node:crypto';

export class PermitHelper {
  static createDomainSeparator(name, version, chainId, verifyingContract) {
    const domainData = JSON.stringify({ name, version, chainId, verifyingContract });
    return crypto.createHash('sha256').update(domainData).digest('hex');
  }

  static hashPermit(owner, spender, value, nonce, deadline, domainSeparator) {
    const structData = JSON.stringify({
      owner: owner.toLowerCase(),
      spender: spender.toLowerCase(),
      value: value.toString(),
      nonce,
      deadline,
      domainSeparator,
    });
    return crypto.createHash('sha256').update(structData).digest('hex');
  }

  static isPermitValid(deadline) {
    return Date.now() <= deadline;
  }
}
