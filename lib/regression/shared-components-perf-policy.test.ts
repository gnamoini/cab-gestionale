import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const confirm = read("components/gestionale/gestionale-confirm-dialog.tsx");
const confirmImpl = read("components/gestionale/gestionale-confirm-dialog-impl.tsx");
const globalSelect = read("components/gestionale/global-input/global-select.tsx");
const globalSelectTypes = read("components/gestionale/global-input/global-select-types.ts");
const globalTable = read("components/gestionale/global-table/global-table.tsx");
const virtualRowsHelper = read("lib/ui/gestionale-list-virtual-rows.ts");
const kanban = read("components/gestionale/kanban/kanban-virtual-column-scroll.tsx");
const kanbanReexport = read("components/gestionale/lavorazioni/kanban-virtual-column-scroll.tsx");
const tooltip = read("components/design-system/use-tooltip.ts");
const drawer = read("components/design-system/drawer.tsx");
const modalGate = read("components/gestionale/gestionale-modal-gate.tsx");
const collapsible = read("components/design-system/gestionale-collapsible-section.tsx");
const cropLazy = read("components/gestionale/upload/gestionale-image-crop-modal-lazy.tsx");

assert.match(confirm, /dynamic\s*\(/);
assert.match(confirm, /gestionale-confirm-dialog-impl/);
assert.doesNotMatch(confirm, /useGestionaleOverlayBehavior/);
assert.match(confirmImpl, /useGestionaleOverlayBehavior/);

assert.match(globalSelect, /global-select-types/);
assert.match(globalSelect, /global-select-listbox-panel/);
assert.match(globalSelect, /dynamic\s*\(/);
assert.match(read("components/gestionale/global-input/global-select-option-row.tsx"), /memo\(function GlobalSelectOptionRow/);
assert.match(globalSelectTypes, /GlobalSelectProps/);

assert.match(globalTable, /memo\(function VirtualTableBody/);
assert.match(globalTable, /forceFullRender/);
assert.match(globalTable, /globalTableScrollElementAllowsVerticalVirtualPadding/);
assert.match(globalTable, /globalTableVirtualSpacerRow/);
assert.match(virtualRowsHelper, /useGestionaleListVirtualRows/);

assert.doesNotMatch(kanban, /useLayoutEffect\(\(\) => \{[\s\S]*syncMetrics\(\);[\s\S]*\}\);/);
assert.match(kanban, /addEventListener\("scroll"/);
assert.match(kanbanReexport, /kanban\/kanban-virtual-column-scroll/);

assert.match(tooltip, /TOOLTIP_POSITION_RAF_BATCH/);
assert.match(tooltip, /batchedAutoUpdate/);

assert.match(drawer, /closing \? null : children/);
assert.match(modalGate, /GestionaleModalGate/);
assert.match(collapsible, /unmountOnCollapse/);
assert.match(cropLazy, /dynamic\s*\(/);

console.log("shared-components-perf-policy.test.ts OK");
