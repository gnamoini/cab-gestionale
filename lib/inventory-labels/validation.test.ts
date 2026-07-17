import assert from "node:assert/strict";
import { BULK_SYNC_MAX, BULK_ABSOLUTE_MAX, isBulkSyncCount } from "@/lib/inventory-labels/validation";

assert.equal(BULK_SYNC_MAX, 20);
assert.equal(BULK_ABSOLUTE_MAX, 1000);
assert.equal(isBulkSyncCount(20), true);
assert.equal(isBulkSyncCount(21), false);

console.log("inventory-labels/validation.test.ts OK");
