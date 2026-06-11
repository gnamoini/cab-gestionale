/**
 * Audit scroll-to-selected on reopen + magazzino selector domain wiring.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const globalSelect = read("components/gestionale/global-input/global-select.tsx");
const virtual = read("components/gestionale/global-input/global-virtualized-listbox.tsx");
const listbox = read("components/gestionale/selector/selector-listbox.tsx");
const scrollRestore = read("lib/selector-interaction/use-selector-scroll-restoration.ts");
const settingsSelect = read("components/gestionale/global-input/global-settings-list-select.tsx");
const compatMulti = read("components/gestionale/magazzino/compat-hierarchy-multi-select.tsx");
const focusChain = read("lib/selector-interaction/use-selector-focus-chain.ts");
const sheet = read("components/gestionale/global-input/gestionale-searchable-sheet-select.tsx");

assert.match(globalSelect, /scrollToRowRef/);
assert.match(globalSelect, /scrollToSuggestionIndex/);
assert.match(globalSelect, /onRestoreActiveIndex: setActiveIndex/);
assert.match(globalSelect, /resolvedMobileSheetMode/);
assert.match(globalSelect, /isSelectorDomainSheetRolloutEnabled/);

assert.match(virtual, /scrollToRowRef/);
assert.match(virtual, /virtualizer\.scrollToIndex/);
assert.match(virtual, /data-listbox-row-index/);

assert.match(listbox, /scrollToRowRef/);

assert.match(scrollRestore, /onRestoreActiveIndex/);

assert.match(settingsSelect, /listKey\.startsWith\("magazzino:"\)/);
assert.match(settingsSelect, /resolvedSelectorDomain/);
assert.match(settingsSelect, /dynamicList: dynamicList \?\? isMagazzinoListKey/);

assert.match(globalSelect, /useSheetTriggerMode/);
assert.match(focusChain, /onSearchFocus/);
assert.doesNotMatch(sheet, /input\.focus\(\{ preventScroll: true \}\)/);
assert.match(compatMulti, /selectorDomain="magazzino"/);

console.log("selector-scroll-restoration-audit.test.ts OK");
