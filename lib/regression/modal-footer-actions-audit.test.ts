import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const ssot = read("components/design-system/gestionale-modal-footer-actions.tsx");
assert.match(ssot, /GestionaleModalFooterDeleteButton/);
assert.match(ssot, /GestionaleModalFooterCancelButton/);
assert.match(ssot, /GestionaleModalFooterSaveButton/);
assert.match(ssot, /HubIconTrash/);
assert.match(ssot, /HubIconClose/);
assert.match(ssot, /HubIconSave/);
assert.match(ssot, /dsSchedaHubBtn/);
assert.match(ssot, /dsBtnDanger/);
assert.match(ssot, /dsBtnPrimary/);

const consumers = [
  "components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx",
  "components/gestionale/lavorazioni/lavorazione-edit-modal.tsx",
  "components/gestionale/lavorazioni/lavorazione-completamento-edit-modal.tsx",
  "components/gestionale/maintenance/maintenance-preset-editor-modal.tsx",
  "components/preventivi/preventivi-editor-modal.tsx",
  "components/ordini-fornitori/ordine-fornitore-editor-modal.tsx",
  "components/gestionale/magazzino/ricambio-edit-modal.tsx",
  "components/lavorazioni/schede/schede-lavorazione-modal.tsx",
];

for (const file of consumers) {
  const src = read(file);
  assert.match(src, /GestionaleModalFooter/, `${file} must use GestionaleModalFooter* SSOT`);
}

console.log("modal-footer-actions-audit.test.ts OK");
