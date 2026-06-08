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
const impostazioni = read("components/dashboard/settings/settings-workspace-shell.tsx");
const preventivi = read("components/preventivi/preventivi-editor-modal.tsx");
const schede = read("components/lavorazioni/schede/schede-lavorazione-modal.tsx");
const promemoria = read("components/dashboard/promemoria/dashboard-promemoria-form-modal.tsx");
const securityBatch = read("src/actions/security-users-permissions.ts");
const securityTable = read("components/dashboard/security/security-users-table.tsx");
const lavCreate = read("components/gestionale/lavorazioni/lavorazione-create-modal.tsx");
const ricambioNew = read("components/gestionale/magazzino/ricambio-new-modal.tsx");
const schedaIngressoForm = read("components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx");
const focusScope = read("components/gestionale/gestionale-form-focus-scope.tsx");

assert.match(bunderEditor, /GestionaleUnsavedChangesDialog/);
assert.match(bunderEditor, /useBeforeUnloadWhenDirty/);
assert.match(bunderEditor, /isBunderDocumentDirty/);

assert.match(bunderView, /persistBunderDocument\(doc, \{ queryClient/);
assert.match(bunderView, /removeBunderDocument\(d\.id, \{ queryClient/);

assert.match(dipendentiHook, /pagehide/);
assert.match(dipendentiHook, /beforeunload/);

assert.match(impostazioni, /beforeunload/);
assert.match(impostazioni, /GestionaleUnsavedChangesDialog/);
assert.match(impostazioni, /Torna indietro/);
assert.match(impostazioni, /Salva ed esci/);
assert.match(impostazioni, /Esci senza salvare/);
assert.match(preventivi, /GestionaleUnsavedChangesDialog/);
assert.match(schede, /GestionaleUnsavedChangesDialog/);
assert.match(promemoria, /GestionaleUnsavedChangesDialog/);
assert.match(promemoria, /useBeforeUnloadWhenDirty/);

assert.match(securityBatch, /cliente_ref/);
assert.match(securityBatch, /clienteRef/);
assert.match(securityTable, /clienteRef/);
assert.match(securityTable, /mezzi:clienti/);

// SSOT create modal — Form Engine + focus scope flush al submit
assert.match(focusScope, /flushGestionalePendingCommits/);
assert.match(focusScope, /flushSync/);
assert.match(lavCreate, /useFormEngineSections/);
assert.match(lavCreate, /runSubmit/);
assert.match(ricambioNew, /useFormEngine/);
assert.match(ricambioNew, /runSubmit/);
assert.match(schedaIngressoForm, /useFormEngine/);
assert.match(schedaIngressoForm, /gestionaleMultilineEnterProps/);

console.log("forms-save-policy.test.ts OK");
