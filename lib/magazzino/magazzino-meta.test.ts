import assert from "node:assert/strict";
import {
  metaFieldsToRicambioUi,
  parseMagazzinoRicambioMeta,
  ricambioUiToMagazzinoMeta,
} from "@/lib/magazzino/magazzino-meta";
import { defaultRicambioMagazzinoFields } from "@/lib/magazzino/ricambio-magazzino-defaults";
import {
  patchFornitoriAlternativiFornitoreRename,
  patchFornitoriAlternativiProduttoreRename,
} from "@/lib/magazzino/ricambio-fornitori-alternativi";

const legacyMeta = parseMagazzinoRicambioMeta({
  fornitoreNonOriginale: "Forn A",
  codiceFornitoreNonOriginale: "ALT1",
  prezzoFornitoreNonOriginale: 12,
  scontoFornitoreNonOriginale: 5,
  usatoInTagliandi: true,
  marcaOriginaleSecondaria: "Brembo",
  codiceOriginaleSecondario: "OE-2",
});

assert.equal(legacyMeta.fornitoriAlternativi?.length, 1);
assert.equal(legacyMeta.fornitoriAlternativi?.[0]?.fornitore, "Forn A");
assert.equal(legacyMeta.fornitoriAlternativi?.[0]?.codice, "ALT1");
assert.equal(legacyMeta.usatoInTagliandi, true);
assert.equal(legacyMeta.marcaOriginaleSecondaria, "Brembo");

const ui = metaFieldsToRicambioUi(legacyMeta);
assert.equal(ui.usatoInTagliandi, true);
assert.equal(ui.marcaOriginaleSecondaria, "Brembo");
assert.equal(ui.fornitoriAlternativi.length, 1);

const ricambio = defaultRicambioMagazzinoFields({
  ...ui,
  id: "uuid-1",
  descrizione: "Test",
  fornitoriAlternativi: [
    { id: "x1", fornitore: "F1", produttore: "P1", codice: "C1", prezzo: 10, sconto: 0 },
    { id: "x2", fornitore: "F2", produttore: "", codice: "", prezzo: 0, sconto: 0 },
  ],
});
const persisted = ricambioUiToMagazzinoMeta(ricambio);
assert.equal(persisted.fornitoriAlternativi?.length, 2);
assert.equal(persisted.fornitoriAlternativi?.[0]?.fornitore, "F1");
assert.equal(persisted.fornitoriAlternativi?.[1]?.fornitore, "F2");
assert.equal(persisted.fornitoreNonOriginale, "F1");
assert.equal(persisted.usatoInTagliandi, true);

const renamed = patchFornitoriAlternativiFornitoreRename(
  {
    fornitoreNonOriginale: "Old",
    fornitoriAlternativi: [
      { id: "a", fornitore: "Old", produttore: "P", codice: "X", prezzo: 1, sconto: 0 },
      { id: "b", fornitore: "Other", produttore: "", codice: "", prezzo: 0, sconto: 0 },
    ],
  },
  "Old",
  "New",
);
assert.equal(renamed.changed, true);
assert.equal(renamed.next.fornitoreNonOriginale, "New");
assert.equal(
  (renamed.next.fornitoriAlternativi as { fornitore: string }[])[0]?.fornitore,
  "New",
);

const prodRenamed = patchFornitoriAlternativiProduttoreRename(
  {
    fornitoriAlternativi: [
      { id: "a", fornitore: "F1", produttore: "OldP", codice: "X", prezzo: 1, sconto: 0 },
      { id: "b", fornitore: "F2", produttore: "Other", codice: "", prezzo: 0, sconto: 0 },
    ],
  },
  "OldP",
  "NewP",
);
assert.equal(prodRenamed.changed, true);
assert.equal(
  (prodRenamed.next.fornitoriAlternativi as { produttore: string }[])[0]?.produttore,
  "NewP",
);
assert.equal(
  (prodRenamed.next.fornitoriAlternativi as { produttore: string }[])[1]?.produttore,
  "Other",
);

console.log("magazzino-meta.test.ts OK");
