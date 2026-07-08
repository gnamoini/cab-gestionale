import assert from "node:assert/strict";
import { cloneOrdineFornitoreRecord } from "@/lib/ordini-fornitori/clone-ordine-fornitore";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";

const SOURCE: OrdineFornitoreRecord = {
  id: "11111111-1111-1111-1111-111111111111",
  numero: "26-0001/O",
  status: "inviato",
  oggettoOrdine: "Ricambi",
  dataOrdine: "2026-07-01",
  fornitoreLabel: "ACMEI SUD SpA",
  fornitoreSnapshot: { piva: "123" },
  destinazione: "Officina",
  destinazioneSnapshot: {},
  logisticaSnapshot: {},
  note: "nota",
  imponibileRighe: 100,
  trasporto: 0,
  imponibile: 100,
  ivaPercent: 22,
  iva: 22,
  totale: 122,
  lavorazioneId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  preventivoId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  schedaLavorazioneId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  pdfArtifactHash: "hash",
  meta: { oggettoOrdine: "Ricambi" },
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T11:00:00.000Z",
  righe: [
    {
      id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      ordine: 1,
      ricambioId: null,
      codice: "ABC",
      descrizione: "Filtro",
      quantita: 2,
      prezzoUnitario: 50,
      scontoPercent: 0,
      totaleRiga: 100,
      unitaMisura: "pz",
      ivaPercent: 22,
      meta: {},
    },
  ],
};

const cloned = cloneOrdineFornitoreRecord(SOURCE, [{ numero: "26-0001/O" }, { numero: "26-0002/O" }]);

assert.notEqual(cloned.id, SOURCE.id);
assert.equal(cloned.numero, "26-0003/O");
assert.equal(cloned.status, "bozza");
assert.notEqual(cloned.dataOrdine, SOURCE.dataOrdine);
assert.equal(cloned.lavorazioneId, null);
assert.equal(cloned.preventivoId, null);
assert.equal(cloned.schedaLavorazioneId, null);
assert.equal(cloned.pdfArtifactHash, null);
assert.equal(cloned.createdBy, null);
assert.equal(cloned.righe.length, 1);
assert.notEqual(cloned.righe[0]!.id, SOURCE.righe[0]!.id);
assert.equal(cloned.righe[0]!.codice, "ABC");
assert.equal(cloned.fornitoreLabel, SOURCE.fornitoreLabel);
assert.equal(cloned.totale, SOURCE.totale);

console.log("clone-ordine-fornitore.test.ts: ok");
