/**
 * Audit query SSOT — nessun stato duplicato sheetSearchText/searchText.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const globalSelect = read("components/gestionale/global-input/global-select.tsx");
const queryBridge = read("lib/selector-interaction/use-selector-query-bridge.ts");

assert.doesNotMatch(globalSelect, /sheetSearchText/);
assert.doesNotMatch(globalSelect, /useState\([^)]*searchText/);
assert.doesNotMatch(globalSelect, /setSearchText/);
assert.match(globalSelect, /useSelectorQueryBridge/);
assert.match(globalSelect, /const \{ query, setQuery/);
assert.match(globalSelect, /deriveSurface/);
assert.doesNotMatch(queryBridge, /legacySheetSearchText/);

console.log("selector-query-ssot-audit.test.ts OK");
