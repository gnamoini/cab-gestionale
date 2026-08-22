import assert from "node:assert/strict";
import { ricambioFromFormLenient, emptyRicambioForm } from "@/lib/magazzino/form";
import { enrichMagazzinoMetaWithAnagraficaStatus } from "@/lib/magazzino/ricambio-anagrafica-status";
import {
  ordineFornitoreQuickRicambioFornitoreRows,
  ordineFornitoreQuickRicambioToFormState,
} from "@/lib/ordini-fornitori/ordine-fornitore-quick-ricambio";
import {
  isRicambioAnagraficaIncompleta,
  resolveRicambioAnagraficaStatus,
  ricambioAnagraficaMissingFieldsFromUi,
} from "@/lib/magazzino/ricambio-anagrafica-status";

const quick = ordineFornitoreQuickRicambioToFormState({
  codice: "ABC123",
  descrizione: "Filtro idraulico",
  prezzo: 85,
  fornitoreLabel: "Fornitore XYZ",
});

const altRows = ordineFornitoreQuickRicambioFornitoreRows({
  codice: "ABC123",
  descrizione: "Filtro",
  prezzo: 85,
  fornitoreLabel: "Fornitore XYZ",
});
assert.equal(altRows.length, 1);
assert.equal(altRows[0]?.fornitore, "Fornitore XYZ");
assert.equal(altRows[0]?.codice, "ABC123");
assert.equal(altRows[0]?.prezzo, 85);

const lenient = ricambioFromFormLenient(quick, "test-id");
assert.ok(lenient.fornitoriAlternativi.some((f) => f.fornitore === "Fornitore XYZ" && f.codice === "ABC123"));
assert.equal(resolveRicambioAnagraficaStatus(lenient), "incompleto");
assert.ok(isRicambioAnagraficaIncompleta(lenient));

const meta = enrichMagazzinoMetaWithAnagraficaStatus({}, lenient, {
  origineCreazione: "ordine_fornitore",
});
assert.equal(meta.anagraficaStatus, "incompleto");
assert.equal(meta.origineCreazione, "ordine_fornitore");
assert.ok(meta.anagraficaIncompleteFields?.includes("marca"));

const completeForm = {
  ...emptyRicambioForm(),
  marca: "Bosch",
  codiceFornitoreOriginale: "OE-1",
  descrizione: "Filtro",
  categoria: "Filtri",
  prezzoFornitoreOriginale: "10",
};
const complete = ricambioFromFormLenient(completeForm, "complete-id");
assert.equal(resolveRicambioAnagraficaStatus(complete), "completo");
assert.equal(ricambioAnagraficaMissingFieldsFromUi(complete).length, 0);

const metaComplete = enrichMagazzinoMetaWithAnagraficaStatus(
  { origineCreazione: "ordine_fornitore" },
  complete,
  { preserveOrigine: true },
);
assert.equal(metaComplete.anagraficaStatus, "completo");
assert.equal(metaComplete.origineCreazione, "ordine_fornitore");
assert.equal(metaComplete.anagraficaIncompleteFields, undefined);

console.log("ricambio-anagrafica-status.test.ts OK");
