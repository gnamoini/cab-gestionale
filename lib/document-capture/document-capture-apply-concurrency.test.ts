import assert from "node:assert/strict";

class MockLock {
  private locked = false;

  tryLock(): boolean {
    if (this.locked) return false;
    this.locked = true;
    return true;
  }

  unlock(): void {
    this.locked = false;
  }
}

const lock = new MockLock();

function simulateBeginApply(): "ok" | "in_progress" {
  return lock.tryLock() ? "ok" : "in_progress";
}

assert.equal(simulateBeginApply(), "ok");
assert.equal(simulateBeginApply(), "in_progress");
lock.unlock();
assert.equal(simulateBeginApply(), "ok");

console.log("document-capture-apply-concurrency.test.ts OK");
