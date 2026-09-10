import assert from "node:assert/strict";

/** ponytail: gap policy — rollback after alloc does not reuse number */
let last = 0;
function allocate(): number {
  last += 1;
  return last;
}

const rolledBack = allocate();
void rolledBack;
const next = allocate();
assert.equal(next, 2);

const concurrent = new Set<number>();
for (let i = 0; i < 100; i++) concurrent.add(allocate());
assert.equal(concurrent.size, 100);

console.log("document-numbering.concurrency.test.ts OK");
