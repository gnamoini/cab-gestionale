import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const launcher = fs.readFileSync(
  path.join(ROOT, "components/document-capture/lavorazioni-digital-capture-launcher.tsx"),
  "utf8",
);
const sheetStep = fs.readFileSync(
  path.join(ROOT, "components/document-capture/capture-scheda-sheet-compile-step.tsx"),
  "utf8",
);
const lavorazioniForm = fs.readFileSync(
  path.join(ROOT, "components/lavorazioni/schede/scheda-lavorazioni-form-body.tsx"),
  "utf8",
);

const linkFn = launcher.slice(
  launcher.indexOf("const linkCaptureToLavorazione"),
  launcher.indexOf("const handleAssignToLavorazione"),
);
assert.doesNotMatch(linkFn, /applyAssignOnly\(/);
assert.match(launcher, /linkCaptureToLavorazione/);
assert.match(launcher, /sheet-compile/);
assert.match(launcher, /CaptureSchedaSheetCompileStep/);
assert.match(launcher, /CAPTURE_SHEET_COMPILE_FORM_ID/);
assert.match(launcher, /Conferma import/);
assert.match(sheetStep, /variant="capture"/);
assert.match(sheetStep, /reviewCount=\{reviewCount\}/);
assert.match(lavorazioniForm, /Identificazione:/);
assert.match(sheetStep, /submittingRef/);
assert.match(
  fs.readFileSync(path.join(ROOT, "components/document-capture/capture-mezzo-match-step.tsx"), "utf8"),
  /Conferma assegnazione/,
);

console.log("capture-sheet-compile-flow.test.ts OK");
