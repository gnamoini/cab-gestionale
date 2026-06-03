import assert from "node:assert/strict";
import {
  gestionaleListTableRowTone,
  gestionaleListTableRowToneFlash,
  gestionaleListTableRowToneLowStock,
} from "@/lib/ui/gestionale-list-table";

assert.equal(gestionaleListTableRowTone({}), undefined);
assert.equal(gestionaleListTableRowTone({ flash: true }), gestionaleListTableRowToneFlash);
assert.equal(
  gestionaleListTableRowTone({ flash: true, lowStock: true }),
  gestionaleListTableRowToneLowStock,
);

console.log("gestionale-list-table.test.ts OK");
