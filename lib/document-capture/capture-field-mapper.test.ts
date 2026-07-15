import assert from "node:assert/strict";
import { mapCaptureFieldsToIngresso, type CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";

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
  row("attrezzatura_marca", "CAT"),
  row("telaio_marca", "Iveco"),
  row("nome", "Mario"),
  row("cognome", "Rossi"),
  row("telefono", "3331234567"),
  row("note", "Urgente"),
];

const out = mapCaptureFieldsToIngresso(fields);

assert.equal(out.marcaAttrezzatura, "CAT");
assert.equal(out.marcaTelaio, "Iveco");
assert.equal(out.richiedente, "Mario Rossi");
assert.equal(out.richiedenteTelefono, "3331234567");
assert.equal(out.noteIntervento, "Urgente");

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

const MULTILINE = "Riga 1\nRiga 2\nRiga 3";
const withAnomalia = mapCaptureFieldsToIngresso([
  rowMultiline("descrizione_anomalia", MULTILINE, "Riga 1 Riga 2 Riga 3"),
]);
assert.equal(withAnomalia.descrizioneAnomalia, MULTILINE);

console.log("capture-field-mapper.test.ts OK");
