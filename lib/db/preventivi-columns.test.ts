import assert from "node:assert/strict";
import { PREVENTIVI_COLUMNS } from "@/lib/db/table-select-columns";

const cols = new Set(PREVENTIVI_COLUMNS.split(/,\s*/));

for (const dropped of [
  "stato",
  "stato_cliente",
  "accettato_at",
  "rifiutato_at",
  "scadenza_accettazione_at",
  "metodo_accettazione",
  "reminder_sent_at",
  "confermato_at",
  "confermato_by",
]) {
  assert.equal(cols.has(dropped), false, `dropped column still in PREVENTIVI_COLUMNS: ${dropped}`);
}

assert.equal(cols.has("stato_workflow"), true);

console.log("preventivi-columns.test.ts OK");
