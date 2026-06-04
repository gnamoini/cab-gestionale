import assert from "node:assert/strict";
import { findDuplicateByCodici } from "@/lib/magazzino/duplicates";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

function mockRicambio(partial: Partial<RicambioMagazzino> & Pick<RicambioMagazzino, "id">): RicambioMagazzino {
  return {
    id: partial.id,
    marca: partial.marca ?? "M",
    codiceFornitoreOriginale: partial.codiceFornitoreOriginale ?? "",
    codiceFornitoreOriginaleSecondario: partial.codiceFornitoreOriginaleSecondario ?? "",
    descrizione: partial.descrizione ?? "Test",
    note: "",
    categoria: "Gen",
    compatibilitaMezzi: [],
    scorta: 0,
    scortaMinima: 0,
    dataUltimaModifica: "",
    autoreUltimaModifica: "",
    prezzoFornitoreOriginale: 0,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 0,
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    fornitoriAlternativi: partial.fornitoriAlternativi ?? [],
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: 0,
    scontoFornitoreNonOriginale: 0,
  };
}

const items = [
  mockRicambio({ id: "1", codiceFornitoreOriginale: "ABC123" }),
  mockRicambio({ id: "2", codiceFornitoreOriginale: "XYZ", codiceFornitoreOriginaleSecondario: "ABC123A" }),
];

assert.equal(findDuplicateByCodici(items, "ABC123")?.id, "1");
assert.equal(findDuplicateByCodici(items, "ABC123A")?.id, "2");
assert.equal(findDuplicateByCodici(items, "ABC123", { excludeId: "1" }), null);
assert.equal(findDuplicateByCodici(items, "ABC123A", { excludeId: "2" }), null);

const withAlt = [
  ...items,
  mockRicambio({
    id: "3",
    codiceFornitoreOriginale: "ZZ",
    fornitoriAlternativi: [
      { id: "a", fornitore: "F", produttore: "", codice: "ALT-99", prezzo: 0, sconto: 0 },
    ],
  }),
];
assert.equal(findDuplicateByCodici(withAlt, "ALT-99")?.id, "3");

console.log("duplicates.test.ts OK");
