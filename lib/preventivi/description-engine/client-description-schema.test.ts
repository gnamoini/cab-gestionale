import assert from "node:assert/strict";
import { test } from "node:test";
import {
  composeClienteDescriptionSchema,
  generalizeClienteLineQuantities,
} from "@/lib/preventivi/description-engine/client-description-schema";

const emptyCtx = {
  cliente: "Tecno Industrie Urbis",
  targa: "ZA065YX",
  matricola: "M-001",
  existingPreventiviRecords: [] as const,
};

test("schema: ricerca anomalia → lavorazioni → rimontaggio", () => {
  const out = composeClienteDescriptionSchema({
    anomaliaText: "PTO non si inserisce",
    lavorazioniLines: [
      "Diagnosi impianto elettrico",
      "Verifica funzionamento impianto elettrico",
      "Verifica circuito idraulico, individuazione perdite e ripristino tenuta",
      "N. 2 portafusibili nel vano batteria e sost.",
    ],
    technicalBlob: "",
    ctx: emptyCtx,
  });

  const lines = out.clienteText
    .split("\n")
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);

  assert.ok(lines[0]!.toLowerCase().includes("ricerca"));
  assert.ok(lines[0]!.toLowerCase().includes("pto"));
  assert.ok(lines.some((l) => /diagnosi impianto elettrico/i.test(l)));
  assert.ok(lines.some((l) => /circuito idraulico/i.test(l)));
  assert.ok(lines.at(-1)!.toLowerCase().includes("rimontaggio"));
  assert.ok(!out.clienteText.match(/\bn\.?\s*2\b/i), "no quantità esplicite");
});

test("generalizeClienteLineQuantities: portafusibili senza numero", () => {
  const line = generalizeClienteLineQuantities("N. 2 portafusibili nel vano batteria e sost.");
  assert.ok(!/\bn\.?\s*2\b/i.test(line));
  assert.ok(/portafusibil/i.test(line));
});

console.log("client-description-schema.test.ts OK");
