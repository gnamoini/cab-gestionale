import assert from "node:assert/strict";
import { applyMergePatch, shouldApplyMergeValue } from "@/lib/data-import/core/merge-policy";

assert.equal(shouldApplyMergeValue("", "old", { policy: "PATCH" }), false);
assert.equal(shouldApplyMergeValue(0, 5, { policy: "PATCH" }), true);
assert.equal(shouldApplyMergeValue(false, true, { policy: "PATCH" }), true);

assert.equal(shouldApplyMergeValue("", "old", { policy: "REPLACE", emptyStringClears: false }), false);
assert.equal(shouldApplyMergeValue("new", "old", { policy: "REPLACE" }), true);

const merged = applyMergePatch(
  { a: "keep", b: "old", c: 1 },
  { a: "", b: "new", c: 0 },
  { policy: "PATCH", fields: [{ key: "a", label: "A" }, { key: "b", label: "B" }, { key: "c", label: "C", dataType: "number" }] },
);
assert.equal(merged.a, "keep");
assert.equal(merged.b, "new");
assert.equal(merged.c, 0);

const smartJson = applyMergePatch(
  { meta: { x: 1 } as Record<string, unknown> },
  { meta: { y: 2 } },
  {
    policy: "SMART",
    fields: [{ key: "meta", label: "Meta", dataType: "json", mergePolicyOverride: "SMART" }],
  },
);
assert.deepEqual(smartJson.meta, { y: 2 });

console.log("merge-policy.test.ts OK");
