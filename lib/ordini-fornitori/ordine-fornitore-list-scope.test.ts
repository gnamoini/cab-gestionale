import assert from "node:assert/strict";
import {
  compareOrdiniFornitoreInCorso,
  compareOrdiniFornitoreStorico,
  ordineFornitoreDataPrevista,
  ordineFornitoreHasNote,
  ordineFornitoreHasPartialReceipt,
  ordineFornitoreMatchesListScope,
  ordineFornitoreRigheCount,
} from "@/lib/ordini-fornitori/ordine-fornitore-list-scope";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";

function baseRecord(overrides: Partial<OrdineFornitoreRecord> = {}): OrdineFornitoreRecord {
  return {
    id: "o1",
    numero: "26-0001/O",
    status: "in_consegna",
    oggettoOrdine: "",
    dataOrdine: "2026-09-01",
    dataConsegna: null,
    fornitoreLabel: "Fornitore A",
    fornitoreSnapshot: {},
    destinazione: "",
    destinazioneSnapshot: {},
    logisticaSnapshot: { dataConsegna: "2026-09-10" },
    note: "",
    imponibileRighe: 0,
    trasporto: 0,
    imponibile: 0,
    ivaPercent: 22,
    iva: 0,
    totale: 0,
    lavorazioneId: null,
    preventivoId: null,
    schedaLavorazioneId: null,
    pdfArtifactHash: null,
    meta: {},
    createdBy: null,
    updatedBy: null,
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
    righe: [
      {
        id: "r1",
        ordine: 1,
        ricambioId: "ric1",
        codice: "ABC",
        descrizione: "Filtro",
        quantita: 10,
        quantitaRicevuta: 4,
        prezzoUnitario: 5,
        scontoPercent: 0,
        totaleRiga: 50,
        unitaMisura: "pz",
        ivaPercent: 22,
        meta: {},
      },
    ],
    ...overrides,
  };
}

assert.equal(ordineFornitoreMatchesListScope(baseRecord({ status: "in_consegna" }), "in_corso"), true);
assert.equal(ordineFornitoreMatchesListScope(baseRecord({ status: "consegnato" }), "storico"), true);
assert.equal(ordineFornitoreMatchesListScope(baseRecord({ status: "annullato" }), "storico"), true);
assert.equal(ordineFornitoreMatchesListScope(baseRecord({ status: "consegnato" }), "in_corso"), false);

assert.equal(ordineFornitoreHasPartialReceipt(baseRecord()), true);
assert.equal(
  ordineFornitoreHasPartialReceipt(baseRecord({ righe: [{ ...baseRecord().righe[0], quantitaRicevuta: 10 }] })),
  false,
);
assert.equal(ordineFornitoreHasNote(baseRecord({ note: "  Attenzione corriere " })), true);
assert.equal(ordineFornitoreRigheCount(baseRecord()), 1);
assert.equal(ordineFornitoreDataPrevista(baseRecord()), "2026-09-10");

const inviato = baseRecord({ id: "a", status: "inviato", createdAt: "2026-09-02T10:00:00Z" });
const inConsegna = baseRecord({ id: "b", status: "in_consegna", createdAt: "2026-09-01T10:00:00Z" });
assert.ok(compareOrdiniFornitoreInCorso(inConsegna, inviato) < 0);

const older = baseRecord({ id: "a", status: "consegnato", dataConsegna: "2026-08-01" });
const newer = baseRecord({ id: "b", status: "consegnato", dataConsegna: "2026-09-01" });
assert.ok(compareOrdiniFornitoreStorico(newer, older) < 0);

console.log("ordine-fornitore-list-scope.test.ts OK");
