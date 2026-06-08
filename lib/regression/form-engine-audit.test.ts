/**
 * Audit: Form Submission Engine (FSE) — snapshot, flush SSOT, submit lock, integrazione modali pilota.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  captureFormSnapshot,
  createSubmitLock,
  freezeSnapshot,
  prepareFormSubmit,
} from "@/lib/forms/form-engine";
import { prepareGestionaleModalSave } from "@/lib/ui/gestionale-modal-save-prep";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// Snapshot immutabilità
const source = { a: 1, nested: { b: 2 } };
const snap = captureFormSnapshot(() => source);
source.a = 99;
(source.nested as { b: number }).b = 99;
assert.equal(snap.a, 1);
assert.equal((snap.nested as { b: number }).b, 2);

const frozen = freezeSnapshot({ x: "y" });
assert.equal(frozen.x, "y");

// Submit lock — doppio acquire
const lock = createSubmitLock();
assert.equal(lock.acquire(), true);
assert.equal(lock.acquire(), false);
lock.release();
assert.equal(lock.acquire(), true);
lock.release();

// prepareFormSubmit + wrapper save prep
const prepSource = read("lib/forms/form-engine/prepare-form-submit.ts");
assert.match(prepSource, /flushGestionalePendingCommits/);
assert.match(prepSource, /flushSync/);

const savePrep = read("lib/ui/gestionale-modal-save-prep.ts");
assert.match(savePrep, /prepareFormSubmit/);

const iosGuard = read("lib/forms/form-engine/ios-submit-guard.ts");
assert.match(iosGuard, /compositionend/);
assert.match(iosGuard, /formEngineCompositionTimeout/);

const hookSource = read("lib/forms/form-engine/use-form-engine.ts");
assert.match(hookSource, /useFormEngine/);
assert.match(hookSource, /useFormEngineSections/);
assert.match(hookSource, /gestionaleFormFocusScopeProps/);
assert.match(hookSource, /iosSubmitGuard/);

const runSubmitSrc = read("lib/forms/form-engine/run-submit.ts");
assert.match(runSubmitSrc, /runSubmitFromGetter/);
assert.match(runSubmitSrc, /runButtonSubmit/);
assert.match(runSubmitSrc, /prepareFormSubmitAsync/);

const submitLockHook = read("lib/forms/form-engine/use-submit-lock.ts");
assert.match(submitLockHook, /useSubmitLock/);

// runSubmitFromGetter usa captureFormSnapshot (isolamento già verificato sopra)
assert.match(runSubmitSrc, /captureFormSnapshot/);

// Modali pilota
const schedaEdit = read("components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx");
assert.match(schedaEdit, /useFormEngine/);
assert.match(schedaEdit, /runSubmit/);

const ricambioNew = read("components/gestionale/magazzino/ricambio-new-modal.tsx");
assert.match(ricambioNew, /useFormEngine/);
assert.match(ricambioNew, /runSubmit/);

const lavCreate = read("components/gestionale/lavorazioni/lavorazione-create-modal.tsx");
assert.match(lavCreate, /useFormEngineSections/);
assert.match(lavCreate, /runSubmit/);

// prepareGestionaleModalSave delega (runtime no-op senza DOM)
prepareGestionaleModalSave(null);
prepareFormSubmit(null);

console.log("form-engine-audit.test.ts OK");
