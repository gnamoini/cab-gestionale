import assert from "node:assert/strict";
import {
  formatCapturePersonName,
  formatCaptureProperLabel,
  formatCaptureReviewDisplayValue,
  formatCaptureReviewDraftValue,
  formatCaptureTargaValue,
  isCaptureMultilineFieldKey,
  isCapturePersonNameFieldKey,
  isCaptureTargaFieldKey,
  matchCapturePersonNameFromAddetti,
} from "@/lib/document-capture/capture-field-display-value";

assert.equal(formatCaptureTargaValue("ab 123 cd"), "AB123CD");
assert.equal(isCaptureTargaFieldKey("targa_matricola"), true);
assert.equal(isCapturePersonNameFieldKey("riga_1_nome"), true);

assert.equal(formatCapturePersonName("MARIO"), "Mario");
assert.equal(formatCapturePersonName("mario"), "Mario");
assert.equal(formatCapturePersonName("mArio b."), "Mario B.");

const addetti = [
  { id: "a1", nome: "Donato", cognome: "Macina" },
  { id: "a2", nome: "Mario", cognome: "Bianchi" },
];

assert.equal(matchCapturePersonNameFromAddetti("Donato", addetti), "Donato Macina");
assert.equal(matchCapturePersonNameFromAddetti("mario b.", addetti), "Mario Bianchi");

assert.equal(formatCaptureProperLabel("impresa edile rossi spa"), "Impresa Edile Rossi S.p.A.");

assert.equal(
  formatCaptureReviewDisplayValue("cliente", {
    raw: "Impresa Edile Rossi S.p.A.",
    normalized: "impresa edile rossi spa",
  }),
  "Impresa Edile Rossi S.p.A.",
);

assert.equal(
  formatCaptureReviewDisplayValue("cliente", {
    normalized: "impresa edile rossi spa",
  }),
  "Impresa Edile Rossi S.p.A.",
);

assert.equal(
  formatCaptureReviewDisplayValue("marca_attrezzatura", {
    raw: "Caterpillar",
    normalized: "caterpillar",
  }),
  "Caterpillar",
);

assert.equal(
  formatCaptureReviewDisplayValue(
    "riga_1_nome",
    { raw: "Mario B.", normalized: "mario b" },
    { addettiRecords: addetti },
  ),
  "Mario Bianchi",
);

assert.equal(
  formatCaptureReviewDisplayValue("marca_attrezzatura", {
    raw: "SCMIDT SRL",
    normalized: "schmidt",
    resolvedLabel: "SCHMIDT",
  }),
  "SCHMIDT",
);

assert.equal(
  formatCaptureReviewDisplayValue("targa", {
    raw: "ab 123 cd",
    normalized: "ab123cd",
  }),
  "AB123CD",
);

assert.equal(formatCaptureReviewDraftValue("targa", "xy 999 zz"), "XY999ZZ");
assert.equal(formatCaptureReviewDraftValue("riga_1_nome", "mario b.", { addettiRecords: addetti }), "Mario Bianchi");
assert.equal(isCaptureMultilineFieldKey("descrizione_anomalia"), true);
assert.equal(isCaptureMultilineFieldKey("cliente"), false);

console.log("capture-field-display-value.test.ts OK");
