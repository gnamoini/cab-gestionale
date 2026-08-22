import assert from "node:assert/strict";
import {
  aggregateInTransitByRicambioId,
  computeInTransitQtyForRicambio,
  formatMagazzinoScortaWithInTransit,
  magazzinoScortaAriaLabel,
} from "@/lib/ordini-fornitori/ordine-fornitore-in-transit";
import {
  canTransitionOrdineFornitoreStatus,
  normalizeOrdineFornitoreStatus,
  ordineFornitoreIsFullyReceived,
  ordineFornitoreResidualQty,
} from "@/lib/ordini-fornitori/ordine-fornitore-status-transitions";

assert.equal(normalizeOrdineFornitoreStatus("spedito"), "in_consegna");
assert.equal(normalizeOrdineFornitoreStatus("ricevuto"), "consegnato");

assert.equal(ordineFornitoreResidualQty(5, 3), 2);
assert.equal(
  computeInTransitQtyForRicambio(
    [
      { ricambioId: "a", quantita: 5, quantitaRicevuta: 2, ordineStatus: "in_consegna" },
      { ricambioId: "a", quantita: 1, quantitaRicevuta: 0, ordineStatus: "inviato" },
    ],
    "a",
  ),
  3,
);

assert.deepEqual(
  aggregateInTransitByRicambioId([
    { ricambioId: "a", qtyInTransit: 2 },
    { ricambioId: "a", qtyInTransit: 1 },
  ]),
  { a: 3 },
);

assert.equal(formatMagazzinoScortaWithInTransit(1, 0), "1");
assert.equal(formatMagazzinoScortaWithInTransit(1, 2), "1 (2)");
assert.equal(magazzinoScortaAriaLabel(1, 2), "1 disponibili, 2 in consegna");

assert.equal(canTransitionOrdineFornitoreStatus("inviato", "in_consegna"), true);
assert.equal(canTransitionOrdineFornitoreStatus("inviato", "consegnato"), false);
assert.equal(canTransitionOrdineFornitoreStatus("in_consegna", "consegnato"), false);

assert.equal(
  ordineFornitoreIsFullyReceived([
    { quantita: 5, quantitaRicevuta: 3 },
    { quantita: 2, quantitaRicevuta: 2 },
  ]),
  false,
);
assert.equal(
  ordineFornitoreIsFullyReceived([
    { quantita: 5, quantitaRicevuta: 5 },
    { quantita: 2, quantitaRicevuta: 2 },
  ]),
  true,
);

console.log("ordine-fornitore-in-transit.test.ts OK");
