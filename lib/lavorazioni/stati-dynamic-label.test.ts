import assert from "node:assert/strict";
import { statoLavorazioneLabel } from "@/lib/lavorazioni/stati-dynamic";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";

const stati: StatoLavorazioneConfig[] = [
  { id: "attesa_ricambi", label: "Attesa ricambi", color: "#7c3aed" },
  { id: "custom_2", label: "Verifica collaudo", color: "#0284c7" },
];

assert.equal(statoLavorazioneLabel("Attesa_ricambi", stati), "Attesa ricambi");
assert.equal(statoLavorazioneLabel("attesa_ricambi", stati), "Attesa ricambi");
assert.equal(statoLavorazioneLabel("Custom_2", stati), "Verifica collaudo");
assert.equal(statoLavorazioneLabel("Attesa ricambi", stati), "Attesa ricambi", "match by label");

console.log("stati-dynamic-label.test.ts OK");
