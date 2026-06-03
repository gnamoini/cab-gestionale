import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const bunderEditor = read("components/bunder/bunder-editor-modal.tsx");
const bunderView = read("components/bunder/bunder-view.tsx");
const dipendentiHook = read("src/hooks/use-dipendenti-timesheet.ts");
const impostazioni = read("components/dashboard/sistema-impostazioni-modal.tsx");
const preventivi = read("components/preventivi/preventivi-editor-modal.tsx");
const schede = read("components/lavorazioni/schede/schede-lavorazione-modal.tsx");
const promemoria = read("components/dashboard/promemoria/dashboard-promemoria-form-modal.tsx");

assert.match(bunderEditor, /GestionaleUnsavedChangesDialog/);
assert.match(bunderEditor, /useBeforeUnloadWhenDirty/);
assert.match(bunderEditor, /isBunderDocumentDirty/);

assert.match(bunderView, /persistBunderDocument\(doc, \{ queryClient/);
assert.match(bunderView, /removeBunderDocument\(d\.id, \{ queryClient/);

assert.match(dipendentiHook, /pagehide/);
assert.match(dipendentiHook, /beforeunload/);

assert.match(impostazioni, /beforeunload/);
assert.match(preventivi, /GestionaleUnsavedChangesDialog/);
assert.match(schede, /GestionaleUnsavedChangesDialog/);
assert.match(promemoria, /GestionaleUnsavedChangesDialog/);
assert.match(promemoria, /useBeforeUnloadWhenDirty/);

console.log("forms-save-policy.test.ts OK");
