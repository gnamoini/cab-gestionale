import assert from "node:assert/strict";
import { defaultRicambioMagazzinoFields } from "@/lib/magazzino/ricambio-magazzino-defaults";
import {
  fornitoriAlternativiFormRowsFromRicambio,
  fornitoriAlternativiFormRowsHaveContent,
  ricambioFormIsDirty,
  toFormDraft,
  emptyRicambioForm,
} from "@/lib/magazzino/form";

assert.equal(fornitoriAlternativiFormRowsHaveContent(emptyRicambioForm().fornitoriAlternativi), false);
assert.equal(fornitoriAlternativiFormRowsFromRicambio(defaultRicambioMagazzinoFields()).length, 1);
assert.equal(
  fornitoriAlternativiFormRowsFromRicambio(
    defaultRicambioMagazzinoFields({
      fornitoriAlternativi: [],
      fornitoreNonOriginale: "Ricambi Express",
      codiceFornitoreNonOriginale: "RX-01",
      prezzoFornitoreNonOriginale: 12.5,
      scontoFornitoreNonOriginale: 5,
    }),
  ).length,
  1,
);
assert.equal(
  fornitoriAlternativiFormRowsFromRicambio(
    defaultRicambioMagazzinoFields({
      fornitoriAlternativi: [],
      fornitoreNonOriginale: "Ricambi Express",
      codiceFornitoreNonOriginale: "RX-01",
      prezzoFornitoreNonOriginale: 12.5,
      scontoFornitoreNonOriginale: 5,
    }),
  )[0]?.fornitore,
  "Ricambi Express",
);

const draftFromEmptyRicambio = toFormDraft(defaultRicambioMagazzinoFields());
assert.equal(draftFromEmptyRicambio.fornitoriAlternativi.length, 1);
assert.equal(ricambioFormIsDirty(draftFromEmptyRicambio, draftFromEmptyRicambio), false);

const draftWithLegacyAlt = toFormDraft(
  defaultRicambioMagazzinoFields({
    fornitoriAlternativi: [],
    fornitoreNonOriginale: "Fornitore B",
    codiceFornitoreNonOriginale: "B-99",
    prezzoFornitoreNonOriginale: 8,
    scontoFornitoreNonOriginale: 0,
  }),
);
assert.equal(draftWithLegacyAlt.fornitoriAlternativi[0]?.fornitore, "Fornitore B");
assert.equal(draftWithLegacyAlt.fornitoriAlternativi[0]?.codice, "B-99");
assert.equal(fornitoriAlternativiFormRowsHaveContent(draftWithLegacyAlt.fornitoriAlternativi), true);

console.log("ricambio-form-fornitori.test.ts OK");
