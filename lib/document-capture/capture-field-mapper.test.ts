import assert from "node:assert/strict";
import {
  mapCaptureFieldsToIngresso,
  mapCaptureFieldsToLavorazioni,
  mapCaptureFieldsToTagliando,
  parseCaptureCheckboxValue,
  resolveCaptureFieldValue,
  resolveCaptureLavorazioneNote,
  type CaptureFieldRow,
} from "@/lib/document-capture/capture-field-mapper";
import { resolveFieldValueForHash } from "@/lib/document-capture/resolve-fields-for-hash";

function row(field_key: string, value: string): CaptureFieldRow {
  return { field_key, confirmed_value: value, normalized_value: value };
}

function rowMultiline(
  field_key: string,
  raw: string,
  normalized: string,
): CaptureFieldRow {
  return { field_key, confirmed_value: null, normalized_value: normalized, raw_value: raw };
}

const fields: CaptureFieldRow[] = [
  row("data_ingresso", "18/06/2024"),
  row("attrezzatura", "Spazzatrice"),
  row("attrezzatura_marca", "CAT"),
  row("telaio_marca", "Iveco"),
  row("nome", "Mario"),
  row("cognome", "Rossi"),
  row("telefono", "3331234567"),
  row("note", "Urgente"),
];

const out = mapCaptureFieldsToIngresso(fields);

assert.equal(out.dataIngresso, "18/06/2024");
assert.equal(out.tipoAttrezzatura, "Spazzatrice");
assert.equal(out.marcaAttrezzatura, "CAT");
assert.equal(out.marcaTelaio, "Iveco");
assert.equal(out.richiedente, "Mario Rossi");
assert.equal(out.richiedenteTelefono, "3331234567");
assert.equal(resolveCaptureLavorazioneNote(fields), "Urgente");

const withRichiedente = mapCaptureFieldsToIngresso([
  row("richiedente", "Già compilato"),
  row("nome", "Ignorato"),
  row("cognome", "Ignorato"),
]);
assert.equal(withRichiedente.richiedente, "Già compilato");

const MULTILINE = "Riga 1\nRiga 2\nRiga 3";
const withAnomalia = mapCaptureFieldsToIngresso([
  rowMultiline("descrizione_anomalia", MULTILINE, "Riga 1 Riga 2 Riga 3"),
]);
assert.equal(withAnomalia.descrizioneAnomalia, MULTILINE);

const withoutDate = mapCaptureFieldsToIngresso([
  row("cliente", "Cliente Test"),
  row("targa", "AB123CD"),
]);
assert.equal(withoutDate.dataIngresso, "");

const manualCleared = resolveCaptureFieldValue({
  field_key: "riga_1_lavorazione",
  confirmed_value: null,
  normalized_value: "Testo OCR da ignorare",
  raw_value: "Testo OCR raw",
  value_source: "manual",
});
assert.equal(manualCleared, "");

const manualLav = mapCaptureFieldsToLavorazioni([
  {
    field_key: "riga_1_lavorazione",
    confirmed_value: "Lavoro corretto",
    normalized_value: "Lavoro OCR sbagliato",
    raw_value: "Lavoro OCR raw",
    value_source: "manual",
  },
  {
    field_key: "riga_1_data",
    confirmed_value: "01/02/2025",
    normalized_value: "01/02/2024",
    value_source: "manual",
  },
  {
    field_key: "riga_2_lavorazione",
    confirmed_value: null,
    normalized_value: "Seconda riga OCR",
    value_source: "manual",
  },
]);
assert.equal(manualLav.righe.length, 1);
assert.equal(manualLav.righe[0]?.lavorazioniEffettuate, "Lavoro corretto");
assert.equal(manualLav.righe[0]?.dataLavorazione, "01/02/2025");

assert.equal(
  resolveFieldValueForHash({
    field_key: "riga_2_lavorazione",
    confirmed_value: null,
    normalized_value: "OCR",
    value_source: "manual",
  }),
  null,
);

assert.equal(parseCaptureCheckboxValue("true"), true);
assert.equal(parseCaptureCheckboxValue("x"), true);
assert.equal(parseCaptureCheckboxValue("false"), false);
assert.equal(parseCaptureCheckboxValue(""), false);

const tagliandoFlags = mapCaptureFieldsToTagliando([
  row("riparazione", "true"),
  row("tagliando", "x"),
  row("garanzia", "si"),
  row("recidivo", "1"),
]);
assert.equal(tagliandoFlags.repairPresent, true);
assert.equal(tagliandoFlags.isTagliando, true);
assert.equal(tagliandoFlags.isGaranzia, true);
assert.equal(tagliandoFlags.isRecidivo, true);

const legacyTipo = mapCaptureFieldsToTagliando([row("tipo_intervento", "Riparazione + tagliando")]);
assert.equal(legacyTipo.repairPresent, true);
assert.equal(legacyTipo.isTagliando, true);

console.log("capture-field-mapper.test.ts OK");
