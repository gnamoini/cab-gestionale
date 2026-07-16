import assert from "node:assert/strict";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import { mapCaptureFieldsToIngresso } from "@/lib/document-capture/capture-field-mapper";
import {
  normalizeCaptureExtractedFieldKey,
  normalizeCaptureIngressoDateValue,
  normalizeIngressoCaptureFieldRows,
  repairMisassignedIngressoCaptureFields,
  sanitizeCaptureExtractedFieldValue,
} from "@/lib/document-capture/capture-field-key-aliases";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";

assert.equal(normalizeCaptureExtractedFieldKey("ATTREZZATURA"), "tipo_attrezzatura");
assert.equal(normalizeCaptureExtractedFieldKey("Data ingresso"), "data_ingresso");
assert.equal(normalizeCaptureExtractedFieldKey("data di ingresso"), "data_ingresso");
assert.equal(normalizeCaptureIngressoDateValue("2024-06-18"), "18/06/2024");
assert.equal(normalizeCaptureIngressoDateValue("18/06/2024"), "18/06/2024");
assert.equal(normalizeCaptureExtractedFieldKey("attrezzatura_marca"), "attrezzatura_marca");

const attrezzaturaRow: CaptureFieldRow = {
  field_key: "attrezzatura",
  raw_value: "SPAZZATRICE",
  normalized_value: "SPAZZATRICE",
};
const mapped = mapCaptureFieldsToIngresso([attrezzaturaRow]);
assert.equal(mapped.tipoAttrezzatura, "SPAZZATRICE");
assert.equal(mapped.utilizzatore, "");

const misassigned: CaptureFieldRow[] = [
  {
    field_key: "utilizzatore",
    raw_value: "SPAZZATRICE",
    normalized_value: "SPAZZATRICE",
  },
];
const repaired = repairMisassignedIngressoCaptureFields(misassigned, {
  ...createMezziListePrefsDefault(),
  utilizzatori: ["Mario Rossi"],
  tipiAttrezzatura: ["Spazzatrice"],
});
assert.equal(repaired[0]?.field_key, "tipo_attrezzatura");
assert.equal(repaired[0]?.normalized_value, "Spazzatrice");

const normalized = normalizeIngressoCaptureFieldRows(
  [{ field_key: "utilizzatore", raw_value: "ESCAVATORE", normalized_value: "ESCAVATORE" }],
  {
    ...createMezziListePrefsDefault(),
    tipiAttrezzatura: ["Escavatore"],
  },
);
assert.equal(normalized[0]?.field_key, "tipo_attrezzatura");

assert.equal(sanitizeCaptureExtractedFieldValue("n_scuderia", "7"), "");
assert.equal(sanitizeCaptureExtractedFieldValue("n_scuderia", "1653"), "1653");
assert.equal(sanitizeCaptureExtractedFieldValue("n_scuderia", "."), "");

const scuderiaNoise = normalizeIngressoCaptureFieldRows([
  { field_key: "n_scuderia", raw_value: "7", normalized_value: "7" },
]);
assert.equal(scuderiaNoise[0]?.normalized_value, "");
assert.equal(mapCaptureFieldsToIngresso(scuderiaNoise).nScuderia, "");

console.log("capture-field-key-aliases.test.ts OK");
