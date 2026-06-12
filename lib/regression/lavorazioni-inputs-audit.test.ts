/**
 * Audit lavorazioni: controlli statici su pattern input portal (no select/date nativi su route).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const view = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
const tableRow = read("components/gestionale/lavorazioni/lavorazione-table-row.tsx");
const mobileCards = read("components/gestionale/lavorazioni/lavorazione-mobile-cards.tsx");
const filters = read("components/gestionale/lavorazioni/lavorazioni-advanced-filter-panel.tsx");
const schedeModal = read("components/lavorazioni/schede/schede-lavorazione-modal.tsx");
const filterDrawer = read("components/gestionale/mobile-filter-drawer.tsx");
const ingressoForm = read("components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx");
const anagrafica = read("components/gestionale/schede/scheda-ingresso-anagrafica-fields.tsx");

const inlineBlocks = [
  ...(tableRow.match(/<InlineSelectField[\s\S]*?>/g) ?? []),
  ...(mobileCards.match(/<InlineSelectField[\s\S]*?>/g) ?? []),
];
assert.ok(inlineBlocks.length > 0, "expected InlineSelectField usages in lavorazioni table/mobile");
for (const block of inlineBlocks) {
  assert.match(block, /tablePill/, "every InlineSelectField on /lavorazioni must use tablePill");
}

const inlineSelectSrc = read("components/gestionale/lavorazioni/lavorazioni-inline-select.tsx");
assert.match(inlineSelectSrc, /@deprecated/, "native select path must be documented deprecated");

const repoInlineUsages = [
  tableRow,
  mobileCards,
  read("components/lavorazioni-clienti/client-lavorazioni-view.tsx"),
];
for (const src of repoInlineUsages) {
  const blocks = src.match(/<InlineSelectField[\s\S]*?>/g) ?? [];
  for (const block of blocks) {
    assert.match(block, /tablePill/, "every InlineSelectField in repo must use tablePill");
  }
}

assert.match(filters, /GlobalFilterDateField/);
assert.doesNotMatch(filters, /type="date"/);
assert.doesNotMatch(filters, /<select\b/);

assert.doesNotMatch(schedeModal, /<datalist\b/);
assert.match(schedeModal, /GlobalSettingsListSelect/);
assert.match(schedeModal, /GlobalDatePicker/);

assert.match(filterDrawer, /CAB_MODAL_ROOT_ATTR/);
assert.match(filterDrawer, /CAB_MODAL_SCROLL_ATTR/);

assert.match(ingressoForm, /htmlFor=\{dataIngressoFieldId\}/);
assert.match(ingressoForm, /id=\{dataIngressoFieldId\}/);

assert.match(anagrafica, /GestionaleNumberInput/);

assert.match(
  ingressoForm,
  /GestionaleTextarea/,
  "scheda ingresso: campi multiriga devono usare GestionaleTextarea SSOT",
);

const modals = read("components/gestionale/lavorazioni/lavorazioni-modals.tsx");
assert.match(ingressoForm, /GestionaleModalScrollBody/);
assert.match(modals, /useMobileModalKeyboard/);
assert.match(modals, /GlobalFixedListPillSelect/);
assert.doesNotMatch(modals, /<select\b/);

assert.match(view, /onPersistSchedeBundle/);
assert.match(view, /clampSchedeBundle\(next\)/);
assert.match(view, /savedBundle:\s*safe/);
assert.match(view, /onPersist=\{onPersistSchedeBundle\}/);
assert.match(view, /bundle=\{schedeStore\[row\.id\]\}/);

const kanban = read("components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx");
assert.match(kanban, /kanbanSchedeBundleRevision/);

console.log("lavorazioni-inputs-audit.test.ts OK");
