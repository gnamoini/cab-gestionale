import assert from "node:assert/strict";
import {
  mapCaptureFieldsToIngresso,
  mapCaptureFieldsToLavorazioni,
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

const FIRMA = "data:image/png;base64,iVBORw0KGgo=";
const withFirme = mapCaptureFieldsToIngresso([
  row("firma_richiedente", FIRMA),
  row("firma_addetto", FIRMA),
]);
assert.equal(withFirme.richiedenteFirma, FIRMA);
assert.equal(withFirme.addettoFirma, FIRMA);

const withFirmeRawOnly = mapCaptureFieldsToIngresso([
  { field_key: "firma_richiedente", confirmed_value: null, normalized_value: null, raw_value: FIRMA },
  { field_key: "firma_addetto", confirmed_value: null, normalized_value: null, raw_value: FIRMA },
]);
assert.equal(withFirmeRawOnly.richiedenteFirma, FIRMA);
assert.equal(withFirmeRawOnly.addettoFirma, FIRMA);

const withFirmeJunkConfirmed = mapCaptureFieldsToIngresso([
  {
    field_key: "firma_addetto",
    confirmed_value: "presente",
    normalized_value: "presente",
    raw_value: FIRMA,
  },
]);
assert.equal(withFirmeJunkConfirmed.addettoFirma, FIRMA);

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

console.log("capture-field-mapper.test.ts OK");
