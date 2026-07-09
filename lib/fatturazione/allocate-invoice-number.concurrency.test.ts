import assert from "node:assert/strict";

/** Simula politica buchi: rollback dopo allocazione non riusa il numero. */
let lastNumber = 10;

function allocate(): number {
  lastNumber += 1;
  return lastNumber;
}

const rolledBack = allocate(); // 11
void rolledBack; // rollback — buco accettato
const next = allocate(); // 12

assert.equal(next, 12);
assert.equal(rolledBack, 11);

const concurrent = new Set<number>();
for (let i = 0; i < 100; i++) {
  concurrent.add(allocate());
}
assert.equal(concurrent.size, 100);

console.log("allocate-invoice-number.concurrency.test.ts OK");
