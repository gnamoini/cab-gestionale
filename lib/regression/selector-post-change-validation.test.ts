/**
 * post_change_validation checklist — stub audit per PR selector (v2 plan).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const checklist = read("docs/selector-post-change-validation.md");
const globalSelect = read("components/gestionale/global-input/global-select.tsx");
const emptyState = read("components/gestionale/global-input/selector-empty-state.tsx");

assert.match(checklist, /tab_navigation/);
assert.match(checklist, /keyboard_focus/);
assert.match(checklist, /mobile_sheet/);
assert.match(checklist, /performance/);
assert.match(checklist, /selector-domain-policy-audit/);
assert.match(checklist, /selector-concurrency-race/);
assert.match(checklist, /block_merge_if/);

assert.match(globalSelect, /useDeferredValue/);
assert.match(globalSelect, /runSelectOptionAtomic/);
assert.match(globalSelect, /useDropdownFocusRestore/);
assert.match(globalSelect, /useSelectorOverlayBack/);

assert.match(emptyState, /aria-live="polite"/);
assert.match(emptyState, /Reimposta ricerca/);
assert.match(emptyState, /onResetSearch/);

console.log("selector-post-change-validation.test.ts OK");
