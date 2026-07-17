import assert from "node:assert/strict";
import { BULK_SYNC_MAX, BULK_ABSOLUTE_MAX, isBulkSyncCount } from "@/lib/inventory-labels/validation";

assert.equal(BULK_SYNC_MAX, 10);
assert.equal(BULK_ABSOLUTE_MAX, 500);
assert.equal(isBulkSyncCount(10), true);
assert.equal(isBulkSyncCount(11), false);

console.log("inventory-labels/validation.test.ts OK");
