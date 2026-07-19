import assert from "node:assert/strict";
import { publishWhenReadyDepsKey } from "@/components/report/sections/use-section-publish";

const rowsA = [{ id: "r1", updated_at: "2026-01-01" }, { id: "r2", updated_at: "2026-01-02" }];
const rowsB = [{ id: "r1", updated_at: "2026-01-01" }, { id: "r2", updated_at: "2026-01-02" }];

assert.equal(publishWhenReadyDepsKey(["k", rowsA, true]), publishWhenReadyDepsKey(["k", rowsB, true]));
assert.notEqual(
  publishWhenReadyDepsKey(["k", rowsA, true]),
  publishWhenReadyDepsKey(["k", [{ id: "r9" }], true]),
);

console.log("use-section-publish.test.ts ok");
