import assert from "node:assert/strict";
import {
  emptyOrdineFornitoreLogistica,
  ordineFornitoreLogisticaHasData,
  ordineFornitoreLogisticaPdfFields,
  ordineFornitoreLogisticaToRecord,
  parseOrdineFornitoreLogistica,
  patchOrdineFornitoreLogisticaSnapshot,
} from "@/lib/ordini-fornitori/ordine-fornitore-logistica";

assert.equal(ordineFornitoreLogisticaHasData({}), false);

const defaults = emptyOrdineFornitoreLogistica();
assert.equal(defaults.aspettoEsteriore, "cartoni");
assert.equal(defaults.trasportoCura, "destinatario");
assert.equal(defaults.causaleTrasporto, "vendita");
assert.equal(defaults.porto, "porto_franco");
assert.equal(defaults.vettore, "bartolini");
assert.equal(defaults.metodoPagamento, "bonifico_anticipato");
assert.equal(defaults.numeroColli, "1");
assert.equal(
  ordineFornitoreLogisticaHasData(ordineFornitoreLogisticaToRecord(defaults)),
  true,
);

const legacy = parseOrdineFornitoreLogistica({ causaleVendita: "vendita" });
assert.equal(legacy.causaleTrasporto, "vendita");

const patched = patchOrdineFornitoreLogisticaSnapshot(emptyOrdineFornitoreLogistica(), {
  aspettoEsteriore: "pallet",
  porto: "ex_works",
  vettore: "bartolini",
  trasportoCura: "vettore",
  causaleTrasporto: "c_lavorazione",
});
assert.equal(parseOrdineFornitoreLogistica(patched).vettore, "bartolini");
assert.equal(ordineFornitoreLogisticaHasData(patched), true);

const pdf = ordineFornitoreLogisticaPdfFields(patched);
assert.ok(pdf.some((f) => f.label === "Aspetto esteriore" && f.value === "Pallet"));
assert.ok(pdf.some((f) => f.label === "Spedizione a cura di" && f.value === "Vettore"));
assert.ok(pdf.some((f) => f.label === "Causale trasporto" && f.value === "C/Lavorazione"));
assert.ok(pdf.some((f) => f.label === "Porto" && f.value === "Ex-works"));
assert.ok(pdf.some((f) => f.label === "Vettore" && f.value === "Bartolini"));

console.log("ordine-fornitore-logistica.test.ts ok");
