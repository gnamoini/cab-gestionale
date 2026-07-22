import assert from "node:assert/strict";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import {
  approvedCreatesFromCaptureFields,
  normalizeApprovedCreates,
  resolveApprovedCreatesForApply,
} from "@/lib/document-capture/capture-approved-creates";

function row(field_key: string, value: string): CaptureFieldRow {
  return { field_key, confirmed_value: value, normalized_value: value };
}

const ingressoOnly = [
  row("cliente", "ACME"),
  row("data_ingresso", "01/01/2024"),
  row("descrizione_anomalia", "Guasto"),
];

assert.deepEqual(approvedCreatesFromCaptureFields(ingressoOnly), {
  mezzo: true,
  lavorazioni: false,
  ricambi: false,
});

assert.deepEqual(
  approvedCreatesFromCaptureFields([...ingressoOnly, row("riga_1_lavorazione", "Riparazione")]),
  { mezzo: true, lavorazioni: true, ricambi: false },
);

assert.deepEqual(
  approvedCreatesFromCaptureFields([
    ...ingressoOnly,
    row("riga_1_lavorazione", "Riparazione"),
    row("riga_1_codice", "ABC"),
  ]),
  { mezzo: true, lavorazioni: true, ricambi: true },
);

assert.deepEqual(approvedCreatesFromCaptureFields([row("scheda_tipo", "ricambi"), row("riga_1_codice", "X")]), {
  mezzo: true,
  lavorazioni: false,
  ricambi: true,
});

assert.deepEqual(normalizeApprovedCreates({ mezzo: true }), {
  mezzo: true,
  lavorazioni: false,
  ricambi: false,
});

assert.deepEqual(normalizeApprovedCreates({ mezzo: true, lavorazioni: true, ricambi: true }), {
  mezzo: true,
  lavorazioni: true,
  ricambi: true,
});

assert.deepEqual(resolveApprovedCreatesForApply(null, ingressoOnly), {
  mezzo: true,
  lavorazioni: false,
  ricambi: false,
});

console.log("capture-approved-creates.test.ts OK");
