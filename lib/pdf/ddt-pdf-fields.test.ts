import assert from "node:assert/strict";
import {
  buildDdtDestinatarioPdfFields,
  buildDdtOggettoInterventoPdfFields,
  buildDdtTrasportoPdfFields,
} from "@/lib/pdf/ddt-pdf-fields";
import { tripleFieldRowCount } from "@/lib/pdf/gestionale-section-table";
import type { DdtDocumentRow } from "@/src/types/supabase-tables";

const baseDoc = {
  id: "ddt-1",
  cliente_label: "ACME Srl",
  customer_snapshot: {
    cliente: "ACME Srl",
    cantiere: "Cantiere Nord",
    utilizzatore: "Mario Rossi",
    preventivo_numero: "PRV-2026-001",
  },
  luogo_consegna: {
    indirizzo: "Via Roma 1",
    cap: "20100",
    citta: "Milano",
    provincia: "MI",
  },
  mezzo_snapshot: {
    targa: "AA111BB",
    marca: "Iveco",
    modello: "Daily",
    matricola: "MAT-99",
  },
  attrezzatura_snapshot: {
    tipoAttrezzatura: "Escavatore",
    marca: "CAT",
    modello: "320",
    matricola: "MAT-001",
  },
  target_type: "attrezzatura",
  causale_trasporto: "Consegna merci",
  vettore: "Trasporti CAB",
  data_consegna: "2026-07-31",
  data_documento: "2026-07-30",
} as DdtDocumentRow;

const destinatario = buildDdtDestinatarioPdfFields(baseDoc);
assert.ok(destinatario.some((f) => f.label === "Cliente" && f.value === "ACME Srl"));
assert.ok(destinatario.some((f) => f.label === "Cantiere" && f.value === "Cantiere Nord"));
assert.equal(destinatario.some((f) => f.label === "Richiedente"), false);

const oggetto = buildDdtOggettoInterventoPdfFields(baseDoc);
assert.ok(oggetto.some((f) => f.label === "Tipo attrezzatura" && f.value === "Escavatore"));
assert.ok(oggetto.some((f) => f.label === "Marca" && f.value === "CAT"));
assert.ok(
  tripleFieldRowCount(oggetto.length) < oggetto.length,
  "oggetto usa griglia 3 colonne",
);

const telaioDoc = {
  ...baseDoc,
  target_type: "telaio",
  attrezzatura_snapshot: {},
  mezzo_snapshot: {
    targa: "BB222CC",
    marca: "Iveco",
    modello: "Stralis",
    telaio: "Stralis X-Way",
  },
} as DdtDocumentRow;
const oggettoTelaio = buildDdtOggettoInterventoPdfFields(telaioDoc);
assert.ok(oggettoTelaio.some((f) => f.label === "Targa" && f.value === "BB222CC"));
assert.equal(oggettoTelaio.some((f) => f.label === "Matricola"), false);

const trasporto = buildDdtTrasportoPdfFields(baseDoc);
assert.ok(trasporto.some((f) => f.label === "Luogo consegna" && f.value.includes("Via Roma 1")));
assert.ok(trasporto.some((f) => f.label === "Causale trasporto" && f.value === "Consegna merci"));
assert.ok(trasporto.some((f) => f.label === "Vettore" && f.value === "Trasporti CAB"));
assert.ok(trasporto.some((f) => f.label === "Rif. preventivo" && f.value === "PRV-2026-001"));
assert.ok(trasporto.some((f) => f.label === "Data consegna prevista" && f.value === "31/07/2026"));

console.log("ddt-pdf-fields.test.ts: ok");
