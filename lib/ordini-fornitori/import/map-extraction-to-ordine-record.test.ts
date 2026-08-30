import assert from "node:assert/strict";
import { mapExtractionToOrdineRecord } from "@/lib/ordini-fornitori/import/map-extraction-to-ordine-record";
import type { OrdineFornitoreImportExtraction } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-schema";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";

const mag: MagazzinoMasterPrefs = {
  marche: [],
  categorie: [],
  mezziCompatibili: [],
  fornitori: ["ACME Ricambi"],
  produttori: [],
  fornitoreAnagraficaByFornitore: {
    "acme ricambi": {
      ragioneSociale: "ACME Ricambi SRL",
      partitaIva: "12345678901",
      codiceFiscale: "",
      indirizzo: "Via Roma 1",
      telefono: "+39 02 0000000",
      email: "",
      emailAggiuntive: [],
    },
  },
};

const extraction: OrdineFornitoreImportExtraction = {
  fornitore: {
    ragioneSociale: { value: "ACME Ricambi SRL", confidence: 0.9 },
    partitaIva: { value: "12345678901", confidence: 0.95 },
  },
  documento: {
    numeroPreventivo: { value: "PRV-2024-42", confidence: 0.9 },
    data: { value: "15/03/2024", confidence: 0.9 },
  },
  righe: [
    {
      descrizione: { value: "Filtro olio", confidence: 0.9 },
      codice: { value: "FO-123", confidence: 0.85 },
      quantita: { value: "2", confidence: 0.9 },
      prezzoUnitario: { value: "12,50", confidence: 0.9 },
    },
  ],
  costiAggiuntivi: [
    {
      tipo: "trasporto",
      descrizione: { value: "", confidence: 0.5 },
      importo: { value: "10,00", confidence: 0.8 },
    },
  ],
};

const result = mapExtractionToOrdineRecord({
  extraction,
  magazzinoItems: [],
  magazzinoMaster: mag,
  existingOrdini: [],
  source: { type: "import_file", id: "00000000-0000-4000-8000-000000000001" },
  contentHash: "hash-test",
  semanticKey: "semantic-test",
  duplicates: { hashDuplicate: null, semanticDuplicate: null },
});

assert.equal(result.fornitoreMatch.matched, true);
assert.equal(result.fornitoreMatch.label, "ACME Ricambi");
assert.equal(result.record.fornitoreLabel, "ACME Ricambi");
assert.equal(result.record.dataOrdine, "2024-03-15");
assert.match(String(result.record.logisticaSnapshot.riferimentoOrdine), /Rif\. PRV-2024-42/);
assert.equal(result.record.righe.length, 2);
assert.equal(result.record.righe[0]?.descrizione, "Filtro olio");
assert.equal(result.record.righe[0]?.quantita, 2);
assert.equal(result.record.righe[0]?.prezzoUnitario, 12.5);
assert.equal(result.totalRigheCount, 1);
assert.ok(result.quality.score > 0);

console.log("map-extraction-to-ordine-record.test.ts OK");
