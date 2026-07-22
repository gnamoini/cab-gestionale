import assert from "node:assert/strict";
import {
  captureFieldRowsToOcrBaseline,
  diffCapturePatches,
  roundTripSchedaCaptureFields,
  schedaFieldsToCompilePayload,
  schedaLavorazioniFieldsToCapturePatches,
  schedaRicambiFieldsToCapturePatches,
} from "@/lib/document-capture/capture-scheda-compile-payload";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import { newRigaId } from "@/lib/schede/schede-ui";
import type { SchedaRicambiFields } from "@/types/schede";

function field(key: string, value: string): CaptureFieldRow {
  return { field_key: key, normalized_value: value, confirmed_value: value, raw_value: value };
}

const lavRows: CaptureFieldRow[] = [
  field("targa_matricola", "AB 123 CD"),
  field("riga_1_lavorazione", "Cambio olio"),
  field("riga_1_nome", "Mario Rossi"),
  field("riga_1_ore", "2"),
  field("riga_2_lavorazione", ""),
];

const { fields: lavFields, patches: lavPatches } = roundTripSchedaCaptureFields("lavorazioni", lavRows);
assert.equal(lavFields.identificazioneMacchina, "AB 123 CD");
assert.equal(lavFields.righe.length, 1);
assert.ok(lavPatches.some((p) => p.fieldKey === "riga_1_lavorazione" && p.value === "Cambio olio"));

const cleared = schedaLavorazioniFieldsToCapturePatches({
  identificazioneMacchina: "",
  righe: [
    {
      id: newRigaId(),
      dataLavorazione: "01/01/2026",
      lavorazioniEffettuate: "",
      addettiAssegnati: [],
    },
  ],
});
assert.ok(cleared.some((p) => p.fieldKey === "riga_1_lavorazione" && p.action === "clear"));

const ricRows: CaptureFieldRow[] = [
  field("targa_matricola", "T1"),
  field("riga_1_codice", "XYZ"),
  field("riga_1_nome", "Filtro"),
  field("riga_1_qt", "2"),
];
const { fields: ricFieldsRaw } = roundTripSchedaCaptureFields("ricambi", ricRows);
const ricFields = ricFieldsRaw as SchedaRicambiFields;
assert.equal(ricFields.righe[0]?.codice, "XYZ");
assert.equal(ricFields.righe[0]?.quantita, 2);

const baseline = captureFieldRowsToOcrBaseline(ricRows);
const payload = schedaFieldsToCompilePayload("ricambi", "cap-1", ricFields);
assert.equal(payload.schemaVersion, 1);
assert.equal(payload.captureId, "cap-1");
assert.ok(payload.operationId.length > 0);
const editedPatches = schedaRicambiFieldsToCapturePatches(
  { ...ricFields, righe: ricFields.righe.map((r) => ({ ...r, codice: "ABC" })) },
  "user",
);
const changed = diffCapturePatches(baseline, editedPatches);
assert.ok(changed.some((p) => p.fieldKey === "riga_1_codice" && p.value === "ABC"));

console.log("capture-scheda-compile-payload.test.ts OK");
