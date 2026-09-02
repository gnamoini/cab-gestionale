import assert from "node:assert/strict";
import {
  findOrdineFornitoreStockBlockedLines,
  ordineFornitoreDeliveryHasStockDelta,
  ordineFornitoreDeliveryWouldComplete,
  validateOrdineFornitoreDeliveryRequest,
} from "@/lib/ordini-fornitori/ordine-fornitore-delivery-validation";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";

const righe: OrdineFornitoreRecord["righe"] = [
  {
    id: "r1",
    ordine: 1,
    ricambioId: "ric-1",
    codice: "A",
    descrizione: "Ricambio A",
    quantita: 10,
    quantitaRicevuta: 0,
    prezzoUnitario: 1,
    scontoPercent: 0,
    totaleRiga: 10,
    unitaMisura: "pz",
    ivaPercent: 22,
    meta: {},
  },
  {
    id: "r2",
    ordine: 2,
    ricambioId: null,
    codice: "B",
    descrizione: "Senza magazzino",
    quantita: 5,
    quantitaRicevuta: 0,
    prezzoUnitario: 1,
    scontoPercent: 0,
    totaleRiga: 5,
    unitaMisura: "pz",
    ivaPercent: 22,
    meta: {},
  },
];

const blocked = findOrdineFornitoreStockBlockedLines([
  {
    rigaId: "r2",
    codice: "B",
    descrizione: "Senza magazzino",
    quantitaRicevuta: 0,
    target: 5,
    ricambioId: null,
  },
]);
assert.equal(blocked.length, 1);
assert.match(
  validateOrdineFornitoreDeliveryRequest({
    status: "in_consegna",
    righe,
    lines: [
      { riga_id: "r1", quantita_ricevuta_target: 10 },
      { riga_id: "r2", quantita_ricevuta_target: 5 },
    ],
    applyStock: true,
  }) ?? "",
  /collega un ricambio/i,
);

assert.equal(
  validateOrdineFornitoreDeliveryRequest({
    status: "in_consegna",
    righe,
    lines: [
      { riga_id: "r1", quantita_ricevuta_target: 6 },
      { riga_id: "r2", quantita_ricevuta_target: 5 },
    ],
    applyStock: false,
  }),
  null,
);
assert.equal(
  ordineFornitoreDeliveryWouldComplete(righe, [
    { riga_id: "r1", quantita_ricevuta_target: 6 },
    { riga_id: "r2", quantita_ricevuta_target: 5 },
  ]),
  false,
);

assert.equal(
  ordineFornitoreDeliveryHasStockDelta([
    {
      rigaId: "r2",
      codice: "B",
      descrizione: "Senza magazzino",
      quantitaRicevuta: 0,
      target: 5,
      ricambioId: null,
    },
  ]),
  false,
);
assert.equal(
  ordineFornitoreDeliveryHasStockDelta([
    {
      rigaId: "r1",
      codice: "A",
      descrizione: "Ricambio A",
      quantitaRicevuta: 0,
      target: 3,
      ricambioId: "ric-1",
    },
  ]),
  true,
);

assert.match(
  validateOrdineFornitoreDeliveryRequest({
    status: "inviato",
    righe,
    lines: [{ riga_id: "r1", quantita_ricevuta_target: 1 }],
    applyStock: false,
  }) ?? "",
  /in consegna/i,
);
assert.match(
  validateOrdineFornitoreDeliveryRequest({
    status: "in_consegna",
    righe,
    lines: [{ riga_id: "r1", quantita_ricevuta_target: 11 }],
    applyStock: false,
  }) ?? "",
  /supera/i,
);

console.log("ordine-fornitore-delivery-validation.test.ts OK");
