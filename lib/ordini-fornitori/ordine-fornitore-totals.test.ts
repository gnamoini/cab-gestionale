import assert from "node:assert/strict";
import {
  calcolaTotaliOrdineFornitore,
  totaleNettoRigaOrdine,
} from "@/lib/ordini-fornitori/ordine-fornitore-totals";

assert.equal(totaleNettoRigaOrdine({ quantita: 2, prezzoUnitario: 100, scontoPercent: 10 }), 180);
assert.equal(totaleNettoRigaOrdine({ quantita: 1, prezzoUnitario: 50, scontoPercent: 0 }), 50);

const totals = calcolaTotaliOrdineFornitore({
  righe: [
    { quantita: 2, prezzoUnitario: 100, scontoPercent: 0 },
    { quantita: 1, prezzoUnitario: 40, scontoPercent: 0 },
  ],
  trasporto: 10,
  ivaPercent: 22,
});
assert.equal(totals.imponibileRighe, 240);
assert.equal(totals.imponibile, 250);
assert.equal(totals.iva, 55);
assert.equal(totals.totale, 305);

console.log("ordine-fornitore-totals.test.ts OK");
