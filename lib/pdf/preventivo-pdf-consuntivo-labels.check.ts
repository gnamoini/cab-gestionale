import assert from "node:assert/strict";
import {
  preventivoPdfLavorazioniSectionTitle,
  preventivoPdfMaterialiSectionTitle,
} from "@/lib/pdf/preventivo-pdf-body";

assert.equal(preventivoPdfLavorazioniSectionTitle("consuntivo"), "Lavorazioni da effettuare");
assert.equal(preventivoPdfLavorazioniSectionTitle("preventivo"), "Lavorazioni effettuate");
assert.equal(preventivoPdfMaterialiSectionTitle("consuntivo"), "Materiali da usare");
assert.equal(preventivoPdfMaterialiSectionTitle("preventivo"), "MATERIALI UTILIZZATI");

console.log("preventivo-pdf-consuntivo-labels.check.ts: ok");
