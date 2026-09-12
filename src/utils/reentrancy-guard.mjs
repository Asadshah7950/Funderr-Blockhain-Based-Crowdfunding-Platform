export class ReentrancyGuard {
  constructor() {
    this._locked = false;
  }

  async run(actionFn) {
    if (this._locked) {
      throw new Error('ReentrancyGuard: reentrant call detected');
    }
    this._locked = true;
    try {
      return await actionFn();
    } finally {
      this._locked = false;
    }
  }

  isLocked() {
    return this._locked;
  }
}
