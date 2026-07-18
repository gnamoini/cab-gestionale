import assert from "node:assert/strict";
import { mapItemQuantities } from "@/lib/inventory-receiving/extraction/compute-document-confidence";

assert.deepEqual(mapItemQuantities({ ordered_quantity: 10, delivered_quantity: 8 }), {
  extractedQuantity: 10,
  receivedQuantity: 8,
});

assert.deepEqual(mapItemQuantities({ quantity: 5 }), {
  extractedQuantity: 5,
  receivedQuantity: 5,
});

assert.deepEqual(mapItemQuantities({}), {
  extractedQuantity: 1,
  receivedQuantity: 1,
});

console.log("ddt-quantity-mapping.test: OK");
