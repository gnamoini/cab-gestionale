/**
 * Audit trasversale modal: flush pre-save, textarea Enter, focus scope form.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function listModalTsxFiles(): string[] {
  const out: string[] = [];
  function walk(dir: string) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".next") continue;
        walk(full);
      } else if (ent.isFile() && /modal.*\.tsx$/i.test(ent.name)) {
        out.push(path.relative(ROOT, full).replace(/\\/g, "/"));
      }
    }
  }
  walk(path.join(ROOT, "components"));
  return out.sort();
}

const focusScope = read("components/gestionale/gestionale-form-focus-scope.tsx");
assert.match(focusScope, /gestionaleMultilineEnterProps/);
assert.match(focusScope, /flushSync/);
assert.doesNotMatch(focusScope, /flushGestionalePendingCommits/);

const savePrep = read("lib/ui/gestionale-modal-save-prep.ts");
assert.match(savePrep, /prepareGestionaleModalSave/);
assert.match(savePrep, /prepareFormSubmit/);

const formSubmitPrep = read("lib/forms/form-engine/prepare-form-submit.ts");
assert.match(formSubmitPrep, /flushGestionalePendingCommits/);
assert.match(formSubmitPrep, /flushSync/);

const flushSrc = read("lib/ui/gestionale-form-submit-flush.ts");
assert.match(flushSrc, /flushGestionalePendingCommits/);
assert.match(flushSrc, /flushGestionaleFormPendingCommits/);

// Multiline fields in modal: SSOT GestionaleTextarea (Enter via gestionaleMultilineEnterProps interno)
const modalFilesWithTextarea = listModalTsxFiles().filter((rel) =>
  /GestionaleTextarea/.test(read(rel)),
);
const ricambioFields = read("components/gestionale/magazzino/ricambio-form-fields.tsx");
const hubPanoramica = read("components/design-system/hub-modal-panoramica.tsx");

for (const rel of modalFilesWithTextarea) {
  const src = read(rel);
  assert.doesNotMatch(src, /<textarea\b/, `${rel}: use GestionaleTextarea instead of raw textarea`);
  assert.match(src, /GestionaleTextarea/, `${rel}: multiline fields must use GestionaleTextarea`);
}

assert.match(ricambioFields, /GestionaleTextarea/);
assert.match(hubPanoramica, /GestionaleTextarea/);

// Button-save modals must flush before persist
const buttonSaveFiles = [
  "components/lavorazioni/schede/schede-lavorazione-modal.tsx",
  "components/preventivi/preventivi-editor-modal.tsx",
  "components/design-system/hub-modal-panoramica.tsx",
] as const;

for (const rel of buttonSaveFiles) {
  const src = read(rel);
  assert.match(
    src,
    /runButtonSubmit|prepareGestionaleModalSave|prepareGestionaleModalSaveFrom/,
    `${rel} must flush via runButtonSubmit or prepareGestionaleModalSave* before save`,
  );
}

assert.match(read("components/dashboard/security-create-user-modal.tsx"), /gestionaleFormFocusScopeProps/);

assert.match(
  read("components/gestionale/lavorazioni/lavorazione-detail-modal.tsx"),
  /GestionaleModalScrollBody/,
);

console.log(`modal-cross-audit.test.ts OK (${modalFilesWithTextarea.length} modal files with textarea checked)`);
