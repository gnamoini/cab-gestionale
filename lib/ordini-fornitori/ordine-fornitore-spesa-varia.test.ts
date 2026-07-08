import assert from "node:assert/strict";
import {
  buildEmptyOrdineSpesaVariaRiga,
  mergeOrdineRighe,
  splitOrdineRighe,
} from "@/lib/ordini-fornitori/ordine-fornitore-spesa-varia";
import { calcolaTotaliOrdineFornitore } from "@/lib/ordini-fornitori/ordine-fornitore-totals";

const spesa = buildEmptyOrdineSpesaVariaRiga(22);
spesa.descrizione = "Spese di trasporto";
spesa.prezzoUnitario = 25;
spesa.totaleRiga = 25;

const oggetto = {
  id: "1",
  ordine: 1,
  ricambioId: null,
  codice: "A",
  descrizione: "Ricambio",
  quantita: 1,
  prezzoUnitario: 100,
  scontoPercent: 0,
  totaleRiga: 100,
  unitaMisura: "pz" as const,
  ivaPercent: 22,
  meta: { ivaPercent: 22, unitaMisura: "pz" },
};

const merged = mergeOrdineRighe([oggetto], [spesa]);
const split = splitOrdineRighe(merged);
assert.equal(split.oggetti.length, 1);
assert.equal(split.speseVarie.length, 1);

const totals = calcolaTotaliOrdineFornitore({ righe: merged, trasporto: 0, ivaPercent: 22 });
assert.equal(totals.imponibileRighe, 100);
assert.equal(totals.imponibileSpeseVarie, 25);
assert.equal(totals.imponibile, 125);

console.log("ordine-fornitore-spesa-varia.test.ts OK");
