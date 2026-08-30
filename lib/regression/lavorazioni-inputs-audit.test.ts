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
const lavorazioniView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
assert.match(lavorazioniView, /GestionaleListTable/);
const listSkeleton = read("components/gestionale/lavorazioni/lavorazioni-page-structure.tsx");
const scrollCss = read("components/gestionale/global-table/gestionale-list-layout.css");
const listSurfaceResolver = read("lib/ui/resolve-list-surface.ts");
const filters = read("components/gestionale/lavorazioni/lavorazioni-advanced-filter-panel.tsx");
const schedaFormUtils = read("components/lavorazioni/schede/scheda-form-utils.tsx");
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

assert.doesNotMatch(read("components/lavorazioni/schede/schede-lavorazione-modal.tsx"), /<datalist\b/);
assert.match(anagrafica, /GlobalSettingsListSelect/);
assert.match(schedaFormUtils, /GlobalDatePicker/);

assert.match(filterDrawer, /CAB_MODAL_ROOT_ATTR/);
assert.match(filterDrawer, /CAB_MODAL_SCROLL_ATTR/);
assert.match(filterDrawer, /createPortal/);
assert.doesNotMatch(filterDrawer, /fixed inset-0 \$\{dsZModalHigh\} touch-none/);
assert.match(filterDrawer, /touch-pan-y/);

assert.match(ingressoForm, /htmlFor=\{dataIngressoFieldId\}/);
assert.match(ingressoForm, /id=\{dataIngressoFieldId\}/);

assert.match(anagrafica, /GestionaleNumberInput/);

assert.match(
  ingressoForm,
  /GestionaleTextarea/,
  "scheda ingresso: campi multiriga devono usare GestionaleTextarea SSOT",
);

const modals = read("components/gestionale/lavorazioni/lavorazioni-modals.tsx");
const modalShell = read("components/gestionale/gestionale-modal-shell.tsx");
assert.match(ingressoForm, /GestionaleModalScrollBody/);
assert.match(modalShell, /useMobileModalKeyboard/);
assert.match(modalShell, /createPortal/);
assert.match(modals, /GlobalFixedListPillSelect/);
assert.doesNotMatch(modals, /<select\b/);

assert.match(view, /onPersistSchedeBundle/);
assert.match(view, /clampSchedeBundle\(next\)/);
assert.match(view, /savedBundle:\s*safe/);
assert.match(view, /onPersist=\{onPersistSchedeBundle\}/);
assert.match(view, /bundle=\{schedeStore\[row\.id\]\}/);

const kanban = read("components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx");
assert.match(kanban, /kanbanSchedeBundleRevision/);

assert.match(scrollCss, /\.gestionale-list-tier-xl/);
assert.match(scrollCss, /\.gestionale-list-container/);

assert.match(listSurfaceResolver, /resolveListSurfaceFromRequest/);
assert.match(listSurfaceResolver, /LIST_SURFACE_TABLE_MIN_VIEWPORT/);

assert.match(view, /GestionaleListPageProps/);
assert.match(view, /listSurface === "table"/);
assert.doesNotMatch(view, /useGestionaleListLayout/);
assert.doesNotMatch(view, /GESTIONALE_LIST_DESKTOP_ONLY_CLASS/);
assert.doesNotMatch(view, /hidden xl:block/);
assert.doesNotMatch(mobileCards, /GESTIONALE_LIST_MOBILE_ONLY_CLASS/);
assert.doesNotMatch(mobileCards, /xl:hidden/);
assert.match(view, /GestionaleListTable/);
assert.match(listSkeleton, /mode = "skeleton"/);

console.log("lavorazioni-inputs-audit.test.ts OK");
