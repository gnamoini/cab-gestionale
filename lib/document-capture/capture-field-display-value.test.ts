import assert from "node:assert/strict";
import {
  formatCaptureMultilineText,
  formatCapturePersonName,
  formatCaptureProperLabel,
  formatCaptureReviewDisplayValue,
  formatCaptureReviewDraftValue,
  formatCaptureTargaValue,
  inferCaptureMultilineBreaks,
  isCaptureMultilineFieldKey,
  isCapturePersonNameFieldKey,
  isCaptureTargaFieldKey,
  matchCapturePersonNameFromAddetti,
  polishCaptureWorkshopOcrText,
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

assert.equal(
  formatCaptureReviewDisplayValue("descrizione_anomalia", {
    raw: "Riga 1\nRiga 2",
    normalized: "Riga 1 Riga 2",
  }),
  "Riga 1\nRiga 2",
);

assert.equal(
  formatCaptureReviewDraftValue("descrizione_anomalia", "  prima\nseconda  "),
  "Prima\nSeconda",
);

assert.equal(formatCaptureMultilineText("PERDITA OLIO\nVALVOLA ROTTA"), "Perdita olio\nValvola rotta");
assert.equal(formatCaptureMultilineText("motore non parte"), "Motore non parte");

assert.equal(
  formatCaptureMultilineText("* gia' sostituita una ruota. Completa di supp da."),
  "* Già sostituita una ruota.\nCompleta di supporto da.",
);

assert.equal(
  formatCaptureMultilineText(
    "* Già SOSTITUITA UNA RUOTA BOCCA ASPIRAZ. COMPLETA di supporto.",
  ),
  "* Già sostituita una ruota bocca aspiraz.\nCompleta di supporto.",
);

const workshopScan = `Gia' sostituita una ruota bocca aspirae. Completa di supp
Da. Sostituire
Xn. 1 pompa acqua elettrica ok
N.1 motore pompa cod. Ok
N ugelli non funzionanti cor verificare) ok
In 1 kit minigonne bocca aspiratione ok`;

const polished = formatCaptureMultilineText(workshopScan);
assert.match(polished, /Già sostituita una ruota bocca aspirazione/i);
assert.match(polished, /Completa di supporto da\./i);
assert.match(polished, /N\. 1 pompa acqua elettrica OK/i);
assert.match(polished, /per verificare/i);
assert.doesNotMatch(polished, /aspirae|aspiratione| cor /i);
assert.match(polishCaptureWorkshopOcrText("xn. 2 valvole"), /n\. 2 valvole/);

assert.equal(
  inferCaptureMultilineBreaks("riga uno. Riga due"),
  "riga uno.\nRiga due",
);

assert.equal(
  formatCaptureReviewDisplayValue("descrizione_anomalia", {
    raw: "PERDITA OLIO\nRIGA 2",
    normalized: "perdita olio riga 2",
  }),
  "Perdita olio\nRiga 2",
);

const literalNewlines =
  "* Già sostituita una ruota bocca aspiraz.\\nCompleta di supporto.**\\n\\n**DA sostituire**\\nN.** 1 pompa acqua elettrica OK";
const unescaped = formatCaptureMultilineText(literalNewlines);
assert.doesNotMatch(unescaped, /\\n/);
assert.match(unescaped, /\n/);
assert.match(unescaped, /da sostituire/i);
assert.match(unescaped, /1 pompa acqua elettrica OK/i);

console.log("capture-field-display-value.test.ts OK");
