import assert from "node:assert/strict";
import {
  BULK_ABSOLUTE_MAX,
  BULK_SYNC_MAX,
  bulkLabelRequestSchema,
  isBulkSyncCount,
  normalizeBulkLabelRequest,
} from "@/lib/inventory-labels/validation";

const idA = "00000000-0000-4000-8000-000000000001";
const idB = "00000000-0000-4000-8000-000000000002";

assert.equal(BULK_SYNC_MAX, 10);
assert.equal(BULK_ABSOLUTE_MAX, 500);
assert.equal(isBulkSyncCount(10), true);
assert.equal(isBulkSyncCount(11), false);

const legacy = bulkLabelRequestSchema.safeParse({
  ids: [idA, idB],
  preset: "95x40-default",
});
assert.ok(legacy.success, "legacy ids accepted");
if (legacy.success) {
  const norm = normalizeBulkLabelRequest(legacy.data);
  assert.equal(norm.items.length, 2);
  assert.equal(norm.totalLabels, 2);
  assert.equal(norm.items[0]?.quantity, 1);
}

const qtyItems = bulkLabelRequestSchema.safeParse({
  items: [{ id: idA, quantity: 99 }],
  preset: "95x40-default",
});
assert.ok(qtyItems.success);

const overMax = bulkLabelRequestSchema.safeParse({
  items: [{ id: idA, quantity: BULK_ABSOLUTE_MAX + 1 }],
  preset: "95x40-default",
});
assert.ok(!overMax.success, "quantity 501 rejected");

const total501 = bulkLabelRequestSchema.safeParse({
  items: [
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      quantity: 50,
    })),
    { id: "00000000-0000-4000-8000-000000000010", quantity: 51 },
  ],
  preset: "95x40-default",
});
assert.ok(!total501.success, "total 501 rejected");

const total500 = bulkLabelRequestSchema.safeParse({
  items: Array.from({ length: 10 }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    quantity: 50,
  })),
  preset: "95x40-default",
});
assert.ok(total500.success, "total 500 accepted");

const both = bulkLabelRequestSchema.safeParse({
  ids: [idA],
  items: [{ id: idB, quantity: 1 }],
  preset: "95x40-default",
});
assert.ok(!both.success, "ids and items together rejected");

console.log("inventory-labels/validation.test.ts OK");
