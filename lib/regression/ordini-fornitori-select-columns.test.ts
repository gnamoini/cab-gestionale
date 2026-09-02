import assert from "node:assert/strict";
import {
  ORDINI_FORNITORI_COLUMNS,
  ORDINI_FORNITORI_RIGHE_COLUMNS,
} from "@/lib/db/table-select-columns";

assert.ok(ORDINI_FORNITORI_COLUMNS.includes("data_consegna"));
assert.ok(ORDINI_FORNITORI_RIGHE_COLUMNS.includes("quantita_ricevuta"));

console.log("ordini-fornitori-select-columns.test.ts OK");
