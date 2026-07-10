import assert from "node:assert/strict";
import {
  calcolaTotaliOrdineFornitore,
  totaleNettoRigaOrdine,
} from "@/lib/ordini-fornitori/ordine-fornitore-totals";

assert.equal(totaleNettoRigaOrdine({ quantita: 2, prezzoUnitario: 100, scontoPercent: 10 }), 180);
assert.equal(totaleNettoRigaOrdine({ quantita: 1, prezzoUnitario: 50, scontoPercent: 0 }), 50);

const totals = calcolaTotaliOrdineFornitore({
  righe: [
    { quantita: 2, prezzoUnitario: 100, scontoPercent: 0, ivaPercent: 22, meta: {} },
    { quantita: 1, prezzoUnitario: 40, scontoPercent: 0, ivaPercent: 22, meta: {} },
  ],
  trasporto: 10,
  ivaPercent: 22,
});
assert.equal(totals.imponibileRighe, 240);
assert.equal(totals.imponibileSpeseVarie, 0);
assert.equal(totals.imponibile, 250);
assert.equal(totals.iva, 55);
assert.equal(totals.totale, 305);

const mixedIva = calcolaTotaliOrdineFornitore({
  righe: [
    { quantita: 1, prezzoUnitario: 100, scontoPercent: 0, ivaPercent: 22, meta: {} },
    { quantita: 1, prezzoUnitario: 100, scontoPercent: 0, ivaPercent: 10, meta: {} },
  ],
  trasporto: 10,
  ivaPercent: 22,
});
assert.equal(mixedIva.imponibileRighe, 200);
assert.equal(mixedIva.iva, 34.2);
assert.equal(mixedIva.totale, 244.2);

console.log("ordine-fornitore-totals.test.ts OK");
