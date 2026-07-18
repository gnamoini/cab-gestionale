import assert from "node:assert/strict";
import { buildLavorazioniUtilizzatoreFilterItems } from "@/lib/lavorazioni/lavorazioni-advanced-filters";

const catalog = {
  clienti: [],
  cantieri: [],
  utilizzatori: ["Mario Rossi", "Luigi Verdi"],
  addetti: [],
  marche: [],
  modelliByMarca: {},
};

assert.deepEqual(
  buildLavorazioniUtilizzatoreFilterItems(catalog).map((i) => i.value),
  ["Luigi Verdi", "Mario Rossi"],
);

assert.deepEqual(
  buildLavorazioniUtilizzatoreFilterItems(catalog, "Altro Utente").map((i) => i.value),
  ["Altro Utente", "Luigi Verdi", "Mario Rossi"],
);

console.log("lavorazioni-utilizzatore-filter-items.test.ts OK");
