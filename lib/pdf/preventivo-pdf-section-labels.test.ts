import assert from "node:assert/strict";
import {
  preventivoPdfLavorazioniSectionTitle,
  preventivoPdfMaterialiSectionTitle,
} from "@/lib/pdf/preventivo-pdf-section-labels";

assert.equal(preventivoPdfLavorazioniSectionTitle("preventivo"), "Lavorazioni da effettuare");
assert.equal(preventivoPdfLavorazioniSectionTitle("consuntivo"), "Lavorazioni effettuate");
assert.equal(preventivoPdfMaterialiSectionTitle("preventivo"), "Materiali da utilizzare");
assert.equal(preventivoPdfMaterialiSectionTitle("consuntivo"), "Materiali utilizzati");

console.log("preventivo-pdf-section-labels.test.ts: ok");
