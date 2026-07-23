import assert from "node:assert/strict";
import {
  buildCaptureLavorazioniCompileData,
  reconcileCaptureSheetHintAfterEdit,
} from "@/lib/document-capture/capture-sheet-field-hints";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import { mapCaptureFieldsToLavorazioni } from "@/lib/document-capture/capture-field-mapper";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

const magazzino: RicambioMagazzino[] = [
  {
    id: "r1",
    marca: "OEM",
    codiceFornitoreOriginale: "XYZ",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: "pz",
    descrizione: "Filtro olio",
    note: "",
    categoria: "Filtri",
    compatibilitaMezzi: [],
    scorta: 5,
    scortaMinima: 1,
    dataUltimaModifica: "",
    autoreUltimaModifica: "",
    prezzoFornitoreOriginale: 0,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 0,
    fornitoriAlternativi: [],
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: 0,
    scontoFornitoreNonOriginale: 0,
  },
];

const notFoundHint = {
  tone: "catalog" as const,
  message: "Ricambio non trovato in magazzino",
  meta: { fieldKey: "riga_1_codice", source: "ocr" as const, status: "WARNING" as const },
};

const reconciled = reconcileCaptureSheetHintAfterEdit("riga_1_codice", "XYZ", notFoundHint, { magazzino });
assert.equal(reconciled, null);

const stillBad = reconcileCaptureSheetHintAfterEdit("riga_1_codice", "ABC", notFoundHint, { magazzino });
assert.ok(stillBad);

const lavRows: CaptureFieldRow[] = [
  { field_key: "riga_1_lavorazione", confirmed_value: "Cambio olio", normalized_value: "Cambio olio" },
  { field_key: "riga_1_nome", confirmed_value: "Mario", normalized_value: "Mario" },
];
const lavFields = mapCaptureFieldsToLavorazioni(lavRows);
const lavHints = buildCaptureLavorazioniCompileData({ fieldRows: lavRows, fields: lavFields }).hints;
assert.match(lavHints.riga_1_data?.message ?? "", /non letta/);
assert.match(lavHints.riga_1_ore?.message ?? "", /non lette/);

const oreUnreadableRows: CaptureFieldRow[] = [
  { field_key: "riga_1_lavorazione", confirmed_value: "Riparazione", normalized_value: "Riparazione" },
  { field_key: "riga_1_nome", confirmed_value: "Mario", normalized_value: "Mario" },
  { field_key: "riga_1_ore", confirmed_value: "abc", normalized_value: "abc" },
];
const oreUnreadableFields = mapCaptureFieldsToLavorazioni(oreUnreadableRows);
const oreUnreadableHints = buildCaptureLavorazioniCompileData({
  fieldRows: oreUnreadableRows,
  fields: oreUnreadableFields,
}).hints;
assert.match(oreUnreadableHints.riga_1_ore?.message ?? "", /non riconosciute/);

const dataHint = {
  tone: "catalog" as const,
  message: "Data non letta dalla scansione.",
  meta: { fieldKey: "riga_1_data", source: "ocr" as const, status: "WARNING" as const },
};
assert.equal(reconcileCaptureSheetHintAfterEdit("riga_1_data", "21/07/2026", dataHint), null);

assert.equal(reconcileCaptureSheetHintAfterEdit("riga_1_data", "", dataHint)?.meta.status, "WARNING");

const oreHint = {
  tone: "catalog" as const,
  message: "Ore non lette dalla scansione.",
  meta: { fieldKey: "riga_1_ore", source: "ocr" as const, status: "WARNING" as const },
};
assert.equal(reconcileCaptureSheetHintAfterEdit("riga_1_ore", "2", oreHint), null);
assert.equal(reconcileCaptureSheetHintAfterEdit("riga_1_ore", "0", oreHint)?.meta.status, "WARNING");

console.log("capture-sheet-field-hints.test.ts OK");
