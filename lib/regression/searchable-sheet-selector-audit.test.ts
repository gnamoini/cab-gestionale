/**
 * Audit searchable sheet selector: SSOT GlobalSelect enhancements.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const globalSelect = read("components/gestionale/global-input/global-select.tsx");
const sheet = read("components/gestionale/global-input/gestionale-searchable-sheet-select.tsx");
const bottomSheet = read("components/gestionale/gestionale-mobile-bottom-sheet.tsx");
const virtual = read("components/gestionale/global-input/global-virtualized-listbox.tsx");
const recents = read("lib/ui/gestionale-selector-recents.ts");
const ordering = read("lib/ui/list-select-ordering.ts");
const focusRestore = read("lib/ui/use-dropdown-focus-restore.ts");

assert.match(globalSelect, /GestionaleSearchableSheetSelect/);
assert.match(globalSelect, /useSelectorOverlayBack/);
assert.match(globalSelect, /useDropdownFocusRestore/);
assert.match(globalSelect, /pushSelectorRecent/);
assert.match(globalSelect, /resolveSelectorSuggestions/);
assert.match(globalSelect, /useSheet: sheetActive/);
assert.match(globalSelect, /sheetActive/);
assert.match(globalSelect, /runAtomicSelect/);
assert.match(globalSelect, /flushCombobox/);
assert.match(globalSelect, /deriveSurface/);
assert.match(sheet, /GestionaleMobileBottomSheet/);
assert.match(sheet, /showSearch/);

const pillSelect = read("components/gestionale/global-input/global-fixed-list-pill.tsx");
assert.match(pillSelect, /GestionaleSearchableSheetSelect/);
assert.match(pillSelect, /showSearch=\{false\}/);
assert.match(pillSelect, /useMaxMdDown/);
assert.match(bottomSheet, /role="dialog"/);
assert.match(bottomSheet, /bg-\[var\(--cab-overlay\)\]/);
assert.match(bottomSheet, /cabModalZStacked/);
assert.match(bottomSheet, /CAB_MODAL_ROOT_ATTR/);
assert.match(bottomSheet, /CAB_STICKY_HEADER_ATTR/);
assert.match(bottomSheet, /--cab-vv-height/);
assert.match(bottomSheet, /--cab-vv-offset-top/);
assert.match(sheet, /registerBack: false/);
assert.match(sheet, /CAB_MODAL_SCROLL_ATTR/);
assert.match(sheet, /cabModalScrollKeyboardPad/);
assert.match(globalSelect, /externalScrollHost/);
assert.match(globalSelect, /hoverActivatesIndex=\{!sheetOpen\}/);
assert.match(globalSelect, /if \(!open \|\| useSheet\) return;/);
assert.match(virtual, /externalScrollHost/);
assert.match(virtual, /externalMeasureReady/);
assert.match(virtual, /virtualizer\.measure\(\)/);
assert.match(globalSelect, /browseCap: sheetBrowseAll/);
assert.match(globalSelect, /showAddOptionInUi/);
assert.match(sheet, /saved\.has\(el\)/);
assert.match(sheet, /onTouchMove/);
assert.match(sheet, /role=\{comboboxAria \? "combobox"/);
assert.match(sheet, /exemptPanelRef: panelRef/);
assert.match(sheet, /allowPanelTouchMove/);
assert.match(sheet, /min-h-0 min-w-0 flex-1 overflow-y-auto/);
assert.doesNotMatch(sheet, /resolvedSearchRef\.current\?\.focus/);
assert.match(recents, /readSelectorRecents/);
assert.match(ordering, /orderSelectSuggestions/);
assert.match(focusRestore, /restoreFocus/);

const settingsSelect = read("components/gestionale/global-input/global-settings-list-select.tsx");
assert.match(settingsSelect, /recentsKey: isMagazzinoListKey \? undefined : listKey/);
assert.match(settingsSelect, /alphabeticalBrowse: isMagazzinoListKey/);

const resolveSuggestions = read("lib/selector-core/resolve-selector-suggestions.ts");
assert.match(resolveSuggestions, /if \(selectOnly \|\| useSheet\)/);

const ghostGuard = read("lib/selector-interaction/suppress-selector-ghost-click.ts");
assert.match(ghostGuard, /armSelectorGhostClickGuard/);
assert.match(ghostGuard, /blockOnce/);
assert.match(sheet, /armSelectorGhostClickGuard/);
assert.match(sheet, /cab-app-shell/);
assert.match(sheet, /healBodyScrollLockState\("sheet-close"\)/);
assert.match(bottomSheet, /armSelectorGhostClickGuard/);
assert.match(bottomSheet, /onPointerDown/);
assert.match(globalSelect, /armSelectorGhostClickGuard/);
assert.match(globalSelect, /e\.stopPropagation\(\)/);
assert.match(pillSelect, /armSelectorGhostClickGuard/);
assert.match(pillSelect, /onPointerDown/);

const listboxHelpers = read("components/gestionale/selector/selector-listbox-helpers.tsx");
assert.match(listboxHelpers, /onClick=\{\(e\) => \{/);
assert.match(listboxHelpers, /sheetTapSelect/);
assert.match(listboxHelpers, /touch-pan-y/);

const sheetTapSelect = read("lib/selector-interaction/selector-sheet-tap-select.ts");
assert.match(sheetTapSelect, /SELECTOR_SHEET_TAP_SLOP_PX/);
assert.match(sheetTapSelect, /armSelectorGhostClickGuard/);

const focusChain = read("lib/selector-interaction/use-selector-focus-chain.ts");
assert.doesNotMatch(focusChain, /sheetSearchRef\.current[\s\S]*\.focus/);
assert.doesNotMatch(focusChain, /setTimeout/);

console.log("searchable-sheet-selector-audit.test.ts OK");
