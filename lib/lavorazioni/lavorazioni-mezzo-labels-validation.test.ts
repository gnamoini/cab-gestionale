import assert from "node:assert/strict";
import { normalizeWorkOrderBulkIds } from "@/lib/lavorazioni/lavorazioni-mezzo-labels-validation";

assert.deepEqual(
  normalizeWorkOrderBulkIds(["a", "b", "a"]),
  ["a", "b"],
  "dedup preserva ordine",
);

console.log("lavorazioni-mezzo-labels-validation.test.ts OK");
