/**
 * Policy: error surfacing write path lavorazioni — action/context obbligatori.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const lavView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
const editModal = read("components/gestionale/lavorazioni/lavorazione-edit-modal.tsx");
const createModal = read("components/gestionale/lavorazioni/lavorazione-create-modal.tsx");

// Nessun "Operazione fallita" nel path lavorazioni
assert.doesNotMatch(lavView, /Operazione fallita/);
assert.doesNotMatch(createModal, /Operazione fallita/);
assert.doesNotMatch(read("src/hooks/gestionale/use-lavorazione-mutations.ts"), /Operazione fallita/);

// Write toast con action
assert.match(lavView, /lav-stato-.*action:\s*["']update["']/);
assert.match(lavView, /lav-priorita-.*action:\s*["']update["']/);
assert.match(lavView, /lav-conclude.*action:\s*["']update["']/);
assert.match(lavView, /lav-delete.*action:\s*["']delete["']/);
assert.match(lavView, /restoreLav\.mutate[\s\S]*onError/);
assert.match(lavView, /onIngressoCommitted[\s\S]*gestToast\.error/);
assert.match(lavView, /schede-save[\s\S]*action:\s*["']update["']/);

assert.match(createModal, /gestToast\.error\(err,\s*\{[^}]*action:\s*["']create["']/);
assert.match(editModal, /action:\s*["']update["']/);

console.log("lavorazioni-write-error-surfacing.test.ts OK");
