import assert from "node:assert/strict";
import { matchInventoryLine } from "@/lib/inventory-receiving/matching/inventory-matching-engine";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { defaultRicambioMagazzinoFields } from "@/lib/magazzino/ricambio-magazzino-defaults";

function item(partial: Partial<RicambioMagazzino> & { id: string }): RicambioMagazzino {
  return { ...defaultRicambioMagazzinoFields(), ...partial };
}

const catalog = [
  item({
    id: "a1",
    codiceFornitoreOriginale: "ABC001",
    descrizione: "Filtro aspirazione spazzatrice 500",
    fornitoriAlternativi: [],
  }),
  item({
    id: "a2",
    codiceFornitoreOriginale: "ALT-1",
    descrizione: "Cinghia trazione",
    fornitoriAlternativi: [
      { id: "f1", fornitore: "Fornitore X", produttore: "", codice: "SUP-99", prezzo: 0, sconto: 0 },
    ],
  }),
];

const normalized = matchInventoryLine(catalog, {
  rawCode: "ABC-001",
  description: "filtro",
  supplierLabel: "",
});
assert.equal(normalized.matchStatus, "FOUND");
assert.equal(normalized.matchedItemId, "a1");

const exact = matchInventoryLine(catalog, {
  rawCode: "ABC001",
  description: "filtro",
  supplierLabel: "",
});
assert.equal(exact.matchStatus, "FOUND");
assert.equal(exact.matchedItemId, "a1");

const supplier = matchInventoryLine(catalog, {
  rawCode: "SUP-99",
  description: "cinghia",
  supplierLabel: "Fornitore X",
});
assert.equal(supplier.matchStatus, "FOUND");
assert.equal(supplier.matchedItemId, "a2");

const fuzzy = matchInventoryLine(catalog, {
  rawCode: "",
  description: "Filtro aspirazione grande",
  supplierLabel: "",
});
assert.ok(fuzzy.matchStatus === "SUGGESTED" || fuzzy.matchStatus === "NEW_ITEM");

const missing = matchInventoryLine(catalog, {
  rawCode: "UNKNOWN-XYZ",
  description: "Pezzo sconosciuto totalmente",
  supplierLabel: "",
});
assert.equal(missing.matchStatus, "NEW_ITEM");

console.log("inventory-matching-engine.test: OK");
