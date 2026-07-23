import assert from "node:assert/strict";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import { validateCaptureForApply, captureReviewAllowsForceApply } from "@/lib/document-capture/validation/validate-capture-for-apply";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

function field(key: string, value: string): CaptureFieldRow {
  return { field_key: key, confirmed_value: value, normalized_value: value };
}

function ricambio(partial: Pick<RicambioMagazzino, "id" | "codiceFornitoreOriginale" | "descrizione">): RicambioMagazzino {
  return {
    marca: "",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: "pz",
    note: "",
    categoria: "",
    compatibilitaMezzi: [],
    scorta: 0,
    scortaMinima: 0,
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
    ...partial,
  };
}

const magazzino = [ricambio({ id: "ric-1", codiceFornitoreOriginale: "FILTRO-ABC", descrizione: "Filtro olio" })];

const blocked = validateCaptureForApply({ fields: [field("scheda_tipo", "ingresso")] });
assert.equal(blocked.status, "BLOCKED");
assert.ok(blocked.issues.some((i) => i.code === "MISSING_CLIENTE"));

const ready = validateCaptureForApply({
  fields: [
    field("scheda_tipo", "ingresso"),
    field("cliente", "Cliente Test"),
    field("targa", "AB123CD"),
    field("data_ingresso", "18/06/2024"),
  ],
});
assert.equal(ready.status, "READY");

const missingDate = validateCaptureForApply({
  fields: [
    field("scheda_tipo", "ingresso"),
    field("cliente", "Cliente Test"),
    field("targa", "AB123CD"),
  ],
});
assert.equal(missingDate.status, "BLOCKED");
assert.ok(missingDate.issues.some((i) => i.code === "MISSING_DATA_INGRESSO"));

const ricambiReview = validateCaptureForApply({
  fields: [
    field("scheda_tipo", "ricambi"),
    field("riga_1_codice", "UNKNOWN-99"),
    field("riga_1_nome", "Pezzo sconosciuto"),
    field("riga_1_qt", "1"),
  ],
  magazzino,
});
assert.equal(ricambiReview.status, "READY");
assert.equal(ricambiReview.ricambiRows?.[0]?.status, "NOT_FOUND");
assert.ok(ricambiReview.issues.some((i) => i.code === "RICAMBIO_NOT_FOUND"));

const ricambiMatched = validateCaptureForApply({
  fields: [
    field("scheda_tipo", "ricambi"),
    field("riga_1_codice", "FILTRO-ABC"),
    field("riga_1_qt", "2"),
  ],
  magazzino,
});
assert.equal(ricambiMatched.ricambiRows?.[0]?.status, "MATCHED");
assert.equal(ricambiMatched.ricambiRows?.[0]?.ricambioId, "ric-1");

const notFoundReview = validateCaptureForApply({
  fields: [
    field("scheda_tipo", "ricambi"),
    field("riga_1_codice", "UNKNOWN"),
    field("riga_1_qt", "1"),
  ],
  magazzino,
});
assert.equal(notFoundReview.status, "READY");
assert.equal(captureReviewAllowsForceApply(notFoundReview), true);

const ambiguousOnly = validateCaptureForApply({
  fields: [
    field("scheda_tipo", "ricambi"),
    field("riga_1_codice", "FILTRO-ABC"),
    field("riga_1_qt", "1"),
  ],
  magazzino,
});
assert.equal(captureReviewAllowsForceApply(ambiguousOnly), true);

const lavorazioniNoRicambiWarning = validateCaptureForApply({
  fields: [
    field("scheda_tipo", "lavorazioni"),
    field("riga_1_lavorazione", "Cambio olio"),
    field("riga_1_nome", "Mario"),
    field("riga_1_ore", "2"),
    field("riga_5_nome", "Luigi"),
    field("riga_5_ore", "1"),
    field("riga_12_nome", "Anna"),
    field("riga_12_ore", "3"),
  ],
  magazzino,
});
assert.ok(!lavorazioniNoRicambiWarning.issues.some((i) => i.code === "RICAMBIO_NOT_FOUND"));
assert.equal(lavorazioniNoRicambiWarning.ricambiRows, undefined);

console.log("validate-capture-for-apply.test.ts OK");
