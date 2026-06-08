/**
 * Inventory FSE fase 2 — mappa A/B/C e stato migrazione (static).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

type MigrationExpect = {
  rel: string;
  category: "A" | "B" | "C";
  migrated: boolean;
  patterns: RegExp[];
};

const INVENTORY: MigrationExpect[] = [
  // A — form submit (migrated v1 + f2)
  {
    rel: "components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx",
    category: "A",
    migrated: true,
    patterns: [/useFormEngine/, /runSubmit/],
  },
  {
    rel: "components/gestionale/lavorazioni/lavorazione-create-modal.tsx",
    category: "A",
    migrated: true,
    patterns: [/useFormEngineSections/, /runSubmit/],
  },
  {
    rel: "components/gestionale/magazzino/ricambio-new-modal.tsx",
    category: "A",
    migrated: true,
    patterns: [/useFormEngine/, /runSubmit/],
  },
  {
    rel: "components/gestionale/magazzino/ricambio-edit-modal.tsx",
    category: "A",
    migrated: true,
    patterns: [/useFormEngine/, /runSubmit/],
  },
  {
    rel: "components/gestionale/mezzi/mezzi-new-modal.tsx",
    category: "A",
    migrated: true,
    patterns: [/useFormEngine/, /runSubmit/],
  },
  {
    rel: "components/gestionale/mezzi/mezzi-edit-modal.tsx",
    category: "A",
    migrated: true,
    patterns: [/useFormEngine/, /runSubmit/],
  },
  {
    rel: "components/gestionale/lavorazioni/lavorazione-edit-modal.tsx",
    category: "A",
    migrated: true,
    patterns: [/runSubmitFromGetter/, /useSubmitLock/],
  },
  {
    rel: "components/gestionale/documenti/documenti-modals.tsx",
    category: "A",
    migrated: true,
    patterns: [/runSubmitFromGetter/, /useSubmitLock/],
  },
  {
    rel: "components/dashboard/promemoria/dashboard-promemoria-form-modal.tsx",
    category: "A",
    migrated: true,
    patterns: [/runSubmitFromGetter/, /useSubmitLock/],
  },
  {
    rel: "components/dashboard/security-create-user-modal.tsx",
    category: "A",
    migrated: true,
    patterns: [/runSubmitFromGetter/, /useSubmitLock/],
  },
  {
    rel: "components/dashboard/security/security-edit-name-modal.tsx",
    category: "A",
    migrated: true,
    patterns: [/runSubmitFromGetter/, /useSubmitLock/],
  },
  {
    rel: "components/gestionale/lavorazioni/lavorazioni-modals.tsx",
    category: "A",
    migrated: true,
    patterns: [/runSubmitFromGetter/, /useSubmitLock/],
  },
  // B — button-save
  {
    rel: "components/lavorazioni/schede/schede-lavorazione-modal.tsx",
    category: "B",
    migrated: true,
    patterns: [/runButtonSubmit/, /useSubmitLock/],
  },
  {
    rel: "components/preventivi/preventivi-editor-modal.tsx",
    category: "B",
    migrated: true,
    patterns: [/runButtonSubmit/, /useSubmitLock/],
  },
  {
    rel: "components/bunder/bunder-editor-modal.tsx",
    category: "B",
    migrated: true,
    patterns: [/runButtonSubmit/, /useSubmitLock/],
  },
  {
    rel: "components/design-system/hub-modal-panoramica.tsx",
    category: "B",
    migrated: true,
    patterns: [/runButtonSubmit/],
  },
  // C — legacy (shadow / freeze)
  {
    rel: "components/gestionale/lavorazioni/lavorazioni-modals.tsx",
    category: "C",
    migrated: false,
    patterns: [/NewLavorazioneModal/],
  },
];

for (const item of INVENTORY) {
  const src = read(item.rel);
  if (item.migrated) {
    for (const p of item.patterns) {
      assert.match(src, p, `${item.rel} [${item.category}] must match ${p}`);
    }
    assert.doesNotMatch(
      src,
      /prepareGestionaleModalSave\(/,
      `${item.rel} should not call prepareGestionaleModalSave directly after FSE migration`,
    );
  }
}

const runSubmitSrc = read("lib/forms/form-engine/run-submit.ts");
assert.match(runSubmitSrc, /runSubmitFromGetter/);
assert.match(runSubmitSrc, /runButtonSubmit/);

console.log(`form-engine-inventory.test.ts OK (${INVENTORY.length} entries)`);
