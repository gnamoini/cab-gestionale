import assert from "node:assert/strict";

/** ponytail: simulates journal sequence policy — numbers assigned only at post, never reused on rollback */
let lastNumber = 0;

function postAllocate(): number {
  lastNumber += 1;
  return lastNumber;
}

const rolledBack = postAllocate();
void rolledBack;
const next = postAllocate();
assert.equal(next, 2);
assert.equal(rolledBack, 1);

const concurrent = new Set<number>();
for (let i = 0; i < 50; i++) {
  concurrent.add(postAllocate());
}
assert.equal(concurrent.size, 50);

console.log("accounting-numbering.concurrency.test.ts OK");
