import assert from "node:assert/strict";
import type { BulkLabelItem } from "@/lib/inventory-labels/render/bulk-assembly.server";

const item: BulkLabelItem = {
  entityId: "00000000-0000-4000-8000-000000000001",
  entityType: "magazzino_ricambio",
  payload: {
    marca: "BTE",
    marcaSecondaria: "",
    descrizione: "Test",
    codice: "ABC",
    codiceSecondario: "",
    fornitoreAlternativo: "",
    codiceAlternativo: "",
  },
  qrUrl: "https://example.test/r/abc",
};

assert.equal(item.entityId.length, 36);
assert.equal(typeof item.qrUrl, "string");

console.log("inventory-labels/render/bulk-assembly.test.ts OK");
