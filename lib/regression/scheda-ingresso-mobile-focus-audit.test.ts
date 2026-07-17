/**
 * Audit statico: focus scroll mobile Scheda di Ingresso e infrastruttura modali.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const behavior = read("lib/ui/mobile-modal-behavior.ts");
const formSection = read("components/gestionale/schede/gestionale-form-section.tsx");
const ingressoForm = read("components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx");
const anagrafica = read("components/gestionale/schede/scheda-ingresso-anagrafica-fields.tsx");
const keyboardHook = read("lib/ui/use-mobile-modal-keyboard.ts");
const iosStability = read("src/components/ios-interaction-stability.tsx");

assert.match(behavior, /MOBILE_FOCUS_EXTRA_TOP = 16/);
assert.match(behavior, /getFocusScrollRect[\s\S]*findGroupTitleElement/);
assert.match(behavior, /resolveFocusExtraTop/);

assert.match(formSection, /CAB_FOCUS_SCROLL_GROUP_ATTR/);
assert.match(formSection, /CAB_FIELD_LABEL_ATTR/);
assert.match(formSection, /<h3/);

assert.match(ingressoForm, /GestionaleModalScrollBody/);
assert.match(ingressoForm, /FormSection/);
assert.match(ingressoForm, /GestionaleTextarea/);
assert.match(anagrafica, /FormSection/);
assert.match(anagrafica, /FormField/);

assert.match(keyboardHook, /subscribeGestionaleViewport/);
assert.doesNotMatch(keyboardHook, /scrollGestionaleFieldIntoView/);

assert.match(iosStability, /handleFocusInForMobileModal/);
assert.match(iosStability, /mountGestionaleViewportOrchestrator/);

const orchestrator = read("lib/ui/gestionale-viewport-orchestrator.ts");
assert.match(orchestrator, /waitForViewportStable/);

const mezziForm = read("components/gestionale/mezzi/mezzi-form-fields.tsx");
const ricambioForm = read("components/gestionale/magazzino/ricambio-form-fields.tsx");
assert.match(mezziForm, /CAB_FOCUS_SCROLL_GROUP_ATTR/);
assert.match(ricambioForm, /CAB_FOCUS_SCROLL_GROUP_ATTR/);

console.log("scheda-ingresso-mobile-focus-audit.test.ts OK");
