/**
 * Form UX Migration — event-driven shadow evaluator unit tests.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { evaluateSSOTSnapshot } from "@/lib/form-ux-migration/evaluate-ssot-snapshot";
import {
  resetShadowEvaluationDedup,
  runShadowEvaluation,
} from "@/lib/form-ux-migration/run-shadow-evaluation";
import { FORM_UX_SHADOW_DEBOUNCE_MS } from "@/lib/form-ux-migration/shadow-config";
import {
  clearFormUxMigrationEvents,
  getFormUxMigrationEvents,
} from "@/lib/form-ux-migration/telemetry";

const ROOT = process.cwd();

// evaluateSSOTSnapshot: number normalization
const snap = evaluateSSOTSnapshot("prezzo-listino", "number", "1.0");
assert.equal(snap.normalized, "1");
assert.equal(snap.raw, "1.0");
assert.equal(snap.fieldId, "prezzo-listino");

// text pipeline: NFC + trim trailing
const textSnap = evaluateSSOTSnapshot("richiedente", "text", "Mario  ");
assert.equal(textSnap.normalized, "Mario");

// Debounce constant in range 150–300ms
assert.ok(FORM_UX_SHADOW_DEBOUNCE_MS >= 150 && FORM_UX_SHADOW_DEBOUNCE_MS <= 300);
assert.equal(FORM_UX_SHADOW_DEBOUNCE_MS, 200);

// runShadowEvaluation: match equivalent values
clearFormUxMigrationEvents();
resetShadowEvaluationDedup();
const matchResult = runShadowEvaluation({
  formId: "ricambio",
  fieldId: "prezzo-listino",
  kind: "number",
  legacyValue: "12.50",
  trigger: "blur",
});
assert.equal(matchResult.match, true);
const matchEvents = getFormUxMigrationEvents();
assert.equal(matchEvents.length, 1);
assert.equal(matchEvents[0]?.trigger, "blur");
assert.equal(matchEvents[0]?.evaluation, "event-driven");
assert.equal(matchEvents[0]?.mismatch, undefined);

// runShadowEvaluation: deterministic compare on same snapshot (legacy === ssot for number pass-through)
clearFormUxMigrationEvents();
resetShadowEvaluationDedup();
const sameResult = runShadowEvaluation({
  formId: "ricambio",
  fieldId: "prezzo-listino",
  kind: "number",
  legacyValue: "99",
  trigger: "change",
});
assert.equal(sameResult.match, true);

// Shadow config documented in source
const shadowConfig = fs.readFileSync(
  path.join(ROOT, "lib/form-ux-migration/shadow-config.ts"),
  "utf8",
);
assert.match(shadowConfig, /FORM_UX_SHADOW_DEBOUNCE_MS = 200/);

// Hook exists
assert.ok(
  fs.existsSync(path.join(ROOT, "components/form-ux-migration/use-shadow-field-evaluation.ts")),
);

console.log("form-ux-migration-shadow-evaluator.test.ts OK");
