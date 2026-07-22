import assert from "node:assert/strict";
import { AnalyzeTimeoutBudget } from "@/lib/document-capture/analyze-timeout-budget-core";

const budget = new AnalyzeTimeoutBudget(10_000);
assert.equal(budget.allocate("a", 3_000), 3_000);
assert.equal(budget.allocate("b", 3_000), 3_000);
assert.equal(budget.remainingMs(), 4_000);
assert.equal(budget.allocate("c", 9_000), 4_000);
assert.equal(budget.remainingMs(), 0);

let threw = false;
try {
  budget.allocate("d", 1);
} catch (e) {
  threw = true;
  assert.match(String(e), /Budget esaurito/);
}
assert.equal(threw, true);

console.log("analyze-timeout-budget.test.ts OK");
