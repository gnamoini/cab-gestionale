import assert from "node:assert/strict";
import {
  displayRicambioCodice,
  resolveRicambioCodiceForPersist,
  ricambioCodiceForUi,
} from "@/lib/magazzino/ricambio-codice";
import { ricambioFromFormLenient, toFormDraft } from "@/lib/magazzino/form";
import { emptyRicambioForm } from "@/lib/magazzino/form";
import { magazzinoRowToRicambioUI } from "@/lib/magazzino/magazzino-db-ui-adapter";
import { formatLabelCodiceLine } from "@/lib/inventory-labels/domain/label-display";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

// Doppia creazione lenient senza codice → persist ""
const a = ricambioFromFormLenient(emptyRicambioForm(), "id-a");
const b = ricambioFromFormLenient(emptyRicambioForm(), "id-b");
assert.ok(a && b);
assert.equal(a.codiceFornitoreOriginale, "");
assert.equal(b.codiceFornitoreOriginale, "");
assert.equal(resolveRicambioCodiceForPersist(""), "");
assert.equal(resolveRicambioCodiceForPersist("—"), "");

// Legacy AUTO in UI
const legacyRow: MagazzinoRicambioRow = {
  id: "legacy-1",
  codice: "AUTO-ABCD1234",
  nome: "Filtro test",
  marca: "Bosch",
  quantita: 1,
  costo: 10,
  prezzo_vendita: 15,
  consumo_medio_mensile: null,
  meta: {},
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};
const legacyUi = magazzinoRowToRicambioUI(legacyRow);
assert.equal(legacyUi.codiceFornitoreOriginale, "");
assert.equal(displayRicambioCodice(legacyUi.codiceFornitoreOriginale), "—");
assert.equal(toFormDraft(legacyUi).codiceFornitoreOriginale, "");

const labelCodice = ricambioCodiceForUi(legacyRow.codice);
assert.equal(labelCodice, "");
assert.equal(formatLabelCodiceLine(labelCodice, legacyRow.marca ?? ""), "");

console.log("ricambio-senza-codice-regression.test.ts OK");
