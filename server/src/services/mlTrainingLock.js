/**
 * Simple in-memory lock to prevent concurrent ML training runs.
 * Note: For multi-instance deployments, replace with a shared lock (e.g., Redis).
 */
class MLTrainingLock {
  constructor() {
    this.locked = false;
    this.lockedAt = null;
  }

  /**
   * Acquire the training lock.
   * @returns {boolean} True if lock acquired, false if already locked
   */
  acquire() {
    if (this.locked) {
      return false;
    }
    this.locked = true;
    this.lockedAt = new Date().toISOString();
    return true;
  }

  /**
   * Release the training lock.
   */
  release() {
    this.locked = false;
    this.lockedAt = null;
  }

  /**
   * Returns current lock status.
   * @returns {{ locked: boolean, lockedAt: string | null }}
   */
  status() {
    return { locked: this.locked, lockedAt: this.lockedAt };
  }
}

module.exports = new MLTrainingLock();
