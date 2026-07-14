import assert from "node:assert/strict";
import { BULK_SYNC_MAX, BULK_ABSOLUTE_MAX, isBulkSyncCount } from "@/lib/inventory-labels/validation";

assert.equal(BULK_SYNC_MAX, 100);
assert.equal(BULK_ABSOLUTE_MAX, 1000);
assert.equal(isBulkSyncCount(100), true);
assert.equal(isBulkSyncCount(101), false);

console.log("inventory-labels/validation.test.ts OK");
