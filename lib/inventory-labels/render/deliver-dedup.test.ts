import assert from "node:assert/strict";
import {
  clearRenderDedupForTests,
  renderDedupKey,
  withRenderDedup,
} from "@/lib/inventory-labels/render/render-dedup";

clearRenderDedupForTests();

let calls = 0;
const key = renderDedupKey("e1", "hash1", "png");

void withRenderDedup(key, () => {
  calls += 1;
  return new Promise<Buffer>(() => {
    /* keep pending — dedup window open */
  });
});
assert.equal(calls, 1);

void withRenderDedup(key, () => {
  calls += 1;
  return Promise.resolve(Buffer.from("b"));
});
assert.equal(calls, 1, "second in-flight key must not invoke render again");

clearRenderDedupForTests();
console.log("inventory-labels/render/deliver-dedup.test.ts OK");
