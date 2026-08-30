import assert from "node:assert/strict";
import { mapPrefillToOrdineRecord } from "@/lib/ordini-fornitori/identifica-ricambio/map-prefill-to-ordine-record";
import type { SparePartOrderPrefill } from "@/lib/ordini-fornitori/identifica-ricambio/types";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";

const mag: MagazzinoMasterPrefs = {
  marche: ["Bosch"],
  fornitori: ["ACME Ricambi"],
  categorie: [],
  mezziCompatibili: [],
  produttori: [],
  scontoFornitoreByMarca: {},
  fornitoreAnagraficaByFornitore: {
    "ACME Ricambi": {
      ragioneSociale: "ACME Ricambi SRL",
      partitaIva: "",
      codiceFiscale: "",
      indirizzo: "",
      telefono: "+39",
      email: "",
      emailAggiuntive: [],
    },
  },
};

const basePrefill: SparePartOrderPrefill = {
  codice: "ABC-123",
  descrizione: "Filtro olio",
  quantita: 1,
  note: "Da identificazione",
  prezzoSuggerito: 42.5,
  prezzoSource: { type: "listino", label: "Listino test" },
  fornitoreLabel: "ACME Ricambi",
  fornitoreMode: "identified",
  resolution: { candidateId: "cand-1", ricambioId: "ric-1", matchKind: "exact" },
  source: "identifica-ricambio",
  sourceSearchId: "search-1",
  sourceCandidateId: "cand-1",
  sourceDocumentId: null,
  sourceCodice: "ABC-123",
};

const record = mapPrefillToOrdineRecord({
  prefill: basePrefill,
  magazzinoMaster: mag,
  existingOrdini: [],
});

assert.equal(record.fornitoreLabel, "ACME Ricambi");
assert.equal(record.righe.length, 1);
assert.equal(record.righe[0]!.codice, "ABC-123");
assert.equal(record.righe[0]!.prezzoUnitario, 42.5);
assert.equal(record.righe[0]!.ricambioId, "ric-1");
assert.equal(record.righe[0]!.quantita, 1);

const suggested = mapPrefillToOrdineRecord({
  prefill: { ...basePrefill, fornitoreMode: "suggested" },
  magazzinoMaster: mag,
  existingOrdini: [],
});
assert.equal(suggested.fornitoreLabel, "ACME Ricambi");
assert.ok(!suggested.meta.identificaRicambio);

console.log("map-prefill-to-ordine-record.test.ts OK");
