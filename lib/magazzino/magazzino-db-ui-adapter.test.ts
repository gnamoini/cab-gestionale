import assert from "node:assert/strict";
import {
  magazzinoRowToRicambioUI,
  ricambioUiToMagazzinoUpdate,
} from "@/lib/magazzino/magazzino-db-ui-adapter";

const row = {
  id: "0a7272ee-3cb6-4a8d-b4fb-f11c445bfe25",
  codice: "K57P",
  nome: "Pressostato",
  marca: "—",
  quantita: 1,
  costo: 10,
  prezzo_vendita: 12,
  stock_version: 0,
  meta: { categoria: "Altro", scortaMinima: 0 },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const ui = magazzinoRowToRicambioUI(row as never, "Test");
const patch = ricambioUiToMagazzinoUpdate(ui);

assert.equal("id" in patch, false, "update patch must not include id");
assert.equal("quantita" in patch, false, "update patch must not include quantita");
assert.equal(patch.codice, "K57P");

console.log("magazzino-db-ui-adapter.test.ts OK");
