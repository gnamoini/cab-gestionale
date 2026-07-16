import assert from "node:assert/strict";
import {
  captureMultiSchedaPostIngressoQueue,
  checkCaptureMultiSchedaIdentMismatches,
  detectCaptureSchedaTipos,
  isCaptureMultiSchedaBundle,
} from "@/lib/document-capture/capture-multi-scheda";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";

function row(field_key: string, value: string): CaptureFieldRow {
  return { field_key, confirmed_value: value, normalized_value: value };
}

const ingressoLavRic: CaptureFieldRow[] = [
  row("cliente", "SIECO SpA"),
  row("data_ingresso", "18/06/2023"),
  row("descrizione_anomalia", "Guasto"),
  row("riga_1_lavorazione", "Riparazione"),
  row("riga_1_codice", "ABC"),
  row("riga_1_qt", "2"),
];

const tipos = detectCaptureSchedaTipos(ingressoLavRic);
assert.deepEqual(tipos, ["ingresso", "lavorazioni", "ricambi"]);
assert.equal(isCaptureMultiSchedaBundle(tipos), true);
assert.deepEqual(captureMultiSchedaPostIngressoQueue(tipos), ["lavorazioni", "ricambi"]);

const lavOnly = detectCaptureSchedaTipos([row("riga_1_lavorazione", "X")]);
assert.deepEqual(lavOnly, ["lavorazioni"]);
assert.equal(isCaptureMultiSchedaBundle(lavOnly), false);

const mismatch = checkCaptureMultiSchedaIdentMismatches([
  row("cliente", "Cliente A"),
  row("data_ingresso", "01/01/2024"),
  row("matricola", "MAT-001"),
  row("targa_matricola", "MAT-999"),
  row("riga_1_lavorazione", "Lav"),
]);
assert.ok(mismatch.some((m) => m.includes("Matricola")));

console.log("capture-multi-scheda.test.ts OK");
